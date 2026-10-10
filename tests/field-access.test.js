/**
 * fieldAccess — "who should answer" logic for form/choice elements.
 * Covers identity matching, single vs poll answering, lock-after-answer,
 * and restricted visibility (assignee + PM + creator).
 */
import { describe, it, expect } from 'vitest';
import {
  buildViewerIdentity, isSamePerson, isFieldAssigned, hasViewerAnswered,
  getFieldAccessState, appendAnswer, formatAnswerValue, canConfigureFieldAccess
} from '../src/pages/WorkspacePage/utils/fieldAccess.js';

const ravi = { vendorId: 'V-1', name: 'Ravi', email: 'ravi@x.com', role: 'vendor' };
const priya = { userId: 'U-2', name: 'Priya', email: 'priya@x.com', role: 'vendor' };
const pm = { pmId: 'PM-9', name: 'Nisha', email: 'nisha@x.com', role: 'pm' };

const viewerFrom = (user) => buildViewerIdentity(user, '');

const access = (over = {}) => ({
  assignees: [ravi],
  answerMode: 'single',
  reason: 'Need your rate',
  relatedNodeId: null,
  visibility: 'restricted',
  createdBy: pm,
  createdAt: new Date().toISOString(),
  ...over
});

describe('identity', () => {
  it('builds viewer ids from context', () => {
    const v = viewerFrom({ vendorId: 'V-1', email: 'ravi@x.com', name: 'Ravi' });
    expect(v.ids).toContain('V-1');
    expect(v.email).toBe('ravi@x.com');
  });

  it('falls back to URL params (PM/client arrive via links)', () => {
    const v = buildViewerIdentity({}, '?pmId=PM-9&userName=Nisha&userEmail=nisha%40x.com');
    expect(v.ids).toContain('PM-9');
    expect(v.name).toBe('Nisha');
    expect(v.email).toBe('nisha@x.com');
  });

  it('matches people by id or email', () => {
    expect(isSamePerson(ravi, viewerFrom({ vendorId: 'V-1' }))).toBe(true);
    expect(isSamePerson(ravi, viewerFrom({ email: 'RAVI@x.com' }))).toBe(true);
    expect(isSamePerson(ravi, viewerFrom({ vendorId: 'V-OTHER' }))).toBe(false);
  });
});

describe('getFieldAccessState — answering', () => {
  it('unassigned field behaves as before (anyone can answer)', () => {
    const s = getFieldAccessState({ fieldAccess: null, viewer: viewerFrom(ravi) });
    expect(s.assigned).toBe(false);
    expect(s.canAnswer).toBe(true);
  });

  it('only the assignee can answer an assigned field', () => {
    const a = access();
    expect(getFieldAccessState({ fieldAccess: a, viewer: viewerFrom(ravi) }).canAnswer).toBe(true);
    const other = getFieldAccessState({ fieldAccess: a, viewer: viewerFrom(priya) });
    expect(other.canAnswer).toBe(false);
    expect(other.waitingFor).toBe('Ravi');
  });

  it('locks after one answer in single mode', () => {
    const answers = [{ by: 'Ravi', byEmail: 'ravi@x.com', at: 'now', value: 'Option A' }];
    const s = getFieldAccessState({ fieldAccess: access(), fieldAnswers: answers, viewer: viewerFrom(ravi) });
    expect(s.answered).toBe(true);
    expect(s.canAnswer).toBe(false);
    expect(s.lastAnswer.value).toBe('Option A');
  });

  it('poll mode lets each assignee answer once, then stops them', () => {
    const a = access({ answerMode: 'poll', assignees: [ravi, priya] });
    const before = getFieldAccessState({ fieldAccess: a, viewer: viewerFrom(priya) });
    expect(before.canAnswer).toBe(true);

    const answers = [{ by: 'Ravi', byEmail: 'ravi@x.com', at: 'now', value: 'A' }];
    const priyaState = getFieldAccessState({ fieldAccess: a, fieldAnswers: answers, viewer: viewerFrom(priya) });
    expect(priyaState.canAnswer).toBe(true);         // Priya still to answer

    const raviState = getFieldAccessState({ fieldAccess: a, fieldAnswers: answers, viewer: viewerFrom(ravi) });
    expect(raviState.canAnswer).toBe(false);          // Ravi already did
    expect(raviState.alreadyAnswered).toBe(true);
  });

  it('locked element cannot be answered by anyone', () => {
    const s = getFieldAccessState({ fieldAccess: access(), viewer: viewerFrom(ravi), isLocked: true });
    expect(s.canAnswer).toBe(false);
  });
});

describe('getFieldAccessState — visibility', () => {
  const answers = [{ by: 'Ravi', byEmail: 'ravi@x.com', at: 'now', value: 'Option A' }];

  it('restricted: assignee, PM and creator can see the answer', () => {
    const a = access();
    expect(getFieldAccessState({ fieldAccess: a, fieldAnswers: answers, viewer: viewerFrom(ravi) }).canViewAnswer).toBe(true);
    expect(getFieldAccessState({ fieldAccess: a, fieldAnswers: answers, viewer: viewerFrom(pm), isPM: true }).canViewAnswer).toBe(true);
    // creator sees it even without the PM flag
    expect(getFieldAccessState({ fieldAccess: a, fieldAnswers: answers, viewer: viewerFrom(pm) }).canViewAnswer).toBe(true);
  });

  it('restricted: an unrelated user sees it restricted', () => {
    const s = getFieldAccessState({ fieldAccess: access(), fieldAnswers: answers, viewer: viewerFrom(priya) });
    expect(s.canViewAnswer).toBe(false);
    expect(s.restricted).toBe(true);
  });

  it('everyone visibility exposes the answer to all', () => {
    const s = getFieldAccessState({
      fieldAccess: access({ visibility: 'everyone' }), fieldAnswers: answers, viewer: viewerFrom(priya)
    });
    expect(s.canViewAnswer).toBe(true);
    expect(s.restricted).toBe(false);
  });
});

describe('answers', () => {
  it('single mode replaces the previous answer', () => {
    const out = appendAnswer({
      fieldAnswers: [{ by: 'Ravi', byEmail: 'ravi@x.com', at: 'old', value: 'A' }],
      viewer: viewerFrom(ravi), value: 'B', mode: 'single'
    });
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe('B');
  });

  it('poll mode accumulates answers from different people', () => {
    const out = appendAnswer({
      fieldAnswers: [{ by: 'Ravi', byEmail: 'ravi@x.com', at: 'old', value: 'A' }],
      viewer: viewerFrom(priya), value: ['B', 'C'], mode: 'poll'
    });
    expect(out).toHaveLength(2);
    expect(out[1].by).toBe('Priya');
  });

  it('records who answered and when', () => {
    const [entry] = appendAnswer({ fieldAnswers: [], viewer: viewerFrom(ravi), value: 'A' });
    expect(entry.by).toBe('Ravi');
    expect(entry.byRole).toBe('vendor');
    expect(entry.at).toBeTruthy();
  });

  it('formats answer values', () => {
    expect(formatAnswerValue(['A', 'B'])).toBe('A, B');
    expect(formatAnswerValue('')).toBe('—');
    expect(formatAnswerValue(null)).toBe('—');
  });

  it('isFieldAssigned detects assignments', () => {
    expect(isFieldAssigned(null)).toBe(false);
    expect(isFieldAssigned({ assignees: [] })).toBe(false);
    expect(isFieldAssigned({ assignees: [ravi] })).toBe(true);
  });

  it('hasViewerAnswered matches by email case-insensitively', () => {
    const answers = [{ by: 'Ravi', byEmail: 'ravi@x.com', at: 'now', value: 'A' }];
    expect(hasViewerAnswered(answers, viewerFrom({ email: 'RAVI@x.com' }))).toBe(true);
    expect(hasViewerAnswered(answers, viewerFrom({ email: 'other@x.com' }))).toBe(false);
  });
});

describe('canConfigureFieldAccess — creator/PM-only configuration', () => {
  const nodeData = {
    addedBy: 'Ravi',
    addedByEmail: 'ravi@x.com',
    addedByRole: 'vendor'
  };

  it('allows the element creator (matched by email)', () => {
    const viewer = viewerFrom({ email: 'RAVI@x.com', name: 'Ravi', role: 'vendor' });
    expect(canConfigureFieldAccess({ data: nodeData, viewer, isPM: false })).toBe(true);
  });

  it('allows a PM regardless of authorship', () => {
    const viewer = viewerFrom({ email: 'nisha@x.com', name: 'Nisha', role: 'pm' });
    expect(canConfigureFieldAccess({ data: nodeData, viewer, isPM: true })).toBe(true);
  });

  it('blocks an unrelated viewer with canvas access', () => {
    const viewer = viewerFrom({ email: 'other@x.com', name: 'Other', role: 'vendor' });
    expect(canConfigureFieldAccess({ data: nodeData, viewer, isPM: false })).toBe(false);
  });

  it('blocks the assignee too — answering is not configuring', () => {
    const viewer = viewerFrom({ email: 'priya@x.com', name: 'Priya', role: 'vendor' });
    expect(canConfigureFieldAccess({ data: nodeData, viewer, isPM: false })).toBe(false);
  });

  it('falls back to name+role on legacy nodes without addedByEmail', () => {
    const legacy = { addedBy: 'Ravi', addedByRole: 'vendor' };
    expect(canConfigureFieldAccess({
      data: legacy,
      viewer: viewerFrom({ name: 'Ravi', role: 'vendor' }),
      isPM: false
    })).toBe(true);
    // same name, different role does NOT match — weakens impersonation by display name
    expect(canConfigureFieldAccess({
      data: legacy,
      viewer: viewerFrom({ name: 'Ravi', role: 'client' }),
      isPM: false
    })).toBe(false);
  });

  it('denies everyone when the node carries no author data', () => {
    const viewer = viewerFrom({ email: 'me@x.com', name: 'Me', role: 'vendor' });
    expect(canConfigureFieldAccess({ data: {}, viewer, isPM: false })).toBe(false);
    expect(canConfigureFieldAccess({ data: null, viewer, isPM: false })).toBe(false);
  });
});
