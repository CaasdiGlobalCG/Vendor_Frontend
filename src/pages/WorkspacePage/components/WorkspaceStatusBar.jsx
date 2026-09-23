import React from 'react';
import { Minus, Plus, Hand, Pencil, Palette } from 'lucide-react';

const WorkspaceStatusBar = ({
  elementCount = 0,
  syncStatus = 'idle',
  lastSavedAt,
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  onFitView,
  onOpenPenTools,
  canvasTheme = 'slate',
  onSelectCanvasTheme,
  onLeaveWorkspace,
}) => {
  const formatSavedTime = () => {
    if (syncStatus === 'saving') return 'Saving...';
    if (!lastSavedAt) return 'Saved just now';
    return 'Saved just now';
  };

  const themes = [
    { id: 'slate', name: 'Cool Slate', color: '#f8fafc', border: '#cbd5e1' },
    { id: 'white', name: 'Studio White', color: '#ffffff', border: '#e2e8f0' },
    { id: 'blueprint', name: 'Blueprint', color: '#f0f4f8', border: '#94a3b8' },
  ];

  return (
    <footer className="ws-statusbar" data-workspace-statusbar>
      {/* Element Count */}
      <span className="font-medium text-ink">
        {elementCount} {elementCount === 1 ? 'element on canvas' : 'elements on canvas'}
      </span>

      <span className="text-dim">·</span>

      {/* Save Status */}
      <span className="text-dim">
        {formatSavedTime()}
      </span>

      <div style={{ flex: 1 }} />

      {/* Canvas Theme Switcher */}
      <div className="flex items-center gap-1.5 mr-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-dim">Canvas:</span>
        <div className="flex items-center gap-1 bg-surface-hover p-0.5 rounded-md border border-line">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectCanvasTheme && onSelectCanvasTheme(t.id)}
              className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                canvasTheme === t.id ? 'scale-110 ring-2 ring-info' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: t.color, borderColor: t.border }}
              title={`Canvas theme: ${t.name}`}
            />
          ))}
        </div>
      </div>

      <div className="w-px h-3.5 bg-surface-hover" />

      {/* Pen Tool button */}
      {onOpenPenTools && (
        <button
          onClick={onOpenPenTools}
          className="ws-zoom-btn"
          title="Drawing pen tools"
        >
          <Pencil className="w-3.5 h-3.5 text-dim" />
        </button>
      )}

      {/* Zoom Controls */}
      <div className="ws-zoom-ctrl">
        <button
          onClick={onZoomOut}
          className="ws-zoom-btn"
          title="Zoom out"
        >
          <Minus className="w-3.5 h-3.5 text-dim" />
        </button>

        <span className="ws-zoom-val">{Math.round(zoomLevel)}%</span>

        <button
          onClick={onZoomIn}
          className="ws-zoom-btn"
          title="Zoom in"
        >
          <Plus className="w-3.5 h-3.5 text-dim" />
        </button>

        {onFitView && (
          <button
            onClick={onFitView}
            className="ws-zoom-btn ml-1"
            title="Fit view to all elements"
          >
            <Hand className="w-3.5 h-3.5 text-dim" />
          </button>
        )}
      </div>

      {/* Leave Workspace Link */}
      {onLeaveWorkspace && (
        <button
          onClick={onLeaveWorkspace}
          className="ws-leave-link text-xs border-none bg-none p-0 cursor-pointer font-medium"
          title="Exit to dashboard"
        >
          Leave workspace
        </button>
      )}
    </footer>
  );
};

export default WorkspaceStatusBar;
