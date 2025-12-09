import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import LayoutRenderer from '../forms/LayoutRenderer';

const LayoutNode = ({ id, data, isConnectable, selected }) => {
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

  return (
    <div className={`bg-white border-2 rounded-xl shadow-xl p-6 relative group transition-all ${getBorderStyle()}`} 
         style={{ width: data.width || 380, height: data.height || 280 }}>
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



