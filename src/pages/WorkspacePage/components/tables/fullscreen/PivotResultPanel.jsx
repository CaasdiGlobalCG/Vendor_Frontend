import React, { useMemo, useState } from 'react';
import { TableProperties, ChevronRight, ChevronDown, Plus, X } from 'lucide-react';
import { evaluateTable } from '../../../utils/tableEngine';
import { pivot, normalizePivotConfig, PIVOT_OPS } from '../../../utils/pivotEngine';

/**
 * PivotResultPanel — pivot configuration + live result.
 * Shared between the compact PivotTable node and the full-view split pane.
 *
 * Features: two-level grouping, multiple measures, a column dimension
 * (2D matrix), six aggregation ops incl. distinct + % of total, sorting,
 * expand/collapse, click-to-drill into source rows, and inline magnitude bars.
 */
const selCls = 'border border-line rounded px-1.5 py-1 text-xs bg-surface w-full';

const fmt = (v, op) => {
  if (typeof v !== 'number') return String(v ?? '');
  const n = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return op === 'pct' ? `${n}%` : n;
};

const PivotResultPanel = ({ cols = [], rows = [], config = {}, onConfigChange, locked = false }) => {
  const cfg = normalizePivotConfig(config);
  const [openGroups, setOpenGroups] = useState(() => new Set()); // collapsed by default beyond level 1? start all open
  const [drill, setDrill] = useState(null); // { path:[keys], labels:[labels] }

  const evaluated = useMemo(() => evaluateTable(cols, rows), [cols, rows]);
  const result = useMemo(() => pivot(evaluated, cols, config), [evaluated, cols, config]);

  const setCfg = (patch) => onConfigChange?.({ ...cfg, ...patch });
  const setMeasure = (i, patch) =>
    setCfg({ measures: cfg.measures.map((m, mi) => (mi === i ? { ...m, ...patch } : m)) });
  const addMeasure = () =>
    setCfg({ measures: [...cfg.measures, { key: cols.find(c => !cfg.measures.some(m => m.key === c.key))?.key || cols[0]?.key || '', op: 'sum' }] });
  const removeMeasure = (i) => setCfg({ measures: cfg.measures.filter((_, mi) => mi !== i) });
  const setGroup = (level, key) => {
    const next = cfg.groupKeys.slice();
    next[level] = key;
    if (level === 0 && !key) next.splice(0, 1);
    setCfg({ groupKeys: next.filter(Boolean).slice(0, 2) });
  };

  const isOpen = (pathKey) => !openGroups.has(pathKey) ? true : false; // default open; set stores CLOSED keys
  const toggleGroup = (pathKey) => setOpenGroups(prev => {
    const next = new Set(prev);
    if (next.has(pathKey)) next.delete(pathKey); else next.add(pathKey);
    return next;
  });

  const maxFirstMeasure = useMemo(() => {
    if (result.mode !== 'rows' || !result.groups.length) return 0;
    return Math.max(...result.groups.map(g => Math.abs(g.values?.[0] || 0)), 1e-9);
  }, [result]);

  const sortOptions = [
    { value: 'group', label: 'Group name' },
    ...cfg.measures.map((m, i) => ({
      value: String(i),
      label: `${PIVOT_OPS[m.op]} of ${cols.find(c => c.key === m.key)?.label || m.key}`
    }))
  ];

  const renderRows = (nodes, depth, keyPath, labelPath) =>
    nodes.map(node => {
      const pathKey = `${keyPath}›${node.key}`;
      const labels = [...labelPath, node.label];
      const hasKids = node.childList?.length > 0;
      const open = isOpen(pathKey);
      return (
        <React.Fragment key={pathKey}>
          <tr className="hover:bg-canvas/60">
            <td className="border border-line px-2 py-1 text-ink" style={{ paddingLeft: 8 + depth * 14 }}>
              <span className="inline-flex items-center gap-1">
                {hasKids ? (
                  <button onClick={() => toggleGroup(pathKey)} className="text-dim hover:text-ink" aria-label={open ? 'Collapse' : 'Expand'}>
                    {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                ) : <span className="w-3" />}
                <button
                  className="hover:underline hover:text-info text-left"
                  onClick={() => setDrill({ rowIndices: node.rowIndices, labels })}
                  title="Show source rows"
                >{node.label}</button>
                <span className="text-[10px] text-dim">({node.count})</span>
              </span>
            </td>
            {result.measures.map((m, mi) => (
              <td key={mi} className="border border-line px-2 py-1 text-right text-ink font-medium align-top">
                {fmt(node.values?.[mi], m.op)}
                {mi === 0 && depth === 0 && typeof node.values?.[0] === 'number' && (
                  <div className="h-1 mt-0.5 rounded bg-surface-hover overflow-hidden">
                    <div className="h-full bg-info/60" style={{ width: `${Math.min(100, Math.abs(node.values[0]) / maxFirstMeasure * 100)}%` }} />
                  </div>
                )}
              </td>
            ))}
          </tr>
          {hasKids && open && renderRows(node.childList, depth + 1, pathKey, labels)}
        </React.Fragment>
      );
    });

  const drillRows = useMemo(() => {
    if (!drill) return null;
    return drill.rowIndices.map(i => rows[i]);
  }, [drill, rows]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
        <TableProperties className="w-3.5 h-3.5 text-info" /> Pivot
      </div>

      {/* Config */}
      <select value={cfg.groupKeys[0] || ''} onChange={(e) => setGroup(0, e.target.value)} className={selCls} title="Group by" disabled={locked}>
        <option value="">Group by…</option>
        {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      {cfg.groupKeys.length > 0 && (
        <select value={cfg.groupKeys[1] || ''} onChange={(e) => setGroup(1, e.target.value)} className={selCls} title="Then by (nested grouping)" disabled={locked}>
          <option value="">Then by… (optional)</option>
          {cols.filter(c => c.key !== cfg.groupKeys[0]).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      )}

      {/* Measures */}
      <div className="space-y-1">
        {cfg.measures.map((m, i) => (
          <div key={i} className="flex gap-1">
            <select value={m.key} onChange={(e) => setMeasure(i, { key: e.target.value })} className={selCls + ' flex-1'} title="Measure column" disabled={locked}>
              {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={m.op} onChange={(e) => setMeasure(i, { op: e.target.value })} className={selCls + ' w-[88px]'} title="Aggregation" disabled={locked}>
              {Object.entries(PIVOT_OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {!locked && cfg.measures.length > 1 && (
              <button onClick={() => removeMeasure(i)} className="text-dim hover:text-danger" title="Remove measure"><X className="w-3 h-3" /></button>
            )}
          </div>
        ))}
        {!locked && (
          <button onClick={addMeasure} className="flex items-center gap-1 text-[10px] text-info hover:underline" disabled={!cfg.measures.length && !cols.length}>
            <Plus className="w-3 h-3" /> Add measure
          </button>
        )}
      </div>

      {/* Column dimension + sort */}
      <select value={cfg.colKey || ''} onChange={(e) => setCfg({ colKey: e.target.value })} className={selCls} title="Columns (matrix view)" disabled={locked}>
        <option value="">Columns… (optional matrix)</option>
        {cols.filter(c => !cfg.groupKeys.includes(c.key)).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <div className="flex gap-1">
        <select
          value={String(cfg.sortBy)}
          onChange={(e) => setCfg({ sortBy: e.target.value === 'group' ? 'group' : Number(e.target.value) })}
          className={selCls + ' flex-1'}
          title="Sort pivot by"
          disabled={locked}
        >
          {sortOptions.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
        </select>
        <button
          onClick={() => setCfg({ sortDir: cfg.sortDir === 'asc' ? 'desc' : 'asc' })}
          className="px-2 border border-line rounded bg-surface text-xs"
          title={`Sort ${cfg.sortDir === 'asc' ? 'ascending' : 'descending'} — click to flip`}
          disabled={locked}
        >
          {cfg.sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Result */}
      {result.mode === 'rows' && (
        <div className="border border-line rounded overflow-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-canvas">
              <tr>
                <th className="border border-line px-2 py-1.5 text-left font-semibold text-ink">
                  {cfg.groupKeys.map(k => cols.find(c => c.key === k)?.label).join(' › ')}
                </th>
                {result.measures.map((m, i) => (
                  <th key={i} className="border border-line px-2 py-1.5 text-right font-semibold text-ink">
                    {PIVOT_OPS[m.op]} of {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderRows(result.groups, 0, '', [])}
              <tr className="bg-canvas font-semibold">
                <td className="border border-line px-2 py-1.5 text-ink">Total</td>
                {result.measures.map((m, i) => (
                  <td key={i} className="border border-line px-2 py-1.5 text-right text-ink">
                    {fmt(result.grandTotals?.[i], m.op)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {result.mode === 'matrix' && (
        <div className="border border-line rounded overflow-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-canvas">
              <tr>
                <th rowSpan={result.measures.length > 1 ? 2 : 1} className="border border-line px-2 py-1.5 text-left font-semibold text-ink">
                  {cols.find(c => c.key === cfg.groupKeys[0])?.label} \ {cols.find(c => c.key === cfg.colKey)?.label}
                </th>
                {result.colKeys.map(ck => (
                  <th key={ck} colSpan={result.measures.length} className="border border-line px-2 py-1.5 text-center font-semibold text-ink">
                    {ck === '' ? '(empty)' : ck}
                  </th>
                ))}
                <th colSpan={result.measures.length} className="border border-line px-2 py-1.5 text-center font-semibold text-ink">Total</th>
              </tr>
              {result.measures.length > 1 && (
                <tr>
                  {result.colKeys.map(ck =>
                    result.measures.map((m, mi) => (
                      <th key={ck + mi} className="border border-line px-2 py-1 text-right font-medium text-dim">{PIVOT_OPS[m.op]}</th>
                    ))
                  )}
                  {result.measures.map((m, mi) => (
                    <th key={'t' + mi} className="border border-line px-2 py-1 text-right font-medium text-dim">{PIVOT_OPS[m.op]}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {result.groups.map(g => (
                <tr key={g.key} className="hover:bg-canvas/60">
                  <td className="border border-line px-2 py-1.5 text-ink">
                    <button className="hover:underline hover:text-info" onClick={() => setDrill({ rowIndices: g.rowIndices, labels: [g.label] })} title="Show source rows">
                      {g.label}
                    </button>
                    <span className="text-[10px] text-dim ml-1">({g.count})</span>
                  </td>
                  {result.colKeys.map(ck =>
                    result.measures.map((m, mi) => (
                      <td key={ck + mi} className="border border-line px-2 py-1.5 text-right text-ink">{fmt(g.cells[ck]?.[mi], m.op)}</td>
                    ))
                  )}
                  {result.measures.map((m, mi) => (
                    <td key={'gt' + mi} className="border border-line px-2 py-1.5 text-right font-semibold text-ink bg-canvas/50">{fmt(g.values[mi], m.op)}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-canvas font-semibold">
                <td className="border border-line px-2 py-1.5 text-ink">Total</td>
                {result.colKeys.map(ck =>
                  result.measures.map((m, mi) => (
                    <td key={ck + mi} className="border border-line px-2 py-1.5 text-right text-ink">{fmt(result.grandCells[ck]?.[mi], m.op)}</td>
                  ))
                )}
                {result.measures.map((m, mi) => (
                  <td key={'gg' + mi} className="border border-line px-2 py-1.5 text-right text-ink">{fmt(result.grandTotals[mi], m.op)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {result.mode === 'empty' && (
        <p className="text-xs text-dim border border-dashed border-line rounded p-3 text-center">
          Pick a "Group by" column and at least one measure column to build the pivot.
        </p>
      )}

      {/* Drill-down */}
      {drill && drillRows && (
        <div className="border border-info/40 rounded p-2 bg-info/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-info">
              Source rows: {drill.labels?.join(' › ')} ({drillRows.length})
            </span>
            <button onClick={() => setDrill(null)} className="text-dim hover:text-ink" title="Close"><X className="w-3 h-3" /></button>
          </div>
          <div className="overflow-auto max-h-40">
            <table className="min-w-full border-collapse text-[10px]">
              <thead className="bg-canvas">
                <tr>{cols.map(c => <th key={c.key} className="border border-line px-1.5 py-0.5 text-left font-medium text-dim">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {drillRows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    {cols.map(c => <td key={c.key} className="border border-line px-1.5 py-0.5 text-ink">{String(r[c.key] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {drillRows.length > 50 && <p className="text-[10px] text-dim mt-1">…and {drillRows.length - 50} more</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PivotResultPanel;
