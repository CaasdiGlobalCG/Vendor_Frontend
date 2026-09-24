import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ProjectCard from '../../components/ProjectPage/ProjectCard';
import { VendorContext } from '../../context/VendorContext';
import { useRBAC } from '../../rbac/context/RBACContext';
import { usePermission } from '../../rbac/hooks/usePermission';
import ResourceMemberAccessModal from '../../rbac/components/ResourceMemberAccessModal';
import { getProjectMemberAccess, updateProjectMemberAccess } from '../../rbac/api/rbacApi';
import config from '../../config/env';
// API base URL - hardcoded for now, can be changed to use import.meta.env with Vite


const ProjectsPage = () => {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('All');
    const [projectSearch, setProjectSearch] = useState('');
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessModalOpen, setAccessModalOpen] = useState(false);
    const [activeProjectAccess, setActiveProjectAccess] = useState(null);
    const [accessFeedback, setAccessFeedback] = useState('');
    const { currentUser } = useContext(VendorContext);
    const { accessScopes, hasRBAC, role, permissions = [] } = useRBAC();
    const { can } = usePermission();
    
    const filters = ['All', 'New', 'Pending', 'Confirmed', 'Rejected', 'Completed'];
    const isSuperAdminRole = role?.roleId === 'super_admin' || role?.isSuperAdmin === true;
    const hasWildcardPermission = Array.isArray(permissions) && permissions.includes('*:*');

    const canManageProjectAccess =
        hasRBAC && (
        isSuperAdminRole ||
        hasWildcardPermission ||
        can('projects', 'manage') ||
        can('projects', 'edit') ||
        can('user_management', 'manage') ||
        can('user_management', 'edit'));
    const hasProjectScopeRestriction = Boolean(
        accessScopes &&
        !accessScopes.allowAllProjects &&
        Array.isArray(accessScopes.projectIds) &&
        accessScopes.projectIds.length === 0
    );

    // Local helper to map new lead statuses to legacy labels
    const mapLeadStatus = (newStatus) => {
        switch (newStatus) {
            case 'sent':
                return null; // Pending
            case 'vendor_accepted':
                return 'approved';
            case 'vendor_declined':
                return 'rejected';
            case 'pm_approved':
                return 'approved';
            case 'pm_rejected':
                return 'rejected';
            default:
                return null;
        }
    };

    // Fetch projects (including approved leads) when component mounts or when currentUser changes
    useEffect(() => {
        const fetchProjectsAndApprovedLeads = async () => {
            if (hasProjectScopeRestriction) {
                setProjects([]);
                setLoading(false);
                setError(null);
                return;
            }

            if (!currentUser || (!currentUser.id && !currentUser.vendorId)) {
                setError("You must be logged in to view projects");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const vendorId = currentUser.vendorId || currentUser.id;
                const token = localStorage.getItem('authToken');
                const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
                console.log("Fetching projects for vendor ID:", vendorId);

                // Fetch vendor projects and vendor leads in parallel
                const [projectsRes, leadsRes] = await Promise.all([
                    fetch(`${config.VENDOR_BACKEND_URL}/api/projects/vendor/${vendorId}`, {
                        headers: authHeaders,
                        credentials: 'include',
                    }),
                    fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                        credentials: 'include',
                        body: JSON.stringify({ vendorId })
                    })
                ]);

                if (!projectsRes.ok) {
                    throw new Error(`Error fetching projects: ${projectsRes.status} ${projectsRes.statusText}`);
                }

                const projectsData = await projectsRes.json();
                console.log("Projects fetched:", projectsData);

                let mergedProjects = Array.isArray(projectsData) ? projectsData : [];

                // Safely process leads response – if it fails, we still show regular projects
                if (leadsRes.ok) {
                    const leadsPayload = await leadsRes.json();
                    console.log("Vendor leads fetched for projects view:", leadsPayload);

                    if (leadsPayload.success && Array.isArray(leadsPayload.leads)) {
                        const approvedLeads = leadsPayload.leads
                            // Only PM-sent collaborative leads (same filter as LeadsPage)
                            .filter(lead => lead.pmId)
                            // Keep only leads where PM has approved and granted workspace access
                            .filter(lead => lead.pmDecision?.approved && lead.pmDecision?.workspaceAccess)
                            // Ensure this lead belongs to the current vendor
                            .filter(lead => String(lead.vendorId) === String(vendorId));

                        const leadProjects = approvedLeads.map((lead) => ({
                            // Use projectId when available, otherwise fallback to leadId
                            id: lead.projectId || lead.leadId,
                            clientId: lead.projectId,
                            name: lead.projectName || lead.leadTitle || 'Approved Lead',
                            description: lead.leadDescription || '',
                            manager: lead.pmName || 'Project Manager',
                            // Basic dates & status for card display
                            startDate: lead.estimatedTimeline || '',
                            closeDate: '',
                            lastUpdate: lead.updatedAt
                                ? new Date(lead.updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                : '',
                            status: 'Pending', // Treated as pending project until lifecycle updates it
                            // Mark that this entry originated from a PM-approved lead with workspace access
                            fromLead: true,
                            leadId: lead.leadId,
                            pmId: lead.pmId,
                            hasWorkspaceAccess: true
                        }));

                        console.log(`Mapped ${leadProjects.length} approved leads into project cards`);
                        mergedProjects = [...mergedProjects, ...leadProjects];
                    }
                }

                // Filter out projects with name 'test' or 'default' (case-insensitive)
                const filteredProjects = mergedProjects.filter(
                    (project) => {
                        const name = (project.name || '').toLowerCase();
                        return name !== 'test' && name !== 'default';
                    }
                );
                setProjects(filteredProjects);
                setError(null);
            } catch (err) {
                console.error("Error fetching projects / approved leads:", err);
                setError("Failed to load projects. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchProjectsAndApprovedLeads();
    }, [currentUser, hasProjectScopeRestriction]);

    const matchesFilter = (project, filter) => {
        if (filter === 'All') return true;
        if (filter === 'New') return project.status === null;
        if (filter === 'Confirmed') return project.status === 'active';
        return project.status === filter;
    };

    const searchQuery = projectSearch.trim().toLowerCase();
    const displayedProjects = projects
        .filter((project) => matchesFilter(project, activeFilter))
        .filter((project) => {
            if (!searchQuery) return true;
            const haystack = [
                project?.name,
                project?.manager,
                project?.description,
                project?.id,
                project?.projectId,
                project?.clientId,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(searchQuery);
        });

    const filterCounts = filters.reduce((acc, filter) => {
        acc[filter] = projects.filter((project) => matchesFilter(project, filter)).length;
        return acc;
    }, {});

    // Format date for display
    const formatDate = (date) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    };

    const resolveProjectId = (project) => {
        return String(project?.projectId || project?.id || project?.clientId || '').trim();
    };

    const openProjectAccess = (project) => {
        const projectId = resolveProjectId(project);
        if (!projectId) {
            setAccessFeedback('Unable to resolve a project ID for this card.');
            return;
        }

        setAccessFeedback('');
        setActiveProjectAccess({
            projectId,
            label: project?.name || project?.projectName || projectId,
        });
        setAccessModalOpen(true);
    };

    const closeProjectAccess = () => {
        setAccessModalOpen(false);
        setActiveProjectAccess(null);
    };

    const openProjectSupport = (project) => {
        const projectId = resolveProjectId(project);
        if (!projectId) {
            setAccessFeedback('Unable to open support because the project ID is missing.');
            return;
        }

        navigate(`/VendorDashboard/support?module=project&ref=${encodeURIComponent(projectId)}`);
    };

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {/* Page header — plain, sits on the canvas (matches dashboard) */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm text-dim">Delivery overview</p>
                    <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">Projects</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-dim">
                        <span>{projects.length} total</span>
                        <span>{displayedProjects.length} visible</span>
                        <span>{filterCounts.Pending || 0} pending</span>
                        <span>Updated {formatDate(new Date())}</span>
                    </div>
                </div>

                <Link to="/VendorDashboard/leads" className="group inline-flex items-center gap-1 text-sm font-medium text-ink transition-colors hover:text-dim">
                    Leads
                    <ArrowPathIcon className="h-4 w-4" />
                </Link>
            </div>

            <div className="rounded-lg border border-line bg-surface p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="relative w-full xl:max-w-sm">
                        <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="Search by project, manager, or ID"
                            className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-[13px] text-ink focus:border-line focus:outline-none focus:ring-2 focus:ring-ink"
                        />
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4  text-dim" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                    activeFilter === filter
                                        ? 'border border-line bg-surface-hover text-ink'
                                        : 'border border-line bg-canvas text-dim hover:bg-surface-hover'
                                }`}
                            >
                                {filter}
                                <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                                    activeFilter === filter ? 'bg-surface text-ink' : 'bg-surface text-dim'
                                }`}>
                                    {filterCounts[filter] || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {accessFeedback ? (
                    <div className={`rounded-md border px-3 py-2 text-sm ${
                        accessFeedback.toLowerCase().includes('success')
                            ? 'border-success/20 bg-success/10 text-success'
                            : 'border-danger/20 bg-danger/10 text-danger'
                    }`}>
                        {accessFeedback}
                    </div>
                ) : null}

                {loading ? (
                    <div className="rounded-lg border border-line bg-surface py-10 text-center ">
                        <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-ink" />
                        <p className="mt-2 text-sm text-dim">Loading projects...</p>
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-danger/20 bg-danger/10 py-10 text-center text-danger">
                        {error}
                    </div>
                ) : displayedProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                        {displayedProjects.map((project) => (
                            <ProjectCard
                                key={project.id || project.projectId}
                                project={project}
                                canManageAccess={canManageProjectAccess}
                                onManageAccess={openProjectAccess}
                                onRaiseSupport={openProjectSupport}
                            />
                        ))}
                    </div>
                ) : hasProjectScopeRestriction ? (
                    <div className="rounded-lg border border-line bg-surface py-12 text-center text-sm text-dim ">
                        You do not have access to any projects.
                    </div>
                ) : (
                    <div className="rounded-lg border border-line bg-surface py-12 text-center ">
                        <p className="text-sm text-dim">No projects found matching the current filter.</p>
                        <button
                            onClick={() => {
                                setActiveFilter('All');
                                setProjectSearch('');
                            }}
                            className="mt-2 text-xs font-medium text-ink hover:text-ink"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            <ResourceMemberAccessModal
                isOpen={accessModalOpen}
                onClose={closeProjectAccess}
                resourceType="project"
                resourceId={activeProjectAccess?.projectId}
                resourceLabel={activeProjectAccess?.label}
                loadAccess={getProjectMemberAccess}
                saveAccess={updateProjectMemberAccess}
                onSaved={() => {
                    setAccessFeedback('Project member access updated successfully.');
                    setTimeout(() => setAccessFeedback(''), 2500);
                }}
            />
        </div>
    );
};

export default ProjectsPage;
































