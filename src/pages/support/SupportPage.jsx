import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LifeBuoy, Plus, Search, AlertCircle, X, Paperclip,
  FolderOpen, Users, CreditCard, FileText, ShieldCheck, Monitor,
} from 'lucide-react';
import { VendorContext } from '../../context/VendorContext';
import { createTicket, listTickets, listReferenceOptions } from '../../services/supportApi';
import { ListStates, StatusFilterChips, SupportFaqPanel, STATUS_FILTERS, TicketRow } from '../../components/support';
import SupportTicketDetail from './SupportTicketDetail';

const SLIDE_OVER_MIN_WIDTH = 448;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getSlideOverMaxWidth() {
  if (typeof window === 'undefined') return 720;
  return clamp(Math.round(window.innerWidth * 0.5), SLIDE_OVER_MIN_WIDTH, 960);
}

/* ── constants ───────────────────────────────────────────── */
const CATEGORIES = [
  { value: 'general_enquiry', label: 'General Enquiry' },
  { value: 'sales_enquiry', label: 'Sales RFQ / Enquiry' },
  { value: 'sales_quotation', label: 'Sales Quotation' },
  { value: 'sales_purchase_order', label: 'Sales Purchase Order' },
  { value: 'sales_shipment', label: 'Sales Shipment' },
  { value: 'sales_warranty_claim', label: 'Sales Warranty Claim' },
  { value: 'sales_inventory_item', label: 'Sales Inventory Item' },
  { value: 'workspace_credit_note', label: 'Workspace Credit Note' },
  { value: 'project',   label: 'Project Issue' },
  { value: 'workspace', label: 'Workspace & Collab' },
  { value: 'payment',   label: 'Payment & Invoice' },
  { value: 'quotation', label: 'Lead & RFQ' },
  { value: 'vendor',    label: 'Account & KYC' },
  { value: 'tech',      label: 'Technical / System' },
  { value: 'other',     label: 'Other' },
];
const CATEGORY_REFERENCE_META = {
  sales_enquiry: {
    title: 'Linked Sales RFQ',
    referenceType: 'sales_enquiry',
    label: 'Linked Sales RFQ',
    placeholder: 'Choose the sales RFQ this issue is about',
    searchPlaceholder: 'Search sales RFQs',
    empty: 'No sales RFQs are available for your account right now.',
  },
  sales_quotation: {
    title: 'Linked Sales Quotation',
    referenceType: 'sales_quotation',
    label: 'Linked Sales Quotation',
    placeholder: 'Choose the sales quotation this issue is about',
    searchPlaceholder: 'Search sales quotations',
    empty: 'No sales quotations are available for your account right now.',
  },
  sales_purchase_order: {
    title: 'Linked Sales Purchase Order',
    referenceType: 'sales_purchase_order',
    label: 'Linked Sales Purchase Order',
    placeholder: 'Choose the sales purchase order this issue is about',
    searchPlaceholder: 'Search sales purchase orders',
    empty: 'No sales purchase orders are available for your account right now.',
  },
  sales_shipment: {
    title: 'Linked Sales Shipment',
    referenceType: 'sales_shipment',
    label: 'Linked Sales Shipment',
    placeholder: 'Choose the sales shipment this issue is about',
    searchPlaceholder: 'Search shipments by product or tracking ID',
    empty: 'No sales shipments are available for your account right now.',
  },
  sales_warranty_claim: {
    title: 'Linked Sales Warranty Claim',
    referenceType: 'sales_warranty_claim',
    label: 'Linked Sales Warranty Claim',
    placeholder: 'Choose the warranty claim this issue is about',
    searchPlaceholder: 'Search warranty claims by product, claim ID, or order ID',
    empty: 'No sales warranty claims are available for your account right now.',
  },
  sales_inventory_item: {
    title: 'Linked Sales Inventory Item',
    referenceType: 'sales_inventory_item',
    label: 'Linked Sales Inventory Item',
    placeholder: 'Choose the inventory item this issue is about',
    searchPlaceholder: 'Search inventory by product, SKU, or product ID',
    empty: 'No sales inventory items are available for your account right now.',
  },
  workspace_credit_note: {
    title: 'Linked Workspace Credit Note',
    referenceType: 'workspace_credit_note',
    label: 'Linked Workspace Credit Note',
    placeholder: 'Choose the workspace credit note this issue is about',
    searchPlaceholder: 'Search credit notes by number, client, or invoice ID',
    empty: 'No workspace credit notes are available for your account right now.',
  },
  project: {
    title: 'Linked Project',
    referenceType: 'project',
    label: 'Linked Project',
    placeholder: 'Choose the project this issue is about',
    searchPlaceholder: 'Search projects',
    empty: 'No projects are currently available for your account.',
  },
  workspace: {
    title: 'Linked Workspace',
    referenceType: 'workspace',
    label: 'Linked Workspace',
    placeholder: 'Choose the workspace this issue is about',
    searchPlaceholder: 'Search workspaces',
    empty: 'No workspaces are currently available for your account.',
  },
  quotation: {
    title: 'Linked Lead / RFQ',
    referenceType: 'rfq',
    label: 'Linked Lead / RFQ',
    placeholder: 'Choose the lead or RFQ this issue is about',
    searchPlaceholder: 'Search leads or RFQs',
    empty: 'No lead or RFQ records are currently available for your account.',
  },
  vendor: {
    title: 'Linked Account',
    referenceType: 'vendor',
    label: 'Linked Account',
    placeholder: 'Choose the vendor account this issue is about',
    searchPlaceholder: 'Search vendor account',
    empty: 'Your vendor account could not be loaded right now.',
  },
};

const FAQ_ITEMS = [
  {
    icon: FolderOpen,
    iconBg: 'bg-surface-hover',
    iconColor: 'text-success',
    q: 'How do I respond to a lead / RFQ?',
    a: "Open the RFQ from your Leads inbox, click \"Submit Quotation\", fill in pricing and delivery terms, then hit Send. The client's team is notified instantly.",
  },
  {
    icon: Users,
    iconBg: 'bg-surface-hover',
    iconColor: 'text-ink',
    q: 'How do I access a shared Workspace?',
    a: 'Workspace invitations appear under Workspace › My Workspaces. Accept the invite and the shared project board, files, and chat become available.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-surface-hover',
    iconColor: 'text-ink',
    q: 'How do I update my KYC / company documents?',
    a: 'Go to Profile › Verification and upload the new documents. Our team reviews updates within 1–2 business days.',
  },
  {
    icon: CreditCard,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    q: 'Where can I download my invoices and payment history?',
    a: 'Navigate to Payments › Invoices. You can filter by date range and export any invoice as PDF.',
  },
  {
    icon: FileText,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    q: 'My vendor profile is still "Under Review" — what should I do?',
    a: 'Reviews normally complete within 24 hours. If it has been longer, raise a ticket under Account & KYC and include your Vendor ID.',
  },
  {
    icon: Monitor,
    iconBg: 'bg-canvas',
    iconColor: 'text-dim',
    q: 'I found a technical bug — how do I report it?',
    a: 'Raise a ticket under Technical / System. Include the page URL, browser version, and a screenshot if possible so our Tech Ops team can reproduce and fix it quickly.',
  },
];

/* ── responsive hook ─────────────────────────────────────── */
function useIsLarge() {
  const [val, setVal] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const h = () => setVal(window.innerWidth >= 1024);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return val;
}

/* ── Create Ticket Slide-over ────────────────────────────── */
function CreateTicketSlideOver({ onClose, onCreated, defaultCategory, defaultRefId, vendorUser }) {
  const initialReferenceMeta = CATEGORY_REFERENCE_META[defaultCategory] || null;
  const [form, setForm] = useState({
    subject: '', description: '', priority: 'medium',
    category:       defaultCategory || 'project',
    sourceRecordId: defaultRefId    || '',
    referenceType:  initialReferenceMeta?.referenceType || '',
  });
  const [files, setFiles]     = useState([]);
  const fileInputRef           = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [referenceOptions, setReferenceOptions] = useState([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const [selectedReference, setSelectedReference] = useState(null);
  const [panelWidth, setPanelWidth] = useState(() => SLIDE_OVER_MIN_WIDTH);
  const dragStateRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const removeFile = (i) => setFiles(prev => prev.filter((_, j) => j !== i));
  const referenceMeta = CATEGORY_REFERENCE_META[form.category] || null;

  useEffect(() => {
    const handleResize = () => {
      setPanelWidth((current) => clamp(current, SLIDE_OVER_MIN_WIDTH, getSlideOverMaxWidth()));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const delta = dragState.startX - event.clientX;
      setPanelWidth(clamp(dragState.startWidth + delta, SLIDE_OVER_MIN_WIDTH, getSlideOverMaxWidth()));
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
    };
  }, []);

  const handleResizeStart = (event) => {
    dragStateRef.current = { startX: event.clientX, startWidth: panelWidth };
    document.body.style.setProperty('user-select', 'none');
    document.body.style.setProperty('cursor', 'col-resize');
  };

  const handleCategoryChange = (value) => {
    setForm((prev) => ({
      ...prev,
      category: value,
      sourceRecordId: value === prev.category ? prev.sourceRecordId : '',
      referenceType: CATEGORY_REFERENCE_META[value]?.referenceType || '',
    }));
    setReferenceSearch('');
    setReferenceOptions([]);
    setReferenceError('');
    setSelectedReference(value === form.category ? selectedReference : null);
  };

  const handleReferenceSelect = (option) => {
    setSelectedReference(option);
    setField('sourceRecordId', option.value || '');
    setField('referenceType', option.referenceType || referenceMeta?.referenceType || '');
  };

  useEffect(() => {
    let isActive = true;
    const nextMeta = CATEGORY_REFERENCE_META[form.category] || null;

    setForm((prev) => ({
      ...prev,
      referenceType: nextMeta?.referenceType || '',
      sourceRecordId: nextMeta ? prev.sourceRecordId : '',
    }));

    if (!nextMeta) {
      setReferenceOptions([]);
      setReferenceLoading(false);
      setReferenceError('');
      setSelectedReference(null);
      return () => {
        isActive = false;
      };
    }

    setReferenceLoading(true);
    setReferenceError('');

    listReferenceOptions(form.category, referenceSearch, 5)
      .then((response) => {
        if (!isActive) return;
        const loadedOptions = Array.isArray(response.options) ? [...response.options] : [];
        const normalizedDefaultRef = String(defaultRefId || '').trim();

        if (normalizedDefaultRef && !loadedOptions.some((option) => option.value === normalizedDefaultRef)) {
          loadedOptions.unshift({
            value: normalizedDefaultRef,
            label: normalizedDefaultRef,
            description: 'Prefilled from the page where you opened support.',
            referenceType: nextMeta.referenceType,
            context: null,
          });
        }

        setReferenceOptions(loadedOptions);
        setForm((prev) => {
          const hasSelectedValue = prev.sourceRecordId && loadedOptions.some((option) => option.value === prev.sourceRecordId);
          const nextValue = hasSelectedValue
            ? prev.sourceRecordId
            : normalizedDefaultRef || (loadedOptions.length === 1 ? loadedOptions[0].value : '');
          return {
            ...prev,
            referenceType: nextMeta.referenceType,
            sourceRecordId: nextValue,
          };
        });
        setSelectedReference((current) => {
          if (current?.value) {
            const matchedCurrent = loadedOptions.find((option) => option.value === current.value && option.referenceType === current.referenceType);
            if (matchedCurrent) return matchedCurrent;
          }
          if (normalizedDefaultRef) {
            return loadedOptions.find((option) => option.value === normalizedDefaultRef) || current;
          }
          if (loadedOptions.length === 1) return loadedOptions[0];
          return current && nextMeta.referenceType === current.referenceType ? current : null;
        });
      })
      .catch((err) => {
        if (!isActive) return;
        setReferenceOptions([]);
        setReferenceError(err.message || 'Failed to load linked records.');
      })
      .finally(() => {
        if (isActive) setReferenceLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [defaultRefId, form.category, referenceSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError('Subject and description are required.');
      return;
    }
    if (referenceMeta && !form.sourceRecordId.trim()) {
      setError(`Please choose a ${referenceMeta.label.toLowerCase()} before submitting.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createTicket({
        subject:        form.subject.trim(),
        description:    form.description.trim(),
        priority:       form.priority,
        sourceModule:   form.category,
        sourceRecordId: form.sourceRecordId.trim() || undefined,
        referenceType:  selectedReference?.referenceType || form.referenceType || undefined,
        referenceId:    form.sourceRecordId.trim() || undefined,
        referenceLabel: selectedReference?.label || undefined,
        referenceContext: selectedReference?.context ? JSON.stringify(selectedReference.context) : undefined,
        portalType:     'vendor',
        raisedByName:   vendorUser?.name  || '',
        raisedByEmail:  vendorUser?.email || '',
      }, files);
      onCreated(res.ticket);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full bg-surface shadow-2xl flex flex-col"
        style={{ width: `${panelWidth}px`, maxWidth: '100vw', animation:'slideInRight .22s cubic-bezier(.4,0,.2,1)' }}>
        <button
          type="button"
          onPointerDown={handleResizeStart}
          className="absolute left-0 top-0 hidden h-full w-4 -translate-x-1/2 cursor-col-resize lg:flex items-center justify-center"
          aria-label="Resize ticket form"
          title="Drag to resize ticket form"
        >
          <span className="h-24 w-1 rounded-full bg-surface-hover transition hover:bg-success/40" />
        </button>
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg,rgb(var(--success)),rgb(var(--success)))'}}>
              <LifeBuoy size={15} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-ink">New Support Ticket</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-dim hover:text-dim transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-danger/10 border border-danger/10 rounded-xl px-4 py-3 text-sm text-danger">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-dim mb-2 uppercase tracking-wide">Issue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => handleCategoryChange(c.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition text-left ${
                    form.category === c.value
                      ? 'bg-success text-white border-success'
                      : 'bg-surface text-dim border-line hover:border-success/30 hover:text-success'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-dim mb-2 uppercase tracking-wide">Subject</label>
            <input type="text" value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder="Briefly describe your issue"
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-success/20 focus:border-success/60 transition placeholder:text-dim" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dim mb-2 uppercase tracking-wide">Details</label>
            <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Provide as much detail as possible — the more context, the faster we can help."
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-success/20 focus:border-success/60 transition resize-none placeholder:text-dim" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dim mb-2 uppercase tracking-wide">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full border border-line rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:border-success/20 focus:border-success/60 transition bg-surface">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              {referenceMeta ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-dim mb-2 uppercase tracking-wide">{referenceMeta.title}</label>
                    <input
                      type="text"
                      value={referenceSearch}
                      onChange={(e) => setReferenceSearch(e.target.value)}
                      placeholder={referenceMeta.searchPlaceholder}
                      className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-success/20 focus:border-success/60 transition placeholder:text-dim"
                    />
                  </div>
                  {referenceLoading ? (
                    <p className="text-xs text-dim">Loading linked records...</p>
                  ) : null}
                  {referenceError ? (
                    <p className="text-xs text-danger">{referenceError}</p>
                  ) : null}
                  {!referenceLoading && !referenceError && referenceOptions.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {referenceOptions.map((option) => {
                        const isSelected = selectedReference?.value === option.value && selectedReference?.referenceType === option.referenceType;
                        return (
                          <button
                            key={option.referenceType + option.value}
                            type="button"
                            onClick={() => handleReferenceSelect(option)}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${isSelected ? 'border-success bg-surface-hover' : 'border-line bg-surface hover:border-success/30'}`}
                          >
                            <p className="text-xs font-semibold text-ink">{option.label || option.value}</p>
                            {option.description ? (
                              <p className="mt-1 text-[11px] text-dim leading-relaxed">{option.description}</p>
                            ) : null}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-dim">{option.value}</span>
                              <span className="rounded-full bg-surface-hover px-1.5 py-0.5 text-[10px] text-dim">Recent 5</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {!referenceError && !referenceLoading && referenceOptions.length === 0 ? (
                    <p className="text-xs text-dim">{referenceMeta.empty}</p>
                  ) : null}
                  {selectedReference ? (
                    <div className="rounded-xl border border-line bg-cta px-3 py-2">
                      <p className="text-xs font-semibold text-success">{selectedReference.label}</p>
                      {selectedReference.description ? (
                        <p className="mt-1 text-[11px] leading-relaxed text-dim">{selectedReference.description}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-dim">
                  This issue type does not need a linked record.
                </div>
              )}
            </div>
          </div>
          {/* File attachments */}
          <div>
            <label className="block text-xs font-semibold text-dim mb-2 uppercase tracking-wide">
              Attachments <span className="normal-case font-normal text-dim">(optional)</span>
            </label>
            <input type="file" multiple ref={fileInputRef} className="hidden"
              onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-line rounded-xl text-xs text-dim hover:border-success/40 hover:text-success transition w-full justify-center">
              <Paperclip size={13} />Attach files
            </button>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 bg-surface-hover rounded-lg text-[11px] text-dim">
                    {f.name}
                    <button type="button" onClick={() => removeFile(i)}
                      className="text-dim hover:text-danger ml-0.5 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-line flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-line rounded-xl text-sm font-semibold text-dim hover:bg-canvas transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 bg-success text-white rounded-xl text-sm font-semibold hover:bg-success disabled:opacity-50 transition">
            {loading ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </div>

        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function SupportPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const isLarge    = useIsLarge();

  const { currentUser, vendorData } = useContext(VendorContext);
  const vd = vendorData?.vendorDetails || {};
  const vendorUser = {
    name:  [vd.firstName, vd.lastName].filter(Boolean).join(' ').trim()
           || vd.vendorName || vd.companyName || vd.primaryContactName || currentUser?.name || '',
    email: currentUser?.email || vd.primaryContactEmail || '',
  };

  // Read ?module= and ?ref= URL params for pre-filling the create-ticket form
  const urlParams  = new URLSearchParams(location.search);
  const urlModule  = urlParams.get('module') || undefined;
  const urlRef     = urlParams.get('ref')    || undefined;

  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedId, setSelectedId]     = useState(null);

  const clearSupportPrefill = useCallback(() => {
    if (!urlModule && !urlRef) return;
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('module');
    nextParams.delete('ref');
    navigate(
      {
        pathname: location.pathname,
        search: nextParams.toString() ? `?${nextParams.toString()}` : '',
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate, urlModule, urlRef]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listTickets();
      setTickets(res.tickets || []);
    } catch (err) {
      setError(err.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!urlModule && !urlRef) return;
    setShowCreate(true);
  }, [urlModule, urlRef]);

  const handleTicketClick = useCallback((ticketId) => {
    // Gap 9: mark as read when user opens the ticket
    localStorage.setItem(`support_read_${ticketId}`, new Date().toISOString());
    if (isLarge) setSelectedId(ticketId);
    else navigate(`/VendorDashboard/support/${ticketId}`);
  }, [isLarge, navigate]);

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = !search || (
      t.ticketId?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q)
    );
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all:         tickets.length,
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => ['resolved','closed'].includes(t.status)).length,
  };

  return (
    <div className="flex min-h-full flex-col bg-canvas lg:h-full">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-surface-hover">
            <LifeBuoy size={16} className="text-ink" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">Support Centre</p>
            <h1 className="truncate text-sm font-bold text-ink">How can we help?</h1>
          </div>

          <div className="relative ml-auto w-full sm:w-64">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets…"
              aria-label="Search tickets"
              className="w-full rounded-xl border border-line bg-canvas py-2 pl-9 pr-3 text-xs text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-ink/20" />
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-cta px-3.5 py-2 text-xs font-bold text-cta-foreground transition-opacity hover:opacity-85">
            <Plus size={13} aria-hidden="true" />New Ticket
          </button>
        </div>
      </header>

      {/* ── Main body — always two-column on lg ───────── */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-3 px-4 py-4 sm:px-6 lg:min-h-0 lg:flex-row">

        {/* ── Left: List column ──────────────────────── */}
        <div className="flex flex-col lg:min-h-0 lg:w-[38%] lg:flex-shrink-0">
          {/* Filter chips */}
          <div className="mb-3 flex flex-shrink-0 flex-wrap items-center gap-1.5">
            <StatusFilterChips
              filters={STATUS_FILTERS}
              value={filterStatus}
              counts={counts}
              onChange={setFilterStatus}
            />
            <button onClick={() => setShowCreate(true)}
              className="ml-auto flex items-center gap-1 rounded-full bg-cta px-3 py-1.5 text-xs font-semibold text-cta-foreground lg:hidden">
              <Plus size={11} aria-hidden="true" />New
            </button>
          </div>

          {/* Ticket list scroll area */}
          <div className="space-y-2 pb-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-0.5">
            <ListStates
              loading={loading}
              error={error}
              empty={!loading && !error && filtered.length === 0}
              onRetry={load}
              emptyTitle={search ? 'No results' : 'No tickets yet'}
              emptyHint={search ? 'Try a different keyword.' : 'Our team is ready to help you.'}
            />
            {!loading && !error && filtered.map(ticket => {
              // Gap 9: unread dot — new agent activity since user last opened this ticket
              const lastRead = localStorage.getItem(`support_read_${ticket.ticketId}`);
              const hasUnread = !['resolved','closed'].includes(ticket.status) &&
                (!lastRead || (ticket.updatedAt && ticket.updatedAt > lastRead));
              return (
                <TicketRow
                  key={ticket.ticketId}
                  ticket={ticket}
                  active={selectedId === ticket.ticketId}
                  unread={hasUnread}
                  onSelect={handleTicketClick}
                />
              );
            })}
          </div>
        </div>

        {/* ── Right: FAQ or Detail panel ─────────────── */}
        <div className="hidden flex-1 lg:flex lg:min-h-0">
          {selectedId ? (
            <div className="flex w-full overflow-hidden rounded-xl border border-line bg-surface lg:min-h-0">
              <SupportTicketDetail
                ticketId={selectedId}
                isPanel
                onClose={() => setSelectedId(null)}
                onTicketUpdate={(updated) => setTickets(prev => prev.map(t => t.ticketId === updated.ticketId ? { ...t, ...updated } : t))}
              />
            </div>
          ) : (
            <SupportFaqPanel
              faqItems={FAQ_ITEMS}
              onNewTicket={() => setShowCreate(true)}
              className="w-full"
            />
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTicketSlideOver
          onClose={() => {
            setShowCreate(false);
            clearSupportPrefill();
          }}
          defaultCategory={urlModule}
          defaultRefId={urlRef}
          vendorUser={vendorUser}
          onCreated={(ticket) => {
            setTickets(prev => [ticket, ...prev]);
            setShowCreate(false);
            clearSupportPrefill();
            if (isLarge) setSelectedId(ticket.ticketId);
            else navigate(`/VendorDashboard/support/${ticket.ticketId}`);
          }}
        />
      )}
    </div>
  );
}
