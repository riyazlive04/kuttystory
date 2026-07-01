import { CharacterDescription, PromptTemplate } from './types';

export function buildIllustrationPrompt(options: {
  styleTokens: PromptTemplate;
  character: CharacterDescription;
  sceneDescription: string;
  composition?: string;
}): string {
  const { styleTokens, character, sceneDescription, composition } = options;
  const glassesClause = character.hasGlasses ? ', wearing glasses' : '';

  const parts = [
    `[STYLE]: ${styleTokens.style}, ${styleTokens.medium}, ${styleTokens.palette}, ${styleTokens.lighting}`,
    `[CHARACTER]: A ${character.ageYears}-year-old ${character.gender} named ${character.childName} with ${character.skinTone || 'warm'} skin, ${character.hairColor || 'dark'} hair${glassesClause}, matching the reference photo exactly`,
    `[SCENE]: ${sceneDescription}`,
  ];

  if (composition) {
    parts.push(`[COMPOSITION]: ${composition}`);
  }

  return parts.join('\n');
}

/**
 * Edit-in-place personalization (best on OpenAI gpt-image-1, the model ChatGPT
 * uses). The model receives the finished template illustration as the FIRST
 * image and the child's photo(s) after it, and makes two edits: swap the cartoon
 * child's face to the real child, and change the name in the title text. The
 * template scene, style and layout are preserved exactly — only the face and
 * name change. This mirrors the manual ChatGPT flow that produced good results.
 */
export function buildPersonalizationEditPrompt(opts: {
  childName: string;
  /** Retained for API compatibility; text is overlaid separately, not drawn. */
  caption?: string;
}): string {
  // Keep this SHORT and direct. The owner proved in ChatGPT that a one-line
  // request ("replace the face of the first photo with the face of the child in
  // the second image") gives a recognisable, well-blended result — while every
  // elaborate/verbose/"must be cartoon" version we tried either kept the template
  // face or produced a generic child. gpt-image does face-replacement best with a
  // minimal instruction; over-specifying dilutes it. Template is the FIRST image,
  // child photo the SECOND (that's the order the orchestrator sends them). The
  // childName is intentionally unused — the ChatGPT prompt that worked has no name.
  void opts;
  return [
    'Replace the face of the child in the FIRST image with the face of the child in the SECOND image.',
    'Keep everything else in the first image exactly the same — pose, body, clothing, scene, background, colours, lighting and art style.',
    'Do not add any text, letters or captions.',
  ].join('\n');
}

/**
 * Edit-in-place personalization for Qwen-Image-Edit-2511 (fal-hosted, 20B
 * instruction editor). Like the OpenAI/Kontext edit path it takes the template
 * page as the FIRST image and the child's photo(s) after it.
 *
 * Qwen is a powerful FULL-SCENE redrawer, so a loose prompt makes it drift: in
 * the PoC it duplicated the child (drew a second floating head), mangled hands,
 * and swapped clothing/background. This prompt is deliberately strict — it
 * targets each of those failure modes explicitly: exactly ONE child, photos are
 * a face reference ONLY (never pasted in), edit ONLY the face + hair, and leave
 * hands/body/clothing/scene pixel-for-pixel untouched.
 */
export function buildQwenEditPrompt(opts: { childName: string }): string {
  const { childName } = opts;
  return [
    `The FIRST image is the picture to edit: a children's storybook cartoon scene that contains exactly ONE child. The other image(s) are photos of a real child named ${childName}, given ONLY as a face-likeness reference.`,
    `Edit the FIRST image in place. Change ONLY that one child's face and hair so they clearly resemble ${childName} — same face shape, eyes, eyebrows, nose, skin tone and hairstyle — re-drawn in the EXACT same hand-drawn cartoon style as the original art (soft cel shading, clean line work, child-like proportions).`,
    'The edited face must stay a cartoon: never photographic, never a pasted or collaged cut-out of the photo, no real skin texture, no photo lighting.',
    'KEEP EVERYTHING ELSE PIXEL-FOR-PIXEL IDENTICAL to the FIRST image: the same single child, the same pose, body, arms, hands, fingers, clothing, props, background, colours, lighting, composition and art style.',
    'STRICT — do NOT add, duplicate, insert or invent any new person, second child, extra face, extra head or extra body. There must remain EXACTLY ONE child in the scene.',
    'Do NOT paste, overlay or place the reference photo anywhere in the picture. Do NOT redraw, move or distort the hands, fingers or body. Do NOT add, remove or change any text, letters or names. Do NOT change the image dimensions.',
    'Output a single cohesive cartoon illustration, the same size and composition as the FIRST image, with only the one child\'s face and hair changed.',
  ].join('\n');
}

/**
 * Fresh-generation personalization for fal.ai PuLID-Flux. Unlike the OpenAI/Gemini
 * edit path (which mutates an existing template), fal draws a brand-new illustration
 * from this text prompt + the child's reference face (identity locked by PuLID). So
 * the prompt must fully describe the cohesive cartoon character AND the scene — there
 * is no template to inherit style/pose from. Mirrors the craft of the OpenAI edit
 * prompt: force a single, fully hand-illustrated cartoon (head + body unified), take
 * likeness from the photo but render it as cartoon art, and emit NO text (the page
 * caption is overlaid afterward).
 */
export function buildFalIllustrationPrompt(options: {
  styleTokens: PromptTemplate;
  character: CharacterDescription;
  sceneDescription: string;
}): string {
  const { styleTokens, character, sceneDescription } = options;
  const glassesClause = character.hasGlasses
    ? ', wearing the same style of glasses as in the reference photo'
    : '';
  return [
    `A premium children's storybook illustration in a soft, hand-painted cartoon style: ${styleTokens.style}, ${styleTokens.medium}, ${styleTokens.palette}, ${styleTokens.lighting}.`,
    `The hero is a ${character.ageYears}-year-old ${character.gender} named ${character.childName}, drawn as ONE cohesive, fully hand-illustrated cartoon character — face, head, hair and body all in exactly the same art style, line weight, shading, colour and lighting.`,
    `LIKENESS: take the child's recognisable features from the reference photo — face shape, ${character.skinTone || 'warm'} skin tone, ${character.hairColor || 'dark'} hair and hairstyle${glassesClause} — but RE-DRAW them as cartoon art. The face must be hand-drawn and illustrated, never photographic, never a cut-out, collage or pasted photo. No real skin texture, no photo lighting.`,
    `PROPORTIONS: slightly stylised and child-like — a larger head, big expressive cartoon eyes, soft rounded features, smooth clean line work and gentle cel shading, consistent with a high-quality children's picture book.`,
    `The head and body must match perfectly so the whole figure clearly reads as a single cartoon character, not a real head on a drawn body.`,
    `SCENE: ${sceneDescription}. Show the full body, friendly and warm expression, centred composition suitable for a storybook page.`,
    `Do NOT render any text, letters, words, captions, titles, watermarks or signatures anywhere in the image. Exactly one child only. Do not make the child look like an adult.`,
  ].join('\n');
}

/**
 * Character-sheet prompt for the Nano Banana Pro illustrated-redraw provider.
 * Turns the child's photo(s) into ONE re-usable "model sheet": the child drawn
 * as a storybook hero in the book's art style, front-facing on a plain
 * background. This sheet is generated once per child and cached, then handed to
 * every per-page redraw as the identity anchor — so the child looks the SAME
 * across all 30 pages. It is a fresh drawing (no template), so the prompt fully
 * describes the desired cartoon character and forbids any photographic paste.
 */
export function buildCharacterSheetPrompt(opts: {
  artStyle: string;
  ageYears: number;
  gender: string;
  skinTone?: string;
  hairColor?: string;
  hasGlasses?: boolean;
}): string {
  const { artStyle, ageYears, gender, skinTone, hairColor, hasGlasses } = opts;
  const glassesClause = hasGlasses
    ? ', wearing the same style of glasses as in the photo'
    : '';
  return [
    `Draw a children's storybook CHARACTER REFERENCE of the child in the photo(s), in this art style: ${artStyle}.`,
    `A single ${ageYears}-year-old ${gender}, full body, standing front-facing in a neutral friendly pose, centred on a plain soft background, well lit and clearly visible.`,
    `LIKENESS: take the child's recognisable features from the photo — face shape, ${skinTone || 'natural'} skin tone, ${hairColor || 'natural'} hair colour and hairstyle${glassesClause} — but RE-DRAW them as cartoon art. Hand-drawn and illustrated, never photographic, never a cut-out, collage or pasted photo; no real skin texture, no photo lighting.`,
    `The head and body must match perfectly as ONE cohesive cartoon character with gentle cel shading and clean line work, child-like proportions.`,
    `Exactly one child. Do NOT render any text, letters, words, captions, watermarks or signatures anywhere.`,
  ].join('\n');
}

/**
 * Per-page redraw prompt for the Nano Banana Pro provider. The references are
 * sent in this order: [1] the template page to edit, [2] the child's character
 * sheet (the exact look to insert), then [3+] the child's original photo(s) as
 * extra identity anchors. The model replaces the template's child with the
 * character while leaving the hand-drawn scene, style and composition intact.
 */
export function buildNanoBananaRedrawPrompt(): string {
  // Based on the owner's proven ChatGPT/OpenAI one-liner ("replace the face of
  // the first photo with the face of the child in the second image"), now used
  // for Nano Banana too — PLUS an explicit orientation guard so the model never
  // rotates a turned-away head to reveal the face (the beach page-4 problem).
  return [
    'The FIRST image is a children\'s storybook page to edit. The SECOND image is a reference of the child to use; any further images are extra photos of that same child, for likeness only.',
    'Replace the face and hair of the child in the FIRST image with the child shown in the SECOND image, so they clearly look like the same child, keeping the FIRST image\'s exact hand-drawn cartoon art style.',
    'Keep everything else in the FIRST image exactly the same — pose, body, head angle, facing / viewing direction, clothing, props, scene, background, colours, lighting and art style.',
    'IMPORTANT: do NOT turn or rotate the head to reveal the face. If the child is looking to the side, looking down, turned away or seen from behind, KEEP that exact orientation — never re-centre or straighten the face toward the viewer.',
    'Exactly one child in the scene; never paste or overlay a photo (the child must stay a hand-drawn cartoon). Do not add, remove or change any text, letters, words or captions.',
  ].join('\n');
}

export const DEFAULT_NEGATIVE_PROMPT = 'photograph, photorealistic, realistic skin texture, pasted face, collage, cut-out face, different child, multiple children, adult features, distorted face, extra limbs, text, letters, words, caption, title, watermark, signature';

export function buildNegativePrompt(additional?: string): string {
  if (additional) {
    return `${DEFAULT_NEGATIVE_PROMPT}, ${additional}`;
  }
  return DEFAULT_NEGATIVE_PROMPT;
}

export function personalizeText(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}
