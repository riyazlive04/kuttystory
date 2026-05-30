import { z } from 'zod';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
} from './constants';

// ──────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────

export const GenderEnum = z.enum(['BOY', 'GIRL', 'PREFER_NOT_TO_SAY']);
export type Gender = z.infer<typeof GenderEnum>;

export const BookFormatEnum = z.enum([
  'SOFTCOVER',
  'HARDCOVER',
  'PREMIUM_HARDCOVER_GIFT_BOX',
]);
export type BookFormat = z.infer<typeof BookFormatEnum>;

export const LanguageEnum = z.enum(['ENGLISH', 'TAMIL', 'BILINGUAL']);
export type Language = z.infer<typeof LanguageEnum>;

// ──────────────────────────────────────────────────────────────
// Child profile
// ──────────────────────────────────────────────────────────────

export const childProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  nickname: z.string().max(30).optional(),
  gender: GenderEnum,
  ageYears: z
    .number()
    .int('Age must be a whole number')
    .min(0)
    .max(15),
  skinTone: z.string().optional(),
  hairColor: z.string().optional(),
  hasGlasses: z.boolean().default(false),
});

export type ChildProfile = z.infer<typeof childProfileSchema>;

// ──────────────────────────────────────────────────────────────
// Shipping address
// ──────────────────────────────────────────────────────────────

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  phone: z.string().min(1, 'Phone number is required'),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

// ──────────────────────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  format: BookFormatEnum,
  shippingAddress: shippingAddressSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ──────────────────────────────────────────────────────────────
// Dedication
// ──────────────────────────────────────────────────────────────

export const dedicationMessageSchema = z.object({
  message: z.string().max(200, 'Dedication must be 200 characters or fewer'),
});

export type DedicationMessage = z.infer<typeof dedicationMessageSchema>;

// ──────────────────────────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────────────────────────

export const reviewSchema = z.object({
  storyTemplateId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  body: z.string().min(10, 'Review must be at least 10 characters').max(1000),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

// ──────────────────────────────────────────────────────────────
// Authentication
// ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = loginSchema.extend({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

// ──────────────────────────────────────────────────────────────
// Photo upload
// ──────────────────────────────────────────────────────────────

export const photoUploadSchema = z.object({
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    errorMap: () => ({
      message: `File type must be one of: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
    }),
  }),
  fileSizeBytes: z
    .number()
    .max(MAX_PHOTO_SIZE_BYTES, `File size must not exceed ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)} MB`),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;

// ──────────────────────────────────────────────────────────────
// Wizard step schemas (6 steps)
// ──────────────────────────────────────────────────────────────

/** Step 1 — Choose a story template */
export const wizardStep1Schema = z.object({
  storyTemplateId: z.string().min(1, 'Please select a story'),
});

/** Step 2 — Enter child profile details */
export const wizardStep2Schema = childProfileSchema;

/** Step 3 — Upload photos of the child */
export const wizardStep3Schema = z.object({
  photoIds: z
    .array(z.string())
    .min(1, 'Upload at least one photo')
    .max(5, 'Maximum 5 photos allowed'),
});

/** Step 4 — Choose language */
export const wizardStep4Schema = z.object({
  language: LanguageEnum,
});

/** Step 5 — Add a dedication message (optional) */
export const wizardStep5Schema = z.object({
  dedicationMessage: z.string().max(200).optional(),
});

/** Step 6 — Review and confirm preview */
export const wizardStep6Schema = z.object({
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm the preview to continue' }),
  }),
});

export const wizardStepSchemas = [
  wizardStep1Schema,
  wizardStep2Schema,
  wizardStep3Schema,
  wizardStep4Schema,
  wizardStep5Schema,
  wizardStep6Schema,
] as const;
