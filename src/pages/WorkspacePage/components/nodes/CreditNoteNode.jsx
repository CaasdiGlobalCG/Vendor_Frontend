import React, { useState } from 'react';
import { FileText, Plus, Trash2, Edit2, Save, Send, Clock, AlertCircle } from 'lucide-react';

const CreditNoteNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    creditNoteNumber: data.creditNoteNumber || '',
    customerName: data.customerName || '',
    originalInvoice: data.originalInvoice || '',
    creditAmount: data.creditAmount || '',
    reason: data.reason || '',
    notes: data.notes || '',
    status: data.status || 'draft'
  });

  const handleSave = () => {
    // Save logic would go here
    data.onUpdate?.(formData);
    setIsEditing(false);
  };

  const handleSendForApproval = () => {
    // Send for approval logic
    data.onSendForApproval?.(formData);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} p-4 min-w-[300px]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-800">Credit Note</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`px-2 py-1 text-xs rounded-full ${
            formData.status === 'draft' ? 'bg-gray-100 text-gray-600' :
            formData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            formData.status === 'approved' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {formData.status?.toUpperCase() || 'DRAFT'}
          </span>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit Note Number</label>
            <input
              type="text"
              value={formData.creditNoteNumber}
              onChange={(e) => setFormData({...formData, creditNoteNumber: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="CN-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original Invoice</label>
            <input
              type="text"
              value={formData.originalInvoice}
              onChange={(e) => setFormData({...formData, originalInvoice: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="INV-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit Amount</label>
            <input
              type="number"
              value={formData.creditAmount}
              onChange={(e) => setFormData({...formData, creditAmount: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Credit</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows="2"
              placeholder="Returns, discounts, or corrections"
            />
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
            <span className="font-medium">Credit Note:</span> {formData.creditNoteNumber || 'Not set'}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Customer:</span> {formData.customerName || 'Not set'}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Amount:</span> ₹{formData.creditAmount || '0.00'}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Reason:</span> {formData.reason || 'Not specified'}
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

export default CreditNoteNode;