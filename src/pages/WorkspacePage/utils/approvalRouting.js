/**
 * Approval routing for canvas elements that need a sign-off (permit, inspection, artwork,
 * moodboard, batch record).
 *
 * Who may be asked, in what order:
 *   vendor  -> PM or CAS member       CAS -> PM -> client -> done
 *   CAS     -> PM                     PM  -> client -> done
 *   client  -> PM                     PM  -> vendor -> done
 *   PM      -> anyone but themselves  that person approves -> done
 * The last stop is skipped when the workspace has no client (or no vendor, for a client's
 * element), and for elements with no end party (the batch record).
 *
 * This file only decides what the screen offers. The server applies the same rules and is the
 * one that counts (Vendor_Backend/modules/workspace/services/approvalChain.js).
 */
import { isSamePerson } from './fieldAccess';

export const ROLE_LABEL = { pm: 'Project manager', client: 'Client', vendor: 'Vendor', cas: 'CAS member' };

export const FIRST_APPROVER_ROLES = {
  vendor: ['pm', 'cas'],
  cas: ['pm'],
  client: ['pm'],
  pm: ['vendor', 'client', 'cas'],
};
export const END_PARTY_ROLE = { vendor: 'client', cas: 'client', client: 'vendor' };

/** Elements that have no end party: they close with the PM or CAS member. */
export const NO_END_PARTY_KINDS = ['batch'];

const ROLE_ORDER = { pm: 0, client: 1, vendor: 2, cas: 3 };
const keyOf = (c) => String(c?.vendorId || c?.userId || c?.id || '');

export const collaboratorRole = (c) => (c?.isPM ? 'pm' : c?.isClient ? 'client' : c?.isCAS ? 'cas' : 'vendor');

/** The identity stored with an approval step. */
export const toPerson = (c, role = collaboratorRole(c)) => ({
  vendorId: c?.vendorId || c?.userId || null,
  userId: c?.userId || null,
  name: String(c?.name || c?.email || 'Unknown').trim().slice(0, 80),
  email: c?.email && c.email !== 'N/A' ? c.email : null,
  role,
});

const usable = (c) => c && (c.vendorId || c.userId) && c.name && c.name !== 'Unknown User';

/**
 * The role the viewer plays in this workspace: matched against the collaborator list, which
 * carries the project manager, client, CAS and vendor flags. Falls back to the role on the session.
 */
export const viewerRole = (viewer, collaborators = []) => {
  const match = (collaborators || []).find((c) => usable(c) && isSamePerson({ vendorId: c.vendorId, userId: c.userId, email: c.email }, viewer));
  if (match) return collaboratorRole(match);
  const r = String(viewer?.role || '').toLowerCase();
  if (['pm', 'client', 'cas', 'vendor'].includes(r)) return r;
  return 'vendor';
};

const dedupe = (list) => {
  const seen = new Set();
  return list.filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)));
};

const toOption = (c) => {
  const role = collaboratorRole(c);
  const detail = role === 'vendor' && c.specialization && c.specialization !== 'General' ? `, ${String(c.specialization).slice(0, 30)}` : '';
  return { key: keyOf(c), person: toPerson(c, role), role, label: role === 'client' || String(c.name).trim() === ROLE_LABEL[role] ? ROLE_LABEL[role] : `${String(c.name).trim()} · ${ROLE_LABEL[role]}${detail}` };
};

/**
 * Who this viewer may ask first. A vendor never sees the client here.
 * @returns {Array<{ key: string, person: object, role: string, label: string }>}
 */
export const approverOptions = ({ collaborators = [], viewer, role }) => {
  const allowed = FIRST_APPROVER_ROLES[role] || [];
  return dedupe(
    (collaborators || [])
      .filter(usable)
      .filter((c) => !isSamePerson({ vendorId: c.vendorId, userId: c.userId, email: c.email }, viewer))
      .map(toOption)
      .filter((o) => allowed.includes(o.role))
  ).sort((a, b) => (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) || a.person.name.localeCompare(b.person.name));
};

/** The first open step of a chain, or null. */
export const pendingStep = (chain) => (chain?.steps || []).find((s) => s.decision === 'pending') || null;

/**
 * Is the viewer the person this is waiting for? Matched on id, then email, like the server.
 */
export const isCurrentApprover = (chain, viewer) => {
  const step = pendingStep(chain);
  return !!(chain?.state === 'pending' && step && isSamePerson(step.person, viewer));
};

export const isOrigin = (chain, viewer) => !!(chain?.origin && isSamePerson(chain.origin, viewer));

/**
 * When the PM approves, who the request can be forwarded to. Empty when there is nobody
 * (no client in the workspace), in which case the PM's approval closes it.
 */
export const forwardCandidates = ({ chain, collaborators = [], kind }) => {
  if (!chain || chain.state !== 'pending') return { role: null, options: [] };
  const step = pendingStep(chain);
  if (!step || step.role !== 'pm' || chain.originRole === 'pm' || NO_END_PARTY_KINDS.includes(kind)) {
    return { role: null, options: [] };
  }
  const role = END_PARTY_ROLE[chain.originRole];
  const taken = new Set([...(chain.steps || []).map((s) => keyOf(s.person)), keyOf(chain.origin)]);
  const options = dedupe((collaborators || []).filter(usable).map(toOption))
    .filter((o) => o.role === role && !taken.has(o.key))
    .sort((a, b) => a.person.name.localeCompare(b.person.name));
  return { role, options };
};

/** The element's approval state, so a version-bound element (artwork) ignores a chain for an older version. */
export const chainFor = (data, subject = '') => {
  const chain = data?.approvalChain || null;
  if (!chain) return null;
  if (subject && chain.subject && chain.subject !== subject) return null;
  return chain;
};

// ---- The client is never named -----------------------------------------------
// Every approval stamp is visible to everyone on the canvas, so a client's stamp reads
// "Client": no name, no e-mail. New stamps are written that way by the server; this also
// covers stamps written before that rule.
export const CLIENT_LABEL = 'Client';

/** Name to show for a stamp or person: the client is always just "Client". */
export const shownName = (p) => (p?.role === 'client' ? CLIENT_LABEL : (p?.name || ''));

/**
 * A name stored as plain text (signoff.by, decidedBy, approvedBy.name ...) that really is
 * the client's: matched against the client steps of the element's own approval chain.
 */
export const clientSafeName = (name, chain) => {
  if (!name) return name;
  const key = String(name).trim().toLowerCase();
  const steps = Array.isArray(chain?.steps) ? chain.steps : [];
  const isClient = (who) => who?.role === 'client';
  const hit = steps.some((st) => [st.by, st.person].some((who) => (isClient(who) || st.role === 'client')
    && [who?.name, who?.email].filter(Boolean).some((v) => String(v).trim().toLowerCase() === key)));
  return hit ? CLIENT_LABEL : name;
};

/** "Waiting for Priya (Project manager)" and so on. */
export const describeChain = (chain) => {
  if (!chain || chain.state === 'draft') return { tone: 'neutral', text: 'Not sent for approval' };
  if (chain.state === 'approved') {
    const lastDone = [...(chain.steps || [])].reverse().find((s) => s.decision === 'approved');
    return { tone: 'success', text: `Approved${shownName({ ...lastDone?.by, role: lastDone?.by?.role || lastDone?.role }) ? ` by ${shownName({ ...lastDone.by, role: lastDone.by?.role || lastDone.role })}` : ''}` };
  }
  if (chain.state === 'rejected') {
    const stop = (chain.steps || []).find((s) => s.decision === 'rejected');
    return { tone: 'danger', text: `Sent back${shownName({ ...stop?.by, role: stop?.by?.role || stop?.role }) ? ` by ${shownName({ ...stop.by, role: stop.by?.role || stop.role })}` : ''}` };
  }
  const step = pendingStep(chain);
  return { tone: 'warning', text: step ? `Waiting for ${shownName({ ...step.person, role: step.person?.role || step.role }) || 'the approver'} (${ROLE_LABEL[step.role] || step.role})` : 'Waiting for approval' };
};
