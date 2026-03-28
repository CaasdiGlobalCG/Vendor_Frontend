import React from 'react';
import { Plus, Pin, PinOff } from 'lucide-react';
import TaskTab from './TaskTab';
import LayersTab from './LayersTab';
import AssetsTab from './AssetsTab';
import PermissionGuard, { PermissionButton } from './PermissionGuard';

const WorkspaceSidebar = ({
  sidebarCollapsed,
  activeTab,
  setActiveTab,
  selectedTask,
  tasks,
  selectedSubtask,
  onTaskClick,
  onSubtaskClick,
  onShowAddTaskModal,
  onQuickAddTask,
  onRenameTask,
  onUpdateTask,
  memberOptions,
  workspace, // For permission checking
  userRole, // For permission checking
  onLeaveWorkspace,
  focusMode,
  isPinned,
  onTogglePin,
  onMouseEnter,
  onMouseLeave,
}) => {
  const handleLeaveClick = () => {
    if (typeof onLeaveWorkspace === 'function') {
      onLeaveWorkspace();
    }
  };

  // In focus mode when not pinned, render as overlay
  const isOverlay = focusMode && !isPinned && !sidebarCollapsed;

  return (
    <div
      className={`
        ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'}
        ${isOverlay ? 'absolute left-0 top-0 bottom-0 z-20 shadow-2xl' : ''}
        bg-white border-r border-gray-200 flex flex-col flex-shrink-0
        transition-all duration-300 ease-in-out
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Pin / Focus controls */}
      {focusMode && !sidebarCollapsed && (
        <div className="flex items-center justify-end px-3 pt-2">
          <button
            onClick={onTogglePin}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors group"
            title={isPinned ? 'Unpin panel (Ctrl+Shift+L)' : 'Pin panel (Ctrl+Shift+L)'}
            aria-label={isPinned ? 'Unpin left panel' : 'Pin left panel'}
          >
            {isPinned
              ? <PinOff className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-700" />
              : <Pin className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />}
          </button>
        </div>
      )}

      {/* Tabs - Made more prominent */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex">
          {['Task', 'Layers', 'Assets'].map((tab) => {
            const isDisabled = (tab === 'Layers' || tab === 'Assets') && !selectedSubtask;
            return (
              <button
                key={tab}
                onClick={() => !isDisabled && setActiveTab(tab)}
                disabled={isDisabled}
                className={`flex-1 px-5 py-3 text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab
                    ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
                    : isDisabled
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 cursor-pointer'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'Task' && (
        <TaskTab
          tasks={tasks}
          selectedTask={selectedTask}
          selectedSubtask={selectedSubtask}
          onTaskClick={onTaskClick}
          onSubtaskClick={onSubtaskClick}
          onShowAddTaskModal={onShowAddTaskModal}
          onQuickAddTask={onQuickAddTask}
          onRenameTask={onRenameTask}
          onUpdateTask={onUpdateTask}
          memberOptions={memberOptions}
          workspace={workspace}
          userRole={userRole}
        />
      )}

      {activeTab === 'Layers' && (
        <LayersTab
          selectedTask={selectedTask}
          selectedSubtask={selectedSubtask}
          onSubtaskClick={onSubtaskClick}
        />
      )}

      {activeTab === 'Assets' && (
        <AssetsTab selectedSubtask={selectedSubtask} workspaceId={workspace?.workspaceId} />
      )}

      {/* Leave Workspace Button - Always at the bottom */}
      <div className="p-4 border-t border-gray-200">
      <button
          type="button"
          onClick={handleLeaveClick}
          className="w-full px-4 py-3 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
        >
          Leave Workspace
        </button>
      </div>
    </div>
  );
};

export default WorkspaceSidebar;
