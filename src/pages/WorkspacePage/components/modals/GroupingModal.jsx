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
      setGridTitle(`Group Container (${nodeCount} items)`);
      setGridDescription(`Container holding ${nodeCount} grouped elements`);
      
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
                ? 'border-info/30 bg-info/10' 
                : 'border-line bg-canvas'
            }`}
          >
            {element ? (
              <div className="text-center">
                <div className="font-medium text-info truncate">
                  {element.name}
                </div>
                <div className="text-dim text-xs">
                  {element.type}
                </div>
              </div>
            ) : (
              <span className="text-dim">Empty</span>
            )}
          </div>
        );
      }
    }
    
    return (
      <div 
        className="grid gap-2 p-4 bg-surface rounded-lg border"
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
      <div className="bg-surface rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Grid className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">Group into Grid</h2>
              <p className="text-sm text-dim">Combine {selectedNodes.length} elements into a single grid layout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Configuration */}
          <div className="w-1/3 p-6 border-r border-line overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-ink">Grid Configuration</h3>
                
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Grid Title
                  </label>
                  <input
                    type="text"
                    value={gridTitle}
                    onChange={(e) => setGridTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info"
                    placeholder="Enter grid title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Description
                  </label>
                  <textarea
                    value={gridDescription}
                    onChange={(e) => setGridDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info"
                    rows="2"
                    placeholder="Brief description"
                  />
                </div>

                {/* Grid Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Columns
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={gridColumns}
                      onChange={(e) => handleGridSizeChange(parseInt(e.target.value), gridRows)}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Rows
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={gridRows}
                      onChange={(e) => handleGridSizeChange(gridColumns, parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoArrange"
                    checked={autoArrange}
                    onChange={(e) => setAutoArrange(e.target.checked)}
                    className="rounded border-line text-info focus:ring-info"
                  />
                  <label htmlFor="autoArrange" className="text-sm text-ink">
                    Auto-arrange elements
                  </label>
                </div>

                {!autoArrange && (
                  <button
                    onClick={handleAutoArrange}
                    className="w-full px-3 py-2 text-sm bg-surface-hover hover:bg-surface-hover text-ink rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-2" />
                    Re-arrange Elements
                  </button>
                )}
              </div>

              {/* Element Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-ink">Elements</h3>
                
                <div className="space-y-2 max-h-80 overflow-y-auto border border-line rounded-lg p-2">
                  {elementArrangement.map((element, index) => (
                    <div key={element.id} className="flex items-center space-x-2 p-2 bg-canvas rounded border">
                      <span className="text-sm font-medium text-dim w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-ink truncate">
                          {element.name}
                        </div>
                        <div className="text-xs text-dim">
                          Row {element.gridPosition.row}, Col {element.gridPosition.col}
                        </div>
                      </div>
                      
                      {!autoArrange && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => moveElement(element.id, 'up')}
                            className="p-1 hover:bg-surface-hover rounded transition-colors"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveElement(element.id, 'down')}
                            className="p-1 hover:bg-surface-hover rounded transition-colors"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveElement(element.id, 'left')}
                            className="p-1 hover:bg-surface-hover rounded transition-colors"
                            title="Move left"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveElement(element.id, 'right')}
                            className="p-1 hover:bg-surface-hover rounded transition-colors"
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
                            ? 'text-success hover:text-success' 
                            : 'text-dim hover:text-dim'
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
              <h3 className="text-lg font-medium text-ink">Grid Preview</h3>
              <div className="text-sm text-dim">
                {gridColumns} × {gridRows} grid • {elementArrangement.filter(el => el.visible).length} visible elements
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4">
              {renderGridPreview()}
            </div>
            
            <div className="bg-info/10 rounded-lg p-4 flex-shrink-0">
              <h4 className="text-sm font-medium text-info mb-2">Preview Information</h4>
              <div className="text-sm text-info space-y-1">
                <p><strong>Title:</strong> {gridTitle || 'Untitled Grid'}</p>
                <p><strong>Size:</strong> {gridColumns} columns × {gridRows} rows</p>
                <p><strong>Elements:</strong> {elementArrangement.filter(el => el.visible).length} visible, {elementArrangement.filter(el => !el.visible).length} hidden</p>
                <p><strong>Layout:</strong> {autoArrange ? 'Auto-arranged' : 'Custom arrangement'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-line bg-canvas flex-shrink-0">
          <div className="text-sm text-dim">
            Selected elements will be combined into a single grid layout
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink bg-surface border border-line rounded-lg hover:bg-canvas transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-info rounded-lg hover:bg-info transition-colors"
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
