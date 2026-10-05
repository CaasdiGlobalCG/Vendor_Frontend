/**
 * generate-calculator-dossier.mjs
 * ───────────────────────────────
 * Renders the Calculator Validation Dossier to a print-ready HTML file
 * (docs/calculator-validation-dossier.html). Convert to PDF with Edge/Chrome:
 *
 *   msedge --headless=new --disable-gpu --no-pdf-header-footer \
 *     --print-to-pdf="docs/calculator-validation-dossier.pdf" \
 *     "file:///<abs-path>/docs/calculator-validation-dossier.html"
 *
 * Regenerate after any calculator change:  node docs/generate-calculator-dossier.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { META, STANDARDS, STANDARDS_GUIDE, FORMULA_SOURCES, CALCULATORS } from './calculator-dossier.data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const link = (label, url) =>
  url ? `<a href="${esc(url)}">${esc(label)}</a>` : esc(label);

const groupNames = [...new Set(CALCULATORS.map((c) => c.group))];
const byStatus = CALCULATORS.reduce((acc, c) => {
  acc[c.status] = (acc[c.status] || 0) + 1;
  return acc;
}, {});

const standardsRows = STANDARDS.map(
  (s) => `<tr><td class="nowrap"><strong>${esc(s.name)}</strong></td><td>${esc(s.governs)}</td><td class="src">${link('open', s.url)}</td></tr>`
).join('\n');

const guideIntro = STANDARDS_GUIDE.intro.map((p) => `<p style="margin:6px 0;">${esc(p)}</p>`).join('\n');

const guideRecipe = STANDARDS_GUIDE.recipe
  .map((r, i) => `<li style="margin:4px 0;">${esc(r.step)} ${link('(link)', r.url)}</li>`)
  .join('\n');

const guideStatusRows = STANDARDS_GUIDE.status
  .map(
    (s) =>
      `<tr><td class="nowrap"><strong>${esc(s.code)}</strong></td><td>${esc(s.full)}</td><td class="nowrap">${esc(s.committee)}</td><td>${esc(s.status)}</td><td class="src">${link('official BIS', s.official)}</td></tr>`
  )
  .join('\n');

const guideTrust = STANDARDS_GUIDE.trust.map((t) => `<li style="margin:4px 0;">${esc(t)}</li>`).join('\n');

const formulaRows = FORMULA_SOURCES.map(
  (s) => `<tr><td><strong>${esc(s.formula)}</strong><br/><span class="muted">${esc(s.note)}</span></td><td class="src">${link('open source', s.url)}</td></tr>`
).join('\n');

const calculatorSections = groupNames
  .map((group) => {
    const items = CALCULATORS.filter((c) => c.group === group);
    const cards = items
      .map(
        (c) => `
      <div class="card">
        <div class="card-head">
          <h3>${esc(c.name)}</h3>
          <span class="badge ${c.status.toLowerCase().includes('conservative') ? 'badge-amber' : c.status === 'Cited' ? 'badge-green' : 'badge-blue'}">${esc(c.status)}</span>
        </div>
        <table class="kv">
          <tr><td class="k">Formula</td><td>${esc(c.formula)}</td></tr>
          <tr><td class="k">Sources / standards</td><td>${c.sources.map((s) => esc(s)).join(' · ')}</td></tr>
          <tr><td class="k">Pinned proof</td><td>${esc(c.proof)}</td></tr>
        </table>
      </div>`
      )
      .join('\n');
    return `<section class="group"><h2>${esc(group)} <span class="count">${items.length}</span></h2>${cards}</section>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(META.title)}</title>
<style>
  :root { --ink:#0f172a; --dim:#64748b; --line:#e2e8f0; --accent:#0369a1; --green:#047857; --amber:#b45309; --blue:#1d4ed8; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: var(--ink); margin: 0; padding: 32px 40px; font-size: 12px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 26px 0 10px; padding-bottom: 6px; border-bottom: 2px solid var(--accent); }
  h2 .count { font-size: 11px; color: var(--dim); font-weight: 500; margin-left: 6px; }
  h3 { font-size: 12.5px; margin: 0; }
  a { color: var(--accent); text-decoration: none; }
  .sub { color: var(--dim); margin: 0 0 4px; }
  .meta { color: var(--dim); font-size: 11px; }
  .summary { display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0 4px; }
  .stat { border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; min-width: 120px; }
  .stat b { display: block; font-size: 18px; }
  .stat span { color: var(--dim); font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--dim); }
  .nowrap { white-space: nowrap; }
  .src { white-space: nowrap; }
  .muted { color: var(--dim); }
  .card { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; margin: 8px 0; page-break-inside: avoid; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .badge { font-size: 10px; font-weight: 700; border-radius: 999px; padding: 2px 9px; white-space: nowrap; }
  .badge-green { background: #ecfdf5; color: var(--green); border: 1px solid #a7f3d0; }
  .badge-amber { background: #fffbeb; color: var(--amber); border: 1px solid #fde68a; }
  .badge-blue { background: #eff6ff; color: var(--blue); border: 1px solid #bfdbfe; }
  .kv td { border: none; padding: 2px 6px 2px 0; }
  .kv .k { width: 130px; color: var(--dim); white-space: nowrap; }
  .note { background: #f8fafc; border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 6px; padding: 10px 12px; margin-top: 10px; }
  @page { size: A4; margin: 14mm 12mm; }
  @media print { body { padding: 0; } a { color: var(--ink); } }
</style>
</head>
<body>
  <header>
    <h1>${esc(META.title)}</h1>
    <p class="sub">${esc(META.subtitle)}</p>
    <p class="meta">${esc(META.repos)} · Generated ${esc(META.generatedAt)} · Every formula is backed by a cited standard/source and pinned by an automated test (see Vendor_Frontend/tests/calculators.test.jsx).</p>
    <div class="summary">
      <div class="stat"><b>${CALCULATORS.length}</b><span>calculators documented</span></div>
      <div class="stat"><b>${STANDARDS.length}</b><span>Indian Standards cited</span></div>
      <div class="stat"><b>${FORMULA_SOURCES.length}</b><span>formula sources with links</span></div>
      ${Object.entries(byStatus).map(([s, n]) => `<div class="stat"><b>${n}</b><span>${esc(s)}</span></div>`).join('')}
    </div>
  </header>

  <h2>1 · How to verify any number in this document</h2>
  <div class="note">
    <strong>The test is the proof.</strong> Each calculator has a deep-flow test in <em>tests/calculators.test.jsx</em> that drives the real UI
    (open → enter values → press Calculate) and asserts the displayed result against a hand-computed value stated in the test comment.
    To verify: open the test, read the formula, recompute with a calculator, compare. The full suite (195 tests) runs after every change —
    if any result drifts from its pinned value, the suite fails.
  </div>

  <h2>2 · Indian Standards referenced</h2>
  <table>
    <thead><tr><th>Standard</th><th>What it governs in the calculators</th><th>Link</th></tr></thead>
    <tbody>${standardsRows}</tbody>
  </table>

  <h2>3 · About the standards — what they are &amp; how to verify them</h2>
  ${guideIntro}
  <div class="note" style="margin-top:8px;">
    <strong>Verify any standard yourself — five steps</strong>
    <ol style="margin:6px 0 0;padding-left:18px;">${guideRecipe}</ol>
  </div>
  <table style="margin-top:10px;">
    <thead><tr><th>Code</th><th>Full title</th><th>Committee</th><th>Official status (checked ${esc(META.generatedAt)})</th><th>Source</th></tr></thead>
    <tbody>${guideStatusRows}</tbody>
  </table>
  <div class="note" style="margin-top:8px;">
    <strong>Why these can be trusted</strong>
    <ul style="margin:6px 0 0;padding-left:18px;">${guideTrust}</ul>
  </div>

  <h2>4 · Formula sources (well-known calculators &amp; engineering references)</h2>
  <table>
    <thead><tr><th>Formula / coefficient</th><th>Source</th></tr></thead>
    <tbody>${formulaRows}</tbody>
  </table>

  <h2>5 · Calculator-by-calculator validation</h2>
  ${calculatorSections}

  <h2>6 · Scope &amp; caveats</h2>
  <div class="note">
    <ul style="margin:0;padding-left:18px;">
      <li>These are <strong>estimating-grade</strong> tools — they follow the cited conventions but are not structural designs or legal measurements (no IS-1200 deduction schedules, no IS-10262 design mixes).</li>
      <li><strong>Rates are editable market seeds</strong> (e.g. cement ₹400/bag, sand ₹1,200/m³, steel ₹65/kg) — replace with your city SOR / current quotes before tendering.</li>
      <li>Defaults marked <em>“Cited (conservative)”</em> deliberately over-order versus the manufacturer datasheet so material is not under-ordered; all are editable in the UI.</li>
      <li>Source links are a snapshot as of ${esc(META.generatedAt)} and should be re-checked if standards are revised.</li>
    </ul>
  </div>
</body>
</html>`;

const outPath = path.join(__dirname, 'calculator-validation-dossier.html');
writeFileSync(outPath, html, 'utf8');
console.log(`✅ Dossier written: ${outPath}`);
console.log(`   ${CALCULATORS.length} calculators · ${STANDARDS.length} standards · ${FORMULA_SOURCES.length} formula sources`);
