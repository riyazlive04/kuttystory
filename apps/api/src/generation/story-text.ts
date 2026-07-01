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
  // Exact values extracted from the client's Herkules PSD text layers.
  fill: process.env.STORY_TEXT_FILL || '#0F4A7F',
  outline: process.env.STORY_TEXT_OUTLINE || '#FFFFFF',
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

/**
 * Pick the largest font size whose wrapped text fits the width, line budget AND
 * a vertical height cap — so the headline stays compact (like the client's
 * Photoshop sizing) instead of dominating the page.
 */
function fitText(
  font: opentype.Font,
  text: string,
  S: number,
  maxWidth: number,
  maxLines: number,
  maxHeight: number,
): { lines: string[]; fontSize: number } {
  const unitsPerEm = font.unitsPerEm || 1000;
  const lineFactor = 1.14;
  const minSize = Math.round(S * 0.04);
  let fontSize = Math.round(S * 0.072);
  let lines = wrapToWidth(font, text, fontSize, maxWidth);
  const widest = (fs: number) =>
    lines.reduce((m, l) => Math.max(m, advance(font, l, fs)), 0);
  const blockHeight = (fs: number) => {
    const asc = (font.ascender / unitsPerEm) * fs;
    const desc = (Math.abs(font.descender) / unitsPerEm) * fs;
    return (lines.length - 1) * fs * lineFactor + asc + desc;
  };
  while (
    fontSize > minSize &&
    (lines.length > maxLines ||
      widest(fontSize) > maxWidth ||
      blockHeight(fontSize) > maxHeight)
  ) {
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
  const Wd = meta.width || 1024;
  const Ht = meta.height || 1024;
  // Font size + the height cap key off the SHORT side so text stays a sensible
  // size on both square (beach) and wide 2-page-spread (unicorn/abc) pages.
  const S = Math.min(Wd, Ht);

  const font = loadFont();
  const unitsPerEm = font.unitsPerEm || 1000;

  // Center-aligned lines may span most of the page width; side-hugging lines keep
  // to a portion so they never run across the character.
  const isSide = layout.align !== 'center';
  const maxWidth = Wd * (isSide ? 0.6 : 0.86);
  const { lines, fontSize } = fitText(font, clean, S, maxWidth, 3, S * 0.22);

  const ascent = (font.ascender / unitsPerEm) * fontSize;
  const descent = (Math.abs(font.descender) / unitsPerEm) * fontSize;
  const lineHeight = fontSize * 1.14;
  const blockH = (lines.length - 1) * lineHeight + ascent + descent;

  // First baseline from the requested vertical anchor (fraction of page HEIGHT).
  const marginY = Ht * 0.04;
  let firstBaseline: number;
  if (layout.anchor === 'bottom') {
    const bottomEdge = Math.min(layout.yFrac * Ht, Ht - marginY);
    firstBaseline = bottomEdge - blockH + ascent;
  } else {
    const topEdge = Math.max(layout.yFrac * Ht, marginY);
    firstBaseline = topEdge + ascent;
  }

  const marginX = Wd * 0.07;

  // Style (matches the client's Photoshop text): drop shadow + soft outer glow +
  // thin light outline + blue fill, back-to-front.
  const strokeW = fontSize * 0.08;
  const glow = fontSize * 0.06;
  const shDx = fontSize * 0.025;
  const shDy = fontSize * 0.04;
  // Padding around each line canvas so the stroke/glow/shadow don't clip.
  const pad = Math.ceil(fontSize * 0.4);

  // Render EACH LINE in its OWN small canvas, then composite with sharp.
  // Rasterizing a whole multi-line block in one librsvg pass intermittently DROPS
  // a glyph (e.g. "Yahya" → "Yah a") — a librsvg fragility that shows up with
  // wrapped lines / right alignment. Single-line rasters never drop, and sharp
  // positions them precisely, so this is robust for ANY name or text length.
  const lineLayers = await Promise.all(
    lines.map(async (line, i) => {
      const lineW = advance(font, line, fontSize);
      const canvasW = Math.ceil(lineW + pad * 2);
      const canvasH = Math.ceil(ascent + descent + pad * 2);
      const baseX = pad;
      const baseY = pad + ascent;
      const paths: string[] = [];
      for (const gp of font.getPaths(line, baseX, baseY, fontSize)) {
        const d = gp.toPathData(2);
        if (d) paths.push(`<path d="${d}"/>`);
      }
      const glyphs = paths.join('');
      const svg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${glow.toFixed(1)}"/></filter>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(fontSize * 0.03).toFixed(1)}"/></filter>
  </defs>
  <g transform="translate(${shDx.toFixed(1)},${shDy.toFixed(1)})" filter="url(#sh)" fill="#08243F" opacity="0.45">${glyphs}</g>
  <g filter="url(#glow)" fill="${style.outline}">${glyphs}</g>
  <g fill="${style.outline}" stroke="${style.outline}" stroke-width="${strokeW.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round">${glyphs}</g>
  <g fill="${style.fill}">${glyphs}</g>
</svg>`;
      const raster = await sharp(Buffer.from(svg)).png().toBuffer();

      let gx: number;
      if (layout.align === 'left') gx = marginX;
      else if (layout.align === 'right') gx = Wd - marginX - lineW;
      else gx = (Wd - lineW) / 2;
      const by = firstBaseline + i * lineHeight;
      return {
        input: raster,
        left: Math.max(0, Math.round(gx - baseX)),
        top: Math.max(0, Math.round(by - baseY)),
      };
    }),
  );

  return sharp(image).composite(lineLayers).png().toBuffer();
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
