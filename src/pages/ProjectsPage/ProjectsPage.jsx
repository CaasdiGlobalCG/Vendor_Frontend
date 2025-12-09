import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon, FunnelIcon } from '@heroicons/react/24/outline';
import ProjectCard from '../../components/ProjectPage/ProjectCard';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';
// API base URL - hardcoded for now, can be changed to use import.meta.env with Vite


const ProjectsPage = () => {
    const [activeFilter, setActiveFilter] = useState('All');
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useContext(VendorContext);
    
    const filters = ['All', 'New', 'Pending', 'Confirmed', 'Rejected', 'Completed'];

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
            if (!currentUser || (!currentUser.id && !currentUser.vendorId)) {
                setError("You must be logged in to view projects");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const vendorId = currentUser.vendorId || currentUser.id;
                console.log("Fetching projects for vendor ID:", vendorId);

                // Fetch vendor projects and vendor leads in parallel
                const [projectsRes, leadsRes] = await Promise.all([
                    fetch(`${config.VENDOR_BACKEND_URL}/api/projects/vendor/${vendorId}`),
                    fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
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

                setProjects(mergedProjects);
                setError(null);
            } catch (err) {
                console.error("Error fetching projects / approved leads:", err);
                setError("Failed to load projects. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchProjectsAndApprovedLeads();
    }, [currentUser]);

    // Filter projects based on activeFilter
    const displayedProjects = projects.filter(project => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'New') return project.status === null;
        if (activeFilter === 'Confirmed') return project.status === 'active';
        return project.status === activeFilter;
    });

    // Format date for display
    const formatDate = (date) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    };

    return (
        <div className="p-5 space-y-6">
            {/* Page Header Section */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    {/* Back button - Link or onClick handler */}
                    <button className="text-gray-600 hover:text-black">
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-800">Projects list</h1>
                        <p className="text-sm text-gray-500">An overview of all projects</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Navigation */}
                    <div className="flex items-center text-sm text-gray-600">
                        <button className="p-1 hover:bg-gray-200 rounded">
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <span className="mx-2 font-medium">{formatDate(new Date())}</span>
                        <button className="p-1 hover:bg-gray-200 rounded">
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                    {/* Leads Button - Changed to Link */}
                    <Link
                       to="/VendorDashboard/leads"
                       className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1.5 rounded-lg border border-emerald-200"
                    >
                        Leads
                        <ArrowPathIcon className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {/* Filter Tabs Section */}
            <div className="flex flex-wrap items-center gap-2">
                {filters.map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ease-in-out flex items-center gap-1.5 ${
                            activeFilter === filter
                                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black ring-opacity-5'
                                : 'bg-gray-200/60 text-gray-600 hover:bg-gray-300/80'
                        }`}
                    >
                        {filter === 'New' && <span className="h-2 w-2 bg-emerald-500 rounded-full"></span>}
                        {filter}
                    </button>
                ))}
                <button className="ml-auto p-2 rounded-lg bg-gray-200/60 text-gray-600 hover:bg-gray-300/80 lg:hidden">
                    <FunnelIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Project Cards Section */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <ArrowPathIcon className="h-8 w-8 text-emerald-600 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 py-8">
                        {error}
                    </div>
                ) : displayedProjects.length > 0 ? (
                    displayedProjects.map((project) => (
                        <ProjectCard key={project.id || project.projectId} project={project} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">No projects found matching the filter.</p>
                )}
            </div>
        </div>
    );
};

export default ProjectsPage;
































