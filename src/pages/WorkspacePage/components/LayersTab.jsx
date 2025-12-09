import React from 'react';
import { Plus, FolderOpen, FileText, CheckSquare, Clock } from 'lucide-react';

const LayersTab = ({ 
  selectedTask, 
  selectedSubtask, 
  onSubtaskClick 
}) => {
  if (!selectedTask) return null;

  return (
    <div className="flex-1 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Layers</h3>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Plus className="w-5 h-5 text-green-600" />
        </button>
      </div>
      
      {/* Task Selection Dropdown */}
      <div className="mb-4">
        <div className="relative">
          <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-800">{selectedTask.name}</span>
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tree Structure */}
      <div className="flex-1 space-y-2">
        {/* Main Task */}
        <div className="flex items-center space-x-2 p-2">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-lg">
            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-gray-900">{selectedTask.name}</span>
        </div>

        {/* Subtasks */}
        <div className="ml-6 space-y-1">
          {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
            selectedTask.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all duration-200 group ${
                  selectedSubtask?.id === subtask.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSubtaskClick(subtask)}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex items-center justify-center w-5 h-5 bg-gray-100 rounded">
                  {subtask.status === 'completed' ? (
                    <CheckSquare className="w-3 h-3 text-green-600" />
                  ) : subtask.status === 'in-progress' ? (
                    <Clock className="w-3 h-3 text-blue-600" />
                  ) : (
                    <FileText className="w-3 h-3 text-gray-600" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  selectedSubtask?.id === subtask.id ? 'text-blue-800' : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {subtask.name}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ml-auto ${
                  subtask.status === 'completed' ? 'bg-green-100 text-green-800' :
                  subtask.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {subtask.status === 'in-progress' ? 'In Progress' : 
                   subtask.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center space-x-2 p-2 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm italic">No subtasks available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayersTab;
