/**
 * Printing and signage elements: proof markup, artwork approval, signage
 * elevation, colour palette, material swatch board. Pure rules first, then the
 * blocks rendered and driven the way a user would.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

import {
  PRINTING_KINDS, PRINTING_LIMITS, sanitizePins, addPin, movePin, nextPinNumber, pinCounts, sanitizeVersions, currentVersion, addVersion,
  decideVersion, elevationLayout, elevationArea, formatDimension, normalizeHex, parseCmyk, cmykToHex, readableOn,
  swatchColor, sanitizeSwatches, matchedCount, sanitizeMaterials, getPrintingElements,
} from '../src/pages/WorkspacePage/utils/printingElements.js';
import {
  ProofBlock, ArtworkBlock, ElevationBlock, PaletteBlock, SwatchBoardBlock,
} from '../src/pages/WorkspacePage/components/nodes/printingViews.jsx';
import ReactFlow, { ReactFlowProvider } from 'reactflow';
import BlockNode from '../src/pages/WorkspacePage/components/nodes/BlockNode.jsx';
import { estimateElementSize } from '../src/pages/WorkspacePage/utils/canvasPlacement.js';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(() => cleanup());

const IMG = 'https://cdn.example.com/art.png';

describe('proof pins', () => {
  it('keeps pins inside the artwork, with a valid status and a short comment', () => {
    const pins = sanitizePins([
      { id: 'a', x: 1.5, y: -2, text: '  logo   too small ', status: 'weird' },
      { x: 'nope', y: 0.2 },
      null,
      { id: 'b', x: 0.25, y: 0.75, status: 'fixed' },
    ]);
    expect(pins).toEqual([
      { id: 'a', n: 1, x: 1, y: 0, text: 'logo too small', status: 'open' },
      { id: 'b', n: 2, x: 0.25, y: 0.75, text: '', status: 'fixed' },
    ]);
  });

  it('adds an open pin and refuses past the limit', () => {
    const one = addPin([], 0.4, 0.6);
    expect(one.pins).toHaveLength(1);
    expect(one.pins[0]).toMatchObject({ n: 1, x: 0.4, y: 0.6, status: 'open', text: '' });
    expect(one.pinSeq).toBe(1);
    const full = Array.from({ length: PRINTING_LIMITS.pins }, (_, i) => ({ id: `p${i}`, n: i + 1, x: 0.1, y: 0.1 }));
    expect(addPin(full, 0.5, 0.5)).toBeNull();
  });

  it('pin numbers are fixed: deleting pin 2 leaves 1 and 3, and 2 is never handed out again', () => {
    let state = { pins: [], pinSeq: 0 };
    for (let i = 0; i < 3; i += 1) state = addPin(state.pins, 0.1 * (i + 1), 0.5, state.pinSeq);
    expect(state.pins.map((p) => p.n)).toEqual([1, 2, 3]);

    const afterDelete = state.pins.filter((p) => p.n !== 2);
    expect(sanitizePins(afterDelete).map((p) => p.n)).toEqual([1, 3]); // not renumbered

    const next = addPin(afterDelete, 0.9, 0.9, state.pinSeq);
    expect(next.pins.map((p) => p.n)).toEqual([1, 3, 4]); // 2 is not reused
  });

  it('never reuses the top number even after the highest pin is deleted', () => {
    const state = addPin([{ id: 'a', n: 1, x: 0, y: 0 }, { id: 'b', n: 2, x: 0, y: 0 }], 0.5, 0.5, 2);
    const withoutTop = state.pins.filter((p) => p.n !== 3);
    expect(nextPinNumber(withoutTop, state.pinSeq)).toBe(4);
  });

  it('numbers older pins that have no number once, in list order, and repairs duplicates', () => {
    expect(sanitizePins([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }]).map((p) => p.n)).toEqual([1, 2]);
    expect(sanitizePins([{ id: 'a', n: 2, x: 0, y: 0 }, { id: 'b', n: 2, x: 0, y: 0 }]).map((p) => p.n)).toEqual([2, 3]);
  });

  it('moves a pin and keeps it inside the artwork', () => {
    const pins = [{ id: 'a', n: 1, x: 0.2, y: 0.2 }, { id: 'b', n: 2, x: 0.5, y: 0.5 }];
    expect(movePin(pins, 'a', 0.7, 0.3)[0]).toMatchObject({ n: 1, x: 0.7, y: 0.3 });
    expect(movePin(pins, 'a', 3, -1)[0]).toMatchObject({ x: 1, y: 0 });
    expect(movePin(pins, 'a', 0.7, 0.3)[1]).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it('counts pins by status', () => {
    expect(pinCounts([{ x: 0, y: 0, status: 'open' }, { x: 0, y: 0, status: 'fixed' }, { x: 0, y: 0, status: 'open' }]))
      .toEqual({ open: 2, fixed: 1, approved: 0 });
  });
});

describe('artwork versions', () => {
  const now = new Date('2026-10-10T10:00:00Z');

  it('starts at v1 and numbers on from the highest version', () => {
    const v1 = addVersion([], { imageUrl: IMG }, now);
    expect(v1[0]).toMatchObject({ version: 1, status: 'pending', imageUrl: IMG });
    const v2 = addVersion(v1, { imageUrl: IMG }, now);
    expect(v2.map((v) => v.version)).toEqual([1, 2]);
    expect(currentVersion(v2).version).toBe(2);
  });

  it('refuses a version with no usable picture', () => {
    expect(addVersion([], { imageUrl: 'javascript:alert(1)' })).toBeNull();
    expect(addVersion([], { imageUrl: '' })).toBeNull();
  });

  it('approval needs a name; a change request needs a reason', () => {
    const versions = addVersion([], { imageUrl: IMG }, now);
    const id = versions[0].id;
    expect(decideVersion(versions, id, { status: 'approved', by: '  ' }).error).toMatch(/name/i);
    expect(decideVersion(versions, id, { status: 'changes', note: '' }).error).toMatch(/what needs to change/i);
    const ok = decideVersion(versions, id, { status: 'approved', by: 'Asha Rao' }, now);
    expect(ok.versions[0]).toMatchObject({ status: 'approved', decidedBy: 'Asha Rao', decidedAt: now.toISOString() });
  });

  it('a decided version cannot be decided again, and a new version starts pending', () => {
    let versions = addVersion([], { imageUrl: IMG }, now);
    versions = decideVersion(versions, versions[0].id, { status: 'approved', by: 'Asha' }, now).versions;
    expect(decideVersion(versions, versions[0].id, { status: 'changes', note: 'x' }).error).toMatch(/already/i);
    const v2 = addVersion(versions, { imageUrl: IMG }, now);
    expect(currentVersion(v2).status).toBe('pending'); // approval does not carry over to changed artwork
    expect(v2[0].status).toBe('approved');
  });

  it('sanitises stored versions', () => {
    const list = sanitizeVersions([{ id: 'x', version: 2, imageUrl: 'data:image/png;base64,AA', status: 'bogus' }, { version: 'abc' }]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ imageUrl: '', status: 'pending', version: 2 });
  });
});

describe('elevation layout', () => {
  it('draws nothing without a positive width and height', () => {
    expect(elevationLayout({ width: '', height: '4' })).toBeNull();
    expect(elevationLayout({ width: '12', height: '0' })).toBeNull();
    expect(elevationLayout({ width: 'abc', height: '4' })).toBeNull();
  });

  it('keeps true proportions and puts the bottom of the board at the mounting height', () => {
    const l = elevationLayout({ width: '12', height: '4', mountingHeight: '10' });
    expect(l.board.w / l.board.h).toBeCloseTo(3, 5);
    // ground to bottom of board is the mounting height, in the same scale
    expect((l.groundY - l.mountingY) / l.scale).toBeCloseTo(10, 5);
    expect(l.board.y + l.board.h).toBeCloseTo(l.mountingY, 5);
  });

  it('a board twice as wide is drawn twice as wide when height and mounting are equal', () => {
    const a = elevationLayout({ width: '6', height: '4', mountingHeight: '10' });
    const b = elevationLayout({ width: '12', height: '4', mountingHeight: '10' });
    expect(a.scale).toBeCloseTo(b.scale, 5); // height-limited in both, same scale
    expect(b.board.w / a.board.w).toBeCloseTo(2, 5);
  });

  it('works without a mounting height (no ground line)', () => {
    const l = elevationLayout({ width: '8', height: '3' });
    expect(l.groundY).toBeNull();
    expect(l.mountingY).toBeNull();
    expect(l.board.w).toBeGreaterThan(0);
  });

  it('formats dimensions and area', () => {
    expect(formatDimension('12', 'ft')).toBe('12 ft');
    expect(formatDimension('4.50', 'm')).toBe('4.5 m');
    expect(formatDimension('', 'ft')).toBe('');
    expect(elevationArea('12', '4', 'ft')).toBe('48 sq ft');
    expect(elevationArea('1.2', '0.6', 'm')).toBe('0.72 m²');
  });
});

describe('colour helpers', () => {
  it('normalises HEX', () => {
    expect(normalizeHex('d62828')).toBe('#D62828');
    expect(normalizeHex('#f00')).toBe('#FF0000');
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('zzzzzz')).toBeNull();
  });

  it('reads CMYK in common spellings and rejects the rest', () => {
    expect(parseCmyk('0 90 90 10')).toEqual({ c: 0, m: 90, y: 90, k: 10 });
    expect(parseCmyk('C0 M100 Y100 K0')).toEqual({ c: 0, m: 100, y: 100, k: 0 });
    expect(parseCmyk('0,100,100,0')).toEqual({ c: 0, m: 100, y: 100, k: 0 });
    expect(parseCmyk('0 90 90')).toBeNull();
    expect(parseCmyk('0 90 90 110')).toBeNull();
  });

  it('converts CMYK to a screen colour and picks readable text', () => {
    expect(cmykToHex({ c: 0, m: 0, y: 0, k: 0 })).toBe('#FFFFFF');
    expect(cmykToHex({ c: 0, m: 0, y: 0, k: 100 })).toBe('#000000');
    expect(cmykToHex({ c: 0, m: 100, y: 100, k: 0 })).toBe('#FF0000');
    expect(readableOn('#000000')).toBe('#FFFFFF');
    expect(readableOn('#FFFFFF')).toBe('#111827');
  });

  it('prefers HEX, falls back to CMYK', () => {
    expect(swatchColor({ hex: '#00ff00', cmyk: '0 100 100 0' })).toBe('#00FF00');
    expect(swatchColor({ hex: 'oops', cmyk: '0 100 100 0' })).toBe('#FF0000');
    expect(swatchColor({ hex: '', cmyk: '' })).toBeNull();
  });

  it('counts matched colours and limits the palette size', () => {
    expect(matchedCount([{ matched: true }, { matched: false }, { matched: true }])).toEqual({ matched: 2, total: 3 });
    expect(sanitizeSwatches(Array.from({ length: 30 }, () => ({})))).toHaveLength(PRINTING_LIMITS.swatches);
  });
});

describe('materials', () => {
  it('drops unsafe photo addresses and unknown types', () => {
    const [m] = sanitizeMaterials([{ name: 'Gloss vinyl', type: 'Mystery', imageUrl: 'javascript:alert(1)' }]);
    expect(m).toMatchObject({ type: 'Other', imageUrl: '' });
  });
});

describe('panel entries', () => {
  it('lists the five elements, each a block kind with a placement size', () => {
    const els = getPrintingElements();
    expect(els.map((e) => e.name)).toEqual([
      'Proof Markup', 'Artwork Approval Card', 'Signage Elevation', 'Colour Palette', 'Material Swatch Board',
    ]);
    expect(els.map((e) => e.data.kind)).toEqual(PRINTING_KINDS);
    els.forEach((e) => {
      expect(e.nodeType).toBe('blockNode');
      expect(estimateElementSize(e)).not.toEqual({ w: 320, h: 200 });
    });
    expect(new Set(els.map((e) => e.id)).size).toBe(els.length);
  });

  it('is its own category called "Printing and signage"', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/WorkspacePage/components/WorkspaceContextPanel.jsx'), 'utf8');
    expect(src).toContain("id: 'printing-signage'");
    expect(src).toContain("name: 'Printing and signage'");
    expect(src).toContain("'printing-signage': getPrintingElements()");
  });
});

describe('ProofBlock', () => {
  it('drops a pin where the artwork is clicked, only while placing', () => {
    const onChange = vi.fn();
    const { container } = render(<ProofBlock id="p" data={{ label: 'Proof', imageUrl: IMG, pins: [] }} editable onChange={onChange} workspaceId="w" />);
    const surface = container.querySelector('img').parentElement;
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 });

    fireEvent.click(surface, { clientX: 100, clientY: 25 });
    expect(onChange).not.toHaveBeenCalled(); // not placing yet

    fireEvent.click(screen.getByRole('button', { name: /add pin/i }));
    fireEvent.click(surface, { clientX: 100, clientY: 25 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].pins[0]).toMatchObject({ n: 1, x: 0.5, y: 0.25, status: 'open' });
    expect(onChange.mock.calls[0][0].pinSeq).toBe(1);
  });

  it('lists numbered comments with a status summary and lets a status change', () => {
    const onChange = vi.fn();
    const pins = [
      { id: 'a', n: 1, x: 0.1, y: 0.1, text: 'Logo too small', status: 'open' },
      { id: 'b', n: 2, x: 0.5, y: 0.5, text: 'Wrong green', status: 'fixed' },
    ];
    render(<ProofBlock id="p" data={{ label: 'Proof', imageUrl: IMG, pins }} editable onChange={onChange} workspaceId="w" />);
    expect(screen.getByText('1 open · 1 fixed · 0 approved')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Status of pin 1'), { target: { value: 'approved' } });
    expect(onChange).toHaveBeenCalledWith({ pins: [{ ...pins[0], status: 'approved' }, pins[1]] });
  });

  it('shows the pin numbers as saved: after pin 2 is removed the rest keep 1 and 3', () => {
    const pins = [
      { id: 'a', n: 1, x: 0.1, y: 0.1, text: 'One', status: 'open' },
      { id: 'c', n: 3, x: 0.7, y: 0.7, text: 'Three', status: 'open' },
    ];
    const { container } = render(<ProofBlock id="p" data={{ label: 'Proof', imageUrl: IMG, pins }} editable onChange={() => {}} workspaceId="w" />);
    expect([...container.querySelectorAll('[data-pin]')].map((el) => el.getAttribute('data-pin'))).toEqual(['1', '3']);
    expect(screen.getByLabelText('Comment for pin 3')).toBeTruthy();
    expect(screen.queryByLabelText('Comment for pin 2')).toBeNull();
  });

  describe('moving a pin', () => {
    const pins = [{ id: 'a', n: 1, x: 0.2, y: 0.2, text: 'Logo', status: 'open' }];
    const setup = (editable = true) => {
      window.PointerEvent = window.PointerEvent || window.MouseEvent;
      const onChange = vi.fn();
      const view = render(<ProofBlock id="p" data={{ label: 'Proof', imageUrl: IMG, pins }} editable={editable} onChange={onChange} workspaceId="w" />);
      const surface = view.container.querySelector('img').parentElement;
      surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 });
      return { onChange, pin: view.container.querySelector('[data-pin="1"]') };
    };

    it('dragging follows the pointer and saves once, on release', () => {
      const { onChange, pin } = setup();
      fireEvent.pointerDown(pin, { clientX: 40, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(pin, { clientX: 100, clientY: 50, pointerId: 1 });
      fireEvent.pointerMove(pin, { clientX: 150, clientY: 80, pointerId: 1 });
      expect(onChange).not.toHaveBeenCalled(); // nothing saved mid-drag
      expect(pin.style.left).toBe('75%');
      expect(pin.style.top).toBe('80%');
      fireEvent.pointerUp(pin, { clientX: 150, clientY: 80, pointerId: 1 });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].pins[0]).toMatchObject({ id: 'a', n: 1, x: 0.75, y: 0.8 });
    });

    it('a plain click on a pin does not save anything', () => {
      const { onChange, pin } = setup();
      fireEvent.pointerDown(pin, { clientX: 40, clientY: 20, pointerId: 1 });
      fireEvent.pointerUp(pin, { clientX: 40, clientY: 20, pointerId: 1 });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('cannot be dragged outside the artwork', () => {
      const { onChange, pin } = setup();
      fireEvent.pointerDown(pin, { clientX: 40, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(pin, { clientX: 900, clientY: -50, pointerId: 1 });
      fireEvent.pointerUp(pin, { clientX: 900, clientY: -50, pointerId: 1 });
      expect(onChange.mock.calls[0][0].pins[0]).toMatchObject({ x: 1, y: 0 });
    });

    it('arrow keys nudge a focused pin, Shift moves further', () => {
      const { onChange, pin } = setup();
      fireEvent.keyDown(pin, { key: 'ArrowRight' });
      expect(onChange.mock.calls[0][0].pins[0].x).toBeCloseTo(0.21, 5);
      fireEvent.keyDown(pin, { key: 'ArrowDown', shiftKey: true });
      expect(onChange.mock.calls[1][0].pins[0].y).toBeCloseTo(0.25, 5);
    });

    it('a viewer cannot move pins', () => {
      const { onChange, pin } = setup(false);
      fireEvent.pointerDown(pin, { clientX: 40, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(pin, { clientX: 100, clientY: 50, pointerId: 1 });
      fireEvent.pointerUp(pin, { clientX: 100, clientY: 50, pointerId: 1 });
      fireEvent.keyDown(pin, { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
      expect(pin.getAttribute('role')).toBeNull();
    });

    it('dragging does not drop a new pin while Add pin is on', () => {
      const { onChange, pin } = setup();
      fireEvent.click(screen.getByRole('button', { name: /add pin/i }));
      fireEvent.pointerDown(pin, { clientX: 40, clientY: 20, pointerId: 1 });
      fireEvent.pointerMove(pin, { clientX: 100, clientY: 50, pointerId: 1 });
      fireEvent.pointerUp(pin, { clientX: 100, clientY: 50, pointerId: 1 });
      fireEvent.click(pin);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].pins).toHaveLength(1); // moved, not duplicated
    });
  });

  it('a viewer sees the comments but no controls', () => {
    const pins = [{ id: 'a', n: 1, x: 0.1, y: 0.1, text: 'Logo too small', status: 'open' }];
    render(<ProofBlock id="p" data={{ label: 'Proof', imageUrl: IMG, pins }} editable={false} onChange={() => {}} workspaceId="w" />);
    expect(screen.getByText('Logo too small')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uploads the artwork', async () => {
    const upload = vi.fn().mockResolvedValue(IMG);
    const onChange = vi.fn();
    const { container } = render(<ProofBlock id="p" data={{ label: 'Proof', imageUrl: '', pins: [] }} editable onChange={onChange} workspaceId="w" upload={upload} />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.click(screen.getByRole('button', { name: /upload the artwork/i }));
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ imageUrl: IMG }));
    expect(upload).toHaveBeenCalledWith(file, { workspaceId: 'w', nodeId: 'p' });
  });
});

describe('ArtworkBlock', () => {
  const base = { label: 'Artwork approval', job: 'Shop board', client: 'Sunrise Mart' };
  const pending = addVersion([], { imageUrl: IMG });

  it('after a decision, offers the next version and lists the earlier ones', () => {
    const v1 = decideVersion(pending, pending[0].id, { status: 'changes', note: 'Bigger logo' }).versions;
    const versions = addVersion(v1, { imageUrl: IMG });
    const decided = decideVersion(versions, versions[1].id, { status: 'approved', by: 'Asha' }).versions;
    render(<ArtworkBlock id="a" data={{ ...base, versions: decided }} editable onChange={() => {}} workspaceId="w" />);
    expect(screen.getByText('v2')).toBeTruthy();
    expect(screen.getByText('Earlier versions')).toBeTruthy();
    expect(screen.getByText('Changes requested')).toBeTruthy();
    expect(screen.getByRole('button', { name: /upload version 3/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^approve$/i })).toBeNull();
  });

  it('a viewer cannot approve', () => {
    render(<ArtworkBlock id="a" data={{ ...base, versions: pending }} editable={false} onChange={() => {}} workspaceId="w" />);
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
  });
});

describe('ElevationBlock', () => {
  it('draws the board with its dimensions, area and specs', () => {
    const data = { label: 'Front board', width: '12', height: '4', unit: 'ft', mountingHeight: '10', material: 'ACP 3 mm', frame: 'GI box', lighting: '', finish: '' };
    render(<ElevationBlock data={data} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toBe('Signage elevation, 12 ft by 4 ft, mounted 10 ft above ground');
    expect(svg.textContent).toContain('12 ft');
    expect(svg.textContent).toContain('4 ft');
    expect(svg.textContent).toContain('10 ft');
    expect(screen.getByText('48 sq ft')).toBeTruthy();
    expect(screen.getByText('ACP 3 mm')).toBeTruthy();
    expect(screen.queryByText('Lighting')).toBeNull();
  });

  it('asks for dimensions when there are none', () => {
    render(<ElevationBlock data={{ label: 'Board', width: '', height: '', unit: 'ft' }} />);
    expect(screen.getByText(/enter the board's width and height/i)).toBeTruthy();
  });
});

describe('PaletteBlock', () => {
  const swatches = [
    { id: 'a', name: 'Brand red', hex: '#D62828', cmyk: '0 90 90 10', pantone: '186 C', matched: true },
    { id: 'b', name: 'Charcoal', hex: '', cmyk: '70 60 40 60', pantone: '', matched: false },
  ];

  it('shows colours from HEX or CMYK and how many are matched', () => {
    const { container } = render(<PaletteBlock data={{ label: 'Palette', swatches }} editable={false} onChange={() => {}} />);
    expect(screen.getByText('1 of 2 matched')).toBeTruthy();
    const colours = [...container.querySelectorAll('[data-swatch-color]')].map((el) => el.getAttribute('data-swatch-color'));
    expect(colours[0]).toBe('#D62828');
    expect(colours[1]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('ticking matched saves it; adding a colour appends an empty one', () => {
    const onChange = vi.fn();
    render(<PaletteBlock data={{ label: 'Palette', swatches }} editable onChange={onChange} />);
    fireEvent.click(screen.getAllByText('Not matched')[0].closest('label').querySelector('input'));
    expect(onChange).toHaveBeenLastCalledWith({ swatches: [swatches[0], { ...swatches[1], matched: true }] });
    fireEvent.click(screen.getByRole('button', { name: /add colour/i }));
    expect(onChange.mock.calls.at(-1)[0].swatches).toHaveLength(3);
  });

  it('flags a HEX or CMYK value that cannot be read', () => {
    render(<PaletteBlock data={{ label: 'Palette', swatches: [{ id: 'a', name: 'X', hex: 'oops', cmyk: '1 2', pantone: '', matched: false }] }} editable onChange={() => {}} />);
    expect(screen.getByLabelText('HEX').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('CMYK').getAttribute('aria-invalid')).toBe('true');
  });

  it('is read-only for viewers', () => {
    render(<PaletteBlock data={{ label: 'Palette', swatches }} editable={false} onChange={() => {}} />);
    expect(screen.getAllByRole('checkbox')[0].disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /add colour/i })).toBeNull();
  });
});

describe('SwatchBoardBlock', () => {
  it('adds a material, and shows finish, thickness and supplier to a viewer', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SwatchBoardBlock id="s" data={{ label: 'Materials', items: [] }} editable onChange={onChange} workspaceId="w" />);
    fireEvent.click(screen.getByRole('button', { name: /add material/i }));
    expect(onChange.mock.calls[0][0].items[0]).toMatchObject({ type: 'Vinyl', name: '', imageUrl: '' });

    const items = [{ id: 'm1', name: 'Gloss vinyl', type: 'Vinyl', imageUrl: IMG, finish: 'Gloss', thickness: '0.1 mm', supplier: 'Avery' }];
    rerender(<SwatchBoardBlock id="s" data={{ label: 'Materials', items }} editable={false} onChange={() => {}} workspaceId="w" />);
    expect(screen.getByText('Gloss vinyl')).toBeTruthy();
    expect(screen.getByText('0.1 mm')).toBeTruthy();
    expect(screen.getByText('Avery')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uploads a photo into the chosen material', async () => {
    const upload = vi.fn().mockResolvedValue(IMG);
    const onChange = vi.fn();
    const items = [{ id: 'm1', name: 'ACP', type: 'ACP', imageUrl: '', finish: '', thickness: '', supplier: '' }];
    const { container } = render(<SwatchBoardBlock id="s" data={{ label: 'Materials', items }} editable onChange={onChange} workspaceId="w" upload={upload} />);
    fireEvent.click(screen.getByRole('button', { name: /add photo/i }));
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0].items[0].imageUrl).toBe(IMG);
  });
});

describe('on the canvas', () => {
  it('every printing element mounts as a block node and opens its settings when selected', () => {
    getPrintingElements().forEach((e) => {
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
