/**
 * ElementNode smoke test — mounts the canvas node component itself.
 *
 * Regression guard for the TDZ crash ("Cannot access 'getCurrentUserRole'
 * before initialization"): the field-access block runs unconditionally during
 * render, so ANY mount throws if a const is referenced before its declaration.
 * Unit tests of fieldAccess.js/FieldAccessPanel can't see inside this file.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// jsdom gaps used by React Flow / renderers
if (!window.ResizeObserver) {
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (!window.matchMedia) {
  window.matchMedia = (q) => ({
    matches: false, media: q,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}
  });
}

vi.mock('reactflow', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useReactFlow: () => ({
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    getNodes: () => []
  }),
  NodeResizer: () => null
}));

vi.mock('react-router-dom', async (orig) => {
  const actual = await orig();
  return { ...actual, useParams: () => ({}) };
});

const { default: ElementNode } = await import(
  '../src/pages/WorkspacePage/components/nodes/ElementNode.jsx'
);

const baseData = { workspaceId: 'ws-1', name: 'Field' };

describe('ElementNode — mounts without crashing', () => {
  it('renders an input-type element', () => {
    const { container } = render(
      <ElementNode id="n1" data={{ ...baseData, id: 'input', type: 'input' }} isConnectable={false} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a table element (includes the Full view button)', () => {
    render(
      <ElementNode
        id="n2"
        data={{
          ...baseData,
          id: 'data-table',
          type: 'table',
          name: 'BOQ',
          customTableData: { columns: ['item'], data: [{ id: 'r1', item: 'Cement' }] }
        }}
        isConnectable={false}
      />
    );
    expect(screen.getByText('Full view')).toBeTruthy();
  });

  it('hides the assign control from viewers who are not creator or PM', () => {
    render(
      <ElementNode
        id="n3"
        data={{ ...baseData, id: 'input', type: 'input', addedByEmail: 'other@x.com' }}
        isConnectable={false}
      />
    );
    // URL has no identity params and no VendorContext → viewer is anonymous
    expect(screen.queryByText(/assign to someone/i)).toBeNull();
  });
});
