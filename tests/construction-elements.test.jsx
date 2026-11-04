/**
 * Construction elements: snag list, inspection checklist, concrete pour card,
 * measurement sheet, running bill tracker, permit to work.
 * Rules are tested against hand-worked figures and a fixed clock.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';

import {
  CONSTRUCTION_KINDS, CONSTRUCTION_LIMITS, sanitizeSnags, addSnag, isSnagOverdue, snagSummary, setSnagStatus,
  visibleSnags, STAGE_PRESETS, applyStagePreset, inspectSummary, decideInspection, reopenInspection,
  gradeStrength, cubeJudgement, cubeTarget, pourSummary, testDue, addCubeSet, rowQuantity, mbTotals, unitHint,
  billItemFigures, billTotals, permitWindow, permitState, closePermit, cancelPermit, applyPermitPreset,
  PERMIT_TYPES, getConstructionElements, permitPeople, permitPerson, permitRoles, permitIssuer,
  requestPermitApproval, withdrawPermitRequest, approvePermit, declinePermit,
} from '../src/pages/WorkspacePage/utils/constructionElements.js';
import {
  SnagBlock, SiteInspectBlock, PourBlock, MeasureBookBlock, RaBillBlock, PermitBlock,
} from '../src/pages/WorkspacePage/components/nodes/constructionViews.jsx';
import BlockNode from '../src/pages/WorkspacePage/components/nodes/BlockNode.jsx';
import { estimateElementSize } from '../src/pages/WorkspacePage/utils/canvasPlacement.js';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.DOMMatrixReadOnly = class { constructor() { this.m22 = 1; } };
});
afterEach(() => cleanup());

const NOW = new Date(2026, 9, 10, 14, 0); // 10 Oct 2026, 2 pm local

describe('snag rules', () => {
  it('numbers are fixed: deleting one never renumbers, and a number is not handed out twice', () => {
    let state = { items: [], snagSeq: 0 };
    for (let i = 0; i < 3; i += 1) state = addSnag(state.items, state.snagSeq);
    expect(state.items.map((s) => s.no)).toEqual([1, 2, 3]);
    const afterDelete = state.items.filter((s) => s.no !== 2);
    expect(sanitizeSnags(afterDelete).map((s) => s.no)).toEqual([1, 3]);
    expect(addSnag(afterDelete, state.snagSeq).items.map((s) => s.no)).toEqual([1, 3, 4]);
    // even if the highest is deleted, its number is not reused
    expect(addSnag(afterDelete.filter((s) => s.no !== 3), state.snagSeq).items.map((s) => s.no)).toEqual([1, 4]);
  });

  it('refuses a snag past the limit', () => {
    const full = Array.from({ length: CONSTRUCTION_LIMITS.snags }, (_, i) => ({ id: `s${i}`, no: i + 1 }));
    expect(addSnag(full, 100)).toBeNull();
  });

  it('is overdue only when not verified and the due day is before today', () => {
    expect(isSnagOverdue({ status: 'open', due: '2026-10-09' }, NOW)).toBe(true);
    expect(isSnagOverdue({ status: 'fixed', due: '2026-10-09' }, NOW)).toBe(true);
    expect(isSnagOverdue({ status: 'open', due: '2026-10-10' }, NOW)).toBe(false); // due today
    expect(isSnagOverdue({ status: 'verified', due: '2026-09-01' }, NOW)).toBe(false);
    expect(isSnagOverdue({ status: 'open', due: '' }, NOW)).toBe(false);
  });

  const items = [
    { id: 'a', no: 1, status: 'verified', due: '2026-10-01' },
    { id: 'b', no: 2, status: 'fixed', due: '2026-10-20' },
    { id: 'c', no: 3, status: 'open', due: '2026-10-05' },
    { id: 'd', no: 4, status: 'open', due: '' },
  ];

  it('summarises and sorts overdue first', () => {
    expect(snagSummary(items, NOW)).toEqual({ total: 4, open: 2, fixed: 1, verified: 1, overdue: 1, percent: 25 });
    expect(visibleSnags(items, 'all', NOW).map((s) => s.no)).toEqual([3, 1, 2, 4]);
    expect(visibleSnags(items, 'overdue', NOW).map((s) => s.no)).toEqual([3]);
    expect(visibleSnags(items, 'open', NOW).map((s) => s.no)).toEqual([3, 2, 4]);
  });

  it('verifying needs Fixed first and a name; reopening clears the verification', () => {
    expect(setSnagStatus(items, 'c', 'verified', { by: 'Ravi' }, NOW).error).toMatch(/fixed/i);
    expect(setSnagStatus(items, 'b', 'verified', { by: ' ' }, NOW).error).toMatch(/name/i);
    const ok = setSnagStatus(items, 'b', 'verified', { by: 'Ravi' }, NOW).items.find((s) => s.id === 'b');
    expect(ok).toMatchObject({ status: 'verified', verifiedBy: 'Ravi', verifiedAt: NOW.toISOString() });
    const reopened = setSnagStatus([ok], 'b', 'open', {}, NOW).items[0];
    expect(reopened).toMatchObject({ status: 'open', verifiedBy: '', verifiedAt: null });
  });

  it('drops unsafe photo addresses', () => {
    expect(sanitizeSnags([{ id: 'a', photoUrl: 'javascript:alert(1)' }])[0].photoUrl).toBe('');
  });
});

describe('inspection rules', () => {
  const line = (result) => ({ id: `l-${Math.random()}`, text: 'x', result });

  it('loads a stage preset only into an empty checklist', () => {
    const loaded = applyStagePreset([], 'Pre-pour');
    expect(loaded).toHaveLength(STAGE_PRESETS['Pre-pour'].length);
    expect(loaded.every((l) => l.result === 'pending')).toBe(true);
    const existing = [{ id: 'k', text: 'Mine', result: 'pass', remark: '' }];
    expect(applyStagePreset(existing, 'Pre-pour')).toEqual(existing);
    expect(applyStagePreset([], 'No such stage')).toEqual([]);
  });

  it('counts results', () => {
    expect(inspectSummary([line('pass'), line('pass'), line('fail'), line('pending'), line('na')]))
      .toEqual({ total: 5, pass: 2, fail: 1, pending: 1, na: 1 });
  });

  it('accepting is blocked while a line is pending or failed, or when there are none', () => {
    expect(decideInspection({ lines: [] }, { status: 'approved', by: 'Asha' }, NOW).error).toMatch(/at least one/i);
    expect(decideInspection({ lines: [line('pass'), line('pending'), line('pending')] }, { status: 'approved', by: 'Asha' }, NOW).error)
      .toMatch(/2 lines are still pending/i);
    expect(decideInspection({ lines: [line('pass'), line('fail')] }, { status: 'approved', by: 'Asha' }, NOW).error)
      .toMatch(/1 line has failed/i);
  });

  it('accepting needs a name; pass and N/A lines are fine', () => {
    const data = { lines: [line('pass'), line('na')] };
    expect(decideInspection(data, { status: 'approved', by: ' ' }, NOW).error).toMatch(/name/i);
    const ok = decideInspection(data, { status: 'approved', by: 'Asha Rao' }, NOW);
    expect(ok.approval).toMatchObject({ status: 'approved', by: 'Asha Rao', at: NOW.toISOString() });
  });

  it('rejecting needs a reason, and works even with failed lines', () => {
    const data = { lines: [line('fail')] };
    expect(decideInspection(data, { status: 'changes', note: '' }, NOW).error).toMatch(/what needs to change/i);
    expect(decideInspection(data, { status: 'changes', note: 'Cover too thin' }, NOW).approval.status).toBe('changes');
  });

  it('a decided inspection cannot be decided again until reopened', () => {
    const signed = decideInspection({ lines: [line('pass')] }, { status: 'approved', by: 'Asha' }, NOW).approval;
    expect(decideInspection({ lines: [line('pass')], signoff: signed }, { status: 'changes', note: 'x' }, NOW).error).toMatch(/already/i);
    const reopened = reopenInspection(signed, NOW);
    expect(reopened.status).toBe('pending');
    expect(reopened.history[0]).toMatchObject({ status: 'approved', by: 'Asha' });
  });
});

describe('pour rules', () => {
  it('reads the grade', () => {
    expect(gradeStrength('M25')).toBe(25);
    expect(gradeStrength('m 30')).toBe(30);
    expect(gradeStrength('M100')).toBe(100);
    expect(gradeStrength('Fe500')).toBeNull();
    expect(gradeStrength('')).toBeNull();
  });

  it('judges 28-day results against the grade and 7-day against the expected share', () => {
    expect(cubeJudgement({ age: 28, strength: '26' }, 25)).toBe('meets');
    expect(cubeJudgement({ age: 28, strength: '25' }, 25)).toBe('meets');
    expect(cubeJudgement({ age: 28, strength: '24.9' }, 25)).toBe('below');
    expect(cubeJudgement({ age: 7, strength: '16.25' }, 25, 65)).toBe('meets'); // 65% of 25
    expect(cubeJudgement({ age: 7, strength: '16' }, 25, 65)).toBe('below');
    expect(cubeJudgement({ age: 7, strength: '15' }, 25, 60)).toBe('meets'); // 60% of 25 = 15
    expect(cubeJudgement({ age: 28, strength: '' }, 25)).toBe('pending');
    expect(cubeJudgement({ age: 28, strength: 'abc' }, 25)).toBe('invalid');
    expect(cubeJudgement({ age: 28, strength: '-3' }, 25)).toBe('invalid');
    expect(cubeJudgement({ age: 28, strength: '30' }, null)).toBe('invalid'); // grade not recognised
    expect(cubeTarget(7, 25, 65)).toBe(16.25);
    expect(cubeTarget(28, 25)).toBe(25);
  });

  it('averages the numbers entered, per age', () => {
    const s = pourSummary({
      grade: 'M25', expect7Pct: 65,
      cubes: [
        { age: 28, strength: '26.5' }, { age: 28, strength: '27.1' }, { age: 28, strength: '' },
        { age: 7, strength: '17' },
      ],
    });
    expect(s.fck).toBe(25);
    expect(s.d28).toMatchObject({ count: 3, tested: 2, average: 26.8, meets: 2, below: 0, target: 25 });
    expect(s.d7).toMatchObject({ count: 1, average: 17, meets: 1, target: 16.25 });
  });

  it('works out when tests fall due, across month ends', () => {
    expect(testDue('2026-10-01', 7, NOW)).toEqual({ dueDate: '2026-10-08', daysUntil: -2, state: 'overdue' });
    expect(testDue('2026-10-03', 7, NOW)).toEqual({ dueDate: '2026-10-10', daysUntil: 0, state: 'today' });
    expect(testDue('2026-10-01', 28, NOW)).toEqual({ dueDate: '2026-10-29', daysUntil: 19, state: 'upcoming' });
    expect(testDue('2026-10-20', 28, NOW).dueDate).toBe('2026-11-17');
    expect(testDue('', 7, NOW)).toBeNull();
  });

  it('adds sets of three cubes, marked by age, and stops at the limit', () => {
    let cubes = addCubeSet([], 7);
    expect(cubes.map((c) => c.mark)).toEqual(['7d-1', '7d-2', '7d-3']);
    cubes = addCubeSet(cubes, 7);
    expect(cubes.map((c) => c.mark).slice(3)).toEqual(['7d-4', '7d-5', '7d-6']);
    const full = Array.from({ length: 22 }, (_, i) => ({ id: `c${i}`, age: 7 }));
    expect(addCubeSet(full, 28)).toBeNull();
  });
});

describe('measurement rules', () => {
  it('multiplies the numbers that are filled in and ignores blanks', () => {
    expect(rowQuantity({ nos: '2', l: '3', b: '0.5', d: '0.2' })).toMatchObject({ qty: 0.6, state: 'ok', dims: 3 });
    expect(rowQuantity({ nos: '', l: '10', b: '2', d: '' })).toMatchObject({ qty: 20, state: 'ok', dims: 2 });
    expect(rowQuantity({ nos: '4', l: '', b: '', d: '' })).toMatchObject({ qty: 4, state: 'ok', dims: 0 });
    expect(rowQuantity({ nos: '', l: '', b: '', d: '' }).state).toBe('empty');
  });

  it('rejects negative, zero and non-numeric entries instead of guessing', () => {
    expect(rowQuantity({ l: '-3', b: '2' }).state).toBe('invalid');
    expect(rowQuantity({ l: '0', b: '2' }).state).toBe('invalid');
    expect(rowQuantity({ l: 'ten', b: '2' }).state).toBe('invalid');
  });

  it('adds and deducts, and reports what was not counted', () => {
    const t = mbTotals({
      rows: [
        { id: 'a', kind: 'add', nos: '2', l: '3', b: '0.5', d: '0.2' }, // 0.6
        { id: 'b', kind: 'add', l: '10', b: '2' },                        // 20
        { id: 'c', kind: 'deduct', l: '5' },                              // 5
        { id: 'd', kind: 'add' },                                         // empty
        { id: 'e', kind: 'add', l: '-1' },                                // invalid
      ],
    });
    expect(t).toMatchObject({ add: 20.6, deduct: 5, total: 15.6, counted: 3, skipped: 1, invalid: 1, deductionExceeds: false });
  });

  it('flags deductions larger than the additions', () => {
    expect(mbTotals({ rows: [{ kind: 'add', l: '2' }, { kind: 'deduct', l: '5' }] })).toMatchObject({ total: -3, deductionExceeds: true });
  });

  it('hints when the dimensions do not suit the unit', () => {
    expect(unitHint({ l: '2', b: '3' }, 'm³')).toBe('m³ usually needs 3 of L, B and D');
    expect(unitHint({ l: '2', b: '3' }, 'm²')).toBe('');
    expect(unitHint({ l: '2', b: '3', d: '1' }, 'm³')).toBe('');
    expect(unitHint({ l: '2' }, 'kg')).toBe('');
    expect(unitHint({ nos: '3', l: '2' }, 'nos')).toMatch(/not used/i);
  });
});

describe('running bill rules', () => {
  it('works out one item: to date, amounts, percent complete, excess', () => {
    expect(billItemFigures({ boqQty: '200', rate: '250', prevQty: '60', thisQty: '100' }))
      .toEqual({ valid: true, toDate: 160, amountThis: 25000, amountToDate: 40000, percent: 80, excess: false });
    expect(billItemFigures({ boqQty: '100', rate: '10', prevQty: '90', thisQty: '20' })).toMatchObject({ toDate: 110, percent: 110, excess: true });
    expect(billItemFigures({ boqQty: '100', rate: '-10', prevQty: '0', thisQty: '5' }).valid).toBe(false);
    expect(billItemFigures({ boqQty: '', rate: '50', prevQty: '', thisQty: '4' })).toMatchObject({ valid: true, percent: null, excess: false, amountThis: 200 });
  });

  it('net payable = gross + GST − retention − advance (hand-worked)', () => {
    const t = billTotals({
      retentionPct: 5, gstPct: 18, advanceRecovery: '2000',
      items: [{ id: 'a', boqQty: '200', rate: '250', prevQty: '60', thisQty: '100' }],
    });
    expect(t).toMatchObject({ grossThis: 25000, gst: 4500, retention: 1250, advance: 2000, net: 26250, grossToDate: 40000 });
  });

  it('falls back to 5% retention and 18% GST when blank or out of range, and honours 0', () => {
    const items = [{ id: 'a', boqQty: '10', rate: '100', prevQty: '0', thisQty: '10' }]; // 1000
    expect(billTotals({ retentionPct: '', gstPct: 'x', items })).toMatchObject({ retentionPct: 5, gstPct: 18 });
    expect(billTotals({ retentionPct: '150', gstPct: '', items }).retentionPct).toBe(5);
    expect(billTotals({ retentionPct: '0', gstPct: '0', items })).toMatchObject({ retention: 0, gst: 0, net: 1000 });
  });

  it('counts items it cannot use and items above the BOQ', () => {
    const t = billTotals({
      items: [
        { id: 'a', boqQty: '10', rate: '100', prevQty: '9', thisQty: '3' },
        { id: 'b', boqQty: '10', rate: 'abc', prevQty: '0', thisQty: '1' },
      ],
    });
    expect(t).toMatchObject({ invalid: 1, excess: 1, grossThis: 300 });
  });
});

describe('permit rules', () => {
  // viewers as built by buildViewerIdentity
  const dropper = { ids: ['V-1'], email: 'meera@vendor.com', name: 'Meera Nair', role: 'vendor' };
  const supervisor = { ids: ['V-2'], email: 'suresh@vendor.com', name: 'Suresh Kumar', role: 'vendor' };
  const pm = { ids: ['PM-9'], email: null, name: 'Priya PM', role: 'pm' };
  const collaborators = [
    { vendorId: 'PM-9', name: 'Priya PM', email: 'pm@construction.com', isPM: true },
    { vendorId: 'C-3', name: 'Acme Client', email: 'client@acme.com', isClient: true },
    { vendorId: 'V-1', name: 'Meera Nair', email: 'meera@vendor.com', specialization: 'Civil' },
    { vendorId: 'V-2', name: 'Suresh Kumar', email: 'suresh@vendor.com', specialization: 'Electrical' },
    { vendorId: 'V-2', name: 'Suresh Kumar', email: 'suresh@vendor.com' },          // duplicate
    { vendorId: 'X-0', name: 'Unknown User', email: 'N/A' },                         // cannot be identified
    { userId: 'CAS-4', name: 'Safety Unit', email: 'cas@x.com', isCAS: true },
  ];
  const draft = () => ({
    type: 'Work at height', location: 'Terrace', work: 'Railing',
    validFrom: '2026-10-10T08:00', validTo: '2026-10-10T17:00', status: 'draft',
    addedBy: 'Meera Nair', addedByEmail: 'meera@vendor.com', addedByRole: 'vendor',
    issuedToPerson: permitPerson(collaborators[3]),
    precautions: PERMIT_TYPES['Work at height'].map((text, i) => ({ id: `p${i}`, text, state: i % 2 ? 'yes' : 'na' })),
  });
  const requested = () => ({ ...draft(), ...requestPermitApproval(draft(), dropper, NOW).patch });

  it('applies precautions only when none exist', () => {
    const lines = applyPermitPreset([], 'Hot work');
    expect(lines).toHaveLength(PERMIT_TYPES['Hot work'].length);
    expect(lines.every((l) => l.state === '')).toBe(true);
    const existing = [{ id: 'a', text: 'Mine', state: 'yes' }];
    expect(applyPermitPreset(existing, 'Hot work')).toEqual(existing);
  });

  it('works out the window and warns past 24 hours', () => {
    expect(permitWindow('2026-10-10T08:00', '2026-10-10T17:00')).toEqual({ valid: true, hours: 9, tooLong: false });
    expect(permitWindow('2026-10-10T08:00', '2026-10-11T10:00')).toMatchObject({ valid: true, hours: 26, tooLong: true });
    expect(permitWindow('2026-10-10T17:00', '2026-10-10T08:00').valid).toBe(false);
    expect(permitWindow('', '2026-10-10T08:00').valid).toBe(false);
  });

  describe('who it can go to', () => {
    it('lists the workspace collaborators, without the sender, duplicates or unknown people', () => {
      const people = permitPeople(collaborators, dropper);
      expect(people.map((p) => p.person.name)).toEqual(['Priya PM', 'Acme Client', 'Suresh Kumar', 'Safety Unit']);
      expect(people.map((p) => p.person.role)).toEqual(['pm', 'client', 'vendor', 'cas']);
      expect(people[2].label).toBe('Suresh Kumar · Vendor, Electrical');
      expect(people.find((p) => p.person.name === 'Meera Nair')).toBeUndefined();
    });

    it('keeps the stored identity small and honest', () => {
      expect(permitPerson(collaborators[0])).toEqual({ vendorId: 'PM-9', userId: null, name: 'Priya PM', email: 'pm@construction.com', role: 'pm' });
      expect(permitPerson({ vendorId: 'V', name: 'No Email', email: 'N/A' }).email).toBeNull();
    });
  });

  describe('"Issued by" is whoever dropped the element', () => {
    it('uses the name stamped when the element was dropped, not the person sending it', () => {
      expect(permitIssuer(draft(), supervisor)).toMatchObject({ name: 'Meera Nair', role: 'vendor', email: 'meera@vendor.com' });
    });
    it('falls back to the sender for an older element with no author', () => {
      expect(permitIssuer({}, supervisor).name).toBe('Suresh Kumar');
    });
  });

  describe('sending for approval', () => {
    it('sends to the chosen person and records who sent it and when', () => {
      const r = requestPermitApproval(draft(), dropper, NOW);
      expect(r.patch).toMatchObject({
        status: 'requested', issuedBy: 'Meera Nair', issuedByRole: 'vendor', issuedTo: 'Suresh Kumar',
        requestedAt: NOW.toISOString(), declinedAt: null, declineReason: '',
      });
      expect(r.patch.requestedBy).toMatchObject({ vendorId: 'V-1', name: 'Meera Nair' });
    });

    it('needs someone chosen, and not the sender', () => {
      expect(requestPermitApproval({ ...draft(), issuedToPerson: null }, dropper, NOW).error).toMatch(/who the permit is issued to/i);
      expect(requestPermitApproval({ ...draft(), issuedToPerson: permitPerson(collaborators[2]) }, dropper, NOW).error).toMatch(/person who sends/i);
    });

    it('needs a type, place, a window that is still ahead, and every precaution answered with no "No"', () => {
      expect(requestPermitApproval({ ...draft(), location: '' }, dropper, NOW).error).toMatch(/where/i);
      expect(requestPermitApproval({ ...draft(), validTo: '2026-10-10T07:00' }, dropper, NOW).error).toMatch(/end after the start/i);
      expect(requestPermitApproval({ ...draft(), validFrom: '2026-10-10T06:00', validTo: '2026-10-10T13:00' }, dropper, NOW).error).toMatch(/already passed/i);
      const unanswered = draft();
      unanswered.precautions[0].state = '';
      expect(requestPermitApproval(unanswered, dropper, NOW).error).toMatch(/1 precaution is not answered/i);
      const no = draft();
      no.precautions[1].state = 'no';
      expect(requestPermitApproval(no, dropper, NOW).error).toMatch(/marked No/i);
      expect(requestPermitApproval({ ...draft(), precautions: [] }, dropper, NOW).error).toMatch(/add the precautions/i);
    });

    it('cannot be sent twice, but can be sent again after a decline', () => {
      expect(requestPermitApproval(requested(), dropper, NOW).error).toMatch(/already been sent/i);
      const declined = { ...requested(), status: 'declined' };
      expect(requestPermitApproval(declined, dropper, NOW).patch.status).toBe('requested');
    });

    it('can be taken back while it is waiting', () => {
      expect(withdrawPermitRequest(requested()).patch).toEqual({ status: 'draft', requestedAt: null, requestedBy: null });
      expect(withdrawPermitRequest(draft()).error).toMatch(/no request/i);
    });
  });

  describe('approval', () => {
    it('only the chosen person can approve, and the approval records who and when', () => {
      const req = requested();
      expect(approvePermit(req, dropper, NOW).error).toMatch(/only Suresh Kumar can approve/i);
      expect(approvePermit(req, pm, NOW).error).toMatch(/only Suresh Kumar can approve/i); // not even the PM
      const ok = approvePermit(req, supervisor, NOW);
      expect(ok.patch).toMatchObject({ status: 'issued', approvedAt: NOW.toISOString(), issuedAt: NOW.toISOString() });
      expect(ok.patch.approvedBy).toMatchObject({ vendorId: 'V-2', name: 'Suresh Kumar' });
    });

    it('is matched by email too, for someone whose id is not in the session', () => {
      const byEmail = { ids: [], email: 'SURESH@vendor.com', name: 'S', role: 'vendor' };
      expect(approvePermit(requested(), byEmail, NOW).patch.status).toBe('issued');
    });

    it('cannot approve a request nobody sent, an ended window, or your own request', () => {
      expect(approvePermit(draft(), supervisor, NOW).error).toMatch(/no request/i);
      expect(approvePermit(requested(), supervisor, new Date(2026, 9, 10, 18, 0)).error).toMatch(/end time has passed/i);
      const self = { ...requested(), requestedBy: { vendorId: 'V-2', name: 'Suresh Kumar' } };
      expect(approvePermit(self, supervisor, NOW).error).toMatch(/person who sent it/i);
    });

    it('declining needs a reason and only the chosen person can decline', () => {
      expect(declinePermit(requested(), supervisor, { note: '' }, NOW).error).toMatch(/why/i);
      expect(declinePermit(requested(), dropper, { note: 'No' }, NOW).error).toMatch(/only Suresh/i);
      const r = declinePermit(requested(), supervisor, { note: 'Harness not checked' }, NOW);
      expect(r.patch).toMatchObject({ status: 'declined', declineReason: 'Harness not checked', declinedAt: NOW.toISOString() });
      expect(r.patch.declinedBy.name).toBe('Suresh Kumar');
    });

    it('tells the sender and the approver apart', () => {
      const req = requested();
      expect(permitRoles(req, dropper)).toEqual({ isApprover: false, isRequester: true });
      expect(permitRoles(req, supervisor)).toEqual({ isApprover: true, isRequester: false });
      expect(permitRoles(req, pm)).toEqual({ isApprover: false, isRequester: false });
    });
  });

  it('tracks validity against the clock once approved', () => {
    const issued = { ...requested(), status: 'issued' };
    expect(permitState(issued, new Date(2026, 9, 10, 14, 0))).toBe('valid');
    expect(permitState(issued, new Date(2026, 9, 10, 16, 30))).toBe('expiring');
    expect(permitState(issued, new Date(2026, 9, 10, 17, 0))).toBe('expired');
    expect(permitState({ ...issued, status: 'closed' }, NOW)).toBe('closed');
    expect(permitState({ ...issued, status: 'requested' }, NOW)).toBe('requested');
    expect(permitState({ ...issued, status: 'declined' }, NOW)).toBe('declined');
    expect(permitState(draft(), NOW)).toBe('draft');
  });

  it('closing needs a name and the area made safe; cancelling needs a reason', () => {
    const issued = { ...draft(), status: 'issued' };
    expect(closePermit(issued, { by: '', areaSafe: true }, NOW).error).toMatch(/name/i);
    expect(closePermit(issued, { by: 'Meera', areaSafe: false }, NOW).error).toMatch(/made safe/i);
    expect(closePermit(draft(), { by: 'Meera', areaSafe: true }, NOW).error).toMatch(/only an issued/i);
    const closed = closePermit(issued, { by: 'Meera', areaSafe: true, note: 'Clean' }, NOW).patch;
    expect(closed).toMatchObject({ status: 'closed', closure: { by: 'Meera', areaSafe: true, note: 'Clean', at: NOW.toISOString() } });
    expect(cancelPermit(issued, { by: 'Meera', note: '' }, NOW).error).toMatch(/why/i);
    expect(cancelPermit(issued, { by: 'Meera', note: 'Rain' }, NOW).patch.status).toBe('cancelled');
    expect(cancelPermit({ ...requested() }, { by: 'Meera', note: 'Rain' }, NOW).patch.status).toBe('cancelled');
    expect(cancelPermit({ ...draft(), status: 'closed' }, { note: 'x' }, NOW).error).toMatch(/already finished/i);
  });
});

describe('panel entries', () => {
  it('lists the six elements as block kinds with placement sizes', () => {
    const els = getConstructionElements();
    expect(els.map((e) => e.name)).toEqual([
      'Snag / Punch List', 'Inspection Checklist', 'Concrete Pour Card', 'Measurement Sheet', 'Running Bill Tracker', 'Permit to Work',
    ]);
    expect(els.map((e) => e.data.kind)).toEqual(CONSTRUCTION_KINDS);
    els.forEach((e) => {
      expect(e.nodeType).toBe('blockNode');
      expect(estimateElementSize(e)).not.toEqual({ w: 320, h: 200 });
    });
    expect(new Set(els.map((e) => e.id)).size).toBe(els.length);
  });

  it('is its own category called "Construction"', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/WorkspacePage/components/WorkspaceContextPanel.jsx'), 'utf8');
    expect(src).toContain("id: 'construction'");
    expect(src).toContain("name: 'Construction'");
    expect(src).toContain("'construction': getConstructionElements()");
  });
});

describe('SnagBlock', () => {
  const items = [
    { id: 'a', no: 1, location: 'Hall', defect: 'Crack in plaster', owner: 'Ravi', due: '2026-10-05', status: 'open' },
    { id: 'b', no: 2, location: 'Bath', defect: 'Leaking tap', owner: 'Iqbal', due: '2026-10-20', status: 'fixed' },
  ];

  it('shows the summary and flags the overdue one', () => {
    const { container } = render(<SnagBlock id="s" data={{ label: 'Snags', items }} editable={false} onChange={() => {}} now={NOW} />);
    expect(screen.getByText('1 overdue')).toBeTruthy();
    expect(container.querySelector('[data-snag-no="1"]').textContent).toContain('Overdue');
    expect(container.querySelector('[data-snag-no="2"]').textContent).not.toContain('Overdue');
    expect([...container.querySelectorAll('[data-snag-no]')].map((el) => el.getAttribute('data-snag-no'))).toEqual(['1', '2']);
    expect(screen.queryByRole('button', { name: /add snag/i })).toBeNull();
  });

  it('adds a snag with the next fixed number', () => {
    const onChange = vi.fn();
    render(<SnagBlock id="s" data={{ label: 'Snags', items, snagSeq: 5 }} editable onChange={onChange} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: /add snag/i }));
    const saved = onChange.mock.calls[0][0];
    expect(saved.snagSeq).toBe(6);
    expect(saved.items.at(-1).no).toBe(6);
  });

  it('verifies only with a name', () => {
    const onChange = vi.fn();
    render(<SnagBlock id="s" data={{ label: 'Snags', items }} editable onChange={onChange} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/name/i);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Verified by'), { target: { value: 'Meera' } });
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    expect(onChange.mock.calls[0][0].items.find((s) => s.id === 'b')).toMatchObject({ status: 'verified', verifiedBy: 'Meera' });
  });

  it('filters to overdue', () => {
    render(<SnagBlock id="s" data={{ label: 'Snags', items }} editable={false} onChange={() => {}} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Overdue' }));
    expect(screen.getByText('Crack in plaster')).toBeTruthy();
    expect(screen.queryByText('Leaking tap')).toBeNull();
  });

  it('uploads a photo with the task and subtask', async () => {
    const upload = vi.fn().mockResolvedValue('https://cdn.example.com/s.png');
    const onChange = vi.fn();
    const { container } = render(
      <SnagBlock id="s" data={{ label: 'Snags', items }} editable onChange={onChange} workspaceId="w" taskId="t1" subtaskId="s1" upload={upload} now={NOW} />
    );
    fireEvent.click(screen.getByRole('button', { name: /add photo to snag 1/i }));
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(upload.mock.calls[0][1]).toEqual({ workspaceId: 'w', nodeId: 's', taskId: 't1', subtaskId: 's1' });
    expect(onChange.mock.calls[0][0].items[0].photoUrl).toBe('https://cdn.example.com/s.png');
  });
});

describe('SiteInspectBlock', () => {
  const lines = (...results) => results.map((r, i) => ({ id: `l${i}`, text: `Check ${i + 1}`, result: r, remark: '' }));
  const base = { label: 'Inspection', stage: 'Pre-pour', location: 'Slab L3', date: '2026-10-10', signoff: { status: 'pending' } };
  const meera = { ids: ['V-1'], email: 'meera@vendor.com', name: 'Meera Nair', role: 'vendor' };
  const collaborators = [
    { vendorId: 'PM-9', name: 'Priya PM', email: 'pm@x.com', isPM: true },
    { vendorId: 'C-3', name: 'Acme Client', email: 'c@x.com', isClient: true },
    { vendorId: 'V-1', name: 'Meera Nair', email: 'meera@vendor.com' },
    { vendorId: 'CAS-4', name: 'Safety Unit', email: 'cas@x.com', isCAS: true },
  ];
  const show = (data, props = {}) => {
    const decide = vi.fn(async () => ({ patch: { approvalChain: { state: 'pending', steps: [] } } }));
    const view = render(
      <SiteInspectBlock id="i1" data={{ ...base, workspaceCollaborators: collaborators, workspaceId: 'w1', ...data }}
        editable onChange={props.onChange || (() => {})} viewer={meera} decide={decide} notify={vi.fn()}
        onServerPatch={props.onServerPatch || (() => {})} {...props} />
    );
    return { decide, ...view };
  };

  it('shows the counts, and will not send while a line is pending or failed', () => {
    const { decide } = show({ lines: lines('pass', 'pending', 'fail') });
    expect(screen.getByText('1 pass')).toBeTruthy();
    expect(screen.getByText('1 fail')).toBeTruthy();
    expect(screen.getByText('1 pending')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Ask for approval from'), { target: { value: 'PM-9' } });
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/still pending/i);
    expect(decide).not.toHaveBeenCalled();
  });

  it('a vendor can only ask the PM or a CAS member, and the lines travel with the request', async () => {
    const { decide } = show({ lines: lines('pass', 'na') });
    const options = [...screen.getByLabelText('Ask for approval from').querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Choose who approves…', 'Priya PM · Project manager', 'Safety Unit · CAS member']);
    expect(options.join(' ')).not.toContain('Acme Client');
    fireEvent.change(screen.getByLabelText('Ask for approval from'), { target: { value: 'PM-9' } });
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    await waitFor(() => expect(decide).toHaveBeenCalled());
    const call = decide.mock.calls[0][0];
    expect(call).toMatchObject({ action: 'submit', nodeId: 'i1', workspaceId: 'w1', approver: { vendorId: 'PM-9', role: 'pm' } });
    expect(call.content.lines).toHaveLength(2);
    expect(call.content.stage).toBe('Pre-pour');
  });

  it('marking a line saves the result', () => {
    const onChange = vi.fn();
    show({ lines: lines('pending') }, { onChange });
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }));
    expect(onChange.mock.calls[0][0].lines[0].result).toBe('pass');
  });

  it('is locked while with an approver and once approved', () => {
    const chain = {
      state: 'pending', kind: 'siteinspect', rev: 1, originRole: 'vendor', origin: { vendorId: 'V-1', name: 'Meera Nair' },
      steps: [{ id: 's1', role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' }, decision: 'pending' }],
    };
    show({ lines: lines('pass'), approvalChain: chain });
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
    expect(screen.queryByRole('button', { name: /add check/i })).toBeNull();
    expect(screen.getByText('Waiting for Priya PM (Project manager)')).toBeTruthy();
  });

  it('choosing a stage on an empty checklist loads its checks', () => {
    const onChange = vi.fn();
    show({ stage: '', lines: [] }, { onChange });
    const input = screen.getByLabelText('Stage');
    fireEvent.change(input, { target: { value: 'Waterproofing' } });
    fireEvent.blur(input);
    expect(onChange.mock.calls[0][0].lines).toHaveLength(STAGE_PRESETS.Waterproofing.length);
  });

  it('an inspection signed off before approvals were routed keeps its decision, read-only', () => {
    const { container } = show({ lines: lines('pass'), signoff: { status: 'approved', by: 'Asha Rao', at: '2026-10-10T10:00:00.000Z', history: [] } });
    expect(container.querySelector('[data-legacy-signoff]').textContent).toContain('Asha Rao');
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
    expect(screen.queryByRole('button', { name: /send for approval/i })).toBeNull();
  });

  it('a viewer cannot mark lines or send it', () => {
    show({ lines: lines('pending') }, { editable: false });
    expect(screen.queryByRole('button', { name: /send for approval/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
  });
});

describe('PourBlock', () => {
  const data = {
    label: 'Pour', location: 'Block B', member: 'Slab L3', grade: 'M25', volume: '24', date: '2026-10-01', slump: '100', expect7Pct: 65,
    cubes: [
      { id: 'a', mark: '7d-1', age: 7, strength: '' },
      { id: 'b', mark: '28d-1', age: 28, strength: '26.5' },
      { id: 'c', mark: '28d-2', age: 28, strength: '23' },
    ],
  };

  it('judges each cube and reports an overdue 7-day result', () => {
    const { container } = render(<PourBlock data={data} editable={false} onChange={() => {}} now={NOW} />);
    const judgements = [...container.querySelectorAll('[data-cube-judgement]')].map((el) => el.getAttribute('data-cube-judgement'));
    expect(judgements).toEqual(['pending', 'meets', 'below']);
    expect(container.querySelector('[data-age="7"] [data-due-state]').textContent).toMatch(/overdue by 2 days/i);
    expect(screen.getByText(/Target ≥ 25 N\/mm²/)).toBeTruthy();
    expect(screen.getByText(/Indicative check against the grade/i)).toBeTruthy();
  });

  it('adds three cubes for an age', () => {
    const onChange = vi.fn();
    render(<PourBlock data={{ ...data, cubes: [] }} editable onChange={onChange} now={NOW} />);
    fireEvent.click(screen.getAllByRole('button', { name: /add 3 cubes/i })[1]);
    expect(onChange.mock.calls[0][0].cubes.map((c) => c.mark)).toEqual(['28d-1', '28d-2', '28d-3']);
  });

  it('warns when the grade is not recognised', () => {
    render(<PourBlock data={{ ...data, grade: 'Fe500' }} editable={false} onChange={() => {}} now={NOW} />);
    expect(screen.getByRole('alert').textContent).toMatch(/grade not recognised/i);
  });
});

describe('MeasureBookBlock', () => {
  const rows = [
    { id: 'a', kind: 'add', desc: 'Footing F1', nos: '4', l: '1.5', b: '1.5', d: '0.4' }, // 3.6
    { id: 'b', kind: 'deduct', desc: 'Column', nos: '4', l: '0.3', b: '0.3', d: '0.4' }, // 0.144
    { id: 'c', kind: 'add', desc: '', nos: '', l: '', b: '', d: '' },
  ];

  it('shows each row\'s quantity and the totals', () => {
    const { container } = render(<MeasureBookBlock data={{ label: 'MB', unit: 'm³', rows }} editable={false} onChange={() => {}} />);
    const totals = container.querySelector('[data-mb-totals]').textContent;
    expect(totals).toContain('3.6 m³');
    expect(totals).toContain('0.144 m³');
    expect(totals).toContain('3.456 m³');
    expect(screen.getByText('1 empty row is not counted')).toBeTruthy();
  });

  it('flags a number that cannot be used', () => {
    render(<MeasureBookBlock data={{ label: 'MB', unit: 'm³', rows: [{ id: 'x', kind: 'add', desc: 'Bad', l: '-2' }] }} editable={false} onChange={() => {}} />);
    expect(screen.getByRole('alert').textContent).toMatch(/positive numbers only/i);
  });

  it('adds a row for editors only', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MeasureBookBlock data={{ label: 'MB', unit: 'm³', rows }} editable onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    expect(onChange.mock.calls[0][0].rows).toHaveLength(4);
    rerender(<MeasureBookBlock data={{ label: 'MB', unit: 'm³', rows }} editable={false} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /add row/i })).toBeNull();
  });
});

describe('RaBillBlock', () => {
  const data = {
    label: 'Running bill', project: 'Tower B', billNo: 'RA-03', date: '2026-10-10', retentionPct: 5, gstPct: 18, advanceRecovery: '2000',
    items: [
      { id: 'a', desc: 'RCC M25', unit: 'm³', boqQty: '200', rate: '250', prevQty: '60', thisQty: '100' },
      { id: 'b', desc: 'Shuttering', unit: 'm²', boqQty: '100', rate: '0', prevQty: '90', thisQty: '20' },
    ],
  };

  it('shows the worked-out totals', () => {
    const { container } = render(<RaBillBlock data={data} editable={false} onChange={() => {}} />);
    const totals = container.querySelector('[data-bill-totals]').textContent;
    expect(totals).toContain('₹25,000');   // gross this bill
    expect(totals).toContain('+ ₹4,500');  // GST
    expect(totals).toContain('− ₹1,250');  // retention
    expect(totals).toContain('− ₹2,000');  // advance
    expect(totals).toContain('₹26,250');   // net payable
  });

  it('flags an item above its BOQ quantity', () => {
    const { container } = render(<RaBillBlock data={data} editable={false} onChange={() => {}} />);
    expect(container.querySelector('[data-excess="true"]')).toBeTruthy();
    expect(screen.getByText('1 item is above the BOQ quantity')).toBeTruthy();
  });

  it('editing a quantity saves it, and viewers cannot', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RaBillBlock data={data} editable onChange={onChange} />);
    const input = screen.getByLabelText('This bill quantity for RCC M25');
    fireEvent.change(input, { target: { value: '120' } });
    fireEvent.blur(input);
    expect(onChange.mock.calls[0][0].items[0].thisQty).toBe('120');
    rerender(<RaBillBlock data={data} editable={false} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /add item/i })).toBeNull();
  });
});

describe('PermitBlock', () => {
  const meera = { ids: ['V-1'], email: 'meera@vendor.com', name: 'Meera Nair', role: 'vendor' };
  const priya = { ids: ['PM-9'], email: 'pm@x.com', name: 'Priya PM', role: 'pm' };
  const collaborators = [
    { vendorId: 'PM-9', name: 'Priya PM', email: 'pm@x.com', isPM: true },
    { vendorId: 'C-3', name: 'Acme Client', email: 'c@x.com', isClient: true },
    { vendorId: 'V-1', name: 'Meera Nair', email: 'meera@vendor.com' },
    { vendorId: 'V-2', name: 'Suresh Kumar', email: 'suresh@vendor.com', specialization: 'Electrical' },
  ];
  const base = {
    label: 'Permit', type: 'Work at height', location: 'Terrace', work: 'Railing',
    validFrom: '2026-10-10T08:00', validTo: '2026-10-10T17:00', status: 'draft', closure: {},
    workspaceId: 'w1', taskId: 't1', subtaskId: 's1', taskName: 'Structure', subtaskName: 'Level 3 slab',
    addedBy: 'Meera Nair', addedByEmail: 'meera@vendor.com', addedByRole: 'vendor',
    precautions: PERMIT_TYPES['Work at height'].map((text, i) => ({ id: `p${i}`, text, state: 'yes' })),
    workspaceCollaborators: collaborators,
  };
  const pendingChain = {
    state: 'pending', kind: 'permit', rev: 1, originRole: 'vendor', submittedAt: '2026-10-10T08:00:00.000Z',
    origin: { vendorId: 'V-1', name: 'Meera Nair', role: 'vendor' },
    steps: [{ id: 's1', role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' }, decision: 'pending', at: null, by: null }],
  };
  const show = (data, { viewer = meera, editable = true, onChange = vi.fn(), notify = vi.fn(), decide, onServerPatch = vi.fn() } = {}) => {
    const decideFn = decide || vi.fn(async () => ({ patch: { approvalChain: pendingChain, status: 'requested' } }));
    const view = render(
      <PermitBlock id="n1" data={data} editable={editable} onChange={onChange} now={NOW} viewer={viewer}
        notify={notify} decide={decideFn} onServerPatch={onServerPatch} />
    );
    return { onChange, notify, decide: decideFn, onServerPatch, ...view };
  };

  it('"Issued by" is the person who dropped the element, and cannot be typed over', () => {
    const { container } = show(base, { viewer: priya });
    expect(container.querySelector('[data-issued-by]').textContent).toBe('Meera Nair (Vendor)');
    expect(screen.queryByLabelText('Issued by')).toBeNull();
    expect(screen.queryByLabelText('Issued to')).toBeNull(); // the approver is chosen when it is sent
  });

  it('a vendor is offered the PM only: never the client, never another vendor', () => {
    show(base);
    const options = [...screen.getByLabelText('Ask for approval from').querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Choose who approves…', 'Priya PM · Project manager']);
    expect(screen.getByLabelText('Ask for approval from').value).toBe('PM-9');
    expect(options.join(' ')).not.toMatch(/Acme|Suresh/);
  });

  it('sends the permit with its content to the server, then notifies the chosen person', async () => {
    const { onChange, onServerPatch, notify, decide } = show(base);
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));

    const call = decide.mock.calls[0][0];
    expect(call).toMatchObject({
      workspaceId: 'w1', nodeId: 'n1', taskId: 't1', subtaskId: 's1', action: 'submit',
      approver: { vendorId: 'PM-9', role: 'pm' },
    });
    expect(call.content).toMatchObject({ type: 'Work at height', location: 'Terrace' });
    expect(call.content.precautions).toHaveLength(PERMIT_TYPES['Work at height'].length);
    expect(onServerPatch).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled(); // the stamped fields are never saved from here
    const n = notify.mock.calls[0][0];
    expect(n).toMatchObject({ workspaceId: 'w1', roles: [], targetUserIds: ['PM-9'], type: 'approval_request', actionRequired: true });
    expect(n.message).toContain('Meera Nair');
    expect(n.message).toContain('Structure › Level 3 slab');
    expect(n.data).toMatchObject({ nodeId: 'n1', taskId: 't1', subtaskId: 's1' });
  });

  it('will not send an incomplete permit, and says why', () => {
    const incomplete = { ...base, precautions: base.precautions.map((p, i) => (i === 0 ? { ...p, state: '' } : p)) };
    const { decide } = show(incomplete);
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/not answered/i);
    expect(decide).not.toHaveBeenCalled();
  });

  it('shows the server\'s refusal and changes nothing', async () => {
    const decide = vi.fn().mockRejectedValue(new Error('A vendor cannot ask a client to approve this directly'));
    const { onServerPatch, notify } = show(base, { decide });
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot ask a client/));
    expect(onServerPatch).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('the PM is waiting-for, and the permit is locked while with them', () => {
    const waiting = { ...base, status: 'requested', approvalChain: pendingChain, issuedToPerson: pendingChain.steps[0].person };
    const { container } = show(waiting, { viewer: meera });
    expect(container.querySelector('[data-permit-state="requested"]')).toBeTruthy();
    expect(screen.getByText('Waiting for Priya PM (Project manager)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull();
    expect(screen.queryByLabelText('Location')).toBeNull();
    expect(screen.getByRole('button', { name: /withdraw/i })).toBeTruthy(); // the sender can take it back
  });

  it('after approval it shows the whole trail and who approved', () => {
    const chain = {
      ...pendingChain, state: 'approved', resolvedAt: '2026-10-10T09:30:00.000Z',
      steps: [
        { id: 's1', role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' }, decision: 'approved', at: '2026-10-10T08:30:00.000Z', by: { vendorId: 'PM-9', name: 'Priya PM', role: 'pm' } },
        { id: 's2', role: 'client', person: { vendorId: 'C-3', name: 'Acme Client' }, decision: 'approved', at: '2026-10-10T09:30:00.000Z', by: { vendorId: 'C-3', name: 'Acme Client', role: 'client' } },
      ],
    };
    const issued = {
      ...base, status: 'issued', approvalChain: chain,
      approvedBy: { vendorId: 'C-3', name: 'Acme Client', role: 'client' }, approvedAt: '2026-10-10T09:30:00.000Z',
    };
    const { container } = show(issued, { viewer: meera });
    // the vendor sees both stamps, including the client's
    const trail = container.querySelector('[data-approval-trail]').textContent;
    expect(trail).toContain('Priya PM');
    expect(trail).toContain('Client');
    expect(trail).not.toContain('Acme');
    expect(container.querySelectorAll('[data-step-decision="approved"]')).toHaveLength(2);
    expect(container.querySelector('[data-approved-by]').textContent).toBe('Client');
    expect(screen.getByRole('button', { name: /close permit/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull();
  });

  it('a permit sent back shows the reason and can be sent again', () => {
    const chain = {
      ...pendingChain, state: 'rejected',
      steps: [{ id: 's1', role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' }, decision: 'rejected', at: '2026-10-10T08:30:00.000Z', by: { name: 'Priya PM' }, note: 'Harness not checked' }],
    };
    show({ ...base, status: 'declined', approvalChain: chain, declineReason: 'Harness not checked' });
    expect(screen.getAllByText(/Harness not checked/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /send for approval again/i })).toBeTruthy();
  });

  it('shows an expired permit and asks for it to be closed', () => {
    const issued = { ...base, status: 'issued', issuedAt: '2026-10-10T02:30:00.000Z' };
    const { container } = render(<PermitBlock id="n1" data={issued} editable onChange={() => {}} now={new Date(2026, 9, 10, 17, 30)} viewer={meera} />);
    expect(container.querySelector('[data-permit-state="expired"]')).toBeTruthy();
    expect(screen.getByText('Expired: stop work and close')).toBeTruthy();
  });

  it('closing needs the area made safe', () => {
    const onChange = vi.fn();
    render(<PermitBlock id="n1" data={{ ...base, status: 'issued' }} editable onChange={onChange} now={NOW} viewer={meera} />);
    fireEvent.click(screen.getByRole('button', { name: /close permit/i }));
    fireEvent.change(screen.getByLabelText(/closed by/i), { target: { value: 'Meera' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm close/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/made safe/i);
    fireEvent.click(screen.getByLabelText(/area has been made safe/i));
    fireEvent.click(screen.getByRole('button', { name: /confirm close/i }));
    expect(onChange.mock.calls[0][0]).toMatchObject({ status: 'closed', closure: { by: 'Meera', areaSafe: true } });
  });

  it('a viewer cannot send, close or edit', () => {
    show({ ...base }, { viewer: priya, editable: false });
    expect(screen.queryByRole('button', { name: /send for approval/i })).toBeNull();
    expect(screen.queryByLabelText('Location')).toBeNull();
    expect(screen.getByText('Not sent for approval yet')).toBeTruthy();
  });
});

describe('on the canvas', () => {
  it('every construction element mounts as a block node and opens its settings when selected', () => {
    getConstructionElements().forEach((e) => {
      const { container } = render(
        <ReactFlowProvider>
          <div style={{ width: 800, height: 600 }}>
            <ReactFlow
              nodes={[{ id: e.id, type: 'blockNode', position: { x: 0, y: 0 }, selected: true, data: { ...e.data, workspaceId: 'w1' } }]}
              edges={[]}
              nodeTypes={{ blockNode: BlockNode }}
            />
          </div>
        </ReactFlowProvider>
      );
      expect(container.querySelector(`[data-block-kind="${e.data.kind}"]`), e.name).toBeTruthy();
      expect(container.querySelector('[data-testid="block-settings"]'), `${e.name} settings`).toBeTruthy();
      cleanup();
    });
  });
});
