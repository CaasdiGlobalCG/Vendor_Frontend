/**
 * Interiors and furniture elements: room-wise scope sheet, finish schedule,
 * furniture spec card, moodboard, site measurement sheet.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';

import {
  INTERIOR_KINDS, INTERIOR_LIMITS, MOOD_TILE, sanitizeRooms, roomProgress, scopeProgress, sanitizeSchedule, codeUsage,
  formatFurnitureSize, cleanQuantity, sanitizeMoodItems, addMoodItem, moveMoodItem, decideApproval, reopenApproval,
  sanitizeApproval, measureTotals, sanitizeOpenings, getInteriorElements,
} from '../src/pages/WorkspacePage/utils/interiorElements.js';
import {
  ScopeBlock, FinishBlock, FurnitureBlock, MoodboardBlock, SiteMeasureBlock,
} from '../src/pages/WorkspacePage/components/nodes/interiorViews.jsx';
import BlockNode from '../src/pages/WorkspacePage/components/nodes/BlockNode.jsx';
import { estimateElementSize } from '../src/pages/WorkspacePage/utils/canvasPlacement.js';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.DOMMatrixReadOnly = class { constructor() { this.m22 = 1; } };
});
afterEach(() => cleanup());

const IMG = 'https://cdn.example.com/a.png';

describe('scope rules', () => {
  const rooms = [
    { id: 'r1', name: 'Living', items: [{ id: 'a', text: 'False ceiling', status: 'done' }, { id: 'b', text: 'Paint', status: 'progress' }, { id: 'c', text: 'TV unit', status: 'bogus' }] },
    { id: 'r2', name: 'Kitchen', items: [{ id: 'd', text: 'Tiles', status: 'done' }] },
    { id: 'r3', name: 'Balcony', items: [] },
  ];

  it('counts done items per room and overall', () => {
    const list = sanitizeRooms(rooms);
    expect(list[0].items[2].status).toBe('todo'); // unknown status falls back
    expect(roomProgress(list[0])).toEqual({ done: 1, total: 3, percent: 33 });
    expect(roomProgress(list[2])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(scopeProgress(rooms)).toMatchObject({ done: 2, total: 4, percent: 50, complete: 1, rooms: 3 });
  });

  it('caps rooms and items', () => {
    expect(sanitizeRooms(Array.from({ length: 40 }, () => ({})))).toHaveLength(INTERIOR_LIMITS.rooms);
    const [r] = sanitizeRooms([{ items: Array.from({ length: 80 }, () => ({})) }]);
    expect(r.items).toHaveLength(INTERIOR_LIMITS.itemsPerRoom);
  });
});

describe('finish schedule rules', () => {
  const columns = [{ id: 'floor', name: 'Floor' }, { id: 'wall', name: 'Wall' }];

  it('drops cells that belong to a removed column', () => {
    const { rows } = sanitizeSchedule({ columns, rows: [{ id: 'r', room: 'Hall', cells: { floor: { material: 'Vitrified', code: 'T-01' }, gone: { material: 'x', code: 'y' } } }] });
    expect(Object.keys(rows[0].cells)).toEqual(['floor']);
  });

  it('lists where each code is used and flags one code on two materials', () => {
    const usage = codeUsage({
      columns,
      rows: [
        { id: '1', room: 'Hall', cells: { floor: { material: 'Vitrified 800x800', code: 't-01' }, wall: { material: 'Paint', code: 'P-02' } } },
        { id: '2', room: 'Kitchen', cells: { floor: { material: 'Vitrified 800x800', code: 'T-01' } } },
        { id: '3', room: 'Bath', cells: { floor: { material: 'Anti-skid tile', code: 'T-01' } } },
      ],
    });
    expect(usage.map((u) => u.code)).toEqual(['P-02', 'T-01']);
    const t = usage.find((u) => u.code === 'T-01');
    expect(t.uses).toHaveLength(3);
    expect(t.conflict).toBe(true);
    expect(usage.find((u) => u.code === 'P-02').conflict).toBe(false);
  });
});

describe('furniture rules', () => {
  it('writes the size from whichever dimensions are given', () => {
    expect(formatFurnitureSize({ width: '1800', depth: '600', height: '750' }, 'mm')).toBe('W 1800 × D 600 × H 750 mm');
    expect(formatFurnitureSize({ width: '6', depth: '', height: '2.5' }, 'ft')).toBe('W 6 × H 2.5 ft');
    expect(formatFurnitureSize({}, 'mm')).toBe('');
    expect(formatFurnitureSize({ width: '10' }, 'parsec')).toBe('W 10 mm');
  });

  it('keeps quantity a whole number of 1 or more', () => {
    expect(cleanQuantity('4')).toBe('4');
    expect(cleanQuantity('2.9')).toBe('2');
    expect(cleanQuantity('0')).toBe('');
    expect(cleanQuantity('-3')).toBe('');
    expect(cleanQuantity('abc')).toBe('');
  });
});

describe('moodboard rules', () => {
  it('keeps pictures with a safe address and swatches with a valid colour, inside the board', () => {
    const items = sanitizeMoodItems([
      { id: 'a', kind: 'image', imageUrl: IMG, x: 0.5, y: 0.5 },
      { id: 'b', kind: 'image', imageUrl: 'javascript:alert(1)', x: 0.5, y: 0.5 },
      { id: 'c', kind: 'swatch', color: 'c9a27e', x: 5, y: -5 },
      { id: 'd', kind: 'swatch', color: 'nope', x: 0.5, y: 0.5 },
    ]);
    expect(items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(items[1].color).toBe('#C9A27E');
    expect(items[1].x).toBeCloseTo(1 - MOOD_TILE.w / 2, 5);
    expect(items[1].y).toBeCloseTo(MOOD_TILE.h / 2, 5);
  });

  it('adds tiles in different places and refuses past the limit', () => {
    let items = [];
    for (let i = 0; i < 4; i += 1) items = addMoodItem(items, { kind: 'swatch', color: '#112233' });
    const spots = new Set(items.map((i) => `${i.x},${i.y}`));
    expect(spots.size).toBe(4);
    const full = Array.from({ length: INTERIOR_LIMITS.moodItems }, (_, i) => ({ id: `m${i}`, kind: 'swatch', color: '#000000', x: 0.5, y: 0.5 }));
    expect(addMoodItem(full, { kind: 'swatch', color: '#ffffff' })).toBeNull();
    expect(addMoodItem([], { kind: 'image', imageUrl: 'ftp://x' })).toBeNull();
  });

  it('moves a tile and keeps it on the board', () => {
    const items = [{ id: 'a', kind: 'swatch', color: '#000000', x: 0.5, y: 0.5 }];
    expect(moveMoodItem(items, 'a', 0.3, 0.6)[0]).toMatchObject({ x: 0.3, y: 0.6 });
    expect(moveMoodItem(items, 'a', 9, 9)[0].x).toBeCloseTo(1 - MOOD_TILE.w / 2, 5);
  });

  const now = new Date('2026-10-10T10:00:00Z');
  it('approval needs a name; a change request needs a reason; an empty board cannot be sent', () => {
    expect(decideApproval({}, { status: 'approved', by: ' ' }, now).error).toMatch(/name/i);
    expect(decideApproval({}, { status: 'changes', note: '' }, now).error).toMatch(/what needs to change/i);
    expect(decideApproval({}, { status: 'approved', by: 'Meera' }, now, false).error).toMatch(/add something/i);
    const ok = decideApproval({}, { status: 'approved', by: 'Meera Iyer' }, now);
    expect(ok.approval).toMatchObject({ status: 'approved', by: 'Meera Iyer', at: now.toISOString() });
  });

  it('a decided board cannot be decided again; reopening keeps the earlier decision', () => {
    const approved = decideApproval({}, { status: 'approved', by: 'Meera' }, now).approval;
    expect(decideApproval(approved, { status: 'changes', note: 'x' }, now).error).toMatch(/already/i);
    const reopened = reopenApproval(approved, now);
    expect(reopened.status).toBe('pending');
    expect(reopened.history[0]).toMatchObject({ status: 'approved', by: 'Meera' });
    expect(sanitizeApproval(null).status).toBe('pending');
  });
});

describe('site measurement rules', () => {
  it('works out perimeter, wall area, openings and net area', () => {
    const t = measureTotals({
      ceilingHeight: '10',
      walls: [
        { name: 'A', length: '12', height: '' },   // uses the ceiling height: 120
        { name: 'B', length: '10', height: '9' },  // 90
        { name: 'C', length: '12', height: '10' }, // 120
        { name: 'D', length: '10', height: '10' }, // 100
      ],
      openings: [
        { type: 'Door', width: '3', height: '7', count: '2' },  // 42
        { type: 'Window', width: '4', height: '4', count: '1' }, // 16
      ],
    });
    expect(t).toMatchObject({ perimeter: 44, grossArea: 430, openingArea: 58, netArea: 372, wallsCounted: 4, wallsSkipped: 0, openingsCounted: 3 });
    expect(t.openingsMoreThanWalls).toBe(false);
  });

  it('skips and reports walls and openings it cannot work out, instead of guessing', () => {
    const t = measureTotals({
      walls: [{ name: 'A', length: '12', height: '' }, { name: 'B', length: '', height: '9' }, { name: 'C', length: '8', height: '8' }],
      openings: [{ type: 'Door', width: '3', height: '', count: '1' }],
    });
    expect(t.wallsSkipped).toBe(2); // A has no height and no ceiling; B has no length
    expect(t.grossArea).toBe(64);
    expect(t.perimeter).toBe(20); // A's length still counts toward the perimeter
    expect(t.openingsSkipped).toBe(1);
  });

  it('warns when openings are bigger than the walls, and never goes negative', () => {
    const t = measureTotals({ walls: [{ length: '2', height: '2' }], openings: [{ width: '5', height: '5', count: '1' }] });
    expect(t.openingsMoreThanWalls).toBe(true);
    expect(t.netArea).toBe(0);
  });

  it('defaults a missing opening count to 1', () => {
    expect(sanitizeOpenings([{ type: 'Door', width: '3', height: '7' }])[0].count).toBe('1');
  });
});

describe('panel entries', () => {
  it('lists the five elements as block kinds with placement sizes', () => {
    const els = getInteriorElements();
    expect(els.map((e) => e.name)).toEqual([
      'Room-wise Scope Sheet', 'Finish Schedule', 'Furniture Spec Card', 'Moodboard', 'Site Measurement Sheet',
    ]);
    expect(els.map((e) => e.data.kind)).toEqual(INTERIOR_KINDS);
    els.forEach((e) => {
      expect(e.nodeType).toBe('blockNode');
      expect(estimateElementSize(e)).not.toEqual({ w: 320, h: 200 });
    });
  });

  it('is its own category called "Interiors and furniture"', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/WorkspacePage/components/WorkspaceContextPanel.jsx'), 'utf8');
    expect(src).toContain("id: 'interiors-furniture'");
    expect(src).toContain("name: 'Interiors and furniture'");
    expect(src).toContain("'interiors-furniture': getInteriorElements()");
  });
});

describe('ScopeBlock', () => {
  const rooms = [
    { id: 'r1', name: 'Living room', items: [{ id: 'a', text: 'False ceiling', finish: 'Gypsum', status: 'done' }, { id: 'b', text: 'Paint', finish: 'Matte', status: 'todo' }] },
    { id: 'r2', name: 'Kitchen', items: [{ id: 'c', text: 'Tiles', finish: '', status: 'done' }] },
  ];

  it('shows progress per room and overall, and collapses a room', () => {
    const { container } = render(<ScopeBlock data={{ label: 'Scope', rooms }} editable={false} onChange={() => {}} />);
    expect(screen.getByText('2 of 3 done · 67%')).toBeTruthy();
    expect(screen.getByText('Complete')).toBeTruthy(); // kitchen
    expect(screen.getByText('False ceiling')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Collapse Living room'));
    expect(screen.queryByText('False ceiling')).toBeNull();
    expect(container.querySelector('[data-room-open="false"]')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Expand Living room'));
    expect(screen.getByText('False ceiling')).toBeTruthy();
  });

  it('changes an item\'s status and adds a room', () => {
    const onChange = vi.fn();
    render(<ScopeBlock data={{ label: 'Scope', rooms }} editable onChange={onChange} />);
    fireEvent.change(screen.getAllByLabelText('Status')[1], { target: { value: 'progress' } });
    expect(onChange.mock.calls[0][0].rooms[0].items[1].status).toBe('progress');
    fireEvent.click(screen.getByRole('button', { name: /add room/i }));
    expect(onChange.mock.calls[1][0].rooms).toHaveLength(3);
  });

  it('a viewer has no editing controls', () => {
    render(<ScopeBlock data={{ label: 'Scope', rooms }} editable={false} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /add room/i })).toBeNull();
    expect(screen.queryByLabelText('Status')).toBeNull();
  });
});

describe('FinishBlock', () => {
  const data = {
    label: 'Finish schedule',
    columns: [{ id: 'floor', name: 'Floor' }, { id: 'wall', name: 'Wall' }],
    rows: [
      { id: 'r1', room: 'Hall', cells: { floor: { material: 'Vitrified', code: 'T-01' } } },
      { id: 'r2', room: 'Bath', cells: { floor: { material: 'Anti-skid', code: 'T-01' } } },
    ],
  };

  it('shows the grid and warns that one code is on two materials', () => {
    render(<FinishBlock data={data} editable={false} onChange={() => {}} />);
    expect(screen.getByText('Hall')).toBeTruthy();
    expect(screen.getByText('Vitrified')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/same code, different materials/i);
    expect(screen.getByRole('alert').textContent).toContain('T-01');
  });

  it('editing a cell keeps the other cells', () => {
    const onChange = vi.fn();
    render(<FinishBlock data={data} editable onChange={onChange} />);
    const input = screen.getByLabelText('Hall Wall material');
    fireEvent.change(input, { target: { value: 'Emulsion paint' } });
    fireEvent.blur(input);
    const row = onChange.mock.calls[0][0].rows[0];
    expect(row.cells.wall.material).toBe('Emulsion paint');
    expect(row.cells.floor).toEqual({ material: 'Vitrified', code: 'T-01' });
  });

  it('adds a room row and a surface column', () => {
    const onChange = vi.fn();
    render(<FinishBlock data={data} editable onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add room/i }));
    expect(onChange.mock.calls[0][0].rows).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /add surface/i }));
    expect(onChange.mock.calls[1][0].columns).toHaveLength(3);
  });
});

describe('FurnitureBlock', () => {
  const data = {
    label: 'Furniture spec', name: 'TV unit', imageUrl: IMG, width: '1800', depth: '400', height: '500', unit: 'mm',
    material: 'Teak veneer', finish: 'Matte PU', quantity: '2', supplier: 'Woodcraft',
  };

  it('shows the card for a viewer', () => {
    render(<FurnitureBlock id="f" data={data} editable={false} onChange={() => {}} workspaceId="w" />);
    expect(screen.getByText('TV unit')).toBeTruthy();
    expect(screen.getByText('W 1800 × D 400 × H 500 mm')).toBeTruthy();
    expect(screen.getByText('Teak veneer')).toBeTruthy();
    expect(screen.getByText('Woodcraft')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uploads the photo with the task and subtask', async () => {
    const upload = vi.fn().mockResolvedValue(IMG);
    const onChange = vi.fn();
    const { container } = render(
      <FurnitureBlock id="f" data={{ ...data, imageUrl: '' }} editable onChange={onChange} workspaceId="w" taskId="t1" subtaskId="s1" upload={upload} />
    );
    fireEvent.click(screen.getByRole('button', { name: /add a photo/i }));
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ imageUrl: IMG }));
    expect(upload.mock.calls[0][1]).toEqual({ workspaceId: 'w', nodeId: 'f', taskId: 't1', subtaskId: 's1' });
  });

  it('keeps quantity a whole number', () => {
    const onChange = vi.fn();
    render(<FurnitureBlock id="f" data={data} editable onChange={onChange} workspaceId="w" />);
    const qty = screen.getByLabelText('Quantity');
    fireEvent.change(qty, { target: { value: '3.7' } });
    fireEvent.blur(qty);
    expect(onChange).toHaveBeenCalledWith({ quantity: '3' });
  });
});

describe('MoodboardBlock', () => {
  const items = [
    { id: 'a', kind: 'image', imageUrl: IMG, caption: 'Sofa', x: 0.3, y: 0.4 },
    { id: 'b', kind: 'swatch', color: '#C9A27E', caption: 'Wall colour', x: 0.7, y: 0.6 },
  ];
  const base = { label: 'Living room mood', items, approval: { status: 'pending' } };

  it('dragging a tile saves once, on release, and stays on the board', () => {
    window.PointerEvent = window.PointerEvent || window.MouseEvent;
    const onChange = vi.fn();
    const { container } = render(<MoodboardBlock id="m" data={base} editable onChange={onChange} workspaceId="w" />);
    container.querySelector('[data-moodboard-surface]').getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 200 });
    const tile = container.querySelector('[data-mood-item="a"]');
    fireEvent.pointerDown(tile, { clientX: 90, clientY: 80, pointerId: 1 });
    fireEvent.pointerMove(tile, { clientX: 150, clientY: 100, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
    expect(tile.style.left).toBe('50%');
    fireEvent.pointerMove(tile, { clientX: 900, clientY: 900, pointerId: 1 });
    fireEvent.pointerUp(tile, { clientX: 900, clientY: 900, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    const moved = onChange.mock.calls[0][0].items.find((i) => i.id === 'a');
    expect(moved.x).toBeCloseTo(1 - MOOD_TILE.w / 2, 5);
    expect(moved.y).toBeCloseTo(1 - MOOD_TILE.h / 2, 5);
  });

  it('adds a colour, rejects a bad one', () => {
    const onChange = vi.fn();
    render(<MoodboardBlock id="m" data={base} editable onChange={onChange} workspaceId="w" />);
    fireEvent.change(screen.getByLabelText('Colour'), { target: { value: 'purple-ish' } });
    fireEvent.click(screen.getByRole('button', { name: /add colour/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/colour like/i);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Colour'), { target: { value: '#112233' } });
    fireEvent.click(screen.getByRole('button', { name: /add colour/i }));
    expect(onChange.mock.calls[0][0].items).toHaveLength(3);
  });
});

describe('SiteMeasureBlock', () => {
  const data = {
    label: 'Site measurement', room: 'Master bedroom', unit: 'ft', ceilingHeight: '10',
    walls: [
      { id: 'w1', name: 'Wall A', length: '12', height: '' },
      { id: 'w2', name: 'Wall B', length: '10', height: '' },
    ],
    openings: [{ id: 'o1', type: 'Door', wall: 'Wall A', width: '3', height: '7', count: '1' }],
    note: 'Beam below window', sketchUrl: '',
  };

  it('shows the totals in the sheet\'s unit', () => {
    const { container } = render(<SiteMeasureBlock id="s" data={data} editable={false} onChange={() => {}} workspaceId="w" />);
    const totals = container.querySelector('[data-totals]').textContent;
    expect(totals).toContain('22 ft'); // perimeter
    expect(totals).toContain('220 sq ft'); // gross
    expect(totals).toContain('21 sq ft'); // openings
    expect(totals).toContain('199 sq ft'); // net
    expect(screen.getByText('Beam below window')).toBeTruthy();
  });

  it('adds a wall and an opening for editors', () => {
    const onChange = vi.fn();
    render(<SiteMeasureBlock id="s" data={data} editable onChange={onChange} workspaceId="w" />);
    fireEvent.click(screen.getByRole('button', { name: /add wall/i }));
    expect(onChange.mock.calls[0][0].walls).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /add opening/i }));
    expect(onChange.mock.calls[1][0].openings).toHaveLength(2);
  });

  it('tells the user which walls are not counted', () => {
    render(<SiteMeasureBlock id="s" data={{ ...data, ceilingHeight: '', walls: [{ id: 'w1', name: 'A', length: '12', height: '' }] }} editable={false} onChange={() => {}} workspaceId="w" />);
    expect(screen.getByRole('status').textContent).toMatch(/1 wall is missing/i);
  });

  it('warns when openings outsize the walls', () => {
    const big = { ...data, openings: [{ id: 'o', type: 'Door', wall: '', width: '30', height: '30', count: '1' }] };
    render(<SiteMeasureBlock id="s" data={big} editable={false} onChange={() => {}} workspaceId="w" />);
    expect(screen.getByRole('alert').textContent).toMatch(/larger than the walls/i);
  });

  it('uploads a sketch photo with the subtask', async () => {
    const upload = vi.fn().mockResolvedValue(IMG);
    const onChange = vi.fn();
    const { container } = render(<SiteMeasureBlock id="s" data={data} editable onChange={onChange} workspaceId="w" taskId="t" subtaskId="st" upload={upload} />);
    fireEvent.click(screen.getByRole('button', { name: /photo of your sketch/i }));
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ sketchUrl: IMG }));
    expect(upload.mock.calls[0][1]).toMatchObject({ taskId: 't', subtaskId: 'st' });
  });
});

describe('on the canvas', () => {
  it('every interiors element mounts as a block node and opens its settings when selected', () => {
    getInteriorElements().forEach((e) => {
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
