import React, { useState, useRef, useEffect, useContext } from 'react';
import { persistIsImportant, persistDeadline, persistNodeDataPatch, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { getWorkspaceById, updateWorkspace } from '../../utils/workspaceApi';
import { VendorContext } from '../../../../context/VendorContext';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Maximize2, Minimize2, X, Sparkles, Tag, Clock, Plus } from 'lucide-react';
// Using a simple textarea for now to avoid dependency issues
import Draggable from 'react-draggable';

const SmartNoteNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes } = useReactFlow();
  const { currentUser } = useContext(VendorContext) || {};
  const urlParams = new URLSearchParams(window.location.search);
  const urlUserId =
    urlParams.get('userId') || urlParams.get('clientId') || urlParams.get('pmId');
  const myUserId =
    currentUser?.id || currentUser?.userId || currentUser?.pmId ||
    currentUser?.vendorId || currentUser?.email || urlUserId || null;
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);
  const [content, setContent] = useState(data.content || '');
  const [isMinimized, setIsMinimized] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [aiResult, setAiResult] = useState(null); // { action, text, data }
  const [aiError, setAiError] = useState(null);
  const [tags, setTags] = useState(data.tags || []);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 300, height: 200 });

  // Keep content/tags in sync with persisted node data (collab updates,
  // canvas reload) — but don't fight an in-flight local edit.
  const editingRef = useRef(false);
  useEffect(() => {
    if (!editingRef.current && data.content !== undefined && data.content !== content) {
      setContent(data.content);
    }
    if (data.tags && JSON.stringify(data.tags) !== JSON.stringify(tags)) {
      setTags(data.tags);
    }
  }, [data.content, data.tags]);
  
  // Update time left display every second
  useEffect(() => {
    if (!deadline) return;
    
    const updateTimer = () => {
      const time = getTimeLeft(deadline);
      setTimeLeft(time);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Sync deadline and isImportant from node data
  useEffect(() => {
    if (deadlineJustSetRef.current) return;
    
    if (data.deadline && data.deadline !== deadline) {
      setDeadline(data.deadline);
    }
    if (data.isImportant !== undefined && data.isImportant !== isImportant) {
      setIsImportant(data.isImportant);
    }
  }, [data.deadline, data.isImportant]);

  const persistIsImportantLocal = async (important) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await persistIsImportant(id, important, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist isImportant:', err);
    } finally {
      setSaving(false);
    }
  };

  const persistDeadlineLocal = async (newDeadline) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      deadlineJustSetRef.current = true;
      await persistDeadline(id, newDeadline, setNodes, workspaceId);
      setDeadline(newDeadline instanceof Date ? newDeadline.toISOString() : newDeadline);
      setTimeout(() => {
        deadlineJustSetRef.current = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to persist deadline:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const getToken = async () => {
    try {
      const { Auth } = await import('aws-amplify');
      const session = await Auth.currentSession();
      return session.getIdToken().getJwtToken();
    } catch {
      return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    }
  };

  // Durable persist of node data (content/tags) — durable write is required
  // because collaborators' canvases and reloads read from the backend.
  const persistNote = async (patch) => {
    if (!workspaceId) return;
    try {
      await persistNodeDataPatch(id, patch, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist smart note:', err);
    }
  };

  const persistContent = () => {
    editingRef.current = false;
    if (content !== (data.content || '')) persistNote({ content });
  };

  const handleAIAction = async (action) => {
    if (action === 'reminder') return handleCreateReminder();
    if (!content.trim()) return;

    setProcessingAction(action);
    setAiError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/workspace/ai/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, prompt: content, workspaceId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || `AI request failed (${res.status})`);
      }
      setAiResult({ action, text: json.text, data: json.data });
    } catch (error) {
      console.error('AI Action failed:', error);
      setAiError(error.message || 'AI action failed');
    } finally {
      setProcessingAction(null);
    }
  };

  // Create a workspace calendar reminder from this note (date = note deadline
  // or today). Personal visibility — only the creator sees it and gets the
  // bell notification via the workspace due-reminder check.
  const handleCreateReminder = async () => {
    if (!content.trim() || !workspaceId) return;
    setProcessingAction('reminder');
    setAiError(null);
    try {
      const dateKey = deadline
        ? String(deadline).slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const ws = await getWorkspaceById(workspaceId);
      const events = ws?.calendarEvents || ws?.workspace?.calendarEvents || [];
      const event = {
        id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind: 'reminder',
        title: content.split('\n')[0].slice(0, 80) || 'Note reminder',
        date: dateKey,
        notes: content.slice(0, 300),
        color: '#f59e0b',
        done: false,
        visibility: 'personal',
        createdBy: currentUser?.name || currentUser?.email || 'You',
        createdById: myUserId,
        createdAt: new Date().toISOString(),
      };
      await updateWorkspace(workspaceId, { calendarEvents: [...events, event] });
      window.dispatchEvent(
        new CustomEvent('vd:calendar-updated', { detail: { workspaceId } })
      );
      setAiResult({
        action: 'reminder',
        text: `Reminder created for ${dateKey}${deadline ? '' : ' (today — set a deadline for a future date)'}`,
      });
    } catch (err) {
      console.error('Failed to create reminder:', err);
      setAiError('Could not create the reminder');
    } finally {
      setProcessingAction(null);
    }
  };

  const applySummary = (mode) => {
    if (!aiResult?.text) return;
    const next =
      mode === 'replace' ? aiResult.text : `${content}\n\n— Summary —\n${aiResult.text}`;
    setContent(next);
    persistNote({ content: next });
    setAiResult(null);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const next = [...tags, { id: Date.now(), name: newTag.trim() }];
      setTags(next);
      persistNote({ tags: next });
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagId) => {
    const next = tags.filter(tag => tag.id !== tagId);
    setTags(next);
    persistNote({ tags: next });
  };

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
    // TODO: Save position to backend
  };

  const onResize = (event, { size: newSize }) => {
    setSize({
      width: newSize.width,
      height: Math.max(150, newSize.height), // Minimum height
    });
  };

  const aiActions = [
    { id: 'summarize', label: 'Summarize', icon: <Maximize2 size={14} /> },
    { id: 'extract', label: 'Extract Key Info', icon: <Tag size={14} /> },
    { id: 'reminder', label: 'Create Reminder', icon: <Clock size={14} /> },
  ];

  // Simple text formatting functions
  const formatText = (format) => {
    if (!content) return;
    
    switch(format) {
      case 'bold':
        setContent(`**${content}**`);
        break;
      case 'italic':
        setContent(`*${content}*`);
        break;
      case 'code':
        setContent(`\`${content}\``);
        break;
      default:
        break;
    }
  };

  if (isMinimized) {
    return (
      <div 
        className="bg-warning/10 border border-warning/20 rounded-lg  overflow-hidden w-48"
        style={{ position: 'absolute', left: position.x, top: position.y }}
      >
        <div className="bg-warning/10 px-3 py-2 flex justify-between items-center">
          <span className="text-xs font-medium text-warning truncate">
            {content.substring(0, 20) || 'New Note...'}
          </span>
          <div className="flex space-x-1">
            <button 
              onClick={() => setIsMinimized(false)}
              className="text-warning hover:text-warning p-1"
            >
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={() => data.onDelete?.(data.id)}
              className="text-warning hover:text-warning p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Draggable
      position={position}
      onStop={handleDragStop}
      handle=".smart-note-handle"
      bounds="parent"
      defaultClassName="react-draggable"
    >
      <div 
        className={`relative bg-warning/10 border ${selected ? 'border-info shadow-lg' : 'border-warning/20'} rounded-lg `}
        style={{ width: size.width, height: 'auto', minHeight: '150px' }}
      >
        {/* Header */}
        <div 
          className="smart-note-handle bg-warning/10 px-3 py-2 flex justify-between items-center cursor-move group"
        >
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-warning" />
            <span className="text-sm font-medium text-warning">Smart Note</span>
          </div>
          <div className="flex space-x-1">
            <button 
              onClick={async () => {
                setIsImportant(!isImportant);
                await persistIsImportantLocal(!isImportant);
              }}
              className={`px-1.5 py-1 rounded text-xs ${isImportant ? 'bg-warning text-white' : 'text-warning hover:text-warning'}`}
              title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
            >
              {isImportant ? '★' : '☆'}
            </button>
            <button 
              onClick={() => setShowDeadlineInput(!showDeadlineInput)}
              className="text-warning hover:text-warning p-1"
              title="Set Deadline"
            >
              <Clock size={14} />
            </button>
            <button 
              onClick={() => setIsMinimized(true)}
              className="text-warning hover:text-warning p-1"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
            <button 
              onClick={() => data.onDelete?.(data.id)}
              className="text-warning hover:text-warning p-1"
              title="Delete"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Deadline Input */}
        {showDeadlineInput && (
          <div className="px-3 py-2 bg-warning/10 border-b border-warning/10 flex gap-1">
            <input
              type="datetime-local"
              className="border rounded px-2 py-1 text-xs flex-1"
              value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
            />
            <button
              className="px-2 py-1 text-xs bg-warning text-white rounded"
              onClick={async () => {
                setShowDeadlineInput(false);
                await persistDeadlineLocal(deadline);
              }}
              disabled={saving}
            >
              {saving ? '...' : '✓'}
            </button>
          </div>
        )}

        {/* Deadline Display */}
        {deadline && timeLeft && !timeLeft.isExpired && (
          <div className="px-3 py-1 bg-info/10 border-b border-info/10 text-xs text-info">
            ⏱ {formatTimeLeft(timeLeft)}
          </div>
        )}

        {/* Tags */}
        <div className="px-3 pt-2 flex flex-wrap gap-2">
          {tags.map(tag => (
            <span 
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning"
            >
              {tag.name}
              <button 
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 text-warning hover:text-warning"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {showTagInput ? (
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              onBlur={() => setShowTagInput(false)}
              className="text-xs border border-warning/30 rounded px-2 py-0.5 w-20"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="text-xs text-warning hover:text-warning flex items-center"
            >
              <Plus size={12} className="mr-0.5" /> Add Tag
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <textarea
            value={content}
            onChange={(e) => { editingRef.current = true; setContent(e.target.value); }}
            onBlur={persistContent}
            placeholder="Start typing or use AI actions..."
            className="w-full min-h-[100px] p-2 border border-line rounded focus:outline-none focus:ring-2 focus:ring-warning/30 focus:border-transparent"
            style={{ resize: 'vertical' }}
          />

          {/* AI result — summary / extracted info / reminder confirmation */}
          {aiResult && (
            <div className="mt-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-warning uppercase tracking-wide flex items-center gap-1">
                  <Sparkles size={11} />
                  {aiResult.action === 'summarize'
                    ? 'Summary'
                    : aiResult.action === 'extract'
                      ? 'Key info'
                      : 'Reminder'}
                </span>
                <button
                  onClick={() => setAiResult(null)}
                  className="text-warning hover:text-ink"
                  title="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
              {aiResult.text && (
                <p className="text-xs text-ink whitespace-pre-line">{aiResult.text}</p>
              )}
              {aiResult.data && (
                <div className="mt-2 space-y-1.5">
                  {Object.entries(aiResult.data).map(([key, list]) =>
                    Array.isArray(list) && list.length ? (
                      <div key={key} className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] font-semibold text-warning uppercase">{key}:</span>
                        {list.map((item, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-warning/15 text-warning text-[10px]">
                            {String(item)}
                          </span>
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              )}
              {aiResult.action === 'summarize' && (
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => applySummary('replace')}
                    className="px-2 py-1 text-[10px] font-medium bg-warning text-white rounded hover:opacity-90"
                  >
                    Replace note
                  </button>
                  <button
                    onClick={() => applySummary('append')}
                    className="px-2 py-1 text-[10px] font-medium border border-warning/30 text-warning rounded hover:bg-warning/10"
                  >
                    Append
                  </button>
                </div>
              )}
            </div>
          )}
          {aiError && (
            <p className="mt-2 text-[10px] text-danger">{aiError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-warning/10 border-t border-warning/10 flex justify-between items-center">
          <div className="flex space-x-1">
            <button
              onClick={() => formatText('bold')}
              className="p-1.5 rounded hover:bg-warning/20 text-warning hover:text-warning"
              title="Bold"
            >
              <span className="font-bold">B</span>
            </button>
            <button
              onClick={() => formatText('italic')}
              className="p-1.5 rounded hover:bg-warning/20 text-warning hover:text-warning"
              title="Italic"
            >
              <span className="italic">I</span>
            </button>
            <button
              onClick={() => formatText('code')}
              className="p-1.5 rounded hover:bg-warning/20 text-warning hover:text-warning"
              title="Code"
            >
              <code>\`\`\`</code>
            </button>
            {aiActions.map(action => (
              <button
                key={action.id}
                onClick={() => handleAIAction(action.id)}
                disabled={!!processingAction}
                className="p-1.5 rounded hover:bg-warning/20 text-warning hover:text-warning disabled:opacity-50 disabled:cursor-not-allowed"
                title={action.label}
              >
                {processingAction === action.id ? (
                  <div className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  action.icon
                )}
              </button>
            ))}
          </div>
          
          <div className="text-xs text-warning">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Sequence Number Badge - Top left corner */}
        {data.sequenceNumber && (
          <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
            {data.sequenceNumber}
          </div>
        )}

        {/* Node Handles */}
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-2 h-2 bg-warning"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-2 h-2 bg-warning"
        />
      </div>
    </Draggable>
  );
};

export default SmartNoteNode;
