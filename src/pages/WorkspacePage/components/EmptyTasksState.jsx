import React, { useState } from 'react';
import { Plus, FolderPlus } from 'lucide-react';

const EmptyTasksState = ({ onCreateTask }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskName.trim()) {
      onCreateTask({
        title: taskName.trim(),
        description: taskDescription.trim()
      });
      setTaskName('');
      setTaskDescription('');
      setShowCreateForm(false);
    }
  };

  if (showCreateForm) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas">
        <div className="max-w-md w-full mx-4">
          <div className="bg-surface rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <FolderPlus className="h-12 w-12 text-info mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-ink">Create Your First Task</h3>
              <p className="text-dim text-sm">Tasks help organize your project work</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="taskName" className="block text-sm font-medium text-ink mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  id="taskName"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g., Design Phase, Planning, Development"
                  className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <label htmlFor="taskDescription" className="block text-sm font-medium text-ink mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="taskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Brief description of what this task involves"
                  rows={3}
                  className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={!taskName.trim()}
                  className="flex-1 bg-info text-white py-2 px-4 rounded-md hover:bg-info focus:outline-none focus:ring-2 focus:ring-info focus:ring-offset-2 disabled:bg-surface-hover disabled:cursor-not-allowed transition-colors"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-surface-hover text-ink py-2 px-4 rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-line focus:ring-offset-2 transition-colors"
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
    <div className="flex-1 flex items-center justify-center bg-canvas">
      <div className="text-center max-w-md mx-4">
        <FolderPlus className="h-16 w-16 text-dim mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-ink mb-2">No Tasks Yet</h3>
        <p className="text-dim mb-6">
          Get started by creating your first task. Tasks help you organize and manage different aspects of your project.
        </p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 bg-info text-white rounded-md hover:bg-info focus:outline-none focus:ring-2 focus:ring-info focus:ring-offset-2 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create First Task
        </button>
      </div>
    </div>
  );
};

export default EmptyTasksState;
