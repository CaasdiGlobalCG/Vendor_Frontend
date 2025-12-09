import React, { useState, useRef } from 'react';
import { Plus, Minus, Edit3, Move, Trash2, Upload, Image, Grid, Columns, Rows, Square, Settings, Eye, EyeOff } from 'lucide-react';

const LayoutRenderer = ({ data, layoutType }) => {
  // Use data.id as the primary layoutType, fallback to layoutType prop
  const actualLayoutType = data?.id || layoutType;
  
  // Common state for all layouts
  const [isEditing, setIsEditing] = useState(false);
  const [layoutTitle, setLayoutTitle] = useState(data?.name || 'Layout');
  
  // Frame layout state
  const [frameItems, setFrameItems] = useState(
    data?.customLayoutData?.items || [
      { id: 1, content: 'Content Block 1', type: 'text' },
      { id: 2, content: 'Content Block 2', type: 'text' }
    ]
  );
  
  // Rows layout state
  const [rows, setRows] = useState(
    data?.customLayoutData?.rows || [
      { id: 1, content: 'Header Section', height: 'auto', visible: true },
      { id: 2, content: 'Main Content Area', height: 'auto', visible: true },
      { id: 3, content: 'Footer Section', height: 'auto', visible: true }
    ]
  );
  
  // Columns layout state
  const [columns, setColumns] = useState(
    data?.customLayoutData?.columns || [
      { id: 1, content: 'Left Sidebar', width: '25%', visible: true },
      { id: 2, content: 'Main Content', width: '50%', visible: true },
      { id: 3, content: 'Right Sidebar', width: '25%', visible: true }
    ]
  );
  
  // Grid layout state
  const [gridItems, setGridItems] = useState(
    data?.customLayoutData?.gridItems || [
      { id: 1, content: 'Grid Item 1', row: 1, col: 1, visible: true },
      { id: 2, content: 'Grid Item 2', row: 1, col: 2, visible: true },
      { id: 3, content: 'Grid Item 3', row: 1, col: 3, visible: true },
      { id: 4, content: 'Grid Item 4', row: 2, col: 1, visible: true },
      { id: 5, content: 'Grid Item 5', row: 2, col: 2, visible: true },
      { id: 6, content: 'Grid Item 6', row: 2, col: 3, visible: true }
    ]
  );
  
  // Image layout state
  const [images, setImages] = useState(
    data?.customLayoutData?.images || [
      { id: 1, url: '', alt: 'Image 1', caption: 'Image Caption 1' },
      { id: 2, url: '', alt: 'Image 2', caption: 'Image Caption 2' }
    ]
  );
  const fileInputRef = useRef(null);

  // Frame Layout Functions
  const addFrameItem = () => {
    const newItem = {
      id: Date.now(),
      content: `New Content Block ${frameItems.length + 1}`,
      type: 'text'
    };
    setFrameItems([...frameItems, newItem]);
  };

  const removeFrameItem = (id) => {
    if (frameItems.length > 1) {
      setFrameItems(frameItems.filter(item => item.id !== id));
    }
  };

  const updateFrameItem = (id, newContent) => {
    setFrameItems(frameItems.map(item => 
      item.id === id ? { ...item, content: newContent } : item
    ));
  };

  // Rows Layout Functions
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      content: `New Row ${rows.length + 1}`,
      height: 'auto',
      visible: true
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const toggleRowVisibility = (id) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, visible: !row.visible } : row
    ));
  };

  // Columns Layout Functions
  const addColumn = () => {
    const newColumn = {
      id: Date.now(),
      content: `New Column ${columns.length + 1}`,
      width: `${100 / (columns.length + 1)}%`,
      visible: true
    };
    // Redistribute widths
    const updatedColumns = columns.map(col => ({
      ...col,
      width: `${100 / (columns.length + 1)}%`
    }));
    setColumns([...updatedColumns, newColumn]);
  };

  const removeColumn = (id) => {
    if (columns.length > 1) {
      const filteredColumns = columns.filter(col => col.id !== id);
      // Redistribute widths
      const updatedColumns = filteredColumns.map(col => ({
        ...col,
        width: `${100 / filteredColumns.length}%`
      }));
      setColumns(updatedColumns);
    }
  };

  const updateColumn = (id, field, value) => {
    setColumns(columns.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
  };

  const toggleColumnVisibility = (id) => {
    setColumns(columns.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    ));
  };

  // Grid Layout Functions
  const addGridItem = () => {
    const newItem = {
      id: Date.now(),
      content: `Grid Item ${gridItems.length + 1}`,
      row: Math.ceil((gridItems.length + 1) / 3),
      col: ((gridItems.length) % 3) + 1,
      visible: true
    };
    setGridItems([...gridItems, newItem]);
  };

  const removeGridItem = (id) => {
    if (gridItems.length > 1) {
      setGridItems(gridItems.filter(item => item.id !== id));
    }
  };

  const updateGridItem = (id, field, value) => {
    setGridItems(gridItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleGridItemVisibility = (id) => {
    setGridItems(gridItems.map(item => 
      item.id === id ? { ...item, visible: !item.visible } : item
    ));
  };

  // Image Layout Functions
  const addImage = () => {
    const newImage = {
      id: Date.now(),
      url: '',
      alt: `Image ${images.length + 1}`,
      caption: `Image Caption ${images.length + 1}`
    };
    setImages([...images, newImage]);
  };

  const removeImage = (id) => {
    if (images.length > 1) {
      setImages(images.filter(img => img.id !== id));
    }
  };

  const updateImage = (id, field, value) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, [field]: value } : img
    ));
  };

  const handleImageUpload = (id, event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateImage(id, 'url', url);
    }
  };

  // Handle ungrouping elements
  const handleUngroupElements = () => {
    if (data?.isGroupedGrid && data?.originalNodes) {
      // Dispatch custom event to notify CanvasWorkspace to ungroup
      const ungroupEvent = new CustomEvent('ungroupElements', {
        detail: {
          groupedNodeId: data.nodeId, // We'll need to pass this
          originalNodes: data.originalNodes
        }
      });
      document.dispatchEvent(ungroupEvent);
      console.log('📤 Ungroup event dispatched for grouped grid');
    }
  };

  // Render grouped grid with original elements embedded in cells
  const renderGroupedGrid = () => {
    const gridData = data?.customLayoutData?.gridItems || [];
    const originalNodes = data?.originalNodes || [];
    
    // Calculate grid dimensions
    const maxRow = Math.max(...gridData.map(item => item.row), 1);
    const maxCol = Math.max(...gridData.map(item => item.col), 1);
    
    // Create grid cells
    const gridCells = [];
    for (let row = 1; row <= maxRow; row++) {
      for (let col = 1; col <= maxCol; col++) {
        const gridItem = gridData.find(item => item.row === row && item.col === col && item.visible);
        gridCells.push({
          row,
          col,
          gridItem,
          key: `${row}-${col}`
        });
      }
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Grouped Elements Grid</h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUngroupElements}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
              title="Break apart this grouped grid back into individual elements"
            >
              <Minus className="w-3 h-3" />
              <span>Ungroup</span>
            </button>
            <div className="text-xs text-gray-500">
              {gridData.filter(item => item.visible).length} elements • {maxCol}×{maxRow} grid
            </div>
          </div>
        </div>
        
        <div 
          className="grid gap-3 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
          style={{ 
            gridTemplateColumns: `repeat(${maxCol}, 1fr)`,
            gridTemplateRows: `repeat(${maxRow}, 1fr)`
          }}
        >
          {gridCells.map(({ row, col, gridItem, key }) => (
            <div
              key={key}
              className={`border-2 rounded-lg p-2 min-h-[120px] transition-all ${
                gridItem 
                  ? 'border-blue-300 bg-white shadow-sm' 
                  : 'border-gray-200 bg-gray-100'
              }`}
              style={{ 
                gridRow: row, 
                gridColumn: col 
              }}
            >
              {gridItem ? (
                <div className="h-full">
                  {renderOriginalElement(gridItem)}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                  Empty Cell
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Original elements preserved within grid structure • Move as single unit
        </div>
      </div>
    );
  };

  // Render original element within grid cell
  const renderOriginalElement = (gridItem) => {
    const originalData = gridItem.originalData;
    const originalType = gridItem.originalType;
    
    console.log('🎨 Rendering original element:', {
      gridItem,
      originalData,
      originalType
    });
    
    if (!originalData) {
      return (
        <div className="text-center text-gray-500 text-xs p-2">
          <div className="font-medium">{gridItem.content}</div>
          <div className="text-gray-400">Original element data not available</div>
        </div>
      );
    }

    // Render based on original element type
    switch (originalType) {
      case 'elementNode':
        return renderEmbeddedElement(originalData);
      case 'layoutNode':
        return renderEmbeddedLayout(originalData);
      case 'textNode':
        return renderEmbeddedText(originalData);
      default:
        return (
          <div className="text-center text-gray-500 text-xs p-2">
            <div className="font-medium">{gridItem.content}</div>
            <div className="text-gray-400">{originalData.type || 'Unknown'} element</div>
          </div>
        );
    }
  };

  // Render embedded element (simplified version)
  const renderEmbeddedElement = (data) => {
    // Handle different element types with more specific rendering
    const elementType = data.type || data.id;
    
    // Get appropriate icon and color based on element type
    const getElementStyle = (type) => {
      if (type?.includes('table')) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', accent: 'bg-green-100' };
      if (type?.includes('chart')) return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: 'bg-purple-100' };
      if (type?.includes('list')) return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', accent: 'bg-orange-100' };
      if (type?.includes('calendar')) return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', accent: 'bg-indigo-100' };
      if (type?.includes('material')) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', accent: 'bg-amber-100' };
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'bg-blue-100' };
    };
    
    const style = getElementStyle(elementType);
    
    return (
      <div className={`h-full border ${style.border} rounded p-2 ${style.bg}`}>
        <div className={`text-xs font-medium ${style.text} mb-1 truncate`}>
          {data.name || `${elementType} Element`}
        </div>
        <div className="text-xs text-gray-600 mb-2">
          {elementType?.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
        {data.preview && (
          <div className="text-xs text-gray-500 mb-2 truncate">
            {data.preview}
          </div>
        )}
        <div className={`text-xs ${style.text} ${style.accent} rounded px-2 py-1 text-center`}>
          {elementType?.includes('table') && '📊 Table Data'}
          {elementType?.includes('chart') && '📈 Chart Visualization'}
          {elementType?.includes('list') && '📝 Interactive List'}
          {elementType?.includes('calendar') && '📅 Calendar View'}
          {elementType?.includes('material') && '📦 Material Request'}
          {!elementType?.match(/(table|chart|list|calendar|material)/) && '🔧 Interactive Element'}
        </div>
      </div>
    );
  };

  // Render embedded layout (simplified version)
  const renderEmbeddedLayout = (data) => {
    const layoutType = data.type || 'layout';
    const getLayoutIcon = (type) => {
      switch (type) {
        case 'frame': return '🖼️ Frame';
        case 'rows': return '📋 Rows';
        case 'columns': return '📊 Columns';
        case 'grid': return '⚏ Grid';
        case 'image': return '🖼️ Image';
        default: return '📐 Layout';
      }
    };
    
    return (
      <div className="h-full border border-green-200 rounded p-2 bg-green-50">
        <div className="text-xs font-medium text-green-800 mb-1 truncate">
          {data.name || `${layoutType} Layout`}
        </div>
        <div className="text-xs text-green-600 mb-2">
          {layoutType?.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Layout
        </div>
        {data.preview && (
          <div className="text-xs text-gray-500 mb-2 truncate">
            {data.preview}
          </div>
        )}
        <div className="text-xs text-green-700 bg-green-100 rounded px-2 py-1 text-center">
          {getLayoutIcon(layoutType)}
        </div>
      </div>
    );
  };

  // Render embedded text (simplified version)
  const renderEmbeddedText = (data) => {
    const textContent = data.content || data.text || 'Sample text content';
    const textType = data.textType || 'text';
    
    const getTextIcon = (type) => {
      switch (type) {
        case 'heading': return '📝 Heading';
        case 'paragraph': return '📄 Paragraph';
        case 'quote': return '💬 Quote';
        case 'code': return '💻 Code';
        default: return '📝 Text';
      }
    };
    
    return (
      <div className="h-full border border-purple-200 rounded p-2 bg-purple-50">
        <div className="text-xs font-medium text-purple-800 mb-1 truncate">
          {data.name || 'Text Element'}
        </div>
        <div className="text-xs text-purple-600 mb-2">
          {getTextIcon(textType)}
        </div>
        {textContent && (
          <div className="text-xs text-gray-700 mb-2 p-2 bg-white rounded border max-h-12 overflow-hidden">
            {textContent.substring(0, 60)}{textContent.length > 60 ? '...' : ''}
          </div>
        )}
        <div className="text-xs text-purple-700 bg-purple-100 rounded px-2 py-1 text-center">
          📝 Formatted Text
        </div>
      </div>
    );
  };

  // Render different layout types
  const renderFrameLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Frame Container</h4>
        <button
          onClick={addFrameItem}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Item</span>
        </button>
      </div>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 min-h-[120px] bg-gray-50">
        <div className="space-y-2">
          {frameItems.map((item, index) => (
            <div key={item.id} className="group flex items-center space-x-2 p-2 bg-white rounded border">
              <div className="flex-1">
                <input
                  type="text"
                  value={item.content}
                  onChange={(e) => updateFrameItem(item.id, e.target.value)}
                  className="w-full text-sm bg-transparent border-none outline-none focus:bg-gray-50 focus:rounded px-2 py-1"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFrameItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                disabled={frameItems.length === 1}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {frameItems.length} item{frameItems.length !== 1 ? 's' : ''} • Click items to edit
      </div>
    </div>
  );

  const renderRowsLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Row Layout</h4>
        <button
          onClick={addRow}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Row</span>
        </button>
      </div>
      
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className={`group border rounded-lg p-2 transition-all ${
            row.visible ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200 opacity-50'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Rows className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-gray-600">Row {index + 1}</span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={row.content}
                  onChange={(e) => updateRow(row.id, 'content', e.target.value)}
                  className="w-full text-xs bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowVisibility(row.id);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  title={row.visible ? 'Hide row' : 'Show row'}
                >
                  {row.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRow(row.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                  disabled={rows.length === 1}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {rows.filter(r => r.visible).length} visible row{rows.filter(r => r.visible).length !== 1 ? 's' : ''} • {rows.length} total
      </div>
    </div>
  );

  const renderColumnsLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Column Layout</h4>
        <button
          onClick={addColumn}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Column</span>
        </button>
      </div>
      
      <div className="flex space-x-2 min-h-[100px]">
        {columns.map((col, index) => (
          <div key={col.id} className={`group border rounded-lg p-2 transition-all ${
            col.visible ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200 opacity-50'
          }`} style={{ width: col.width }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Columns className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-medium text-gray-600">Col {index + 1}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColumnVisibility(col.id);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    title={col.visible ? 'Hide column' : 'Show column'}
                  >
                    {col.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColumn(col.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                    disabled={columns.length === 1}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <textarea
                value={col.content}
                onChange={(e) => updateColumn(col.id, 'content', e.target.value)}
                className="w-full text-xs bg-transparent border-none outline-none focus:bg-white focus:border focus:border-green-300 focus:rounded px-2 py-1 resize-none"
                rows="3"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="text-xs text-gray-500">{col.width}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {columns.filter(c => c.visible).length} visible column{columns.filter(c => c.visible).length !== 1 ? 's' : ''} • {columns.length} total
      </div>
    </div>
  );

  const renderGridLayout = () => {
    // Check if this is a grouped grid with original elements
    const isGroupedGrid = data?.isGroupedGrid && data?.originalNodes;
    
    if (isGroupedGrid) {
      return renderGroupedGrid();
    }
    
    // Regular grid layout
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Grid Layout</h4>
          <button
            onClick={addGridItem}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Item</span>
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {gridItems.map((item, index) => (
            <div key={item.id} className={`group border rounded-lg p-2 min-h-[60px] transition-all ${
              item.visible ? 'bg-purple-50 border-purple-200' : 'bg-gray-100 border-gray-200 opacity-50'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Grid className="w-3 h-3 text-purple-600" />
                    <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGridItemVisibility(item.id);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      title={item.visible ? 'Hide item' : 'Show item'}
                    >
                      {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGridItem(item.id);
                      }}
                      className="text-red-500 hover:text-red-700"
                      disabled={gridItems.length === 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={item.content}
                  onChange={(e) => updateGridItem(item.id, 'content', e.target.value)}
                  className="w-full text-xs bg-transparent border-none outline-none focus:bg-white focus:border focus:border-purple-300 focus:rounded px-1 py-1 resize-none"
                  rows="2"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          {gridItems.filter(i => i.visible).length} visible item{gridItems.filter(i => i.visible).length !== 1 ? 's' : ''} • {gridItems.length} total
        </div>
      </div>
    );
  };

  const renderImageLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Image Gallery</h4>
        <button
          onClick={addImage}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Image</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, index) => (
          <div key={img.id} className="group border rounded-lg p-2 bg-gray-50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Image className="w-3 h-3 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600">Image {index + 1}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                  disabled={images.length === 1}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              
              <div 
                className="w-full h-20 bg-gray-200 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                {img.url ? (
                  <img 
                    src={img.url} 
                    alt={img.alt}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                    <span className="text-xs text-gray-500">Click to upload</span>
                  </div>
                )}
              </div>
              
              <input
                type="text"
                value={img.caption}
                onChange={(e) => updateImage(img.id, 'caption', e.target.value)}
                className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Image caption"
                onClick={(e) => e.stopPropagation()}
              />
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(img.id, e)}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {images.length} image{images.length !== 1 ? 's' : ''} • Click to upload or edit captions
      </div>
    </div>
  );

  // Render the appropriate layout type
  const renderLayout = () => {
    switch (actualLayoutType) {
      case 'frame':
        return renderFrameLayout();
      case 'rows':
        return renderRowsLayout();
      case 'columns':
        return renderColumnsLayout();
      case 'grid':
      case 'grids':
        return renderGridLayout();
      case 'image':
      case 'image-placeholder':
      case 'image-gallery':
        return renderImageLayout();
      default:
        return renderFrameLayout();
    }
  };

  return (
    <div className="w-full">
      {/* Layout Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Square className="w-4 h-4 text-blue-600" />
          <input
            type="text"
            value={layoutTitle}
            onChange={(e) => setLayoutTitle(e.target.value)}
            className="font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(!isEditing);
          }}
          className={`p-1 rounded transition-colors ${
            isEditing ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
          }`}
          title={isEditing ? 'Exit edit mode' : 'Enter edit mode'}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Layout Content */}
      <div className="mb-4">
        {renderLayout()}
      </div>

      {/* Layout Info */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
        Interactive {actualLayoutType} layout • Click elements to customize
      </div>
    </div>
  );
};

export default LayoutRenderer;

