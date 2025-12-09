import React, { useState, useEffect, useContext } from 'react';
import { 
  Search,
  Filter,
  Plus,
  Eye,
  Check,
  X,
  Package,
  Calendar,
  DollarSign,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { VendorContext } from '../../../../../context/VendorContext.jsx';
import config from "../../../../../config/env";

const PurchaseOrdersPage = () => {
  const { currentUser } = useContext(VendorContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [purchaseOrdersData, setPurchaseOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Using relative paths - no API_BASE_URL needed

  // Fetch purchase orders from backend
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      if (!currentUser?.vendorId) {
        console.log('⏳ Waiting for user authentication...');
        return;
      }

      try {
        setLoading(true);
        console.log('📋 Fetching purchase orders from backend...');

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

        const response = await fetch(`/api/workspace/purchase-orders?vendorId=${vendorId}`, {
          headers: headers
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setPurchaseOrdersData(result.data || []);
          console.log(`✅ Successfully loaded ${result.data?.length || 0} purchase orders`);
        } else {
          throw new Error(result.message || 'Failed to fetch purchase orders');
        }
      } catch (error) {
        console.error('❌ Error fetching purchase orders:', error);
        setError(error.message);
        setPurchaseOrdersData([]); // Empty array instead of placeholder data
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, [currentUser?.vendorId]);

  const filteredOrders = purchaseOrdersData.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.statusType.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (statusType) => {
    switch (statusType) {
      case 'accepted':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500'
        };
      case 'pending':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'draft':
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          border: 'border-gray-200',
          dot: 'bg-gray-400'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          border: 'border-gray-200',
          dot: 'bg-gray-400'
        };
    }
  };

  // Calculate stats
  const totalOrders = purchaseOrdersData.length;
  const acceptedOrders = purchaseOrdersData.filter(order => order.statusType === 'accepted').length;
  const pendingOrders = purchaseOrdersData.filter(order => order.statusType === 'pending').length;
  const totalValue = purchaseOrdersData.reduce((sum, order) => {
    return sum + parseFloat(order.amount.replace('₹', '').replace(',', ''));
  }, 0);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Purchase Orders
              </h1>
              <p className="text-gray-600 mt-2">View and manage purchase orders converted from requisitions</p>
            </div>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Purchase Order</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Accepted</p>
                  <p className="text-2xl font-bold text-gray-900">{acceptedOrders}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="accepted">Accepted</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Cards Grid */}
      <div className="px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading purchase orders...</h3>
              <p className="text-gray-500 mb-6">Please wait while we fetch the data.</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error: {error}</h3>
              <p className="text-gray-500 mb-6">Failed to load purchase orders. Please try again later.</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                Retry
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No purchase orders found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                Create New Purchase Order
              </button>
            </div>
          ) : (
            filteredOrders.map((order, index) => {
              const statusConfig = getStatusConfig(order.statusType);
              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {order.id}
                        </h3>
                        <p className="text-sm text-gray-500">{order.project}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                      <div className={`w-2 h-2 ${statusConfig.dot} rounded-full mr-2`}></div>
                      {order.status}
                    </span>
                  </div>

                  {/* Vendor Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">{order.vendor}</p>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">{order.email}</p>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Items</p>
                      <div className="flex items-center space-x-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{order.items} items</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="text-lg font-bold text-gray-900">
                        {order.amount}
                      </p>
                    </div>
                  </div>

                  {/* Purchase Returns */}
                  {order.purchaseReturns !== 'None' && (
                    <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700 font-medium">
                        Purchase Returns: {order.purchaseReturns}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>View Details</span>
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      {order.statusType === 'pending' && (
                        <>
                          <button className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors duration-200" title="Accept">
                            <Check className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors duration-200" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.statusType === 'accepted' && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Accepted</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                1
              </button>
              <button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersPage;
