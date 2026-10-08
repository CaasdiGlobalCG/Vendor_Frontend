/**
 * Shared AI-assist plumbing for the workspace.
 * Used by the top-bar AI Assistant (WorkspaceAIAssistant) and the legacy
 * AIHelperNode canvas element — both call POST /api/workspace/ai/assist
 * with the same auth + canvas-context shape.
 */

export const getAIToken = async () => {
  try {
    const { Auth } = await import('aws-amplify');
    const session = await Auth.currentSession();
    return session.getIdToken().getJwtToken();
  } catch {
    return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
  }
};

// Collect canvas nodes/edges via the document-event bridge handled by
// CanvasWorkspace ('aiContextRequest' → 'aiContextResponse').
export const gatherCanvasContext = (nodeId) =>
  new Promise((resolve) => {
    const handler = (e) => {
      document.removeEventListener('aiContextResponse', handler);
      resolve(e.detail);
    };
    document.addEventListener('aiContextResponse', handler);
    document.dispatchEvent(new CustomEvent('aiContextRequest', { detail: { nodeId } }));
    setTimeout(() => {
      document.removeEventListener('aiContextResponse', handler);
      resolve({ nodes: [], edges: [] });
    }, 500);
  });

// Serialize each node into a compact descriptive line so the AI has real
// content to reason over — not just names/types.
export const describeNode = (n) => {
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

// Run one action against the AI endpoint; returns { text, data, action,
// fallback }. Falls back to local heuristics on any failure.
export const runAIAssist = async ({
  action, prompt = '', workspaceId, taskName, subtaskName, excludeNodeId,
}) => {
  const context = await gatherCanvasContext(excludeNodeId);
  const nodeLines = (context.nodes || [])
    .filter((n) => n.id !== excludeNodeId)
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
      taskName: taskName || '',
      subtaskName: subtaskName || '',
    },
    prompt: action === 'summarize' || action === 'extract'
      ? canvasText
      : action === 'ask'
        ? `${canvasText}\n\nQuestion: ${prompt.trim()}`
        : prompt || undefined,
  };

  try {
    const token = await getAIToken();
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
    return { text: json.text, data: json.data, action, fallback: false };
  } catch {
    const fallback = localAIFallback(action, body.context);
    fallback.action = action;
    fallback.fallback = true;
    return fallback;
  }
};

// Heuristic fallbacks when the AI endpoint is unavailable — callers flag
// these via result.fallback so the UI can show "basic mode".
export const localAIFallback = (action, context) => {
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
};
