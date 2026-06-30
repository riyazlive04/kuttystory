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
  const { childName } = opts;
  return [
    `The FIRST image is a children's storybook illustration drawn in a soft, hand-painted cartoon style. The remaining image(s) are reference photos of a real child named ${childName}.`,
    `Redraw the character's face so it resembles ${childName}, while keeping the ENTIRE character — face, head, hair and body — as ONE cohesive hand-illustrated cartoon in exactly the same art style as the rest of the picture.`,
    'FACE — critical rules:',
    `- Use the photo ONLY as a likeness reference. Capture ${childName}'s recognisable features: face shape, eye colour, skin tone, hairstyle and any glasses.`,
    '- RE-DRAW the face fully as cartoon art: smooth illustrated shading, soft clean line work, slightly stylised child-like proportions and larger expressive cartoon eyes — exactly like the body and the other children in the scene.',
    '- The face must NOT look photographic or realistic. Do NOT paste, collage, or blend the actual photograph in. No real skin texture, no photo lighting, no cut-out look.',
    '- The head and body must match perfectly in art style, proportion, line weight, colour and lighting, so it clearly looks like a single cartoon character — not a real head on a drawn body.',
    'TEXT — remove ALL text from the illustration: any existing title, caption, name, words, letters, speech bubbles or signs. Leave those areas as clean illustration (extend the background/scene naturally). Do NOT draw any new text or names. The story caption is added separately afterwards.',
    'Keep everything else identical: pose, body, clothing, scene, background, props, colours, lighting, composition and art style. Do not add borders or change the dimensions. Output a single cohesive cartoon illustration with NO text at the same size as the FIRST image.',
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
