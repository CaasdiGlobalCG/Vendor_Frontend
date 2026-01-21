import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { persistIsImportant, persistDeadline, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Edit3 } from 'lucide-react';
import LayoutRenderer from '../forms/LayoutRenderer';

const LayoutNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);

  // Check if this is a group container
  const isGroupContainer = data.isGroupContainer || data.type === 'group-container';
  const containerStyle = data.containerStyle || {};
  const [containerName, setContainerName] = useState(data?.name || 'Group Container');
  const [isEditingName, setIsEditingName] = useState(false);

  // Save container name to node data with validation
  const handleNameSave = () => {
    try {
      setIsEditingName(false);
      
      // Trim the name and validate it's not empty
      const trimmedName = containerName.trim();
      if (!trimmedName || trimmedName === data?.name) {
        // If empty or unchanged, just reset and don't update
        setContainerName(data?.name || 'Group Container');
        return;
      }
      
      // Update node with new name
      setNodes(currentNodes => {
        if (!Array.isArray(currentNodes)) return currentNodes;
        
        return currentNodes.map(node => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                name: trimmedName
              }
            };
          }
          return node;
        });
      });
    } catch (err) {
      console.error('Error saving container name:', err);
      // Revert to original name on error
      setContainerName(data?.name || 'Group Container');
      setIsEditingName(false);
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
      return 'border-green-600 ring-4 ring-green-200 shadow-green-200';
    }
    if (data.isInSelectionMode) {
      return 'border-green-300 hover:border-green-500 cursor-pointer';
    }
    if (selected) {
      return 'border-green-600 ring-2 ring-green-200';
    }
    return 'border-green-500';
  };

  // Render group container differently
  if (isGroupContainer) {
    return (
      <div 
        className="rounded-2xl shadow-lg relative group transition-all"
        style={{ 
          width: data.width || 800, 
          height: data.height || 500,
          backgroundColor: containerStyle.backgroundColor || '#f0f9ff',
          border: `3px solid ${containerStyle.borderColor || '#3b82f6'}`,
          borderRadius: 20,
          overflow: 'visible'
        }}
      >
        {/* Group Container Header */}
        <div 
          className="absolute top-0 left-0 right-0 px-4 py-3 rounded-t-2xl flex items-center justify-between"
          style={{
            backgroundColor: containerStyle.headerColor || '#3b82f6',
            color: 'white',
            height: 50
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-sm">📦</span>
            </div>
            {isEditingName ? (
              <input
                type="text"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') {
                    setContainerName(data?.name || 'Group Container');
                    setIsEditingName(false);
                  }
                }}
                className="bg-white/20 text-white placeholder-white/60 px-2 py-1 rounded text-sm font-semibold outline-none border border-white/30 focus:border-white/60"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className="font-semibold text-sm cursor-pointer hover:bg-white/10 px-2 py-1 rounded transition-colors"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
                title="Double-click to rename"
              >
                {containerName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
              title="Rename container"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              {data?.childNodeIds?.length || 0} items
            </span>
          </div>
        </div>
        
        {/* Connection Handles */}
        <Handle
          type="source"
          position={Position.Right}
          id="right-out"
          style={{ top: '50%' }}
          className="w-3 h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left-in"
          style={{ top: '50%' }}
          className="w-3 h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
          isConnectable={isConnectable}
        />
      </div>
    );
  }

  return (
    <div 
      className={`${isImportant ? 'bg-yellow-50' : 'bg-white'} border-2 rounded-xl shadow-xl p-6 relative group transition-all ${getBorderStyle()}`} 
      style={{ 
        width: data.width || 380, 
        height: data.height || 280
      }}
    >
      {/* Connection Handles - Same as ElementNode */}
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
      
      {/* Layout Content */}
      <div className="flex-1" style={{ height: 'calc(100% - 40px)' }}>
        <LayoutRenderer
          data={{ ...data, nodeId: id }}
          layoutType={data.type}
        />
      </div>
      
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
      
      {/* Sequence Number Badge - Top left corner */}
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          L
        </div>
      )}
    </div>
  );
};

export default LayoutNode;
