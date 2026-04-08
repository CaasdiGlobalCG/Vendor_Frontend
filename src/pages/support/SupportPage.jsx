import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LifeBuoy, Plus, Search, Loader2, ChevronRight, ChevronDown,
  AlertCircle, Clock, CheckCircle2, MessageSquare, X, Paperclip,
  FolderOpen, Users, CreditCard, FileText, ShieldCheck, Monitor,
} from 'lucide-react';
import { VendorContext } from '../../context/VendorContext';
import { createTicket, listTickets, listReferenceOptions } from '../../services/supportApi';
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
const STATUS_META = {
  open:        { label: 'Open',        pill: 'bg-emerald-50 text-[#095b49]',   bar: 'bg-[#095b49]' },
  in_progress: { label: 'In Progress', pill: 'bg-violet-50 text-violet-700',  bar: 'bg-violet-500' },
  resolved:    { label: 'Resolved',    pill: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  closed:      { label: 'Closed',      pill: 'bg-gray-100 text-gray-500',     bar: 'bg-gray-300' },
};
const PRIORITY_META = {
  urgent: { pill: 'bg-red-50 text-red-600 border border-red-100' },
  high:   { pill: 'bg-orange-50 text-orange-600 border border-orange-100' },
  medium: { pill: 'bg-amber-50 text-amber-600 border border-amber-100' },
  low:    { pill: 'bg-gray-50 text-gray-500 border border-gray-100' },
};
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
    iconBg: 'bg-emerald-50',
    iconColor: 'text-[#095b49]',
    q: 'How do I respond to a lead / RFQ?',
    a: "Open the RFQ from your Leads inbox, click \"Submit Quotation\", fill in pricing and delivery terms, then hit Send. The client's team is notified instantly.",
  },
  {
    icon: Users,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    q: 'How do I access a shared Workspace?',
    a: 'Workspace invitations appear under Workspace › My Workspaces. Accept the invite and the shared project board, files, and chat become available.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    q: 'How do I update my KYC / company documents?',
    a: 'Go to Profile › Verification and upload the new documents. Our team reviews updates within 1–2 business days.',
  },
  {
    icon: CreditCard,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    q: 'Where can I download my invoices and payment history?',
    a: 'Navigate to Payments › Invoices. You can filter by date range and export any invoice as PDF.',
  },
  {
    icon: FileText,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    q: 'My vendor profile is still "Under Review" — what should I do?',
    a: 'Reviews normally complete within 24 hours. If it has been longer, raise a ticket under Account & KYC and include your Vendor ID.',
  },
  {
    icon: Monitor,
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-600',
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

/* ── FAQ Accordion Item ──────────────────────────────────── */
function FaqItem({ icon: Icon, iconBg, iconColor, q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border transition ${open ? 'border-[#095b49]/20 bg-emerald-50/40' : 'border-gray-100 bg-white'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={14} className={iconColor} />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800 leading-snug">{q}</span>
        <ChevronDown size={14} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pl-[52px]">
          <p className="text-xs text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

/* ── Welcome / FAQ Panel ─────────────────────────────────── */
function WelcomePanel({ onNewTicket }) {
  return (
    <div className="w-full h-full overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
      {/* Top area */}
      <div className="px-6 pt-6 pb-5 border-b border-gray-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#095b49,#043228)'}}>
            <LifeBuoy size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Need help?</p>
            <p className="text-sm font-bold text-gray-900">Browse common questions below</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Can't find what you need? Our support team is available on business days and typically responds within a few hours.
        </p>
        <button
          onClick={onNewTicket}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-[#095b49] hover:bg-[#074a3c] text-white text-sm font-semibold rounded-xl transition">
          <Plus size={14} />
          Open a Support Ticket
        </button>
      </div>

      {/* FAQ list */}
      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-3">Frequently Asked Questions</p>
        {FAQ_ITEMS.map((item, i) => (
          <FaqItem key={i} {...item} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">Mon – Fri · 9 AM – 6 PM</span>
        <span className="text-[11px] text-[#095b49] font-medium">Vendor Support Team</span>
      </div>
    </div>
  );
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
        className="relative w-full bg-white shadow-2xl flex flex-col"
        style={{ width: `${panelWidth}px`, maxWidth: '100vw', animation:'slideInRight .22s cubic-bezier(.4,0,.2,1)' }}>
        <button
          type="button"
          onPointerDown={handleResizeStart}
          className="absolute left-0 top-0 hidden h-full w-4 -translate-x-1/2 cursor-col-resize lg:flex items-center justify-center"
          aria-label="Resize ticket form"
          title="Drag to resize ticket form"
        >
          <span className="h-24 w-1 rounded-full bg-gray-200 transition hover:bg-[#095b49]/40" />
        </button>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#095b49,#043228)'}}>
              <LifeBuoy size={15} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">New Support Ticket</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Issue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => handleCategoryChange(c.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition text-left ${
                    form.category === c.value
                      ? 'bg-[#095b49] text-white border-[#095b49]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#095b49]/30 hover:text-[#095b49]'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Subject</label>
            <input type="text" value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder="Briefly describe your issue"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#095b49]/20 focus:border-[#095b49]/60 transition placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Details</label>
            <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Provide as much detail as possible — the more context, the faster we can help."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#095b49]/20 focus:border-[#095b49]/60 transition resize-none placeholder:text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#095b49]/20 focus:border-[#095b49]/60 transition bg-white">
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
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{referenceMeta.title}</label>
                    <input
                      type="text"
                      value={referenceSearch}
                      onChange={(e) => setReferenceSearch(e.target.value)}
                      placeholder={referenceMeta.searchPlaceholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#095b49]/20 focus:border-[#095b49]/60 transition placeholder:text-gray-400"
                    />
                  </div>
                  {referenceLoading ? (
                    <p className="text-xs text-gray-400">Loading linked records...</p>
                  ) : null}
                  {referenceError ? (
                    <p className="text-xs text-red-600">{referenceError}</p>
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
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${isSelected ? 'border-[#095b49] bg-emerald-50' : 'border-gray-200 bg-white hover:border-[#095b49]/30'}`}
                          >
                            <p className="text-xs font-semibold text-gray-900">{option.label || option.value}</p>
                            {option.description ? (
                              <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">{option.description}</p>
                            ) : null}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-gray-400">{option.value}</span>
                              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Recent 5</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {!referenceError && !referenceLoading && referenceOptions.length === 0 ? (
                    <p className="text-xs text-gray-500">{referenceMeta.empty}</p>
                  ) : null}
                  {selectedReference ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                      <p className="text-xs font-semibold text-[#095b49]">{selectedReference.label}</p>
                      {selectedReference.description ? (
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{selectedReference.description}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-3 text-xs text-gray-500">
                  This issue type does not need a linked record.
                </div>
              )}
            </div>
          </div>
          {/* File attachments */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Attachments <span className="normal-case font-normal text-gray-400">(optional)</span>
            </label>
            <input type="file" multiple ref={fileInputRef} className="hidden"
              onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 hover:border-[#095b49]/40 hover:text-[#095b49] transition w-full justify-center">
              <Paperclip size={13} />Attach files
            </button>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-[11px] text-gray-600">
                    {f.name}
                    <button type="button" onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500 ml-0.5 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 bg-[#095b49] text-white rounded-xl text-sm font-semibold hover:bg-[#074a3c] disabled:opacity-50 transition">
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
    <div className="min-h-full lg:h-full flex flex-col bg-[#f7f8fc]">

      {/* ── Compact header card ───────────────────────── */}
      <div className="flex-shrink-0 px-4 sm:px-5 pt-4 pb-3">
        <div className="rounded-2xl px-5 sm:px-6 py-4" style={{background:'linear-gradient(90deg,rgba(9,91,73,1) 0%,rgba(0,0,0,1) 100%)'}}>
          <div className="flex items-center gap-3">
            {/* Left: icon + title */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                <LifeBuoy size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-green-200 font-semibold tracking-widest uppercase leading-none mb-0.5">Support Center</p>
                <h1 className="text-sm font-bold text-white leading-none">How can we help?</h1>
              </div>
            </div>

            {/* Center: search — grows but capped */}
            <div className="relative w-44 sm:w-56 flex-shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets…"
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-sm" />
            </div>

            {/* Right: new ticket — pinned to far right */}
            <button
              onClick={() => setShowCreate(true)}
              className="ml-auto flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex-shrink-0 border border-white/20 backdrop-blur-sm">
              <Plus size={13} />New Ticket
            </button>
          </div>
        </div>
      </div>

      {/* ── Main body — always two-column on lg ───────── */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden gap-3 px-4 sm:px-5 pb-4">

        {/* ── Left: List column ──────────────────────── */}
        <div className="flex flex-col lg:w-[38%] lg:flex-shrink-0 lg:overflow-hidden">
          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap flex-shrink-0 mb-3">
            {[
              { key: 'all',         label: 'All',      Icon: MessageSquare, iconCls: 'text-gray-500' },
              { key: 'open',        label: 'Open',     Icon: AlertCircle,   iconCls: 'text-[#095b49]' },
              { key: 'in_progress', label: 'Active',   Icon: Clock,         iconCls: 'text-violet-500' },
              { key: 'resolved',    label: 'Resolved', Icon: CheckCircle2,  iconCls: 'text-emerald-500' },
            ].map(({ key, label, Icon, iconCls }) => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  filterStatus === key
                    ? 'bg-[#095b49] text-white border-[#095b49] shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#095b49]/30'
                }`}>
                <Icon size={11} className={filterStatus === key ? 'text-white' : iconCls} />
                {label}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filterStatus === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {key === 'resolved' ? counts.resolved : counts[key]}
                </span>
              </button>
            ))}
            <button onClick={() => setShowCreate(true)}
              className="lg:hidden ml-auto flex items-center gap-1 px-3 py-1.5 bg-[#095b49] text-white rounded-full text-xs font-semibold">
              <Plus size={11} />New
            </button>
          </div>

          {/* Ticket list scroll area */}
          <div className="lg:flex-1 lg:overflow-y-auto space-y-2 lg:pr-0.5 pb-2">
            {loading && (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="text-[#095b49] animate-spin" />
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600">
                <AlertCircle size={15} className="flex-shrink-0" />{error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-3 shadow-sm">
                  <LifeBuoy size={20} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700 mb-1 text-sm">{search ? 'No results' : 'No tickets yet'}</p>
                <p className="text-xs text-gray-400 max-w-[180px]">
                  {search ? 'Try a different keyword.' : 'Our team is ready to help you.'}
                </p>
              </div>
            )}
            {!loading && !error && filtered.map(ticket => {
              const s = STATUS_META[ticket.status] || STATUS_META.open;
              const p = PRIORITY_META[ticket.priority] || PRIORITY_META.medium;
              const date = ticket.updatedAt || ticket.createdAt;
              const isSelected = selectedId === ticket.ticketId;
              // Gap 9: unread dot — new agent activity since user last opened this ticket
              const lastRead = localStorage.getItem(`support_read_${ticket.ticketId}`);
              const hasUnread = !['resolved','closed'].includes(ticket.status) &&
                (!lastRead || (ticket.updatedAt && ticket.updatedAt > lastRead));
              return (
                <button
                  key={ticket.ticketId}
                  onClick={() => handleTicketClick(ticket.ticketId)}
                  className={`w-full rounded-2xl border transition group text-left overflow-hidden ${
                    isSelected
                      ? 'bg-emerald-50 border-[#095b49]/30 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-[#095b49]/20 hover:shadow-md'
                  }`}>
                  <div className="flex">
                    <div className={`w-1 flex-shrink-0 ${s.bar}`} />
                    <div className="flex-1 px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[10px] font-mono text-gray-400">{ticket.ticketId}</span>
                            {hasUnread && (
                              <span className="h-2 w-2 rounded-full bg-[#095b49] flex-shrink-0" title="New activity" />
                            )}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${s.pill}`}>{s.label}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${p.pill}`}>{ticket.priority}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {ticket.teamLabel} · {date ? new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : ''}
                          </p>
                        </div>
                        <ChevronRight size={14} className={`mt-0.5 transition flex-shrink-0 ${isSelected ? 'text-[#095b49]' : 'text-gray-300 group-hover:text-[#095b49]/60'}`} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: FAQ or Detail panel ─────────────── */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {selectedId ? (
            <div className="w-full h-full rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
              <SupportTicketDetail
                ticketId={selectedId}
                isPanel
                onClose={() => setSelectedId(null)}
                onTicketUpdate={(updated) => setTickets(prev => prev.map(t => t.ticketId === updated.ticketId ? { ...t, ...updated } : t))}
              />
            </div>
          ) : (
            <WelcomePanel onNewTicket={() => setShowCreate(true)} />
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
