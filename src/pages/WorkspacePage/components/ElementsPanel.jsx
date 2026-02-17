import React, { useRef, useState } from 'react';
import { Grid, Table, BarChart3, Square, List, X, GitBranch, Package, Upload, FileText, Image, FileSpreadsheet, Plus, File, Settings, Workflow, FileDigit, FileCheck, Clock, AlertCircle, ClipboardList, FileSpreadsheet as FileSpreadsheetIcon, Sparkles, Calendar, CheckCircle, StickyNote, ClipboardCheck, Minus, ArrowDown, Box, LayoutGrid, CheckSquare, TrendingUp, Calculator, Layers } from 'lucide-react';
import { useUpload } from './forms/UploadManager';
import ManageBOQModal from './ManageBOQModal';

// Get file type icon
const getFileIcon = (fileName) => {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
    return Image;
  } else if (['xlsx', 'xls', 'csv', 'ods'].includes(extension)) {
    return FileSpreadsheet;
  } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return FileText;
  } else {
    return File;
  }
};

// Get file type color
const getFileTypeColor = (fileName) => {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
    return 'bg-green-100 border-green-300 text-green-800';
  } else if (['xlsx', 'xls', 'csv', 'ods'].includes(extension)) {
    return 'bg-emerald-100 border-emerald-300 text-emerald-800';
  } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return 'bg-blue-100 border-blue-300 text-blue-800';
  } else {
    return 'bg-gray-100 border-gray-300 text-gray-800';
  }
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Draggable File Card Component
const DraggableFileCard = ({ file }) => {
  const { removeFile } = useUpload();
  const FileIcon = getFileIcon(file.name);
  const colorClass = getFileTypeColor(file.name);
  const isImage = file.type?.startsWith('image/');

  const handleDragStart = (event) => {
    // Create a file element that can be dropped on canvas
    const fileElement = {
      id: `file_${file.id}`,
      name: file.name,
      type: 'file',
      preview: `Uploaded file: ${file.name}`,
      fileData: {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        uploadedAt: file.uploadedAt
      }
    };
    
    const fileJson = JSON.stringify(fileElement);
    event.dataTransfer.setData('application/json', fileJson);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', file.name);
    
    // Set drag image
    const dragImage = new Image();
    dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%233b82f6" width="60" height="60" rx="8"/%3E%3Ctext x="30" y="30" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E📄%3C/text%3E%3C/svg%3E';
    event.dataTransfer.setDragImage(dragImage, 30, 30);
    
    console.log('📁 File drag started:', fileElement);
  };

  const handleDoubleClick = () => {
    // Dispatch custom event for double-click
    const fileElement = {
      id: `file_${file.id}`,
      name: file.name,
      type: 'file',
      preview: `Uploaded file: ${file.name}`,
      fileData: {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        uploadedAt: file.uploadedAt
      }
    };
    
    const event = new CustomEvent('elementDoubleClick', { detail: fileElement });
    document.dispatchEvent(event);
    console.log('📁 File double-click event dispatched:', fileElement);
  };

  // For images, show image preview
  if (isImage) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDoubleClick={handleDoubleClick}
        className="-mx-2 relative cursor-move hover:shadow-lg transition-all duration-200 overflow-hidden group"
        title="Drag to canvas or double-click to add"
      >
        {/* Image Preview */}
        <img
          src={file.url}
          alt={file.name}
          className="w-full h-32 object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="%236b7280"%3EImage Error%3C/text%3E%3C/svg%3E';
          }}
        />

        {/* File Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-xs font-medium text-white truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-gray-200">
            {formatFileSize(file.size)}
          </p>
        </div>

        {/* Remove Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeFile(file.id);
          }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity bg-white rounded-full p-1 shadow-md"
          title="Remove file"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className={`p-2 rounded-lg border-2 ${colorClass} group relative cursor-move hover:shadow-md transition-all duration-200`}
      title="Drag to canvas or double-click to add"
    >
      {/* File Icon and Info */}
      <div className="flex items-start space-x-2">
        <FileIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs opacity-75">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFile(file.id);
        }}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity bg-white rounded-full p-0.5"
        title="Remove file"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

// Uploads Section Component
const UploadsSection = () => {
  const { uploadedFiles, addFiles } = useUpload();
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      addFiles(files);
    }
  };

  return (
    <div className="space-y-2">
      {/* Upload Button */}
      <button
        onClick={handleFileSelect}
        className="w-full flex items-center justify-center space-x-1.5 p-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        <Upload className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Upload Files</span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept="*/*"
      />

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-1.5 overflow-hidden">
          <p className="text-xs text-gray-600 font-medium">
            Uploaded Files ({uploadedFiles.length})
          </p>
          <div className="space-y-0.5 max-h-80 overflow-y-auto overflow-x-hidden">
            {uploadedFiles.map((file) => (
              <DraggableFileCard key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && (
        <div className="text-center py-3 text-gray-400">
          <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">No files uploaded yet</p>
        </div>
      )}
    </div>
  );
};

// Invoice/Quote Card Component
const InvoiceQuoteCard = ({ item }) => {
  const handleDragStart = (event) => {
    console.log('🚀 INVOICE/QUOTE DRAG START EVENT FIRED!', event);
    
    const elementJson = JSON.stringify({
      ...item,
      type: item.type === 'invoice' ? 'invoice' : 'quotation',
      preview: `${item.type === 'invoice' ? 'Invoice' : 'Quotation'}: ${item.name}`
    });
    event.dataTransfer.setData('application/json', elementJson);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', item.name);
    
    // Set drag image
    const dragImage = new Image();
    dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%233b82f6" width="60" height="60" rx="8"/%3E%3Ctext x="30" y="30" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E📋%3C/text%3E%3C/svg%3E';
    event.dataTransfer.setDragImage(dragImage, 30, 30);
    
    console.log('📄 Invoice/Quote drag started:', item.name);
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <FileCheck className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      className="group -mx-2 relative cursor-move hover:shadow-lg transition-all duration-200 overflow-hidden"
      title="Drag to canvas or double-click to add"
    >
      {/* Card Background with Gradient */}
      <div className={`w-full h-40 rounded-lg flex flex-col p-4 text-white relative overflow-hidden ${
        item.type === 'invoice' 
          ? 'bg-gradient-to-br from-blue-500 to-blue-700' 
          : 'bg-gradient-to-br from-purple-500 to-purple-700'
      }`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-8 -translate-y-8"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-12 translate-y-12"></div>
        </div>

        {/* Card Content */}
        <div className="relative z-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold opacity-90">{item.type === 'invoice' ? 'INV' : 'QTE'}</span>
            <div className={`p-1.5 rounded ${item.type === 'invoice' ? 'bg-blue-400/20' : 'bg-purple-400/20'}`}>
              {item.type === 'invoice' ? <FileDigit className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold line-clamp-2 mb-2">
            {item.name}
          </h4>

          {/* Description */}
          <p className="text-xs opacity-90 line-clamp-1 mb-3">
            {item.preview}
          </p>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-80">{item.date}</span>
            <span className="font-bold text-sm">{item.amount}</span>
          </div>
          
          <div>
            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold inline-flex items-center space-x-1 ${getStatusColor(item.status)}`}>
              {getStatusIcon(item.status)}
              <span>{item.status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Hover Indicator */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all pointer-events-none"></div>
    </div>
  );
};

// Helper function to create a clean, serializable version of the element
const createSerializableElement = (element) => {
  // Create a new object with only the properties we need
  const cleanElement = {
    id: element.id,
    name: element.name,
    type: element.type,
    preview: element.preview,
    nodeType: element.nodeType,
    data: element.data ? { ...element.data } : null,
    // Add any other necessary properties that don't contain circular references
  };

  // For Smart Note, ensure we have the required properties
  if (element.type === 'smart-note' || element.nodeType === 'smartNote') {
    cleanElement.nodeType = 'smartNote';
    cleanElement.data = {
      label: element.data?.label || element.name || 'Smart Note',
      // Add any other Smart Note specific data
      ...(element.data || {})
    };
  }

  return cleanElement;
};

// DraggableElement component for React Flow
const DraggableElement = ({ element }) => {
  const handleDragStart = (event) => {
    console.log('🚀 DRAG START EVENT FIRED!', event);
    
    // Create a clean, serializable version of the element
    const cleanElement = createSerializableElement(element);
    
    // Set the element data for React Flow to consume
    const elementJson = JSON.stringify(cleanElement);
    event.dataTransfer.setData('application/json', elementJson);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', element.name);
    
    // Set drag image for visual feedback
    const dragImage = new Image();
    dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%233b82f6" width="60" height="60" rx="8"/%3E%3Ctext x="30" y="30" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E+%3C/text%3E%3C/svg%3E';
    event.dataTransfer.setDragImage(dragImage, 30, 30);
    
    console.log('🚀 Drag started for element:', element.name);
    console.log('📦 Clean element data being transferred:', cleanElement);
    console.log('✅ DataTransfer types:', event.dataTransfer.types);
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🖱️ Double-click detected for element:', element.name);
    
    // Create a custom event to notify CanvasWorkspace
    const elementDropEvent = new CustomEvent('elementDoubleClick', {
      detail: element
    });
    
    // Dispatch the event to the document
    document.dispatchEvent(elementDropEvent);
    console.log('📡 Element double-click event dispatched:', element);
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className="group p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-move relative flex flex-col space-y-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-white"
      title="Drag to canvas or double-click to add"
    >
      {/* Element Icon and Name Row */}
      <div className="flex items-center space-x-3">
        {/* Element Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:border-blue-300 group-hover:shadow-md transition-all duration-300">
        {element.type === 'textarea' && (
          <div className="w-6 h-4 border border-gray-400 rounded"></div>
        )}
        {element.type === 'textbox' && (
          <div className="w-6 h-3 border border-gray-400 rounded"></div>
        )}
        {element.type === 'button' && (
          <div className="w-6 h-3 bg-gray-400 rounded"></div>
        )}
        {element.type === 'input' && (
          <div className="w-6 h-0.5 bg-gray-400"></div>
        )}
        {element.type === 'select' && (
          <div className="w-6 h-3 border border-gray-400 rounded flex items-center justify-end px-1">
            <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-400"></div>
          </div>
        )}
        {element.type === 'radio' && (
          <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
        )}
        {element.type === 'checkbox' && (
          <div className="w-4 h-4 border-2 border-gray-400 rounded"></div>
        )}
        {element.type === 'dropdown' && (
          <div className="w-6 h-3 border border-gray-400 rounded flex items-center justify-end px-1">
            <div className="text-gray-400 text-xs">▼</div>
          </div>
        )}
        {element.type === 'table' && (
          <Grid className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'chart' && (
          <BarChart3 className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'icon' && (
          <Square className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'list' && (
          <List className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'turnkey-workflow' && (
          <Settings className="w-6 h-6 text-blue-600" />
        )}
        {element.type === 'form-template' && (
          <div className="w-6 h-6 border-2 border-gray-400 rounded flex flex-col items-center justify-center space-y-0.5">
            <div className="w-4 h-0.5 bg-gray-400 rounded"></div>
            <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
            <div className="w-4 h-0.5 bg-gray-400 rounded"></div>
          </div>
        )}
        {element.type === 'flowchart' && (
          <GitBranch className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'materials' && (
          <Package className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'upload' && (
          <>
            {element.id === 'upload-area' && <Upload className="w-6 h-6 text-gray-600" />}
            {element.fileType === 'image' && <Image className="w-6 h-6 text-gray-600" />}
            {element.fileType === 'document' && <FileText className="w-6 h-6 text-gray-600" />}
            {element.fileType === 'spreadsheet' && <FileSpreadsheet className="w-6 h-6 text-gray-600" />}
            {!element.fileType && element.id !== 'upload-area' && <FileText className="w-6 h-6 text-gray-600" />}
          </>
        )}
        {(element.type === 'smart-note' || element.nodeType === 'smartNote') && (
          <StickyNote className="w-6 h-6 text-yellow-600" />
        )}
        {(element.type === 'calendar-event' || element.nodeType === 'calendarNode') && (
          <Calendar className="w-6 h-6 text-blue-600" />
        )}
        {(element.type === 'approval-board' || element.nodeType === 'approvalBoard') && (
          <ClipboardCheck className="w-6 h-6 text-green-600" />
        )}
        {element.type === 'divider' && (
          <Minus className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'spacer' && (
          <ArrowDown className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'container' && (
          <Box className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'grid' && (
          <LayoutGrid className="w-6 h-6 text-gray-600" />
        )}
        {element.type === 'task-card' && (
          <CheckSquare className="w-6 h-6 text-teal-600" />
        )}
        {element.type === 'task-card-progress' && (
          <TrendingUp className="w-6 h-6 text-teal-600" />
        )}
        {element.type === 'cost-calculator' && element.elementIcon && (
          element.elementIcon
        )}

        </div>
        
        {/* Element Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
            {element.name}
          </p>
        </div>
      </div>
      
      {/* Element Preview */}
      <div className="text-left">
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{element.preview}</p>
      </div>
      
      {/* Action Hint */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
          Drag or double-click
        </p>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

const ElementsPanel = ({ 
  selectedCategory, 
  elementOptions = {},
  onClose,
  onBackToCategories
}) => {
  // Initialize state for the modal
  const [showManageBOQ, setShowManageBOQ] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debug logs
  console.log('📊 ElementsPanel props:', { selectedCategory, elementOptions });
  
  // Element categories with their specific elements
  const categories = {
    forms: {
      name: 'Forms',
      icon: <Grid className="w-5 h-5" />,
      elements: [
        { id: 'form-template', name: 'Form Template', type: 'form-template', preview: 'Ready-made form with basic fields' },
        { id: 'textarea', name: 'TextArea', type: 'textarea', preview: 'Large text input area' },
        { id: 'textbox', name: 'TextBox', type: 'textbox', preview: 'Single line text input' },
        { id: 'dropdown', name: 'Dropdown', type: 'dropdown', preview: 'Dropdown menu' }
      ]
    },
    tables: {
      name: 'Tables',
      icon: <Table className="w-5 h-5" />,
      elements: [
        { id: 'basic-table', name: 'Basic Table', type: 'table', preview: 'Simple data table' },
        { id: 'sortable-table', name: 'Sortable Table', type: 'table', preview: 'Table with sorting' },
        { id: 'filterable-table', name: 'Filterable Table', type: 'table', preview: 'Table with filters' },
        { id: 'paginated-table', name: 'Paginated Table', type: 'table', preview: 'Table with pagination' },
        { id: 'editable-table', name: 'Editable Table', type: 'table', preview: 'In-line editing table' },
        { id: 'expandable-table', name: 'Expandable Table', type: 'table', preview: 'Expandable rows' }
      ]
    },
    charts: {
      name: 'Charts',
      icon: <BarChart3 className="w-5 h-5" />,
      elements: [
        { id: 'bar-chart', name: 'Bar Chart', type: 'chart', preview: 'Vertical bar chart' },
        { id: 'line-chart', name: 'Line Chart', type: 'chart', preview: 'Line graph' },
        { id: 'pie-chart', name: 'Pie Chart', type: 'chart', preview: 'Circular chart' },
        { id: 'area-chart', name: 'Area Chart', type: 'chart', preview: 'Filled area chart' },
        { id: 'donut-chart', name: 'Donut Chart', type: 'chart', preview: 'Ring chart' },
        { id: 'scatter-plot', name: 'Scatter Plot', type: 'chart', preview: 'Dot plot chart' }
      ]
    },
    'image-block': {
      name: 'Image Block',
      icon: <Image className="w-5 h-5" />,
      elements: (elementOptions['image-block']?.elements) || [
        {
          id: 'image-block-basic',
          name: 'Image Block',
          type: 'image-block',
          preview: 'Upload and annotate project visuals',
          imageBlockData: {
            imageUrl: '',
            caption: 'South elevation – week 6 progress',
            timestamp: '2025-11-20 10:30',
            geotag: '12.9716° N, 77.5946° E',
            annotations: [
              { id: 'ann-1', text: 'Facade glazing completed', position: 'top-left' },
              { id: 'ann-2', text: 'Landscape pending', position: 'bottom-right' }
            ],
            width: 80
          }
        }
      ]
    },
    'document-block': {
      name: 'Document Block',
      icon: <FileText className="w-5 h-5" />,
      elements: (elementOptions['document-block']?.elements) || [
        {
          id: 'document-block-basic',
          name: 'Document Block',
          type: 'document-block',
          preview: 'Attach project documents with version history',
          documentBlockData: {
            fileName: 'Project-Brief.pdf',
            fileType: 'pdf',
            fileSize: '1.2 MB',
            fileUrl: '',
            versions: [
              {
                id: 'ver-1',
                version: 'v1.0',
                uploadedAt: '2025-11-15 09:45',
                uploadedBy: 'Alex Johnson',
                notes: 'Original brief shared with vendor team.'
              }
            ],
            comments: [
              {
                id: 'doc-comment-1',
                author: 'Priya Patel',
                text: 'Please review section 3 for updated specs.',
                timestamp: '2025-11-18 14:10'
              }
            ]
          }
        }
      ]
    },
    smart: {
      name: 'Smart Elements',
      icon: <Sparkles className="w-5 h-5" />,
      elements: [
        { 
          id: 'smart-note', 
          name: 'Smart Note', 
          type: 'smart-note', 
          preview: 'AI-powered sticky note with smart actions',
          icon: <StickyNote className="w-4 h-4 mr-2 text-yellow-600" />,
          color: 'bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200',
          nodeType: 'smartNote',
          data: { label: 'Smart Note' }
        },
        { 
          id: 'calendar-event', 
          name: 'Calendar Event', 
          type: 'calendar-event', 
          preview: 'Schedule meetings and send invites',
          icon: <Calendar className="w-4 h-4 mr-2 text-blue-600" />,
          color: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
          nodeType: 'calendarNode',
          data: { label: 'Calendar Event' }
        },
        { 
          id: 'approval-board', 
          name: 'Approval Board', 
          type: 'approval-board', 
          preview: 'Track and manage approval workflows',
          icon: <ClipboardCheck className="w-4 h-4 mr-2 text-green-600" />,
          color: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
          nodeType: 'approvalBoard',
          data: { label: 'Approval Board' }
        }
      ]
    },
    icons: {
      name: 'Icons',
      icon: <Square className="w-5 h-5" />,
      elements: [
        { id: 'arrow-icon', name: 'Arrow', type: 'icon', preview: 'Direction arrow' },
        { id: 'check-icon', name: 'Check', type: 'icon', preview: 'Checkmark icon' },
        { id: 'close-icon', name: 'Close', type: 'icon', preview: 'X close icon' },
        { id: 'menu-icon', name: 'Menu', type: 'icon', preview: 'Hamburger menu' },
        { id: 'star-icon', name: 'Star', type: 'icon', preview: 'Star rating' },
        { id: 'heart-icon', name: 'Heart', type: 'icon', preview: 'Favorite icon' }
      ]
    },
    list: {
      name: 'List',
      icon: <List className="w-5 h-5" />,
      elements: [
        { id: 'bullet-list', name: 'Bullet List', type: 'list', preview: 'Unordered list' },
        { id: 'numbered-list', name: 'Numbered List', type: 'list', preview: 'Ordered list' },
        { id: 'checklist', name: 'Checklist', type: 'list', preview: 'Task list' },
        { id: 'definition-list', name: 'Definition List', type: 'list', preview: 'Term definitions' },
        { id: 'nested-list', name: 'Nested List', type: 'list', preview: 'Multi-level list' },
        { id: 'timeline-list', name: 'Timeline', type: 'list', preview: 'Chronological list' }
      ]
    },
    'task-card': {
      name: 'Task Cards',
      icon: <ClipboardList className="w-5 h-5" />,
      elements: [
        {
          id: 'task-card-basic',
          name: 'Task Card',
          type: 'task-card',
          preview: 'Jira-style tracker for daily work',
          taskCardData: {
            title: 'Prepare kickoff deck',
            description: 'Compile agenda, assign speakers, and share pre-read with stakeholders.',
            status: 'todo',
            assignedTo: 'Alex Johnson',
            priority: 'high',
            dueDate: '',
            checklists: [
              { id: 'tc-basic-1', text: 'Outline key topics', completed: true },
              { id: 'tc-basic-2', text: 'Collect collateral', completed: false },
              { id: 'tc-basic-3', text: 'Share draft for review', completed: false }
            ],
            attachments: [],
            comments: [
              {
                id: 'tc-basic-comment-1',
                author: 'Alex Johnson',
                text: 'Waiting on inputs from finance.',
                timestamp: '2025-11-18 14:22'
              }
            ],
            dependencies: ['Finalize project scope'],
            labels: ['Kickoff', 'Client'],
            activityLog: [
              {
                id: 'tc-basic-activity-1',
                action: 'Task created',
                meta: { by: 'Alex Johnson' },
                timestamp: '2025-11-17 09:30'
              },
              {
                id: 'tc-basic-activity-2',
                action: 'Checklist updated',
                meta: { item: 'Outline key topics', completed: true },
                timestamp: '2025-11-17 15:45'
              }
            ]
          }
        },
        {
          id: 'task-card-progress',
          name: 'Task Card with Progress',
          type: 'task-card-progress',
          preview: 'Task card showing progress and due date',
          taskCardData: {
            title: 'Implement vendor portal UI',
            description: 'Finish responsive layout for workspace canvas and finalize QA notes.',
            status: 'in-progress',
            assignedTo: 'Priya Patel',
            priority: 'critical',
            dueDate: '2025-11-30',
            checklists: [
              { id: 'tc-progress-1', text: 'Design review sign-off', completed: true },
              { id: 'tc-progress-2', text: 'Implement task card block', completed: true },
              { id: 'tc-progress-3', text: 'Cross-browser QA', completed: false }
            ],
            attachments: [
              { id: 'tc-progress-attach-1', name: 'ui-spec.pdf', size: 245760 },
              { id: 'tc-progress-attach-2', name: 'jira-export.xlsx', size: 512000 }
            ],
            comments: [
              {
                id: 'tc-progress-comment-1',
                author: 'Priya Patel',
                text: 'Need confirmation on responsive breakpoints.',
                timestamp: '2025-11-19 10:05'
              },
              {
                id: 'tc-progress-comment-2',
                author: 'Rahul Verma',
                text: 'Backend API is ready for integration.',
                timestamp: '2025-11-19 18:42'
              }
            ],
            dependencies: ['Finalize design system tokens', 'API contract v2.1'],
            labels: ['Sprint 11', 'Frontend', 'High impact'],
            activityLog: [
              {
                id: 'tc-progress-activity-1',
                action: 'Status updated',
                meta: { status: 'In-Progress' },
                timestamp: '2025-11-18 11:02'
              },
              {
                id: 'tc-progress-activity-2',
                action: 'Assignee changed',
                meta: { assignee: 'Priya Patel' },
                timestamp: '2025-11-18 13:26'
              },
              {
                id: 'tc-progress-activity-3',
                action: 'Attachment added',
                meta: { file: 'ui-spec.pdf' },
                timestamp: '2025-11-19 09:15'
              }
            ]
          }
        }
      ]
    },
    materials: {
      name: 'Materials',
      icon: <Package className="w-5 h-5" />,
      elements: [
        { id: 'raw-materials', name: 'Raw Materials', type: 'materials', preview: 'Request raw materials' },
        { id: 'semi-finished', name: 'Semi-Finished', type: 'materials', preview: 'Request semi-finished goods' },
        { id: 'finished-goods', name: 'Finished Goods', type: 'materials', preview: 'Request finished products' },
        { id: 'consumables', name: 'Consumables', type: 'materials', preview: 'Request consumable items' },
        { id: 'packaging', name: 'Packaging', type: 'materials', preview: 'Request packaging materials' },
        { id: 'tools-equipment', name: 'Tools & Equipment', type: 'materials', preview: 'Request tools and equipment' }
      ]
    },
    uploads: {
      name: 'Uploads',
      icon: <Upload className="w-5 h-5" />,
      elements: [] // This will be dynamically populated with uploaded files
    },
    'cost-calculators': {
      name: 'Cost Calculators',
      icon: <Calculator className="w-5 h-5" />,
      elements: [
        { id: 'boq-generator', name: 'BOQ Generator', type: 'boq-generator', preview: 'Generate professional Bill of Quantities with cost breakdown', elementIcon: <FileDigit className="w-6 h-6 text-purple-600" /> },
        // { id: 'building-cost-calculator', name: 'Building Cost Calculator', type: 'cost-calculator', preview: 'Calculate total building construction costs', elementIcon: <Box className="w-6 h-6 text-blue-600" /> },
        { id: 'concrete-blocks-calculator', name: 'Concrete Blocks Calculator', type: 'cost-calculator', preview: 'Calculate the number of concrete blocks for your project', elementIcon: <Package className="w-6 h-6 text-orange-600" /> },
        { id: 'bricks-calculator', name: 'Bricks Calculator', type: 'cost-calculator', preview: 'Estimate the number of bricks required for walls', elementIcon: <Package className="w-6 h-6 text-red-600" /> },
        { id: 'concrete-calculator', name: 'Concrete Calculator', type: 'cost-calculator', preview: 'Calculate amount of concrete mix needed for foundations or columns', elementIcon: <Layers className="w-6 h-6 text-gray-600" /> },
        { id: 'flooring-calculator', name: 'Flooring Calculator', type: 'cost-calculator', preview: 'Plan flooring materials and get accurate cost estimates', elementIcon: <Grid className="w-6 h-6 text-amber-700" /> },
        { id: 'soil-excavation-calculator', name: 'Soil Excavation Calculator', type: 'cost-calculator', preview: 'Calculate volume of soil excavation for foundations', elementIcon: <Plus className="w-6 h-6 text-yellow-700" /> },
        { id: 'steel-cost-calculator', name: 'Steel Calculator', type: 'cost-calculator', preview: 'Estimate steel reinforcement required for structures', elementIcon: <Layers className="w-6 h-6 text-slate-700" /> },
        { id: 'vinyl-calculator', name: 'Vinyl Calculator', type: 'cost-calculator', preview: 'Calculate vinyl material and installation costs', elementIcon: <Square className="w-6 h-6 text-green-600" /> }
      ]
    },
    flowcharts: {
      name: 'Flowcharts',
      icon: <GitBranch className="w-5 h-5" />,
      elements: [
        { id: 'swot-analysis', name: 'SWOT Analysis', type: 'flowchart', preview: 'Strengths, Weaknesses, Opportunities, Threats' },
        { id: 'business-model-canvas', name: 'Business Model Canvas', type: 'flowchart', preview: '9-block business model framework' },
        { id: 'goal-setting-framework', name: 'Goal Setting Framework', type: 'flowchart', preview: 'SMART goals and action planning' },
        { id: 'decision-tree', name: 'Decision Tree', type: 'flowchart', preview: 'Decision-making process flow' },
        { id: 'customer-journey-map', name: 'Customer Journey Map', type: 'flowchart', preview: 'Customer experience touchpoints' },
        { id: 'organizational-chart', name: 'Organizational Chart', type: 'flowchart', preview: 'Company hierarchy structure' },
        { id: 'process-flow', name: 'Process Flow', type: 'flowchart', preview: 'Business process workflow' },
        { id: 'project-timeline', name: 'Project Timeline', type: 'flowchart', preview: 'Project milestones and phases' },
        { id: 'risk-assessment-matrix', name: 'Risk Assessment Matrix', type: 'flowchart', preview: 'Risk probability vs impact' },
        { id: 'value-stream-map', name: 'Value Stream Map', type: 'flowchart', preview: 'Lean process optimization' },
        { id: 'stakeholder-map', name: 'Stakeholder Map', type: 'flowchart', preview: 'Stakeholder influence and interest' },
        { id: 'competitive-analysis', name: 'Competitive Analysis', type: 'flowchart', preview: 'Competitor comparison matrix' }
      ]
    }
  };

  // Debug logs
  console.log('🔍 ElementsPanel Debug:', {
    selectedCategory,
    availableCategories: Object.keys(categories),
    elementOptions: Object.keys(elementOptions || {}),
    hasElementOptions: Boolean(elementOptions)
  });

  // Get the current category from the categories object or elementOptions
  let currentCategory = null;
  
  if (selectedCategory) {
    // First try to get from categories object
    currentCategory = categories[selectedCategory];
    
    // If not found in categories, try to create from elementOptions
    if (!currentCategory && elementOptions && elementOptions[selectedCategory]) {
      const option = elementOptions[selectedCategory];
      // Normalize to an array whether option is already an array or an object with elements
      const normalizedElements = Array.isArray(option)
        ? option
        : Array.isArray(option?.elements)
          ? option.elements
          : [];

      if (selectedCategory === 'invoices-quotes') {
        console.log('📋 Handling invoices-quotes category');
        currentCategory = {
          name: 'Invoices & Quotations',
          elements: normalizedElements
        };
      } else {
        console.log(`🔄 Creating category from elementOptions for ${selectedCategory}`);
        currentCategory = {
          name: selectedCategory
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          elements: normalizedElements
        };
      }
    }
  }
  
  // If no category is selected or found, show a message
  if (!selectedCategory || !currentCategory) {
    console.log('❌ No category selected or found for:', selectedCategory);
    return (
      <div className="fixed right-0 top-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBackToCategories}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-base font-semibold text-gray-900">Elements</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-500">
            {!selectedCategory 
              ? 'Please select a category' 
              : `Category not found: ${selectedCategory}`}
          </p>
        </div>
      </div>
    );
  }
  
  // Get the elements for the current category
  const currentElements = Array.isArray(currentCategory.elements) ? currentCategory.elements : [];
  
  // Filter elements based on search query
  const filteredElements = currentElements.filter(element =>
    element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (element.preview && element.preview.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  console.log('✅ Current category:', currentCategory);
  console.log('📋 Elements to render:', Array.isArray(filteredElements) ? filteredElements.length : 0);
  
  // Debug log when showManageBOQ changes
  React.useEffect(() => {
    console.log('showManageBOQ state changed:', showManageBOQ);
  }, [showManageBOQ]);

  // Handle BOQ data from the modal
  const handleBOQData = (tables) => {
    console.log('Extracted tables:', tables);
    // Here you can handle the extracted tables data
    // For example, you might want to add them to the current elements
  };

  // If no category is selected, show a message or the panel header only
  if (!selectedCategory) {
    return (
      <div className="fixed right-0 top-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
        <div className="flex-shrink-0 p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={onBackToCategories}
                className="p-0.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-semibold text-gray-900">Elements</h3>
            </div>
            <button
              onClick={onClose}
              className="p-0.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-gray-500">Please select a category</p>
        </div>
      </div>
    );
  }

  // Reset search query when category changes
  React.useEffect(() => {
    setSearchQuery('');
  }, [selectedCategory]);

  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBackToCategories}
              className="p-0.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to categories"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-1.5">
              <div className="text-gray-600">
                {currentCategory.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{currentCategory.name}</h3>
            </div>
            {selectedCategory === 'tables' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Manage BOQ button clicked');
                  setShowManageBOQ(true);
                }}
                className="ml-2 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 shadow-sm"
              >
                <FileSpreadsheetIcon size={12} />
                <span>Manage BOQ</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-shrink-0 px-3 pt-2.5 pb-2 border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            placeholder={`Search ${currentCategory.name.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
          />
          <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Elements Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedCategory === 'uploads' ? (
          <UploadsSection />
        ) : selectedCategory === 'invoices-quotes' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700">Recent Documents</h4>
              <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                <Plus className="w-2.5 h-2.5 mr-0.5" />
                New Document
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {filteredElements.length > 0 ? (
                filteredElements.map((item) => (
                  <InvoiceQuoteCard key={item.id} item={item} />
                ))
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-xs">No documents found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredElements.length > 0 ? (
              filteredElements.map((element) => (
                <DraggableElement key={element.id} element={element} />
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs">No elements found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <p className="text-xs font-medium text-gray-600 mb-0.5">
            💡 Tip: Drag to canvas or double-click to add
          </p>
          <p className="text-xs text-gray-400">
            Both methods supported
          </p>
        </div>
      </div>
      
      {/* Manage BOQ Modal */}
      <ManageBOQModal 
        key={`modal-${showManageBOQ}`} // Force re-render when state changes
        isOpen={showManageBOQ}
        onClose={() => {
          console.log('Modal close button clicked');
          setShowManageBOQ(false);
        }}
        onTablesExtracted={handleBOQData}
      />
    </div>
  );
};

export default ElementsPanel;