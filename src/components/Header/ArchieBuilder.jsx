import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Briefcase, Loader2, RefreshCw, Rocket, Sparkles, Users2, Wallet, X, FolderKanban } from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { apiFetch, VoiceInputButton } from './aiPanelParts';
import { VendorContext } from '../../context/VendorContext';
import { createTasksFromTemplate, templateErrorMessage } from '../../pages/WorkspacePage/utils/templateApi';
import ArchiePreview from './archie/ArchiePreview';
import { planToBulkTasks, planStats, templateHints, today } from './archie/archiePlan';

/**
 * ArchieBuilder: the screen that opens when the vendor picks Archie (the workspace builder).
 *   1. Choose which accepted lead (PM accepted + collaborative access granted) to build for
 *   2. Describe the project in plain English, in the same message box as the assistant prompt
 *      (Archie may ask a few short questions first)
 *   3. Preview the plan (tasks, steps, elements, connections, BOQ draft) and refine it by chatting.
 *      Nothing is written until the vendor presses "Create in workspace" and confirms.
 *   4. Done: counts + "Go to workspace now".
 */

const STEPS = ['Choose lead', 'Describe', 'Preview & create'];

const MIN_BRIEF_CHARS = 20;

// Values the lead data uses when something isn't known yet; showing them would only add noise.
const isKnown = (v) => Boolean(v) && !/^(tbd|n\/?a|na|none|-+)$/i.test(String(v).trim());

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const inputClass = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-dim focus:border-cta focus:ring-2 focus:ring-cta/30';

const defaultOpenWorkspace = (workspaceId) => window.location.assign(`/VendorDashboard/workspace/${encodeURIComponent(workspaceId)}`);

const Stepper = ({ step, onGo, canGo }) => (
  <ol className="flex items-center gap-2" aria-label="Steps">
    {STEPS.map((label, i) => {
      const state = i < step ? 'done' : i === step ? 'current' : 'todo';
      const clickable = i < step || canGo(i);
      return (
        <li key={label} className="flex items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
          <button
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onGo(i)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              state === 'current' ? 'border-cta bg-cta text-cta-foreground' : state === 'done' ? 'border-line bg-surface text-ink hover:bg-surface-hover' : 'border-line text-dim'
            } disabled:cursor-default`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${state === 'current' ? 'bg-cta-foreground/15' : 'bg-surface-hover'}`}>
              {state === 'done' ? <Check size={10} /> : i + 1}
            </span>
            {label}
          </button>
          {i < STEPS.length - 1 && <span className="h-px w-5 bg-line" aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);

const LeadCard = ({ lead, selected, onSelect }) => {
  const accepted = formatDate(lead.acceptedAt);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(lead.leadId)}
      className={`group relative w-full rounded-2xl border bg-surface p-4 text-left transition-all ${
        selected ? 'border-cta shadow-md ring-2 ring-cta/40' : 'border-line hover:border-cta/60 hover:shadow-sm'
      }`}
    >
      <span className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-cta bg-cta text-cta-foreground' : 'border-line text-transparent'}`}>
        <Check size={12} />
      </span>
      <p className="pr-8 text-[14px] font-semibold text-ink">{lead.title}</p>
      {(lead.projectName || lead.clientName) && (
        <p className="mt-0.5 text-[12px] text-dim">{[lead.projectName && lead.projectName !== lead.title ? lead.projectName : null, lead.clientName].filter(Boolean).join(' · ') || null}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-ink">
        {isKnown(lead.budget) && <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1"><Wallet size={11} />{lead.budget}</span>}
        {isKnown(lead.timeline) && <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1"><Clock size={11} />{lead.timeline}</span>}
        {isKnown(lead.specialization) && <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1"><Briefcase size={11} />{lead.specialization}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[11px] text-dim">
        <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-success" />Accepted by PM{accepted ? ` on ${accepted}` : ''}</span>
        <span className="inline-flex items-center gap-1.5"><Users2 size={12} className="text-success" />Collaborative access granted</span>
        {lead.workspaceTitle && <span className="inline-flex items-center gap-1.5"><FolderKanban size={12} />{lead.workspaceTitle}</span>}
      </div>
    </button>
  );
};

const LeadSkeleton = () => (
  <div className="space-y-3" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="animate-pulse rounded-2xl border border-line bg-surface p-4">
        <div className="h-4 w-1/2 rounded bg-surface-hover" />
        <div className="mt-2 h-3 w-1/3 rounded bg-surface-hover" />
        <div className="mt-4 flex gap-2"><div className="h-6 w-20 rounded-full bg-surface-hover" /><div className="h-6 w-16 rounded-full bg-surface-hover" /></div>
      </div>
    ))}
  </div>
);


/** The same message box as the assistant's own prompt. */
const Composer = ({ value, onChange, onSend, disabled, busy, placeholder, label, sendLabel, interim, onTranscript, hint, autoFocus = true, children }) => (
  <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-line bg-surface shadow-sm transition-colors focus-within:border-ink/30">
    {interim && (
      <div className="flex items-center gap-2 px-4 pt-3"><span className="h-2 w-2 animate-pulse rounded-full bg-danger" /><span className="truncate text-[11px] italic text-dim">{interim}</span></div>
    )}
    <div className="px-4 py-3">
      <label htmlFor={`archie-box-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="sr-only">{label}</label>
      <textarea
        id={`archie-box-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        rows={2}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
            e.preventDefault();
            onSend();
          }
        }}
        className="max-h-56 w-full resize-none border-none bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-dim focus:ring-0 disabled:opacity-60"
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
    <div className="flex items-center justify-between px-4 pb-3 pt-1">
      <div className="flex items-center gap-2">
        <VoiceInputButton onTranscript={onTranscript} disabled={disabled} />
        <span className="text-[11px] text-dim">{hint}</span>
      </div>
      <button
        type="button"
        onClick={onSend}
        aria-label={sendLabel}
        disabled={disabled || busy || value.trim().length === 0}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-cta text-cta-foreground shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
    {children}
  </div>
);

const Bubble = ({ role, children }) => (
  role === 'user' ? (
    <div className="flex justify-end">
      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-cta px-4 py-3 text-[13px] leading-relaxed text-cta-foreground">{children}</div>
    </div>
  ) : (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 overflow-hidden rounded-xl shadow-sm"><AgentAvatar id="archie" size={32} /></div>
      <div className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink">{children}</div>
    </div>
  )
);

const ConfirmDialog = ({ stats, workspaceTitle, startDate, creating, error, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/40 p-4" onClick={creating ? undefined : onCancel}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="archie-confirm-title" aria-describedby="archie-confirm-body" className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <h3 id="archie-confirm-title" className="text-[15px] font-semibold text-ink">Create this in the workspace?</h3>
      <div id="archie-confirm-body" className="mt-2 space-y-3 text-[12px] leading-relaxed text-dim">
        <p>
          This adds <strong className="text-ink">{stats.tasks} tasks</strong>, <strong className="text-ink">{stats.subtasks} steps</strong> and <strong className="text-ink">{stats.elements} elements</strong>
          {stats.connections > 0 ? ` with ${stats.connections} connection${stats.connections === 1 ? '' : 's'}` : ''}
          {stats.boqs > 0 ? `, including ${stats.boqs} BOQ draft${stats.boqs === 1 ? '' : 's'}` : ''} to <strong className="text-ink">{workspaceTitle || 'the collaborative workspace'}</strong>, starting {startDate}.
        </p>
        <p>The PM and anyone else in that workspace will see them. Nothing already there is changed or removed.</p>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-[12px] text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={creating} className="rounded-xl border border-line px-4 py-2 text-[12px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-50">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={creating} className="flex items-center gap-1.5 rounded-xl bg-cta px-4 py-2 text-[12px] font-semibold text-cta-foreground hover:opacity-90 disabled:opacity-60">
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {creating ? 'Creating…' : 'Create in workspace'}
        </button>
      </div>
    </div>
  </div>
);

const ArchieBuilder = ({ onExit, openWorkspace = defaultOpenWorkspace, session = null, onSession }) => {
  const { vendorData } = useContext(VendorContext) || {};
  const author = useMemo(() => {
    const d = vendorData?.vendorDetails || {};
    return {
      name: [d.firstName, d.lastName].filter(Boolean).join(' ') || vendorData?.name || undefined,
      email: vendorData?.email || d.primaryContactEmail || undefined,
      role: 'vendor',
    };
  }, [vendorData]);

  // A saved session (reopened from the chat history) starts from where it was left
  const [step, setStep] = useState(session ? (session.plan ? 2 : 1) : 0);
  const [status, setStatus] = useState('loading'); // lead list: loading | ready | error
  const [error, setError] = useState('');
  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState(session?.leadId || null);

  // conversation + plan
  const [conversationId, setConversationId] = useState(session?.conversationId || null);
  const [draft, setDraft] = useState('');
  const [briefText, setBriefText] = useState(session?.brief || ''); // everything the vendor has told Archie so far
  const [messages, setMessages] = useState(session?.messages || []); // { role: 'user' | 'archie', text }
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState('');
  const [showProblem, setShowProblem] = useState(false);
  const [plan, setPlan] = useState(session?.plan || null);
  const [warnings, setWarnings] = useState(session?.warnings || []);
  const [workspace, setWorkspace] = useState(session?.workspace || null);
  const [startDate, setStartDate] = useState(session?.startDate || today());

  // creating
  const [confirming, setConfirming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [created, setCreated] = useState(
    session?.created
      ? { workspaceId: session.workspace?.workspaceId, title: session.workspace?.title, tasks: session.created.tasks, steps: session.created.steps }
      : null
  );
  const leadTitle = (lead) => lead?.title || (session?.title || '').replace(/^Archie · /, '') || 'this lead';

  const [interim, setInterim] = useState('');
  const onTranscript = useCallback((text, isInterim = false) => {
    if (isInterim) return setInterim(text);
    setDraft((prev) => (prev ? `${prev} ` : '') + text);
    setInterim('');
  }, []);

  // Side by side only when there is room; otherwise the preview sits above the conversation.
  const rootRef = useRef(null);
  const [stacked, setStacked] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setStacked(entry.contentRect.width < 880));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight });
  }, [messages, planning, step]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await apiFetch('/api/ai/agents/archie/leads');
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Could not load your leads.');
      setLeads(body.data || []);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Could not load your leads.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lead = useMemo(() => leads.find((l) => l.leadId === selectedId) || null, [leads, selectedId]);
  const stats = useMemo(() => (plan ? planStats(plan) : null), [plan]);

  /** Ask the server for a plan (or a revision of the current one). Nothing is written anywhere. */
  const runPlan = async ({ brief, instruction }) => {
    setPlanning(true);
    setPlanError('');
    try {
      const res = await apiFetch('/api/ai/agents/archie/plan', {
        method: 'POST',
        body: JSON.stringify({
          leadId: selectedId,
          conversationId: conversationId || undefined,
          brief,
          startDate,
          templates: templateHints(),
          ...(plan && instruction ? { previousPlan: plan, instruction } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || `Archie could not make a plan (error ${res.status}).`);
      const data = body.data;
      const usable = data && (data.status === 'needs_info' ? Array.isArray(data.questions) : Array.isArray(data.plan?.tasks));
      if (!usable) throw new Error('Archie sent back something I could not read. Please try again.');
      if (data.conversationId) {
        setConversationId(data.conversationId);
        onSession?.(data.conversationId); // the history list picks the new session up
      }
      if (data.status === 'needs_info') {
        setMessages((m) => [...m, { role: 'archie', text: `A couple of quick questions so I get this right:\n${data.questions.map((q) => `• ${q}`).join('\n')}` }]);
        return;
      }
      setPlan(data.plan);
      setWarnings(data.warnings || []);
      setWorkspace(data.workspace || null);
      setMessages((m) => [...m, { role: 'archie', text: data.plan.summary || (instruction ? 'I updated the plan.' : 'Here is the plan I would set up.') }]);
      setStep(2);
    } catch (err) {
      setPlanError(err.message || 'Archie could not make a plan right now.');
    } finally {
      setPlanning(false);
    }
  };

  /** Send from the message box: the description (step 2) or a change request (step 3). */
  const send = async () => {
    const text = draft.trim();
    if (!text || planning) return;
    if (step === 1) {
      const first = briefText === '';
      if (first && text.length < MIN_BRIEF_CHARS) return setShowProblem(true);
      const combined = first ? text : `${briefText}\n\nMore details: ${text}`;
      setShowProblem(false);
      setBriefText(combined);
      setMessages((m) => [...m, { role: 'user', text }]);
      setDraft('');
      await runPlan({ brief: combined });
    } else if (step === 2 && !created) {
      setMessages((m) => [...m, { role: 'user', text }]);
      setDraft('');
      await runPlan({ brief: briefText, instruction: text });
    }
  };

  const retry = () => {
    if (step === 1) runPlan({ brief: briefText });
    else {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      runPlan({ brief: briefText, instruction: lastUser?.text });
    }
  };

  const create = async () => {
    if (!plan || !workspace?.workspaceId) return;
    setCreating(true);
    setCreateError('');
    try {
      const tasks = planToBulkTasks(plan, { startDate, workspaceId: workspace.workspaceId, author });
      await createTasksFromTemplate(workspace.workspaceId, tasks);
      const steps = tasks.reduce((n, t) => n + t.subtasks.length, 0);
      setCreated({ workspaceId: workspace.workspaceId, title: workspace.title, tasks: tasks.length, steps });
      setConfirming(false);
      // Note it in the saved session (best effort: the tasks are already in the workspace)
      if (conversationId) {
        apiFetch(`/api/ai/agents/archie/sessions/${encodeURIComponent(conversationId)}/created`, {
          method: 'POST',
          body: JSON.stringify({ tasks: tasks.length, steps }),
        }).then(() => onSession?.(conversationId)).catch(() => {});
      }
    } catch (err) {
      setCreateError(templateErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const canGo = (i) => i === 0 || (i === 1 && Boolean(lead)) || (i === 2 && Boolean(plan));

  const changeLead = () => {
    setStep(0);
  };

  // A different lead is a different project: start the conversation and plan over
  const chooseLead = (leadId) => {
    if (leadId === selectedId) return;
    setSelectedId(leadId);
    setConversationId(null);
    setDraft('');
    setBriefText('');
    setMessages([]);
    setPlan(null);
    setWarnings([]);
    setWorkspace(null);
    setPlanError('');
    setShowProblem(false);
    setCreated(null);
    setConfirming(false);
  };

  const header = (
    <div className="flex-shrink-0 border-b border-line bg-surface px-6 py-4">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4">
        <motion.div initial={{ scale: 0.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', damping: 12 }} className="flex-shrink-0 overflow-hidden rounded-2xl shadow-md">
          <AgentAvatar id="archie" size={step === 2 ? 48 : 64} />
        </motion.div>
        <div className="relative min-w-0 flex-1 rounded-2xl rounded-bl-md border border-line bg-canvas px-4 py-3">
          <p className="text-[13px] font-semibold text-ink">Hi, I'm Archie.</p>
          <p className="text-[12px] leading-relaxed text-dim">
            {step === 2 && !created ? 'Here is what I would set up. Ask me to change anything, then create it when you are happy.' : created ? 'All set. Everything is in the workspace.' : 'Pick a lead the PM has accepted, tell me about the project, and I\'ll get the workspace ready for you.'}
          </p>
        </div>
      </div>
      <div className="mx-auto mt-4 w-full max-w-3xl overflow-x-auto"><Stepper step={step} onGo={setStep} canGo={canGo} /></div>
    </div>
  );

  const conversation = (
    <div className="space-y-4">
      {messages.map((m, i) => <Bubble key={i} role={m.role}>{m.text}</Bubble>)}
      {planning && (
        <Bubble role="archie">
          <span className="inline-flex items-center gap-2 text-dim" role="status"><Loader2 size={14} className="animate-spin" />Working out tasks, steps and elements…</span>
        </Bubble>
      )}
      {planError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-4">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-danger" />
          <div className="flex-1 text-[12px] text-ink">{planError}</div>
          <button type="button" onClick={retry} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover"><RefreshCw size={12} />Try again</button>
        </div>
      )}
    </div>
  );

  // ── Step 3: preview on the right, conversation on the left ──
  if (step === 2 && plan) {
    return (
      <div ref={rootRef} className="flex min-h-0 flex-1 flex-col" data-testid="archie-builder">
        {header}
        <div className={stacked ? 'flex min-h-0 flex-1 flex-col overflow-y-auto' : 'flex min-h-0 flex-1 flex-row'}>
          <div className={`flex flex-col border-line ${stacked ? 'order-2 min-h-[380px] flex-shrink-0 border-t' : 'min-h-0 flex-1 max-w-[42%] border-r'}`}>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 ai-prompt-messages-scroll">
              <div className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-dim">Building for</p>
                <p className="mt-0.5 text-[14px] font-semibold text-ink">{leadTitle(lead)}</p>
                {workspace?.title && <p className="mt-1 flex items-center gap-1.5 text-[11px] text-dim"><FolderKanban size={11} />{workspace.title}{workspace.existingTasks ? ` · ${workspace.existingTasks} existing task${workspace.existingTasks === 1 ? '' : 's'} stay as they are` : ''}</p>}
              </div>
              {conversation}
            </div>
            <div className="flex-shrink-0 border-t border-line px-5 pb-4 pt-3">
              <div className="mb-2 flex items-center gap-2">
                <button type="button" onClick={changeLead} disabled={creating || Boolean(created)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-dim hover:bg-surface-hover hover:text-ink disabled:opacity-40"><ChevronLeft size={12} />Change lead</button>
                <button type="button" onClick={onExit} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-dim hover:bg-surface-hover hover:text-ink"><X size={12} />Leave Archie</button>
              </div>
              <Composer
                label="Ask Archie for a change"
                value={draft}
                onChange={setDraft}
                onSend={send}
                busy={planning}
                disabled={Boolean(created) || creating}
                placeholder={created ? 'Done. It is all in the workspace.' : 'Ask for a change: "make it 30 days", "drop painting", "add a site survey phase"…'}
                sendLabel="Send change"
                hint="Enter to send"
                interim={interim}
                onTranscript={onTranscript}
                autoFocus={false}
              />
            </div>
          </div>

          <div className={`flex flex-col bg-canvas ${stacked ? 'order-1 min-h-[520px] flex-shrink-0' : 'min-h-0 flex-1'}`}>
            {created ? (
              <div className="flex flex-1 items-center justify-center p-8" data-testid="archie-created">
                <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cta text-cta-foreground"><Check size={26} /></div>
                  <h3 className="text-[16px] font-semibold text-ink">Added to the workspace</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-dim">{created.tasks} tasks and {created.steps} steps are now in <strong className="text-ink">{created.title || 'the workspace'}</strong>. Find them under Tasks.</p>
                  <button type="button" onClick={() => openWorkspace(created.workspaceId)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-4 py-3 text-[13px] font-semibold text-cta-foreground transition-opacity hover:opacity-90">
                    <Rocket size={15} />Go to workspace now<ArrowRight size={15} />
                  </button>
                  <button type="button" onClick={onExit} className="mt-2 w-full rounded-xl px-4 py-2 text-[12px] font-medium text-dim hover:bg-surface-hover hover:text-ink">Stay here</button>
                </div>
              </div>
            ) : (
              <>
                <ArchiePreview plan={plan} warnings={warnings} startDate={startDate} onStartDateChange={setStartDate} locked={planning} />
                <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-5 py-3">
                  <p className="text-[11px] text-dim">Nothing is added until you create it.</p>
                  <button type="button" onClick={() => { setCreateError(''); setConfirming(true); }} disabled={planning || !workspace?.workspaceId} className="flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-[13px] font-semibold text-cta-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                    <Sparkles size={14} />Create in workspace
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {confirming && stats && (
          <ConfirmDialog stats={stats} workspaceTitle={workspace?.title} startDate={startDate} creating={creating} error={createError} onCancel={() => setConfirming(false)} onConfirm={create} />
        )}
      </div>
    );
  }

  // ── Steps 1 and 2: choose the lead, describe the project ──
  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col" data-testid="archie-builder">
      {header}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto ai-prompt-messages-scroll">
        <div className="mx-auto w-full max-w-3xl px-6 py-6">
          {step === 0 && (
            <section aria-labelledby="archie-step-lead">
              <h2 id="archie-step-lead" className="text-[15px] font-semibold text-ink">Which lead should I build for?</h2>
              <p className="mb-4 mt-1 text-[12px] text-dim">These are your leads that the PM accepted and gave you collaborative access to.</p>
              {status === 'loading' && <LeadSkeleton />}
              {status === 'error' && (
                <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-4">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-danger" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-ink">Couldn't load your leads</p>
                    <p className="text-[12px] text-dim">{error}</p>
                  </div>
                  <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover"><RefreshCw size={12} />Try again</button>
                </div>
              )}
              {status === 'ready' && leads.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
                  <p className="text-[14px] font-semibold text-ink">No leads are ready yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-dim">A lead shows up here once you've accepted it, the PM has approved it, and the PM has given you collaborative workspace access.</p>
                </div>
              )}
              {status === 'ready' && leads.length > 0 && (
                <div role="radiogroup" aria-label="Accepted leads" className="space-y-3">
                  {leads.map((l) => <LeadCard key={l.leadId} lead={l} selected={l.leadId === selectedId} onSelect={chooseLead} />)}
                </div>
              )}
            </section>
          )}

          {step === 1 && lead && (
            <section aria-labelledby="archie-step-details" className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 overflow-hidden rounded-xl shadow-sm"><AgentAvatar id="archie" size={32} /></div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h2 id="archie-step-details" className="text-[13px] font-semibold text-ink">Tell me about the project.</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink">
                      Just write it the way you'd explain it to a colleague: what the work is, how big it is, where, how long you have, the budget, and anything already done or unusual. No need to cover all of it, I'll work out the rest.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-dim">Building for</p>
                    <p className="mt-0.5 text-[14px] font-semibold text-ink">{lead.title}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-ink">
                      {isKnown(lead.clientName) && <span className="rounded-full bg-surface-hover px-2.5 py-1">{lead.clientName}</span>}
                      {isKnown(lead.budget) && <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1"><Wallet size={11} />{lead.budget}</span>}
                      {isKnown(lead.timeline) && <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1"><Clock size={11} />{lead.timeline}</span>}
                      {lead.workspaceTitle && <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1"><FolderKanban size={11} />{lead.workspaceTitle}</span>}
                    </div>
                  </div>
                </div>
              </div>
              {messages.length > 0 && <div className="pt-2">{conversation}</div>}
              {messages.length === 0 && (planning || planError) && <div className="pt-2">{conversation}</div>}
            </section>
          )}
        </div>
      </div>

      {step === 1 ? (
        <div className="relative flex-shrink-0 px-6 pb-5 pt-2">
          <div className="mx-auto mb-2 flex w-full max-w-3xl items-center gap-2">
            <button type="button" onClick={changeLead} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-dim transition-colors hover:bg-surface-hover hover:text-ink"><ChevronLeft size={12} />Change lead</button>
            <button type="button" onClick={onExit} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-dim transition-colors hover:bg-surface-hover hover:text-ink"><X size={12} />Leave Archie</button>
          </div>
          {showProblem && (
            <p role="alert" className="mx-auto mb-2 w-full max-w-3xl rounded-xl border border-danger/40 bg-danger/5 px-4 py-2 text-[12px] text-danger">
              Write a couple of sentences about the project so I have something to work from (at least {MIN_BRIEF_CHARS} characters).
            </p>
          )}
          <Composer
            label="Describe the project"
            value={draft}
            onChange={setDraft}
            onSend={send}
            busy={planning}
            placeholder={briefText ? 'Your answers here…' : 'e.g. 3BHK flat in Pune, 1,450 sq ft, full interior in 45 days, budget around 18 lakhs…'}
            sendLabel="Send description"
            hint="Enter to send · Shift+Enter for a new line"
            interim={interim}
            onTranscript={onTranscript}
          />
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-line bg-surface px-6 py-3">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <button type="button" onClick={onExit} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-dim transition-colors hover:bg-surface-hover hover:text-ink"><X size={13} />Leave Archie</button>
            <div className="ml-auto flex items-center gap-2">
              {plan && <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1 rounded-xl border border-line px-4 py-2 text-[12px] font-semibold text-ink hover:bg-surface-hover">Back to the plan<ChevronRight size={14} /></button>}
              <button type="button" onClick={() => lead && setStep(1)} disabled={!lead} className="flex items-center gap-1 rounded-xl bg-cta px-5 py-2 text-[12px] font-semibold text-cta-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                {status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : null}
                Continue<ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchieBuilder;
