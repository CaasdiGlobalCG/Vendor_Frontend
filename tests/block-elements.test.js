import { describe, it, expect } from 'vitest';
import {
  BLOCK_CATALOG,
  BLOCK_KINDS,
  defaultBlockData,
  blockElementFor,
  progressPercent,
  progressTone,
  describeDelta,
  sparklinePoints,
  getStatusOption,
  isDecorativeBlockNode,
  STATUS_OPTIONS,
  getBasicsElements,
  safeHttpUrl,
  hostOf,
  embedSource,
  timeRemaining,
  countdownTone,
  shapeColors,
  isNonSlideBlockNode,
} from '../src/pages/WorkspacePage/utils/blockElements.js';
import { isConnectableNode } from '../src/pages/WorkspacePage/utils/connectionUtils.js';
import { getPresentationStops } from '../src/pages/WorkspacePage/utils/presentationUtils.js';
import { estimateElementSize } from '../src/pages/WorkspacePage/utils/canvasPlacement.js';

describe('block catalog', () => {
  it('builds a canvas element for every kind, each reachable from Basics', () => {
    const basicsKinds = new Set(getBasicsElements().filter((e) => e.nodeType === 'blockNode').map((e) => e.data.kind));
    BLOCK_KINDS.forEach((kind) => {
      expect(basicsKinds.has(kind), kind).toBe(true);
      const el = blockElementFor(kind);
      expect(el.nodeType).toBe('blockNode');
      expect(el.type).toBe(`block-${kind}`);
      expect(el.data.kind).toBe(kind);
      expect(estimateElementSize(el)).not.toEqual({ w: 320, h: 200 }); // has a measured size, not the generic default
    });
  });
});

describe('placement size of resizable blocks', () => {
  it('uses the size the element starts with, not one size per type', () => {
    const [video, web] = getBasicsElements().filter((e) => e.data?.kind === 'embed');
    expect(estimateElementSize(video)).toEqual({ w: 480, h: 300 });
    expect(estimateElementSize(web)).toEqual({ w: 560, h: 360 });
    const diamond = getBasicsElements().find((e) => e.data?.shape === 'diamond');
    expect(estimateElementSize(diamond)).toEqual({ w: 200, h: 140 });
  });
});

describe('progress', () => {
  it('computes a clamped whole percentage', () => {
    expect(progressPercent(40, 100)).toBe(40);
    expect(progressPercent('3', '8')).toBe(38);
    expect(progressPercent(150, 100)).toBe(100);
    expect(progressPercent(-5, 100)).toBe(0);
  });
  it('never divides by zero or NaN', () => {
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent('abc', 100)).toBe(0);
    expect(progressPercent(undefined, undefined)).toBe(0);
  });
  it('accepts formatted numbers', () => {
    expect(progressPercent('1,250', '2,500')).toBe(50);
  });
  it('chooses a tone from how far along it is', () => {
    expect([0, 29, 30, 59, 60, 99, 100].map(progressTone)).toEqual(
      ['danger', 'danger', 'warning', 'warning', 'info', 'info', 'success']
    );
  });
});

describe('KPI helpers', () => {
  it('describes a delta', () => {
    expect(describeDelta(12)).toEqual({ sign: 'up', text: '+12%' });
    expect(describeDelta('-3.46')).toEqual({ sign: 'down', text: '-3.5%' });
    expect(describeDelta(0)).toEqual({ sign: 'flat', text: '0%' });
    expect(describeDelta('')).toEqual({ sign: 'flat', text: '' });
  });
  it('draws a sparkline inside its box', () => {
    const pts = sparklinePoints([1, 5, 3], 96, 28, 2).split(' ').map((p) => p.split(',').map(Number));
    expect(pts).toHaveLength(3);
    expect(pts[0][0]).toBe(2);
    expect(pts[2][0]).toBe(94);
    expect(pts[1][1]).toBe(2); // highest value sits at the top padding
    expect(pts[0][1]).toBe(26); // lowest at the bottom
    pts.forEach(([x, y]) => { expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(28); });
  });
  it('needs two numbers; accepts text', () => {
    expect(sparklinePoints([4])).toBe('');
    expect(sparklinePoints('')).toBe('');
    expect(sparklinePoints('1, 2, x, 3').split(' ')).toHaveLength(3);
  });
  it('flat data does not produce NaN', () => {
    expect(sparklinePoints([5, 5, 5])).not.toMatch(/NaN/);
  });
});

describe('status', () => {
  it('falls back to a known option', () => {
    expect(getStatusOption('delayed').tone).toBe('danger');
    expect(getStatusOption('nonsense')).toBe(STATUS_OPTIONS[1]);
  });
});

describe('decorative blocks', () => {
  const node = (kind) => ({ id: kind, type: 'blockNode', position: { x: 0, y: 0 }, data: { kind } });

  it('headings and dividers are not connection endpoints; data blocks are', () => {
    expect(isDecorativeBlockNode(node('heading'))).toBe(true);
    expect(isConnectableNode(node('heading'))).toBe(false);
    expect(isConnectableNode(node('divider'))).toBe(false);
    ['status', 'progress', 'kpi'].forEach((k) => expect(isConnectableNode(node(k))).toBe(true));
  });

  it('dividers are not Present slides; headings and data blocks are', () => {
    const nodes = ['heading', 'divider', 'status', 'kpi'].map((k, i) => ({
      ...node(k),
      position: { x: i * 400, y: 0 },
      data: { kind: k, text: k === 'heading' ? 'Phase 1' : undefined, label: k },
    }));
    const stops = getPresentationStops(nodes);
    expect(stops.map((s) => s.id)).toEqual(['heading', 'status', 'kpi']);
    expect(stops[0].label).toBe('Phase 1');
  });
});

describe('Basics list', () => {
  it('has every requested element, once, and no sticky note', () => {
    const names = getBasicsElements().map((e) => e.name);
    expect(names).toEqual([
      'Text', 'Heading', 'Rectangle', 'Ellipse', 'Diamond', 'Arrow', 'Divider', 'Section / Frame', 'Image',
      'Video Embed', 'Web Embed', 'Link Card', 'Comment Pin', 'Status Badge', 'Progress Bar', 'KPI Card', 'Countdown',
      'Signature Pad', 'Photo Grid', 'Before / After', 'Location Pin', 'Rating', 'Date Range', 'Number with Unit',
      'QR Code', 'Barcode', 'Callout',
    ]);
    expect(new Set(getBasicsElements().map((e) => e.id)).size).toBe(names.length);
    expect(names.join(' ')).not.toMatch(/sticky|note/i);
  });

  it('reuses the canvas\'s own text, frame and image elements', () => {
    const by = (n) => getBasicsElements().find((e) => e.name === n);
    expect(by('Text').type).toBe('text');
    expect(by('Section / Frame').type).toBe('frame');
    expect(by('Image').type).toBe('image-block');
    expect(by('Image').imageBlockData.annotations).toEqual([]); // blank, not the demo content
  });

  it('shapes are blocks of the right shape; only arrows are decorative', () => {
    const shapes = getBasicsElements().filter((e) => e.data?.kind === 'shape');
    expect(shapes.map((e) => e.data.shape)).toEqual(['rectangle', 'ellipse', 'diamond', 'arrow']);
    const node = (e) => ({ id: e.id, type: 'blockNode', data: e.data });
    expect(shapes.map((e) => isConnectableNode(node(e)))).toEqual([true, true, true, false]);
    expect(shapes.map((e) => isNonSlideBlockNode(node(e)))).toEqual([false, false, false, true]);
  });

  it('comment pins neither connect nor become slides', () => {
    const pin = { id: 'p', type: 'blockNode', data: { kind: 'comment' } };
    expect(isConnectableNode(pin)).toBe(false);
    expect(getPresentationStops([pin])).toEqual([]);
  });
});

describe('safeHttpUrl', () => {
  it('cleans up ordinary addresses', () => {
    expect(safeHttpUrl('example.com/page')).toBe('https://example.com/page');
    expect(safeHttpUrl('  http://example.com  ')).toBe('http://example.com/');
    expect(hostOf('https://www.example.com/a')).toBe('example.com');
  });
  it('refuses anything that is not a web address', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'ftp://x.com/a', '', '   ', 'two words.com', 'localhost', null, undefined]) {
      expect(safeHttpUrl(bad), String(bad)).toBeNull();
    }
    expect(hostOf('javascript:alert(1)')).toBe('');
  });
});

describe('embedSource', () => {
  it('turns provider links into embeddable addresses', () => {
    expect(embedSource('https://www.youtube.com/watch?v=abc123')).toEqual({ provider: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/abc123' });
    expect(embedSource('https://youtu.be/abc123?t=5').src).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(embedSource('https://www.youtube.com/shorts/xyz').src).toBe('https://www.youtube-nocookie.com/embed/xyz');
    expect(embedSource('https://www.loom.com/share/0123abcd?sid=x')).toEqual({ provider: 'Loom', src: 'https://www.loom.com/embed/0123abcd' });
    expect(embedSource('https://vimeo.com/76979871').src).toBe('https://player.vimeo.com/video/76979871');
    expect(embedSource('https://www.figma.com/design/AbC/Plan').provider).toBe('Figma');
    expect(embedSource('https://docs.google.com/spreadsheets/d/ID/edit#gid=0').src).toBe('https://docs.google.com/spreadsheets/d/ID/preview');
  });
  it('does not embed other sites, look-alike hosts or non-web schemes', () => {
    for (const bad of [
      'https://example.com/video', 'https://evil.com/youtube.com/watch?v=a', 'https://youtube.com.evil.com/watch?v=a',
      'https://notyoutube.com/watch?v=a', 'javascript:alert(1)', 'https://www.youtube.com/', 'https://www.loom.com/', 'https://vimeo.com/channels',
    ]) {
      expect(embedSource(bad), bad).toBeNull();
    }
  });
});

describe('timeRemaining', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  it('splits the time left into days, hours and minutes', () => {
    const t = timeRemaining(new Date(now + (3 * 86400 + 5 * 3600 + 7 * 60 + 30) * 1000).toISOString(), now);
    expect([t.days, t.hours, t.minutes, t.expired]).toEqual([3, 5, 7, false]);
  });
  it('is expired at and after the target, never negative', () => {
    expect(timeRemaining(new Date(now).toISOString(), now).expired).toBe(true);
    const past = timeRemaining(new Date(now - 5000).toISOString(), now);
    expect([past.expired, past.days, past.hours, past.minutes]).toEqual([true, 0, 0, 0]);
  });
  it('flags an unusable date', () => {
    expect(timeRemaining('nope', now).valid).toBe(false);
    expect(timeRemaining(undefined, now).valid).toBe(false);
  });
  it('turns urgent as it nears', () => {
    const tone = (ms) => countdownTone(timeRemaining(new Date(now + ms).toISOString(), now));
    expect([tone(5 * 86400000), tone(2 * 86400000), tone(3600000), tone(-1)]).toEqual(['info', 'warning', 'danger', 'danger']);
  });
});

describe('shapeColors', () => {
  it('uses theme tokens, with a safe fallback', () => {
    expect(shapeColors('danger').stroke).toBe('rgb(var(--status-danger))');
    expect(shapeColors('none').fill).toBe('transparent');
    expect(shapeColors('???')).toEqual(shapeColors('neutral'));
  });
});
