/**
 * Per-child FLUX LoRA: train a lightweight model on the child's photos so every
 * page renders the SAME fully-illustrated character (face, hair, skin, body) —
 * the consistency that edit/face-swap providers can't deliver. Trained once per
 * child (cached on ChildProfile.loraUrl), then used to generate every page.
 *
 * Uses the official @fal-ai/client (ESM) loaded via a runtime import so it works
 * from NestJS's CommonJS output without TS downleveling it to require().
 */
import AdmZip from 'adm-zip';
import sharp from 'sharp';

export interface LoraRefImage {
  data: Buffer;
  mimeType: string;
}

// Load the ESM-only fal client without TS rewriting import() -> require().
const importEsm = new Function('m', 'return import(m)') as (
  m: string,
) => Promise<any>;
let falModPromise: Promise<any> | null = null;

async function getFal(apiKey: string): Promise<any> {
  if (!falModPromise) falModPromise = importEsm('@fal-ai/client');
  const mod = await falModPromise;
  const fal = mod.fal;
  fal.config({ credentials: apiKey });
  return fal;
}

/** Normalize/augment photos to at least `min` training images (768² JPEG). */
async function buildTrainingImages(
  images: LoraRefImage[],
  min = 4,
): Promise<Buffer[]> {
  const norm = (b: Buffer) =>
    sharp(b).resize(768, 768, { fit: 'cover' }).jpeg({ quality: 92 }).toBuffer();

  if (images.length >= min) {
    return Promise.all(images.map((i) => norm(i.data)));
  }

  // Few photos (often just 1): synthesize light variations so the trainer has
  // enough samples. Real multi-photo uploads skip this and train far better.
  const base = sharp(images[0].data).resize(768, 768, { fit: 'cover' });
  const out: Buffer[] = [
    await base.clone().jpeg({ quality: 92 }).toBuffer(),
    await base.clone().flop().jpeg({ quality: 92 }).toBuffer(),
    await base.clone().modulate({ brightness: 1.08 }).jpeg({ quality: 92 }).toBuffer(),
    await base.clone().modulate({ saturation: 1.1 }).jpeg({ quality: 92 }).toBuffer(),
    await base
      .clone()
      .extract({ left: 40, top: 0, width: 688, height: 768 })
      .resize(768, 768)
      .jpeg({ quality: 92 })
      .toBuffer(),
  ];
  // Fold in any additional real photos beyond the first.
  for (let i = 1; i < images.length; i++) out.push(await norm(images[i].data));
  return out;
}

/** Train a per-child LoRA and return the diffusers weights URL. */
export async function trainChildLora(opts: {
  apiKey: string;
  images: LoraRefImage[];
  triggerWord: string;
}): Promise<string> {
  const fal = await getFal(opts.apiKey);
  const imgs = await buildTrainingImages(opts.images, 4);

  const zip = new AdmZip();
  imgs.forEach((b, i) => zip.addFile(`photo_${i + 1}.jpg`, b));
  const zipBuf = zip.toBuffer();

  // fal needs a real URL (data-URI is rejected as "too long") → upload first.
  const file = new File([zipBuf], 'images.zip', { type: 'application/zip' });
  const zipUrl: string = await fal.storage.upload(file);

  const train = await fal.subscribe('fal-ai/flux-lora-fast-training', {
    input: {
      images_data_url: zipUrl,
      trigger_word: opts.triggerWord,
      steps: 1000,
      create_masks: true,
    },
  });

  const url = train?.data?.diffusers_lora_file?.url;
  if (!url) {
    throw new Error('LoRA training returned no weights file');
  }
  return url;
}

/** Generate one illustration with the trained per-child LoRA. */
export async function generateWithLora(opts: {
  apiKey: string;
  loraUrl: string;
  prompt: string;
}): Promise<Buffer> {
  const fal = await getFal(opts.apiKey);
  // scale 0.8 (not 1.0): the LoRA was trained on REAL photos, so at full
  // strength it drags the output toward photorealism and overrides the cartoon
  // style prompt. ~0.8 keeps the child's identity while letting the storybook
  // art style win. Tune with FLUX_LORA_SCALE.
  const scale = Number(process.env.FLUX_LORA_SCALE) || 0.8;
  const gen = await fal.subscribe('fal-ai/flux-lora', {
    input: {
      prompt: opts.prompt,
      loras: [{ path: opts.loraUrl, scale }],
      image_size: 'square_hd',
      num_images: 1,
      num_inference_steps: 30,
      guidance_scale: 3.5,
    },
  });
  const url: string | undefined = gen?.data?.images?.[0]?.url;
  if (!url) {
    throw new Error('LoRA generation returned no image');
  }
  if (url.startsWith('data:')) {
    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LoRA image fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Build the generation prompt for a LoRA page (the LoRA carries identity). */
export function buildLoraPagePrompt(opts: {
  triggerWord: string;
  ageYears: number;
  gender: string;
  sceneDescription: string;
  artStyle?: string;
}): string {
  const g =
    opts.gender?.toUpperCase() === 'BOY'
      ? 'boy'
      : opts.gender?.toUpperCase() === 'GIRL'
        ? 'girl'
        : 'child';
  // Style FIRST and emphatic — leading with "illustration / not a photograph"
  // keeps the realistic-trained LoRA from rendering a photo instead of cartoon art.
  return [
    `A children's storybook illustration, soft hand-painted ${opts.artStyle || 'cartoon'} Pixar-style 2D art, whimsical and colorful — NOT a photograph, not realistic.`,
    `It shows ${opts.triggerWord}, a cute cartoon ${opts.ageYears}-year-old ${g}, as the hero of the page.`,
    `Scene: ${opts.sceneDescription}.`,
    `Full body, warm lighting, clean line art, the same consistent illustrated character. No text, letters, captions or watermarks.`,
  ].join(' ');
}
