// Verify the new overlayCaption covers the template's baked name and renders
// the personalized text. Pure sharp — no API call. Mirrors page-orchestrator.
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IN = path.join(__dirname, 'output/segmind-tuned.jpg');
const OUT = path.join(__dirname, 'output/segmind-with-caption.jpg');
const CAPTION = 'A is for Apple. Yahya is in the garden. Can you find the APPLE?';

const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
function wrap(text, max) {
  const words = text.split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const w of words) { if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w; }
  if (cur) lines.push(cur); return lines;
}

const size = 1024, fontSize = 42, lineHeight = 54, padY = 30;
const lines = wrap(CAPTION, 34).slice(0, 4);
const textH = lines.length * lineHeight;
const panelH = Math.max(textH + padY * 2, Math.round(size * 0.28));
const panelY = size - panelH;
const firstBaseline = panelY + (panelH - textH) / 2 + fontSize - 8;
const tspans = lines.map((ln, i) => `<tspan x="${size / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(ln)}</tspan>`).join('');
const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${panelY}" width="${size}" height="${panelH}" fill="#FFF8EC"/>
  <rect x="0" y="${panelY}" width="${size}" height="8" fill="#E8552E"/>
  <text y="${firstBaseline}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#3A2A1E" text-anchor="middle">${tspans}</text>
</svg>`;

const square = await sharp(IN).resize(1024, 1024, { fit: 'cover', position: 'center' }).png().toBuffer();
await sharp(square).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 92 }).toFile(OUT);
console.log('Wrote', OUT);
