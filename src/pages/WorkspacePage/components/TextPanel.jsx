import React, { useState, useEffect } from 'react';
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
  X,
  ChevronDown
} from 'lucide-react';

const TextPanel = ({ isOpen, onClose, selectedTextElement, onUpdateTextElement }) => {
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedSize, setSelectedSize] = useState('16');
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [activeFormats, setActiveFormats] = useState(new Set());
  const [isTextMode, setIsTextMode] = useState(false);

  // Font families
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

  // Background colors
  const backgroundColors = [
    '#ffffff', '#f3f3f3', '#e8e8e8', '#d9d9d9', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900', '#ff0000'
  ];

  // Load selected text element properties
  useEffect(() => {
    if (selectedTextElement) {
      setSelectedFont(selectedTextElement.fontFamily || 'Arial');
      setSelectedSize(selectedTextElement.fontSize || '16');
      setTextColor(selectedTextElement.color || '#000000');
      setBackgroundColor(selectedTextElement.backgroundColor || '#ffffff');
      setActiveFormats(new Set(selectedTextElement.formats || []));
    }
  }, [selectedTextElement]);

  // Listen for text mode changes from canvas
  useEffect(() => {
    const handleTextModeChange = (event) => {
      console.log('📝 TextPanel: Text mode event received:', event.detail.active);
      setIsTextMode(event.detail.active);
    };

    document.addEventListener('activateTextMode', handleTextModeChange);
    return () => document.removeEventListener('activateTextMode', handleTextModeChange);
  }, []);

  // Activate text mode for creating new text
  const handleActivateTextMode = () => {
    setIsTextMode(true);
    const event = new CustomEvent('activateTextMode', { 
      detail: { 
        active: true,
        fontSize: selectedSize,
        fontFamily: selectedFont,
        color: textColor,
        backgroundColor: backgroundColor
      } 
    });
    document.dispatchEvent(event);
  };

  // Deactivate text mode
  const handleDeactivateTextMode = () => {
    setIsTextMode(false);
    const event = new CustomEvent('activateTextMode', { detail: { active: false } });
    document.dispatchEvent(event);
  };

  const toggleFormat = (format) => {
    const newFormats = new Set(activeFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    setActiveFormats(newFormats);

    if (selectedTextElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...selectedTextElement,
        formats: Array.from(newFormats)
      });
    }
  };

  const updateTextProperty = (property, value) => {
    if (selectedTextElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...selectedTextElement,
        [property]: value
      });
    }
  };

  if (!isOpen) return null;

  // If no text element is selected, show activation mode
  if (!selectedTextElement) {
    return (
      <div className="fixed right-0 top-0 w-96 h-full bg-surface shadow-2xl border-l border-line z-40 flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-line">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Type className="w-5 h-5 text-info" />
              <h3 className="text-xl font-semibold text-ink">Text Tool</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dim" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-info/10 rounded-full">
                <Type className="w-8 h-8 text-info" />
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-ink mb-2">Add Text</h4>
              <p className="text-sm text-dim mb-4">
                Click the button below to activate text mode. Click on the canvas to add a text box, then type directly.
              </p>
            </div>
            <button
              onClick={handleActivateTextMode}
              className={`w-full p-3 rounded-lg transition-all font-medium ${
                isTextMode 
                  ? 'bg-success hover:bg-success text-white' 
                  : 'bg-info hover:bg-info text-white'
              }`}
            >
              {isTextMode ? '✓ Text Mode Active - Click on canvas' : 'Activate Text Mode'}
            </button>
            {isTextMode && (
              <button
                onClick={handleDeactivateTextMode}
                className="w-full p-2 mt-2 border border-danger/30 rounded-lg text-danger hover:bg-danger/10 transition-all text-sm font-medium"
              >
                ✕ Exit Text Mode
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If text element is selected, show formatting options
  return (
    <div className="fixed right-0 top-0 w-96 h-full bg-surface shadow-2xl border-l border-line z-40 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-line">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Type className="w-5 h-5 text-info" />
            <h3 className="text-xl font-semibold text-ink">Text Formatting</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Font Selection */}
        <div className="p-4 border-b border-line">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Font</label>
              <div className="relative">
                <select 
                  value={selectedFont}
                  onChange={(e) => {
                    setSelectedFont(e.target.value);
                    updateTextProperty('fontFamily', e.target.value);
                  }}
                  className="w-full p-2 border border-line rounded text-sm focus:outline-none focus:ring-2 focus:ring-info appearance-none bg-surface"
                >
                  {fonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-dim absolute right-2 top-1/2 -translate-y-1/2 transform  pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Size</label>
              <div className="relative">
                <select 
                  value={selectedSize}
                  onChange={(e) => {
                    setSelectedSize(e.target.value);
                    updateTextProperty('fontSize', e.target.value);
                  }}
                  className="w-full p-2 border border-line rounded text-sm focus:outline-none focus:ring-2 focus:ring-info appearance-none bg-surface"
                >
                  {sizes.map(size => (
                    <option key={size} value={size}>{size}pt</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-dim absolute right-2 top-1/2 -translate-y-1/2 transform  pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Text Style Buttons */}
        <div className="p-4 border-b border-line">
          <label className="block text-xs font-medium text-ink mb-2">Style</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => toggleFormat('bold')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('bold') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('italic')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('italic') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('underline')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('underline') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('strikethrough')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('strikethrough') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <Strikethrough className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Text Color */}
        <div className="p-4 border-b border-line">
          <label className="block text-xs font-medium text-ink mb-2">Text Color</label>
          <div className="grid grid-cols-10 gap-1">
            {textColors.map(color => (
              <button
                key={color}
                onClick={() => {
                  setTextColor(color);
                  updateTextProperty('color', color);
                }}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  textColor === color ? 'border-info scale-110' : 'border-line hover:border-line'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div className="p-4 border-b border-line">
          <label className="block text-xs font-medium text-ink mb-2">Background</label>
          <div className="grid grid-cols-10 gap-1">
            {backgroundColors.map(color => (
              <button
                key={color}
                onClick={() => {
                  setBackgroundColor(color);
                  updateTextProperty('backgroundColor', color);
                }}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  backgroundColor === color ? 'border-info scale-110' : 'border-line hover:border-line'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Alignment */}
        <div className="p-4 border-b border-line">
          <label className="block text-xs font-medium text-ink mb-2">Alignment</label>
          <div className="flex gap-1">
            <button
              onClick={() => toggleFormat('align-left')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-left') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('align-center')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-center') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('align-right')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-right') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleFormat('align-justify')}
              className={`p-2 rounded border transition-colors ${
                activeFormats.has('align-justify') 
                  ? 'bg-info/10 border-info/30 text-info' 
                  : 'bg-surface border-line text-dim hover:bg-canvas'
              }`}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-info/10 border border-info/20 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-medium text-info mb-2">💡 How it works:</h4>
            <p className="text-xs text-info">
              Click on text on the canvas to select it, then use these formatting options to style it instantly.
            </p>
          </div>
          
          {!isTextMode && (
            <button
              onClick={handleActivateTextMode}
              className="w-full p-2 mb-2 bg-info hover:bg-info text-white rounded-lg transition-all text-sm font-medium"
            >
              + Activate Text Mode
            </button>
          )}
          
          {isTextMode && (
            <button
              onClick={handleDeactivateTextMode}
              className="w-full p-2 border border-danger/30 rounded-lg text-danger hover:bg-danger/10 transition-all text-sm font-medium"
            >
              ✕ Exit Text Mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextPanel;
