// ──────────────────────────────────────────────────────────────
// Application-wide constants for Kutty Story
// ──────────────────────────────────────────────────────────────

/** Cost and generation limits to control AI spend and abuse. */
export const COST_LIMITS = {
  /** Maximum AI generation cost per book in US cents. */
  MAX_GENERATION_COST_PER_BOOK_CENTS: 400,
  /** How many times a single page can be regenerated. */
  MAX_REGENERATIONS_PER_PAGE: 2,
  /** Free preview generations allowed per user per calendar day. */
  MAX_PREVIEW_GENERATIONS_PER_USER_PER_DAY: 5,
  /** Free preview generations allowed per IP address per rolling hour. */
  MAX_PREVIEW_GENERATIONS_PER_IP_PER_HOUR: 3,
  /** Timeout for a single generation request in milliseconds. */
  GENERATION_TIMEOUT_MS: 120_000,
} as const;

/** Book format prices in paise (1 INR = 100 paise). */
export const PRICING = {
  /** PDF download only */
  PDF_DOWNLOAD: 89_900,
  /** Printed + shipped book */
  PRINTED_BOOK: 129_900,
  /** Additional cost when a bilingual edition is selected. */
  BILINGUAL_UPSELL: 20_000,
} as const;

/** Physical print specifications per format. */
export const PRINT_SPECS = {
  softcover: {
    trimSize: { widthMm: 210, heightMm: 210 },
    paperWeight: '170gsm art paper',
    cover: '300gsm art card with matte lamination',
    binding: 'perfect binding',
    spine: 'square spine',
  },
  hardcover: {
    trimSize: { widthMm: 210, heightMm: 210 },
    paperWeight: '170gsm art paper',
    cover: '3mm greyboard with 150gsm art paper wrap, matte lamination',
    binding: 'case binding',
    spine: 'round spine',
  },
  premium: {
    trimSize: { widthMm: 210, heightMm: 210 },
    paperWeight: '200gsm art paper',
    cover: '3mm greyboard with 150gsm art paper wrap, spot UV and foil stamping',
    binding: 'case binding with ribbon bookmark',
    spine: 'round spine',
    giftBox: 'rigid box with magnetic closure, 350gsm art card',
  },
} as const;

/** Maximum number of child photos a user may upload. */
export const MAX_PHOTOS_PER_CHILD = 5;

/** Maximum allowed size for a single uploaded photo (10 MB). */
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

/** MIME types accepted for photo uploads. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Number of pages shown in the free preview. */
export const PREVIEW_PAGE_COUNT = 5;

/** Total number of pages in a finished book. */
export const TOTAL_PAGE_COUNT = 28;

/** Prefix for human-readable order numbers. */
export const ORDER_NUMBER_PREFIX = 'KS';

/** How long uploaded photos are retained before automatic deletion (days). */
export const PHOTO_RETENTION_DAYS = 30;
