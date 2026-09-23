// hex-var-codemod.mjs
// Converts inline hex/rgb color literals in JSX `style={{}}` props and SVG
// fill/stroke attributes to design-token CSS vars so dark mode can flip them.
// Hue rules (monochrome direction):
//   neutral dark  -> --text-ink     neutral mid -> --text-dim
//   neutral light -> --surface-hover (bg-ish)   white bg   -> --surface-card
//   teal/green accent -> --text-ink (mono)      success-green -> --success
//   red/rose -> --danger   amber/orange -> --warning   blue/indigo -> --info
// NOTE: canvas/2D contexts and Chart.js configs are skipped — CSS vars don't
// resolve there.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = process.argv.slice(2);
const EXT = new Set(['.jsx', '.tsx', '.js', '.ts']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.git']);
let filesChanged = 0, swaps = 0;
const skipped = [];

const hexToRgb = (h) => {
  const m = h.replace('#', '');
  const v = m.length === 3 ? m.split('').map(c => c + c).join('') : m.length === 6 ? m : null;
  if (!v) return null;
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
};

const classify = ([r, g, b]) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 510;              // lightness 0..1
  const d = max - min;                       // chroma
  if (d < 20) {                              // neutral gray
    if (l > 0.92) return 'white';
    if (l > 0.78) return 'surface';
    if (l > 0.55) return 'dim';
    return 'ink';
  }
  const h = (() => {                         // hue 0..360
    if (max === r) return (60 * ((g - b) / d) + 360) % 360;
    if (max === g) return 60 * ((b - r) / d) + 120;
    return 60 * ((r - g) / d) + 240;
  })();
  if (h >= 345 || h < 15) return 'danger';
  if (h >= 15 && h < 55) return 'warning';
  if (h >= 55 && h < 80) return 'warning';
  if (h >= 80 && h < 170) return 'success';  // greens keep semantic role
  if (h >= 170 && h < 200) return 'ink';     // teal accent -> mono
  if (h >= 200 && h < 265) return 'info';
  if (h >= 265 && h < 345) return 'info';    // purples/magentas -> info-ish neutral? -> use ink? choose info
  return 'ink';
};

const VAR = {
  ink: 'rgb(var(--text-ink))',
  dim: 'rgb(var(--text-dim))',
  surface: 'rgb(var(--surface-hover))',
  white: '#ffffff',
  danger: 'rgb(var(--danger))',
  warning: 'rgb(var(--warning))',
  success: 'rgb(var(--success))',
  info: 'rgb(var(--info))',
};

const HEX_RE = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

const convert = (content, file) => {
  // Skip files that draw on <canvas> 2D contexts — var() is meaningless there.
  if (/getContext\(['"]2d['"]\)/.test(content)) { skipped.push(file); return content; }

  let count = 0;

  // 1) style={{ ... }} blocks — property-aware.
  content = content.replace(/style=\{\{([\s\S]*?)\}\}/g, (block, inner) => {
    const next = inner.replace(/(['"`]?)(color|background|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|fill|stroke|outlineColor|boxShadow|textShadow|caretColor|accentColor)\1\s*:\s*(['"])([^'"]+)\3/g, (m, q, prop, qq, val) => {
      const replaced = val.replace(HEX_RE, (hex) => {
        const rgb = hexToRgb(hex); if (!rgb) return hex;
        const k = classify(rgb);
        // White text on overlays must stay literal white — only backgrounds map to surface.
        if (k === 'white') return /color/i.test(prop) && !/background|border|fill|stroke|shadow/i.test(prop) ? hex : VAR.surface;
        const out = VAR[k];
        if (out !== hex) count++;
        return out;
      });
      return `${q}${prop}${q}: ${qq}${replaced}${qq}`;
    });
    return `style={{${next}}}`;
  });

  // 2) SVG presentation attributes fill="#hex" / stroke="#hex" -> currentColor for
  // neutral/dark tones (icons inherit text color); semantic hues -> var().
  content = content.replace(/\b(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, (m, attr, hex) => {
    const rgb = hexToRgb(hex); if (!rgb) return m;
    const k = classify(rgb);
    if (k === 'ink' || k === 'dim' || k === 'surface') { count++; return `${attr}="currentColor"`; }
    if (k === 'white') return m;                       // keep literal white fills
    count++;
    return `${attr}="${VAR[k]}"`;
  });

  // 3) stopColor="#hex" inside <stop> gradient defs -> var() or keep white.
  content = content.replace(/\bstopColor="(#[0-9a-fA-F]{3,6})"/g, (m, hex) => {
    const rgb = hexToRgb(hex); if (!rgb) return m;
    const k = classify(rgb);
    if (k === 'white') return m;
    count++;
    return `stopColor="${VAR[k]}"`;
  });

  if (count) { swaps += count; }
  return content;
};

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name) || name.endsWith('.backup')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!EXT.has(extname(name))) continue;
    const src = readFileSync(p, 'utf8');
    const out = convert(src, p);
    if (out !== src) { writeFileSync(p, out); filesChanged++; }
  }
};

for (const root of ROOTS) walk(root);
console.log(`files changed: ${filesChanged}, hex swaps: ${swaps}`);
if (skipped.length) console.log(`skipped canvas files: ${skipped.length}\n  ${skipped.join('\n  ')}`);
