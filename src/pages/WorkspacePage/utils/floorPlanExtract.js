/**
 * floorPlanExtract.js
 *
 * Turns a 2D floor plan into a normalized "plan model" that the 3D viewer
 * extrudes into walls / openings / furniture proxies / labels.
 *
 * Inputs:
 *   - DXF entities (dxf-parser output: parsed.entities + parsed.blocks)
 *   - DWG entities (libredwg DwgDatabase.entities — same shapes, different field names)
 *   - Raster image (HTMLCanvasElement / ImageData) — axis-aligned wall detection
 *
 * Output model:
 *   {
 *     walls:    [{ x1,y1,x2,y2, thickness }]      // plan-space (drawing units)
 *     openings: [{ x1,y1,x2,y2, kind:'door'|'window', sillHeight }]
 *     furniture:[{ x,y,w,d, height, label }]
 *     labels:   [{ x,y,text }]
 *     bounds:   { minX,minY,maxX,maxY }
 *     stats:    { wallLength, wallCount, openingCount, furnitureCount, roomEstimate }
 *     unitsHint:'mm'|'units'|'px'
 *   }
 */

// ---------------------------------------------------------------------------
// Layer classification heuristics
// ---------------------------------------------------------------------------

const LAYER_RULES = [
  { re: /(wall|a-wall|part|str-?wall|masonry|ext-?wall)/i, role: 'wall' },
  { re: /(door|a-door|drsw|dr-)/i, role: 'door' },
  { re: /(win|glaz|a-glaz|a-wind)/i, role: 'window' },
  { re: /(furn|eqpm|fixt|casewk|millw|i-furn|ff-?e)/i, role: 'furniture' },
  { re: /(text|anno|dim|label|room|a-anno|g-anno)/i, role: 'label' },
  { re: /(defpoints|grid|cent|axis|hatch|a-patt)/i, role: 'ignore' },
];

export function classifyLayer(layerName) {
  const l = layerName || '';
  for (const { re, role } of LAYER_RULES) if (re.test(l)) return role;
  return 'generic';
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const segLen = (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);

/** Perpendicular distance between two parallel-ish segments' lines. */
function lineDistance(s1, s2) {
  const dx = s1.x2 - s1.x1, dy = s1.y2 - s1.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return Math.abs((s2.x1 - s1.x1) * nx + (s2.y1 - s1.y1) * ny);
}

/** Are two segments parallel (angle within ~8 degrees)? */
function isParallel(s1, s2) {
  const a1 = Math.atan2(s1.y2 - s1.y1, s1.x2 - s1.x1);
  const a2 = Math.atan2(s2.y2 - s2.y1, s2.x2 - s2.x1);
  let d = Math.abs(a1 - a2) % Math.PI;
  if (d > Math.PI / 2) d = Math.PI - d;
  return d < 0.14;
}

/** Do the projections of two parallel segments overlap on their shared axis? */
function projectionsOverlap(s1, s2, minOverlapRatio = 0.35) {
  const dx = s1.x2 - s1.x1, dy = s1.y2 - s1.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const t = (p, s) => (p.x - s.x1) * ux + (p.y - s.y1) * uy;
  const a1 = 0, a2 = segLen(s1);
  const b1 = t({ x: s2.x1, y: s2.y1 }, s1), b2 = t({ x: s2.x2, y: s2.y2 }, s1);
  const lo = Math.max(a1, Math.min(b1, b2)), hi = Math.min(a2, Math.max(b1, b2));
  return (hi - lo) / Math.min(segLen(s1), segLen(s2) || 1) >= minOverlapRatio;
}

function boundsOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// ---------------------------------------------------------------------------
// Entity → raw segment collection (shared shape for DXF & DWG)
// ---------------------------------------------------------------------------

function pushSeg(out, a, b, layer) {
  if (dist(a, b) < 1e-6) return;
  out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, layer });
}

function arcToSegs(out, cx, cy, r, startDeg, endDeg, layer, isArc = true) {
  const start = (startDeg * Math.PI) / 180;
  let end = (endDeg * Math.PI) / 180;
  if (end <= start) end += Math.PI * 2;
  const steps = Math.max(4, Math.ceil((end - start) / (Math.PI / 12)));
  let prev = { x: cx + r * Math.cos(start), y: cy + r * Math.sin(start) };
  for (let i = 1; i <= steps; i++) {
    const a = start + ((end - start) * i) / steps;
    const cur = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    const s = { x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, layer, isArc };
    if (segLen(s) > 1e-6) out.push(s);
    prev = cur;
  }
}

/** Normalize a dxf-parser entity into the common shape. */
function normDxfEntity(e) {
  const layer = e.layer || '0';
  switch (e.type) {
    case 'LINE':
      return { kind: 'line', a: e.vertices?.[0] || e.start, b: e.vertices?.[1] || e.end, layer };
    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const v = (e.vertices || []).map((p) => ({ x: p.x, y: p.y }));
      return { kind: 'poly', pts: v, closed: !!e.shape || e.closed === true, layer };
    }
    case 'CIRCLE':
      return { kind: 'circle', cx: e.center?.x, cy: e.center?.y, r: e.radius, layer };
    case 'ARC':
      return { kind: 'arc', cx: e.center?.x, cy: e.center?.y, r: e.radius, s: e.startAngle, t: e.endAngle, layer };
    case 'INSERT':
      return { kind: 'insert', x: e.position?.x, y: e.position?.y, name: e.name, xs: e.xScale || 1, ys: e.yScale || 1, rot: e.rotation || 0, layer };
    case 'TEXT':
    case 'MTEXT':
      return { kind: 'text', x: e.position?.x ?? e.startPoint?.x, y: e.position?.y ?? e.startPoint?.y, text: e.text || e.string || '', layer };
    default:
      return { kind: 'skip', layer };
  }
}

/** Normalize a libredwg DwgEntity into the same shape. */
function normDwgEntity(e) {
  const layer = e.layer || '0';
  switch (e.type) {
    case 'LINE':
      return { kind: 'line', a: e.startPoint, b: e.endPoint, layer };
    case 'LWPOLYLINE': {
      const v = (e.vertices || []).map((p) => ({ x: p.x, y: p.y }));
      return { kind: 'poly', pts: v, closed: !!(e.flag & 1), layer };
    }
    case 'POLYLINE': {
      const v = (e.vertices || []).map((p) => ({ x: p.x, y: p.y }));
      return { kind: 'poly', pts: v, closed: true, layer };
    }
    case 'CIRCLE':
      return { kind: 'circle', cx: e.center?.x, cy: e.center?.y, r: e.radius, layer };
    case 'ARC':
      return { kind: 'arc', cx: e.center?.x, cy: e.center?.y, r: e.radius, s: (e.startAngle * 180) / Math.PI, t: (e.endAngle * 180) / Math.PI, layer };
    case 'INSERT':
      return { kind: 'insert', x: e.insertionPoint?.x, y: e.insertionPoint?.y, name: e.blockName || e.name, xs: e.xScale || 1, ys: e.yScale || 1, rot: (e.rotation * 180) / Math.PI || 0, layer };
    case 'TEXT':
      return { kind: 'text', x: e.insertionPoint?.x, y: e.insertionPoint?.y, text: e.text || '', layer };
    case 'MTEXT':
      return { kind: 'text', x: e.insertionPoint?.x, y: e.insertionPoint?.y, text: (e.text || '').replace(/\\[A-Za-z][^;]*;/g, ' ').replace(/[{}]/g, '').trim(), layer };
    case 'POINT':
      return { kind: 'point', x: e.position?.x, y: e.position?.y, layer };
    default:
      return { kind: 'skip', layer };
  }
}

/**
 * Flatten normalized entities into:
 *   segs  — line segments (with layer)
 *   inserts — placed block references (for furniture / door-swing detection)
 *   texts — TEXT/MTEXT labels
 * dxfBlocks: optional map name → block def (dxf-parser `parsed.blocks`), used to
 *   measure furniture footprint from the block's own geometry.
 */
export function flattenEntities(entities, { isDwg = false, blocks = null } = {}) {
  const segs = [], inserts = [], texts = [];
  for (const raw of entities || []) {
    const e = isDwg ? normDwgEntity(raw) : normDxfEntity(raw);
    switch (e.kind) {
      case 'line':
        if (e.a && e.b) pushSeg(segs, e.a, e.b, e.layer);
        break;
      case 'poly':
        for (let i = 0; i + 1 < e.pts.length; i++) pushSeg(segs, e.pts[i], e.pts[i + 1], e.layer);
        if (e.closed && e.pts.length > 2) pushSeg(segs, e.pts[e.pts.length - 1], e.pts[0], e.layer);
        break;
      case 'arc':
        if (e.cx != null && e.r > 0) arcToSegs(segs, e.cx, e.cy, e.r, e.s ?? 0, e.t ?? 360, e.layer);
        break;
      case 'circle':
        if (e.cx != null && e.r > 0) arcToSegs(segs, e.cx, e.cy, e.r, 0, 360, e.layer);
        break;
      case 'insert':
        if (e.x != null) inserts.push(e);
        break;
      case 'text':
        if (e.x != null && e.text) texts.push({ x: e.x, y: e.y, text: String(e.text), layer: e.layer });
        break;
      default:
        break;
    }
  }
  return { segs, inserts, texts, blocks };
}

// ---------------------------------------------------------------------------
// Wall assembly — pair parallel wall-face lines into thickness walls
// ---------------------------------------------------------------------------

/**
 * Given raw segments classified 'wall' (or 'generic' when no wall layer exists),
 * pair parallel segments into walls. Typical wall thickness 0.05–0.6 drawing
 * units (assuming mm-ish drawings it's 50–600; we express in normalized units).
 */
export function assembleWalls(segs, { guessUnitsPerMeter = null } = {}) {
  if (!segs.length) return { walls: [], thickness: 0 };

  // Estimate drawing scale from the median wall-segment length — crude but
  // lets the thickness window adapt to mm / m / unitless plans.
  const lengths = segs.map(segLen).sort((a, b) => a - b);
  const medianLen = lengths[Math.floor(lengths.length / 2)] || 1;

  // Units guess: if caller knows (e.g. DXF header $INSUNITS), honor it.
  const upm = guessUnitsPerMeter || (medianLen > 500 ? 1000 : 1); // >500 median → likely mm
  const MIN_T = 0.05 * upm, MAX_T = 0.6 * upm;

  const used = new Set();
  const walls = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    const s1 = segs[i];
    let best = -1, bestD = Infinity;
    for (let j = i + 1; j < segs.length; j++) {
      if (used.has(j)) continue;
      const s2 = segs[j];
      if (!isParallel(s1, s2)) continue;
      const d = lineDistance(s1, s2);
      if (d < MIN_T || d > MAX_T) continue;
      if (!projectionsOverlap(s1, s2)) continue;
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best >= 0) {
      used.add(best);
      const s2 = segs[best];
      // Wall centerline = midpoint of the pair
      walls.push({
        x1: (s1.x1 + s2.x1) / 2, y1: (s1.y1 + s2.y1) / 2,
        x2: (s1.x2 + s2.x2) / 2, y2: (s1.y2 + s2.y2) / 2,
        thickness: bestD,
      });
    } else {
      // Unpaired wall line — still extrude with a default thin wall so nothing vanishes
      walls.push({ x1: s1.x1, y1: s1.y1, x2: s1.x2, y2: s1.y2, thickness: 0.12 * upm });
    }
  }
  const thickness = walls.length
    ? walls.reduce((a, w) => a + w.thickness, 0) / walls.length
    : 0.12 * upm;
  return { walls, thickness, unitsPerMeter: upm };
}

/**
 * Openings: door/window segments (swing arcs, door leaves) on door/window
 * layers, plus INSERT blocks whose name looks like a door/window.
 */
export function collectOpenings(segs, inserts, upm) {
  const openings = [];
  for (const s of segs) {
    const role = classifyLayer(s.layer);
    if (role !== 'door' && role !== 'window') continue;
    openings.push({
      x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2,
      kind: role,
      sillHeight: role === 'window' ? 0.9 * upm : 0,
    });
  }
  for (const ins of inserts || []) {
    const n = ins.name || '';
    const onDoorish = /door|dr\b/i.test(n) || classifyLayer(ins.layer) === 'door';
    const onWinish = /win|glaz/i.test(n) || classifyLayer(ins.layer) === 'window';
    if (!onDoorish && !onWinish) continue;
    const w = Math.max(0.7 * upm, Math.abs(ins.xs || 1));
    const dir = (ins.rot || 0) * (Math.PI / 180);
    const hx = (Math.cos(dir) * w) / 2, hy = (Math.sin(dir) * w) / 2;
    openings.push({
      x1: ins.x - hx, y1: ins.y - hy, x2: ins.x + hx, y2: ins.y + hy,
      kind: onDoorish ? 'door' : 'window',
      sillHeight: onWinish ? 0.9 * upm : 0,
    });
  }
  return openings;
}

/**
 * Furniture proxies — INSERT blocks that aren't doors/windows get their
 * block bounding box extruded as a proxy box, labelled by block name.
 */
export function collectFurniture(inserts, blocks, upm) {
  const out = [];
  for (const ins of inserts || []) {
    const n = ins.name || 'block';
    if (/door|win|glaz|dr\b/i.test(n)) continue;
    if (classifyLayer(ins.layer) === 'door' || classifyLayer(ins.layer) === 'window') continue;

    let w = Math.abs(ins.xs || 1), d = Math.abs(ins.ys || 1);
    // Prefer the block's own entity extents when available (block defs are in
    // drawing units centered near their base point).
    const def = blocks?.[ins.name] || blocks?.[String(ins.name)];
    if (def?.entities?.length) {
      const { segs } = flattenEntities(def.entities);
      if (segs.length) {
        const b = boundsOf([
          ...segs.map((s) => ({ x: s.x1, y: s.y1 })),
          ...segs.map((s) => ({ x: s.x2, y: s.y2 })),
        ]);
        w = (b.maxX - b.minX) * Math.abs(ins.xs || 1);
        d = (b.maxY - b.minY) * Math.abs(ins.ys || 1);
      }
    }
    out.push({
      x: ins.x, y: ins.y,
      w: Math.max(w, 0.3 * upm), d: Math.max(d, 0.3 * upm),
      height: 0.9 * upm, // generic furniture height
      label: n.replace(/[*_]/g, ' ').trim(),
      rot: ins.rot || 0,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Block explosion — DWG plans keep most geometry inside INSERT references
// ---------------------------------------------------------------------------

/** Transform a block-space point into model space via the insert transform. */
function xformPt(p, ins, basePoint) {
  const bx = (p.x - (basePoint?.x || 0)) * (ins.xs || 1);
  const by = (p.y - (basePoint?.y || 0)) * (ins.ys || 1);
  const rot = (ins.rot || 0) * (Math.PI / 180);
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return { x: ins.x + bx * cos - by * sin, y: ins.y + bx * sin + by * cos };
}

/**
 * Explode INSERT entities one level deep: for each insert, transform its block
 * definition's entities into model space and return them as normalized entity
 * shapes (line/poly/arc/circle/text). Entities on layer '0' inside the block
 * inherit the INSERT's layer so layer classification still works.
 */
export function explodeInserts(inserts, blockMap, { maxDepth = 2, isDwg = true } = {}) {
  const out = { lines: [], polys: [], arcs: [], circles: [], texts: [] };
  const norm = isDwg ? normDwgEntity : normDxfEntity;
  const visit = (ins, depth) => {
    if (depth > maxDepth) return;
    const def = blockMap?.[ins.name] || blockMap?.[String(ins.name)];
    if (!def?.entities?.length) return;
    const bp = def.basePoint || { x: 0, y: 0 };
    for (const raw of def.entities) {
      const e = norm(raw);
      const layer = e.layer && e.layer !== '0' ? e.layer : ins.layer;
      const xf = (p) => xformPt(p, ins, bp);
      if (e.kind === 'line' && e.a && e.b) out.lines.push({ a: xf(e.a), b: xf(e.b), layer });
      else if (e.kind === 'poly') out.polys.push({ pts: e.pts.map(xf), closed: e.closed, layer });
      else if (e.kind === 'arc' && e.cx != null) {
        const c = xf({ x: e.cx, y: e.cy });
        out.arcs.push({ cx: c.x, cy: c.y, r: e.r * Math.abs(ins.xs || 1), s: e.s + (ins.rot || 0), t: e.t + (ins.rot || 0), layer });
      } else if (e.kind === 'circle' && e.cx != null) {
        const c = xf({ x: e.cx, y: e.cy });
        out.circles.push({ cx: c.x, cy: c.y, r: e.r * Math.abs(ins.xs || 1), layer });
      } else if (e.kind === 'text' && e.x != null && e.text) {
        const p = xf({ x: e.x, y: e.y });
        out.texts.push({ x: p.x, y: p.y, text: e.text, layer });
      } else if (e.kind === 'insert' && e.x != null) {
        // nested insert — transform its placement and recurse
        const p = xf({ x: e.x, y: e.y });
        visit({ ...e, x: p.x, y: p.y, xs: (ins.xs || 1) * (e.xs || 1), ys: (ins.ys || 1) * (e.ys || 1), rot: (ins.rot || 0) + (e.rot || 0), layer }, depth + 1);
      }
    }
  };
  for (const ins of inserts) visit(ins, 1);
  return out;
}

/** INSUNITS code → drawing units per meter. */
const INSUNITS_UPM = { 1: 39.3701, 2: 3.28084, 4: 1000, 5: 100, 6: 1, 7: 1000000, 8: 39.3701, 9: 1e9 };

// ---------------------------------------------------------------------------
// Top-level vector entry point
// ---------------------------------------------------------------------------

/**
 * entities: parsed entities array. isDwg: normalize via libredwg shapes.
 * blocks: name → block def (dxf-parser parsed.blocks). blockRecords: DWG
 *   BLOCK_RECORD entries [{name, basePoint, entities}] — needed because real
 *   plans keep most geometry inside INSERT references.
 * insunits: DWG header $INSUNITS code → exact units-per-meter.
 * unitsPerMeter: explicit override (e.g. DXF $INSUNITS already resolved).
 */
export function extractFromVector(entities, {
  isDwg = false,
  blocks = null,
  blockRecords = null,
  insunits = null,
  unitsPerMeter = null,
} = {}) {
  const { segs, inserts, texts } = flattenEntities(entities, { isDwg, blocks });

  // Block map — uniform shape { name → { basePoint, entities } } regardless
  // of whether it came from dxf-parser blocks or DWG block records.
  const blockMap = {};
  for (const rec of blockRecords || []) blockMap[rec.name] = rec;
  if (blocks) {
    for (const [name, def] of Object.entries(blocks)) {
      if (!blockMap[name]) blockMap[name] = { name, basePoint: def.position || { x: 0, y: 0 }, entities: def.entities };
    }
  }

  // Explode non-door/window/furniture inserts — their block contents become
  // real wall segments/text. Furniture/door/window inserts stay as references
  // (proxy boxes / openings).
  const isOpenOrFurn = (ins) => {
    const lr = classifyLayer(ins.layer);
    if (lr === 'door' || lr === 'window' || lr === 'furniture') return true;
    return /door|win|glaz|dr\b|furn|tbl|chair|sofa|bed|desk|sink|wc\b|toilet|bath|stove|fridge|cabinet/i.test(ins.name || '');
  };
  const explodable = inserts.filter((i) => !isOpenOrFurn(i));
  const keptInserts = inserts.filter(isOpenOrFurn);

  const pushExploded = (a, b, layer, isArc = false) => {
    if (dist(a, b) < 1e-6) return;
    explodedSegs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, layer, exploded: true, isArc });
  };
  const explodedSegs = [];
  const explodedTexts = [];
  const ex = explodeInserts(explodable, blockMap, { isDwg });
  for (const l of ex.lines) pushExploded(l.a, l.b, l.layer);
  for (const p of ex.polys) {
    for (let i = 0; i + 1 < p.pts.length; i++) pushExploded(p.pts[i], p.pts[i + 1], p.layer);
    if (p.closed && p.pts.length > 2) pushExploded(p.pts[p.pts.length - 1], p.pts[0], p.layer);
  }
  for (const a of ex.arcs) arcToSegs(explodedSegs, a.cx, a.cy, a.r, a.s, a.t, a.layer, true);
  for (const c of ex.circles) arcToSegs(explodedSegs, c.cx, c.cy, c.r, 0, 360, c.layer, true);
  explodedTexts.push(...ex.texts);

  const allSegs = [...segs, ...explodedSegs];
  const upmHint = unitsPerMeter || (insunits != null ? INSUNITS_UPM[insunits] : null) || null;

  // Debug: layer histogram — shows what the file actually uses
  if (typeof console !== 'undefined') {
    const hist = {};
    for (const s of allSegs) hist[s.layer] = (hist[s.layer] || 0) + 1;
    console.log('[FloorPlan] entities:', (entities || []).length,
      'inserts:', inserts.length, 'segs:', segs.length, 'exploded:', explodedSegs.length);
    console.log('[FloorPlan] layer histogram:', hist);
  }

  // Hatch-stroke filter — works even when every entity shares one layer
  // (e.g. PDF-exported DWGs where all 1487 segs land on 'PDF_0').
  // Hatch/poche fill = MANY SHORT DIAGONAL strokes; real walls are long or
  // axis-aligned. Threshold = median length across ALL segments.
  const allLens = allSegs.map(segLen).sort((a, b) => a - b);
  const medLen = allLens[Math.floor(allLens.length / 2)] || 1;
  const isDiagonal = (s) => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const ang = Math.abs(Math.atan2(dy, dx)) % (Math.PI / 2);
    return ang > 0.15 && ang < Math.PI / 2 - 0.15; // ~9–81° off axis
  };
  // Orthogonal-plan test: if ≥80% of total segment length is axis-aligned,
  // the plan has no real diagonal walls — every diagonal stroke is hatch fill.
  const axisLen = allSegs.reduce((a, s) => a + (isDiagonal(s) ? 0 : segLen(s)), 0);
  const totalLenAll = allSegs.reduce((a, s) => a + segLen(s), 0) || 1;
  const orthogonalPlan = axisLen / totalLenAll > 0.8;
  const isHatchStroke = (s) => {
    if (s.isArc) return false;
    if (orthogonalPlan) return isDiagonal(s); // drop ALL diagonals on orthogonal plans
    return isDiagonal(s) && segLen(s) < medLen * 4;
  };

  // Layer preference: if the drawing has a real wall layer, trust it fully —
  // generic-layer exploded geometry (hatch fill, furniture strokes, dims)
  // is noise on disciplined plans.
  const onWallLayer = allSegs.filter((s) => classifyLayer(s.layer) === 'wall' && !s.isArc && !isHatchStroke(s));
  const genericSegs = allSegs.filter((s) => classifyLayer(s.layer) === 'generic');
  let wallSegs;
  if (onWallLayer.length >= 4 && onWallLayer.length >= genericSegs.length * 0.1) {
    wallSegs = onWallLayer;
  } else {
    // No usable wall layer — fall back to generic geometry with noise filtering
    wallSegs = allSegs.filter((s) => {
      if (s.isArc) return false; // door-swing arcs — never extrude as walls
      if (isHatchStroke(s)) return false;
      const r = classifyLayer(s.layer);
      return r === 'wall' || r === 'generic';
    });
  }
  const { walls, thickness, unitsPerMeter: upm } = assembleWalls(wallSegs, { guessUnitsPerMeter: upmHint });
  const openings = collectOpenings(allSegs, keptInserts, upm);
  const furniture = collectFurniture(keptInserts, blockMap, upm);
  const labels = [...(texts || []), ...explodedTexts]
    .filter((t) => classifyLayer(t.layer) !== 'ignore')
    .map((t) => ({ x: t.x, y: t.y, text: t.text }))
    .slice(0, 200); // cap sprite count

  const pts = [];
  walls.forEach((w) => { pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }); });
  const bounds = pts.length ? boundsOf(pts) : { minX: 0, minY: 0, maxX: 1, maxY: 1 };

  const wallLength = walls.reduce((a, w) => a + Math.hypot(w.x2 - w.x1, w.y2 - w.y1), 0) / upm;
  return {
    walls, openings, furniture, labels, bounds,
    unitsHint: upm >= 500 ? 'mm' : 'units',
    unitsPerMeter: upm,
    stats: {
      wallCount: walls.length,
      wallLength: Math.round(wallLength * 100) / 100,
      openingCount: openings.length,
      furnitureCount: furniture.length,
      roomEstimate: labels.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Raster path — canvas threshold + run-length wall detection
// ---------------------------------------------------------------------------

/**
 * Detect walls in a raster floor-plan image. Strategy:
 *   1. grayscale + threshold → dark-pixel bitmap
 *   2. scan rows → horizontal runs of dark pixels ≥ minRun; merge runs on
 *      adjacent rows that overlap → wall rectangles (thickness = merged height)
 *   3. same for columns → vertical walls
 *   4. report everything in pixel units; caller supplies pxPerMeter calibration
 * Doors/windows are NOT detected — walls only (full-height extrusion).
 */
export function extractFromImage(image, { maxDim = 1600, threshold = 140, minRunPx = 24 } = {}) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // dark-pixel map (walls/lines are darker than the paper background)
  const dark = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    dark[i] = (r * 0.299 + g * 0.587 + b * 0.114) < threshold ? 1 : 0;
  }

  // Collect dark runs along one axis, then merge runs on adjacent lines into
  // filled rectangles. Walls are THICK filled bands in a typical plan —
  // furniture/text strokes merge to 1-2px and get filtered out below.
  const collectRuns = (horizontal) => {
    const outer = horizontal ? height : width;
    const inner = horizontal ? width : height;
    const runs = [];
    for (let o = 0; o < outer; o++) {
      let i = 0;
      while (i < inner) {
        while (i < inner && !dark[horizontal ? o * width + i : i * width + o]) i++;
        const i0 = i;
        while (i < inner && dark[horizontal ? o * width + i : i * width + o]) i++;
        if (i - i0 >= minRunPx) runs.push({ a: i0, b: i, line: o });
      }
    }
    return runs;
  };

  // Merge runs on consecutive lines whose intervals overlap ≥60% — produces
  // rectangles {lo,hi,start,end} = [long-axis range] × [thin-axis range].
  const mergeRuns = (runs) => {
    const rects = [];
    for (const r of runs) {
      let hit = null;
      for (let k = rects.length - 1; k >= 0 && rects[k].end >= r.line - 2; k--) {
        const g = rects[k];
        const ov = Math.min(g.b, r.b) - Math.max(g.a, r.a);
        if (ov > 0.6 * Math.min(g.b - g.a, r.b - r.a)) { hit = g; break; }
      }
      if (hit) {
        hit.a = Math.min(hit.a, r.a);
        hit.b = Math.max(hit.b, r.b);
        hit.end = r.line;
      } else {
        rects.push({ a: r.a, b: r.b, start: r.line, end: r.line });
      }
    }
    return rects;
  };

  const rects = [
    ...mergeRuns(collectRuns(true)).map((r) => ({ axis: 'h', lo: r.a, hi: r.b, t0: r.start, t1: r.end })),
    ...mergeRuns(collectRuns(false)).map((r) => ({ axis: 'v', lo: r.a, hi: r.b, t0: r.start, t1: r.end })),
  ];

  // Keep only wall-like rectangles: ≥3px thick (filled bands, not strokes)
  // and length ≥ 3× thickness (long, not square blobs).
  const walls = [];
  for (const r of rects) {
    const thickness = r.t1 - r.t0 + 1;
    const len = r.hi - r.lo;
    if (thickness < 3 || len < Math.max(minRunPx, thickness * 3)) continue;
    const mid = (r.t0 + r.t1) / 2;
    walls.push(r.axis === 'h'
      ? { x1: r.lo, y1: mid, x2: r.hi, y2: mid, thickness, axis: 'h' }
      : { x1: mid, y1: r.lo, x2: mid, y2: r.hi, thickness, axis: 'v' });
  }

  // Door/window gaps: two collinear wall pieces separated by an opening-sized
  // gap (2.5–10× median thickness) get MERGED into one wall + an opening entry —
  // the viewer's opening-splitter then renders a lintel above the gap instead
  // of leaving a hole.
  const openings = [];
  const medThick = walls.length
    ? walls.map((w) => w.thickness).sort((a, b) => a - b)[Math.floor(walls.length / 2)]
    : 6;
  const mergedWalls = [];
  for (const axis of ['h', 'v']) {
    const groups = new Map();
    for (const w of walls.filter((s) => s.axis === axis)) {
      const perp = axis === 'h' ? w.y1 : w.x1;
      let key = null;
      for (const k of groups.keys()) {
        if (Math.abs(k - perp) <= medThick * 0.8) { key = k; break; }
      }
      if (key == null) groups.set(perp, [w]); else groups.get(key).push(w);
    }
    for (const [, list] of groups) {
      list.sort((a, b) => (axis === 'h' ? a.x1 - b.x1 : a.y1 - b.y1));
      let cur = list[0];
      for (let i = 1; i < list.length; i++) {
        const nxt = list[i];
        const gapStart = axis === 'h' ? cur.x2 : cur.y2;
        const gapEnd = axis === 'h' ? nxt.x1 : nxt.y1;
        const gap = gapEnd - gapStart;
        // Door/window gap: ~4–25× wall thickness, capped at 8% of image width
        // (a door is ~0.8–1.2m vs ~0.15–0.3m wall thickness → wide ratio band)
        const maxGap = Math.min(medThick * 25, Math.max(width, height) * 0.08);
        if (gap >= medThick * 4 && gap <= maxGap) {
          // bridge the gap — opening sits on the bridged wall
          openings.push(axis === 'h'
            ? { x1: gapStart, y1: cur.y1, x2: gapEnd, y2: cur.y1, kind: 'door', sillHeight: 0 }
            : { x1: cur.x1, y1: gapStart, x2: cur.x1, y2: gapEnd, kind: 'door', sillHeight: 0 });
          cur = axis === 'h'
            ? { ...cur, x2: nxt.x2 }
            : { ...cur, y2: nxt.y2 };
        } else {
          mergedWalls.push(cur);
          cur = nxt;
        }
      }
      mergedWalls.push(cur);
    }
  }

  const bounds = { minX: 0, minY: 0, maxX: width, maxY: height };
  const totalLen = mergedWalls.reduce((a, w) => a + Math.hypot(w.x2 - w.x1, w.y2 - w.y1), 0);
  return {
    walls: mergedWalls, openings, furniture: [], labels: [], bounds,
    unitsHint: 'px',
    unitsPerMeter: null, // caller must supply pxPerMeter calibration
    stats: {
      wallCount: mergedWalls.length,
      wallLength: Math.round(totalLen), // in px — spec panel shows after calibration
      openingCount: openings.length,
      furnitureCount: 0,
      roomEstimate: 0,
    },
  };
}
