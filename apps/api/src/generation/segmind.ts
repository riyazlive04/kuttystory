/**
 * Segmind FaceSwap Comic — managed face-swap into the story template.
 *
 * Unlike the prompt-based providers (OpenAI/Gemini/fal/Qwen), this takes the
 * child's PHOTO as the source and the hand-illustrated template page as the
 * target, and repaints ONLY the face to resemble the child while preserving the
 * template's painterly art. No GPU / ComfyUI — managed HTTPS calls.
 *
 * RELIABILITY — uses Segmind's ASYNC v2 queue, not the sync endpoint. The sync
 * endpoint has an internal ~100s cutoff and returns "Internal Polling Error" on
 * any job slower than that — and faceswap-comic jobs routinely take 60–175s, so
 * the sync path failed a large share of the time. The async v2 flow (submit →
 * poll request_id → fetch result, ~600s ceiling) lets slow jobs finish; the
 * occasional FAILED is retried. Validated live: pages that always failed on
 * sync now complete at 60–140s.
 *
 * Tuned defaults (validated in the PoC): high face_strength + lower
 * style_strength keeps the child's real skin tone / hair instead of drifting to
 * the template character's colouring.
 */

import sharp from 'sharp';

// ASYNC v2 queue endpoints (see module header for why sync is not used).
const SEGMIND_SUBMIT_URL = 'https://api.segmind.com/v2/faceswap-comic';

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
  /** Cap the longest side (px) sent to Segmind. Larger inputs are slower (and
   *  more likely to exceed the async deadline). 1024 is the validated default. */
  maxDimension?: number;
  /** How many times to submit a fresh job before giving up. A job can come back
   *  FAILED transiently under load; a resubmit usually lands a good run. This is
   *  ON TOP of the orchestrator's own per-page retry. */
  maxAttempts?: number;
  /** Overall per-job poll deadline (ms). Jobs finish in ~60–175s; the cap keeps
   *  a stuck job from blocking forever (Segmind retains results ~1h, ceiling 600s). */
  pollDeadlineMs?: number;
}

export interface FaceSwapResult {
  buffer: Buffer;
  latencyMs: number;
}

const DEFAULTS = {
  faceStrength: 0.95,
  styleStrength: 0.6,
  // Lower steps keep each job faster (and well under the async deadline) while
  // staying high enough for a clean face-swap (validated on the beach pages).
  steps: 15,
  // 1024 keeps jobs fast + reliable; larger inputs are slower.
  maxDimension: 1024,
  // A resubmit clears a transient FAILED; the orchestrator retries on top.
  maxAttempts: 3,
  // Generous enough for the slowest observed jobs (~175s) with headroom, under
  // Segmind's ~600s retention ceiling.
  pollDeadlineMs: 240_000,
};

const RETRY_DELAY_MS = 3000;
// Poll fast at first (most jobs are mid-flight), then back off to stay gentle.
const POLL_FAST_MS = 2000;
const POLL_SLOW_MS = 5000;
const POLL_FAST_COUNT = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SubmitResult {
  requestId: string;
  statusUrl: string;
  responseUrl: string;
}

/** Submit a face-swap job to the async v2 queue; returns the poll/result URLs. */
async function submitJob(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<SubmitResult> {
  const res = await fetch(SEGMIND_SUBMIT_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300).replace(/\s+/g, ' ');
    throw new Error(`Segmind faceswap-comic submit failed: HTTP ${res.status} ${detail}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const requestId = (json.request_id || json.requestId || json.id) as string | undefined;
  if (!requestId) {
    throw new Error(`Segmind submit returned no request_id: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return {
    requestId,
    statusUrl:
      (json.status_url as string) ||
      `https://api.segmind.com/v2/requests/${requestId}/status`,
    responseUrl:
      (json.response_url as string) ||
      `https://api.segmind.com/v2/requests/${requestId}`,
  };
}

/** Poll a job's status until it's COMPLETED/FAILED or the deadline passes. */
async function pollUntilDone(
  apiKey: string,
  statusUrl: string,
  deadlineMs: number,
): Promise<string> {
  const start = Date.now();
  let polls = 0;
  let status = 'QUEUED';
  while (Date.now() - start < deadlineMs) {
    await sleep(polls < POLL_FAST_COUNT ? POLL_FAST_MS : POLL_SLOW_MS);
    polls++;
    let res: Response;
    try {
      res = await fetch(statusUrl, { headers: { 'x-api-key': apiKey } });
    } catch {
      continue; // transient network blip — keep polling
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    status = ((json.status || json.state) as string) || status;
    if (status === 'COMPLETED' || status === 'FAILED') return status;
  }
  return 'TIMEOUT';
}

/** Fetch the finished job's image bytes from the result endpoint. */
async function fetchResultImage(apiKey: string, responseUrl: string): Promise<Buffer> {
  const res = await fetch(responseUrl, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(`Segmind result fetch failed: HTTP ${res.status} ${detail}`);
  }
  const json = (await res.json()) as {
    images?: Array<{ url?: string }>;
    image_url?: string;
    output?: string;
  };
  const url = json.images?.[0]?.url || json.image_url || json.output;
  if (!url) {
    throw new Error('Segmind result had no image url');
  }
  const img = await fetch(url);
  if (!img.ok) {
    throw new Error(`Segmind output image download failed: HTTP ${img.status}`);
  }
  const buffer = Buffer.from(await img.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error('Segmind output image was empty');
  }
  return buffer;
}

/**
 * Swap the child's face into a story template via Segmind FaceSwap Comic (async).
 * Returns the personalized illustration.
 */
export async function faceSwapIntoTemplate(
  opts: FaceSwapOptions,
): Promise<FaceSwapResult> {
  const maxDim = opts.maxDimension ?? DEFAULTS.maxDimension;
  // Downscale BOTH inputs so the job runs faster and reliably finishes within
  // the async deadline. The template is square; `inside` keeps its aspect,
  // `withoutEnlargement` never upscales a smaller source.
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
  const deadline = opts.pollDeadlineMs ?? DEFAULTS.pollDeadlineMs;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const { statusUrl, responseUrl } = await submitJob(opts.apiKey, body);
      const status = await pollUntilDone(opts.apiKey, statusUrl, deadline);
      if (status === 'COMPLETED') {
        const buffer = await fetchResultImage(opts.apiKey, responseUrl);
        return { buffer, latencyMs: Date.now() - start };
      }
      // FAILED/TIMEOUT are transient under load — a fresh submit usually lands.
      lastError = new Error(`Segmind faceswap-comic job ${status} after ${Math.round((Date.now() - start) / 1000)}s`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxAttempts) await sleep(RETRY_DELAY_MS * attempt);
  }

  throw lastError ?? new Error('Segmind faceswap-comic failed');
}
