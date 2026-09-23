import React, { useState, useContext, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import config from '../../../../config/env';
import invoiceFetch from '../invoice/utils/invoiceFetch';

const NewSubscriptionComponent = ({ onBack, initialData, onSubscriptionCreated }) => {
  const { currentUser } = useContext(VendorContext);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState('');

  // Form state
  const [billingCycle, setBillingCycle] = useState('Monthly');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [customSubscriptionId, setCustomSubscriptionId] = useState('SUB-2025001');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentUser?.vendorId) return;

      try {
        setLoading(true);
        const headers = {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify({
            vendorId: currentUser.vendorId,
            email: currentUser?.email,
            role: 'vendor',
            name: currentUser?.name
          })
        };

        const response = await invoiceFetch(`/api/workspace/customers?vendorId=${currentUser.vendorId}`, {
          headers
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setCustomers(result.data || []);
          }
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [currentUser?.vendorId]);

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  const handleSaveSubscription = async () => {
    if (!selectedCustomer) {
      setMessage({ type: 'error', text: 'Please select a customer' });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    setSaving(true);

    try {
      const subscriptionData = {
        vendorId: currentUser?.vendorId,
        customerId: selectedCustomer.id || selectedCustomer.customerId,
        customerName: selectedCustomer.name || selectedCustomer.companyName,
        billingCycle,
        amount: parseFloat(amount),
        startDate,
        endDate: endDate || null,
        customSubscriptionId,
        notes,
        status
      };

      console.log('Saving subscription:', subscriptionData);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: currentUser?.vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await invoiceFetch(`/api/workspace/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: 'Subscription created successfully!' });
        setTimeout(() => {
          onSubscriptionCreated?.(result.data);
          onBack?.();
        }, 1500);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to create subscription' });
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      setMessage({ type: 'error', text: 'Failed to save subscription' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-surface-hover min-h-screen font-poppins">
      {/* Main Form */}
      <div className="flex-1 p-8 flex flex-col min-h-full">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-ink">New Subscription</h1>
          <button onClick={onBack} className="p-2 text-dim hover:bg-surface-hover rounded-full">
            <X size={20} />
          </button>
        </header>

        <div className="bg-surface p-8 rounded-lg ">
          {message && (
            <div className={`mb-4 p-3 rounded text-center font-medium ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {message.text}
            </div>
          )}

          {/* Customer Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2">Customer*</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-info/10 border border-info/20 rounded-lg">
                <div>
                  <p className="font-semibold text-ink">{selectedCustomer.name || selectedCustomer.companyName}</p>
                  <p className="text-xs text-dim">{selectedCustomer.email}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-info hover:text-info font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="w-full p-2 border border-line rounded-lg"
                />
                {searchCustomer && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-line rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(customer => (
                      <button
                        key={customer.id || customer.customerId}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSearchCustomer('');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface-hover border-b border-line last:border-b-0"
                      >
                        <p className="font-medium text-ink">{customer.name || customer.companyName}</p>
                        <p className="text-xs text-dim">{customer.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Billing Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Billing Cycle*</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full p-2 border border-line rounded-lg"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Amount*</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border border-line rounded-lg"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Start Date*</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-line rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">End Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-line rounded-lg"
              />
            </div>
          </div>

          {/* Subscription ID */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2">Subscription ID*</label>
            <input
              type="text"
              value={customSubscriptionId}
              onChange={(e) => setCustomSubscriptionId(e.target.value)}
              className="w-full p-2 border border-line rounded-lg"
            />
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border border-line rounded-lg"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this subscription..."
              rows="4"
              className="w-full p-2 border border-line rounded-lg"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveSubscription}
              disabled={saving}
              className="flex-1 bg-surface text-white px-6 py-3 rounded-lg hover:from-surface hover:to-surface transition-all disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Subscription'}
            </button>
            <button
              onClick={onBack}
              className="flex-1 bg-surface-hover text-ink px-6 py-3 rounded-lg hover:bg-surface-hover transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSubscriptionComponent;
