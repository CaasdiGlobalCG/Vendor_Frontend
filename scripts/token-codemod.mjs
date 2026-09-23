// ============================================================
// FILE: scripts/token-codemod.mjs
// PURPOSE: One-shot class-name migration — rewrites legacy Tailwind color
//          utilities (bg-gray-100, text-emerald-600, border-red-200, …) to the
//          monochrome token classes (bg-surface-hover, text-brand, border-danger)
//          across every .jsx/.tsx file in a src directory.
// CONNECTS TO: src/main.css (token vars), tailwind.config.js (class names).
//
// Usage:  node scripts/token-codemod.mjs <srcDir> [--apply]
//         default = dry-run report only; --apply writes files.
//
// Mapping rules:
//   gray/slate/zinc/neutral/stone → canvas / surface-hover / ink / dim / line
//   emerald/teal/violet/purple/fuchsia/pink → brand
//   green → success, red/rose → danger, orange/amber/yellow → warning,
//   blue/indigo/sky/cyan → info
//   light shades (50–300) on semantic colors → token /10, /20, /30
//   bg-white → bg-surface, text-black → text-ink, bg-black → bg-cta
//   text-white kept (lives on colored/photo backgrounds)
//   bg-black/N kept (modal overlays need real black)
//   dark: color utilities removed entirely — tokens flip themes themselves
//   arbitrary values bg-[#fff] and inline styles are left untouched
// ============================================================

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const [, , srcDir, ...flags] = process.argv;
const APPLY = flags.includes('--apply');

if (!srcDir) {
  console.error('usage: node token-codemod.mjs <srcDir> [--apply]');
  process.exit(1);
}

// ── Neutral families all collapse onto the same monochrome tokens ──
const NEUTRALS = ['gray', 'slate', 'zinc', 'neutral', 'stone'];

// Accent families → semantic token
const ACCENT_TOKEN = {
  emerald: 'brand', teal: 'brand',
  violet: 'brand', purple: 'brand', fuchsia: 'brand', pink: 'brand', magenta: 'brand',
  green: 'success',
  red: 'danger', rose: 'danger',
  orange: 'warning', amber: 'warning', yellow: 'warning',
  blue: 'info', indigo: 'info', sky: 'info', cyan: 'info',
};

const ALL_COLORS = [...NEUTRALS, ...Object.keys(ACCENT_TOKEN), 'white', 'black'].join('|');

// Matches a full utility token incl. variant prefixes (hover:, focus:, sm:, dark:…)
const CLASS_RE = new RegExp(
  `((?:[a-zA-Z0-9!\\[\\]-]+:)*)` +            // 1: variant prefixes
  `(bg|text|border|divide|ring|ring-offset|placeholder|from|via|to|stroke|fill|decoration|caret|accent|outline)-` + // 2: utility kind
  `(${ALL_COLORS})` +                         // 3: color name
  `-(\\d{2,3})?` +                            // 4: shade (optional)
  `(\\/\\d{1,3})?` +                          // 5: alpha suffix (optional)
  `(?![\\w\\-\\[\\]])`,
  'g'
);

// Neutral shade → token role
const neutralToken = (kind, shade) => {
  const s = parseInt(shade || '0', 10);
  switch (kind) {
    case 'bg':
      if (s <= 50) return 'canvas';
      if (s <= 300) return 'surface-hover';
      return 'cta';                     // dark grays ≈ inverted CTA block
    case 'text':
    case 'fill':
    case 'stroke':
      return s >= 700 ? 'ink' : 'dim';
    case 'placeholder':
      return 'dim';
    case 'border': case 'divide': case 'outline':
      return 'line';
    case 'ring': case 'ring-offset':
      return 'line';
    case 'from': case 'via': case 'to':
      return s <= 100 ? 'surface-hover' : 'surface';
    case 'caret': case 'accent': case 'decoration':
      return 'ink';
    default:
      return null;
  }
};

// Accent shade → token, light tints become opacity modifiers
const accentToken = (kind, color, shade, alpha) => {
  const token = ACCENT_TOKEN[color];
  if (!token) return null;
  const s = parseInt(shade || '500', 10);
  // Light tints → token/opacity (keeps the pastel look without new hexes)
  if ((kind === 'bg' || kind === 'border' || kind === 'ring' || kind === 'from' || kind === 'via' || kind === 'to' || kind === 'divide') && !alpha) {
    if (s <= 100) return `${token}/10`;
    if (s <= 200) return `${token}/20`;
    if (s <= 300) return `${token}/30`;
  }
  return token;
};

const whiteBlack = (kind, color, alpha) => {
  if (color === 'white') {
    if (kind === 'bg') return 'surface';          // bg-white(/N) → surface(/N)
    if (kind === 'text' || kind === 'stroke' || kind === 'fill') return null; // keep text-white
    if (kind === 'border' || kind === 'divide') return 'line';
    if (kind === 'from' || kind === 'via' || kind === 'to') return 'surface';
    if (kind === 'placeholder') return null;
    return null;
  }
  // black
  if (kind === 'bg') return alpha ? null : 'cta'; // keep bg-black/50 overlays
  if (kind === 'text' || kind === 'stroke' || kind === 'fill') return 'ink';
  if (kind === 'border' || kind === 'divide') return 'line';
  if (kind === 'placeholder') return 'dim';
  if (kind === 'from' || kind === 'via' || kind === 'to') return 'cta';
  if (kind === 'ring') return 'line';
  return null;
};

const stats = { files: 0, filesChanged: 0, replacements: 0, darkStripped: 0 };
const perFile = [];

function transform(code) {
  return code.replace(CLASS_RE, (match, variants, kind, color, shade, alpha) => {
    // dark: utilities are obsolete — tokens handle dark mode. Strip them.
    if (/(^|:)dark:$/.test(variants) || variants.includes('dark:')) {
      stats.darkStripped++;
      return '';
    }
    const isNeutral = NEUTRALS.includes(color);
    const token = isNeutral
      ? neutralToken(kind, shade)
      : (color === 'white' || color === 'black')
        ? whiteBlack(kind, color, alpha)
        : accentToken(kind, color, shade, alpha);
    if (!token) return match;                     // unmapped → leave as-is
    stats.replacements++;
    // drop the original shade/alpha; keep variant prefixes (hover:, focus:…)
    return `${variants}${kind}-${token}`;
  });
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (['.jsx', '.tsx', '.js', '.ts'].includes(extname(name))) yield p;
  }
}

for (const file of walk(srcDir)) {
  stats.files++;
  const code = readFileSync(file, 'utf8');
  const before = stats.replacements + stats.darkStripped;
  const out = transform(code);
  const changed = stats.replacements + stats.darkStripped - before;
  if (out !== code) {
    stats.filesChanged++;
    perFile.push(`${changed}\t${file}`);
    if (APPLY) writeFileSync(file, out);
  }
}

perFile.sort((a, b) => parseInt(b) - parseInt(a));
console.log(`\n=== ${APPLY ? 'APPLIED' : 'DRY RUN'} ===`);
console.log(`files scanned: ${stats.files}, changed: ${stats.filesChanged}`);
console.log(`class swaps: ${stats.replacements}, dark: utilities stripped: ${stats.darkStripped}`);
console.log('\nTop files:'); 
perFile.slice(0, 25).forEach(l => console.log(' ', l));
