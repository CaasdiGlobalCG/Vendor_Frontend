/**
 * fieldAccess — per-field "who should answer" logic for form/choice elements.
 *
 * Stored on the node (no backend changes):
 *   fieldAccess: {
 *     assignees: [{ vendorId, userId, id, name, email, role }],
 *     answerMode: 'single' | 'poll',      // poll only meaningful for Checkbox Group
 *     reason: string,
 *     relatedNodeId: string | null,       // "Related to" reference chip
 *     visibility: 'restricted' | 'everyone',
 *     createdBy: { name, email, role, vendorId, userId, id },
 *     createdAt: ISO
 *   }
 *   fieldAnswers: [{ by, byEmail, byRole, at, value }]
 *
 * `restricted` visibility = assignees + PM + the element's creator.
 */

/** Build the viewer's identity from app context + URL params (PM/client arrive via links). */
export const buildViewerIdentity = (currentUser, search = '') => {
  let params;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    params = new URLSearchParams('');
  }
  const dec = (v) => {
    if (!v) return null;
    try { return decodeURIComponent(v); } catch { return v; }
  };
  return {
    ids: [
      currentUser?.vendorId,
      currentUser?.userId,
      currentUser?.pmId,
      currentUser?.id,
      currentUser?.clientId,
      params.get('vendorId'),
      params.get('pmId'),
      params.get('userId'),
      params.get('clientId')
    ].filter(Boolean).map(String),
    email: currentUser?.email || dec(params.get('userEmail')),
    name: currentUser?.name || dec(params.get('userName')) || currentUser?.email || 'Unknown User',
    role: currentUser?.role || currentUser?.userType || params.get('role') || null
  };
};

/** Resolve the viewer's workspace role — URL params first (PM/client links), then context. */
export const resolveViewerRole = (currentUser, search = '') => {
  let params;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    params = new URLSearchParams('');
  }
  const urlRole = params.get('userRole');
  const urlUserId = params.get('userId') || '';
  // Finance staff enter via CAS-style links but carry FIN-* user ids
  if (urlRole === 'finance' || urlUserId.startsWith('FIN-')) return 'finance';
  if (urlRole && ['vendor', 'pm', 'client'].includes(urlRole)) return urlRole;
  return currentUser?.role || 'vendor';
};

/** Do these two identity records refer to the same person? */
export const isSamePerson = (a, viewer) => {
  if (!a || !viewer) return false;
  const aIds = [a.vendorId, a.userId, a.id, a.pmId].filter(Boolean).map(String);
  if (aIds.length && aIds.some(id => viewer.ids?.includes(id))) return true;
  if (a.email && viewer.email) {
    return String(a.email).toLowerCase() === String(viewer.email).toLowerCase();
  }
  return false;
};

/** True when the element carries an assignment at all. */
export const isFieldAssigned = (fieldAccess) => Boolean(fieldAccess?.assignees?.length);

/** Has this viewer already answered? (poll mode uses this to stop double-answering) */
export const hasViewerAnswered = (fieldAnswers, viewer) =>
  (fieldAnswers || []).some(a => isSamePerson({ email: a.byEmail, name: a.by }, viewer) ||
    (a.byEmail && viewer?.email && String(a.byEmail).toLowerCase() === String(viewer.email).toLowerCase()));

/**
 * Single source of truth for how a field should behave for this viewer.
 * Pure — takes everything it needs, so it is trivially unit-testable.
 */
export const getFieldAccessState = ({ fieldAccess, fieldAnswers = [], viewer, isLocked = false, isPM = false }) => {
  const assigned = isFieldAssigned(fieldAccess);
  const answers = Array.isArray(fieldAnswers) ? fieldAnswers : [];
  const answered = answers.length > 0;
  const isAssignedViewer = assigned && (fieldAccess.assignees || []).some(a => isSamePerson(a, viewer));
  const isCreator = isSamePerson(fieldAccess?.createdBy, viewer);
  const pollMode = fieldAccess?.answerMode === 'poll';
  const alreadyAnswered = hasViewerAnswered(answers, viewer);

  // Who may see the answer value
  const canViewAnswer = !assigned
    || fieldAccess.visibility === 'everyone'
    || isAssignedViewer
    || isPM
    || isCreator;

  // Who may change the control
  let canAnswer = true;
  if (isLocked) {
    canAnswer = false;
  } else if (!assigned) {
    canAnswer = true;                       // unassigned → anyone (current behaviour)
  } else if (pollMode) {
    canAnswer = isAssignedViewer && !alreadyAnswered;  // each assignee answers once
  } else {
    canAnswer = isAssignedViewer && !answered;         // single: locks after one answer
  }

  const waitingFor = assigned && !answered
    ? (fieldAccess.assignees || []).map(a => a.name || a.email).filter(Boolean).join(', ')
    : null;

  return {
    assigned,
    answered,
    answers,
    pollMode,
    isAssignedViewer,
    isCreator,
    canAnswer,
    canViewAnswer,
    alreadyAnswered,
    waitingFor,
    restricted: answered && !canViewAnswer,
    lastAnswer: answered ? answers[answers.length - 1] : null
  };
};

/** Append an answer for the current viewer, replacing their earlier one in single mode. */
export const appendAnswer = ({ fieldAnswers = [], viewer, value, mode = 'single' }) => {
  const entry = {
    by: viewer?.name || 'Unknown User',
    byEmail: viewer?.email || null,
    byRole: viewer?.role || null,
    at: new Date().toISOString(),
    value
  };
  const others = (fieldAnswers || []).filter(a =>
    !(a.byEmail && viewer?.email && String(a.byEmail).toLowerCase() === String(viewer.email).toLowerCase())
  );
  return mode === 'poll' ? [...others, entry] : [entry];
};

/**
 * Can this viewer configure the field's assignment/visibility?
 * Only the element's creator (addedBy) or a PM — not assignees or other viewers.
 */
export const canConfigureFieldAccess = ({ data, viewer, isPM }) => {
  if (isPM) return true;
  if (!data) return false;
  // Primary: email match against the node's author
  if (data.addedByEmail && viewer?.email &&
      String(data.addedByEmail).toLowerCase() === String(viewer.email).toLowerCase()) {
    return true;
  }
  // Fallback for legacy nodes that never stored addedByEmail — name + role
  if (data.addedBy && viewer?.name &&
      String(data.addedBy).toLowerCase() === String(viewer.name).toLowerCase() &&
      (!data.addedByRole || !viewer?.role || data.addedByRole === viewer.role)) {
    return true;
  }
  return false;
};

/** Human summary of a recorded answer value. */
export const formatAnswerValue = (value) => {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};
