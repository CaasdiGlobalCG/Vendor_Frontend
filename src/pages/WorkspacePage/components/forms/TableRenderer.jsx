import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X, Table2 } from 'lucide-react';
import EditableGrid from '../tables/EditableGrid';
import DataTable from '../tables/DataTable';
import PivotTable from '../tables/PivotTable';
import FullTableView from '../tables/fullscreen/FullTableView';

/**
 * TableRenderer — routes a table element to its renderer by data.id.
 *
 * Palette types:  basic-table → EditableGrid (Excel-style, formulas)
 *                 data-table  → DataTable   (sort / filter / paginate)
 *                 pivot-table → PivotTable  (group-by summary)
 * Legacy ids map to the closest modern renderer so old canvases keep working.
 *
 * Data lives in data.customTableData = { columns, data, config } and persists
 * via onSave(cols, rows, config) → parent calls persistNodeDataPatch.
 *
 * Full view: the ⛶ toolbar button swaps the inline table for a fullscreen
 * overlay via createPortal to document.body — required because React Flow
 * positions nodes with CSS transform, which would trap `position: fixed`
 * inside the node box. Swapping trees remounts the table, so each table
 * reports its draft via onDraftChange and we feed it back as props — unsaved
 * edits survive the toggle.
 */
const TableRenderer = ({ data, locked, onSave, editSignal = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(null); // { columns, rows, config } — latest edits, saved or not

  // Esc exits full view
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  const saved = data?.customTableData || {};
  const columns = draft?.columns || saved.columns || ['name', 'email', 'role', 'status'];
  const rows = draft?.rows || saved.data || [
    { id: 'r1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 'r2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 'r3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' }
  ];
  const config = draft?.config || saved.config;

  const handleDraftChange = (draftCols, draftRows, draftConfig) =>
    setDraft({ columns: draftCols, rows: draftRows, config: draftConfig });

  const expandButton = (
    <button
      onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
      className="flex items-center gap-1 px-2 py-1 text-xs bg-surface-hover text-dim rounded hover:bg-info/10 hover:text-info"
      title={expanded ? 'Exit full view (Esc)' : 'Open full view'}
    >
      {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
      {expanded ? 'Exit' : 'Full view'}
    </button>
  );

  const common = {
    columns, rows, onSave, locked, editSignal, expanded,
    toolbarExtras: expandButton,
    onDraftChange: handleDraftChange
  };

  // Prefer data.id (set on creation), then tableType, then infer from the
  // element name — tables saved before those fields existed have neither, and
  // would otherwise all render as the Excel Grid.
  const inferFromName = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('pivot')) return 'pivot-table';
    if (n.includes('data')) return 'data-table';
    return 'basic-table';
  };
  const kind = data?.id || data?.tableType || inferFromName(data?.name);

  const kindLabel = {
    'data-table': 'Data Table', 'pivot-table': 'Pivot Table'
  }[kind] || 'Excel Grid';

  let table;
  switch (kind) {
    case 'data-table':
    case 'sortable-table':
    case 'filterable-table':
    case 'paginated-table':
      table = <DataTable {...common} config={config} />;
      break;

    case 'pivot-table':
      table = <PivotTable {...common} config={config} />;
      break;

    case 'basic-table':
    case 'editable-table':
    case 'expandable-table':
    default:
      table = <EditableGrid {...common} maxHeight={expanded ? 'max-h-none' : 'max-h-64'} />;
      break;
  }

  if (!expanded) return table;

  // The overlay is portaled to document.body — inside the React Flow viewport
  // a `fixed` element would be positioned relative to the transformed node,
  // not the screen. stopPropagation keeps clicks from bubbling through the
  // React tree to the canvas node's own handlers.
  return (
    <>
      <div className="flex items-center gap-2 px-2 py-3 text-xs text-dim border border-dashed border-line rounded">
        <Table2 className="w-3.5 h-3.5" />
        Opened in full view — press Esc to return
      </div>
      {createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-surface rounded-xl shadow-2xl border border-line w-full max-w-[96vw] h-full max-h-[94vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${data?.name || 'Table'} — full view`}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Table2 className="w-4 h-4 text-info flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{data?.name || data?.title || 'Table'}</p>
                  <p className="text-[10px] text-dim">{kindLabel} · {rows.length} rows · Esc or click outside to close</p>
                </div>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 rounded hover:bg-surface-hover"
                title="Close full view"
              >
                <X className="w-4 h-4 text-dim" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {expanded ? (
                <FullTableView
                  kind={kind}
                  columns={columns}
                  rows={rows}
                  config={config}
                  locked={locked}
                  onSave={onSave}
                  editSignal={editSignal}
                  onDraftChange={handleDraftChange}
                />
              ) : table}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default TableRenderer;
