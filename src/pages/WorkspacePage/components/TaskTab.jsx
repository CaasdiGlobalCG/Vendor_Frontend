import React, { useState } from 'react';
import { Plus, MoreHorizontal, FolderOpen, FileText, CheckSquare, Clock, AlertCircle, X, ChevronDown } from 'lucide-react';
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
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState({});
  const [selectedTaskForSubmissions, setSelectedTaskForSubmissions] = useState(null);
  const [selectedSubtaskForSubmissions, setSelectedSubtaskForSubmissions] = useState(null);

  const handleCheckSubmissions = (task, subtask = null) => {
    setSelectedTaskForSubmissions(task);
    setSelectedSubtaskForSubmissions(subtask);
    setShowSubmissionsModal(true);
  };

  const getSubmissionsForTaskSubtask = (task, subtask) => {
    let submissions = workspace?.progress_submissions || [];
    return submissions.filter(s => {
      let matches = s.taskId === task.id;
      if (subtask) {
        matches = matches && s.subtaskId === subtask.id;
      }
      return matches;
    });
  };

  const toggleSubmissionExpand = (id) => {
    setExpandedSubmissions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
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
                <div className="flex flex-col">
                  <span className={`text-[12px] font-medium ${
                    selectedTask?.id === task.id ? 'text-blue-800' : 'text-gray-900 group-hover:text-gray-700'
                  }`}>
                    {task.name}
                  </span>
                  {workspace?.project_status?.reviewStatus === 'client_approved' && (
                    <span className="text-[10px] text-green-600 font-medium mt-0.5">
                      ✓ Progress reviewed and approved
                    </span>
                  )}
                </div>
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
                    handleCheckSubmissions(task);
                  }}
                  title="Check submissions"
                >
                  <FileText className="w-2.5 h-2.5 text-gray-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedTaskForSubmissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Progress Submissions</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Task: {selectedTaskForSubmissions.name}
                  {selectedSubtaskForSubmissions && ` / Subtask: ${selectedSubtaskForSubmissions.name}`}
                </p>
              </div>
              <button
                onClick={() => setShowSubmissionsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {(() => {
                const submissions = getSubmissionsForTaskSubtask(selectedTaskForSubmissions, selectedSubtaskForSubmissions);
                
                if (submissions.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No submissions found</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {submissions.map((submission, index) => {
                      const isExpanded = expandedSubmissions[submission.id];
                      
                      return (
                        <div key={submission.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Submission Header */}
                          <button
                            onClick={() => toggleSubmissionExpand(submission.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <ChevronDown
                                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Submission #{submissions.length - index}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(submission.submittedAt).toLocaleDateString()} at {new Date(submission.submittedAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                              submission.reviewStatus === 'client_approved' ? 'bg-green-100 text-green-800' :
                              submission.reviewStatus === 'client_approval_pending' ? 'bg-yellow-100 text-yellow-800' :
                              submission.reviewStatus === 'rejected' || submission.reviewStatus === 'pm_rejected' ? 'bg-red-100 text-red-800' :
                              submission.reviewStatus === 'client_rejected' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {submission.reviewStatus === 'client_approved' ? '✓ Approved' :
                               submission.reviewStatus === 'client_approval_pending' ? '⏳ Awaiting' :
                               submission.reviewStatus === 'rejected' || submission.reviewStatus === 'pm_rejected' ? '✗ Rejected' :
                               submission.reviewStatus === 'client_rejected' ? '✗ Rejected' :
                               '⏳ Pending'}
                            </span>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                  <p className="text-sm text-gray-900">{submission.title}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                  <p className="text-sm text-gray-900">{submission.description}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded border border-gray-200">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Done</label>
                                  <p className="text-sm text-gray-900">{submission.workDone}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Pending</label>
                                  <p className="text-sm text-gray-900">{submission.workPending}</p>
                                </div>
                              </div>

                              {/* Timeline */}
                              <div className="space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Submitted:</span>
                                  <span className="font-medium text-gray-900">{new Date(submission.submittedAt).toLocaleString()}</span>
                                </div>
                                
                                {submission.pmApprovedAt && (
                                  <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                                    <span className="text-green-700">PM Approved:</span>
                                    <span className="font-medium text-green-900">{new Date(submission.pmApprovedAt).toLocaleString()}</span>
                                  </div>
                                )}
                                
                                {submission.clientApprovedAt && (
                                  <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                                    <span className="text-green-700">Client Approved:</span>
                                    <span className="font-medium text-green-900">{new Date(submission.clientApprovedAt).toLocaleString()}</span>
                                  </div>
                                )}
                                
                                {submission.rejectionReason && (
                                  <div className="flex items-start justify-between bg-red-50 p-2 rounded">
                                    <span className="text-red-700">Rejection:</span>
                                    <span className="font-medium text-red-900 text-right ml-2">{submission.rejectionReason}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTab;
