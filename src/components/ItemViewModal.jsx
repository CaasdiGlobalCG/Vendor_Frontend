import React from 'react';
import { X, Package, Wrench, Calendar, DollarSign, Hash, Tag, BarChart3 } from 'lucide-react';

const ItemViewModal = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const isProduct = item.type === 'Product';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${isProduct ? 'from-blue-600 to-blue-700' : 'from-green-600 to-green-700'} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl">
                {isProduct ? 
                  <Package className="w-8 h-8" /> :
                  <Wrench className="w-8 h-8" />
                }
              </div>
              <div>
                <h2 className="text-2xl font-bold">{item.name}</h2>
                <p className="text-blue-200 text-sm">
                  {isProduct ? 'Product' : 'Service'} Details
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Basic Information */}
            <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-stone-600" />
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-stone-600">Item Name</label>
                  <p className="text-stone-800 font-semibold text-lg">{item.name}</p>
                </div>
                {item.description && (
                  <div>
                    <label className="text-sm font-medium text-stone-600">Description</label>
                    <p className="text-stone-700 mt-1">{item.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-stone-600">Type</label>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isProduct 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isProduct ? <Package className="w-4 h-4 mr-1" /> : <Wrench className="w-4 h-4 mr-1" />}
                      {item.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Tax */}
            <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-stone-600" />
                Pricing & Tax
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-stone-600">Rate</label>
                  <p className="text-2xl font-bold text-green-600">
                    {typeof item.rate === 'string' ? item.rate : `₹${item.rate}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600">Unit</label>
                  <p className="text-stone-800 font-medium">{item.unit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600">GST Rate</label>
                  <p className="text-stone-800 font-medium">
                    {typeof item.gst === 'string' ? item.gst : `${item.gst}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* HSN/SAC Code Section */}
          {item.hsn && (
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                <Hash className="w-5 h-5 mr-2" />
                {item.hsn.includes('HSN:') ? 'HSN Code' : 'SAC Code'}
              </h3>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-xl font-bold text-blue-700 mb-2">
                  {item.hsn.replace('HSN: ', '').replace('SAC: ', '')}
                </p>
                <p className="text-blue-600 text-sm">
                  {isProduct ? 'Harmonized System of Nomenclature' : 'Services Accounting Code'}
                </p>
              </div>
            </div>
          )}

          {/* Status & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status */}
            <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-stone-600" />
                Status
              </h3>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  item.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    item.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {item.status}
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
              <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-stone-600" />
                Item Information
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Item ID</label>
                  <p className="text-stone-700 font-mono text-sm">{item.id}</p>
                </div>
                {item.vendorId && (
                  <div>
                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Vendor ID</label>
                    <p className="text-stone-700 font-mono text-sm">{item.vendorId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="mt-8 bg-gradient-to-r from-stone-100 to-stone-50 p-6 rounded-xl border border-stone-200">
            <h3 className="text-lg font-semibold text-stone-800 mb-3">Summary</h3>
            <p className="text-stone-600 leading-relaxed">
              This {item.type.toLowerCase()} "{item.name}" is priced at{' '}
              <span className="font-semibold text-green-600">
                {typeof item.rate === 'string' ? item.rate : `₹${item.rate}`}
              </span>{' '}
              per {item.unit} with{' '}
              <span className="font-semibold">
                {typeof item.gst === 'string' ? item.gst : `${item.gst}%`}
              </span>{' '}
              GST. Current status: {' '}
              <span className={`font-semibold ${item.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                {item.status}
              </span>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200 bg-stone-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemViewModal;
