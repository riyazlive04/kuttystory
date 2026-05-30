import Anthropic from '@anthropic-ai/sdk';
import {
  TextGenerationProvider,
  TextGenInput,
  TextGenOutput,
} from '../types';
import { COST_LIMITS } from '../cost-controls';

export type ClaudeModel = 'haiku' | 'sonnet';

export interface ClaudeAdapterConfig {
  apiKey: string;
  defaultModel?: ClaudeModel;
  timeoutMs?: number;
}

/**
 * Cost per 1K tokens in cents for each model.
 * These are approximate blended (input + output) rates.
 */
const COST_PER_1K_TOKENS_CENTS: Record<ClaudeModel, { input: number; output: number }> = {
  haiku: { input: 0.025, output: 0.125 },
  sonnet: { input: 0.3, output: 1.5 },
};

const MODEL_IDS: Record<ClaudeModel, string> = {
  haiku: 'claude-3-5-haiku-latest',
  sonnet: 'claude-3-7-sonnet-latest',
};

export class ClaudeTextAdapter implements TextGenerationProvider {
  public readonly name = 'claude-text';

  private readonly client: Anthropic;
  private readonly defaultModel: ClaudeModel;
  private readonly timeoutMs: number;

  constructor(config: ClaudeAdapterConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.defaultModel ?? 'haiku';
    this.timeoutMs = config.timeoutMs ?? COST_LIMITS.GENERATION_TIMEOUT_MS;
  }

  async generateText(input: TextGenInput): Promise<TextGenOutput> {
    const startTime = Date.now();
    const model = this.defaultModel;
    const modelId = MODEL_IDS[model];
    const maxTokens = input.maxTokens ?? 1024;

    console.log(`[ClaudeTextAdapter] Generating with ${modelId}, maxTokens=${maxTokens}`);

    const response = await this.callWithTimeout(async () => {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: input.prompt },
      ];

      return this.client.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        temperature: input.temperature ?? 0.7,
        system: input.systemPrompt ?? undefined,
        messages,
      });
    }, this.timeoutMs);

    const latencyMs = Date.now() - startTime;

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costRates = COST_PER_1K_TOKENS_CENTS[model];
    const costCents =
      (inputTokens / 1000) * costRates.input +
      (outputTokens / 1000) * costRates.output;

    // Extract text from the response content blocks
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      `[ClaudeTextAdapter] Complete in ${latencyMs}ms, ` +
      `tokens: ${inputTokens}in/${outputTokens}out, ` +
      `cost: ${costCents.toFixed(4)} cents`,
    );

    return {
      text,
      inputTokens,
      outputTokens,
      costCents: Math.round(costCents * 10000) / 10000,
      latencyMs,
    };
  }

  private async callWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Claude text generation timed out after ${timeoutMs}ms`));
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
