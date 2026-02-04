import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from "../../../../../context/VendorContext";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const VendorPOResponsePage = () => {
  const { currentUser } = useContext(VendorContext);
  const navigate = useNavigate();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [response, setResponse] = useState('accepted');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'vendor') {
      navigate('/login');
      return;
    }
    fetchVendorPOs();
  }, [currentUser, navigate]);

  const fetchVendorPOs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/workspace/purchase-orders?vendorId=${currentUser.vendorId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch POs');

      const data = await response.json();
      // Filter for POs sent to vendor for confirmation
      const vendorPOs = (data.data || []).filter(po => 
        po.status === 'sent_to_vendor_for_confirmation'
      );
      setPurchaseOrders(vendorPOs);
    } catch (error) {
      console.error('❌ Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedPO) return;

    try {
      setSubmitting(true);
      const responseData = await fetch(
        `/api/workspace/purchase-orders/${selectedPO.purchaseOrderId}/vendor-response`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            vendorId: selectedPO.vendorId,
            response,
            feedback
          })
        }
      );

      if (!responseData.ok) throw new Error('Failed to submit response');

      const result = await responseData.json();
      alert(`✅ PO ${response === 'accepted' ? 'accepted' : 'rejected'} successfully!`);
      setShowResponseModal(false);
      setSelectedPO(null);
      setResponse('accepted');
      setFeedback('');
      fetchVendorPOs();
    } catch (error) {
      console.error('❌ Error submitting response:', error);
      alert('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const openResponseModal = (po) => {
    setSelectedPO(po);
    setShowResponseModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => navigate('/VendorDashboard')}
            className="p-2 hover:bg-white rounded-lg transition-all"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Orders for Review</h1>
            <p className="text-sm text-gray-600 mt-1">Accept or reject purchase orders sent by PM</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading purchase orders...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && purchaseOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending POs</h3>
          <p className="text-gray-600">You have no purchase orders waiting for your response.</p>
        </div>
      )}

      {/* PO List */}
      {!loading && purchaseOrders.length > 0 && (
        <div className="grid gap-4">
          {purchaseOrders.map(po => (
            <div
              key={po.purchaseOrderId}
              className="bg-white rounded-lg border border-yellow-200 bg-gradient-to-r from-white to-yellow-50 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {po.customPoId || po.purchaseOrderNumber || po.purchaseOrderId}
                    </h3>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      ⏳ Awaiting Your Response
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Reference Quote: {po.referenceQuoteNumber || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{parseFloat(po.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sent on {new Date(po.sentToVendorAt || po.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Commission Removed Info */}
              {po.pmReview && po.pmReview.commissionRemoved > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    ✓ PM has removed commission: ₹{parseFloat(po.pmReview.commissionRemoved).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {/* PO Details */}
              <div className="grid grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Subtotal</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{parseFloat(po.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">CGST</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{parseFloat(po.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">SGST</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{parseFloat(po.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Items</p>
                  <p className="text-lg font-semibold text-gray-900">{(po.items || []).length}</p>
                </div>
              </div>

              {/* Items Preview */}
              {po.items && po.items.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Line Items ({po.items.length})</p>
                  <div className="space-y-1 text-xs">
                    {po.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-blue-800">
                        <span>{item.description || `Item ${idx + 1}`} x{item.quantity}</span>
                        <span>₹{parseFloat(item.amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {po.items.length > 3 && (
                      <p className="text-blue-700 font-medium">+{po.items.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setResponse('accepted');
                    openResponseModal(po);
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Accept PO</span>
                </button>
                <button
                  onClick={() => {
                    setResponse('rejected');
                    openResponseModal(po);
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                >
                  <XCircleIcon className="w-5 h-5" />
                  <span>Reject PO</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {response === 'accepted' ? 'Accept' : 'Reject'} Purchase Order
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedPO.customPoId || selectedPO.purchaseOrderId}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedPO(null);
                  setFeedback('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₹{parseFloat(selectedPO.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Items</p>
                    <p className="text-xl font-bold text-gray-900">{(selectedPO.items || []).length}</p>
                  </div>
                </div>
              </div>

              {/* Response Alert */}
              <div className={`p-4 rounded-lg ${response === 'accepted' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm font-medium ${response === 'accepted' 
                  ? 'text-green-900' 
                  : 'text-red-900'}`}>
                  {response === 'accepted' 
                    ? '✓ You are about to accept this PO' 
                    : '✗ You are about to reject this PO'}
                </p>
              </div>

              {/* Feedback/Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {response === 'accepted' 
                    ? 'Additional Comments (Optional)' 
                    : 'Rejection Reason (Optional)'}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={response === 'accepted' 
                    ? 'Add any comments about this PO...' 
                    : 'Please explain why you are rejecting this PO...'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedPO(null);
                  setFeedback('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={submitting}
                className={`px-6 py-2 font-medium rounded-lg transition-all text-white flex items-center space-x-2 ${
                  response === 'accepted'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    {response === 'accepted' ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Confirm Accept</span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="w-4 h-4" />
                        <span>Confirm Reject</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPOResponsePage;
