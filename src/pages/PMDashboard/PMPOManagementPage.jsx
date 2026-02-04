import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../context/VendorContext';
import {
  ArrowLeftIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ClockIcon,
  CheckIcon,
  DocumentTextIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const PMPOManagementPage = () => {
  const { currentUser } = useContext(VendorContext);
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showClientPOModal, setShowClientPOModal] = useState(false);
  const [commissionToRemove, setCommissionToRemove] = useState(0);
  const [sendingToVendor, setSendingToVendor] = useState(false);
  const [savingPmPO, setSavingPmPO] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Client PO editing state
  const [editedQuotation, setEditedQuotation] = useState(null);
  const [poRemovedCommission, setPoRemovedCommission] = useState(0);
  const [adjustedItems, setAdjustedItems] = useState([]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'pm') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [currentUser, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchQuotations(),
        fetchPurchaseOrders()
      ]);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await fetch('/api/workspace/quotations?status=requested_po_from_pm', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const quotationsWithClientPO = (data.data || []).filter(q => q.clientPOFile);
        setQuotations(quotationsWithClientPO);
      }
    } catch (error) {
      console.error('❌ Error fetching quotations with client PO:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/workspace/purchase-orders', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch POs');
      
      const data = await response.json();
      // Filter for POs that are uploaded by client (status: 'sent to client' or similar)
      const clientUploadedPOs = (data.data || []).filter(po => 
        po.status === 'sent to client' || po.status === 'sent_to_vendor_for_confirmation' || 
        po.status === 'vendor_accepted' || po.status === 'ready_for_finance' ||
        po.status === 'sent_to_finance_for_commission'
      );
      setPurchaseOrders(clientUploadedPOs);
    } catch (error) {
      console.error('❌ Error fetching POs:', error);
      alert('Failed to load purchase orders');
    }
  };

  const handleReviewPO = async (po) => {
    try {
      const response = await fetch(`/api/workspace/purchase-orders/${po.purchaseOrderId}/review`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch PO details');
      
      const data = await response.json();
      setSelectedPO(data.data);
      setCommissionToRemove(0);
      setShowReviewModal(true);
    } catch (error) {
      console.error('❌ Error reviewing PO:', error);
      alert('Failed to load PO details');
    }
  };

  const handleViewClientPO = async (quotation) => {
    try {
      // Set up edited quotation with original values
      const edited = {
        ...quotation,
        items: (quotation.items || []).map(item => ({ ...item }))
      };
      
      setSelectedQuotation(quotation);
      setEditedQuotation(edited);
      setPoRemovedCommission(quotation.commissionPercentage || 0);
      setAdjustedItems(edited.items || []);
      setShowClientPOModal(true);
    } catch (error) {
      console.error('❌ Error viewing client PO:', error);
      alert('Failed to load client PO details');
    }
  };

  const handleAdjustItemRate = (itemIndex, newRate) => {
    const updated = [...adjustedItems];
    const oldRate = updated[itemIndex].rate || 0;
    const quantity = updated[itemIndex].quantity || 1;
    
    updated[itemIndex].rate = parseFloat(newRate) || 0;
    updated[itemIndex].amount = (parseFloat(newRate) || 0) * quantity;
    
    setAdjustedItems(updated);
  };

  const handleAdjustGST = (itemIndex, newGst) => {
    const updated = [...adjustedItems];
    updated[itemIndex].gst = parseFloat(newGst) || 0;
    setAdjustedItems(updated);
  };

  const calculateAdjustedTotal = () => {
    let subtotal = 0;
    let totalGst = 0;

    adjustedItems.forEach(item => {
      const itemTotal = (item.rate || 0) * (item.quantity || 1);
      subtotal += itemTotal;
      totalGst += (itemTotal * (item.gst || 0)) / 100;
    });

    // Remove commission from total
    const commissionAmount = poRemovedCommission;
    const finalTotal = subtotal + totalGst - commissionAmount;

    return {
      subtotal,
      gst: totalGst,
      commission: commissionAmount,
      total: Math.max(0, finalTotal)
    };
  };

  const handleSavePmPO = async () => {
    if (!editedQuotation) return;

    try {
      setSavingPmPO(true);
      
      // Prepare PO data for PDF generation
      const totals = calculateAdjustedTotal();
      const pmPoData = {
        quotationId: editedQuotation.quotationId,
        quotationDate: editedQuotation.quotationDate,
        expiryDate: editedQuotation.expiryDate,
        customerName: editedQuotation.customerName,
        billingAddress: editedQuotation.billingAddress,
        shippingAddress: editedQuotation.shippingAddress,
        gstin: editedQuotation.gstin,
        items: adjustedItems,
        subtotal: totals.subtotal,
        gst: totals.gst,
        commissionRemoved: poRemovedCommission,
        total: totals.total,
        originalCommissionPercentage: selectedQuotation.commissionPercentage
      };

      // Send to backend to generate PDF and save
      const response = await fetch('/api/workspace/quotations/' + editedQuotation.quotationId + '/pm-po-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(pmPoData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save PM PO file');
      }

      const result = await response.json();
      alert('✅ PM PO file generated and saved successfully!');
      setShowClientPOModal(false);
      setSelectedQuotation(null);
      setEditedQuotation(null);
      
      // Refresh quotations
      fetchQuotations();
    } catch (error) {
      console.error('❌ Error saving PM PO:', error);
      alert('Failed to save PM PO: ' + error.message);
    } finally {
      setSavingPmPO(false);
    }
  };

  const handleSendToVendor = async () => {
    if (!selectedPO) return;

    try {
      setSendingToVendor(true);
      const response = await fetch(
        `/api/workspace/purchase-orders/${selectedPO.purchaseOrderId}/send-to-vendor`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            vendorId: selectedPO.vendorId,
            commissionToRemove: parseFloat(commissionToRemove) || 0
          })
        }
      );

      if (!response.ok) throw new Error('Failed to send PO to vendor');

      const result = await response.json();
      alert('✅ PO sent to vendor successfully!');
      setShowReviewModal(false);
      setSelectedPO(null);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('❌ Error sending PO to vendor:', error);
      alert('Failed to send PO to vendor');
    } finally {
      setSendingToVendor(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'sent_to_vendor_for_confirmation': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '📤 Sent to Vendor' },
      'vendor_accepted': { bg: 'bg-blue-100', text: 'text-blue-800', label: '✓ Vendor Accepted' },
      'vendor_rejected': { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Vendor Rejected' },
      'ready_for_finance': { bg: 'bg-purple-100', text: 'text-purple-800', label: '📊 Ready for Finance' },
      'sent_to_finance_for_commission': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '💰 Sent to Finance' },
      'approved_by_finance': { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Approved by Finance' },
      'sent to client': { bg: 'bg-gray-100', text: 'text-gray-800', label: '📋 Uploaded by Client' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredPOs = purchaseOrders.filter(po => {
    if (filter === 'all') return true;
    if (filter === 'pending') return po.status === 'sent to client';
    if (filter === 'in-review') return ['sent_to_vendor_for_confirmation', 'vendor_accepted'].includes(po.status);
    if (filter === 'approved') return po.status === 'approved_by_finance';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/pm-dashboard')}
              className="p-2 hover:bg-white rounded-lg transition-all"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Order Management</h1>
              <p className="text-sm text-gray-600 mt-1">Review, edit, and route POs for vendor & finance approval</p>
            </div>
          </div>
          <button
            onClick={fetchPurchaseOrders}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-3 border-b border-gray-200">
          {['all', 'client-po', 'pending', 'in-review', 'approved'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-3 font-medium transition-all border-b-2 ${
                filter === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab === 'all' ? 'All POs' : tab === 'client-po' ? '📋 Client POs' : tab === 'pending' ? 'Pending Review' : tab === 'in-review' ? 'In Review' : 'Approved'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading purchase orders...</p>
        </div>
      )}

      {/* Client PO Section */}
      {!loading && (filter === 'all' || filter === 'client-po') && quotations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Client Purchase Orders Awaiting PM Review</h2>
          <div className="grid gap-4">
            {quotations.map(quotation => (
              <div
                key={quotation.quotationId}
                className="bg-white rounded-lg border-2 border-blue-200 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {quotation.customQuoteId || quotation.quotationId}
                      </h3>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        ⏳ Awaiting PM Review
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Customer: {quotation.customerName} | Date: {new Date(quotation.quotationDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{parseFloat(quotation.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    {quotation.commissionPercentage && (
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        Commission: {quotation.commissionPercentage}%
                      </p>
                    )}
                  </div>
                </div>

                {/* File Info */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Client PO File Uploaded</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    {quotation.clientPOFileName || 'client-po.pdf'}
                  </p>
                </div>

                {/* PO Details */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Subtotal</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ₹{parseFloat(quotation.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Tax</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ₹{(parseFloat(quotation.cgst || 0) + parseFloat(quotation.sgst || 0) + parseFloat(quotation.igst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Items</p>
                    <p className="text-lg font-semibold text-gray-900">{(quotation.items || []).length}</p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleViewClientPO(quotation)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>View & Edit PO</span>
                  </button>
                  
                  <a
                    href={quotation.clientPOFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for Client POs */}
      {!loading && (filter === 'client-po' && quotations.length === 0) && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 mb-8">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No client POs awaiting review</h3>
          <p className="text-gray-600">Once clients upload PO files, they will appear here.</p>
        </div>
      )}

      {/* PO List */}
      {!loading && filteredPOs.length > 0 && (
        <div className="grid gap-4">
          {filteredPOs.map(po => (
            <div
              key={po.purchaseOrderId}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {po.customPoId || po.purchaseOrderNumber || po.purchaseOrderId}
                    </h3>
                    {getStatusBadge(po.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Quote Ref: {po.referenceQuoteNumber || 'N/A'} | Vendor: {po.vendorId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{parseFloat(po.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Commission Info (if exists) */}
              {po.commission && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-800 font-medium">💰 Commission Added</span>
                    <span className="text-lg font-bold text-amber-900">
                      ₹{parseFloat(po.commission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* PO Details Preview */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Subtotal</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{parseFloat(po.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Tax</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{(parseFloat(po.cgst || 0) + parseFloat(po.sgst || 0) + parseFloat(po.igst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Items</p>
                  <p className="text-lg font-semibold text-gray-900">{(po.items || []).length}</p>
                </div>
              </div>

              {/* Vendor Response Status */}
              {po.vendorResponse && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Vendor Response: {po.vendorResponse.response === 'accepted' ? '✓ Accepted' : '✗ Rejected'}
                  </p>
                  {po.vendorResponse.feedback && (
                    <p className="text-sm text-blue-800">{po.vendorResponse.feedback}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => handleReviewPO(po)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    po.status === 'sent to client'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : po.status === 'vendor_accepted'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!['sent to client', 'vendor_accepted'].includes(po.status)}
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>Review & Send to Vendor</span>
                </button>

                {po.status === 'vendor_accepted' && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/workspace/purchase-orders/${po.purchaseOrderId}/pm-approve-vendor-response`,
                          {
                            method: 'PUT',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                          }
                        );
                        if (!response.ok) throw new Error('Failed');
                        alert('✅ Vendor response approved! Ready for Finance.');
                        fetchPurchaseOrders();
                      } catch (error) {
                        alert('Failed to approve vendor response');
                      }
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Approve & Send to Finance</span>
                  </button>
                )}

                {po.status === 'ready_for_finance' && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/workspace/purchase-orders/${po.purchaseOrderId}/send-to-finance`,
                          {
                            method: 'PUT',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                          }
                        );
                        if (!response.ok) throw new Error('Failed');
                        alert('✅ PO sent to Finance for commission & approval.');
                        fetchPurchaseOrders();
                      } catch (error) {
                        alert('Failed to send to Finance');
                      }
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all"
                  >
                    <CurrencyDollarIcon className="w-4 h-4" />
                    <span>Send to Finance</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Review Purchase Order</h2>
                <p className="text-sm text-gray-600 mt-1">
                  PO: {selectedPO.customPoId || selectedPO.purchaseOrderId}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedPO(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-6">
              {/* Commission Breakdown */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-3">💰 Commission Breakdown</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-800">Subtotal</span>
                    <span className="font-semibold text-amber-900">
                      ₹{parseFloat(selectedPO.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {selectedPO.commission && (
                    <div className="flex justify-between items-center text-red-600 font-bold text-lg">
                      <span>Commission to Remove</span>
                      <span>₹{parseFloat(selectedPO.commission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                {/* Commission Input */}
                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    Enter commission amount to remove (optional)
                  </label>
                  <input
                    type="number"
                    value={commissionToRemove}
                    onChange={(e) => setCommissionToRemove(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <p className="text-xs text-amber-700 mt-1">
                    Amount to be subtracted from total before sending to vendor
                  </p>
                </div>
              </div>

              {/* PO Summary */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">PO Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vendor</span>
                    <span className="font-medium text-gray-900">{selectedPO.vendorId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items</span>
                    <span className="font-medium text-gray-900">{(selectedPO.items || []).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold text-lg text-gray-900">
                      ₹{parseFloat(selectedPO.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {selectedPO.items && selectedPO.items.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
                  <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                    {selectedPO.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{item.description || `Item ${idx + 1}`}</p>
                          <p className="text-xs text-gray-600">{item.quantity} x ₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ₹{parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedPO(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToVendor}
                disabled={sendingToVendor}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                {sendingToVendor ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>Send to Vendor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client PO View & Edit Modal */}
      {showClientPOModal && editedQuotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Edit Client Purchase Order</h2>
                <p className="text-sm text-blue-100 mt-1">
                  PO: {editedQuotation.customQuoteId || editedQuotation.quotationId} | Status: Remove Commission & Adjust Items
                </p>
              </div>
              <button
                onClick={() => {
                  setShowClientPOModal(false);
                  setEditedQuotation(null);
                  setSelectedQuotation(null);
                }}
                className="text-white hover:bg-blue-800 p-2 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-6">
              {/* Commission Removal Section */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <h3 className="font-bold text-amber-900 mb-4 flex items-center space-x-2">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <span>Remove Commission from Quotation</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-amber-800 mb-2">Original Commission Percentage</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {selectedQuotation.commissionPercentage || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-800 mb-2">Commission Amount</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{parseFloat(selectedQuotation.commissionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    Commission to Remove (₹)
                  </label>
                  <input
                    type="number"
                    value={poRemovedCommission}
                    onChange={(e) => setPoRemovedCommission(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-medium"
                  />
                  <p className="text-xs text-amber-700 mt-2">
                    This amount will be subtracted from the final PO total
                  </p>
                </div>
              </div>

              {/* Items Adjustment Section */}
              <div className="border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <PencilIcon className="w-5 h-5 text-blue-600" />
                  <span>Adjust Item Rates & GST</span>
                </h3>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {adjustedItems.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="mb-4">
                        <p className="font-medium text-gray-900">{item.description || `Item ${idx + 1}`}</p>
                        <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Rate (₹)</label>
                          <input
                            type="number"
                            value={item.rate || 0}
                            onChange={(e) => handleAdjustItemRate(idx, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
                          <input
                            type="number"
                            value={item.gst || 0}
                            onChange={(e) => handleAdjustGST(idx, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                          <input
                            type="text"
                            value={parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            disabled
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              {(() => {
                const totals = calculateAdjustedTotal();
                return (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-4">Adjusted PO Total</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Subtotal</span>
                        <span className="text-lg font-bold text-gray-900">
                          ₹{parseFloat(totals.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">GST</span>
                        <span className="text-lg font-bold text-gray-900">
                          ₹{parseFloat(totals.gst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3">
                        <span className="text-gray-700 font-medium">Commission Removed</span>
                        <span className="text-lg font-bold text-red-600">
                          -₹{parseFloat(totals.commission).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <span className="text-blue-900 font-bold text-lg">Final Total</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ₹{parseFloat(totals.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>Note:</strong> When you save, a new PDF will be generated with the adjusted rates and GST. The commission will be removed and a note about the changes will be included.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowClientPOModal(false);
                  setEditedQuotation(null);
                  setSelectedQuotation(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePmPO}
                disabled={savingPmPO}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                {savingPmPO ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Save & Generate PM PO</span>
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

export default PMPOManagementPage;
