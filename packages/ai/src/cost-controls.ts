export const COST_LIMITS = {
  // Raised to fit a full 28-page book at gpt-image-1.5 high quality + high
  // input fidelity (~20c/image → ~560c) with headroom for regenerations.
  MAX_GENERATION_COST_PER_BOOK_CENTS: 800,
  MAX_REGENERATIONS_PER_PAGE: 2,
  MAX_PREVIEW_GENERATIONS_PER_USER_PER_DAY: 5,
  MAX_PREVIEW_GENERATIONS_PER_IP_PER_HOUR: 3,
  GENERATION_TIMEOUT_MS: 120000,
} as const;

export class CostLimitExceededError extends Error {
  constructor(
    public bookId: string,
    public currentCostCents: number,
    public limitCents: number,
  ) {
    super(`Cost limit exceeded for book ${bookId}: ${currentCostCents} cents exceeds limit of ${limitCents} cents`);
    this.name = 'CostLimitExceededError';
  }
}

export function checkBookCostLimit(bookId: string, currentCostCents: number, additionalCostCents: number): void {
  const totalCost = currentCostCents + additionalCostCents;
  if (totalCost > COST_LIMITS.MAX_GENERATION_COST_PER_BOOK_CENTS) {
    throw new CostLimitExceededError(bookId, totalCost, COST_LIMITS.MAX_GENERATION_COST_PER_BOOK_CENTS);
  }
}

export function canRegeneratePage(currentAttempts: number): boolean {
  return currentAttempts < COST_LIMITS.MAX_REGENERATIONS_PER_PAGE;
}
