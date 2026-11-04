/**
 * Signature pad, photo grid / before-after, location pin, rating, date range,
 * number with unit, QR code / barcode and callout: pure helpers and the blocks
 * rendered in a real React Flow.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';

const persist = vi.fn();
vi.mock('../src/pages/WorkspacePage/utils/nodePersistence', async (orig) => ({
  ...(await orig()),
  persistNodeDataPatch: (...args) => persist(...args),
}));

import BlockNode from '../src/pages/WorkspacePage/components/nodes/BlockNode.jsx';
import { PhotosBlock } from '../src/pages/WorkspacePage/components/nodes/blockInputViews.jsx';
import {
  defaultBlockData,
  getBasicsElements,
  clampRating,
  ratingMax,
  parseDay,
  dateRangeInfo,
  parseCoordinate,
  mapEmbedUrl,
  mapsUrl,
  formatMeasure,
  sanitizeStrokes,
  strokesToPath,
  visiblePhotos,
  code128Symbols,
  code128Bars,
  isBarcodeText,
  localDateString,
} from '../src/pages/WorkspacePage/utils/blockElements.js';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.DOMMatrixReadOnly = class { constructor() { this.m22 = 1; } };
});
afterEach(() => { cleanup(); persist.mockReset(); });

// React Flow keeps nodes visibility:hidden until measured, which jsdom never does; hidden nodes have no
// computed accessible name, so named controls are found by aria-label instead
const byRole = (role, options = {}) => screen.getByRole(role, { hidden: true, ...options });
const queryRole = (role, options = {}) => screen.queryByRole(role, { hidden: true, ...options });

const mount = (node) =>
  render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={[{ position: { x: 0, y: 0 }, ...node }]} edges={[]} nodeTypes={{ blockNode: BlockNode }} />
      </div>
    </ReactFlowProvider>
  );
const block = (kind, extra = {}, node = {}) => ({
  id: `b-${kind}`,
  type: 'blockNode',
  data: { ...defaultBlockData(kind), workspaceId: 'w1', ...extra },
  ...node,
});

describe('rating helpers', () => {
  it('clamps to whole numbers within 0..max and limits max to 3..10', () => {
    expect(clampRating(7, 5)).toBe(5);
    expect(clampRating(-2, 5)).toBe(0);
    expect(clampRating('3', 5)).toBe(3);
    expect(clampRating('abc', 5)).toBe(0);
    expect(clampRating(2.6, 5)).toBe(3);
    expect(ratingMax(1)).toBe(3);
    expect(ratingMax(50)).toBe(10);
    expect(ratingMax(undefined)).toBe(5);
  });
});

describe('date range helpers', () => {
  it('rejects impossible calendar days', () => {
    expect(parseDay('2026-02-31')).toBeNull();
    expect(parseDay('2026-13-01')).toBeNull();
    expect(parseDay('10/10/2026')).toBeNull();
    expect(parseDay('2026-10-10')).toBeInstanceOf(Date);
  });

  it('counts both ends and works out the state against today', () => {
    const now = new Date(2026, 9, 10, 15, 30); // 10 Oct 2026, afternoon
    expect(dateRangeInfo('2026-10-01', '2026-10-07', now)).toMatchObject({ days: 7, state: 'ended' });
    expect(dateRangeInfo('2026-10-08', '2026-10-14', now)).toMatchObject({ days: 7, state: 'active', daysLeft: 4 });
    expect(dateRangeInfo('2026-10-10', '2026-10-10', now)).toMatchObject({ days: 1, state: 'active', daysLeft: 0 });
    expect(dateRangeInfo('2026-10-15', '2026-10-20', now)).toMatchObject({ state: 'upcoming', daysUntil: 5 });
    expect(dateRangeInfo('2026-10-20', '2026-10-15', now)).toMatchObject({ valid: false, reversed: true });
    expect(dateRangeInfo('', '', now).state).toBe('invalid');
  });

  it('uses the local calendar date, not UTC', () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('location helpers', () => {
  it('validates coordinates', () => {
    expect(parseCoordinate('12.97', 'lat')).toBe(12.97);
    expect(parseCoordinate('91', 'lat')).toBeNull();
    expect(parseCoordinate('181', 'lng')).toBeNull();
    expect(parseCoordinate('', 'lat')).toBeNull();
    expect(parseCoordinate('north', 'lat')).toBeNull();
  });

  it('builds an embed and a maps link only from valid input', () => {
    const embed = mapEmbedUrl('12.9716', '77.5946');
    expect(embed.startsWith('https://www.openstreetmap.org/export/embed.html?')).toBe(true);
    expect(embed).toContain('marker=12.971600%2C77.594600');
    expect(mapEmbedUrl('', '77')).toBeNull();
    expect(mapsUrl('12.9716', '77.5946')).toBe('https://www.google.com/maps/search/?api=1&query=12.9716%2C77.5946');
    expect(mapsUrl('', '', 'MG Road, Bengaluru')).toContain('query=MG%20Road%2C%20Bengaluru');
    expect(mapsUrl('', '', '')).toBe('');
  });
});

describe('measure helper', () => {
  it('groups digits the Indian way and leaves text alone', () => {
    expect(formatMeasure('1234567')).toBe('12,34,567');
    expect(formatMeasure('12.5')).toBe('12.5');
    expect(formatMeasure('about 40')).toBe('about 40');
    expect(formatMeasure('')).toBe('');
  });
});

describe('signature strokes', () => {
  it('drops bad points, clamps to the box and caps the size', () => {
    expect(sanitizeStrokes('nope')).toEqual([]);
    expect(sanitizeStrokes([[[10, 10], ['x', 3], [400, -5], null]])).toEqual([[[10, 10], [320, 0]]]);
    const big = [Array.from({ length: 1000 }, (_, i) => [i % 300, 5])];
    expect(sanitizeStrokes(big)[0].length).toBe(400);
    const many = Array.from({ length: 100 }, () => [[1, 1]]);
    expect(sanitizeStrokes(many).length).toBe(40);
  });

  it('turns strokes into a path and a single tap into a dot', () => {
    expect(strokesToPath([[[0, 0], [10, 5]]])).toBe('M0 0 L10 5');
    expect(strokesToPath([[[20, 30]]])).toBe('M20 30 L20.1 30');
    expect(strokesToPath([])).toBe('');
  });
});

describe('photos helper', () => {
  it('keeps only http(s) pictures and respects the layout limit', () => {
    const list = [
      { url: 'https://cdn.example.com/a.jpg', caption: 'A' },
      { url: 'javascript:alert(1)', caption: 'bad' },
      { url: 'data:image/png;base64,AAAA' },
      { url: 'https://cdn.example.com/b.jpg' },
      { url: 'https://cdn.example.com/c.jpg' },
    ];
    expect(visiblePhotos(list, 'grid').map((p) => p.caption)).toEqual(['A', '', '']);
    expect(visiblePhotos(list, 'beforeafter')).toHaveLength(2);
    expect(visiblePhotos(undefined)).toEqual([]);
  });
});

describe('barcode (Code 128 set B)', () => {
  it('works out the symbols and checksum', () => {
    expect(code128Symbols('A')).toEqual([104, 33, 34, 106]);
    // 104 + 40·1 + 69·2 + 76·3 + 76·4 + 79·5 = 1209; 1209 mod 103 = 76
    expect(code128Symbols('Hello')).toEqual([104, 40, 69, 76, 76, 79, 76, 106]);
  });

  it('rejects empty, too long and non-ASCII text', () => {
    expect(code128Symbols('')).toBeNull();
    expect(code128Symbols('x'.repeat(41))).toBeNull();
    expect(isBarcodeText('café')).toBe(false);
    expect(code128Bars('₹100')).toBeNull();
  });

  it('draws bars of the right total width: 11 modules per symbol, 13 for the stop, 10 quiet each side', () => {
    ['A', 'Hello 123', 'PO-2026-0142', '~!@#'].forEach((text) => {
      const { bars, width } = code128Bars(text);
      const symbols = text.length + 2; // start + data + checksum
      expect(width, text).toBe(20 + 11 * symbols + 13);
      expect(bars[0].x).toBe(10);
      const last = bars[bars.length - 1];
      expect(last.x + last.w).toBe(width - 10);
      // bars never overlap and never touch (a space separates every bar)
      for (let i = 1; i < bars.length; i += 1) {
        expect(bars[i].x).toBeGreaterThan(bars[i - 1].x + bars[i - 1].w);
      }
    });
  });
});

describe('blocks render', () => {
  it('every new Basics element mounts with its block kind', () => {
    const kinds = ['signature', 'photos', 'location', 'rating', 'daterange', 'measure', 'code', 'callout'];
    const els = getBasicsElements().filter((e) => kinds.includes(e.data?.kind));
    expect(els.length).toBe(10); // two photo layouts, two code types
    els.forEach((e) => {
      const { container } = mount({ id: e.id, type: 'blockNode', data: { ...e.data, workspaceId: 'w1' } });
      expect(container.querySelector(`[data-block-kind="${e.data.kind}"]`), e.name).toBeTruthy();
      cleanup();
    });
  });

  it('callout shows its title and message, and warnings are announced', () => {
    mount(block('callout', { tone: 'warning', title: 'Wet slab', text: 'No loading for 48 hours' }));
    expect(screen.getByText('Wet slab')).toBeTruthy();
    expect(byRole('alert').textContent).toContain('No loading for 48 hours');
  });

  it('rating: clicking a star saves it, clicking the current star again clears it', () => {
    mount(block('rating', { value: 2, label: 'Finish quality' }));
    expect(screen.getByText('2 / 5')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('4 of 5'));
    expect(persist).toHaveBeenCalledWith('b-rating', { value: 4 }, expect.any(Function), 'w1');
    fireEvent.click(screen.getByLabelText('2 of 5')); // the current rating
    expect(persist).toHaveBeenLastCalledWith('b-rating', { value: 0 }, expect.any(Function), 'w1');
  });

  it('rating is read-only when the block cannot be edited', () => {
    mount(block('rating', { value: 3, readOnly: true }));
    const star = screen.getByLabelText('5 of 5');
    expect(star.disabled).toBe(true);
    fireEvent.click(star);
    expect(persist).not.toHaveBeenCalled();
  });

  it('date range shows the span and the days between', () => {
    mount(block('daterange', { start: '2026-10-01', end: '2026-10-07', label: 'Shuttering' }));
    expect(screen.getByText('7 days')).toBeTruthy();
    expect(screen.getByText('Shuttering')).toBeTruthy();
  });

  it('date range warns when the end is before the start', () => {
    mount(block('daterange', { start: '2026-10-09', end: '2026-10-01' }));
    expect(screen.getByText('End is before start')).toBeTruthy();
  });

  it('number with unit shows the grouped value and unit, or a dash when empty', () => {
    mount(block('measure', { value: '120000', unit: 'm²', label: 'Built-up area' }));
    expect(screen.getByText('1,20,000')).toBeTruthy();
    expect(screen.getByText('m²')).toBeTruthy();
    cleanup();
    mount(block('measure', { value: '' }));
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('location: coordinates give a map and a link; none gives a prompt', () => {
    mount(block('location', { lat: '12.9716', lng: '77.5946', address: 'MG Road' }));
    expect(screen.getByTitle('Site location').getAttribute('src')).toContain('openstreetmap.org');
    expect(screen.getByText(/open in maps/i).closest('a').getAttribute('rel')).toContain('noopener');
    cleanup();
    mount(block('location', { lat: '', lng: '' }));
    expect(screen.getByText(/add latitude and longitude/i)).toBeTruthy();
  });

  it('QR code draws modules for the text; barcode draws bars; bad input explains why', () => {
    const { container } = mount(block('code', { format: 'qr', value: 'https://example.com/po/42' }));
    expect(screen.getByLabelText(/qr code for https:\/\/example\.com\/po\/42/i)).toBeTruthy();
    expect(container.querySelectorAll('svg[aria-label^="QR code"] rect').length).toBeGreaterThan(100);
    cleanup();

    const bar = mount(block('code', { format: 'barcode', value: 'PO-2026-0142' }));
    expect(screen.getByLabelText(/barcode for po-2026-0142/i)).toBeTruthy();
    expect(bar.container.querySelectorAll('svg[aria-label^="Barcode"] rect').length).toBeGreaterThan(20);
    cleanup();

    mount(block('code', { format: 'barcode', value: '₹100' }));
    expect(byRole('alert').textContent).toMatch(/up to 40 letters/i);
    cleanup();

    mount(block('code', { format: 'qr', value: 'x'.repeat(600) }));
    expect(byRole('alert').textContent).toMatch(/too long/i);
  });

  it('signature: drawing saves the strokes and a time', () => {
    window.PointerEvent = window.PointerEvent || window.MouseEvent;
    mount(block('signature', { signerName: 'R. Kumar', role: 'Site engineer' }));
    const pad = screen.getByLabelText(/signature pad, empty/i);
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(pad, { clientX: 60, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(pad, { clientX: 60, clientY: 50, pointerId: 1 });
    expect(persist).toHaveBeenCalledTimes(1);
    const [, changes] = persist.mock.calls[0];
    expect(changes.strokes[0].length).toBeGreaterThanOrEqual(2);
    expect(Number.isNaN(new Date(changes.signedAt).getTime())).toBe(false);
  });

  it('signature: a signed pad shows the signer and Clear removes the signature', () => {
    mount(block('signature', {
      signerName: 'R. Kumar',
      role: 'Site engineer',
      strokes: [[[10, 20], [60, 50]]],
      signedAt: '2026-10-10T10:00:00.000Z',
    }));
    expect(screen.getByText('R. Kumar')).toBeTruthy();
    expect(screen.getByText('Site engineer')).toBeTruthy();
    expect(screen.getByLabelText('Signature')).toBeTruthy();
    fireEvent.click(screen.getByText('Clear'));
    expect(persist).toHaveBeenLastCalledWith('b-signature', { strokes: [], signedAt: null }, expect.any(Function), 'w1');
  });

  it('signature is not drawable in a read-only view', () => {
    window.PointerEvent = window.PointerEvent || window.MouseEvent;
    mount(block('signature', { readOnly: true }));
    const pad = screen.getByLabelText(/signature pad, empty/i);
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(pad, { clientX: 10, clientY: 20, pointerId: 1 });
    expect(persist).not.toHaveBeenCalled();
    expect(screen.getByText(/not signed yet/i)).toBeTruthy();
  });
});

describe('PhotosBlock', () => {
  const file = new File(['x'], 'site.jpg', { type: 'image/jpeg' });

  it('uploads into the chosen slot and saves the address', async () => {
    const upload = vi.fn().mockResolvedValue('https://cdn.example.com/site.jpg');
    const onChange = vi.fn();
    const { container } = render(
      <PhotosBlock id="p1" data={defaultBlockData('photos')} editable onChange={onChange} workspaceId="w1" upload={upload} />
    );
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith(file, { workspaceId: 'w1', nodeId: 'p1' });
    expect(onChange).toHaveBeenCalledWith({ photos: [{ url: 'https://cdn.example.com/site.jpg', caption: '' }] });
  });

  it('shows the error and keeps the photos when an upload fails', async () => {
    const upload = vi.fn().mockRejectedValue(new Error('Image must be under 10 MB'));
    const onChange = vi.fn();
    const { container } = render(
      <PhotosBlock id="p1" data={defaultBlockData('photos')} editable onChange={onChange} workspaceId="w1" upload={upload} />
    );
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(byRole('alert').textContent).toMatch(/under 10 MB/));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('before / after labels two slots and only offers Add on the empty one', () => {
    const data = {
      ...defaultBlockData('photos'),
      mode: 'beforeafter',
      photos: [{ url: 'https://cdn.example.com/before.jpg', caption: 'Cracked wall' }],
    };
    render(<PhotosBlock id="p1" data={data} editable onChange={() => {}} workspaceId="w1" />);
    expect(screen.getByText('Before')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
    expect(byRole('button', { name: /add after photo/i })).toBeTruthy();
    expect(queryRole('button', { name: /add before photo/i })).toBeNull();
  });

  it('a viewer sees captions but no upload or remove controls', () => {
    const data = { ...defaultBlockData('photos'), photos: [{ url: 'https://cdn.example.com/a.jpg', caption: 'Level 2 slab' }] };
    render(<PhotosBlock id="p1" data={data} editable={false} onChange={() => {}} workspaceId="w1" />);
    expect(screen.getByText('Level 2 slab')).toBeTruthy();
    expect(queryRole('button')).toBeNull();
  });

  it('never draws an address that is not http(s)', () => {
    const data = { ...defaultBlockData('photos'), photos: [{ url: 'javascript:alert(1)', caption: 'x' }] };
    const { container } = render(<PhotosBlock id="p1" data={data} editable={false} onChange={() => {}} workspaceId="w1" />);
    expect(container.querySelector('img')).toBeNull();
  });
});
