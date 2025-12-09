import React, { useState } from 'react';
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Link,
  Palette,
  Highlighter,
  MoreHorizontal,
  X,
  ChevronDown
} from 'lucide-react';

const TextPanel = ({ isOpen, onClose }) => {
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedSize, setSelectedSize] = useState('12');
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [activeFormats, setActiveFormats] = useState(new Set());

  // Font families like Google Docs
  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
    'Calibri', 'Cambria', 'Trebuchet MS', 'Comic Sans MS', 'Impact',
    'Courier New', 'Lucida Console', 'Tahoma', 'Palatino', 'Garamond'
  ];

  // Font sizes
  const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

  // Text colors
  const textColors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
  ];

  // Highlight colors
  const highlightColors = [
    '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900', '#ff0000', '#0000ff', '#9900ff',
    '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#f4cccc'
  ];

  const toggleFormat = (format) => {
    const newFormats = new Set(activeFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    setActiveFormats(newFormats);
  };

  const handleTextInsert = () => {
    // Create text data with current formatting
    const textData = {
      id: `text_${Date.now()}`,
      name: 'Text Box',
      type: 'text',
      preview: 'Editable text element',
      content: 'Double click to edit text',
      fontSize: selectedSize,
      fontFamily: selectedFont,
      color: textColor,
      backgroundColor: highlightColor !== '#ffff00' ? highlightColor : 'transparent',
      formats: Array.from(activeFormats)
    };

    console.log('Text box created:', textData);
    
    // Create a custom event to add text to canvas
    const customEvent = new CustomEvent('textElementDrop', {
      detail: textData
    });
    
    // Dispatch to the canvas area
    document.dispatchEvent(customEvent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 w-96 h-full bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Type className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Text Formatting</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Formatting Controls */}
      <div className="flex-1 overflow-y-auto">
        {/* Font Selection */}
        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            {/* Font Family */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Font</label>
              <div className="relative">
                <select 
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  {fonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
              <div className="relative">
                <select 
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  {sizes.map(size => (
                    <option key={size} value={size}>{size}pt</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Text Style Buttons */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">Style</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => toggleFormat('bold')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('bold') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('italic')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('italic') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('underline')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('underline') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('strikethrough')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('strikethrough') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Strikethrough className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Text Color */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">Text Color</label>
          <div className="grid grid-cols-10 gap-1">
            {textColors.map(color => (
              <button
                key={color}
                onClick={() => setTextColor(color)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  textColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Highlight Color */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">Highlight Color</label>
          <div className="grid grid-cols-8 gap-1">
            {highlightColors.map(color => (
              <button
                key={color}
                onClick={() => setHighlightColor(color)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  highlightColor === color ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Alignment */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">Alignment</label>
          <div className="flex gap-1">
            <button
              onClick={() => toggleFormat('align-left')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-left') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('align-center')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-center') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('align-right')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-right') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('align-justify')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-justify') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lists and Indentation */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">Lists & Indentation</label>
          <div className="flex gap-1">
            <button
              onClick={() => toggleFormat('bullet-list')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('bullet-list') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('numbered-list')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('numbered-list') 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('indent')}
              className="p-2 rounded border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Indent className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('outdent')}
              className="p-2 rounded border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Outdent className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Insert Text Box */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">Insert Text</label>
          <button
            onClick={handleTextInsert}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Type className="w-4 h-4" />
            <span>Add Text Box</span>
          </button>
        </div>

        {/* Text Editing Instructions */}
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-2">How to use:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Click "Add Text Box" to insert text on canvas</li>
              <li>• Select any text element on canvas</li>
              <li>• Use the formatting options above to style it</li>
              <li>• Changes apply to selected text instantly</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            🎯 Text Formatting Tools
          </p>
          <p className="text-xs text-gray-500">
            Format text and add text elements to your design
          </p>
        </div>
      </div>
    </div>
  );
};

export default TextPanel;
