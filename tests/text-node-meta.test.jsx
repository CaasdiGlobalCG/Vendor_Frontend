/**
 * Text node metadata suite.
 *
 * Covers the three text improvements:
 *  1. Authorship — text nodes now stamp addedBy/addedByEmail/addedByRole/addedAt
 *     exactly like element nodes, and the helpers format them safely.
 *  2. Comments — text nodes render the comment affordance and the thread uses
 *     the same node.data.comments shape as ElementNode.
 *  3. Presets — TextPanel exposes one-click typography bundles.
 *
 * reactflow and react-router-dom are mocked because TextNode is normally
 * rendered inside a ReactFlow canvas; these tests render it standalone.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';

vi.mock('reactflow', () => ({
  Handle: () => null,
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
  useReactFlow: () => ({ setNodes: vi.fn(), getNodes: () => [], setEdges: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({}),
}));

vi.mock('../src/pages/WorkspacePage/utils/nodePersistence', () => ({
  persistIsImportant: vi.fn().mockResolvedValue(undefined),
  persistDeadline: vi.fn().mockResolvedValue(undefined),
  persistTextContent: vi.fn().mockResolvedValue(undefined),
  persistNodeDataPatch: vi.fn().mockResolvedValue(undefined),
  emitLiveTextPatch: vi.fn(),
  consumeTextNodeFocus: () => false,
  formatTimeLeft: () => '1h',
  getTimeLeft: () => ({ isExpired: false }),
}));

import TextNode from '../src/pages/WorkspacePage/components/nodes/TextNode.jsx';
import TextPanel, { TEXT_PRESETS } from '../src/pages/WorkspacePage/components/TextPanel.jsx';
import { buildAuthorMeta, formatAuthorLine, formatAddedAt } from '../src/pages/WorkspacePage/utils/nodeAuthor.js';

afterEach(cleanup);

describe('buildAuthorMeta', () => {
  it('stamps the same authorship shape element nodes use', () => {
    const meta = buildAuthorMeta({ name: 'Dhanush', email: 'd@caasdi.in', role: 'pm' });

    expect(meta.addedBy).toBe('Dhanush');
    expect(meta.addedByEmail).toBe('d@caasdi.in');
    expect(meta.addedByRole).toBe('pm');
    expect(Number.isNaN(new Date(meta.addedAt).getTime())).toBe(false);
  });

  it('falls back to email, then a placeholder, and defaults the role to vendor', () => {
    expect(buildAuthorMeta({ email: 'only@email.com' }).addedBy).toBe('only@email.com');
    expect(buildAuthorMeta(null).addedBy).toBe('Unknown User');
    expect(buildAuthorMeta(null).addedByRole).toBe('vendor');
    expect(buildAuthorMeta(null).addedByEmail).toBeNull();
  });
});

describe('author formatting helpers', () => {
  it('labels the role next to the name', () => {
    expect(formatAuthorLine({ addedBy: 'Dhanush', addedByRole: 'pm' })).toBe('Dhanush (PM)');
    expect(formatAuthorLine({ addedBy: 'Ravi', addedByRole: 'vendor' })).toBe('Ravi (Vendor)');
    expect(formatAuthorLine({ addedBy: 'Client Co', addedByRole: 'client' })).toBe('Client Co (Client)');
  });

  it('returns null when there is no author (older nodes have no metadata)', () => {
    expect(formatAuthorLine({})).toBeNull();
    expect(formatAuthorLine(undefined)).toBeNull();
  });

  it('formats dates without throwing on bad input', () => {
    expect(formatAddedAt(null)).toBe('unknown date');
    expect(formatAddedAt('not-a-date')).toBe('unknown date');
    expect(formatAddedAt('2026-10-05T10:00:00.000Z')).toMatch(/2026/);
  });
});

describe('TextNode — authorship + comments affordances', () => {
  const baseData = {
    workspaceId: 'ws-1',
    content: 'Phase 1 — Procurement',
    caption: true,
    name: 'Text',
    ...buildAuthorMeta({ name: 'Dhanush', email: 'd@caasdi.in', role: 'pm' }),
  };

  it('renders the caption text', () => {
    render(<TextNode id="text-1" data={baseData} isConnectable selected />);
    expect(screen.getByText('Phase 1 — Procurement')).toBeTruthy();
  });

  it('shows the authorship popover with the author and role', () => {
    render(<TextNode id="text-1" data={baseData} isConnectable selected />);

    fireEvent.click(screen.getByTitle('Added by Dhanush (PM)'));

    expect(screen.getByText('Dhanush (PM)')).toBeTruthy();
    expect(screen.getByText('d@caasdi.in')).toBeTruthy();
  });

  it('omits the authorship affordance for nodes created before metadata existed', () => {
    const legacy = { ...baseData };
    delete legacy.addedBy;

    render(<TextNode id="text-1" data={legacy} isConnectable selected />);

    expect(screen.queryByTitle(/^Added by/)).toBeNull();
  });

  it('opens the comment thread and reports unresolved comment counts', () => {
    const withComments = {
      ...baseData,
      comments: [
        { id: 'c1', text: 'Needs a rate', resolved: false },
        { id: 'c2', text: 'Done', resolved: true },
      ],
    };

    render(<TextNode id="text-1" data={withComments} isConnectable selected />);

    // 1 unresolved of 2
    expect(screen.getByTitle('1 unresolved comment(s)')).toBeTruthy();
  });

  it('offers a comment affordance even when the node has no comments yet', () => {
    render(<TextNode id="text-1" data={baseData} isConnectable selected />);
    expect(screen.getByTitle('Add a comment')).toBeTruthy();
  });
});

describe('TextPanel — presets and authorship line', () => {
  const selectedTextElement = {
    id: 'text-1',
    workspaceId: 'ws-1',
    content: 'Hello',
    position: { x: 10, y: 20 },
    ...buildAuthorMeta({ name: 'Dhanush', email: 'd@caasdi.in', role: 'pm' }),
  };

  const renderPanel = (onUpdateTextElement = vi.fn()) => {
    render(
      <TextPanel
        isOpen
        onClose={() => {}}
        selectedTextElement={selectedTextElement}
        onUpdateTextElement={onUpdateTextElement}
      />
    );
    return onUpdateTextElement;
  };

  it('exposes the four typography presets', () => {
    renderPanel();
    TEXT_PRESETS.forEach((preset) => {
      expect(screen.getByText(preset.label)).toBeTruthy();
    });
  });

  it('applies the Heading preset as one bundled update', () => {
    const onUpdate = renderPanel();

    fireEvent.click(screen.getByText('Heading'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const payload = onUpdate.mock.calls[0][0];
    expect(payload.fontSize).toBe('24');
    expect(payload.fontWeight).toBe('bold');
    expect(payload.color).toBe('#111827');
    // Existing node fields must survive the preset
    expect(payload.id).toBe('text-1');
    expect(payload.content).toBe('Hello');
  });

  it('applies the Note preset with a highlight background', () => {
    const onUpdate = renderPanel();

    fireEvent.click(screen.getByText('Note'));

    const payload = onUpdate.mock.calls[0][0];
    expect(payload.backgroundColor).toBe('#FEF3C7');
    expect(payload.fontSize).toBe('12');
  });

  it('shows who added the text element', () => {
    renderPanel();
    expect(screen.getByText('Dhanush (PM)')).toBeTruthy();
  });
});
