/**
 * BOQGenerator element — render suite.
 *
 * Regression guard for the 2026-09-30 pull: the BOQ input modal must NEVER
 * auto-open on mount (auto-open broke snapshot renders and canvas remounts).
 * It opens only when the user clicks "Generate BOQ".
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';

import BOQGenerator from '../src/pages/WorkspacePage/components/forms/BOQGenerator.jsx';

afterEach(() => {
  cleanup();
});

const nodeProps = {
  data: { type: 'boq-generator', id: 'boq-generator', name: 'BOQ Generator' },
  nodeId: 'test-node',
  workspaceId: 'test-workspace',
  setNodes: () => {},
};

describe('BOQGenerator', () => {
  it('renders the collapsed placeholder on mount (modal does NOT auto-open)', () => {
    render(<BOQGenerator {...nodeProps} />);
    expect(screen.getByText('Bill of Quantities')).toBeTruthy();
    expect(screen.getByText(/click to generate a professional boq/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /generate boq/i })).toBeTruthy();
  });

  it('opens the generator when the user clicks "Generate BOQ"', () => {
    render(<BOQGenerator {...nodeProps} />);
    fireEvent.click(screen.getByRole('button', { name: /generate boq/i }));
    // The placeholder is replaced by the (portaled) input modal.
    expect(screen.queryByText(/click to generate a professional boq/i)).toBeNull();
  });
});
