import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Wand2, Loader2, AlertTriangle } from 'lucide-react';
import config from '../../../../config/env';

const apiFetch = (path, options = {}) => {
  const token = localStorage.getItem('authToken') || '';
  return fetch(`${config.VENDOR_BACKEND_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
};

const EXAMPLE_PROMPTS = [
  'Vendor submits a quotation, PM reviews it, approves, then generates an invoice',
  'Approval workflow: task card → approval board → calendar deadline → smart note',
  'BOQ workspace: materials list → BOQ generator → quotation → purchase order',
  'Form intake: dropdown selects a service → form template → invoice',
];

/**
 * AICanvasBuilderModal — describe a workflow, preview the AI-generated
 * node/edge spec, then apply it to the canvas (dispatches 'aiGenerateFlow').
 */
const AICanvasBuilderModal = ({ isOpen, onClose, canvasElements = [] }) => {
  const [stage, setStage] = useState('prompt'); // prompt | generating | error
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  // Reset when reopened
  useEffect(() => {
    if (isOpen) {
      setStage('prompt');
      setError('');
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && stage !== 'generating') onClose();
    },
    [stage, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const generate = async () => {
    const clean = prompt.trim();
    if (!clean) return;
    setStage('generating');
    setError('');

    try {
      const res = await apiFetch('/api/ai/canvas-builder', {
        method: 'POST',
        body: JSON.stringify({
          prompt: clean,
          context: {
            nodeNames: (canvasElements || []).map((n) => n?.data?.name).filter(Boolean).slice(0, 30),
            edgeCount: 0,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || `Request failed (${res.status})`);
      }
      const spec = body.data?.spec;
      if (!spec?.nodes?.length) {
        throw new Error('AI returned no elements — try rephrasing your description');
      }
      // Apply iteratively on the canvas, then the user accepts/rejects there
      document.dispatchEvent(new CustomEvent('aiGenerateFlow', { detail: { spec } }));
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setStage('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cta rounded-xl">
              <Sparkles className="w-4 h-4 text-cta-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Atlas</h2>
              <p className="text-xs text-dim">AI canvas agent — describe what you're working on and Atlas builds it</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={stage === 'generating'}
            className="p-1.5 hover:bg-white/70 rounded-lg transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {(stage === 'prompt' || stage === 'generating') && (
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                What are you working on?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Vendor submits quotation → PM reviews → approves → invoice is generated…"
                rows={4}
                disabled={stage === 'generating'}
                className="w-full px-3.5 py-3 text-sm border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-ink focus:border-line resize-none disabled:bg-canvas"
                autoFocus
              />

              <div className="mt-3">
                <div className="text-[11px] font-semibold text-dim uppercase tracking-wide mb-1.5">
                  Try an example
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      disabled={stage === 'generating'}
                      className="text-[11px] text-dim bg-surface-hover hover:bg-surface-hover hover:text-ink rounded-full px-3 py-1.5 transition-colors text-left"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {stage === 'generating' && (
                <div className="mt-5 flex items-center gap-2.5 text-sm text-ink">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI is designing your canvas…</span>
                </div>
              )}
            </div>
          )}

          {stage === 'error' && (
            <div className="text-center py-8">
              <div className="inline-flex p-3 bg-danger/10 rounded-full mb-3">
                <AlertTriangle className="w-6 h-6 text-danger" />
              </div>
              <p className="text-sm text-ink font-medium">Generation failed</p>
              <p className="text-xs text-dim mt-1 max-w-md mx-auto">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex items-center justify-end bg-canvas">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={stage === 'generating'}
              className="px-4 py-2 text-sm font-medium text-dim hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            {stage === 'prompt' && (
              <button
                onClick={generate}
                disabled={!prompt.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cta-foreground bg-cta hover:bg-cta rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Wand2 className="w-4 h-4" />
                Generate
              </button>
            )}
            {stage === 'error' && (
              <button
                onClick={() => setStage('prompt')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cta-foreground bg-cta hover:bg-cta rounded-lg transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICanvasBuilderModal;
