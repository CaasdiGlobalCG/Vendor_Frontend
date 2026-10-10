/**
 * Text node audience, locking, ownership and readability suite.
 *
 * Pins the behaviours added on top of the base text improvements:
 *  - `visibleTo` audience control (who can see a note)
 *  - `locked` notes (no drag, no edit, no delete)
 *  - `assignee` ownership
 *  - readability guardrails (min size + contrast)
 *
 * The audience helpers fail open by design — a note with no audience, or a
 * viewer with an unrecognised role, must stay visible so content is never
 * silently lost. Those cases are asserted explicitly below.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
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
import TextPanel from '../src/pages/WorkspacePage/components/TextPanel.jsx';
import {
  AUDIENCE_ROLES,
  MIN_CONTRAST_RATIO,
  MIN_READABLE_FONT_PT,
  contrastRatio,
  describeAudience,
  getAudience,
  getReadabilityWarnings,
  isAudienceRestricted,
  isLocked,
  isVisibleToRole,
  normalizeRole,
  toggleAudienceRole,
} from '../src/pages/WorkspacePage/utils/nodeVisibility.js';

afterEach(cleanup);

describe('audience helpers', () => {
  it('treats a missing audience as everyone', () => {
    expect(getAudience({})).toEqual(AUDIENCE_ROLES);
    expect(isAudienceRestricted({})).toBe(false);
    expect(describeAudience({})).toBe('Everyone');
  });

  it('fails open for unknown roles so nothing is ever lost', () => {
    expect(normalizeRole('contractor')).toBeNull();
    expect(isVisibleToRole({ visibleTo: ['pm'] }, 'contractor')).toBe(true);
    expect(isVisibleToRole({ visibleTo: ['pm'] }, undefined)).toBe(true);
    // Unusable audience values fall back to everyone
    expect(getAudience({ visibleTo: ['contractor'] })).toEqual(AUDIENCE_ROLES);
  });

  it('normalises admin-style roles onto the audience vocabulary', () => {
    expect(normalizeRole('admin')).toBe('pm');
    expect(normalizeRole('PM')).toBe('pm');
    expect(isVisibleToRole({ visibleTo: ['pm'] }, 'admin')).toBe(true);
  });

  it('reports restricted audiences in readable form', () => {
    expect(describeAudience({ visibleTo: ['pm'] })).toBe('PM only');
    expect(describeAudience({ visibleTo: ['pm', 'client'] })).toBe('PM + Client');
    expect(isAudienceRestricted({ visibleTo: ['pm'] })).toBe(true);
  });

  it('toggles roles but never produces an empty audience', () => {
    expect(toggleAudienceRole({ visibleTo: ['pm', 'vendor', 'client'] }, 'client')).toEqual(['pm', 'vendor']);
    expect(toggleAudienceRole({ visibleTo: ['pm'] }, 'vendor')).toEqual(['pm', 'vendor']);
    expect(toggleAudienceRole({ visibleTo: ['pm'] }, 'pm')).toEqual(['pm']);
  });

  it('detects locked notes', () => {
    expect(isLocked({ locked: true })).toBe(true);
    expect(isLocked({})).toBe(false);
    expect(isLocked({ locked: 'yes' })).toBe(false);
  });
});

describe('readability guardrails', () => {
  it('computes WCAG contrast and rejects unusable colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
    expect(contrastRatio('not-a-colour', '#ffffff')).toBeNull();
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 0);
  });

  it('flags text below the readability minimum', () => {
    const warnings = getReadabilityWarnings({ fontSize: '8', color: '#111827', backgroundColor: 'transparent' });
    expect(warnings.some((w) => w.includes(`${MIN_READABLE_FONT_PT}pt`))).toBe(true);
  });

  it('flags low contrast against the canvas background', () => {
    const warnings = getReadabilityWarnings({
      fontSize: '14',
      color: '#eeeeee',
      backgroundColor: 'transparent',
      caption: true,
    });
    expect(warnings.some((w) => w.toLowerCase().includes('low contrast'))).toBe(true);
  });

  it('stays quiet for readable, high-contrast text', () => {
    expect(
      getReadabilityWarnings({ fontSize: '16', color: '#111827', backgroundColor: 'transparent' })
    ).toEqual([]);
    expect(MIN_CONTRAST_RATIO).toBeGreaterThan(4);
  });
});

describe('TextPanel — audience, ownership and lock', () => {
  const collaborators = [
    { vendorId: 'V-1', name: 'Ravi Kumar', email: 'ravi@example.com' },
    { vendorId: 'V-2', name: 'Anita Rao', email: 'anita@example.com' },
  ];

  const baseElement = {
    id: 'text-1',
    workspaceId: 'ws-1',
    content: 'Phase 1 — Procurement',
    position: { x: 10, y: 20 },
    fontSize: '14',
    color: '#111827',
    backgroundColor: 'transparent',
    workspaceCollaborators: collaborators,
  };

  const renderPanel = (element = baseElement) => {
    const onUpdate = vi.fn();
    render(
      <TextPanel isOpen onClose={() => {}} selectedTextElement={element} onUpdateTextElement={onUpdate} />
    );
    return onUpdate;
  };

  it('renders a chip per role and toggles a role off', () => {
    const onUpdate = renderPanel();

    expect(screen.getByText('Who can see this')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Hide from Client'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0].visibleTo).toEqual(['pm', 'vendor']);
  });

  it('reports the current audience in plain language', () => {
    renderPanel({ ...baseElement, visibleTo: ['pm'] });
    expect(screen.getByText(/Visible to PM only/)).toBeTruthy();
  });

  it('says everyone when no restriction is set', () => {
    renderPanel();
    expect(screen.getByText(/Visible to every collaborator/)).toBeTruthy();
  });

  it('toggles the lock and persists it', () => {
    const onUpdate = renderPanel();

    fireEvent.click(screen.getByTitle('Lock position and content'));

    expect(onUpdate.mock.calls[0][0].locked).toBe(true);
  });

  it('assigns a collaborator and stores their details', () => {
    const onUpdate = renderPanel();

    fireEvent.change(screen.getByTitle('Assign this note to a collaborator'), {
      target: { value: 'V-2' },
    });

    expect(onUpdate.mock.calls[0][0].assignee).toEqual({
      vendorId: 'V-2',
      name: 'Anita Rao',
      email: 'anita@example.com',
    });
  });

  it('clears the assignee back to unassigned', () => {
    const onUpdate = renderPanel({ ...baseElement, assignee: { vendorId: 'V-1', name: 'Ravi Kumar' } });

    fireEvent.change(screen.getByTitle('Assign this note to a collaborator'), { target: { value: '' } });

    expect(onUpdate.mock.calls[0][0].assignee).toBeNull();
  });

  it('surfaces readability warnings for tiny, low-contrast text', () => {
    renderPanel({ ...baseElement, fontSize: '8', color: '#eeeeee' });

    expect(screen.getByText(/below the 10pt readability minimum/)).toBeTruthy();
    expect(screen.getByText(/Low contrast/)).toBeTruthy();
  });
});

describe('TextNode — locked notes and state badges', () => {
  const baseData = {
    workspaceId: 'ws-1',
    content: 'Site 2 scope excluded',
    caption: true,
    name: 'Text',
    addedBy: 'Dhanush',
    addedByRole: 'pm',
    addedAt: '2026-10-05T10:00:00.000Z',
  };

  it('shows the audience badge only when the note is restricted', () => {
    const { unmount } = render(<TextNode id="t1" data={baseData} isConnectable selected />);
    expect(screen.queryByTitle(/^Visible to/)).toBeNull();
    unmount();

    render(<TextNode id="t2" data={{ ...baseData, visibleTo: ['pm'] }} isConnectable selected />);
    expect(screen.getByTitle('Visible to PM only')).toBeTruthy();
  });

  it('shows lock and assignee badges when set', () => {
    render(
      <TextNode
        id="t3"
        data={{ ...baseData, locked: true, assignee: { vendorId: 'V-1', name: 'Ravi Kumar' } }}
        isConnectable
        selected
      />
    );

    expect(screen.getByTitle('Locked — position and content are fixed')).toBeTruthy();
    expect(screen.getByTitle('Assigned to Ravi Kumar')).toBeTruthy();
  });

  it('does not enter edit mode on a locked note', () => {
    render(<TextNode id="t4" data={{ ...baseData, locked: true }} isConnectable selected />);

    const caption = screen.getByText('Site 2 scope excluded');
    fireEvent.doubleClick(caption);
    fireEvent.click(caption);

    expect(screen.queryByPlaceholderText('Type here...')).toBeNull();
  });

  it('still edits an unlocked note on double click', () => {
    render(<TextNode id="t5" data={baseData} isConnectable selected />);

    fireEvent.doubleClick(screen.getByText('Site 2 scope excluded'));

    expect(screen.getByPlaceholderText('Type here...')).toBeTruthy();
  });
});
