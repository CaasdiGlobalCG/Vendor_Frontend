import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../context/VendorContext';
import { 
  PlusIcon, 
  RectangleGroupIcon, 
  UserGroupIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import ProgressReviewModal from './ProgressReviewModal';

const PMDashboard = () => {
  const { currentUser, setUser } = useContext(VendorContext);
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProgressReview, setShowProgressReview] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);

  // Redirect if not PM
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'pm') {
      navigate('/login');
      return;
    }
    
    // Load PM projects
    loadProjects();
  }, [currentUser, navigate]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // TODO: Connect to real API
      setProjects([]);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/pm-login');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending_vendor_acceptance': { 
        color: 'bg-warning/10 text-warning', 
        icon: ClockIcon,
        text: 'Pending Vendors' 
      },
      'in_progress': { 
        color: 'bg-info/10 text-info', 
        icon: CheckCircleIcon,
        text: 'In Progress' 
      },
      'completed': { 
        color: 'bg-success/10 text-success', 
        icon: CheckCircleIcon,
        text: 'Completed' 
      }
    };
    
    const config = statusConfig[status] || { 
      color: 'bg-surface-hover text-ink', 
      icon: ExclamationTriangleIcon,
      text: 'Unknown' 
    };
    
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const openWorkspace = (project) => {
    if (project.workspaceId) {
      // Navigate to existing workspace
      navigate(`/VendorDashboard/workspace/${project.workspaceId}`, {
        state: {
          projectId: project.id,
          projectDetails: project,
          userRole: 'pm'
        }
      });
    } else {
      // Create new workspace
      createWorkspaceForProject(project);
    }
  };

  const createWorkspaceForProject = async (project) => {
    try {
      // This will create a workspace and invite vendors
      const response = await fetch('/api/pm-integration/create-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          pmId: currentUser.id,
          projectName: project.name,
          invitedVendors: project.invitedVendors.filter(v => v.status === 'accepted'),
          workspaceTemplate: 'construction'
        })
      });

      if (response.ok) {
        const workspace = await response.json();
        
        // Update project with workspace ID
        setProjects(prev => prev.map(p => 
          p.id === project.id 
            ? { ...p, workspaceId: workspace.workspaceId }
            : p
        ));

        // Navigate to workspace
        navigate(`/VendorDashboard/workspace/${workspace.workspaceId}`, {
          state: {
            projectId: project.id,
            projectDetails: project,
            userRole: 'pm'
          }
        });
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-info mx-auto"></div>
          <p className="mt-4 text-dim">Loading PM Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="bg-surface  border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-ink">PM Dashboard</h1>
              <span className="ml-3 px-2 py-1 bg-info/10 text-info text-xs rounded-full">
                Testing Mode
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-dim">
                Welcome, <span className="font-medium">{currentUser?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-dim hover:text-ink"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <RectangleGroupIcon className="h-8 w-8 text-info" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-dim">Total Projects</p>
                <p className="text-2xl font-semibold text-ink">{projects.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-warning" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-dim">Pending Vendors</p>
                <p className="text-2xl font-semibold text-ink">
                  {projects.filter(p => p.status === 'pending_vendor_acceptance').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-dim">Active Projects</p>
                <p className="text-2xl font-semibold text-ink">
                  {projects.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-ink" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-dim">Total Vendors</p>
                <p className="text-2xl font-semibold text-ink">
                  {projects.reduce((acc, p) => acc + p.invitedVendors.length, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-surface rounded-lg shadow">
          <div className="px-6 py-4 border-b border-line">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-ink">My Projects</h2>
              <button
                onClick={() => setShowCreateProject(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-info hover:bg-info"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Project
              </button>
            </div>
          </div>

          <div className="divide-y divide-line">
            {projects.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <RectangleGroupIcon className="mx-auto h-12 w-12 text-dim" />
                <h3 className="mt-2 text-sm font-medium text-ink">No projects</h3>
                <p className="mt-1 text-sm text-dim">Get started by creating a new project.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent  text-sm font-medium rounded-md text-white bg-info hover:bg-info"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Project
                  </button>
                </div>
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-ink truncate">
                          {project.name}
                        </h3>
                        {getStatusBadge(project.status)}
                      </div>
                      <p className="mt-1 text-sm text-dim truncate">
                        {project.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-dim">
                        <span>Budget: {project.budget}</span>
                        <span>Timeline: {project.timeline}</span>
                        <span>
                          Vendors: {project.invitedVendors.filter(v => v.status === 'accepted').length}/
                          {project.invitedVendors.length} accepted
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openWorkspace(project)}
                        className="inline-flex items-center px-3 py-1.5 border border-line text-xs font-medium rounded text-ink bg-surface hover:bg-canvas"
                      >
                        <RectangleGroupIcon className="h-3 w-3 mr-1" />
                        {project.workspaceId ? 'Open Workspace' : 'Create Workspace'}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (project.workspaceId) {
                            setSelectedWorkspaceId(project.workspaceId);
                            setShowProgressReview(true);
                          } else {
                            alert('Workspace not created for this project yet');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-info hover:bg-info"
                      >
                        Progress Review
                      </button>
                      
                      <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-info bg-info/10 hover:bg-info/20">
                        Manage
                        <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </button>
                    </div>
                  </div>

                  {/* Vendor Status */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.invitedVendors.map((vendor) => (
                      <span
                        key={vendor.vendorId}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          vendor.status === 'accepted' 
                            ? 'bg-success/10 text-success'
                            : vendor.status === 'declined'
                            ? 'bg-danger/10 text-danger' 
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {vendor.name} - {vendor.status}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Create Project Modal - Placeholder */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-cta bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-ink mb-4">Create New Project</h3>
            <p className="text-sm text-dim mb-4">
              Project creation wizard will be implemented next. For now, you can test the collaborative workspace with existing projects.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateProject(false)}
                className="px-4 py-2 border border-line rounded-md text-sm font-medium text-ink hover:bg-canvas"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Review Modal */}
      {showProgressReview && (
        <ProgressReviewModal
          isOpen={showProgressReview}
          onClose={() => { setShowProgressReview(false); setSelectedWorkspaceId(null); }}
          workspaceId={selectedWorkspaceId}
        />
      )}
    </div>
  );
};

export default PMDashboard;
