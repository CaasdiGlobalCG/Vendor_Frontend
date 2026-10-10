/**
 * pivotEngine — multi-dimensional pivot computation (pure, testable).
 *
 * Extends the legacy single group/value pivotTable with:
 *   - up to two nested group levels ("Group by" + "Then by")
 *   - multiple measures (each: column + op)
 *   - a column dimension → 2D matrix (rows × columns)
 *   - ops beyond sum/avg/min/max/count: distinct count, % of total
 *   - result sorting by group name or any measure
 *   - drill-down: which source rows produced a group cell
 *
 * Config shape (persisted in data.customTableData.config):
 *   { groupKeys: ['region','city'], measures: [{key:'qty',op:'sum'}],
 *     colKey: 'month', sortBy: 'group'|0|1, sortDir: 'asc'|'desc' }
 *
 * Legacy {groupKey, valueKey, op} upgrades via normalizePivotConfig so
 * saved canvases keep working unchanged.
 */
import { normalizeColumns } from './tableEngine';

export const PIVOT_OPS = {
  sum: 'Sum', avg: 'Average', min: 'Min', max: 'Max',
  count: 'Count', distinct: 'Distinct', pct: '% of total'
};

/** Upgrade legacy config + fill defaults; never mutates input. */
export const normalizePivotConfig = (config) => {
  const c = config || {};
  const groupKeys = Array.isArray(c.groupKeys)
    ? c.groupKeys.filter(Boolean).slice(0, 2)
    : (c.groupKey ? [c.groupKey] : []);
  const measures = Array.isArray(c.measures) && c.measures.length
    ? c.measures.filter(m => m && m.key).map(m => ({ key: m.key, op: PIVOT_OPS[m.op] ? m.op : 'sum' }))
    : (c.valueKey ? [{ key: c.valueKey, op: PIVOT_OPS[c.op] ? c.op : 'sum' }] : []);
  return {
    groupKeys,
    measures,
    colKey: c.colKey || '',
    sortBy: c.sortBy === undefined ? 'group' : c.sortBy,
    sortDir: c.sortDir === 'desc' ? 'desc' : 'asc'
  };
};

const toNum = (v) => (typeof v === 'number' ? v : parseFloat(v));

/** Aggregate a raw cell-value list. 'pct' resolves later via grand totals. */
const aggregate = (vals, op) => {
  if (op === 'distinct') {
    return new Set(vals.map(v => String(v ?? '')).filter(v => v !== '')).size;
  }
  const nums = vals.map(toNum).filter(n => !Number.isNaN(n));
  switch (op) {
    case 'count': return nums.length;
    case 'avg': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case 'min': return nums.length ? Math.min(...nums) : 0;
    case 'max': return nums.length ? Math.max(...nums) : 0;
    case 'pct':
    case 'sum':
    default: return nums.reduce((a, b) => a + b, 0);
  }
};

/**
 * Build a two-level group tree from the evaluated grid.
 * Each node: { key, label, count, raw: {mi:[cellVals]}, children }
 * `raw` buckets per measure feed aggregate() after the tree is built so
 * count/distinct see the actual cell values, not pre-filtered numbers.
 */
const buildTree = (evaluated, groupIdxs, measureIdxs) => {
  const root = { children: new Map(), raw: measureIdxs.map(() => []), count: 0 };
  evaluated.forEach((row, ri) => {
    let node = root;
    node.count += 1;
    measureIdxs.forEach((mi, m) => node.raw[m].push(row[mi]));
    groupIdxs.forEach((gi, depth) => {
      const key = String(row[gi] ?? '');
      if (!node.children.has(key)) {
        node.children.set(key, {
          key, label: key === '' ? '(empty)' : key, count: 0,
          raw: measureIdxs.map(() => []), children: new Map(),
          rowIndices: []
        });
      }
      node = node.children.get(key);
      node.count += 1;
      node.rowIndices.push(ri);
      measureIdxs.forEach((mi, m) => node.raw[m].push(row[mi]));
    });
  });
  return root;
};

/** Resolve node.raw → node.values[measureIdx], recursing into children. */
const resolveValues = (node, measures, grandSums) => {
  node.values = measures.map((m, i) => {
    const v = aggregate(node.raw[i], m.op);
    return m.op === 'pct' ? (grandSums[i] ? v / grandSums[i] * 100 : 0) : v;
  });
  node.childList = [...node.children.values()];
  node.childList.forEach(ch => resolveValues(ch, measures, grandSums));
  return node;
};

const sortChildren = (node, sortBy, sortDir) => {
  if (!node.childList) return;
  const dir = sortDir === 'desc' ? -1 : 1;
  node.childList.sort((a, b) => {
    const cmp = sortBy === 'group'
      ? String(a.label).localeCompare(String(b.label), undefined, { numeric: true })
      : (a.values[sortBy] ?? 0) - (b.values[sortBy] ?? 0);
    return cmp * dir;
  });
  node.childList.forEach(ch => sortChildren(ch, sortBy, sortDir));
};

/**
 * Main entry: pivot(evaluatedGrid, columns, rawConfig)
 * → { mode, config, measures, groups, colKeys, grandTotals, grandCells, rowCount }
 * groups: sorted tree roots; matrix mode adds cells {colKey:[vals]} per group
 * and grandCells {colKey:[vals]} for the footer row.
 */
export const pivot = (evaluated, columns, rawConfig) => {
  const cols = normalizeColumns(columns);
  const config = normalizePivotConfig(rawConfig);
  const groupIdxs = config.groupKeys.map(k => cols.findIndex(c => c.key === k));
  const measureIdxs = config.measures.map(m => cols.findIndex(c => c.key === m.key));
  const valid = groupIdxs.length > 0 && groupIdxs.every(i => i >= 0)
    && measureIdxs.length > 0 && measureIdxs.every(i => i >= 0);
  if (!valid) return { mode: 'empty', config, measures: config.measures, groups: [], rowCount: evaluated.length };

  const grandSums = config.measures.map((m, i) =>
    m.op === 'pct' ? aggregate(evaluated.map(r => r[measureIdxs[i]]), 'sum') : 0);

  // Column dimension → matrix keyed by the primary group only
  const colIdx = cols.findIndex(c => c.key === config.colKey);
  if (colIdx >= 0) {
    const gIdx = groupIdxs[0];
    const groups = new Map();
    const colKeys = [];
    const colSet = new Set();
    evaluated.forEach((row, ri) => {
      const gk = String(row[gIdx] ?? '');
      const ck = String(row[colIdx] ?? '');
      if (!colSet.has(ck)) { colSet.add(ck); colKeys.push(ck); }
      if (!groups.has(gk)) {
        groups.set(gk, {
          key: gk, label: gk === '' ? '(empty)' : gk, count: 0, depth: 0,
          rowIndices: [], cells: new Map(), childList: []
        });
      }
      const g = groups.get(gk);
      g.count += 1;
      g.rowIndices.push(ri);
      if (!g.cells.has(ck)) g.cells.set(ck, measureIdxs.map(() => []));
      measureIdxs.forEach((mi, m) => g.cells.get(ck)[m].push(row[mi]));
    });
    colKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const measureOp = (m, i) => config.measures[i].op;
    const evalCell = (rawList) =>
      config.measures.map((m, i) => {
        const v = aggregate(rawList[i], m.op);
        return m.op === 'pct' ? (grandSums[i] ? v / grandSums[i] * 100 : 0) : v;
      });

    const cellKeys = [...colSet.keys()];
    let groupList = [...groups.values()].map(g => {
      const cells = {};
      cellKeys.forEach(ck => { cells[ck] = evalCell(g.cells.get(ck) || measureIdxs.map(() => [])); });
      const all = measureIdxs.map(() => []);
      g.cells.forEach(v => v.forEach((l, m) => all[m].push(...l)));
      return { ...g, cells, values: evalCell(all) };
    });
    const grandCells = {};
    cellKeys.forEach(ck => {
      const all = measureIdxs.map(() => []);
      groups.forEach(g => (g.cells.get(ck) || []).forEach((l, m) => all[m].push(...l)));
      grandCells[ck] = evalCell(all);
    });
    const grandTotals = evalCell(measureIdxs.map(mi => evaluated.map(r => r[mi])));

    // Sort matrix rows the same way as row mode
    const dir = config.sortDir === 'desc' ? -1 : 1;
    groupList.sort((a, b) => {
      const cmp = config.sortBy === 'group'
        ? a.label.localeCompare(b.label, undefined, { numeric: true })
        : (a.values[config.sortBy] ?? 0) - (b.values[config.sortBy] ?? 0);
      return cmp * dir;
    });

    return {
      mode: 'matrix', config,
      measures: config.measures.map((m, i) => ({ ...m, label: cols.find(c => c.key === m.key)?.label })),
      groups: groupList, colKeys, grandCells, grandTotals,
      rowCount: evaluated.length
    };
  }

  // Rows mode — nested tree
  const root = buildTree(evaluated, groupIdxs, measureIdxs);
  resolveValues(root, config.measures, grandSums);
  sortChildren(root, config.sortBy, config.sortDir);
  return {
    mode: 'rows', config,
    measures: config.measures.map(m => ({ ...m, label: cols.find(c => c.key === m.key)?.label })),
    groups: root.childList, grandTotals: root.values, rowCount: evaluated.length
  };
};

/** Source-row indices behind a group path — powers drill-down. */
export const drillRowIndices = (evaluated, columns, groupKeys, path) => {
  const cols = normalizeColumns(columns);
  const idxs = groupKeys.map(k => cols.findIndex(c => c.key === k)).filter(i => i >= 0);
  return evaluated
    .map((row, i) => ({ row, i }))
    .filter(({ row }) =>
      idxs.slice(0, path.length).every((gi, d) => String(row[gi] ?? '') === String(path[d])))
    .map(({ i }) => i);
};
