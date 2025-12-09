import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  CogIcon, 
  ShareIcon,
  EyeIcon,
  PencilIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import config from '../../../config/env';

const RoleBasedHeader = ({ userRole, currentUser, workspace, onManagePermissions, onInviteVendors, onInviteCAS }) => {
  const [showCollabDetails, setShowCollabDetails] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const isPM = userRole === 'pm';
  const isVendor = userRole === 'vendor';
  const isCAS = userRole === 'cas';

  // Fetch collaborators when details panel opens
  useEffect(() => {
    if (showCollabDetails && workspace?.workspaceId && isPM) {
      fetchCollaborators();
    }
  }, [showCollabDetails, workspace?.workspaceId, isPM]);

  const fetchCollaborators = async () => {
    try {
      setLoadingCollaborators(true);
      const response = await fetch(`/api/workspaces/${workspace.workspaceId}/collaborators`);
      
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators || []);
      } else {
        console.error('Failed to fetch collaborators:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 relative" data-role-header>
      <div className="flex items-center justify-between">
        {/* Left side - Workspace info */}
        <div className="flex items-center space-x-4">
          <div>
          <h1 className="text-base font-semibold text-gray-900 leading-tight">
              {workspace?.title || 'testing project - Collaborative Workspace'}
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[11px] text-gray-500 leading-tight">
                Role: <span className={`font-medium ${isPM ? 'text-blue-600' : isCAS ? 'text-purple-600' : 'text-green-600'}`}>
                  {isPM ? 'PM' : isCAS ? 'CAS' : 'Vendor'}
                </span>
              </span>
              {workspace?.projectMetadata?.projectName && (
                 <>
                 <span className="text-gray-300 text-[10px]">•</span>
                 <span className="text-[11px] text-gray-500 leading-tight">
                   Project: {workspace.projectMetadata.projectName}
                 </span>
               </>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Compact actions */}
        <div className="flex items-center space-x-2">
          {/* Collaboration info icon */}
          <button
            onClick={() => setShowCollabDetails(!showCollabDetails)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            title="Collaboration Details"
          >
            <InformationCircleIcon className="h-5 w-5 text-gray-600" />
            {workspace?.sharedWith && workspace.sharedWith.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white"></div>
            )}
          </button>

          {/* User avatar */}
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
            {currentUser?.name?.charAt(0) || (isPM ? 'P' : isCAS ? 'C' : 'D')}
          </div>
        </div>
      </div>

      {/* Collaboration Details Dropdown */}
      {showCollabDetails && (
        <div className="absolute top-full right-6 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Collaboration Details</h3>
              <button
                onClick={() => setShowCollabDetails(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XMarkIcon className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* User info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {currentUser?.name?.charAt(0) || (isPM ? 'P' : isCAS ? 'C' : 'D')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {currentUser?.name || (isPM ? 'Project Manager' : isCAS ? 'CAS Member' : 'Dhanush')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isPM ? 'Full Access' : isCAS ? 'CAS Access' : 'View'}
                  </p>
                </div>
              </div>
            </div>

            {/* Collaborators */}
            {isPM && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-700">
                    Collaborators ({collaborators.length})
                  </p>
                  {loadingCollaborators && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                
                {collaborators.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {collaborators.map((collaborator) => (
                      <div key={collaborator.vendorId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                            collaborator.isPM ? 'bg-blue-500 text-white' : 
                            collaborator.isCAS ? 'bg-purple-500 text-white' : 
                            'bg-green-500 text-white'
                          }`}>
                            {collaborator.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {collaborator.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {collaborator.specialization}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            collaborator.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {collaborator.status === 'active' ? (
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                            ) : (
                              <ClockIcon className="w-3 h-3 mr-1" />
                            )}
                            {collaborator.accessLevel}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(collaborator.lastActivity?.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-xs text-gray-500 mt-2">No collaborators yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Vendor view - simplified collaborator info */}
            {isVendor && workspace?.sharedWith && workspace.sharedWith.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Collaborative Workspace
                </p>
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    P
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900">Project Manager</p>
                    <p className="text-xs text-gray-500">Full Access</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {workspace.sharedWith.length + 1} member{workspace.sharedWith.length > 0 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Last updated:</span>
                <span className="text-gray-700">8/26/2025, 4:35:33 PM</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Status:</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                  Live collaboration
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {isPM ? (
                <>
                  <button
                    onClick={onInviteVendors}
                    className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Invite Vendors
                  </button>
                  <button
                    onClick={onInviteCAS}
                    className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Invite CAS
                  </button>
                  <button
                    onClick={onManagePermissions}
                    className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    Manage Permissions
                  </button>
                </>
              ) : (
                <button className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Share Progress
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleBasedHeader;
