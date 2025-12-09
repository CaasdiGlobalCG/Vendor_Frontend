import React from 'react';
import { Plus, MoreHorizontal, FolderOpen, FileText, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import PermissionGuard, { PermissionButton } from './PermissionGuard';

const TaskTab = ({ 
  tasks, 
  selectedTask, 
  selectedSubtask,
  onTaskClick, 
  onShowAddTaskModal,
  workspace, // For permission checking
  userRole // For permission checking
}) => {
  return (
    <div className="flex-1 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-gray-900">Tasks</h3>
        <PermissionButton
          permission="canCreateTasks"
          workspace={workspace}
          userRole={userRole}
          onClick={onShowAddTaskModal}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Add new task"
        >
          <Plus className="w-5 h-5 text-blue-600" />
        </PermissionButton>
      </div>

      <div className="space-y-1 flex-1">
        {/* If a subtask is selected, show hierarchy: Task > Subtask */}
        {selectedSubtask ? (
          selectedTask && (
            <div className="space-y-2">
              {/* Parent Task */}
              <div 
                key={selectedTask.id} 
                onClick={() => onTaskClick(selectedTask)}
                 className="flex items-center justify-between p-1.5 border rounded-lg bg-blue-50 border-blue-300 shadow-md cursor-pointer group"
              >
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-lg">
                    <FolderOpen className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-[11px] font-medium text-blue-800">
                    {selectedTask.name}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1 text-[10px] text-gray-500">
                  <span>{selectedTask.assignedUsers} member{selectedTask.assignedUsers !== 1 ? 's' : ''}</span>
                  <button 
                     className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"

                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle more options
                    }}
                  >
                     <MoreHorizontal className="w-2.5 h-2.5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Hierarchy Connector */}
              <div className="flex items-center pl-4">
              <div className="w-px h-4 border-l border-dashed border-gray-300"></div>
              </div>

              {/* Current Subtask */}
              <div className="ml-8 p-1.5 border-2 border-blue-400 rounded-lg bg-blue-100 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-5 h-5 bg-blue-200 rounded-lg">
                      {selectedSubtask.status === 'completed' ? (
                       <CheckSquare className="w-3 h-3 text-green-700" />
                      ) : selectedSubtask.status === 'in-progress' ? (
                        <Clock className="w-3 h-3 text-blue-700" />
                      ) : (
                        <FileText className="w-3 h-3 text-blue-700" />
                      )}
                    </div>
                    <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-blue-900">
                        {selectedSubtask.name}
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {(selectedSubtask.assignedUsers || 1)} member{(selectedSubtask.assignedUsers || 1) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    {/* Status Badge */}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${
                      selectedSubtask.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : selectedSubtask.status === 'in-progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedSubtask.status === 'completed' 
                        ? 'Completed'
                        : selectedSubtask.status === 'in-progress'
                        ? 'In Progress'
                        : 'Pending'
                      }
                    </span>
                    
                    {/* Assigned Users for Subtask
                    <div className="flex -space-x-1">
                      {Array.from({ length: selectedSubtask.assignedUsers || 1 }, (_, i) => (
                        <div key={i} className="w-5 h-5 bg-blue-300 rounded-full border-2 border-white shadow-sm"></div>
                      ))}
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Show all tasks when no subtask is selected */
          tasks.map((task) => (
            <div 
              key={task.id} 
              onClick={() => onTaskClick(task)}
              className={`flex items-center justify-between p-2 border rounded-lg transition-all duration-200 cursor-pointer group ${
                selectedTask?.id === task.id
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-lg ${
                  selectedTask?.id === task.id 
                    ? 'bg-blue-100' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <FolderOpen className={`w-3 h-3 ${
                    selectedTask?.id === task.id 
                      ? 'text-blue-600' 
                      : 'text-gray-600 group-hover:text-gray-700'
                  }`} />
                </div>
                <span className={`text-[12px] font-medium ${
                  selectedTask?.id === task.id ? 'text-blue-800' : 'text-gray-900 group-hover:text-gray-700'
                }`}>
                  {task.name}
                </span>
              </div>
              
              {/* <div className="flex items-center space-x-2">
                <div className="flex -space-x-1">
                  {Array.from({ length: task.assignedUsers }, (_, i) => (
                    <div key={i} className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white shadow-sm"></div>
                  ))}
                </div> */}
                <div className="flex items-center space-x-1 text-[10px] text-gray-500 whitespace-nowrap">
                <span>{task.assignedUsers} member{task.assignedUsers !== 1 ? 's' : ''}</span>
                <button 
                   className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle more options
                  }}
                >
                  <MoreHorizontal className="w-2.5 h-2.5 text-gray-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskTab;
