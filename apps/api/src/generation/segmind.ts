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
}

export interface FaceSwapResult {
  buffer: Buffer;
  latencyMs: number;
}

const DEFAULTS = {
  faceStrength: 0.95,
  styleStrength: 0.6,
  steps: 25,
};

/**
 * Swap the child's face into a story template via Segmind FaceSwap Comic.
 * Returns the personalized illustration (same dimensions as the target).
 */
export async function faceSwapIntoTemplate(
  opts: FaceSwapOptions,
): Promise<FaceSwapResult> {
  const body: Record<string, unknown> = {
    source_image: opts.sourcePhoto.toString('base64'),
    target_image: opts.targetImage.toString('base64'),
    face_strength: opts.faceStrength ?? DEFAULTS.faceStrength,
    style_strength: opts.styleStrength ?? DEFAULTS.styleStrength,
    steps: opts.steps ?? DEFAULTS.steps,
    base64: false,
  };
  if (opts.maskImage) {
    body.mask_image = opts.maskImage.toString('base64');
    body.grow_mask = 10;
  }

  const start = Date.now();
  const res = await fetch(SEGMIND_FACESWAP_URL, {
    method: 'POST',
    headers: { 'x-api-key': opts.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 500);
    throw new Error(`Segmind faceswap-comic failed: HTTP ${res.status} ${detail}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error('Segmind faceswap-comic returned an empty image');
  }
  return { buffer, latencyMs };
}
