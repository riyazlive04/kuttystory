/**
 * Crop a child's uploaded photo to a clean, front-facing headshot using fal
 * Florence-2 face detection.
 *
 * A tight, background-free face is the single biggest factor in face-swap /
 * redraw likeness: a small face in a busy photo, or a photo with several people,
 * is the main reason a provider "doesn't replace the face" on some pages. We run
 * this ONCE per book on the child's primary photo and reuse the clean crop for
 * every page, so it costs one cheap fal call regardless of page count.
 *
 * Best-effort: returns the ORIGINAL photo unchanged if there's no fal key, the
 * detector errors/times out, or no face is found — generation never depends on it.
 */

import sharp from 'sharp';

const FLORENCE_URL =
  'https://fal.run/fal-ai/florence-2-large/open-vocabulary-detection';

interface Bbox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface CropOptions {
  /** Horizontal margin as a fraction of the face box width (each side). */
  marginX?: number;
  /** Top margin as a fraction of the face box height (room for hair). */
  marginTop?: number;
  /** Bottom margin as a fraction of the face box height (chin/neck). */
  marginBottom?: number;
  timeoutMs?: number;
}

const DEFAULTS = {
  marginX: 0.5,
  marginTop: 0.7,
  marginBottom: 0.5,
  timeoutMs: 20_000,
};

/**
 * Return a face-cropped version of `photo`, or the original buffer if cropping
 * isn't possible. Coordinates from Florence-2 are in the original image's pixel
 * space, so we crop the source buffer directly.
 */
export async function cropToFace(
  photo: Buffer,
  falApiKey: string,
  opts: CropOptions = {},
): Promise<Buffer> {
  if (!falApiKey) return photo;
  const marginX = opts.marginX ?? DEFAULTS.marginX;
  const marginTop = opts.marginTop ?? DEFAULTS.marginTop;
  const marginBottom = opts.marginBottom ?? DEFAULTS.marginBottom;
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;

  let boxes: Bbox[] = [];
  try {
    const dataUri = `data:image/jpeg;base64,${photo.toString('base64')}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(FLORENCE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: dataUri, text_input: 'human face' }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return photo;
    const json = (await res.json()) as { results?: { bboxes?: Bbox[] } };
    boxes = json?.results?.bboxes ?? [];
  } catch {
    return photo;
  }

  // Prefer face-labelled boxes; pick the largest (the main subject). Fall back to
  // the largest box of any label if Florence didn't tag one "face".
  const faces = boxes
    .filter((b) => /face/i.test(b.label || ''))
    .sort((a, b) => b.w * b.h - a.w * a.h);
  const face = faces[0] || boxes.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (!face || face.w <= 0 || face.h <= 0) return photo;

  try {
    const meta = await sharp(photo).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) return photo;
    const left = Math.max(0, Math.round(face.x - face.w * marginX));
    const top = Math.max(0, Math.round(face.y - face.h * marginTop));
    const right = Math.min(W, Math.round(face.x + face.w + face.w * marginX));
    const bottom = Math.min(H, Math.round(face.y + face.h + face.h * marginBottom));
    const width = right - left;
    const height = bottom - top;
    // Guard against a degenerate box.
    if (width < 32 || height < 32) return photo;
    return await sharp(photo)
      .extract({ left, top, width, height })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    return photo;
  }
}
