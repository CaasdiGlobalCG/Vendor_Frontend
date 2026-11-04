// ============================================================
// FILE: modals/ProjectCompletionModal.jsx
// PURPOSE: One screen for the whole project completion flow, shown
//          according to who is looking.
//            vendor : submit the request, see where it is, ask to re-open
//            PM     : approve / send back / reject (reason), decide a lock
//            client : approve / send back / reject (reason), ask for a lock
// CONNECTS TO: Vendor_Backend /api/workspace/completion/*
//              (modules/workspace/controllers/projectCompletionController.js)
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  X, CheckCircle, XCircle, Clock, Lock, Undo2, Send, FileText, Paperclip, AlertTriangle, RotateCcw,
} from 'lucide-react';
import config from '../../../../config/env';
import invoiceFetch from '../invoice/utils/invoiceFetch';

const STATE_META = {
  none:           { label: 'No request yet',           tone: 'text-dim bg-canvas' },
  pending_pm:     { label: 'With the Project Manager', tone: 'text-warning bg-warning/10' },
  pending_client: { label: 'With the client',          tone: 'text-warning bg-warning/10' },
  approved:       { label: 'Approved',                 tone: 'text-success bg-success/10' },
  rejected:       { label: 'Rejected',                 tone: 'text-danger bg-danger/10' },
  sent_back:      { label: 'Sent back for changes',    tone: 'text-danger bg-danger/10' },
};

const HISTORY_LABEL = {
  submitted: 'Vendor submitted the request',
  pm_approve: 'Project Manager approved and sent it to the client',
  pm_reject: 'Project Manager rejected it',
  pm_send_back: 'Project Manager sent it back',
  client_approve: 'Client approved',
  client_reject: 'Client rejected it',
  client_send_back: 'Client sent it back',
  lock_requested: 'Client asked the Project Manager to lock the project',
  lock_accepted: 'Project Manager locked the project',
  lock_declined: 'Project Manager declined the lock request',
  reopened: 'Project re-opened',
};

const fmt = (iso) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso || ''; }
};

const ProjectCompletionModal = ({
  isOpen, onClose, workspace, role = 'vendor', currentUser, onChanged, onOpenPostServices,
}) => {
  const workspaceId = workspace?.workspaceId || workspace?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [certify, setCertify] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const res = await invoiceFetch(`${config.VENDOR_BACKEND_URL}/api/workspace/completion/${encodeURIComponent(workspaceId)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || 'Could not load the completion request');
      setData(body.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) {
      setReason(''); setDescription(''); setFile(null); setCertify(false);
      load();
    }
  }, [isOpen, load]);

  if (!isOpen) return null;

  const post = async (path, payload, isForm = false) => {
    setBusy(true);
    setError('');
    try {
      const res = await invoiceFetch(`${config.VENDOR_BACKEND_URL}/api/workspace/completion/${path}`, {
        method: 'POST',
        headers: isForm ? undefined : { 'Content-Type': 'application/json' },
        body: isForm ? payload : JSON.stringify({ workspaceId, actorName: currentUser?.name, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || 'That did not go through. Please try again.');
      setData(body.data);
      setReason(''); setDescription(''); setFile(null); setCertify(false);
      onChanged?.(body.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const state = data?.state || 'none';
  const lockState = data?.lock?.state || 'unlocked';
  const locked = lockState === 'locked';
  const meta = STATE_META[state] || STATE_META.none;
  const req = data?.request;

  const submitVendor = () => {
    const fd = new FormData();
    fd.append('workspaceId', workspaceId);
    fd.append('completionDescription', description);
    fd.append('markCompleted', 'true');
    if (file) fd.append('completionFiles', file);
    post('submit', fd, true);
  };

  // Approve / send back / reject — same three choices for PM and client.
  // (a render function, not a component, so the textarea keeps focus while typing)
  const renderReviewBox = (endpoint, who) => (
    <div className="border border-line rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-ink">Your decision</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Reason (needed to reject or send back, optional when approving)"
        className="w-full px-3 py-2 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
      />
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => post(endpoint, { action: 'approve', reason })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-success text-white disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" /> {who === 'pm' ? 'Approve and send to client' : 'Approve'}
        </button>
        <button
          disabled={busy || !reason.trim()}
          onClick={() => post(endpoint, { action: 'send_back', reason })}
          title={!reason.trim() ? 'Add a reason first' : ''}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-line text-ink disabled:opacity-50"
        >
          <Undo2 className="w-4 h-4" /> Send back
        </button>
        <button
          disabled={busy || !reason.trim()}
          onClick={() => post(endpoint, { action: 'reject', reason })}
          title={!reason.trim() ? 'Add a reason first' : ''}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-danger text-white disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" /> Reject
        </button>
      </div>
      <p className="text-xs text-dim">
        Send back returns it to the vendor to fix and submit again. Reject closes this request; the vendor can still submit a new one.
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-ink">Project Completion</h2>
            <p className="text-xs text-dim mt-0.5">
              {role === 'vendor' ? 'Tell the Project Manager the work is finished.' : role === 'pm' ? 'Review the vendor’s completion request.' : 'Review the completion request and, once approved, ask for the project to be locked.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-canvas" aria-label="Close"><X className="w-5 h-5 text-dim" /></button>
        </div>

        <div className="p-6 space-y-5">
          {loading && <p className="text-sm text-dim">Loading…</p>}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-danger/10 border border-danger/20 text-sm text-danger">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.tone}`}>{meta.label}</span>
                {locked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ink text-surface">
                    <Lock className="w-3 h-3" /> Project locked
                  </span>
                )}
                {lockState === 'requested' && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium text-warning bg-warning/10">Lock requested</span>
                )}
              </div>

              {req && (
                <div className="border border-line rounded-lg p-4 space-y-2 bg-canvas">
                  <p className="text-xs text-dim">
                    Submitted {fmt(req.submittedAt)}{req.submittedBy?.name ? ` by ${req.submittedBy.name}` : ''}{req.round > 1 ? ` · attempt ${req.round}` : ''}
                  </p>
                  <p className="text-sm text-ink whitespace-pre-wrap">{req.description}</p>
                  {req.files && (
                    <a href={req.files} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-info">
                      <FileText className="w-4 h-4" /> View final documents
                    </a>
                  )}
                </div>
              )}

              {/* ---------------- Vendor ---------------- */}
              {role === 'vendor' && locked && (
                <div className="border border-line rounded-lg p-4 space-y-3">
                  <p className="text-sm text-ink">This project is locked and view-only. If something needs to change, ask for it to be re-opened. The request goes to the Project Manager in Post Services, then to the client.</p>
                  <button
                    onClick={() => { onClose(); onOpenPostServices?.(); }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-ink text-surface"
                  >
                    <RotateCcw className="w-4 h-4" /> Request re-open in Post Services
                  </button>
                </div>
              )}

              {role === 'vendor' && !locked && ['none', 'rejected', 'sent_back'].includes(state) && (
                <div className="border border-line rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-ink">{state === 'none' ? 'Submit completion request' : 'Submit again'}</p>
                  <label className="flex items-start gap-2 text-sm text-ink">
                    <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-0.5" />
                    I certify this project is complete
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Completion details (what was delivered, anything to note)"
                    className="w-full px-3 py-2 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
                  />
                  <label className="flex items-center gap-2 text-sm text-dim cursor-pointer">
                    <Paperclip className="w-4 h-4" />
                    <span>{file ? file.name : 'Attach final documents (optional)'}</span>
                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <button
                    disabled={busy || !certify || !description.trim()}
                    onClick={submitVendor}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-success text-white disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> {busy ? 'Sending…' : 'Send to Project Manager'}
                  </button>
                </div>
              )}

              {role === 'vendor' && ['pending_pm', 'pending_client'].includes(state) && (
                <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> Waiting for {state === 'pending_pm' ? 'the Project Manager' : 'the client'}. You will be notified.</p>
              )}
              {role === 'vendor' && state === 'approved' && !locked && (
                <p className="flex items-center gap-2 text-sm text-success"><CheckCircle className="w-4 h-4" /> Approved by the Project Manager and the client. The client can now ask for the project to be locked.</p>
              )}

              {/* ---------------- Project Manager ---------------- */}
              {role === 'pm' && state === 'pending_pm' && renderReviewBox('pm-review', 'pm')}
              {role === 'pm' && state === 'pending_client' && (
                <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> You approved this. It is with the client now.</p>
              )}
              {role === 'pm' && lockState === 'requested' && (
                <div className="border border-warning/40 bg-warning/5 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-ink">The client asked you to lock this project</p>
                  {data.lock.reason && <p className="text-sm text-dim">Client’s note: {data.lock.reason}</p>}
                  <p className="text-xs text-dim">Once locked, the vendor and the client can only view the workspace. Only you can make changes. The vendor can ask for a re-open from Post Services.</p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Reason (needed to decline)"
                    className="w-full px-3 py-2 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
                  />
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => post('decide-lock', { accept: true, reason })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-ink text-surface disabled:opacity-50">
                      <Lock className="w-4 h-4" /> Lock the project
                    </button>
                    <button disabled={busy || !reason.trim()} onClick={() => post('decide-lock', { accept: false, reason })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-line text-ink disabled:opacity-50">
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- Client ---------------- */}
              {role === 'client' && state === 'pending_client' && renderReviewBox('client-review', 'client')}
              {role === 'client' && state === 'pending_pm' && (
                <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> The Project Manager is reviewing this first. It will come to you next.</p>
              )}
              {role === 'client' && state === 'approved' && !locked && lockState !== 'requested' && (
                <div className="border border-line rounded-lg p-4 space-y-3">
                  <p className="text-sm text-ink">You approved the completion. You can ask the Project Manager to lock the project so that nothing changes from here.</p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Note for the Project Manager (optional)"
                    className="w-full px-3 py-2 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
                  />
                  {lockState === 'declined' && data.lock.decisionReason && (
                    <p className="text-xs text-danger">Last request declined: {data.lock.decisionReason}</p>
                  )}
                  <button disabled={busy} onClick={() => post('request-lock', { reason })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-ink text-surface disabled:opacity-50">
                    <Lock className="w-4 h-4" /> Ask the Project Manager to lock the project
                  </button>
                </div>
              )}
              {role === 'client' && lockState === 'requested' && (
                <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> Waiting for the Project Manager to lock the project.</p>
              )}
              {(role === 'client' || role === 'pm') && locked && (
                <p className="flex items-center gap-2 text-sm text-dim"><Lock className="w-4 h-4" /> Locked{data.lock.lockedAt ? ` on ${fmt(data.lock.lockedAt)}` : ''}. The vendor can ask to re-open it from Post Services.</p>
              )}

              {/* ---------------- History ---------------- */}
              {data.history?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-dim uppercase tracking-wide mb-2">What happened</p>
                  <ol className="space-y-3 border-l border-line pl-4">
                    {[...data.history].reverse().map((h, i) => (
                      <li key={`${h.at}-${i}`} className="text-sm">
                        <p className="text-ink">{HISTORY_LABEL[h.action] || h.action}</p>
                        <p className="text-xs text-dim">{h.by?.name || h.by?.role || ''} · {fmt(h.at)}</p>
                        {h.reason && h.action !== 'submitted' && <p className="text-sm text-dim mt-0.5">“{h.reason}”</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCompletionModal;
