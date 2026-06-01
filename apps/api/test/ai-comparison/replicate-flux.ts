/**
 * Replicate FLUX helpers for the comparison harness (Options B and C).
 *
 * STANDALONE test code. Not imported by any production module. Requires the
 * `replicate` and `adm-zip` packages and a REPLICATE_API_TOKEN — see README.
 *
 * Option B — FLUX Kontext: reference-conditioned generation, no training.
 * Option C — FLUX dev + per-child LoRA: train once on the photos, then generate.
 */
import Replicate from 'replicate';
import AdmZip from 'adm-zip';

export interface RefPhoto {
  data: Buffer;
  mimeType: string;
  filename: string;
}

/** Cost estimates (cents). Override via env; these are conservative defaults. */
export const FLUX_COSTS = {
  // Per generated 1MP image.
  kontextPerImageCents: Number(process.env.CMP_FLUX_KONTEXT_CENTS) || 4,
  fluxDevPerImageCents: Number(process.env.CMP_FLUX_DEV_CENTS) || 3,
  // One-time LoRA training (≈1000 steps on Replicate H100 ~$2–3).
  loraTrainingCents: Number(process.env.CMP_LORA_TRAIN_CENTS) || 250,
};

const KONTEXT_MODEL =
  process.env.REPLICATE_FLUX_KONTEXT_MODEL || 'black-forest-labs/flux-kontext-pro';
const TRAINER_MODEL =
  process.env.REPLICATE_FLUX_TRAINER_MODEL_VERSION ||
  'ostris/flux-dev-lora-trainer';

function client(): Replicate {
  const auth = process.env.REPLICATE_API_TOKEN;
  if (!auth) {
    throw new Error('REPLICATE_API_TOKEN is not set — required for Options B and C.');
  }
  return new Replicate({ auth });
}

function dataUri(p: RefPhoto): string {
  return `data:${p.mimeType};base64,${p.data.toString('base64')}`;
}

/** Normalize a replicate.run() output (string URL, FileOutput, or array) → URL. */
async function outputToUrl(output: unknown): Promise<string> {
  const item = Array.isArray(output) ? output[0] : output;
  if (typeof item === 'string') return item;
  // Newer replicate clients return FileOutput objects with a .url() method.
  if (item && typeof (item as any).url === 'function') {
    const u = (item as any).url();
    return typeof u === 'string' ? u : String(u);
  }
  if (item && typeof (item as any).url === 'string') return (item as any).url;
  throw new Error(`Unexpected Replicate output shape: ${JSON.stringify(output).slice(0, 200)}`);
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Replicate image fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Option B — FLUX Kontext, conditioned on the first reference photo. */
export async function generateFluxKontext(
  prompt: string,
  photos: RefPhoto[],
): Promise<Buffer> {
  const face = photos[0];
  if (!face) throw new Error('FLUX Kontext needs at least one reference photo.');
  const output = await client().run(KONTEXT_MODEL as `${string}/${string}`, {
    input: {
      prompt,
      input_image: dataUri(face),
      aspect_ratio: '1:1',
      output_format: 'png',
      safety_tolerance: 2,
    },
  });
  return fetchBuffer(await outputToUrl(output));
}

export interface TrainedLora {
  /** A runnable Replicate ref ("owner/model:version") with the LoRA baked in. */
  version: string;
  trainingId: string;
  triggerWord: string;
}

/**
 * Option C, step 1 — train a per-child LoRA. Zips the photos, uploads them,
 * starts an `ostris/flux-dev-lora-trainer` training to your destination model,
 * and polls until it completes. The harness polls (it's a one-off script);
 * production uses webhooks instead (Change Prompt §5.2).
 *
 * Requires REPLICATE_LORA_DESTINATION ("your-username/your-empty-model") — an
 * empty model you created on replicate.com to receive the trained weights.
 */
export async function trainLora(
  photos: RefPhoto[],
  triggerWord: string,
  log: (m: string) => void,
): Promise<TrainedLora> {
  const destination = process.env.REPLICATE_LORA_DESTINATION;
  if (!destination) {
    throw new Error(
      'REPLICATE_LORA_DESTINATION is not set. Create an empty model on ' +
        'replicate.com (e.g. yourname/kutty-lora-test) and set it as this env var.',
    );
  }
  const [owner, name, version] = TRAINER_MODEL.split(/[/:]/);
  if (!owner || !name) {
    throw new Error(`Bad REPLICATE_FLUX_TRAINER_MODEL_VERSION: ${TRAINER_MODEL}`);
  }
  const r = client();

  // Build an in-memory zip of the photos and upload it.
  const zip = new AdmZip();
  photos.forEach((p, i) => zip.addFile(`${i}_${p.filename}`, p.data));
  const zipBuffer = zip.toBuffer();
  log(`Uploading ${photos.length} photos (${(zipBuffer.length / 1024).toFixed(0)} KB zip)…`);
  const file = await r.files.create(
    new Blob([zipBuffer], { type: 'application/zip' }) as any,
  );
  const zipUrl = (file as any)?.urls?.get;
  if (!zipUrl) throw new Error('Failed to upload training images zip to Replicate.');

  const steps = Number(process.env.CMP_LORA_STEPS) || 1000;
  log(`Starting LoRA training (${steps} steps, trigger "${triggerWord}")… ~2–3 min.`);
  // If a pinned trainer version hash is provided use it; else resolve latest.
  let versionId = version;
  if (!versionId) {
    const model = await r.models.get(owner, name);
    versionId = (model as any)?.latest_version?.id;
    if (!versionId) throw new Error('Could not resolve trainer model version.');
  }

  const training = await r.trainings.create(owner, name, versionId, {
    destination: destination as `${string}/${string}`,
    input: {
      input_images: zipUrl,
      trigger_word: triggerWord,
      steps,
    },
  });

  // Poll until terminal. This is a test harness, so polling is fine here.
  const startedAt = Date.now();
  const TIMEOUT_MS = 15 * 60 * 1000;
  let t = training;
  while (!['succeeded', 'failed', 'canceled'].includes(t.status)) {
    if (Date.now() - startedAt > TIMEOUT_MS) {
      throw new Error('LoRA training timed out after 15 min.');
    }
    await new Promise((res) => setTimeout(res, 10_000));
    t = await r.trainings.get(training.id);
    log(`  training status: ${t.status} (${Math.round((Date.now() - startedAt) / 1000)}s)`);
  }
  if (t.status !== 'succeeded') {
    throw new Error(`LoRA training ${t.status}: ${(t as any).error || 'unknown error'}`);
  }

  const trainedVersion =
    (t.output as any)?.version ||
    `${destination}:${(t as any)?.version || ''}`;
  if (!trainedVersion || trainedVersion.endsWith(':')) {
    throw new Error('Training succeeded but no runnable version was returned.');
  }
  log(`LoRA trained → ${trainedVersion}`);
  return { version: trainedVersion, trainingId: training.id, triggerWord };
}

/** Option C, step 2 — generate a page with the trained LoRA model. */
export async function generateFluxLora(
  prompt: string,
  lora: TrainedLora,
): Promise<Buffer> {
  const output = await client().run(lora.version as `${string}/${string}:${string}`, {
    input: {
      prompt,
      aspect_ratio: '1:1',
      output_format: 'png',
      num_inference_steps: 28,
      guidance: 3,
      lora_scale: Number(process.env.CMP_LORA_SCALE) || 1.0,
    },
  });
  return fetchBuffer(await outputToUrl(output));
}
