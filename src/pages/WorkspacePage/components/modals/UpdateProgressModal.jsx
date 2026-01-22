import React, { useState, useContext } from 'react';
import { X, Upload, FileText, CheckSquare } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import config from '../../../../config/env';

const UpdateProgressModal = ({ isOpen, onClose, workspaceId, projectId, taskId, subtaskId, tasks = [], onUpdate, workspace = {} }) => {
    // Dropdown state for task and subtask
    const [selectedTaskId, setSelectedTaskId] = useState(taskId || '');
    const [selectedSubtaskId, setSelectedSubtaskId] = useState(subtaskId || '');
    const [showPreviousSubmissions, setShowPreviousSubmissions] = useState(false);
    const [previousSubmissions, setPreviousSubmissions] = useState([]);

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
        setSuccessMessage(null);
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
  const [successMessage, setSuccessMessage] = useState(null);

  // Calculate progress counts from tasks
  const getProgressCounts = () => {
    let totalSubmitted = 0;
    let pendingReview = 0;

    tasks.forEach(task => {
      // Count progress on task level
      if (task.progress && Array.isArray(task.progress)) {
        totalSubmitted += task.progress.length;
        pendingReview += task.progress.filter(p => p.status === 'pending' || !p.status).length;
      }
      // Count progress on subtask level
      if (task.subtasks && Array.isArray(task.subtasks)) {
        task.subtasks.forEach(subtask => {
          if (subtask.progress && Array.isArray(subtask.progress)) {
            totalSubmitted += subtask.progress.length;
            pendingReview += subtask.progress.filter(p => p.status === 'pending' || !p.status).length;
          }
        });
      }
    });

    return { totalSubmitted, pendingReview };
  };

  const progressCounts = getProgressCounts();

  // Fetch previous submissions for the selected task and subtask
  const loadPreviousSubmissions = () => {
    if (!selectedTaskId) {
      setError('Please select a task first');
      return;
    }

    // Filter progress_submissions from workspace
    let submissions = workspace?.progress_submissions || [];
    
    // Filter by task and subtask
    submissions = submissions.filter(progress => {
      let matches = true;
      if (selectedTaskId) matches = matches && progress.taskId === selectedTaskId;
      if (selectedSubtaskId) matches = matches && progress.subtaskId === selectedSubtaskId;
      return matches;
    });

    setPreviousSubmissions(submissions);
    setShowPreviousSubmissions(true);
  };

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

    if (!selectedTaskId) {
      setError('Please select a task');
      return;
    }

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
      submitData.append('taskId', selectedTaskId);
      submitData.append('subtaskId', selectedSubtaskId || '');
      submitData.append('reviewStatus', 'pending'); // Add review status

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
        // Show success message
        setSuccessMessage('Progress submitted successfully! PM will review and approve. Please wait.');
        
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

        // Close modal after 2 seconds to let user see the message
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 2000);
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Modal Header with Toggle */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {showCompletionForm ? 'Project Completion' : 'Update Project Progress'}
            </h2>
            <div className="flex items-center space-x-4">
              {/* Toggle Button */}
              <button
                onClick={() => setShowCompletionForm(!showCompletionForm)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  showCompletionForm ? 'bg-green-600' : 'bg-gray-300'
                }`}
                type="button"
                title={showCompletionForm ? 'Back to Progress' : 'Mark Completion'}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    showCompletionForm ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Progress Update Form */}
          {!showCompletionForm && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-green-800">Success!</h3>
                    <p className="mt-1 text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

              <div>
                <label htmlFor="taskSelect" className="block text-sm font-medium text-gray-700 mb-3">
                  Select Task *
                </label>
                <select
                  id="taskSelect"
                  value={selectedTaskId}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    setSelectedSubtaskId(''); // Reset subtask when task changes
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium appearance-none cursor-pointer transition-colors hover:border-gray-400"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                  required
                >
                  <option value="">-- Choose a task --</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTaskId && subtasks.length > 0 && (
                <div>
                  <label htmlFor="subtaskSelect" className="block text-sm font-medium text-gray-700 mb-3">
                    Select Subtask
                  </label>
                  <select
                    id="subtaskSelect"
                    value={selectedSubtaskId}
                    onChange={(e) => setSelectedSubtaskId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 text-gray-900 font-medium appearance-none cursor-pointer transition-colors hover:border-green-400"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2310b981' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      paddingRight: '36px'
                    }}
                  >
                    <option value="">-- Choose a subtask --</option>
                    {subtasks.map(subtask => (
                      <option key={subtask.id} value={subtask.id}>
                        {subtask.name}
                      </option>
                    ))}
                  </select>
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
              type="button"
              onClick={loadPreviousSubmissions}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Previous Submissions
            </button>
            <div className="relative">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Updating...' : 'Update Progress'}</span>
                <span className="ml-2 inline-flex items-center space-x-1 bg-blue-700 px-2.5 py-1 rounded-full">
                  <span className="text-xs font-bold text-white">{progressCounts.totalSubmitted}</span>
                  <span className="text-xs text-blue-200">/</span>
                  <span className={`text-xs font-bold ${progressCounts.pendingReview > 0 ? 'text-yellow-300' : 'text-blue-200'}`}>
                    {progressCounts.pendingReview}
                  </span>
                </span>
              </button>
              {progressCounts.pendingReview > 0 && (
                <div className="absolute -top-8 right-0 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-xs text-yellow-800 whitespace-nowrap">
                  {progressCounts.pendingReview} pending review
                </div>
              )}
            </div>
          </div>
            </form>
          )}

          {/* Project Completion Form */}
          {showCompletionForm && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCompletionSubmit();
            }} className="p-6 space-y-6">
              {completionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{completionError}</p>
                </div>
              )}

                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="markCompleted"
                    name="markCompleted"
                    checked={completionFormData.markCompleted}
                    onChange={handleCompletionInputChange}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-green-300 rounded"
                  />
                  <label htmlFor="markCompleted" className="ml-3 block text-sm font-medium text-gray-900">
                    I certify this project is complete
                  </label>
                </div>

                <div>
                  <label htmlFor="completionDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Details *
                  </label>
                  <textarea
                    id="completionDescription"
                    name="completionDescription"
                    value={completionFormData.completionDescription}
                    onChange={handleCompletionInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    placeholder="Describe the project completion and any final notes..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="completionFiles" className="block text-sm font-medium text-gray-700 mb-2">
                    Final Documents
                  </label>
                  <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors bg-gray-50">
                    <div className="space-y-2 text-center">
                      {completionFormData.completionFiles ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileText className="w-6 h-6 text-green-500" />
                          <div className="text-xs text-gray-600 truncate max-w-full">{completionFormData.completionFiles.name}</div>
                          <button
                            type="button"
                            onClick={() => {
                              setCompletionFormData({
                                ...completionFormData,
                                completionFiles: null
                              });
                            }}
                            className="text-xs text-red-600 hover:text-red-700 underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <div className="flex flex-col text-xs text-gray-600">
                            <label
                              htmlFor="completion-file-upload"
                              className="relative cursor-pointer font-medium text-green-600 hover:text-green-500"
                            >
                              <span>Upload file</span>
                              <input
                                id="completion-file-upload"
                                name="completion-file-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleCompletionFileChange}
                                accept="image/*,.pdf,.doc,.docx"
                              />
                            </label>
                            <p className="text-gray-500">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, PDF, DOC up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCompletionForm(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    disabled={isCompletionSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`w-full px-4 py-3 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${
                      completionFormData.markCompleted &&
                      completionFormData.completionDescription.trim() &&
                      completionFormData.completionFiles
                        ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                        : 'bg-gray-400 cursor-not-allowed opacity-50'
                    }`}
                    disabled={
                      isCompletionSubmitting ||
                      !completionFormData.markCompleted ||
                      !completionFormData.completionDescription.trim() ||
                      !completionFormData.completionFiles
                    }
                  >
                    {isCompletionSubmitting ? 'Submitting...' : 'Submit Completion Request'}
                  </button>
                </div>
            </form>
          )}
        </div>
      </div>

      {/* Previous Submissions Modal */}
      {showPreviousSubmissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Previous Submissions</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Task: {tasks.find(t => t.id === selectedTaskId)?.name || 'N/A'}
                  {selectedSubtaskId && ` / Subtask: ${tasks.find(t => t.id === selectedTaskId)?.subtasks?.find(s => s.id === selectedSubtaskId)?.name || 'N/A'}`}
                </p>
              </div>
              <button
                onClick={() => setShowPreviousSubmissions(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {previousSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">No previous submissions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {previousSubmissions.map((submission, index) => (
                    <div key={submission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                      {/* Header with Index and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Submission #{previousSubmissions.length - index}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(submission.submittedAt).toLocaleDateString()} at {new Date(submission.submittedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            submission.reviewStatus === 'client_approved' ? 'bg-green-100 text-green-800' :
                            submission.reviewStatus === 'client_approval_pending' ? 'bg-yellow-100 text-yellow-800' :
                            submission.reviewStatus === 'rejected' || submission.reviewStatus === 'pm_rejected' ? 'bg-red-100 text-red-800' :
                            submission.reviewStatus === 'client_rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {submission.reviewStatus === 'client_approved' ? '✓ Approved' :
                             submission.reviewStatus === 'client_approval_pending' ? '⏳ Awaiting Client' :
                             submission.reviewStatus === 'rejected' || submission.reviewStatus === 'pm_rejected' ? '✗ PM Rejected' :
                             submission.reviewStatus === 'client_rejected' ? '✗ Client Rejected' :
                             '⏳ Pending Review'}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                          <p className="text-sm text-gray-900">{submission.title}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                          <p className="text-sm text-gray-900">{submission.description}</p>
                        </div>
                      </div>

                      {/* Work Details */}
                      <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-gray-50 rounded">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Work Done</label>
                          <p className="text-sm text-gray-900">{submission.workDone}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Work Pending</label>
                          <p className="text-sm text-gray-900">{submission.workPending}</p>
                        </div>
                      </div>

                      {/* Approval Timeline */}
                      <div className="space-y-2 text-xs text-gray-600 border-t border-gray-200 pt-3">
                        <div className="flex items-center justify-between">
                          <span>Submitted:</span>
                          <span className="font-medium">{new Date(submission.submittedAt).toLocaleString()}</span>
                        </div>
                        {submission.pmApprovedAt && (
                          <div className="flex items-center justify-between text-green-700">
                            <span>PM Approved:</span>
                            <span className="font-medium">{new Date(submission.pmApprovedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {submission.clientApprovedAt && (
                          <div className="flex items-center justify-between text-green-700">
                            <span>Client Approved:</span>
                            <span className="font-medium">{new Date(submission.clientApprovedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {submission.rejectionReason && (
                          <div className="flex items-start justify-between text-red-700 bg-red-50 p-2 rounded">
                            <span>Rejection Reason:</span>
                            <span className="font-medium text-right ml-2">{submission.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowPreviousSubmissions(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateProgressModal;