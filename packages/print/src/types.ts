export interface PrintSpecification {
  trimWidth: number;
  trimHeight: number;
  bleedMm: number;
  dpi: number;
  interiorPaper: string;
  coverPaper: string;
  binding: string;
  spineWidthMm: number;
}

export type BookFormat = 'SOFTCOVER' | 'HARDCOVER' | 'PREMIUM_HARDCOVER_GIFT_BOX';

export interface PageContent {
  pageNumber: number;
  imageUrl: string;
  imageBuffer?: Buffer;
  text?: string;
}

export interface PdfOutput {
  interiorPdf: Buffer;
  coverPdf: Buffer;
  totalPages: number;
}
