import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Save, ArrowUpDown, Search, X, Download } from 'lucide-react';
import { normalizeColumns, rowsToGrid, evaluateGrid, isFormula } from '../../utils/tableEngine';
import { normalizeViewState } from '../../utils/dataView';
import { toCSV, downloadCSV } from '../../utils/csvExport';
import useDataView from './datatable/useDataView';
import ColumnFilterMenu from './datatable/ColumnFilterMenu';
import ColumnVisibilityMenu from './datatable/ColumnVisibilityMenu';

/**
 * DataTable — sortable / filterable / paginated table for larger datasets.
 *
 * Beyond the basics: per-column filters (unique-value checklist + numeric
 * operators), multi-column sort (Shift+click), column visibility, CSV export
 * of the current view, and view state persisted in config.view.
 * Cell edits write back by stable row id, so sorting doesn't corrupt data.
 * Draft until explicit Save → onSave(columns, rows, config).
 */
const DataTable = ({ columns: columnsProp = [], rows: rowsProp = [], config: configProp, onSave, locked = false, editSignal = 0, toolbarExtras = null, expanded = false, onDraftChange = null }) => {
  const [cols] = useState(() => normalizeColumns(columnsProp));
  const [rows, setRows] = useState(() => rowsProp.map(r => ({ ...r })));
  const [config, setConfig] = useState(() => configProp || {});
  const [filter, setFilter] = useState(''); // global quick-search (composes with column filters)
  const [editing, setEditing] = useState(null); // row id + col key
  const [draftCell, setDraftCell] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const filterRef = useRef(null);

  const grid = useMemo(() => evaluateGrid(rowsToGrid(cols, rows)), [cols, rows]);
  const rowById = useMemo(() => new Map(rows.map((r, i) => [r.id ?? i, { row: r, eval: grid[i] }])), [rows, grid]);

  // View state changes bubble into config — persisted with the table on save
  const handleViewChange = (view) => { setConfig(c => ({ ...c, view })); setDirty(true); };
  const dv = useDataView({ cols, rows, grid, initialView: normalizeViewState(configProp), onViewChange: handleViewChange });

  // Report the live draft upward — see EditableGrid (portal remount on
  // fullscreen toggle restores the draft through props).
  useEffect(() => {
    onDraftChange?.(cols, rows, config);
  }, [cols, rows, config]); // eslint-disable-line react-hooks/exhaustive-deps

  // Menu "Edit" → focus the filter input (the entry point for narrowing data)
  useEffect(() => {
    if (editSignal > 0 && !locked) filterRef.current?.focus();
  }, [editSignal]);

  // Global quick-search composes on top of the column-filter pipeline
  const filtered = useMemo(() => {
    if (!filter.trim()) return dv.visible;
    const q = filter.toLowerCase();
    return dv.visible.filter(({ eval: ev }) =>
      (ev || []).some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [dv.visible, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / dv.perPage));
  const page = Math.min(dv.page, totalPages);
  const pageRows = filtered.slice((page - 1) * dv.perPage, page * dv.perPage);

  const startEdit = (rowId, colKey) => {
    if (locked) return;
    setEditing({ rowId, colKey });
    setDraftCell(String(rowById.get(rowId)?.row?.[colKey] ?? ''));
  };

  const commitCell = () => {
    if (!editing) return;
    setRows(prev => prev.map(r =>
      (r.id ?? rows.indexOf(r)) === editing.rowId ? { ...r, [editing.colKey]: draftCell } : r
    ));
    setEditing(null);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(cols, rows, config);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const visIdx = dv.visibleCols.map(c => cols.findIndex(x => x.key === c.key));
    downloadCSV('table.csv', toCSV(dv.visibleCols, filtered.map(({ eval: ev }) => visIdx.map(i => ev?.[i]))));
  };

  const sortBadge = (colKey) => {
    const i = dv.sorts.findIndex(s => s.key === colKey);
    if (i < 0) return <ArrowUpDown className="w-3 h-3 text-dim/40" />;
    return (
      <span className="flex items-center text-info">
        {dv.sorts[i].dir === 'asc' ? '↑' : '↓'}
        {dv.sorts.length > 1 && <sup className="text-[8px]">{i + 1}</sup>}
      </span>
    );
  };

  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      {/* Toolbar: search + columns + export + save */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="relative flex-1 max-w-[220px] min-w-[120px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-dim" />
          <input
            ref={filterRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Filter rows…"
            className="w-full pl-6 pr-6 py-1 text-xs border border-line rounded bg-surface focus:outline-none focus:ring-1 focus:ring-info"
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-dim">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <ColumnVisibilityMenu cols={cols} hidden={dv.hidden} onToggle={dv.toggleHidden} />
        <button
          onClick={exportCsv}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded border bg-surface-hover text-dim border-line hover:text-info"
          title="Export current view to CSV"
        >
          <Download className="w-3 h-3" /> CSV
        </button>
        {toolbarExtras}
        <div className="flex-1" />
        {!locked && (
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${
              dirty && !saving ? 'bg-info text-white hover:bg-info/90' : 'bg-surface-hover text-dim cursor-not-allowed'
            }`}
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        )}
      </div>

      {/* Table */}
      <div className={`overflow-x-auto border border-line rounded ${expanded ? 'max-h-none' : 'max-h-64'} overflow-y-auto`}>
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-canvas sticky top-0 z-10">
            <tr>
              {dv.visibleCols.map(col => (
                <th
                  key={col.key}
                  className="border border-line px-2 py-1.5 text-left font-semibold text-ink select-none"
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => dv.clickSort(col.key, e.shiftKey)}
                      className="flex items-center gap-1 hover:text-info cursor-pointer"
                      title="Click to sort · Shift+click to add a sort level"
                    >
                      {col.label}
                      {sortBadge(col.key)}
                    </button>
                    <ColumnFilterMenu
                      col={{ ...col, _idx: cols.findIndex(c => c.key === col.key) }}
                      grid={grid}
                      spec={dv.filters[col.key]}
                      onApply={(spec) => spec ? dv.setFilter(col.key, spec) : dv.clearFilter(col.key)}
                      onClear={() => dv.clearFilter(col.key)}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ row, eval: ev }, vi) => {
              const rowId = row.id ?? vi;
              return (
                <tr key={rowId} className="hover:bg-canvas/60">
                  {dv.visibleCols.map((col) => {
                    const ci = cols.findIndex(c => c.key === col.key);
                    const isEditingCell = editing?.rowId === rowId && editing?.colKey === col.key;
                    const raw = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`border border-line px-0 py-0 ${locked ? '' : 'cursor-cell'} ${isFormula(raw) ? 'bg-info/5' : ''}`}
                        onClick={() => startEdit(rowId, col.key)}
                        title={isFormula(raw) ? raw : ''}
                      >
                        {isEditingCell ? (
                          <input
                            autoFocus
                            aria-label="Cell editor"
                            value={draftCell}
                            onChange={(e) => setDraftCell(e.target.value)}
                            onBlur={commitCell}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') commitCell();
                              if (e.key === 'Escape') setEditing(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-info"
                          />
                        ) : (
                          <div className="px-2 py-1.5 text-ink truncate max-w-[220px]">{String(ev?.[ci] ?? '')}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr><td colSpan={Math.max(1, dv.visibleCols.length)} className="px-3 py-4 text-center text-dim">No rows match</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2 text-xs text-dim">
        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            value={dv.perPage}
            onChange={(e) => dv.setPerPage(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="border border-line rounded px-1.5 py-0.5 text-xs bg-surface"
          >
            {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>· {filtered.length} total</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dv.setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2 py-0.5 bg-surface-hover rounded disabled:opacity-40"
          >Prev</button>
          <span>{page} / {totalPages}</span>
          <button
            onClick={() => dv.setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-2 py-0.5 bg-surface-hover rounded disabled:opacity-40"
          >Next</button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
