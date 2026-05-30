import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ImageGenerationProvider,
  IllustrationInput,
  IllustrationOutput,
} from '../types';
import { COST_LIMITS } from '../cost-controls';
import { buildIllustrationPrompt, buildNegativePrompt } from '../prompt-builder';
import type { CharacterDescription, PromptTemplate } from '../types';

export interface GeminiAdapterConfig {
  apiKey: string;
  modelName?: string;
}

const COST_PER_RESOLUTION_CENTS: Record<string, number> = {
  '1K': 1,
  '2K': 2,
  '4K': 4,
};

export class GeminiImageAdapter implements ImageGenerationProvider {
  public readonly name = 'gemini-image';

  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(config: GeminiAdapterConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.modelName = config.modelName ?? 'gemini-2.0-flash-exp';
  }

  estimateCost(input: IllustrationInput): number {
    return COST_PER_RESOLUTION_CENTS[input.resolution] ?? 2;
  }

  async generateIllustration(input: IllustrationInput): Promise<IllustrationOutput> {
    const startTime = Date.now();

    const styleTokens: PromptTemplate = {
      style: input.styleTokens['style'] ?? 'children book illustration',
      medium: input.styleTokens['medium'] ?? 'digital painting',
      palette: input.styleTokens['palette'] ?? 'vibrant and warm',
      lighting: input.styleTokens['lighting'] ?? 'soft natural light',
    };

    // Build a character description from style tokens if available.
    // In production, this would come from the book/order metadata.
    const character: CharacterDescription = {
      childName: input.styleTokens['childName'] ?? 'Child',
      ageYears: parseInt(input.styleTokens['ageYears'] ?? '5', 10),
      gender: input.styleTokens['gender'] ?? 'child',
      skinTone: input.styleTokens['skinTone'],
      hairColor: input.styleTokens['hairColor'],
      hasGlasses: input.styleTokens['hasGlasses'] === 'true',
    };

    const fullPrompt = buildIllustrationPrompt({
      styleTokens,
      character,
      sceneDescription: input.prompt,
    });

    const negativePrompt = buildNegativePrompt(input.negativePrompt);

    // Log generation metadata for debugging and cost tracking
    const metadata: Record<string, unknown> = {
      model: this.modelName,
      resolution: input.resolution,
      hasReferenceImages: input.referenceImages.length > 0,
      referenceImageCount: input.referenceImages.length,
      hasCharacterAnchor: !!input.characterAnchorImage,
      seed: input.seed,
      promptLength: fullPrompt.length,
      negativePrompt,
    };

    console.log('[GeminiImageAdapter] Starting generation', JSON.stringify(metadata));

    const estimatedCost = this.estimateCost(input);

    // Wrap the generation call with a timeout
    const imageBuffer = await this.callWithTimeout(
      () => this.executeGeneration(fullPrompt, negativePrompt, input),
      COST_LIMITS.GENERATION_TIMEOUT_MS,
    );

    const latencyMs = Date.now() - startTime;

    console.log(`[GeminiImageAdapter] Generation complete in ${latencyMs}ms, cost: ${estimatedCost} cents`);

    return {
      // In production, this URL would come from uploading the buffer to cloud storage
      imageUrl: `placeholder://generated/${Date.now()}`,
      imageBuffer,
      costCents: estimatedCost,
      latencyMs,
      providerMetadata: metadata,
    };
  }

  /**
   * Execute the actual image generation call to Gemini.
   *
   * TODO: Replace this placeholder with the real Gemini image generation API
   * once the exact endpoint and SDK methods are finalized. The current
   * @google/generative-ai SDK primarily supports text generation; image
   * generation via Imagen / Gemini may require a different client or endpoint.
   */
  private async executeGeneration(
    _prompt: string,
    _negativePrompt: string,
    _input: IllustrationInput,
  ): Promise<Buffer> {
    // Access the model to verify the client is configured correctly.
    // This ensures the API key and model name are valid at construction time
    // in integration tests.
    const _model = this.client.getGenerativeModel({ model: this.modelName });

    // Placeholder: The real implementation will call the Gemini image generation
    // API (e.g., Imagen 3 via the Gemini API) and return the raw image bytes.
    //
    // Expected flow:
    // 1. Upload reference images if provided
    // 2. Send prompt + negative prompt + resolution config
    // 3. Receive generated image bytes
    // 4. Return as Buffer
    throw new Error(
      'Gemini image generation is not yet configured. ' +
      'Implement this method with the appropriate Gemini/Imagen API call ' +
      'once the SDK support is finalized.',
    );
  }

  private async callWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Gemini image generation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
