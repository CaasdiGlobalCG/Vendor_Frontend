import React, { useState, useEffect, useContext } from 'react';
import { X, Search, Package, Wrench, ChevronDown } from 'lucide-react';
import { VendorContext } from '../context/VendorContext';
import HSNSACModal from './HSNSACModal';
import config from "../config/env";

const AddItemModal = ({ isOpen, onClose, onItemAdded }) => {
  const { currentUser } = useContext(VendorContext);
  const [step, setStep] = useState(1); // 1: Type selection, 2: Item details
  const [itemType, setItemType] = useState(''); // 'product' or 'service'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '',
    price: '',
    hsnSacCode: '',
    hsnSacDescription: ''
  });
  const [loading, setLoading] = useState(false);
  const [showHSNSACModal, setShowHSNSACModal] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${config.VENDOR_BACKEND_URL}`;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setItemType('');
      setFormData({
        name: '',
        description: '',
        unit: '',
        price: '',
        hsnSacCode: '',
        hsnSacDescription: ''
      });
      setShowHSNSACModal(false);
    }
  }, [isOpen]);

  // Handle HSN/SAC code selection
  const handleHSNSACSelect = (selectedCode) => {
    setFormData(prev => ({
      ...prev,
      hsnSacCode: selectedCode.code,
      hsnSacDescription: selectedCode.description
    }));
  };

  const handleTypeSelection = (type) => {
    setItemType(type);
    setStep(2);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.hsnSacCode) {
      alert('Please fill in all required fields (Name, Price, and HSN/SAC Code)');
      return;
    }

    if (!currentUser?.vendorId) {
      alert('User authentication error. Please refresh and try again.');
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

      const requestBody = {
        vendorId: vendorId,
        name: formData.name,
        description: formData.description,
        type: itemType === 'product' ? 'Product' : 'Service',
        unit: formData.unit || (itemType === 'product' ? 'Nos' : 'Hrs'),
        rate: parseFloat(formData.price),
        hsn: itemType === 'product' ? formData.hsnSacCode : null,
        sac: itemType === 'service' ? formData.hsnSacCode : null,
        gst: 18, // Default GST rate
        status: 'Active'
      };

      console.log('📤 Sending item data:', requestBody);

      const response = await fetch(`${API_BASE_URL}/api/workspace/items`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Backend success response:', result);
      
      if (result.success) {
        alert('Item added successfully!');
        onItemAdded && onItemAdded(result.data);
        onClose();
      } else {
        throw new Error(result.message || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert(`Error adding item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-visible relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-600 to-stone-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Add New Item</h2>
              <p className="text-stone-200 text-sm">
                {step === 1 ? 'Choose item type' : `Add ${itemType} details`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-stone-800 mb-2">
                  What type of item would you like to add?
                </h3>
                <p className="text-stone-600">
                  Choose between a physical product or a service
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Option */}
                <button
                  onClick={() => handleTypeSelection('product')}
                  className="group p-8 border-2 border-stone-200 rounded-xl hover:border-stone-400 hover:bg-stone-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Package className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-stone-800">Product</h4>
                      <p className="text-stone-600 text-sm">Physical goods or items</p>
                    </div>
                  </div>
                  <div className="text-sm text-stone-500">
                    <p>• Requires HSN code</p>
                    <p>• Physical inventory item</p>
                    <p>• Measurable units (Nos, Kg, etc.)</p>
                  </div>
                </button>

                {/* Service Option */}
                <button
                  onClick={() => handleTypeSelection('service')}
                  className="group p-8 border-2 border-stone-200 rounded-xl hover:border-stone-400 hover:bg-stone-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Wrench className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-stone-800">Service</h4>
                      <p className="text-stone-600 text-sm">Intangible services</p>
                    </div>
                  </div>
                  <div className="text-sm text-stone-500">
                    <p>• Requires SAC code</p>
                    <p>• Service-based offering</p>
                    <p>• Time-based units (Hrs, Days, etc.)</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => setStep(1)}
                className="flex items-center space-x-2 text-stone-600 hover:text-stone-800 transition-colors"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
                <span>Back to type selection</span>
              </button>

              {/* Item Type Badge */}
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${itemType === 'product' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  {itemType === 'product' ? 
                    <Package className={`w-5 h-5 ${itemType === 'product' ? 'text-blue-600' : 'text-green-600'}`} /> :
                    <Wrench className={`w-5 h-5 ${itemType === 'product' ? 'text-blue-600' : 'text-green-600'}`} />
                  }
                </div>
                <span className="font-semibold text-stone-800 capitalize">{itemType}</span>
              </div>

              {/* Form Fields */}
              <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
                <h4 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${itemType === 'product' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {itemType === 'product' ? 
                      <Package className="w-5 h-5 text-blue-600" /> :
                      <Wrench className="w-5 h-5 text-green-600" />
                    }
                  </div>
                  {itemType === 'product' ? 'Product Details' : 'Service Details'}
                </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Item Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={`Enter ${itemType} name`}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder={`Describe the ${itemType}`}
                    rows={3}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    placeholder={itemType === 'product' ? 'Nos, Kg, Pcs' : 'Hrs, Days, Months'}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  />
                </div>

                {/* HSN/SAC Code Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    {itemType === 'product' ? 'HSN Code' : 'SAC Code'} *
                  </label>
                  
                  {formData.hsnSacCode ? (
                    // Show selected code
                    <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-green-800 text-lg">
                            {formData.hsnSacCode}
                          </div>
                          <div className="text-sm text-green-600 mt-1">
                            {formData.hsnSacDescription}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowHSNSACModal(true)}
                          className="ml-4 px-4 py-2 text-green-700 hover:text-green-800 border border-green-300 hover:border-green-400 rounded-lg transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Show selection button
                    <button
                      onClick={() => setShowHSNSACModal(true)}
                      className="w-full p-4 border-2 border-dashed border-stone-300 hover:border-blue-400 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center justify-center space-x-3 text-stone-600 group-hover:text-blue-600">
                        <Search className="w-5 h-5" />
                        <span className="font-medium">
                          Select {itemType === 'product' ? 'HSN' : 'SAC'} Code
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-2">
                        Choose from {itemType === 'product' ? '21,744 HSN' : '681 SAC'} codes
                      </p>
                    </button>
                  )}
                </div>
              </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-stone-200">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-stone-600 hover:text-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.name || !formData.price || !formData.hsnSacCode}
                  className="px-8 py-3 bg-stone-600 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{loading ? 'Adding...' : 'Add Item'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HSN/SAC Selection Modal */}
      <HSNSACModal
        isOpen={showHSNSACModal}
        onClose={() => setShowHSNSACModal(false)}
        onSelect={handleHSNSACSelect}
        type={itemType}
      />
    </div>
  );
};

export default AddItemModal;
