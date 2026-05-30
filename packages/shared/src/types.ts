// ──────────────────────────────────────────────────────────────
// Core TypeScript type definitions for Kutty Story
// ──────────────────────────────────────────────────────────────

/** The 6-step wizard state kept in the frontend store. */
export interface WizardState {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  storyTemplateId: string | null;
  childProfile: {
    name: string;
    nickname?: string;
    gender: 'BOY' | 'GIRL' | 'PREFER_NOT_TO_SAY';
    ageYears: number;
    skinTone?: string;
    hairColor?: string;
    hasGlasses: boolean;
  } | null;
  photoIds: string[];
  language: 'ENGLISH' | 'TAMIL' | 'BILINGUAL';
  dedicationMessage: string;
  bookId: string | null;
  // Lead / shipping contact, collected upfront in the wizard.
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

/** Generic pagination parameters used across list endpoints. */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Standard API response envelope. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Data returned when generating or fetching a book preview. */
export interface BookPreviewData {
  bookId: string;
  storyTemplateId: string;
  childName: string;
  language: 'ENGLISH' | 'TAMIL' | 'BILINGUAL';
  pages: Array<{
    pageNumber: number;
    imageUrl: string;
    textOverlay?: string;
  }>;
  createdAt: string;
  expiresAt: string;
}

/** Timeline entry for order tracking. */
export interface OrderTimelineEntry {
  status: string;
  timestamp: string;
  description: string;
}

/** Full order tracking payload returned by the tracking endpoint. */
export interface OrderTrackingData {
  orderNumber: string;
  status:
    | 'PLACED'
    | 'CONFIRMED'
    | 'PRINTING'
    | 'QUALITY_CHECK'
    | 'SHIPPED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';
  estimatedDelivery?: string;
  trackingUrl?: string;
  timeline: OrderTimelineEntry[];
}

/** Physical specifications for a print run. */
export interface PrintSpecification {
  trimSize: { widthMm: number; heightMm: number };
  paperWeight: string;
  cover: string;
  binding: string;
  spine: string;
  giftBox?: string;
}

// ShippingAddress type is exported from schemas.ts (inferred from Zod)

/** Query filters for the story catalog browsing page. */
export interface StoryCatalogFilters {
  theme?: string;
  ageRange?: { min: number; max: number };
  language?: 'ENGLISH' | 'TAMIL' | 'BILINGUAL';
  search?: string;
}
