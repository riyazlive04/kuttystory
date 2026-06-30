/**
 * Segmind FaceSwap Comic v1 — managed face-swap into the story template.
 *
 * Unlike the prompt-based providers (OpenAI/Gemini/fal), this takes the child's
 * PHOTO as the source and the hand-illustrated template page as the target, and
 * repaints ONLY the face to resemble the child while preserving the template's
 * painterly art. No GPU / ComfyUI — a single managed HTTPS call.
 *
 * Tuned defaults (validated in the PoC): high face_strength + lower
 * style_strength keeps the child's real skin tone / hair instead of drifting to
 * the template character's colouring.
 */

import sharp from 'sharp';

const SEGMIND_FACESWAP_URL = 'https://api.segmind.com/v1/faceswap-comic';

export interface FaceSwapOptions {
  apiKey: string;
  /** The child's real photo (face source). */
  sourcePhoto: Buffer;
  /** The story template page to swap the face into (target, art preserved). */
  targetImage: Buffer;
  /** 0–1, identity preservation. Higher = closer to the real child. */
  faceStrength?: number;
  /** 0–2, how much the face adapts to the template art. Lower = keep the
   *  child's real colouring; higher = match the illustration more. */
  styleStrength?: number;
  /** Optional mask (white = swap region) for tighter face control. */
  maskImage?: Buffer;
  /** Diffusion steps; higher = more detail, slower. */
  steps?: number;
  /** Cap the longest side (px) sent to Segmind. Segmind's faceswap-comic
   *  processes at the target resolution and has an internal ~100s timeout —
   *  large inputs blow past it and return "Internal Polling Error". */
  maxDimension?: number;
  /** How many times to call Segmind before giving up. Its "Internal Polling
   *  Error" is a transient server-side timeout that varies with load, so a
   *  retry usually lands a fast (successful) run. */
  maxAttempts?: number;
}

export interface FaceSwapResult {
  buffer: Buffer;
  latencyMs: number;
}

const DEFAULTS = {
  faceStrength: 0.95,
  styleStrength: 0.6,
  // Lower steps keep each job comfortably under Segmind's internal timeout while
  // staying high enough for a clean face-swap (validated on the beach pages).
  steps: 15,
  // 1024 keeps jobs fast + reliable; larger inputs intermittently time out.
  maxDimension: 1024,
  // Segmind's faceswap-comic fails transiently (~"Internal Polling Error") on a
  // large share of calls; retrying lands a good run. This is ON TOP of the
  // orchestrator's own per-page retry.
  maxAttempts: 4,
};

const RETRY_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Swap the child's face into a story template via Segmind FaceSwap Comic.
 * Returns the personalized illustration (same dimensions as the target).
 */
export async function faceSwapIntoTemplate(
  opts: FaceSwapOptions,
): Promise<FaceSwapResult> {
  const maxDim = opts.maxDimension ?? DEFAULTS.maxDimension;
  // Downscale BOTH inputs so the job stays fast enough to finish before
  // Segmind's internal polling timeout. The template is square; `inside` keeps
  // its aspect, `withoutEnlargement` never upscales a smaller source.
  const [target, source] = await Promise.all([
    sharp(opts.targetImage)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer(),
    sharp(opts.sourcePhoto)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer(),
  ]);

  const body: Record<string, unknown> = {
    source_image: source.toString('base64'),
    target_image: target.toString('base64'),
    face_strength: opts.faceStrength ?? DEFAULTS.faceStrength,
    style_strength: opts.styleStrength ?? DEFAULTS.styleStrength,
    steps: opts.steps ?? DEFAULTS.steps,
    base64: false,
  };
  if (opts.maskImage) {
    body.mask_image = opts.maskImage.toString('base64');
    body.grow_mask = 10;
  }

  const maxAttempts = opts.maxAttempts ?? DEFAULTS.maxAttempts;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    let res: Response;
    try {
      res = await fetch(SEGMIND_FACESWAP_URL, {
        method: 'POST',
        headers: { 'x-api-key': opts.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      lastError = new Error(`Segmind request error: ${err}`);
      if (attempt < maxAttempts) await sleep(RETRY_DELAY_MS * attempt);
      continue;
    }
    const latencyMs = Date.now() - start;
    const contentType = res.headers.get('content-type') || '';

    // Success = an image body (Segmind returns errors as JSON, even with 200).
    if (res.ok && !contentType.includes('json')) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 0) return { buffer, latencyMs };
      lastError = new Error('Segmind faceswap-comic returned an empty image');
    } else {
      const detail = (await res.text().catch(() => ''))
        .slice(0, 300)
        .replace(/\s+/g, ' ');
      // "Internal Polling Error" / 5xx / 429 are transient server-side timeouts;
      // the next attempt usually catches a fast run.
      lastError = new Error(
        `Segmind faceswap-comic failed: HTTP ${res.status} ${detail}`,
      );
    }
    if (attempt < maxAttempts) await sleep(RETRY_DELAY_MS * attempt);
  }

  throw lastError ?? new Error('Segmind faceswap-comic failed');
}
