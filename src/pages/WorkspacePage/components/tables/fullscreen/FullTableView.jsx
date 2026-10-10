import React, { useCallback, useEffect, useState } from 'react';
import { List, TableProperties } from 'lucide-react';
import FullTableEditor from './FullTableEditor';
import PivotResultPanel from './PivotResultPanel';
import DataTable from '../DataTable';
import { normalizeColumns } from '../../../utils/tableEngine';

/**
 * FullTableView — kind-aware orchestrator for the full-page table editor.
 *
 * Every table kind gets the same Excel-grade grid (FullTableEditor); kind
 * differences become extra chrome around it:
 *
 *   basic-table  → grid only
 *   data-table   → grid + "Paged view" toggle that swaps in the classic
 *                  sortable/filterable/paginated DataTable
 *   pivot-table  → split view: source grid on the left, live pivot result
 *                  panel on the right (config edits flow back through onSave)
 *
 * Draft state: the editor reports (cols, rows) via onEditorDraft; this view
 * merges in pivot config and reports the whole draft upward so compact-mode
 * components rehydrate unchanged on exit.
 */
const FullTableView = ({
  kind = 'basic-table',
  columns = [],
  rows = [],
  config = null,
  locked = false,
  onSave,
  editSignal = 0,
  onDraftChange = null
}) => {
  const [latestCols, setLatestCols] = useState(() => normalizeColumns(columns));
  const [latestRows, setLatestRows] = useState(() => rows.map(r => ({ ...r })));
  const [cfg, setCfg] = useState(() => config || {});
  const [cfgDirty, setCfgDirty] = useState(false); // config edits aren't editor-dirty — force the Save button
  const [paged, setPaged] = useState(false); // data-table: spreadsheet vs classic paged view

  const handleEditorDraft = useCallback((cols, rws, cfg) => {
    setLatestCols(cols);
    setLatestRows(rws);
    if (cfg) setCfg(cfg); // DataTable carries view state inside its config draft
  }, []);

  // Column widths persist inside config so they round-trip with the table
  const handleWidthsChange = useCallback((widths) => {
    setCfg(prev => ({ ...prev, colWidths: widths }));
    setCfgDirty(true);
  }, []);

  // Bubble the complete draft upward (TableRenderer rehydrates compact view)
  useEffect(() => {
    onDraftChange?.(latestCols, latestRows, cfg);
  }, [latestCols, latestRows, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save always carries current config — pivot config edits persist with data
  const handleSave = useCallback(async (cols, rws, cfgOverride) => {
    await onSave?.(cols, rws, cfgOverride ?? cfg);
    setCfgDirty(false);
  }, [onSave, cfg]);
  const handleConfigChange = useCallback((next) => { setCfg(next); setCfgDirty(true); }, []);

  const dataTableToggle = kind === 'data-table' ? (
    <button
      onClick={(e) => { e.stopPropagation(); setPaged(v => !v); }}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${
        paged ? 'bg-info/10 text-info border-info/30' : 'bg-surface-hover text-dim border-line'
      }`}
      title={paged ? 'Switch to spreadsheet view (all rows)' : 'Switch to paged data view'}
    >
      <List className="w-3 h-3" />
      {paged ? 'Spreadsheet view' : 'Paged view'}
    </button>
  ) : null;

  const pivotPanel = kind === 'pivot-table' ? (
    <div className="w-[340px] flex-shrink-0 border border-line rounded p-3 overflow-y-auto">
      <PivotResultPanel
        cols={latestCols}
        rows={latestRows}
        config={cfg}
        onConfigChange={handleConfigChange}
        locked={locked}
      />
    </div>
  ) : null;

  // Data-table "paged" mode renders the classic component with current drafts
  if (kind === 'data-table' && paged) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
          {dataTableToggle}
          <span className="text-[10px] text-dim">paged view — sorting, filtering, pagination</span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <DataTable
            columns={latestCols}
            rows={latestRows}
            config={cfg}
            onSave={handleSave}
            locked={locked}
            expanded
            onDraftChange={handleEditorDraft}
          />
        </div>
      </div>
    );
  }

  return (
    <FullTableEditor
      columns={latestCols}
      rows={latestRows}
      onSave={handleSave}
      locked={locked}
      editSignal={editSignal}
      toolbarExtras={dataTableToggle}
      sidePanel={pivotPanel}
      onDraftChange={handleEditorDraft}
      colWidths={cfg?.colWidths || null}
      onWidthsChange={handleWidthsChange}
      forceDirty={cfgDirty}
    />
  );
};

export default FullTableView;
