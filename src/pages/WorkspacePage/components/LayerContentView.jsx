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
        <h1 className="text-3xl font-bold text-ink mb-2">{selectedLayer.name}</h1>
        <p className="text-dim">Manage layers and components for {selectedLayer.name}</p>
      </div>

      {/* Layer Items Section */}
      <div className="bg-surface rounded-xl border border-line ">
        {/* Layer Items Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h3 className="text-xl font-semibold text-ink">Layer Items</h3>
            <p className="text-sm text-dim mt-1">
              {selectedLayer.items?.length || 0} item{selectedLayer.items?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-success hover:bg-success text-white rounded-lg transition-colors ">
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
                      ? 'bg-success/10 border-success/20'
                      : 'bg-canvas border-line hover:bg-surface-hover'
                  }`}
                  onClick={() => onLayerItemClick(item)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                    <div>
                      <h4 className="text-sm font-medium text-ink">{item.name}</h4>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'completed' ? 'bg-success/10 text-success' :
                          item.status === 'in-progress' ? 'bg-info/10 text-info' :
                          item.status === 'active' ? 'bg-success/10 text-success' :
                          item.status === 'draft' ? 'bg-surface-hover text-ink' :
                          'bg-surface-hover text-ink'
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
                    <button className="p-1 hover:bg-surface-hover rounded">
                      <MoreHorizontal className="w-4 h-4 text-dim" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-dim" />
              </div>
              <h3 className="text-lg font-medium text-ink mb-2">No layer items yet</h3>
              <p className="text-dim mb-6 max-w-sm mx-auto">
                Start building your layer structure by adding items to "{selectedLayer.name}".
              </p>
              <button className="inline-flex items-center space-x-2 px-6 py-3 bg-success hover:bg-success text-white rounded-lg transition-colors ">
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
