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
    <div className={`bg-white rounded-lg shadow-md border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} p-4 min-w-[320px]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-gray-800">Purchase Order</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          formData.status === 'draft' ? 'bg-gray-100 text-gray-600' :
          formData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          formData.status === 'approved' ? 'bg-green-100 text-green-700' :
          'bg-red-100 text-red-700'
        }`}>
          {formData.status?.toUpperCase() || 'DRAFT'}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
            <input
              type="text"
              value={formData.poNumber}
              onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="PO-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
            <input
              type="text"
              value={formData.vendorName}
              onChange={(e) => setFormData({...formData, vendorName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Vendor name"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({...formData, expectedDelivery: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
              <input
                type="number"
                value={formData.subtotal}
                onChange={(e) => setFormData({...formData, subtotal: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
              <input
                type="number"
                value={formData.tax}
                onChange={(e) => setFormData({...formData, tax: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <input
                type="text"
                value={calculateTotal()}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            <span className="font-medium">PO:</span> {formData.poNumber || 'Not set'}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Vendor:</span> {formData.vendorName || 'Not set'}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Total:</span> ₹{calculateTotal()}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleSendForApproval}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-md text-sm hover:bg-green-100"
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