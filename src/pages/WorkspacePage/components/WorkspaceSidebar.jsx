import React from 'react';
import TaskTab from './TaskTab';
import LayersTab from './LayersTab';
import AssetsTab from './AssetsTab';

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
  // In focus mode when not pinned, render as overlay
  const isOverlay = focusMode && !isPinned && !sidebarCollapsed;

  return (
    <div
      className={`
        ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[min(17rem,30vw)] xl:w-72'}
        ${isOverlay ? 'absolute left-0 top-0 bottom-0 z-20 shadow-2xl' : ''}
        bg-white border-r border-gray-200 flex min-h-0 flex-col flex-shrink-0 overflow-hidden
        transition-all duration-300 ease-in-out
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Tabs - Made more prominent */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {['Task', 'Layers', 'Assets'].map((tab) => {
            const isDisabled = (tab === 'Layers' || tab === 'Assets') && !selectedSubtask;
            return (
              <button
                key={tab}
                onClick={() => !isDisabled && setActiveTab(tab)}
                disabled={isDisabled}
                className={`min-w-[88px] flex-1 px-4 py-3 text-xs font-semibold transition-all duration-200 ${
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
          onLeaveWorkspace={onLeaveWorkspace}
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
    </div>
  );
};

export default WorkspaceSidebar;
