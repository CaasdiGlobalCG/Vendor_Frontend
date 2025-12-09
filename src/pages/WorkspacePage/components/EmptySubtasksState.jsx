import React, { useState } from 'react';
import { Plus, FileText } from 'lucide-react';

const EmptySubtasksState = ({ selectedTask, onCreateSubtask }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subtaskName, setSubtaskName] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (subtaskName.trim()) {
      onCreateSubtask({
        title: subtaskName.trim(),
        description: subtaskDescription.trim()
      });
      setSubtaskName('');
      setSubtaskDescription('');
      setShowCreateForm(false);
    }
  };

  if (showCreateForm) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white-50 min-h-[520px] md:min-h-[60vh] py-12 mt-4">
        <div className="max-w-md w-full mx-4 mt-6">
          <div className="bg-white rounded-lg shadow-lg p-5 mt-12">
            <div className="text-center mb-5">
              <FileText className="h-10 w-10 text-green-500 mx-auto mb-2.5" />
              <h3 className="text-base font-semibold text-gray-900">Create Subtask</h3>
              <p className="text-gray-600 text-xs">Add a subtask to "{selectedTask?.name}"</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
              <label htmlFor="subtaskName" className="block text-xs font-medium text-gray-700 mb-1">
                  Subtask Name *
                </label>
                <input
                  type="text"
                  id="subtaskName"
                  value={subtaskName}
                  onChange={(e) => setSubtaskName(e.target.value)}
                  placeholder="e.g., Research, Wireframes, Implementation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
              
              <div>
              <label htmlFor="subtaskDescription" className="block text-xs font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="subtaskDescription"
                  value={subtaskDescription}
                  onChange={(e) => setSubtaskDescription(e.target.value)}
                  placeholder="What needs to be done in this subtask?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div className="flex space-x-3 pt-1.5">
                <button
                  type="submit"
                  disabled={!subtaskName.trim()}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Create Subtask
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-white-50 min-h-[520px] md:min-h-[60vh] py-12">
      <div className="max-w-md w-full mx-4 mt-6">
        <FileText className="h-14 w-14 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1.5">No Subtasks in "{selectedTask?.name}"</h3>
        <p className="text-sm text-gray-600 mb-5">
          Create subtasks to break down this task into manageable pieces. Each subtask will have its own collaborative whiteboard.
        </p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create First Subtask</span>
        </button>
      </div>
    </div>
  );
};

export default EmptySubtasksState;
