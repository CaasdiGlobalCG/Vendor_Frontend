import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

const AddSubtaskModal = ({
  isOpen,
  onClose,
  onAddSubtask,
  parentTaskName,
  existingSubtasks = [],
  memberOptions = []
}) => {
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dependsOnSubtaskId: 'auto-previous',
    flowOrder: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedFlowOptions, setShowAdvancedFlowOptions] = useState(false);
  const [createAndAddAnother, setCreateAndAddAnother] = useState(false);

  const getDefaultSubtaskState = () => ({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dependsOnSubtaskId: 'auto-previous',
    flowOrder: ''
  });

  const handleSubmit = async () => {
    if (!newSubtask.title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddSubtask(newSubtask);
      setNewSubtask(getDefaultSubtaskState());
      if (!createAndAddAnother) {
        onClose();
      }
    } catch (error) {
      console.error('AddSubtaskModal: error while creating subtask', error);
      // Parent already alerts; keep modal open
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setNewSubtask(getDefaultSubtaskState());
    setShowAdvancedFlowOptions(false);
    setCreateAndAddAnother(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
        {/* Modal Header with gradient */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50"></div>
          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Add Subtask</h3>
                <p className="text-xs text-gray-600">Create a subtask for {parentTaskName}</p>
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
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <span>Subtask Name</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={newSubtask.title}
                onChange={(e) => setNewSubtask({...newSubtask, title: e.target.value})}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-gray-50/50 hover:bg-gray-50 text-sm"
                placeholder="Enter subtask name"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-indigo-500/30 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Description</span>
            </label>
            <div className="relative">
              <textarea
                value={newSubtask.description}
                onChange={(e) => setNewSubtask({...newSubtask, description: e.target.value})}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-gray-50/50 hover:bg-gray-50 resize-none text-sm"
                placeholder="Describe what needs to be done"
              />
              <div className="absolute right-3 top-3">
                <div className="w-2 h-2 bg-purple-500/30 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Assigned To Input */}
          <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Assign To</span>
            </label>
            <div className="relative">
              <select
                value={newSubtask.assignedTo}
                onChange={(e) => setNewSubtask({...newSubtask, assignedTo: e.target.value})}
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
                  onClick={() => !isSubmitting && setNewSubtask({...newSubtask, priority: priority.value})}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 text-xs ${
                    newSubtask.priority === priority.value 
                      ? priority.activeColor + ' ring-2 ring-offset-2 ring-indigo-500/20' 
                      : priority.color + ' hover:border-gray-300'
                  }`}
                >
                   <span className="text-xs font-medium">{priority.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl bg-gray-50/60">
            <button
              type="button"
              onClick={() => setShowAdvancedFlowOptions((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <span className="text-xs font-semibold text-gray-700">Advanced flow options</span>
              {showAdvancedFlowOptions ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showAdvancedFlowOptions && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                <div className="space-y-2 pt-3">
                  <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                    <span>Sequence After</span>
                  </label>
                  <div className="relative">
                    <select
                      value={newSubtask.dependsOnSubtaskId}
                      onChange={(e) => setNewSubtask({ ...newSubtask, dependsOnSubtaskId: e.target.value })}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 bg-white hover:bg-gray-50 appearance-none cursor-pointer text-sm"
                    >
                      <option value="auto-previous">Auto: previous subtask</option>
                      <option value="none">None: independent</option>
                      {existingSubtasks.map((subtask) => (
                        <option key={subtask.id} value={subtask.id}>
                          {subtask.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">Use this only when you need custom dependency ordering.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span>Step Number (optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSubtask.flowOrder}
                    onChange={(e) => setNewSubtask({ ...newSubtask, flowOrder: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 bg-white hover:bg-gray-50 text-sm"
                    placeholder={`Auto (${existingSubtasks.length + 1})`}
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={createAndAddAnother}
              onChange={(e) => setCreateAndAddAnother(e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Create and add another subtask
          </label>
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
              disabled={!newSubtask.title.trim() || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg text-sm"
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
                'Create Subtask'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSubtaskModal;
