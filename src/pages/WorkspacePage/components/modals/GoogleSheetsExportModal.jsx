import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, FileSpreadsheet, FileDown, Download, X } from 'lucide-react';

/**
 * GoogleSheetsExportModal — shown after "Export to Google Sheets".
 *
 * Why it exists: Google Sheets has no unauthenticated "import via URL"
 * endpoint, so the export copies the table as TSV to the clipboard and
 * opens a blank sheet — the user must paste (Ctrl/Cmd+V). A transient toast
 * was too easy to miss, so this dialog stays up until dismissed and offers
 * CSV/Excel downloads as a no-paste alternative.
 *
 * Props:
 *  - open      — boolean
 *  - copied    — whether the TSV actually reached the clipboard
 *  - onClose   — dismiss
 *  - onCsv     — download CSV instead
 *  - onExcel   — download Excel instead
 */
const GoogleSheetsExportModal = ({ open, copied, onClose, onCsv, onExcel }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[11000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl shadow-2xl border border-line w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Export to Google Sheets"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold text-ink">Export to Google Sheets</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-dim"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          {copied ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <p className="text-sm font-medium text-ink">Table copied to your clipboard</p>
              </div>
              <ol className="space-y-1.5 text-xs text-dim list-decimal list-inside">
                <li>A blank Google Sheet opened in a new tab</li>
                <li>Click cell <span className="font-semibold text-ink">A1</span> in that sheet</li>
                <li>
                  Press{' '}
                  <kbd className="px-1.5 py-0.5 rounded border border-line bg-canvas font-mono text-[10px] text-ink">
                    {navigator.platform?.startsWith('Mac') ? '⌘V' : 'Ctrl+V'}
                  </kbd>{' '}
                  to paste the table
                </li>
              </ol>
            </>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-dim leading-relaxed">
                The table couldn't be copied automatically (browser blocked
                clipboard access). Download it as a file instead — Google Sheets
                can open CSV and Excel files via{' '}
                <span className="font-medium text-ink">File → Import → Upload</span>.
              </p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={onCsv}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-line rounded-lg text-xs font-medium text-ink hover:bg-surface-hover transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={onExcel}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-line rounded-lg text-xs font-medium text-ink hover:bg-surface-hover transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full px-3 py-2 bg-cta text-cta-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            {copied ? 'Got it' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsExportModal;
