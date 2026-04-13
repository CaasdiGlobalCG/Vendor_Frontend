import React, { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../context/VendorContext';
import { useRBAC } from '../../rbac/context/RBACContext';
import { usePermission } from '../../rbac/hooks/usePermission';
import { PermissionGate } from '../../rbac/components/PermissionGate';
import ResourceMemberAccessModal from '../../rbac/components/ResourceMemberAccessModal';
import { getWorkspaceMemberAccess, updateWorkspaceMemberAccess } from '../../rbac/api/rbacApi';
import {
  ArrowPathIcon,
  RectangleGroupIcon,
  ClipboardDocumentListIcon,
  FolderOpenIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  UserCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import config from '../../config/env';

/* ───── colour palette for card thumbnail backgrounds ───── */
const CARD_GRADIENTS = [
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-pink-500',
];

/* deterministic colour per card based on index */
const gradientFor = (idx) => CARD_GRADIENTS[idx % CARD_GRADIENTS.length];

/* ───── decorative shapes drawn inside the thumbnail area ───── */
const ThumbnailDecoration = ({ index }) => {
  const shapes = [
    /* grid of dots */
    <g key="dots" opacity="0.18">
      {[...Array(5)].map((_, r) =>
        [...Array(7)].map((_, c) => (
          <circle key={`${r}-${c}`} cx={40 + c * 32} cy={30 + r * 28} r="3" fill="white" />
        )),
      )}
    </g>,
    /* diagonal lines */
    <g key="lines" opacity="0.15" stroke="white" strokeWidth="2">
      {[...Array(10)].map((_, i) => (
        <line key={i} x1={i * 30} y1="0" x2={i * 30 + 160} y2="160" />
      ))}
    </g>,
    /* concentric circles */
    <g key="circles" opacity="0.13">
      {[3, 2, 1].map((s) => (
        <circle key={s} cx="140" cy="80" r={s * 40} fill="none" stroke="white" strokeWidth="2" />
      ))}
    </g>,
    /* scattered squares */
    <g key="squares" opacity="0.15" fill="white">
      <rect x="30" y="20" width="24" height="24" rx="4" transform="rotate(15 42 32)" />
      <rect x="180" y="50" width="32" height="32" rx="6" transform="rotate(-10 196 66)" />
      <rect x="80" y="90" width="18" height="18" rx="3" transform="rotate(25 89 99)" />
      <rect x="220" y="15" width="20" height="20" rx="4" />
    </g>,
  ];
  return shapes[index % shapes.length];
};

const WorkspaceList = () => {
  const { currentUser } = useContext(VendorContext);
  const { accessScopes, hasRBAC, role, permissions = [] } = useRBAC();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [thumbnails, setThumbnails] = useState({}); // leadId → { thumbnailUrl, ... }
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

        // Fetch thumbnails for all workspace leads in one batch
        if (mapped.length > 0) {
          try {
            const thumbRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/thumbnails/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              credentials: 'include',
              body: JSON.stringify({ leadIds: mapped.map(m => m.leadId) }),
            });
            if (thumbRes.ok) {
              const thumbData = await thumbRes.json();
              if (thumbData.success && thumbData.thumbnails) {
                setThumbnails(thumbData.thumbnails);
              }
            }
          } catch (thumbErr) {
            console.warn('WorkspaceList: failed to load thumbnails', thumbErr);
            // Non-critical — cards fall back to gradient
          }
        }
      } catch (err) {
        console.error('WorkspaceList: error loading workspaces', err);
        setError(err.message || 'Failed to load workspaces.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceLeads();
  }, [currentUser, hasWorkspaceScopeRestriction]);

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

  /* ───── priority badge helper ───── */
  const priorityClasses = (p) => {
    if (p === 'high') return 'bg-red-50 text-red-700 border-red-200';
    if (p === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

  const fmtRelativeTime = (dateValue) => {
    if (!dateValue) return null;
    const ts = new Date(dateValue).getTime();
    if (!Number.isFinite(ts)) return null;

    const diffMs = Date.now() - ts;
    if (diffMs < 0) return 'just now';

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return 'just now';
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
    if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d ago`;

    return fmtDate(dateValue);
  };

  return (
    <div className="p-5 space-y-6">
      {/* ── header ── */}
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
        /* ───────────── GRID OF CARDS ───────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {workspaces.map((item, idx) => {
            const isHovered = hoveredCard === item.leadId;
            const previewUpdatedAt =
              thumbnails[item.leadId]?.thumbnailUpdatedAt ||
              item.updatedAt ||
              item.sentAt;
            const previewUpdatedLabel = fmtRelativeTime(previewUpdatedAt);
            return (
              <div
                key={item.leadId}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 flex flex-col cursor-pointer"
                onMouseEnter={() => setHoveredCard(item.leadId)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => openWorkspace(item)}
              >
                {/* ── thumbnail / preview area ── */}
                <div
                  className={`relative h-40 ${thumbnails[item.leadId]?.thumbnailUrl ? 'bg-gray-100' : `bg-gradient-to-br ${gradientFor(idx)}`} overflow-hidden`}
                >
                  {/* Real thumbnail if available */}
                  {thumbnails[item.leadId]?.thumbnailUrl ? (
                    <img
                      src={thumbnails[item.leadId].thumbnailUrl}
                      alt={`${item.leadTitle || 'Workspace'} preview`}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                      onError={(e) => {
                        // On load failure, hide the image so gradient fallback shows
                        e.target.style.display = 'none';
                        e.target.parentElement.classList.add('bg-gradient-to-br', gradientFor(idx));
                      }}
                    />
                  ) : (
                    <>
                      {/* decorative SVG background (fallback) */}
                      <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 280 160"
                        preserveAspectRatio="none"
                      >
                        <ThumbnailDecoration index={idx} />
                      </svg>

                      {/* centre icon (fallback) */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className={`bg-white/20 backdrop-blur-sm rounded-2xl p-4 transition-transform duration-300 ${
                            isHovered ? 'scale-110' : 'scale-100'
                          }`}
                        >
                          <Squares2X2Icon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* status badge (top-right) */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-700">Ready</span>
                  </div>

                  {/* priority badge (top-left) */}
                  {item.priority && (
                    <div
                      className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${priorityClasses(
                        item.priority,
                      )} bg-white/90 backdrop-blur-sm shadow-sm`}
                    >
                      {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                    </div>
                  )}

                  {/* preview freshness badge */}
                  {previewUpdatedLabel && (
                    <div className="absolute left-2.5 bottom-2.5 inline-flex items-center gap-1.5 bg-black/55 text-white text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                      <CalendarDaysIcon className="w-3 h-3" />
                      <span>Updated {previewUpdatedLabel}</span>
                    </div>
                  )}

                  {/* hover overlay with open button */}
                  <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      Open Workspace
                    </span>
                  </div>
                </div>

                {/* ── card body ── */}
                <div className="flex flex-col flex-1 p-4 space-y-3">
                  {/* title + project */}
                  <div className="min-h-[48px]">
                    <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                      {item.leadTitle || 'Workspace'}
                    </h3>
                    {item.projectName && (
                      <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">
                        {item.projectName}
                      </p>
                    )}
                  </div>

                  {/* description */}
                  {item.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* tags row */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.specialization && (
                      <span className="inline-flex items-center text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                        {item.specialization}
                      </span>
                    )}
                  </div>

                  {/* spacer to push meta to bottom */}
                  <div className="flex-1" />

                  {/* meta details */}
                  <div className="space-y-1.5 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate" title={item.leadId}>
                        {item.leadId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <FolderOpenIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate" title={item.projectId}>
                        {item.projectId}
                      </span>
                    </div>
                    {item.pmName && (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <UserCircleIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">PM: {item.pmName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{fmtDate(item.sentAt) || '—'}</span>
                      </div>
                      {item.updatedAt && (
                        <span className="text-[10px] text-gray-400">
                          Updated {fmtDate(item.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <PermissionGate module="workspace" action="view">
                  <div className="flex flex-wrap items-center gap-2">
                    {canManageWorkspaceAccess ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWorkspaceAccess(item);
                        }}
                        disabled={resolvingWorkspaceLeadId === item.leadId}
                        className="inline-flex items-center gap-2 bg-white border border-teal-300 text-teal-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-teal-50 transition-all disabled:opacity-60"
                      >
                        {resolvingWorkspaceLeadId === item.leadId ? 'Preparing...' : 'Manage Access'}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openWorkspace(item)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg transition-all"
                    >
                      <RectangleGroupIcon className="w-4 h-4" />
                      Open workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => openWorkspaceSupport(item)}
                      disabled={resolvingWorkspaceLeadId === item.leadId}
                      className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-60"
                    >
                      Support
                    </button>
                  </div>
                </PermissionGate>
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


