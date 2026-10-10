/**
 * GoogleSheetsExportModal + aoaToCSV — the Google Sheets export UX.
 *
 * The Sheets export copies TSV to the clipboard (Sheets has no
 * unauthenticated push API), so the modal exists to make the mandatory
 * paste step unmissable and to offer CSV/Excel fallbacks.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import GoogleSheetsExportModal from '../src/pages/WorkspacePage/components/modals/GoogleSheetsExportModal.jsx';
import { aoaToCSV } from '../src/pages/WorkspacePage/utils/csvExport.js';

afterEach(cleanup);

describe('aoaToCSV', () => {
  it('joins headers and rows with commas and CRLF', () => {
    const aoa = [['Name', 'Qty'], ['Cement', 10], ['Bricks', 20]];
    expect(aoaToCSV(aoa)).toBe('Name,Qty\r\nCement,10\r\nBricks,20');
  });

  it('escapes cells containing commas, quotes and newlines', () => {
    const aoa = [['Note'], ['a,b'], ['say "hi"'], ['line1\nline2']];
    expect(aoaToCSV(aoa)).toBe('Note\r\n"a,b"\r\n"say ""hi"""\r\n"line1\nline2"');
  });

  it('handles empty/null input gracefully', () => {
    expect(aoaToCSV(null)).toBe('');
    expect(aoaToCSV([])).toBe('');
  });
});

describe('GoogleSheetsExportModal', () => {
  const base = { open: true, copied: true, onClose: vi.fn(), onCsv: vi.fn(), onExcel: vi.fn() };

  it('renders nothing when closed', () => {
    const { container } = render(<GoogleSheetsExportModal {...base} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the paste instructions when the copy succeeded', () => {
    render(<GoogleSheetsExportModal {...base} />);
    expect(screen.getByText(/copied to your clipboard/i)).toBeTruthy();
    expect(screen.getByText('A1')).toBeTruthy();
    expect(screen.getByText('Got it')).toBeTruthy();
  });

  it('shows the failure guidance when the copy failed', () => {
    render(<GoogleSheetsExportModal {...base} copied={false} />);
    expect(screen.getByText(/couldn't be copied/i)).toBeTruthy();
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('fires the CSV and Excel fallback handlers', () => {
    const onCsv = vi.fn();
    const onExcel = vi.fn();
    render(<GoogleSheetsExportModal {...base} onCsv={onCsv} onExcel={onExcel} />);
    fireEvent.click(screen.getByText('CSV'));
    expect(onCsv).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Excel (.xlsx)'));
    expect(onExcel).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and on the X button', () => {
    const onClose = vi.fn();
    render(<GoogleSheetsExportModal {...base} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
