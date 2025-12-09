import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

const TextNode = ({ data, isConnectable, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

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
    <div className={`bg-white border-2 rounded-xl shadow-xl p-6 min-w-[300px] max-w-[500px] relative group transition-all ${getBorderStyle()}`}>
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
      
      {/* Text Type Label */}
      <div className="absolute -top-2 -left-2 px-2 py-1 bg-purple-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {data.name}
      </div>
      
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



