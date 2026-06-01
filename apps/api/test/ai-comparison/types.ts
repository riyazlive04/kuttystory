/**
 * Types for the AI provider comparison harness (Change Prompt §2).
 *
 * This is a STANDALONE validation tool — it does not import or modify any
 * production runtime code. It reuses the shared prompt builders and the
 * OpenAI/fal image path from `@kutty-story/ai` only so the baseline (Option A)
 * and Option D are a true apples-to-apples match for production behaviour.
 */

/** The four providers under comparison. */
export type Option = 'A_openai' | 'B_flux_kontext' | 'C_flux_lora' | 'D_fal_pulid';

export interface ChildConfig {
  name: string;
  ageYears: number;
  /** 'boy' | 'girl' | 'child' — used verbatim in the prompt. */
  gender: string;
  skinTone?: string;
  hairColor?: string;
  hasGlasses?: boolean;
}

export interface StyleTokens {
  style: string;
  medium: string;
  palette: string;
  lighting: string;
}

export interface PageConfig {
  pageNumber: number;
  /** Scene description for this page (the [SCENE] line of the prompt). */
  scene: string;
  /** Optional composition hint (the [COMPOSITION] line). */
  composition?: string;
  /** The caption/title text on the page (used by the OpenAI edit baseline). */
  caption: string;
  /**
   * Optional path to the existing template illustration for this page. When
   * provided, Option A uses the production edit-in-place path (template + photo)
   * — the true baseline. When absent, Option A falls back to fresh generation
   * from the photo, like B/C/D, for a same-conditions comparison.
   */
  baseTemplatePath?: string;
}

export interface ComparisonConfig {
  /** Label for the run (used in the report title). */
  storyTitle: string;
  child: ChildConfig;
  style: StyleTokens;
  /** Folder containing 3–5 reference photos of the child (jpg/png/webp). */
  photosDir: string;
  /** The 5 pages to generate per provider. */
  pages: PageConfig[];
  /**
   * Which options to run. Omit any you can't run yet (e.g. drop the Replicate
   * ones until you have a token). Defaults to all four.
   */
  options?: Option[];
}

export interface PageResult {
  option: Option;
  pageNumber: number;
  /** Relative path of the saved PNG within the run directory, or null on error. */
  imageFile: string | null;
  estimatedCostCents: number;
  latencyMs: number;
  error?: string;
}

export interface OptionSummary {
  option: Option;
  label: string;
  /** One-time setup cost (e.g. LoRA training) amortized separately. */
  setupCostCents: number;
  setupNote?: string;
  perImageCents: number;
  totalImageCostCents: number;
  /** setup + all images, for the 5-page test. */
  grandTotalCents: number;
  avgLatencyMs: number;
  successCount: number;
  failCount: number;
  results: PageResult[];
}
