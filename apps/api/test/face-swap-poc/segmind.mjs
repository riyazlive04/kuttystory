/**
 * Segmind FaceSwap Comic v1 PoC — managed face-swap-into-template (no GPU/infra).
 *
 * Swaps the child's face from a photo INTO the storybook template, preserving the
 * template's painterly art. Mirrors the fal PoC so we can compare results.
 *
 * Run (from repo root):  node apps/api/test/face-swap-poc/segmind.mjs
 *   Tunables via env:  FACE=0.8  STYLE=1.0  MASK=1  GROW=10  STEPS=20
 * Needs:  SEGMIND_API_KEY in apps/api/.env  +  ./yahya.jpg
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');

const TEMPLATE = path.join(
  REPO_ROOT,
  'apps/web/public/images/stories/abc-adventure/page-3.jpg',
);
const FACE_PHOTO = process.env.FACE_PHOTO || path.join(__dirname, 'yahya.jpg');
const OUT_DIR = path.join(__dirname, 'output');

// Face mask (only used when MASK=1). Same ellipse as the fal PoC.
const MASK = { cx: 0.5, cy: 0.34, rx: 0.17, ry: 0.21 };

const FACE_STRENGTH = Number(process.env.FACE || 0.85); // identity preservation
const STYLE_STRENGTH = Number(process.env.STYLE || 1.2); // match storybook art
const USE_MASK = process.env.MASK === '1';
const GROW_MASK = Number(process.env.GROW || 10);
const STEPS = Number(process.env.STEPS || 20);

function loadKey() {
  if (process.env.SEGMIND_API_KEY) return process.env.SEGMIND_API_KEY;
  const envPath = path.join(REPO_ROOT, 'apps/api/.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*SEGMIND_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
    }
  }
  return null;
}

const b64 = (buf) => buf.toString('base64');

async function main() {
  const key = loadKey();
  if (!key) { console.error('❌ No SEGMIND_API_KEY in apps/api/.env'); process.exit(1); }
  if (!fs.existsSync(FACE_PHOTO)) { console.error(`❌ No face photo at ${FACE_PHOTO}`); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const meta = await sharp(TEMPLATE).metadata();
  const W = meta.width, H = meta.height;

  const body = {
    source_image: b64(fs.readFileSync(FACE_PHOTO)),   // the real child face
    target_image: b64(fs.readFileSync(TEMPLATE)),     // the storybook template
    face_strength: FACE_STRENGTH,
    style_strength: STYLE_STRENGTH,
    steps: STEPS,
    base64: false,
  };

  if (USE_MASK) {
    const cx = Math.round(MASK.cx * W), cy = Math.round(MASK.cy * H);
    const rx = Math.round(MASK.rx * W), ry = Math.round(MASK.ry * H);
    const svg = `<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="black"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/></svg>`;
    const maskPng = await sharp(Buffer.from(svg)).png().toBuffer();
    body.mask_image = b64(maskPng);
    body.grow_mask = GROW_MASK;
  }

  console.log(
    `Calling Segmind faceswap-comic  (face_strength=${FACE_STRENGTH}, ` +
      `style_strength=${STYLE_STRENGTH}, mask=${USE_MASK ? 'on' : 'auto'}) …`,
  );
  const t0 = Date.now();
  const res = await fetch('https://api.segmind.com/v1/faceswap-comic', {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;

  if (!res.ok) {
    const txt = await res.text();
    console.error(`❌ HTTP ${res.status} in ${(ms / 1000).toFixed(1)}s`);
    console.error('Segmind said:', txt.slice(0, 1000));
    process.exit(1);
  }

  const out = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUT_DIR, 'segmind-result.jpg');
  fs.writeFileSync(outPath, out);
  // remaining-credits header is handy to see cost
  const credits = res.headers.get('x-remaining-credits');
  console.log(`✓ Segmind returned in ${(ms / 1000).toFixed(1)}s` + (credits ? `  (credits left: ${credits})` : ''));
  console.log('Saved:', outPath);
}

main().catch((e) => { console.error('❌ FAILED:', e?.message || e); process.exit(1); });
