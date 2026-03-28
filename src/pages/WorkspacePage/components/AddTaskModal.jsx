import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const AddTaskModal = ({ isOpen, onClose, onAddTask, memberOptions = [] }) => {
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    accessedBy: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newTask.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddTask(newTask);
      setNewTask({ title: '', description: '', accessedBy: '', priority: 'medium' });
      onClose();
    } catch (error) {
      console.error('AddTaskModal: error while creating task', error);
      // Parent already shows an alert; keep modal open so user can adjust inputs
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setNewTask({ title: '', description: '', accessedBy: '', priority: 'medium' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
        {/* Modal Header with gradient */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50"></div>
          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
              <h3 className="text-lg font-bold text-gray-800">Add New Task</h3>
              <p className="text-xs text-gray-600">Create a new task for your team</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 hover:scale-110 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Task Title</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 hover:bg-gray-50 text-sm"
                placeholder="Enter a descriptive task title"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-blue-500/30 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <span>Description</span>
            </label>
            <div className="relative">
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-gray-50/50 hover:bg-gray-50 resize-none text-sm"
                placeholder="Provide detailed description of the task"
              />
              <div className="absolute right-3 top-3">
                <div className="w-2 h-2 bg-indigo-500/30 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Accessed By Input */}
          <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Assigned To</span>
            </label>
            <div className="relative">
              <select
                value={newTask.accessedBy}
                onChange={(e) => setNewTask({...newTask, accessedBy: e.target.value})}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 bg-gray-50/50 hover:bg-gray-50 appearance-none cursor-pointer text-sm"
              >
                <option value="">Unassigned</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    👤 {member.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Priority Input */}
          <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Priority Level</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600 border-gray-200', activeColor: 'bg-gray-200 text-gray-800 border-gray-300' },
                { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200', activeColor: 'bg-amber-200 text-amber-800 border-amber-300' },
                { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200', activeColor: 'bg-red-200 text-red-800 border-red-300' }
              ].map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => !isSubmitting && setNewTask({...newTask, priority: priority.value})}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 text-xs ${
                    newTask.priority === priority.value 
                      ? priority.activeColor + ' ring-2 ring-offset-2 ring-blue-500/20' 
                      : priority.color + ' hover:border-gray-300'
                  }`}
                >
                   <span className="text-xs font-medium">{priority.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-2xl border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-3 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!newTask.title.trim() || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg text-sm"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
