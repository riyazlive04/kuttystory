/**
 * AI provider comparison harness — Change Prompt §2 validation gate.
 *
 * Generates the same 5 pages for one child four ways and produces a side-by-side
 * HTML report with cost + latency, so the team can decide whether FLUX + LoRA
 * beats the OpenAI baseline (and how fal PuLID stacks up) BEFORE any production
 * code changes.
 *
 *   A · OpenAI gpt-image-1.5  (existing baseline)   — reuses @kutty-story/ai
 *   B · FLUX Kontext          (reference, no LoRA)   — Replicate
 *   C · FLUX dev + LoRA       (per-child training)   — Replicate
 *   D · fal.ai PuLID          (current cheap path)   — reuses @kutty-story/ai
 *
 * Run:  npx tsx apps/api/test/ai-comparison/compare-providers.ts
 * See README.md for env vars, dependencies, and the ~$20 budget note.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  generatePersonalizedImage,
  buildIllustrationPrompt,
  buildPersonalizationEditPrompt,
  buildNegativePrompt,
  type ReferenceImage,
} from '@kutty-story/ai';
import type {
  ComparisonConfig,
  Option,
  OptionSummary,
  PageResult,
  PageConfig,
} from './types';
import {
  FLUX_COSTS,
  generateFluxKontext,
  generateFluxLora,
  trainLora,
  type RefPhoto,
  type TrainedLora,
} from './replicate-flux';

const HERE = __dirname;
const log = (m: string) => console.log(m);

const OPENAI_CENTS = Number(process.env.CMP_OPENAI_CENTS) || 20;
const FAL_CENTS = Number(process.env.CMP_FAL_CENTS) || 4;

function loadConfig(): ComparisonConfig {
  const real = path.join(HERE, 'comparison-config.ts');
  const file = fs.existsSync(real) ? './comparison-config' : './comparison-config.example';
  if (file.endsWith('.example')) {
    log('⚠️  Using comparison-config.example.ts — copy it to comparison-config.ts and edit for a real run.');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(file).default as ComparisonConfig;
}

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function loadPhotos(dir: string): RefPhoto[] {
  const abs = path.isAbsolute(dir) ? dir : path.join(HERE, dir);
  if (!fs.existsSync(abs)) {
    throw new Error(`Photos dir not found: ${abs}. Drop 3–5 photos of the child there.`);
  }
  const files = fs
    .readdirSync(abs)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .slice(0, 5);
  if (files.length === 0) throw new Error(`No photos (jpg/png/webp) found in ${abs}.`);
  return files.map((f) => ({
    data: fs.readFileSync(path.join(abs, f)),
    mimeType: mimeFor(f),
    filename: f,
  }));
}

function asRefImages(photos: RefPhoto[]): ReferenceImage[] {
  return photos.map((p) => ({ data: p.data, mimeType: p.mimeType }));
}

function characterFor(cfg: ComparisonConfig) {
  return {
    childName: cfg.child.name,
    ageYears: cfg.child.ageYears,
    gender: cfg.child.gender,
    skinTone: cfg.child.skinTone,
    hairColor: cfg.child.hairColor,
    hasGlasses: cfg.child.hasGlasses ?? false,
  };
}

function scenePrompt(cfg: ComparisonConfig, page: PageConfig, triggerWord?: string): string {
  const base = buildIllustrationPrompt({
    styleTokens: cfg.style,
    character: characterFor(cfg),
    sceneDescription: page.scene,
    composition: page.composition,
  });
  return triggerWord ? `${base}\n[CHARACTER-ID]: ${triggerWord}` : base;
}

function randomTrigger(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `KSCHILD_${s}`;
}

/** Generate one page for one option; returns the raw PNG/JPEG buffer. */
async function generateOne(
  option: Option,
  cfg: ComparisonConfig,
  page: PageConfig,
  photos: RefPhoto[],
  lora: TrainedLora | null,
): Promise<Buffer> {
  const negativePrompt = buildNegativePrompt();

  if (option === 'A_openai') {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (page.baseTemplatePath) {
      // Production baseline: edit the existing template with the child's photos.
      const tplPath = path.isAbsolute(page.baseTemplatePath)
        ? page.baseTemplatePath
        : path.join(HERE, page.baseTemplatePath);
      const template: ReferenceImage = {
        data: fs.readFileSync(tplPath),
        mimeType: mimeFor(tplPath),
      };
      const res = await generatePersonalizedImage({
        provider: 'openai',
        apiKey,
        prompt: buildPersonalizationEditPrompt({ childName: cfg.child.name, caption: page.caption }),
        negativePrompt,
        referenceImages: [template, ...asRefImages(photos)],
      });
      return res.buffer;
    }
    // No template provided → fresh generation from photos (same conditions as B/C/D).
    const res = await generatePersonalizedImage({
      provider: 'openai',
      apiKey,
      prompt: scenePrompt(cfg, page),
      negativePrompt,
      referenceImages: asRefImages(photos),
    });
    return res.buffer;
  }

  if (option === 'D_fal_pulid') {
    const apiKey = process.env.FAL_API_KEY || process.env.FAL_KEY || '';
    const res = await generatePersonalizedImage({
      provider: 'fal',
      apiKey,
      prompt: scenePrompt(cfg, page),
      negativePrompt,
      referenceImages: asRefImages(photos),
    });
    return res.buffer;
  }

  if (option === 'B_flux_kontext') {
    return generateFluxKontext(scenePrompt(cfg, page), photos);
  }

  if (option === 'C_flux_lora') {
    if (!lora) throw new Error('LoRA not trained');
    return generateFluxLora(scenePrompt(cfg, page, lora.triggerWord), lora);
  }

  throw new Error(`Unknown option ${option}`);
}

function perImageCents(option: Option): number {
  switch (option) {
    case 'A_openai': return OPENAI_CENTS;
    case 'B_flux_kontext': return FLUX_COSTS.kontextPerImageCents;
    case 'C_flux_lora': return FLUX_COSTS.fluxDevPerImageCents;
    case 'D_fal_pulid': return FAL_CENTS;
  }
}

async function runOption(
  option: Option,
  cfg: ComparisonConfig,
  photos: RefPhoto[],
  runDir: string,
): Promise<OptionSummary> {
  log(`\n=== Option ${option} ===`);
  const outDir = path.join(runDir, option);
  fs.mkdirSync(outDir, { recursive: true });

  let setupCostCents = 0;
  let setupNote: string | undefined;
  let lora: TrainedLora | null = null;

  if (option === 'C_flux_lora') {
    try {
      lora = await trainLora(photos, randomTrigger(), log);
      setupCostCents = FLUX_COSTS.loraTrainingCents;
      setupNote = '(one-time; ₹0 for repeat books)';
    } catch (err) {
      // Training failed → record every page as failed with the reason.
      const reason = err instanceof Error ? err.message : String(err);
      log(`  LoRA training failed: ${reason}`);
      const results: PageResult[] = cfg.pages.map((p) => ({
        option, pageNumber: p.pageNumber, imageFile: null,
        estimatedCostCents: 0, latencyMs: 0, error: `LoRA training failed: ${reason}`,
      }));
      return summarize(option, FLUX_COSTS.loraTrainingCents, '(training failed)', results);
    }
  }

  const results: PageResult[] = [];
  for (const page of cfg.pages) {
    const t0 = Date.now();
    try {
      const buf = await generateOne(option, cfg, page, photos, lora);
      const file = `${option}/page-${page.pageNumber}.png`;
      fs.writeFileSync(path.join(runDir, file), buf);
      const latencyMs = Date.now() - t0;
      results.push({
        option, pageNumber: page.pageNumber, imageFile: file,
        estimatedCostCents: perImageCents(option), latencyMs,
      });
      log(`  page ${page.pageNumber}: ok (${(latencyMs / 1000).toFixed(1)}s)`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      results.push({
        option, pageNumber: page.pageNumber, imageFile: null,
        estimatedCostCents: 0, latencyMs: Date.now() - t0, error: reason,
      });
      log(`  page ${page.pageNumber}: FAILED — ${reason}`);
    }
  }

  return summarize(option, setupCostCents, setupNote, results);
}

function summarize(
  option: Option,
  setupCostCents: number,
  setupNote: string | undefined,
  results: PageResult[],
): OptionSummary {
  const ok = results.filter((r) => r.imageFile);
  const totalImageCostCents = ok.reduce((a, r) => a + r.estimatedCostCents, 0);
  const avgLatencyMs = ok.length ? Math.round(ok.reduce((a, r) => a + r.latencyMs, 0) / ok.length) : 0;
  return {
    option,
    label: option,
    setupCostCents,
    setupNote,
    perImageCents: perImageCents(option),
    totalImageCostCents,
    grandTotalCents: setupCostCents + totalImageCostCents,
    avgLatencyMs,
    successCount: ok.length,
    failCount: results.length - ok.length,
    results,
  };
}

async function main() {
  const cfg = loadConfig();
  const options: Option[] = cfg.options ?? ['A_openai', 'B_flux_kontext', 'C_flux_lora', 'D_fal_pulid'];
  const photos = loadPhotos(cfg.photosDir);
  log(`Loaded ${photos.length} reference photos for ${cfg.child.name}.`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(HERE, 'test-output', `comparison-${stamp}`);
  fs.mkdirSync(runDir, { recursive: true });
  log(`Output → ${runDir}`);

  const summaries: OptionSummary[] = [];
  for (const option of options) {
    summaries.push(await runOption(option, cfg, photos, runDir));
  }

  // Lazy import to keep the report module out of the hot path.
  const { buildReport } = await import('./report');
  const pageNumbers = cfg.pages.map((p) => p.pageNumber);
  const html = buildReport(cfg.storyTitle, cfg.child.name, pageNumbers, summaries, stamp);
  fs.writeFileSync(path.join(runDir, 'report.html'), html);
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summaries, null, 2));

  log('\n──────── SUMMARY ────────');
  for (const s of summaries) {
    const per28 = s.setupCostCents + s.perImageCents * 28;
    log(
      `${s.option}: ${s.successCount}/${s.successCount + s.failCount} ok · ` +
        `~$${(per28 / 100).toFixed(2)}/28-page book · avg ${(s.avgLatencyMs / 1000).toFixed(1)}s/img`,
    );
  }
  log(`\nOpen the report: ${path.join(runDir, 'report.html')}`);
}

main().catch((err) => {
  console.error('\n❌ Comparison failed:', err);
  process.exit(1);
});
