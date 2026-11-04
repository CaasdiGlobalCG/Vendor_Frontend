/**
 * Align / distribute / smart-guide geometry. Pure functions over rectangles
 * `{ id, x, y, w, h }` in one coordinate space; no React.
 */

export const ALIGN_MODES = [
  'left', 'centerH', 'right',
  'top', 'centerV', 'bottom',
  'distributeH', 'distributeV',
];

/**
 * New top-left positions for `rects` after `mode`.
 * Returns `{ [id]: { x, y } }` containing only rects that move.
 *
 * Distribute keeps the outer two in place and gives every gap the same width
 * (equal spacing, like Figma), which needs three or more rects.
 */
export const alignRects = (rects, mode) => {
  const list = (rects || []).filter(Boolean);
  const out = {};
  if (list.length < 2) return out;

  const minX = Math.min(...list.map((r) => r.x));
  const maxX = Math.max(...list.map((r) => r.x + r.w));
  const minY = Math.min(...list.map((r) => r.y));
  const maxY = Math.max(...list.map((r) => r.y + r.h));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  if (mode === 'distributeH' || mode === 'distributeV') {
    if (list.length < 3) return out;
    const horizontal = mode === 'distributeH';
    const pos = horizontal ? 'x' : 'y';
    const size = horizontal ? 'w' : 'h';
    const sorted = [...list].sort((a, b) => a[pos] - b[pos]);
    const start = sorted[0][pos];
    const end = sorted[sorted.length - 1][pos] + sorted[sorted.length - 1][size];
    const used = sorted.reduce((sum, r) => sum + r[size], 0);
    const gap = (end - start - used) / (sorted.length - 1);
    let cursor = start;
    sorted.forEach((r) => {
      const next = horizontal ? { x: cursor, y: r.y } : { x: r.x, y: cursor };
      if (next.x !== r.x || next.y !== r.y) out[r.id] = next;
      cursor += r[size] + gap;
    });
    return out;
  }

  list.forEach((r) => {
    let x = r.x;
    let y = r.y;
    if (mode === 'left') x = minX;
    else if (mode === 'centerH') x = midX - r.w / 2;
    else if (mode === 'right') x = maxX - r.w;
    else if (mode === 'top') y = minY;
    else if (mode === 'centerV') y = midY - r.h / 2;
    else if (mode === 'bottom') y = maxY - r.h;
    else return;
    if (x !== r.x || y !== r.y) out[r.id] = { x, y };
  });
  return out;
};

/**
 * Smart guides for a rect being dragged: the nearest left/centre/right line
 * (vertical guide) and top/centre/bottom line (horizontal guide) of any other
 * rect within `threshold`.
 *
 * @returns {{ vertical: number|null, horizontal: number|null, dx: number, dy: number }}
 *   `vertical` / `horizontal` are the guide coordinates; `dx` / `dy` are the
 *   shift that would make the dragged rect sit exactly on them.
 */
export const findGuides = (moving, others, threshold = 6) => {
  const result = { vertical: null, horizontal: null, dx: 0, dy: 0 };
  if (!moving) return result;

  const mx = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
  const my = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];
  let bestX = threshold;
  let bestY = threshold;

  for (const o of others || []) {
    if (!o || o.id === moving.id) continue;
    const ox = [o.x, o.x + o.w / 2, o.x + o.w];
    const oy = [o.y, o.y + o.h / 2, o.y + o.h];
    for (const a of mx) {
      for (const b of ox) {
        const d = Math.abs(a - b);
        if (d < bestX) { bestX = d; result.vertical = b; result.dx = b - a; }
      }
    }
    for (const a of my) {
      for (const b of oy) {
        const d = Math.abs(a - b);
        if (d < bestY) { bestY = d; result.horizontal = b; result.dy = b - a; }
      }
    }
  }
  return result;
};
