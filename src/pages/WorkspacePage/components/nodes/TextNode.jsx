import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { persistIsImportant, persistDeadline, persistTextContent, emitLiveTextPatch, consumeTextNodeFocus, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
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

  const handleDoubleClick = () => {
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

  // Caption mode — created by the text tool: bare text on the canvas, no card
  // chrome and no connection handles. Single click selects it (opens the left
  // text inspector); a second click or double-click enters editing.
  if (data.caption) {
    return (
      <div
        className="relative"
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
          onClick={() => { if (selected && !isEditing) setIsEditing(true); }}
          onDoubleClick={() => { if (!isEditing) setIsEditing(true); }}
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



