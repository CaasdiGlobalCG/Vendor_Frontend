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
import invoiceFetch from '../utils/invoiceFetch';

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
      const response = await invoiceFetch(`/api/workspace/purchase-requisitions?vendorId=${vendorId}`, {
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
          bg: 'bg-danger/10',
          text: 'text-danger',
          border: 'border-danger/20',
          dot: 'bg-danger'
        };
      case 'Medium':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          border: 'border-warning/20',
          dot: 'bg-warning'
        };
      case 'Low':
        return {
          bg: 'bg-success/10',
          text: 'text-success',
          border: 'border-success/20',
          dot: 'bg-success'
        };
      default:
        return {
          bg: 'bg-canvas',
          text: 'text-dim',
          border: 'border-line',
          dot: 'bg-cta'
        };
    }
  };

  const getStatusConfig = (statusType) => {
    switch (statusType) {
      case 'pending':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          border: 'border-warning/20',
          dot: 'bg-warning'
        };
      case 'converted':
        return {
          bg: 'bg-surface-hover',
          text: 'text-ink',
          border: 'border-line',
          dot: 'bg-cta'
        };
      case 'approved':
        return {
          bg: 'bg-success/10',
          text: 'text-success',
          border: 'border-success/20',
          dot: 'bg-success'
        };
      default:
        return {
          bg: 'bg-canvas',
          text: 'text-dim',
          border: 'border-line',
          dot: 'bg-cta'
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
    <div className="min-h-full bg-canvas">
      {/* Professional Header */}
      <div className="bg-surface border-b border-line">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors duration-200"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-dim" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-ink">
                  Purchase Requisitions
                </h1>
                <p className="text-dim mt-2">View all purchase requisitions and convert approved ones to purchase orders</p>
              </div>
            </div>
            <button 
              onClick={() => setShowNewForm(true)}
              className="bg-cta text-cta-foreground px-6 py-3 rounded-lg hover:bg-cta transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Requisition</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface border border-line rounded-lg p-6 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Requisitions</p>
                  <p className="text-2xl font-bold text-ink">{totalRequisitions}</p>
                </div>
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-info" />
                </div>
              </div>
            </div>
            
            {/* Additional stat cards */}
            <div className="bg-surface border border-line rounded-lg p-6 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Pending Approval</p>
                  <p className="text-2xl font-bold text-ink">{pendingRequisitions}</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Approved</p>
                  <p className="text-2xl font-bold text-ink">{approvedRequisitions}</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-ink">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    }).format(totalValue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-surface-hover rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-ink" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
          
          {/* Secondary action button removed to avoid duplication */}

      {success && (
        <div className="rounded-md bg-success/10 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-success">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Removed duplicate Stats Cards block */}

      {/* Purchase Requisitions Table */}
      <div className="px-8 py-8">
        <div className="bg-surface border border-line rounded-lg overflow-hidden ">
          {/* Table Header */}
          <div className="bg-canvas border-b border-line px-6 py-4">
            <div className="grid grid-cols-7 gap-4 text-sm font-semibold text-dim uppercase tracking-wider">
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
          <div className="divide-y divide-line">
            {requisitionsData.map((requisition, index) => {
              const urgencyConfig = getUrgencyConfig(requisition.urgency);
              const statusConfig = getStatusConfig(requisition.statusType);
              
              return (
                <div key={index} className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-canvas transition-colors duration-200">
                  {/* Project */}
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-ink">
                      {requisition.project}
                    </div>
                  </div>

                  {/* Request Date */}
                  <div className="flex items-center space-x-2 text-sm text-dim">
                    <Calendar className="w-4 h-4 text-dim" />
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
                  <div className="flex items-center space-x-2 text-sm text-dim">
                    <Package className="w-4 h-4 text-dim" />
                    <span>{requisition.itemsCount || 0} items</span>
                  </div>

                  {/* Total Cost */}
                  <div className="flex items-center">
                    <div className="text-lg font-bold text-ink">
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
                    <button className="px-3 py-1.5 text-xs bg-info text-white rounded hover:bg-info transition-colors duration-200 flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                    {Array.isArray(requisition.actions) && requisition.actions.includes('From CRM') && (
                      <span className="px-3 py-1.5 text-xs bg-surface-hover text-ink rounded border border-line">
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
              <div className="w-20 h-20 bg-surface-hover rounded-lg flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-dim" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">No purchase requisitions found</h3>
              <p className="text-dim mb-6">Create your first purchase requisition to get started</p>
              <button onClick={() => setShowNewForm(true)} className="bg-cta text-cta-foreground px-6 py-3 rounded-lg hover:bg-cta transition-colors duration-200">
                Create New Requisition
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {requisitionsData.length > 0 && (
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm text-dim bg-surface border border-line rounded-lg hover:bg-canvas transition-colors duration-200 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-4 py-2 text-sm bg-cta text-cta-foreground rounded-lg hover:bg-cta transition-colors duration-200">
                1
              </button>
              <button className="px-4 py-2 text-sm text-dim bg-surface border border-line rounded-lg hover:bg-canvas transition-colors duration-200 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* New Purchase Requisition Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-semibold">Create New Purchase Requisition</h2>
              <button 
                onClick={() => setShowNewForm(false)}
                className="text-dim hover:text-ink"
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
