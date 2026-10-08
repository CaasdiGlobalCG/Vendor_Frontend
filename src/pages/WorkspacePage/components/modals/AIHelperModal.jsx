import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, FileText, ArrowRight, Workflow, Loader2, X, Copy, Check, ScanSearch, MessageCircleQuestion, StickyNote, Clock } from 'lucide-react';

const ActionButton = ({ icon, label, description, onClick, active, loading, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
      active
        ? 'bg-surface-hover border border-line'
        : 'bg-surface border border-line hover:border-line hover:bg-cta'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className={`flex items-center justify-center w-8 h-8 rounded-md ${active ? 'bg-cta text-cta-foreground' : 'bg-surface-hover text-ink'}`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    </div>
    <div className="min-w-0">
      <span className="text-sm font-medium text-ink block">{label}</span>
      <span className="text-xs text-dim block truncate">{description}</span>
    </div>
  </button>
);

const Chip = ({ label, value }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-line text-[10px] text-ink">
    <span className="text-dim">{label}</span> {value}
  </span>
);

const ExtractBlock = ({ data }) => {
  if (!data) return null;
  const groups = [
    ['Dates', data.dates],
    ['People', data.people],
    ['Amounts', data.amounts],
    ['Action items', data.actionItems],
  ].filter(([, list]) => Array.isArray(list) && list.length);
  if (!groups.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {groups.map(([label, list]) => (
        <div key={label}>
          <div className="text-[10px] uppercase tracking-wide text-dim mb-1">{label}</div>
          <div className="flex flex-wrap gap-1">
            {list.slice(0, 8).map((v, i) => <Chip key={`${label}-${i}`} label={label} value={v} />)}
          </div>
        </div>
      ))}
    </div>
  );
};

const AIHelperModal = ({
  isOpen,
  onClose,
  prompt,
  setPrompt,
  activeAction,
  loading,
  error,
  result,
  isFallback,
  history = [],
  onShowResult,
  copied,
  onRunAction,
  onCopy,
  onSaveAsNote,
  onOpenBuilder,
}) => {
  if (!isOpen) return null;

  // Portal to body — the node's fixed positioning is inside a transformed
  // React Flow container, which clips fixed elements to the node bounds.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-black">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">AI Helper</h3>
              <p className="text-xs text-dim">Summarize, extract, ask, and build canvas flows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dim hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          <div className="space-y-2">
            <ActionButton
              icon={<FileText className="w-4 h-4" />}
              label="Summarize Section"
              description="Summarize what's on this canvas"
              onClick={() => onRunAction('summarize')}
              active={activeAction === 'summarize'}
              loading={loading && activeAction === 'summarize'}
            />
            <ActionButton
              icon={<ScanSearch className="w-4 h-4" />}
              label="Extract Key Info"
              description="Dates, people, amounts, action items"
              onClick={() => onRunAction('extract')}
              active={activeAction === 'extract'}
              loading={loading && activeAction === 'extract'}
            />
            <ActionButton
              icon={<ArrowRight className="w-4 h-4" />}
              label="Suggest Next Steps"
              description="Recommend what should come next"
              onClick={() => onRunAction('suggest')}
              active={activeAction === 'suggest'}
              loading={loading && activeAction === 'suggest'}
            />
            <ActionButton
              icon={<MessageCircleQuestion className="w-4 h-4" />}
              label="Ask the Canvas"
              description="Free-form question about this workspace"
              onClick={() => onRunAction('ask')}
              active={activeAction === 'ask'}
              loading={loading && activeAction === 'ask'}
              disabled={!prompt.trim()}
            />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a question about this canvas — e.g. what approvals are still pending?"
              className="w-full px-3 py-2 text-xs bg-surface border border-line rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ink"
              rows={4}
              onKeyDown={(e) => e.stopPropagation()}
            />

            <button
              onClick={onOpenBuilder}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-ink bg-surface-hover border border-line hover:border-ink transition-colors"
            >
              <Workflow className="w-3.5 h-3.5" />
              Generate a flow — opens AI Builder
            </button>
          </div>

          <div className="border border-line rounded-lg bg-canvas min-h-[280px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-surface">
              <span className="text-xs font-semibold text-ink">
                Result
                {result && isFallback && (
                  <span className="ml-1.5 text-[10px] font-normal text-warn">AI unavailable — basic mode</span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                {result?.text && (
                  <>
                    <button
                      onClick={onCopy}
                      className="p-1 rounded text-dim hover:text-ink hover:bg-surface-hover"
                      title="Copy result"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={onSaveAsNote}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-ink bg-surface-hover hover:bg-surface-hover"
                      title="Create a Smart Note from this result"
                    >
                      <StickyNote className="w-3 h-3" />
                      Save as Note
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 text-xs text-ink leading-relaxed flex-1 max-h-[280px] overflow-y-auto whitespace-pre-wrap">
              {!loading && !error && !result && (
                <p className="text-dim">Run an AI action to see output here.</p>
              )}
              {error && (
                <div className="px-2.5 py-2 bg-danger/10 border border-danger/20 rounded text-danger">{error}</div>
              )}
              {loading && (
                <div className="flex items-center gap-2 text-dim">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </div>
              )}
              {!loading && result?.text && <p>{result.text}</p>}
              {!loading && result?.action === 'extract' && <ExtractBlock data={result.data} />}
            </div>

            {history.length > 0 && (
              <div className="border-t border-line px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-dim mb-1.5">
                  <Clock className="w-3 h-3" /> Recent
                </div>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <button
                      key={`hist-${i}`}
                      onClick={() => onShowResult(h)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-surface-hover text-[11px] text-ink truncate"
                    >
                      <span className="text-dim mr-1.5">{h.action}</span>
                      {(h.text || '').split('\n')[0].slice(0, 60)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AIHelperModal;
