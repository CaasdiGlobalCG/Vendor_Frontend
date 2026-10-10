import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Save, Undo2, Redo2 } from 'lucide-react';
import {
  normalizeColumns, rowsToGrid, evaluateGrid, cellRef, isFormula, aggregateColumn
} from '../../../utils/tableEngine';
import {
  insertRowsAt, deleteRowsAt,
  insertColumnsAt, deleteColumnsAt,
  renameColumn, setCellValue, clearRange, uid
} from '../../../utils/tableOps';
import { fillRange } from '../../../utils/fillSeries';
import GridCanvas from './GridCanvas';
import TableContextMenu from './TableContextMenu';
import FormulaBar from './FormulaBar';
import SelectionStatusBar from './SelectionStatusBar';
import FormulaHelper from './FormulaHelper';
import useGridKeyboard from './useGridKeyboard';
import useTableHistory from './useTableHistory';
import { selectionToTSV, parseTSV, pasteMatrixAt } from './clipboard';

/**
 * FullTableEditor — the Excel-grade editor used by every table kind in full
 * view. Owns the draft (cols + rows), the selection rectangle, the editing
 * cell, undo history, and every structural operation (insert/delete rows &
 * columns at any position, formula ref-shifting via tableOps).
 *
 * DataTable/PivotTable full views wrap this and add kind-specific chrome via
 * toolbarExtras / sidePanel slots, so all three tables share one spreadsheet.
 */
const clampSel = (sel, rowCount, colCount) => ({
  r0: Math.max(0, Math.min(sel.r0, rowCount - 1)),
  c0: Math.max(0, Math.min(sel.c0, colCount - 1)),
  r1: Math.max(0, Math.min(sel.r1, rowCount - 1)),
  c1: Math.max(0, Math.min(sel.c1, colCount - 1))
});

const FullTableEditor = ({
  columns: columnsProp = [],
  rows: rowsProp = [],
  onSave,
  locked = false,
  toolbarExtras = null,
  sidePanel = null,
  footer = null,
  onDraftChange = null,
  editSignal = 0,
  colWidths: colWidthsProp = null,
  onWidthsChange = null,
  forceDirty = false   // parent-side config change (pivot cfg, widths) → enable Save
}) => {
  const [draftCols, setDraftCols] = useState(() => normalizeColumns(columnsProp));
  const [draftRows, setDraftRows] = useState(() => rowsProp.map(r => ({ ...r })));
  const [sel, setSel] = useState(null);           // {r0,c0,r1,c1}
  const [editing, setEditing] = useState(null);   // {r,c}
  const [draftCell, setDraftCell] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState(null);         // {x, y, kind:'cell'|'row'|'col', index}
  const [fillPreview, setFillPreview] = useState(null); // fill-drag target rect
  const [helperAt, setHelperAt] = useState(null);       // {x, y} — formula helper panel
  const [showTotals, setShowTotals] = useState(false);  // pinned Σ footer row
  const [colWidths, setColWidths] = useState(() => colWidthsProp || {});

  // ── undo/redo: every committed mutation pushes the pre-mutation snapshot ────
  const history = useTableHistory();
  const stateRef = useRef(null);
  stateRef.current = { cols: draftCols, rows: draftRows };
  const fillRef = useRef(null); // {source} while drag-filling

  const evaluated = useMemo(
    () => evaluateGrid(rowsToGrid(draftCols, draftRows)),
    [draftCols, draftRows]
  );

  // Report draft upward — the portal remounts this editor on every full-view
  // toggle, and the parent feeds the draft back as props.
  useEffect(() => {
    onDraftChange?.(draftCols, draftRows);
  }, [draftCols, draftRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Menu "Edit" → begin editing the first cell
  useEffect(() => {
    if (editSignal > 0 && !locked && draftRows.length && draftCols.length) {
      setSel({ r0: 0, c0: 0, r1: 0, c1: 0 });
      setEditing({ r: 0, c: 0 });
      setDraftCell(String(draftRows[0]?.[draftCols[0].key] ?? ''));
    }
  }, [editSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const markDirty = () => setDirty(true);

  // All committed mutations funnel through here so undo captures the
  // pre-mutation snapshot and the dirty flag always flips.
  const commitState = useCallback((cols, rows) => {
    history.push({ cols: stateRef.current.cols, rows: stateRef.current.rows });
    setDraftCols(cols);
    setDraftRows(rows);
    markDirty();
  }, [history]);

  const doUndo = useCallback(() => {
    const snap = history.undo(stateRef.current);
    if (snap) { setDraftCols(snap.cols); setDraftRows(snap.rows); markDirty(); setEditing(null); }
  }, [history]);
  const doRedo = useCallback(() => {
    const snap = history.redo(stateRef.current);
    if (snap) { setDraftCols(snap.cols); setDraftRows(snap.rows); markDirty(); setEditing(null); }
  }, [history]);

  // ── cell editing ────────────────────────────────────────────────────────────
  const startEdit = useCallback((r, c) => {
    if (locked) return;
    setEditing({ r, c });
    setDraftCell(String(draftRows[r]?.[draftCols[c].key] ?? ''));
  }, [locked, draftRows, draftCols]);

  const commitCell = useCallback((via) => {
    if (!editing) return;
    const { r, c } = editing;
    commitState(draftCols, setCellValue(draftRows, r, draftCols[c].key, draftCell));
    setEditing(null);
    // Excel: Enter moves down, Tab moves right
    if (via === 'enter') setSel({ r0: r + 1, c0: c, r1: r + 1, c1: c });
    else if (via === 'tab') setSel({ r0: r, c0: c + 1, r1: r, c1: c + 1 });
  }, [editing, draftCell, draftCols, draftRows, commitState]);

  const selectCell = (r, c) => {
    setSel({ r0: r, c0: c, r1: r, c1: c });
  };

  // ── selection intents from GridCanvas ───────────────────────────────────────
  const onCellMouseDown = (e, r, c) => {
    if (e.button === 2) { // right-click — select only if outside current rect
      if (!sel || r < sel.r0 || r > sel.r1 || c < sel.c0 || c > sel.c1) selectCell(r, c);
      return;
    }
    if (e.shiftKey && sel) {
      setSel({ ...sel, r1: r, c1: c }); // shift-click extends the rectangle
      return;
    }
    selectCell(r, c); // Excel: single click selects; double-click/typing edits
  };

  // ── fill handle (drag the selection's bottom-right square to fill) ──────────
  const startFill = (e) => {
    if (locked || !sel) return;
    e.preventDefault();
    e.stopPropagation();
    fillRef.current = { source: { ...sel } };
  };

  const onCellMouseEnter = (e, r, c) => {
    // Drag-filling: extend the preview along the dominant drag axis
    if (fillRef.current && sel) {
      const s = fillRef.current.source;
      const drDown = Math.max(0, r - s.r1), drUp = Math.max(0, s.r0 - r);
      const dcRight = Math.max(0, c - s.c1), dcLeft = Math.max(0, s.c0 - c);
      const dv = Math.max(drDown, drUp), dh = Math.max(dcRight, dcLeft);
      if (!dv && !dh) { setFillPreview(null); return; }
      const target = dv >= dh
        ? { r0: drUp ? r : s.r0, c0: s.c0, r1: drUp ? s.r1 : Math.max(s.r1, r), c1: s.c1 }
        : { r0: s.r0, c0: dcLeft ? c : s.c0, r1: s.r1, c1: dcLeft ? s.c1 : Math.max(s.c1, c) };
      setFillPreview(target);
      return;
    }
    if (e.buttons === 1 && sel && !editing) setSel(prev => ({ ...prev, r1: r, c1: c }));
  };

  // Commit the fill on mouseup anywhere
  useEffect(() => {
    const onUp = () => {
      if (!fillRef.current) return;
      const source = fillRef.current.source;
      fillRef.current = null;
      setFillPreview(prev => {
        if (prev && !locked) {
          commitState(stateRef.current.cols, fillRange(stateRef.current.cols, stateRef.current.rows, source, prev));
          setSel(prev);
        }
        return null;
      });
    };
    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, [locked, commitState]);

  // ── column resize — drag a header's right edge; widths persist via config ──
  const resizeRef = useRef(null);
  const widthsRef = useRef(colWidths);
  widthsRef.current = colWidths;
  const onColResizeStart = (e, ci) => {
    e.preventDefault();
    resizeRef.current = {
      key: draftCols[ci].key,
      startX: e.clientX,
      startW: colWidths[draftCols[ci].key] || 90
    };
  };
  useEffect(() => {
    const move = (e) => {
      const rs = resizeRef.current;
      if (!rs) return;
      const w = Math.max(48, rs.startW + (e.clientX - rs.startX));
      setColWidths(prev => ({ ...prev, [rs.key]: w }));
    };
    const up = () => {
      if (resizeRef.current) {
        resizeRef.current = null;
        onWidthsChange?.(widthsRef.current);
      }
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }, [onWidthsChange]);

  // ── formula helper / formula bar ────────────────────────────────────────────
  const insertFormula = (name) => {
    if (locked) return;
    const r = sel ? sel.r1 : 0, c = sel ? sel.c1 : 0;
    setSel({ r0: r, c0: c, r1: r, c1: c });
    setEditing({ r, c });
    setDraftCell(`=${name}(`);
  };
  const commitFromBar = (text) => {
    if (locked || !sel) return;
    commitState(draftCols, setCellValue(draftRows, sel.r1, draftCols[sel.c1].key, text));
  };

  const totals = useMemo(() => {
    if (!showTotals) return null;
    return draftCols.map((_, ci) => {
      const v = aggregateColumn(evaluated, ci, 'sum');
      if (v === '' || v === undefined) return '';
      return typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : String(v);
    });
  }, [showTotals, draftCols, evaluated]);

  const onRowHeaderClick = (e, r) =>
    setSel({ r0: r, c0: 0, r1: e.shiftKey && sel ? sel.r1 : r, c1: draftCols.length - 1 });
  const onColHeaderClick = (e, c) =>
    setSel({ r0: 0, c0: c, r1: draftRows.length - 1, c1: e.shiftKey && sel ? sel.c1 : c });

  // ── context menu ────────────────────────────────────────────────────────────
  const openMenu = (e, kind, index) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, kind, index });
  };

  // ── structural ops (all via tableOps — formulas ref-shift automatically) ────
  const applyRows = (fn) => commitState(stateRef.current.cols, fn(stateRef.current.rows));
  const applyCols = (fn) => {
    const next = fn({ cols: stateRef.current.cols, rows: stateRef.current.rows });
    commitState(next.cols, next.rows);
  };

  const rowAnchor = sel ? sel.r0 : draftRows.length;         // insert above selected
  const rowAnchorBelow = sel ? sel.r1 + 1 : draftRows.length;
  const colAnchor = sel ? sel.c0 : draftCols.length;
  const colAnchorRight = sel ? sel.c1 + 1 : draftCols.length;
  const selRowCount = sel ? sel.r1 - sel.r0 + 1 : 0;
  const selColCount = sel ? sel.c1 - sel.c0 + 1 : 0;

  const ops = {
    insertRowAbove: () => applyRows(prev => insertRowsAt(draftCols, prev, rowAnchor)),
    insertRowBelow: () => applyRows(prev => insertRowsAt(draftCols, prev, rowAnchorBelow)),
    deleteRows:     () => { if (!sel) return; applyRows(prev => deleteRowsAt(draftCols, prev, sel.r0, selRowCount)); setSel(null); },
    insertColLeft:  () => applyCols(({ cols, rows }) => insertColumnsAt(cols, rows, colAnchor)),
    insertColRight: () => applyCols(({ cols, rows }) => insertColumnsAt(cols, rows, colAnchorRight)),
    deleteCols:     () => { if (!sel) return; applyCols(({ cols, rows }) => deleteColumnsAt(cols, rows, sel.c0, selColCount)); setSel(null); },
    clearSel:       () => { if (!sel) return; applyRows(prev => clearRange(draftCols, prev, sel.r0, sel.c0, sel.r1, sel.c1)); },
    appendRow:      () => applyRows(prev => insertRowsAt(draftCols, prev, prev.length)),
    appendCol:      () => applyCols(({ cols, rows }) => insertColumnsAt(cols, rows, cols.length))
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

  // ── clipboard ───────────────────────────────────────────────────────────────
  const doCopy = async () => {
    if (!sel) return;
    try { await navigator.clipboard.writeText(selectionToTSV(draftCols, evaluated, sel)); } catch { /* clipboard may be denied */ }
  };
  const doCut = async () => { await doCopy(); ops.clearSel(); };
  const doPaste = async () => {
    if (locked || !sel) return;
    try {
      const text = await navigator.clipboard.readText();
      const matrix = parseTSV(text);
      if (!matrix.length) return;
      const { cols, rows } = pasteMatrixAt(stateRef.current.cols, stateRef.current.rows, sel.r1, sel.c1, matrix, uid);
      commitState(cols, rows);
    } catch { /* clipboard may be denied */ }
  };
  const typeToEdit = (r, c, ch) => {
    setSel({ r0: r, c0: c, r1: r, c1: c });
    setEditing({ r, c });
    setDraftCell(ch);
  };

  // Keyboard navigation (arrows/Enter/Tab/F2/Delete) + copy/paste/typing.
  useGridKeyboard({
    locked, editing, sel,
    rowCount: draftRows.length, colCount: draftCols.length,
    setSel, startEdit, commitCell, cancelEdit: () => setEditing(null),
    deleteSelection: ops.clearSel,
    onCopy: doCopy, onCut: doCut, onPaste: doPaste,
    onUndo: doUndo, onRedo: doRedo,
    typeToEdit
  });

  const selLabel = sel
    ? (sel.r0 === sel.r1 && sel.c0 === sel.c1
        ? cellRef(sel.r0, sel.c0)
        : `${cellRef(sel.r0, sel.c0)}:${cellRef(sel.r1, sel.c1)}`)
    : '';

  const toolBtn = (label, fn, title) => (
    <button
      key={label}
      onClick={fn}
      title={title}
      className="flex items-center gap-1 px-2 py-1 text-xs bg-surface-hover text-ink rounded hover:bg-info/10 hover:text-info border border-line"
    >{label}</button>
  );

  return (
    <div className="w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap flex-shrink-0">
        {!locked && (
          <>
            <button onClick={doUndo} disabled={!history.canUndo} title="Undo (Ctrl+Z)"
              className="p-1.5 rounded border border-line bg-surface-hover text-ink hover:bg-info/10 hover:text-info disabled:opacity-40">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={doRedo} disabled={!history.canRedo} title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
              className="p-1.5 rounded border border-line bg-surface-hover text-ink hover:bg-info/10 hover:text-info disabled:opacity-40">
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-line mx-1" />
            {toolBtn('+ Row', ops.appendRow, 'Add row at bottom')}
            {toolBtn('+ Col', ops.appendCol, 'Add column at right')}
            <span className="w-px h-4 bg-line mx-1" />
            {sel && toolBtn('↑ Row', ops.insertRowAbove, 'Insert row above selection')}
            {sel && toolBtn('↓ Row', ops.insertRowBelow, 'Insert row below selection')}
            {sel && toolBtn('← Col', ops.insertColLeft, 'Insert column left of selection')}
            {sel && toolBtn('Col →', ops.insertColRight, 'Insert column right of selection')}
            {sel && toolBtn('✕ Row', ops.deleteRows, `Delete ${selRowCount > 1 ? selRowCount + ' rows' : 'row'}`)}
            {sel && toolBtn('✕ Col', ops.deleteCols, `Delete ${selColCount > 1 ? selColCount + ' columns' : 'column'}`)}
            {sel && toolBtn('Clear', ops.clearSel, 'Clear selected cells')}
            <span className="w-px h-4 bg-line mx-1" />
          </>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setHelperAt({ x: e.clientX, y: e.clientY + 10 }); }}
          title="Insert function"
          className="px-2 py-1 text-xs font-semibold rounded border border-line bg-surface-hover text-info hover:bg-info/10"
        >
          fx
        </button>
        <button
          onClick={() => setShowTotals(v => !v)}
          title="Toggle totals row"
          className={`px-2 py-1 text-xs font-semibold rounded border ${showTotals ? 'bg-info/10 text-info border-info/30' : 'bg-surface-hover text-dim border-line'}`}
        >
          Σ
        </button>
        {toolbarExtras}
        <div className="flex-1" />
        {sel && <span className="text-[10px] text-dim font-mono mr-2">{selLabel}</span>}
        {!locked && (
          <button
            onClick={handleSave}
            disabled={!(dirty || forceDirty) || saving}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${
              (dirty || forceDirty) && !saving ? 'bg-info text-white hover:bg-info/90' : 'bg-surface-hover text-dim cursor-not-allowed'
            }`}
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving…' : (dirty || forceDirty) ? 'Save' : 'Saved'}
          </button>
        )}
      </div>

      {/* Formula bar — shows/edits the active cell's RAW content */}
      <FormulaBar
        cellRef={sel ? cellRef(sel.r1, sel.c1) : ''}
        rawValue={sel ? draftRows[sel.r1]?.[draftCols[sel.c1]?.key] : ''}
        locked={locked}
        onCommit={commitFromBar}
      />

      {/* Body: grid (+ optional kind-specific side panel, e.g. pivot) */}
      <div className="flex gap-3 flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-auto border border-line rounded">
          <GridCanvas
            cols={draftCols}
            rows={draftRows}
            evaluated={evaluated}
            locked={locked}
            selection={sel}
            editing={editing}
            draftCell={draftCell}
            onDraftCellChange={setDraftCell}
            onCommitEdit={commitCell}
            onCancelEdit={() => setEditing(null)}
            onCellMouseDown={onCellMouseDown}
            onCellDoubleClick={(e, r, c) => { selectCell(r, c); startEdit(r, c); }}
            onCellMouseEnter={onCellMouseEnter}
            onCellContextMenu={(e, r, c) => {
              if (!sel || r < sel.r0 || r > sel.r1 || c < sel.c0 || c > sel.c1) selectCell(r, c);
              openMenu(e, 'cell', r);
            }}
            onRowHeaderClick={onRowHeaderClick}
            onRowHeaderContextMenu={(e, r) => { onRowHeaderClick(e, r); openMenu(e, 'row', r); }}
            onColHeaderClick={onColHeaderClick}
            onColHeaderContextMenu={(e, c) => { onColHeaderClick(e, c); openMenu(e, 'col', c); }}
            onColHeaderMouseDown={!locked ? onColResizeStart : undefined}
            colWidths={colWidths}
            totals={totals}
            fillPreview={fillPreview}
            fillHandle={!locked && sel && !editing ? { onMouseDown: startFill } : null}
          />
        </div>
        {sidePanel}
      </div>

      <div className="flex items-center justify-between mt-1.5 flex-shrink-0">
        <p className="text-[10px] text-dim">
          Click to select · double-click or type to edit · Enter/Tab/arrows move · Ctrl+Z undo · drag corner to fill · right-click for row/column actions
        </p>
        <SelectionStatusBar evaluated={evaluated} sel={sel} />
        {footer}
      </div>

      {helperAt && (
        <FormulaHelper
          anchorX={helperAt.x} anchorY={helperAt.y}
          onInsert={insertFormula}
          onClose={() => setHelperAt(null)}
        />
      )}

      {menu && (
        <TableContextMenu
          x={menu.x} y={menu.y} kind={menu.kind}
          locked={locked}
          onClose={() => setMenu(null)}
          onAction={(action) => {
            const map = {
              insertRowAbove: ops.insertRowAbove, insertRowBelow: ops.insertRowBelow,
              deleteRows: ops.deleteRows,
              insertColLeft: ops.insertColLeft, insertColRight: ops.insertColRight,
              deleteCols: ops.deleteCols,
              clear: ops.clearSel
            };
            map[action]?.();
            setMenu(null);
          }}
        />
      )}
    </div>
  );
};

export default FullTableEditor;
