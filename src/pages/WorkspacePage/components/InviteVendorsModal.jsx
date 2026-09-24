import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const PERMISSION_OPTIONS = [
  { key: 'canEdit', label: 'Edit canvas', description: 'Add, move and modify elements' },
  { key: 'canComment', label: 'Comment', description: 'Comment on elements' },
  { key: 'canViewFiles', label: 'View files', description: 'View uploaded files' },
  { key: 'canCreateTasks', label: 'Create tasks', description: 'Create new tasks' },
  { key: 'canAssignTasks', label: 'Assign tasks', description: 'Assign tasks to members' },
  { key: 'canUpdateTaskStatus', label: 'Update task status', description: 'Mark progress on tasks' },
  { key: 'canAddNotes', label: 'Add notes', description: 'Attach notes to elements' },
  { key: 'canApproveElements', label: 'Approve elements', description: 'Approve or reject elements' },
  { key: 'canAccessMessages', label: 'Messages', description: 'Access workspace messages' },
  { key: 'canAccessVideoCall', label: 'Video calls', description: 'Join workspace video calls' }
];

const DEFAULT_PERMISSIONS = {
  canEdit: false,
  canComment: true,
  canViewFiles: true,
  canCreateTasks: false,
  canAssignTasks: false,
  canUpdateTaskStatus: true,
  canAddNotes: true,
  canApproveElements: false,
  canAccessMessages: true,
  canAccessVideoCall: true
};

const InviteVendorsModal = ({ isOpen, onClose, workspace, onInviteSuccess }) => {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMISSIONS });
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch vendors when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      setSearchTerm('');
      setSelectedVendors([]);
      setPermissions({ ...DEFAULT_PERMISSIONS });
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // Filter vendors based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVendors(vendors);
    } else {
      const searchLower = searchTerm.toLowerCase();
      setFilteredVendors(vendors.filter(vendor =>
        vendor.name?.toLowerCase().includes(searchLower) ||
        vendor.email?.toLowerCase().includes(searchLower) ||
        vendor.id?.toLowerCase().includes(searchLower)
      ));
    }
  }, [searchTerm, vendors]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vendor/all`);

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.vendors || []);
        // Only approved vendors (or those without a status for backward compatibility)
        const approvedVendors = list.filter(
          vendor => vendor.status === 'approved' || !vendor.status
        );
        setVendors(approvedVendors);
        setFilteredVendors(approvedVendors);
      } else if (response.status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load vendors');
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Error connecting to vendor system');
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendors(prev => {
      const isSelected = prev.find(v => v.id === vendor.id);
      return isSelected
        ? prev.filter(v => v.id !== vendor.id)
        : [...prev, vendor];
    });
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInviteVendors = async () => {
    if (selectedVendors.length === 0) {
      setError('Please select at least one vendor to invite');
      return;
    }

    setInviting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/workspaces/${workspace.workspaceId}/invite-vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendors: selectedVendors.map(v => ({
            vendorId: v.id,
            name: v.name,
            email: v.email,
            companyName: v.name
          })),
          permissions
        })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        setSuccess(`Successfully invited ${selectedVendors.length} vendor${selectedVendors.length > 1 ? 's' : ''} to the workspace`);

        if (onInviteSuccess) {
          onInviteSuccess(selectedVendors);
        }

        setSelectedVendors([]);

        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.message || result.error || 'Failed to invite vendors');
      }
    } catch (err) {
      console.error('Error inviting vendors:', err);
      setError('Error sending invitations');
    } finally {
      setInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h2 className="text-xl font-semibold text-ink">Invite Vendors</h2>
            <p className="text-sm text-dim mt-1">
              Select vendors to collaborate on "{workspace?.title || 'this workspace'}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-dim" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-line">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 transform h-5 w-5 text-dim" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
            />
          </div>

          {selectedVendors.length > 0 && (
            <div className="mt-4 p-3 bg-info/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-info font-medium">
                  {selectedVendors.length} vendor{selectedVendors.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedVendors([])}
                  className="text-xs text-info hover:text-info"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vendor List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-info"></div>
              <span className="ml-3 text-dim">Loading vendors...</span>
            </div>
          ) : error && vendors.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-danger mx-auto mb-4" />
                <p className="text-danger font-medium">{error}</p>
                <button
                  onClick={fetchVendors}
                  className="mt-3 px-4 py-2 bg-danger text-white rounded-md hover:bg-danger transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-dim mx-auto mb-4" />
              <p className="text-dim">
                {vendors.length === 0 ? 'No vendors found' : 'No vendors match your search'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVendors.map((vendor) => {
                const isSelected = selectedVendors.find(v => v.id === vendor.id);

                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleVendorSelect(vendor)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-info bg-info/10'
                        : 'border-line hover:border-line hover:bg-canvas'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-surface-hover rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-ink">
                            {vendor.name?.charAt(0)?.toUpperCase() || 'V'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-ink">
                            {vendor.name}
                          </h3>
                          <p className="text-xs text-dim">{vendor.email}</p>
                          <p className="text-xs text-dim">ID: {vendor.id}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckIcon className="h-5 w-5 text-info" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions */}
        <div className="px-6 py-4 border-t border-line bg-canvas">
          <p className="text-sm font-medium text-ink mb-3">Workspace permissions for invited vendors</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PERMISSION_OPTIONS.map(option => (
              <label
                key={option.key}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-surface cursor-pointer"
                title={option.description}
              >
                <input
                  type="checkbox"
                  checked={!!permissions[option.key]}
                  onChange={() => togglePermission(option.key)}
                  className="mt-0.5 h-4 w-4 rounded text-ink border-line focus:ring-ink cursor-pointer"
                />
                <span className="text-xs">
                  <span className="block font-medium text-ink">{option.label}</span>
                  <span className="block text-dim">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-canvas">
          {success && (
            <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center">
                <CheckIcon className="h-5 w-5 text-success mr-2" />
                <span className="text-sm text-success">{success}</span>
              </div>
            </div>
          )}

          {error && vendors.length > 0 && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-danger mr-2" />
                <span className="text-sm text-danger">{error}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-dim">
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Invited vendors get workspace access with the permissions selected above
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-ink bg-surface border border-line rounded-md hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteVendors}
                disabled={selectedVendors.length === 0 || inviting}
                className="px-4 py-2 bg-info text-cta-foreground rounded-md hover:bg-info disabled:bg-cta disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {inviting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Inviting...
                  </>
                ) : (
                  `Invite ${selectedVendors.length > 0 ? `(${selectedVendors.length})` : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteVendorsModal;
