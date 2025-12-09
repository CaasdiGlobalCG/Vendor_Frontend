import React, { useState, useEffect, useContext } from 'react';
import { 
  ArrowLeft,
  Plus,
  Eye,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  X,
  IndianRupee
} from 'lucide-react';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import config from '../../../../../config/env';
import { useNavigate, useParams } from 'react-router-dom';
import NewPurchaseRequisitionForm from './NewPurchaseRequisitionForm';

const PurchaseRequisitionsPage = () => {
  const { currentUser } = useContext(VendorContext);
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [requisitionsData, setRequisitionsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  // Using relative paths - no API_BASE_URL needed

  // Handle successful form submission
  const handleFormSuccess = () => {
    setSuccess('Purchase requisition created successfully!');
    setShowNewForm(false);
    fetchRequisitions();
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(''), 5000);
  };

  // Process requisition items for display
  const processRequisitionItems = (items) => {
    if (!items) return [];
    return items.map(item => ({
      ...item,
      // Ensure all required fields have default values
      name: item.name || item.item_name || 'Unnamed Item',
      description: item.description || item.item_description || '',
      quantity: item.quantity || 1,
      estimated_cost: item.estimated_cost || item.estimated_unit_price || 0,
      total_cost: (item.quantity || 1) * (item.estimated_cost || item.estimated_unit_price || 0)
    }));
  };

  // Format requisition data for display
  const formatRequisitionData = (requisition) => {
    const items = Array.isArray(requisition.items) ? processRequisitionItems(requisition.items) : [];
    const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);
    
    return {
      ...requisition,
      items: items,
      totalCost: totalCost,
      itemsCount: items.length,
      requestDate: new Date(requisition.request_date || requisition.created_at || Date.now()).toLocaleDateString(),
      status: requisition.status || 'pending',
      urgency: requisition.urgency_level || 'Medium',
      project: requisition.project_name || 'Unnamed Project'
    };
  };

  // Fetch purchase requisitions from backend
  const fetchRequisitions = async () => {
    if (!currentUser?.vendorId) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Fetching purchase requisitions from backend...');

      const vendorId = currentUser.vendorId;
      const response = await fetch(`/api/workspace/purchase-requisitions?vendorId=${vendorId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify({
            vendorId: vendorId,
            email: currentUser?.email,
            role: 'vendor',
            name: currentUser?.name
          })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch purchase requisitions');
      }

      const data = await response.json();
      console.log('📦 Fetched purchase requisitions:', data);
      
      if (data.success) {
        // Process and format the requisitions data
        const formattedData = Array.isArray(data.data) 
          ? data.data.map(formatRequisitionData) 
          : [];
          
        setRequisitionsData(formattedData);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to fetch purchase requisitions');
      }
    } catch (error) {
      console.error('❌ Error fetching purchase requisitions:', error);
      setError(error.message || 'Failed to load purchase requisitions');
      setRequisitionsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, [currentUser?.vendorId]);

  // Removed unused filteredRequisitions logic (search and status filters were not implemented)

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case 'High':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          dot: 'bg-red-500'
        };
      case 'Medium':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'Low':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500'
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

  const getStatusConfig = (statusType) => {
    switch (statusType) {
      case 'pending':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'converted':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          dot: 'bg-purple-500'
        };
      case 'approved':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500'
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
  const totalRequisitions = requisitionsData.length;
  const pendingRequisitions = requisitionsData.filter(req => (req.statusType || req.status || '').toLowerCase() === 'pending').length;
  const approvedRequisitions = requisitionsData.filter(req => (req.statusType || req.status || '').toLowerCase() === 'approved').length;
  const totalValue = requisitionsData.reduce((sum, req) => {
    // Handle both string (with currency symbol) and number values
    const cost = typeof req.totalCost === 'string' 
      ? parseFloat(req.totalCost.replace(/[^0-9.-]+/g, '')) 
      : Number(req.totalCost) || 0;
    return sum + cost;
  }, 0);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Purchase Requisitions
                </h1>
                <p className="text-gray-600 mt-2">View all purchase requisitions and convert approved ones to purchase orders</p>
              </div>
            </div>
            <button 
              onClick={() => setShowNewForm(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Requisition</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Requisitions</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRequisitions}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            {/* Additional stat cards */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingRequisitions}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{approvedRequisitions}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    }).format(totalValue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
          
          {/* Secondary action button removed to avoid duplication */}

      {success && (
        <div className="rounded-md bg-green-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Removed duplicate Stats Cards block */}

      {/* Purchase Requisitions Table */}
      <div className="px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-7 gap-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
              <div>Project</div>
              <div>Request Date</div>
              <div>Urgency</div>
              <div>Items</div>
              <div>Total Cost</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {requisitionsData.map((requisition, index) => {
              const urgencyConfig = getUrgencyConfig(requisition.urgency);
              const statusConfig = getStatusConfig(requisition.statusType);
              
              return (
                <div key={index} className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  {/* Project */}
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {requisition.project}
                    </div>
                  </div>

                  {/* Request Date */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{requisition.requestDate}</span>
                  </div>

                  {/* Urgency */}
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${urgencyConfig.bg} ${urgencyConfig.text} ${urgencyConfig.border}`}>
                      <div className={`w-2 h-2 ${urgencyConfig.dot} rounded-full mr-2`}></div>
                      {requisition.urgency}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span>{requisition.itemsCount || 0} items</span>
                  </div>

                  {/* Total Cost */}
                  <div className="flex items-center">
                    <div className="text-lg font-bold text-gray-900">
                      ₹{new Intl.NumberFormat('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(parseFloat(requisition.total_cost || requisition.totalCost || 0))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                      <div className={`w-2 h-2 ${statusConfig.dot} rounded-full mr-2`}></div>
                      {requisition.statusType || requisition.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                    {Array.isArray(requisition.actions) && requisition.actions.includes('From CRM') && (
                      <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded border border-gray-200">
                        From CRM
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {requisitionsData.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No purchase requisitions found</h3>
              <p className="text-gray-500 mb-6">Create your first purchase requisition to get started</p>
              <button onClick={() => setShowNewForm(true)} className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200">
                Create New Requisition
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {requisitionsData.length > 0 && (
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200">
                1
              </button>
              <button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* New Purchase Requisition Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Create New Purchase Requisition</h2>
              <button 
                onClick={() => setShowNewForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <NewPurchaseRequisitionForm 
                workspaceId={workspaceId}
                onSuccess={handleFormSuccess}
                onClose={() => setShowNewForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequisitionsPage;
