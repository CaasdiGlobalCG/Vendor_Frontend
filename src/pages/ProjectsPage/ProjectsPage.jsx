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
        <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 py-6 sm:px-5 lg:px-8 xl:px-10">
            <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 px-6 py-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/90">Delivery Overview</p>
                        <h1 className="mt-1 text-2xl font-semibold text-white font-['Poppins']">Projects List</h1>
                        <p className="mt-2 max-w-3xl text-sm text-emerald-50/95">
                            Review active engagements, workspace readiness, and ownership details in one place.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-2.5 py-1 text-xs font-medium text-white">
                                {projects.length} total
                            </span>
                            <span className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-2.5 py-1 text-xs font-medium text-white">
                                {displayedProjects.length} visible
                            </span>
                            <span className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-2.5 py-1 text-xs font-medium text-white">
                                {filterCounts.Pending || 0} pending
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-medium text-white/90">
                            Updated {formatDate(new Date())}
                        </span>
                        <Link
                            to="/VendorDashboard/leads"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/15 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25"
                        >
                            Leads
                            <ArrowPathIcon className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="relative w-full xl:max-w-sm">
                        <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="Search by project, manager, or ID"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        />
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    activeFilter === filter
                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {filter}
                                <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                                    activeFilter === filter ? 'bg-white text-emerald-700' : 'bg-white text-gray-500'
                                }`}>
                                    {filterCounts[filter] || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {accessFeedback ? (
                    <div className={`rounded-lg border px-3 py-2 text-sm ${
                        accessFeedback.toLowerCase().includes('success')
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                        {accessFeedback}
                    </div>
                ) : null}

                {loading ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-10 text-center shadow-sm">
                        <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                        <p className="mt-2 text-sm text-gray-500">Loading projects...</p>
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 py-10 text-center text-red-700">
                        {error}
                    </div>
                ) : displayedProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500 shadow-sm">
                        You do not have access to any projects.
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center shadow-sm">
                        <p className="text-sm text-gray-600">No projects found matching the current filter.</p>
                        <button
                            onClick={() => {
                                setActiveFilter('All');
                                setProjectSearch('');
                            }}
                            className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
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
































