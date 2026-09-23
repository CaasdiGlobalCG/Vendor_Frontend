// FILE: scripts/css-var-codemod.mjs
// PURPOSE: Replace hex colors in .css files with rgb(var(--token)) so legacy
//          page CSS flips with light/dark themes. Skips token definitions
//          (--name: #hex), comments, and .backup files.
// CONNECTS TO: main.css token vars; mirrors hex-var-codemod.mjs hue rules.
// USAGE: node scripts/css-var-codemod.mjs <srcDir> [--dry]

import fs from 'fs';
import path from 'path';

const root = process.argv[2];
const dry = process.argv.includes('--dry');
if (!root) { console.error('usage: node css-var-codemod.mjs <srcDir> [--dry]'); process.exit(1); }

function hexToHsl(h) {
  let r, g, b;
  if (h.length === 3 || h.length === 4) {
    r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16);
  } else {
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hh;
  if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) hh = (b - r) / d + 2;
  else hh = (r - g) / d + 4;
  return { h: hh * 60, s, l };
}

// token name for a semantic hue; mono hues collapse to neutral tokens
function semanticToken(h, l) {
  if (h >= 340 || h < 20) return 'status-danger';
  if (h < 80) return 'status-warning';
  if (h < 155) return 'status-success';
  if (h < 195) return null;           // teal/cyan-green → monochrome
  if (h < 260) return 'status-info';
  return null;                        // violet/purple/pink → monochrome
}

// pick replacement expression given hex + CSS property context
function mapHex(hex, prop) {
  const { h, s, l } = hexToHsl(hex);
  const isColor = /^(color|caret-color|-webkit-text-fill-color)$/.test(prop);
  const isBorder = /border|outline|shadow/.test(prop);
  const isBg = /background|fill/.test(prop);

  if (s < 0.18) { // grayscale
    if (isColor) return l < 0.45 ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))';
    if (isBorder) return 'rgb(var(--border-subtle))';
    if (isBg) {
      if (l > 0.96) return 'rgb(var(--surface-card))';
      if (l > 0.87) return 'rgb(var(--canvas-bg))';
      if (l <= 0.30) return 'rgb(var(--cta-action))';
      return 'rgb(var(--surface-hover))';
    }
    if (l > 0.96) return 'rgb(var(--surface-card))';
    if (l > 0.87) return 'rgb(var(--canvas-bg))';
    return l < 0.45 ? 'rgb(var(--text-primary))' : 'rgb(var(--surface-hover))';
  }

  const tok = semanticToken(h, l);
  if (!tok) { // teal/violet/pink accents → monochrome
    if (isColor) return 'rgb(var(--text-primary))';
    if (isBg) return l > 0.82 ? 'rgb(var(--surface-hover))' : 'rgb(var(--cta-action))';
    if (isBorder) return 'rgb(var(--border-subtle))';
    return l < 0.5 ? 'rgb(var(--text-primary))' : 'rgb(var(--surface-hover))';
  }
  // pastel tints become low-alpha semantic washes
  if (l > 0.82) return `rgb(var(--${tok}) / 0.1)`;
  return `rgb(var(--${tok}))`;
}

function* cssFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* cssFiles(p);
    else if (e.name.endsWith('.css') && !e.name.includes('.backup')) yield p;
  }
}

const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
let filesChanged = 0, swaps = 0;

for (const file of cssFiles(root)) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let out = src, changed = 0, pos = 0;

  // process line by line so token definitions and comments are easy to skip
  const newLines = lines.map((line) => {
    const code = line.replace(/\/\*.*?\*\//g, ''); // ignore inline comments
    if (/^\s*--[a-zA-Z-]+\s*:/.test(code)) return line; // token definition line
    // find the property name preceding the first hex on this line
    const propMatch = code.match(/([a-zA-Z-]+)\s*:[^;:]*#[0-9a-fA-F]/);
    const prop = propMatch ? propMatch[1].toLowerCase() : '';
    if (!prop) return line;
    return line.replace(HEX, (m, hx) => {
      const rep = mapHex(hx.toLowerCase(), prop);
      changed++;
      return rep;
    });
  });
  out = newLines.join('\n');
  if (changed) {
    filesChanged++; swaps += changed;
    if (!dry) fs.writeFileSync(file, out);
    console.log(`${dry ? '[dry] ' : ''}${path.relative(root, file)}: ${changed}`);
  }
}
console.log(`\n${dry ? 'DRY ' : ''}files changed: ${filesChanged}, hex swaps: ${swaps}`);
