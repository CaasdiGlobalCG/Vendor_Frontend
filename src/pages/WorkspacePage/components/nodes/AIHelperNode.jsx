import React, { useState, useCallback, useContext, memo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import AIHelperModal from '../modals/AIHelperModal';

/**
 * AIHelperNode — AI-powered canvas assistant:
 *   1) Summarize section — real summary of this canvas's elements
 *   2) Extract key info — dates / people / amounts / action items as chips
 *   3) Suggest next steps — grounded in what's actually on the canvas
 *   4) Ask the canvas — free-form Q&A about canvas contents
 *   5) Generate flow → hands off to the full AI Canvas Builder (TopBar modal)
 *
 * Calls POST /api/workspace/ai/assist with auth. Falls back to local
 * heuristics on failure, flagged via result.fallback. Last result + a short
 * history persist on the node so collaborators/reloads see them.
 */
const AIHelperNode = memo(({ id, data, isConnectable, selected }) => {
  const { setNodes } = useReactFlow();
  const { currentUser } = useContext(VendorContext);
  const workspaceId = data.workspaceId;
  const [activeAction, setActiveAction] = useState(null); // 'summarize' | 'extract' | 'suggest' | 'ask'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(data.aiResult || null);
  const [history, setHistory] = useState(data.aiHistory || []);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFallback, setIsFallback] = useState(data.aiResult?.fallback || false);

  const getToken = async () => {
    try {
      const { Auth } = await import('aws-amplify');
      const session = await Auth.currentSession();
      return session.getIdToken().getJwtToken();
    } catch {
      return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    }
  };

  // Collect neighbor context from the canvas via custom event
  const gatherContext = useCallback(() => {
    return new Promise((resolve) => {
      const handler = (e) => {
        document.removeEventListener('aiContextResponse', handler);
        resolve(e.detail);
      };
      document.addEventListener('aiContextResponse', handler);
      document.dispatchEvent(new CustomEvent('aiContextRequest', { detail: { nodeId: id } }));
      setTimeout(() => {
        document.removeEventListener('aiContextResponse', handler);
        resolve({ nodes: [], edges: [] });
      }, 500);
    });
  }, [id]);

  // Serialize each node into a compact descriptive line so the AI has real
  // content to reason over — not just names/types.
  const describeNode = (n) => {
    const d = n.data || {};
    const kind = d.nodeType || n.type || d.type || 'element';
    const bits = [kind];
    if (d.label) bits.push(`"${d.label}"`);
    if (d.name) bits.push(`name="${d.name}"`);
    if (d.content) bits.push(`note="${String(d.content).slice(0, 150)}"`);
    if (d.taskCardData?.title) {
      bits.push(`task="${d.taskCardData.title}"`);
      if (d.taskCardData.status || d.taskCardData.column) bits.push(`status=${d.taskCardData.status || d.taskCardData.column}`);
      if (d.taskCardData.dueDate) bits.push(`due=${d.taskCardData.dueDate}`);
      if (d.taskCardData.assignee) bits.push(`assignee=${d.taskCardData.assignee}`);
    }
    if (d.event?.title) {
      bits.push(`event="${d.event.title}"`);
      if (d.event.startIso) bits.push(`starts=${d.event.startIso.slice(0, 10)}`);
    }
    if (Array.isArray(d.items)) bits.push(`items=${d.items.length}`);
    if (d.deadline) bits.push(`deadline=${String(d.deadline).slice(0, 10)}`);
    return bits.join(' ');
  };

  const runAction = useCallback(async (action) => {
    if (action === 'ask' && !prompt.trim()) return;
    setActiveAction(action);
    setLoading(true);
    setError(null);

    try {
      const context = await gatherContext();
      const nodeLines = (context.nodes || [])
        .filter((n) => n.id !== id)
        .map(describeNode);
      const canvasText = nodeLines.length
        ? `Canvas elements (${nodeLines.length}):\n- ${nodeLines.join('\n- ')}\nConnections: ${(context.edges || []).length}`
        : 'The canvas is empty.';

      const body = {
        action,
        workspaceId,
        context: {
          nodeNames: context.nodes?.map(n => n.data?.name || n.type).filter(Boolean) || [],
          nodeTypes: context.nodes?.map(n => n.data?.type || n.type).filter(Boolean) || [],
          nodeDetails: nodeLines,
          edgeCount: context.edges?.length || 0,
          taskName: data.taskName || '',
          subtaskName: data.subtaskName || '',
        },
        prompt: action === 'summarize' || action === 'extract'
          ? canvasText
          : action === 'ask'
            ? `${canvasText}\n\nQuestion: ${prompt.trim()}`
            : prompt || undefined,
      };

      let aiResult;
      let usedFallback = false;
      try {
        const token = await getToken();
        const response = await fetch('/api/workspace/ai/assist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json.success) {
          throw new Error(json.message || `AI request failed (${response.status})`);
        }
        aiResult = { text: json.text, data: json.data, action };
      } catch {
        aiResult = localFallback(action, body.context, prompt);
        aiResult.action = action;
        usedFallback = true;
      }

      setResult(aiResult);
      setIsFallback(usedFallback);
      const entry = { ...aiResult, fallback: usedFallback, at: new Date().toISOString() };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 3);
        return next;
      });
      // Persist latest result + history so collaborators/reloads see it
      if (workspaceId) {
        persistNodeDataPatch(id, {
          aiResult: entry,
          aiHistory: [entry, ...history].slice(0, 3),
        }, setNodes, workspaceId).catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [gatherContext, workspaceId, data.taskName, data.subtaskName, prompt, history, id, setNodes]);

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
    setIsModalOpen(false);
  };

  return (
    <div className={`bg-gradient-to-br from-black to-black rounded-xl border-2 shadow-lg transition-all duration-200 min-w-[280px] max-w-[340px] ${
      selected ? 'border-line shadow-purple-200/50' : 'border-line'
    }`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-cta !w-2.5 !h-2.5 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-cta !w-2.5 !h-2.5 !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-ink">AI Helper</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-ink hover:text-ink rounded">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg text-white bg-black hover:from-black hover:to-black transition-colors"
          >
            Open AI Actions
          </button>
          {result?.text && (
            <div className="bg-surface border border-line rounded-lg px-2.5 py-2 text-xs text-ink">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ink">
                  Latest Result
                  {isFallback && <span className="ml-1.5 text-[10px] text-dim font-normal">(basic mode)</span>}
                </span>
                <button onClick={handleCopy} className="p-0.5 text-ink hover:text-ink rounded transition-colors" title="Copy">
                  {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap">{result.text}</p>
            </div>
          )}
        </div>
      )}

      <AIHelperModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        prompt={prompt}
        setPrompt={setPrompt}
        activeAction={activeAction}
        loading={loading}
        error={error}
        result={result}
        isFallback={isFallback}
        history={history}
        onShowResult={(entry) => { setResult(entry); setIsFallback(!!entry.fallback); }}
        copied={copied}
        onRunAction={runAction}
        onCopy={handleCopy}
        onSaveAsNote={handleSaveAsNote}
        onOpenBuilder={handleOpenBuilder}
      />
    </div>
  );
});

AIHelperNode.displayName = 'AIHelperNode';

/**
 * Local fallback when the AI endpoint is unavailable — heuristic summaries
 * from canvas context. Clearly flagged via the caller as basic mode.
 */
function localFallback(action, context, prompt) {
  const { nodeNames, nodeTypes, edgeCount, taskName, subtaskName } = context;
  const count = nodeNames.length;

  switch (action) {
    case 'summarize': {
      if (count === 0) return { text: 'This canvas is empty. Start by adding elements from the Elements panel.' };
      const types = [...new Set(nodeTypes)];
      return {
        text: `This canvas contains ${count} element${count > 1 ? 's' : ''} (${types.join(', ')}) with ${edgeCount} connection${edgeCount !== 1 ? 's' : ''}. ${
          taskName ? `Part of task "${taskName}"${subtaskName ? ` > "${subtaskName}"` : ''}.` : ''
        } Elements include: ${nodeNames.slice(0, 8).join(', ')}${count > 8 ? ` and ${count - 8} more` : ''}.`
      };
    }

    case 'extract': {
      if (count === 0) return { text: 'Nothing to extract — the canvas is empty.' };
      return {
        text: `Elements found: ${nodeNames.join(', ') || 'none'}`,
        data: { dates: [], people: [], amounts: [], actionItems: [] },
      };
    }

    case 'suggest':
    case 'ask': {
      if (count === 0) return { text: 'Start by adding a Form or Table element to collect project data.' };
      const suggestions = [];
      if (!nodeTypes.includes('form')) suggestions.push('Add a Form element to capture input data.');
      if (!nodeTypes.includes('table')) suggestions.push('Add a Table to organize collected information.');
      if (!nodeTypes.includes('chart')) suggestions.push('Consider a Chart to visualize progress or data.');
      if (edgeCount < count - 1) suggestions.push('Connect your elements to show the flow between steps.');
      if (nodeTypes.includes('form') && !nodeTypes.includes('approvalBoard')) suggestions.push('Add an Approval Board for review workflows.');
      if (suggestions.length === 0) suggestions.push('Your flow looks comprehensive! Consider adding annotations for clarity.');
      return { text: 'Suggested next steps:\n\n' + suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') };
    }

    default:
      return { text: 'Unknown action.' };
  }
}

export default AIHelperNode;
