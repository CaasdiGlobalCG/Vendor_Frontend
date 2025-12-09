import React from 'react';
import { Plus, MoreHorizontal, FileText, CheckSquare, Clock, AlertCircle } from 'lucide-react';

const TaskSubtasksView = ({ 
  selectedTask, 
  onSubtaskClick, 
  onShowAddSubtaskModal 
}) => {
  return (
    <div className="pt-24 px-8 pb-8">
      {/* Task Header
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedTask.name}</h1>
        <p className="text-gray-600">Manage subtasks for {selectedTask.name}</p>
      </div> */}

      {/* Subtasks Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Subtasks Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
          <h3 className="text-sm font-semibold text-gray-800">Subtasks</h3>
          <p className="text-xs text-gray-600 mt-0.5">
              {selectedTask.subtasks?.length || 0} subtask{selectedTask.subtasks?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onShowAddSubtaskModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span className="font-medium">Add Subtask</span>
          </button>
        </div>

        {/* Subtasks Content */}
        <div className="p-6">
          {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
            <div className="space-y-2.5">
              {selectedTask.subtasks.map((subtask) => (
                <div 
                  key={subtask.id} 
                   className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                  onClick={() => onSubtaskClick(subtask)}
                >
                  <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 bg-blue-100 rounded-lg">
                      {subtask.status === 'completed' ? (
                        <CheckSquare className="w-3.5 h-3.5 text-green-600" />
                      ) : subtask.status === 'in-progress' ? (
                        <Clock className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-medium text-gray-900 truncate">{subtask.name}</h4>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                          subtask.status === 'completed' ? 'bg-green-100 text-green-800' :
                          subtask.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                           'bg-orange-100 text-orange-700'
                        }`}>
                          {subtask.status === 'in-progress' ? 'In Progress' : 
                           subtask.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {subtask.assignedUsers} member{subtask.assignedUsers !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <button className="p-1 hover:bg-gray-200 rounded">
                    <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subtasks yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Break down "{selectedTask.name}" into smaller, manageable subtasks to track progress better.
              </p>
              <button
                onClick={onShowAddSubtaskModal}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span>Create First Subtask</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskSubtasksView;
