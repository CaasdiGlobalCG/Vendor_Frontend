import React, { useState, useEffect, useContext } from 'react';
import { X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Auth } from 'aws-amplify';
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
    const pmUser = sessionStorage.getItem('pmUser');
    if (pmUser) {
      try {
        return JSON.parse(pmUser);
      } catch (e) {}
    }
    
    // Try to get client user from localStorage
    const clientUser = sessionStorage.getItem('clientUser');
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

  // Resolve a Bearer token for authenticateUser routes. External PM/CAS
  // handoff sessions use the vendor-signed token stored by the exchange;
  // Cognito users (vendor + client share the same pool) use the id token.
  // The vg_auth cookie is also accepted server-side as a fallback.
  const getAuthToken = async () => {
    if (sessionStorage.getItem('externalAuthSession') === '1') {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    }
    try {
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();
      if (idToken) return idToken;
    } catch {}
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
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

      const token = await getAuthToken();
      const userInfo = getUserInfo();

      // Determine endpoint and data based on role
      const endpoint = userRole === 'client' ? '/api/workspace/client-approve-progress' : '/api/workspace/approve-progress';
      const approvalStatus = userRole === 'client' ? 'client_approved' : 'pm_approved';
      const reviewStatus = userRole === 'client' ? 'client_approved' : 'client_approval_pending';

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
        const updatedSubmission = {
          ...selectedProgress,
          approvalStatus,
          reviewStatus,
          pmApprovedAt: new Date().toISOString()
        };
        setSelectedProgress(updatedSubmission);
        setProgressSubmissions(prev => prev.map(p => (p.id === updatedSubmission.id ? updatedSubmission : p)));
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
    if (!selectedProgress || !workspace?.workspaceId) {
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

      const token = await getAuthToken();
      const userInfo = getUserInfo();

      // Determine endpoint and data based on role
      const endpoint = userRole === 'client' ? '/api/workspace/client-reject-progress' : '/api/workspace/reject-progress';
      const approvalStatus = userRole === 'client' ? 'client_rejected' : 'pm_rejected';
      const reviewStatus = userRole === 'client' ? 'client_rejected' : 'rejected';

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
        const updatedSubmission = {
          ...selectedProgress,
          approvalStatus,
          reviewStatus,
          rejectionReason,
          pmRejectedAt: new Date().toISOString()
        };
        setSelectedProgress(updatedSubmission);
        setProgressSubmissions(prev => prev.map(p => (p.id === updatedSubmission.id ? updatedSubmission : p)));
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

  // Whether the current viewer can still act on the selected submission.
  // PM acts while it's pending PM review; the client acts only once it has
  // moved on to client_approval_pending.
  const reviewStatus = selectedProgress?.reviewStatus || 'pending';
  const approvalStatus = selectedProgress?.approvalStatus || '';
  const canReview = Boolean(selectedProgress) && (userRole === 'client'
    ? reviewStatus === 'client_approval_pending'
    : reviewStatus === 'pending');

  const reviewStateMessage = (() => {
    if (!selectedProgress || canReview) return null;
    if (userRole === 'client') {
      if (reviewStatus === 'client_approved') return 'You approved this progress submission.';
      if (reviewStatus === 'client_rejected') return 'You rejected this progress submission.';
      if (reviewStatus === 'rejected' || approvalStatus === 'pm_rejected') return 'This submission was rejected by the PM.';
      return 'Awaiting PM review before client approval.';
    }
    if (approvalStatus === 'pm_approved' || reviewStatus === 'client_approval_pending') {
      return 'Approved — waiting for client approval.';
    }
    if (approvalStatus === 'pm_rejected' || reviewStatus === 'rejected') {
      return 'You rejected this progress submission.';
    }
    if (reviewStatus === 'client_approved') return 'Approved by the client.';
    if (reviewStatus === 'client_rejected') return 'Rejected by the client.';
    return 'This submission is no longer awaiting your review.';
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Review Progress</h2>
            <p className="text-sm text-dim mt-1">Review vendor progress submission</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-success">{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-danger" />
              <span className="text-danger">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-info"></div>
            </div>
          ) : progressSubmissions.length > 0 ? (
            <div className="space-y-6">
              {/* Submissions List */}
              {progressSubmissions.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-3">Progress Submissions</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-line rounded-lg p-3 bg-canvas">
                    {progressSubmissions.map((submission, index) => (
                      <button
                        key={submission.id}
                        onClick={() => {
                          setSelectedProgress(submission);
                          setShowRejectForm(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          selectedProgress?.id === submission.id
                            ? 'border-info bg-info/10'
                            : 'border-line bg-surface hover:border-line'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-ink">{submission.title}</p>
                            <p className="text-xs text-dim mt-1">
                              {new Date(submission.submittedAt).toLocaleDateString()} at {new Date(submission.submittedAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              submission.reviewStatus === 'client_approved' ? 'bg-success/10 text-success' :
                              submission.reviewStatus === 'client_approval_pending' ? 'bg-warning/10 text-warning' :
                              submission.reviewStatus === 'rejected' ? 'bg-danger/10 text-danger' :
                              submission.reviewStatus === 'client_rejected' ? 'bg-danger/10 text-danger' :
                              'bg-info/10 text-info'
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
                  <div className="flex items-center space-x-3 p-4 bg-info/10 rounded-lg border border-info/20">
                    <Clock className="w-5 h-5 text-info" />
                    <div>
                      <p className="text-sm font-medium text-info">Review Status</p>
                      <p className="text-xs text-info">{selectedProgress.reviewStatus || 'Pending Review'}</p>
                    </div>
                  </div>

                  {/* Progress Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Title</label>
                      <p className="text-ink">{selectedProgress.title || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Description</label>
                      <p className="text-ink">{selectedProgress.description || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">Work Done</label>
                        <p className="text-ink">{selectedProgress.workDone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">Work Pending</label>
                        <p className="text-ink">{selectedProgress.workPending || 'N/A'}</p>
                      </div>
                    </div>

                    {selectedProgress.taskId && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-ink mb-2">Task ID</label>
                          <p className="text-ink text-sm font-mono">{selectedProgress.taskId}</p>
                        </div>
                        {selectedProgress.subtaskId && (
                          <div>
                            <label className="block text-sm font-medium text-ink mb-2">Subtask ID</label>
                            <p className="text-ink text-sm font-mono">{selectedProgress.subtaskId}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedProgress.proofOfCompletion && (
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">Proof of Completion</label>
                        <a
                          href={selectedProgress.proofOfCompletion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-info hover:text-info underline text-sm"
                        >
                          View Attached File
                        </a>
                      </div>
                    )}

                    {selectedProgress.submittedAt && (
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">Submitted At</label>
                        <p className="text-ink text-sm">{new Date(selectedProgress.submittedAt).toLocaleString()}</p>
                      </div>
                    )}

                    {selectedProgress.pmApprovedAt && (
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">PM Approved At</label>
                        <p className="text-ink text-sm">{new Date(selectedProgress.pmApprovedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Rejection Form */}
                  {showRejectForm && canReview && (
                    <div className="p-4 bg-danger/10 rounded-lg border border-danger/20">
                      <label className="block text-sm font-medium text-ink mb-2">Rejection Reason</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please explain why this progress is being rejected..."
                        className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-danger focus:border-transparent resize-none"
                        rows="3"
                      />
                    </div>
                  )}

                  {/* Action Buttons — hidden once this viewer has already acted */}
                  {canReview ? (
                  !showRejectForm ? (
                    <div className="flex items-center space-x-3 pt-4 border-t border-line">
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="flex-1 px-4 py-3 bg-success hover:bg-success disabled:bg-cta text-cta-foreground font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{approving ? 'Approving...' : 'Approve Progress'}</span>
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={rejecting}
                        className="flex-1 px-4 py-3 bg-danger hover:bg-danger disabled:bg-cta text-cta-foreground font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{rejecting ? 'Rejecting...' : 'Reject Progress'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 pt-4 border-t border-line">
                      <button
                        onClick={handleReject}
                        disabled={rejecting}
                        className="flex-1 px-4 py-3 bg-danger hover:bg-danger disabled:bg-cta text-cta-foreground font-medium rounded-lg transition-colors"
                      >
                        {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        disabled={rejecting}
                        className="flex-1 px-4 py-3 bg-surface-hover hover:bg-cta disabled:bg-cta text-ink font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                  ) : reviewStateMessage ? (
                    <div className="pt-4 border-t border-line">
                      <div className="p-4 bg-canvas border border-line rounded-lg flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-dim" />
                        <span className="text-sm text-ink">{reviewStateMessage}</span>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-dim">No progress submissions available for review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewProgressModal;
