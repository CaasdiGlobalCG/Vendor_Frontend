import React from 'react';
import { Plus } from 'lucide-react';
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
  workspace, // For permission checking
  userRole, // For permission checking
  onLeaveWorkspace
}) => {
  const handleLeaveClick = () => {
    if (typeof onLeaveWorkspace === 'function') {
      onLeaveWorkspace();
    }
  };

  return (
    <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'} bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out`}>
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
          onShowAddTaskModal={onShowAddTaskModal}
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
