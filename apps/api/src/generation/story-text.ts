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
 * Rendering: the text is drawn by sharp's native Pango/HarfBuzz text engine,
 * pointed DIRECTLY at the font file (`fontfile`), so it needs NO system font
 * install and stays OS-independent on the Linux VPS. We deliberately do NOT
 * rasterize opentype.js glyph paths to SVG anymore: librsvg (sharp's SVG loader)
 * silently DROPS glyphs for certain font-size/coordinate combinations
 * (e.g. "Can you find the"→"a you find the", "the"→"he", the "A" counter fills
 * in) — reproducible and size-dependent, so no per-line/serialization trick fully
 * cured it. Pango is a real shaping engine and renders every glyph reliably.
 * The font file is the single swap point — drop the client's exact `.ttf` at
 * assets/fonts/story.ttf (or point STORY_FONT_PATH at it); set STORY_FONT_FAMILY
 * if its internal family name isn't "Herkules".
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

/**
 * An exact rectangle (fractions of page W/H) the text must sit inside. Used when
 * the art has a BAKED panel (abc-adventure) so the code-rendered caption has to
 * land precisely on that panel — not just hug a page margin. When `box` is set it
 * overrides yFrac/anchor: text is wrapped to the box width and centred (or
 * `align`-justified) horizontally and vertically within the box.
 */
export interface TextBox {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

/** Where the personalized line sits on the page + how it's justified. */
export interface PageTextLayout {
  /** Vertical anchor as a fraction of page height (0=top, 1=bottom). */
  yFrac: number;
  /** Whether `yFrac` marks the TOP or the BOTTOM edge of the text block. */
  anchor: 'top' | 'bottom';
  /** Horizontal justification (also decides which side the block hugs). */
  align: 'left' | 'center' | 'right';
  /** Optional exact rectangle the text must fit inside (abc-adventure panels). */
  box?: TextBox;
  /** Optional per-page style override (e.g. the abc cover title is navy, not white). */
  style?: StoryTextStyle;
}

/** A soft rounded panel drawn BEHIND the text (as in the unicorn/abc art). */
export interface TextPanelStyle {
  /** Panel fill colour (usually white/cream). */
  color: string;
  /** 0–1 opacity of the panel. */
  opacity: number;
  /** Corner radius as a fraction of the font size. */
  radiusFrac?: number;
  /** Horizontal padding as a fraction of the font size. */
  padXFrac?: number;
  /** Vertical padding as a fraction of the font size. */
  padYFrac?: number;
}

/** Visual style shared by every page of a story (matches the Photoshop text). */
export interface StoryTextStyle {
  /** Glyph fill (beach ≈ #0F4A7F; unicorn ≈ #201860 navy). */
  fill: string;
  /** Outline + glow color (usually white/cream). */
  outline: string;
  /** Optional rounded panel behind the text (unicorn/abc use one; beach doesn't). */
  panel?: TextPanelStyle;
}

export const DEFAULT_STORY_TEXT_STYLE: StoryTextStyle = {
  // Exact values extracted from the client's Herkules PSD text layers.
  fill: process.env.STORY_TEXT_FILL || '#0F4A7F',
  outline: process.env.STORY_TEXT_OUTLINE || '#FFFFFF',
};

// ─── Font resolution (OS-independent: we point Pango at the file) ─────────────

let cachedFontPath: string | null = null;

function resolveFontPath(): string {
  if (cachedFontPath) return cachedFontPath;
  const candidates = [
    process.env.STORY_FONT_PATH,
    path.join(process.cwd(), 'assets/fonts/story.ttf'),
    path.join(process.cwd(), 'apps/api/assets/fonts/story.ttf'),
    path.join(__dirname, '../../assets/fonts/story.ttf'),
    path.join(__dirname, '../../../assets/fonts/story.ttf'),
  ].filter((c): c is string => Boolean(c));
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        cachedFontPath = c;
        return c;
      }
    } catch {
      /* ignore and try next */
    }
  }
  throw new Error(
    `Story font not found. Set STORY_FONT_PATH or place the font at apps/api/assets/fonts/story.ttf. Tried: ${candidates.join(', ')}`,
  );
}

/** Internal family name of the bundled font (the Herkules `name` table entry). */
const FONT_FAMILY = process.env.STORY_FONT_FAMILY || 'Herkules';
/** Drop-shadow colour behind the glyphs (deep navy, matches the PSD shadow). */
const SHADOW_COLOR = '#08243F';

// ─── Pango text helpers (reliable glyph rendering) ────────────────────────────

function escapeMarkup(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render `text` in one colour via sharp's Pango engine, word-wrapped to
 * `maxWidth` px at `sizePx` pixels. Returns the raster + its measured size. This
 * is the single trustworthy rasterizer — every glyph always renders.
 */
async function pangoText(
  text: string,
  sizePx: number,
  maxWidth: number,
  color: string,
  align: 'left' | 'center' | 'right',
): Promise<{ buf: Buffer; width: number; height: number }> {
  const fontfile = resolveFontPath();
  const buf = await sharp({
    text: {
      text: `<span foreground="${color}">${escapeMarkup(text)}</span>`,
      // Trailing integer = point size; at dpi 72 that is ~pixels.
      font: `${FONT_FAMILY} ${Math.max(4, Math.round(sizePx))}`,
      fontfile,
      rgba: true,
      dpi: 72,
      align,
      width: Math.max(1, Math.round(maxWidth)),
      spacing: Math.round(sizePx * 0.12),
    },
  })
    .png()
    .toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, width: m.width || 0, height: m.height || 0 };
}

/**
 * Largest pixel size (≤ maxSizePx) whose wrapped block fits maxWidth × maxHeight.
 * Pango wraps to `maxWidth`, so we only have to shrink until the HEIGHT fits.
 */
async function fitPango(
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxSizePx: number,
  minSizePx: number,
  align: 'left' | 'center' | 'right',
): Promise<number> {
  let size = maxSizePx;
  // Measure with the fill colour (geometry is colour-independent).
  let r = await pangoText(text, size, maxWidth, '#000000', align);
  let guard = 0;
  while (r.height > maxHeight && size > minSizePx && guard++ < 40) {
    const factor = Math.min(0.94, maxHeight / r.height);
    size = Math.max(minSizePx, Math.floor(size * factor));
    // eslint-disable-next-line no-await-in-loop -- iterative fit, a few passes.
    r = await pangoText(text, size, maxWidth, '#000000', align);
  }
  return size;
}

/**
 * Build the styled text block (soft drop shadow + light outline ring + fill,
 * back-to-front) matching the client's Photoshop look. The outline is made by
 * compositing the outline-colour raster at 8 offsets — no SVG stroke, so nothing
 * can drop. Returns the block raster and the inner text box (for panel sizing).
 */
async function renderTextBlock(
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxSizePx: number,
  minSizePx: number,
  align: 'left' | 'center' | 'right',
  style: StoryTextStyle,
): Promise<{ raster: Buffer; width: number; height: number; pad: number; textW: number; textH: number }> {
  const size = await fitPango(text, maxWidth, maxHeight, maxSizePx, minSizePx, align);
  const [fill, outline, dark] = await Promise.all([
    pangoText(text, size, maxWidth, style.fill, align),
    pangoText(text, size, maxWidth, style.outline, align),
    pangoText(text, size, maxWidth, SHADOW_COLOR, align),
  ]);

  const t = Math.max(2, Math.round(size * 0.07)); // outline thickness
  const shOff = Math.max(1, Math.round(size * 0.05)); // shadow offset
  const pad = t + shOff;
  const textW = fill.width;
  const textH = fill.height;
  const PW = textW + pad * 2;
  const PH = textH + pad * 2;

  const comps: sharp.OverlayOptions[] = [];
  // Soft drop shadow.
  const shadow = await sharp(dark.buf)
    .blur(Math.max(0.6, size * 0.04))
    .png()
    .toBuffer();
  comps.push({ input: shadow, left: pad + shOff, top: pad + shOff });
  // Outline ring: 8 offsets of the outline-colour raster.
  for (let a = 0; a < 8; a++) {
    const dx = Math.round(t * Math.cos((a * Math.PI) / 4));
    const dy = Math.round(t * Math.sin((a * Math.PI) / 4));
    comps.push({ input: outline.buf, left: pad + dx, top: pad + dy });
  }
  // Fill on top.
  comps.push({ input: fill.buf, left: pad, top: pad });

  const raster = await sharp({
    create: { width: PW, height: PH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(comps)
    .png()
    .toBuffer();
  return { raster, width: PW, height: PH, pad, textW, textH };
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

  // A baked panel (abc) gives an exact rectangle; otherwise fall back to the
  // page-margin model used by beach/unicorn.
  const box = layout.box
    ? {
        left: layout.box.xFrac * Wd,
        top: layout.box.yFrac * Ht,
        w: layout.box.wFrac * Wd,
        h: layout.box.hFrac * Ht,
      }
    : null;

  // A page may override the story-wide style (e.g. the abc cover title is navy on
  // its white ellipse while every interior caption is white). Resolving it HERE
  // keeps the per-page override self-contained in this module.
  const eff = layout.style ?? style;

  // Center-aligned lines may span most of the page width; side-hugging lines keep
  // to a portion so they never run across the character. Boxed text wraps to the
  // panel width (with a little inner padding).
  const isSide = layout.align !== 'center';
  const maxWidth = box ? box.w * 0.94 : Wd * (isSide ? 0.6 : 0.86);
  const maxHeight = box ? box.h * 0.96 : S * 0.22;
  const maxSizePx = Math.round(S * 0.075);
  // Allow a smaller floor for boxed captions: some baked ABC panels are compact
  // (e.g. the V page), so the caption must shrink enough to stay inside them.
  const minSizePx = Math.round(S * (box ? 0.022 : 0.03));

  const block = await renderTextBlock(
    clean,
    maxWidth,
    maxHeight,
    maxSizePx,
    minSizePx,
    layout.align,
    eff,
  );

  // Place the block. `block.pad` is the transparent margin around the actual
  // glyphs, so the visible text starts at (pad,pad) inside the raster — offset by
  // it when aligning to a page margin or centring in a box.
  const marginX = Wd * 0.07;
  const marginY = Ht * 0.04;
  let bx: number;
  let by: number;
  if (box) {
    if (layout.align === 'left') bx = box.left + box.w * 0.03 - block.pad;
    else if (layout.align === 'right')
      bx = box.left + box.w - box.w * 0.03 - block.textW - block.pad;
    else bx = box.left + (box.w - block.textW) / 2 - block.pad;
    by = box.top + (box.h - block.textH) / 2 - block.pad;
  } else {
    if (layout.align === 'left') bx = marginX - block.pad;
    else if (layout.align === 'right') bx = Wd - marginX - block.textW - block.pad;
    else bx = (Wd - block.textW) / 2 - block.pad;
    if (layout.anchor === 'bottom') {
      const bottomEdge = Math.min(layout.yFrac * Ht, Ht - marginY);
      by = bottomEdge - block.textH - block.pad;
    } else {
      const topEdge = Math.max(layout.yFrac * Ht, marginY);
      by = topEdge - block.pad;
    }
  }

  const composites: sharp.OverlayOptions[] = [];

  // Optional rounded panel behind the whole text block (unicorn draws one; abc
  // bakes its panel into the art). Sized around the visible glyphs.
  if (eff.panel) {
    const size = Math.round(block.textH); // rough font size proxy
    const padX = size * (eff.panel.padXFrac ?? 0.55);
    const padY = size * (eff.panel.padYFrac ?? 0.4);
    const textLeft = bx + block.pad;
    const textTop = by + block.pad;
    const px = Math.max(0, Math.round(textLeft - padX));
    const py = Math.max(0, Math.round(textTop - padY));
    const pw = Math.min(Wd - px, Math.round(block.textW + padX * 2));
    const ph = Math.min(Ht - py, Math.round(block.textH + padY * 2));
    const r = Math.round(size * (eff.panel.radiusFrac ?? 0.35));
    const psvg = `<svg width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${pw}" height="${ph}" rx="${r}" ry="${r}" fill="${eff.panel.color}" fill-opacity="${eff.panel.opacity}"/></svg>`;
    composites.push({ input: await sharp(Buffer.from(psvg)).png().toBuffer(), left: px, top: py });
  }

  composites.push({
    input: block.raster,
    left: Math.max(0, Math.round(bx)),
    top: Math.max(0, Math.round(by)),
  });

  return sharp(image).composite(composites).png().toBuffer();
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
  'magical-unicorn': {
    // Client's unicorn text: navy (#201860) Herkules on a soft white rounded
    // panel. Positions read from the client's templates (where each panel sits).
    style: {
      fill: '#201860',
      outline: '#FFFFFF',
      panel: { color: '#FFFFFF', opacity: 0.72 },
    },
    pages: {
      1: { yFrac: 0.9, anchor: 'bottom', align: 'left' },
      2: { yFrac: 0.52, anchor: 'top', align: 'center' },
      3: { yFrac: 0.5, anchor: 'top', align: 'center' },
      4: { yFrac: 0.76, anchor: 'bottom', align: 'center' },
      5: { yFrac: 0.78, anchor: 'bottom', align: 'left' },
      6: { yFrac: 0.44, anchor: 'top', align: 'right' },
      7: { yFrac: 0.9, anchor: 'bottom', align: 'left' },
      8: { yFrac: 0.6, anchor: 'top', align: 'left' },
      9: { yFrac: 0.05, anchor: 'top', align: 'right' },
      10: { yFrac: 0.05, anchor: 'top', align: 'right' },
      11: { yFrac: 0.05, anchor: 'top', align: 'center' },
      12: { yFrac: 0.05, anchor: 'top', align: 'left' },
      13: { yFrac: 0.45, anchor: 'top', align: 'center' },
      14: { yFrac: 0.45, anchor: 'top', align: 'center' },
      15: { yFrac: 0.05, anchor: 'top', align: 'center' },
      16: { yFrac: 0.74, anchor: 'bottom', align: 'left' },
      17: { yFrac: 0.05, anchor: 'top', align: 'left' },
      18: { yFrac: 0.05, anchor: 'top', align: 'right' },
      19: { yFrac: 0.78, anchor: 'bottom', align: 'left' },
      20: { yFrac: 0.05, anchor: 'top', align: 'left' },
      21: { yFrac: 0.05, anchor: 'top', align: 'left' },
      22: { yFrac: 0.05, anchor: 'top', align: 'left' },
      23: { yFrac: 0.72, anchor: 'bottom', align: 'center' },
      24: { yFrac: 0.78, anchor: 'bottom', align: 'left' },
      25: { yFrac: 0.82, anchor: 'bottom', align: 'center' },
      26: { yFrac: 0.5, anchor: 'top', align: 'center' },
      27: { yFrac: 0.82, anchor: 'bottom', align: 'left' },
      28: { yFrac: 0.82, anchor: 'bottom', align: 'center' },
    },
  },
  'abc-adventure': {
    // Client's ABC templates BAKE the coloured caption panel + letter badge into
    // the art (we stripped only the caption sentences from the PSDs), so the code
    // renders WHITE text placed EXACTLY inside each panel via a per-page `box`
    // (fractions of the 2800px PSD, read straight from the caption text layers).
    // Page 1 (cover) is the only navy title — on its white ellipse.
    style: {
      fill: '#FFFFFF',
      // Deep-navy outline so the white caption stays legible on EVERY panel
      // colour (the client's saturated reds/blues plus the paler yellow/grey ones).
      outline: '#22315A',
    },
    pages: {
      1: { yFrac: 0.37, anchor: 'top', align: 'center', box: { xFrac: 0.03, yFrac: 0.37, wFrac: 0.47, hFrac: 0.13 }, style: { fill: '#20507C', outline: '#FFFFFF' } },
      2: { yFrac: 0.0689, anchor: 'top', align: 'center', box: { xFrac: 0.2739, yFrac: 0.0689, wFrac: 0.4518, hFrac: 0.1036 } },
      3: { yFrac: 0.7486, anchor: 'top', align: 'center', box: { xFrac: 0.2379, yFrac: 0.7486, wFrac: 0.5429, hFrac: 0.1714 } },
      4: { yFrac: 0.7614, anchor: 'top', align: 'center', box: { xFrac: 0.365, yFrac: 0.7614, wFrac: 0.5143, hFrac: 0.1593 } },
      5: { yFrac: 0.7011, anchor: 'top', align: 'center', box: { xFrac: 0.1621, yFrac: 0.7011, wFrac: 0.3789, hFrac: 0.1796 } },
      6: { yFrac: 0.345, anchor: 'top', align: 'center', box: { xFrac: 0.1618, yFrac: 0.345, wFrac: 0.3886, hFrac: 0.1879 } },
      7: { yFrac: 0.695, anchor: 'top', align: 'center', box: { xFrac: 0.4779, yFrac: 0.695, wFrac: 0.3846, hFrac: 0.1861 } },
      8: { yFrac: 0.6625, anchor: 'top', align: 'center', box: { xFrac: 0.3743, yFrac: 0.6625, wFrac: 0.4786, hFrac: 0.2043 } },
      9: { yFrac: 0.3346, anchor: 'top', align: 'center', box: { xFrac: 0.0939, yFrac: 0.3346, wFrac: 0.3921, hFrac: 0.1846 } },
      10: { yFrac: 0.6468, anchor: 'top', align: 'center', box: { xFrac: 0.4825, yFrac: 0.6468, wFrac: 0.3546, hFrac: 0.2486 } },
      11: { yFrac: 0.6668, anchor: 'top', align: 'center', box: { xFrac: 0.3011, yFrac: 0.6668, wFrac: 0.4571, hFrac: 0.2054 } },
      12: { yFrac: 0.6586, anchor: 'top', align: 'center', box: { xFrac: 0.1525, yFrac: 0.6586, wFrac: 0.4843, hFrac: 0.2046 } },
      13: { yFrac: 0.7218, anchor: 'top', align: 'center', box: { xFrac: 0.3089, yFrac: 0.7218, wFrac: 0.4293, hFrac: 0.2075 } },
      14: { yFrac: 0.6961, anchor: 'top', align: 'center', box: { xFrac: 0.1375, yFrac: 0.6961, wFrac: 0.4807, hFrac: 0.2104 } },
      15: { yFrac: 0.1504, anchor: 'top', align: 'center', box: { xFrac: 0.385, yFrac: 0.1504, wFrac: 0.3486, hFrac: 0.2411 } },
      16: { yFrac: 0.6904, anchor: 'top', align: 'center', box: { xFrac: 0.3736, yFrac: 0.6904, wFrac: 0.5025, hFrac: 0.2236 } },
      17: { yFrac: 0.6929, anchor: 'top', align: 'center', box: { xFrac: 0.1864, yFrac: 0.6929, wFrac: 0.3961, hFrac: 0.2168 } },
      18: { yFrac: 0.6693, anchor: 'top', align: 'center', box: { xFrac: 0.5957, yFrac: 0.6693, wFrac: 0.3107, hFrac: 0.2446 } },
      19: { yFrac: 0.7154, anchor: 'top', align: 'center', box: { xFrac: 0.2375, yFrac: 0.7154, wFrac: 0.4432, hFrac: 0.2154 } },
      20: { yFrac: 0.6314, anchor: 'top', align: 'center', box: { xFrac: 0.4504, yFrac: 0.6314, wFrac: 0.4007, hFrac: 0.2043 } },
      21: { yFrac: 0.6332, anchor: 'top', align: 'center', box: { xFrac: 0.2561, yFrac: 0.6332, wFrac: 0.4879, hFrac: 0.2286 } },
      22: { yFrac: 0.7157, anchor: 'top', align: 'center', box: { xFrac: 0.3711, yFrac: 0.7157, wFrac: 0.4914, hFrac: 0.2129 } },
      23: { yFrac: 0.1446, anchor: 'top', align: 'center', box: { xFrac: 0.3136, yFrac: 0.1446, wFrac: 0.3821, hFrac: 0.2004 } },
      24: { yFrac: 0.6436, anchor: 'top', align: 'center', box: { xFrac: 0.2332, yFrac: 0.6436, wFrac: 0.5339, hFrac: 0.2421 } },
      25: { yFrac: 0.6746, anchor: 'top', align: 'center', box: { xFrac: 0.3911, yFrac: 0.6746, wFrac: 0.4525, hFrac: 0.2011 } },
      26: { yFrac: 0.6636, anchor: 'top', align: 'center', box: { xFrac: 0.1386, yFrac: 0.6636, wFrac: 0.5071, hFrac: 0.2154 } },
      27: { yFrac: 0.7082, anchor: 'top', align: 'center', box: { xFrac: 0.1275, yFrac: 0.7082, wFrac: 0.3743, hFrac: 0.235 } },
      28: { yFrac: 0.6907, anchor: 'top', align: 'center', box: { xFrac: 0.2204, yFrac: 0.6907, wFrac: 0.5504, hFrac: 0.215 } },
    },
  },
};
