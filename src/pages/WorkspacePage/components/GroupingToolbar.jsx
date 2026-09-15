import React from 'react';
import {
  Grid, Users, Combine, X,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter
} from 'lucide-react';

const GroupingToolbar = ({ 
  isVisible, 
  selectedCount, 
  onGroupIntoGrid, 
  onAlign,
  onClose,
  position = { x: 50, y: 50 }
}) => {
  // GroupingToolbar render (logs removed for performance)
  
  if (!isVisible) {
    return null;
  }
  
  // GroupingToolbar rendering (log removed for performance)

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-blue-200 p-4 min-w-[320px] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: 'translate(-50%, 0%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedCount} Elements Selected
            </h3>
            <p className="text-xs text-gray-500">
              Group elements together
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Close toolbar"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => {
            console.log('🎯 GroupingToolbar: Group button clicked!');
            onGroupIntoGrid();
          }}
          className="w-full flex items-center space-x-3 px-3 py-2 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors group"
        >
          <div className="p-1.5 bg-blue-200 rounded group-hover:bg-blue-300 transition-colors">
            <Grid className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Group into Grid</div>
            <div className="text-xs text-blue-600">
              Combine elements into a single grid layout
            </div>
          </div>
        </button>

        {/* Align & distribute */}
        {onAlign && (
          <div className="pt-1">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Align</div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { mode: 'left', icon: AlignStartVertical, title: 'Align left' },
                { mode: 'centerH', icon: AlignCenterVertical, title: 'Align center horizontally' },
                { mode: 'right', icon: AlignEndVertical, title: 'Align right' },
                { mode: 'distributeH', icon: AlignHorizontalDistributeCenter, title: 'Distribute horizontally' },
                { mode: 'top', icon: AlignStartHorizontal, title: 'Align top' },
                { mode: 'centerV', icon: AlignCenterHorizontal, title: 'Align center vertically' },
                { mode: 'bottom', icon: AlignEndHorizontal, title: 'Align bottom' },
                { mode: 'distributeV', icon: AlignVerticalDistributeCenter, title: 'Distribute vertically' },
              ].map(({ mode, icon: Icon, title }) => (
                <button
                  key={mode}
                  onClick={() => onAlign(mode)}
                  title={title}
                  className="flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Future grouping options can be added here */}
        <button
          className="w-full flex items-center space-x-3 px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors group cursor-not-allowed opacity-50"
          disabled
          title="Coming soon"
        >
          <div className="p-1.5 bg-gray-200 rounded group-hover:bg-gray-300 transition-colors">
            <Combine className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Group into Container</div>
            <div className="text-xs text-gray-400">
              Coming soon - Wrap in container
            </div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500 text-center">
          Select multiple elements to group them together
        </div>
      </div>

      {/* Arrow pointer */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"></div>
        <div className="absolute -top-[9px] left-1/2 transform -translate-x-1/2">
          <div className="w-0 h-0 border-l-[9px] border-r-[9px] border-t-[9px] border-l-transparent border-r-transparent border-t-gray-200"></div>
        </div>
      </div>
    </div>
  );
};

export default GroupingToolbar;
