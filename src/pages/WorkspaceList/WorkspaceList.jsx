import React, { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../context/VendorContext';
import { useRBAC } from '../../rbac/context/RBACContext';
import { usePermission } from '../../rbac/hooks/usePermission';
import { PermissionGate } from '../../rbac/components/PermissionGate';
import ResourceMemberAccessModal from '../../rbac/components/ResourceMemberAccessModal';
import { getWorkspaceMemberAccess, updateWorkspaceMemberAccess } from '../../rbac/api/rbacApi';
import authFetch from '../../utils/authFetch';
import {
  ArrowPathIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import config from '../../config/env';

const CARD_SURFACES = [
  'bg-emerald-50',
  'bg-blue-50',
  'bg-violet-50',
  'bg-amber-50',
  'bg-rose-50',
  'bg-cyan-50',
  'bg-lime-50',
  'bg-slate-100',
];

const surfaceFor = (idx) => CARD_SURFACES[idx % CARD_SURFACES.length];

const asLowerString = (value) => (typeof value === 'string' ? value.toLowerCase() : String(value || '').toLowerCase());

const initialsFor = (value) => {
  const source = String(value || '').trim();
  if (!source) return 'WS';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getNodePosition = (node) => {
  const position = node?.positionAbsolute || node?.position || {};
  return {
    x: Number.isFinite(position.x) ? position.x : 0,
    y: Number.isFinite(position.y) ? position.y : 0,
  };
};

const extractWorkspacePreview = (workspace) => {
  const candidates = [];
  const rootNodes = Array.isArray(workspace?.nodes) ? workspace.nodes : [];
  const rootEdges = Array.isArray(workspace?.edges) ? workspace.edges : [];

  if (workspace?.previewSnapshot) {
    candidates.push({
      imageUrl: workspace.previewSnapshot,
      nodes: rootNodes,
      edges: rootEdges,
      source: 'root-snapshot',
      updatedAt: workspace?.updatedAt || workspace?.createdAt || null,
    });
  }

  if (rootNodes.length > 0 || rootEdges.length > 0) {
    candidates.push({
      nodes: rootNodes,
      edges: rootEdges,
      source: 'root',
      updatedAt: workspace?.updatedAt || workspace?.createdAt || null,
    });
  }

  for (const task of Array.isArray(workspace?.tasks) ? workspace.tasks : []) {
    for (const subtask of Array.isArray(task?.subtasks) ? task.subtasks : []) {
      const canvasData = subtask?.canvasData;
      if (canvasData?.previewSnapshot) {
        candidates.push({
          imageUrl: canvasData.previewSnapshot,
          nodes: Array.isArray(canvasData?.nodes) ? canvasData.nodes : [],
          edges: Array.isArray(canvasData?.edges) ? canvasData.edges : [],
          source: 'subtask-snapshot',
          updatedAt: subtask?.updatedAt || task?.updatedAt || workspace?.updatedAt || null,
        });
      }
      const nodes = Array.isArray(canvasData?.nodes) ? canvasData.nodes : [];
      const edges = Array.isArray(canvasData?.edges) ? canvasData.edges : [];
      if (nodes.length > 0 || edges.length > 0) {
        candidates.push({
          nodes,
          edges,
          source: 'subtask',
          updatedAt: subtask?.updatedAt || task?.updatedAt || workspace?.updatedAt || null,
        });
      }
    }
  }

  candidates.sort((left, right) => {
    const rightHasImage = Boolean(right.imageUrl);
    const leftHasImage = Boolean(left.imageUrl);
    if (leftHasImage !== rightHasImage) {
      return rightHasImage - leftHasImage;
    }

    const rightScore = (right.nodes?.length || 0) + (right.edges?.length || 0);
    const leftScore = (left.nodes?.length || 0) + (left.edges?.length || 0);
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    return rightTime - leftTime;
  });

  return candidates[0] || { nodes: [], edges: [], source: 'empty' };
};

const WorkspaceList = () => {
  const { currentUser } = useContext(VendorContext);
  const { accessScopes, hasRBAC, role, permissions = [] } = useRBAC();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workspacePreviews, setWorkspacePreviews] = useState({});
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [activeWorkspaceAccess, setActiveWorkspaceAccess] = useState(null);
  const [resolvingWorkspaceLeadId, setResolvingWorkspaceLeadId] = useState('');
  const [accessFeedback, setAccessFeedback] = useState('');
  const { can } = usePermission();
  const isSuperAdminRole = role?.roleId === 'super_admin' || role?.isSuperAdmin === true;
  const hasWildcardPermission = Array.isArray(permissions) && permissions.includes('*:*');
  const canManageWorkspaceAccess =
    hasRBAC && (
    isSuperAdminRole ||
    hasWildcardPermission ||
    can('workspace', 'manage') ||
    can('workspace', 'edit') ||
    can('user_management', 'manage') ||
    can('user_management', 'edit'));
  const hasWorkspaceScopeRestriction = Boolean(
    accessScopes &&
    !accessScopes.allowAllWorkspaces &&
    Array.isArray(accessScopes.workspaceIds) &&
    accessScopes.workspaceIds.length === 0 &&
    !accessScopes.allowAllProjects &&
    Array.isArray(accessScopes.projectIds) &&
    accessScopes.projectIds.length === 0
  );

  useEffect(() => {
    const fetchWorkspaceLeads = async () => {
      try {
        setLoading(true);
        setError(null);

        if (hasWorkspaceScopeRestriction) {
          setWorkspaces([]);
          setLoading(false);
          return;
        }

        if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
          setError('You must be logged in to view workspaces.');
          setLoading(false);
          return;
        }

        const vendorId = currentUser.vendorId || currentUser.id;
        const token = localStorage.getItem('authToken');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          credentials: 'include',
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
  }, [currentUser, hasWorkspaceScopeRestriction]);

  useEffect(() => {
    let cancelled = false;

    const fetchWorkspacePreviews = async () => {
      if (!currentUser || workspaces.length === 0) {
        setWorkspacePreviews({});
        return;
      }

      const vendorId = currentUser.vendorId || currentUser.id;
      const token = localStorage.getItem('authToken');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const previewEntries = await Promise.all(
        workspaces.map(async (item) => {
          try {
            const resolveResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              credentials: 'include',
              body: JSON.stringify({
                projectId: item.projectId,
                pmId: item.pmId,
                vendorId,
                leadId: item.leadId,
              }),
            });

            if (!resolveResponse.ok) {
              return [item.leadId, null];
            }

            const resolved = await resolveResponse.json();
            const resolvedWorkspace = resolved?.workspace;
            const workspaceId = resolvedWorkspace?.workspaceId || resolvedWorkspace?.id;
            if (!workspaceId) {
              return [item.leadId, null];
            }

            const resolvedPreview = extractWorkspacePreview(resolvedWorkspace);
            const hasResolvedPreview = Boolean(
              resolvedPreview?.imageUrl ||
              (Array.isArray(resolvedPreview?.nodes) && resolvedPreview.nodes.length > 0) ||
              (Array.isArray(resolvedPreview?.edges) && resolvedPreview.edges.length > 0)
            );

            if (hasResolvedPreview) {
              return [
                item.leadId,
                {
                  workspaceId,
                  imageUrl: resolvedPreview.imageUrl || null,
                  nodes: Array.isArray(resolvedPreview.nodes) ? resolvedPreview.nodes : [],
                  edges: Array.isArray(resolvedPreview.edges) ? resolvedPreview.edges : [],
                  source: resolvedPreview.source || 'resolved-workspace',
                  updatedAt: resolvedPreview.updatedAt || resolvedWorkspace?.updatedAt || null,
                },
              ];
            }

            const workspaceResponse = await authFetch(`/api/workspaces/${workspaceId}`, {
              headers: authHeaders,
            });

            if (!workspaceResponse.ok) {
              return [item.leadId, { workspaceId, nodes: [], edges: [], source: 'empty' }];
            }

            const workspace = await workspaceResponse.json();
            const preview = extractWorkspacePreview(workspace);

            return [
              item.leadId,
              {
                workspaceId,
                imageUrl: preview.imageUrl || null,
                nodes: Array.isArray(preview.nodes) ? preview.nodes : [],
                edges: Array.isArray(preview.edges) ? preview.edges : [],
                source: preview.source || 'empty',
                updatedAt: preview.updatedAt || null,
              },
            ];
          } catch (previewError) {
            console.warn('WorkspaceList: failed to load workspace preview', item.leadId, previewError);
            return [item.leadId, null];
          }
        })
      );

      if (!cancelled) {
        setWorkspacePreviews(Object.fromEntries(previewEntries.filter(([, value]) => Boolean(value))));
      }
    };

    fetchWorkspacePreviews();

    return () => {
      cancelled = true;
    };
  }, [currentUser, workspaces]);

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

  const resolveWorkspaceForLead = async (item) => {
    if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
      throw new Error('You must be logged in to manage workspace access.');
    }

    const vendorId = currentUser.vendorId || currentUser.id;
    const token = localStorage.getItem('authToken');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      credentials: 'include',
      body: JSON.stringify({
        projectId: item.projectId,
        pmId: item.pmId,
        vendorId,
        leadId: item.leadId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve workspace (${response.status})`);
    }

    const payload = await response.json();
    const workspaceId = payload?.workspace?.workspaceId;
    if (!workspaceId) {
      throw new Error('Workspace id was not returned.');
    }
    return workspaceId;
  };

  const openWorkspaceAccess = async (item) => {
    try {
      setAccessFeedback('');
      setResolvingWorkspaceLeadId(item.leadId);
      const workspaceId = await resolveWorkspaceForLead(item);

      setActiveWorkspaceAccess({
        workspaceId,
        label: item.leadTitle || item.projectName || workspaceId,
      });
      setAccessModalOpen(true);
    } catch (err) {
      setAccessFeedback(err?.message || 'Failed to open workspace access editor.');
    } finally {
      setResolvingWorkspaceLeadId('');
    }
  };

  const openWorkspaceSupport = async (item) => {
    try {
      setAccessFeedback('');
      setResolvingWorkspaceLeadId(item.leadId);
      const workspaceId = await resolveWorkspaceForLead(item);
      navigate(`/VendorDashboard/support?module=workspace&ref=${encodeURIComponent(workspaceId)}`);
    } catch (err) {
      setAccessFeedback(err?.message || 'Failed to open workspace support.');
    } finally {
      setResolvingWorkspaceLeadId('');
    }
  };

  const subtitle = useMemo(() => {
    return 'These workspaces are created for PM-approved collaborative projects where workspace access has been granted.';
  }, []);

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

  /* ───── priority badge helper ───── */
  const priorityClasses = (p) => {
    if (p === 'high') return 'bg-red-50 text-red-700 border-red-100';
    if (p === 'medium') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  };

  return (
    <div className="p-5 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Workspaces</h1>
          <p className="text-sm text-gray-600 max-w-2xl">{subtitle}</p>
        </div>
        {!loading && workspaces.length > 0 && (
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
            {workspaces.length} workspace{workspaces.length !== 1 && 's'}
          </span>
        )}
      </div>

      {/* ── states ── */}
      {accessFeedback ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm">
          {accessFeedback}
        </div>
      ) : null}

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
          {hasWorkspaceScopeRestriction ? (
            <>
              <h2 className="text-base font-semibold mb-1">No workspace access</h2>
              <p className="text-sm text-gray-600">You do not have access to any projects or workspaces.</p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold mb-1">No workspaces available yet</h2>
              <p className="text-sm text-gray-600">
                Once a Project Manager approves your lead and grants workspace access, the workspace will appear here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {workspaces.map((item, idx) => {
            const preview = workspacePreviews[item.leadId];
            const title = item.leadTitle || 'Workspace';
            const subtitleText = item.projectName || item.specialization || 'Collaborative workspace';
            const priorityLabel = item.priority ? String(item.priority) : '';
            const editedLabel = item.updatedAt
              ? `Edited ${fmtDate(item.updatedAt)}`
              : item.sentAt
                ? `Edited ${fmtDate(item.sentAt)}`
                : 'Recently updated';
            const avatarLabel = initialsFor(item.pmName || title);
            return (
              <div
                key={item.leadId}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                onClick={() => openWorkspace(item)}
              >
                <div
                  className={`relative h-48 overflow-hidden bg-white ${preview?.imageUrl || preview?.nodes?.length || preview?.edges?.length ? 'bg-white' : surfaceFor(idx)}`}
                >
                  {preview?.imageUrl ? (
                    <img
                      src={preview.imageUrl}
                      alt={`${title} snapshot`}
                      className="h-full w-full object-cover object-top"
                      loading="lazy"
                    />
                  ) : preview?.nodes?.length || preview?.edges?.length ? (
                    <WorkspaceCanvasPreview preview={preview} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                        <Squares2X2Icon className="h-8 w-8 text-gray-500" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">No canvas preview yet</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/12 to-transparent" />

                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/80 bg-white/92 px-2.5 py-1 text-[10px] font-medium text-gray-700 shadow-sm">
                      Workspace
                    </span>
                    {priorityLabel && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium shadow-sm ${priorityClasses(
                          asLowerString(priorityLabel),
                        )}`}
                      >
                        {priorityLabel.charAt(0).toUpperCase() + priorityLabel.slice(1)}
                      </span>
                    )}
                  </div>

                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/80 bg-white/92 px-2.5 py-1 text-[10px] font-medium text-emerald-700 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ready
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-gray-900">{title}</h3>
                      <p className="mt-0.5 truncate text-sm text-gray-500">{editedLabel}</p>
                    </div>

                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-amber-100 text-[11px] font-semibold text-amber-700">
                      {avatarLabel}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <RectangleGroupIcon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{subtitleText}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">Lead</p>
                      <p className="truncate text-xs text-gray-500" title={item.leadId}>{item.leadId}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManageWorkspaceAccess ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWorkspaceAccess(item);
                          }}
                          disabled={resolvingWorkspaceLeadId === item.leadId}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                        >
                          {resolvingWorkspaceLeadId === item.leadId ? 'Preparing...' : 'Access'}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWorkspace(item);
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ResourceMemberAccessModal
        isOpen={accessModalOpen}
        onClose={() => {
          setAccessModalOpen(false);
          setActiveWorkspaceAccess(null);
        }}
        resourceType="workspace"
        resourceId={activeWorkspaceAccess?.workspaceId}
        resourceLabel={activeWorkspaceAccess?.label}
        loadAccess={getWorkspaceMemberAccess}
        saveAccess={updateWorkspaceMemberAccess}
        onSaved={() => {
          setAccessFeedback('Workspace member access updated successfully.');
          setTimeout(() => setAccessFeedback(''), 2500);
        }}
      />
    </div>
  );
};

export default WorkspaceList;

function WorkspaceCanvasPreview({ preview }) {
  const nodes = Array.isArray(preview?.nodes) ? preview.nodes.slice(0, 18) : [];
  const edges = Array.isArray(preview?.edges) ? preview.edges.slice(0, 24) : [];

  if (nodes.length === 0 && edges.length === 0) {
    return null;
  }

  const positionedNodes = nodes.map((node, index) => {
    const position = getNodePosition(node);
    return {
      id: node?.id || `node-${index}`,
      x: position.x,
      y: position.y,
      width: Math.max(56, Math.min(128, Number(node?.style?.width) || Number(node?.width) || 86)),
      height: Math.max(30, Math.min(88, Number(node?.style?.height) || Number(node?.height) || 42)),
      type: node?.type || 'default',
    };
  });

  const xValues = positionedNodes.map((node) => node.x);
  const yValues = positionedNodes.map((node) => node.y);
  const maxXValues = positionedNodes.map((node) => node.x + node.width);
  const maxYValues = positionedNodes.map((node) => node.y + node.height);

  const minX = xValues.length ? Math.min(...xValues) : 0;
  const minY = yValues.length ? Math.min(...yValues) : 0;
  const maxX = maxXValues.length ? Math.max(...maxXValues) : 100;
  const maxY = maxYValues.length ? Math.max(...maxYValues) : 100;
  const width = Math.max(240, maxX - minX + 80);
  const height = Math.max(150, maxY - minY + 80);
  const nodeMap = new Map(positionedNodes.map((node) => [node.id, node]));

  return (
    <svg
      className="h-full w-full bg-[#fbfcfe]"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Workspace canvas preview"
    >
      <rect width={width} height={height} fill="#fbfcfe" />
      {Array.from({ length: Math.ceil(width / 32) }).map((_, index) => (
        <line
          key={`v-${index}`}
          x1={index * 32}
          y1="0"
          x2={index * 32}
          y2={height}
          stroke="#eef2f7"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: Math.ceil(height / 32) }).map((_, index) => (
        <line
          key={`h-${index}`}
          x1="0"
          y1={index * 32}
          x2={width}
          y2={index * 32}
          stroke="#eef2f7"
          strokeWidth="1"
        />
      ))}

      {edges.map((edge, index) => {
        const source = nodeMap.get(edge?.source);
        const target = nodeMap.get(edge?.target);
        if (!source || !target) return null;

        const startX = source.x + source.width / 2 - minX + 40;
        const startY = source.y + source.height / 2 - minY + 40;
        const endX = target.x + target.width / 2 - minX + 40;
        const endY = target.y + target.height / 2 - minY + 40;
        const controlX = (startX + endX) / 2;

        return (
          <path
            key={edge?.id || `edge-${index}`}
            d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
        );
      })}

      {positionedNodes.map((node, index) => {
        const x = node.x - minX + 40;
        const y = node.y - minY + 40;
        const nodeType = asLowerString(node.type);
        const fill = nodeType.includes('text')
          ? '#fef3c7'
          : nodeType.includes('image')
            ? '#dbeafe'
            : nodeType.includes('sticky')
              ? '#fee2e2'
              : '#ffffff';

        return (
          <g key={node.id || `node-${index}`}>
            <rect
              x={x + 2}
              y={y + 3}
              width={node.width}
              height={node.height}
              rx="12"
              fill="#dfe7f3"
              opacity="0.45"
            />
            <rect
              x={x}
              y={y}
              width={node.width}
              height={node.height}
              rx="12"
              fill={fill}
              stroke="#cfd8e3"
            />
            <rect
              x={x + 10}
              y={y + 10}
              width={Math.max(18, node.width * 0.45)}
              height="6"
              rx="3"
              fill="#cbd5e1"
            />
            <rect
              x={x + 10}
              y={y + 22}
              width={Math.max(26, node.width * 0.65)}
              height="5"
              rx="2.5"
              fill="#e2e8f0"
            />
          </g>
        );
      })}
    </svg>
  );
}


