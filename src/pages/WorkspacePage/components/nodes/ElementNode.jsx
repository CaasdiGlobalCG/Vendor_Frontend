import React, { useState, useContext, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getWorkspaceById, updateWorkspace } from '../../utils/workspaceApi';
import { Handle, Position } from 'reactflow';
import { Download, Eye, ExternalLink, X, ArrowRight, Check, X as XIcon, Menu, Star, Heart } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import FormTemplate from '../forms/FormTemplate';
import TableRenderer from '../forms/TableRenderer';
import CalendarRenderer from '../forms/CalendarRenderer';
import ChartRenderer from '../forms/ChartRenderer';
import ListRenderer from '../forms/ListRenderer';
import MaterialsRenderer from '../forms/MaterialsRenderer';
import UploadsRenderer from '../forms/UploadsRenderer';
import FileRenderer from '../forms/FileRenderer';
import TaskCardRenderer from '../forms/TaskCardRenderer';
import ImageBlockRenderer from '../forms/ImageBlockRenderer';
import DocumentBlockRenderer from '../forms/DocumentBlockRenderer';


import TablePreviewModal from '../modals/TablePreviewModal';
import { createTableHelpers, defaultTableData } from '../../utils/tableUtils';

const ElementNode = ({ id, data, isConnectable, selected }) => {
  const { workspaceId } = useParams();
  const [saving, setSaving] = useState(false);
  // Important state for highlighting
  const [isImportant, setIsImportant] = useState(false);

  // Deadline state (persisted in backend)
  const [deadline, setDeadline] = useState(data.deadline || null); // ISO string or null
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);

  // Sync deadline from backend node data if changed externally
  useEffect(() => {
    if (data.deadline !== deadline) {
      setDeadline(data.deadline || null);
    }
    // eslint-disable-next-line
  }, [data.deadline]);
  // Get current user from context
  const { currentUser } = useContext(VendorContext);
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('');
  
  // Dynamic options for interactive elements
  const [selectOptions, setSelectOptions] = useState(['Option 1', 'Option 2', 'Option 3']);
  const [radioOptions, setRadioOptions] = useState(['Option 1', 'Option 2']);
  const [checkboxOptions, setCheckboxOptions] = useState(['Option 1', 'Option 2', 'Option 3']);
  const [checkedItems, setCheckedItems] = useState({});
  const [buttonText, setButtonText] = useState('Click Me');
  const [isEditingButton, setIsEditingButton] = useState(false);
  
  // Table state
  const [tableData, setTableData] = useState(defaultTableData);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [editingCell, setEditingCell] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  
  // Check if element is a table type
  const isTableElement = () => {
    return data.type === 'table' || data.id?.includes('table') || 
           ['basic-table', 'sortable-table', 'filterable-table', 'paginated-table', 'editable-table', 'expandable-table'].includes(data.id);
  };
  
  // Handle preview click
  const handlePreviewClick = (e) => {
    e.stopPropagation();
    setShowPreview(true);
  };

  const handleDocumentPreviewClick = (e) => {
    e.stopPropagation();
    if (!data.documentUrl) return;
    setShowDocumentPreview(true);
  };

  const handleDocumentDownload = (e) => {
    e.stopPropagation();
    if (!data.documentUrl) return;
    const anchor = document.createElement('a');
    anchor.href = data.documentUrl;
    anchor.download = `${data.documentMeta?.id || data.name || 'document'}.pdf`;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleDocumentOpen = (e) => {
    e.stopPropagation();
    if (!data.documentUrl) return;
    window.open(data.documentUrl, '_blank', 'noopener,noreferrer');
  };

  const renderDocumentElement = () => {
    const meta = data.documentMeta || {};

    if (!data.documentUrl) {
      return (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Document URL unavailable. Please re-upload the file from the source list.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{data.name}</p>
              <p className="mt-1 text-xs text-slate-500">{meta.id || 'Document'}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDocumentPreviewClick}
                className="p-2 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={handleDocumentDownload}
                className="p-2 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleDocumentOpen}
                className="p-2 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div>
              <p className="font-medium text-slate-500">Customer</p>
              <p className="mt-0.5 text-slate-800">{meta.customer || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Date</p>
              <p className="mt-0.5 text-slate-800">{meta.date ? new Date(meta.date).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Amount</p>
              <p className="mt-0.5 text-slate-800">{meta.amount || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Status</p>
              <p className="mt-0.5">
                {meta.status ? (
                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                    {meta.status}
                  </span>
                ) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get table data for preview (use custom data if available, otherwise default)
  const getPreviewTableData = () => {
    if (data.customTableData) {
      return {
        columns: data.customTableData.columns,
        data: data.customTableData.data
      };
    }
    return {
      columns: ['name', 'email', 'role', 'status'],
      data: tableData
    };
  };

  // Create table helpers
  const tableHelpers = createTableHelpers(
    tableData,
    setTableData,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    filterText,
    itemsPerPage,
    currentPage,
    setEditingCell,
    expandedRows,
    setExpandedRows
  );

  const addSelectOption = () => {
    const newOption = prompt('Enter new option:');
    if (newOption && newOption.trim()) {
      setSelectOptions([...selectOptions, newOption.trim()]);
    }
  };

  const addRadioOption = () => {
    const newOption = prompt('Enter new option:');
    if (newOption && newOption.trim()) {
      setRadioOptions([...radioOptions, newOption.trim()]);
    }
  };

  const addCheckboxOption = () => {
    const newOption = prompt('Enter new option:');
    if (newOption && newOption.trim()) {
      setCheckboxOptions([...checkboxOptions, newOption.trim()]);
    }
  };

  const removeOption = (options, setOptions, index) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const renderTableElement = () => {
    return (
      <TableRenderer
        data={data}
        tableData={tableData}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        filterText={filterText}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        editingCell={editingCell}
        expandedRows={expandedRows}
        {...tableHelpers}
        setFilterText={setFilterText}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
        setEditingCell={setEditingCell}
      />
    );
  };

  const renderCalendarElement = () => {
    return (
      <CalendarRenderer
        selectedDate={selectedDate}
        currentMonth={currentMonth}
        setSelectedDate={setSelectedDate}
        setCurrentMonth={setCurrentMonth}
      />
    );
  };

  const renderChartElement = () => {
    return (
      <ChartRenderer
        data={data}
        chartType={data.id}
      />
    );
  };

  const renderListElement = () => {
    return (
      <ListRenderer
        data={data}
        listType={data.id}
      />
    );
  };

  const renderMaterialsElement = () => {
    return (
      <MaterialsRenderer
        data={data}
        materialType={data.id}
        workspaceId={data.workspaceId}
        currentUser={currentUser}
      />
    );
  };

  const renderUploadsElement = () => {
    return (
      <UploadsRenderer
        data={data}
        uploadType={data.id}
      />
    );
  };

  const renderFileElement = () => {
    return (
      <FileRenderer
        data={data}
      />
    );
  };



  const renderInteractiveElement = () => {
    switch (data.type) {
      case 'textarea':
        return (
          <textarea
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="Enter your text here..."
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
        );
      
      case 'textbox':
      case 'input':
        return (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="Type your text here..."
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
        );
      
      case 'button':
        return (
          <div className="space-y-2">
            {isEditingButton ? (
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                onBlur={() => setIsEditingButton(false)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingButton(false);
                  }
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Button text"
                autoFocus
              />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`${buttonText} clicked!`);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingButton(true);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {buttonText}
              </button>
            )}
            <div className="text-xs text-gray-500 text-center">
              Double-click to edit text
            </div>
          </div>
        );
      
      case 'quotation':
      case 'invoice':
        return renderDocumentElement();

      case 'select':
      case 'dropdown':
        return (
          <div className="space-y-2">
            <select
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            >
              <option value="">Select an option</option>
              {selectOptions.map((option, index) => (
                <option key={index} value={option.toLowerCase().replace(/\s+/g, '-')}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex space-x-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addSelectOption();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <span className="text-lg">+</span>
                <span>Add Option</span>
              </button>
              {selectOptions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(selectOptions, setSelectOptions, selectOptions.length - 1);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span className="text-lg">×</span>
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            <div className="space-y-2">
              {checkboxOptions.map((option, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedItems[option] || false}
                    onChange={(e) => setCheckedItems({
                      ...checkedItems,
                      [option]: e.target.checked
                    })}
                    className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                  <span className="text-base text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addCheckboxOption();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <span className="text-lg">+</span>
                <span>Add Option</span>
              </button>
              {checkboxOptions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(checkboxOptions, setCheckboxOptions, checkboxOptions.length - 1);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span className="text-lg">×</span>
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            <div className="space-y-2">
              {radioOptions.map((option, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`radio-${data.id || Math.random()}`}
                    value={option}
                    checked={radioValue === option}
                    onChange={(e) => setRadioValue(e.target.value)}
                    className="w-5 h-5 text-blue-600 border-2 border-gray-300 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                  <span className="text-base text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addRadioOption();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <span className="text-lg">+</span>
                <span>Add Option</span>
              </button>
              {radioOptions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(radioOptions, setRadioOptions, radioOptions.length - 1);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span className="text-lg">×</span>
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        );
      
      case 'form-template':
        return <FormTemplate />;
      
      case 'table':
        return renderTableElement();
      
      case 'calendar':
        return renderCalendarElement();
      
      case 'chart':
        return renderChartElement();
      
      case 'list':
        return renderListElement();
      
      case 'materials':
        return renderMaterialsElement();
      
      case 'upload':
        return renderUploadsElement();
      
      case 'file':
        return renderFileElement();

      case 'image-block':
        return <ImageBlockRenderer data={data} />;

      case 'document-block':
        return <DocumentBlockRenderer data={data} />;

      case 'task-card':
      case 'task-card-progress':
        return <TaskCardRenderer data={data} />;
      
      case 'icon':
        return renderIconElement();
      
      case 'divider':
        return renderDividerElement();
      
      case 'spacer':
        return renderSpacerElement();
      
      case 'container':
        return renderContainerElement();
      
      case 'grid':
        return renderGridElement();
      
      default:
        return (
          <div className="text-center py-4 bg-gray-100 rounded border">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {data.type}
            </span>
          </div>
        );
    }
  };

  // Icon mapping function
  const getIconComponent = (iconId) => {
    const iconMap = {
      'arrow-icon': ArrowRight,
      'check-icon': Check,
      'close-icon': XIcon,
      'menu-icon': Menu,
      'star-icon': Star,
      'heart-icon': Heart,
    };
    
    const IconComponent = iconMap[iconId] || ArrowRight; // Default to ArrowRight if not found
    return IconComponent;
  };

  // Render icon element
  const renderIconElement = () => {
    const IconComponent = getIconComponent(data.id);
    
    return (
      <div className="flex items-center justify-center p-4">
        <IconComponent className="w-16 h-16 text-gray-700" />
      </div>
    );
  };

  // Render divider element
  const renderDividerElement = () => {
    return (
      <div className="w-full">
        <hr className="border-t-2 border-gray-400 w-full" />
      </div>
    );
  };

  // Render spacer element
  const renderSpacerElement = () => {
    return (
      <div className="w-full h-16 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
        <span className="text-xs text-gray-400">Spacer</span>
      </div>
    );
  };

  // Render container element
  const renderContainerElement = () => {
    return (
      <div className="w-full min-h-[120px] border-2 border-gray-300 rounded-lg bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gray-400 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-gray-400 text-xs">📦</span>
          </div>
          <span className="text-xs text-gray-500">Container</span>
        </div>
      </div>
    );
  };

  // Render grid element
  const renderGridElement = () => {
    return (
      <div className="w-full min-h-[120px] border-2 border-gray-300 rounded-lg bg-gray-50 p-3">
        <div className="grid grid-cols-3 gap-2 h-full">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="border border-gray-300 rounded bg-white flex items-center justify-center min-h-[40px]"
            >
              <span className="text-xs text-gray-400">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Determine border style based on selection state and importance
  const getBorderStyle = () => {
    if (isImportant) {
      return 'border-yellow-500 ring-4 ring-yellow-200 shadow-yellow-200';
    }
    if (data.isManuallySelected) {
      return 'border-green-600 ring-4 ring-green-200 shadow-green-200';
    }
    if (data.isInSelectionMode) {
      return 'border-blue-300 hover:border-blue-500 cursor-pointer';
    }
    if (selected) {
      return 'border-blue-600 ring-2 ring-blue-200';
    }
    return 'border-blue-500';
  };

  // Special rendering for icon type - just show the icon without card wrapper
  if (data.type === 'icon') {
    const IconComponent = getIconComponent(data.id);
    
    return (
      <div className={`bg-transparent border-2 rounded-lg shadow-lg p-2 relative group transition-all min-w-[80px] max-w-[120px] ${getBorderStyle()}`}>
        {/* Connection Handles - All uniform gray, bidirectional */}
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
        
        {/* Icon Element */}
        <div className="flex items-center justify-center">
          <IconComponent className="w-12 h-12 text-gray-700" />
        </div>
        
        {/* Selection indicator */}
        {selected && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
            E
          </div>
        )}
      </div>
    );
  }

  // Determine wrapper classes based on element type
  const getWrapperClasses = () => {
    const baseClasses = 'bg-white border-2 rounded-xl shadow-xl relative group transition-all';
    const compactTypes = ['divider', 'spacer', 'container', 'grid'];
    
    if (compactTypes.includes(data.type)) {
      if (data.type === 'divider') {
        return `${baseClasses} p-2 min-w-[200px] max-w-[400px]`;
      } else if (data.type === 'spacer') {
        return `${baseClasses} p-2 min-w-[150px] max-w-[300px]`;
      } else if (data.type === 'container') {
        return `${baseClasses} p-4 min-w-[200px] max-w-[400px]`;
      } else if (data.type === 'grid') {
        return `${baseClasses} p-3 min-w-[250px] max-w-[400px]`;
      }
    }
    
    return `${baseClasses} p-6 ${
      data.type === 'form-template' 
        ? 'min-w-[450px] max-w-[550px]' 
        : 'min-w-[320px] max-w-[400px]'
    }`;
  };

  // Timer calculation
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const getTimeLeft = () => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - now;
    if (diff <= 0) return 'Deadline reached';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Save deadline to backend (update node in workspace)
  const persistDeadline = async (newDeadline) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      // Fetch current workspace nodes
      const workspace = await getWorkspaceById(workspaceId);
      const nodes = workspace.nodes || [];
      // Find and update this node's deadline
      const updatedNodes = nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, deadline: newDeadline } } : node
      );
      await updateWorkspace(workspaceId, { nodes: updatedNodes });
    } catch (err) {
      // Optionally show error
      // eslint-disable-next-line no-console
      console.error('Failed to persist deadline:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${getWrapperClasses()} ${getBorderStyle()}`}>
      {/* Connection Handles - All uniform gray, bidirectional */}
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
      
      {/* Element Header - Hide for divider, spacer, container, grid */}
      {!['divider', 'spacer', 'container', 'grid'].includes(data.type) && (
        <div className="mb-4 text-center relative">
          <div className="flex items-center justify-center space-x-2">
            <h4 className="text-lg font-semibold text-gray-800">{data.name}</h4>
            {isTableElement() && (
              <button
                onClick={handlePreviewClick}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 group/preview"
                title="Preview full table"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {/* Mark as Important button */}
            <button
              onClick={() => setIsImportant((prev) => !prev)}
              className={`ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 ${isImportant ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-white text-yellow-600 border-yellow-400 hover:bg-yellow-50'}`}
              title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
            >
              {isImportant ? '★ Important' : '☆ Mark Important'}
            </button>
            {/* Deadline Button */}
            <button
              onClick={() => setShowDeadlineInput((v) => !v)}
              className="ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 bg-white text-blue-600 border-blue-400 hover:bg-blue-50"
              title="Set Deadline"
            >
              {deadline ? 'Edit Deadline' : 'Set Deadline'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">{data.preview}</p>
          {/* Deadline Input UI */}
          {showDeadlineInput && (
            <div className="mt-2 flex flex-col items-center">
              <input
                type="datetime-local"
                className="border rounded px-2 py-1 text-xs"
                onChange={e => setDeadline(e.target.value)}
                value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
                min={new Date().toISOString().slice(0,16)}
                disabled={saving}
              />
              <button
                className="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded"
                onClick={async () => {
                  setShowDeadlineInput(false);
                  await persistDeadline(deadline);
                }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Done'}
              </button>
            </div>
          )}
          {/* Timer Display */}
          {deadline && (
            <div className="mt-2 text-xs text-blue-700 font-semibold">⏰ Time left: {getTimeLeft()}</div>
          )}
        </div>
      )}
      
      {/* Interactive Element */}
      <div className={['divider', 'spacer', 'container', 'grid'].includes(data.type) ? '' : 'mb-2'}>
        {renderInteractiveElement()}
      </div>
      
      {/* Element Type Label */}
      <div className="absolute -top-2 -left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {data.type.toUpperCase()}
      </div>
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          E
        </div>
      )}
      
      {/* Table Preview Modal */}
      {showPreview && isTableElement() && (
        <TablePreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          tableData={getPreviewTableData()}
          tableName={data.name}
          tableType={data.id}
        />
      )}

      {showDocumentPreview && data.documentUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{data.name}</h3>
                <p className="text-xs text-slate-500">{data.documentMeta?.id || 'Document preview'}</p>
              </div>
              <button
                onClick={() => setShowDocumentPreview(false)}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={`${data.documentUrl}#toolbar=0&navpanes=0`}
                title={data.documentMeta?.id || 'Document preview'}
                className="h-full w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElementNode;
