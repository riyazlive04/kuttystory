import type { OptionSummary, Option } from './types';

const OPTION_LABELS: Record<Option, string> = {
  A_openai: 'A · OpenAI gpt-image-1.5 (baseline)',
  B_flux_kontext: 'B · FLUX Kontext (reference, no LoRA)',
  C_flux_lora: 'C · FLUX dev + per-child LoRA',
  D_fal_pulid: 'D · fal.ai PuLID (current cheap path)',
};

const rupees = (cents: number) => `₹${((cents / 100) * 88).toFixed(0)}`; // ~$1=₹88
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Build a self-contained HTML report: a grid with one row per page and one
 * column per provider, plus a cost/latency summary table and a per-book
 * extrapolation (this test is 5 pages; a full book is 28).
 */
export function buildReport(
  storyTitle: string,
  childName: string,
  pageNumbers: number[],
  summaries: OptionSummary[],
  timestamp: string,
): string {
  const options = summaries.map((s) => s.option);

  const summaryRows = summaries
    .map((s) => {
      const per28 = s.setupCostCents + s.perImageCents * 28;
      return `<tr>
        <td class="opt">${OPTION_LABELS[s.option]}</td>
        <td>${s.successCount}/${s.successCount + s.failCount}</td>
        <td>${s.setupCostCents ? `${dollars(s.setupCostCents)} <span class="muted">${s.setupNote || ''}</span>` : '—'}</td>
        <td>${dollars(s.perImageCents)}</td>
        <td>${(s.avgLatencyMs / 1000).toFixed(1)}s</td>
        <td><b>${dollars(per28)}</b> <span class="muted">${rupees(per28)}</span></td>
      </tr>`;
    })
    .join('\n');

  const headerCols = options
    .map((o) => `<th>${OPTION_LABELS[o]}</th>`)
    .join('');

  const gridRows = pageNumbers
    .map((pn) => {
      const cells = summaries
        .map((s) => {
          const r = s.results.find((x) => x.pageNumber === pn);
          if (!r || !r.imageFile) {
            return `<td class="cell err">✗ ${r?.error ? escapeHtml(r.error.slice(0, 120)) : 'no image'}</td>`;
          }
          return `<td class="cell">
            <img src="${r.imageFile}" loading="lazy" />
            <div class="meta">${(r.latencyMs / 1000).toFixed(1)}s · ${dollars(r.estimatedCostCents)}</div>
          </td>`;
        })
        .join('');
      return `<tr><th class="rowhdr">Page ${pn}</th>${cells}</tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Provider comparison — ${escapeHtml(storyTitle)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; background:#faf7ff; color:#1a1523; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color:#6b6677; margin: 0 0 24px; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.06); }
  th, td { border: 1px solid #ece8f5; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
  thead th { background:#f3eeff; position: sticky; top: 0; }
  .summary { margin-bottom: 32px; max-width: 920px; }
  .summary td.opt { font-weight: 600; }
  .muted { color:#9a94a8; font-size: 11px; }
  .grid img { width: 100%; max-width: 260px; border-radius: 8px; display:block; }
  .grid .cell { text-align:center; }
  .grid .meta { font-size: 11px; color:#6b6677; margin-top: 4px; }
  .grid .err { color:#c0322b; font-size:12px; }
  .rowhdr { background:#f3eeff; white-space:nowrap; }
  .note { font-size:12px; color:#6b6677; margin-top:24px; max-width:920px; line-height:1.5; }
</style>
</head>
<body>
  <h1>Image provider comparison — ${escapeHtml(storyTitle)}</h1>
  <p class="sub">Child: <b>${escapeHtml(childName)}</b> · Generated ${escapeHtml(timestamp)} · 5-page test, costs extrapolated to a 28-page book.</p>

  <table class="summary">
    <thead><tr><th>Option</th><th>Success</th><th>One-time setup</th><th>Per image</th><th>Avg latency</th><th>Est. / 28-page book</th></tr></thead>
    <tbody>
${summaryRows}
    </tbody>
  </table>

  <table class="grid">
    <thead><tr><th>Page</th>${headerCols}</tr></thead>
    <tbody>
${gridRows}
    </tbody>
  </table>

  <p class="note">
    Costs are <b>estimates</b> (configurable via env). Latency is measured wall-clock per image.
    Option C's per-book figure includes the one-time LoRA training cost; for repeat books of the
    same child that cost is ₹0 (the trained LoRA is reused). Decision gate (Change Prompt §2):
    proceed with the FLUX + LoRA migration only if Option C clearly wins on quality. If A or D
    is competitive, reconsider — D (fal PuLID) needs no training and no per-child weight storage.
  </p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
