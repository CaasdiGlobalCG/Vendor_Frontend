import React, { useState, useEffect, useContext } from 'react';
import { X, Calendar, User, MapPin, Edit, Plus, Trash2, Save, Building, Phone, Mail, FileText, Calculator, Percent } from 'lucide-react';
import { VendorContext } from '../context/VendorContext';
import config from '../config/env';

const NewQuoteModal = ({ isOpen, onClose, onQuoteCreated }) => {
  const { currentUser } = useContext(VendorContext);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [quoteData, setQuoteData] = useState({
    quotationDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    validUntil: '',
    billingAddress: {},
    shippingAddress: {},
    gstin: '',
    items: [],
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 0,
    discount: 0,
    discountType: 'percentage', // percentage or fixed
    shippingCharges: 0,
    otherCharges: 0,
    notes: '',
    termsAndConditions: 'Payment Terms: Net 30 days\nDelivery: 7-10 business days\nPrices are valid for 30 days from quote date\nAll prices are exclusive of taxes unless mentioned'
  });
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);


  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomer(null);
      setEditingAddress(false);
      setQuoteData({
        quotationDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        validUntil: '',
        billingAddress: {},
        shippingAddress: {},
        gstin: '',
        items: [],
        subtotal: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
        discount: 0,
        discountType: 'percentage',
        shippingCharges: 0,
        otherCharges: 0,
        notes: '',
        termsAndConditions: 'Payment Terms: Net 30 days\nDelivery: 7-10 business days\nPrices are valid for 30 days from quote date\nAll prices are exclusive of taxes unless mentioned'
      });
      fetchCustomers();
      fetchItems();
    }
  }, [isOpen]);

  // Fetch customers
  const fetchCustomers = async () => {
    if (!currentUser?.vendorId) return;

    try {
      setLoadingCustomers(true);
      const vendorId = currentUser.vendorId;
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace/customers?vendorId=${vendorId}`, {
        headers: headers
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
      setLoadingCustomers(false);
    }
  };

  // Fetch items
  const fetchItems = async () => {
    if (!currentUser?.vendorId) return;

    try {
      setLoadingItems(true);
      const vendorId = currentUser.vendorId;
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace/items?vendorId=${vendorId}`, {
        headers: headers
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setItems(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setQuoteData(prev => ({
      ...prev,
      billingAddress: customer.billingAddress || {},
      shippingAddress: customer.shippingAddress || customer.billingAddress || {},
      gstin: customer.gstin || ''
    }));
  };

  // Handle address editing
  const handleAddressChange = (type, field, value) => {
    setQuoteData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  // Add item to quote
  const addItem = (selectedItem) => {
    const newItem = {
      id: Date.now(),
      itemId: selectedItem.id,
      name: selectedItem.name,
      description: selectedItem.description || '',
      rate: parseFloat(selectedItem.rate?.replace('₹', '') || 0),
      quantity: 1,
      unit: selectedItem.unit || 'Nos',
      hsn: selectedItem.hsn || '',
      amount: parseFloat(selectedItem.rate?.replace('₹', '') || 0)
    };

    setQuoteData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    calculateTotals([...quoteData.items, newItem]);
  };

  // Update item quantity
  const updateItemQuantity = (itemId, quantity) => {
    const updatedItems = quoteData.items.map(item => {
      if (item.id === itemId) {
        const newQuantity = parseFloat(quantity) || 0;
        return {
          ...item,
          quantity: newQuantity,
          amount: item.rate * newQuantity
        };
      }
      return item;
    });

    setQuoteData(prev => ({
      ...prev,
      items: updatedItems
    }));

    calculateTotals(updatedItems);
  };

  // Remove item
  const removeItem = (itemId) => {
    const updatedItems = quoteData.items.filter(item => item.id !== itemId);
    setQuoteData(prev => ({
      ...prev,
      items: updatedItems
    }));
    calculateTotals(updatedItems);
  };

  // Calculate totals and GST
  const calculateTotals = (items = quoteData.items) => {
    const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
    
    // Apply discount
    let discountAmount = 0;
    if (quoteData.discountType === 'percentage') {
      discountAmount = (itemsTotal * quoteData.discount) / 100;
    } else {
      discountAmount = quoteData.discount;
    }
    
    const subtotal = itemsTotal - discountAmount;
    
    // Check if customer GSTIN starts with 29 (Karnataka)
    const isKarnataka = quoteData.gstin?.startsWith('29');
    
    let cgst = 0, sgst = 0, igst = 0;
    
    if (isKarnataka) {
      // CGST + SGST (9% each for 18% total)
      cgst = subtotal * 0.09;
      sgst = subtotal * 0.09;
    } else {
      // IGST (18%)
      igst = subtotal * 0.18;
    }

    const total = subtotal + cgst + sgst + igst + quoteData.shippingCharges + quoteData.otherCharges;

    setQuoteData(prev => ({
      ...prev,
      subtotal: itemsTotal,
      cgst,
      sgst,
      igst,
      total
    }));
  };

  // Save as draft
  const saveAsDraft = async () => {
    if (!selectedCustomer || quoteData.items.length === 0) {
      alert('Please select a customer and add at least one item');
      return;
    }

    try {
      setLoading(true);
      const vendorId = currentUser?.vendorId;
      
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const quotePayload = {
        vendorId,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        quotationDate: quoteData.quotationDate,
        expiryDate: quoteData.expiryDate,
        billingAddress: quoteData.billingAddress,
        shippingAddress: quoteData.shippingAddress,
        gstin: quoteData.gstin,
        items: quoteData.items,
        subtotal: quoteData.subtotal,
        cgst: quoteData.cgst,
        sgst: quoteData.sgst,
        igst: quoteData.igst,
        total: quoteData.total,
        status: 'Draft'
      };

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace/quotations`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(quotePayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Quote saved as draft successfully!');
        onQuoteCreated && onQuoteCreated(result.data);
        onClose();
      } else {
        throw new Error(result.message || 'Failed to save quote');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      alert(`Error saving quote: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Generate quote number
  const quoteNumber = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between border-b">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Create New Quotation</h2>
              <p className="text-blue-200 text-sm mt-1">Quote #{quoteNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(95vh-180px)] overflow-y-auto">
          <div className="p-8 space-y-8">
            
            {/* Quote Header Section */}
            <div className="bg-gradient-to-r from-slate-50 to-stone-50 p-6 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Company Info */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-blue-600" />
                    From
                  </h3>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-800">{currentUser?.companyName || 'Your Company Name'}</div>
                    <div className="text-sm text-slate-600 mt-1">{currentUser?.name || 'Contact Person'}</div>
                    <div className="text-sm text-slate-600">{currentUser?.email || 'email@company.com'}</div>
                    <div className="text-sm text-slate-600">{currentUser?.phone || '+91 XXXXX XXXXX'}</div>
                  </div>
                </div>

                {/* Quote Details */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Quote Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quote Number</label>
                      <input
                        type="text"
                        value={quoteNumber}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quote Date</label>
                      <input
                        type="date"
                        value={quoteData.quotationDate}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, quotationDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                      <input
                        type="date"
                        value={quoteData.expiryDate}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Select Customer
                  </h3>
                  {loadingCustomers ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-slate-600 mt-2 text-sm">Loading...</p>
                    </div>
                  ) : (
                    <select
                      value={selectedCustomer?.id || ''}
                      onChange={(e) => {
                        const customer = customers.find(c => c.id === e.target.value);
                        if (customer) handleCustomerSelect(customer);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a customer...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} {customer.gstin ? `(${customer.gstin})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Address Section */}
            {selectedCustomer && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Customer Information
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Billing Address */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-slate-700 flex items-center">
                        <Building className="w-4 h-4 mr-2" />
                        Billing Address
                      </h5>
                      <button
                        onClick={() => setEditingAddress(!editingAddress)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                        <span>{editingAddress ? 'Save' : 'Edit'}</span>
                      </button>
                    </div>
                    
                    {editingAddress ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={selectedCustomer.name}
                          readOnly
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
                        />
                        <input
                          type="text"
                          placeholder="Street Address"
                          value={quoteData.billingAddress.street || ''}
                          onChange={(e) => handleAddressChange('billingAddress', 'street', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={quoteData.billingAddress.city || ''}
                            onChange={(e) => handleAddressChange('billingAddress', 'city', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Pincode"
                            value={quoteData.billingAddress.pincode || ''}
                            onChange={(e) => handleAddressChange('billingAddress', 'pincode', e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="GSTIN"
                          value={quoteData.gstin}
                          onChange={(e) => {
                            setQuoteData(prev => ({ ...prev, gstin: e.target.value }));
                            setTimeout(() => calculateTotals(), 100);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="font-medium text-slate-800">{selectedCustomer.name}</div>
                        <div className="text-sm text-slate-600">{quoteData.billingAddress.street || 'No street address'}</div>
                        <div className="text-sm text-slate-600">{quoteData.billingAddress.city || 'No city'}, {quoteData.billingAddress.pincode || 'No pincode'}</div>
                        {quoteData.gstin && (
                          <div className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
                            GSTIN: {quoteData.gstin}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-slate-700 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Shipping Address
                    </h5>
                    <div className="space-y-2">
                      <div className="font-medium text-slate-800">{selectedCustomer.name}</div>
                      <div className="text-sm text-slate-600">{quoteData.shippingAddress.street || quoteData.billingAddress.street || 'Same as billing address'}</div>
                      <div className="text-sm text-slate-600">{quoteData.shippingAddress.city || quoteData.billingAddress.city || ''}, {quoteData.shippingAddress.pincode || quoteData.billingAddress.pincode || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Items Section */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-green-600" />
                    Line Items
                  </h3>
                  <div className="flex items-center space-x-3">
                    <select
                      onChange={(e) => {
                        const selectedItem = items.find(item => item.id === e.target.value);
                        if (selectedItem) {
                          addItem(selectedItem);
                          e.target.value = '';
                        }
                      }}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                      disabled={loadingItems}
                    >
                      <option value="">+ Add Item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.rate}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                {quoteData.items.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">#</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">Item & Description</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">HSN/SAC</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">Qty</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">Unit</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">Rate</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">Amount</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700 border-b border-slate-200">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteData.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6 text-sm text-slate-600 border-b border-slate-100">{index + 1}</td>
                          <td className="py-4 px-6 border-b border-slate-100">
                            <div className="font-semibold text-slate-800">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-slate-600 mt-1">{item.description}</div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center border-b border-slate-100">
                            {item.hsn && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                {item.hsn}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center border-b border-slate-100">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                              className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="py-4 px-6 text-center text-sm text-slate-600 border-b border-slate-100">{item.unit}</td>
                          <td className="py-4 px-6 text-right font-medium text-slate-800 border-b border-slate-100">₹{item.rate.toFixed(2)}</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-900 border-b border-slate-100">₹{item.amount.toFixed(2)}</td>
                          <td className="py-4 px-6 text-center border-b border-slate-100">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">No items added yet</p>
                    <p className="text-slate-400 text-sm">Select items from the dropdown above to add them to your quote</p>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations & Totals */}
            {quoteData.items.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Additional Charges */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <Percent className="w-5 h-5 mr-2 text-orange-600" />
                    Additional Charges
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Discount */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Discount</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={quoteData.discount}
                          onChange={(e) => {
                            setQuoteData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }));
                            setTimeout(() => calculateTotals(), 100);
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="0"
                          min="0"
                        />
                        <select
                          value={quoteData.discountType}
                          onChange={(e) => {
                            setQuoteData(prev => ({ ...prev, discountType: e.target.value }));
                            setTimeout(() => calculateTotals(), 100);
                          }}
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">₹</option>
                        </select>
                      </div>
                    </div>

                    {/* Shipping Charges */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Shipping Charges</label>
                      <input
                        type="number"
                        value={quoteData.shippingCharges}
                        onChange={(e) => {
                          setQuoteData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }));
                          setTimeout(() => calculateTotals(), 100);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>

                    {/* Other Charges */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Other Charges</label>
                      <input
                        type="number"
                        value={quoteData.otherCharges}
                        onChange={(e) => {
                          setQuoteData(prev => ({ ...prev, otherCharges: parseFloat(e.target.value) || 0 }));
                          setTimeout(() => calculateTotals(), 100);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Calculations */}
                <div className="bg-gradient-to-r from-slate-50 to-stone-50 p-6 rounded-xl border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-slate-600" />
                    Quote Summary
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between py-2">
                      <span className="text-slate-600">Items Subtotal:</span>
                      <span className="font-medium">₹{quoteData.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {quoteData.discount > 0 && (
                      <div className="flex justify-between py-2 text-orange-600">
                        <span>Discount ({quoteData.discountType === 'percentage' ? `${quoteData.discount}%` : '₹'}):</span>
                        <span>-₹{(quoteData.discountType === 'percentage' ? (quoteData.subtotal * quoteData.discount / 100) : quoteData.discount).toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between py-2">
                      <span className="text-slate-600">Taxable Amount:</span>
                      <span className="font-medium">₹{(quoteData.subtotal - (quoteData.discountType === 'percentage' ? (quoteData.subtotal * quoteData.discount / 100) : quoteData.discount)).toFixed(2)}</span>
                    </div>
                    
                    {quoteData.gstin?.startsWith('29') ? (
                      <>
                        <div className="flex justify-between py-2 text-blue-600">
                          <span>CGST (9%):</span>
                          <span>₹{quoteData.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-blue-600">
                          <span>SGST (9%):</span>
                          <span>₹{quoteData.sgst.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-2 text-blue-600">
                        <span>IGST (18%):</span>
                        <span>₹{quoteData.igst.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {quoteData.shippingCharges > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600">Shipping:</span>
                        <span>₹{quoteData.shippingCharges.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {quoteData.otherCharges > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600">Other Charges:</span>
                        <span>₹{quoteData.otherCharges.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-300 pt-3 mt-3">
                      <div className="flex justify-between text-xl font-bold text-slate-900">
                        <span>Total Amount:</span>
                        <span className="text-green-600">₹{quoteData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes and Terms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Notes */}
              <div>
                <label className="block text-lg font-semibold text-slate-800 mb-3">Notes</label>
                <textarea
                  value={quoteData.notes}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="4"
                  placeholder="Add any additional notes or instructions..."
                />
              </div>

              {/* Terms and Conditions */}
              <div>
                <label className="block text-lg font-semibold text-slate-800 mb-3">Terms & Conditions</label>
                <textarea
                  value={quoteData.termsAndConditions}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="4"
                  placeholder="Enter terms and conditions..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-slate-50 to-stone-50 border-t border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {selectedCustomer && quoteData.items.length > 0 && (
                <span>Quote for <strong>{selectedCustomer.name}</strong> • {quoteData.items.length} item(s) • Total: <strong className="text-green-600">₹{quoteData.total.toFixed(2)}</strong></span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveAsDraft}
                disabled={loading || !selectedCustomer || quoteData.items.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <Save className="w-5 h-5" />
                <span>{loading ? 'Saving Quote...' : 'Save as Draft'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewQuoteModal;
