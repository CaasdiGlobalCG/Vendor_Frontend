// ============================================================
// FILE: PostServices/ReopenRequestPanel.jsx
// PURPOSE: Re-open requests for a locked project, inside Post Services.
//            vendor : ask the PM to re-open (only while the project is locked)
//            PM     : approve / reject (reason) -> goes to the client
//            client : approve / reject (reason) -> project opens for all
// CONNECTS TO: Vendor_Backend /api/post-services/reopen-request and
//              /api/post-services/:postId/reopen-decision
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, CheckCircle, XCircle, Clock, Lock } from 'lucide-react';
import config from '../../../../../config/env.js';
import invoiceFetch from '../../invoice/utils/invoiceFetch';

const STATUS = {
  pending_pm: { label: 'With the Project Manager', tone: 'text-warning bg-warning/10' },
  pending_client: { label: 'With the client', tone: 'text-warning bg-warning/10' },
  approved: { label: 'Approved. Project open', tone: 'text-success bg-success/10' },
  rejected: { label: 'Rejected', tone: 'text-danger bg-danger/10' },
};

const fmt = (iso) => {
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const ReopenRequestPanel = ({ workspaceId, role, isLocked, isOpen, onWorkspaceUpdate }) => {
  const [requests, setRequests] = useState([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await invoiceFetch(`${config.VENDOR_BACKEND_URL}/api/post-services/${encodeURIComponent(workspaceId)}?limit=200`);
      if (!res.ok) return;
      const body = await res.json();
      const found = (body.posts || [])
        .filter((p) => p.reopenRequest)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(found);
    } catch { /* panel stays empty */ }
  }, [workspaceId]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const call = async (path, payload) => {
    setBusy(true);
    setError('');
    try {
      const res = await invoiceFetch(`${config.VENDOR_BACKEND_URL}/api/post-services/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'That did not go through. Please try again.');
      setReason('');
      await load();
      onWorkspaceUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pending = requests.find((r) => ['pending_pm', 'pending_client'].includes(r.reopenRequest.status));
  const history = requests.filter((r) => r !== pending);

  const canAsk = role === 'vendor' && isLocked && !pending;
  const myTurn = pending && ((role === 'pm' && pending.reopenRequest.status === 'pending_pm') || (role === 'client' && pending.reopenRequest.status === 'pending_client'));

  if (!canAsk && !pending && history.length === 0) return null;

  return (
    <div className="mx-3 mt-3 border border-line rounded-lg bg-canvas p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <RotateCcw className="w-4 h-4 text-info" /> Re-open requests
        {isLocked && <span className="inline-flex items-center gap-1 text-[11px] text-dim"><Lock className="w-3 h-3" /> project locked</span>}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {canAsk && (
        <div className="space-y-2">
          <p className="text-xs text-dim">The project is locked. Tell the Project Manager why it needs to be opened again. They decide first, then the client.</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why does the project need to be re-opened?"
            className="w-full px-3 py-2 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
          />
          <button
            disabled={busy || !reason.trim()}
            onClick={() => call('reopen-request', { reason })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-ink text-surface disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> {busy ? 'Sending…' : 'Request re-open'}
          </button>
        </div>
      )}

      {pending && (
        <div className="space-y-2 border border-line rounded-md bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS[pending.reopenRequest.status].tone}`}>{STATUS[pending.reopenRequest.status].label}</span>
            <span className="text-[11px] text-dim">{fmt(pending.reopenRequest.requestedAt)}</span>
          </div>
          <p className="text-sm text-ink">“{pending.reopenRequest.reason}”</p>
          <p className="text-[11px] text-dim">Asked by {pending.reopenRequest.requestedBy?.name || 'the vendor'}</p>
          {(pending.reopenRequest.steps || []).map((s, i) => (
            <p key={i} className="text-[11px] text-dim">
              {s.role === 'pm' ? 'Project Manager' : 'Client'} {s.decision}{s.reason ? `: “${s.reason}”` : ''}
            </p>
          ))}

          {myTurn && (
            <div className="space-y-2 pt-1">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Reason (needed to reject, optional when approving)"
                className="w-full px-3 py-2 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
              />
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => call(`${pending.postId}/reopen-decision`, { approve: true, reason })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-success text-white disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> {role === 'pm' ? 'Approve and send to client' : 'Approve and open project'}
                </button>
                <button
                  disabled={busy || !reason.trim()}
                  onClick={() => call(`${pending.postId}/reopen-decision`, { approve: false, reason })}
                  title={!reason.trim() ? 'Add a reason first' : ''}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-danger text-white disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          )}
          {!myTurn && (
            <p className="flex items-center gap-1.5 text-xs text-dim"><Clock className="w-3.5 h-3.5" /> Waiting for {pending.reopenRequest.status === 'pending_pm' ? 'the Project Manager' : 'the client'}.</p>
          )}
        </div>
      )}

      {history.slice(0, 3).map((r) => (
        <div key={r.postId} className="text-[11px] text-dim border-t border-line pt-2">
          <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS[r.reopenRequest.status]?.tone || ''}`}>{STATUS[r.reopenRequest.status]?.label}</span>
          <span className="ml-2">{fmt(r.reopenRequest.requestedAt)} · “{r.reopenRequest.reason}”</span>
        </div>
      ))}
    </div>
  );
};

export default ReopenRequestPanel;
