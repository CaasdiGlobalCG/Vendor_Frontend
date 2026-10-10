import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { persistIsImportant, persistDeadline, persistTextContent, persistNodeDataPatch, emitLiveTextPatch, consumeTextNodeFocus, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { formatAuthorLine, formatAddedAt } from '../../utils/nodeAuthor';
import { describeAudience, isAudienceRestricted, isLocked } from '../../utils/nodeVisibility';
import CommentThread from '../comments/CommentThread';
import { MessageCircle, Info, Lock, Eye, UserCheck } from 'lucide-react';
import { Handle, Position, useReactFlow } from 'reactflow';

const TextNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const textSaveTimeoutRef = useRef(null);
  const [showComments, setShowComments] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Comments live on the node data (same shape ElementNode uses), so the
  // existing @mention notification endpoint works unchanged for text nodes.
  const nodeComments = data.comments || [];
  const unresolvedCommentCount = nodeComments.filter((c) => !c.resolved).length;

  const handleAddComment = async (nodeId, comment) => {
    const updatedComments = [...nodeComments, comment];
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
      if (comment.mentionedUserIds && comment.mentionedUserIds.length > 0) {
        try {
          await fetch('/api/workspace/comments/mention', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              nodeId,
              elementName: data.name || data.type || 'text',
              commentText: comment.text,
              authorName: comment.authorName,
              mentionedUserIds: comment.mentionedUserIds,
            }),
          });
        } catch (err) {
          console.error('Failed to send mention notifications:', err);
        }
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleResolveComment = async (nodeId, commentId) => {
    const updatedComments = nodeComments.map((c) =>
      c.id === commentId
        ? { ...c, resolved: !c.resolved, resolvedAt: !c.resolved ? new Date().toISOString() : null }
        : c
    );
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const handleDeleteComment = async (nodeId, commentId) => {
    const updatedComments = nodeComments.filter((c) => c.id !== commentId);
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

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

  // Initialize content from node data
  useEffect(() => {
    if (data.content && data.content !== editContent && !isEditing) {
      setEditContent(data.content);
    }
  }, [data.content, isEditing]);

  // Nodes placed by the text tool are queued for edit-mode on first mount
  // (module-level registry — never broadcast or persisted). Also clear any
  // stale data.isEditing flag left over from older saves.
  useEffect(() => {
    if (consumeTextNodeFocus(id)) setIsEditing(true);
    if (data.isEditing) {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, isEditing: false } } : n));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save text content when editing completes
  useEffect(() => {
    if (!workspaceId || isEditing || !editContent) return;

    // Clear existing timeout
    if (textSaveTimeoutRef.current) {
      clearTimeout(textSaveTimeoutRef.current);
    }

    // Set new timeout to save after 1 second of inactivity
    textSaveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('💾 Auto-saving text content:', { nodeId: id, content: editContent });
        await persistTextContent(id, editContent, 'content', setNodes, workspaceId);
        console.log('✅ Text content saved successfully');
      } catch (error) {
        console.error('❌ Failed to save text content:', error);
      }
    }, 1000);

    return () => {
      if (textSaveTimeoutRef.current) {
        clearTimeout(textSaveTimeoutRef.current);
      }
    };
  }, [editContent, isEditing, workspaceId, id]);

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

  // Determine border style based on selection state
  const getBorderStyle = () => {
    if (data.isManuallySelected) {
      return 'border-line ring-4 ring-ink shadow-purple-200';
    }
    if (data.isInSelectionMode) {
      return 'border-line hover:border-line cursor-pointer';
    }
    if (selected) {
      return 'border-line ring-2 ring-ink';
    }
    return 'border-line';
  };

  const FONT_WEIGHTS = { regular: '400', medium: '500', semibold: '600', bold: '700' };

  const getTextStyle = () => {
    const styles = {
      fontFamily: data.fontFamily || 'Arial',
      fontSize: `${data.fontSize || 12}pt`,
      color: data.color || '#000000',
      lineHeight: data.lineHeight || '1.5',
      letterSpacing: data.letterSpacing ? `${data.letterSpacing}px` : undefined,
    };

    if (data.fontWeight && FONT_WEIGHTS[data.fontWeight]) {
      styles.fontWeight = FONT_WEIGHTS[data.fontWeight];
    }

    // Apply formatting - handle both array and object formats
    if (data.formats) {
      if (Array.isArray(data.formats)) {
        // Handle array format: ['bold', 'italic']
        if (data.formats.includes('bold')) styles.fontWeight = '700';
        if (data.formats.includes('italic')) styles.fontStyle = 'italic';
        if (data.formats.includes('underline')) styles.textDecoration = 'underline';
        if (data.formats.includes('strikethrough')) styles.textDecoration = 'line-through';
      } else if (typeof data.formats === 'object') {
        // Handle object format: { bold: true, italic: false }
        if (data.formats.bold) styles.fontWeight = '700';
        if (data.formats.italic) styles.fontStyle = 'italic';
        if (data.formats.underline) styles.textDecoration = 'underline';
        if (data.formats.strikethrough) styles.textDecoration = 'line-through';
      }
    }

    return styles;
  };

  const getTextAlign = () => {
    if (data.formats) {
      if (Array.isArray(data.formats)) {
        // Handle array format: ['align-center', 'bold']
        if (data.formats.includes('align-center')) return 'center';
        if (data.formats.includes('align-right')) return 'right';
        if (data.formats.includes('align-justify')) return 'justify';
      } else if (typeof data.formats === 'object') {
        // Handle object format: { 'align-center': true, bold: true }
        if (data.formats['align-center']) return 'center';
        if (data.formats['align-right']) return 'right';
        if (data.formats['align-justify']) return 'justify';
      }
    }
    return 'left';
  };

  // Locked notes are read-only: no drag, no edit, no delete from the canvas.
  const locked = isLocked(data);
  const audienceRestricted = isAudienceRestricted(data);

  const handleDoubleClick = () => {
    if (locked) return;
    setIsEditing(true);
  };

  const handleEditComplete = async () => {
    setIsEditing(false);
    // An empty caption the user clicked away from is removed outright
    if (data.caption && !editContent.trim()) {
      document.dispatchEvent(new CustomEvent('deleteElement', {
        detail: { elementId: id, allowEmptyCaption: true }
      }));
      return;
    }
    // Persist the updated content
    if (workspaceId && editContent) {
      try {
        await persistTextContent(id, editContent, 'content', setNodes, workspaceId);
        console.log('✅ Text content persisted on edit complete');
      } catch (error) {
        console.error('❌ Failed to persist text on edit complete:', error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditComplete();
    }
  };

  const hasExplicitWidth = data.width != null && data.width !== '';
  const hasExplicitHeight = data.height != null && data.height !== '';
  const verticalAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
  const strokeWidthNum = parseFloat(data.strokeWidth) || 0;

  // Connection Handles - shared by card and caption renders
  const connectionHandles = (
    <>
      <Handle
        type="source"
        position={Position.Top}
        id="top-out"
        style={{ left: '48%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-in"
        style={{ left: '52%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right-out"
        style={{ top: '48%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-in"
        style={{ top: '52%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-out"
        style={{ left: '48%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        style={{ left: '52%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />

      <Handle
        type="source"
        position={Position.Left}
        id="left-out"
        style={{ top: '48%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-in"
        style={{ top: '52%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
    </>
  );

  const authorLine = formatAuthorLine(data);

  // Comments + authorship affordances, shared by the caption and card renders.
  // Comments are stored on node.data.comments — the same shape ElementNode
  // uses, so the @mention notification endpoint needs no changes.
  const metaOverlay = (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v); }}
        className={`absolute -bottom-2 -left-2 z-20 flex items-center gap-0.5 rounded-full border-2 border-white px-1.5 py-0.5 text-[10px] font-bold transition-opacity ${
          unresolvedCommentCount > 0
            ? 'bg-info text-white opacity-100'
            : 'bg-surface text-dim opacity-0 group-hover:opacity-100'
        }`}
        title={unresolvedCommentCount > 0 ? `${unresolvedCommentCount} unresolved comment(s)` : 'Add a comment'}
      >
        <MessageCircle className="w-3 h-3" />
        {unresolvedCommentCount > 0 && <span>{unresolvedCommentCount}</span>}
      </button>

      {/* Audience / lock / assignee state — always visible when set */}
      <div className="absolute -top-3 -right-3 z-20 flex items-center gap-1">
        {audienceRestricted && (
          <span
            className="flex items-center gap-0.5 rounded-full border border-info/30 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info"
            title={`Visible to ${describeAudience(data)}`}
          >
            <Eye className="w-3 h-3" />
            <span>{describeAudience(data)}</span>
          </span>
        )}
        {data.assignee?.name && (
          <span
            className="flex items-center gap-0.5 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success"
            title={`Assigned to ${data.assignee.name}`}
          >
            <UserCheck className="w-3 h-3" />
            <span>{data.assignee.name}</span>
          </span>
        )}
        {locked && (
          <span
            className="flex items-center rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning"
            title="Locked — position and content are fixed"
          >
            <Lock className="w-3 h-3" />
          </span>
        )}
      </div>

      {authorLine && (
        <div className="absolute -top-2 -left-2 z-20 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
            className="flex items-center gap-1 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[10px] text-dim hover:text-ink"
            title={`Added by ${authorLine}`}
          >
            <Info className="w-3 h-3" />
          </button>
          {showInfo && (
            <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-line bg-surface p-2 text-[11px] shadow-lg">
              <div className="font-medium text-ink">{authorLine}</div>
              {data.addedByEmail && <div className="text-dim">{data.addedByEmail}</div>}
              <div className="mt-1 text-dim">Added {formatAddedAt(data.addedAt)}</div>
            </div>
          )}
        </div>
      )}

      {showComments && (
        <div
          className="absolute top-0 -right-[320px] z-50"
          style={{ width: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <CommentThread
            nodeId={id}
            comments={nodeComments}
            collaborators={data.workspaceCollaborators || []}
            onAddComment={handleAddComment}
            onResolve={handleResolveComment}
            onDeleteComment={handleDeleteComment}
            isLocked={false}
            onClose={() => setShowComments(false)}
          />
        </div>
      )}
    </>
  );

  // Caption mode — created by the text tool: bare text on the canvas, no card
  // chrome and no connection handles. Single click selects it (opens the left
  // text inspector); a second click or double-click enters editing.
  if (data.caption) {
    return (
      <div
        className="relative group"
        style={{
          opacity: data.opacity != null ? Math.max(0, Math.min(100, Number(data.opacity))) / 100 : 1,
          transform: data.rotation ? `rotate(${Number(data.rotation) || 0}deg)` : undefined,
        }}
      >
        <div
          className="cursor-text whitespace-pre-wrap min-w-[24px] max-w-[420px] px-1 py-0.5"
          style={{
            ...getTextStyle(),
            textAlign: getTextAlign(),
            color: editContent ? (data.color || '#111827') : '#9CA3AF',
            outline: selected ? '1.5px dashed #3b82f6' : 'none',
            outlineOffset: 3,
          }}
          onClick={() => { if (selected && !isEditing && !locked) setIsEditing(true); }}
          onDoubleClick={() => { if (!isEditing && !locked) setIsEditing(true); }}
        >
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                emitLiveTextPatch(id, e.target.value, 'content', setNodes);
              }}
              onBlur={handleEditComplete}
              onKeyPress={handleKeyPress}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') e.currentTarget.blur();
              }}
              onFocus={(e) => e.stopPropagation()}
              className="w-full resize-none border-none outline-none bg-transparent"
              style={{ ...getTextStyle(), textAlign: getTextAlign(), overflow: 'hidden' }}
              placeholder="Type here..."
              autoFocus
            />
          ) : (
            editContent
          )}
        </div>
        {metaOverlay}
      </div>
    );
  }

  return (
    <div
      className={`border-2 rounded-xl shadow-xl p-6 ${hasExplicitWidth ? 'w-full' : 'min-w-[300px] max-w-[500px]'} ${hasExplicitHeight ? 'h-full' : ''} relative group transition-all ${getBorderStyle()}`}
      style={{
        backgroundColor: data.backgroundColor && data.backgroundColor !== 'transparent' ? data.backgroundColor : (isImportant ? '#fffacd' : '#ffffff'),
        opacity: data.opacity != null ? Math.max(0, Math.min(100, Number(data.opacity))) / 100 : 1,
        borderRadius: data.borderRadius != null ? `${Number(data.borderRadius) || 0}px` : undefined,
        transform: data.rotation ? `rotate(${Number(data.rotation) || 0}deg)` : undefined,
        ...(strokeWidthNum > 0 ? { borderColor: data.strokeColor || '#000000', borderWidth: strokeWidthNum, borderStyle: 'solid' } : {}),
        boxShadow: data.shadow ? '0 8px 24px rgba(0,0,0,0.18)' : undefined,
      }}
    >
      {connectionHandles}
      {metaOverlay}
      
      {/* Text Content — vertical alignment fills the box when a height is set */}
      <div
        className={`w-full ${hasExplicitHeight ? 'h-full flex' : 'flex'} `}
        style={{ alignItems: verticalAlignMap[data.verticalAlign] || 'center' }}
      >
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => {
            setEditContent(e.target.value);
            emitLiveTextPatch(id, e.target.value, 'content', setNodes);
          }}
          onBlur={handleEditComplete}
          onKeyPress={handleKeyPress}
          onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="w-full resize-none border-none outline-none bg-transparent"
          style={{
            ...getTextStyle(),
            textAlign: getTextAlign(),
          }}
          placeholder="Type your text here..."
          autoFocus
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          className="cursor-text min-h-[20px] w-full"
          style={{
            ...getTextStyle(),
            textAlign: getTextAlign(),
            color: editContent ? (data.color || '#000000') : '#9CA3AF'
          }}
        >
          {editContent || 'Double click to edit text'}
        </div>
      )}
      </div>
      
      {/* Persistence Controls */}
      <div className="absolute top-2 right-2 flex gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={async () => {
            setIsImportant(!isImportant);
            await persistIsImportantLocal(!isImportant);
          }}
          className={`px-2 py-1 rounded ${isImportant ? 'bg-warning text-white' : 'bg-surface text-warning border border-warning'}`}
          title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
        >
          {isImportant ? '★' : '☆'}
        </button>
        <button
          onClick={() => setShowDeadlineInput(!showDeadlineInput)}
          className="px-2 py-1 rounded bg-surface text-info border border-info"
          title="Set Deadline"
        >
          ⏰
        </button>
      </div>

      {/* Deadline Input */}
      {showDeadlineInput && (
        <div className="absolute top-12 right-2 bg-surface border border-line rounded shadow-lg p-2 z-20">
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 text-xs w-40"
            value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={saving}
          />
          <button
            className="mt-1 w-full px-2 py-1 text-xs bg-info text-white rounded"
            onClick={async () => {
              setShowDeadlineInput(false);
              await persistDeadlineLocal(deadline);
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
      )}

      {/* Deadline Display */}
      {deadline && timeLeft && !timeLeft.isExpired && (
        <div className="absolute bottom-2 right-2 text-xs text-info bg-info/10 px-2 py-1 rounded">
          ⏱ {formatTimeLeft(timeLeft)}
        </div>
      )}
      
      {/* Text Type Label */}
      <div className="absolute -top-2 -left-2 px-2 py-1 bg-cta text-cta-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {data.name}
      </div>
      
      {/* Sequence Number Badge - Top left corner */}
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-cta text-cta-foreground rounded-full flex items-center justify-center text-xs font-bold">
          T
        </div>
      )}
    </div>
  );
};

export default TextNode;



