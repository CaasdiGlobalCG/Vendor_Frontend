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
        color: 'bg-yellow-100 text-yellow-800', 
        icon: ClockIcon,
        text: 'Pending Vendors' 
      },
      'in_progress': { 
        color: 'bg-blue-100 text-blue-800', 
        icon: CheckCircleIcon,
        text: 'In Progress' 
      },
      'completed': { 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircleIcon,
        text: 'Completed' 
      }
    };
    
    const config = statusConfig[status] || { 
      color: 'bg-gray-100 text-gray-800', 
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading PM Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">PM Dashboard</h1>
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Testing Mode
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{currentUser?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <RectangleGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Projects</p>
                <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Vendors</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projects.filter(p => p.status === 'pending_vendor_acceptance').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Projects</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projects.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Vendors</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {projects.reduce((acc, p) => acc + p.invitedVendors.length, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">My Projects</h2>
              <button
                onClick={() => setShowCreateProject(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Project
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {projects.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <RectangleGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {project.name}
                        </h3>
                        {getStatusBadge(project.status)}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 truncate">
                        {project.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
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
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <RectangleGroupIcon className="h-3 w-3 mr-1" />
                        {project.workspaceId ? 'Open Workspace' : 'Create Workspace'}
                                            <button
                                              onClick={() => {
                                                if (project.workspaceId) {
                                                  setSelectedWorkspaceId(project.workspaceId);
                                                  setShowProgressReview(true);
                                                } else {
                                                  alert('Workspace not created for this project yet');
                                                }
                                              }}
                                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 ml-2"
                                            >
                                              Progress Review
                                            </button>
                      </button>
                      
                      <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200">
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
                            ? 'bg-green-100 text-green-800'
                            : vendor.status === 'declined'
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
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
              {showProgressReview && (
                <ProgressReviewModal
                  isOpen={showProgressReview}
                  onClose={() => { setShowProgressReview(false); setSelectedWorkspaceId(null); }}
                  workspaceId={selectedWorkspaceId}
                />
              )}
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h3>
            <p className="text-sm text-gray-600 mb-4">
              Project creation wizard will be implemented next. For now, you can test the collaborative workspace with existing projects.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateProject(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PMDashboard;
