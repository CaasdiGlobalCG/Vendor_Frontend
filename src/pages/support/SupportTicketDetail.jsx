import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Loader2, AlertCircle, Star,
  Tag, Clock, User, Hash, ChevronDown, ChevronUp, X, Paperclip, FileText,
} from 'lucide-react';
import { getTicket, addMessage, rateTicket, reopenTicket } from '../../services/supportApi';

/* ── constants ───────────────────────────────────────────── */
const STATUS_META = {
  open:        { label: 'Open',        pill: 'bg-emerald-50 text-[#095b49] border border-emerald-100' },
  in_progress: { label: 'In Progress', pill: 'bg-violet-50 text-violet-700 border border-violet-100' },
  resolved:    { label: 'Resolved',    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  closed:      { label: 'Closed',      pill: 'bg-gray-100 text-gray-500 border border-gray-200' },
};
const PRIORITY_META = {
  urgent: 'bg-red-50 text-red-600 border border-red-100',
  high:   'bg-orange-50 text-orange-600 border border-orange-100',
  medium: 'bg-amber-50 text-amber-600 border border-amber-100',
  low:    'bg-gray-50 text-gray-500 border border-gray-100',
};
const CSAT_LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];
const CSAT_COLORS = ['', 'text-red-500', 'text-orange-500', 'text-amber-500', 'text-lime-500', 'text-emerald-500'];

/* ── helpers ─────────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}
function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

/* ── CSAT ────────────────────────────────────────────────── */
function CsatBlock({ ticketId, existing }) {
  const [hover, setHover]     = useState(0);
  const [rating, setRating]   = useState(existing || 0);
  const [saved, setSaved]     = useState(!!existing);
  const [loading, setLoading] = useState(false);

  const submit = async (val) => {
    if (saved) return;
    setRating(val);
    setLoading(true);
    try {
      await rateTicket(ticketId, val);
      setSaved(true);
    } catch(_) {
      setRating(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-4 mb-4 mt-2 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 text-center">
      <p className="text-xs font-semibold text-[#095b49] uppercase tracking-wide mb-0.5">Rate this experience</p>
      <p className="text-sm font-medium text-gray-700 mb-3">How would you rate the support you received?</p>
      <div className="flex justify-center gap-2 mb-2">
        {[1,2,3,4,5].map(n => (
          <button key={n} disabled={saved || loading}
            onMouseEnter={() => !saved && setHover(n)}
            onMouseLeave={() => !saved && setHover(0)}
            onClick={() => submit(n)}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition ${
              saved
                ? n <= rating ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-300'
                : n <= (hover || rating) ? 'bg-amber-400 text-white scale-110' : 'bg-white border border-gray-200 text-gray-300 hover:border-amber-300'
            }`}>
            <Star size={16} fill={n <= (saved ? rating : hover || rating) ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      {(hover || rating) > 0 && (
        <p className={`text-xs font-semibold ${CSAT_COLORS[hover || rating]}`}>{CSAT_LABELS[hover || rating]}</p>
      )}
      {saved && <p className="text-xs text-gray-400 mt-1">Thank you for your feedback!</p>}
    </div>
  );
}

/* ── InfoRow ─────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function SupportTicketDetail({
  ticketId: propId,
  isPanel = false,
  onClose,
}) {
  const { ticketId: paramId } = useParams();
  const navigate              = useNavigate();
  const ticketId              = propId || paramId;
  const threadRef             = useRef(null);

  const [ticket, setTicket]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [reply, setReply]       = useState('');
  const [files, setFiles]       = useState([]);
  const [sending, setSending]   = useState(false);
  const [sendErr, setSendErr]   = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const fileRef                 = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getTicket(ticketId);
      setTicket(res.ticket);
      setMessages(res.messages || []);
    } catch (err) {
      setError(err.message || 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ticketId) return;
    setTicket(null);
    setMessages([]);
    setReply('');
    setSendErr('');
    load();
    // Gap 1: poll for new agent replies every 15 seconds
    const pollId = setInterval(() => {
      getTicket(ticketId)
        .then(res => { setTicket(res.ticket); setMessages(res.messages || []); })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(pollId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  const handleBack = () => {
    if (isPanel && onClose) onClose();
    else navigate('/VendorDashboard/support');
  };

  const handleSend = async () => {
    if (!reply.trim() && files.length === 0) return;
    setSending(true);
    setSendErr('');
    try {
      const res = await addMessage(ticketId, reply.trim(), files);
      setMessages(prev => [...prev, res.message]);
      setReply('');
      setFiles([]);
    } catch (err) {
      setSendErr(err.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const handleReopen = async () => {
    if (reopening) return;
    setReopening(true);
    try {
      await reopenTicket(ticketId);
      await load();
    } catch (err) {
      console.error('[SupportTicketDetail] reopen failed:', err);
    } finally {
      setReopening(false);
    }
  };

  const isResolved = ticket && ticket.status === 'resolved';
  const isTerminal = ticket && ['resolved', 'closed'].includes(ticket.status);
  const s  = ticket ? (STATUS_META[ticket.status] || STATUS_META.open) : null;
  const pp = ticket ? (PRIORITY_META[ticket.priority] || PRIORITY_META.medium) : null;

  /* ── loading ─── */
  if (loading) {
    const cls = isPanel
      ? 'w-full h-full flex items-center justify-center bg-white'
      : 'min-h-screen bg-[#f7f8fc] flex items-center justify-center';
    return <div className={cls}><Loader2 size={28} className="text-[#095b49] animate-spin" /></div>;
  }

  /* ── error ─── */
  if (error || !ticket) {
    const cls = isPanel
      ? 'w-full h-full flex flex-col items-center justify-center bg-white gap-3 px-6'
      : 'min-h-screen bg-[#f7f8fc] flex items-center justify-center';
    return (
      <div className={cls}>
        {!isPanel && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm w-full text-center">
            <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-4">{error || 'Ticket not found.'}</p>
            <button onClick={handleBack} className="px-5 py-2.5 bg-[#095b49] text-white text-sm font-semibold rounded-xl hover:bg-[#074a3c] transition">
              Back to Support
            </button>
          </div>
        )}
        {isPanel && (
          <>
            <AlertCircle size={24} className="text-red-400" />
            <p className="text-sm text-gray-600 text-center">{error || 'Ticket not found.'}</p>
            <button onClick={handleBack} className="text-xs text-[#095b49] underline">Close</button>
          </>
        )}
      </div>
    );
  }

  /* ── shared message thread ───────────────────────────── */
  const messageList = [...messages]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(msg => {
    const isUser = msg.senderType === 'customer' || msg.senderType === 'vendor_user';
    return (
      <div key={msg.messageId} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-[#095b49] to-[#074a3c] flex items-center justify-center text-white text-[10px] font-bold mt-1">
            {initials(msg.senderName || 'Agent')}
          </div>
        )}
        <div className={`max-w-[72%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#095b49] text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
              : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
          }`}>
            {msg.content || msg.body}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {msg.attachments.map((att, i) => (
                  /^image\//.test(att.type)
                    ? <img key={i} src={att.url} alt={att.name}
                        className="rounded-xl max-w-full max-h-44 object-cover block mt-1" />
                    : <a key={i} href={att.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs underline underline-offset-2 opacity-80 hover:opacity-100">
                        <FileText size={11} />{att.name}
                      </a>
                ))}
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400 px-1">{fmt(msg.createdAt)}</span>
        </div>
      </div>
    );
  });

  const replyBar = !isTerminal && (
    <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white">
      {sendErr && (
        <p className="text-xs text-red-500 mb-2 flex items-center gap-1.5">
          <AlertCircle size={11} />{sendErr}
        </p>
      )}
      {/* Selected file chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-[#095b49] text-[11px] font-medium rounded-lg px-2 py-0.5">
              <FileText size={10} />{f.name}
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                className="ml-0.5 text-emerald-400 hover:text-[#095b49]"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          className="hidden"
          onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
        {/* Textarea with paperclip embedded inside at bottom-left */}
        <div className="relative flex-1 bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#095b49]/20 focus-within:border-[#095b49]/40 transition overflow-hidden">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
            placeholder="Type your reply… (Ctrl+Enter to send)"
            rows={isPanel ? 2 : 3}
            className="w-full bg-transparent px-3.5 pt-2.5 pb-8 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none"
          />
          <div className="absolute bottom-1.5 left-2">
            <button onClick={() => fileRef.current?.click()}
              title="Attach file"
              className="h-6 w-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#095b49] hover:bg-emerald-50 transition">
              <Paperclip size={13} />
            </button>
          </div>
        </div>
        <button onClick={handleSend} disabled={sending || (!reply.trim() && files.length === 0)}
          className="h-10 w-10 rounded-xl bg-[#095b49] text-white flex items-center justify-center hover:bg-[#074a3c] disabled:opacity-40 transition flex-shrink-0">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );

  const resolvedFooter = isTerminal && (
    <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3 bg-white flex items-center justify-between gap-3">
      <p className="text-xs text-gray-400">This ticket is {ticket.status}. <button onClick={handleBack} className="text-[#095b49] hover:underline">{isPanel ? 'Close' : 'Back to all tickets'}</button></p>
      <button onClick={handleReopen} disabled={reopening}
        className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition disabled:opacity-50">
        {reopening ? 'Reopening…' : 'Reopen Ticket'}
      </button>
    </div>
  );

  /* ════════════════════════════════════════════════════════
     PANEL MODE (lg split-pane)
  ════════════════════════════════════════════════════════ */
  if (isPanel) {
    return (
      <div className="w-full flex flex-col overflow-hidden bg-white">
        {/* Panel top bar */}
        <div className="flex-shrink-0 px-4 h-13 min-h-[52px] border-b border-gray-100 flex items-center gap-2.5 bg-white">
          <button onClick={handleBack}
            className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition flex-shrink-0">
            <X size={14} />
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">{ticket.ticketId}</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{ticket.subject}</span>
          </div>
          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.pill}`}>{s.label}</span>
        </div>

        {/* Info strip */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-50 bg-gray-50/60 flex items-center gap-3 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pp}`}>{ticket.priority}</span>
          {ticket.teamLabel && <span className="text-[11px] text-gray-500">{ticket.teamLabel}</span>}
          {ticket.sourceRecordId && <span className="text-[11px] font-mono text-gray-400">Ref: {ticket.sourceRecordId}</span>}
          {ticket.createdAt && (
            <span className="text-[11px] text-gray-400">
              {new Date(ticket.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
            </span>
          )}
        </div>

        {/* Thread — fills remaining height */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No messages yet.</p>
          )}
          {messageList}
          {isResolved && <CsatBlock ticketId={ticketId} existing={ticket.satisfactionRating || ticket.csatRating} />}
        </div>

        {replyBar}
        {resolvedFooter}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     PAGE MODE (full page / mobile)
  ════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#f7f8fc] flex flex-col">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={handleBack}
            className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition flex-shrink-0">
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-mono text-gray-400 flex-shrink-0">{ticket.ticketId}</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{ticket.subject}</span>
          </div>
          <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${s.pill}`}>{s.label}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-5">
        {/* Thread column */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div ref={threadRef} className="overflow-y-auto px-4 py-5 space-y-4" style={{minHeight: '260px', maxHeight: '60vh'}}>
              {messages.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">No messages yet.</p>
              )}
              {messageList}
              {isResolved && <CsatBlock ticketId={ticketId} existing={ticket.satisfactionRating || ticket.csatRating} />}
            </div>
            {replyBar}
            {resolvedFooter}
          </div>
        </div>

        {/* Info sidebar */}
        <div className="lg:w-64 flex-shrink-0 space-y-3">
          <button onClick={() => setInfoOpen(v => !v)}
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-100 text-sm font-semibold text-gray-700 shadow-sm">
            Ticket Details
            {infoOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4 ${infoOpen ? 'block' : 'hidden lg:block'}`}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ticket Info</p>
            <InfoRow icon={Hash} label="ID"><span className="font-mono text-xs text-gray-700">{ticket.ticketId}</span></InfoRow>
            <InfoRow icon={Tag} label="Status"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.pill}`}>{s.label}</span></InfoRow>
            <InfoRow icon={Tag} label="Priority"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pp}`}>{ticket.priority}</span></InfoRow>
            <InfoRow icon={User} label="Team"><span className="text-xs text-gray-700">{ticket.teamLabel || ticket.assignedTeam || '—'}</span></InfoRow>
            {ticket.sourceRecordId && (
              <InfoRow icon={Hash} label="Ref."><span className="font-mono text-xs text-gray-700">{ticket.sourceRecordId}</span></InfoRow>
            )}
            <InfoRow icon={Clock} label="Created">
              <span className="text-xs text-gray-500">
                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}
              </span>
            </InfoRow>
            {ticket.updatedAt && (
              <InfoRow icon={Clock} label="Updated">
                <span className="text-xs text-gray-500">
                  {new Date(ticket.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                </span>
              </InfoRow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
