/**
 * Harness probe — proves the whole pipeline works before real suites are added:
 * Vite JSX transform → jsdom environment → React Testing Library render.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

const Probe = () => <div>harness-ok</div>;

describe('test harness', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('renders JSX with React Testing Library', () => {
    render(<Probe />);
    expect(screen.getByText('harness-ok')).toBeTruthy();
  });
});
