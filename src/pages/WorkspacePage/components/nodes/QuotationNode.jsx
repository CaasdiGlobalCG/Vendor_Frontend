import React, { useState } from 'react';
import { FileText, Plus, Trash2, Edit2, Save, Send, DollarSign, Calendar } from 'lucide-react';

const QuotationNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    quotationNumber: data.quotationNumber || '',
    customerName: data.customerName || '',
    validUntil: data.validUntil || '',
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
          <FileText className="w-5 h-5 text-ink" />
          <span className="font-semibold text-ink">Quotation</span>
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
            <label className="block text-sm font-medium text-ink mb-1">Quotation Number</label>
            <input
              type="text"
              value={formData.quotationNumber}
              onChange={(e) => setFormData({...formData, quotationNumber: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              placeholder="QT-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              placeholder="Customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Valid Until</label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
            />
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
            <span className="font-medium">Quotation:</span> {formData.quotationNumber || 'Not set'}
          </div>
          <div className="text-sm text-dim">
            <span className="font-medium">Customer:</span> {formData.customerName || 'Not set'}
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

export default QuotationNode;