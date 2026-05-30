import { ORDER_NUMBER_PREFIX, PRICING } from './constants';

// ──────────────────────────────────────────────────────────────
// Shared utility functions
// ──────────────────────────────────────────────────────────────

/**
 * Generate a human-readable order number.
 * Format: KS-YYYY-NNNNNN  (e.g. KS-2026-000042)
 */
export function generateOrderNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(6, '0');
  return `${ORDER_NUMBER_PREFIX}-${year}-${padded}`;
}

/**
 * Convert an amount in paise to a formatted INR string.
 * Example: 149900 -> "₹1,499"
 */
export function formatPriceInr(paise: number): string {
  const rupees = Math.round(paise) / 100;
  // Use the Indian numbering system (en-IN) for proper lakh/crore grouping.
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Map a child's age (in years) to an age group label.
 */
export function getAgeGroup(
  age: number,
): 'toddler' | 'preschool' | 'early-reader' | 'reader' {
  if (age <= 2) return 'toddler';
  if (age <= 5) return 'preschool';
  if (age <= 8) return 'early-reader';
  return 'reader';
}

/**
 * Convert arbitrary text into a URL-friendly slug.
 * Example: "The Lion & the Mouse!" -> "the-lion-the-mouse"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // spaces & underscores -> hyphens
    .replace(/[^\w-]+/g, '') // strip non-word chars (except hyphens)
    .replace(/--+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

/**
 * Replace `{{variable}}` placeholders in a template string.
 *
 * ```ts
 * templateReplace("Hello {{name}}!", { name: "Aarav" });
 * // -> "Hello Aarav!"
 * ```
 */
export function templateReplace(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in variables ? variables[key] : match;
  });
}

/**
 * Calculate the total book price in paise for a given format and language.
 *
 * @param format      - Book format key matching PRICING.
 * @param language    - Language selection; "BILINGUAL" adds the upsell.
 * @param discountPercent - Optional discount (0-100).
 * @returns Final price in paise.
 */
export function calculateBookPrice(
  format: 'PDF_DOWNLOAD' | 'PRINTED_BOOK',
  language: 'ENGLISH' | 'TAMIL' | 'BILINGUAL',
  discountPercent?: number,
): number {
  let price: number = PRICING[format];

  if (language === 'BILINGUAL') {
    price += PRICING.BILINGUAL_UPSELL;
  }

  if (discountPercent && discountPercent > 0 && discountPercent <= 100) {
    price = Math.round(price * (1 - discountPercent / 100));
  }

  return price;
}
