import React from 'react';
import { X, Package, Wrench, Calendar, DollarSign, Hash, Tag, BarChart3 } from 'lucide-react';

const ItemViewModal = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const isProduct = item.type === 'Product';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${isProduct ? 'from-black to-black' : 'from-black to-black'} text-white p-6`}>
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
                <p className="text-info text-sm">
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
            <div className="bg-canvas p-6 rounded-xl border border-line">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-dim" />
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-dim">Item Name</label>
                  <p className="text-ink font-semibold text-lg">{item.name}</p>
                </div>
                {item.description && (
                  <div>
                    <label className="text-sm font-medium text-dim">Description</label>
                    <p className="text-ink mt-1">{item.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-dim">Type</label>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isProduct 
                        ? 'bg-info/10 text-info' 
                        : 'bg-success/10 text-success'
                    }`}>
                      {isProduct ? <Package className="w-4 h-4 mr-1" /> : <Wrench className="w-4 h-4 mr-1" />}
                      {item.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Tax */}
            <div className="bg-canvas p-6 rounded-xl border border-line">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-dim" />
                Pricing & Tax
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-dim">Rate</label>
                  <p className="text-2xl font-bold text-success">
                    {typeof item.rate === 'string' ? item.rate : `₹${item.rate}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-dim">Unit</label>
                  <p className="text-ink font-medium">{item.unit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-dim">GST Rate</label>
                  <p className="text-ink font-medium">
                    {typeof item.gst === 'string' ? item.gst : `${item.gst}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* HSN/SAC Code Section */}
          {item.hsn && (
            <div className="bg-info/10 p-6 rounded-xl border border-info/20 mb-6">
              <h3 className="text-lg font-semibold text-info mb-4 flex items-center">
                <Hash className="w-5 h-5 mr-2" />
                {item.hsn.includes('HSN:') ? 'HSN Code' : 'SAC Code'}
              </h3>
              <div className="bg-surface p-4 rounded-lg border border-info/20">
                <p className="text-xl font-bold text-info mb-2">
                  {item.hsn.replace('HSN: ', '').replace('SAC: ', '')}
                </p>
                <p className="text-info text-sm">
                  {isProduct ? 'Harmonized System of Nomenclature' : 'Services Accounting Code'}
                </p>
              </div>
            </div>
          )}

          {/* Status & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status */}
            <div className="bg-canvas p-6 rounded-xl border border-line">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-dim" />
                Status
              </h3>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  item.status === 'Active' 
                    ? 'bg-success/10 text-success' 
                    : 'bg-danger/10 text-danger'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    item.status === 'Active' ? 'bg-success' : 'bg-danger'
                  }`}></div>
                  {item.status}
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-canvas p-6 rounded-xl border border-line">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-dim" />
                Item Information
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-dim uppercase tracking-wide">Item ID</label>
                  <p className="text-ink font-mono text-sm">{item.id}</p>
                </div>
                {item.vendorId && (
                  <div>
                    <label className="text-xs font-medium text-dim uppercase tracking-wide">Vendor ID</label>
                    <p className="text-ink font-mono text-sm">{item.vendorId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="mt-8 bg-gradient-to-r from-surface-hover to-surface-hover p-6 rounded-xl border border-line">
            <h3 className="text-lg font-semibold text-ink mb-3">Summary</h3>
            <p className="text-dim leading-relaxed">
              This {item.type.toLowerCase()} "{item.name}" is priced at{' '}
              <span className="font-semibold text-success">
                {typeof item.rate === 'string' ? item.rate : `₹${item.rate}`}
              </span>{' '}
              per {item.unit} with{' '}
              <span className="font-semibold">
                {typeof item.gst === 'string' ? item.gst : `${item.gst}%`}
              </span>{' '}
              GST. Current status: {' '}
              <span className={`font-semibold ${item.status === 'Active' ? 'text-success' : 'text-danger'}`}>
                {item.status}
              </span>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-canvas">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-cta text-cta-foreground rounded-lg hover:bg-cta transition-colors font-medium"
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
