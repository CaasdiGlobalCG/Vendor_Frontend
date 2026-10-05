import React, { useContext, useState, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Pencil, Send, Landmark, Check, X, Eye } from 'lucide-react';
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
    doc = { ...doc, items, subTotal: items.reduce((s, i) => s + (Number(i.amount) || 0), 0) };
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

// Bidirectional canvas connector, same look as ElementNode handles.
const NodeHandles = ({ isConnectable = true }) =>
  ['top', 'right', 'bottom', 'left'].map((pos) => (
    <React.Fragment key={pos}>
      <Handle
        type="source"
        position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
        id={`${pos}-out`}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
        id={`${pos}-in`}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        isConnectable={isConnectable}
      />
    </React.Fragment>
  ));

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

// Shared node renderer: header + actions + real document. Replaces the generic
// editable card for quotation/invoice/credit-note/purchase-order nodes.
export function DocumentNode({ id, data, selected, docType, title, icon: Icon, isConnectable }) {
  const { currentUser } = useContext(VendorContext) || {};
  const [localStatus, setLocalStatus] = useState((data.status || 'draft').toString());
  const [stage, setStage] = useState(data.workflowStage || 'vendor');
  const [busy, setBusy] = useState('');

  const role = getViewerRole(currentUser);

  // ---- Finance commission editor (item-wise % -> clientRate/clientAmount) ----
  const items = Array.isArray(data.items) ? data.items : [];
  const [showCommissionEditor, setShowCommissionEditor] = useState(false);
  const [commissionMap, setCommissionMap] = useState(() =>
    items.reduce((m, item, i) => ({ ...m, [i]: item.commissionPercent ?? '' }), {})
  );
  const commissionTotal = Number(data.commission?.total) || 0;
  // True once finance has applied commission — gates PM's release to client
  const hasCommission = Boolean(data.commission) ||
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
    const patch = {
      items: nextItems,
      commission: { total, byRole: 'finance', at: new Date().toISOString() }
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
            commission: patch.commission
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
  const statusClass =
    statusLower === 'draft' ? 'bg-surface-hover text-dim' :
    statusLower.includes('pending') || statusLower.includes('review') ? 'bg-warning/10 text-warning' :
    statusLower.includes('approved') || statusLower.includes('paid') ? 'bg-success/10 text-success' :
    'bg-surface-hover text-ink';

  // Vendor-side send endpoints exist only for quotations and invoices
  const canSend = docType === 'quote' || docType === 'invoice';
  const canSendPO = docType === 'po' && Boolean(data.purchaseOrderId || data.id);
  const docId = getDocId(data, docType);
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
      await persistNodeDataPatch(
        id,
        { clientPOFile: result.data?.clientPOFile, poType: 'client', status: 'po_uploaded' },
        undefined,
        data.workspaceId
      );
      alert('PO uploaded — the PM can now raise the purchase order');
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
      await persistNodeDataPatch(id, { poType: 'system' }, undefined, data.workspaceId);
      alert('System PO selected — the PM can now raise the purchase order');
    } catch (err) {
      console.error('Use system PO failed:', err);
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

      // 2) If the client uploaded their own PO file, run the auto-check —
      //    send-to-vendor refuses until it passes or a reason is approved.
      //    Same as the EM dashboard flow: on failure the PM submits a
      //    discrepancy reason, which goes to Finance for approval.
      if (data.clientPOFile) {
        const checkRes = await invoiceFetch(`/api/workspace/quotations/${docId}/auto-check-po`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        }).catch(() => null);
        const check = checkRes ? await checkRes.json().catch(() => ({})) : null;
        const checkData = check?.data;
        if (checkRes && !checkRes.ok) {
          throw new Error(check.message || `Auto-check failed (HTTP ${checkRes.status})`);
        }
        if (checkData && !checkData.passed && checkData.reason?.status !== 'approved') {
          const list = (checkData.discrepancies || [])
            .map((d) => `• ${d.message || d}`)
            .join('\n') || '• Client PO differs from the quotation';
          const reason = window.prompt(
            `Auto-check found discrepancies between the client's PO and the quotation:\n\n${list}\n\n` +
            'Enter a reason to send to Finance for approval (required before the PO can go to the vendor):'
          );
          if (!reason || !reason.trim()) {
            alert('PO was created but not sent — the auto-check failed and no reason was submitted.');
            return;
          }
          const reasonRes = await invoiceFetch(`/api/workspace/quotations/${docId}/po-check-reason`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason.trim() })
          });
          const reasonResult = await reasonRes.json().catch(() => ({}));
          if (!reasonRes.ok || reasonResult.success === false) {
            throw new Error(reasonResult.message || `Reason submit failed (HTTP ${reasonRes.status})`);
          }
          setLocalStatus('PO raised — reason pending finance');
          alert('PO created. Discrepancy reason submitted to Finance — send to vendor once it\'s approved.');
          return;
        }
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
        alert('Purchase order created and sent to vendor for confirmation.');
      } else {
        alert("Purchase order created — it's in Elements → Purchase Orders. Drag it onto the canvas and send it to the vendor.");
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

  // Advance the node's workflow stage so it becomes visible to that role's
  // workspace view. Persisted through the durable HTTP path so it survives
  // reloads and is broadcast to collaborators over the canvas WebSocket.
  const advanceStage = async (nextStage, extraPatch = {}) => {
    setStage(nextStage);
    try {
      await persistNodeDataPatch(id, { workflowStage: nextStage, ...extraPatch }, undefined, data.workspaceId);
    } catch (err) {
      console.error('Failed to persist workflowStage:', err);
    }
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
    setPoBillTo([data.customerName, fmtAddrLines(data.billingAddress || data.customerDetails?.address)]
      .filter(Boolean).join('\n') || DEFAULT_COMPANY.name);
    setPoShipTo(fmtAddrLines(data.shipTo || data.shippingAddress)
      || `${DEFAULT_COMPANY.name}, ${DEFAULT_COMPANY.address}, ${DEFAULT_COMPANY.country}`);
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
      detail: { tab: getInvoiceToolTab(docType), docId }
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
      await advanceStage(hop.stage, { status: hop.status });
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

  const btnClass = 'flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md transition-colors disabled:opacity-50';

  return (
    <div className={`relative group bg-surface rounded-lg border-2 w-[860px] ${selected ? 'border-info' : 'border-line'}`}>
      <NodeHandles isConnectable={isConnectable} />

      <div className="flex items-center justify-between px-4 py-2 border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-ink shrink-0" />
          <span className="font-semibold text-ink text-sm truncate">{data.name || title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 text-[10px] rounded-full bg-surface-hover text-dim`} title="Workspace visibility">
            {STAGE_LABEL[stage] || 'Vendor only'}
          </span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full ${statusClass}`}>
            {localStatus.toUpperCase()}
          </span>

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
              {!(statusLower.includes('approved') || statusLower.includes('rejected')) && (
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
                    onClick={async () => {
                      if (!window.confirm('Reject this document? The PM will see it as rejected.')) return;
                      await callApi('reject');
                    }}
                    disabled={busy !== ''}
                    className={`${btnClass} border border-danger/30 text-danger hover:bg-danger/10`}
                    title="Reject the document"
                  >
                    <X className="w-3 h-3" />
                    {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </>
              )}
              {/* After approving, the client picks a PO path (EM client flow):
                  upload their own PO file, or opt for the system-generated PO */}
              {statusLower.includes('approved') && (
                data.clientPOFile ? (
                  <a
                    href={data.clientPOFile}
                    target="_blank"
                    rel="noreferrer"
                    className={`${btnClass} border border-success/30 text-success`}
                    title="Your uploaded PO"
                  >
                    <Check className="w-3 h-3" />
                    PO ✓
                  </a>
                ) : data.poType === 'system' ? (
                  <span
                    className={`${btnClass} border border-success/30 text-success`}
                    title="You chose the system-generated PO"
                  >
                    <Check className="w-3 h-3" />
                    System PO ✓
                  </span>
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
                )
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
          ) && (
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
        </div>
      </div>

      {/* Finance commission editor — item-wise % that computes clientRate/clientAmount */}
      {role === 'finance' && showCommissionEditor && (
        <div className="border-b border-line bg-canvas px-4 py-3">
          <div className="text-[11px] font-semibold text-ink mb-2">Item-wise commission</div>
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

      <StandardPreview
        quote={normalizeDoc(data, docType, role)}
        company={DEFAULT_COMPANY}
        docType={docType}
        terms={data.termsAndConditions}
        notes={data.customerNotes}
      />

      {/* PM Create PO modal — mirrors EM ClientPOManagement: edit rates/GST,
          remove commission, preview the PO, then Generate & Send to Vendor */}
      {showPOModal && (
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
                    quote={{
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
                      clientRate: undefined,
                      clientAmount: undefined,
                      commissionPercent: undefined,
                    }}
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
        </div>
      )}
    </div>
  );
}

export default DocumentThumbnail;
