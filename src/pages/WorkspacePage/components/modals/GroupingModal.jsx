import React, { useState, useEffect } from 'react';
import { X, Grid, Move, Maximize2, RotateCcw, Eye, EyeOff, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const GroupingModal = ({ isOpen, onClose, onConfirm, selectedNodes }) => {
  // GroupingModal render (log removed for performance)
  
  const [gridTitle, setGridTitle] = useState('');
  const [gridDescription, setGridDescription] = useState('');
  const [gridColumns, setGridColumns] = useState(3);
  const [gridRows, setGridRows] = useState(2);
  const [elementArrangement, setElementArrangement] = useState([]);
  const [autoArrange, setAutoArrange] = useState(true);

  // Initialize grid configuration when modal opens
  useEffect(() => {
    if (isOpen && selectedNodes.length > 0) {
      const nodeCount = selectedNodes.length;
      
      // Calculate optimal grid dimensions
      const optimalColumns = Math.ceil(Math.sqrt(nodeCount));
      const optimalRows = Math.ceil(nodeCount / optimalColumns);
      
      setGridColumns(optimalColumns);
      setGridRows(optimalRows);
      setGridTitle(`Grouped Elements (${nodeCount} items)`);
      setGridDescription(`Combined grid layout with ${nodeCount} elements`);
      
      // Auto-arrange elements in grid
      const arrangement = selectedNodes.map((node, index) => ({
        id: node.id,
        name: node.data?.name || `Element ${index + 1}`,
        type: node.type,
        data: node.data,
        originalPosition: node.position,
        gridPosition: {
          row: Math.floor(index / optimalColumns) + 1,
          col: (index % optimalColumns) + 1
        },
        visible: true
      }));
      
      setElementArrangement(arrangement);
    }
  }, [isOpen, selectedNodes]);

  const handleGridSizeChange = (columns, rows) => {
    setGridColumns(columns);
    setGridRows(rows);
    
    if (autoArrange) {
      // Re-arrange elements based on new grid size
      const newArrangement = elementArrangement.map((element, index) => ({
        ...element,
        gridPosition: {
          row: Math.floor(index / columns) + 1,
          col: (index % columns) + 1
        }
      }));
      setElementArrangement(newArrangement);
    }
  };

  const moveElement = (elementId, direction) => {
    setElementArrangement(prev => {
      const elementIndex = prev.findIndex(el => el.id === elementId);
      if (elementIndex === -1) return prev;
      
      const element = prev[elementIndex];
      const currentRow = element.gridPosition.row;
      const currentCol = element.gridPosition.col;
      
      let newRow = currentRow;
      let newCol = currentCol;
      
      switch (direction) {
        case 'up':
          newRow = Math.max(1, currentRow - 1);
          break;
        case 'down':
          newRow = Math.min(gridRows, currentRow + 1);
          break;
        case 'left':
          newCol = Math.max(1, currentCol - 1);
          break;
        case 'right':
          newCol = Math.min(gridColumns, currentCol + 1);
          break;
      }
      
      // Check if target position is occupied
      const targetOccupied = prev.find(el => 
        el.id !== elementId && 
        el.gridPosition.row === newRow && 
        el.gridPosition.col === newCol
      );
      
      if (targetOccupied) {
        // Swap positions
        const newArrangement = [...prev];
        newArrangement[elementIndex] = {
          ...element,
          gridPosition: { row: newRow, col: newCol }
        };
        const targetIndex = prev.findIndex(el => el.id === targetOccupied.id);
        newArrangement[targetIndex] = {
          ...targetOccupied,
          gridPosition: { row: currentRow, col: currentCol }
        };
        return newArrangement;
      } else {
        // Move to empty position
        const newArrangement = [...prev];
        newArrangement[elementIndex] = {
          ...element,
          gridPosition: { row: newRow, col: newCol }
        };
        return newArrangement;
      }
    });
  };

  const toggleElementVisibility = (elementId) => {
    setElementArrangement(prev => 
      prev.map(el => 
        el.id === elementId ? { ...el, visible: !el.visible } : el
      )
    );
  };

  const handleAutoArrange = () => {
    const visibleElements = elementArrangement.filter(el => el.visible);
    const newArrangement = elementArrangement.map((element, originalIndex) => {
      if (!element.visible) return element;
      
      const visibleIndex = visibleElements.findIndex(el => el.id === element.id);
      return {
        ...element,
        gridPosition: {
          row: Math.floor(visibleIndex / gridColumns) + 1,
          col: (visibleIndex % gridColumns) + 1
        }
      };
    });
    
    setElementArrangement(newArrangement);
  };

  const handleConfirm = () => {
    const groupingConfig = {
      title: gridTitle,
      description: gridDescription,
      gridColumns,
      gridRows,
      elements: elementArrangement,
      selectedNodes
    };
    
    onConfirm(groupingConfig);
  };

  const renderGridPreview = () => {
    const gridCells = [];
    
    for (let row = 1; row <= gridRows; row++) {
      for (let col = 1; col <= gridColumns; col++) {
        const element = elementArrangement.find(el => 
          el.gridPosition.row === row && 
          el.gridPosition.col === col &&
          el.visible
        );
        
        gridCells.push(
          <div
            key={`${row}-${col}`}
            className={`border-2 border-dashed rounded-lg p-2 min-h-[60px] flex items-center justify-center text-xs transition-all ${
              element 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {element ? (
              <div className="text-center">
                <div className="font-medium text-blue-700 truncate">
                  {element.name}
                </div>
                <div className="text-gray-500 text-xs">
                  {element.type}
                </div>
              </div>
            ) : (
              <span className="text-gray-400">Empty</span>
            )}
          </div>
        );
      }
    }
    
    return (
      <div 
        className="grid gap-2 p-4 bg-white rounded-lg border"
        style={{ 
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`
        }}
      >
        {gridCells}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Grid className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Group into Grid</h2>
              <p className="text-sm text-gray-500">Combine {selectedNodes.length} elements into a single grid layout</p>
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
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Configuration */}
          <div className="w-1/3 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Grid Configuration</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grid Title
                  </label>
                  <input
                    type="text"
                    value={gridTitle}
                    onChange={(e) => setGridTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter grid title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={gridDescription}
                    onChange={(e) => setGridDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="2"
                    placeholder="Brief description"
                  />
                </div>

                {/* Grid Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Columns
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={gridColumns}
                      onChange={(e) => handleGridSizeChange(parseInt(e.target.value), gridRows)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rows
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={gridRows}
                      onChange={(e) => handleGridSizeChange(gridColumns, parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoArrange"
                    checked={autoArrange}
                    onChange={(e) => setAutoArrange(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoArrange" className="text-sm text-gray-700">
                    Auto-arrange elements
                  </label>
                </div>

                {!autoArrange && (
                  <button
                    onClick={handleAutoArrange}
                    className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-2" />
                    Re-arrange Elements
                  </button>
                )}
              </div>

              {/* Element Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Elements</h3>
                
                <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {elementArrangement.map((element, index) => (
                    <div key={element.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                      <span className="text-sm font-medium text-gray-600 w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {element.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Row {element.gridPosition.row}, Col {element.gridPosition.col}
                        </div>
                      </div>
                      
                      {!autoArrange && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => moveElement(element.id, 'up')}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveElement(element.id, 'down')}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveElement(element.id, 'left')}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Move left"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveElement(element.id, 'right')}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Move right"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => toggleElementVisibility(element.id)}
                        className={`p-1 rounded transition-colors ${
                          element.visible 
                            ? 'text-green-600 hover:text-green-800' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={element.visible ? 'Hide element' : 'Show element'}
                      >
                        {element.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Grid Preview</h3>
              <div className="text-sm text-gray-500">
                {gridColumns} × {gridRows} grid • {elementArrangement.filter(el => el.visible).length} visible elements
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4">
              {renderGridPreview()}
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 flex-shrink-0">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Preview Information</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Title:</strong> {gridTitle || 'Untitled Grid'}</p>
                <p><strong>Size:</strong> {gridColumns} columns × {gridRows} rows</p>
                <p><strong>Elements:</strong> {elementArrangement.filter(el => el.visible).length} visible, {elementArrangement.filter(el => !el.visible).length} hidden</p>
                <p><strong>Layout:</strong> {autoArrange ? 'Auto-arranged' : 'Custom arrangement'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            Selected elements will be combined into a single grid layout
          </div>
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
              Create Grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupingModal;
