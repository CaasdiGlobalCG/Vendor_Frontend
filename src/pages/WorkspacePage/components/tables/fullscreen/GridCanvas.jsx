import React from 'react';
import { cellRef, colLetter, isFormula } from '../../../utils/tableEngine';

/**
 * GridCanvas — the presentational spreadsheet grid used inside full view.
 *
 * Dumb by design: it owns no table state. The parent editor passes raw rows,
 * an evaluated display grid, the current selection {r0,c0,r1,c1}, and the
 * editing cell, and receives intents back through callbacks.
 *
 * Selection model: a normalized rectangle. A single cell is r0===r1,c0===c1;
 * a whole row click selects {r0:i,c0:0,r1:i,c1:lastCol}; a whole column
 * selects {r0:0,c0:i,r1:lastRow,c1:i}.
 */
const inSelection = (sel, r, c) =>
  !!sel && r >= sel.r0 && r <= sel.r1 && c >= sel.c0 && c <= sel.c1;

const GridCanvas = ({
  cols = [],
  rows = [],
  evaluated = [],
  locked = false,
  selection = null,
  editing = null,          // {r, c} | null
  draftCell = '',
  onDraftCellChange,
  onCommitEdit,
  onCancelEdit,
  onCellMouseDown,         // (event, r, c) — select
  onCellDoubleClick,       // (event, r, c) — begin editing
  onCellMouseEnter,        // (event, r, c) — drag selection (phase 2)
  onCellContextMenu,       // (event, r, c)
  onRowHeaderClick,        // (event, r)
  onRowHeaderContextMenu,  // (event, r)
  onColHeaderClick,        // (event, c)
  onColHeaderContextMenu,  // (event, c)
  onColHeaderMouseDown,    // (event, c) — column-resize start (phase 4)
  colWidths = null,        // {key: px} — phase 4 column resize
  fillHandle = null,       // {onMouseDown} — rendered at selection bottom-right
  fillPreview = null,      // {r0,c0,r1,c1} — highlighted fill-drag target
  totals = null            // display values per column — pinned Σ footer row
}) => {
  const selRow = (i) => selection && selection.r0 === selection.r1 && selection.r0 === i && selection.c1 === cols.length - 1;
  const selCol = (i) => selection && selection.c0 === selection.c1 && selection.c0 === i && selection.r1 === rows.length - 1;

  return (
    <table className="border-collapse text-xs select-none" data-testid="grid-canvas">
      <thead className="bg-canvas sticky top-0 z-10">
        <tr>
          <th className="border border-line px-1 py-1 w-9 text-dim font-normal bg-canvas sticky left-0 z-20">#</th>
          {cols.map((col, ci) => (
            <th
              key={col.key}
              onClick={(e) => onColHeaderClick?.(e, ci)}
              onContextMenu={(e) => onColHeaderContextMenu?.(e, ci)}
              style={colWidths?.[col.key] ? { width: colWidths[col.key], minWidth: colWidths[col.key] } : undefined}
              className={`border border-line px-1 py-1 min-w-[90px] relative cursor-pointer ${selCol(ci) ? 'bg-info/15' : ''}`}
            >
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-dim font-normal w-3">{colLetter(ci)}</span>
                <span className="font-semibold text-ink flex-1 text-left truncate">{col.label}</span>
              </div>
              {onColHeaderMouseDown && (
                <div
                  className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-info/40"
                  onMouseDown={(e) => { e.stopPropagation(); onColHeaderMouseDown(e, ci); }}
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`col-resize-${ci}`}
                />
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={row.id || ri} className="hover:bg-canvas/60">
            <td
              onClick={(e) => onRowHeaderClick?.(e, ri)}
              onContextMenu={(e) => onRowHeaderContextMenu?.(e, ri)}
              className={`border border-line px-1 py-0.5 text-center text-dim bg-canvas cursor-pointer sticky left-0 z-[5] ${selRow(ri) ? 'bg-info/15 text-info' : ''}`}
            >
              {ri + 1}
            </td>
            {cols.map((col, ci) => {
              const raw = row[col.key];
              const shown = evaluated[ri]?.[ci];
              const isEditingCell = editing?.r === ri && editing?.c === ci;
              const selected = inSelection(selection, ri, ci);
              const inFill = inSelection(fillPreview, ri, ci) && !selected;
              return (
                <td
                  key={col.key}
                  data-cell={`${ri}:${ci}`}
                  className={`border border-line px-0 py-0 ${locked ? '' : 'cursor-cell'} ${isFormula(raw) ? 'bg-info/5' : ''} ${selected ? 'bg-info/10 outline outline-1 -outline-offset-1 outline-info' : ''} ${inFill ? 'bg-info/15 outline-dashed outline-1 -outline-offset-1 outline-info/60' : ''}`}
                  onMouseDown={(e) => onCellMouseDown?.(e, ri, ci)}
                  onDoubleClick={(e) => onCellDoubleClick?.(e, ri, ci)}
                  onMouseEnter={(e) => onCellMouseEnter?.(e, ri, ci)}
                  onContextMenu={(e) => onCellContextMenu?.(e, ri, ci)}
                  title={isFormula(raw) ? raw : cellRef(ri, ci)}
                >
                  {isEditingCell ? (
                    <input
                      autoFocus
                      aria-label="Cell editor"
                      value={draftCell}
                      onChange={(e) => onDraftCellChange?.(e.target.value)}
                      onBlur={onCommitEdit}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); onCommitEdit?.(e.key === 'Tab' ? 'tab' : 'enter'); }
                        if (e.key === 'Escape') onCancelEdit?.();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-info"
                    />
                  ) : (
                    <div className="px-2 py-1.5 min-h-[26px] text-ink truncate max-w-[260px] relative">
                      {shown === undefined || shown === null || shown === ''
                        ? <span className="text-dim/40">·</span>
                        : String(shown)}
                      {fillHandle && selected && selRowAnchor(selection, ri, ci) && (
                        <div
                          data-testid="fill-handle"
                          onMouseDown={fillHandle.onMouseDown}
                          className="absolute bottom-0 right-0 w-2 h-2 bg-info cursor-crosshair translate-x-1/2 translate-y-1/2 z-10"
                        />
                      )}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={cols.length + 1} className="border border-line px-3 py-4 text-center text-dim">
              No rows — use "+ Row" to add one
            </td>
          </tr>
        )}
      </tbody>
      {totals && (
        <tfoot className="sticky bottom-0 bg-canvas">
          <tr data-testid="totals-row">
            <td className="border border-line px-1 py-0.5 text-center text-dim font-semibold sticky left-0 bg-canvas">Σ</td>
            {cols.map((col, ci) => (
              <td key={col.key} className="border border-line px-2 py-1 text-right font-semibold text-ink">
                {totals[ci]}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
};

// The fill handle anchors on the selection's bottom-right corner cell.
const selRowAnchor = (sel, r, c) => r === sel.r1 && c === sel.c1;

export default GridCanvas;
