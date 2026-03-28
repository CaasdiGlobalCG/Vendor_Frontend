import React, { useState, useCallback, useContext, memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import AIHelperModal from '../modals/AIHelperModal';

/**
 * AIHelperNode — A special canvas node that provides AI-powered actions:
 *   1) Summarize section — summarizes surrounding nodes on the canvas
 *   2) Suggest next step — recommends what to add next based on flow context
 *   3) Auto-generate flow — builds a set of nodes from a text prompt
 *
 * The node calls a backend endpoint POST /api/workspace/ai/assist
 * with { action, context, prompt, workspaceId }.
 * If the endpoint is unavailable, it falls back to a local heuristic.
 */
const AIHelperNode = memo(({ id, data, isConnectable, selected }) => {
  const { currentUser } = useContext(VendorContext);
  const [activeAction, setActiveAction] = useState(null); // 'summarize' | 'suggest' | 'generate'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Collect neighbor context from the canvas via custom event
  const gatherContext = useCallback(() => {
    return new Promise((resolve) => {
      const handler = (e) => {
        document.removeEventListener('aiContextResponse', handler);
        resolve(e.detail);
      };
      document.addEventListener('aiContextResponse', handler);
      document.dispatchEvent(new CustomEvent('aiContextRequest', { detail: { nodeId: id } }));
      // Timeout fallback
      setTimeout(() => {
        document.removeEventListener('aiContextResponse', handler);
        resolve({ nodes: [], edges: [] });
      }, 500);
    });
  }, [id]);

  const runAction = useCallback(async (action) => {
    setActiveAction(action);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const context = await gatherContext();

      // Build request
      const body = {
        action,
        workspaceId: data.workspaceId,
        context: {
          nodeNames: context.nodes?.map(n => n.data?.name || n.type).filter(Boolean) || [],
          nodeTypes: context.nodes?.map(n => n.data?.type || n.type).filter(Boolean) || [],
          edgeCount: context.edges?.length || 0,
          taskName: data.taskName || '',
          subtaskName: data.subtaskName || '',
        },
        prompt: action === 'generate' ? prompt : undefined,
      };

      // Try backend AI endpoint
      let aiResult;
      try {
        const response = await fetch('/api/workspace/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (response.ok) {
          aiResult = await response.json();
        } else {
          throw new Error('Backend unavailable');
        }
      } catch {
        // Fallback to local heuristic
        aiResult = localFallback(action, body.context, prompt);
      }

      setResult(aiResult);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [gatherContext, data.workspaceId, data.taskName, data.subtaskName, prompt]);

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyFlow = () => {
    if (result?.nodes) {
      document.dispatchEvent(new CustomEvent('aiGenerateNodes', {
        detail: { nodes: result.nodes, sourceNodeId: id }
      }));
    }
  };

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 shadow-lg transition-all duration-200 min-w-[280px] max-w-[340px] ${
      selected ? 'border-purple-400 shadow-purple-200/50' : 'border-purple-200'
    }`}>
      {/* Handles */}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-purple-400 !w-2.5 !h-2.5 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-purple-400 !w-2.5 !h-2.5 !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-purple-200/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-purple-900">AI Helper</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-purple-400 hover:text-purple-600 rounded">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-colors"
          >
            Open AI Actions
          </button>
          {result?.text && (
            <div className="bg-white border border-purple-200 rounded-lg px-2.5 py-2 text-xs text-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-purple-600">Latest Result</span>
                <button onClick={handleCopy} className="p-0.5 text-purple-400 hover:text-purple-600 rounded transition-colors" title="Copy">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
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
        copied={copied}
        onRunAction={runAction}
        onCopy={handleCopy}
        onApplyFlow={handleApplyFlow}
      />
    </div>
  );
});

AIHelperNode.displayName = 'AIHelperNode';

/**
 * Local fallback when backend AI endpoint is unavailable.
 * Provides heuristic-based suggestions from canvas context.
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

    case 'suggest': {
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

    case 'generate': {
      if (!prompt.trim()) return { text: 'Please provide a description of the flow you want to create.' };
      // Simple keyword-based node generation
      const steps = prompt.split(/then|next|and|,|\.|\n/).map(s => s.trim()).filter(Boolean);
      const nodes = steps.slice(0, 6).map((step, i) => ({
        name: step.charAt(0).toUpperCase() + step.slice(1),
        type: guessNodeType(step),
      }));
      return {
        text: `Generated ${nodes.length} element${nodes.length > 1 ? 's' : ''} from your prompt. Click "Apply" to add them to the canvas.`,
        nodes,
      };
    }

    default:
      return { text: 'Unknown action.' };
  }
}

function guessNodeType(text) {
  const lower = text.toLowerCase();
  if (/form|input|submit|enter|fill/i.test(lower)) return 'form';
  if (/table|list|data|sheet/i.test(lower)) return 'table';
  if (/chart|graph|visual|plot/i.test(lower)) return 'chart';
  if (/approv|review|check|sign/i.test(lower)) return 'approvalBoard';
  if (/upload|file|document|attach/i.test(lower)) return 'uploads';
  if (/note|comment|text|label/i.test(lower)) return 'smartNote';
  if (/calendar|schedule|date|timeline/i.test(lower)) return 'calendarNode';
  return 'textbox';
}

export default AIHelperNode;
