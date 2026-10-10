/**
 * dataView — pure filtering / multi-sort / view-state pipeline for DataTable.
 *
 * Filter spec per column key, any of:
 *   { values: ['a','b'] }          → checklist include-list (value must be listed)
 *   { text: 'sub' }                → case-insensitive contains
 *   { op: '>'|'>='|'<'|'<='|'='|'!=', value: 10 }  → numeric-aware compare
 *                                                     (= / != fall back to string)
 *
 * View state persists in config.view:
 *   { sorts: [{key,dir}], filters: {colKey: spec}, hidden: [colKeys], perPage }
 */
export const uniqueValues = (evaluated, colIdx) =>
  [...new Set(evaluated.map(r => String(r[colIdx] ?? '')))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export const isNumericColumn = (evaluated, colIdx) => {
  const vals = evaluated.map(r => r[colIdx]).filter(v => String(v ?? '') !== '');
  if (!vals.length) return false;
  const numeric = vals.filter(v => !Number.isNaN(typeof v === 'number' ? v : parseFloat(v))).length;
  return numeric / vals.length >= 0.8;
};

export const matchFilter = (value, spec) => {
  if (!spec) return true;
  const str = String(value ?? '');
  if (Array.isArray(spec.values)) return spec.values.includes(str);
  if (spec.text !== undefined) return str.toLowerCase().includes(String(spec.text).toLowerCase());
  if (spec.op) {
    const n = typeof value === 'number' ? value : parseFloat(value);
    const target = parseFloat(spec.value);
    const numeric = !Number.isNaN(n) && !Number.isNaN(target);
    if (!numeric) {
      if (spec.op === '=') return str === String(spec.value);
      if (spec.op === '!=') return str !== String(spec.value);
      return false; // >, <, >=, <= meaningless on text
    }
    switch (spec.op) {
      case '>': return n > target;
      case '>=': return n >= target;
      case '<': return n < target;
      case '<=': return n <= target;
      case '!=': return n !== target;
      case '=':
      default: return n === target;
    }
  }
  return true;
};

/**
 * items: [{ row, eval }] — eval holds evaluated (formula-resolved) cell values.
 * filters: { colKey: spec }; sorts: [{ key, dir }] applied in order (stable).
 */
export const applyView = (items, columns, { filters = {}, sorts = [] } = {}) => {
  const colIdx = Object.fromEntries(columns.map((c, i) => [c.key, i]));
  let list = items;

  const activeFilters = Object.entries(filters).filter(([k, s]) => s && colIdx[k] !== undefined);
  if (activeFilters.length) {
    list = list.filter(({ eval: ev }) =>
      activeFilters.every(([k, spec]) => matchFilter(ev?.[colIdx[k]], spec)));
  }
  if (sorts.length) {
    const cmp = (a, b) => {
      for (const s of sorts) {
        const ci = colIdx[s.key];
        if (ci === undefined) continue;
        const av = a.eval?.[ci], bv = b.eval?.[ci];
        const an = parseFloat(av), bn = parseFloat(bv);
        const c = (!Number.isNaN(an) && !Number.isNaN(bn))
          ? an - bn
          : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
        if (c !== 0) return s.dir === 'desc' ? -c : c;
      }
      return 0;
    };
    list = [...list].sort(cmp);
  }
  return list;
};

/** Read config.view defensively; every field gets a safe default. */
export const normalizeViewState = (config) => {
  const v = config?.view || {};
  return {
    sorts: Array.isArray(v.sorts) ? v.sorts.filter(s => s && s.key) : [],
    filters: v.filters && typeof v.filters === 'object' ? v.filters : {},
    hidden: Array.isArray(v.hidden) ? v.hidden : [],
    perPage: [5, 10, 25, 50].includes(v.perPage) ? v.perPage : 10
  };
};

/** Toggle a sort key; shift → add/flip as secondary, plain → make primary. */
export const toggleSort = (sorts, key, additive) => {
  const existing = sorts.findIndex(s => s.key === key);
  if (additive) {
    if (existing >= 0) {
      const next = sorts.slice();
      next[existing] = { key, dir: sorts[existing].dir === 'asc' ? 'desc' : 'asc' };
      return next;
    }
    return [...sorts, { key, dir: 'asc' }];
  }
  if (existing === 0 && sorts.length === 1) {
    return [{ key, dir: sorts[0].dir === 'asc' ? 'desc' : 'asc' }];
  }
  if (existing === 0) {
    return [{ key, dir: sorts[0].dir === 'asc' ? 'desc' : 'asc' }, ...sorts.slice(1)];
  }
  return [{ key, dir: 'asc' }];
};
