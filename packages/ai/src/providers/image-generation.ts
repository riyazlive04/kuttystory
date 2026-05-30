import { GoogleGenAI } from '@google/genai';
import OpenAI, { toFile } from 'openai';

export type ImageProvider = 'gemini' | 'openai' | 'fal';

export interface ReferenceImage {
  data: Buffer;
  mimeType: string;
}

export interface GenerateImageOptions {
  provider: ImageProvider;
  apiKey: string;
  /** Final, fully-built illustration prompt. */
  prompt: string;
  negativePrompt?: string;
  /** Photos of the child to condition the illustration on (face/likeness). */
  referenceImages?: ReferenceImage[];
  geminiModel?: string;
  openaiModel?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  /**
   * How hard gpt-image-1 works to preserve facial features from the input
   * photo(s). 'high' is essential for recognizable personalization (it's what
   * makes the child's likeness carry through); 'low' is the API default and
   * produces a generic face. Only applies to the edit (reference-image) path.
   */
  inputFidelity?: 'high' | 'low';
  /**
   * Output detail/quality for gpt-image models. 'high' produces the sharpest,
   * most detailed result (and costs the most); 'auto' lets the model decide.
   */
  quality?: 'low' | 'medium' | 'high' | 'auto';
  /**
   * fal.ai model endpoint id for the identity-preserving (PuLID) path.
   * Defaults to 'fal-ai/flux-pulid'. Only used when provider === 'fal'.
   */
  falModel?: string;
  timeoutMs?: number;
}

export interface GenerateImageResult {
  buffer: Buffer;
  mimeType: string;
  latencyMs: number;
  provider: ImageProvider;
}

const DEFAULT_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Generate a personalized illustration. When `referenceImages` are supplied the
 * model is asked to preserve the child's likeness (face/hair/skin tone) from the
 * uploaded photo while rendering them into the storybook scene.
 */
export async function generatePersonalizedImage(
  opts: GenerateImageOptions,
): Promise<GenerateImageResult> {
  if (!opts.apiKey) {
    throw new Error('No API key configured for image generation');
  }
  const start = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let buffer: Buffer;
  if (opts.provider === 'openai') {
    buffer = await withTimeout(generateWithOpenAI(opts), timeoutMs, 'OpenAI image generation');
  } else if (opts.provider === 'fal') {
    buffer = await withTimeout(generateWithFal(opts), timeoutMs, 'fal image generation');
  } else {
    buffer = await withTimeout(generateWithGemini(opts), timeoutMs, 'Gemini image generation');
  }

  return {
    buffer,
    mimeType: 'image/png',
    latencyMs: Date.now() - start,
    provider: opts.provider,
  };
}

async function generateWithGemini(opts: GenerateImageOptions): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const model = opts.geminiModel || 'gemini-2.5-flash-image';

  const promptText = opts.negativePrompt
    ? `${opts.prompt}\n\nAvoid: ${opts.negativePrompt}`
    : opts.prompt;

  const parts: Array<Record<string, unknown>> = [];
  for (const ref of opts.referenceImages ?? []) {
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.data.toString('base64') },
    });
  }
  parts.push({ text: promptText });

  const response: any = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const candidateParts = candidate?.content?.parts ?? [];
    for (const part of candidateParts) {
      const data = part?.inlineData?.data;
      if (data) {
        return Buffer.from(data, 'base64');
      }
    }
  }
  throw new Error('Gemini returned no image data');
}

async function generateWithOpenAI(opts: GenerateImageOptions): Promise<Buffer> {
  const client = new OpenAI({ apiKey: opts.apiKey });
  // gpt-image-1.5 is the current default — stronger identity preservation than
  // the original gpt-image-1. Override via opts.openaiModel if the account
  // doesn't yet have access (fall back to 'gpt-image-1').
  const model = opts.openaiModel || 'gpt-image-1.5';
  const size = opts.size || '1024x1024';
  const quality = opts.quality ?? 'high';

  const refs = opts.referenceImages ?? [];
  let response: any;

  if (refs.length > 0) {
    // Image edit: condition generation on the uploaded photo.
    const files = await Promise.all(
      refs.map((ref, i) =>
        toFile(ref.data, `reference-${i}.png`, { type: ref.mimeType }),
      ),
    );
    response = await client.images.edit({
      model,
      image: files.length === 1 ? files[0] : files,
      prompt: opts.prompt,
      size,
      // Preserve the child's actual facial features from the uploaded photo.
      // Without this the API defaults to 'low' and invents a generic face.
      input_fidelity: opts.inputFidelity ?? 'high',
      quality,
    } as any);
  } else {
    response = await client.images.generate({
      model,
      prompt: opts.prompt,
      size,
      quality,
    } as any);
  }

  const b64 = response?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI returned no image data');
  }
  return Buffer.from(b64, 'base64');
}

const FAL_DEFAULT_MODEL = 'fal-ai/flux-pulid';

/** Map our square size to fal's image_size enum. */
function falImageSize(size?: string): string {
  if (size === '1024x1536') return 'portrait_4_3';
  if (size === '1536x1024') return 'landscape_4_3';
  return 'square_hd'; // 1024x1024
}

/**
 * Identity-preserving generation via fal.ai PuLID-Flux. Unlike the OpenAI/Gemini
 * edit paths, PuLID does NOT edit a template — it generates a fresh illustration
 * from `prompt` while locking the child's identity from a single reference face
 * (`reference_image_url`). Called over fal's synchronous REST endpoint, so no SDK
 * dependency is required. `sync_mode: true` returns the image inline as a data URI.
 */
async function generateWithFal(opts: GenerateImageOptions): Promise<Buffer> {
  const model = opts.falModel || FAL_DEFAULT_MODEL;

  // PuLID needs exactly one reference face. Use the first child photo.
  const face = opts.referenceImages?.[0];
  if (!face) {
    throw new Error('fal PuLID requires a reference face image');
  }
  const referenceImageUrl = `data:${face.mimeType};base64,${face.data.toString('base64')}`;

  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: opts.prompt,
      reference_image_url: referenceImageUrl,
      image_size: falImageSize(opts.size),
      negative_prompt: opts.negativePrompt || '',
      num_inference_steps: 20,
      guidance_scale: 4,
      // Return the generated image inline as a data URI (no extra fetch / hosting).
      sync_mode: true,
      enable_safety_checker: true,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`fal ${model} failed: ${res.status} ${detail.slice(0, 300)}`);
  }

  const json: any = await res.json();
  const url: string | undefined = json?.images?.[0]?.url;
  if (!url) {
    throw new Error('fal returned no image data');
  }

  // With sync_mode the url is a data URI (data:<mime>;base64,<data>); decode it.
  // Fall back to fetching a remote URL if fal returns one instead.
  const comma = url.indexOf(',');
  if (url.startsWith('data:') && comma >= 0) {
    return Buffer.from(url.slice(comma + 1), 'base64');
  }
  const imgRes = await fetch(url);
  if (!imgRes.ok) {
    throw new Error(`fal image fetch failed: ${imgRes.status}`);
  }
  return Buffer.from(await imgRes.arrayBuffer());
}
