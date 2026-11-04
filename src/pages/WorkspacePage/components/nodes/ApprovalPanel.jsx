import React, { useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, ShieldAlert, Undo2 } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import { TONE_CLASSES } from '../../utils/blockElements';
import { buildViewerIdentity } from '../../utils/fieldAccess';
import { decideApproval as decideApprovalOnServer, notifyWorkspaceEvent } from '../../utils/workspaceApi';
import {
  ROLE_LABEL, approverOptions, chainFor, collaboratorRole, describeChain, forwardCandidates, isCurrentApprover,
  isOrigin, pendingStep, shownName, viewerRole,
} from '../../utils/approvalRouting';
import { primaryButton, smallButton } from './blockStyles';

/** The signed-in person as the approval rules see them. */
export const useViewer = (viewerProp) => {
  const { currentUser } = useContext(VendorContext) || {};
  return useMemo(
    () => viewerProp || buildViewerIdentity(currentUser, typeof window !== 'undefined' ? window.location.search : ''),
    [viewerProp, currentUser]
  );
};

const stamp = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
};

const ids = (p) => [p?.vendorId, p?.userId].filter(Boolean);
const selectClass =
  'nodrag w-full rounded border border-line bg-surface px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info';

/** Everything visible on the element about who has approved, in order, with their stamps. */
const Trail = ({ chain }) => {
  if (!chain || chain.state === 'draft') return null;
  return (
    <ol className="m-0 mt-2 space-y-1.5 p-0" aria-label="Approval trail" data-approval-trail>
      <li className="flex list-none items-start gap-2 text-[11px]">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-dim" aria-hidden="true" />
        <span className="text-dim">
          Sent by <span className="font-medium text-ink">{chain.origin?.name}</span> ({ROLE_LABEL[chain.originRole] || chain.originRole})
          {chain.submittedAt ? ` · ${stamp(chain.submittedAt)}` : ''}
        </span>
      </li>
      {chain.steps.map((s) => {
        const tone = s.decision === 'approved' ? 'success' : s.decision === 'rejected' ? 'danger' : 'warning';
        return (
          <li key={s.id} className="flex list-none items-start gap-2 text-[11px]" data-step-decision={s.decision} data-step-role={s.role}>
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${TONE_CLASSES[tone].dot}`} aria-hidden="true" />
            <span className="min-w-0 text-ink">
              <span className="font-medium">{shownName({ ...s.person, role: s.person?.role || s.role }) || s.person?.name}</span> ({ROLE_LABEL[s.role] || s.role}):{' '}
              {s.decision === 'approved' ? (
                <span className="text-success">Approved{s.at ? ` · ${stamp(s.at)}` : ''}</span>
              ) : s.decision === 'rejected' ? (
                <span className="text-danger">Sent back{s.at ? ` · ${stamp(s.at)}` : ''}{s.note ? ` — ${s.note}` : ''}</span>
              ) : (
                <span className="text-warning">Waiting</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

/**
 * Sends an element for approval and shows where it is. Who can be asked depends on who the viewer
 * is (a vendor never sees the client); a PM who approves forwards it on to the client (or the
 * vendor, for a client's element). Every stamp is visible to everyone on the canvas.
 *
 * Props: `kind` (e.g. 'permit'), `id`, `data`, `editable`, `viewer`, `collaborators`, `subject`
 * (version id for artwork), `getContent()` (the fields being approved, as the sender sees them),
 * `validate()` (a quick local check), `onServerPatch(patch)`, `decide`, `notify`, `what` (words).
 */
const ApprovalPanel = ({
  kind, id, data, editable, viewer: viewerProp, collaborators: collaboratorsProp, subject = '', getContent, validate,
  onServerPatch, onChange, notify = notifyWorkspaceEvent, decide = decideApprovalOnServer, what = 'this', place = '',
  sendLabel = 'Send for approval', locked = false,
}) => {
  const viewer = useViewer(viewerProp);
  const collaborators = collaboratorsProp || data.workspaceCollaborators || [];
  const chain = chainFor(data, subject);
  const state = chain?.state || 'draft';
  const role = viewerRole(viewer, collaborators);
  const options = useMemo(() => approverOptions({ collaborators, viewer, role }), [collaborators, viewer, role]);
  const forward = useMemo(() => forwardCandidates({ chain, collaborators, kind }), [chain, collaborators, kind]);
  const iAmApprover = isCurrentApprover(chain, viewer);
  const iAmOrigin = isOrigin(chain, viewer);
  const canSend = editable && !locked && (state === 'draft' || state === 'rejected');
  const pmName = (collaborators.find((c) => collaboratorRole(c) === 'pm') || {}).name;

  const [approverKey, setApproverKey] = useState('');
  const [forwardKey, setForwardKey] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // One choice is chosen for them; several give a dropdown
  useEffect(() => {
    if (!options.some((o) => o.key === approverKey)) setApproverKey(options.length === 1 ? options[0].key : '');
  }, [options, approverKey]);
  useEffect(() => {
    if (!forward.options.some((o) => o.key === forwardKey)) setForwardKey(forward.options.length === 1 ? forward.options[0].key : '');
  }, [forward.options, forwardKey]);

  const tell = (people, extra) => {
    const targetUserIds = people.flatMap(ids);
    if (!targetUserIds.length || !data.workspaceId || typeof notify !== 'function') return;
    notify({
      workspaceId: data.workspaceId, roles: [], targetUserIds, priority: 'high',
      data: { nodeId: id, taskId: data.taskId || null, subtaskId: data.subtaskId || null, taskName: data.taskName || null, subtaskName: data.subtaskName || null, kind },
      ...extra,
    });
  };

  const run = async (action, body = {}) => {
    setBusy(true);
    try {
      const res = await decide({
        workspaceId: data.workspaceId, nodeId: id, taskId: data.taskId || null, subtaskId: data.subtaskId || null, action, pmName, ...body,
      });
      const patch = res?.patch;
      if (!patch) throw new Error('The server did not confirm it');
      setError('');
      setRejecting(false);
      setNote('');
      (onServerPatch || onChange)?.(patch);
      return patch;
    } catch (err) {
      setError(err?.message || 'Could not record that');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const where = place ? ` (${place})` : '';
  const submit = async () => {
    const chosen = options.find((o) => o.key === approverKey);
    if (!chosen) { setError('Choose who should approve it'); return; }
    const problem = validate?.();
    if (problem) { setError(problem); return; }
    const patch = await run('submit', { approver: chosen.person, content: getContent?.() });
    if (!patch) return;
    tell([chosen.person], {
      type: 'approval_request',
      title: `Approval needed: ${what}`,
      message: `${viewer.name || 'A collaborator'} asks you to approve ${what}${where}`,
      actionRequired: true,
    });
  };
  const approve = async () => {
    const chosen = forward.options.find((o) => o.key === forwardKey);
    if (forward.options.length > 1 && !chosen) { setError(`Choose which ${ROLE_LABEL[forward.role]?.toLowerCase() || 'person'} to forward it to`); return; }
    const patch = await run('approve', chosen ? { forwardTo: chosen.person } : {});
    if (!patch) return;
    const next = pendingStep(patch.approvalChain);
    if (next) {
      tell([next.person], {
        type: 'approval_request',
        title: `Approval needed: ${what}`,
        message: `${viewer.name || 'A collaborator'} approved ${what} and passed it to you${where}`,
        actionRequired: true,
      });
    } else {
      tell([patch.approvalChain.origin], {
        type: 'approval_result',
        title: `Approved: ${what}`,
        message: `${viewer.name || 'The approver'} approved ${what}${where}`,
      });
    }
  };
  const reject = async () => {
    if (!note.trim()) { setError('Say why it is being sent back'); return; }
    const patch = await run('reject', { note });
    if (!patch) return;
    tell([patch.approvalChain.origin], {
      type: 'approval_result',
      title: `Sent back: ${what}`,
      message: `${viewer.name || 'The approver'} sent ${what} back${where}: ${note.trim()}`,
      actionRequired: true,
    });
  };

  const status = describeChain(chain);
  const rejectedStep = (chain?.steps || []).find((s) => s.decision === 'rejected');
  const Icon = state === 'approved' ? CheckCircle2 : state === 'rejected' ? ShieldAlert : Clock;

  return (
    <div className="space-y-2 text-xs" data-approval-state={state}>
      <div className="flex items-center gap-1.5" data-approval-status>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[status.tone].chip}`}>
          <Icon className="h-3 w-3" aria-hidden="true" />
          {status.text}
        </span>
      </div>

      <Trail chain={chain} />

      {state === 'rejected' && rejectedStep?.note ? (
        <div role="status" className="rounded-lg border border-danger/30 bg-danger/5 p-2 text-ink">
          <span className="font-medium text-danger">Sent back:</span> {rejectedStep.note}
          <div className="mt-1 text-dim">Put it right and send it again.</div>
        </div>
      ) : null}

      {canSend ? (
        <div className="space-y-1.5" data-approval-send>
          <label className="block text-[11px] text-dim">Ask for approval from
            <select
              value={approverKey}
              onChange={(e) => setApproverKey(e.target.value)}
              aria-label="Ask for approval from"
              className={`${selectClass} mt-0.5`}
            >
              <option value="">{options.length ? 'Choose who approves…' : 'Nobody available'}</option>
              {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
          {!options.length ? (
            <div className="text-[11px] text-dim">There is nobody in this workspace you can ask to approve this yet.</div>
          ) : null}
          <button type="button" onClick={submit} disabled={busy || !options.length} className={primaryButton}>
            {state === 'rejected' ? `${sendLabel} again` : sendLabel}
          </button>
        </div>
      ) : null}

      {state === 'draft' && !canSend && !locked ? <div className="text-dim">Not sent for approval yet</div> : null}

      {state === 'pending' && iAmApprover ? (
        <div className="space-y-1.5" data-approval-decide>
          {forward.options.length > 1 ? (
            <label className="block text-[11px] text-dim">Forward to the {ROLE_LABEL[forward.role]?.toLowerCase()}
              <select value={forwardKey} onChange={(e) => setForwardKey(e.target.value)} aria-label="Forward to" className={`${selectClass} mt-0.5`}>
                <option value="">Choose…</option>
                {forward.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </label>
          ) : null}
          {forward.options.length === 1 ? (
            <div className="text-[11px] text-dim">It will go on to <span className="font-medium text-ink">{forward.role === 'client' ? 'Client' : forward.options[0].person.name}</span> ({ROLE_LABEL[forward.role]}).</div>
          ) : null}
          {rejecting ? (
            <div className="space-y-1.5">
              <label className="block text-[11px] text-dim">Why is it being sent back?
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} aria-label="Why is it being sent back" className={`${selectClass} mt-0.5`} />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={reject} disabled={busy} className={primaryButton}>Confirm send back</button>
                <button type="button" onClick={() => { setRejecting(false); setError(''); }} className={smallButton}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={approve} disabled={busy} className={primaryButton}>
                {forward.options.length ? `Approve and forward` : 'Approve'}
              </button>
              <button type="button" onClick={() => { setRejecting(true); setError(''); }} className={smallButton}>Send back</button>
            </div>
          )}
        </div>
      ) : null}

      {state === 'pending' && !iAmApprover ? (
        <div className="text-dim" data-approval-waiting>
          Only <span className="font-medium text-ink">{shownName({ ...pendingStep(chain)?.person, role: pendingStep(chain)?.role }) || 'the approver'}</span> can approve this step.
          {iAmOrigin && editable ? (
            <button type="button" onClick={() => run('withdraw')} disabled={busy} className={`${smallButton} ml-2`}>
              <Undo2 className="h-3 w-3" aria-hidden="true" /> Withdraw
            </button>
          ) : null}
        </div>
      ) : null}

      {state === 'approved' && editable && (iAmOrigin || role === 'pm') ? (
        <button type="button" onClick={() => run('reopen')} disabled={busy} className={smallButton}>Reopen</button>
      ) : null}

      {error ? <div role="alert" className="text-danger">{error}</div> : null}
    </div>
  );
};

export default ApprovalPanel;
