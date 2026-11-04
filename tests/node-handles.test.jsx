/**
 * NodeHandles — every canvas node must expose the same eight handle ids so
 * edges never reference a handle that does not exist.
 */
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';

import NodeHandles from '../src/pages/WorkspacePage/components/nodes/NodeHandles.jsx';

beforeAll(() => {
  // jsdom lacks these; React Flow needs them to mount
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.DOMMatrixReadOnly = class {
    constructor() {
      this.m22 = 1;
    }
  };
});

const renderNode = (props) => {
  const Probe = () => (
    <div style={{ width: 100, height: 50 }}>
      <NodeHandles {...props} />
    </div>
  );
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow
          nodes={[{ id: 'n1', type: 'probe', position: { x: 0, y: 0 }, data: {} }]}
          edges={[]}
          nodeTypes={{ probe: Probe }}
        />
      </div>
    </ReactFlowProvider>
  );
};

const handleIds = (container, type) =>
  Array.from(container.querySelectorAll(`.react-flow__handle.${type}`)).map((el) =>
    el.getAttribute('data-handleid')
  );

describe('NodeHandles', () => {
  it('renders all eight canonical handle ids', async () => {
    const { container } = renderNode({});
    await waitFor(() => expect(container.querySelectorAll('.react-flow__handle').length).toBe(8));

    expect(handleIds(container, 'source').sort()).toEqual(
      ['bottom-out', 'left-out', 'right-out', 'top-out']
    );
    expect(handleIds(container, 'target').sort()).toEqual(
      ['bottom-in', 'left-in', 'right-in', 'top-in']
    );
  });

  it('marks target handles as invisible legacy handles and source handles as the visible ones', async () => {
    const { container } = renderNode({});
    await waitFor(() => expect(container.querySelectorAll('.react-flow__handle').length).toBe(8));

    container.querySelectorAll('.react-flow__handle.target').forEach((el) => {
      expect(el.classList.contains('wk-handle-legacy')).toBe(true);
    });
    container.querySelectorAll('.react-flow__handle.source').forEach((el) => {
      expect(el.classList.contains('wk-handle')).toBe(true);
      expect(el.classList.contains('wk-handle-legacy')).toBe(false);
    });
  });

  it('puts the preferred side first so handle-less legacy edges attach there', async () => {
    const { container } = renderNode({ defaultSource: 'top', defaultTarget: 'top' });
    await waitFor(() => expect(container.querySelectorAll('.react-flow__handle').length).toBe(8));
    expect(handleIds(container, 'source')[0]).toBe('top-out');
    expect(handleIds(container, 'target')[0]).toBe('top-in');

    const bottomFirst = renderNode({});
    await waitFor(() =>
      expect(bottomFirst.container.querySelectorAll('.react-flow__handle').length).toBe(8)
    );
    expect(handleIds(bottomFirst.container, 'source')[0]).toBe('bottom-out');
    expect(handleIds(bottomFirst.container, 'target')[0]).toBe('top-in');
  });
});
