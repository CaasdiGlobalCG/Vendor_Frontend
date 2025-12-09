import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Edit3, Move, Palette } from 'lucide-react';

const ContextMenu = ({ 
  isVisible, 
  position, 
  onClose, 
  onDuplicate, 
  onDelete, 
  onEdit,
  selectedNodes = [],
  userPermissions = {}
}) => {
  const menuRef = useRef(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible || selectedNodes.length === 0) {
    return null;
  }

  const handleMenuAction = (action) => {
    action();
    onClose();
  };

  const canEdit = userPermissions.canEdit !== false; // Default to true if not specified
  const isMultipleSelection = selectedNodes.length > 1;
  const elementType = selectedNodes[0]?.data?.type || 'element';
  const elementName = selectedNodes[0]?.data?.name || elementType;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(0, 0)' // Ensure menu stays within viewport
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="text-xs font-medium text-gray-500">
          {isMultipleSelection 
            ? `${selectedNodes.length} elements selected`
            : `${elementName}`
          }
        </div>
      </div>

      {/* Duplicate Action */}
      <button
        onClick={() => handleMenuAction(onDuplicate)}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
        disabled={!canEdit}
      >
        <Copy className="w-4 h-4" />
        <span>Duplicate</span>
        <span className="ml-auto text-xs text-gray-400">Ctrl+D</span>
      </button>

      {/* Edit Action (only for single selection) */}
      {!isMultipleSelection && (
        <button
          onClick={() => handleMenuAction(onEdit)}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
          disabled={!canEdit}
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit</span>
        </button>
      )}

      {/* Separator */}
      <div className="border-t border-gray-100 my-1"></div>

      {/* Delete Action */}
      <button
        onClick={() => handleMenuAction(onDelete)}
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
        disabled={!canEdit}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
        <span className="ml-auto text-xs text-gray-400">Del</span>
      </button>

      {/* Disabled state styling */}
      <style jsx>{`
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        button:disabled:hover {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default ContextMenu;
