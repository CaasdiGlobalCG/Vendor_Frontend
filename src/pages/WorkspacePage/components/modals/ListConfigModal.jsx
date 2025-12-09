import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Clock, ArrowRight, List, Hash, CheckSquare, BookOpen, GitBranch, Calendar } from 'lucide-react';

const ListConfigModal = ({ isOpen, onClose, onConfirm, listType }) => {
  const [listTitle, setListTitle] = useState('');
  const [listItems, setListItems] = useState([]);

  // Get default configuration based on list type
  const getDefaultConfig = (type) => {
    switch (type) {
      case 'bullet-list':
      case 'simple-list':
        return {
          title: 'My Bullet List',
          items: ['First item', 'Second item', 'Third item']
        };
      case 'numbered-list':
        return {
          title: 'My Numbered List',
          items: ['First step', 'Second step', 'Third step']
        };
      case 'checklist':
        return {
          title: 'My Task List',
          items: [
            { text: 'Complete project proposal', completed: false },
            { text: 'Review team feedback', completed: false },
            { text: 'Schedule client meeting', completed: false }
          ]
        };
      case 'definition-list':
        return {
          title: 'Definitions',
          items: [
            { term: 'API', definition: 'Application Programming Interface' },
            { term: 'UI', definition: 'User Interface' },
            { term: 'UX', definition: 'User Experience' }
          ]
        };
      case 'nested-list':
        return {
          title: 'Project Structure',
          items: [
            { text: 'Frontend Development', children: ['React Components', 'Styling', 'Testing'] },
            { text: 'Backend Development', children: ['API Design', 'Database Setup'] },
            { text: 'Deployment', children: ['Production Setup'] }
          ]
        };
      case 'timeline-list':
        return {
          title: 'Project Timeline',
          items: [
            { time: '9:00 AM', event: 'Project kickoff meeting' },
            { time: '11:00 AM', event: 'Requirements gathering' },
            { time: '2:00 PM', event: 'Design review session' },
            { time: '4:00 PM', event: 'Development planning' }
          ]
        };
      default:
        return {
          title: 'My List',
          items: ['Item 1', 'Item 2', 'Item 3']
        };
    }
  };

  // Initialize with default values when modal opens or listType changes
  useEffect(() => {
    if (isOpen && listType) {
      const defaultConfig = getDefaultConfig(listType);
      setListTitle(defaultConfig.title);
      setListItems(defaultConfig.items);
    }
  }, [isOpen, listType]);

  // Get list type display info
  const getListTypeInfo = (type) => {
    switch (type) {
      case 'bullet-list':
      case 'simple-list':
        return { name: 'Bullet List', icon: List, description: 'Unordered list with bullet points' };
      case 'numbered-list':
        return { name: 'Numbered List', icon: Hash, description: 'Ordered list with sequential numbers' };
      case 'checklist':
        return { name: 'Checklist', icon: CheckSquare, description: 'Task list with checkboxes' };
      case 'definition-list':
        return { name: 'Definition List', icon: BookOpen, description: 'Terms with their definitions' };
      case 'nested-list':
        return { name: 'Nested List', icon: GitBranch, description: 'Multi-level hierarchical list' };
      case 'timeline-list':
        return { name: 'Timeline', icon: Calendar, description: 'Chronological list of events' };
      default:
        return { name: 'List', icon: List, description: 'Basic list' };
    }
  };

  // Add new item based on list type
  const addItem = () => {
    switch (listType) {
      case 'checklist':
        setListItems([...listItems, { text: 'New task', completed: false }]);
        break;
      case 'definition-list':
        setListItems([...listItems, { term: 'New term', definition: 'New definition' }]);
        break;
      case 'nested-list':
        setListItems([...listItems, { text: 'New main item', children: [] }]);
        break;
      case 'timeline-list':
        setListItems([...listItems, { time: '12:00 PM', event: 'New event' }]);
        break;
      default:
        setListItems([...listItems, `New item ${listItems.length + 1}`]);
    }
  };

  // Remove item
  const removeItem = (index) => {
    if (listItems.length > 1) {
      setListItems(listItems.filter((_, i) => i !== index));
    }
  };

  // Update item
  const updateItem = (index, newValue, field = null) => {
    const updatedItems = listItems.map((item, i) => {
      if (i === index) {
        if (typeof item === 'string') {
          return newValue;
        } else if (field) {
          return { ...item, [field]: newValue };
        }
      }
      return item;
    });
    setListItems(updatedItems);
  };

  // Toggle checkbox for checklist
  const toggleCheck = (index) => {
    const updatedItems = listItems.map((item, i) => 
      i === index ? { ...item, completed: !item.completed } : item
    );
    setListItems(updatedItems);
  };

  // Add sub-item to nested list
  const addSubItem = (parentIndex) => {
    const updatedItems = listItems.map((item, i) => 
      i === parentIndex 
        ? { ...item, children: [...item.children, `Sub item ${item.children.length + 1}`] }
        : item
    );
    setListItems(updatedItems);
  };

  // Remove sub-item from nested list
  const removeSubItem = (parentIndex, subIndex) => {
    const updatedItems = listItems.map((item, i) => 
      i === parentIndex 
        ? { ...item, children: item.children.filter((_, si) => si !== subIndex) }
        : item
    );
    setListItems(updatedItems);
  };

  // Update sub-item text
  const updateSubItem = (parentIndex, subIndex, newValue) => {
    const updatedItems = listItems.map((item, i) => 
      i === parentIndex 
        ? { 
            ...item, 
            children: item.children.map((child, si) => si === subIndex ? newValue : child)
          }
        : item
    );
    setListItems(updatedItems);
  };

  // Handle confirm
  const handleConfirm = () => {
    const listConfig = {
      title: listTitle,
      items: listItems,
      listType: listType
    };
    onConfirm(listConfig);
  };

  // Handle close
  const handleClose = () => {
    onClose();
  };

  // Render item editor based on list type
  const renderItemEditor = (item, index) => {
    switch (listType) {
      case 'bullet-list':
      case 'simple-list':
      case 'numbered-list':
        return (
          <div key={index} className="flex items-center space-x-3 group">
            <span className="text-blue-600 font-bold min-w-[20px]">
              {listType === 'numbered-list' ? `${index + 1}.` : '•'}
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter item text"
            />
            <button
              onClick={() => removeItem(index)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
              disabled={listItems.length === 1}
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        );

      case 'checklist':
        return (
          <div key={index} className="flex items-center space-x-3 group">
            <button
              onClick={() => toggleCheck(index)}
              className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                item.completed 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {item.completed && <Check className="w-3 h-3" />}
            </button>
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItem(index, e.target.value, 'text')}
              className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                item.completed ? 'line-through text-gray-500' : ''
              }`}
              placeholder="Enter task"
            />
            <button
              onClick={() => removeItem(index)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
              disabled={listItems.length === 1}
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        );

      case 'definition-list':
        return (
          <div key={index} className="space-y-2 group">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={item.term}
                onChange={(e) => updateItem(index, e.target.value, 'term')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                placeholder="Enter term"
              />
              <button
                onClick={() => removeItem(index)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                disabled={listItems.length === 1}
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
            <div className="ml-4">
              <input
                type="text"
                value={item.definition}
                onChange={(e) => updateItem(index, e.target.value, 'definition')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter definition"
              />
            </div>
          </div>
        );

      case 'nested-list':
        return (
          <div key={index} className="space-y-2 group">
            <div className="flex items-center space-x-3">
              <span className="text-blue-600 font-bold">•</span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItem(index, e.target.value, 'text')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                placeholder="Enter main item"
              />
              <button
                onClick={() => addSubItem(index)}
                className="text-green-500 hover:text-green-700 transition-colors"
                title="Add sub-item"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeItem(index)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                disabled={listItems.length === 1}
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
            {item.children && item.children.length > 0 && (
              <div className="ml-8 space-y-1">
                {item.children.map((child, subIndex) => (
                  <div key={subIndex} className="flex items-center space-x-2 group/sub">
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      value={child}
                      onChange={(e) => updateSubItem(index, subIndex, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter sub-item"
                    />
                    <button
                      onClick={() => removeSubItem(index, subIndex)}
                      className="opacity-0 group-hover/sub:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'timeline-list':
        return (
          <div key={index} className="flex items-start space-x-3 group">
            <Clock className="w-4 h-4 text-blue-500 mt-3" />
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={item.time}
                onChange={(e) => updateItem(index, e.target.value, 'time')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                placeholder="Enter time (e.g., 9:00 AM)"
              />
              <input
                type="text"
                value={item.event}
                onChange={(e) => updateItem(index, e.target.value, 'event')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event description"
              />
            </div>
            <button
              onClick={() => removeItem(index)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity mt-2"
              disabled={listItems.length === 1}
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const typeInfo = getListTypeInfo(listType);
  const TypeIcon = typeInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TypeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{typeInfo.name} Configuration</h2>
              <p className="text-sm text-gray-600">{typeInfo.description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* List Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Title
            </label>
            <input
              type="text"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
              placeholder="Enter list title"
            />
          </div>

          {/* List Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                List Items ({listItems.length})
              </label>
              <button
                onClick={addItem}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors border border-blue-200"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {listItems.map((item, index) => renderItemEditor(item, index))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <div className="bg-white rounded border p-3 text-sm">
              <div className="font-medium text-gray-900 mb-2">{listTitle}</div>
              <div className="text-gray-600">
                {listItems.length} item{listItems.length !== 1 ? 's' : ''} • {typeInfo.name}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                // Use default values
                const defaultConfig = getDefaultConfig(listType);
                onConfirm({
                  title: defaultConfig.title,
                  items: defaultConfig.items,
                  listType: listType
                });
              }}
              className="px-6 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Use Default
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListConfigModal;
