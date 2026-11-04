import React, { useContext, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import NodeHandles from './nodes/NodeHandles';
import { Pencil, Send, Landmark, Check, X, Eye, AlertCircle, FileText, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import StandardPreview from './invoice/shared/StandardPreview.jsx';
import operonLogo from '../../../assets/operon-symbol-black.png';
import { VendorContext } from '../../../context/VendorContext.jsx';
import { persistNodeDataPatch } from '../utils/nodePersistence';
import { resolveWorkspaceActor } from '../utils/workspaceActor';
import invoiceFetch from './invoice/utils/invoiceFetch';

// Same company block the invoice-tool preview panels use
export const DEFAULT_COMPANY = {
  logo: operonLogo,
  name: 'Caasdi Ventures LLP',
  address: '262, 80 FEET ROAD, SRINIVASANAGAR, Banashankari Stage 1, Bengaluru, Karnataka, 560050',
  gstin: '29AATFC6608I2ZB',
  email: 'corporate@caasdiglobal.in',
  country: 'India'
};

// Element type/nodeType -> StandardPreview docType
export const getDocType = (el) => {
  const t = el?.nodeType || el?.type;
  if (t === 'quotation' || t === 'quote') return 'quote';
  if (t === 'invoice') return 'invoice';
  if (t === 'creditNote' || t === 'credit-note') return 'creditnote';
  if (t === 'purchaseOrder' || t === 'purchase-order') return 'po';
  return null;
};

// Normalize backend-transformed doc data into the shape StandardPreview expects.
// For the client view, item rates are swapped to commission-inclusive
// (clientRate/clientAmount) so the released document shows client pricing —
// the vendor's own view keeps the original rates and never renders commission
// fields.
const normalizeDoc = (el, docType, viewerRole) => {
  let doc = el;
  if (docType === 'po') {
    const items = Array.isArray(el.itemsList) ? el.itemsList : Array.isArray(el.items) ? el.items : [];
    const subTotal = items.reduce((sum, i) => sum + (Number(i.amount) || Number(i.total) || 0), 0);
    doc = { ...el, items, subTotal: el.subTotal ?? subTotal, purchaseOrderDate: el.purchaseOrderDate || el.date };
    // PM→vendor POs store their own parties (billTo = vendor block,
    // shipToAddress = Caasdi) — customerDetails stays the client for chain
    // context, so override the preview's Bill To/Ship To.
    if (el.billTo || el.shipToAddress) {
      const billLines = String(el.billTo || '').split('\n').filter(Boolean);
      doc = {
        ...doc,
        customerName: billLines[0] || el.customerName,
        customerDetails: {
          ...(el.customerDetails || {}),
          name: billLines[0] || el.customerDetails?.name,
          address: {
            ...(el.customerDetails?.address || {}),
            billing: billLines.slice(1).join('\n') || el.billTo,
            shipping: el.shipToAddress || el.customerDetails?.address?.shipping
          }
        }
      };
    }
  }
  // Non-vendor viewers (finance / PM / client) see commission-inclusive
  // pricing; vendor + CAS keep the vendor's original rates.
  if (['finance', 'pm', 'client'].includes(viewerRole) && Array.isArray(doc.items)) {
    const items = doc.items.map((i) => {
      if (i.clientRate == null && i.clientAmount == null) return i;
      const clientAmount = Number(i.clientAmount ?? i.amount) || 0;
      const baseAmount = Number(i.amount) || 0;
      const ratio = baseAmount > 0 ? clientAmount / baseAmount : 1;
      return {
        ...i,
        rate: i.clientRate ?? i.rate,
        amount: clientAmount,
        cgstAmount: i.cgstAmount != null ? Number(i.cgstAmount) * ratio : i.cgstAmount,
        sgstAmount: i.sgstAmount != null ? Number(i.sgstAmount) * ratio : i.sgstAmount,
        igstAmount: i.igstAmount != null ? Number(i.igstAmount) * ratio : i.igstAmount,
      };
    });
    const scaledSubTotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const scaledCgst = items.reduce((s, i) => s + (Number(i.cgstAmount) || 0), 0);
    const scaledSgst = items.reduce((s, i) => s + (Number(i.sgstAmount) || 0), 0);
    const scaledIgst = items.reduce((s, i) => s + (Number(i.igstAmount) || 0), 0);
    const discount = Number(doc.discount?.value) ? (scaledSubTotal * Number(doc.discount.value)) / 100 : 0;
    const tds = Number(doc.tdsValue) ? (scaledSubTotal * Number(doc.tdsValue)) / 100 : 0;
    const scaledGrand = +(scaledSubTotal + scaledCgst + scaledSgst + scaledIgst - discount - tds).toFixed(2);
    doc = {
      ...doc,
      items,
      subTotal: scaledSubTotal,
      cgst: +scaledCgst.toFixed(2),
      sgst: +scaledSgst.toFixed(2),
      igst: +scaledIgst.toFixed(2),
      // StandardPreview's summary rows read totalCgst/totalSgst/totalIgst.
      totalCgst: +scaledCgst.toFixed(2),
      totalSgst: +scaledSgst.toFixed(2),
      totalIgst: +scaledIgst.toFixed(2),
      total: scaledGrand,
      totalAmount: scaledGrand,
      grandTotal: scaledGrand,
    };
  }
  // Payment details are staff/client-only — the vendor's preview never shows
  // finance's client-facing payment terms or the recorded payment state.
  if (viewerRole === 'vendor') {
    doc = { ...doc, paymentTerms: null };
  }
  return doc;
};

// Doc id per type (system ids, not display ids)
const getDocId = (data, docType) => {
  if (docType === 'quote') return data.quotationId || data.id;
  if (docType === 'invoice') return data.invoiceId || data.id;
  if (docType === 'creditnote') return data.creditNoteId || data.id;
  if (docType === 'po') return data.purchaseOrderId || data.id;
  return data.id;
};

// Invoice-tool sidebar tab per doc type
const getInvoiceToolTab = (docType) => ({
  quote: 'quotes',
  invoice: 'invoices',
  creditnote: 'credit-notes',
  po: 'purchase-orders'
}[docType]);

// Renders the real document (via StandardPreview) scaled down as a
// non-interactive thumbnail for elements-panel cards.
export function DocumentThumbnail({ element, className = '' }) {
  const docType = getDocType(element);
  if (!docType) return null;
  return (
    <div className={`relative h-28 overflow-hidden rounded-md border border-line bg-surface pointer-events-none select-none ${className}`}>
      <div style={{ width: 896, transform: 'scale(0.235)', transformOrigin: 'top left' }}>
        <StandardPreview
          quote={normalizeDoc(element, docType, 'vendor')}
          company={DEFAULT_COMPANY}
          docType={docType}
          terms={element.termsAndConditions}
          notes={element.customerNotes}
        />
      </div>
    </div>
  );
}

// Viewer role, resolved the same way CanvasWorkspace.getCurrentUserRole does —
// shared workspace links carry ?userRole=… (finance also via FIN- user ids).
const getViewerRole = (currentUser) => {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('userRole');
    const urlUserId = params.get('userId') || params.get('pmId') || params.get('clientId') || '';
    if (urlRole === 'finance' || urlUserId.startsWith('FIN-')) return 'finance';
    if (urlRole && ['vendor', 'pm', 'cas', 'client'].includes(urlRole)) return urlRole;
    // Bare pmId/clientId links without a userRole tag still mean that role
    if (!urlRole && params.get('pmId')) return 'pm';
    if (!urlRole && params.get('clientId')) return 'client';
  } catch (_) { /* non-browser env */ }
  return currentUser?.role || 'vendor';
};

// The actor id carried in the workspace URL (FIN-…/PM-… for external viewers)
const getActorId = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('userId') || p.get('pmId') || p.get('clientId') || '';
  } catch (_) {
    return '';
  }
};

// Who can see a stage (matches CanvasWorkspace DOC_ROLE_RANK / DOC_STAGE_RANK)
const STAGE_LABEL = { vendor: 'Vendor only', finance: 'Finance', pm: 'PM', client: 'Client' };

// Finance payment-terms presets — the chosen option is stored on the doc
// record ({ option, label, advancePercent }) and drives the client's
// Razorpay due-now amount (advancePercent % of the client total).
export const PAYMENT_TERM_OPTIONS = [
  { id: 'advance_100', label: '100% advance on order confirmation', advancePercent: 100 },
  { id: 'advance_75', label: '75% advance, balance on delivery', advancePercent: 75 },
  { id: 'advance_50', label: '50% advance on order, balance on delivery', advancePercent: 50 },
  { id: 'advance_50_30', label: '50% advance, balance within 30 days of delivery', advancePercent: 50 },
  { id: 'advance_30', label: '30% advance, balance on delivery', advancePercent: 30 },
  { id: 'net_15', label: 'Full payment within 15 days of invoice', advancePercent: 0 },
  { id: 'net_30', label: 'Full payment within 30 days of invoice', advancePercent: 0 },
  { id: 'custom', label: 'Custom terms', advancePercent: null },
];

// Razorpay checkout.js loader — injected on demand so it isn't fetched for
// viewers who never open the payment modal.
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// Shared node renderer: header + actions + real document. Replaces the generic
// editable card for quotation/invoice/credit-note/purchase-order nodes.
export function DocumentNode({ id, data, selected, docType, title, icon: Icon, isConnectable }) {
  const { currentUser } = useContext(VendorContext) || {};
  const [localStatus, setLocalStatus] = useState((data.status || 'draft').toString());
  const [stage, setStage] = useState(data.workflowStage || 'vendor');
  const [busy, setBusy] = useState('');

  // ---- PM inline doc edit (issuer, bill/ship-to, items, T&C) ----
  const [showPmEditModal, setShowPmEditModal] = useState(false);
  const [pmEditForm, setPmEditForm] = useState(null);
  const [pmEditItems, setPmEditItems] = useState([]);

  // ---- Client decision reason + PM review → vendor revision ----
  const [decisionModal, setDecisionModal] = useState(null); // 'reject' | 'change'
  const [decisionReason, setDecisionReason] = useState('');
  const [showReasonReview, setShowReasonReview] = useState(false);

  // ---- Finance payment terms for the client — preset option + custom text ----
  const initialPaymentTerms = data.paymentTerms;
  const [paymentTermsOptionId, setPaymentTermsOptionId] = useState(
    typeof initialPaymentTerms === 'object' && initialPaymentTerms?.option
      ? initialPaymentTerms.option
      : initialPaymentTerms ? 'custom' : 'advance_50'
  );
  const [paymentTerms, setPaymentTerms] = useState(
    typeof initialPaymentTerms === 'string'
      ? initialPaymentTerms
      : initialPaymentTerms?.label || ''
  );
  // Client-side PO auto-check result (discrepancies → re-upload)
  const [poCheckResult, setPoCheckResult] = useState(null);
  // Quote → PO → invoice chain for this document — fetched once so every
  // role sees the connected documents as one group.
  const [docChain, setDocChain] = useState(null);

  // ---- Document download: this doc only vs the whole quote→PO→invoice
  // chain. pdfUrl fast-path; otherwise html2pdf renders StandardPreview
  // offscreen. Queue processes one doc at a time. ----
  const [showDownloadPicker, setShowDownloadPicker] = useState(false);
  const [pdfQueue, setPdfQueue] = useState([]); // { record, docType, fileName }
  const pdfGenRef = useRef(null);

  const role = getViewerRole(currentUser);

  // ---- Finance commission editor (item-wise % -> clientRate/clientAmount) ----
  const items = Array.isArray(data.items) ? data.items : [];
  const [showCommissionEditor, setShowCommissionEditor] = useState(false);
  const [commissionMap, setCommissionMap] = useState(() =>
    items.reduce((m, item, i) => ({ ...m, [i]: item.commissionPercent ?? '' }), {})
  );
  const commissionTotal = Number(data.commission?.total) || 0;
  // True once finance has applied commission — gates PM's release to client.
  // Invoices must ALWAYS route PM → finance → client: conversion keeps the
  // quote's commissionPercent (and older conversions may still carry stale
  // clientRate/clientAmount), so for invoices only a commission saved on the
  // invoice itself (data.commission) counts as finance-confirmed.
  const hasCommission = docType === 'invoice'
    ? Boolean(data.commission)
    : Boolean(data.commission) ||
      items.some((i) => i.clientRate != null || i.clientAmount != null);

  const saveCommission = async (thenSendToPm = false) => {
    const nextItems = items.map((item, i) => {
      const pct = Number(commissionMap[i] ?? item.commissionPercent ?? 0) || 0;
      const rate = Number(item.rate) || 0;
      const qty = Number(item.quantity) || 0;
      const amount = Number(item.amount) || rate * qty;
      const clientRate = +(rate * (1 + pct / 100)).toFixed(2);
      const clientAmount = +(amount * (1 + pct / 100)).toFixed(2);
      return { ...item, commissionPercent: pct, clientRate, clientAmount };
    });
    const total = +nextItems
      .reduce((s, i) => s + (i.clientAmount - (Number(i.amount) || 0)), 0)
      .toFixed(2);
    const selectedTerm = PAYMENT_TERM_OPTIONS.find((o) => o.id === paymentTermsOptionId);
    const paymentTermsValue =
      paymentTermsOptionId === 'custom'
        ? (paymentTerms.trim() ? { option: 'custom', label: paymentTerms.trim(), advancePercent: null } : null)
        : selectedTerm
          ? { option: selectedTerm.id, label: selectedTerm.label, advancePercent: selectedTerm.advancePercent }
          : null;
    const patch = {
      items: nextItems,
      commission: { total, byRole: 'finance', at: new Date().toISOString() },
      paymentTerms: paymentTermsValue
    };
    data.onUpdate?.(patch); // optimistic local update (INTERACTIVE_NODE_TYPES injects this)
    setBusy('commission');
    try {
      // 1) Canvas node — what finance/PM/client see in this workspace view
      await persistNodeDataPatch(id, patch, undefined, data.workspaceId);

      const base = `/api/workspace/${docType === 'quote' ? 'quotations' : 'invoices'}`;

      // 2) The document record itself — survives re-drops, powers PDF exports
      //    and EM-side queries. Finance/PM-only endpoints; vendors can't write.
      if (docId && data.vendorId && (docType === 'quote' || docType === 'invoice')) {
        const res = await invoiceFetch(`${base}/${docId}/commission`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-actor-id': getActorId()  // FIN-… id from the workspace URL for finance viewers
          },
          body: JSON.stringify({
            vendorId: data.vendorId,
            items: nextItems,
            commission: patch.commission,
            paymentTerms: patch.paymentTerms
          })
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result.success === false) {
          throw new Error(result.message || `Commission save failed (HTTP ${res.status})`);
        }
      }

      setShowCommissionEditor(false);
      if (thenSendToPm) {
        // Also stamp the row status 'approved' so EM's PM dashboard shows
        // "Approved (Commission Added)" instead of staying at sent-to-finance.
        try {
          await invoiceFetch(`${base}/${docId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId: data.vendorId, status: 'approved' })
          });
        } catch (e) {
          console.warn('Status write for send-back-to-PM failed (stage still advances):', e.message);
        }
        await advanceStage('pm');
        alert('Commission saved — sent to PM workspace');
      }
    } catch (err) {
      console.error('Failed to save commission:', err);
      alert('Failed to save commission: ' + err.message);
    } finally {
      setBusy('');
    }
  };

  const statusLower = localStatus.toLowerCase();
  // PO options only unlock after a client payment is recorded — full or
  // the advance defined by finance's payment terms.
  const paymentDone =
    data.paymentStatus === 'paid'
    || data.paymentStatus === 'partially_paid'
    || Number(data.amountPaid) > 0;
  const statusClass =
    statusLower === 'draft' ? 'bg-surface-hover text-dim' :
    statusLower.includes('pending') || statusLower.includes('review')
      || statusLower.includes('change_requested') || statusLower.includes('returned to vendor') ? 'bg-warning/10 text-warning' :
    statusLower.includes('approved') || statusLower.includes('paid') ? 'bg-success/10 text-success' :
    'bg-surface-hover text-ink';

  // Vendor-side send endpoints exist only for quotations and invoices
  const canSend = docType === 'quote' || docType === 'invoice';
  const canSendPO = docType === 'po' && Boolean(data.purchaseOrderId || data.id);
  const docId = getDocId(data, docType);

  // Fetch the quote → PO → invoice chain once — resolves the linked
  // documents for any member id (quotation/purchaseOrder/invoice) so every
  // role sees the connected group on the node.
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    invoiceFetch(`/api/workspace/document-chain/${docId}`)
      .then((res) => res.json().catch(() => ({})))
      .then((result) => {
        if (!cancelled && result?.success && result.data) setDocChain(result.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // re-resolve when a conversion lands on this node (invoiceId patched)
  }, [docId, data.invoiceId]);

  // ---- Download processing — one item per render: pdfUrl downloads
  // directly; otherwise the record renders in the hidden portal below and
  // html2pdf captures it, then the queue advances.
  useEffect(() => {
    if (!pdfQueue.length) return;
    const item = pdfQueue[0];
    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.fileName;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setPdfQueue((q) => q.slice(1));
      return;
    }
    const t = setTimeout(async () => {
      const el = pdfGenRef.current;
      try {
        if (el) {
          await html2pdf()
            .set({
              margin: 6,
              filename: item.fileName,
              image: { type: 'jpeg', quality: 0.95 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            })
            .from(el)
            .save();
        }
      } catch (err) {
        console.error('PDF generation failed:', err);
      }
      setPdfQueue((q) => q.slice(1));
    }, 350);
    return () => clearTimeout(t);
  }, [pdfQueue]);

  const DOC_TYPE_LABEL = { quote: 'Quotation', po: 'PO', invoice: 'Invoice', creditnote: 'CreditNote' };

  const queueDownload = (chainMode) => {
    setShowDownloadPicker(false);
    const toItem = (record, type) => {
      if (!record) return null;
      const num = record.customQuoteId || record.quoteNumber || record.customPoId || record.purchaseOrderNumber
        || record.customInvoiceId || record.invoiceNumber || record.quotationId || record.purchaseOrderId
        || record.invoiceId || 'document';
      const url = record.pdfUrl || record.documentUrl || record.commissionedQuotationUrl
        || record.commissionedInvoicePdfUrl || record.poPdfUrl || record.pmPOFile?.pdfUrl
        || record.quotationPDF?.url || record.invoicePDF?.url || null;
      return {
        record: type === docType ? { ...data, ...record } : record,
        docType: type,
        url,
        fileName: `${DOC_TYPE_LABEL[type] || 'Document'}-${num}.pdf`,
      };
    };
    let items;
    if (chainMode === 'chain' && docChain?.records) {
      items = [
        docChain.records.quotation && toItem(docChain.records.quotation, 'quote'),
        docChain.records.purchaseOrder && toItem(docChain.records.purchaseOrder, 'po'),
        docChain.records.invoice && toItem(docChain.records.invoice, 'invoice'),
      ].filter(Boolean);
    } else {
      items = [toItem({ ...data }, docType)];
    }
    if (!items.length) { alert('No linked documents found to download'); return; }
    setPdfQueue(items);
  };
  const poFileInputRef = useRef(null);

  // Client uploads their PO file after approving the quotation (EM client flow)
  const handleUploadClientPO = async (file) => {
    if (!file || !docId) return;
    setBusy('poUpload');
    try {
      const fd = new FormData();
      fd.append('po_file', file);
      if (data.vendorId) fd.append('vendorId', data.vendorId);
      const res = await invoiceFetch(`/api/workspace/quotations/${docId}/upload-client-po`, {
        method: 'POST',
        body: fd // no Content-Type — fetch sets the multipart boundary
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || `Upload failed (HTTP ${res.status})`);
      }
      setLocalStatus('PO uploaded');
      data.onUpdate?.({ clientPOFile: result.data?.clientPOFile, poType: 'client', status: 'po_uploaded' });
      await persistNodeDataPatch(
        id,
        { clientPOFile: result.data?.clientPOFile, poType: 'client', status: 'po_uploaded' },
        undefined,
        data.workspaceId
      );

      // Auto-check runs HERE on the client side — discrepancies mean the
      // client re-uploads a corrected PO; PM never re-checks at raise time.
      try {
        const checkRes = await invoiceFetch(`/api/workspace/quotations/${docId}/auto-check-po`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        const check = await checkRes.json().catch(() => ({}));
        const checkData = check?.data;
        if (checkRes.ok && checkData) {
          data.onUpdate?.({ poAutoCheck: checkData });
          await persistNodeDataPatch(id, { poAutoCheck: checkData }, undefined, data.workspaceId);
          if (!checkData.passed) {
            setPoCheckResult(checkData); // discrepancy modal → re-upload
            return;
          }
        }
        alert('PO uploaded and verified — the PM can now raise the purchase order');
      } catch (checkErr) {
        console.warn('PO auto-check could not run:', checkErr);
        alert('PO uploaded — the PM can now raise the purchase order');
      }
    } catch (err) {
      console.error('Client PO upload failed:', err);
      alert(err.message);
    } finally {
      setBusy('');
      if (poFileInputRef.current) poFileInputRef.current.value = '';
    }
  };

  // Client chose "use our PO" — the PM generates the system PO (EM client flow)
  const handleUseSystemPO = async () => {
    if (!docId) return;
    setBusy('systemPo');
    try {
      const res = await invoiceFetch(`/api/workspace/quotations/${docId}/use-system-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: data.vendorId })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || `Failed (HTTP ${res.status})`);
      }
      setLocalStatus('Approved + system PO');
      data.onUpdate?.({ poType: 'system' });
      await persistNodeDataPatch(id, { poType: 'system' }, undefined, data.workspaceId);
      alert('System PO selected — the PM can now raise the purchase order');
    } catch (err) {
      console.error('Use system PO failed:', err);
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  // Client pays the amount due per finance's payment terms via Razorpay.
  // Flow: POST /payment-order → checkout.js → POST /payment-verify (HMAC on
  // the backend) → payment recorded on the quotation + PM notified.
  const handlePayNow = async () => {
    if (!docId || (docType !== 'quote' && docType !== 'invoice')) return;
    const collBase = docType === 'invoice' ? 'invoices' : 'quotations';
    setBusy('pay');
    try {
      const res = await invoiceFetch(`/api/workspace/${collBase}/${docId}/payment-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: data.vendorId })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || `Payment order failed (HTTP ${res.status})`);
      }
      const pay = result.data;

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load Razorpay checkout — check your network');

      const rzp = new window.Razorpay({
        key: pay.keyId,
        amount: pay.amount,
        currency: pay.currency,
        order_id: pay.orderId,
        name: data.issuerDetails?.name || 'Caasdi Global',
        description: `${pay.advancePercent > 0 ? `${pay.advancePercent}% advance — ` : ''}${data.customQuoteId || docId}`,
        prefill: { name: currentUser?.name || '', email: currentUser?.email || '' },
        theme: { color: '#0f172a' },
        handler: async (response) => {
          setBusy('payVerify');
          try {
            const vRes = await invoiceFetch(`/api/workspace/${collBase}/${docId}/payment-verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vendorId: data.vendorId, ...response })
            });
            const v = await vRes.json().catch(() => ({}));
            if (!vRes.ok || v.success === false) {
              throw new Error(v.message || `Verification failed (HTTP ${vRes.status})`);
            }
            const paid = v.data;
            setLocalStatus(paid.paymentStatus === 'paid' ? 'paid' : 'partially paid');
            const paymentPatch = {
              paymentStatus: paid.paymentStatus,
              amountPaid: paid.amountPaid,
              balanceDue: paid.balanceDue,
              razorpayPayment: paid.razorpayPayment
            };
            data.onUpdate?.(paymentPatch);
            await persistNodeDataPatch(id, paymentPatch, undefined, data.workspaceId);
            alert(paid.paymentStatus === 'paid'
              ? 'Payment successful — paid in full'
              : `Payment received — ₹${(paid.razorpayPayment?.amount || 0).toLocaleString('en-IN')} paid, ₹${(paid.balanceDue || 0).toLocaleString('en-IN')} remaining`);
          } catch (err) {
            console.error('Payment verification failed:', err);
            alert('Payment verification failed: ' + err.message);
          } finally {
            setBusy('');
          }
        }
      });
      rzp.open();
    } catch (err) {
      console.error('Pay Now failed:', err);
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  // PM raises the purchase order — same flow as the EM PM dashboard's
  // "Generate & Send to Vendor": generate the commission-free PO PDF and
  // PO row, then (when a client PO file exists) run the auto-check, then
  // send the PO to the vendor — all in one click.
  const handleRaisePO = async ({ items: poItems, subtotal, cgst, sgst, igst, total, commissionRemoved, poNumber: poNo, poDate: poDt, billTo, shipTo } = {}) => {
    if (!docId) return;
    setShowPOModal(false);
    setBusy('po');
    try {
      // 1) Generate the PO document + workspace_purchase_orders row
      const res = await invoiceFetch(`/api/workspace/quotations/${docId}/pm-po-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: poItems || items,
          subtotal: subtotal ?? data.subTotal ?? data.subtotal,
          cgst: Number(cgst) || 0,
          sgst: Number(sgst) || 0,
          igst: Number(igst) || 0,
          gst: (Number(cgst) || 0) + (Number(sgst) || 0) + (Number(igst) || 0),
          total: total ?? data.total,
          customerName: data.customerName,
          billingAddress: billTo || data.billingAddress,
          shipTo,
          poNumber: poNo,
          poDate: poDt,
          quotationDate: data.quotationDate,
          commissionRemoved: commissionRemoved ?? commissionTotal
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || `Raise PO failed (HTTP ${res.status})`);
      }
      const purchaseOrderId = result.data?.purchaseOrderId;

      // Mark the node as PO-raised immediately — the Raise button collapses
      // to status-only without needing a reload.
      if (purchaseOrderId) {
        const raisedPatch = {
          purchaseOrderId,
          pmPOFile: result.data?.pmPOFile,
          status: 'po raised'
        };
        data.onUpdate?.(raisedPatch);
        persistNodeDataPatch(id, raisedPatch, undefined, data.workspaceId)
          .catch((e) => console.warn('PO node persist failed:', e.message));
      }

      // 2) The auto-check already ran client-side at upload. If the latest
      //    check failed and no finance-approved reason exists, the PO can't
      //    go out — the client must upload a corrected PO first.
      if (data.clientPOFile && data.poAutoCheck && !data.poAutoCheck.passed
          && data.poAutoCheck.reason?.status !== 'approved') {
        const list = (data.poAutoCheck.discrepancies || [])
          .map((d) => `• ${d.message || d}`)
          .join('\n') || '• Client PO differs from the quotation';
        alert(
          `PO created but NOT sent — the client's PO failed the auto-check:\n\n${list}\n\n` +
          'Ask the client to upload a corrected PO.'
        );
        return;
      }

      // 3) Send the PO to the vendor — same as PM dashboard
      if (purchaseOrderId && data.vendorId) {
        const sendRes = await invoiceFetch(`/api/workspace/purchase-orders/${purchaseOrderId}/send-to-vendor`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId: data.vendorId, commissionToRemove: commissionTotal })
        });
        const sendResult = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok || sendResult.success === false) {
          // Auto-check may have failed — surface the reason, PO still exists
          throw new Error(sendResult.message || `Send to vendor failed (HTTP ${sendRes.status})`);
        }
        setLocalStatus('PO sent to vendor');
        const sentPatch = { status: 'po sent to vendor', purchaseOrderId };
        data.onUpdate?.(sentPatch);
        persistNodeDataPatch(id, sentPatch, undefined, data.workspaceId)
          .catch((e) => console.warn('PO sent persist failed:', e.message));
        alert('Purchase order created and sent to vendor for confirmation.');
      } else {
        alert("Purchase order created — it's in Elements → Purchase Orders. Drag it onto the canvas and send it to the vendor.");
      }

      // Drop the PO node into the quotation's doc group automatically so the
      // chain is visible without the PM having to click the linked-docs chip.
      if (purchaseOrderId) {
        const sentToVendor = Boolean(data.vendorId);
        window.dispatchEvent(new CustomEvent('workspace:addDocNode', {
          detail: {
            element: {
              type: 'purchase-order',
              nodeType: 'purchaseOrder',
              name: `PO ${poNo || purchaseOrderId}`,
              purchaseOrderId,
              customPoId: purchaseOrderId,
              purchaseOrderNumber: poNo || purchaseOrderId,
              quotationId: docId,
              referenceQuoteId: docId,
              referenceQuoteNumber: data.customQuoteId || docId,
              vendorId: data.vendorId,
              clientId: data.clientId,
              customerName: data.customerName,
              customerDetails: data.customerDetails,
              items: poItems || items,
              subtotal: subtotal ?? data.subTotal ?? data.subtotal,
              cgst: Number(cgst) || 0,
              sgst: Number(sgst) || 0,
              igst: Number(igst) || 0,
              total: total ?? data.total,
              billTo: billTo || poBillTo,
              shipToAddress: shipTo || poShipTo,
              status: sentToVendor ? 'sent_to_vendor_for_confirmation' : 'pm_po_created',
              workflowStage: sentToVendor ? 'vendor' : 'pm'
            },
            sourceNodeId: id
          }
        }));
      }
    } catch (err) {
      console.error('Raise PO failed:', err);
      alert('Failed to raise PO: ' + err.message);
    } finally {
      setBusy('');
    }
  };

  // PM sends the PO node to the vendor; vendor accepts/rejects it
  const handlePOAction = async (action) => {
    const poId = data.purchaseOrderId || data.id;
    if (!poId) return alert('Missing PO id');
    setBusy(action);
    try {
      const isVendorHop = action === 'sendToVendor';
      const res = await invoiceFetch(
        isVendorHop
          ? `/api/workspace/purchase-orders/${poId}/send-to-vendor`
          : `/api/workspace/purchase-orders/${poId}/vendor-response`,
        {
          method: isVendorHop ? 'PUT' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isVendorHop
            ? { vendorId: data.vendorId }
            : { vendorId: data.vendorId, response: action === 'accept' ? 'accepted' : 'rejected' })
        }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || `Failed (HTTP ${res.status})`);
      }
      const nextStage = isVendorHop ? 'vendor' : 'pm';
      setLocalStatus(isVendorHop ? 'Sent to vendor'
        : action === 'accept' ? 'Vendor accepted' : 'Vendor rejected');
      await advanceStage(nextStage);
      alert(isVendorHop ? 'PO sent to vendor' : `PO ${action}ed`);
    } catch (err) {
      console.error(`PO ${action} failed:`, err);
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  // Vendor accepted the PO → convert the quotation chain into an invoice and
  // send it to the PM. Creates the invoice record server-side, back-links the
  // chain, then drops the invoice node next to this PO on the canvas.
  const handleConvertToInvoice = async () => {
    const quotationId = data.quotationId || data.referenceQuoteId || data.quoteId;
    if (!quotationId) return alert('Missing linked quotation');
    setBusy('convert');
    try {
      const res = await invoiceFetch(`/api/workspace/quotations/${quotationId}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: data.vendorId })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) {
        throw new Error(result.message || `Convert failed (HTTP ${res.status})`);
      }
      const invoice = result.data;
      const patch = {
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.customInvoiceId || invoice.invoiceNumber
      };
      data.onUpdate?.(patch);
      await persistNodeDataPatch(id, patch, undefined, data.workspaceId);

      // Place the converted invoice node right after this PO — the
      // canvas listener creates + auto-connects it, keeping the
      // quote → PO → invoice chain visually grouped.
      window.dispatchEvent(new CustomEvent('workspace:addDocNode', {
        detail: {
          element: {
            type: 'invoice',
            nodeType: 'invoice',
            name: `Invoice ${invoice.customInvoiceId || invoice.invoiceId}`,
            ...invoice,
            workflowStage: 'pm' // already sent to PM by the conversion
          },
          sourceNodeId: id
        }
      }));

      alert(`Invoice ${invoice.customInvoiceId || invoice.invoiceId} created and sent to PM`);
    } catch (err) {
      console.error('Convert to invoice failed:', err);
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  // Advance the node's workflow stage so it becomes visible to that role's
  // workspace view. Persisted through the durable HTTP path so it survives
  // reloads and is broadcast to collaborators over the canvas WebSocket.
  const advanceStage = async (nextStage, extraPatch = {}) => {
    setStage(nextStage);
    try {
      await persistNodeDataPatch(id, { workflowStage: nextStage, ...extraPatch }, undefined, data.workspaceId);
    } catch (err) {
      console.error('Failed to persist workflowStage:', err);
      alert('Could not save the document stage change. Please try again — the next role may not see this document until the save succeeds.');
    }
  };

  // Linked-docs chips: clicking drops the linked document onto the canvas
  // right beside this node (the canvas listener de-dupes by document id).
  const openLinkedDoc = async (memberKey) => {
    let record = docChain?.records?.[memberKey];
    if (!record) {
      // Older cached chain responses lack the full records — refetch once.
      try {
        const res = await invoiceFetch(`/api/workspace/document-chain/${docId}`);
        const result = await res.json().catch(() => ({}));
        if (result?.success && result.data) {
          setDocChain(result.data);
          record = result.data.records?.[memberKey];
        }
      } catch { /* fall through */ }
    }
    if (!record) return;
    const typeMap = {
      quotation: { type: 'quotation', nodeType: 'quotation', label: 'Quote' },
      purchaseOrder: { type: 'purchase-order', nodeType: 'purchaseOrder', label: 'PO' },
      invoice: { type: 'invoice', nodeType: 'invoice', label: 'Invoice' }
    };
    const meta = typeMap[memberKey];
    if (!meta) return;
    // A PO already sent to the vendor belongs at the 'vendor' stage so the
    // vendor sees it; otherwise it stays with the PM.
    const workflowStage = memberKey === 'purchaseOrder'
      ? (['sent_to_vendor_for_confirmation', 'vendor_accepted', 'vendor_rejected'].includes(record.status) ? 'vendor' : 'pm')
      : memberKey === 'invoice' ? 'pm' : undefined;
    window.dispatchEvent(new CustomEvent('workspace:addDocNode', {
      detail: {
        element: {
          ...record,
          type: meta.type,
          nodeType: meta.nodeType,
          name: `${meta.label} ${docChain?.[memberKey]?.number || ''}`,
          ...(workflowStage && { workflowStage })
        },
        sourceNodeId: id
      }
    }));
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'x-user-info': JSON.stringify({
      vendorId: data.vendorId || resolveWorkspaceActor(currentUser).ownerId,
      email: currentUser?.email,
      role: 'vendor',
      name: currentUser?.name
    })
  });

  // ---- PM "Create PO" modal (mirrors EM ClientPOManagement) ----
  const [showPOModal, setShowPOModal] = useState(false);
  const [poEditItems, setPoEditItems] = useState([]);
  const [poPreviewMode, setPoPreviewMode] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [poBillTo, setPoBillTo] = useState('');
  const [poShipTo, setPoShipTo] = useState('');

  // Default commission % implied by finance's item-wise commission
  const impliedCommissionPct = (() => {
    const withPct = items.find((i) => Number(i.commissionPercent) > 0);
    if (withPct) return Number(withPct.commissionPercent) || 0;
    const base = items.reduce((s, i) => s + (Number(i.amount) || (Number(i.rate) || 0) * (Number(i.quantity) || 0)), 0);
    return base > 0 ? +((commissionTotal / base) * 100).toFixed(2) : 0;
  })();

  const fmtAddrLines = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    return [addr.line1, addr.line2, addr.street, addr.address, addr.city, addr.state, addr.pincode || addr.zip, addr.country]
      .filter(Boolean).join('\n');
  };

  // Seed the modal with the vendor's ORIGINAL quotation rates — commission
  // only lives in clientRate/clientAmount, so item.rate/amount are already
  // commission-free and are exactly what goes to the vendor.
  const openPOModal = () => {
    const seeded = items.map((i) => {
      const qty = Number(i.quantity) || 1;
      const rate = Number(i.rate) || 0;
      const amount = +(rate * qty).toFixed(2);
      const cgstPct = Number(i.cgstRate ?? i.cgst ?? (Number(i.gstRate) / 2)) || 0;
      const sgstPct = Number(i.sgstRate ?? i.sgst ?? (Number(i.gstRate) / 2)) || 0;
      const igstPct = Number(i.igstRate ?? i.igst ?? 0) || 0;
      return {
        description: i.description || i.itemName || i.productName || i.name || '',
        hsn: i.hsn || i.hsnCode || '',
        quantity: qty,
        rate,
        amount,
        cgstRate: cgstPct,
        sgstRate: sgstPct,
        igstRate: igstPct,
        cgstAmount: +(amount * cgstPct / 100).toFixed(2),
        sgstAmount: +(amount * sgstPct / 100).toFixed(2),
        igstAmount: +(amount * igstPct / 100).toFixed(2),
      };
    });
    setPoEditItems(seeded);
    setPoNumber(`PO-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`);
    setPoDate(new Date().toISOString().split('T')[0]);
    // Bill To = the vendor who issued the quotation (issuerDetails carries
    // the vendor's company block, including any PM overrides). Ship To is
    // always Caasdi Ventures — the PM is ordering on the company's behalf.
    const issuer = data.issuerDetails || {};
    const issuerAddr = fmtAddrLines(issuer.address) || (typeof issuer.address === 'string' ? issuer.address : '');
    setPoBillTo(
      [issuer.name || data.vendorName || data.vendorId, issuerAddr,
       issuer.gstin ? `GSTIN: ${issuer.gstin}` : '', issuer.email]
        .filter(Boolean).join('\n')
      || DEFAULT_COMPANY.name
    );
    setPoShipTo(
      `${DEFAULT_COMPANY.name}\n${DEFAULT_COMPANY.address}\n${DEFAULT_COMPANY.country}\nGSTIN: ${DEFAULT_COMPANY.gstin}`
    );
    setPoPreviewMode(false);
    setShowPOModal(true);
  };

  const adjustPoItem = (idx, field, value) => {
    setPoEditItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, [field]: Number(value) || 0 };
      next.amount = +((Number(next.quantity) || 0) * (Number(next.rate) || 0)).toFixed(2);
      next.cgstAmount = +(next.amount * (Number(next.cgstRate) || 0) / 100).toFixed(2);
      next.sgstAmount = +(next.amount * (Number(next.sgstRate) || 0) / 100).toFixed(2);
      next.igstAmount = +(next.amount * (Number(next.igstRate) || 0) / 100).toFixed(2);
      return next;
    }));
  };

  const poTotals = poEditItems.reduce((acc, it) => ({
    subtotal: acc.subtotal + (Number(it.amount) || 0),
    cgst: acc.cgst + (Number(it.cgstAmount) || 0),
    sgst: acc.sgst + (Number(it.sgstAmount) || 0),
    igst: acc.igst + (Number(it.igstAmount) || 0),
  }), { subtotal: 0, cgst: 0, sgst: 0, igst: 0 });
  const poGrandTotal = poTotals.subtotal + poTotals.cgst + poTotals.sgst + poTotals.igst;
  // Vendor PO excludes finance commission entirely — items are seeded from the
  // original rates, so the whole finance commission is what's removed.
  const poCommissionRemoved = commissionTotal;

  const handleEdit = () => {
    document.dispatchEvent(new CustomEvent('openInvoiceTool', {
      detail: { tab: getInvoiceToolTab(docType), docId, docType }
    }));
  };

  const callApi = async (kind) => {
    if (!docId) return alert('Missing document id');
    const vendorId = data.vendorId || resolveWorkspaceActor(currentUser).ownerId;
    if (!vendorId) return alert('Missing owner context');

    const isQuote = docType === 'quote';
    const base = `/api/workspace/${isQuote ? 'quotations' : 'invoices'}`;

    // Workflow: vendor → PM review → finance commission → PM → client.
    // Canvas workflowStage is the source of truth; the table status write is
    // strict only for the vendor hop (they always hold a real token).
    const HOP = {
      pm:      { endpoint: `${base}/${docId}/send-to-pm`, body: { vendorId },                                       status: 'sent to pm for review',      stage: 'pm',      strict: true  },
      finance: { endpoint: `${base}/${docId}/status`,     body: { vendorId, status: 'sent to finance for review' }, status: 'sent to finance for review', stage: 'finance', strict: false },
      client:  { endpoint: `${base}/${docId}/status`,     body: { vendorId, status: 'sent to client for approval' },status: 'sent to client for approval',stage: 'client',  strict: false },
      // Client decision hops — EM vocabulary; stage stays 'client'
      approve: { endpoint: `${base}/${docId}/status`,     body: { vendorId, status: 'approved_by_client' },          status: 'approved by client',        stage: 'client',  strict: false },
      reject:  { endpoint: `${base}/${docId}/status`,     body: { vendorId, status: 'rejected_by_client' },          status: 'rejected by client',        stage: 'client',  strict: false },
    };
    const hop = HOP[kind];
    if (!hop) return;

    setBusy(kind);
    try {
      let apiErr = null;
      try {
        // invoiceFetch attaches the token AND x-actor-id/x-actor-role headers
        // (workspace URL params) so external PM/FIN viewers' status writes are
        // recognized server-side even with an ambient vendor session.
        const res = await invoiceFetch(hop.endpoint, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(hop.body)
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result.success === false) {
          apiErr = result.message || `Failed (HTTP ${res.status})`;
        }
      } catch (e) {
        apiErr = e.message;
      }

      if (apiErr && hop.strict) throw new Error(apiErr);
      if (apiErr) console.warn(`Status write failed for ${kind} (stage still advances):`, apiErr);

      setLocalStatus(hop.status);
      // Persist the new status on the node too — other viewers (PM Raise PO,
      // vendor dashboards) read data.status, not this component's local state.
      // A vendor resend after a client/PM revision request clears the flag.
      await advanceStage(hop.stage, {
        status: hop.status,
        ...(kind === 'pm' && data.revisionRequest
          ? { revisionRequest: null, revisionResolvedAt: new Date().toISOString() }
          : {})
      });
      alert(hop.status === 'sent to pm for review' ? 'Sent to PM for review'
        : kind === 'finance' ? 'Sent to finance for commission'
        : kind === 'approve' ? 'Approved — PM has been notified'
        : kind === 'reject' ? 'Rejected — PM has been notified'
        : 'Sent to client workspace');
    } catch (err) {
      console.error(`Send to ${kind} failed:`, err);
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  // ---- PM inline doc edit — issuer, bill/ship-to, items, terms ----
  const openPmEditModal = async () => {
    const issuer = data.issuerDetails || {};
    const cd = data.customerDetails || {};

    // Default Bill To / Ship To to the workspace's project client — quotes are
    // seeded with the Caasdi placeholder block, so prefer the real client when
    // the workspace can resolve one.
    let client = null;
    if (data.workspaceId) {
      try {
        const res = await invoiceFetch(`/api/workspaces/${data.workspaceId}/client-details`);
        if (res.ok) client = (await res.json())?.data || null;
      } catch (_) { /* non-blocking — fall back to stored customerDetails */ }
    }
    const clientBill = client?.billingAddress;
    const clientShip = client?.shippingAddress || clientBill;
    const clientName = client?.companyName || client?.name || '';
    const clientGstin = client?.gstin || '';

    setPmEditForm({
      issuerName: issuer.name || data.vendorName || '',
      issuerEmail: issuer.email || data.vendorEmail || '',
      issuerGstin: issuer.gstin || '',
      issuerAddress: issuer.address || '',
      issuerCountry: issuer.country || '',
      customerName: clientName || cd.name || cd.displayName || data.customerName || '',
      billToGstin: clientGstin || cd.gstin || data.gstin || '',
      billTo: fmtAddrLines(clientBill) || fmtAddrLines(cd.address?.billing) || data.billingAddress || '',
      shipToGstin: clientGstin || cd.shippingGstin || cd.gstin || '',
      shipTo: fmtAddrLines(clientShip) || fmtAddrLines(cd.address?.shipping) || data.shipTo || data.shippingAddress || '',
      termsAndConditions: data.termsAndConditions || '',
      customerNotes: data.customerNotes || '',
      // Invoice-only: show the client's advance collections as a deduction row
      // under Sub Total. Advance = money collected on the linked quotation;
      // invoice-level payments are tracked separately in data.amountPaid.
      advancePaidEnabled: docType === 'invoice' && (data.showAdvancePaid !== false || Number(data.advancePaid) > 0)
        ? (Number(data.advancePaid) || Number(docChain?.records?.quotation?.amountPaid) || 0) > 0
        : false,
      advancePaidAmount: Number(data.advancePaid) || Number(docChain?.records?.quotation?.amountPaid) || 0,
    });
    setPmEditItems(items.map((i) => {
      const qty = Number(i.quantity) || 1;
      const rate = Number(i.rate) || 0;
      const amount = +(rate * qty).toFixed(2);
      const cgstPct = Number(i.cgstRate ?? i.cgst ?? (Number(i.gstRate) / 2)) || 0;
      const sgstPct = Number(i.sgstRate ?? i.sgst ?? (Number(i.gstRate) / 2)) || 0;
      const igstPct = Number(i.igstRate ?? i.igst ?? 0) || 0;
      return {
        name: i.selectedItem?.name || i.itemName || i.productName || i.item || i.name || '',
        description: i.description || i.itemDescription || '',
        hsn: i.hsn || i.hsnCode || '',
        quantity: qty,
        rate,
        amount,
        cgstRate: cgstPct,
        sgstRate: sgstPct,
        igstRate: igstPct,
        cgstAmount: +(amount * cgstPct / 100).toFixed(2),
        sgstAmount: +(amount * sgstPct / 100).toFixed(2),
        igstAmount: +(amount * igstPct / 100).toFixed(2),
        commissionPercent: i.commissionPercent ?? null,
      };
    }));
    setShowPmEditModal(true);
  };

  const adjustPmItem = (idx, field, value) => {
    setPmEditItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const numeric = ['quantity', 'rate', 'cgstRate', 'sgstRate', 'igstRate'].includes(field);
      const next = { ...it, [field]: numeric ? (Number(value) || 0) : value };
      next.amount = +((Number(next.quantity) || 0) * (Number(next.rate) || 0)).toFixed(2);
      next.cgstAmount = +(next.amount * (Number(next.cgstRate) || 0) / 100).toFixed(2);
      next.sgstAmount = +(next.amount * (Number(next.sgstRate) || 0) / 100).toFixed(2);
      next.igstAmount = +(next.amount * (Number(next.igstRate) || 0) / 100).toFixed(2);
      return next;
    }));
  };

  const savePmEdit = async () => {
    const f = pmEditForm;
    if (!f) return;
    const editedItems = pmEditItems.map((it) => {
      const out = { ...it };
      // Keep finance's commission consistent after PM rate edits —
      // clientRate/clientAmount recompute from the stored percent.
      const pct = Number(it.commissionPercent);
      if (Number.isFinite(pct) && pct > 0) {
        out.clientRate = +(out.rate * (1 + pct / 100)).toFixed(2);
        out.clientAmount = +(out.amount * (1 + pct / 100)).toFixed(2);
      }
      return out;
    });
    const sum = (key) => +editedItems.reduce((s, i) => s + (Number(i[key]) || 0), 0).toFixed(2);
    const patch = {
      issuerDetails: {
        name: f.issuerName,
        email: f.issuerEmail,
        gstin: f.issuerGstin,
        address: f.issuerAddress,
        country: f.issuerCountry,
      },
      customerName: f.customerName,
      customerDetails: {
        ...(data.customerDetails || {}),
        name: f.customerName,
        gstin: f.billToGstin,
        shippingGstin: f.shipToGstin,
        address: {
          ...(data.customerDetails?.address || {}),
          billing: f.billTo,
          shipping: f.shipTo,
        },
      },
      items: editedItems,
      subTotal: sum('amount'),
      totalCgst: sum('cgstAmount'),
      totalSgst: sum('sgstAmount'),
      totalIgst: sum('igstAmount'),
      termsAndConditions: f.termsAndConditions,
      customerNotes: f.customerNotes,
      pmEditedAt: new Date().toISOString(),
    };
    if (docType === 'invoice') {
      patch.advancePaid = f.advancePaidEnabled ? (Number(f.advancePaidAmount) || 0) : 0;
      patch.showAdvancePaid = Boolean(f.advancePaidEnabled && Number(f.advancePaidAmount) > 0);
    }
    patch.total = +(patch.subTotal + patch.totalCgst + patch.totalSgst + patch.totalIgst).toFixed(2);

    data.onUpdate?.(patch);
    setBusy('pmedit');
    try {
      await persistNodeDataPatch(id, patch, undefined, data.workspaceId);
      // Mirror onto the document record — required so previews/PDFs and any
      // re-drop of the doc reflect the PM's edits.
      if (docId && data.vendorId && (docType === 'quote' || docType === 'invoice')) {
        const base = `/api/workspace/${docType === 'quote' ? 'quotations' : 'invoices'}`;
        const res = await invoiceFetch(`${base}/${docId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-actor-id': getActorId(), 'x-actor-role': role === 'finance' ? 'finance' : 'pm' },
          body: JSON.stringify({ vendorId: data.vendorId, workspaceId: data.workspaceId, ...patch })
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result.success === false) {
          console.warn('Document record update failed (canvas node saved):', result.message || res.status);
        }
      }
      setShowPmEditModal(false);
      alert('Document updated');
    } catch (err) {
      console.error('PM doc edit failed:', err);
      alert('Failed to save edits: ' + err.message);
    } finally {
      setBusy('');
    }
  };

  // ---- Client reject / request-change with a required reason ----
  const submitClientDecision = async (action) => {
    const reason = decisionReason.trim();
    if (!reason) return alert('Please add a reason.');
    if (!docId) return alert('Missing document id');
    const vendorId = data.vendorId || resolveWorkspaceActor(currentUser).ownerId;
    const base = `/api/workspace/${docType === 'quote' ? 'quotations' : 'invoices'}`;
    const status = action === 'reject' ? 'rejected_by_client' : 'change_requested_by_client';
    setBusy(action);
    try {
      try {
        const res = await invoiceFetch(`${base}/${docId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-actor-id': getActorId(), 'x-actor-role': 'client' },
          body: JSON.stringify({ vendorId, status, reason })
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result.success === false) {
          console.warn(`Status write failed for ${action} (node still records the decision):`, result.message || res.status);
        }
      } catch (e) {
        console.warn(`Status write failed for ${action}:`, e.message);
      }
      const clientDecision = {
        action: action === 'reject' ? 'rejected' : 'change_requested',
        reason,
        at: new Date().toISOString(),
        by: 'Client', // the client is never named on a decision everyone can see
      };
      setLocalStatus(status);
      data.onUpdate?.({ status, clientDecision });
      await persistNodeDataPatch(id, { status, clientDecision, workflowStage: 'client' }, undefined, data.workspaceId);
      setDecisionModal(null);
      setDecisionReason('');
      alert(action === 'reject'
        ? 'Rejected — the PM has been notified'
        : 'Change request sent — the PM will review it');
    } catch (err) {
      console.error(`Client ${action} failed:`, err);
      alert('Failed to save your decision: ' + err.message);
    } finally {
      setBusy('');
    }
  };

  // PM approves the client's reason and sends the doc back to the vendor
  const returnToVendor = async () => {
    if (!docId) return alert('Missing document id');
    const base = `/api/workspace/${docType === 'quote' ? 'quotations' : 'invoices'}`;
    setBusy('returnVendor');
    try {
      try {
        await invoiceFetch(`${base}/${docId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-actor-id': getActorId(), 'x-actor-role': 'pm' },
          body: JSON.stringify({
            vendorId: data.vendorId,
            status: 'returned to vendor for correction',
            pmFeedback: `Client ${data.clientDecision?.action || 'feedback'}: ${data.clientDecision?.reason || ''}`
          })
        });
      } catch (e) {
        console.warn('Status write for return-to-vendor failed (stage still moves):', e.message);
      }
      const revisionRequest = {
        action: data.clientDecision?.action || 'change_requested',
        clientReason: data.clientDecision?.reason || '',
        at: new Date().toISOString(),
        by: currentUser?.name || 'PM',
      };
      setLocalStatus('returned to vendor for correction');
      await advanceStage('vendor', {
        revisionRequest,
        clientDecision: null,
        status: 'returned to vendor for correction',
      });
      setShowReasonReview(false);
      alert('Returned to vendor for correction');
    } catch (err) {
      console.error('Return to vendor failed:', err);
      alert('Failed to return to vendor: ' + err.message);
    } finally {
      setBusy('');
    }
  };

  const btnClass = 'flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md transition-colors disabled:opacity-50';

  return (
    <div className={`relative group bg-surface rounded-lg border-2 w-[860px] ${selected ? 'border-info' : 'border-line'}`}>
      <NodeHandles isConnectable={isConnectable} defaultSource="top" defaultTarget="top" />

      <div className="flex items-center justify-between px-4 py-2 border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-ink shrink-0" />
          <span className="font-semibold text-ink text-sm truncate">{data.name || title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {['pm', 'finance', 'cas', 'client'].includes(role) && (
            <button
              onClick={() => setShowDownloadPicker(true)}
              className="p-1 rounded-md text-dim hover:text-ink hover:bg-surface-hover transition-colors"
              title="Download this document or the full quote → PO → invoice chain"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <span className={`px-2 py-0.5 text-[10px] rounded-full bg-surface-hover text-dim`} title="Workspace visibility">
            {STAGE_LABEL[stage] || 'Vendor only'}
          </span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full ${statusClass}`}>
            {localStatus.toUpperCase()}
          </span>
          {data.paymentStatus && ['pm', 'finance', 'cas', 'client'].includes(role) && (
            <span
              className="px-2 py-0.5 text-[10px] rounded-full bg-success/10 text-success"
              title={`Client payment via Razorpay — ₹${(Number(data.amountPaid) || 0).toLocaleString('en-IN')} received`}
            >
              {data.paymentStatus === 'paid' ? 'Paid' : 'Part paid'}
            </span>
          )}

          {/* Vendor actions — Edit + send to PM for review (EM flow order) */}
          {role === 'vendor' && (
            <>
              <button
                onClick={handleEdit}
                className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                title="Edit in Invoice tool"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              {canSend && stage === 'vendor' && (
                <button
                  onClick={() => callApi('pm')}
                  disabled={busy !== ''}
                  className={`${btnClass} bg-info/10 text-info border border-info/20 hover:bg-info/20`}
                  title="Send to PM for review"
                >
                  <Send className="w-3 h-3" />
                  {busy === 'pm' ? 'Sending…' : 'Send to PM'}
                </button>
              )}
            </>
          )}

          {/* Finance actions — add per-item commission, then send back to PM */}
          {role === 'finance' && canSend && stage === 'finance' && (
            <>
              {(commissionTotal > 0 || data.commission) && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-success/10 text-success" title="Commission applied">
                  +₹{commissionTotal.toFixed(2)}
                </span>
              )}
              <button
                onClick={openPmEditModal}
                className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                title="Edit issuer, bill-to, ship-to, items and terms"
              >
                <Pencil className="w-3 h-3" />
                Edit Doc
              </button>
              <button
                onClick={() => setShowCommissionEditor((v) => !v)}
                className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                title="Add item-wise commission"
              >
                <Landmark className="w-3 h-3" />
                {showCommissionEditor ? 'Close' : 'Commission'}
              </button>
              <button
                onClick={async () => {
                  setBusy('pm');
                  try { await advanceStage('pm'); alert('Sent back to PM workspace'); }
                  finally { setBusy(''); }
                }}
                disabled={busy !== ''}
                className={`${btnClass} bg-info/10 text-info border border-info/20 hover:bg-info/20`}
                title="Release to PM workspace"
              >
                <Send className="w-3 h-3" />
                {busy === 'pm' ? 'Sending…' : 'Send to PM'}
              </button>
            </>
          )}

          {/* PM actions — review: send to finance for commission; once
              commission returns, PM releases to client */}
          {role === 'pm' && canSend && stage === 'pm' && (
            <>
              {(commissionTotal > 0 || data.commission) && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-success/10 text-success" title="Commission applied by finance">
                  +₹{commissionTotal.toFixed(2)}
                </span>
              )}
              <button
                onClick={openPmEditModal}
                className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                title="Edit issuer, bill-to, ship-to, items and terms before forwarding"
              >
                <Pencil className="w-3 h-3" />
                Edit Doc
              </button>
              {!hasCommission ? (

                <button
                  onClick={() => callApi('finance')}
                  disabled={busy !== ''}
                  className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
                  title="Send to finance to apply commission"
                >
                  <Landmark className="w-3 h-3" />
                  {busy === 'finance' ? 'Sending…' : 'Send to Finance'}
                </button>
              ) : (
                <button
                  onClick={() => callApi('client')}
                  disabled={busy !== ''}
                  className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
                  title="Release to client workspace"
                >
                  <Send className="w-3 h-3" />
                  {busy === 'client' ? 'Sending…' : 'Send to Client'}
                </button>
              )}
            </>
          )}

          {/* Client actions — approve/reject the released document (EM client
              flow). Once decided, the decision buttons disappear — only the
              PO options remain. */}
          {role === 'client' && canSend && stage === 'client' && (
            <>
              {!(
                statusLower.includes('approved')
                || statusLower.includes('rejected')
                || statusLower.includes('change_requested')
                || data.clientDecision
                || paymentDone // a recorded payment implies the doc was approved
              ) && (
                <>
                  <button
                    onClick={() => callApi('approve')}
                    disabled={busy !== ''}
                    className={`${btnClass} bg-success text-success-foreground hover:opacity-90`}
                    title="Approve — PM can then raise a PO"
                  >
                    <Check className="w-3 h-3" />
                    {busy === 'approve' ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => { setDecisionReason(''); setDecisionModal('change'); }}
                    disabled={busy !== ''}
                    className={`${btnClass} border border-warning/30 text-warning hover:bg-warning/10`}
                    title="Request changes to this document"
                  >
                    <Pencil className="w-3 h-3" />
                    {busy === 'change' ? 'Sending…' : 'Request Change'}
                  </button>
                  <button
                    onClick={() => { setDecisionReason(''); setDecisionModal('reject'); }}
                    disabled={busy !== ''}
                    className={`${btnClass} border border-danger/30 text-danger hover:bg-danger/10`}
                    title="Reject the document"
                  >
                    <X className="w-3 h-3" />
                    {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </>
              )}
              {/* After approving the client pays first (per finance's payment
                  terms), then picks a PO path — Pay Now unlocks on approval,
                  PO unlocks on payment. A failed auto-check keeps the
                  correction path open. */}
              {(statusLower.includes('approved') || paymentDone || data.clientDecision?.action === 'approved') && docType === 'quote' && (
                <>
                  {/* 1) Pay Now — active right after approval */}
                  {paymentDone ? (
                    <span
                      className={`${btnClass} border border-success/30 text-success`}
                      title="Payment recorded via Razorpay"
                    >
                      <Check className="w-3 h-3" />
                      {data.paymentStatus === 'paid' ? 'Paid ✓' : 'Advance paid'}
                    </span>
                  ) : (
                    <button
                      onClick={handlePayNow}
                      disabled={busy !== ''}
                      className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
                      title="Pay via Razorpay as per the payment terms — required before choosing a PO"
                    >
                      <Landmark className="w-3 h-3" />
                      {busy === 'pay' || busy === 'payVerify' ? 'Processing…' : 'Pay Now'}
                    </button>
                  )}
                  {data.paymentStatus === 'partially_paid' && (
                    <button
                      onClick={handlePayNow}
                      disabled={busy !== ''}
                      className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                      title="Pay the remaining balance via Razorpay"
                    >
                      <Landmark className="w-3 h-3" />
                      {busy === 'pay' || busy === 'payVerify' ? 'Processing…' : 'Pay balance'}
                    </button>
                  )}

                  {/* 2) PO — locked until payment is recorded */}
                  {!paymentDone ? (
                    <span
                      className={`${btnClass} border border-line text-dim`}
                      title="Pay first — the PO options appear after payment"
                    >
                      <AlertCircle className="w-3 h-3" />
                      PO unlocks after payment
                    </span>
                  ) : data.poType === 'system' ? (
                  <span
                    className={`${btnClass} border border-success/30 text-success`}
                    title="You requested a system-generated PO — the PM will raise and send it to the vendor"
                  >
                    <Check className="w-3 h-3" />
                    System PO requested ✓
                  </span>
                ) : data.clientPOFile ? (
                  data.poAutoCheck && !data.poAutoCheck.passed ? (
                    <button
                      onClick={() => setPoCheckResult(data.poAutoCheck)}
                      className={`${btnClass} border border-danger/30 text-danger hover:bg-danger/5`}
                      title="Your PO didn't match the quotation — view differences and upload a corrected file"
                    >
                      <AlertCircle className="w-3 h-3" />
                      PO needs correction
                    </button>
                  ) : (
                    <a
                      href={data.clientPOFile}
                      target="_blank"
                      rel="noreferrer"
                      className={`${btnClass} border border-success/30 text-success`}
                      title="Your PO was uploaded and verified"
                    >
                      <Check className="w-3 h-3" />
                      PO verified ✓
                    </a>
                  )
                ) : (
                  <>
                    <button
                      onClick={() => poFileInputRef.current?.click()}
                      disabled={busy !== ''}
                      className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                      title="Upload your own purchase order file"
                    >
                      <Send className="w-3 h-3" />
                      {busy === 'poUpload' ? 'Uploading…' : 'Upload your PO'}
                    </button>
                    <input
                      ref={poFileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => handleUploadClientPO(e.target.files?.[0])}
                    />
                    <button
                      onClick={handleUseSystemPO}
                      disabled={busy !== ''}
                      className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                      title="Have our system generate the PO from this quotation"
                    >
                      <Check className="w-3 h-3" />
                      {busy === 'systemPo' ? 'Saving…' : 'Use our PO'}
                    </button>
                  </>
                  )}
                </>
              )}

              {/* Invoice — client pays the remaining balance (or the terms'
                  post-advance share). Advance collected on the quote is shown
                  deducted on the invoice itself. */}
              {docType === 'invoice' && (
                <>
                  {paymentDone ? (
                    <span
                      className={`${btnClass} border border-success/30 text-success`}
                      title="Payment recorded via Razorpay"
                    >
                      <Check className="w-3 h-3" />
                      {data.paymentStatus === 'paid' ? 'Paid ✓' : 'Part paid'}
                    </span>
                  ) : null}
                  {(data.paymentStatus !== 'paid') && (
                    <button
                      onClick={handlePayNow}
                      disabled={busy !== ''}
                      className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
                      title="Pay via Razorpay as per the payment terms"
                    >
                      <Landmark className="w-3 h-3" />
                      {busy === 'pay' || busy === 'payVerify'
                        ? 'Processing…'
                        : data.paymentStatus === 'partially_paid' || Number(data.advancePaid) > 0
                          ? 'Pay balance'
                          : 'Pay Now'}
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* PM action — after client approval, raise the PO. Gated on the
              client's PO choice being recorded (poType/clientPOFile persisted
              on the node) or an approved status — status alone is unreliable
              for nodes approved before the status was written to node.data. */}
          {role === 'pm' && canSend && stage === 'client' && (
            statusLower.includes('approved')
            || statusLower.includes('po_uploaded')
            || statusLower === 'po uploaded'
            || data.poType === 'system'
            || !!data.clientPOFile
          ) && !data.purchaseOrderId && !data.pmPOFile && !statusLower.includes('po sent') && !statusLower.includes('po raised') && (
            <button
              onClick={openPOModal}
              disabled={busy !== ''}
              className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
              title="Review, adjust and raise the PO — vendor gets original rates, no commission"
            >
              <Landmark className="w-3 h-3" />
              {busy === 'po' ? 'Generating…' : 'Raise PO & Send to Vendor'}
            </button>
          )}

          {/* PM action — client rejected/requested changes: review the reason
              and return the doc to the vendor for correction */}
          {role === 'pm' && canSend && stage === 'client' && data.clientDecision && (
            <button
              onClick={() => setShowReasonReview(true)}
              disabled={busy !== ''}
              className={`${btnClass} border border-warning/30 text-warning hover:bg-warning/10`}
              title="Review the client's decision and reason"
            >
              <Eye className="w-3 h-3" />
              Review Reason
            </button>
          )}

          {/* PO node — PM sends it to the vendor */}
          {role === 'pm' && canSendPO && stage === 'pm' && (
            <button
              onClick={() => handlePOAction('sendToVendor')}
              disabled={busy !== ''}
              className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
              title="Send this PO to the vendor for confirmation"
            >
              <Send className="w-3 h-3" />
              {busy === 'sendToVendor' ? 'Sending…' : 'Send to Vendor'}
            </button>
          )}

          {/* PO node — vendor accepts or rejects the PO they received */}
          {role === 'vendor' && canSendPO && stage === 'vendor' && (
            <>
              <button
                onClick={() => handlePOAction('accept')}
                disabled={busy !== ''}
                className={`${btnClass} bg-success text-success-foreground hover:opacity-90`}
                title="Accept this purchase order"
              >
                <Check className="w-3 h-3" />
                {busy === 'accept' ? 'Accepting…' : 'Accept'}
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm('Reject this purchase order?')) return;
                  await handlePOAction('reject');
                }}
                disabled={busy !== ''}
                className={`${btnClass} border border-danger/30 text-danger hover:bg-danger/10`}
                title="Reject this purchase order"
              >
                <X className="w-3 h-3" />
                {busy === 'reject' ? 'Rejecting…' : 'Reject'}
              </button>
            </>
          )}

          {/* PO node — after accepting, the vendor converts the quotation
              chain into an invoice; it lands next to this node and goes to PM */}
          {role === 'vendor' && docType === 'po' &&
            (statusLower.includes('accepted') || data.vendorResponse?.response === 'accepted') &&
            !data.invoiceId && (
            <button
              onClick={handleConvertToInvoice}
              disabled={busy !== ''}
              className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
              title="Convert this purchase order's quotation into an invoice and send it to the PM"
            >
              <FileText className="w-3 h-3" />
              {busy === 'convert' ? 'Converting…' : 'Convert to Invoice'}
            </button>
          )}
          {role === 'vendor' && docType === 'po' && data.invoiceId && (
            <span
              className={`${btnClass} border border-success/30 text-success`}
              title="Invoice created from this PO and sent to the PM"
            >
              <Check className="w-3 h-3" />
              Invoice sent to PM ✓
            </span>
          )}
        </div>
      </div>

      {/* Invoice payment context — PM/finance see finance's payment terms and
          how much the client has already collected (advance on the quote +
          invoice-level payments) before editing/releasing the invoice. */}
      {docType === 'invoice' && ['pm', 'finance', 'cas', 'client'].includes(role) &&
        (data.paymentTerms || Number(data.amountPaid) > 0 || Number(data.advancePaid) > 0
          || Number(docChain?.records?.quotation?.amountPaid) > 0) && (() => {
          // Advance = collections on the linked quotation (recorded field, or
          // the live quote record from the chain for pre-stamp invoices).
          const advance = Number(data.advancePaid)
            || Number(docChain?.records?.quotation?.amountPaid)
            || 0;
          const invPaid = Number(data.amountPaid) || 0;
          // Client-facing total = commissioned (normalizeDoc scales it);
          // vendor viewers never reach this block.
          const clientTotal = Number(normalizeDoc(data, docType, role).total)
            || Number(data.total) || 0;
          const due = Math.max(clientTotal - advance - invPaid, 0);
          return (
            <div className="px-4 py-1.5 border-b border-line bg-info/5 flex items-center gap-3 text-[10px] text-dim">
              {data.paymentTerms?.label && (
                <span className="font-medium text-ink">Terms: {data.paymentTerms.label}</span>
              )}
              <span>Advance collected on quotation: ₹{advance.toLocaleString('en-IN')}</span>
              <span>Collected on invoice: ₹{invPaid.toLocaleString('en-IN')}</span>
              <span className="font-semibold text-warning">
                Due: ₹{Number(data.balanceDue ?? due).toLocaleString('en-IN')}
              </span>
            </div>
          );
        })()}

      {/* Finance commission editor — item-wise % that computes clientRate/clientAmount */}
      {role === 'finance' && showCommissionEditor && (
        <div className="border-b border-line bg-canvas px-4 py-3">
          <div className="text-[11px] font-semibold text-ink mb-2">Item-wise commission</div>
          {data.carriedCommission && (
            <p className="mb-2 text-[10px] text-info bg-info/10 border border-info/20 rounded px-2 py-1">
              Carried forward from quote {data.carriedCommission.fromQuoteNumber} — {data.carriedCommission.percent}% commission prefilled. Confirm and send to PM so the client amount stays the same.
            </p>
          )}
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-dim">
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 pr-2 font-medium text-right">Qty</th>
                <th className="py-1 pr-2 font-medium text-right">Rate</th>
                <th className="py-1 pr-2 font-medium text-right">Amount</th>
                <th className="py-1 pr-2 font-medium text-right w-20">Comm. %</th>
                <th className="py-1 font-medium text-right">Client Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const pct = Number(commissionMap[i] ?? item.commissionPercent ?? 0) || 0;
                const rate = Number(item.rate) || 0;
                const qty = Number(item.quantity) || 0;
                const amount = Number(item.amount) || rate * qty;
                const clientAmount = amount * (1 + pct / 100);
                const name = item.selectedItem?.name || item.itemName || item.productName || item.item || item.name || `Item ${i + 1}`;
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5 pr-2 text-ink truncate max-w-[200px]">{name}</td>
                    <td className="py-1.5 pr-2 text-right text-dim">{qty}</td>
                    <td className="py-1.5 pr-2 text-right text-dim">₹{rate.toFixed(2)}</td>
                    <td className="py-1.5 pr-2 text-right text-dim">₹{amount.toFixed(2)}</td>
                    <td className="py-1.5 pr-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={commissionMap[i] ?? ''}
                        onChange={(e) => setCommissionMap((m) => ({ ...m, [i]: e.target.value }))}
                        className="w-16 px-1.5 py-0.5 border border-line rounded text-right text-[11px] bg-surface"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-1.5 text-right text-ink font-medium">₹{clientAmount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={5} className="py-1.5 pr-2 text-right font-semibold text-ink">Commission total</td>
                <td className="py-1.5 text-right font-semibold text-success">
                  ₹{items.reduce((s, item, i) => {
                    const pct = Number(commissionMap[i] ?? item.commissionPercent ?? 0) || 0;
                    const rate = Number(item.rate) || 0;
                    const qty = Number(item.quantity) || 0;
                    const amount = Number(item.amount) || rate * qty;
                    return s + (amount * pct) / 100;
                  }, 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-ink mb-1">Payment terms for the client</div>
            <select
              value={paymentTermsOptionId}
              onChange={(e) => setPaymentTermsOptionId(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-[11px] text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
            >
              {PAYMENT_TERM_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}{o.advancePercent != null && o.advancePercent > 0 ? ` — client pays ${o.advancePercent}% now` : ''}
                </option>
              ))}
            </select>
            {paymentTermsOptionId === 'custom' ? (
              <textarea
                rows={3}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 50% advance on order confirmation, balance within 30 days of delivery"
                className="w-full mt-2 px-3 py-2 border border-line rounded-lg bg-surface text-[11px] text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y"
              />
            ) : (
              <p className="text-[10px] text-dim mt-1">
                The client will be asked to pay {PAYMENT_TERM_OPTIONS.find((o) => o.id === paymentTermsOptionId)?.advancePercent > 0
                  ? `${PAYMENT_TERM_OPTIONS.find((o) => o.id === paymentTermsOptionId).advancePercent}% of the total now`
                  : 'the full amount'} via Razorpay.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowCommissionEditor(false)}
              className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
            >
              Cancel
            </button>
            <button
              onClick={() => saveCommission(false)}
              disabled={busy !== ''}
              className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
            >
              {busy === 'commission' ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => saveCommission(true)}
              disabled={busy !== ''}
              className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
              title="Save commission and release to the PM workspace"
            >
              {busy === 'commission' ? 'Saving…' : 'Save & Send to PM'}
            </button>
          </div>
        </div>
      )}

      {/* Decision / revision banner — client's reason for PM, PM's return
          reason for the vendor */}
      {(data.clientDecision || data.revisionRequest) && (
        <div className="border-b border-line px-4 py-2 text-[11px] bg-warning/10 text-warning">
          {data.revisionRequest ? (
            <>
              <span className="font-semibold">Revision requested — </span>
              {data.revisionRequest.clientReason || data.revisionRequest.reason}
            </>
          ) : (
            <>
              <span className="font-semibold">
                Client {data.clientDecision?.action === 'rejected' ? 'rejected' : 'requested changes'} —{' '}
              </span>
              {data.clientDecision?.reason}
            </>
          )}
        </div>
      )}

      {/* Document chain — quote / PO / invoice belonging to the same flow,
          shown as one grouped strip on every role's canvas */}
      {docChain && (docChain.purchaseOrder || docChain.invoice) && (
        <div className="border-b border-line bg-canvas/60 px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="font-semibold text-dim uppercase tracking-wide">Linked docs</span>
          {[['quotation', 'quote', 'Quote', 'Quotation'],
            ['purchaseOrder', 'po', 'PO', 'Purchase order'],
            ['invoice', 'invoice', 'Invoice', 'Invoice']]
            .filter(([key]) => docChain[key])
            .map(([key, type, label, title]) => {
              const isCurrent = docType === type;
              const member = docChain[key];
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => openLinkedDoc(key)}
                  className={`px-1.5 py-0.5 rounded-full border transition-colors ${
                    isCurrent
                      ? 'border-cta/40 bg-cta/10 text-cta font-semibold cursor-default'
                      : 'border-line bg-surface text-ink hover:border-cta/40 hover:bg-cta/10 cursor-pointer'
                  }`}
                  title={isCurrent
                    ? `${title} ${member.number} — this document`
                    : `${title} ${member.number} — ${member.status}. Click to open beside this document`}
                >
                  {label} {member.number}
                </button>
              );
            })}
        </div>
      )}

      <StandardPreview
        quote={normalizeDoc(data, docType, role)}
        company={DEFAULT_COMPANY}
        docType={docType}
        terms={data.termsAndConditions}
        notes={data.customerNotes}
      />

      {/* Invoice payments ledger — every collection on the chain (advance on
          the quote + invoice payments) with txn id and running balance. */}
      {docType === 'invoice' && ['pm', 'finance', 'cas', 'client'].includes(role)
        && Array.isArray(data.paymentHistory) && data.paymentHistory.length > 0 && (() => {
          const clientTotal = Number(normalizeDoc(data, docType, role).total) || Number(data.total) || 0;
          const entries = [...data.paymentHistory]
            .filter((p) => Number(p?.amount) > 0)
            .sort((a, b) => new Date(a.paidAt || 0) - new Date(b.paidAt || 0));
          if (!entries.length) return null;
          let remaining = clientTotal;
          return (
            <div className="border-t border-line px-4 py-2">
              <div className="text-[10px] font-semibold text-ink mb-1.5">Payments received</div>
              <table className="w-full text-[10px] text-dim">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="py-1 pr-2 font-medium">Date</th>
                    <th className="py-1 pr-2 font-medium">Transaction ID</th>
                    <th className="py-1 pr-2 font-medium">Paid on</th>
                    <th className="py-1 pr-2 font-medium text-right">Amount</th>
                    <th className="py-1 font-medium text-right">Balance left</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((p, i) => {
                    remaining = Math.max(remaining - Number(p.amount), 0);
                    return (
                      <tr key={i} className="border-b border-line/50">
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {p.paidAt ? new Date(p.paidAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-1 pr-2 font-mono break-all">{p.paymentId || p.razorpayPaymentId || p.orderId || '—'}</td>
                        <td className="py-1 pr-2">{p.collectedOn === 'quotation' ? 'Quotation (advance)' : 'Invoice'}</td>
                        <td className="py-1 pr-2 text-right text-success">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-1 text-right font-medium text-ink">₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

      {/* PM Create PO modal — mirrors EM ClientPOManagement: edit rates/GST,
          remove commission, preview the PO, then Generate & Send to Vendor */}
      {showPOModal && createPortal(
        <div className="nodrag fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPOModal(false)}>
          <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto border border-line" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-cta text-cta-foreground px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-lg font-bold">{poPreviewMode ? 'Purchase Order Preview' : 'Create Purchase Order'}</h2>
                <p className="text-xs opacity-80 mt-0.5">
                  Quote: {data.quotationNumber || data.customQuoteId || data.quoteId || docId}
                </p>
              </div>
              <button
                onClick={() => setShowPOModal(false)}
                className="hover:opacity-70 p-1.5 rounded-lg transition-all text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              {!poPreviewMode ? (
                <div className="space-y-4">
                  {/* Client PO auto-check warning — the check ran client-side
                      at upload; a failed check blocks send-to-vendor */}
                  {data.clientPOFile && data.poAutoCheck && !data.poAutoCheck.passed && (
                    <div className="border border-danger/30 bg-danger/5 rounded-lg px-3 py-2 text-xs text-danger">
                      <span className="font-semibold">Auto-check failed — </span>
                      the client's PO doesn't match the quotation. Send-to-vendor is blocked until the client uploads a corrected PO.
                    </div>
                  )}
                  {data.clientPOFile && data.poAutoCheck?.passed && (
                    <div className="border border-success/30 bg-success/5 rounded-lg px-3 py-2 text-xs text-success">
                      Client PO verified — matches the quotation.
                    </div>
                  )}
                  {/* PO Number / Date / Reference Quote — same as EM modal */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">PO Number</label>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-sm text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">PO Date</label>
                      <input
                        type="date"
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-sm text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Reference Quote</label>
                      <input
                        type="text"
                        value={data.customQuoteId || data.quotationNumber || data.quoteId || docId || ''}
                        disabled
                        className="w-full px-3 py-2 border border-line rounded-lg bg-canvas text-sm text-dim"
                      />
                    </div>
                  </div>

                  {/* Bill To / Ship To */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-info/40 rounded-lg p-3">
                      <h3 className="text-sm font-bold text-ink mb-2">Bill To</h3>
                      <textarea
                        rows={4}
                        value={poBillTo}
                        onChange={(e) => setPoBillTo(e.target.value)}
                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y"
                      />
                      {data.vendorName && (
                        <p className="text-[11px] text-dim mt-1">Vendor: {data.vendorName}</p>
                      )}
                    </div>
                    <div className="border border-success/40 rounded-lg p-3">
                      <h3 className="text-sm font-bold text-ink mb-2">Ship To</h3>
                      <textarea
                        rows={4}
                        value={poShipTo}
                        onChange={(e) => setPoShipTo(e.target.value)}
                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y"
                      />
                    </div>
                  </div>

                  {/* Purchase Order Items — original quotation rates, no commission */}
                  <div className="border border-line rounded-lg overflow-hidden">
                    <h3 className="text-sm font-bold text-ink px-4 py-3 bg-canvas border-b border-line">Purchase Order Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-surface border-b border-line">
                            <th className="text-left px-3 py-2 font-semibold text-ink min-w-[180px]">Item &amp; Description</th>
                            <th className="text-left px-3 py-2 font-semibold text-ink w-24">HSN/SAC</th>
                            <th className="text-center px-3 py-2 font-semibold text-ink w-16">Qty</th>
                            <th className="text-right px-3 py-2 font-semibold text-ink w-24">Rate (₹)</th>
                            <th className="text-center px-3 py-2 font-semibold text-ink w-20">CGST %</th>
                            <th className="text-center px-3 py-2 font-semibold text-ink w-20">SGST %</th>
                            <th className="text-right px-3 py-2 font-semibold text-ink w-28">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poEditItems.map((it, idx) => (
                            <tr key={idx} className="border-b border-line">
                              <td className="px-3 py-2 text-ink">
                                <input
                                  type="text"
                                  value={it.description}
                                  onChange={(e) => setPoEditItems((prev) => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))}
                                  className="w-full px-2 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink focus:ring-1 focus:ring-cta"
                                />
                              </td>
                              <td className="px-3 py-2 text-dim">
                                <input
                                  type="text"
                                  value={it.hsn}
                                  onChange={(e) => setPoEditItems((prev) => prev.map((p, i) => i === idx ? { ...p, hsn: e.target.value } : p))}
                                  className="w-full px-2 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-dim focus:ring-1 focus:ring-cta"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number" min="0" step="1"
                                  value={it.quantity}
                                  onChange={(e) => adjustPoItem(idx, 'quantity', e.target.value)}
                                  className="w-14 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-center focus:ring-1 focus:ring-cta"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number" min="0" step="0.01"
                                  value={it.rate}
                                  onChange={(e) => adjustPoItem(idx, 'rate', e.target.value)}
                                  className="w-20 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-right focus:ring-1 focus:ring-cta"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number" min="0" step="0.5"
                                  value={it.cgstRate}
                                  onChange={(e) => adjustPoItem(idx, 'cgstRate', e.target.value)}
                                  className="w-14 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-center focus:ring-1 focus:ring-cta"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number" min="0" step="0.5"
                                  value={it.sgstRate}
                                  onChange={(e) => adjustPoItem(idx, 'sgstRate', e.target.value)}
                                  className="w-14 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-center focus:ring-1 focus:ring-cta"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-ink">₹{(Number(it.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="px-4 py-3 bg-canvas border-t border-line space-y-1 text-xs max-w-xs ml-auto">
                      <div className="flex justify-between text-dim"><span>Subtotal</span><span className="font-medium text-ink">₹{poTotals.subtotal.toFixed(2)}</span></div>
                      {poTotals.cgst > 0 && <div className="flex justify-between text-dim"><span>CGST</span><span className="font-medium text-ink">₹{poTotals.cgst.toFixed(2)}</span></div>}
                      {poTotals.sgst > 0 && <div className="flex justify-between text-dim"><span>SGST</span><span className="font-medium text-ink">₹{poTotals.sgst.toFixed(2)}</span></div>}
                      {poTotals.igst > 0 && <div className="flex justify-between text-dim"><span>IGST</span><span className="font-medium text-ink">₹{poTotals.igst.toFixed(2)}</span></div>}
                      <div className="flex justify-between font-bold text-sm text-ink pt-1 border-t border-line"><span>PO Total</span><span>₹{poGrandTotal.toFixed(2)}</span></div>
                      {poCommissionRemoved > 0 && (
                        <p className="text-[10px] text-dim pt-1">Vendor PO excludes ₹{poCommissionRemoved.toLocaleString('en-IN', { minimumFractionDigits: 2 })} finance commission</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* PO Preview — same document style as the canvas preview */
                <div className="border border-line rounded-lg overflow-hidden">
                  <StandardPreview
                    quote={(() => {
                      // Bill To = the vendor block (poBillTo: name on line 1,
                      // address + email after, GSTIN in its own line).
                      const billLines = poBillTo.split('\n').filter(Boolean);
                      const shipLines = poShipTo.split('\n')
                        .filter((l) => !/^gstin\s*:/i.test(l));
                      return {
                        ...data,
                        items: poEditItems,
                        subTotal: poTotals.subtotal,
                        cgst: poTotals.cgst,
                        sgst: poTotals.sgst,
                        igst: poTotals.igst,
                        total: poGrandTotal,
                        purchaseOrderNumber: poNumber,
                        quotationNumber: poNumber,
                        purchaseOrderDate: poDate,
                        quotationDate: poDate,
                        billingAddress: poBillTo,
                        shipTo: poShipTo,
                        customerName: billLines[0] || data.customerName,
                        customerDetails: {
                          ...(data.customerDetails || {}),
                          name: billLines[0] || data.customerDetails?.name,
                          gstin: data.issuerDetails?.gstin || data.customerDetails?.gstin,
                          address: {
                            ...(data.customerDetails?.address || {}),
                            billing: billLines.slice(1).filter((l) => !/^gstin\s*:/i.test(l)).join('\n'),
                            shipping: shipLines.join('\n') || poShipTo
                          },
                          shippingGstin: DEFAULT_COMPANY.gstin
                        },
                        clientRate: undefined,
                        clientAmount: undefined,
                        commissionPercent: undefined,
                      };
                    })()}
                    company={DEFAULT_COMPANY}
                    docType="po"
                    terms={data.termsAndConditions}
                    notes={data.customerNotes}
                  />
                </div>
              )}

              {/* Footer actions — same buttons as EM's modal */}
              <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-line">
                <button
                  onClick={() => setShowPOModal(false)}
                  className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                >
                  Cancel
                </button>
                {!poPreviewMode ? (
                  <button
                    onClick={() => setPoPreviewMode(true)}
                    className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                  >
                    <Eye className="w-3 h-3" />
                    Preview PO
                  </button>
                ) : (
                  <button
                    onClick={() => setPoPreviewMode(false)}
                    className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                  >
                    <Pencil className="w-3 h-3" />
                    Back to Edit
                  </button>
                )}
                <button
                  onClick={() => handleRaisePO({
                    items: poEditItems,
                    subtotal: poTotals.subtotal,
                    cgst: poTotals.cgst,
                    sgst: poTotals.sgst,
                    igst: poTotals.igst,
                    total: poGrandTotal,
                    commissionRemoved: poCommissionRemoved,
                    poNumber,
                    poDate,
                    billTo: poBillTo,
                    shipTo: poShipTo
                  })}
                  disabled={busy !== ''}
                  className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
                >
                  <Landmark className="w-3 h-3" />
                  {busy === 'po' ? 'Generating…' : 'Generate & Send to Vendor'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PM inline edit modal — issuer, bill/ship-to, items, terms. Same
          field set the PM can adjust before forwarding to finance/client. */}
      {showPmEditModal && pmEditForm && createPortal(
        <div className="nodrag fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPmEditModal(false)}>
          <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto border border-line" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-cta text-cta-foreground px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-lg font-bold">Edit Document</h2>
                <p className="text-xs opacity-80 mt-0.5">
                  {docType === 'invoice' ? 'Tax Invoice' : 'Quotation'}: {data.quotationNumber || data.customQuoteId || data.customInvoiceId || docId}
                </p>
              </div>
              <button
                onClick={() => setShowPmEditModal(false)}
                className="hover:opacity-70 p-1.5 rounded-lg transition-all text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Issuer block — the company details shown at the top of the doc */}
              <div className="border border-line rounded-lg p-3">
                <h3 className="text-sm font-bold text-ink mb-2">Issued By (top of document)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Company / Name</label>
                    <input
                      type="text"
                      value={pmEditForm.issuerName}
                      onChange={(e) => setPmEditForm((f) => ({ ...f, issuerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Email</label>
                    <input
                      type="text"
                      value={pmEditForm.issuerEmail}
                      onChange={(e) => setPmEditForm((f) => ({ ...f, issuerEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={pmEditForm.issuerGstin}
                      onChange={(e) => setPmEditForm((f) => ({ ...f, issuerGstin: e.target.value }))}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Country</label>
                    <input
                      type="text"
                      value={pmEditForm.issuerCountry}
                      onChange={(e) => setPmEditForm((f) => ({ ...f, issuerCountry: e.target.value }))}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink mb-1">Address</label>
                    <textarea
                      rows={2}
                      value={pmEditForm.issuerAddress}
                      onChange={(e) => setPmEditForm((f) => ({ ...f, issuerAddress: e.target.value }))}
                      className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* Bill To / Ship To */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-info/40 rounded-lg p-3">
                  <h3 className="text-sm font-bold text-ink mb-2">Bill To</h3>
                  <input
                    type="text"
                    value={pmEditForm.customerName}
                    onChange={(e) => setPmEditForm((f) => ({ ...f, customerName: e.target.value }))}
                    placeholder="Customer name"
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent mb-2"
                  />
                  <textarea
                    rows={3}
                    value={pmEditForm.billTo}
                    onChange={(e) => setPmEditForm((f) => ({ ...f, billTo: e.target.value }))}
                    placeholder="Billing address"
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y mb-2"
                  />
                  <input
                    type="text"
                    value={pmEditForm.billToGstin}
                    onChange={(e) => setPmEditForm((f) => ({ ...f, billToGstin: e.target.value }))}
                    placeholder="GSTIN"
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                  />
                </div>
                <div className="border border-success/40 rounded-lg p-3">
                  <h3 className="text-sm font-bold text-ink mb-2">Ship To</h3>
                  <textarea
                    rows={3}
                    value={pmEditForm.shipTo}
                    onChange={(e) => setPmEditForm((f) => ({ ...f, shipTo: e.target.value }))}
                    placeholder="Shipping address"
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y mb-2 mt-8"
                  />
                  <input
                    type="text"
                    value={pmEditForm.shipToGstin}
                    onChange={(e) => setPmEditForm((f) => ({ ...f, shipToGstin: e.target.value }))}
                    placeholder="GSTIN"
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="border border-line rounded-lg overflow-hidden">
                <h3 className="text-sm font-bold text-ink px-4 py-3 bg-canvas border-b border-line">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface border-b border-line">
                        <th className="text-left px-3 py-2 font-semibold text-ink min-w-[160px]">Item</th>
                        <th className="text-left px-3 py-2 font-semibold text-ink min-w-[160px]">Description</th>
                        <th className="text-left px-3 py-2 font-semibold text-ink w-24">HSN/SAC</th>
                        <th className="text-center px-3 py-2 font-semibold text-ink w-16">Qty</th>
                        <th className="text-right px-3 py-2 font-semibold text-ink w-24">Rate (₹)</th>
                        <th className="text-center px-3 py-2 font-semibold text-ink w-20">CGST %</th>
                        <th className="text-center px-3 py-2 font-semibold text-ink w-20">SGST %</th>
                        <th className="text-center px-3 py-2 font-semibold text-ink w-20">IGST %</th>
                        <th className="text-right px-3 py-2 font-semibold text-ink w-28">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pmEditItems.map((it, idx) => (
                        <tr key={idx} className="border-b border-line">
                          <td className="px-3 py-2 text-ink">
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) => adjustPmItem(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-dim">
                            <input
                              type="text"
                              value={it.description}
                              onChange={(e) => adjustPmItem(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-dim focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-dim">
                            <input
                              type="text"
                              value={it.hsn}
                              onChange={(e) => adjustPmItem(idx, 'hsn', e.target.value)}
                              className="w-full px-2 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-dim focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number" min="0" step="1"
                              value={it.quantity}
                              onChange={(e) => adjustPmItem(idx, 'quantity', e.target.value)}
                              className="w-14 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-center focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number" min="0" step="0.01"
                              value={it.rate}
                              onChange={(e) => adjustPmItem(idx, 'rate', e.target.value)}
                              className="w-20 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-right focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number" min="0" step="0.5"
                              value={it.cgstRate}
                              onChange={(e) => adjustPmItem(idx, 'cgstRate', e.target.value)}
                              className="w-14 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-center focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number" min="0" step="0.5"
                              value={it.sgstRate}
                              onChange={(e) => adjustPmItem(idx, 'sgstRate', e.target.value)}
                              className="w-14 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-center focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number" min="0" step="0.5"
                              value={it.igstRate}
                              onChange={(e) => adjustPmItem(idx, 'igstRate', e.target.value)}
                              className="w-14 px-1 py-1 border border-transparent hover:border-line rounded bg-transparent text-xs text-ink text-center focus:ring-1 focus:ring-cta"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-ink">₹{(Number(it.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice-only: deduct the advance already collected on the
                  quote as an "Advance paid" row under Sub Total, and bill the
                  client only the balance. */}
              {docType === 'invoice' && (
                <div className="border border-line rounded-xl p-4 bg-surface-hover/40">
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(pmEditForm.advancePaidEnabled)}
                      onChange={(e) => setPmEditForm((f) => ({ ...f, advancePaidEnabled: e.target.checked }))}
                      className="w-4 h-4 accent-cta"
                    />
                    Advance paid — deduct client's earlier collections from this invoice
                  </label>
                  {pmEditForm.advancePaidEnabled && (
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-dim">Amount (₹)</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={pmEditForm.advancePaidAmount}
                        onChange={(e) => setPmEditForm((f) => ({ ...f, advancePaidAmount: e.target.value }))}
                        className="w-40 px-3 py-1.5 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta"
                      />
                      <span className="text-[10px] text-dim">Autofilled from payments the client already made on the quotation — shown as “Advance paid” under Sub Total.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Terms & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Terms &amp; Conditions</label>
                  <textarea
                    rows={5}
                    value={pmEditForm.termsAndConditions}
                    onChange={(e) => setPmEditForm((f) => ({ ...f, termsAndConditions: e.target.value }))}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Customer Notes</label>
                  <textarea
                    rows={5}
                    value={pmEditForm.customerNotes}
                    onChange={(e) => setPmEditForm((f) => ({ ...f, customerNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  onClick={() => setShowPmEditModal(false)}
                  className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
                >
                  Cancel
                </button>
                <button
                  onClick={savePmEdit}
                  disabled={busy !== ''}
                  className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
                >
                  {busy === 'pmedit' ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Client decision modal — reject / request change, reason required */}
      {decisionModal && createPortal(
        <div className="nodrag fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDecisionModal(null)}>
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-line" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">
                {decisionModal === 'reject' ? 'Reject Document' : 'Request Change'}
              </h2>
              <button
                onClick={() => setDecisionModal(null)}
                className="hover:opacity-70 p-1 rounded-lg transition-all text-lg leading-none text-dim"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4">
              <label className="block text-xs font-medium text-ink mb-1">
                {decisionModal === 'reject' ? 'Reason for rejection' : 'What should be changed?'} <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={decisionModal === 'reject' ? 'e.g. Pricing is above our approved budget' : 'e.g. Please update the quantity of cement bags to 120 and extend delivery by 2 weeks'}
                className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-xs text-ink focus:ring-2 focus:ring-cta focus:border-transparent resize-y"
                autoFocus
              />
              <p className="text-[10px] text-dim mt-1">The PM will review this and send the document back to the vendor if needed.</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
              <button
                onClick={() => setDecisionModal(null)}
                className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
              >
                Cancel
              </button>
              <button
                onClick={() => submitClientDecision(decisionModal)}
                disabled={busy !== '' || !decisionReason.trim()}
                className={`${btnClass} ${decisionModal === 'reject' ? 'bg-danger text-white' : 'bg-cta text-cta-foreground'} hover:opacity-90`}
              >
                {busy ? 'Sending…' : decisionModal === 'reject' ? 'Reject' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PO auto-check discrepancy modal — the client must upload a
          corrected PO (check ran right after their upload) */}
      {poCheckResult && !poCheckResult.passed && createPortal(
        <div className="nodrag fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPoCheckResult(null)}>
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-line" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">PO verification failed</h2>
              <button
                onClick={() => setPoCheckResult(null)}
                className="hover:opacity-70 p-1 rounded-lg transition-all text-lg leading-none text-dim"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-ink mb-2">
                Your PO doesn't match the quotation. Please review the differences and upload a corrected file:
              </p>
              <ul className="text-xs text-danger space-y-1 max-h-48 overflow-y-auto bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
                {(poCheckResult.discrepancies || []).map((d, i) => (
                  <li key={i}>• {d.message || d}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
              <button
                onClick={() => setPoCheckResult(null)}
                className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
              >
                Cancel
              </button>
              <button
                onClick={() => { setPoCheckResult(null); poFileInputRef.current?.click(); }}
                className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
              >
                Upload corrected PO
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PM reason review — shows the client's decision/reason, return to vendor */}
      {showReasonReview && data.clientDecision && createPortal(
        <div className="nodrag fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowReasonReview(false)}>
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-line" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">
                Client {data.clientDecision.action === 'rejected' ? 'rejected this document' : 'requested changes'}
              </h2>
              <button
                onClick={() => setShowReasonReview(false)}
                className="hover:opacity-70 p-1 rounded-lg transition-all text-lg leading-none text-dim"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="text-xs font-medium text-ink mb-1">Client's reason</div>
              <div className="whitespace-pre-line text-xs text-ink bg-canvas border border-line rounded-lg px-3 py-2">
                {data.clientDecision.reason}
              </div>
              {data.clientDecision.at && (
                <p className="text-[10px] text-dim mt-1">
                  Client · {new Date(data.clientDecision.at).toLocaleString('en-GB')}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
              <button
                onClick={() => setShowReasonReview(false)}
                className={`${btnClass} border border-line text-ink hover:bg-surface-hover`}
              >
                Close
              </button>
              <button
                onClick={returnToVendor}
                disabled={busy !== ''}
                className={`${btnClass} bg-cta text-cta-foreground hover:opacity-90`}
                title="Approve the reason and send the document back to the vendor for correction"
              >
                <Send className="w-3 h-3" />
                {busy === 'returnVendor' ? 'Sending…' : 'Return to Vendor'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Download picker — this document only, or the whole chain */}
      {showDownloadPicker && createPortal(
        <div className="nodrag fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDownloadPicker(false)}>
          <div className="bg-surface rounded-lg shadow-xl max-w-sm w-full border border-line" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Download document</h3>
              <button onClick={() => setShowDownloadPicker(false)} className="text-dim hover:text-ink p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-2">
              <button
                onClick={() => queueDownload('single')}
                className="w-full flex items-center gap-3 px-4 py-3 border border-line rounded-lg text-left hover:border-cta/40 hover:bg-cta/5 transition-colors"
              >
                <FileText className="w-4 h-4 text-cta shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-ink">This document only</div>
                  <div className="text-[10px] text-dim">{data.customQuoteId || data.customInvoiceId || data.customPoId || data.name || docId}</div>
                </div>
              </button>
              {docChain && (docChain.records?.quotation || docChain.records?.purchaseOrder || docChain.records?.invoice) && (
                <button
                  onClick={() => queueDownload('chain')}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-line rounded-lg text-left hover:border-cta/40 hover:bg-cta/5 transition-colors"
                >
                  <Download className="w-4 h-4 text-cta shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-ink">Full document chain</div>
                    <div className="text-[10px] text-dim">Quotation + Purchase Order + Invoice as separate PDFs</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden render surface — html2pdf captures StandardPreview for
          records without a stored pdfUrl */}
      {pdfQueue.length > 0 && !pdfQueue[0].url && createPortal(
        <div style={{ position: 'fixed', left: -10000, top: 0, width: 794, zIndex: -1 }}>
          <div ref={pdfGenRef} style={{ width: 794, background: '#fff' }}>
            <StandardPreview
              quote={normalizeDoc(pdfQueue[0].record, pdfQueue[0].docType, 'client')}
              company={DEFAULT_COMPANY}
              docType={pdfQueue[0].docType}
              terms={pdfQueue[0].record.termsAndConditions}
              notes={pdfQueue[0].record.customerNotes}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default DocumentThumbnail;
