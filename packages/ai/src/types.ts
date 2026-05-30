export interface ImageGenerationProvider {
  name: string;
  generateIllustration(input: IllustrationInput): Promise<IllustrationOutput>;
  estimateCost(input: IllustrationInput): number;
}

export interface IllustrationInput {
  prompt: string;
  negativePrompt?: string;
  referenceImages: string[];
  styleTokens: Record<string, string>;
  resolution: '1K' | '2K' | '4K';
  seed?: number;
  characterAnchorImage?: string;
}

export interface IllustrationOutput {
  imageUrl: string;
  imageBuffer: Buffer;
  costCents: number;
  latencyMs: number;
  providerMetadata: Record<string, unknown>;
}

export interface TextGenerationProvider {
  name: string;
  generateText(input: TextGenInput): Promise<TextGenOutput>;
}

export interface TextGenInput {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TextGenOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
}

export interface PromptTemplate {
  style: string;
  medium: string;
  palette: string;
  lighting: string;
}

export interface CharacterDescription {
  childName: string;
  ageYears: number;
  gender: string;
  skinTone?: string;
  hairColor?: string;
  hasGlasses: boolean;
}
