import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { buildWebPdf, type PageContent } from '@kutty-story/print';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { assertBookFullyGenerated } from '../common/book-completion';

/** Derive a storage key from a stored reference (key or /files/<key> URL). */
function keyFromRef(ref: string): string {
  if (!ref) return ref;
  const filesIdx = ref.indexOf('/files/');
  if (filesIdx >= 0) return ref.slice(filesIdx + '/files/'.length);
  if (/^https?:\/\//i.test(ref)) {
    try {
      return new URL(ref).pathname.replace(/^\/+/, '');
    } catch {
      return ref;
    }
  }
  return ref.replace(/^\/+/, '');
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Assemble a downloadable PDF for a book: each generated (text-free) page
   * image with its personalized caption rendered on top. Works for any story —
   * the caption text comes from the story's own page templates.
   *
   * `requireComplete` (default true) enforces the strict assembly barrier — all
   * pages must be READY (used for customer delivery). Pass false for admin
   * downloads/inspection, which assemble whatever pages exist so far (e.g. a
   * 5-page preview), skipping any that can't be read.
   */
  async buildBookPdf(
    bookId: string,
    opts: { requireComplete?: boolean } = {},
  ): Promise<{ buffer: Buffer; fileName: string; title: string }> {
    const requireComplete = opts.requireComplete !== false;

    // STRICT ASSEMBLY BARRIER — for customer delivery, refuse unless every page
    // of the book has been generated. Throws BookIncompleteError otherwise.
    if (requireComplete) {
      await assertBookFullyGenerated(this.db, bookId);
    }

    const book = await this.db.book.findUnique({
      where: { id: bookId },
      include: {
        child: true,
        story: { include: { pages: { orderBy: { pageNumber: 'asc' } } } },
        pages: { orderBy: { pageNumber: 'asc' } },
      },
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const childName = book.child.name;

    // The caption (with the child's name) is baked into each generated page by
    // the image model, so the PDF renders the images as-is.
    const pageContents: PageContent[] = [];
    for (const bp of book.pages) {
      if (!bp.finalImageUrl) continue;
      const key = keyFromRef(bp.finalImageUrl);
      let imageBuffer: Buffer;
      try {
        imageBuffer = await this.storage.read(key);
      } catch (err) {
        if (requireComplete) {
          // The barrier guarantees every page is READY, so a failed read is a
          // genuine storage fault — fail loudly rather than ship a missing page.
          throw new Error(
            `PDF assembly aborted: could not read page ${bp.pageNumber} image (${key}): ${err}`,
          );
        }
        // Admin/partial download: best-effort — skip the unreadable page.
        this.logger.warn(`PDF: skipping unreadable page ${bp.pageNumber} (${key}): ${err}`);
        continue;
      }
      pageContents.push({
        pageNumber: bp.pageNumber,
        imageUrl: bp.finalImageUrl,
        imageBuffer,
      });
    }

    if (pageContents.length === 0) {
      throw new Error('No generated pages available to build the PDF');
    }

    const buffer = await buildWebPdf(pageContents);
    const title = (book.story.title || 'storybook').replace(
      /\{\{\s*childName\s*\}\}/g,
      childName,
    );
    const safe = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    return { buffer, fileName: `${safe || 'storybook'}.pdf`, title };
  }
}
