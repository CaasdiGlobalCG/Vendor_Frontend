/**
 * Interiors and furniture elements: room-wise scope sheet, finish schedule,
 * furniture spec card, moodboard, site measurement sheet. They are blocks (the
 * same `blockNode` as Basics), so this file holds the pure rules and the panel
 * list; the drawing is in components/nodes/interiorViews.jsx.
 */
import { BLOCK_NODE_TYPE, safeHttpUrl } from './blockElements';
import { ELEVATION_UNITS, elevationUnit, newId, normalizeHex, positiveNumber } from './printingElements';

export const INTERIOR_KINDS = ['scope', 'finish', 'furniture', 'moodboard', 'sitemeasure'];

export const INTERIOR_LIMITS = {
  rooms: 20, itemsPerRoom: 30, columns: 6, scheduleRows: 30, moodItems: 24, walls: 20, openings: 30,
};

const clean = (value, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const round2 = (n) => Math.round(n * 100) / 100;

// ---- Room-wise scope sheet ----------------------------------------------

export const SCOPE_STATUSES = [
  { id: 'todo', label: 'To do', tone: 'neutral' },
  { id: 'progress', label: 'In progress', tone: 'info' },
  { id: 'done', label: 'Done', tone: 'success' },
  { id: 'hold', label: 'On hold', tone: 'warning' },
];

export const getScopeStatus = (id) => SCOPE_STATUSES.find((s) => s.id === id) || SCOPE_STATUSES[0];

export const sanitizeRooms = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, INTERIOR_LIMITS.rooms)
    .map((room, i) => ({
      id: clean(room.id, 60) || `room-${i}`,
      name: clean(room.name, 60),
      items: (Array.isArray(room.items) ? room.items : [])
        .filter(Boolean)
        .slice(0, INTERIOR_LIMITS.itemsPerRoom)
        .map((it, j) => ({
          id: clean(it.id, 60) || `item-${i}-${j}`,
          text: clean(it.text, 200),
          finish: clean(it.finish, 80),
          status: SCOPE_STATUSES.some((s) => s.id === it.status) ? it.status : 'todo',
        })),
    }));

/** `{ done, total, percent }` for one room; a room with no items is 0 of 0. */
export const roomProgress = (room) => {
  const total = room.items.length;
  const done = room.items.filter((i) => i.status === 'done').length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
};

export const scopeProgress = (rooms) => {
  const list = sanitizeRooms(rooms);
  const totals = list.reduce(
    (acc, r) => {
      const p = roomProgress(r);
      return { done: acc.done + p.done, total: acc.total + p.total, complete: acc.complete + (p.total > 0 && p.done === p.total ? 1 : 0) };
    },
    { done: 0, total: 0, complete: 0 }
  );
  return { ...totals, rooms: list.length, percent: totals.total ? Math.round((totals.done / totals.total) * 100) : 0 };
};

// ---- Finish schedule -----------------------------------------------------

export const DEFAULT_SURFACES = [
  { id: 'floor', name: 'Floor' },
  { id: 'wall', name: 'Wall' },
  { id: 'ceiling', name: 'Ceiling' },
];

export const sanitizeSchedule = ({ columns, rows } = {}) => {
  const cols = (Array.isArray(columns) ? columns : [])
    .filter(Boolean)
    .slice(0, INTERIOR_LIMITS.columns)
    .map((c, i) => ({ id: clean(c.id, 60) || `col-${i}`, name: clean(c.name, 30) }));
  const keep = new Set(cols.map((c) => c.id));
  const body = (Array.isArray(rows) ? rows : [])
    .filter(Boolean)
    .slice(0, INTERIOR_LIMITS.scheduleRows)
    .map((r, i) => {
      const cells = {};
      Object.entries(r.cells && typeof r.cells === 'object' ? r.cells : {}).forEach(([colId, cell]) => {
        if (keep.has(colId) && cell) cells[colId] = { material: clean(cell.material, 80), code: clean(cell.code, 20) };
      });
      return { id: clean(r.id, 60) || `row-${i}`, room: clean(r.room, 60), cells };
    });
  return { columns: cols, rows: body };
};

/**
 * Where each finish code is used. A code listed against two different materials
 * is a mistake waiting to happen on site, so those are flagged as conflicts.
 * @returns {Array<{ code: string, uses: Array<{room: string, surface: string, material: string}>, conflict: boolean }>}
 */
export const codeUsage = (schedule) => {
  const { columns, rows } = sanitizeSchedule(schedule);
  const byCode = new Map();
  rows.forEach((row) => {
    columns.forEach((col) => {
      const cell = row.cells[col.id];
      if (!cell || !cell.code) return;
      const key = cell.code.toUpperCase();
      if (!byCode.has(key)) byCode.set(key, []);
      byCode.get(key).push({ room: row.room, surface: col.name, material: cell.material });
    });
  });
  return [...byCode.entries()]
    .map(([code, uses]) => {
      const names = new Set(uses.map((u) => u.material.toLowerCase()).filter(Boolean));
      return { code, uses, conflict: names.size > 1 };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
};

// ---- Furniture spec ------------------------------------------------------

export const FURNITURE_UNITS = ['mm', 'cm', 'in', 'ft'];

/** "W 1800 × D 600 × H 750 mm" from whichever sizes are filled in; '' when none. */
export const formatFurnitureSize = ({ width, depth, height }, unit = 'mm') => {
  const parts = [['W', width], ['D', depth], ['H', height]]
    .map(([label, v]) => [label, positiveNumber(v)])
    .filter(([, n]) => n !== null)
    .map(([label, n]) => `${label} ${Number(n.toFixed(2))}`);
  return parts.length ? `${parts.join(' × ')} ${FURNITURE_UNITS.includes(unit) ? unit : 'mm'}` : '';
};

/** A whole number of 1 or more, or '' when blank or not a usable count. */
export const cleanQuantity = (value) => {
  const n = Math.floor(Number(String(value ?? '').trim()));
  return Number.isFinite(n) && n >= 1 ? String(Math.min(n, 99999)) : '';
};

// ---- Moodboard -----------------------------------------------------------

export const MOOD_TILE = { w: 0.26, h: 0.3 }; // tile size as a share of the board

export const APPROVAL_STATUSES = ['pending', 'approved', 'changes'];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const placeX = (x) => Math.round(clamp(Number(x), MOOD_TILE.w / 2, 1 - MOOD_TILE.w / 2) * 1000) / 1000;
const placeY = (y) => Math.round(clamp(Number(y), MOOD_TILE.h / 2, 1 - MOOD_TILE.h / 2) * 1000) / 1000;

/** A tile centre kept inside the board, so a tile never hangs off the edge. */
export const clampMoodPosition = (x, y) => ({ x: placeX(x), y: placeY(y) });

/** Tiles are either a picture (https address) or a colour swatch (valid HEX). Anything else is dropped. */
export const sanitizeMoodItems = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((it) => it && Number.isFinite(Number(it.x)) && Number.isFinite(Number(it.y)))
    .slice(0, INTERIOR_LIMITS.moodItems)
    .map((it, i) => {
      const base = { id: clean(it.id, 60) || `mood-${i}`, caption: clean(it.caption, 80), x: placeX(it.x), y: placeY(it.y) };
      if (it.kind === 'swatch') {
        const color = normalizeHex(it.color);
        return color ? { ...base, kind: 'swatch', color } : null;
      }
      const url = safeHttpUrl(it.imageUrl);
      return url ? { ...base, kind: 'image', imageUrl: url } : null;
    })
    .filter(Boolean);

/** Next free-ish spot: tiles are placed in a staggered diagonal so a new one never lands exactly on another. */
export const nextMoodPosition = (items) => {
  const n = sanitizeMoodItems(items).length;
  return { x: placeX(0.2 + (n % 5) * 0.15), y: placeY(0.25 + (Math.floor(n / 5) % 3) * 0.2 + (n % 2) * 0.05) };
};

/** @returns {Array|null} null when the board is full or the tile has nothing to show */
export const addMoodItem = (items, tile) => {
  const list = sanitizeMoodItems(items);
  if (list.length >= INTERIOR_LIMITS.moodItems) return null;
  const pos = nextMoodPosition(list);
  const next = sanitizeMoodItems([{ ...tile, id: newId('mood'), x: pos.x, y: pos.y }]);
  return next.length ? [...list, next[0]] : null;
};

export const moveMoodItem = (items, id, x, y) =>
  sanitizeMoodItems(items).map((it) => (it.id === id ? { ...it, x: placeX(x), y: placeY(y) } : it));

export const sanitizeApproval = (approval) => {
  const a = approval && typeof approval === 'object' ? approval : {};
  return {
    status: APPROVAL_STATUSES.includes(a.status) ? a.status : 'pending',
    by: clean(a.by, 80),
    note: clean(a.note, 400),
    at: a.at || null,
    history: (Array.isArray(a.history) ? a.history : []).slice(-10).map((h) => ({
      status: APPROVAL_STATUSES.includes(h?.status) ? h.status : 'pending',
      by: clean(h?.by, 80), note: clean(h?.note, 400), at: h?.at || null, reopenedAt: h?.reopenedAt || null,
    })),
  };
};

/**
 * Client decision on the board: approving needs their name, asking for changes needs a reason.
 * @returns {{ approval: object } | { error: string }}
 */
export const decideApproval = (approval, { status, by = '', note = '' }, now = new Date(), hasItems = true) => {
  const a = sanitizeApproval(approval);
  if (a.status !== 'pending') return { error: 'This board already has a decision. Reopen it to change it.' };
  if (status !== 'approved' && status !== 'changes') return { error: 'Choose approve or request changes' };
  if (!hasItems) return { error: 'Add something to the board before asking for approval' };
  if (status === 'approved' && !clean(by, 80)) return { error: 'Type the approver\'s name to sign off' };
  if (status === 'changes' && !clean(note, 400)) return { error: 'Say what needs to change' };
  return { approval: { ...a, status, by: clean(by, 80), note: clean(note, 400), at: now.toISOString() } };
};

/** Put a decided board back to waiting; the earlier decision is kept in the history. */
export const reopenApproval = (approval, now = new Date()) => {
  const a = sanitizeApproval(approval);
  if (a.status === 'pending') return a;
  const entry = { status: a.status, by: a.by, note: a.note, at: a.at, reopenedAt: now.toISOString() };
  return { status: 'pending', by: '', note: '', at: null, history: [...a.history, entry].slice(-10) };
};

// ---- Site measurement sheet ---------------------------------------------

export const OPENING_TYPES = ['Door', 'Window', 'Ventilator', 'Arch', 'Other'];

export const sanitizeWalls = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, INTERIOR_LIMITS.walls)
    .map((w, i) => ({
      id: clean(w.id, 60) || `wall-${i}`,
      name: clean(w.name, 40),
      length: clean(w.length, 12),
      height: clean(w.height, 12),
    }));

export const sanitizeOpenings = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, INTERIOR_LIMITS.openings)
    .map((o, i) => ({
      id: clean(o.id, 60) || `op-${i}`,
      type: OPENING_TYPES.includes(o.type) ? o.type : 'Other',
      wall: clean(o.wall, 40),
      width: clean(o.width, 12),
      height: clean(o.height, 12),
      count: clean(o.count, 4) || '1',
    }));

/**
 * Wall figures for a room, all in the sheet's unit.
 * A wall with no height uses the ceiling height; a wall or opening without usable
 * numbers is skipped and counted, never guessed.
 */
export const measureTotals = ({ walls, openings, ceilingHeight } = {}) => {
  const ceiling = positiveNumber(ceilingHeight);
  let perimeter = 0;
  let gross = 0;
  let wallsCounted = 0;
  let wallsSkipped = 0;
  sanitizeWalls(walls).forEach((w) => {
    const length = positiveNumber(w.length);
    const height = positiveNumber(w.height) ?? ceiling;
    if (length === null) { if (w.name || w.height) wallsSkipped += 1; return; }
    perimeter += length;
    if (height === null) { wallsSkipped += 1; return; }
    gross += length * height;
    wallsCounted += 1;
  });
  let openingArea = 0;
  let openingsCounted = 0;
  let openingsSkipped = 0;
  sanitizeOpenings(openings).forEach((o) => {
    const w = positiveNumber(o.width);
    const h = positiveNumber(o.height);
    const count = Math.max(1, Math.floor(Number(o.count)) || 1);
    if (w === null || h === null) { if (o.width || o.height) openingsSkipped += 1; return; }
    openingArea += w * h * count;
    openingsCounted += count;
  });
  return {
    perimeter: round2(perimeter),
    grossArea: round2(gross),
    openingArea: round2(openingArea),
    netArea: round2(Math.max(0, gross - openingArea)),
    openingsMoreThanWalls: openingArea > gross && gross > 0,
    wallsCounted, wallsSkipped, openingsCounted, openingsSkipped,
  };
};

export { ELEVATION_UNITS as MEASURE_UNITS, elevationUnit as measureUnit };

// ---- Panel entries -------------------------------------------------------

export const INTERIOR_BLOCK_SIZES = {
  'block-scope': { w: 460, h: 440 },
  'block-finish': { w: 620, h: 420 },
  'block-furniture': { w: 360, h: 440 },
  'block-moodboard': { w: 520, h: 520 },
  'block-sitemeasure': { w: 480, h: 560 },
};

const interiorElement = (kind, id, name, hint, data) => ({
  id,
  name,
  type: `block-${kind}`,
  preview: hint,
  nodeType: BLOCK_NODE_TYPE,
  data: { kind, ...data },
});

/** Everything in the "Interiors and furniture" category, in panel order. */
export const getInteriorElements = () => [
  interiorElement('scope', 'interior-scope', 'Room-wise Scope Sheet', 'Each room with its items, finish and status', {
    label: 'Scope of work',
    rooms: [{ id: 'room-1', name: 'Living room', items: [] }],
  }),
  interiorElement('finish', 'interior-finish', 'Finish Schedule', 'Room by surface grid with material and code', {
    label: 'Finish schedule',
    columns: DEFAULT_SURFACES.map((c) => ({ ...c })),
    rows: [{ id: 'row-1', room: 'Living room', cells: {} }],
  }),
  interiorElement('furniture', 'interior-furniture', 'Furniture Spec Card', 'Photo, size, material, finish, quantity and supplier', {
    label: 'Furniture spec', name: '', imageUrl: '', width: '', depth: '', height: '', unit: 'mm',
    material: '', finish: '', quantity: '1', supplier: '',
  }),
  interiorElement('moodboard', 'interior-moodboard', 'Moodboard', 'Pictures and colours placed freely, with client approval', {
    label: 'Moodboard', items: [], approval: { status: 'pending', by: '', note: '', at: null, history: [] },
  }),
  interiorElement('sitemeasure', 'interior-sitemeasure', 'Site Measurement Sheet', 'Walls, heights and openings with wall area', {
    label: 'Site measurement', room: '', unit: 'ft', ceilingHeight: '',
    walls: [
      { id: 'wall-1', name: 'Wall A', length: '', height: '' },
      { id: 'wall-2', name: 'Wall B', length: '', height: '' },
      { id: 'wall-3', name: 'Wall C', length: '', height: '' },
      { id: 'wall-4', name: 'Wall D', length: '', height: '' },
    ],
    openings: [], note: '', sketchUrl: '',
  }),
];
