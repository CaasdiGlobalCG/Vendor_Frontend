import React, { useState, useContext } from 'react';
import { X, Upload, FileText, CheckSquare } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import config from '../../../../config/env';

const UpdateProgressModal = ({ isOpen, onClose, workspaceId, projectId, taskId, subtaskId, tasks = [], onUpdate }) => {
    // Dropdown state for task and subtask
    const [selectedTaskId, setSelectedTaskId] = useState(taskId || '');
    const [selectedSubtaskId, setSelectedSubtaskId] = useState(subtaskId || '');

    // Find subtasks for selected task
    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    const subtasks = selectedTask?.subtasks || [];

    // When modal opens or taskId/subtaskId props change, sync dropdowns
    React.useEffect(() => {
      setSelectedTaskId(taskId || '');
    }, [taskId, isOpen]);
    React.useEffect(() => {
      setSelectedSubtaskId(subtaskId || '');
    }, [subtaskId, isOpen]);

    // Reset forms when modal closes
    React.useEffect(() => {
      if (!isOpen) {
        setFormData({
          title: '',
          description: '',
          workDone: '',
          workPending: '',
          proofOfCompletion: null
        });
        setCompletionFormData({
          markCompleted: false,
          completionDescription: '',
          completionFiles: null
        });
        setShowCompletionForm(false);
        setError(null);
        setCompletionError(null);
      }
    }, [isOpen]);

  const { currentUser } = useContext(VendorContext);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workDone: '',
    workPending: '',
    proofOfCompletion: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // State for project completion form
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionFormData, setCompletionFormData] = useState({
    markCompleted: false,
    completionDescription: '',
    completionFiles: null
  });
  const [isCompletionSubmitting, setIsCompletionSubmitting] = useState(false);
  const [completionError, setCompletionError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        proofOfCompletion: file
      }));
    }
  };

  const handleCompletionInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompletionFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCompletionFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompletionFormData(prev => ({
        ...prev,
        completionFiles: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submitData = new FormData();
      submitData.append('workspaceId', workspaceId);
      submitData.append('vendorId', currentUser.vendorId);
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('workDone', formData.workDone);
      submitData.append('workPending', formData.workPending);
      submitData.append('projectId', projectId || '');
      submitData.append('taskId', taskId || '');
      submitData.append('subtaskId', subtaskId || '');

      if (formData.proofOfCompletion) {
        submitData.append('proofOfCompletion', formData.proofOfCompletion);
      }

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace/update-progress`, {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({
            vendorId: currentUser.vendorId,
            email: currentUser?.email,
            role: 'vendor',
            name: currentUser?.name
          })
        },
        body: submitData
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          workDone: '',
          workPending: '',
          proofOfCompletion: null
        });

        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate(result.data);
        }

        onClose();
      } else {
        throw new Error(result.message || 'Failed to update progress');
      }
    } catch (err) {
      console.error('Error updating progress:', err);
      setError(err.message || 'Failed to update progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletionSubmit = async () => {

    if (!completionFormData.completionDescription.trim()) {
      setCompletionError('Description is required');
      return;
    }

    setIsCompletionSubmitting(true);
    setCompletionError(null);

    try {
      const submitData = new FormData();
      submitData.append('workspaceId', workspaceId);
      submitData.append('projectId', projectId);
      submitData.append('vendorId', currentUser.vendorId);
      submitData.append('markCompleted', completionFormData.markCompleted);
      submitData.append('completionDescription', completionFormData.completionDescription);

      if (completionFormData.completionFiles) {
        submitData.append('completionFiles', completionFormData.completionFiles);
      }

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace/project-completion`, {
        method: 'POST',
        headers: {
          'x-user-info': JSON.stringify({
            vendorId: currentUser.vendorId,
            email: currentUser?.email,
            role: 'vendor',
            name: currentUser?.name
          })
        },
        body: submitData
      });

      if (!response.ok) {
        throw new Error('Failed to submit project completion request');
      }

      const result = await response.json();

      if (result.success) {
        // Reset completion form
        setCompletionFormData({
          markCompleted: false,
          completionDescription: '',
          completionFiles: null
        });
        setShowCompletionForm(false);

        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate(result.data);
        }

        onClose();
      } else {
        throw new Error(result.message || 'Failed to submit project completion request');
      }
    } catch (err) {
      console.error('Error submitting project completion:', err);
      setCompletionError(err.message || 'Failed to submit project completion request');
    } finally {
      setIsCompletionSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Update Project Progress</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Progress Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Foundation work completed"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the progress made..."
              required
            />
          </div>

          <div>
            <label htmlFor="workDone" className="block text-sm font-medium text-gray-700 mb-2">
              Work Completed
            </label>
            <textarea
              id="workDone"
              name="workDone"
              value={formData.workDone}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detail the work that has been completed..."
            />
          </div>

          <div>
            <label htmlFor="workPending" className="block text-sm font-medium text-gray-700 mb-2">
              Work Remaining
            </label>
            <textarea
              id="workPending"
              name="workPending"
              value={formData.workPending}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detail the work that still needs to be done..."
            />
          </div>

          <div>
            <label htmlFor="proofOfCompletion" className="block text-sm font-medium text-gray-700 mb-2">
              Proof of Completion
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                {formData.proofOfCompletion ? (
                  <div className="flex items-center justify-center space-x-2">
                    <FileText className="w-8 h-8 text-green-500" />
                    <span className="text-sm text-gray-600">{formData.proofOfCompletion.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF, DOC up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Project Completion Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Project Completion</h3>
              <button
                type="button"
                onClick={() => setShowCompletionForm(!showCompletionForm)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showCompletionForm ? 'Cancel' : 'Mark Project as Completed'}
              </button>
            </div>

            {showCompletionForm && (
              <div className="mt-6 space-y-6">
                {completionError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{completionError}</p>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="markCompleted"
                    name="markCompleted"
                    checked={completionFormData.markCompleted}
                    onChange={handleCompletionInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="markCompleted" className="ml-2 block text-sm text-gray-900">
                    Mark project as completed
                  </label>
                </div>

                <div>
                  <label htmlFor="completionDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description of Completion *
                  </label>
                  <textarea
                    id="completionDescription"
                    name="completionDescription"
                    value={completionFormData.completionDescription}
                    onChange={handleCompletionInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the project completion..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="completionFiles" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Completion Documents
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      {completionFormData.completionFiles ? (
                        <div className="flex items-center justify-center space-x-2">
                          <FileText className="w-8 h-8 text-green-500" />
                          <span className="text-sm text-gray-600">{completionFormData.completionFiles.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="completion-file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload files</span>
                              <input
                                id="completion-file-upload"
                                name="completion-file-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleCompletionFileChange}
                                accept="image/*,.pdf,.doc,.docx"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, PDF, DOC up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCompletionForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isCompletionSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCompletionSubmit(e);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isCompletionSubmitting}
                  >
                    {isCompletionSubmitting ? 'Submitting...' : 'Submit Completion Request'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProgressModal;