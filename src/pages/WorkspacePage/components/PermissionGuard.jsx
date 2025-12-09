import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import usePermissions from '../hooks/usePermissions';

/**
 * Permission Guard Component - Conditionally renders children based on permissions
 * @param {string} permission - Required permission to show children
 * @param {Object} workspace - Current workspace object
 * @param {string} userRole - User role ('pm' or 'vendor')
 * @param {React.ReactNode} children - Content to show if permission granted
 * @param {React.ReactNode} fallback - Content to show if permission denied (optional)
 * @param {boolean} showMessage - Whether to show permission denied message (default: true)
 * @param {string} className - Additional CSS classes for fallback content
 */
const PermissionGuard = ({ 
  permission, 
  workspace, 
  userRole, 
  children, 
  fallback = null, 
  showMessage = true,
  className = ""
}) => {
  const { checkPermission, getPermissionMessage } = usePermissions(workspace, userRole);

  const hasPermission = checkPermission(permission);

  if (hasPermission) {
    return children;
  }

  // If fallback is provided, use it
  if (fallback) {
    return fallback;
  }

  // If showMessage is false, return null (hide completely)
  if (!showMessage) {
    return null;
  }

  // Default permission denied message
  return (
    <div className={`flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
      <div className="text-center">
        <LockClosedIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 font-medium">Access Restricted</p>
        <p className="text-xs text-gray-500 mt-1">{getPermissionMessage(permission)}</p>
      </div>
    </div>
  );
};

/**
 * Disabled Button Component - Shows disabled state when permission is denied
 */
export const PermissionButton = ({ 
  permission, 
  workspace, 
  userRole, 
  onClick, 
  children, 
  className = "",
  disabledClassName = "opacity-50 cursor-not-allowed",
  showTooltip = true,
  ...props 
}) => {
  const { checkPermission, getPermissionMessage } = usePermissions(workspace, userRole);

  const hasPermission = checkPermission(permission);

  const handleClick = (e) => {
    if (!hasPermission) {
      e.preventDefault();
      if (showTooltip) {
        alert(getPermissionMessage(permission));
      }
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={!hasPermission}
      className={`${className} ${!hasPermission ? disabledClassName : ''}`}
      title={!hasPermission ? getPermissionMessage(permission) : ''}
    >
      {children}
      {!hasPermission && showTooltip && (
        <LockClosedIcon className="h-4 w-4 ml-1 inline-block" />
      )}
    </button>
  );
};

/**
 * Permission Input Component - Disables input when permission is denied
 */
export const PermissionInput = ({ 
  permission, 
  workspace, 
  userRole, 
  className = "",
  disabledClassName = "opacity-50 cursor-not-allowed bg-gray-100",
  ...props 
}) => {
  const { checkPermission } = usePermissions(workspace, userRole);

  const hasPermission = checkPermission(permission);

  return (
    <input
      {...props}
      disabled={!hasPermission}
      className={`${className} ${!hasPermission ? disabledClassName : ''}`}
      readOnly={!hasPermission}
    />
  );
};

export default PermissionGuard;
