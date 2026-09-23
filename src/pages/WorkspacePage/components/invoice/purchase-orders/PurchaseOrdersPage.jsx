import React, { useState, useEffect, useContext } from 'react';
import html2pdf from 'html2pdf.js';
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
  Clock,
  FileText
} from 'lucide-react';
import { VendorContext } from '../../../../../context/VendorContext.jsx';
import config from "../../../../../config/env";
import StandardPreview from '../shared/StandardPreview.jsx';
import invoiceFetch from '../utils/invoiceFetch';
import operonLogo from '../../../../../assets/operon-symbol-black.png';

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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [approvingPoId, setApprovingPoId] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [approvalError, setApprovalError] = useState(null);
  const previewRef = React.useRef(null);

  const isOrdersOrigin =
    highlightedQuote?.sourceType === 'orders' ||
    highlightedQuote?.poDispatchTarget === 'procurement';
  const dispatchLabel = isOrdersOrigin ? 'Procurement Team' : 'PM';

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

      const poQuery = workspaceId
        ? `/api/workspace/purchase-orders?vendorId=${vendorId}&workspaceId=${workspaceId}`
        : `/api/workspace/purchase-orders?vendorId=${vendorId}`;
      const response = await invoiceFetch(poQuery, {
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Pass through the backend-shaped data; append pdfUrl if missing
        const data = (result.data || []).map((po) => ({
          ...po,
          pdfUrl: po.pdfUrl || po.poPdfUrl || po.commissionedPurchaseOrderUrl || ''
        }));

        setPurchaseOrdersData(data);
        console.log(`✅ Successfully loaded ${data?.length || 0} purchase orders`);

        // Compute the next PO number starting from 2026001 using original fields
        const START_PO_NUMBER = 2026001;
        const numericPoNumbers = (data || [])
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
          bg: 'bg-success/10',
          text: 'text-success',
          border: 'border-success/20',
          dot: 'bg-success'
        };
      case 'pending':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          border: 'border-warning/20',
          dot: 'bg-warning'
        };
      case 'draft':
        return {
          bg: 'bg-canvas',
          text: 'text-dim',
          border: 'border-line',
          dot: 'bg-cta'
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

  const handlePreviewClick = (order) => {
    console.log('📄 Preview click for order:', order);
    console.log('🔍 Checking pdfUrl field:', order.pdfUrl);
    
    if (order.pdfUrl && order.pdfUrl.trim() !== '') {
      setPreviewPdfUrl(order.pdfUrl);
      setShowPreviewModal(true);
      console.log('✅ Opening preview with PDF:', order.pdfUrl);
    } else if (order.poPdfUrl && order.poPdfUrl.trim() !== '') {
      // Fallback to poPdfUrl if pdfUrl is not available
      setPreviewPdfUrl(order.poPdfUrl);
      setShowPreviewModal(true);
      console.log('✅ Opening preview with PO PDF:', order.poPdfUrl);
    } else if (order.commissionedPurchaseOrderUrl && order.commissionedPurchaseOrderUrl.trim() !== '') {
      // Fallback to commissioned PO URL
      setPreviewPdfUrl(order.commissionedPurchaseOrderUrl);
      setShowPreviewModal(true);
      console.log('✅ Opening preview with commissioned PO:', order.commissionedPurchaseOrderUrl);
    } else {
      console.error('❌ No PDF URL found in order:', order);
      alert('PDF preview not available for this purchase order');
    }
  };

  const handleSendPO = async () => {
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

      // Generate PO PDF from the preview before sending
      let poPdfUrl = null;
      try {
        console.log('🖨️ Starting PDF generation from preview element');
        
        // Get the preview element that's already rendered on the page
        const previewElement = previewRef.current;
        if (!previewElement) {
          throw new Error('Preview element not found - ensure preview is rendered');
        }

        console.log('Found preview element:', previewElement);

        // Clone the element to avoid affecting the original
        const clonedElement = previewElement.cloneNode(true);
        
        // Remove height constraints from cloned element so the full content is captured
        clonedElement.style.maxHeight = 'none';
        clonedElement.style.height = 'auto';
        clonedElement.style.overflow = 'visible';
        
        // Generate PDF from the cloned element
        const opt = {
          margin: 10,
          filename: `PO-${nextPoNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            allowTaint: true,
            logging: false,
            scrollY: -window.scrollY,
            scrollX: -window.scrollX
          },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        console.log('📄 Generating PDF with options:', opt);
        
        const pdfBlob = await html2pdf().set(opt).from(clonedElement).outputPdf('blob');
        console.log('✅ PDF generated, size:', pdfBlob.size, 'bytes');

        // Get presigned URL for upload
        console.log('🔐 Getting presigned URL from S3...');
        const presignResponse = await invoiceFetch(
          `/api/s3/generate-upload-url?filename=po-${nextPoNumber}-${Date.now()}.pdf&contentType=application/pdf`
        );

        if (!presignResponse.ok) {
          throw new Error('Failed to get presigned URL: ' + presignResponse.statusText);
        }

        const { url: presignedUrl, fileUrl } = await presignResponse.json();
        console.log('✅ Got presigned URL, uploading to S3...');

        // Upload PDF to S3 using presigned URL
        const uploadResponse = await invoiceFetch(presignedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/pdf'
          },
          body: pdfBlob
        });

        if (uploadResponse.ok) {
          poPdfUrl = fileUrl;
          console.log('✅ PO PDF uploaded successfully:', poPdfUrl);
        } else {
          throw new Error('Upload failed: ' + uploadResponse.statusText);
        }
      } catch (pdfError) {
        console.error('❌ PDF generation/upload error:', pdfError);
        // Fall back to quotation PDF if generation fails
        poPdfUrl = highlightedQuote.pdfUrl || null;
      }

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
        pdfUrl: poPdfUrl,
        poPdfUrl: poPdfUrl,
        finalQuotationPdfUrl:
          highlightedQuote.finalQuotationPdfUrl || highlightedQuote.pdfUrl || null,
        sourceType: highlightedQuote.sourceType || (isOrdersOrigin ? 'orders' : 'quotes'),
        sourceOrderId: highlightedQuote.sourceOrderId || null,
        poDispatchTarget: isOrdersOrigin ? 'procurement' : 'pm',
        status: isOrdersOrigin ? 'sent to procurement team' : 'sent to pm'
      };

      console.log('📤 Creating purchase order from quote:', body);

      const response = await invoiceFetch('/api/workspace/purchase-orders', {
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
      alert(`Purchase Order sent to ${dispatchLabel} successfully!`);

      if (onSourceConsumed) {
        onSourceConsumed();
      }
      setHighlightedQuote(null);
      fetchPurchaseOrders();
    } catch (err) {
      console.error('❌ Error creating purchase order from quote:', err);
      alert(`Failed to send PO to ${dispatchLabel}: ${err.message}`);
    } finally {
      setSendingPo(false);
    }
  };

  const handleApproveAndSendPO = async (order) => {
    if (!order?.id || !currentUser?.vendorId) {
      console.error('❌ Missing order ID or vendor ID');
      setApprovalError('Missing required information to approve PO');
      return;
    }

    try {
      setApprovingPoId(order.id);
      setApprovalError(null);
      setApprovalMessage(null);

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

      console.log('🔄 Approving PO:', order.id);

      // Call backend endpoint to approve PO
      const response = await invoiceFetch(`/api/workspace/purchase-orders/${order.id}/vendor-response`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({
          vendorId: vendorId,
          response: 'accepted',
          feedback: ''
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ Response text:', responseText);
        throw new Error(`Server returned ${response.status}: ${responseText.substring(0, 100)}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to approve purchase order');
      }

      console.log('✅ PO approved successfully:', result.data);
      setApprovalMessage(`PO ${order.id} has been approved and sent to PM for review`);
      
      // Refresh the PO list after successful approval
      setTimeout(() => {
        fetchPurchaseOrders();
        setApprovalMessage(null);
      }, 2000);
    } catch (err) {
      console.error('❌ Error approving PO:', err);
      setApprovalError(`Failed to approve PO: ${err.message}`);
    } finally {
      setApprovingPoId(null);
    }
  };

  // Clear messages after 4 seconds
  useEffect(() => {
    if (approvalError || approvalMessage) {
      const timer = setTimeout(() => {
        setApprovalError(null);
        setApprovalMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [approvalError, approvalMessage]);

  // Calculate stats
  const totalOrders = purchaseOrdersData.length;
  const acceptedOrders = purchaseOrdersData.filter(order => order.statusType === 'accepted').length;
  const pendingOrders = purchaseOrdersData.filter(order => order.statusType === 'pending').length;
  const totalValue = purchaseOrdersData.reduce((sum, order) => {
    return sum + parseFloat(order.amount.replace('₹', '').replace(',', ''));
  }, 0);

  return (
    <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover">
      {/* Approval Success/Error Messages */}
      {approvalMessage && (
        <div className="fixed top-4 right-4 z-40 bg-success/10 border border-success/20 rounded-lg p-4 flex items-center space-x-3 shadow-lg animate-slide-in">
          <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-success">{approvalMessage}</p>
          </div>
        </div>
      )}
      
      {approvalError && (
        <div className="fixed top-4 right-4 z-40 bg-danger/10 border border-danger/20 rounded-lg p-4 flex items-center space-x-3 shadow-lg animate-slide-in">
          <div className="w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-danger" />
          </div>
          <div>
            <p className="text-sm font-medium text-danger">{approvalError}</p>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreviewModal && previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-surface rounded-lg shadow-2xl w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h2 className="text-xl font-bold text-ink">Purchase Order Preview</h2>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewPdfUrl(null);
                }}
                className="text-dim hover:text-ink transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                src={previewPdfUrl}
                className="w-full h-full"
                title="Purchase Order Preview"
              />
            </div>
            <div className="flex items-center justify-between p-6 border-t border-line bg-canvas">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewPdfUrl(null);
                }}
                className="px-6 py-2.5 text-sm font-medium text-ink bg-surface border border-line rounded-lg hover:bg-canvas transition-colors"
              >
                Close
              </button>
              {previewPdfUrl && (
                <a
                  href={previewPdfUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-info rounded-lg hover:bg-info transition-colors"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Header with Stats */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-surface"></div>
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold ">
                Purchase Orders Dashboard
              </h1>
              <p className="text-dim mt-2">Manage and track all your purchase orders</p>
            </div>
            <button className="bg-surface text-white px-6 py-3 rounded-xl hover:from-surface hover:to-surface transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform ">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Purchase Order</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-ink">{totalOrders}</p>
                  <p className="text-xs text-success mt-1">↗ +8% this month</p>
                </div>
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-info" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Accepted</p>
                  <p className="text-2xl font-bold text-ink">{acceptedOrders}</p>
                  <p className="text-xs text-success mt-1">↗ +5% this month</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Pending Review</p>
                  <p className="text-2xl font-bold text-ink">{pendingOrders}</p>
                  <p className="text-xs text-warning mt-1">↗ +3% this month</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
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
                <div className="w-12 h-12 bg-surface-hover rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-ink" />
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
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-line rounded-lg focus:ring-2 focus:ring-line focus:border-transparent text-sm"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-surface border border-line rounded-lg focus:ring-2 focus:ring-line focus:border-transparent text-sm"
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
        <div className="px-8 pb-8">
          <div className="bg-surface border border-line rounded-xl  p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-black"></div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">
                  🎯 Raise Purchase Order from {isOrdersOrigin ? 'Final Quotation' : 'Quote'}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="inline-block px-3 py-1 bg-surface-hover text-ink rounded-full text-sm font-semibold">
                    {isOrdersOrigin ? 'Final Quotation' : 'Quote'} {highlightedQuote.customQuoteId ||
                      highlightedQuote.displayQuoteId ||
                      highlightedQuote.id}
                  </span>
                  <p className="text-sm text-dim">
                    Review the quote details below, then click{' '}
                    <span className="font-semibold">Send PO to {dispatchLabel}</span>.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setHighlightedQuote(null);
                    if (onSourceConsumed) {
                      onSourceConsumed();
                    }
                  }}
                  className="px-4 py-2.5 text-xs font-medium text-ink bg-surface-hover rounded-lg hover:bg-surface-hover transition-colors duration-200"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleSendPO}
                  disabled={sendingPo}
                  className="px-4 py-2.5 text-xs font-medium bg-cta text-cta-foreground rounded-lg hover:bg-cta disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {sendingPo ? 'Sending...' : `✓ Send PO to ${dispatchLabel}`}
                </button>
              </div>
            </div>
            <div className="bg-canvas rounded-lg p-4 max-h-[480px] overflow-auto border border-line" ref={previewRef}>
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
                  logo: operonLogo,
                  name: currentUser?.vendorName || currentUser?.name || 'Vendor',
                  address: currentUser?.vendorAddress || '',
                  gstin: currentUser?.gstin || '',
                  email: currentUser?.email || '',
                  country: 'India'
                }}
                terms={highlightedQuote.termsAndConditions}
                notes={highlightedQuote.customerNotes}
              />
            </div>
          </div>
        </div>
      )}

      {/* Purchase Orders List View */}
      <div className="px-8 pb-8">
        {loading ? (
          <div className="bg-surface rounded-lg p-12 text-center">
            <div className="w-20 h-20 bg-surface-hover rounded-lg flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-dim" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Loading purchase orders...</h3>
            <p className="text-dim">Please wait while we fetch the data.</p>
          </div>
        ) : error ? (
          <div className="bg-surface rounded-lg p-12 text-center">
            <div className="w-20 h-20 bg-surface-hover rounded-lg flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-danger" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Error: {error}</h3>
            <p className="text-dim mb-6">Failed to load purchase orders. Please try again later.</p>
            <button className="bg-cta text-cta-foreground px-6 py-3 rounded-lg hover:bg-cta transition-colors duration-200">
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-surface rounded-lg p-12 text-center">
            <div className="w-20 h-20 bg-surface-hover rounded-lg flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-dim" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">No purchase orders found</h3>
            <p className="text-dim mb-6">
              {highlightedQuote
                ? `Once you send the PO to ${dispatchLabel}, it will appear here.`
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {!highlightedQuote && (
              <button className="bg-cta text-cta-foreground px-6 py-3 rounded-lg hover:bg-cta transition-colors duration-200">
                Create New Purchase Order
              </button>
            )}
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-xl  overflow-hidden">
            <table className="w-full">
              <thead className="bg-canvas border-b border-line">
                <tr>
                  <th className="text-left py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                    Purchase Order
                  </th>
                  <th className="text-left py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="text-left py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                    Project
                  </th>
                  <th className="text-right py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-center py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                    Items
                  </th>
                  <th className="text-center py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredOrders.map((order) => {
                  const statusConfig = getStatusConfig(order.statusType);
                  return (
                    <tr key={order.id} className="hover:bg-canvas transition-colors duration-200">
                      <td className="py-5 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-info" />
                          </div>
                          <div>
                            <div className="font-semibold text-ink">{order.id}</div>
                            {order.purchaseReturns && order.purchaseReturns !== 'None' && (
                              <div className="text-xs text-info bg-info/10 px-2 py-0.5 rounded mt-1 inline-block">
                                Returns: {order.purchaseReturns}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="text-sm font-medium text-ink">
                          {order.vendor}
                        </div>
                        {order.email && (
                          <div className="text-xs text-dim">{order.email}</div>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <div className="text-sm text-dim">{order.project || 'N/A'}</div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="text-lg font-bold text-ink">
                          {order.amount}
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <div className="flex items-center justify-center space-x-1 text-sm">
                          <Package className="w-4 h-4 text-dim" />
                          <span className="text-ink font-medium">{order.items}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          <div className={`w-2 h-2 ${statusConfig.dot} rounded-full mr-2`}></div>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => handlePreviewClick(order)}
                            className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-lg transition-all duration-200" 
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.status && (order.status.toLowerCase().includes('pending_review') || order.status.toLowerCase().includes('pending review') || order.status.toLowerCase().includes('requested po') || order.status.toLowerCase().includes('sent_to_vendor_for_confirmation')) && (
                            <button
                              className="text-xs px-3 py-1.5 bg-surface-hover text-ink rounded-lg hover:bg-surface-hover transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleApproveAndSendPO(order)}
                              disabled={approvingPoId === order.id}
                              title="Approve and send to PM"
                            >
                              {approvingPoId === order.id ? 'Approving...' : '✓ Approve'}
                            </button>
                          )}
                          {order.status && (order.status.toLowerCase().includes('requested for invoice') || order.status.toLowerCase().includes('vendor_approved')) && onConvertToInvoice && (
                            <button
                              className="text-xs px-3 py-1.5 bg-surface-hover text-ink rounded-lg hover:bg-surface-hover transition-colors duration-200"
                              onClick={() => onConvertToInvoice(order)}
                              title="Convert to Invoice"
                            >
                              Convert
                            </button>
                          )}
                          {order.statusType === 'pending' && (
                            <>
                              {/* <button className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors duration-200" title="Accept">
                                <Check className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors duration-200" title="Reject">
                                <X className="w-4 h-4" />
                              </button> */}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersPage;
