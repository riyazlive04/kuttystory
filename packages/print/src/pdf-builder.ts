import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { BookFormat, PageContent, PdfOutput } from './types';
import { PRINT_SPECS, calculateSpineWidth } from './specs';
import { resizeForPrint, addBleed } from './image-processor';

// 1 inch = 72 points, 1 mm = 2.83465 points
const POINTS_PER_INCH = 72;
const POINTS_PER_MM = 2.83465;

/**
 * Build a compact, screen-resolution PDF for email/download (NOT print).
 * Each page image is downscaled and JPEG-compressed so the whole book stays
 * small enough to email (≈150–300KB/page), with the caption rendered on top.
 */
export async function buildWebPdf(
  pages: PageContent[],
  opts: { sizePx?: number; jpegQuality?: number; fontBuffer?: Buffer } = {},
): Promise<Buffer> {
  const sizePx = opts.sizePx ?? 1200;
  const jpegQuality = opts.jpegQuality ?? 80;
  const pagePt = 540; // ~7.5in square

  const processed: { jpeg: Buffer; text?: string }[] = [];
  for (const p of pages) {
    if (!p.imageBuffer) continue;
    const jpeg = await sharp(p.imageBuffer)
      .resize(sizePx, sizePx, { fit: 'cover', position: 'center' })
      .jpeg({ quality: jpegQuality })
      .toBuffer();
    processed.push({ jpeg, text: p.text });
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: [pagePt, pagePt],
      margin: 0,
      autoFirstPage: false,
    });
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Use the bundled rounded caption font when provided, so the PDF matches
    // the on-screen preview. Fall back to a built-in bold if it can't load.
    let captionFont = 'Helvetica-Bold';
    if (opts.fontBuffer) {
      try {
        doc.registerFont('Caption', opts.fontBuffer);
        captionFont = 'Caption';
      } catch {
        captionFont = 'Helvetica-Bold';
      }
    }

    for (const pg of processed) {
      doc.addPage();
      doc.image(pg.jpeg, 0, 0, { width: pagePt, height: pagePt });
      if (pg.text) {
        const bandH = 76;
        doc
          .rect(0, pagePt - bandH, pagePt, bandH)
          .fillOpacity(0.55)
          .fill('#000000');
        doc
          .fillOpacity(1)
          .fillColor('#FFFFFF')
          .font(captionFont)
          .fontSize(16)
          .text(pg.text, 24, pagePt - bandH + 16, {
            width: pagePt - 48,
            align: 'center',
            lineGap: 2,
          });
      }
    }
    doc.end();
  });
}

export class PrintPdfBuilder {
  private format: BookFormat;
  private pages: PageContent[];
  private spec = PRINT_SPECS.SOFTCOVER; // default, overridden in constructor

  constructor(format: BookFormat, pages: PageContent[]) {
    this.format = format;
    this.pages = pages;
    this.spec = PRINT_SPECS[format] ?? PRINT_SPECS.SOFTCOVER;
  }

  /**
   * Generate the interior PDF with full-bleed pages at 300 DPI.
   * Each page is 8.5" x 8.5" trim + 3mm bleed on each side.
   */
  async generateInteriorPdf(): Promise<Buffer> {
    const bleedPt = this.spec.bleedMm * POINTS_PER_MM; // ~8.5pt
    const trimWidthPt = this.spec.trimWidth * POINTS_PER_INCH; // 612pt
    const trimHeightPt = this.spec.trimHeight * POINTS_PER_INCH; // 612pt

    // Full page size including bleed on all sides
    const pageWidthPt = trimWidthPt + bleedPt * 2;
    const pageHeightPt = trimHeightPt + bleedPt * 2;

    // Image dimensions at print DPI (with bleed)
    const imageWidthPx = Math.round(
      ((this.spec.trimWidth * 25.4 + this.spec.bleedMm * 2) / 25.4) * this.spec.dpi,
    );
    const imageHeightPx = Math.round(
      ((this.spec.trimHeight * 25.4 + this.spec.bleedMm * 2) / 25.4) * this.spec.dpi,
    );

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: [pageWidthPt, pageHeightPt],
        margin: 0,
        autoFirstPage: false,
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const addPages = async () => {
        for (const page of this.pages) {
          doc.addPage();

          if (page.imageBuffer) {
            // Resize image to print dimensions with bleed
            const resized = await resizeForPrint(page.imageBuffer, imageWidthPx, imageHeightPx);
            doc.image(resized, 0, 0, {
              width: pageWidthPt,
              height: pageHeightPt,
            });
          }

          // Overlay text if present
          if (page.text) {
            const textMargin = bleedPt + 36; // 36pt (0.5") inside the trim
            doc
              .font('Helvetica')
              .fontSize(14)
              .fillColor('black')
              .text(page.text, textMargin, pageHeightPt - textMargin - 50, {
                width: trimWidthPt - 72,
                align: 'center',
              });
          }
        }

        doc.end();
      };

      addPages().catch(reject);
    });
  }

  /**
   * Generate the cover PDF spread: back cover + spine + front cover.
   * Total width = 2 * trimWidth + spineWidth, all with bleed.
   */
  async generateCoverPdf(): Promise<Buffer> {
    const bleedPt = this.spec.bleedMm * POINTS_PER_MM;
    const trimWidthPt = this.spec.trimWidth * POINTS_PER_INCH;
    const trimHeightPt = this.spec.trimHeight * POINTS_PER_INCH;

    // Calculate spine width based on page count
    const paperGsm = this.spec.interiorPaper.includes('170') ? 170 : 200;
    const spineWidthMm = calculateSpineWidth(this.pages.length, paperGsm);
    const spineWidthPt = spineWidthMm * POINTS_PER_MM;

    // Total cover spread: back + spine + front, plus bleed on outer edges
    const coverWidthPt = bleedPt + trimWidthPt + spineWidthPt + trimWidthPt + bleedPt;
    const coverHeightPt = trimHeightPt + bleedPt * 2;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: [coverWidthPt, coverHeightPt],
        margin: 0,
        autoFirstPage: true,
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Draw a white background
      doc.rect(0, 0, coverWidthPt, coverHeightPt).fill('#FFFFFF');

      // Draw spine area with a subtle color
      const spineX = bleedPt + trimWidthPt;
      doc.rect(spineX, 0, spineWidthPt, coverHeightPt).fill('#F0E6F6');

      // Add spine text (rotated)
      doc.save();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#333333');
      doc.translate(spineX + spineWidthPt / 2, coverHeightPt / 2);
      doc.rotate(-90);
      doc.text('Kutty Story', -40, -4, { width: 80, align: 'center' });
      doc.restore();

      // Mark trim lines (as thin guides)
      doc
        .strokeColor('#CCCCCC')
        .lineWidth(0.25)
        // Back cover trim
        .rect(bleedPt, bleedPt, trimWidthPt, trimHeightPt)
        .stroke()
        // Front cover trim
        .rect(bleedPt + trimWidthPt + spineWidthPt, bleedPt, trimWidthPt, trimHeightPt)
        .stroke();

      doc.end();
    });
  }

  /**
   * Generate both interior and cover PDFs and return the combined output.
   */
  async generate(): Promise<PdfOutput> {
    const [interiorPdf, coverPdf] = await Promise.all([
      this.generateInteriorPdf(),
      this.generateCoverPdf(),
    ]);

    return {
      interiorPdf,
      coverPdf,
      totalPages: this.pages.length,
    };
  }
}
