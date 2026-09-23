// ============================================================
// FILE: scripts/mono-codemod.mjs
// PURPOSE: Second migration pass — strips teal from the general UI.
//          `brand` was the single accent; the palette is now pure
//          monochrome (black/white/gray) with teal kept ONLY inside
//          navigation components (excluded via --skip list).
//
//          Semantic status colors (success/danger/warning/info) are
//          untouched — red stays on notifications, etc.
//
// Mapping:
//   bg-brand          → bg-cta           (theme-flipping CTA)
//   bg-brand/N        → bg-surface-hover (teal tints → neutral gray)
//   text-brand        → text-ink
//   text-brand/N      → text-dim
//   border/ring/divide/placeholder/caret/accent/decoration/outline-brand → line / ink variants
//   from|via|to-brand → -black           (gradient stops → solid black bars;
//                                         also success/info/warning/danger/cta stops)
//   bg-cta + text-white in same line → text-cta-foreground (contrast fix)
//
// Usage: node scripts/mono-codemod.mjs <srcDir> [--apply] [--skip file1,file2]
// ============================================================

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const [, , srcDir, ...flags] = process.argv;
const APPLY = flags.includes('--apply');
const skipArg = flags.find(f => f.startsWith('--skip='));
const SKIP = new Set(skipArg ? skipArg.slice(7).split(',') : []);

if (!srcDir) { console.error('usage: node mono-codemod.mjs <srcDir> [--apply] [--skip=a,b]'); process.exit(1); }

// brand + gradient-stop remaps (variant prefixes preserved via group 1)
const RULES = [
  // solid brand utilities → monochrome equivalents
  [/(bg)-brand(\/\d{1,3})?(?![\w-])/g, (m, k, a) => a ? `${k}-surface-hover` : `${k}-cta`],
  [/(text)-brand-foreground(?![\w-])/g, () => 'text-cta-foreground'],
  [/(text)-brand(\/\d{1,3})?(?![\w-])/g, (m, k, a) => a ? `${k}-dim` : `${k}-ink`],
  [/(border)-brand(\/\d{1,3})?(?![\w-])/g, (m, k) => `${k}-line`],
  [/(ring|ring-offset)-brand(\/\d{1,3})?(?![\w-])/g, (m, k) => `${k}-ink`],
  [/(divide|outline)-brand(\/\d{1,3})?(?![\w-])/g, (m, k) => `${k}-line`],
  [/(placeholder)-brand(\/\d{1,3})?(?![\w-])/g, (m, k) => `${k}-dim`],
  [/(caret|accent|decoration|stroke|fill)-brand(\/\d{1,3})?(?![\w-])/g, (m, k) => `${k}-ink`],
  // gradient stops: any token/semantic color → black (bars stay dark, white text safe)
  [/(from|via|to)-(brand|success|danger|warning|info|cta|ink)(\/\d{1,3})?(?![\w-])/g, (m, k) => `${k}-black`],
];

const stats = { files: 0, filesChanged: 0, swaps: 0, ctaFixes: 0 };
const perFile = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (['.jsx', '.tsx', '.js', '.ts'].includes(extname(name))) yield p;
  }
}

for (const file of walk(srcDir)) {
  if (SKIP.has(file.replace(/\\/g, '/'))) continue;
  stats.files++;
  const code = readFileSync(file, 'utf8');
  let n = 0;
  let out = code;
  for (const [re, fn] of RULES) {
    out = out.replace(re, (...a) => { n++; return fn(...a); });
  }
  // line-scoped contrast fix: bg-cta + text-white → text-cta-foreground
  out = out.split('\n').map(line => {
    if (/bg-cta\b/.test(line) && /text-white\b/.test(line)) {
      n++;
      stats.ctaFixes++;
      return line.replace(/text-white\b/g, 'text-cta-foreground');
    }
    return line;
  }).join('\n');
  if (out !== code) {
    stats.swaps += n;
    stats.filesChanged++;
    perFile.push(`${n}\t${file}`);
    if (APPLY) writeFileSync(file, out);
  }
}

perFile.sort((a, b) => parseInt(b) - parseInt(a));
console.log(`\n=== ${APPLY ? 'APPLIED' : 'DRY RUN'} ===`);
console.log(`files scanned: ${stats.files}, changed: ${stats.filesChanged}, swaps: ${stats.swaps} (incl. ${stats.ctaFixes} contrast fixes)`);
console.log('\nTop files:');
perFile.slice(0, 20).forEach(l => console.log(' ', l));
