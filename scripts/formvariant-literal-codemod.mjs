// FILE: scripts/formvariant-literal-codemod.mjs
// PURPOSE: Convert the Form-1 design preview pages from theme tokens to literal
//          neutral classes, so the designs render IDENTICALLY in light and dark
//          mode (they are design-review pages - the appearance must be fixed).
//          Also widens the split breakpoint from lg (1024px) to md (768px) and
//          drops the dark:-only logo swaps (surfaces are literal now).
// CONNECTS TO: src/pages/FormVariants/FormVariant1..10.jsx
// USAGE: node scripts/formvariant-literal-codemod.mjs <dir> [--dry]

import fs from 'fs';
import path from 'path';

const dir = process.argv[2];
const dry = process.argv.includes('--dry');
if (!dir) { console.error('usage: node formvariant-literal-codemod.mjs <dir> [--dry]'); process.exit(1); }

// ORDER MATTERS: longer class names first (bg-surface-hover before bg-surface).
const MAP = [
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
  // the token swap above turned placeholder:text-dim into placeholder:text-neutral-500
  ['placeholder:text-neutral-500', 'placeholder:text-neutral-400'],
  ['focus:border-neutral-900', 'focus:border-neutral-900'], // no-op, kept for clarity
  ['lg:grid lg:grid-cols', 'md:grid md:grid-cols'],
  ['lg:sticky lg:top-0 lg:h-screen', 'md:sticky md:top-0 md:h-screen'],
  ['lg:order-1', 'md:order-1'],
  ['lg:order-2', 'md:order-2'],
];

let files = 0, swaps = 0;
for (const name of fs.readdirSync(dir).filter((f) => /^FormVariant\d+\.jsx$/.test(f))) {
  const file = path.join(dir, name);
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  for (const [from, to] of MAP) {
    if (from === to) continue;
    // simple global replace; class names here are unambiguous strings
    const parts = src.split(from);
    if (parts.length > 1) swaps += parts.length - 1;
    src = parts.join(to);
  }

  // Literal light surfaces -> the dark: logo swap is no longer valid.
  // 1) drop the "hidden dark:block" white-logo twin lines
  src = src.replace(/^\s*<img src=\{logoWhite\} alt="" aria-hidden="true" className="hidden [^"]*dark:block" \/>\r?\n/gm, '');
  // 2) the remaining light-mode logo keeps its name but loses the dark:hidden guard
  src = src.replace(/ className="([^"]*?) dark:hidden"/g, ' className="$1"');

  if (src !== before) {
    files++;
    if (!dry) fs.writeFileSync(file, src);
    console.log(`${dry ? '[dry] ' : ''}${name}`);
  }
}
console.log(`\n${dry ? 'DRY ' : ''}files changed: ${files}, swaps: ${swaps}`);
