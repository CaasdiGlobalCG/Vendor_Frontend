/**
 * Workspace dark mode: the top-bar toggle, the theme hook, and a guard
 * against the "solid blue hover hides the label" mistake in the side panel.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

import WorkspaceThemeToggle from '../src/pages/WorkspacePage/components/WorkspaceThemeToggle.jsx';
import { useIsDarkMode } from '../src/pages/WorkspacePage/hooks/useIsDarkMode.js';
import { applyTheme } from '../src/components/ui/theme.js';

beforeEach(() => {
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});
afterEach(cleanup);

const isDark = () => document.documentElement.classList.contains('dark');

describe('WorkspaceThemeToggle', () => {
  it('starts in light mode and offers dark', () => {
    render(<WorkspaceThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('switches to dark, flips the label, and saves the choice', async () => {
    render(<WorkspaceThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(isDark()).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    const btn = await screen.findByRole('button', { name: 'Switch to light mode' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches back to light', async () => {
    render(<WorkspaceThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Switch to light mode' }));
    expect(isDark()).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('picks up a theme that was already dark when it mounted', () => {
    document.documentElement.classList.add('dark');
    render(<WorkspaceThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
  });

  it('stays in sync when the theme is changed from somewhere else', async () => {
    render(<WorkspaceThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeTruthy();
    act(() => { applyTheme('dark'); }); // e.g. the dashboard header's toggle
    expect(await screen.findByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
  });
});

describe('useIsDarkMode', () => {
  const Probe = () => <span data-testid="p">{useIsDarkMode() ? 'dark' : 'light'}</span>;

  it('follows the .dark class on <html>', async () => {
    render(<Probe />);
    expect(screen.getByTestId('p').textContent).toBe('light');
    act(() => { document.documentElement.classList.add('dark'); });
    await waitFor(() => expect(screen.getByTestId('p').textContent).toBe('dark'));
    act(() => { document.documentElement.classList.remove('dark'); });
    await waitFor(() => expect(screen.getByTestId('p').textContent).toBe('light'));
  });
});

describe('side panel hover states', () => {
  const read = (rel) =>
    fs.readFileSync(path.resolve(__dirname, '../src/pages/WorkspacePage/components', rel), 'utf8');

  // A light card (bg-surface) that turns solid blue on hover, while its label
  // switches to the same blue (or stays dark), makes the text unreadable.
  const classNames = (src) => [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] || m[2]);

  it.each(['WorkspaceContextPanel.jsx', 'ElementsPanel.jsx'])(
    '%s has no light card that turns solid blue on hover',
    (file) => {
      const offenders = classNames(read(file)).filter(
        (c) => /\bbg-surface\b/.test(c) && /\bhover:bg-info(?![/\w-])/.test(c) && !/(^|\s)bg-info(\s|$)/.test(c)
      );
      expect(offenders).toEqual([]);
    }
  );

  it('category rows keep their label readable on hover', () => {
    const rows = classNames(read('WorkspaceContextPanel.jsx')).filter((c) => c.includes('transition-colors text-xs group'));
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((c) => {
      expect(c).toContain('hover:bg-surface-hover');
      expect(c).not.toMatch(/hover:bg-info(?![/\w-])/);
    });
  });
});
