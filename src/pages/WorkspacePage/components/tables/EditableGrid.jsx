import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  normalizeColumns, rowsToGrid, evaluateGrid, cellRef, colLetter, isFormula
} from '../../utils/tableEngine';
import { CellValue, numericColumns } from './cellDisplay';

let seq = 0;
const uid = (p) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/**
 * EditableGrid — Excel-style editable table used by all table element types.
 *
 * - Cells hold raw values; strings starting with '=' are formulas evaluated
 *   by tableEngine (A1 refs, SUM/AVG/MIN/MAX/COUNT ranges…).
 * - Editing is click-to-edit; the raw value (incl. formula) is what you edit,
 *   the computed value is what renders.
 * - Local draft until "Save" — parent persists via onSave(columns, rows).
 */
// Big tables: only the rows in (and just around) the visible window are drawn, so a
// 5,000-row sheet costs the same to pan and zoom on the canvas as a 50-row one.
const ROW_HEIGHT = 27;          // px, one grid row (26 content + 1 border)
const WINDOW_THRESHOLD = 60;    // below this many rows, just draw everything
const OVERSCAN = 12;            // extra rows above and below the window
const VIEW_ROWS_FALLBACK = 14;  // rows assumed visible before the box is measured

const EditableGrid = ({
  columns: columnsProp = [],
  rows: rowsProp = [],
  onSave,
  locked = false,
  toolbarExtras = null,
  footer = null,
  maxHeight = 'max-h-64',
  editSignal = 0,
  onDraftChange = null
}) => {
  const [draftCols, setDraftCols] = useState(() => normalizeColumns(columnsProp));
  const [draftRows, setDraftRows] = useState(() => rowsProp.map(r => ({ ...r })));
  const [editing, setEditing] = useState(null); // {r, c}
  const [draftCell, setDraftCell] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewRows, setViewRows] = useState(VIEW_ROWS_FALLBACK);
  const scrollRef = useRef(null);
  const scrollRaf = useRef(0);

  // Full view is scrolled by the overlay, not by this box, so it draws every row.
  const windowed = maxHeight !== 'max-h-none' && draftRows.length > WINDOW_THRESHOLD;

  const handleScroll = useCallback((e) => {
    const top = e.currentTarget.scrollTop;
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      setScrollTop(top);
    });
  }, []);

  useEffect(() => {
    if (!windowed || !scrollRef.current) return;
    setViewRows(Math.ceil(scrollRef.current.clientHeight / ROW_HEIGHT) || VIEW_ROWS_FALLBACK);
  }, [windowed]);

  useEffect(() => () => { if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current); }, []);

  const evaluated = useMemo(
    () => evaluateGrid(rowsToGrid(draftCols, draftRows)),
    [draftCols, draftRows]
  );

  const numericCols = useMemo(() => numericColumns(evaluated, draftCols.length), [evaluated, draftCols.length]);

  // Report the live draft upward — TableRenderer remounts this component when
  // toggling the portal fullscreen view, and feeds the draft back as props.
  useEffect(() => {
    onDraftChange?.(draftCols, draftRows);
  }, [draftCols, draftRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Menu "Edit" → enter cell editing on the first cell
  useEffect(() => {
    if (editSignal > 0 && !locked && draftRows.length > 0 && draftCols.length > 0) {
      setEditing({ r: 0, c: 0 });
      setDraftCell(String(draftRows[0]?.[draftCols[0].key] ?? ''));
    }
  }, [editSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const windowStart = windowed ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const windowEnd = windowed
    ? Math.min(draftRows.length, Math.floor(scrollTop / ROW_HEIGHT) + viewRows + OVERSCAN)
    : draftRows.length;

  const markDirty = () => setDirty(true);

  const startEdit = (r, c) => {
    if (locked) return;
    setEditing({ r, c });
    setDraftCell(String(draftRows[r]?.[draftCols[c].key] ?? ''));
  };

  const commitCell = () => {
    if (!editing) return;
    const { r, c } = editing;
    const key = draftCols[c].key;
    setDraftRows(prev => prev.map((row, i) =>
      i === r ? { ...row, [key]: draftCell } : row
    ));
    setEditing(null);
    markDirty();
  };

  const addRow = () => {
    const row = { id: uid('r') };
    draftCols.forEach(c => { row[c.key] = ''; });
    setDraftRows(prev => [...prev, row]);
    markDirty();
  };

  const removeRow = (idx) => {
    setDraftRows(prev => prev.filter((_, i) => i !== idx));
    markDirty();
  };

  const addColumn = () => {
    const key = uid('c');
    setDraftCols(prev => [...prev, { key, label: `Column ${prev.length + 1}` }]);
    setDraftRows(prev => prev.map(row => ({ ...row, [key]: '' })));
    markDirty();
  };

  const removeColumn = (idx) => {
    const key = draftCols[idx].key;
    setDraftCols(prev => prev.filter((_, i) => i !== idx));
    setDraftRows(prev => prev.map(row => {
      const next = { ...row };
      delete next[key];
      return next;
    }));
    markDirty();
  };

  const renameColumn = (idx, label) => {
    setDraftCols(prev => prev.map((c, i) => i === idx ? { ...c, label } : c));
    markDirty();
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draftCols, draftRows);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const cellInput = (r, c) => (
    <input
      autoFocus
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
  );

  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {!locked && (
          <>
            <button onClick={addRow} className="flex items-center gap-1 px-2 py-1 text-xs bg-success/10 text-success rounded hover:bg-success/20">
              <Plus className="w-3 h-3" /> Row
            </button>
            <button onClick={addColumn} className="flex items-center gap-1 px-2 py-1 text-xs bg-info/10 text-info rounded hover:bg-info/20">
              <Plus className="w-3 h-3" /> Column
            </button>
          </>
        )}
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

      {/* Grid */}
      <div
        ref={scrollRef}
        onScroll={windowed ? handleScroll : undefined}
        // on a big table the wheel scrolls the table instead of zooming the canvas
        className={`overflow-auto ${maxHeight} border border-line rounded${windowed ? ' nowheel' : ''}`}
      >
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-canvas sticky top-0 z-10">
            <tr>
              <th className="border border-line px-1 py-1 w-8 text-dim font-normal">#</th>
              {draftCols.map((col, ci) => (
                <th key={col.key} className="border border-line px-1 py-1 min-w-[90px] group/col">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-dim font-normal w-3">{colLetter(ci)}</span>
                    {locked ? (
                      <span className="font-semibold text-ink flex-1 text-left truncate">{col.label}</span>
                    ) : (
                      <input
                        value={col.label}
                        onChange={(e) => renameColumn(ci, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="font-semibold text-ink flex-1 text-left bg-transparent focus:outline-none focus:ring-1 focus:ring-info rounded px-0.5 min-w-0"
                      />
                    )}
                    {!locked && (
                      <button
                        onClick={() => removeColumn(ci)}
                        title="Delete column"
                        className="opacity-0 group-hover/col:opacity-100 text-danger hover:bg-danger/10 rounded p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {!locked && <th className="border border-line w-8" />}
            </tr>
          </thead>
          <tbody>
            {windowStart > 0 && (
              <tr aria-hidden="true" style={{ height: windowStart * ROW_HEIGHT }}><td colSpan={draftCols.length + 2} /></tr>
            )}
            {draftRows.map((row, ri) => {
              if (ri < windowStart || ri >= windowEnd) return null;
              return (
              <tr key={row.id || ri} className="hover:bg-canvas/60" style={windowed ? { height: ROW_HEIGHT } : undefined}>
                <td className="border border-line px-1 py-0.5 text-center text-dim bg-canvas">{ri + 1}</td>
                {draftCols.map((col, ci) => {
                  const raw = row[col.key];
                  const shown = evaluated[ri]?.[ci];
                  const isEditingCell = editing?.r === ri && editing?.c === ci;
                  return (
                    <td
                      key={col.key}
                      className={`border border-line px-0 py-0 cursor-cell ${isFormula(raw) ? 'bg-info/5' : ''}`}
                      onClick={() => startEdit(ri, ci)}
                      title={isFormula(raw) ? raw : cellRef(ri, ci)}
                    >
                      {isEditingCell ? cellInput(ri, ci) : (
                        <div className={`px-2 py-1.5 min-h-[26px] text-ink truncate max-w-[220px] ${numericCols[ci] ? 'text-right tabular-nums' : ''}`}>
                          {shown === undefined || shown === null || shown === ''
                            ? <span className="text-dim/40">·</span>
                            : <CellValue value={shown} />}
                        </div>
                      )}
                    </td>
                  );
                })}
                {!locked && (
                  <td className="border border-line px-1 py-0.5 text-center">
                    <button onClick={() => removeRow(ri)} title="Delete row" className="text-danger hover:bg-danger/10 rounded p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>
              );
            })}
            {windowEnd < draftRows.length && (
              <tr aria-hidden="true" style={{ height: (draftRows.length - windowEnd) * ROW_HEIGHT }}><td colSpan={draftCols.length + 2} /></tr>
            )}
            {draftRows.length === 0 && (
              <tr>
                <td colSpan={draftCols.length + 2} className="border border-line px-3 py-4 text-center text-dim">
                  No rows — click "+ Row" to add one
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px] text-dim">
        Click a cell to edit · formulas start with = (e.g. =A1+B2, =SUM(A1:A5)) · formula cells are highlighted
      </p>
      {footer}
    </div>
  );
};

export default EditableGrid;
