import { DatabaseService } from '../database/database.service';

/** Thrown when an assembly step is attempted before all pages are generated. */
export class BookIncompleteError extends Error {
  constructor(
    public bookId: string,
    public readyCount: number,
    public expectedCount: number,
    public missingPages: number[],
  ) {
    super(
      `Book ${bookId} is not fully generated: ${readyCount}/${expectedCount} pages ready. ` +
        `Missing/incomplete pages: [${missingPages.join(', ')}]. ` +
        `Refusing to assemble output until every page is READY.`,
    );
    this.name = 'BookIncompleteError';
  }
}

/**
 * STRICT ASSEMBLY BARRIER.
 *
 * Verifies that EVERY page defined by the book's story template has a
 * corresponding BookPage in status READY with a stored image. Both delivery
 * formats — the digital PDF download and the print-ready printed book — call
 * this before assembling any output, so neither can ship a book with holes.
 *
 * Throws {@link BookIncompleteError} if any page is missing/incomplete.
 * Returns the ordered, verified pages on success so callers can reuse them.
 */
export async function assertBookFullyGenerated(
  db: DatabaseService,
  bookId: string,
): Promise<{ pageNumber: number; finalImageUrl: string }[]> {
  const book = await db.book.findUnique({
    where: { id: bookId },
    include: {
      story: { include: { pages: { orderBy: { pageNumber: 'asc' } } } },
      pages: { orderBy: { pageNumber: 'asc' } },
    },
  });

  if (!book) {
    throw new BookIncompleteError(bookId, 0, 0, []);
  }

  const expected = book.story.pages.map((p) => p.pageNumber);
  const ready = new Map(
    book.pages
      .filter((p) => p.status === 'READY' && p.finalImageUrl)
      .map((p) => [p.pageNumber, p.finalImageUrl as string]),
  );

  const missing = expected.filter((n) => !ready.has(n));
  if (missing.length > 0) {
    throw new BookIncompleteError(
      bookId,
      ready.size,
      expected.length,
      missing,
    );
  }

  return expected.map((n) => ({ pageNumber: n, finalImageUrl: ready.get(n)! }));
}
