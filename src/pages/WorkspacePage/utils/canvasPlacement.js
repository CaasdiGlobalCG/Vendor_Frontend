/**
 * Where should a new canvas element go? Pure geometry, no React.
 *
 * `findFreePosition` returns the free spot nearest to where the user pointed:
 * it never overlaps an existing element, never moves existing ones, and never
 * jumps across the canvas. Used by drag-drop, click-to-add, the quick-add menu
 * and the configure-then-place dialogs (table, chart, list ...).
 */

import { BLOCK_SIZES } from './blockElements';
import { PRINTING_BLOCK_SIZES } from './printingElements';
import { FOOD_BLOCK_SIZES } from './foodElements';
import { INTERIOR_BLOCK_SIZES } from './interiorElements';
import { CONSTRUCTION_BLOCK_SIZES } from './constructionElements';

export const GRID = 22; // matches the canvas snapGrid
const DEFAULT_GAP = 28; // breathing room kept between elements (> GRID so snapping cannot cause overlap)
const SEARCH_STEP = GRID * 2;
const SEARCH_RADIUS = GRID * 90; // ~2000px; beyond this a region is treated as full

const DEFAULT_SIZE = { w: 320, h: 200 };

// Typical rendered sizes, measured from the real elements, used before a new
// element has been laid out. Measured sizes win once available.
const TYPE_SIZES = {
  textbox: { w: 480, h: 260 },
  input: { w: 480, h: 260 },
  textarea: { w: 480, h: 300 },
  dropdown: { w: 500, h: 280 },
  select: { w: 500, h: 280 },
  checkbox: { w: 500, h: 360 },
  radio: { w: 460, h: 320 },
  button: { w: 260, h: 140 },
  table: { w: 480, h: 340 },
  chart: { w: 440, h: 400 },
  list: { w: 400, h: 340 },
  'form-template': { w: 540, h: 630 },
  'task-card': { w: 340, h: 420 },
  'task-card-progress': { w: 340, h: 340 },
  'task-board': { w: 760, h: 420 },
  'smart-note': { w: 300, h: 250 },
  'calendar-event': { w: 380, h: 630 },
  'approval-board': { w: 940, h: 260 },
  'boq-generator': { w: 600, h: 390 },
  'cost-calculator': { w: 560, h: 680 },
  'image-block': { w: 380, h: 320 },
  'document-block': { w: 380, h: 320 },
  frame: { w: 420, h: 300 },
  rows: { w: 420, h: 300 },
  columns: { w: 420, h: 300 },
  grid: { w: 420, h: 300 },
  quotation: { w: 400, h: 340 },
  invoice: { w: 400, h: 340 },
  'purchase-order': { w: 400, h: 340 },
  'credit-note': { w: 400, h: 340 },
  ...BLOCK_SIZES,
  ...PRINTING_BLOCK_SIZES,
  ...FOOD_BLOCK_SIZES,
  ...INTERIOR_BLOCK_SIZES,
  ...CONSTRUCTION_BLOCK_SIZES,
};

const CONTAINER_TYPES = new Set(['frame', 'rows', 'columns', 'grid', 'group-container']);

/** Estimated size of an element that has not been placed yet. */
export const estimateElementSize = (element) => {
  const type = element?.type || element?.data?.type;
  // Resizable blocks (shapes, embeds) say how big they start
  if (typeof type === 'string' && type.startsWith('block-')) {
    const w = Number(element?.data?.width);
    const h = Number(element?.data?.height);
    if (w > 0 && h > 0) return { w, h };
  }
  if (type && TYPE_SIZES[type]) return TYPE_SIZES[type];
  if (type && /^logistics-/.test(type)) return { w: 500, h: 750 };
  return DEFAULT_SIZE;
};

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Real size of a placed node: measured first, then its style, then a per-type estimate. */
export const getNodeSize = (node) => {
  const guess = estimateElementSize(node?.data);
  return {
    w: num(node?.width) ?? num(node?.measured?.width) ?? num(node?.style?.width) ?? num(node?.data?.width) ?? guess.w,
    h: num(node?.height) ?? num(node?.measured?.height) ?? num(node?.style?.height) ?? num(node?.data?.height) ?? guess.h,
  };
};

/** Containers hold other nodes, so an element may be placed inside one. */
export const isContainer = (node) =>
  !!node &&
  (node.type === 'docGroup' ||
    (node.type === 'layoutNode' && (!!node.data?.isGroupContainer || CONTAINER_TYPES.has(node.data?.type))));

// `|| 0` turns a snapped -0 into 0
export const snapToGrid = (value) => Math.round(value / GRID) * GRID || 0;

// Nodes inside a frame store their position relative to it; resolve to the
// canvas so everything is compared in one coordinate space.
const absolutePosition = (node, byId) => {
  let x = Number(node.position?.x) || 0;
  let y = Number(node.position?.y) || 0;
  let parent = node.parentNode ? byId.get(node.parentNode) : null;
  for (let depth = 0; parent && depth < 6; depth += 1) {
    x += Number(parent.position?.x) || 0;
    y += Number(parent.position?.y) || 0;
    parent = parent.parentNode ? byId.get(parent.parentNode) : null;
  }
  return { x, y };
};

const rectOf = (node, byId) => {
  const { w, h } = getNodeSize(node);
  return { ...absolutePosition(node, byId), w, h };
};

const overlaps = (a, b, gap) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

const centerInside = (rect, container) => {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return cx >= container.x && cx <= container.x + container.w && cy >= container.y && cy <= container.y + container.h;
};

/**
 * Nearest free position for a new element.
 *
 * @param {{x:number,y:number}} desired top-left the user pointed at
 * @param {{w:number,h:number}} size size of the new element
 * @param {Array} nodes existing canvas nodes
 * @param {{gap?:number, ignoreIds?:string[]}} options
 * @returns {{x:number,y:number}} top-left, snapped to the grid
 */
const buildObstacles = (nodes, ignore) => {
  const live = nodes.filter((n) => n && !n.hidden);
  const byId = new Map(live.map((n) => [n.id, n]));
  const obstacles = [];
  const containers = [];
  for (const node of live) {
    if (ignore.has(node.id)) continue;
    (isContainer(node) ? containers : obstacles).push(rectOf(node, byId));
  }
  return { obstacles, containers };
};

const makeIsFree = ({ obstacles, containers }, w, h, gap) => (x, y) => {
  const rect = { x, y, w, h };
  if (obstacles.some((o) => overlaps(rect, o, gap))) return false;
  // Placing inside a frame is fine; straddling its edge is not
  return !containers.some((c) => overlaps(rect, c, 0) && !centerInside(rect, c));
};

/**
 * Does an element at `position` (top-left) with `size` collide with anything?
 * `gap` 0 = only real overlap; the placement search itself keeps a larger gap.
 */
export const hasCollision = (position, size, nodes = [], options = {}) => {
  const ignore = new Set(options.ignoreIds || []);
  const isFree = makeIsFree(buildObstacles(nodes, ignore), num(size?.w) ?? DEFAULT_SIZE.w, num(size?.h) ?? DEFAULT_SIZE.h, options.gap ?? 0);
  return !isFree(Number(position?.x) || 0, Number(position?.y) || 0);
};

/**
 * Nearest free position for a new element.
 *
 * @param {{x:number,y:number}} desired top-left the user pointed at
 * @param {{w:number,h:number}} size size of the new element
 * @param {Array} nodes existing canvas nodes
 * @param {{gap?:number, ignoreIds?:string[]}} options
 * @returns {{x:number,y:number}} top-left, snapped to the grid
 */
export const findFreePosition = (desired, size = DEFAULT_SIZE, nodes = [], options = {}) => {
  const gap = options.gap ?? DEFAULT_GAP;
  const ignore = new Set(options.ignoreIds || []);
  const target = { x: Number(desired?.x) || 0, y: Number(desired?.y) || 0 };
  const w = num(size?.w) ?? DEFAULT_SIZE.w;
  const h = num(size?.h) ?? DEFAULT_SIZE.h;

  const { obstacles, containers } = buildObstacles(nodes, ignore);
  const isFree = makeIsFree({ obstacles, containers }, w, h, gap);

  const start = { x: snapToGrid(target.x), y: snapToGrid(target.y) };
  if (isFree(start.x, start.y)) return start;

  // Candidates around the target, nearest first. Slightly prefer right/down so
  // the canvas grows in reading direction instead of creeping up and left.
  const steps = Math.floor(SEARCH_RADIUS / SEARCH_STEP);
  const candidates = [];
  for (let iy = -steps; iy <= steps; iy += 1) {
    for (let ix = -steps; ix <= steps; ix += 1) {
      if (ix === 0 && iy === 0) continue;
      const dx = ix * SEARCH_STEP;
      const dy = iy * SEARCH_STEP;
      const distance = Math.hypot(dx, dy);
      if (distance > SEARCH_RADIUS) continue;
      const bias = 1 + (dx < 0 ? 0.15 : 0) + (dy < 0 ? 0.15 : 0);
      candidates.push({ x: start.x + dx, y: start.y + dy, cost: distance * bias });
    }
  }
  candidates.sort((a, b) => a.cost - b.cost);

  for (const c of candidates) {
    if (isFree(c.x, c.y)) return { x: c.x, y: c.y };
  }

  // Region around the target is completely full: continue just past the right
  // edge of everything, level with the target (never a far-away teleport).
  const right = obstacles.reduce((max, o) => Math.max(max, o.x + o.w), start.x);
  const candidate = { x: snapToGrid(right + gap + GRID), y: start.y };
  return isFree(candidate.x, candidate.y) ? candidate : { x: candidate.x, y: snapToGrid(start.y + h + gap + GRID) };
};

/** Is a rect (flow coordinates) fully inside the visible viewport? */
export const isRectInViewport = (rect, viewport, container) => {
  if (!viewport || !container) return true;
  const zoom = viewport.zoom || 1;
  const left = -viewport.x / zoom;
  const top = -viewport.y / zoom;
  const right = left + container.width / zoom;
  const bottom = top + container.height / zoom;
  return rect.x >= left && rect.y >= top && rect.x + rect.w <= right && rect.y + rect.h <= bottom;
};
