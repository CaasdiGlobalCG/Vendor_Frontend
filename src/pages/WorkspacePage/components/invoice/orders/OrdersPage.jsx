import React, { useState, useEffect, useContext } from 'react';
import {
  Search,
  RefreshCw,
  Package,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
  Users,
  ChevronDown,
  ChevronUp,
  BadgePercent,
  ExternalLink
} from 'lucide-react';
import { VendorContext } from '../../../../../context/VendorContext.jsx';

const STAGE_CONFIG = {
  procurement_request: { label: 'Procurement Request', color: 'bg-gray-100 text-gray-700', icon: FileText },
  rfq_sent: { label: 'RFQ Sent to Vendors', color: 'bg-blue-100 text-blue-700', icon: Send },
  vendor_quotes_received: { label: 'Vendor Quotes Received', color: 'bg-indigo-100 text-indigo-700', icon: Users },
  final_quotation_created: { label: 'Final Quotation Created', color: 'bg-yellow-100 text-yellow-700', icon: FileText },
  commissioned: { label: 'Final Quotation Received', color: 'bg-orange-100 text-orange-700', icon: CheckCircle },
};

const PIPELINE_STEPS = [
  'procurement_request',
  'rfq_sent',
  'vendor_quotes_received',
  'final_quotation_created',
  'commissioned'
];

const OrdersPage = ({ workspaceId, selectedTask, selectedSubtask, onRaisePOFromOrder }) => {
  const { currentUser } = useContext(VendorContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = async () => {
    if (!currentUser?.vendorId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ workspaceId });
      if (selectedTask?.id) params.append('taskId', selectedTask.id);
      if (selectedSubtask?.id) params.append('subtaskId', selectedSubtask.id);
      params.append('vendorId', currentUser.vendorId);
      params.append('userRole', 'vendor');

      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: currentUser.vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`/api/procurement-requests/crm-orders?${params.toString()}`, { headers });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [workspaceId, selectedTask?.id, selectedSubtask?.id, currentUser?.vendorId]);

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (order.item || '').toLowerCase().includes(term) ||
      (order.requestId || '').toLowerCase().includes(term) ||
      (order.pipeline?.stage || '').toLowerCase().includes(term)
    );
  });

  const toNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[₹,]/g, '').trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const buildPoSourceFromOrder = (order) => {
    const pipeline = order?.pipeline || {};
    const finalQuotation = (pipeline.finalQuotations || [])[0] || {};
    const commissionRecord = (pipeline.commissionRecords || [])[0] || {};
    const finalQuotationId = finalQuotation.quotationsId || order?.requestId;

    const finalPdfUrl =
      finalQuotation.pdfUrl ||
      finalQuotation.commissionedQuotationUrl ||
      finalQuotation.commissionedPdfUrl ||
      commissionRecord.pdfUrl ||
      null;

    const totalAmount = toNumber(finalQuotation.amount || order?.amount);
    const quantity = Math.max(1, toNumber(order?.quantity) || 1);
    const derivedRate = quantity > 0 ? totalAmount / quantity : totalAmount;

    return {
      sourceType: 'orders',
      poDispatchTarget: 'procurement',
      sourceOrderId: order?.requestId,
      quotationId: finalQuotationId,
      id: finalQuotationId,
      customQuoteId: finalQuotationId,
      displayQuoteId: finalQuotationId,
      customer: order?.requestedBy || 'Workspace Client',
      customerName: order?.requestedBy || 'Workspace Client',
      customerDetails: {
        name: order?.requestedBy || 'Workspace Client',
      },
      items: [
        {
          itemName: finalQuotation.productName || order?.item || 'Material',
          item: finalQuotation.productName || order?.item || 'Material',
          selectedItem: {
            name: finalQuotation.productName || order?.item || 'Material',
          },
          description: finalQuotation.productName || order?.item || 'Material',
          quantity,
          rate: Number.isFinite(derivedRate) ? derivedRate : 0,
          amount: totalAmount || 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
        }
      ],
      subTotal: totalAmount || 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      total: totalAmount || 0,
      totalAmount: totalAmount || 0,
      workspaceId: order?.workspaceId || workspaceId || null,
      workspaceName: order?.workspaceName || '',
      taskId: order?.taskId || selectedTask?.id || null,
      taskName: order?.taskName || selectedTask?.name || '',
      subtaskId: order?.subtaskId || selectedSubtask?.id || null,
      subtaskName: order?.subtaskName || selectedSubtask?.name || '',
      clientId: order?.clientId || null,
      pdfUrl: finalPdfUrl,
      finalQuotationPdfUrl: finalPdfUrl,
      createdAt: finalQuotation.createdAt || order?.createdAt || new Date().toISOString(),
    };
  };

  const getInvoiceRecord = (pipeline = {}) => {
    const commissionRecords = pipeline.commissionRecords || [];
    return commissionRecords.find((record) =>
      Boolean(record?.invoiceReady || record?.commissionedInvoicePdfUrl || record?.invoicePdfUrl)
    ) || null;
  };

  // Summary stats
  const stats = {
    total: orders.length,
    rfqSent: orders.filter(o => o.pipeline?.stage === 'rfq_sent').length,
    quotesReceived: orders.filter(o => o.pipeline?.stage === 'vendor_quotes_received').length,
    finalCreated: orders.filter(o => ['final_quotation_created', 'commissioned'].includes(o.pipeline?.stage)).length,
    finalQuotationReceived: orders.filter(o => o.pipeline?.stage === 'commissioned').length,
  };

  const getStepIndex = (stage) => PIPELINE_STEPS.indexOf(stage);

  const renderPipelineProgress = (stage) => {
    const currentIndex = getStepIndex(stage);
    return (
      <div className="flex items-center gap-1 mt-2">
        {PIPELINE_STEPS.map((step, idx) => {
          const config = STAGE_CONFIG[step];
          const Icon = config.icon;
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <React.Fragment key={step}>
              {idx > 0 && (
                <div className={`h-0.5 w-4 ${isCompleted ? 'bg-teal-500' : 'bg-gray-200'}`} />
              )}
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs
                  ${isCurrent ? 'bg-teal-600 text-white ring-2 ring-teal-300' :
                    isCompleted ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                title={config.label}
              >
                <Icon size={12} />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        <span className="ml-3 text-gray-500">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            Workspace: {workspaceId?.substring(0, 8)}...
            {selectedTask?.name && ` | Task: ${selectedTask.name}`}
            {selectedSubtask?.name && ` | Subtask: ${selectedSubtask.name}`}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Package, color: 'text-gray-600' },
          { label: 'RFQ Sent', value: stats.rfqSent, icon: Send, color: 'text-blue-600' },
          { label: 'Quotes Received', value: stats.quotesReceived, icon: Users, color: 'text-indigo-600' },
          { label: 'Final Quotation', value: stats.finalCreated, icon: FileText, color: 'text-yellow-600' },
          { label: 'Final Quotation Received', value: stats.finalQuotationReceived, icon: CheckCircle, color: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-800">{value}</span>
              <Icon size={18} className={color} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by material, request ID, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm mt-1">Orders from workspace materials will appear here once created.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const pipeline = order.pipeline || {};
            const stageConfig = STAGE_CONFIG[pipeline.stage] || STAGE_CONFIG.procurement_request;
            const isExpanded = expandedOrder === order.requestId;
            const hasFinalQuotation = (pipeline.finalQuotations || []).length > 0;
            const canRaisePO = Boolean(onRaisePOFromOrder) && hasFinalQuotation;
            const invoiceRecord = getInvoiceRecord(pipeline);
            const invoiceReady = Boolean(invoiceRecord || pipeline.invoiceReady);
            const invoiceUrl =
              invoiceRecord?.commissionedInvoicePdfUrl ||
              invoiceRecord?.invoicePdfUrl ||
              pipeline.invoicePdfUrl ||
              null;

            return (
              <div key={order.requestId} className="bg-white border rounded-lg overflow-hidden">
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.requestId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-800">{order.item || 'Unknown Material'}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageConfig.color}`}>
                          {stageConfig.label}
                        </span>
                        {invoiceReady && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <BadgePercent size={12} /> Invoice Ready
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{order.requestId}</span>
                        <span>Qty: {order.quantity || '-'}</span>
                        <span>Priority: {order.priority || 'medium'}</span>
                        {order.taskName && <span>Task: {order.taskName}</span>}
                        {order.subtaskName && <span>Subtask: {order.subtaskName}</span>}
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      {renderPipelineProgress(pipeline.stage)}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      {invoiceReady && invoiceUrl && (
                        <a
                          href={invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          title="View Invoice"
                        >
                          View Invoice
                        </a>
                      )}
                      {canRaisePO && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRaisePOFromOrder(buildPoSourceFromOrder(order));
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                          title="Raise Purchase Order"
                        >
                          Raise PO
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Procurement Request */}
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <FileText size={14} /> Procurement Request
                        </div>
                        <div className="text-xs space-y-1 text-gray-600">
                          <p>Status: <span className="font-medium">{order.status}</span></p>
                          <p>Amount: {order.amount ? `₹${Number(order.amount).toLocaleString()}` : '-'}</p>
                          <p>Requested By: {order.requestedBy || '-'}</p>
                          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* RFQs Sent */}
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <Send size={14} /> RFQs Sent ({pipeline.rfqsSent || 0})
                        </div>
                        {(pipeline.sentRfqs || []).length > 0 ? (
                          <div className="text-xs space-y-2 text-gray-600">
                            {pipeline.sentRfqs.map(rfq => (
                              <div key={rfq.sentRfqId} className="border-l-2 border-blue-300 pl-2">
                                <p className="font-medium">To {(rfq.vendorIds || []).length} vendor(s)</p>
                                <p>Status: {rfq.status}</p>
                                <p>{new Date(rfq.createdAt).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No RFQs sent yet</p>
                        )}
                      </div>

                      {/* Vendor Quotations */}
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <Users size={14} /> Vendor Quotes ({pipeline.vendorQuotesReceived || 0})
                        </div>
                        {(pipeline.vendorQuotations || []).length > 0 ? (
                          <div className="text-xs space-y-2 text-gray-600 max-h-32 overflow-y-auto">
                            {pipeline.vendorQuotations.map(vq => (
                              <div key={vq.quotationId} className="border-l-2 border-indigo-300 pl-2">
                                <p className="font-medium">{vq.item || 'Quotation'}</p>
                                <p>Rate: ₹{vq.rate || '-'} | Qty: {vq.quantity || '-'}</p>
                                <p>Status: {vq.status || 'submitted'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No quotes received yet</p>
                        )}
                      </div>

                      {/* Final Quotation & Commission */}
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <CheckCircle size={14} /> Final Quotation
                        </div>
                        {(pipeline.finalQuotations || []).length > 0 ? (
                          <div className="text-xs space-y-2 text-gray-600">
                            {pipeline.finalQuotations.map(fq => (
                              <div key={fq.quotationsId} className="border-l-2 border-green-300 pl-2">
                                <p className="font-medium">{fq.productName}</p>
                                <p>Amount: ₹{Number(fq.amount).toLocaleString()}</p>
                                <p>Status: {pipeline.stage === 'commissioned' ? 'Final Quotation Received' : (fq.status || 'Pending')}</p>
                                {(fq.pdfUrl || fq.commissionedQuotationUrl || fq.commissionedPdfUrl) && (
                                  <a
                                    href={fq.pdfUrl || fq.commissionedQuotationUrl || fq.commissionedPdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium"
                                  >
                                    <ExternalLink size={12} /> View Final Quotation PDF
                                  </a>
                                )}
                              </div>
                            ))}
                            {(pipeline.commissionRecords || []).length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="font-medium text-orange-700">Final Quotation Received</p>
                                {pipeline.commissionRecords.map(cr => (
                                  <div key={cr.commissionRecordId} className="mt-1">
                                    {cr.pdfUrl && (
                                      <a
                                        href={cr.pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium"
                                      >
                                        <ExternalLink size={12} /> View Final Quotation PDF
                                      </a>
                                    )}
                                    {(cr.commissionedInvoicePdfUrl || cr.invoicePdfUrl || pipeline.invoicePdfUrl) && (
                                      <a
                                        href={cr.commissionedInvoicePdfUrl || cr.invoicePdfUrl || pipeline.invoicePdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium"
                                      >
                                        <ExternalLink size={12} /> Invoice Ready - View Invoice PDF
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">Not yet created</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
