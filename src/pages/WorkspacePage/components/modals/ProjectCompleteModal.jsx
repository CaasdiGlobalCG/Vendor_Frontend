import React, { useState, useEffect, useContext } from 'react';
import { X, CheckCircle, XCircle, Clock, FileDown } from 'lucide-react';
import { Auth } from 'aws-amplify';
import { VendorContext } from '../../../../context/VendorContext';

const ProjectCompleteModal = ({ isOpen, onClose, workspace, userRole, isPM, isClient }) => {
  const { currentUser } = useContext(VendorContext);
  const [projectStatus, setProjectStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get user info for authentication headers
  const getUserInfo = () => {
    const pmUser = sessionStorage.getItem('pmUser');
    if (pmUser) {
      try {
        return JSON.parse(pmUser);
      } catch (e) {}
    }
    
    const clientUser = sessionStorage.getItem('clientUser');
    if (clientUser) {
      try {
        return JSON.parse(clientUser);
      } catch (e) {}
    }
    
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
      loadProjectStatus();
    }
  }, [isOpen, workspace]);

  const loadProjectStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (workspace?.project_status) {
        setProjectStatus(workspace.project_status);
      } else {
        setError('No project completion request found');
        setProjectStatus(null);
      }
    } catch (err) {
      console.error('Error loading project status:', err);
      setError('Failed to load project status');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!projectStatus || !workspace?.workspaceId) {
      setError('Missing workspace or project information');
      return;
    }

    try {
      setApproving(true);
      setError(null);

      const token = await getAuthToken();
      const userInfo = getUserInfo();

      // Determine endpoint and data based on role
      const endpoint = isPM ? '/api/workspace/approve-project-complete' : '/api/workspace/client-approve-project-complete';
      const reviewStatus = isPM ? 'client_approval_pending' : 'complete';

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
          pmId: userInfo?.pmId,
          clientId: userInfo?.clientId,
          userRole: userRole,
          reviewStatus: reviewStatus,
          approvedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(isPM ? 'Project completion approved! Awaiting client approval.' : 'Project marked as complete!');
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 2000);
      } else {
        setError(result.message || 'Failed to approve project completion');
      }
    } catch (err) {
      console.error('Error approving project completion:', err);
      setError(`Failed to approve: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!projectStatus || !workspace?.workspaceId) {
      setError('Missing workspace or project information');
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

      const endpoint = isPM ? '/api/workspace/reject-project-complete' : '/api/workspace/client-reject-project-complete';
      const reviewStatus = isPM ? 'rejected' : 'client_rejected';

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
          pmId: userInfo?.pmId,
          clientId: userInfo?.clientId,
          userRole: userRole,
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
        setSuccessMessage('Project completion rejected.');
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 2000);
      } else {
        setError(result.message || 'Failed to reject project completion');
      }
    } catch (err) {
      console.error('Error rejecting project completion:', err);
      setError(`Failed to reject: ${err.message}`);
    } finally {
      setRejecting(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    switch(status) {
      case 'complete':
        return { bg: 'bg-success/10', text: 'text-success', label: '✓ Complete' };
      case 'client_approval_pending':
        return { bg: 'bg-warning/10', text: 'text-warning', label: '⏳ Awaiting Client' };
      case 'rejected':
      case 'client_rejected':
        return { bg: 'bg-danger/10', text: 'text-danger', label: '✗ Rejected' };
      default:
        return { bg: 'bg-info/10', text: 'text-info', label: '⏳ Pending Review' };
    }
  };

  const statusBadge = getStatusBadge(projectStatus?.reviewStatus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Project Completion Request</h2>
            <p className="text-sm text-dim mt-1">Review vendor's project completion submission</p>
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
          ) : projectStatus ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className={`flex items-center space-x-3 p-4 rounded-lg border ${statusBadge.bg} border-opacity-50`}>
                <Clock className={`w-5 h-5 ${statusBadge.text}`} />
                <div>
                  <p className={`text-sm font-medium ${statusBadge.text}`}>Status</p>
                  <p className={`text-xs ${statusBadge.text}`}>{statusBadge.label}</p>
                </div>
              </div>

              {/* Completion Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Completion Description</label>
                  <p className="text-ink p-4 bg-canvas rounded-lg">{projectStatus.completionDescription || 'N/A'}</p>
                </div>

                {projectStatus.completionFiles && (
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Attached Documents</label>
                    <a
                      href={projectStatus.completionFiles}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-info hover:text-info underline"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Download File</span>
                    </a>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-2 text-sm text-dim p-4 bg-canvas rounded-lg">
                  <div className="flex items-center justify-between">
                    <span>Submitted:</span>
                    <span className="font-medium">{new Date(projectStatus.submittedAt).toLocaleString()}</span>
                  </div>

                  {projectStatus.pmApprovedAt && (
                    <div className="flex items-center justify-between text-success">
                      <span>PM Approved:</span>
                      <span className="font-medium">{new Date(projectStatus.pmApprovedAt).toLocaleString()}</span>
                    </div>
                  )}

                  {projectStatus.clientApprovedAt && (
                    <div className="flex items-center justify-between text-success">
                      <span>Client Approved (Completed):</span>
                      <span className="font-medium">{new Date(projectStatus.clientApprovedAt).toLocaleString()}</span>
                    </div>
                  )}

                  {projectStatus.rejectionReason && (
                    <div className="flex items-start justify-between text-danger bg-danger/10 p-3 rounded mt-2">
                      <span>Rejection Reason:</span>
                      <span className="font-medium text-right ml-2">{projectStatus.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Form */}
              {showRejectForm && (
                <div className="p-4 bg-danger/10 rounded-lg border border-danger/20">
                  <label className="block text-sm font-medium text-ink mb-2">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please explain why this project completion is being rejected..."
                    className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-danger focus:border-transparent resize-none"
                    rows="3"
                  />
                </div>
              )}

              {/* Action Buttons - Only show if status is pending */}
              {(projectStatus.reviewStatus === 'pending' || 
                (isPM === false && projectStatus.reviewStatus === 'client_approval_pending')) && (
                <>
                  {!showRejectForm ? (
                    <div className="flex items-center space-x-3 pt-4 border-t border-line">
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="flex-1 px-4 py-3 bg-success hover:bg-success disabled:bg-cta text-cta-foreground font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{approving ? 'Approving...' : 'Approve Completion'}</span>
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={rejecting}
                        className="flex-1 px-4 py-3 bg-danger hover:bg-danger disabled:bg-cta text-cta-foreground font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{rejecting ? 'Rejecting...' : 'Reject Completion'}</span>
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
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-dim">No project completion request found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCompleteModal;
