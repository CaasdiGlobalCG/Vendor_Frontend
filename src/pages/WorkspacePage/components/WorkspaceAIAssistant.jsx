import React, { useState, useCallback } from 'react';
import AIHelperModal from './modals/AIHelperModal';
import { runAIAssist } from '../utils/aiAssist';

/**
 * WorkspaceAIAssistant — the top-bar AI entry point. Hosts AIHelperModal with
 * canvas-aware actions (summarize / extract / suggest / ask). Mounted once by
 * WorkspacePage; opened via the 'openAIAssistant' document event or the
 * onOpenAIAssistant TopBar button.
 */
const WorkspaceAIAssistant = ({ workspaceId, taskName, subtaskName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Opened from the TopBar button (and anything else that dispatches this)
  React.useEffect(() => {
    const open = () => setIsOpen(true);
    document.addEventListener('openAIAssistant', open);
    return () => document.removeEventListener('openAIAssistant', open);
  }, []);

  const runAction = useCallback(async (action) => {
    if (action === 'ask' && !prompt.trim()) return;
    setActiveAction(action);
    setLoading(true);
    setError(null);
    try {
      const aiResult = await runAIAssist({
        action,
        prompt,
        workspaceId,
        taskName,
        subtaskName,
      });
      setResult(aiResult);
      setHistory((prev) => [
        { ...aiResult, at: new Date().toISOString() },
        ...prev,
      ].slice(0, 3));
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [prompt, workspaceId, taskName, subtaskName]);

  const handleCopy = () => {
    const text = result?.text || '';
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Turn an AI result into a real Smart Note on the canvas
  const handleSaveAsNote = () => {
    const text = result?.text || '';
    if (!text) return;
    document.dispatchEvent(new CustomEvent('addElementToCanvas', {
      detail: {
        type: 'smart-note',
        nodeType: 'smartNote',
        name: 'AI Result',
        content: text,
      },
    }));
  };

  const handleOpenBuilder = () => {
    document.dispatchEvent(new CustomEvent('openAICanvasBuilder'));
    setIsOpen(false);
  };

  return (
    <AIHelperModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      prompt={prompt}
      setPrompt={setPrompt}
      activeAction={activeAction}
      loading={loading}
      error={error}
      result={result}
      isFallback={!!result?.fallback}
      history={history}
      onShowResult={(entry) => setResult(entry)}
      copied={copied}
      onRunAction={runAction}
      onCopy={handleCopy}
      onSaveAsNote={handleSaveAsNote}
      onOpenBuilder={handleOpenBuilder}
    />
  );
};

export default WorkspaceAIAssistant;
