import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Hand } from 'lucide-react';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import CanvasWorkspace from './CanvasWorkspace';
import TaskSubtasksView from './TaskSubtasksView';
import LayerContentView from './LayerContentView';
import EmptyTasksState from './EmptyTasksState';
import EmptySubtasksState from './EmptySubtasksState';
import { UploadProvider } from './forms/UploadManager';

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
  onLayerItemClick,
  onToggleSidebars,
  workspace,
  onSaveWorkspace,
  tasks,
  onCreateTask,
  onCreateSubtask,  onActivityCreated,
  userRole,
  userPermissions,
  onZoomChange
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

  return (
    <div className={`flex-1 bg-white relative transition-all duration-300 ease-in-out ${sidebarCollapsed ? '' : 'border-l border-r border-gray-200'}`}>
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
            onActivityCreated={onActivityCreated}
            userRole={userRole}
            userPermissions={userPermissions}
            onZoomChange={onZoomChange}
          />
        ) : (
          // Show subtasks list when task is selected but no subtask
          <TaskSubtasksView
            selectedTask={selectedTask}
            onSubtaskClick={onSubtaskClick}
            onShowAddSubtaskModal={onShowAddSubtaskModal}
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

      {/* Enhanced Zoom Controls - Figma style */}
      {selectedSubtask && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-2 flex items-center space-x-3">
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
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Hand Tool" onClick={handleFitView}>
            <Hand className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Select Tool">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
            </svg>
          </button>
          <div className="w-px h-5 bg-gray-200"></div>
          <span className="text-sm text-gray-700 font-semibold px-3 py-1 bg-gray-50 rounded-lg">{zoomLevel}%</span>
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
        </div>
      )}
    </div>
  );
};

export default WorkspaceMain;