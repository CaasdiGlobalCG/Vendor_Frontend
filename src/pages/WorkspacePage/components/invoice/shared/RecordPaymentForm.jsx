import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

const RecordPaymentForm = ({ invoice, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });
  const [error, setError] = useState('');

  // Helper function to parse currency string to number
  const parseCurrency = (value) => {
    // If it's already a number, return it
    if (typeof value === 'number') return value;
    
    // If it's falsy (null, undefined, empty string), return 0
    if (!value && value !== 0) {
      console.log('parseCurrency: Invalid value, returning 0', { value, type: typeof value });
      return 0;
    }
    
    try {
      // Convert to string and clean it up
      const strValue = String(value).trim();
      
      // Remove all non-numeric characters except decimal point and minus sign
      const numericString = strValue.replace(/[^0-9.-]/g, '');
      
      // Parse to float
      const result = parseFloat(numericString);
      
      // If parsing fails, return 0
      if (isNaN(result)) {
        console.warn('parseCurrency: Could not parse value', { original: value, cleaned: numericString });
        return 0;
      }
      
      return result;
    } catch (error) {
      console.error('parseCurrency error:', error);
      return 0;
    }
  };

  // Calculate remaining balance with debugging
  const invoiceTotal = parseCurrency(invoice?.totalAmount);
  const totalPaid = invoice?.payments?.reduce((sum, p) => {
    const amount = parseCurrency(p.amount);
    console.log('Payment amount:', { original: p.amount, parsed: amount });
    return sum + amount;
  }, 0) || 0;
  
  const remainingBalance = invoiceTotal - totalPaid;
  
  console.log('Payment calculations:', { 
    invoiceTotal, 
    totalPaid, 
    remainingBalance,
    invoiceTotalRaw: invoice?.totalAmount,
    payments: invoice?.payments
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (amount > remainingBalance) {
      setError(`Amount cannot exceed remaining balance of ₹${remainingBalance.toFixed(2)}`);
      return;
    }

    onSave({
      ...formData,
      amount: amount
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Record Payment</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Invoice Total:</span>
              <span className="font-medium">
                {!isNaN(invoiceTotal) ? `₹${invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Paid:</span>
              <span className="font-medium">
                {!isNaN(totalPaid) ? `₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Remaining Balance:</span>
              <span className="text-blue-600">
                {!isNaN(remainingBalance) ? `₹${Math.max(0, remainingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum: ₹{remainingBalance.toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference/Transaction ID
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({...formData, reference: e.target.value})}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Bank reference number"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
                placeholder="Any additional notes about this payment"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Check className="w-4 h-4 mr-2" />
                Record Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentForm;
