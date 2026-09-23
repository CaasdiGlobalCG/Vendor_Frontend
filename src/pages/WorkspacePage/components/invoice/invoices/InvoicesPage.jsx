import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Search, Plus, MoreHorizontal, Eye, Edit, Download, Send, Trash2, FileText, Calendar, DollarSign, TrendingUp, ArrowLeft, Copy, Check, AlertCircle, Clock } from 'lucide-react';
import RecordPaymentForm from '../shared/RecordPaymentForm';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import NewInvoiceComponent from './NewInvoiceComponent';
import InvoicesPreviewPanel from './InvoicesPreviewPanel';
import config from '../../../../../config/env';
import invoiceFetch from '../utils/invoiceFetch';

const InvoicesPage = (props) => {
  const { currentUser } = useContext(VendorContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [invoicesData, setInvoicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalValue: 0,
    approvedInvoices: 0
  });
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState({});

  // When navigating from Purchase Orders, we may receive a sourcePo
  // containing the purchase order that should be converted to an invoice.
  useEffect(() => {
    if (props?.sourcePo) {
      const po = props.sourcePo;
      console.log('🧾 Converting Purchase Order to Invoice form:', po);
      console.log('🧾 Checking PO for items - checking fields:');
      console.log('  - po.items:', po.items);
      console.log('  - po.itemsList:', po.itemsList);
      console.log('  - po.lineItems:', po.lineItems);
      console.log('  - po.products:', po.products);

      const customer = po.customerDetails || {};
      // Try multiple possible field names for items - PO can have items, itemsList, lineItems, etc
      const itemsFromPo = Array.isArray(po.items) ? po.items : 
                         (Array.isArray(po.itemsList) ? po.itemsList : 
                         (Array.isArray(po.lineItems) ? po.lineItems : 
                         (Array.isArray(po.products) ? po.products : [])));
      console.log('✅ Final itemsFromPo extracted:', itemsFromPo);
      console.log('📦 Length of items:', itemsFromPo.length);

      const initialFromPo = {
        // Treat this as a "template" for a new invoice, not an edit
        fromPo: true,
        customerDetails: customer,
        selectedCustomer: customer,
        items: itemsFromPo,
        discount: { type: 'percentage', value: 0 },
        tdsType: '',
        tdsValue: 0,
        // Workspace / project context carried over from the PO
        projectId: po.projectId || null,
        projectName: po.project || po.projectName || po.workspaceName || '',
        workspaceId: po.workspaceId || props.workspaceId || null,
        workspaceName: po.workspaceName || props.workspaceName || '',
        taskId: po.taskId || props.selectedTask?.id || null,
        taskName: po.taskName || props.selectedTask?.name || '',
        subtaskId: po.subtaskId || props.selectedSubtask?.id || null,
        subtaskName: po.subtaskName || props.selectedSubtask?.name || '',
        clientId: po.clientId || null,
        // Dates
        quoteDate: po.purchaseOrderDate || po.date || new Date().toISOString().split('T')[0],
        expiryDate: null,
        // Reference numbers for downstream display
        referenceQuoteNumber: po.referenceQuoteNumber || null,
        referencePoNumber: po.id || po.customPoId || po.purchaseOrderId || null
      };

      console.log('📋 Final initialFromPo with items:', initialFromPo);
      setEditingInvoice(initialFromPo);
      setShowNewInvoice(true);

      if (props.onSourceConsumed) {
        props.onSourceConsumed();
      }
    }
  }, [props?.sourcePo]);

  // API Base URL
  // Using relative paths - no API_BASE_URL needed

  // Debug logging
  console.log('🔍 InvoicesPage - Current user:', currentUser);
  console.log('🔍 InvoicesPage - Vendor ID:', currentUser?.vendorId);

  // Fetch invoices from backend
  const fetchInvoices = useCallback(async () => {
    if (!currentUser?.vendorId) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Fetching invoices from backend...');

      const vendorId = currentUser.vendorId;
      console.log('🔑 Using vendor ID from auth context:', vendorId);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      // Build query params: always vendorId; optionally workspace/task/subtask if provided via props
      const params = new URLSearchParams();
      params.append('vendorId', vendorId);
      if (props?.workspaceId) params.append('workspaceId', props.workspaceId);
      if (props?.selectedTask?.id) params.append('taskId', props.selectedTask.id);
      if (props?.selectedSubtask?.id) params.append('subtaskId', props.selectedSubtask.id);

      const response = await invoiceFetch(`/api/workspace/invoices?${params.toString()}`, {
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setInvoicesData(result.data || []);
        console.log(`✅ Successfully loaded ${result.data?.length || 0} invoices`);

        // Fetch stats
        const statsResponse = await invoiceFetch(`/api/workspace/invoices/stats?vendorId=${vendorId}`, {
          headers: headers
        });
        if (statsResponse.ok) {
          const statsResult = await statsResponse.json();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        }
      } else {
        throw new Error(result.message || 'Failed to fetch invoices');
      }
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      setError(error.message);
      setInvoicesData([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.vendorId, currentUser?.email, currentUser?.name, props?.workspaceId, props?.selectedTask, props?.selectedSubtask]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoicesData.filter(invoice => {
    const matchesSearch = invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || invoice.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return {
          bg: 'bg-gradient-to-r from-surface-hover to-surface-hover',
          text: 'text-dim',
          border: 'border-line',
          dot: 'bg-cta'
        };
      case 'sent to pm for review':
        return {
          bg: 'bg-black',
          text: 'text-info',
          border: 'border-info/20',
          dot: 'bg-info'
        };
      case 'approved by pm':
        return {
          bg: 'bg-black',
          text: 'text-success',
          border: 'border-success/20',
          dot: 'bg-success'
        };
      case 'sent to finance':
        return {
          bg: 'bg-black',
          text: 'text-warning',
          border: 'border-warning/20',
          dot: 'bg-warning'
        };
      case 'red_flagged':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-rose-50',
          text: 'text-red-700',
          border: 'border-red-200',
          dot: 'bg-red-500'
        };
      case 'rejected':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-pink-50',
          text: 'text-red-600',
          border: 'border-red-200',
          dot: 'bg-red-400'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-surface-hover to-surface-hover',
          text: 'text-dim',
          border: 'border-line',
          dot: 'bg-cta'
        };
    }
  };

  const totalValue = stats.totalValue || invoicesData.reduce((sum, invoice) => {
    return sum + parseFloat(invoice.totalAmount.replace('₹', '').replace(/,/g, ''));
  }, 0);

  // Loading state for authentication
  if (!currentUser?.vendorId) {
    return (
      <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line mx-auto mb-4"></div>
          <p className="text-dim">Loading user authentication...</p>
        </div>
      </div>
    );
  }

  // Loading state for data fetching
  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line mx-auto mb-4"></div>
          <p className="text-dim">Loading invoices...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-danger text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">Error Loading Invoices</h3>
          <p className="text-dim mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-surface text-white px-6 py-3 rounded-xl hover:from-surface hover:to-surface transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Handle invoice creation/editing
  const handleInvoiceCreated = (invoiceData) => {
    console.log('Invoice created:', invoiceData);
    fetchInvoices(); // Refresh the invoices list immediately
    setShowNewInvoice(false);
    setEditingInvoice(null);
  };

  // Handle saving payments
  const handleSavePayment = async (invoiceId, paymentData) => {
    try {
      console.log('Saving payment:', { invoiceId, paymentData });
      
      // Create a new payment object
      const newPayment = {
        ...paymentData,
        id: `pay_${Date.now()}`,
        amount: parseFloat(paymentData.amount),
        paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
        recordedAt: new Date().toISOString()
      };

      // Update the invoice with the new payment
      const updatedInvoices = invoicesData.map(invoice => {
        if (invoice.id === invoiceId) {
          // Create or update the payments array
          const existingPayments = Array.isArray(invoice.payments) ? invoice.payments : [];
          const updatedPayments = [...existingPayments, newPayment];
          
          // Calculate total paid amount
          const totalPaid = updatedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
          const invoiceTotal = parseFloat(invoice.totalAmount?.toString().replace(/[^0-9.]/g, '') || 0);
          const isPaid = totalPaid >= invoiceTotal;
          
          // Update the invoice
          return {
            ...invoice,
            payments: updatedPayments,
            status: isPaid ? 'Paid' : invoice.status
          };
        }
        return invoice;
      });

      // Update the state
      setInvoicesData(updatedInvoices);
      
      // Also update payment history for backward compatibility
      const updatedPaymentHistory = {
        ...paymentHistory,
        [invoiceId]: [...(paymentHistory[invoiceId] || []), newPayment]
      };
      setPaymentHistory(updatedPaymentHistory);
      
      console.log('Payment saved successfully:', { 
        invoiceId, 
        payment: newPayment,
        updatedInvoice: updatedInvoices.find(inv => inv.id === invoiceId)
      });
      
      setShowPaymentForm(false);
      setSelectedInvoice(null);
      
    } catch (error) {
      console.error('Error saving payment:', error);
      // You might want to show an error message to the user here
    }
  };

  // Helper function to safely parse currency values
  const parseCurrency = (value) => {
    if (typeof value === 'number') return value;
    if (!value && value !== 0) return 0;
    
    try {
      const strValue = String(value).trim();
      const numericString = strValue.replace(/[^0-9.-]/g, '');
      const result = parseFloat(numericString);
      return isNaN(result) ? 0 : result;
    } catch (error) {
      console.error('Error parsing currency:', error);
      return 0;
    }
  };

  // Get payment status for an invoice
  const getPaymentStatus = (invoice) => {
    try {
      // Get payments from both paymentHistory and invoice.payments
      const paymentsFromHistory = paymentHistory[invoice.id] || [];
      const paymentsFromInvoice = Array.isArray(invoice.payments) ? invoice.payments : [];
      
      // Combine and deduplicate payments by ID
      const allPayments = [...paymentsFromHistory, ...paymentsFromInvoice].reduce((acc, payment) => {
        if (!acc.some(p => p.id === payment.id)) {
          acc.push(payment);
        }
        return acc;
      }, []);
      
      // Parse amounts safely
      const parseAmount = (amount) => {
        if (typeof amount === 'number') return amount;
        if (typeof amount === 'string') {
          return parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
        }
        return 0;
      };
      
      const totalPaid = allPayments.reduce((sum, p) => sum + parseAmount(p.amount), 0);
      const totalAmount = parseAmount(invoice.totalAmount);
      const remaining = Math.max(0, totalAmount - totalPaid);
      const isPaid = remaining <= 0.01; // Allow for small floating point differences
      const isPartiallyPaid = !isPaid && totalPaid > 0;
      
      return {
        isPaid,
        isPartiallyPaid,
        totalPaid,
        remaining,
        progress: totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0,
        payments: allPayments
      };
    } catch (error) {
      console.error('Error calculating payment status:', error, { invoice });
      return {
        isPaid: false,
        isPartiallyPaid: false,
        totalPaid: 0,
        remaining: 0,
        progress: 0,
        payments: []
      };
    }
  };

  const handleBackToInvoices = () => {
    setShowNewInvoice(false);
    setEditingInvoice(null);
    fetchInvoices(); // Refresh the invoices list
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowNewInvoice(true);
  };

  const handleSendToPM = async (invoice) => {
    try {
      const vendorId = currentUser?.vendorId;
      if (!vendorId) throw new Error('Missing vendorId');

      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const invoiceId = invoice.invoiceId || invoice.id;
      if (!invoiceId) throw new Error('Missing invoiceId');

      await sendInvoiceToPm(invoiceId, vendorId, headers);

      // Update local state to reflect new status
      setInvoicesData((prev) =>
        prev.map((inv) =>
          (inv.invoiceId === invoiceId || inv.id === invoiceId)
            ? { ...inv, status: 'Sent to pm for review' }
            : inv
        )
      );
      alert('Invoice sent to PM for review');
    } catch (err) {
      console.error('❌ Error sending invoice to PM:', err);
      alert(`Failed to send invoice to PM: ${err.message}`);
    }
  };

  // If showing new invoice form, render that instead
  if (showNewInvoice) {
    return (
      <NewInvoiceComponent
        onBack={handleBackToInvoices}
        onQuoteCreated={handleInvoiceCreated}
        initialData={editingInvoice}
        // Don't set duplicateMode for PO conversions - show "New Tax Invoice" instead of "Duplicate"
        duplicateMode={false}
      />
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover">
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface">
          <InvoicesPreviewPanel 
            quotes={invoicesData} 
            selectedQuoteId={previewInvoiceId} 
            onSelectQuote={q => setPreviewInvoiceId(q.id || q.invoiceId)}
            onClose={() => setShowPreviewModal(false)}
          />
        </div>
      )}
      {/* Beautiful Header with Stats */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-surface"></div>
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold ">
                Tax Invoices Dashboard
              </h1>
              <p className="text-dim mt-2">Manage and track all your business tax invoices</p>
            </div>
            <button 
              onClick={() => setShowNewInvoice(true)}
              className="bg-surface text-white px-6 py-3 rounded-xl hover:from-surface hover:to-surface transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform "
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Tax Invoice</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Tax Invoices</p>
                  <p className="text-2xl font-bold text-ink">{stats.totalInvoices || invoicesData.length}</p>
                  <p className="text-xs text-success mt-1">↗ +8% this month</p>
                </div>
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-info" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-ink">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-success mt-1">↗ +12% this month</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Approved</p>
                  <p className="text-2xl font-bold text-ink">{stats.approvedInvoices || invoicesData.filter(i => i.status.toLowerCase() === 'approved by pm').length}</p>
                  <p className="text-xs text-success mt-1">↗ +5% this month</p>
                </div>
                <div className="w-12 h-12 bg-surface-hover rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-ink" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 transform  text-dim w-5 h-5" />
              <input
                type="text"
                placeholder="Search in invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent text-sm"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-surface border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="px-8 py-8">
        {/* Use overflow-visible so row dropdown menus are not clipped */}
        <div className="bg-surface border border-line rounded-lg overflow-visible ">
          <table className="w-full">
            <thead className="bg-canvas border-b border-line">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Invoice
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Due Date
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-dim">
                    Loading invoices...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-danger">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-dim">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice, index) => {
                  const statusConfig = getStatusConfig(invoice.status);
                  return (
                    <tr key={`${invoice.id}-${index}`} className="hover:bg-canvas transition-colors duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-info" />
                          </div>
                          <div>
                            <div className="font-semibold text-ink">{invoice.id}</div>
                            {invoice.allotedDC && (
                              <div className="text-xs text-info bg-info/10 px-2 py-0.5 rounded mt-1">
                                DC: {invoice.allotedDC}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-ink">
                          {invoice.customer}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 text-sm text-dim">
                          <Calendar className="w-4 h-4 text-dim" />
                          <span>{invoice.date}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-lg font-bold text-ink">
                          {invoice.totalAmount}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="text-sm font-medium text-ink">{invoice.dueDate}</div>
                      </td>
                      <td className="py-4 px-6">
                        {(() => {
                          const { isPaid, isPartiallyPaid, progress, remaining, totalPaid } = getPaymentStatus(invoice);
                          const invoiceTotal = parseCurrency(invoice.totalAmount);
                          
                          // Format currency with proper symbols and decimals
                          const formatCurrency = (amount) => {
                            return new Intl.NumberFormat('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(amount).replace('₹', '₹ ');
                          };
                          
                          return (
                            <div className="flex flex-col items-center">
                              {isPaid ? (
                                <div className="text-center">
                                  <span className="px-2 py-1 text-xs font-medium text-success bg-success/10 rounded-full">
                                    Paid
                                  </span>
                                  <div className="text-xs text-dim mt-1">
                                    {formatCurrency(totalPaid)} of {formatCurrency(invoiceTotal)}
                                  </div>
                                </div>
                              ) : isPartiallyPaid ? (
                                <div className="w-full">
                                  <div className="text-xs text-right text-dim mb-1">
                                    {formatCurrency(remaining)} remaining
                                  </div>
                                  <div className="w-full bg-surface-hover rounded-full h-2 mb-1">
                                    <div
                                      className="bg-warning h-2 rounded-full"
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs text-right text-dim">
                                    {formatCurrency(totalPaid)} of {formatCurrency(invoiceTotal)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <span className="px-2 py-1 text-xs font-medium text-danger bg-danger/10 rounded-full">
                                    Unpaid
                                  </span>
                                  <div className="text-xs text-dim mt-1">
                                    {formatCurrency(invoiceTotal)} total
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-1">
                          <button 
                            onClick={() => { setPreviewInvoiceId(invoice.id || invoice.invoiceId); setShowPreviewModal(true); }}
                            className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-xl transition-all duration-200 hover:scale-105" 
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentForm(true);
                            }}
                            className="p-2 text-dim hover:text-info hover:bg-info/10 rounded-xl transition-all duration-200 hover:scale-105"
                            title="Record Payment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditInvoice(invoice)}
                            className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-xl transition-all duration-200 hover:scale-105" 
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                            <button
                            onClick={() => handleSendToPM(invoice)}
                            className="p-2 text-dim hover:text-info hover:bg-info/10 rounded-xl transition-all duration-200 hover:scale-105"
                            title="Send to PM"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <div className="relative group">
                            <button className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-lg transition-colors duration-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-10 w-36 bg-surface border border-line rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                              <button className="w-full text-left px-4 py-3 text-sm text-ink hover:bg-canvas rounded-t-lg transition-colors flex items-center space-x-2">
                                <Copy className="w-4 h-4" />
                                <span>Duplicate</span>
                              </button>
                              <button className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-danger/10 rounded-b-lg flex items-center space-x-2 transition-colors">
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Empty State */}
          {/* This section is now handled by the loading/error/no data states */}
        </div>

        {/* Pagination */}
        {/* This section is now handled by the loading/error/no data states */}
      </div>

      {/* Record Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <RecordPaymentForm
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
          }}
          onSave={(paymentData) => handleSavePayment(selectedInvoice.id, paymentData)}
        />
      )}
    </div>
  );
};

// Send invoice to PM (status update)
const sendInvoiceToPm = async (invoiceId, vendorId, headers) => {
  const url = `/api/workspace/invoices/${invoiceId}/status`;
  const body = {
    status: 'sent to pm for review',
    vendorId
  };
  const res = await invoiceFetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to send invoice to PM (status ${res.status})`);
  }
  return res.json();
};

export default InvoicesPage;
