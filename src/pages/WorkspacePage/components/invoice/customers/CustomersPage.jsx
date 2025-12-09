import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users, TrendingUp, TrendingDown, FileText, CreditCard } from 'lucide-react';
import NewCustomerForm from './NewCustomerForm';
import CustomerDetailPage from './CustomerDetailPage';
import { VendorContext } from '../../../../../context/VendorContext';
import config from '../../../../../config/env';

const CustomersPage = () => {
  const { currentUser } = useContext(VendorContext);
  const [customersData, setCustomersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, [currentUser?.vendorId]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use workspace customers endpoint with authentication
      
      if (!currentUser?.vendorId) {
        console.log('⏳ Waiting for user authentication...');
        return;
      }

      const vendorId = currentUser.vendorId;
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`/api/workspace/customers?vendorId=${vendorId}`, {
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        // Transform the data to match the expected format
        const transformedCustomers = data.data.map(customer => ({
          id: customer.id,
          name: customer.name || customer.company || 'Unknown',
          companyName: customer.company || customer.name || 'Unknown',
          email: customer.email || '-',
          workPhone: customer.phone || customer.workPhone || '-',
          receivables: customer.receivables || '₹0.00',
          unusedCredits: customer.unusedCredits || '₹0.00',
          status: customer.status || 'Active',
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }));
        
        setCustomersData(transformedCustomers);
        console.log('Customers loaded successfully:', transformedCustomers.length);
      } else {
        throw new Error(data.message || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError(error.message);
      
      // Fallback to empty array if API fails
      setCustomersData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async (query) => {
    setSearchTerm(query);
    
    if (!query.trim()) {
      fetchCustomers();
      return;
    }
    
    try {
      setLoading(true);
      const vendorId = currentUser?.vendorId;
      
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`/api/workspace/customers/search?query=${encodeURIComponent(query)}&vendorId=${vendorId}`, {
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        const transformedCustomers = data.data.map(customer => ({
          id: customer.id,
          name: customer.name || customer.company || 'Unknown',
          companyName: customer.company || customer.name || 'Unknown',
          email: customer.email || '-',
          workPhone: customer.phone || customer.workPhone || '-',
          receivables: customer.receivables || '₹0.00',
          unusedCredits: customer.unusedCredits || '₹0.00',
          status: customer.status || 'Active'
        }));
        
        setCustomersData(transformedCustomers);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle new customer creation
  const handleCustomerCreated = (newCustomer) => {
    console.log('New customer created:', newCustomer);
    // Refresh the customers list
    fetchCustomers();
  };

  // Action handlers
  const handleViewCustomer = async (customerId) => {
    setSelectedCustomer({ id: customerId });
    setShowCustomerDetail(true);
  };

  const handleEditCustomer = async (customerId) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomer(data.customer);
        setShowEditCustomer(true);
      } else {
        console.error('Failed to fetch customer details for editing');
      }
    } catch (error) {
      console.error('Error fetching customer details for editing:', error);
    }
  };

  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setShowDeleteConfirm(false);
        setSelectedCustomer(null);
        fetchCustomers(); // Refresh the list
      } else {
        console.error('Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCustomerUpdated = () => {
    setShowEditCustomer(false);
    setSelectedCustomer(null);
    fetchCustomers(); // Refresh the customer list
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Customers</h1>
            <p className="text-gray-600">Manage your customer relationships and track their activity</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
            <button 
              onClick={() => navigate('/customers/new')}
              className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Customer</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-xl font-bold text-gray-900">{customersData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-bold text-gray-900">{customersData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Receivables</p>
                <p className="text-xl font-bold text-gray-900">₹0.00</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Credits</p>
                <p className="text-xl font-bold text-gray-900">₹0.00</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Customers Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Customer Directory</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              <button className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="ml-2 text-gray-600">Loading customers...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">Error loading customers</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button 
                  onClick={fetchCustomers}
                  className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex items-center space-x-1">
                      <span>Customer</span>
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Contact Info
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Receivables
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Credits
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customersData.map((customer, index) => (
                <tr key={customer.id} className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50 cursor-pointer transition-all duration-200 group">
                  <td className="px-6 py-5">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-4 shadow-md">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                            {customer.name}
                          </span>
                          <svg className="w-4 h-4 ml-2 text-gray-400 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-gray-900 font-medium">{customer.companyName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {customer.companyName.includes('Private') ? 'Private Limited' : 'Company'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {customer.email === '-' ? (
                          <span className="text-gray-400 italic">No email</span>
                        ) : (
                          <span className="text-teal-600 hover:text-teal-800">{customer.email}</span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-900">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {customer.workPhone === '-' ? (
                          <span className="text-gray-400 italic">No phone</span>
                        ) : (
                          <span>{customer.workPhone}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="text-sm font-semibold text-gray-900">{customer.receivables}</div>
                    <div className="text-xs text-gray-500 mt-1">Outstanding</div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="text-sm font-semibold text-gray-900">{customer.unusedCredits}</div>
                    <div className="text-xs text-gray-500 mt-1">Available</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => handleViewCustomer(customer.id)}
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200"
                        title="View Customer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleEditCustomer(customer.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Edit Customer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteCustomer(customer)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Delete Customer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{customersData.length}</span> of{' '}
                <span className="font-medium">{customersData.length}</span> customers
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors">
                  Previous
                </button>
                <button className="px-3 py-1 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors">
                  1
                </button>
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* New Customer Form Modal */}
      {showNewCustomerForm && (
        <NewCustomerForm
          onClose={() => setShowNewCustomerForm(false)}
          onCustomerCreated={handleCustomerCreated}
        />
      )}

      {/* Edit Customer Form Modal */}
      {showEditCustomer && selectedCustomer && (
        <NewCustomerForm
          onClose={() => setShowEditCustomer(false)}
          onCustomerCreated={handleCustomerUpdated}
          editMode={true}
          customerData={selectedCustomer}
        />
      )}

      {/* Customer Detail View Modal */}
      {showCustomerDetail && selectedCustomer && (
        <CustomerDetailPage
          customerId={selectedCustomer.id}
          onClose={() => {
            setShowCustomerDetail(false);
            setSelectedCustomer(null);
          }}
          onCustomerUpdated={handleCustomerUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Customer</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete <span className="font-medium">{selectedCustomer.name}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
