import React, { useState, useEffect, useContext } from 'react';
import { X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';

const ReviewProgressModal = ({ isOpen, onClose, workspace, userRole, taskId, subtaskId }) => {
  const { currentUser } = useContext(VendorContext);
  const [progressSubmissions, setProgressSubmissions] = useState([]);
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get user info for authentication headers
  const getUserInfo = () => {
    // Try to get PM user from localStorage
    const pmUser = localStorage.getItem('pmUser');
    if (pmUser) {
      try {
        return JSON.parse(pmUser);
      } catch (e) {}
    }
    
    // Try to get client user from localStorage
    const clientUser = localStorage.getItem('clientUser');
    if (clientUser) {
      try {
        return JSON.parse(clientUser);
      } catch (e) {}
    }
    
    // Try current user from context
    if (currentUser) {
      return {
        pmId: currentUser.pmId || currentUser.id,
        clientId: currentUser.clientId,
        email: currentUser.email,
        role: currentUser.role || 'pm',
        name: currentUser.name
      };
    }
    
    return null;
  };

  useEffect(() => {
    if (isOpen && workspace) {
      loadProgressData();
    }
  }, [isOpen, workspace]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get progress_submissions array from workspace
      let submissions = workspace?.progress_submissions || [];
      
      // Filter by task and subtask if provided
      if (taskId || subtaskId) {
        submissions = submissions.filter(progress => {
          let matches = true;
          if (taskId) matches = matches && progress.taskId === taskId;
          if (subtaskId) matches = matches && progress.subtaskId === subtaskId;
          return matches;
        });
      }
      
      setProgressSubmissions(submissions);
      
      // Set first submission as selected (latest if available)
      if (submissions.length > 0) {
        setSelectedProgress(submissions[submissions.length - 1]);
      } else {
        setError('No progress submissions available');
      }
    } catch (err) {
      console.error('Error loading progress data:', err);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedProgress || !workspace?.workspaceId) {
      setError('Missing workspace or progress information');
      return;
    }

    try {
      setApproving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const userInfo = getUserInfo();
      
      // Determine endpoint and data based on role
      const endpoint = userRole === 'client' ? '/api/workspace/client-approve-progress' : '/api/workspace/approve-progress';
      const approvalStatus = userRole === 'client' ? 'client_approved' : 'pm_approved';
      const reviewStatus = userRole === 'client' ? 'client_approved' : 'client_approval_pending';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-info': JSON.stringify(userInfo)
        },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          progressId: selectedProgress.id,
          pmId: userInfo?.pmId,
          clientId: userInfo?.clientId,
          userRole: userRole,
          approvalStatus: approvalStatus,
          reviewStatus: reviewStatus,
          approvedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Progress approved successfully! Waiting for client approval.');
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 2000);
      } else {
        setError(result.message || 'Failed to approve progress');
      }
    } catch (err) {
      console.error('Error approving progress:', err);
      setError(`Failed to approve progress: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!progressData || !workspace?.workspaceId) {
      setError('Missing workspace information');
      return;
    }

    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setRejecting(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const userInfo = getUserInfo();
      
      // Determine endpoint and data based on role
      const endpoint = userRole === 'client' ? '/api/workspace/client-reject-progress' : '/api/workspace/reject-progress';
      const approvalStatus = userRole === 'client' ? 'client_rejected' : 'pm_rejected';
      const reviewStatus = userRole === 'client' ? 'client_rejected' : 'rejected';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-info': JSON.stringify(userInfo)
        },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          progressId: selectedProgress.id,
          pmId: userInfo?.pmId,
          clientId: userInfo?.clientId,
          userRole: userRole,
          approvalStatus: approvalStatus,
          reviewStatus: reviewStatus,
          rejectionReason: rejectionReason,
          rejectedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Progress rejected. Vendor has been notified.');
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 2000);
      } else {
        setError(result.message || 'Failed to reject progress');
      }
    } catch (err) {
      console.error('Error rejecting progress:', err);
      setError(`Failed to reject progress: ${err.message}`);
    } finally {
      setRejecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Review Progress</h2>
            <p className="text-sm text-gray-600 mt-1">Review vendor progress submission</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : progressSubmissions.length > 0 ? (
            <div className="space-y-6">
              {/* Submissions List */}
              {progressSubmissions.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Progress Submissions</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {progressSubmissions.map((submission, index) => (
                      <button
                        key={submission.id}
                        onClick={() => {
                          setSelectedProgress(submission);
                          setShowRejectForm(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          selectedProgress?.id === submission.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{submission.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(submission.submittedAt).toLocaleDateString()} at {new Date(submission.submittedAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              submission.reviewStatus === 'client_approved' ? 'bg-green-100 text-green-800' :
                              submission.reviewStatus === 'client_approval_pending' ? 'bg-yellow-100 text-yellow-800' :
                              submission.reviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              submission.reviewStatus === 'client_rejected' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {submission.reviewStatus || 'Pending'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Badge */}
              {selectedProgress && (
                <>
                  <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Review Status</p>
                      <p className="text-xs text-blue-700">{selectedProgress.reviewStatus || 'Pending Review'}</p>
                    </div>
                  </div>

                  {/* Progress Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <p className="text-gray-900">{selectedProgress.title || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <p className="text-gray-900">{selectedProgress.description || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Work Done</label>
                        <p className="text-gray-900">{selectedProgress.workDone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Work Pending</label>
                        <p className="text-gray-900">{selectedProgress.workPending || 'N/A'}</p>
                      </div>
                    </div>

                    {selectedProgress.taskId && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Task ID</label>
                          <p className="text-gray-900 text-sm font-mono">{selectedProgress.taskId}</p>
                        </div>
                        {selectedProgress.subtaskId && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subtask ID</label>
                            <p className="text-gray-900 text-sm font-mono">{selectedProgress.subtaskId}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedProgress.proofOfCompletion && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Proof of Completion</label>
                        <a
                          href={selectedProgress.proofOfCompletion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          View Attached File
                        </a>
                      </div>
                    )}

                    {selectedProgress.submittedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Submitted At</label>
                        <p className="text-gray-900 text-sm">{new Date(selectedProgress.submittedAt).toLocaleString()}</p>
                      </div>
                    )}

                    {selectedProgress.pmApprovedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PM Approved At</label>
                        <p className="text-gray-900 text-sm">{new Date(selectedProgress.pmApprovedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Rejection Form */}
                  {showRejectForm && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please explain why this progress is being rejected..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        rows="3"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!showRejectForm ? (
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{approving ? 'Approving...' : 'Approve Progress'}</span>
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={rejecting}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{rejecting ? 'Rejecting...' : 'Reject Progress'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleReject}
                        disabled={rejecting}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                      >
                        {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        disabled={rejecting}
                        className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-800 font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No progress submissions available for review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewProgressModal;
