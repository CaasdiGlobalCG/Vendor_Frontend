/**
 * Food and FMCG elements: batch record, expiry and shelf-life tracker,
 * temperature log, licence tracker, recall trace sheet.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';

import {
  FOOD_KINDS, FOOD_LIMITS, toNum, expiryInfo, shelfLifeInfo, describeDaysLeft, describeLicence, sortByExpiry,
  shelfSummary, tempRange, tempStatus, addReading, sanitizeReadings, tempSummary, yieldPercent, yieldTone,
  decideBatchQc, reopenBatchQc, sanitizeQc, dispatchedVsProduced, traceReport, warnWindow, getFoodElements,
} from '../src/pages/WorkspacePage/utils/foodElements.js';
import {
  BatchBlock, ShelfLifeBlock, TempLogBlock, LicenceBlock, RecallBlock,
} from '../src/pages/WorkspacePage/components/nodes/foodViews.jsx';
import BlockNode from '../src/pages/WorkspacePage/components/nodes/BlockNode.jsx';
import { estimateElementSize } from '../src/pages/WorkspacePage/utils/canvasPlacement.js';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.DOMMatrixReadOnly = class { constructor() { this.m22 = 1; } };
});
afterEach(() => cleanup());

const NOW = new Date(2026, 9, 10, 14, 0); // 10 Oct 2026, 2 pm

describe('expiry rules', () => {
  it('works out days left from the calendar day, not the clock time', () => {
    expect(expiryInfo('2026-10-10', NOW, 30)).toMatchObject({ state: 'expiring', daysLeft: 0 });
    expect(expiryInfo('2026-10-09', NOW, 30)).toMatchObject({ state: 'expired', daysLeft: -1 });
    expect(expiryInfo('2026-11-09', NOW, 30)).toMatchObject({ state: 'expiring', daysLeft: 30 });
    expect(expiryInfo('2026-11-10', NOW, 30)).toMatchObject({ state: 'ok', daysLeft: 31 });
    expect(expiryInfo('', NOW).state).toBe('unknown');
    expect(expiryInfo('2026-02-31', NOW).state).toBe('unknown');
  });

  it('describes the days in words', () => {
    expect(describeDaysLeft(12)).toBe('12 days left');
    expect(describeDaysLeft(1)).toBe('1 day left');
    expect(describeDaysLeft(0)).toBe('Expires today');
    expect(describeDaysLeft(-3)).toBe('Expired 3 days ago');
    expect(describeDaysLeft(-1)).toBe('Expired 1 day ago');
    expect(describeDaysLeft(null)).toBe('No date');
  });

  it('measures how much of the shelf life is used, and catches reversed dates', () => {
    const info = shelfLifeInfo('2026-09-10', '2026-11-09', NOW, 30); // 30 of 60 days
    expect(info.lifeUsed).toBe(50);
    expect(shelfLifeInfo('2026-01-01', '2026-02-01', NOW).lifeUsed).toBe(100);
    expect(shelfLifeInfo('2026-12-01', '2027-01-01', NOW).lifeUsed).toBe(0);
    expect(shelfLifeInfo('2026-10-10', '2026-10-01', NOW)).toMatchObject({ lifeUsed: null, datesReversed: true });
  });

  it('keeps the warning window to 1..365 days', () => {
    expect(warnWindow('45')).toBe(45);
    expect(warnWindow(0, 30)).toBe(30);
    expect(warnWindow('abc', 60)).toBe(60);
    expect(warnWindow(9999)).toBe(365);
  });

  it('sorts soonest first, undated last', () => {
    const sorted = sortByExpiry([{ expiry: '' }, { expiry: '2026-12-01' }, { expiry: '2026-11-01' }]);
    expect(sorted.map((x) => x.expiry)).toEqual(['2026-11-01', '2026-12-01', '']);
  });

  it('counts items by state', () => {
    const items = [{ expiry: '2026-10-01' }, { expiry: '2026-10-20' }, { expiry: '2027-01-01' }, { expiry: '' }];
    expect(shelfSummary(items, NOW, 30)).toEqual({ ok: 1, expiring: 1, expired: 1, unknown: 1 });
  });

  it('describes a licence for renewal', () => {
    expect(describeLicence('2026-12-31', NOW, 60).text).toBe('Valid');
    expect(describeLicence('2026-10-30', NOW, 60).text).toBe('Renew in 20 days');
    expect(describeLicence('2026-10-05', NOW, 60).text).toBe('Expired 5 days ago');
    expect(describeLicence('', NOW).text).toBe('No expiry date');
  });
});

describe('temperature rules', () => {
  it('reads numbers, including negative ones', () => {
    expect(toNum('-18')).toBe(-18);
    expect(toNum(' 4.5 ')).toBe(4.5);
    expect(toNum('')).toBeNull();
    expect(toNum('cold')).toBeNull();
  });

  it('judges a reading against the range, boundaries included', () => {
    expect(tempStatus('2', '2', '8')).toBe('ok');
    expect(tempStatus('8', '2', '8')).toBe('ok');
    expect(tempStatus('8.1', '2', '8')).toBe('high');
    expect(tempStatus('1.9', '2', '8')).toBe('low');
    expect(tempStatus('-17', '-25', '-15')).toBe('ok'); // a freezer
    expect(tempStatus('abc', '2', '8')).toBe('invalid');
    expect(tempStatus('5', '8', '2')).toBe('invalid'); // reversed range
    expect(tempRange('', '8')).toBeNull();
  });

  it('adds readings in time order and rejects bad input', () => {
    const first = addReading([], { value: '4', at: '2026-10-09T09:00:00Z' }, NOW);
    const second = addReading(first.readings, { value: '9.5', at: '2026-10-09T07:00:00Z', note: 'door open' }, NOW);
    expect(second.readings.map((r) => r.value)).toEqual([9.5, 4]); // earlier time sorts first
    expect(addReading([], { value: 'warm' }, NOW).error).toMatch(/number/i);
    expect(addReading([], { value: '4', at: 'not a time' }, NOW).error).toMatch(/not valid/i);
    expect(addReading([], { value: '4', at: '2026-10-11T09:00:00Z' }, NOW).error).toMatch(/future/i);
  });

  it('refuses a full log rather than dropping old readings', () => {
    const full = Array.from({ length: FOOD_LIMITS.readings }, (_, i) => ({
      id: `r${i}`, at: new Date(2026, 0, 1, 0, i).toISOString(), value: 4,
    }));
    expect(addReading(full, { value: '4' }, NOW).error).toMatch(/new log/i);
  });

  it('summarises a log', () => {
    const readings = [
      { id: 'a', at: '2026-10-10T06:00:00Z', value: 4 },
      { id: 'b', at: '2026-10-10T07:00:00Z', value: 9 },
      { id: 'c', at: '2026-10-10T08:00:00Z', value: 3 },
    ];
    expect(tempSummary(readings, '2', '8')).toMatchObject({ count: 3, outOfRange: 1, lowest: 3, highest: 9 });
    expect(tempSummary(readings, '2', '8').last.value).toBe(3);
    expect(sanitizeReadings([{ value: 'x', at: '2026-10-10T06:00:00Z' }, { value: 3, at: 'bad' }])).toEqual([]);
  });
});

describe('batch rules', () => {
  it('works out yield', () => {
    expect(yieldPercent('475', '500')).toBe(95);
    expect(yieldPercent('466.5', '500')).toBe(93.3);
    expect(yieldPercent('', '500')).toBeNull();
    expect(yieldPercent('100', '0')).toBeNull();
  });

  it('green at target, amber within 5 points, red below', () => {
    expect(yieldTone(95, 95)).toBe('success');
    expect(yieldTone(90, 95)).toBe('warning');
    expect(yieldTone(89.9, 95)).toBe('danger');
    expect(yieldTone(null)).toBe('neutral');
  });

  const base = { batchNo: 'MP-01', qc: { status: 'pending' } };
  const now = new Date('2026-10-10T10:00:00Z');

  it('a pass needs a name and a batch number; a fail needs a reason', () => {
    expect(decideBatchQc({ ...base, batchNo: '' }, { status: 'passed', by: 'Asha' }).error).toMatch(/batch number/i);
    expect(decideBatchQc(base, { status: 'passed', by: ' ' }).error).toMatch(/name/i);
    expect(decideBatchQc(base, { status: 'failed', note: '' }).error).toMatch(/why/i);
    const ok = decideBatchQc(base, { status: 'passed', by: 'Asha Rao' }, now);
    expect(ok.qc).toMatchObject({ status: 'passed', by: 'Asha Rao', at: now.toISOString() });
  });

  it('a signed batch cannot be signed again until reopened, and the old decision is kept', () => {
    const signed = decideBatchQc(base, { status: 'passed', by: 'Asha' }, now).qc;
    expect(decideBatchQc({ ...base, qc: signed }, { status: 'failed', note: 'x' }).error).toMatch(/already signed off/i);
    const reopened = reopenBatchQc(signed, now);
    expect(reopened.status).toBe('pending');
    expect(reopened.history).toHaveLength(1);
    expect(reopened.history[0]).toMatchObject({ status: 'passed', by: 'Asha', reopenedAt: now.toISOString() });
    expect(sanitizeQc(undefined).status).toBe('pending');
  });
});

describe('recall trace', () => {
  const dispatches = [
    { id: 'a', customer: 'Big Bazaar', qty: '120', unit: 'kg' },
    { id: 'b', customer: 'big bazaar', qty: '80', unit: 'kg' },
    { id: 'c', customer: 'Corner Store', qty: '40', unit: 'kg' },
    { id: 'd', customer: 'Export Co', qty: '5', unit: 'tonne' },
  ];

  it('adds only dispatches in the produced unit and says how many were left out', () => {
    const t = dispatchedVsProduced(dispatches, '500', 'kg');
    expect(t).toMatchObject({ dispatched: 240, produced: 500, percent: 48, otherUnits: 1, customers: 3 });
  });

  it('flags nothing to compare when produced is blank', () => {
    expect(dispatchedVsProduced(dispatches, '', 'kg').percent).toBeNull();
  });

  it('writes a plain-text report', () => {
    const text = traceReport({
      product: 'Mango pickle', batchNo: 'MP-01',
      inputs: [{ id: 'i', material: 'Mango', supplier: 'Raju Farms', lot: 'L22', qty: '100', unit: 'kg' }],
      dispatches: [{ id: 'd', customer: 'Big Bazaar', location: 'Pune', date: '2026-10-09', invoice: 'INV-7', qty: '120', unit: 'kg' }],
    });
    expect(text).toContain('RECALL TRACE: Mango pickle, batch MP-01');
    expect(text).toContain('- Mango, lot L22, supplier Raju Farms, 100 kg');
    expect(text).toContain('- Big Bazaar, Pune, 2026-10-09, invoice INV-7, 120 kg');
  });
});

describe('panel entries', () => {
  it('lists the five elements as block kinds with placement sizes', () => {
    const els = getFoodElements();
    expect(els.map((e) => e.name)).toEqual([
      'Batch Record', 'Expiry & Shelf-Life Tracker', 'Temperature Log', 'FSSAI / Licence Tracker', 'Recall Trace Sheet',
    ]);
    expect(els.map((e) => e.data.kind)).toEqual(FOOD_KINDS);
    els.forEach((e) => {
      expect(e.nodeType).toBe('blockNode');
      expect(estimateElementSize(e)).not.toEqual({ w: 320, h: 200 });
    });
  });

  it('is its own category called "Food and FMCG"', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/WorkspacePage/components/WorkspaceContextPanel.jsx'), 'utf8');
    expect(src).toContain("id: 'food-fmcg'");
    expect(src).toContain("name: 'Food and FMCG'");
    expect(src).toContain("'food-fmcg': getFoodElements()");
  });
});

describe('BatchBlock', () => {
  const data = {
    label: 'Batch record', product: 'Mango pickle', batchNo: 'MP-01', date: '2026-10-10', plannedQty: '500', actualQty: '440',
    unit: 'kg', yieldTarget: 95,
    ingredients: [{ id: 'i1', name: 'Mango', lot: 'L22', qty: '300', unit: 'kg' }],
    qc: { status: 'pending', by: '', note: '', at: null, history: [] },
  };

  it('shows yield against the target', () => {
    render(<BatchBlock id="b" data={data} editable onChange={() => {}} />);
    expect(screen.getByText('88%')).toBeTruthy();
    expect(screen.getByText('Target is 95%.')).toBeTruthy();
  });

  it('is locked while with an approver and once approved: no ingredient editing', () => {
    const chain = { state: 'pending', kind: 'batch', rev: 1, originRole: 'vendor', origin: { vendorId: 'V-1', name: 'Meera' }, steps: [{ id: 's1', role: 'pm', person: { vendorId: 'PM-9', name: 'Priya' }, decision: 'pending' }] };
    const { rerender } = render(<BatchBlock id="b" data={{ ...data, approvalChain: chain }} editable onChange={() => {}} />);
    expect(screen.queryByLabelText('Ingredient name')).toBeNull();
    expect(screen.queryByRole('button', { name: /add ingredient/i })).toBeNull();
    rerender(<BatchBlock id="b" data={{ ...data, approvalChain: { ...chain, state: 'approved', steps: [{ ...chain.steps[0], decision: 'approved', at: '2026-10-10T10:00:00.000Z', by: { name: 'Priya' } }] } }} editable onChange={() => {}} />);
    expect(screen.getByText('Approved by Priya')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /add ingredient/i })).toBeNull();
  });

  it('a batch signed off before approvals were routed keeps its decision, read-only', () => {
    const signed = { ...data, qc: { status: 'passed', by: 'Asha Rao', note: '', at: '2026-10-10T10:00:00.000Z', history: [] } };
    const { container } = render(<BatchBlock id="b" data={signed} editable onChange={() => {}} />);
    expect(screen.getByText('QC passed')).toBeTruthy();
    expect(container.querySelector('[data-legacy-qc]').textContent).toContain('Asha Rao');
    expect(screen.queryByRole('button', { name: /add ingredient/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /send for qc approval/i })).toBeNull();
  });

  it('adds an ingredient with the batch unit, and viewers cannot', () => {
    const onChange = vi.fn();
    const { rerender } = render(<BatchBlock id="b" data={data} editable onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add ingredient/i }));
    expect(onChange.mock.calls[0][0].ingredients).toHaveLength(2);
    rerender(<BatchBlock id="b" data={data} editable={false} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /add ingredient/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /send for qc approval/i })).toBeNull();
    expect(screen.getByText('Not sent for approval yet')).toBeTruthy();
  });
});

describe('ShelfLifeBlock', () => {
  const items = [
    { id: 'a', item: 'Curd 200 g', batch: 'C-1', mfg: '2026-10-01', expiry: '2026-10-08' },
    { id: 'b', item: 'Butter', batch: 'B-9', mfg: '2026-08-01', expiry: '2026-10-25' },
    { id: 'c', item: 'Flour', batch: 'F-3', mfg: '2026-09-01', expiry: '2027-03-01' },
  ];

  it('summarises, sorts soonest first and marks each state', () => {
    const { container } = render(<ShelfLifeBlock data={{ label: 'Expiry', warnDays: 30, items }} editable={false} onChange={() => {}} now={NOW} />);
    expect(screen.getByText('1 expired')).toBeTruthy();
    expect(screen.getByText('1 expiring within 30 days')).toBeTruthy();
    expect(screen.getByText('1 in date')).toBeTruthy();
    const states = [...container.querySelectorAll('[data-expiry-state]')].map((el) => el.getAttribute('data-expiry-state'));
    expect(states).toEqual(['expired', 'expiring', 'ok']);
    expect(screen.getByText('Expired 2 days ago')).toBeTruthy();
    expect(screen.getByText('15 days left')).toBeTruthy();
  });

  it('flags an expiry that is not after the manufacture date', () => {
    render(<ShelfLifeBlock data={{ label: 'Expiry', warnDays: 30, items: [{ id: 'a', item: 'X', batch: '', mfg: '2026-10-10', expiry: '2026-10-01' }] }} editable onChange={() => {}} now={NOW} />);
    expect(screen.getByRole('alert').textContent).toMatch(/not after/i);
  });

  it('adds an empty row for editors', () => {
    const onChange = vi.fn();
    render(<ShelfLifeBlock data={{ label: 'Expiry', warnDays: 30, items: [] }} editable onChange={onChange} now={NOW} />);
    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    expect(onChange.mock.calls[0][0].items[0]).toMatchObject({ item: '', expiry: '' });
  });
});

describe('TempLogBlock', () => {
  const data = {
    label: 'Temperature log', location: 'Cold room 1', min: '2', max: '8', unit: '°C',
    readings: [
      { id: 'a', at: '2026-10-10T06:00:00.000Z', value: 4, note: '' },
      { id: 'b', at: '2026-10-10T08:00:00.000Z', value: 9.5, note: 'door open' },
    ],
  };

  it('shows the latest reading, its status and the out-of-range count', () => {
    render(<TempLogBlock data={data} editable={false} onChange={() => {}} />);
    expect(screen.getByText('Allowed 2 to 8 °C')).toBeTruthy();
    expect(screen.getByText('1 out of range')).toBeTruthy();
    expect(screen.getAllByText('Too warm').length).toBeGreaterThan(0);
    expect(screen.getByText('door open')).toBeTruthy();
  });

  it('logs a reading and rejects a non-number', () => {
    const onChange = vi.fn();
    render(<TempLogBlock data={data} editable onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /log reading/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/number/i);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Temperature reading'), { target: { value: '5.5' } });
    fireEvent.click(screen.getByRole('button', { name: /log reading/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0][0].readings;
    expect(saved).toHaveLength(3);
    expect(saved.some((r) => r.value === 5.5)).toBe(true);
  });

  it('a viewer cannot log or remove readings', () => {
    render(<TempLogBlock data={data} editable={false} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /log reading/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove reading/i })).toBeNull();
  });

  it('asks for a valid range when the limits are wrong', () => {
    render(<TempLogBlock data={{ ...data, min: '8', max: '2' }} editable={false} onChange={() => {}} />);
    expect(screen.getByText(/set a valid allowed range/i)).toBeTruthy();
  });
});

describe('LicenceBlock', () => {
  it('shows each licence with its renewal state', () => {
    const items = [
      { id: 'a', name: 'FSSAI licence', number: '10012345', authority: 'FSSAI', issued: '2024-10-01', expiry: '2026-10-30' },
      { id: 'b', name: 'Fire NOC', number: 'F-77', authority: 'Fire dept', issued: '', expiry: '2026-09-01' },
      { id: 'c', name: 'Trade licence', number: '', authority: '', issued: '', expiry: '2027-06-01' },
    ];
    const { container } = render(<LicenceBlock data={{ label: 'Licences', warnDays: 60, items }} editable={false} onChange={() => {}} now={NOW} />);
    expect(screen.getByText('Renew in 20 days')).toBeTruthy();
    expect(screen.getByText('Expired 39 days ago')).toBeTruthy();
    expect(screen.getByText('Valid')).toBeTruthy();
    expect([...container.querySelectorAll('[data-licence-state]')].map((el) => el.getAttribute('data-licence-state')))
      .toEqual(['expiring', 'expired', 'ok']);
  });
});

describe('RecallBlock', () => {
  const data = {
    label: 'Recall trace', product: 'Mango pickle', batchNo: 'MP-01', producedQty: '500', unit: 'kg',
    inputs: [{ id: 'i', material: 'Mango', supplier: 'Raju Farms', lot: 'L22', qty: '100', unit: 'kg' }],
    dispatches: [
      { id: 'a', customer: 'Big Bazaar', location: 'Pune', date: '2026-10-09', invoice: 'INV-7', qty: '120', unit: 'kg' },
      { id: 'b', customer: 'Corner Store', location: 'Mumbai', date: '2026-10-09', invoice: 'INV-8', qty: '40', unit: 'kg' },
    ],
  };

  it('totals what has gone out against what was made', () => {
    render(<RecallBlock data={data} editable={false} onChange={() => {}} />);
    expect(screen.getByText('2 customers')).toBeTruthy();
    expect(screen.getByText('160 of 500 kg dispatched (32%)')).toBeTruthy();
  });

  it('warns when more is dispatched than was produced', () => {
    render(<RecallBlock data={{ ...data, producedQty: '100' }} editable={false} onChange={() => {}} />);
    expect(screen.getByText('More dispatched than produced')).toBeTruthy();
  });

  it('copies the trace to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<RecallBlock data={data} editable={false} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /copy trace/i }));
    await screen.findByText('Copied to the clipboard');
    expect(writeText.mock.calls[0][0]).toContain('RECALL TRACE: Mango pickle, batch MP-01');
  });

  it('says so when the clipboard is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true });
    render(<RecallBlock data={data} editable={false} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /copy trace/i }));
    await screen.findByText(/could not copy/i);
  });

  it('adds rows for editors only', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RecallBlock data={data} editable onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add dispatch/i }));
    expect(onChange.mock.calls[0][0].dispatches).toHaveLength(3);
    rerender(<RecallBlock data={data} editable={false} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /add dispatch/i })).toBeNull();
  });
});

describe('on the canvas', () => {
  it('every food element mounts as a block node and opens its settings when selected', () => {
    getFoodElements().forEach((e) => {
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
