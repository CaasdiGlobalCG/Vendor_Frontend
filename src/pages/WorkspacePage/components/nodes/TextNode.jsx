import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { persistIsImportant, persistDeadline, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
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

  // Determine border style based on selection state
  const getBorderStyle = () => {
    if (data.isManuallySelected) {
      return 'border-purple-600 ring-4 ring-purple-200 shadow-purple-200';
    }
    if (data.isInSelectionMode) {
      return 'border-purple-300 hover:border-purple-500 cursor-pointer';
    }
    if (selected) {
      return 'border-purple-600 ring-2 ring-purple-200';
    }
    return 'border-purple-500';
  };

  const getTextStyle = () => {
    const styles = {
      fontFamily: data.fontFamily || 'Arial',
      fontSize: `${data.fontSize || 12}pt`,
      color: data.color || '#000000',
      backgroundColor: data.backgroundColor && data.backgroundColor !== 'transparent' ? data.backgroundColor : 'transparent',
    };

    // Apply formatting - handle both array and object formats
    if (data.formats) {
      if (Array.isArray(data.formats)) {
        // Handle array format: ['bold', 'italic']
        if (data.formats.includes('bold')) styles.fontWeight = 'bold';
        if (data.formats.includes('italic')) styles.fontStyle = 'italic';
        if (data.formats.includes('underline')) styles.textDecoration = 'underline';
        if (data.formats.includes('strikethrough')) styles.textDecoration = 'line-through';
      } else if (typeof data.formats === 'object') {
        // Handle object format: { bold: true, italic: false }
        if (data.formats.bold) styles.fontWeight = 'bold';
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

  const handleEditComplete = () => {
    setIsEditing(false);
    // Update the node data
    data.content = editContent;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditComplete();
    }
  };

  return (
    <div className={`${isImportant ? 'bg-yellow-50' : 'bg-white'} border-2 rounded-xl shadow-xl p-6 min-w-[300px] max-w-[500px] relative group transition-all ${getBorderStyle()}`}>
      {/* Connection Handles - Same as other nodes */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-out"
        style={{ left: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-in"
        style={{ left: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="right-out"
        style={{ top: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-in"
        style={{ top: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-out"
        style={{ left: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        style={{ left: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Left}
        id="left-out"
        style={{ top: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-in"
        style={{ top: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      {/* Text Content */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleEditComplete}
          onKeyPress={handleKeyPress}
          onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="w-full resize-none border-none outline-none bg-transparent"
          style={{ 
            ...getTextStyle(),
            textAlign: getTextAlign(),
            lineHeight: '1.5'
          }}
          placeholder="Type your text here..."
          autoFocus
        />
      ) : (
        <div 
          onDoubleClick={handleDoubleClick}
          className="cursor-text min-h-[20px] flex items-center"
          style={{ 
            ...getTextStyle(),
            textAlign: getTextAlign(),
            lineHeight: '1.5',
            color: editContent ? (data.color || '#000000') : '#9CA3AF'
          }}
        >
          {editContent || 'Double click to edit text'}
        </div>
      )}
      
      {/* Persistence Controls */}
      <div className="absolute top-2 right-2 flex gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={async () => {
            setIsImportant(!isImportant);
            await persistIsImportantLocal(!isImportant);
          }}
          className={`px-2 py-1 rounded ${isImportant ? 'bg-yellow-400 text-white' : 'bg-white text-yellow-600 border border-yellow-400'}`}
          title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
        >
          {isImportant ? '★' : '☆'}
        </button>
        <button
          onClick={() => setShowDeadlineInput(!showDeadlineInput)}
          className="px-2 py-1 rounded bg-white text-blue-600 border border-blue-400"
          title="Set Deadline"
        >
          ⏰
        </button>
      </div>

      {/* Deadline Input */}
      {showDeadlineInput && (
        <div className="absolute top-12 right-2 bg-white border border-gray-300 rounded shadow-lg p-2 z-20">
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 text-xs w-40"
            value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={saving}
          />
          <button
            className="mt-1 w-full px-2 py-1 text-xs bg-blue-500 text-white rounded"
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
        <div className="absolute bottom-2 right-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          ⏱ {formatTimeLeft(timeLeft)}
        </div>
      )}
      
      {/* Text Type Label */}
      <div className="absolute -top-2 -left-2 px-2 py-1 bg-purple-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {data.name}
      </div>
      
      {/* Sequence Number Badge - Top left corner */}
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          T
        </div>
      )}
    </div>
  );
};

export default TextNode;



