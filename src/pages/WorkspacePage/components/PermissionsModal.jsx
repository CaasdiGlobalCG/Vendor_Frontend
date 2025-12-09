import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ShieldCheckIcon,
  CheckIcon,
  UserGroupIcon,
  LockClosedIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import config from '../../../config/env';

const PermissionsModal = ({ isOpen, onClose, workspace, onUpdatePermissions }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Permission types with descriptions
  const permissionTypes = [
    {
      key: 'canEdit',
      name: 'Edit Canvas',
      description: 'Add, modify, and delete elements on the workspace',
      icon: PencilIcon,
      color: 'text-blue-600'
    },
    {
      key: 'canComment',
      name: 'Comment',
      description: 'Add comments and participate in discussions',
      icon: UserGroupIcon,
      color: 'text-green-600'
    },
    {
      key: 'canViewFiles',
      name: 'View Files',
      description: 'Access and download uploaded files',
      icon: EyeIcon,
      color: 'text-purple-600'
    },
    {
      key: 'canCreateTasks',
      name: 'Create Tasks',
      description: 'Create new tasks and subtasks',
      icon: PlusIcon,
      color: 'text-orange-600'
    },
    {
      key: 'canAssignTasks',
      name: 'Assign Tasks',
      description: 'Assign tasks to team members',
      icon: UserGroupIcon,
      color: 'text-indigo-600'
    },
    {
      key: 'canUpdateTaskStatus',
      name: 'Update Task Status',
      description: 'Change task status and mark as complete',
      icon: CheckIcon,
      color: 'text-green-600'
    }
  ];

  // Fetch collaborators when modal opens
  useEffect(() => {
    if (isOpen && workspace?.workspaceId) {
      fetchCollaborators();
    }
  }, [isOpen, workspace?.workspaceId]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspaces/${workspace.workspaceId}/collaborators`);
      
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators || []);
        
        // Initialize permissions from workspace data
        const currentPermissions = {};
        data.collaborators.forEach(collaborator => {
          currentPermissions[collaborator.vendorId] = {
            canEdit: workspace.accessControl?.permissions?.canEdit?.includes(collaborator.vendorId) || false,
            canComment: workspace.accessControl?.permissions?.canComment?.includes(collaborator.vendorId) || false,
            canViewFiles: workspace.accessControl?.permissions?.canViewFiles?.includes(collaborator.vendorId) || false,
            canCreateTasks: workspace.accessControl?.permissions?.canCreateTasks?.includes(collaborator.vendorId) || false,
            canAssignTasks: workspace.accessControl?.permissions?.canAssignTasks?.includes(collaborator.vendorId) || false,
            canUpdateTaskStatus: workspace.accessControl?.permissions?.canUpdateTaskStatus?.includes(collaborator.vendorId) || false,
          };
        });
        setPermissions(currentPermissions);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (vendorId, permissionKey) => {
    setPermissions(prev => ({
      ...prev,
      [vendorId]: {
        ...prev[vendorId],
        [permissionKey]: !prev[vendorId]?.[permissionKey]
      }
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      
      // Transform permissions back to the format expected by the backend
      const updatedPermissions = {
        canEdit: [],
        canComment: [],
        canViewFiles: [],
        canCreateTasks: [],
        canAssignTasks: [],
        canUpdateTaskStatus: []
      };

      // Always include PM in all permissions
      const pmId = workspace.accessControl?.owner;
      if (pmId) {
        Object.keys(updatedPermissions).forEach(key => {
          updatedPermissions[key].push(pmId);
        });
      }

      // Add vendor permissions
      Object.entries(permissions).forEach(([vendorId, vendorPermissions]) => {
        Object.entries(vendorPermissions).forEach(([permissionKey, hasPermission]) => {
          if (hasPermission && !updatedPermissions[permissionKey].includes(vendorId)) {
            updatedPermissions[permissionKey].push(vendorId);
          }
        });
      });

      const response = await fetch(`/api/workspaces/${workspace.workspaceId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: updatedPermissions
        })
      });

      if (response.ok) {
        console.log('✅ Permissions updated successfully');
        if (onUpdatePermissions) {
          onUpdatePermissions(updatedPermissions);
        }
        onClose();
      } else {
        throw new Error('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Failed to update permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manage Permissions</h2>
              <p className="text-sm text-gray-500">Control what collaborators can do in this workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading collaborators...</span>
            </div>
          ) : (
            <>
              {/* Permissions Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 min-w-[200px]">
                        Collaborator
                      </th>
                      {permissionTypes.map((permission) => (
                        <th key={permission.key} className="text-center py-3 px-2 font-medium text-gray-900 min-w-[120px]">
                          <div className="flex flex-col items-center space-y-1">
                            <permission.icon className={`h-4 w-4 ${permission.color}`} />
                            <span className="text-xs">{permission.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {collaborators.map((collaborator) => (
                      <tr key={collaborator.vendorId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              collaborator.isPM ? 'bg-blue-500 text-white' : 
                              collaborator.isCAS ? 'bg-purple-500 text-white' : 
                              'bg-green-500 text-white'
                            }`}>
                              {collaborator.avatar}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{collaborator.name}</p>
                              <p className="text-sm text-gray-500">{collaborator.specialization}</p>
                              {collaborator.isPM && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                  <LockClosedIcon className="h-3 w-3 mr-1" />
                                  Owner
                                </span>
                              )}
                              {collaborator.isCAS && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                  CAS Unit
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {permissionTypes.map((permission) => (
                          <td key={permission.key} className="py-4 px-2 text-center">
                            {collaborator.isPM ? (
                              // PM always has all permissions (locked)
                              <div className="flex justify-center">
                                <CheckIcon className="h-5 w-5 text-green-600" />
                              </div>
                            ) : collaborator.isCAS ? (
                              // CAS permissions (toggleable with purple styling)
                              <button
                                onClick={() => togglePermission(collaborator.vendorId, permission.key)}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                  permissions[collaborator.vendorId]?.[permission.key]
                                    ? 'bg-purple-100 border-purple-500 text-purple-600'
                                    : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-gray-400'
                                }`}
                              >
                                {permissions[collaborator.vendorId]?.[permission.key] && (
                                  <CheckIcon className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              // Vendor permissions (toggleable with green styling)
                              <button
                                onClick={() => togglePermission(collaborator.vendorId, permission.key)}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                  permissions[collaborator.vendorId]?.[permission.key]
                                    ? 'bg-green-100 border-green-500 text-green-600'
                                    : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-gray-400'
                                }`}
                              >
                                {permissions[collaborator.vendorId]?.[permission.key] && (
                                  <CheckIcon className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Permission Descriptions */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Permission Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissionTypes.map((permission) => (
                    <div key={permission.key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <permission.icon className={`h-5 w-5 ${permission.color} mt-0.5`} />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{permission.name}</p>
                        <p className="text-xs text-gray-600">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Permissions'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
