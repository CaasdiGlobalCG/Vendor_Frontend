import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Hand, Maximize2, Minimize2, Users, Wifi, WifiOff, Paperclip, Pencil, X, Trash2, Undo2 } from 'lucide-react';
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

  return (
    <div className="flex-1 bg-gray-50 relative transition-all duration-300 ease-in-out min-w-0">
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
        className="absolute top-14 left-3 z-10 p-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors group"
        title={focusMode ? 'Show panels (Ctrl+Shift+H)' : 'Focus mode (Ctrl+Shift+H)'}
        aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
      >
        {focusMode
          ? <Minimize2 className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
          : <Maximize2 className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />}
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
        ) : (
          // Show subtasks list when task is selected but no subtask
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
        )
      ) : selectedLayer ? (
        <LayerContentView
          selectedLayer={selectedLayer}
          selectedLayerItem={selectedLayerItem}
          onLayerItemClick={onLayerItemClick}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Select a Task or Layer</h3>
            <p className="text-xs text-gray-500">Click on any task or layer from the left sidebar to view its workspace</p>
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

          <div className="absolute bottom-8 left-1/2 z-30 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl px-3 py-2 flex items-center space-x-3">
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
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] font-semibold text-gray-600">
                            +{workspaceCollaborators.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{workspaceCollaborators.length}</span>
                    </div>
                    <div className="w-px h-5 bg-gray-200"></div>
                  </>
                )}

                {/* Connection status dot */}
                {canvasWebSocket && (
                  <>
                    <div className="flex items-center gap-1" title={canvasWebSocket.isConnected ? 'Connected' : 'Disconnected'}>
                      <div className={`w-1.5 h-1.5 rounded-full ${canvasWebSocket.isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-[10px] text-gray-400">{canvasWebSocket.isConnected ? 'Live' : 'Offline'}</span>
                    </div>
                    <div className="w-px h-5 bg-gray-200"></div>
                  </>
                )}

                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Zoom Out" onClick={handleZoomOut}>
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Zoom In" onClick={handleZoomIn}>
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </button>
                <div className="w-px h-5 bg-gray-200"></div>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Fit View" onClick={handleFitView}>
                  <Hand className="w-4 h-4 text-gray-600" />
                </button>

                <button
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isUploadingDrawing ? 'Uploading...' : 'Upload drawing'}
                  onClick={handleToolbarUploadClick}
                  disabled={isUploadingDrawing}
                >
                  <Paperclip className="w-4 h-4 text-gray-600" />
                </button>

                <button
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Open pen tools"
                  onClick={() => setIsPenToolbarActive(true)}
                >
                  <Pencil className="w-4 h-4 text-gray-600" />
                </button>

                <div className="w-px h-5 bg-gray-200"></div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-gray-50 rounded-md">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={zoomInput}
                    onChange={handleZoomInputChange}
                    onFocus={handleZoomInputFocus}
                    onBlur={handleZoomInputBlur}
                    onKeyDown={handleZoomInputKeyDown}
                    className="w-12 bg-transparent text-xs font-semibold text-gray-700 focus:outline-none text-center"
                    aria-label="Set zoom level"
                  />
                  <span className="text-xs font-semibold text-gray-500">%</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700">Pen</span>
                </div>
                <div className="w-px h-5 bg-gray-200"></div>

                <div className="flex items-center gap-1.5">
                  {drawingPalette.map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-5 h-5 rounded-full border-2 ${penColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      title={`Set color ${color}`}
                    />
                  ))}
                </div>

                <div className="w-px h-5 bg-gray-200"></div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">Size</span>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={penThickness}
                    onChange={(e) => setPenThickness(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-[11px] font-semibold text-gray-700 w-4 text-right">{penThickness}</span>
                </div>

                <div className="w-px h-5 bg-gray-200"></div>

                <button
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Undo stroke"
                  onClick={() => canvasRef.current?.undoPenStroke?.()}
                >
                  <Undo2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Clear drawing"
                  onClick={() => canvasRef.current?.clearPenDrawings?.()}
                >
                  <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  title="Close pen tools"
                  onClick={closePenToolbar}
                >
                  <X className="w-4 h-4 text-red-600" />
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