// FILE: scripts/kyc-form-codemod.mjs
// PURPOSE: Restyle the real KYC forms (Form1..Form6) to the approved design:
//          1) each label/input row becomes a white section card with a
//             2-column field grid (variant-2 look),
//          2) theme tokens become literal neutrals so the onboarding flow
//             looks identical in light and dark mode.
//          CLASSES ONLY - no JSX structure, props, handlers or logic touched.
// CONNECTS TO: src/components/Form1..Form6.jsx · components/KycFormShell.jsx
// USAGE: node scripts/kyc-form-codemod.mjs [--dry]

import fs from 'fs';
import path from 'path';

const dry = process.argv.includes('--dry');
const dir = 'src/components';

// ORDER MATTERS: longer strings first.
const MAP = [
  // ── section rows -> section cards ──
  ['flex flex-col md:flex-row items-start gap-6', 'flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 kyc-card kyc-fade-up'],
  ['w-full md:w-2/3 space-y-4', 'grid w-full gap-4 sm:grid-cols-2'],
  ['w-full md:w-2/3', 'grid w-full gap-4 sm:grid-cols-2'],
  ['w-full md:w-1/3', 'flex flex-wrap items-baseline justify-between gap-2'],
  // ── tokens -> literal neutrals (theme-independent) ──
  ['bg-surface-hover', 'bg-neutral-100'],
  ['bg-surface', 'bg-white'],
  ['bg-canvas', 'bg-neutral-50'],
  ['divide-line', 'divide-neutral-200'],
  ['border-line', 'border-neutral-200'],
  ['text-cta-foreground', 'text-white'],
  ['bg-cta', 'bg-neutral-900'],
  ['bg-ink', 'bg-neutral-900'],
  ['text-canvas', 'text-white'],
  ['text-ink', 'text-neutral-900'],
  ['text-dim', 'text-neutral-500'],
  ['placeholder:text-neutral-500', 'placeholder:text-neutral-400'],
  ['focus:border-ink', 'focus:border-neutral-900'],
  ['focus:ring-ink', 'focus:ring-neutral-900'],
];

let files = 0, swaps = 0;
for (const name of fs.readdirSync(dir).filter((f) => /^Form[1-6]\.jsx$/.test(f))) {
  const file = path.join(dir, name);
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  let n = 0;

  for (const [from, to] of MAP) {
    const parts = src.split(from);
    if (parts.length > 1) { n += parts.length - 1; src = parts.join(to); }
  }

  if (src !== before) {
    files++; swaps += n;
    if (!dry) fs.writeFileSync(file, src);
    console.log(`${dry ? '[dry] ' : ''}${name}: ${n} swaps`);
  }
}
console.log(`\n${dry ? 'DRY ' : ''}files: ${files}, swaps: ${swaps}`);
