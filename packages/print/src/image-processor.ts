import sharp from 'sharp';

/**
 * Resize an image buffer to the exact print dimensions in pixels.
 */
export async function resizeForPrint(
  imageBuffer: Buffer,
  widthPx: number,
  heightPx: number,
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(widthPx, heightPx, {
      fit: 'cover',
      position: 'center',
    })
    .png()
    .toBuffer();
}

/**
 * Add bleed by extending the edges of the image outward.
 * The bleedPx value is applied to all four sides.
 */
export async function addBleed(
  imageBuffer: Buffer,
  bleedPx: number,
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  return sharp(imageBuffer)
    .extend({
      top: bleedPx,
      bottom: bleedPx,
      left: bleedPx,
      right: bleedPx,
      extendWith: 'mirror',
    })
    .resize(width + bleedPx * 2, height + bleedPx * 2, {
      fit: 'fill',
    })
    .png()
    .toBuffer();
}

/**
 * Compress and optimize an image for web upload.
 * Resizes to max 2048px on longest side, converts to WebP, strips EXIF.
 */
export async function compressUpload(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const maxDim = 2048;
  let resizeOpts: { width?: number; height?: number } = {};

  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      resizeOpts = { width: maxDim };
    } else {
      resizeOpts = { height: maxDim };
    }
  }

  return sharp(imageBuffer)
    .resize(resizeOpts.width, resizeOpts.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .rotate() // auto-rotate based on EXIF, then strip
    .webp({ quality: 85 })
    .toBuffer();
}

/**
 * Get the dimensions of an image buffer.
 */
export async function getImageDimensions(
  imageBuffer: Buffer,
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}
