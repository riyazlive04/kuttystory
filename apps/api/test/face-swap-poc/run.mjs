/**
 * Face-swap-into-template Proof of Concept (standalone — does NOT touch the app).
 *
 * Goal: prove the "Diffrun" approach — keep the hand-illustrated template
 * pixel-perfect and replace ONLY the face, conditioned on the child's photo.
 *
 * Pipeline: template + face-region mask + child photo (IP-Adapter) ->
 *   fal-ai/flux-general/inpainting -> only the masked face is regenerated.
 *
 * Run (from repo root):  node apps/api/test/face-swap-poc/run.mjs
 * Needs:  FAL_KEY in apps/api/.env  +  a sharp photo at ./yahya.jpg
 */
import { fal } from '@fal-ai/client';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');

// ─── Tunables (we iterate on these after the first run) ──────────────────────
const TEMPLATE = path.join(
  REPO_ROOT,
  'apps/web/public/images/stories/abc-adventure/page-3.jpg',
);
const FACE_PHOTO = process.env.FACE_PHOTO || path.join(__dirname, 'yahya.jpg');
const OUT_DIR = path.join(__dirname, 'output');

// Face mask as fractions of the template W×H. The "A is for Apple" boy's head
// sits center, upper-middle. Tune cx/cy/rx/ry after seeing mask-preview.jpg.
const MASK = { cx: 0.5, cy: 0.32, rx: 0.16, ry: 0.2 };

const PROMPT =
  "the face and head of a happy young toddler boy, big dark-brown eyes, " +
  "soft hand-painted children's storybook cartoon style, same art style, " +
  'shading and lighting as the rest of the scene, looking forward, smiling';

// IP-Adapter (face conditioning). Set IP=0 to run WITHOUT it (proves template
// preservation cleanly); IP=1 (default) tests face-identity transfer too.
const USE_IP = process.env.IP !== '0';
const IP_ADAPTER = {
  path: 'InstantX/FLUX.1-dev-IP-Adapter',
  weight_name: 'ip-adapter.bin',
  image_encoder_path: 'google/siglip-so400m-patch14-384',
  scale: Number(process.env.IP_SCALE || 0.85),
};
// ─────────────────────────────────────────────────────────────────────────────

function loadFalKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  const envPath = path.join(REPO_ROOT, 'apps/api/.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(FAL_KEY|FAL_API_KEY|falApiKey)\s*=\s*(.+?)\s*$/);
      if (m) return m[2].replace(/^["']|["']$/g, '').trim();
    }
  }
  return null;
}

async function uploadBuffer(buf, type) {
  return fal.storage.upload(new Blob([buf], { type }));
}

async function main() {
  const key = loadFalKey();
  if (!key) {
    console.error('❌ No FAL key. Add  FAL_KEY=...  to apps/api/.env');
    process.exit(1);
  }
  if (!fs.existsSync(FACE_PHOTO)) {
    console.error(`❌ No face photo at ${FACE_PHOTO}`);
    console.error('   Save a sharp, front-facing photo of Yahya there (or set FACE_PHOTO=...).');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fal.config({ credentials: key });

  // 1. Template dimensions
  const meta = await sharp(TEMPLATE).metadata();
  const W = meta.width, H = meta.height;
  console.log(`Template ${W}×${H}`);

  // 2. Build the face mask (white ellipse = inpaint, black = keep)
  const cx = Math.round(MASK.cx * W), cy = Math.round(MASK.cy * H);
  const rx = Math.round(MASK.rx * W), ry = Math.round(MASK.ry * H);
  const maskSvg = `<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="black"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/></svg>`;
  const maskPng = await sharp(Buffer.from(maskSvg)).png().toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, 'mask.png'), maskPng);

  // Human-readable preview so we can see/adjust where the mask sits
  const previewSvg = `<svg width="${W}" height="${H}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="red" fill-opacity="0.4"/></svg>`;
  const preview = await sharp(TEMPLATE)
    .composite([{ input: Buffer.from(previewSvg), top: 0, left: 0 }])
    .jpeg().toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, 'mask-preview.jpg'), preview);
  console.log('Wrote mask-preview.jpg — check the ellipse covers the face.');

  // 3. Upload assets (fal needs URLs, not local paths)
  console.log('Uploading template, mask, face photo…');
  const [templateUrl, maskUrl, faceUrl] = await Promise.all([
    uploadBuffer(fs.readFileSync(TEMPLATE), 'image/jpeg'),
    uploadBuffer(maskPng, 'image/png'),
    uploadBuffer(fs.readFileSync(FACE_PHOTO), 'image/jpeg'),
  ]);

  // 4. Inpaint ONLY the masked face, conditioned on the child's photo
  const input = {
    image_url: templateUrl,
    mask_url: maskUrl,
    prompt: PROMPT,
    num_inference_steps: 30,
    guidance_scale: 3.5,
  };
  if (USE_IP) input.ip_adapters = [{ ...IP_ADAPTER, image_url: faceUrl }];
  console.log(`Calling fal-ai/flux-general/inpainting (IP-Adapter: ${USE_IP ? 'ON' : 'OFF'}) …`);
  const t0 = Date.now();
  const res = await fal.subscribe('fal-ai/flux-general/inpainting', {
    input,
    logs: true,
  });
  const ms = Date.now() - t0;
  const data = res?.data || res;
  const outUrl = data?.images?.[0]?.url;
  if (!outUrl) {
    console.error('❌ No image URL in response:', JSON.stringify(data).slice(0, 800));
    process.exit(1);
  }
  console.log(`✓ fal returned in ${(ms / 1000).toFixed(1)}s`);

  // 5. Save raw fal output
  const raw = Buffer.from(await (await fetch(outUrl)).arrayBuffer());
  fs.writeFileSync(path.join(OUT_DIR, 'result-raw.png'), raw);

  // 6. GUARANTEE preservation: composite the generated face back onto the
  //    ORIGINAL template using a feathered mask as alpha. Everything outside the
  //    mask is mathematically the original template.
  const genResized = await sharp(raw).resize(W, H, { fit: 'fill' }).removeAlpha().toBuffer();
  const featherAlpha = await sharp(maskPng).extractChannel(0).blur(12).toBuffer();
  const genRGBA = await sharp(genResized).joinChannel(featherAlpha).png().toBuffer();
  const composited = await sharp(TEMPLATE)
    .composite([{ input: genRGBA }])
    .jpeg({ quality: 92 }).toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, 'result-composited.jpg'), composited);

  console.log('\n✅ Done. Look in', OUT_DIR);
  console.log('  • mask-preview.jpg      — where the face mask sits (adjust MASK if off)');
  console.log('  • result-raw.png        — raw fal inpaint output');
  console.log('  • result-composited.jpg — original template, ONLY the face replaced');
}

main().catch((e) => {
  console.error('\n❌ FAILED:', e?.message || e);
  if (e?.body) console.error('fal said:', JSON.stringify(e.body).slice(0, 1200));
  process.exit(1);
});
