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
          <h4 className="font-medium text-ink">Grouped Elements Grid</h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUngroupElements}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-danger/10 hover:bg-danger/10 text-danger rounded transition-colors"
              title="Break apart this grouped grid back into individual elements"
            >
              <Minus className="w-3 h-3" />
              <span>Ungroup</span>
            </button>
            <div className="text-xs text-dim">
              {gridData.filter(item => item.visible).length} elements • {maxCol}×{maxRow} grid
            </div>
          </div>
        </div>
        
        <div 
          className="grid gap-3 p-3 bg-canvas rounded-lg border-2 border-dashed border-line"
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
                  ? 'border-info/30 bg-surface ' 
                  : 'border-line bg-surface-hover'
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
                <div className="h-full flex items-center justify-center text-dim text-xs">
                  Empty Cell
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="text-xs text-dim text-center">
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
        <div className="text-center text-dim text-xs p-2">
          <div className="font-medium">{gridItem.content}</div>
          <div className="text-dim">Original element data not available</div>
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
          <div className="text-center text-dim text-xs p-2">
            <div className="font-medium">{gridItem.content}</div>
            <div className="text-dim">{originalData.type || 'Unknown'} element</div>
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
      if (type?.includes('table')) return { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', accent: 'bg-success/10' };
      if (type?.includes('chart')) return { bg: 'bg-surface-hover', border: 'border-line', text: 'text-ink', accent: 'bg-surface-hover' };
      if (type?.includes('list')) return { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', accent: 'bg-warning/10' };
      if (type?.includes('calendar')) return { bg: 'bg-info/10', border: 'border-info/20', text: 'text-info', accent: 'bg-info/10' };
      if (type?.includes('material')) return { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', accent: 'bg-warning/10' };
      return { bg: 'bg-info/10', border: 'border-info/20', text: 'text-info', accent: 'bg-info/10' };
    };
    
    const style = getElementStyle(elementType);
    
    return (
      <div className={`h-full border ${style.border} rounded p-2 ${style.bg}`}>
        <div className={`text-xs font-medium ${style.text} mb-1 truncate`}>
          {data.name || `${elementType} Element`}
        </div>
        <div className="text-xs text-dim mb-2">
          {elementType?.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
        {data.preview && (
          <div className="text-xs text-dim mb-2 truncate">
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
      <div className="h-full border border-success/20 rounded p-2 bg-success/10">
        <div className="text-xs font-medium text-success mb-1 truncate">
          {data.name || `${layoutType} Layout`}
        </div>
        <div className="text-xs text-success mb-2">
          {layoutType?.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Layout
        </div>
        {data.preview && (
          <div className="text-xs text-dim mb-2 truncate">
            {data.preview}
          </div>
        )}
        <div className="text-xs text-success bg-success/10 rounded px-2 py-1 text-center">
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
      <div className="h-full border border-line rounded p-2 bg-surface-hover">
        <div className="text-xs font-medium text-ink mb-1 truncate">
          {data.name || 'Text Element'}
        </div>
        <div className="text-xs text-ink mb-2">
          {getTextIcon(textType)}
        </div>
        {textContent && (
          <div className="text-xs text-ink mb-2 p-2 bg-surface rounded border max-h-12 overflow-hidden">
            {textContent.substring(0, 60)}{textContent.length > 60 ? '...' : ''}
          </div>
        )}
        <div className="text-xs text-ink bg-surface-hover rounded px-2 py-1 text-center">
          📝 Formatted Text
        </div>
      </div>
    );
  };

  // Render different layout types
  const renderFrameLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink">Frame Container</h4>
        <button
          onClick={addFrameItem}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-info/10 hover:bg-info/10 text-info rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Item</span>
        </button>
      </div>
      
      <div className="border-2 border-dashed border-line rounded-lg p-3 min-h-[120px] bg-canvas">
        <div className="space-y-2">
          {frameItems.map((item, index) => (
            <div key={item.id} className="group flex items-center space-x-2 p-2 bg-surface rounded border">
              <div className="flex-1">
                <input
                  type="text"
                  value={item.content}
                  onChange={(e) => updateFrameItem(item.id, e.target.value)}
                  className="w-full text-sm bg-transparent border-none outline-none focus:bg-canvas focus:rounded px-2 py-1"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFrameItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-danger hover:text-danger transition-opacity"
                disabled={frameItems.length === 1}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-xs text-dim text-center">
        {frameItems.length} item{frameItems.length !== 1 ? 's' : ''} • Click items to edit
      </div>
    </div>
  );

  const renderRowsLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink">Row Layout</h4>
        <button
          onClick={addRow}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-info/10 hover:bg-info/10 text-info rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Row</span>
        </button>
      </div>
      
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className={`group border rounded-lg p-2 transition-all ${
            row.visible ? 'bg-info/10 border-info/20' : 'bg-surface-hover border-line opacity-50'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Rows className="w-3 h-3 text-info" />
                <span className="text-xs font-medium text-dim">Row {index + 1}</span>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={row.content}
                  onChange={(e) => updateRow(row.id, 'content', e.target.value)}
                  className="w-full text-xs bg-transparent border-none outline-none focus:bg-surface focus:border focus:border-info/30 focus:rounded px-2 py-1"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowVisibility(row.id);
                  }}
                  className="text-dim hover:text-ink"
                  title={row.visible ? 'Hide row' : 'Show row'}
                >
                  {row.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRow(row.id);
                  }}
                  className="text-danger hover:text-danger"
                  disabled={rows.length === 1}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-dim text-center">
        {rows.filter(r => r.visible).length} visible row{rows.filter(r => r.visible).length !== 1 ? 's' : ''} • {rows.length} total
      </div>
    </div>
  );

  const renderColumnsLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink">Column Layout</h4>
        <button
          onClick={addColumn}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-info/10 hover:bg-info/10 text-info rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Column</span>
        </button>
      </div>
      
      <div className="flex space-x-2 min-h-[100px]">
        {columns.map((col, index) => (
          <div key={col.id} className={`group border rounded-lg p-2 transition-all ${
            col.visible ? 'bg-success/10 border-success/20' : 'bg-surface-hover border-line opacity-50'
          }`} style={{ width: col.width }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Columns className="w-3 h-3 text-success" />
                  <span className="text-xs font-medium text-dim">Col {index + 1}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColumnVisibility(col.id);
                    }}
                    className="text-dim hover:text-ink"
                    title={col.visible ? 'Hide column' : 'Show column'}
                  >
                    {col.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColumn(col.id);
                    }}
                    className="text-danger hover:text-danger"
                    disabled={columns.length === 1}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <textarea
                value={col.content}
                onChange={(e) => updateColumn(col.id, 'content', e.target.value)}
                className="w-full text-xs bg-transparent border-none outline-none focus:bg-surface focus:border focus:border-success/30 focus:rounded px-2 py-1 resize-none"
                rows="3"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="text-xs text-dim">{col.width}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-dim text-center">
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
          <h4 className="font-medium text-ink">Grid Layout</h4>
          <button
            onClick={addGridItem}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-info/10 hover:bg-info/10 text-info rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Item</span>
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {gridItems.map((item, index) => (
            <div key={item.id} className={`group border rounded-lg p-2 min-h-[60px] transition-all ${
              item.visible ? 'bg-surface-hover border-line' : 'bg-surface-hover border-line opacity-50'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Grid className="w-3 h-3 text-ink" />
                    <span className="text-xs font-medium text-dim">{index + 1}</span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGridItemVisibility(item.id);
                      }}
                      className="text-dim hover:text-ink"
                      title={item.visible ? 'Hide item' : 'Show item'}
                    >
                      {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGridItem(item.id);
                      }}
                      className="text-danger hover:text-danger"
                      disabled={gridItems.length === 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={item.content}
                  onChange={(e) => updateGridItem(item.id, 'content', e.target.value)}
                  className="w-full text-xs bg-transparent border-none outline-none focus:bg-surface focus:border focus:border-line focus:rounded px-1 py-1 resize-none"
                  rows="2"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-dim text-center">
          {gridItems.filter(i => i.visible).length} visible item{gridItems.filter(i => i.visible).length !== 1 ? 's' : ''} • {gridItems.length} total
        </div>
      </div>
    );
  };

  const renderImageLayout = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink">Image Gallery</h4>
        <button
          onClick={addImage}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-info/10 hover:bg-info/10 text-info rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add Image</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, index) => (
          <div key={img.id} className="group border rounded-lg p-2 bg-canvas">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Image className="w-3 h-3 text-dim" />
                  <span className="text-xs font-medium text-dim">Image {index + 1}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-danger hover:text-danger transition-opacity"
                  disabled={images.length === 1}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              
              <div 
                className="w-full h-20 bg-surface-hover rounded border-2 border-dashed border-line flex items-center justify-center cursor-pointer hover:bg-surface-hover transition-colors"
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
                    <Upload className="w-4 h-4 mx-auto mb-1 text-dim" />
                    <span className="text-xs text-dim">Click to upload</span>
                  </div>
                )}
              </div>
              
              <input
                type="text"
                value={img.caption}
                onChange={(e) => updateImage(img.id, 'caption', e.target.value)}
                className="w-full text-xs bg-surface border border-line rounded px-2 py-1 focus:ring-2 focus:ring-info focus:border-info"
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
      
      <div className="text-xs text-dim text-center">
        {images.length} image{images.length !== 1 ? 's' : ''} • Click to upload or edit captions
      </div>
    </div>
  );

  // Group Container Layout Renderer
  const renderGroupContainerLayout = () => {
    const childNodes = data?.customLayoutData?.childNodes || [];
    const containerStyle = data?.containerStyle || {};
    const gridConfig = data?.gridConfig || { columns: 2, rows: 1 };
    
    return (
      <div className="h-full flex flex-col">
        {/* Group Container Header */}
        <div 
          className="px-4 py-3 rounded-t-xl flex items-center justify-between"
          style={{
            backgroundColor: containerStyle.headerColor || '#3b82f6',
            color: 'white'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base">{data?.name || 'Grouped Elements'}</span>
              <div className="text-xs text-white/80">
                {gridConfig.columns} columns × {gridConfig.rows} rows
              </div>
            </div>
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
            {childNodes.length} items
          </span>
        </div>
        
        {/* Group Container Body - Grid visualization */}
        <div 
          className="flex-1 p-4 rounded-b-xl relative"
          style={{
            backgroundColor: containerStyle.backgroundColor || '#f0f9ff',
            minHeight: 200
          }}
        >
          {/* Grid lines visualization */}
          <div 
            className="absolute inset-4 pointer-events-none"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridConfig.columns}, 1fr)`,
              gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
              gap: '8px'
            }}
          >
            {Array.from({ length: gridConfig.columns * gridConfig.rows }).map((_, idx) => (
              <div 
                key={idx}
                className="border-2 border-dashed border-info/20 rounded-lg bg-white/50"
              />
            ))}
          </div>
          
          {/* Info text */}
          <div className="absolute bottom-2 left-4 right-4 text-center">
            <p className="text-xs text-info font-medium">
              📦 Elements are arranged in {gridConfig.columns}×{gridConfig.rows} grid
            </p>
          </div>
        </div>
      </div>
    );
  };

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
      case 'group-container':
        return renderGroupContainerLayout();
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
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
        <div className="flex items-center space-x-2">
          <Square className="w-4 h-4 text-info" />
          <input
            type="text"
            value={layoutTitle}
            onChange={(e) => setLayoutTitle(e.target.value)}
            className="font-medium text-ink bg-transparent border-none outline-none focus:bg-surface focus:border focus:border-info/30 focus:rounded px-2 py-1"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(!isEditing);
          }}
          className={`p-1 rounded transition-colors ${
            isEditing ? 'bg-info/10 text-info' : 'text-dim hover:text-ink'
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
      <div className="text-center text-xs text-dim pt-2 border-t border-line">
        Interactive {actualLayoutType} layout • Click elements to customize
      </div>
    </div>
  );
};

export default LayoutRenderer;

