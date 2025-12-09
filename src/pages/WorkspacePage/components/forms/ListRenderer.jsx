import React, { useState } from 'react';
import { Plus, Minus, Check, X, Clock, ArrowRight } from 'lucide-react';

const ListRenderer = ({ data, listType }) => {
  // Use data.id as the primary listType, fallback to listType prop
  const actualListType = data?.id || listType;
  
  // Initialize list items based on type
  const getDefaultItems = (type) => {
    switch (type) {
      case 'bullet-list':
      case 'simple-list':
        return ['First item', 'Second item', 'Third item'];
      case 'numbered-list':
        return ['First step', 'Second step', 'Third step'];
      case 'checklist':
        return [
          { text: 'Task 1', completed: false },
          { text: 'Task 2', completed: true },
          { text: 'Task 3', completed: false }
        ];
      case 'definition-list':
        return [
          { term: 'Term 1', definition: 'Definition for term 1' },
          { term: 'Term 2', definition: 'Definition for term 2' }
        ];
      case 'nested-list':
        return [
          { text: 'Main item 1', children: ['Sub item 1.1', 'Sub item 1.2'] },
          { text: 'Main item 2', children: ['Sub item 2.1'] }
        ];
      case 'timeline-list':
        return [
          { time: '9:00 AM', event: 'Meeting start' },
          { time: '10:30 AM', event: 'Presentation' },
          { time: '12:00 PM', event: 'Lunch break' }
        ];
      default:
        return ['Item 1', 'Item 2', 'Item 3'];
    }
  };

  // Use custom list data if available, otherwise use defaults
  const initialItems = data?.customListData?.items || getDefaultItems(actualListType);
  const [listItems, setListItems] = useState(initialItems);
  const [listTitle] = useState(data?.customListData?.title || data?.name || 'List');

  // Add new item based on list type
  const addItem = () => {
    switch (actualListType) {
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
      case 'bullet-list':
      case 'simple-list':
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

  // Update item text
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

  // Render different list types
  const renderBulletList = () => (
    <div className="space-y-2">
      {listItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-2 group">
          <span className="text-blue-600 font-bold">•</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            className="flex-1 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeItem(index);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
            disabled={listItems.length === 1}
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  const renderNumberedList = () => (
    <div className="space-y-2">
      {listItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-2 group">
          <span className="text-blue-600 font-bold min-w-[20px]">{index + 1}.</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            className="flex-1 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeItem(index);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
            disabled={listItems.length === 1}
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  const renderChecklist = () => (
    <div className="space-y-2">
      {listItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-2 group">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCheck(index);
            }}
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
            className={`flex-1 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1 ${
              item.completed ? 'line-through text-gray-500' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeItem(index);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
            disabled={listItems.length === 1}
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  const renderDefinitionList = () => (
    <div className="space-y-3">
      {listItems.map((item, index) => (
        <div key={index} className="group">
          <div className="flex items-center space-x-2 mb-1">
            <input
              type="text"
              value={item.term}
              onChange={(e) => updateItem(index, e.target.value, 'term')}
              className="font-semibold text-blue-700 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
              placeholder="Term"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeItem(index);
              }}
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
              className="w-full text-gray-700 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
              placeholder="Definition"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderNestedList = () => (
    <div className="space-y-2">
      {listItems.map((item, index) => (
        <div key={index} className="group">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-blue-600 font-bold">•</span>
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItem(index, e.target.value, 'text')}
              className="flex-1 font-medium bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                addSubItem(index);
              }}
              className="opacity-0 group-hover:opacity-100 text-green-500 hover:text-green-700 transition-opacity"
              title="Add sub-item"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeItem(index);
              }}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
              disabled={listItems.length === 1}
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
          {item.children && item.children.length > 0 && (
            <div className="ml-6 space-y-1">
              {item.children.map((child, subIndex) => (
                <div key={subIndex} className="flex items-center space-x-2 group/sub">
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    value={child}
                    onChange={(e) => updateSubItem(index, subIndex, e.target.value)}
                    className="flex-1 text-sm bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSubItem(index, subIndex);
                    }}
                    className="opacity-0 group-hover/sub:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTimelineList = () => (
    <div className="space-y-3">
      {listItems.map((item, index) => (
        <div key={index} className="flex items-start space-x-3 group">
          <div className="flex flex-col items-center">
            <Clock className="w-4 h-4 text-blue-500" />
            {index < listItems.length - 1 && (
              <div className="w-0.5 h-8 bg-blue-200 mt-1"></div>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <input
              type="text"
              value={item.time}
              onChange={(e) => updateItem(index, e.target.value, 'time')}
              className="text-sm font-medium text-blue-600 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
              placeholder="Time"
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="text"
              value={item.event}
              onChange={(e) => updateItem(index, e.target.value, 'event')}
              className="w-full text-gray-700 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
              placeholder="Event"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeItem(index);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
            disabled={listItems.length === 1}
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  // Render the appropriate list type
  const renderList = () => {
    switch (actualListType) {
      case 'bullet-list':
      case 'simple-list':
        return renderBulletList();
      case 'numbered-list':
        return renderNumberedList();
      case 'checklist':
        return renderChecklist();
      case 'definition-list':
        return renderDefinitionList();
      case 'nested-list':
        return renderNestedList();
      case 'timeline-list':
        return renderTimelineList();
      default:
        return renderBulletList();
    }
  };

  return (
    <div className="w-full">
      {/* List Title */}
      {listTitle && listTitle !== 'List' && (
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{listTitle}</h3>
        </div>
      )}
      
      {/* List Content */}
      <div className="mb-4">
        {renderList()}
      </div>
      
      {/* Add Item Button */}
      <div className="flex justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            addItem();
          }}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors border border-blue-200"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>
      
      {/* List Info */}
      <div className="text-center text-xs text-gray-500 mt-2">
        {listItems.length} item{listItems.length !== 1 ? 's' : ''} • Click to edit
      </div>
    </div>
  );
};

export default ListRenderer;
