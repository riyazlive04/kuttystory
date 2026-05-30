import { PrintSpecification } from './types';

export const PRINT_SPECS: Record<string, PrintSpecification> = {
  SOFTCOVER: {
    trimWidth: 8.5,
    trimHeight: 8.5,
    bleedMm: 3,
    dpi: 300,
    interiorPaper: '170gsm matte coated',
    coverPaper: '250gsm gloss laminated',
    binding: 'Perfect bound',
    spineWidthMm: 5,
  },
  HARDCOVER: {
    trimWidth: 8.5,
    trimHeight: 8.5,
    bleedMm: 3,
    dpi: 300,
    interiorPaper: '200gsm matte coated',
    coverPaper: '350gsm + cloth wrap',
    binding: 'Case bound',
    spineWidthMm: 5,
  },
  PREMIUM_HARDCOVER_GIFT_BOX: {
    trimWidth: 8.5,
    trimHeight: 8.5,
    bleedMm: 3,
    dpi: 300,
    interiorPaper: '200gsm silk',
    coverPaper: '350gsm + gold foil + gift box',
    binding: 'Case bound with ribbon bookmark',
    spineWidthMm: 5,
  },
};

export function calculateSpineWidth(pageCount: number, paperGsm: number): number {
  const sheetsPerPage = 0.5;
  const thicknessPerSheet = paperGsm <= 170 ? 0.15 : 0.2;
  return pageCount * sheetsPerPage * thicknessPerSheet;
}
