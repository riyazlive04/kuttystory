import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import sharp from 'sharp';
import { DatabaseService } from '../database/database.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';
import {
  checkBookCostLimit,
  CostLimitExceededError,
  buildIllustrationPrompt,
  buildFalIllustrationPrompt,
  buildPersonalizationEditPrompt,
  buildQwenEditPrompt,
  buildNanoBananaRedrawPrompt,
  buildNegativePrompt,
  personalizeText,
  generatePersonalizedImage,
  type ReferenceImage,
  type ImageProvider,
} from '@kutty-story/ai';
import {
  trainChildLora,
  generateWithLora,
  buildLoraPagePrompt,
} from './lora';
import { buildCharacterSheet } from './character-sheet';
import { faceSwapIntoTemplate } from './segmind';
import { cropToFace } from './face-crop';
import { renderStoryText, STORY_TEXT_LAYOUTS } from './story-text';

/** Per-image cost estimate (cents) used for budget enforcement + logging.
 *  OpenAI runs gpt-image-1.5 at quality:'high' + input_fidelity:'high' for
 *  faithful likeness (~20c/image). 28 pages × 20c = 560c, under the raised
 *  MAX_GENERATION_COST_PER_BOOK_CENTS (800) with regen headroom. */
export const COST_PER_IMAGE_CENTS: Record<ImageProvider, number> = {
  gemini: 4,
  // OpenAI gpt-image edit at quality:'medium' ≈ $0.07–0.13/image once the two
  // input images (template + child photo) are counted — higher than the raw
  // output-token cost. 12c keeps the per-book budget reservation realistic.
  openai: 12,
  // fal PuLID-Flux ≈ $0.033/image (1MP) → 28 pages ≈ 92c, well under the cap.
  fal: 4,
  // FLUX.1 Kontext [pro] multi ≈ $0.04/image → 28 pages ≈ 112c.
  'flux-kontext': 4,
  // OpenAI gpt-image-2 via fal — premium model, budget like direct OpenAI.
  'openai-fal': 20,
  // FLUX LoRA generation ≈ $0.02/image (training amortized separately, ~once/child).
  'flux-lora': 3,
  // Segmind FaceSwap Comic ≈ $0.065/image → 28 pages ≈ 182c. The template-
  // preserving face-swap path (default).
  'segmind-faceswap': 7,
  // Qwen-Image-Edit-2511 (fal) ≈ $0.03/image → 28 pages ≈ 84c. Edits the
  // template in place; fast + cheap + reliable.
  'qwen-edit': 4,
  // Nano Banana Pro (Gemini 3 Pro Image) redraw, SYNC/standard 2K ≈ $0.134
  // output + input images → ~15c reserved. (The batch lane, when built, bills at
  // ~half; this constant is the sync preview/fallback rate.)
  'nano-banana-redraw': 15,
};

/** Free preview is LOCKED to the first N pages (5). The single source of truth
 *  is PREVIEW_PAGE_COUNT in @kutty-story/shared, so the web preview, the seed's
 *  `isPreviewPage` flags (first 5 pages), and this generator can never drift.
 *  Re-exported here for the preview processor that passes it as `previewLimit`. */
export { PREVIEW_PAGE_COUNT } from '@kutty-story/shared';

/** Default pages generated in parallel. Higher = faster wall-clock with no
 *  quality change; bounded only by the provider's rate limits (transient 429s
 *  are absorbed by the per-page retry/backoff). Override per-deployment with
 *  the GENERATION_CONCURRENCY env var. 6 lets a 5-page preview run in one wave. */
export const PAGE_CONCURRENCY = 6;

/** Per-page retry policy. A transient API/storage failure retries THAT page
 *  only (with exponential backoff), so one hiccup never drops the page. */
const MAX_PAGE_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run `fn` with up to `attempts` tries, exponential backoff + jitter between. */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  logger: Logger,
  attempts = MAX_PAGE_ATTEMPTS,
  baseMs = RETRY_BASE_DELAY_MS,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        const backoff = baseMs * 2 ** (attempt - 1);
        const jitter = Math.floor(Math.random() * 0.3 * backoff);
        const delay = backoff + jitter;
        logger.warn(
          `${label} attempt ${attempt}/${attempts} failed: ${err}. Retrying in ${delay}ms`,
        );
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

/** Map over items with a bounded number of concurrent workers (a pool). */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  const poolSize = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}

/** Derive the storage key from a stored reference (key or URL). */
function keyFromRef(ref: string): string {
  if (!ref) return ref;
  const filesIdx = ref.indexOf('/files/');
  if (filesIdx >= 0) return ref.slice(filesIdx + '/files/'.length);
  if (/^https?:\/\//i.test(ref)) {
    try {
      return new URL(ref).pathname.replace(/^\/+/, '');
    } catch {
      return ref;
    }
  }
  return ref.replace(/^\/+/, '');
}

function mimeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'image/jpeg';
}

/** Load the child's reference photos from storage (best-effort). */
async function loadReferenceImages(
  storage: StorageService,
  refs: string[],
  logger: Logger,
): Promise<ReferenceImage[]> {
  const out: ReferenceImage[] = [];
  for (const ref of (refs || []).slice(0, 3)) {
    const key = keyFromRef(ref);
    try {
      const data = await storage.read(key);
      out.push({ data, mimeType: mimeFromKey(key) });
    } catch (err) {
      logger.warn(`Could not read reference image ${key}: ${err}`);
    }
  }
  return out;
}

/** Fetch the existing (sample) story page illustration to personalize. */
async function fetchBaseIllustration(
  webUrl: string,
  slug: string,
  pageNumber: number,
  logger: Logger,
): Promise<ReferenceImage | undefined> {
  const url = `${webUrl}/images/stories/${slug}/page-${pageNumber}.jpg`;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = Buffer.from(await res.arrayBuffer());
    return { data, mimeType: 'image/jpeg' };
  } catch (err) {
    logger.warn(`Could not fetch base illustration ${url}: ${err}`);
    return undefined;
  }
}

interface BookForGeneration {
  id: string;
  language: string;
  story: { artStyle: string; slug: string };
  child: {
    name: string;
    nickname: string | null;
    ageYears: number;
    gender: string;
    skinTone: string | null;
    hairColor: string | null;
    hasGlasses: boolean;
  };
}

interface PageTemplateLike {
  pageNumber: number;
  textEnglish: string;
  textTamil: string | null;
  illustrationPrompt: string;
  negativePrompt: string | null;
  styleTokens: unknown;
}

/** Cap an image's longest side (default 1024) for the Qwen edit path. Qwen
 *  processes at the input resolution, so full-res templates (1600–2048px) make
 *  each call ~10x slower (~65s vs ~6s) and the output (and cost, billed per
 *  output megapixel) balloon. 1024 matches the fast, validated PoC settings. */
async function capForQwen(buffer: Buffer, maxDim = 1024): Promise<Buffer> {
  return sharp(buffer)
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Trim a generated image to a clean 1024x1024 square (no stray padding/bars). */
async function toSquarePng(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1024, 1024, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();
}

function escapeXml(s: string): string {
  return s.replace(
    /[<>&'"]/g,
    (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[
        c
      ] as string,
  );
}

/** Greedy word-wrap into at most `maxChars`-wide lines. */
function wrapCaption(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Bake the personalized story caption onto the bottom of a square page image as
 * a SOLID storybook panel (opaque cream panel + warm accent bar + bold text),
 * via an SVG composite.
 *
 * The panel is intentionally opaque and tall enough (≥ ~22% of the page) to
 * COVER any text the underlying art already carries. This is essential for the
 * face-swap path (`segmind-faceswap`), where the template page keeps its own
 * baked-in placeholder name (e.g. "Jerush") — the panel hides it and renders the
 * correct child's name on top. The prompt-based providers (which generate a
 * text-free scene) get the same consistent caption styling.
 */
async function overlayCaption(buffer: Buffer, caption: string): Promise<Buffer> {
  const text = (caption || '').trim();
  if (!text) return buffer;

  const size = 1024;
  const fontSize = 42;
  const lineHeight = 54;
  const padY = 30;
  const lines = wrapCaption(text, 34).slice(0, 4);

  // Tall enough to fit the text AND fully cover the template's own caption box
  // (which sits ≈ bottom 26%), so the face-swap path never leaks the template's
  // placeholder name above the panel.
  const textH = lines.length * lineHeight;
  const panelH = Math.max(textH + padY * 2, Math.round(size * 0.28));
  const panelY = size - panelH;
  const firstBaseline = panelY + (panelH - textH) / 2 + fontSize - 8;

  const tspans = lines
    .map(
      (ln, i) =>
        `<tspan x="${size / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(ln)}</tspan>`,
    )
    .join('');

  // Solid (opaque) cream panel hides anything beneath it; warm accent bar on top
  // for a finished storybook-caption feel; bold dark-brown text.
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${panelY}" width="${size}" height="${panelH}" fill="#FFF8EC"/>
    <rect x="0" y="${panelY}" width="${size}" height="8" fill="#E8552E"/>
    <text y="${firstBaseline}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#3A2A1E" text-anchor="middle">${tspans}</text>
  </svg>`;

  return sharp(buffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Generate one personalized page and store it.
 *
 * Edit-in-place (default, with `baseImage`): the template illustration is the
 * FIRST reference and the child's photo(s) follow — the model swaps the cartoon
 * face to the real child and edits the name, preserving the template scene/style.
 * Best on OpenAI gpt-image-1. Without a template it generates the scene fresh
 * from the prompt + child photos.
 */
async function generateAndStorePage(
  storage: StorageService,
  provider: ImageProvider,
  apiKey: string,
  book: BookForGeneration,
  page: PageTemplateLike,
  childRefs: ReferenceImage[],
  baseImage?: ReferenceImage,
  loraUrl?: string,
  loraTrigger?: string,
  characterSheet?: ReferenceImage,
  customPrompt?: string,
): Promise<{
  imageUrl: string;
  prompt: string;
  negativePrompt: string;
  textContent: string;
  costCents: number;
  latencyMs: number;
}> {
  const negativePrompt = buildNegativePrompt(page.negativePrompt || undefined);

  const textContent =
    book.language === 'TAMIL' && page.textTamil
      ? personalizeText(page.textTamil, {
          childName: book.child.name,
          nickname: book.child.nickname || book.child.name,
        })
      : personalizeText(page.textEnglish, {
          childName: book.child.name,
          nickname: book.child.nickname || book.child.name,
        });

  // The name baked into the template is English; target the English caption.
  const captionEnglish = personalizeText(page.textEnglish, {
    childName: book.child.name,
    nickname: book.child.nickname || book.child.name,
  });

  let prompt: string;
  let referenceImages: ReferenceImage[];

  if (provider === 'nano-banana-redraw') {
    // Face-swap directly from the child's PHOTO — exactly the OpenAI/ChatGPT flow
    // the owner proved: the template is the FIRST image and the child's photo(s)
    // are the rest. We deliberately do NOT use a character sheet as the reference:
    // showing Nano Banana a whole cartoon child made it redraw the entire child /
    // skip the swap on several pages. `characterSheet` is now ignored here.
    if (!baseImage) {
      throw new Error(
        'nano-banana-redraw needs the story template page as the first reference, but it could not be loaded.',
      );
    }
    // Admin-set prompt (from settings) wins; else the built-in default.
    prompt =
      customPrompt ||
      buildNanoBananaRedrawPrompt({
        gender: book.child.gender,
        hasGlasses: book.child.hasGlasses,
      });
    referenceImages = [baseImage, ...childRefs];
  } else if (baseImage) {
    // Qwen-Image-Edit needs a much stricter edit instruction than the OpenAI/
    // Kontext path (otherwise it duplicates the child / drifts the scene), so it
    // is NOT overridable by the admin prompt. The OpenAI/Gemini/Kontext edit path
    // uses the admin prompt when set, else the built-in default.
    prompt =
      provider === 'qwen-edit'
        ? buildQwenEditPrompt({ childName: book.child.name })
        : customPrompt ||
          buildPersonalizationEditPrompt({
            childName: book.child.name,
            caption: captionEnglish,
            gender: book.child.gender,
            skinTone: book.child.skinTone || undefined,
            hairColor: book.child.hairColor || undefined,
            hasGlasses: book.child.hasGlasses,
          });
    // Template first (the image to edit), then the child's photo(s).
    referenceImages = [baseImage, ...childRefs];
    // Qwen edits at the input resolution — downscale to 1024 so each page stays
    // fast (~6s) and cheap (billed per output megapixel). The final page is
    // re-squared to 1024 by toSquarePng anyway, so no visible quality loss.
    if (provider === 'qwen-edit') {
      referenceImages = await Promise.all(
        referenceImages.map(async (ref) => ({
          data: await capForQwen(ref.data),
          mimeType: 'image/jpeg',
        })),
      );
    }
  } else {
    // fal/PuLID fresh-generation path: describe the whole cohesive cartoon +
    // scene (no template to edit). Richer, identity-aware prompt mirroring the
    // craft of the OpenAI edit prompt.
    const styleTokens =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (page.styleTokens as any) || {
        style: book.story.artStyle,
        medium: 'digital illustration',
        palette: 'warm and vibrant',
        lighting: 'soft natural lighting',
      };
    const character = {
      childName: book.child.name,
      ageYears: book.child.ageYears,
      gender: book.child.gender,
      skinTone: book.child.skinTone || undefined,
      hairColor: book.child.hairColor || undefined,
      hasGlasses: book.child.hasGlasses,
    };
    prompt =
      provider === 'flux-lora'
        ? buildLoraPagePrompt({
            triggerWord: loraTrigger || 'thechild',
            ageYears: book.child.ageYears,
            gender: book.child.gender,
            sceneDescription: page.illustrationPrompt,
            artStyle: book.story.artStyle,
          })
        : provider === 'fal'
          ? buildFalIllustrationPrompt({
              styleTokens,
              character,
              sceneDescription: page.illustrationPrompt,
            })
          : buildIllustrationPrompt({
              styleTokens,
              character,
              sceneDescription: page.illustrationPrompt,
            });
    referenceImages = childRefs;
  }

  // Output detail for the OpenAI edit path. Default 'high' for the sharpest,
  // most faithful result (with input_fidelity:'high'). 'high' costs ~6x 'medium'
  // (~$0.25 vs ~$0.04 per 1024² image); drop it per-deployment with
  // OPENAI_IMAGE_QUALITY (low | medium | high | auto) if cost matters more.
  const openaiQuality =
    (process.env.OPENAI_IMAGE_QUALITY as 'low' | 'medium' | 'high' | 'auto') ||
    'high';

  // FLUX LoRA uses the trained per-child model (no template, no input photo at
  // generation time — identity lives in the LoRA). Everything else uses the
  // shared provider path (OpenAI/Gemini/fal-PuLID/Kontext).
  let rawBuffer: Buffer;
  let latencyMs: number;
  if (provider === 'segmind-faceswap') {
    // Face-swap the child's real photo INTO the template page (art preserved).
    // source = child's photo, target = the story template illustration.
    if (!baseImage) {
      throw new Error(
        'segmind-faceswap needs the story template page as the swap target, but it could not be loaded.',
      );
    }
    const swap = await faceSwapIntoTemplate({
      apiKey,
      sourcePhoto: childRefs[0].data,
      targetImage: baseImage.data,
    });
    rawBuffer = swap.buffer;
    latencyMs = swap.latencyMs;
  } else if (provider === 'flux-lora') {
    if (!loraUrl) throw new Error('flux-lora selected but no trained LoRA URL');
    const start = Date.now();
    rawBuffer = await generateWithLora({ apiKey, loraUrl, prompt });
    latencyMs = Date.now() - start;
  } else {
    const result = await generatePersonalizedImage({
      provider,
      apiKey,
      prompt,
      negativePrompt,
      referenceImages,
      quality: openaiQuality,
    });
    rawBuffer = result.buffer;
    latencyMs = result.latencyMs;
  }

  let squareBuffer = await toSquarePng(rawBuffer);

  // Text handling depends on the story's source art:
  //  • Text-layer stories (e.g. beach-adventure) ship TEXT-FREE template art, so
  //    we render the story line — with the child's name — directly in the
  //    template's matched style (Diffrun model). Perfect name replacement, any
  //    length; no panel needed since there's no baked name to cover.
  //  • Every other story still uses the opaque caption panel, which both renders
  //    the correct name AND covers any placeholder name baked into the art.
  const layoutCfg = STORY_TEXT_LAYOUTS[book.story.slug];
  const pageLayout = layoutCfg?.pages[page.pageNumber];
  if (pageLayout) {
    squareBuffer = await renderStoryText(
      squareBuffer,
      textContent,
      pageLayout,
      layoutCfg.style,
    );
  } else {
    squareBuffer = await overlayCaption(squareBuffer, textContent);
  }

  const key = `generated/${book.id}/page-${page.pageNumber}.png`;
  const { url } = await storage.save(key, squareBuffer, 'image/png');

  return {
    imageUrl: url,
    prompt,
    negativePrompt,
    textContent,
    costCents: COST_PER_IMAGE_CENTS[provider],
    latencyMs,
  };
}

function toBookForGeneration(book: {
  id: string;
  language: string;
  story: { artStyle: string; slug: string };
  child: {
    name: string;
    nickname: string | null;
    ageYears: number;
    gender: string;
    skinTone: string | null;
    hairColor: string | null;
    hasGlasses: boolean;
  };
}): BookForGeneration {
  return {
    id: book.id,
    language: book.language,
    story: { artStyle: book.story.artStyle, slug: book.story.slug },
    child: {
      name: book.child.name,
      nickname: book.child.nickname,
      ageYears: book.child.ageYears,
      gender: book.child.gender,
      skinTone: book.child.skinTone,
      hairColor: book.child.hairColor,
      hasGlasses: book.child.hasGlasses,
    },
  };
}

export interface GenerateBookPagesOptions {
  db: DatabaseService;
  settings: SettingsService;
  storage: StorageService;
  config: ConfigService;
  logger: Logger;
  job: Job<{ bookId: string }>;
  bookId: string;
  /** Used as the aiUsageLog `operation` value. */
  operation: string;
  /** Restrict to the first N pages (preview). Omit for the full 28-page book. */
  previewLimit?: number;
  /** Book status while the job runs. */
  runningStatus: 'GENERATING_PREVIEW' | 'GENERATING_FULL';
  /** Book status set once every target page is verified READY. */
  successStatus: 'PREVIEW_READY' | 'PENDING_APPROVAL';
  /** Book status restored if the job fails (so the user can retry cleanly). */
  failureStatus: 'DRAFT' | 'PREVIEW_READY';
  /** Timestamp column stamped on success. */
  successTimestampField: 'previewGeneratedAt' | 'fullGeneratedAt';
  /** Invoked after the book reaches `successStatus` (e.g. deliver the PDF). */
  onComplete?: () => Promise<void>;
}

/**
 * Shared, fault-tolerant page-generation engine used by BOTH the preview and
 * full-book processors so the 28-page generation behaves identically for every
 * downstream delivery format (PDF download and printed book).
 *
 * Guarantees:
 *  - every target page is tracked in `BookPage` (PENDING → GENERATING → READY|FAILED);
 *  - pages generate in bounded chunks (PAGE_CONCURRENCY) to respect rate limits;
 *  - each page retries independently with exponential backoff;
 *  - the book only reaches `successStatus` once a barrier confirms ALL target
 *    pages are READY — otherwise the job throws and the status is rolled back.
 */
export async function generateBookPages(
  opts: GenerateBookPagesOptions,
): Promise<void> {
  const {
    db,
    settings,
    storage,
    config,
    logger,
    job,
    bookId,
    operation,
    previewLimit,
    runningStatus,
    successStatus,
    failureStatus,
    successTimestampField,
    onComplete,
  } = opts;

  try {
    // Preview and final book can run different providers (admin per-stage
    // overrides; empty override = the single Active Provider for both).
    const { provider, apiKey, enabled } =
      await settings.getActiveImageProviderConfig(
        previewLimit != null ? 'preview' : 'final',
      );

    if (!enabled || !apiKey) {
      throw new Error(
        'Image generation is not configured. Set the provider API key and enable it in admin settings.',
      );
    }

    // Optional admin-set prompt override (empty = built-in default). Applies to
    // the template-edit providers (nano-banana-redraw / openai / gemini / kontext).
    const allSettings = await settings.getSettings();
    const customPrompt = String(allSettings.personalizationPrompt || '').trim();

    await db.book.update({
      where: { id: bookId },
      data: { status: runningStatus },
    });

    const book = await db.book.findUnique({
      where: { id: bookId },
      include: {
        child: true,
        story: { include: { pages: { orderBy: { pageNumber: 'asc' } } } },
        pages: true,
      },
    });

    if (!book) {
      throw new Error(`Book ${bookId} not found`);
    }

    // The set of pages this pipeline is responsible for. Preview = the first
    // few (preview-flagged) pages; full = every page in the story (all 28).
    const markedPreview = book.story.pages.filter((p) => p.isPreviewPage);
    const targetPages =
      previewLimit != null
        ? (markedPreview.length ? markedPreview : book.story.pages).slice(
            0,
            previewLimit,
          )
        : book.story.pages;
    const targetPageNumbers = targetPages.map((p) => p.pageNumber);

    // Skip pages already done (idempotent on job retry); (re)generate the rest.
    // A non-READY status (PENDING/GENERATING/FAILED/REGEN_REQUESTED) or a
    // missing image both mean the page still needs work.
    const byNumber = new Map(book.pages.map((bp) => [bp.pageNumber, bp]));
    const workPages = targetPages.filter((t) => {
      const existing = byNumber.get(t.pageNumber);
      return !existing || existing.status !== 'READY' || !existing.finalImageUrl;
    });

    const childRefs = await loadReferenceImages(
      storage,
      book.child.referencePhotoUrls,
      logger,
    );
    // Without a readable reference photo the model has nothing to swap the
    // face from and would just return the template unchanged — fail loudly
    // (and avoid billing for un-personalized pages) instead.
    if (childRefs.length === 0) {
      throw new Error(
        'No usable reference photo for the child. The uploaded photo could not be read — please re-upload a clear, front-facing photo.',
      );
    }

    // Crop the child's primary photo to a clean, front-facing headshot (once per
    // book, reused for every page). A tight, background-free face is the biggest
    // driver of swap/redraw likeness — a small face or a multi-person photo is
    // the main reason a provider "doesn't replace the face" on some pages. Uses
    // the fal key (Florence-2); a no-op if no fal key or no face is detected.
    const falKey = await settings.getSecret('falApiKey');
    if (falKey) {
      try {
        const cropped = await cropToFace(childRefs[0].data, falKey);
        if (cropped !== childRefs[0].data) {
          childRefs[0] = { data: cropped, mimeType: 'image/jpeg' };
          logger.log(`Cropped child photo to face for book ${bookId}`);
        }
      } catch (err) {
        logger.warn(`Face crop skipped for book ${bookId}: ${err}`);
      }
    }

    const bookForGen = toBookForGeneration(book);
    const webUrl = config.get<string>('WEB_URL') || 'http://localhost:3002';

    // FLUX LoRA: ensure a per-child LoRA exists (train once, cache on the child),
    // then every page is generated with it for a fully consistent illustrated
    // character. Training is the slow/expensive step (~3-5 min, once per child).
    let loraUrl: string | undefined;
    let loraTrigger: string | undefined;
    if (provider === 'flux-lora') {
      loraTrigger =
        book.child.loraTriggerWord || `kchild${book.child.id.slice(-8)}`;
      loraUrl = book.child.loraUrl || undefined;
      if (!loraUrl) {
        logger.log(`Training per-child LoRA for child ${book.child.id}...`);
        loraUrl = await trainChildLora({
          apiKey,
          images: childRefs,
          triggerWord: loraTrigger,
        });
        await db.childProfile.update({
          where: { id: book.child.id },
          data: {
            loraUrl,
            loraTriggerWord: loraTrigger,
            loraTrainedAt: new Date(),
          },
        });
        logger.log(`LoRA trained + cached for child ${book.child.id}`);
      } else {
        logger.log(`Reusing cached LoRA for child ${book.child.id}`);
      }
    }

    // Pre-seed per-page state so pages 1..N are individually tracked even
    // before (or if) generation succeeds.
    for (const page of workPages) {
      await db.bookPage.upsert({
        where: { bookId_pageNumber: { bookId, pageNumber: page.pageNumber } },
        create: { bookId, pageNumber: page.pageNumber, status: 'GENERATING' },
        update: { status: 'GENERATING' },
      });
    }

    // Running cost across concurrent workers. JS is single-threaded, so these
    // mutations are atomic between `await`s; `reserved` accounts for in-flight
    // pages so the budget check can't be raced past the limit.
    let costCents = book.totalImageGenCostCents;
    let reserved = 0;
    let completed = 0;
    const perImageCost = COST_PER_IMAGE_CENTS[provider];
    const concurrency = Math.max(
      1,
      Number(config.get<string>('GENERATION_CONCURRENCY')) || PAGE_CONCURRENCY,
    );

    // Character-sheet step DISABLED: Nano Banana now face-swaps directly from the
    // child's photo (the owner's proven flow), so the per-child "character sheet"
    // is no longer used as a reference. Flip this flag on to restore the earlier
    // redraw-from-character-sheet behaviour.
    const NANO_USES_CHARACTER_SHEET = false;
    let characterSheet: ReferenceImage | undefined;
    if (NANO_USES_CHARACTER_SHEET && provider === 'nano-banana-redraw') {
      const cachedUrl = book.child.characterSheetUrl || undefined;
      if (cachedUrl) {
        try {
          const key = keyFromRef(cachedUrl);
          const data = await storage.read(key);
          characterSheet = { data, mimeType: mimeFromKey(key) };
          logger.log(`Reusing cached character sheet for child ${book.child.id}`);
        } catch (err) {
          logger.warn(
            `Cached character sheet unreadable for child ${book.child.id}, regenerating: ${err}`,
          );
        }
      }
      if (!characterSheet) {
        logger.log(`Generating character sheet for child ${book.child.id}...`);
        const sheet = await buildCharacterSheet({
          apiKey,
          childRefs,
          artStyle: book.story.artStyle,
          ageYears: book.child.ageYears,
          gender: book.child.gender,
          skinTone: book.child.skinTone,
          hairColor: book.child.hairColor,
          hasGlasses: book.child.hasGlasses,
        });
        const sheetPng = await sharp(sheet.buffer).png().toBuffer();
        const key = `character-sheets/${book.child.id}.png`;
        const { url } = await storage.save(key, sheetPng, 'image/png');
        await db.childProfile.update({
          where: { id: book.child.id },
          data: {
            characterSheetUrl: url,
            characterSheetGeneratedAt: new Date(),
          },
        });
        characterSheet = { data: sheetPng, mimeType: 'image/png' };
        costCents += perImageCost;
        await db.aiUsageLog.create({
          data: {
            provider,
            operation,
            bookId,
            costCents: perImageCost,
            latencyMs: sheet.latencyMs,
            success: true,
          },
        });
        logger.log(`Character sheet generated + cached for child ${book.child.id}`);
      }
    }

    const results = await mapWithConcurrency(
      workPages,
      concurrency,
      async (page) => {
        // Budget gate (NOT retried — exceeding the cap is terminal).
        checkBookCostLimit(bookId, costCents + reserved, perImageCost);
        reserved += perImageCost;

        try {
          const gen = await withRetry(
            async () => {
              // fal/PuLID and flux-lora generate a FRESH illustration (identity
              // from the reference face / trained LoRA) — they don't edit the
              // template, so skip the base illustration. OpenAI/Gemini/Kontext
              // keep using the template-edit path unchanged.
              const baseImage =
                provider === 'fal' || provider === 'flux-lora'
                  ? undefined
                  : await fetchBaseIllustration(
                      webUrl,
                      book.story.slug,
                      page.pageNumber,
                      logger,
                    );
              return generateAndStorePage(
                storage,
                provider,
                apiKey,
                bookForGen,
                page,
                childRefs,
                baseImage,
                loraUrl,
                loraTrigger,
                characterSheet,
                customPrompt,
              );
            },
            `page ${page.pageNumber}`,
            logger,
          );

          reserved -= perImageCost;
          costCents += gen.costCents;

          await db.bookPage.update({
            where: {
              bookId_pageNumber: { bookId, pageNumber: page.pageNumber },
            },
            data: {
              status: 'READY',
              finalImageUrl: gen.imageUrl,
              generationCostCents: gen.costCents,
              generatedAt: new Date(),
              generationAttempts: {
                push: {
                  attempt: 1,
                  prompt: gen.prompt,
                  negativePrompt: gen.negativePrompt,
                  textContent: gen.textContent,
                  imageUrl: gen.imageUrl,
                  costCents: gen.costCents,
                  timestamp: new Date().toISOString(),
                },
              },
            },
          });

          await db.aiUsageLog.create({
            data: {
              provider,
              operation,
              bookId,
              pageNumber: page.pageNumber,
              costCents: gen.costCents,
              latencyMs: gen.latencyMs,
              success: true,
            },
          });

          logger.log(`Generated page ${page.pageNumber} for book ${bookId}`);
          return { pageNumber: page.pageNumber, ok: true as const };
        } catch (err) {
          reserved -= perImageCost;
          const message = err instanceof Error ? err.message : String(err);

          await db.bookPage.update({
            where: {
              bookId_pageNumber: { bookId, pageNumber: page.pageNumber },
            },
            data: {
              status: 'FAILED',
              generationAttempts: {
                push: {
                  attempt: MAX_PAGE_ATTEMPTS,
                  error: message,
                  timestamp: new Date().toISOString(),
                },
              },
            },
          });

          await db.aiUsageLog.create({
            data: {
              provider,
              operation,
              bookId,
              pageNumber: page.pageNumber,
              costCents: 0,
              latencyMs: 0,
              success: false,
              errorMessage: message.slice(0, 500),
            },
          });

          logger.error(
            `Page ${page.pageNumber} for book ${bookId} failed after ${MAX_PAGE_ATTEMPTS} attempts: ${message}`,
          );
          return { pageNumber: page.pageNumber, ok: false as const };
        } finally {
          completed += 1;
          await job.updateProgress(
            Math.round((completed / Math.max(workPages.length, 1)) * 100),
          );
        }
      },
    );

    // === STRICT COMPLETION BARRIER ===
    // Re-read state from the DB (source of truth) and require EVERY target page
    // to be READY before the book is allowed to advance. No partial books.
    const finalPages = await db.bookPage.findMany({
      where: { bookId, pageNumber: { in: targetPageNumbers } },
    });
    const readyNumbers = new Set(
      finalPages
        .filter((p) => p.status === 'READY' && p.finalImageUrl)
        .map((p) => p.pageNumber),
    );
    const missing = targetPageNumbers.filter((n) => !readyNumbers.has(n));

    if (missing.length > 0) {
      const failedThisRun = results.filter((r) => r && !r.ok).length;
      throw new Error(
        `Generation incomplete for book ${bookId}: ${readyNumbers.size}/${targetPageNumbers.length} pages ready. ` +
          `Missing/failed pages: [${missing.join(', ')}] (${failedThisRun} failed this run). ` +
          `Will retry on next job attempt.`,
      );
    }

    await db.book.update({
      where: { id: bookId },
      data: {
        status: successStatus,
        totalImageGenCostCents: costCents,
        ...(successTimestampField === 'previewGeneratedAt'
          ? { previewGeneratedAt: new Date() }
          : { fullGeneratedAt: new Date() }),
      },
    });

    logger.log(
      `Generation complete for book ${bookId}: ${readyNumbers.size}/${targetPageNumbers.length} pages. ` +
        `Total cost: ${costCents} cents`,
    );

    if (onComplete) {
      try {
        await onComplete();
      } catch (err) {
        // Post-completion side effects (e.g. PDF email) must never fail the job
        // or roll back the verified pages.
        logger.error(`onComplete hook failed for book ${bookId}: ${err}`);
      }
    }
  } catch (error) {
    const isBudget = error instanceof CostLimitExceededError;
    logger.error(
      `Generation failed for book ${bookId} (${operation}): ${error}`,
    );
    await db.book.update({
      where: { id: bookId },
      data: { status: failureStatus },
    });
    // Budget overruns are terminal — rethrowing still surfaces them, but the
    // message makes the cause explicit in the failed-job record.
    if (isBudget) {
      throw new Error(`Book ${bookId} hit the generation cost limit: ${error}`);
    }
    throw error;
  }
}
