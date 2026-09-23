// gradient-cleanup.mjs
// Monochrome gradient cleanup:
//  1) bg-clip-text gradient text -> text-ink (theme-safe, drops gradient stops)
//  2) semantic gradient stops (success/info/warning/danger) -> black
//     white stops -> surface token (dark-mode safe)
//  3) flat same-color gradients collapse: from-X to-X -> bg-X
//  4) mixed black+surface gradients -> bg-surface

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = process.argv.slice(2);
const EXT = new Set(['.jsx', '.tsx', '.js', '.ts']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.git']);
let filesChanged = 0, swaps = 0;

const STOP_RE = /\b(from|via|to)-([a-zA-Z]+)(\/[\d.]+)?\b/g;

const cleanClassString = (s) => {
  // 1) Gradient text: strip gradient machinery, keep readable theme text color.
  if (/\bbg-clip-text\b/.test(s)) {
    swaps++;
    s = s.replace(/\bbg-gradient-to-\S+|\b(?:from|via|to)-\S+|\bbg-clip-text\b|\btext-transparent\b/g, '');
    if (!/\btext-\S+/.test(s)) s += ' text-ink';
    else s = s.replace(/\btext-transparent\b/, 'text-ink');
    return s.replace(/\s{2,}/g, ' ');
  }

  if (!/\bbg-gradient-to-/.test(s)) return s;

  // 2) Stop mapping: semantic hues -> black, white -> surface.
  const mapped = s.replace(STOP_RE, (m, pos, color, alpha) => {
    let c = color;
    if (['success', 'info', 'warning', 'danger'].includes(c)) c = 'black';
    else if (c === 'white') c = 'surface';
    if (c !== color) swaps++;
    return `${pos}-${c}${alpha || ''}`;
  });

  // 3) Collapse flat gradients: bg-gradient-to-X from-A (via-A) to-A -> bg-A.
  let out = mapped.replace(
    /\bbg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)\s+(from|via|to)-(\w+)((?:\s+(?:from|via|to)-\2)+)/g,
    (m, firstPos, color) => `bg-${color}`
  );

  // 4) Mixed black/surface gradients -> flat surface.
  out = out.replace(
    /\bbg-gradient-to-\S+\s+from-black\s+(?:via-\S+\s+)?to-surface\b/g,
    'bg-surface'
  ).replace(
    /\bbg-gradient-to-\S+\s+from-surface\s+(?:via-\S+\s+)?to-black\b/g,
    'bg-surface'
  );

  return out.replace(/\s{2,}/g, ' ');
};

const convert = (src) => src.replace(
  /(["'`])([^"'`]*\bbg-(?:gradient|clip-text)[^"'`]*)\1/g,
  (m, q, body) => `${q}${cleanClassString(body)}${q}`
);

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name) || name.endsWith('.backup')) continue;
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
console.log(`files changed: ${filesChanged}, swaps: ${swaps}`);
