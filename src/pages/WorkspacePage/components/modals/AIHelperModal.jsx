import React from 'react';
import { Sparkles, FileText, ArrowRight, Workflow, Loader2, X, Copy, Check } from 'lucide-react';

const ActionButton = ({ icon, label, description, onClick, active, loading, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
      active
        ? 'bg-purple-100 border border-purple-300'
        : 'bg-white border border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className={`flex items-center justify-center w-8 h-8 rounded-md ${active ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600'}`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    </div>
    <div className="min-w-0">
      <span className="text-sm font-medium text-gray-800 block">{label}</span>
      <span className="text-xs text-gray-500 block truncate">{description}</span>
    </div>
  </button>
);

const AIHelperModal = ({
  isOpen,
  onClose,
  prompt,
  setPrompt,
  activeAction,
  loading,
  error,
  result,
  copied,
  onRunAction,
  onCopy,
  onApplyFlow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Helper</h3>
              <p className="text-xs text-gray-500">Summarize, suggest, and generate canvas flows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          <div className="space-y-2">
            <ActionButton
              icon={<FileText className="w-4 h-4" />}
              label="Summarize Section"
              description="Describe what exists in this workspace area"
              onClick={() => onRunAction('summarize')}
              active={activeAction === 'summarize'}
              loading={loading && activeAction === 'summarize'}
            />
            <ActionButton
              icon={<ArrowRight className="w-4 h-4" />}
              label="Suggest Next Step"
              description="Recommend what should come next"
              onClick={() => onRunAction('suggest')}
              active={activeAction === 'suggest'}
              loading={loading && activeAction === 'suggest'}
            />
            <ActionButton
              icon={<Workflow className="w-4 h-4" />}
              label="Generate Flow From Prompt"
              description="Create nodes from your text instruction"
              onClick={() => prompt.trim() && onRunAction('generate')}
              active={activeAction === 'generate'}
              loading={loading && activeAction === 'generate'}
              disabled={!prompt.trim()}
            />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a 5-step purchase approval process from request to closure..."
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              rows={4}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          <div className="border border-gray-200 rounded-lg bg-gray-50 min-h-[280px] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-700">Result</span>
              <div className="flex items-center gap-1.5">
                {result?.text && (
                  <button
                    onClick={onCopy}
                    className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    title="Copy result"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                {result?.nodes?.length > 0 && (
                  <button
                    onClick={onApplyFlow}
                    className="px-2 py-1 rounded text-[11px] font-medium text-purple-700 bg-purple-100 hover:bg-purple-200"
                  >
                    Apply Flow
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 text-xs text-gray-700 leading-relaxed max-h-[320px] overflow-y-auto whitespace-pre-wrap">
              {!loading && !error && !result && (
                <p className="text-gray-400">Run an AI action to see output here.</p>
              )}
              {error && (
                <div className="px-2.5 py-2 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
              )}
              {loading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </div>
              )}
              {result?.text && <p>{result.text}</p>}
              {result?.nodes?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {result.nodes.map((node, idx) => (
                    <div key={`generated-node-${idx}`} className="px-2 py-1 rounded bg-white border border-purple-100 text-[11px]">
                      {idx + 1}. {node.name || node.type}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHelperModal;
