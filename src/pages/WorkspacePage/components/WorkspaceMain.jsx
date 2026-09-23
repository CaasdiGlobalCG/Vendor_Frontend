import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Hand, Maximize2, Minimize2, Users, Wifi, WifiOff, Paperclip, Pencil, X, Trash2, Undo2, CheckSquare, FileText, ChevronRight } from 'lucide-react';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import CanvasWorkspace from './CanvasWorkspace';
import TaskSubtasksView from './TaskSubtasksView';
import LayerContentView from './LayerContentView';
import EmptyTasksState from './EmptyTasksState';
import EmptySubtasksState from './EmptySubtasksState';
import { UploadProvider } from './forms/UploadManager';
import authFetch from '../../../utils/authFetch';

const WorkspaceMain = ({
  selectedTask,
  selectedSubtask,
  selectedLayer,
  selectedLayerItem,
  sidebarCollapsed,
  zoomLevel,
  showElementsPanel,
  onBackToHome,
  onBackToTask,
  onBackToLayer,
  onTaskClick,
  onSubtaskClick,
  onShowAddSubtaskModal,
  onRenameSubtask,
  onUpdateSubtask,
  memberOptions,
  onLayerItemClick,
  onToggleSidebars,
  workspace,
  onSaveWorkspace,
  onRefreshWorkspace,
  tasks,
  onCreateTask,
  onCreateSubtask,  onActivityCreated,
  userRole,
  userPermissions,
  onZoomChange,
  canvasWebSocket,
  workspaceCollaborators,
  focusMode,
}) => {
  const canvasRef = useRef(null);
  
  // Make canvas ref globally accessible for approval operations
  useEffect(() => {
    window.canvasWorkspaceRef = canvasRef;
    return () => {
      window.canvasWorkspaceRef = null;
    };
  }, [canvasRef]);
  const [zoomInput, setZoomInput] = useState(String(zoomLevel));
  const [isZoomInputFocused, setIsZoomInputFocused] = useState(false);
  const [isPenToolbarActive, setIsPenToolbarActive] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [penThickness, setPenThickness] = useState(3);
  const [isUploadingDrawing, setIsUploadingDrawing] = useState(false);
  const toolbarUploadInputRef = useRef(null);

  const drawingPalette = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#111827'];

  useEffect(() => {
    if (!isZoomInputFocused) {
      setZoomInput(String(zoomLevel));
    }
  }, [zoomLevel, isZoomInputFocused]);

  const clampZoom = useCallback((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return zoomLevel;
    }
    return Math.min(Math.max(Math.round(numeric), 10), 200);
  }, [zoomLevel]);

  const applyZoom = useCallback((value) => {
    if (value === '') {
      const fallback = clampZoom(zoomLevel);
      setZoomInput(String(fallback));
      canvasRef.current?.setZoomLevel?.(fallback);
      onZoomChange?.(fallback);
      return;
    }

    const clamped = clampZoom(value);
    canvasRef.current?.setZoomLevel?.(clamped);
    onZoomChange?.(clamped);
    setZoomInput(String(clamped));
  }, [clampZoom, onZoomChange, zoomLevel]);

  const handleZoomIn = () => {
    canvasRef.current?.zoomIn?.();
  };

  const handleZoomOut = () => {
    canvasRef.current?.zoomOut?.();
  };

  const handleFitView = () => {
    canvasRef.current?.fitView?.();
  };

  const handleZoomInputChange = (event) => {
    const { value } = event.target;
    if (!/^\d*$/.test(value)) {
      return;
    }

    setZoomInput(value);

    if (value === '') {
      return;
    }

    const clamped = clampZoom(value);
    canvasRef.current?.setZoomLevel?.(clamped);
    onZoomChange?.(clamped);
  };

  const handleZoomInputBlur = () => {
    setIsZoomInputFocused(false);
    applyZoom(zoomInput);
  };

  const handleZoomInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyZoom(zoomInput);
      setIsZoomInputFocused(false);
      event.target.blur();
    }
  };

  const handleZoomInputFocus = () => {
    setIsZoomInputFocused(true);
  };

  useEffect(() => {
    if (!canvasRef.current?.setDrawingMode) return;
    canvasRef.current.setDrawingMode(isPenToolbarActive);
  }, [isPenToolbarActive]);

  useEffect(() => {
    if (!canvasRef.current?.setDrawingToolSettings) return;
    canvasRef.current.setDrawingToolSettings({
      color: penColor,
      thickness: penThickness,
    });
  }, [penColor, penThickness]);

  const closePenToolbar = () => {
    setIsPenToolbarActive(false);
  };

  const handleToolbarUploadClick = () => {
    if (!selectedSubtask?.id) {
      alert('Select a subtask first to upload drawings.');
      return;
    }
    toolbarUploadInputRef.current?.click();
  };

  const handleToolbarFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    if (!workspace?.workspaceId || !selectedSubtask?.id) {
      alert('Workspace or subtask context is missing.');
      return;
    }

    setIsUploadingDrawing(true);
    const uploadedFiles = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspaceId', workspace.workspaceId);
        formData.append('taskId', selectedTask?.id || '');
        formData.append('subtaskId', selectedSubtask.id);

        const response = await authFetch('/api/workspace-files/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || `Upload failed for ${file.name}`);
        }

        const result = await response.json();
        if (result?.file) {
          uploadedFiles.push(result.file);
        }
      }

      if (uploadedFiles.length > 0) {
        await canvasRef.current?.addDrawingFilesToCanvas?.(uploadedFiles, {
          source: 'bottom-toolbar-upload',
        });
      }
    } catch (error) {
      console.error('Toolbar upload failed:', error);
      alert(error.message || 'Failed to upload drawing files.');
    } finally {
      setIsUploadingDrawing(false);
    }
  };

  const contentOffsetClass = (selectedTask || selectedLayer) ? 'box-border h-full pt-16' : 'h-full';

  return (
    <div className="flex-1 bg-transparent h-full relative transition-all duration-300 ease-in-out min-w-0">
      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation
        selectedTask={selectedTask}
        selectedSubtask={selectedSubtask}
        selectedLayer={selectedLayer}
        selectedLayerItem={selectedLayerItem}
        onBackToHome={onBackToHome}
        onBackToTask={onBackToTask}
        onBackToLayer={onBackToLayer}
      />

      {/* Focus mode toggle button — always visible */}
      <button
        onClick={onToggleSidebars}
        className="absolute top-20 left-3 z-10 p-2 bg-white/90 backdrop-blur-sm border border-line rounded-lg  hover:bg-canvas transition-colors group"
        title={focusMode ? 'Show panels (Ctrl+Shift+H)' : 'Focus mode (Ctrl+Shift+H)'}
        aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
      >
        {focusMode
          ? <Minimize2 className="w-4 h-4 text-dim group-hover:text-ink" />
          : <Maximize2 className="w-4 h-4 text-dim group-hover:text-ink" />}
      </button>

      {/* Main Workspace Content */}
      {!tasks || tasks.length === 0 ? (
        // Show empty tasks state when no tasks exist
        <EmptyTasksState onCreateTask={onCreateTask} />
      ) : selectedTask ? (
        !selectedTask.subtasks || selectedTask.subtasks.length === 0 ? (
          // Show empty subtasks state when task has no subtasks
          <EmptySubtasksState 
            selectedTask={selectedTask} 
            onCreateSubtask={onCreateSubtask} 
          />
        ) : selectedSubtask ? (
          // Show canvas when subtask is selected
          <div className={contentOffsetClass}>
            <CanvasWorkspace
              ref={canvasRef}
              selectedTask={selectedTask}
              selectedSubtask={selectedSubtask}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebars={onToggleSidebars}
              workspace={workspace}
              onSaveWorkspace={onSaveWorkspace}
              onRefreshWorkspace={onRefreshWorkspace}
              onActivityCreated={onActivityCreated}
              userRole={userRole}
              userPermissions={userPermissions}
              onZoomChange={onZoomChange}
              canvasWebSocket={canvasWebSocket}
              workspaceCollaborators={workspaceCollaborators}
            />
          </div>
        ) : (
          // Show subtasks list when task is selected but no subtask
          <div className={contentOffsetClass}>
            <TaskSubtasksView
              selectedTask={selectedTask}
              workspaceId={workspace?.workspaceId}
              onSubtaskClick={onSubtaskClick}
              onShowAddSubtaskModal={onShowAddSubtaskModal}
              onQuickAddSubtask={onCreateSubtask}
              onRenameSubtask={onRenameSubtask}
              onUpdateSubtask={onUpdateSubtask}
              memberOptions={memberOptions}
            />
          </div>
        )
      ) : selectedLayer ? (
        <div className={contentOffsetClass}>
          <LayerContentView
            selectedLayer={selectedLayer}
            selectedLayerItem={selectedLayerItem}
            onLayerItemClick={onLayerItemClick}
          />
        </div>
      ) : tasks && tasks.length > 0 ? (
        // Home view — hierarchical tree of tasks and their subtask canvases
        <div className="h-full overflow-y-auto bg-canvas px-6 py-10">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-base font-semibold text-ink mb-1">Workspace</h2>
            <p className="text-xs text-dim mb-5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} · pick one to open its canvas
            </p>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id || task.name} className="bg-surface border border-line rounded-xl overflow-hidden ">
                  <button
                    onClick={() => onTaskClick?.(task)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas transition-colors text-left"
                  >
                    <div className="p-1.5 bg-info/10 rounded-lg">
                      <CheckSquare className="w-4 h-4 text-info" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{task.name || 'Untitled task'}</div>
                      <div className="text-[11px] text-dim">
                        {task.subtasks?.length || 0} subtask{(task.subtasks?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-dim" />
                  </button>
                  {task.subtasks?.length > 0 && (
                    <div className="border-t border-line">
                      {task.subtasks.map((st, i) => (
                        <button
                          key={st.id || i}
                          onClick={() => { onTaskClick?.(task); onSubtaskClick?.(st); }}
                          className="w-full flex items-center gap-3 pl-11 pr-4 py-2.5 hover:bg-info transition-colors text-left group"
                        >
                          <FileText className="w-3.5 h-3.5 text-dim group-hover:text-info" />
                          <span className="flex-1 text-[13px] text-ink truncate">{st.name || st.title || 'Untitled'}</span>
                          {st.canvasData?.nodes?.length > 0 && (
                            <span className="text-[10px] text-dim">{st.canvasData.nodes.length} elements</span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-dim group-hover:text-info" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ws-canvas-empty">
          <div className="ws-drop-frame">
            <svg className="ws-drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            <h3 className="ws-drop-title">Nothing here yet</h3>
            <p className="ws-drop-sub">Drag a block from the left, or drop in a template to start this document.</p>
            <button 
              className="ws-drop-cta"
              onClick={() => {
                if (tasks && tasks.length > 0) {
                  onTaskClick?.(tasks[0]);
                  if (tasks[0].subtasks && tasks[0].subtasks.length > 0) {
                    onSubtaskClick?.(tasks[0].subtasks[0]);
                  } else {
                    onCreateSubtask?.({ title: 'Workspace Canvas' });
                  }
                } else {
                  onCreateTask?.({ name: 'Project Scope' });
                }
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              <span>Place a card</span>
            </button>
            <div className="ws-drop-or">
              or <a onClick={() => window.dispatchEvent(new CustomEvent('openDockTab', { detail: 'templates' }))}>browse templates →</a>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Zoom Controls + Status Bar */}
      {selectedSubtask && (
        <>
          <input
            ref={toolbarUploadInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleToolbarFilesSelected}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj"
          />

          <div className="absolute bottom-8 left-1/2 z-30 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-line rounded-xl shadow-xl px-3 py-2 flex items-center space-x-3">
            {!isPenToolbarActive ? (
              <>
                {/* Collaborators indicator */}
                {workspaceCollaborators && workspaceCollaborators.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5" title={`${workspaceCollaborators.length} collaborator${workspaceCollaborators.length > 1 ? 's' : ''} online`}>
                      <div className="flex -space-x-1.5">
                        {workspaceCollaborators.slice(0, 3).map((collab, i) => (
                          <div
                            key={collab.userId || i}
                            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'][i % 5], zIndex: 3 - i }}
                            title={collab.name || collab.userName || 'Collaborator'}
                          >
                            {(collab.name || collab.userName || '?').charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {workspaceCollaborators.length > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-surface-hover flex items-center justify-center text-[9px] font-semibold text-dim">
                            +{workspaceCollaborators.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-dim font-medium">{workspaceCollaborators.length}</span>
                    </div>
                    <div className="w-px h-5 bg-surface-hover"></div>
                  </>
                )}

                {/* Connection status dot */}
                {canvasWebSocket && (
                  <>
                    <div className="flex items-center gap-1" title={canvasWebSocket.isConnected ? 'Connected' : 'Disconnected'}>
                      <div className={`w-1.5 h-1.5 rounded-full ${canvasWebSocket.isConnected ? 'bg-cta' : 'bg-danger'}`} />
                      <span className="text-[10px] text-dim">{canvasWebSocket.isConnected ? 'Live' : 'Offline'}</span>
                    </div>
                    <div className="w-px h-5 bg-surface-hover"></div>
                  </>
                )}

                <button className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors" title="Zoom Out" onClick={handleZoomOut}>
                  <svg className="w-4 h-4 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors" title="Zoom In" onClick={handleZoomIn}>
                  <svg className="w-4 h-4 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </button>
                <div className="w-px h-5 bg-surface-hover"></div>
                <button className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors" title="Fit View" onClick={handleFitView}>
                  <Hand className="w-4 h-4 text-dim" />
                </button>

                <button
                  className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
                  title={isUploadingDrawing ? 'Uploading...' : 'Upload drawing'}
                  onClick={handleToolbarUploadClick}
                  disabled={isUploadingDrawing}
                >
                  <Paperclip className="w-4 h-4 text-dim" />
                </button>

                <button
                  className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
                  title="Open pen tools"
                  onClick={() => setIsPenToolbarActive(true)}
                >
                  <Pencil className="w-4 h-4 text-dim" />
                </button>

                <div className="w-px h-5 bg-surface-hover"></div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-canvas rounded-md">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={zoomInput}
                    onChange={handleZoomInputChange}
                    onFocus={handleZoomInputFocus}
                    onBlur={handleZoomInputBlur}
                    onKeyDown={handleZoomInputKeyDown}
                    className="w-12 bg-transparent text-xs font-semibold text-ink focus:outline-none text-center"
                    aria-label="Set zoom level"
                  />
                  <span className="text-xs font-semibold text-dim">%</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-info" />
                  <span className="text-xs font-semibold text-ink">Pen</span>
                </div>
                <div className="w-px h-5 bg-surface-hover"></div>

                <div className="flex items-center gap-1.5">
                  {drawingPalette.map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-5 h-5 rounded-full border-2 ${penColor === color ? 'border-line' : 'border-line'}`}
                      style={{ backgroundColor: color }}
                      title={`Set color ${color}`}
                    />
                  ))}
                </div>

                <div className="w-px h-5 bg-surface-hover"></div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-dim">Size</span>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={penThickness}
                    onChange={(e) => setPenThickness(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-[11px] font-semibold text-ink w-4 text-right">{penThickness}</span>
                </div>

                <div className="w-px h-5 bg-surface-hover"></div>

                <button
                  className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
                  title="Undo stroke"
                  onClick={() => canvasRef.current?.undoPenStroke?.()}
                >
                  <Undo2 className="w-4 h-4 text-dim" />
                </button>
                <button
                  className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
                  title="Clear drawing"
                  onClick={() => canvasRef.current?.clearPenDrawings?.()}
                >
                  <Trash2 className="w-4 h-4 text-dim" />
                </button>
                <button
                  className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                  title="Close pen tools"
                  onClick={closePenToolbar}
                >
                  <X className="w-4 h-4 text-danger" />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceMain;