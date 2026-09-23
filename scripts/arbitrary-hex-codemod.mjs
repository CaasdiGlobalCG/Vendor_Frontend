// arbitrary-hex-codemod.mjs
// Converts Tailwind arbitrary-value hex classes (e.g. `bg-[#095b49]`,
// `text-[#fff]`, `border-[#095b49]/30`) to token classes.
// Monochrome rules: teal/green accents -> ink/cta; grays -> surface tokens;
// semantic hues keep their token (danger/warning/success/info).

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = process.argv.slice(2);
const EXT = new Set(['.jsx', '.tsx', '.js', '.ts']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.git']);
// Color pickers & data-viz configs keep literal hexes by design.
const SKIP_FILE = /TextPanel|flowchartTemplates|ChartRenderer|templates\.js|NotificationContext/i;

let filesChanged = 0, swaps = 0;

const hexToRgb = (h) => {
  const m = h.replace('#', '');
  const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m.length === 6 ? m : null;
  if (!v) return null;
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
};

const classify = ([r, g, b]) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 510, d = max - min;
  if (d < 20) {
    if (l > 0.92) return 'white';
    if (l > 0.78) return 'surface';
    if (l > 0.55) return 'dim';
    return 'ink';
  }
  const h = max === r ? (60 * ((g - b) / d) + 360) % 360
          : max === g ? 60 * ((b - r) / d) + 120
          : 60 * ((r - g) / d) + 240;
  if (h >= 345 || h < 15) return 'danger';
  if (h >= 15 && h < 80) return 'warning';
  if (h >= 80 && h < 170) return 'success';
  if (h >= 170 && h < 200) return 'ink';   // teal -> mono
  if (h >= 200 && h < 345) return 'info';
  return 'ink';
};

// kind: text|bg|border|ring|from|via|to|fill|stroke|placeholder|decoration|divide|outline|caret|accent|shadow
const mapClass = (kind, cls, hasAlpha) => {
  switch (kind) {
    case 'text': case 'caret': case 'accent': case 'placeholder': case 'decoration':
      if (cls === 'white') return 'text-white';
      if (cls === 'ink') return 'text-ink';
      if (cls === 'dim' || cls === 'surface') return 'text-dim';
      return `text-${cls}`;
    case 'bg': case 'fill':
      if (hasAlpha) return cls === 'ink' || cls === 'white' || cls === 'surface' || cls === 'dim' ? 'bg-ink/10' : `bg-${cls}/10`;
      if (cls === 'white' || cls === 'surface' || cls === 'dim') return 'bg-surface';
      if (cls === 'ink') return 'bg-cta';            // dark solid bg -> theme CTA
      return `bg-${cls}`;
    case 'border': case 'divide': case 'outline': case 'ring':
      if (cls === 'ink' || cls === 'dim' || cls === 'surface' || cls === 'white') return 'border-line';
      return `border-${cls}`;
    case 'from': case 'via': case 'to':
      // Gradient stops -> near-black (keeps the flat-bar look) or token hue.
      return cls === 'ink' || cls === 'dim' || cls === 'surface' ? 'from-black' : `from-${cls}`;
    case 'stroke':
      return cls === 'white' ? 'stroke-white' : cls === 'ink' || cls === 'dim' || cls === 'surface' ? 'stroke-ink' : `stroke-${cls}`;
    case 'shadow':
      return 'shadow-ink/10';
    default:
      return null;
  }
};

const ARB_RE = /(?<prefix>(?:[a-z-]+:)*)\b(?<kind>text|bg|border|ring|from|via|to|fill|stroke|placeholder|decoration|divide|outline|caret|accent|shadow)-\[(?<hex>#[0-9a-fA-F]{3,8})(?<alpha>\/[0-9.]+)?\]/g;

const convert = (src) => src.replace(ARB_RE, (m, g) => m).replace(
  /((?:[a-z-]+:)*)?\b(text|bg|border|ring|from|via|to|fill|stroke|placeholder|decoration|divide|outline|caret|accent|shadow)-\[(#[0-9a-fA-F]{3,6})(\/[0-9.]+)?\]/g,
  (m, prefixes = '', kind, hex, alpha) => {
    const rgb = hexToRgb(hex); if (!rgb) return m;
    const cls = classify(rgb);
    const out = mapClass(kind, cls, Boolean(alpha));
    if (!out) return m;
    // Keep gradient prefix consistent for via-/to- (mapClass returns from-*).
    let final = out;
    if (kind === 'via' || kind === 'to') final = out.replace(/^from-/, `${kind}-`);
    swaps++;
    return `${prefixes}${final}`;
  }
);

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name) || name.endsWith('.backup') || SKIP_FILE.test(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!EXT.has(extname(name))) continue;
    const src = readFileSync(p, 'utf8');
    const out = convert(src);
    if (out !== src) { writeFileSync(p, out); filesChanged++; }
  }
};

for (const root of ROOTS) walk(root);
console.log(`files changed: ${filesChanged}, class swaps: ${swaps}`);
