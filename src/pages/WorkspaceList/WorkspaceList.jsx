import React, { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../context/VendorContext';
import { ArrowPathIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';
import config from '../../config/env';

const WorkspaceList = () => {
  const { currentUser } = useContext(VendorContext);
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkspaceLeads = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
          setError('You must be logged in to view workspaces.');
          setLoading(false);
          return;
        }

        const vendorId = currentUser.vendorId || currentUser.id;

        const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId }),
        });

        if (!res.ok) {
          throw new Error(`Failed to load workspace leads (${res.status})`);
        }

        const data = await res.json();
        if (!data.success || !Array.isArray(data.leads)) {
          throw new Error('Unexpected response while loading workspace leads.');
        }

        const approvedWithAccess = data.leads
          .filter((lead) => lead.pmId)
          .filter(
            (lead) =>
              lead.pmDecision?.approved &&
              lead.pmDecision?.workspaceAccess &&
              String(lead.vendorId) === String(vendorId),
          );

        const mapped = approvedWithAccess.map((lead) => ({
          leadId: lead.leadId,
          projectId: lead.projectId,
          projectName: lead.projectName,
          leadTitle: lead.leadTitle,
          specialization: lead.specialization,
          priority: lead.priority,
          pmName: lead.pmName,
          pmId: lead.pmId,
          sentAt: lead.sentAt,
          updatedAt: lead.updatedAt,
          description: lead.leadDescription,
        }));

        setWorkspaces(mapped);
      } catch (err) {
        console.error('WorkspaceList: error loading workspaces', err);
        setError(err.message || 'Failed to load workspaces.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceLeads();
  }, [currentUser]);

  const openWorkspace = async (item) => {
    try {
      if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
        alert('You must be logged in to access a workspace.');
        return;
      }

      const vendorId = currentUser.vendorId || currentUser.id;

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: item.projectId,
          pmId: item.pmId,
          vendorId,
          leadId: item.leadId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Workspace access failed (${response.status})`);
      }

      const workspaceData = await response.json();

      navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
        state: {
          leadId: item.leadId,
          leadDetails: {
            _id: item.leadId,
            name: item.leadTitle,
            clientId: item.projectId,
            description: item.description,
            status: 'approved',
          },
          workspaceId: workspaceData.workspace.workspaceId,
          isCollaborative: true,
          pmId: item.pmId,
          vendorId,
        },
      });
    } catch (err) {
      console.error('WorkspaceList: error opening workspace', err);
      alert(err.message || 'Failed to open workspace. Please try again.');
    }
  };

  const subtitle = useMemo(() => {
    return 'These workspaces are created for PM-approved collaborative projects where workspace access has been granted.';
  }, []);

  return (
    <div className="p-5 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Workspaces</h1>
          <p className="text-sm text-gray-600 max-w-2xl">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <ArrowPathIcon className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-lg text-center">
          <p className="mb-3">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-8 rounded-lg">
          <h2 className="text-base font-semibold mb-1">No workspaces available yet</h2>
          <p className="text-sm text-gray-600">
            Once a Project Manager approves your lead and grants workspace access, the workspace will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workspaces.map((item) => (
            <div
              key={item.leadId}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border border-gray-100"
            >
              <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                <div className="flex-1 min-w-[220px]">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{item.leadTitle || 'Workspace'}</h2>
                  {item.projectName && (
                    <p className="text-sm text-blue-600 font-medium">Project: {item.projectName}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                      Lead ID: {item.leadId}
                    </span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                      Project ID: {item.projectId}
                    </span>
                    {item.specialization && (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                        {item.specialization}
                      </span>
                    )}
                    {item.priority && (
                      <span
                        className={`px-3 py-1 rounded-full border font-semibold ${
                          item.priority === 'high'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : item.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end text-xs text-gray-600">
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-emerald-700">Workspace Ready</span>
                  </div>
                  {item.updatedAt && (
                    <p className="mt-1">
                      Last update:{' '}
                      {new Date(item.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">{item.description}</p>
              )}

              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="text-xs text-gray-600">
                  {item.pmName && (
                    <p>
                      PM:&nbsp;
                      <span className="font-medium text-gray-800">{item.pmName}</span>
                    </p>
                  )}
                  {item.sentAt && (
                    <p className="mt-0.5">
                      Sent:{' '}
                      {new Date(item.sentAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openWorkspace(item)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg transition-all"
                >
                  <RectangleGroupIcon className="w-4 h-4" />
                  Open workspace
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceList;


