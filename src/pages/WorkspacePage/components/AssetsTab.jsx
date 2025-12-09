import React from 'react';
import { Plus } from 'lucide-react';

const AssetsTab = ({ selectedTask }) => {
  if (!selectedTask) return null;

  return (
    <div className="flex-1 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Assets</h3>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Plus className="w-5 h-5 text-purple-600" />
        </button>
      </div>
      
      {/* Task Context */}
      <div className="mb-4">
        <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
          <span className="text-sm font-medium text-purple-800">{selectedTask.name} Assets</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg text-center cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-blue-600 text-xs">IMG</span>
          </div>
          <span className="text-xs text-gray-600">Images</span>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-green-600 text-xs">DOC</span>
          </div>
          <span className="text-xs text-gray-600">Documents</span>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-purple-600 text-xs">ICON</span>
          </div>
          <span className="text-xs text-gray-600">Icons</span>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-orange-600 text-xs">FONT</span>
          </div>
          <span className="text-xs text-gray-600">Fonts</span>
        </div>
      </div>
    </div>
  );
};

export default AssetsTab;
