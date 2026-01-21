import { useContext, useMemo } from 'react';
import { VendorContext } from '../../../context/VendorContext';

/**
 * Custom hook to check user permissions in workspace
 * @param {Object} workspace - Current workspace object
 * @param {string} userRole - User role ('pm' or 'vendor')
 * @returns {Object} Permission checking functions and current permissions
 */
export const usePermissions = (workspace, userRole) => {
  const { currentUser } = useContext(VendorContext);

  const permissions = useMemo(() => {
    if (!workspace || !currentUser) {
      return {
        canEdit: false,
        canComment: false,
        canViewFiles: false,
        canCreateTasks: false,
        canAssignTasks: false,
        canUpdateTaskStatus: false,
        canAccessMessages: false,
        canAccessVideoCall: false,
        canApproveElements: false
      };
    }

    // PMs have all permissions by default
    if (userRole === 'pm') {
      return {
        canEdit: true,
        canComment: true,
        canViewFiles: true,
        canCreateTasks: true,
        canAssignTasks: true,
        canUpdateTaskStatus: true,
        canAccessMessages: true,
        canAccessVideoCall: true,
        canApproveElements: true
      };
    }

    // Clients have view access to canvas, messages, and video calls by default
    if (userRole === 'client') {
      return {
        canEdit: false,
        canComment: true, // Clients can send messages/comments
        canViewFiles: true,
        canCreateTasks: false,
        canAssignTasks: false,
        canUpdateTaskStatus: false,
        canAccessMessages: true, // Clients can access messages
        canAccessVideoCall: true, // Clients can access video calls
        canApproveElements: true // Clients can approve/reject elements
      };
    }

    // For vendors, check workspace permissions
    const userId = currentUser.vendorId || currentUser.id;
    const workspacePermissions = workspace.accessControl?.permissions || {};

    // If workspace is marked completed, vendors should have no edit/create permissions
    if (workspace.status === 'project completed') {
      return {
        canEdit: false,
        canComment: false,
        canViewFiles: true, // still allow viewing files
        canCreateTasks: false,
        canAssignTasks: false,
        canUpdateTaskStatus: false,
        canAccessMessages: false,
        canAccessVideoCall: false,
        canApproveElements: false
      };
    }

    // Permission debug removed for production

    // Check if permissions are arrays (correct format) or need conversion
    const checkPermission = (permissionArray) => {
      if (!permissionArray) return false;
      if (Array.isArray(permissionArray)) {
        return permissionArray.includes(userId);
      }
      // Handle legacy format or other formats
      return false;
    };

    return {
      canEdit: checkPermission(workspacePermissions.canEdit),
      canComment: checkPermission(workspacePermissions.canComment),
      canViewFiles: checkPermission(workspacePermissions.canViewFiles),
      canCreateTasks: checkPermission(workspacePermissions.canCreateTasks),
      canAssignTasks: checkPermission(workspacePermissions.canAssignTasks),
      canUpdateTaskStatus: checkPermission(workspacePermissions.canUpdateTaskStatus),
      canAccessMessages: checkPermission(workspacePermissions.canAccessMessages),
      canAccessVideoCall: checkPermission(workspacePermissions.canAccessVideoCall),
      canApproveElements: checkPermission(workspacePermissions.canApproveElements)
    };
  }, [workspace, currentUser, userRole]);

  // Permission checking functions
  const checkPermission = (permission) => {
    return permissions[permission] || false;
  };

  const requirePermission = (permission, fallback = null) => {
    return permissions[permission] ? true : fallback;
  };

  const getPermissionMessage = (permission) => {
    const messages = {
      canEdit: 'You do not have permission to edit the workspace',
      canComment: 'You do not have permission to send messages',
      canViewFiles: 'You do not have permission to view files',
      canCreateTasks: 'You do not have permission to create tasks',
      canAssignTasks: 'You do not have permission to assign tasks',
      canUpdateTaskStatus: 'You do not have permission to update task status'
    };
    return messages[permission] || 'Permission denied';
  };

  return {
    permissions,
    checkPermission,
    requirePermission,
    getPermissionMessage,
    hasAnyPermission: Object.values(permissions).some(p => p),
    isOwner: userRole === 'pm'
  };
};

export default usePermissions;
