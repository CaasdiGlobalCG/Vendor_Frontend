import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { persistIsImportant, persistDeadline, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Maximize2, Minimize2, X, Sparkles, MoreVertical, Save, Trash2, Tag, Clock, Check, Plus } from 'lucide-react';
// Using a simple textarea for now to avoid dependency issues
import { Resizable } from 'react-resizable';
import Draggable from 'react-draggable';

const SmartNoteNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tags, setTags] = useState([]);
  const [reminder, setReminder] = useState(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 300, height: 200 });
  
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
  
  const handleAIAction = async (action) => {
    if (!content.trim()) return;
    
    setIsProcessing(true);
    try {
      // TODO: Implement AI API calls
      console.log(`Performing ${action} on:`, content);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle different AI actions
      switch(action) {
        case 'summarize':
          // TODO: Call summarize API
          break;
        case 'extract':
          // TODO: Call extract API
          break;
        case 'reminder':
          // TODO: Handle reminder creation
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('AI Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTag.trim()) {
      setTags([...tags, { id: Date.now(), name: newTag.trim() }]);
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagId) => {
    setTags(tags.filter(tag => tag.id !== tagId));
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
        className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md overflow-hidden w-48"
        style={{ position: 'absolute', left: position.x, top: position.y }}
      >
        <div className="bg-yellow-100 px-3 py-2 flex justify-between items-center">
          <span className="text-xs font-medium text-yellow-800 truncate">
            {content.substring(0, 20) || 'New Note...'}
          </span>
          <div className="flex space-x-1">
            <button 
              onClick={() => setIsMinimized(false)}
              className="text-yellow-600 hover:text-yellow-800 p-1"
            >
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={() => data.onDelete?.(data.id)}
              className="text-yellow-600 hover:text-yellow-800 p-1"
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
        className={`relative bg-yellow-50 border ${selected ? 'border-blue-400 shadow-lg' : 'border-yellow-200'} rounded-lg shadow-sm`}
        style={{ width: size.width, height: 'auto', minHeight: '150px' }}
      >
        {/* Header */}
        <div 
          className="smart-note-handle bg-yellow-100 px-3 py-2 flex justify-between items-center cursor-move group"
        >
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Smart Note</span>
          </div>
          <div className="flex space-x-1">
            <button 
              onClick={async () => {
                setIsImportant(!isImportant);
                await persistIsImportantLocal(!isImportant);
              }}
              className={`px-1.5 py-1 rounded text-xs ${isImportant ? 'bg-yellow-400 text-white' : 'text-yellow-600 hover:text-yellow-800'}`}
              title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
            >
              {isImportant ? '★' : '☆'}
            </button>
            <button 
              onClick={() => setShowDeadlineInput(!showDeadlineInput)}
              className="text-yellow-600 hover:text-yellow-800 p-1"
              title="Set Deadline"
            >
              <Clock size={14} />
            </button>
            <button 
              onClick={() => setIsMinimized(true)}
              className="text-yellow-600 hover:text-yellow-800 p-1"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>
            <button 
              onClick={() => data.onDelete?.(data.id)}
              className="text-yellow-600 hover:text-yellow-800 p-1"
              title="Delete"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Deadline Input */}
        {showDeadlineInput && (
          <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-100 flex gap-1">
            <input
              type="datetime-local"
              className="border rounded px-2 py-1 text-xs flex-1"
              value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
            />
            <button
              className="px-2 py-1 text-xs bg-yellow-400 text-white rounded"
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
          <div className="px-3 py-1 bg-blue-50 border-b border-blue-100 text-xs text-blue-600">
            ⏱ {formatTimeLeft(timeLeft)}
          </div>
        )}

        {/* Tags */}
        <div className="px-3 pt-2 flex flex-wrap gap-2">
          {tags.map(tag => (
            <span 
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
            >
              {tag.name}
              <button 
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 text-yellow-500 hover:text-yellow-700"
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
              className="text-xs border border-yellow-300 rounded px-2 py-0.5 w-20"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="text-xs text-yellow-600 hover:text-yellow-800 flex items-center"
            >
              <Plus size={12} className="mr-0.5" /> Add Tag
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing or use AI actions..."
            className="w-full min-h-[100px] p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-transparent"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-yellow-50 border-t border-yellow-100 flex justify-between items-center">
          <div className="flex space-x-1">
            <button
              onClick={() => formatText('bold')}
              className="p-1.5 rounded hover:bg-yellow-200 text-yellow-700 hover:text-yellow-900"
              title="Bold"
            >
              <span className="font-bold">B</span>
            </button>
            <button
              onClick={() => formatText('italic')}
              className="p-1.5 rounded hover:bg-yellow-200 text-yellow-700 hover:text-yellow-900"
              title="Italic"
            >
              <span className="italic">I</span>
            </button>
            <button
              onClick={() => formatText('code')}
              className="p-1.5 rounded hover:bg-yellow-200 text-yellow-700 hover:text-yellow-900"
              title="Code"
            >
              <code>\`\`\`</code>
            </button>
            {aiActions.map(action => (
              <button
                key={action.id}
                onClick={() => handleAIAction(action.id)}
                disabled={isProcessing}
                className="p-1.5 rounded hover:bg-yellow-200 text-yellow-700 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
                title={action.label}
              >
                {isProcessing && action.id === 'summarize' ? (
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  action.icon
                )}
              </button>
            ))}
          </div>
          
          <div className="text-xs text-yellow-600">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Sequence Number Badge - Top left corner */}
        {data.sequenceNumber && (
          <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
            {data.sequenceNumber}
          </div>
        )}

        {/* Node Handles */}
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-2 h-2 bg-yellow-500"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-2 h-2 bg-yellow-500"
        />
      </div>
    </Draggable>
  );
};

export default SmartNoteNode;
