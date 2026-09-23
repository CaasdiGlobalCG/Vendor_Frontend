import React, { useState, useEffect, useContext } from 'react';
import { X, Search, Package, Wrench, Save } from 'lucide-react';
import { VendorContext } from '../context/VendorContext';
import HSNSACModal from './HSNSACModal';
import config from "../config/env";
import invoiceFetch from '../pages/WorkspacePage/components/invoice/utils/invoiceFetch';

const ItemEditModal = ({ isOpen, onClose, item, onItemUpdated }) => {
  const { currentUser } = useContext(VendorContext);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '',
    rate: '',
    hsnSacCode: '',
    hsnSacDescription: '',
    gst: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [showHSNSACModal, setShowHSNSACModal] = useState(false);

  // Populate form when item changes
  useEffect(() => {
    if (item && isOpen) {
      // Extract HSN/SAC code and description
      let hsnSacCode = '';
      let hsnSacDescription = '';
      
      if (item.hsn) {
        const hsnText = item.hsn.replace('HSN: ', '').replace('SAC: ', '');
        hsnSacCode = hsnText;
        // We'll need to get the description from the HSN/SAC data
      }

      setFormData({
        name: item.name || '',
        description: item.description || '',
        unit: item.unit || '',
        rate: typeof item.rate === 'string' ? item.rate.replace('₹', '') : item.rate || '',
        hsnSacCode: hsnSacCode,
        hsnSacDescription: hsnSacDescription,
        gst: typeof item.gst === 'string' ? item.gst.replace('%', '') : item.gst || '18',
        status: item.status || 'Active'
      });
    }
  }, [item, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        unit: '',
        rate: '',
        hsnSacCode: '',
        hsnSacDescription: '',
        gst: '',
        status: 'Active'
      });
      setShowHSNSACModal(false);
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHSNSACSelect = (selectedCode) => {
    setFormData(prev => ({
      ...prev,
      hsnSacCode: selectedCode.code,
      hsnSacDescription: selectedCode.description
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.rate) {
      alert('Please fill in all required fields (Name and Rate)');
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
        unit: formData.unit || item.unit,
        rate: parseFloat(formData.rate),
        hsn: item.type === 'Product' ? formData.hsnSacCode : null,
        sac: item.type === 'Service' ? formData.hsnSacCode : null,
        gst: parseFloat(formData.gst) || 18,
        status: formData.status
      };

      console.log('📤 Updating item:', requestBody);

      const response = await invoiceFetch(`${config.VENDOR_BACKEND_URL}/api/workspace/items/${item.id}`, {
        method: 'PUT',
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
        alert('Item updated successfully!');
        onItemUpdated && onItemUpdated(result.data);
        onClose();
      } else {
        throw new Error(result.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert(`Error updating item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  const isProduct = item.type === 'Product';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${isProduct ? 'from-black to-black' : 'from-black to-black'} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                {isProduct ? 
                  <Package className="w-6 h-6" /> :
                  <Wrench className="w-6 h-6" />
                }
              </div>
              <div>
                <h2 className="text-xl font-bold">Edit {item.type}</h2>
                <p className="text-info text-sm">
                  Update {item.name}
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
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Form Fields */}
          <div className="bg-canvas p-6 rounded-xl border border-line">
            <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
              <div className={`p-2 rounded-lg mr-3 ${isProduct ? 'bg-info/10' : 'bg-success/10'}`}>
                {isProduct ? 
                  <Package className="w-5 h-5 text-info" /> :
                  <Wrench className="w-5 h-5 text-success" />
                }
              </div>
              {isProduct ? 'Product Details' : 'Service Details'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={`Enter ${item.type.toLowerCase()} name`}
                  className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info transition-colors bg-surface"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={`Describe the ${item.type.toLowerCase()}`}
                  rows={3}
                  className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info transition-colors bg-surface"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  placeholder={isProduct ? 'Nos, Kg, Pcs' : 'Hrs, Days, Months'}
                  className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info transition-colors bg-surface"
                />
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Rate (₹) *
                </label>
                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => handleInputChange('rate', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info transition-colors bg-surface"
                />
              </div>

              {/* GST Rate */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.gst}
                  onChange={(e) => handleInputChange('gst', e.target.value)}
                  placeholder="18"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info transition-colors bg-surface"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info transition-colors bg-surface"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* HSN/SAC Code Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink mb-2">
                  {isProduct ? 'HSN Code' : 'SAC Code'}
                </label>
                
                {formData.hsnSacCode ? (
                  // Show selected code
                  <div className="border-2 border-success/30 bg-success/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-success text-lg">
                          {formData.hsnSacCode}
                        </div>
                        {formData.hsnSacDescription && (
                          <div className="text-sm text-success mt-1">
                            {formData.hsnSacDescription}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowHSNSACModal(true)}
                        className="ml-4 px-4 py-2 text-success hover:text-success border border-success/30 hover:border-success rounded-lg transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  // Show selection button
                  <button
                    onClick={() => setShowHSNSACModal(true)}
                    className="w-full p-4 border-2 border-dashed border-line hover:border-info rounded-lg transition-colors group"
                  >
                    <div className="flex items-center justify-center space-x-3 text-dim group-hover:text-info">
                      <Search className="w-5 h-5" />
                      <span className="font-medium">
                        Select {isProduct ? 'HSN' : 'SAC'} Code
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-canvas flex items-center justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 text-dim hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name || !formData.rate}
            className="px-8 py-3 bg-info text-white rounded-lg hover:bg-info disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 font-medium"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <Save className="w-4 h-4" />
            <span>{loading ? 'Updating...' : 'Update Item'}</span>
          </button>
        </div>
      </div>

      {/* HSN/SAC Selection Modal */}
      <HSNSACModal
        isOpen={showHSNSACModal}
        onClose={() => setShowHSNSACModal(false)}
        onSelect={handleHSNSACSelect}
        type={isProduct ? 'product' : 'service'}
      />
    </div>
  );
};

export default ItemEditModal;
