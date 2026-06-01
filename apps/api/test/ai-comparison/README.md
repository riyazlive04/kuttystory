# AI Provider Comparison Harness

Validation gate for the **FLUX + LoRA migration** (Change Prompt §2). It generates
the same 5 pages for one child **four ways** and produces a side-by-side HTML
report with cost + latency, so the team can decide before any production code
changes.

| Option | Provider | Notes |
|---|---|---|
| **A** | OpenAI `gpt-image-1.5` | Existing baseline. Reuses the real `@kutty-story/ai` path. |
| **B** | FLUX Kontext (Replicate) | Reference-conditioned, no training. |
| **C** | FLUX dev + per-child LoRA (Replicate) | Trains a LoRA on the photos, then generates. |
| **D** | fal.ai PuLID | The cheap identity-preserving path already wired into the app. |

> ⚠️ **This is standalone test code.** It does **not** import or modify any
> production runtime. It only reuses the shared prompt builders and the
> OpenAI/fal image function so the baseline is a fair, apples-to-apples match.

---

## 1. Install the two extra dev dependencies

These are only needed by this harness (already added to `apps/api/package.json`):

```bash
# from repo root, with a WORKING pnpm (v9 — v11 crashes on Node 20)
pnpm install
# or, if pnpm is acting up:
cd apps/api && npm install replicate adm-zip
```

## 2. Set environment variables

Add to `apps/api/.env` (or export in your shell):

```bash
# A — OpenAI (baseline). Must have billing funded.
OPENAI_API_KEY=sk-...

# D — fal.ai
FAL_API_KEY=...

# B & C — Replicate (~$20 budget for the test; mostly the LoRA training)
REPLICATE_API_TOKEN=r8_...
# Create an EMPTY model on replicate.com to receive trained LoRA weights:
REPLICATE_LORA_DESTINATION=your-username/kutty-lora-test

# Optional overrides (defaults shown):
# REPLICATE_FLUX_KONTEXT_MODEL=black-forest-labs/flux-kontext-pro
# REPLICATE_FLUX_TRAINER_MODEL_VERSION=ostris/flux-dev-lora-trainer
# CMP_LORA_STEPS=1000
# CMP_LORA_SCALE=1.0
# Cost estimates in cents (for the report only):
# CMP_OPENAI_CENTS=20  CMP_FAL_CENTS=4  CMP_FLUX_KONTEXT_CENTS=4  CMP_FLUX_DEV_CENTS=3  CMP_LORA_TRAIN_CENTS=250
```

## 3. Configure the test

```bash
cd apps/api/test/ai-comparison
cp comparison-config.example.ts comparison-config.ts
mkdir photos          # drop 3–5 clear, front-facing photos of ONE child here
```

Edit `comparison-config.ts`: set the child details and the 5 page scenes (ideally
copy 5 page prompts from a seeded `StoryTemplate` so the output mirrors
production). Optionally set `baseTemplatePath` per page so Option A reproduces the
production edit-in-place baseline.

To run fewer options (e.g. before you have a Replicate token), trim the `options`
array — e.g. `options: ['A_openai', 'D_fal_pulid']`.

## 4. Run

```bash
# from repo root
npx tsx apps/api/test/ai-comparison/compare-providers.ts
```

Outputs land in `test-output/comparison-<timestamp>/`:
- `report.html` — open this; side-by-side grid + cost/latency summary
- `<option>/page-N.png` — every generated image
- `summary.json` — machine-readable results

## 5. Decision gate

Per Change Prompt §2: **proceed with the migration only if Option C clearly wins
on quality.** If A or D is competitive, reconsider — D (fal PuLID) needs no
training and no per-child weight storage, which matters because this app uses
**local-disk storage, not R2** (every LoRA is ~100 MB+ on the VPS).

## Budget & time

~$20 of Replicate credit (mostly LoRA training), ~1 day. OpenAI baseline costs
~$1 for 5 images. fal costs a few cents.
