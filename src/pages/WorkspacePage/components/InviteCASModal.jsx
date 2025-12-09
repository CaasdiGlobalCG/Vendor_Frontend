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
      'Construction': 'bg-blue-100 text-blue-800',
      'Marketing': 'bg-green-100 text-green-800',
      'Procurement': 'bg-purple-100 text-purple-800',
      'Branding': 'bg-pink-100 text-pink-800',
      'Logistics': 'bg-orange-100 text-orange-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'HR': 'bg-indigo-100 text-indigo-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[casUnit] || colors.default;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invite CAS Members</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select CAS members to invite to "{workspace?.title || 'this project'}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, department, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {selectedEmployees.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800 font-medium">
                  {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedEmployees([])}
                  className="text-xs text-blue-600 hover:text-blue-800"
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading employees...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchEmployees}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
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
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <p className="text-xs text-gray-600">{employee.email}</p>
                          <p className="text-xs text-gray-500">ID: {employee.userId}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(employee.casUnit)}`}>
                        {employee.casUnit || 'No Department'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-green-800">{success}</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Selected employees will be notified about the project invitation
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteEmployees}
                disabled={selectedEmployees.length === 0 || inviting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
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
