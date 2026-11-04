// ============================================================
// FILE: modals/SubtaskProgressModal.jsx
// PURPOSE: Review progress submitted for a task / subtask, one version at a time.
//            PM     : approve / send back / reject (reason), then lock or re-open
//            client : approve / send back / reject (reason), ask for a lock, re-open
//            vendor : see where each version stands, ask to re-open a locked subtask
// CONNECTS TO: Vendor_Backend /api/workspace/progress/*
//              (modules/workspace/controllers/subtaskProgressController.js)
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  X, CheckCircle, XCircle, Clock, Lock, Undo2, FileText, AlertTriangle, RotateCcw, Image as ImageIcon,
} from 'lucide-react';
import config from '../../../../config/env';
import invoiceFetch from '../invoice/utils/invoiceFetch';

const STATE = {
  none:           { label: 'Re-opened',                tone: 'text-dim bg-canvas' },
  pending_pm:     { label: 'With the Project Manager', tone: 'text-warning bg-warning/10' },
  pending_client: { label: 'With the client',          tone: 'text-warning bg-warning/10' },
  approved:       { label: 'Approved',                 tone: 'text-success bg-success/10' },
  rejected:       { label: 'Rejected',                 tone: 'text-danger bg-danger/10' },
  sent_back:      { label: 'Sent back for changes',    tone: 'text-danger bg-danger/10' },
};

const HISTORY = {
  submitted: 'Vendor submitted this version',
  pm_approve: 'Project Manager approved and sent it to the client',
  pm_reject: 'Project Manager rejected it',
  pm_send_back: 'Project Manager sent it back',
  client_approve: 'Client approved',
  client_reject: 'Client rejected it',
  client_send_back: 'Client sent it back',
  lock_requested: 'Client asked the Project Manager to lock it',
  lock_accepted: 'Project Manager marked it completed and locked it',
  lock_declined: 'Project Manager declined the lock request',
  reopened: 'Re-opened',
};

const fmt = (iso) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso || ''; }
};

const SubtaskProgressModal = ({ isOpen, onClose, workspace, role = 'vendor', taskId, subtaskId, currentUser, onChanged }) => {
  const workspaceId = workspace?.workspaceId || workspace?.id;
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [override, setOverride] = useState({}); // submissions changed since the workspace was loaded

  const task = (workspace?.tasks || []).find((t) => t.id === taskId);
  const subtask = (task?.subtasks || []).find((s) => s.id === subtaskId);
  const locked = subtask ? subtask.locked === true : task?.locked === true;

  const submissions = useMemo(() => {
    const all = Array.isArray(workspace?.progress_submissions) ? workspace.progress_submissions : [];
    return all
      .filter((s) => (!taskId || s.taskId === taskId) && (!subtaskId || (s.subtaskId || '') === subtaskId))
      .map((s) => override[s.id] || s)
      .sort((a, b) => (b.version || 0) - (a.version || 0) || new Date(b.submittedAt) - new Date(a.submittedAt));
  }, [workspace?.progress_submissions, taskId, subtaskId, override]);

  useEffect(() => {
    if (!isOpen) return;
    setReason(''); setError('');
    setSelectedId((cur) => (submissions.some((s) => s.id === cur) ? cur : submissions[0]?.id || null));
  }, [isOpen, submissions]);

  if (!isOpen) return null;

  const sub = submissions.find((s) => s.id === selectedId) || null;
  const flow = sub?.flow || { state: 'none', lock: { state: 'unlocked' }, history: [] };
  const lockState = flow.lock?.state || 'unlocked';
  const meta = STATE[flow.state] || STATE.none;
  const reopen = sub?.reopen || null;

  const post = async (path, payload) => {
    setBusy(true); setError('');
    try {
      const res = await invoiceFetch(`${config.VENDOR_BACKEND_URL}/api/workspace/progress/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, actorName: currentUser?.name, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || 'That did not go through. Please try again.');
      setOverride((o) => ({ ...o, [body.data.id]: body.data }));
      setReason('');
      onChanged?.(body.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reasonBox = (placeholder) => (
    <textarea
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      rows={2}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
    />
  );

  const reviewBox = (endpoint, who) => (
    <div className="border border-line rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-ink">Your decision on v{sub.version}</p>
      {reasonBox('Reason (needed to reject or send back, optional when approving)')}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => post(endpoint, { submissionId: sub.id, action: 'approve', reason })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-success text-white disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> {who === 'pm' ? 'Approve and send to client' : 'Approve'}
        </button>
        <button disabled={busy || !reason.trim()} onClick={() => post(endpoint, { submissionId: sub.id, action: 'send_back', reason })}
          title={!reason.trim() ? 'Add a reason first' : ''}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-line text-ink disabled:opacity-50">
          <Undo2 className="w-4 h-4" /> Send back
        </button>
        <button disabled={busy || !reason.trim()} onClick={() => post(endpoint, { submissionId: sub.id, action: 'reject', reason })}
          title={!reason.trim() ? 'Add a reason first' : ''}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-danger text-white disabled:opacity-50">
          <XCircle className="w-4 h-4" /> Reject
        </button>
      </div>
      <p className="text-xs text-dim">Send back returns it to the vendor to fix and submit a new version. Reject closes this version.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Progress{subtask ? ` · ${subtask.name}` : task ? ` · ${task.name}` : ''}
            </h2>
            <p className="text-xs text-dim mt-0.5 flex items-center gap-2">
              {role === 'pm' ? 'Review what the vendor submitted.' : role === 'client' ? 'Review the progress and, once approved, ask for the subtask to be locked.' : 'Where each version of your progress stands.'}
              {locked && <span className="inline-flex items-center gap-1 text-ink"><Lock className="w-3 h-3" /> completed and locked</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-canvas" aria-label="Close"><X className="w-5 h-5 text-dim" /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-danger/10 border border-danger/20 text-sm text-danger">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}

          {submissions.length === 0 && <p className="text-sm text-dim">No progress has been submitted for this yet.</p>}

          {submissions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {submissions.map((s) => {
                const m = STATE[s.flow?.state] || STATE.none;
                return (
                  <button key={s.id} onClick={() => setSelectedId(s.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs text-left ${s.id === selectedId ? 'border-ink bg-canvas' : 'border-line'}`}>
                    <span className="font-semibold text-ink">v{s.version || 1}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full ${m.tone}`}>{m.label}</span>
                    <span className="block text-dim mt-0.5">{s.progressDate}</span>
                  </button>
                );
              })}
            </div>
          )}

          {sub && (
            <>
              <div className="border border-line rounded-lg p-4 space-y-3 bg-canvas">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.tone}`}>{meta.label}</span>
                  {lockState === 'locked' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ink text-surface"><Lock className="w-3 h-3" /> Locked</span>}
                  {lockState === 'requested' && <span className="px-2.5 py-1 rounded-full text-xs font-medium text-warning bg-warning/10">Lock requested</span>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{sub.title}</p>
                  <p className="text-xs text-dim">Work done on {sub.progressDate} · submitted {fmt(sub.submittedAt)}{sub.submittedBy?.name ? ` by ${sub.submittedBy.name}` : ''}</p>
                </div>
                <p className="text-sm text-ink whitespace-pre-wrap">{sub.description}</p>
                {(sub.workDone || sub.workPending) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {sub.workDone && <div><p className="font-semibold text-dim uppercase tracking-wide mb-0.5">Done</p><p className="text-ink whitespace-pre-wrap">{sub.workDone}</p></div>}
                    {sub.workPending && <div><p className="font-semibold text-dim uppercase tracking-wide mb-0.5">Remaining</p><p className="text-ink whitespace-pre-wrap">{sub.workPending}</p></div>}
                  </div>
                )}
                {sub.snapshotUrl && (
                  <a href={sub.snapshotUrl} target="_blank" rel="noreferrer" className="block">
                    <p className="text-xs font-semibold text-dim uppercase tracking-wide mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Canvas at the time of submission</p>
                    <img src={sub.snapshotUrl} alt="Canvas snapshot" className="w-full max-h-72 object-contain rounded border border-line bg-surface" />
                  </a>
                )}
                {(sub.documents || []).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-dim uppercase tracking-wide">Documents</p>
                    {sub.documents.map((d, i) => (
                      <a key={`${d.url}-${i}`} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-info">
                        <FileText className="w-4 h-4" /> {d.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* ---- review ---- */}
              {role === 'pm' && flow.state === 'pending_pm' && reviewBox('pm-review', 'pm')}
              {role === 'client' && flow.state === 'pending_client' && reviewBox('client-review', 'client')}
              {role === 'client' && flow.state === 'pending_pm' && <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> The Project Manager reviews this first.</p>}
              {role === 'pm' && flow.state === 'pending_client' && <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> You approved this. It is with the client.</p>}
              {role === 'vendor' && ['pending_pm', 'pending_client'].includes(flow.state) && (
                <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> Waiting for {flow.state === 'pending_pm' ? 'the Project Manager' : 'the client'}. You will be notified.</p>
              )}
              {role === 'vendor' && ['rejected', 'sent_back'].includes(flow.state) && (
                <p className="text-sm text-danger">This version was {flow.state === 'rejected' ? 'rejected' : 'sent back'}. Submit a new version with Update Progress.</p>
              )}

              {/* ---- lock ---- */}
              {role === 'client' && flow.state === 'approved' && lockState !== 'locked' && lockState !== 'requested' && (
                <div className="border border-line rounded-lg p-4 space-y-3">
                  <p className="text-sm text-ink">You approved this. Ask the Project Manager to mark the subtask completed and lock it.</p>
                  {lockState === 'declined' && flow.lock?.decisionReason && <p className="text-xs text-danger">Last request declined: {flow.lock.decisionReason}</p>}
                  {reasonBox('Note for the Project Manager (optional)')}
                  <button disabled={busy} onClick={() => post('request-lock', { submissionId: sub.id, reason })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-ink text-surface disabled:opacity-50">
                    <Lock className="w-4 h-4" /> Ask the Project Manager to lock it
                  </button>
                </div>
              )}
              {role !== 'pm' && lockState === 'requested' && <p className="flex items-center gap-2 text-sm text-dim"><Clock className="w-4 h-4" /> Waiting for the Project Manager to lock it.</p>}
              {role === 'pm' && lockState === 'requested' && (
                <div className="border border-warning/40 bg-warning/5 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-ink">The client asked you to complete and lock this subtask</p>
                  {flow.lock?.reason && <p className="text-sm text-dim">Client’s note: {flow.lock.reason}</p>}
                  <p className="text-xs text-dim">Once locked it is marked completed, and the vendor and the client can only view it. Only you can change it.</p>
                  {reasonBox('Reason (needed to decline)')}
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => post('decide-lock', { submissionId: sub.id, accept: true, reason })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-ink text-surface disabled:opacity-50"><Lock className="w-4 h-4" /> Complete and lock</button>
                    <button disabled={busy || !reason.trim()} onClick={() => post('decide-lock', { submissionId: sub.id, accept: false, reason })}
                      className="px-3 py-2 rounded-md text-sm font-medium border border-line text-ink disabled:opacity-50">Decline</button>
                  </div>
                </div>
              )}

              {/* ---- re-open ---- */}
              {role === 'vendor' && lockState === 'locked' && !reopen && (
                <div className="border border-line rounded-lg p-4 space-y-3">
                  <p className="text-sm text-ink">This subtask is locked. If it needs more work, ask for it to be re-opened. The Project Manager decides first, then the client.</p>
                  {reasonBox('Why does it need to be re-opened?')}
                  <button disabled={busy || !reason.trim()}
                    onClick={() => post('reopen-request', { taskId: sub.taskId, subtaskId: sub.subtaskId || '', reason })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-ink text-surface disabled:opacity-50">
                    <RotateCcw className="w-4 h-4" /> Request re-open
                  </button>
                </div>
              )}
              {reopen && ['pending_pm', 'pending_client'].includes(reopen.status) && (
                <div className="border border-line rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-ink">Re-open requested</p>
                  <p className="text-sm text-ink">“{reopen.reason}”</p>
                  {(reopen.steps || []).map((st, i) => (
                    <p key={i} className="text-xs text-dim">{st.role === 'pm' ? 'Project Manager' : 'Client'} {st.decision}{st.reason ? `: “${st.reason}”` : ''}</p>
                  ))}
                  {((role === 'pm' && reopen.status === 'pending_pm') || (role === 'client' && reopen.status === 'pending_client')) ? (
                    <div className="space-y-2 pt-1">
                      {reasonBox('Reason (needed to reject)')}
                      <div className="flex gap-2">
                        <button disabled={busy} onClick={() => post('reopen-decision', { submissionId: sub.id, approve: true, reason })}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-success text-white disabled:opacity-50">
                          <CheckCircle className="w-4 h-4" /> {role === 'pm' ? 'Approve and send to client' : 'Approve and re-open'}
                        </button>
                        <button disabled={busy || !reason.trim()} onClick={() => post('reopen-decision', { submissionId: sub.id, approve: false, reason })}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-danger text-white disabled:opacity-50">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-dim"><Clock className="w-3.5 h-3.5" /> Waiting for {reopen.status === 'pending_pm' ? 'the Project Manager' : 'the client'}.</p>
                  )}
                </div>
              )}

              {/* ---- history ---- */}
              {(flow.history?.length > 0 || (sub.reopenHistory || []).length > 0) && (
                <div>
                  <p className="text-xs font-semibold text-dim uppercase tracking-wide mb-2">What happened to v{sub.version}</p>
                  <ol className="space-y-3 border-l border-line pl-4">
                    {[...(flow.history || [])].reverse().map((h, i) => (
                      <li key={`${h.at}-${i}`} className="text-sm">
                        <p className="text-ink">{HISTORY[h.action] || h.action}</p>
                        <p className="text-xs text-dim">{h.by?.name || h.by?.role || ''} · {fmt(h.at)}</p>
                        {h.reason && h.action !== 'submitted' && <p className="text-sm text-dim mt-0.5">“{h.reason}”</p>}
                      </li>
                    ))}
                    {(sub.reopenHistory || []).map((r, i) => (
                      <li key={`ro-${i}`} className="text-sm">
                        <p className="text-ink">Re-open request: {r.status === 'approved' ? 'approved' : 'rejected'}</p>
                        <p className="text-xs text-dim">“{r.reason}” · {fmt(r.requestedAt)}</p>
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

export default SubtaskProgressModal;
