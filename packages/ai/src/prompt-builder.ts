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
  caption: string;
}): string {
  const { childName, caption } = opts;
  return [
    `The FIRST image is a children's storybook illustration featuring a cartoon child. The remaining image(s) are photos of a real child named ${childName}.`,
    'Make exactly these two changes and nothing else:',
    `1. FACE: Replace the cartoon child's face with ${childName}'s real face from the photo(s) — match their face shape, eyes, nose, mouth, skin tone and hair — redrawn in the same cartoon art style as the illustration, so it is clearly recognizable as the same child.`,
    `2. NAME: In the title text drawn on the illustration, change the existing name to "${childName}" so the caption reads exactly: "${caption}". Keep the same lettering style, colour, size and position.`,
    'Keep everything else identical: pose, body, clothing, scene, background, props, colours, lighting, composition and art style. Do not add borders or change the dimensions. Output a single image at the same size as the FIRST image.',
  ].join('\n');
}

export const DEFAULT_NEGATIVE_PROMPT = 'different child, multiple children, adult features, distorted face, text watermarks, signature';

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
