import React from 'react';
import { Square, Grid3X3, Columns, Rows, Image, X } from 'lucide-react';

// DraggableLayout component for React Flow
const DraggableLayout = ({ layout }) => {
  const handleDragStart = (event) => {
    // Set the layout data for React Flow to consume
    const layoutJson = JSON.stringify(layout);
    event.dataTransfer.setData('application/json', layoutJson);
    event.dataTransfer.effectAllowed = 'move';
    
    console.log('🚀 Drag started for layout:', layout.name);
    console.log('📦 Layout data being transferred:', layoutJson);
    console.log('🔧 DataTransfer effectAllowed:', event.dataTransfer.effectAllowed);
  };

  const handleDoubleClick = () => {
    // Dispatch custom event for double-click
    const event = new CustomEvent('elementDoubleClick', { detail: layout });
    document.dispatchEvent(event);
    console.log('📡 Layout double-click event dispatched:', layout);
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className="group p-4 bg-canvas rounded-lg border-2 border-line hover:border-info/30 hover:bg-info/10 transition-all duration-200  cursor-move relative flex items-center space-x-4"
      title="Drag to canvas or double-click to add"
    >
      {/* Layout Icon */}
      <div className="w-12 h-12 bg-surface rounded-lg border border-line flex items-center justify-center flex-shrink-0 group-hover:border-info/30 group-hover:bg-info/10 transition-colors">
        {layout.type === 'frame' && (
          <Square className="w-6 h-6 text-dim" />
        )}
        {layout.type === 'rows' && (
          <div className="flex flex-col space-y-1">
            <div className="w-6 h-1 bg-cta rounded"></div>
            <div className="w-6 h-1 bg-cta rounded"></div>
            <div className="w-6 h-1 bg-cta rounded"></div>
          </div>
        )}
        {layout.type === 'columns' && (
          <div className="flex space-x-1">
            <div className="w-1 h-6 bg-cta rounded"></div>
            <div className="w-1 h-6 bg-cta rounded"></div>
            <div className="w-1 h-6 bg-cta rounded"></div>
          </div>
        )}
        {layout.type === 'grid' && (
          <Grid3X3 className="w-6 h-6 text-dim" />
        )}
        {layout.type === 'image' && (
          <Image className="w-6 h-6 text-dim" />
        )}
      </div>
      
      {/* Layout Info */}
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-ink group-hover:text-info transition-colors">
          {layout.name}
        </p>
        <p className="text-xs text-dim mt-1">{layout.preview}</p>
      </div>
      
      {/* Drag Indicator */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex flex-col space-y-1">
          <div className="w-1 h-1 bg-info rounded-full"></div>
          <div className="w-1 h-1 bg-info rounded-full"></div>
          <div className="w-1 h-1 bg-info rounded-full"></div>
          <div className="w-1 h-1 bg-info rounded-full"></div>
          <div className="w-1 h-1 bg-info rounded-full"></div>
          <div className="w-1 h-1 bg-info rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

const LayoutsPanel = ({ 
  isOpen,
  onClose
}) => {
  // Layout options based on the image
  const layouts = [
    { 
      id: 'frame', 
      name: 'Frame', 
      type: 'frame', 
      preview: 'Container frame for grouping elements',
      width: 300,
      height: 200
    },
    { 
      id: 'rows', 
      name: 'Rows', 
      type: 'rows', 
      preview: 'Horizontal row layout structure',
      width: 400,
      height: 150
    },
    { 
      id: 'columns', 
      name: 'Columns', 
      type: 'columns', 
      preview: 'Vertical column layout structure',
      width: 300,
      height: 250
    },
    { 
      id: 'grids', 
      name: 'Grids', 
      type: 'grid', 
      preview: 'Grid layout for organized content',
      width: 350,
      height: 200
    },
    { 
      id: 'image-placeholder', 
      name: 'Image', 
      type: 'image', 
      preview: 'Image placeholder container',
      width: 250,
      height: 180
    },
    { 
      id: 'image-gallery', 
      name: 'Image', 
      type: 'image', 
      preview: 'Image gallery layout',
      width: 400,
      height: 200
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-surface shadow-2xl border-l border-line z-40 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-line">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Square className="w-5 h-5 text-info" />
            <h3 className="text-xl font-semibold text-ink">Layouts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-shrink-0 p-6 border-b border-line">
        <div className="relative">
          <input
            type="text"
            placeholder="Search layouts..."
            className="w-full pl-10 pr-4 py-3 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 transform ">
            <svg className="w-5 h-5 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Layouts Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4">
          {layouts.map((layout) => (
            <DraggableLayout key={layout.id} layout={layout} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-6 border-t border-line bg-canvas">
        <div className="text-center">
          <p className="text-sm text-dim mb-2">
            🎯 Drag & Drop Layouts
          </p>
          <p className="text-xs text-dim">
            Drag any layout to the canvas to structure your design
          </p>
        </div>
      </div>
    </div>
  );
};

export default LayoutsPanel;
