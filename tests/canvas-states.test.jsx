/**
 * Skeletons, empty-canvas actions and the client-view banner.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

import { CanvasSkeleton, WorkspaceSkeleton, useDelayedFlag } from '../src/pages/WorkspacePage/components/ui/Skeleton.jsx';
import EmptyCanvasState from '../src/pages/WorkspacePage/components/EmptyCanvasState.jsx';
import ClientViewBar from '../src/pages/WorkspacePage/components/ClientViewBar.jsx';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('skeletons', () => {
  it('announce loading to assistive tech', () => {
    render(<CanvasSkeleton />);
    const s = screen.getByTestId('canvas-skeleton');
    expect(s.getAttribute('role')).toBe('status');
    expect(s.getAttribute('aria-busy')).toBe('true');
    cleanup();
    render(<WorkspaceSkeleton message="Loading workspace for Acme" />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading workspace for Acme');
  });

  describe('useDelayedFlag', () => {
    const Probe = ({ flag }) => <div data-testid="p">{String(useDelayedFlag(flag, 150))}</div>;

    beforeEach(() => vi.useFakeTimers());

    it('stays false for a fast load, so nothing flashes', () => {
      const { rerender } = render(<Probe flag />);
      act(() => { vi.advanceTimersByTime(100); });
      rerender(<Probe flag={false} />);
      act(() => { vi.advanceTimersByTime(500); });
      expect(screen.getByTestId('p').textContent).toBe('false');
    });

    it('turns true after the delay and false again at once when done', () => {
      const { rerender } = render(<Probe flag />);
      act(() => { vi.advanceTimersByTime(160); });
      expect(screen.getByTestId('p').textContent).toBe('true');
      rerender(<Probe flag={false} />);
      expect(screen.getByTestId('p').textContent).toBe('false');
    });
  });
});

describe('EmptyCanvasState', () => {
  it('gives editors one-click ways to start', () => {
    const openPanel = vi.fn();
    const addElement = vi.fn();
    window.addEventListener('workspace-open-panel', openPanel);
    document.addEventListener('elementDoubleClick', addElement);

    render(<EmptyCanvasState canEdit />);
    fireEvent.click(screen.getByText('Browse elements'));
    fireEvent.click(screen.getByText('Start from a template'));
    expect(openPanel.mock.calls.map((c) => c[0].detail.tab)).toEqual(['elements', 'template-library']);

    fireEvent.click(screen.getByText('Add a text box'));
    fireEvent.click(screen.getByText('Add a heading'));
    expect(addElement.mock.calls[0][0].detail.type).toBe('textbox');
    expect(addElement.mock.calls[1][0].detail.nodeType).toBe('blockNode');
    expect(addElement.mock.calls[1][0].detail.data.kind).toBe('heading');

    window.removeEventListener('workspace-open-panel', openPanel);
    document.removeEventListener('elementDoubleClick', addElement);
  });

  it('offers nothing to click for view-only people', () => {
    render(<EmptyCanvasState canEdit={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/nothing on this canvas yet/i)).toBeTruthy();
  });
});

describe('ClientViewBar', () => {
  it('shows the title and exits from the button', () => {
    const onExit = vi.fn();
    render(<ClientViewBar title="Villa fit-out" onExit={onExit} />);
    expect(screen.getByText('Villa fit-out')).toBeTruthy();
    expect(screen.getByText('Client view')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /exit client view/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('Esc exits and is kept from the page-level Esc handler (which closes the window)', () => {
    const onExit = vi.fn();
    const pageHandler = vi.fn();
    window.addEventListener('keydown', pageHandler); // bubble phase, like the page's own listener
    render(<ClientViewBar title="x" onExit={onExit} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(pageHandler).not.toHaveBeenCalled();
    window.removeEventListener('keydown', pageHandler);
  });

  it('leaves Esc alone while typing in a field', () => {
    const onExit = vi.fn();
    render(<><input aria-label="note" /><ClientViewBar title="x" onExit={onExit} /></>);
    fireEvent.keyDown(screen.getByLabelText('note'), { key: 'Escape' });
    expect(onExit).not.toHaveBeenCalled();
  });
});
