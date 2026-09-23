import React, { useState } from 'react';
import { FileText, Plus, Trash2, Edit2, Save, Send, Package, Truck } from 'lucide-react';

const PurchaseOrderNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    poNumber: data.poNumber || '',
    vendorName: data.vendorName || '',
    orderDate: data.orderDate || '',
    expectedDelivery: data.expectedDelivery || '',
    subtotal: data.subtotal || '',
    tax: data.tax || '',
    total: data.total || '',
    status: data.status || 'draft',
    items: data.items || []
  });

  const handleSave = () => {
    data.onUpdate?.(formData);
    setIsEditing(false);
  };

  const handleSendForApproval = () => {
    data.onSendForApproval?.(formData);
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const tax = parseFloat(formData.tax) || 0;
    return (subtotal + tax).toFixed(2);
  };

  return (
    <div className={`bg-surface rounded-lg  border-2 ${selected ? 'border-info' : 'border-line'} p-4 min-w-[320px]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-warning" />
          <span className="font-semibold text-ink">Purchase Order</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          formData.status === 'draft' ? 'bg-surface-hover text-dim' :
          formData.status === 'pending' ? 'bg-warning/10 text-warning' :
          formData.status === 'approved' ? 'bg-success/10 text-success' :
          'bg-danger/10 text-danger'
        }`}>
          {formData.status?.toUpperCase() || 'DRAFT'}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">PO Number</label>
            <input
              type="text"
              value={formData.poNumber}
              onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              placeholder="PO-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Vendor Name</label>
            <input
              type="text"
              value={formData.vendorName}
              onChange={(e) => setFormData({...formData, vendorName: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              placeholder="Vendor name"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Order Date</label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                className="w-full px-3 py-2 border border-line rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Expected Delivery</label>
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({...formData, expectedDelivery: e.target.value})}
                className="w-full px-3 py-2 border border-line rounded-md text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Subtotal</label>
              <input
                type="number"
                value={formData.subtotal}
                onChange={(e) => setFormData({...formData, subtotal: e.target.value})}
                className="w-full px-3 py-2 border border-line rounded-md text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Tax</label>
              <input
                type="number"
                value={formData.tax}
                onChange={(e) => setFormData({...formData, tax: e.target.value})}
                className="w-full px-3 py-2 border border-line rounded-md text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Total</label>
              <input
                type="text"
                value={calculateTotal()}
                readOnly
                className="w-full px-3 py-2 border border-line rounded-md text-sm bg-canvas"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-info text-white rounded-md text-sm hover:bg-info"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 bg-surface-hover text-ink rounded-md text-sm hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-dim">
            <span className="font-medium">PO:</span> {formData.poNumber || 'Not set'}
          </div>
          <div className="text-sm text-dim">
            <span className="font-medium">Vendor:</span> {formData.vendorName || 'Not set'}
          </div>
          <div className="text-sm text-dim">
            <span className="font-medium">Total:</span> ₹{calculateTotal()}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-info/10 text-info rounded-md text-sm hover:bg-info/10"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleSendForApproval}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-success/10 text-success rounded-md text-sm hover:bg-success/10"
            >
              <Send className="w-4 h-4" />
              Send for Approval
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderNode;