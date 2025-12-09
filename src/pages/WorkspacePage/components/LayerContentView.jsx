import React from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';

const LayerContentView = ({ 
  selectedLayer, 
  selectedLayerItem, 
  onLayerItemClick 
}) => {
  return (
    <div className="pt-24 px-8 pb-8">
      {/* Layer Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedLayer.name}</h1>
        <p className="text-gray-600">Manage layers and components for {selectedLayer.name}</p>
      </div>

      {/* Layer Items Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Layer Items Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Layer Items</h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedLayer.items?.length || 0} item{selectedLayer.items?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Layer Items Content */}
        <div className="p-6">
          {selectedLayer.items && selectedLayer.items.length > 0 ? (
            <div className="space-y-4">
              {selectedLayer.items.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedLayerItem?.id === item.id
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => onLayerItemClick(item)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'active' ? 'bg-green-100 text-green-800' :
                          item.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status === 'in-progress' ? 'In Progress' : 
                           item.status === 'completed' ? 'Completed' : 
                           item.status === 'active' ? 'Active' :
                           item.status === 'draft' ? 'Draft' :
                           'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No layer items yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Start building your layer structure by adding items to "{selectedLayer.name}".
              </p>
              <button className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm">
                <Plus className="w-5 h-5" />
                <span>Create First Item</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayerContentView;
