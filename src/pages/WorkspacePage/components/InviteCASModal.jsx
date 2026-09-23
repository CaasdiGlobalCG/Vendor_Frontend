import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon, 
  UserIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import config from '../../../config/env';

const InviteCASModal = ({ isOpen, onClose, workspace, onInviteSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  // Fetch employees when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      setSearchTerm('');
      setSelectedEmployees([]);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // Filter employees based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(employee => {
        const searchLower = searchTerm.toLowerCase();
        return (
          employee.firstName?.toLowerCase().includes(searchLower) ||
          employee.lastName?.toLowerCase().includes(searchLower) ||
          employee.email?.toLowerCase().includes(searchLower) ||
          employee.casUnit?.toLowerCase().includes(searchLower) ||
          employee.role?.toLowerCase().includes(searchLower) ||
          employee.userId?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch employees via our backend API (which handles auth and proxies to employee system)
      const response = await fetch(`/api/employees`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.employees) {
          // Filter only active employees
          const activeEmployees = data.employees.filter(employee => 
            employee.status === 'Active' || employee.status === 'active'
          );
          setEmployees(activeEmployees);
          setFilteredEmployees(activeEmployees);
        } else {
          setError('Failed to fetch employees');
        }
      } else if (response.status === 401) {
        setError('Authentication required. Please ensure you have proper access to view employees.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to connect to employee system');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Error connecting to employee system');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployees(prev => {
      const isSelected = prev.find(emp => emp.userId === employee.userId);
      if (isSelected) {
        return prev.filter(emp => emp.userId !== employee.userId);
      } else {
        return [...prev, employee];
      }
    });
  };

  const handleInviteEmployees = async () => {
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee to invite');
      return;
    }

    setInviting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/workspaces/${workspace.workspaceId}/invite-cas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees.map(emp => emp.userId),
          employees: selectedEmployees.map(emp => ({
            userId: emp.userId,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            casUnit: emp.casUnit,
            role: emp.role
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Successfully invited ${selectedEmployees.length} CAS member${selectedEmployees.length > 1 ? 's' : ''} to the project`);
        
        // Call the success callback if provided
        if (onInviteSuccess) {
          onInviteSuccess(selectedEmployees);
        }
        
        // Reset selection
        setSelectedEmployees([]);
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to invite CAS members');
      }
    } catch (error) {
      console.error('Error inviting CAS members:', error);
      setError('Error sending invitations');
    } finally {
      setInviting(false);
    }
  };

  const getDepartmentColor = (casUnit) => {
    const colors = {
      'Construction': 'bg-info/10 text-info',
      'Marketing': 'bg-success/10 text-success',
      'Procurement': 'bg-surface-hover text-ink',
      'Branding': 'bg-surface-hover text-ink',
      'Logistics': 'bg-warning/10 text-warning',
      'Finance': 'bg-warning/10 text-warning',
      'HR': 'bg-info/10 text-info',
      'default': 'bg-surface-hover text-ink'
    };
    return colors[casUnit] || colors.default;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h2 className="text-xl font-semibold text-ink">Invite CAS Members</h2>
            <p className="text-sm text-dim mt-1">
              Select CAS members to invite to "{workspace?.title || 'this project'}"
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
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 transform  h-5 w-5 text-dim" />
            <input
              type="text"
              placeholder="Search by name, email, department, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
            />
          </div>
          
          {selectedEmployees.length > 0 && (
            <div className="mt-4 p-3 bg-info/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-info font-medium">
                  {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedEmployees([])}
                  className="text-xs text-info hover:text-info"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-info"></div>
              <span className="ml-3 text-dim">Loading employees...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-danger mx-auto mb-4" />
                <p className="text-danger font-medium">{error}</p>
                <button
                  onClick={fetchEmployees}
                  className="mt-3 px-4 py-2 bg-danger text-white rounded-md hover:bg-danger transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-dim mx-auto mb-4" />
              <p className="text-dim">
                {employees.length === 0 ? 'No employees found' : 'No employees match your search'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEmployees.map((employee) => {
                const isSelected = selectedEmployees.find(emp => emp.userId === employee.userId);
                
                return (
                  <div
                    key={employee.userId}
                    onClick={() => handleEmployeeSelect(employee)}
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
                            {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-ink">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <p className="text-xs text-dim">{employee.email}</p>
                          <p className="text-xs text-dim">ID: {employee.userId}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckIcon className="h-5 w-5 text-info" />
                      )}
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(employee.casUnit)}`}>
                        {employee.casUnit || 'No Department'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-surface-hover text-ink">
                        {employee.role || 'No Role'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
          
          {error && (
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
              Selected employees will be notified about the project invitation
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-ink bg-surface border border-line rounded-md hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteEmployees}
                disabled={selectedEmployees.length === 0 || inviting}
                className="px-4 py-2 bg-info text-cta-foreground rounded-md hover:bg-info disabled:bg-cta disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {inviting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Inviting...
                  </>
                ) : (
                  `Invite ${selectedEmployees.length > 0 ? `(${selectedEmployees.length})` : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteCASModal;
