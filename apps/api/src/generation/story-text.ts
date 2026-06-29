/**
 * Diffrun-style story-text renderer.
 *
 * Renders the personalized story line (with the child's name already
 * substituted) directly onto a TEXT-FREE template page, matching the look the
 * client baked in Photoshop: a heavy rounded font, deep-blue fill, cream
 * outline and a soft cream glow.
 *
 * Why this exists: stories whose source art is text-free (e.g. beach-adventure,
 * whose `Generated image/` set carries NO baked text) no longer need the
 * `overlayCaption` panel hack that COVERS a baked placeholder name. Here the
 * name was never in the pixels — we draw the whole line ourselves, so name
 * replacement is perfect for any name length, exactly like Diffrun.
 *
 * Portability: the glyphs are rasterized to SVG <path> data via opentype.js, so
 * rendering does NOT depend on the font being installed in the OS / fontconfig
 * (which is fragile on the Linux VPS). The font file is the single swap point —
 * drop the client's exact `.ttf` at assets/fonts/story.ttf (or point
 * STORY_FONT_PATH at it) and every page matches their original pixel-for-pixel.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

/** Where the personalized line sits on the page + how it's justified. */
export interface PageTextLayout {
  /** Vertical anchor as a fraction of page height (0=top, 1=bottom). */
  yFrac: number;
  /** Whether `yFrac` marks the TOP or the BOTTOM edge of the text block. */
  anchor: 'top' | 'bottom';
  /** Horizontal justification (also decides which side the block hugs). */
  align: 'left' | 'center' | 'right';
}

/** Visual style shared by every page of a story (matches the Photoshop text). */
export interface StoryTextStyle {
  /** Deep-blue glyph fill. Measured ≈ #0A4A7D; confirm exact hex from client PSD. */
  fill: string;
  /** Cream outline + glow color. */
  outline: string;
}

export const DEFAULT_STORY_TEXT_STYLE: StoryTextStyle = {
  fill: process.env.STORY_TEXT_FILL || '#0A4A7D',
  outline: process.env.STORY_TEXT_OUTLINE || '#FFF7E8',
};

// ─── Font loading (cached, OS-independent) ─────────────────────────────────

let cachedFont: { path: string; font: opentype.Font } | null = null;

function resolveFontPath(): string {
  const candidates = [
    process.env.STORY_FONT_PATH,
    path.join(process.cwd(), 'assets/fonts/story.ttf'),
    path.join(process.cwd(), 'apps/api/assets/fonts/story.ttf'),
    path.join(__dirname, '../../assets/fonts/story.ttf'),
    path.join(__dirname, '../../../assets/fonts/story.ttf'),
  ].filter((c): c is string => Boolean(c));
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore and try next */
    }
  }
  throw new Error(
    `Story font not found. Set STORY_FONT_PATH or place the font at apps/api/assets/fonts/story.ttf. Tried: ${candidates.join(', ')}`,
  );
}

function loadFont(): opentype.Font {
  const fontPath = resolveFontPath();
  if (cachedFont && cachedFont.path === fontPath) return cachedFont.font;
  const buf = fs.readFileSync(fontPath);
  // opentype.parse needs an ArrayBuffer view of exactly the file bytes.
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const font = opentype.parse(ab);
  cachedFont = { path: fontPath, font };
  return font;
}

// ─── Layout helpers ─────────────────────────────────────────────────────────

function advance(font: opentype.Font, text: string, fontSize: number): number {
  return font.getAdvanceWidth(text, fontSize);
}

/** Greedy word-wrap so every line fits within `maxWidth` px at `fontSize`. */
function wrapToWidth(
  font: opentype.Font,
  text: string,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (cur && advance(font, candidate, fontSize) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Pick the largest font size whose wrapped text fits the width & line budget. */
function fitText(
  font: opentype.Font,
  text: string,
  size: number,
  maxWidth: number,
  maxLines: number,
): { lines: string[]; fontSize: number } {
  const startSize = Math.round(size * 0.092);
  const minSize = Math.round(size * 0.044);
  let fontSize = startSize;
  let lines = wrapToWidth(font, text, fontSize, maxWidth);
  while (fontSize > minSize && lines.length > maxLines) {
    fontSize -= 2;
    lines = wrapToWidth(font, text, fontSize, maxWidth);
  }
  return { lines, fontSize };
}

// ─── Renderer ────────────────────────────────────────────────────────────────

/**
 * Composite the personalized `text` onto a square page `image` using `layout`.
 * `text` must already have the child's name substituted.
 */
export async function renderStoryText(
  image: Buffer,
  text: string,
  layout: PageTextLayout,
  style: StoryTextStyle = DEFAULT_STORY_TEXT_STYLE,
): Promise<Buffer> {
  const clean = (text || '').trim();
  if (!clean) return image;

  const meta = await sharp(image).metadata();
  const S = meta.width && meta.height ? Math.min(meta.width, meta.height) : 1024;

  const font = loadFont();
  const unitsPerEm = font.unitsPerEm || 1000;

  // Center-aligned lines may span most of the page; side-hugging lines keep to
  // their half so they never run across the character.
  const isSide = layout.align !== 'center';
  const maxWidth = S * (isSide ? 0.6 : 0.86);
  const { lines, fontSize } = fitText(font, clean, S, maxWidth, isSide ? 3 : 3);

  const ascent = (font.ascender / unitsPerEm) * fontSize;
  const descent = (Math.abs(font.descender) / unitsPerEm) * fontSize;
  const lineHeight = fontSize * 1.16;
  const blockH = (lines.length - 1) * lineHeight + ascent + descent;

  // First baseline from the requested vertical anchor.
  const marginY = S * 0.04;
  let firstBaseline: number;
  if (layout.anchor === 'bottom') {
    const bottomEdge = Math.min(layout.yFrac * S, S - marginY);
    firstBaseline = bottomEdge - blockH + ascent;
  } else {
    const topEdge = Math.max(layout.yFrac * S, marginY);
    firstBaseline = topEdge + ascent;
  }

  const marginX = S * 0.07;
  const paths: string[] = [];
  lines.forEach((line, i) => {
    const w = advance(font, line, fontSize);
    let x: number;
    if (layout.align === 'left') x = marginX;
    else if (layout.align === 'right') x = S - marginX - w;
    else x = (S - w) / 2;
    const y = firstBaseline + i * lineHeight;
    const d = font.getPath(line, x, y, fontSize).toPathData(2);
    paths.push(`<path d="${d}"/>`);
  });
  const glyphs = paths.join('');

  // Stroke gives the crisp cream outline; the blurred copy underneath gives the
  // soft glow; the blue fill sits on top. Same glyph paths reused per layer.
  const strokeW = fontSize * 0.16;
  const blur = fontSize * 0.05;
  const svg = `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="g" x="-25%" y="-25%" width="150%" height="150%">
    <feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter></defs>
  <g filter="url(#g)" fill="${style.outline}" stroke="${style.outline}" stroke-width="${(strokeW * 1.4).toFixed(1)}" stroke-linejoin="round">${glyphs}</g>
  <g fill="${style.outline}" stroke="${style.outline}" stroke-width="${strokeW.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round">${glyphs}</g>
  <g fill="${style.fill}">${glyphs}</g>
</svg>`;

  return sharp(image)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

// ─── Per-story layout config ──────────────────────────────────────────────────

/**
 * Per-page text placement for stories that use the text-layer model (text-free
 * art + code-rendered text). Derived by detecting where the client placed the
 * text in their Photoshop "Edited" set, so our text lands in the same empty
 * area (and never on the character).
 *
 * Only stories listed here use `renderStoryText`; every other story keeps the
 * legacy `overlayCaption` panel untouched.
 */
export const STORY_TEXT_LAYOUTS: Record<
  string,
  { style: StoryTextStyle; pages: Record<number, PageTextLayout> }
> = {
  'beach-adventure': {
    style: DEFAULT_STORY_TEXT_STYLE,
    pages: {
      1: { yFrac: 0.04, anchor: 'top', align: 'center' },
      2: { yFrac: 0.03, anchor: 'top', align: 'center' },
      3: { yFrac: 0.24, anchor: 'top', align: 'right' },
      4: { yFrac: 0.03, anchor: 'top', align: 'center' },
      5: { yFrac: 0.06, anchor: 'top', align: 'center' },
      6: { yFrac: 0.04, anchor: 'top', align: 'center' },
      7: { yFrac: 0.06, anchor: 'top', align: 'center' },
      8: { yFrac: 0.04, anchor: 'top', align: 'center' },
      9: { yFrac: 0.92, anchor: 'bottom', align: 'left' },
      10: { yFrac: 0.05, anchor: 'top', align: 'left' },
      11: { yFrac: 0.05, anchor: 'top', align: 'center' },
      12: { yFrac: 0.94, anchor: 'bottom', align: 'center' },
      13: { yFrac: 0.05, anchor: 'top', align: 'center' },
      14: { yFrac: 0.05, anchor: 'top', align: 'center' },
      15: { yFrac: 0.06, anchor: 'top', align: 'right' },
      16: { yFrac: 0.9, anchor: 'bottom', align: 'left' },
      17: { yFrac: 0.05, anchor: 'top', align: 'center' },
      18: { yFrac: 0.06, anchor: 'top', align: 'right' },
      19: { yFrac: 0.04, anchor: 'top', align: 'right' },
      20: { yFrac: 0.05, anchor: 'top', align: 'center' },
      21: { yFrac: 0.93, anchor: 'bottom', align: 'left' },
      22: { yFrac: 0.08, anchor: 'top', align: 'right' },
      23: { yFrac: 0.95, anchor: 'bottom', align: 'right' },
      24: { yFrac: 0.95, anchor: 'bottom', align: 'center' },
      25: { yFrac: 0.13, anchor: 'top', align: 'right' },
      26: { yFrac: 0.2, anchor: 'top', align: 'right' },
      27: { yFrac: 0.34, anchor: 'top', align: 'center' },
      28: { yFrac: 0.1, anchor: 'top', align: 'center' },
      29: { yFrac: 0.17, anchor: 'top', align: 'right' },
      30: { yFrac: 0.82, anchor: 'bottom', align: 'center' },
    },
  },
};
