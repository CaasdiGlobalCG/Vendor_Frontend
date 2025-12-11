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
import StandardPreview from '../shared/StandardPreview.jsx';

const PurchaseOrdersPage = ({ workspaceId, workspaceName, selectedTask, selectedSubtask, sourceQuote, onSourceConsumed, onConvertToInvoice }) => {
  const { currentUser } = useContext(VendorContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [purchaseOrdersData, setPurchaseOrdersData] = useState([]);
  const [nextPoNumber, setNextPoNumber] = useState(2026001);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedQuote, setHighlightedQuote] = useState(sourceQuote || null);
  const [sendingPo, setSendingPo] = useState(false);

  // Sync highlighted quote when sourceQuote prop changes
  useEffect(() => {
    if (sourceQuote) {
      setHighlightedQuote(sourceQuote);
    }
  }, [sourceQuote]);

  // Using relative paths - no API_BASE_URL needed

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

        // Compute the next PO number starting from 2026001.
        // We only consider customPoId values that are purely numeric to avoid
        // clashing with older string-based IDs.
        const START_PO_NUMBER = 2026001;
        const numericPoNumbers = (result.data || [])
          .map((po) => {
            const raw = po.customPoId;
            if (!raw) return null;
            const str = String(raw).trim();
            if (!/^\d+$/.test(str)) return null;
            const num = parseInt(str, 10);
            return Number.isNaN(num) ? null : num;
          })
          .filter((n) => n !== null);

        const maxExisting =
          numericPoNumbers.length > 0 ? Math.max(...numericPoNumbers) : START_PO_NUMBER - 1;
        const computedNext = maxExisting >= START_PO_NUMBER ? maxExisting + 1 : START_PO_NUMBER;
        setNextPoNumber(computedNext);
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

  // Fetch purchase orders from backend
  useEffect(() => {
    fetchPurchaseOrders();
  }, [currentUser?.vendorId]);

  const filteredOrders = purchaseOrdersData.filter((order) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const idStr = order.id != null ? String(order.id).toLowerCase() : '';
    const projectStr = order.project ? order.project.toLowerCase() : '';
    const vendorStr = order.vendor ? order.vendor.toLowerCase() : '';

    const matchesSearch =
      !normalizedSearch ||
      idStr.includes(normalizedSearch) ||
      projectStr.includes(normalizedSearch) ||
      vendorStr.includes(normalizedSearch);

    const statusTypeStr = (order.statusType || '').toLowerCase();
    const matchesStatus =
      selectedStatus === 'all' || statusTypeStr === selectedStatus.toLowerCase();

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

  const handleSendPOToPM = async () => {
    if (!highlightedQuote || !currentUser?.vendorId) return;

    try {
      setSendingPo(true);

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

      const rawTotal =
        highlightedQuote.total ??
        (typeof highlightedQuote.totalAmount === 'string'
          ? parseFloat(highlightedQuote.totalAmount.replace(/[₹,]/g, ''))
          : highlightedQuote.totalAmount) ??
        0;

      const body = {
        vendorId,
        quotationId: highlightedQuote.quotationId || highlightedQuote.id,
        // Use a dedicated numeric PO sequence starting from 2026001
        customPoId: nextPoNumber,
        referenceQuoteNumber:
          highlightedQuote.customQuoteId ||
          highlightedQuote.quoteNumber ||
          highlightedQuote.displayQuoteId ||
          highlightedQuote.id,
        customerId: highlightedQuote.customerDetails?.customerId || highlightedQuote.customerId || null,
        customerName: highlightedQuote.customer || highlightedQuote.customerName,
        customerDetails: highlightedQuote.customerDetails || {},
        items: highlightedQuote.items || [],
        subtotal: highlightedQuote.subTotal || highlightedQuote.subtotal || 0,
        totalCgst:
          highlightedQuote.cgst?.amount ??
          highlightedQuote.totalCgst ??
          highlightedQuote.cgstAmount ??
          0,
        totalSgst:
          highlightedQuote.sgst?.amount ??
          highlightedQuote.totalSgst ??
          highlightedQuote.sgstAmount ??
          0,
        totalIgst: highlightedQuote.igst ?? highlightedQuote.totalIgst ?? 0,
        total: rawTotal || 0,
        workspaceId: highlightedQuote.workspaceId || workspaceId || null,
        workspaceName: highlightedQuote.workspaceName || workspaceName || '',
        projectId: highlightedQuote.projectId || null,
        projectName: highlightedQuote.projectName || '',
        taskId: highlightedQuote.taskId || selectedTask?.id || null,
        taskName: highlightedQuote.taskName || selectedTask?.name || '',
        subtaskId: highlightedQuote.subtaskId || selectedSubtask?.id || null,
        subtaskName: highlightedQuote.subtaskName || selectedSubtask?.name || '',
        clientId: highlightedQuote.clientId || null,
        pdfUrl: highlightedQuote.pdfUrl || null
      };

      console.log('📤 Creating purchase order from quote:', body);

      const response = await fetch('/api/workspace/purchase-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create purchase order');
      }

      console.log('✅ Purchase order created:', result.data);
      // Increment PO number locally for the next PO only after a successful creation
      setNextPoNumber((prev) => (prev ? prev + 1 : 2026001));
      alert('Purchase Order sent to PM successfully!');

      if (onSourceConsumed) {
        onSourceConsumed();
      }
      setHighlightedQuote(null);
      fetchPurchaseOrders();
    } catch (err) {
      console.error('❌ Error creating purchase order from quote:', err);
      alert('Failed to send PO to PM: ' + err.message);
    } finally {
      setSendingPo(false);
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

      {/* Quote preview section when coming from Quotes dashboard */}
      {highlightedQuote && (
        <div className="px-8 pb-4">
          <div className="bg-white border border-emerald-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Raise Purchase Order for Quote{' '}
                  {highlightedQuote.customQuoteId ||
                    highlightedQuote.displayQuoteId ||
                    highlightedQuote.id}
                </h2>
                <p className="text-sm text-gray-500">
                  Review the quote details below, then click{' '}
                  <span className="font-semibold">Send PO to PM</span>.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setHighlightedQuote(null);
                    if (onSourceConsumed) {
                      onSourceConsumed();
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleSendPOToPM}
                  disabled={sendingPo}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingPo ? 'Sending...' : 'Send PO to PM'}
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-4 max-h-[480px] overflow-auto">
              <StandardPreview
                quote={highlightedQuote}
                docType="purchaseorder"
                poNumber={nextPoNumber}
                referenceNumber={
                  highlightedQuote.customQuoteId ||
                  highlightedQuote.quoteNumber ||
                  highlightedQuote.displayQuoteId ||
                  highlightedQuote.id
                }
                company={{
                  logo: 'https://dummyimage.com/80x80/0d6b5c/ffffff.png&text=CG',
                  name: 'Caasdi Ventures LLP',
                  address:
                    '262, 80 FEET ROAD, SRINIVASANAGAR, Banashankari Stage 1, Bengaluru, Karnataka, 560050',
                  gstin: '29AATFC6608I2ZB',
                  email: 'corp@caasdiglobal.in',
                  country: 'India'
                }}
                terms={highlightedQuote.termsAndConditions}
                notes={highlightedQuote.customerNotes}
              />
            </div>
          </div>
        </div>
      )}

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
              <p className="text-gray-500 mb-6">
                {highlightedQuote
                  ? 'Once you send the PO to PM, it will appear here.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {!highlightedQuote && (
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                  Create New Purchase Order
                </button>
              )}
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
                      {order.status && order.status.toLowerCase().includes('requested for invoice') && onConvertToInvoice && (
                        <button
                          className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors duration-200"
                          onClick={() => onConvertToInvoice(order)}
                        >
                          Convert to Invoice
                        </button>
                      )}
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
