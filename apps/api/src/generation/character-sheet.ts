import {
  buildCharacterSheetPrompt,
  generatePersonalizedImage,
  type ReferenceImage,
} from '@kutty-story/ai';

export interface BuildCharacterSheetInput {
  apiKey: string;
  /** The child's uploaded reference photo(s). */
  childRefs: ReferenceImage[];
  /** The story's art style, so the drawn hero matches the book. */
  artStyle: string;
  ageYears: number;
  gender: string;
  skinTone?: string | null;
  hairColor?: string | null;
  hasGlasses?: boolean;
}

export interface BuildCharacterSheetResult {
  buffer: Buffer;
  latencyMs: number;
}

/**
 * Generate a per-child "character sheet" for the Nano Banana Pro illustrated-
 * redraw provider: the child re-drawn ONCE as a storybook hero in the book's art
 * style. The orchestrator stores the result and caches its URL on the child, then
 * hands the sheet to every per-page redraw as the identity anchor — giving the
 * same look across all pages without any per-child training.
 *
 * This is a SYNC (standard-API) call by design: every page depends on the sheet,
 * so it can't wait on the async batch lane. Uses `nano-banana-redraw` so the sheet
 * is drawn by the same model that renders the pages (consistent style).
 */
export async function buildCharacterSheet(
  input: BuildCharacterSheetInput,
): Promise<BuildCharacterSheetResult> {
  if (!input.childRefs.length) {
    throw new Error('Cannot build a character sheet without a child reference photo');
  }

  const prompt = buildCharacterSheetPrompt({
    artStyle: input.artStyle,
    ageYears: input.ageYears,
    gender: input.gender,
    skinTone: input.skinTone || undefined,
    hairColor: input.hairColor || undefined,
    hasGlasses: input.hasGlasses,
  });

  const result = await generatePersonalizedImage({
    provider: 'nano-banana-redraw',
    apiKey: input.apiKey,
    prompt,
    // Only the child's photos — there is no template to edit; this is a fresh draw.
    referenceImages: input.childRefs.slice(0, 3),
  });

  return { buffer: result.buffer, latencyMs: result.latencyMs };
}
