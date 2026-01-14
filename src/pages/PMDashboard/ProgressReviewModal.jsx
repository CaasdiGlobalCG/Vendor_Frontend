import React, { useEffect, useState, useContext } from 'react';
import { X, FileText } from 'lucide-react';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';

const ProgressReviewModal = ({ isOpen, onClose, workspaceId }) => {
  const { currentUser } = useContext(VendorContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!workspaceId) return;

    const fetchWorkspace = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = {
          'Content-Type': 'application/json'
        };
        if (currentUser) {
          headers['x-user-info'] = JSON.stringify({
            vendorId: currentUser.vendorId,
            email: currentUser.email,
            role: currentUser.role || 'pm',
            name: currentUser.name
          });
        }

        const res = await fetch(`${config.VENDOR_BACKEND_URL || ''}/api/workspaces/${encodeURIComponent(workspaceId)}`, {
          headers
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to fetch workspace (${res.status})`);
        }

        const data = await res.json();
        // Controller returns workspace under data or workspace
        const ws = data.workspaces || data.workspace || data.data || data;
        setWorkspace(ws);
      } catch (err) {
        console.error('Error fetching workspace for progress review:', err);
        setError(err.message || 'Failed to load workspace');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [isOpen, workspaceId, currentUser]);

  if (!isOpen) return null;

  const projectStatus = workspace?.project_status || null;
  const completionReq = workspace?.projectCompletionRequest || null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Progress Review</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Task Progress</h3>
                {!projectStatus ? (
                  <p className="text-sm text-gray-500">No task progress available.</p>
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="text-sm font-semibold">{projectStatus.title || 'Untitled'}</p>
                    <p className="text-sm text-gray-600 mt-1">{projectStatus.description}</p>
                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                      <div><strong>Work Done:</strong> {projectStatus.workDone || '—'}</div>
                      <div><strong>Work Remaining:</strong> {projectStatus.workPending || '—'}</div>
                      <div><strong>Task:</strong> {projectStatus.taskId || '—'}</div>
                      <div><strong>Subtask:</strong> {projectStatus.subtaskId || '—'}</div>
                      <div><strong>Updated At:</strong> {projectStatus.updatedAt || '—'}</div>
                    </div>
                    {projectStatus.proofOfCompletion && (
                      <div className="mt-3">
                        <a href={projectStatus.proofOfCompletion} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-blue-600">
                          <FileText className="w-4 h-4 mr-2" /> View Proof
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Project Progress</h3>
                {!completionReq ? (
                  <p className="text-sm text-gray-500">No project completion request submitted.</p>
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <div className="text-sm text-gray-700"><strong>Marked Completed:</strong> {completionReq.markCompleted ? 'Yes' : 'No'}</div>
                    <div className="text-sm text-gray-700 mt-2"><strong>Description:</strong></div>
                    <p className="text-sm text-gray-600 mt-1">{completionReq.completionDescription}</p>
                    <div className="mt-3 text-xs text-gray-500">
                      <div><strong>Submitted At:</strong> {completionReq.submittedAt || '—'}</div>
                      <div><strong>Vendor:</strong> {completionReq.vendorId || '—'}</div>
                    </div>
                    {completionReq.completionFiles && (
                      <div className="mt-3">
                        <a href={completionReq.completionFiles} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-blue-600">
                          <FileText className="w-4 h-4 mr-2" /> View Documents
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressReviewModal;
