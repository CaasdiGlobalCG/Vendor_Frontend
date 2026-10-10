import React, { useMemo, useState, useEffect } from 'react';
import { Save, TableProperties } from 'lucide-react';
import { normalizeColumns } from '../../utils/tableEngine';
import EditableGrid from './EditableGrid';
import PivotResultPanel from './fullscreen/PivotResultPanel';

/**
 * PivotTable — pivot summary of the node's own source data.
 * Config (group keys, measures, column dimension, sort) saves with the table.
 * The result pane is PivotResultPanel — shared with the full-view split view.
 */
const PivotTable = ({ columns: columnsProp = [], rows: rowsProp = [], config: configProp, onSave, locked = false, editSignal = 0, toolbarExtras = null, expanded = false, onDraftChange = null }) => {
  const [cols, setCols] = useState(() => normalizeColumns(columnsProp));
  const [rows, setRows] = useState(() => rowsProp.map(r => ({ ...r })));
  const [config, setConfig] = useState(() => configProp || {});
  const [showSource, setShowSource] = useState(false);
  const [saving, setSaving] = useState(false);

  // Menu "Edit" → open the source-data editor
  useEffect(() => {
    if (editSignal > 0 && !locked) setShowSource(true);
  }, [editSignal]);

  // Report the live draft upward — see EditableGrid (portal remount on
  // fullscreen toggle restores the draft through props).
  useEffect(() => {
    onDraftChange?.(cols, rows, config);
  }, [cols, rows, config]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSourceSave = async (newCols, newRows) => {
    setCols(normalizeColumns(newCols));
    setRows(newRows.map(r => ({ ...r })));
    if (onSave) await onSave(normalizeColumns(newCols), newRows, config);
  };

  const handleConfigSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(cols, rows, config);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      {/* Header: affordances + save */}
      <div className="flex items-center gap-2 mb-2">
        <TableProperties className="w-3.5 h-3.5 text-info" />
        {toolbarExtras}
        <div className="flex-1" />
        {!locked && (
          <button
            onClick={handleConfigSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-info text-white hover:bg-info/90 disabled:bg-info/50"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {/* Shared pivot config + result (same component as the full-view pane) */}
      <PivotResultPanel
        cols={cols}
        rows={rows}
        config={config}
        onConfigChange={setConfig}
        locked={locked}
      />

      {/* Source data toggle */}
      <button
        onClick={() => setShowSource(s => !s)}
        className="text-xs text-info hover:underline my-2"
      >
        {showSource ? 'Hide source data' : 'Edit source data'}
      </button>
      {showSource && (
        <EditableGrid
          columns={cols}
          rows={rows}
          onSave={handleSourceSave}
          locked={locked}
          maxHeight={expanded ? 'max-h-none' : 'max-h-48'}
        />
      )}
    </div>
  );
};

export default PivotTable;
