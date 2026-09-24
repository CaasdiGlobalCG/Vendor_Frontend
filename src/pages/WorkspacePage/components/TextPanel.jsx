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
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  RotateCw,
  X,
  ChevronDown
} from 'lucide-react';

// Small Figma-style field input: label chip + inline value
const FieldInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 bg-canvas rounded-md border border-transparent focus-within:border-info transition-colors">
    <span className="text-[10px] font-medium text-dim shrink-0 select-none">{label}</span>
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-xs text-ink outline-none"
    />
  </div>
);

// Compact icon toggle used for alignment/style buttons
const ToggleIcon = ({ active, onClick, title, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded-md transition-colors ${
      active ? 'bg-surface-hover text-ink shadow-sm' : 'text-dim hover:bg-canvas'
    }`}
  >
    {children}
  </button>
);

// Color swatch + hex input row
const ColorRow = ({ color, onChange }) => {
  const hex = (color || '#000000').replace('#', '');
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded-md cursor-pointer border border-line p-0.5 bg-canvas shrink-0"
      />
      <div className="flex items-center gap-1 flex-1 min-w-0 px-2 py-1.5 bg-canvas rounded-md border border-transparent focus-within:border-info transition-colors">
        <input
          value={hex.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
            if (v.length === 6) onChange(`#${v}`);
          }}
          className="w-full bg-transparent text-xs text-ink outline-none font-mono"
        />
      </div>
    </div>
  );
};

const TextPanel = ({ isOpen, onClose, selectedTextElement, onUpdateTextElement }) => {
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedSize, setSelectedSize] = useState('16');
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [activeFormats, setActiveFormats] = useState(new Set());
  const [isTextMode, setIsTextMode] = useState(false);

  // Figma-style inspector state
  const [fontWeight, setFontWeight] = useState('regular');
  const [lineHeight, setLineHeight] = useState('1.5');
  const [letterSpacing, setLetterSpacing] = useState('0');
  const [verticalAlign, setVerticalAlign] = useState('middle');
  const [opacity, setOpacity] = useState('100');
  const [cornerRadius, setCornerRadius] = useState('12');
  const [rotation, setRotation] = useState('0');
  const [posX, setPosX] = useState('0');
  const [posY, setPosY] = useState('0');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState('0');
  const [shadow, setShadow] = useState(false);

  // Font families
  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
    'Calibri', 'Cambria', 'Trebuchet MS', 'Comic Sans MS', 'Impact',
    'Courier New', 'Lucida Console', 'Tahoma', 'Palatino', 'Garamond'
  ];

  // Font sizes
  const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

  // Load selected text element properties
  useEffect(() => {
    if (selectedTextElement) {
      const formats = Array.isArray(selectedTextElement.formats)
        ? selectedTextElement.formats
        : Object.keys(selectedTextElement.formats || {}).filter(k => selectedTextElement.formats[k]);
      setSelectedFont(selectedTextElement.fontFamily || 'Arial');
      setSelectedSize(String(selectedTextElement.fontSize || '16'));
      setTextColor(selectedTextElement.color || '#000000');
      setBackgroundColor(selectedTextElement.backgroundColor || '#ffffff');
      setActiveFormats(new Set(formats));
      setFontWeight(selectedTextElement.fontWeight || (formats.includes('bold') ? 'bold' : 'regular'));
      setLineHeight(String(selectedTextElement.lineHeight ?? '1.5'));
      setLetterSpacing(String(selectedTextElement.letterSpacing ?? '0'));
      setVerticalAlign(selectedTextElement.verticalAlign || 'middle');
      setOpacity(String(selectedTextElement.opacity ?? '100'));
      setCornerRadius(String(selectedTextElement.borderRadius ?? '12'));
      setRotation(String(selectedTextElement.rotation ?? '0'));
      setPosX(String(Math.round(selectedTextElement.position?.x ?? 0)));
      setPosY(String(Math.round(selectedTextElement.position?.y ?? 0)));
      setWidth(selectedTextElement.width != null ? String(Math.round(selectedTextElement.width)) : '');
      setHeight(selectedTextElement.height != null ? String(Math.round(selectedTextElement.height)) : '');
      setStrokeColor(selectedTextElement.strokeColor || '#000000');
      setStrokeWidth(String(selectedTextElement.strokeWidth ?? '0'));
      setShadow(!!selectedTextElement.shadow);
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

  const updatePosition = (x, y) => {
    if (selectedTextElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...selectedTextElement,
        position: { x: Number(x) || 0, y: Number(y) || 0 }
      });
    }
  };

  const updateDimension = (key, value) => {
    if (selectedTextElement && onUpdateTextElement) {
      onUpdateTextElement({
        ...selectedTextElement,
        [key]: value === '' || value == null ? null : Number(value)
      });
    }
  };

  const setAlignment = (align) => {
    const formats = new Set(activeFormats);
    ['align-left', 'align-center', 'align-right', 'align-justify'].forEach(f => formats.delete(f));
    if (align !== 'left') formats.add(`align-${align}`);
    setActiveFormats(formats);
    if (selectedTextElement && onUpdateTextElement) {
      onUpdateTextElement({ ...selectedTextElement, formats: Array.from(formats) });
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

  // If text element is selected, show the Figma-style inspector
  const currentAlign = activeFormats.has('align-center') ? 'center'
    : activeFormats.has('align-right') ? 'right'
    : activeFormats.has('align-justify') ? 'justify' : 'left';

  const weights = [
    { value: 'regular', label: 'Regular' },
    { value: 'medium', label: 'Medium' },
    { value: 'semibold', label: 'Semibold' },
    { value: 'bold', label: 'Bold' },
  ];

  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-surface shadow-2xl border-l border-line z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-line">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Text</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-canvas rounded-md transition-colors">
            <X className="w-4 h-4 text-dim" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Position */}
        <div className="px-4 py-3 border-b border-line">
          <div className="text-[11px] font-medium text-dim mb-2">Position</div>
          <div className="flex gap-2 mb-2">
            <FieldInput label="X" value={posX} onChange={(v) => { setPosX(v); updatePosition(v, posY); }} />
            <FieldInput label="Y" value={posY} onChange={(v) => { setPosY(v); updatePosition(posX, v); }} />
          </div>
          <div className="flex items-center gap-2">
            <RotateCw className="w-3.5 h-3.5 text-dim shrink-0" />
            <FieldInput label="°" value={rotation} onChange={(v) => { setRotation(v); updateTextProperty('rotation', Number(v) || 0); }} />
          </div>
        </div>

        {/* Layout */}
        <div className="px-4 py-3 border-b border-line">
          <div className="text-[11px] font-medium text-dim mb-2">Layout</div>
          <div className="text-[10px] text-dim mb-1">Dimensions</div>
          <div className="flex gap-2">
            <FieldInput label="W" value={width} placeholder="Auto" onChange={(v) => { setWidth(v); updateDimension('width', v); }} />
            <FieldInput label="H" value={height} placeholder="Auto" onChange={(v) => { setHeight(v); updateDimension('height', v); }} />
          </div>
        </div>

        {/* Appearance */}
        <div className="px-4 py-3 border-b border-line">
          <div className="text-[11px] font-medium text-dim mb-2">Appearance</div>
          <div className="flex gap-2">
            <FieldInput label="%" value={opacity} placeholder="100" onChange={(v) => { setOpacity(v); updateTextProperty('opacity', v === '' ? null : Number(v)); }} />
            <FieldInput label="◠" value={cornerRadius} placeholder="0" onChange={(v) => { setCornerRadius(v); updateTextProperty('borderRadius', Number(v) || 0); }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-dim">Opacity</span>
            <span className="text-[10px] text-dim">Corner radius</span>
          </div>
        </div>

        {/* Typography */}
        <div className="px-4 py-3 border-b border-line">
          <div className="text-[11px] font-medium text-dim mb-2">Typography</div>

          {/* Font family */}
          <div className="relative mb-2">
            <select
              value={selectedFont}
              onChange={(e) => { setSelectedFont(e.target.value); updateTextProperty('fontFamily', e.target.value); }}
              className="w-full px-2 py-1.5 bg-canvas rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-info appearance-none"
            >
              {fonts.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-dim absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Weight + size */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <select
                value={fontWeight}
                onChange={(e) => { setFontWeight(e.target.value); updateTextProperty('fontWeight', e.target.value); }}
                className="w-full px-2 py-1.5 bg-canvas rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-info appearance-none"
              >
                {weights.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-dim absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative w-20">
              <select
                value={selectedSize}
                onChange={(e) => { setSelectedSize(e.target.value); updateTextProperty('fontSize', e.target.value); }}
                className="w-full px-2 py-1.5 bg-canvas rounded-md text-xs text-ink focus:outline-none focus:ring-1 focus:ring-info appearance-none"
              >
                {sizes.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-dim absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Line height + letter spacing */}
          <div className="flex gap-2 mb-2">
            <FieldInput label="↕" value={lineHeight} onChange={(v) => { setLineHeight(v); updateTextProperty('lineHeight', v || '1.5'); }} />
            <FieldInput label="|A|" value={letterSpacing} onChange={(v) => { setLetterSpacing(v); updateTextProperty('letterSpacing', Number(v) || 0); }} />
          </div>

          {/* Alignment */}
          <div className="text-[10px] text-dim mb-1">Alignment</div>
          <div className="flex items-center gap-0.5 mb-1.5">
            <ToggleIcon title="Align left" active={currentAlign === 'left'} onClick={() => setAlignment('left')}><AlignLeft className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Align center" active={currentAlign === 'center'} onClick={() => setAlignment('center')}><AlignCenter className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Align right" active={currentAlign === 'right'} onClick={() => setAlignment('right')}><AlignRight className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Justify" active={currentAlign === 'justify'} onClick={() => setAlignment('justify')}><AlignJustify className="w-3.5 h-3.5" /></ToggleIcon>
            <div className="w-px h-4 bg-line mx-1" />
            <ToggleIcon title="Align top" active={verticalAlign === 'top'} onClick={() => { setVerticalAlign('top'); updateTextProperty('verticalAlign', 'top'); }}><AlignStartVertical className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Align middle" active={verticalAlign === 'middle'} onClick={() => { setVerticalAlign('middle'); updateTextProperty('verticalAlign', 'middle'); }}><AlignCenterVertical className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Align bottom" active={verticalAlign === 'bottom'} onClick={() => { setVerticalAlign('bottom'); updateTextProperty('verticalAlign', 'bottom'); }}><AlignEndVertical className="w-3.5 h-3.5" /></ToggleIcon>
          </div>

          {/* Style toggles */}
          <div className="flex items-center gap-0.5">
            <ToggleIcon title="Bold" active={activeFormats.has('bold')} onClick={() => toggleFormat('bold')}><Bold className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Italic" active={activeFormats.has('italic')} onClick={() => toggleFormat('italic')}><Italic className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Underline" active={activeFormats.has('underline')} onClick={() => toggleFormat('underline')}><Underline className="w-3.5 h-3.5" /></ToggleIcon>
            <ToggleIcon title="Strikethrough" active={activeFormats.has('strikethrough')} onClick={() => toggleFormat('strikethrough')}><Strikethrough className="w-3.5 h-3.5" /></ToggleIcon>
          </div>
        </div>

        {/* Fill */}
        <div className="px-4 py-3 border-b border-line">
          <div className="text-[11px] font-medium text-dim mb-2">Fill</div>
          <div className="mb-2">
            <div className="text-[10px] text-dim mb-1">Text</div>
            <ColorRow color={textColor} onChange={(v) => { setTextColor(v); updateTextProperty('color', v); }} />
          </div>
          <div>
            <div className="text-[10px] text-dim mb-1">Background</div>
            <ColorRow color={backgroundColor} onChange={(v) => { setBackgroundColor(v); updateTextProperty('backgroundColor', v); }} />
          </div>
        </div>

        {/* Stroke */}
        <div className="px-4 py-3 border-b border-line">
          <div className="text-[11px] font-medium text-dim mb-2">Stroke</div>
          <ColorRow color={strokeColor} onChange={(v) => { setStrokeColor(v); updateTextProperty('strokeColor', v); }} />
          <div className="mt-2">
            <FieldInput label="W" value={strokeWidth} placeholder="0" onChange={(v) => { setStrokeWidth(v); updateTextProperty('strokeWidth', Number(v) || 0); }} />
          </div>
        </div>

        {/* Effects */}
        <div className="px-4 py-3 border-b border-line">
          <div className="text-[11px] font-medium text-dim mb-2">Effects</div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={shadow}
              onChange={(e) => { setShadow(e.target.checked); updateTextProperty('shadow', e.target.checked); }}
              className="w-3.5 h-3.5 accent-info"
            />
            <span className="text-xs text-ink">Drop shadow</span>
          </label>
        </div>

        {/* Text mode controls */}
        <div className="p-4">
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
