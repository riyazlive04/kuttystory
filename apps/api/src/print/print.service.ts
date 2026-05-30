import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { assertBookFullyGenerated } from '../common/book-completion';
import { PrintPdfBuilder } from '@kutty-story/print';
import type { PageContent, BookFormat } from '@kutty-story/print';

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

/** Map the DB BookFormat (PDF_DOWNLOAD | PRINTED_BOOK) to a print spec format. */
function toPrintFormat(_dbFormat: string): BookFormat {
  // The only physical format offered is the softcover printed book.
  return 'SOFTCOVER';
}

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  async generatePrintPdf(orderItemId: string) {
    // Fetch the order item with book and pages
    const orderItem = await this.db.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        book: {
          include: {
            pages: {
              orderBy: { pageNumber: 'asc' },
            },
          },
        },
        order: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const book = orderItem.book;
    const format = toPrintFormat(orderItem.format);

    // STRICT ASSEMBLY BARRIER — never lay out a printed book before all 28
    // pages exist. Throws BookIncompleteError otherwise.
    await assertBookFullyGenerated(this.db, book.id);

    // Create or find existing PrintJob for this order item
    let printJob = await this.db.printJob.findUnique({
      where: { orderItemId },
    });

    if (!printJob) {
      printJob = await this.db.printJob.create({
        data: {
          orderItemId,
          status: 'PDF_GENERATING',
          startedAt: new Date(),
        },
      });
    } else {
      printJob = await this.db.printJob.update({
        where: { id: printJob.id },
        data: {
          status: 'PDF_GENERATING',
          startedAt: new Date(),
        },
      });
    }

    try {
      // Convert BookPages to PageContent for the PDF builder, loading each
      // page's high-res image from storage so the interior actually renders.
      const pages: PageContent[] = [];
      for (const page of book.pages) {
        if (!page.finalImageUrl) continue;
        const key = keyFromRef(page.finalImageUrl);
        let imageBuffer: Buffer;
        try {
          imageBuffer = await this.storage.read(key);
        } catch (err) {
          // The barrier guarantees every page is READY, so a failed read is a
          // genuine storage fault — abort rather than print a blank page.
          throw new Error(
            `Print assembly aborted: could not read page ${page.pageNumber} image (${key}): ${err}`,
          );
        }
        pages.push({
          pageNumber: page.pageNumber,
          imageUrl: page.finalImageUrl,
          imageBuffer,
        });
      }

      // Generate the print-ready interior + cover PDFs (full-bleed, 300 DPI).
      const pdfBuilder = new PrintPdfBuilder(format, pages);
      const pdfOutput = await pdfBuilder.generate();

      // Persist the actual PDF buffers to storage and store their real URLs.
      const interior = await this.storage.save(
        `print-pdfs/${book.id}/interior.pdf`,
        pdfOutput.interiorPdf,
        'application/pdf',
      );
      const cover = await this.storage.save(
        `print-pdfs/${book.id}/cover.pdf`,
        pdfOutput.coverPdf,
        'application/pdf',
      );

      // Update PrintJob with PDF URLs
      printJob = await this.db.printJob.update({
        where: { id: printJob.id },
        data: {
          status: 'PDF_READY',
          interiorPdfUrl: interior.url,
          coverPdfUrl: cover.url,
          // The interior is the print-ready artifact for the press; the cover
          // is supplied alongside it.
          printReadyPdfUrl: interior.url,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Print PDF generated for order item ${orderItemId}. Pages: ${pdfOutput.totalPages}`,
      );

      return printJob;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';

      await this.db.printJob.update({
        where: { id: printJob.id },
        data: {
          status: 'FAILED',
          notes: `PDF generation failed: ${message}`,
        },
      });

      this.logger.error(
        `Print PDF generation failed for order item ${orderItemId}: ${message}`,
      );
      throw error;
    }
  }

  async getPrintQueue(filters?: { status?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) {
      where.status = filters.status;
    }

    // PrintJob has no direct relation to Order/OrderItem in the schema,
    // so we fetch print jobs and enrich with order item data separately
    const printJobs = await this.db.printJob.findMany({
      where: where as any,
      orderBy: { createdAt: 'asc' },
    });

    // Enrich with order item and book data
    const enriched = await Promise.all(
      printJobs.map(async (pj) => {
        const orderItem = await this.db.orderItem.findUnique({
          where: { id: pj.orderItemId },
          include: {
            book: true,
            order: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        });
        return { ...pj, orderItem };
      }),
    );

    return enriched;
  }

  async updatePrintJobStatus(id: string, status: string, notes?: string) {
    const printJob = await this.db.printJob.findUnique({
      where: { id },
    });
    if (!printJob) {
      throw new NotFoundException('Print job not found');
    }

    const updateData: Record<string, unknown> = {
      status,
    };

    if (notes) {
      updateData.notes = notes;
    }

    // Set timestamps based on status
    if (status === 'PRINTING') {
      updateData.startedAt = new Date();
    }
    if (status === 'READY_TO_SHIP') {
      updateData.completedAt = new Date();
    }

    return this.db.printJob.update({
      where: { id },
      data: updateData as any,
    });
  }
}
