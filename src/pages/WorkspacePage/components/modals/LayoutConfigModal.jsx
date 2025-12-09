import React, { useState, useEffect, useRef } from 'react';
import { X, Square, Rows, Columns, Grid, Image, Plus, Minus, Upload, Eye, EyeOff, Settings } from 'lucide-react';

const LayoutConfigModal = ({ isOpen, onClose, onConfirm, layoutType, layoutData }) => {
  // Common layout state
  const [layoutTitle, setLayoutTitle] = useState('');
  const [layoutDescription, setLayoutDescription] = useState('');
  
  // Frame layout state
  const [frameItems, setFrameItems] = useState([
    { id: 1, content: 'Content Block 1', type: 'text' },
    { id: 2, content: 'Content Block 2', type: 'text' }
  ]);
  
  // Rows layout state
  const [rows, setRows] = useState([
    { id: 1, content: 'Header Section', height: 'auto', visible: true },
    { id: 2, content: 'Main Content Area', height: 'auto', visible: true },
    { id: 3, content: 'Footer Section', height: 'auto', visible: true }
  ]);
  
  // Columns layout state
  const [columns, setColumns] = useState([
    { id: 1, content: 'Left Sidebar', width: '25%', visible: true },
    { id: 2, content: 'Main Content', width: '50%', visible: true },
    { id: 3, content: 'Right Sidebar', width: '25%', visible: true }
  ]);
  
  // Grid layout state
  const [gridItems, setGridItems] = useState([
    { id: 1, content: 'Grid Item 1', row: 1, col: 1, visible: true },
    { id: 2, content: 'Grid Item 2', row: 1, col: 2, visible: true },
    { id: 3, content: 'Grid Item 3', row: 1, col: 3, visible: true },
    { id: 4, content: 'Grid Item 4', row: 2, col: 1, visible: true }
  ]);
  
  // Image layout state
  const [images, setImages] = useState([
    { id: 1, url: '', alt: 'Image 1', caption: 'Image Caption 1' },
    { id: 2, url: '', alt: 'Image 2', caption: 'Image Caption 2' }
  ]);
  
  const fileInputRef = useRef(null);

  // Initialize default values based on layout type
  useEffect(() => {
    if (isOpen && layoutType) {
      const defaults = getDefaultLayoutConfig(layoutType);
      setLayoutTitle(defaults.title);
      setLayoutDescription(defaults.description);
      
      // Reset state based on layout type
      if (layoutType === 'frame') {
        setFrameItems(defaults.items || frameItems);
      } else if (layoutType === 'rows') {
        setRows(defaults.rows || rows);
      } else if (layoutType === 'columns') {
        setColumns(defaults.columns || columns);
      } else if (layoutType === 'grid' || layoutType === 'grids') {
        setGridItems(defaults.gridItems || gridItems);
      } else if (layoutType === 'image' || layoutType === 'image-placeholder' || layoutType === 'image-gallery') {
        setImages(defaults.images || images);
      }
    }
  }, [isOpen, layoutType]);

  const getDefaultLayoutConfig = (type) => {
    const configs = {
      frame: {
        title: 'Content Frame',
        description: 'Container for grouping related elements',
        items: [
          { id: 1, content: 'Header Content', type: 'text' },
          { id: 2, content: 'Main Content', type: 'text' },
          { id: 3, content: 'Footer Content', type: 'text' }
        ]
      },
      rows: {
        title: 'Row Layout',
        description: 'Horizontal sections for structured content',
        rows: [
          { id: 1, content: 'Navigation Bar', height: 'auto', visible: true },
          { id: 2, content: 'Hero Section', height: 'auto', visible: true },
          { id: 3, content: 'Content Area', height: 'auto', visible: true },
          { id: 4, content: 'Footer', height: 'auto', visible: true }
        ]
      },
      columns: {
        title: 'Column Layout',
        description: 'Vertical sections for organized content',
        columns: [
          { id: 1, content: 'Sidebar Menu', width: '20%', visible: true },
          { id: 2, content: 'Main Content', width: '60%', visible: true },
          { id: 3, content: 'Right Panel', width: '20%', visible: true }
        ]
      },
      grid: {
        title: 'Grid Layout',
        description: 'Organized grid for structured content',
        gridItems: [
          { id: 1, content: 'Dashboard Widget 1', row: 1, col: 1, visible: true },
          { id: 2, content: 'Dashboard Widget 2', row: 1, col: 2, visible: true },
          { id: 3, content: 'Dashboard Widget 3', row: 1, col: 3, visible: true },
          { id: 4, content: 'Analytics Chart', row: 2, col: 1, visible: true },
          { id: 5, content: 'Performance Metrics', row: 2, col: 2, visible: true },
          { id: 6, content: 'Recent Activity', row: 2, col: 3, visible: true }
        ]
      },
      grids: {
        title: 'Grid Layout',
        description: 'Organized grid for structured content',
        gridItems: [
          { id: 1, content: 'Dashboard Widget 1', row: 1, col: 1, visible: true },
          { id: 2, content: 'Dashboard Widget 2', row: 1, col: 2, visible: true },
          { id: 3, content: 'Dashboard Widget 3', row: 1, col: 3, visible: true },
          { id: 4, content: 'Analytics Chart', row: 2, col: 1, visible: true },
          { id: 5, content: 'Performance Metrics', row: 2, col: 2, visible: true },
          { id: 6, content: 'Recent Activity', row: 2, col: 3, visible: true }
        ]
      },
      image: {
        title: 'Image Gallery',
        description: 'Visual content showcase',
        images: [
          { id: 1, url: '', alt: 'Product Image 1', caption: 'Featured Product' },
          { id: 2, url: '', alt: 'Product Image 2', caption: 'Product Gallery' },
          { id: 3, url: '', alt: 'Product Image 3', caption: 'Product Details' }
        ]
      },
      'image-placeholder': {
        title: 'Image Placeholder',
        description: 'Single image container',
        images: [
          { id: 1, url: '', alt: 'Main Image', caption: 'Click to add image' }
        ]
      },
      'image-gallery': {
        title: 'Image Gallery',
        description: 'Multiple image showcase',
        images: [
          { id: 1, url: '', alt: 'Gallery Image 1', caption: 'Gallery Item 1' },
          { id: 2, url: '', alt: 'Gallery Image 2', caption: 'Gallery Item 2' },
          { id: 3, url: '', alt: 'Gallery Image 3', caption: 'Gallery Item 3' },
          { id: 4, url: '', alt: 'Gallery Image 4', caption: 'Gallery Item 4' }
        ]
      }
    };
    
    return configs[type] || configs.frame;
  };

  // Frame functions
  const addFrameItem = () => {
    const newItem = {
      id: Date.now(),
      content: `Content Block ${frameItems.length + 1}`,
      type: 'text'
    };
    setFrameItems([...frameItems, newItem]);
  };

  const removeFrameItem = (id) => {
    if (frameItems.length > 1) {
      setFrameItems(frameItems.filter(item => item.id !== id));
    }
  };

  const updateFrameItem = (id, content) => {
    setFrameItems(frameItems.map(item => 
      item.id === id ? { ...item, content } : item
    ));
  };

  // Rows functions
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      content: `Row ${rows.length + 1}`,
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

  // Columns functions
  const addColumn = () => {
    const newColumn = {
      id: Date.now(),
      content: `Column ${columns.length + 1}`,
      width: `${100 / (columns.length + 1)}%`,
      visible: true
    };
    const updatedColumns = columns.map(col => ({
      ...col,
      width: `${100 / (columns.length + 1)}%`
    }));
    setColumns([...updatedColumns, newColumn]);
  };

  const removeColumn = (id) => {
    if (columns.length > 1) {
      const filteredColumns = columns.filter(col => col.id !== id);
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

  // Grid functions
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

  // Image functions
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

  const handleConfirm = () => {
    const layoutConfig = {
      title: layoutTitle,
      description: layoutDescription,
      type: layoutType,
      customLayoutData: {}
    };

    // Add type-specific data
    if (layoutType === 'frame') {
      layoutConfig.customLayoutData.items = frameItems;
    } else if (layoutType === 'rows') {
      layoutConfig.customLayoutData.rows = rows;
    } else if (layoutType === 'columns') {
      layoutConfig.customLayoutData.columns = columns;
    } else if (layoutType === 'grid' || layoutType === 'grids') {
      layoutConfig.customLayoutData.gridItems = gridItems;
    } else if (layoutType === 'image' || layoutType === 'image-placeholder' || layoutType === 'image-gallery') {
      layoutConfig.customLayoutData.images = images;
    }

    onConfirm(layoutConfig);
  };

  const handleUseDefault = () => {
    const defaults = getDefaultLayoutConfig(layoutType);
    const layoutConfig = {
      title: defaults.title,
      description: defaults.description,
      type: layoutType,
      customLayoutData: {
        items: defaults.items,
        rows: defaults.rows,
        columns: defaults.columns,
        gridItems: defaults.gridItems,
        images: defaults.images
      }
    };

    onConfirm(layoutConfig);
  };

  const getLayoutIcon = (type) => {
    switch (type) {
      case 'frame': return <Square className="w-5 h-5" />;
      case 'rows': return <Rows className="w-5 h-5" />;
      case 'columns': return <Columns className="w-5 h-5" />;
      case 'grid':
      case 'grids': return <Grid className="w-5 h-5" />;
      case 'image':
      case 'image-placeholder':
      case 'image-gallery': return <Image className="w-5 h-5" />;
      default: return <Square className="w-5 h-5" />;
    }
  };

  const renderLayoutSpecificConfig = () => {
    switch (layoutType) {
      case 'frame':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Frame Content Items</h4>
              <button
                onClick={addFrameItem}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {frameItems.map((item, index) => (
                <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                  <span className="text-sm font-medium text-gray-600 w-8">{index + 1}.</span>
                  <input
                    type="text"
                    value={item.content}
                    onChange={(e) => updateFrameItem(item.id, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Content description"
                  />
                  <button
                    onClick={() => removeFrameItem(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    disabled={frameItems.length === 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'rows':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Row Configuration</h4>
              <button
                onClick={addRow}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {rows.map((row, index) => (
                <div key={row.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                  <span className="text-sm font-medium text-gray-600 w-8">{index + 1}.</span>
                  <input
                    type="text"
                    value={row.content}
                    onChange={(e) => updateRow(row.id, 'content', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Row content"
                  />
                  <button
                    onClick={() => toggleRowVisibility(row.id)}
                    className={`p-1 rounded transition-colors ${
                      row.visible ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={row.visible ? 'Hide row' : 'Show row'}
                  >
                    {row.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    disabled={rows.length === 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'columns':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Column Configuration</h4>
              <button
                onClick={addColumn}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Column</span>
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {columns.map((col, index) => (
                <div key={col.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                  <span className="text-sm font-medium text-gray-600 w-8">{index + 1}.</span>
                  <input
                    type="text"
                    value={col.content}
                    onChange={(e) => updateColumn(col.id, 'content', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Column content"
                  />
                  <span className="text-xs text-gray-500 w-12">{col.width}</span>
                  <button
                    onClick={() => toggleColumnVisibility(col.id)}
                    className={`p-1 rounded transition-colors ${
                      col.visible ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={col.visible ? 'Hide column' : 'Show column'}
                  >
                    {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeColumn(col.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    disabled={columns.length === 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'grid':
      case 'grids':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Grid Items</h4>
              <button
                onClick={addGridItem}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gridItems.map((item, index) => (
                <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                  <span className="text-sm font-medium text-gray-600 w-8">{index + 1}.</span>
                  <input
                    type="text"
                    value={item.content}
                    onChange={(e) => updateGridItem(item.id, 'content', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Grid item content"
                  />
                  <button
                    onClick={() => toggleGridItemVisibility(item.id)}
                    className={`p-1 rounded transition-colors ${
                      item.visible ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={item.visible ? 'Hide item' : 'Show item'}
                  >
                    {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeGridItem(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    disabled={gridItems.length === 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'image':
      case 'image-placeholder':
      case 'image-gallery':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Image Configuration</h4>
              <button
                onClick={addImage}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Image</span>
              </button>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {images.map((img, index) => (
                <div key={img.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Image {index + 1}</span>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      disabled={images.length === 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={img.alt}
                      onChange={(e) => updateImage(img.id, 'alt', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Image alt text"
                    />
                    <input
                      type="text"
                      value={img.caption}
                      onChange={(e) => updateImage(img.id, 'caption', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Image caption"
                    />
                    <input
                      type="text"
                      value={img.url}
                      onChange={(e) => updateImage(img.id, 'url', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Image URL (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {getLayoutIcon(layoutType)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Configure Layout</h2>
              <p className="text-sm text-gray-500">Set up your {layoutType} layout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Layout Title
                </label>
                <input
                  type="text"
                  value={layoutTitle}
                  onChange={(e) => setLayoutTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter layout title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={layoutDescription}
                  onChange={(e) => setLayoutDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Brief description of the layout purpose"
                />
              </div>
            </div>

            {/* Layout-specific Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Configuration</h3>
              {renderLayoutSpecificConfig()}
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
              <div className="text-sm text-gray-600">
                <p><strong>Title:</strong> {layoutTitle || 'Untitled Layout'}</p>
                <p><strong>Type:</strong> {layoutType}</p>
                <p><strong>Items:</strong> {
                  layoutType === 'frame' ? frameItems.length :
                  layoutType === 'rows' ? rows.length :
                  layoutType === 'columns' ? columns.length :
                  (layoutType === 'grid' || layoutType === 'grids') ? gridItems.length :
                  images.length
                } configured</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleUseDefault}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Use Default
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutConfigModal;
