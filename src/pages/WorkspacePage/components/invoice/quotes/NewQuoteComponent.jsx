import React, { useState, useEffect, useContext, useRef } from 'react';
import { Search, Info, Trash2, Plus, Upload, X, ChevronDown, Edit, Loader2, Edit2, PlusCircle, Save, Settings, Check } from 'lucide-react';
import { VendorContext } from '../../../../../context/VendorContext';
import { AuthProvider } from '../../../../../context/AuthContext';
import { convertMeasurementToFeet, needsConversion } from '../../../../../utils/unitConverter';
import { calculateRatePerSqft, calculateTotalRate, checkRateConsistency, determineCalculationTarget, formatCurrency } from '../../../../../utils/rateCalculator';
import config from '../../../../../config/env';
import html2pdf from 'html2pdf.js';
import StandardPreview from '../shared/StandardPreview.jsx';
import { createRoot } from 'react-dom/client';

// Fixed Caasdi Global customer used for all quotations
const CAASDI_GLOBAL_CUSTOMER = {
  id: 'caasdi-global',
  customerId: 'caasdi-global',
  name: 'Caasdi Global',
  displayName: 'Caasdi Global',
  companyName: 'Caasdi Global',
  email: '',
  phone: '',
  gstin: '29AATFC6640B1ZB',
  billingAddress:
    'Caasdi Global,\n262, 2nd floor, Srinivasa Nagar,\nBanashankari 1st Stage,\nBengaluru, Karnataka, 560050',
  shippingAddress:
    'Caasdi Global,\n262, 2nd floor, Srinivasa Nagar,\nBanashankari 1st Stage,\nBengaluru, Karnataka, 560050',
  address: {
    billing: {
      street1: '262, 2nd floor, Srinivasa Nagar',
      street2: 'Banashankari 1st Stage',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pinCode: '560050',
    },
    shipping: {
      street1: '262, 2nd floor, Srinivasa Nagar',
      street2: 'Banashankari 1st Stage',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pinCode: '560050',
    },
  },
  customerType: 'Organization',
  isCaasdiGlobal: true,
};

const CustomerSearchModal = ({ open, onClose, onSelect }) => {
  const { currentUser } = useContext(VendorContext);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);


  React.useEffect(() => {
    if (open && !fetched) {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: currentUser?.vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };
      
      fetch(`/api/workspace/customers?vendorId=${currentUser?.vendorId}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Transform the data to match the expected format
            const transformedCustomers = data.data.map(customer => ({
              ...customer,
              customerId: customer.id,
              name: customer.name || customer.company || 'Unknown',
              companyName: customer.company || customer.name || 'Unknown',
              email: customer.email || '',
              phone: customer.phone || '',
              workPhone: customer.workPhone || customer.phone || ''
            }));
            setCustomers(transformedCustomers);
          } else {
            setCustomers([]);
          }
          setFetched(true);
        })
        .catch(error => {
          console.error('Error fetching customers:', error);
          setCustomers([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open, fetched]);

  const filtered = customers.filter((c) =>
    (c.name || c.displayName || c.companyName || c.company || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fadeIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl">×</button>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Search Customers</h2>
        <input
          className="w-full border rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Type a customer name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No customers found</div>
          ) : (
            filtered.map((customer) => (
              <div
                key={customer.customerId}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer rounded"
                onClick={() => { onSelect(customer); onClose(); }}
              >
                {customer.name || customer.displayName || customer.companyName || customer.company}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const CustomerDropdown = ({ value, onChange }) => {
  // Always lock quotations to Caasdi Global and do not expose the full customer list
  useEffect(() => {
    if (!value && typeof onChange === 'function') {
      onChange(CAASDI_GLOBAL_CUSTOMER);
    }
  }, [value, onChange]);

  return (
    <div className="relative w-full font-poppins">
      <div className="border-2 border-cg rounded-lg px-6 py-4 flex items-center text-lg bg-gray-50 cursor-not-allowed">
        <div>
          <div className="font-semibold text-gray-900">Caasdi Global</div>
          <div className="text-xs text-gray-600 mt-1">
            262, 2nd floor, Srinivasa Nagar, Banashankari 1st Stage, Bengaluru, Karnataka, 560050
          </div>
          <div className="text-xs text-gray-600 mt-0.5">GSTIN: 29AATFC6640B1ZB</div>
        </div>
        <span className="ml-auto text-xs text-gray-400">Fixed bill-to</span>
      </div>
    </div>
  );
};

// Quote Number Configuration Modal
const QuoteNumberConfigModal = ({ open, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!open) return null;

  const handleSave = async () => {
    await onSave(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 transition-all duration-300 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 relative animate-fadeInUp" style={{overflow: 'hidden'}}>
        {/* Gradient Header */}
        <div style={{background: 'linear-gradient(120deg, #0d6b5c 0%, #000 100%)'}} className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Configure Quote Number Preferences</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1 transition"><span className="text-2xl">×</span></button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Your quote numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="autoGenerate"
                name="quoteNumberMode"
                checked={localConfig.autoGenerate}
                onChange={() => setLocalConfig({...localConfig, autoGenerate: true})}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoGenerate" className="block text-sm font-medium text-gray-700">
                  Continue auto-generating quote numbers
                </label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prefix</label>
                    <input
                      type="text"
                      value={localConfig.prefix}
                      onChange={(e) => setLocalConfig({...localConfig, prefix: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      disabled={!localConfig.autoGenerate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Next Number</label>
                    <input
                      type="text"
                      value={localConfig.nextNumber}
                      onChange={(e) => setLocalConfig({...localConfig, nextNumber: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      disabled={!localConfig.autoGenerate}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="manualEntry"
                name="quoteNumberMode"
                checked={!localConfig.autoGenerate}
                onChange={() => setLocalConfig({...localConfig, autoGenerate: false})}
                className="mt-1"
              />
              <label htmlFor="manualEntry" className="block text-sm font-medium text-gray-700">
                Enter quote numbers manually
              </label>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Reference Number Configuration Modal
const ReferenceNumberConfigModal = ({ open, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!open) return null;

  const handleSave = async () => {
    await onSave(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 transition-all duration-300 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 relative animate-fadeInUp" style={{overflow: 'hidden'}}>
        {/* Gradient Header */}
        <div style={{background: 'linear-gradient(120deg, #0d6b5c 0%, #000 100%)'}} className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Configure Reference Number Preferences</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1 transition"><span className="text-2xl">×</span></button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Your reference numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="autoGenerateRef"
                name="referenceNumberMode"
                checked={localConfig.autoGenerate}
                onChange={() => setLocalConfig({...localConfig, autoGenerate: true})}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoGenerateRef" className="block text-sm font-medium text-gray-700">
                  Continue auto-generating reference numbers
                </label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prefix</label>
                    <input
                      type="text"
                      value={localConfig.prefix}
                      onChange={(e) => setLocalConfig({...localConfig, prefix: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      disabled={!localConfig.autoGenerate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Next Number</label>
                    <input
                      type="text"
                      value={localConfig.nextNumber}
                      onChange={(e) => setLocalConfig({...localConfig, nextNumber: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      disabled={!localConfig.autoGenerate}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="manualEntryRef"
                name="referenceNumberMode"
                checked={!localConfig.autoGenerate}
                onChange={() => setLocalConfig({...localConfig, autoGenerate: false})}
                className="mt-1"
              />
              <label htmlFor="manualEntryRef" className="block text-sm font-medium text-gray-700">
                Enter reference numbers manually
              </label>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Item Selection Modal Component
const ItemSelectionModal = ({ open, onClose, onSelect }) => {
  const { currentUser } = useContext(VendorContext);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    description: '',
    rate: '',
    quantity: ''
  });
  const [savingItem, setSavingItem] = useState(false);


  React.useEffect(() => {
    if (open && !fetched) {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: currentUser?.vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };
      
      fetch(`/api/workspace/items?vendorId=${currentUser?.vendorId}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          setItems(data.data || data.items || []);
          setFetched(true);
        })
        .catch((error) => {
          console.error('Error fetching items:', error);
          setItems([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open, fetched, currentUser?.vendorId]);

  const handleAddNewItem = () => {
    if (!newItemData.name.trim()) {
      alert('Please enter item name');
      return;
    }
    if (!newItemData.rate.trim()) {
      alert('Please enter item price');
      return;
    }

    // Create a new item object
    const newItem = {
      id: `temp-${Date.now()}`,
      name: newItemData.name,
      itemName: newItemData.name,
      description: newItemData.description,
      rate: parseFloat(newItemData.rate),
      quantity: newItemData.quantity ? parseInt(newItemData.quantity) : 1,
      isTemporary: true // Mark as temporary/new item
    };

    // Select the new item
    onSelect(newItem);
    
    // Reset form
    setNewItemData({
      name: '',
      description: '',
      rate: '',
      quantity: ''
    });
    setShowAddForm(false);
    onClose();
  };

  const filtered = items.filter((item) =>
    (item.name || item.itemName || item.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl">×</button>
        
        {!showAddForm ? (
          <>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Select Item</h2>
            
            <input
              className="w-full border rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={() => setShowAddForm(true)}
              className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 w-full justify-center"
            >
              <Plus size={16} />
              Add New Item
            </button>
            
            <div className="max-h-96 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Loading items...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {search ? 'No items found matching your search.' : 'No items available.'}
                </div>
              ) : (
                filtered.map((item, index) => (
                  <div
                    key={item.id || item.itemId || index}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer rounded border-b border-gray-100 last:border-b-0"
                    onClick={() => { onSelect(item); onClose(); }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.name || item.itemName || 'Unnamed Item'}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </div>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {item.hsn && <span>HSN: {item.hsn}</span>}
                          {item.unit && <span>Unit: {item.unit}</span>}
                          {item.category && <span>Category: {item.category}</span>}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {item.rate && (
                          <div className="font-semibold text-green-600">
                            ₹{parseFloat(item.rate).toLocaleString()}
                          </div>
                        )}
                        {item.sellingPrice && item.sellingPrice !== item.rate && (
                          <div className="text-sm text-gray-500">
                            Selling: ₹{parseFloat(item.sellingPrice).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Item</h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name*</label>
                <input
                  type="text"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter item name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newItemData.description}
                  onChange={(e) => setNewItemData({...newItemData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter item description..."
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price*</label>
                  <input
                    type="number"
                    value={newItemData.rate}
                    onChange={(e) => setNewItemData({...newItemData, rate: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter price..."
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newItemData.quantity}
                    onChange={(e) => setNewItemData({...newItemData, quantity: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter quantity..."
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleAddNewItem}
                disabled={savingItem}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {savingItem ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const NewQuoteComponentInner = ({
  onBack,
  projectId,
  initialData,
  duplicateMode = false,
  workspaceId,
  workspaceName,
  selectedTask,
  selectedSubtask
}) => {
    const { currentUser } = useContext(VendorContext);
    
    // Helper function to format address
    const formatAddress = (addressObj) => {
        if (!addressObj) return '';
        
        const parts = [];
        
        // Add street lines
        if (addressObj.street1) parts.push(addressObj.street1);
        if (addressObj.street2) parts.push(addressObj.street2);
        
        // Add city, state, pincode line
        const cityStateParts = [];
        if (addressObj.city) cityStateParts.push(addressObj.city);
        if (addressObj.state) cityStateParts.push(addressObj.state);
        if (addressObj.pinCode) cityStateParts.push(addressObj.pinCode);
        
        if (cityStateParts.length > 0) {
            parts.push(cityStateParts.join(', '));
        }
        
        // Add country if available
        if (addressObj.country && addressObj.country !== 'IN') {
            parts.push(addressObj.country);
        }
        
        return parts.join('\n');
    };
    
    // State variables for GST
    const [isIntraState, setIsIntraState] = useState(false);

    // Items state
    const [items, setItems] = useState([
        { selectedItem: null, description: '', quantity: '', rate: '', amount: 0, hsn: '', cgstRate: '', sgstRate: '', igstRate: '', cgstAmount: 0, sgstAmount: 0, igstAmount: 0, ratePerSqft: '', measurements: '' },
    ]);
    const [showTotalSummary, setShowTotalSummary] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(() => {
        // For new quotes, default to Caasdi Global; editing/duplicate will override via initialData effect
        return initialData?.customerDetails || initialData?.selectedCustomer || CAASDI_GLOBAL_CUSTOMER;
    });
    const [customerDetails, setCustomerDetails] = useState(null);
    const [addressLoading, setAddressLoading] = useState(false);
    const [addressEditMode, setAddressEditMode] = useState(null);
    const [editingBillTo, setEditingBillTo] = useState(false);
    const [editingShipTo, setEditingShipTo] = useState(false);
    const [editableCustomerDetails, setEditableCustomerDetails] = useState({
        billingAddress: CAASDI_GLOBAL_CUSTOMER.billingAddress,
        billingPhone: CAASDI_GLOBAL_CUSTOMER.phone || '',
        billingEmail: CAASDI_GLOBAL_CUSTOMER.email || '',
        billingGstin: CAASDI_GLOBAL_CUSTOMER.gstin || '',
        shippingAddress: '',
        shippingPhone: '',
        shippingEmail: '',
        shippingGstin: ''
    });
    const [addressForm, setAddressForm] = useState({
        billing: { street1: '', street2: '', city: '', state: '', country: '', pinCode: '', phone: '', fax: '' },
        shipping: { street1: '', street2: '', city: '', state: '', country: '', pinCode: '', phone: '', fax: '' },
    });
    const [addressSaving, setAddressSaving] = useState(false);
    const [addressMessage, setAddressMessage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [discount, setDiscount] = useState('');
    const [tdsType, setTdsType] = useState('');
    const [tdsValue, setTdsValue] = useState('');
    const [projectName, setProjectName] = useState('');
    const [gstinForm, setGstinForm] = useState('');
    const [gstinSaving, setGstinSaving] = useState(false);
    const [gstinMessage, setGstinMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Quote number configuration state
    const [quoteNumberConfig, setQuoteNumberConfig] = useState({
        autoGenerate: true,
        prefix: 'CG-',
        nextNumber: '2025001'
    });
    const [customQuoteNumber, setCustomQuoteNumber] = useState('CG-2025001');
    const [showQuoteNumberModal, setShowQuoteNumberModal] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    
    // Reference number state
    const [referenceConfig, setReferenceConfig] = useState({
        autoGenerate: true,
        prefix: 'REF-',
        nextNumber: '2025001'
    });
    const [customReferenceNumber, setCustomReferenceNumber] = useState('REF-2025001');
    const [showReferenceModal, setShowReferenceModal] = useState(false);
    const [showReferenceTooltip, setShowReferenceTooltip] = useState(false);
    
    // Item selection modal state
    const [showItemModal, setShowItemModal] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState(null);

    // Date state
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [expiryDate, setExpiryDate] = useState(() => {
        // Set default expiry date to 1 week from today
        const today = new Date();
        const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return oneWeekLater.toISOString().split('T')[0];
    });

    // Terms and notes state
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [customerNotes, setCustomerNotes] = useState('Looking forward for your business.');

    useEffect(() => {
        if (projectId) {
            fetch(`/api/projects/${projectId}`)
                .then(res => res.json())
                .then(data => setProjectName(data.projectName || ''))
                .catch(() => setProjectName(''));
        }
    }, [projectId]);

    // Handle initialData for editing existing quote or duplicating
    useEffect(() => {
        if (initialData) {
            const customer = initialData.customerDetails || initialData.selectedCustomer;
            setSelectedCustomer(customer);
            
            // Initialize editable customer details - keep billing as Caasdi Global, allow shipping to be customized
            if (customer) {
                setEditableCustomerDetails({
                    billingAddress: CAASDI_GLOBAL_CUSTOMER.billingAddress,
                    billingPhone: CAASDI_GLOBAL_CUSTOMER.phone || '',
                    billingEmail: CAASDI_GLOBAL_CUSTOMER.email || '',
                    billingGstin: CAASDI_GLOBAL_CUSTOMER.gstin || '',
                    shippingAddress: customer.shippingAddress || '',
                    shippingPhone: customer.shippingPhone || '',
                    shippingEmail: customer.shippingEmail || '',
                    shippingGstin: customer.shippingGstin || ''
                });
            }
            
            setItems(initialData.items || [
                { selectedItem: null, description: '', quantity: '', rate: '', amount: 0, hsn: '', cgstRate: '', sgstRate: '', igstRate: '', cgstAmount: 0, sgstAmount: 0, igstAmount: 0 },
            ]);
            setDiscount(initialData.discount?.value?.toString() || '');
            setTdsType(initialData.tdsType || '');
            setTdsValue(initialData.tdsValue?.toString() || '');
            setProjectName(initialData.projectName || '');
            
            // Handle dates
            if (initialData.quoteDate) {
                setQuoteDate(initialData.quoteDate);
            }
            if (initialData.expiryDate) {
                setExpiryDate(initialData.expiryDate);
            } else if (initialData.quoteDate) {
                // If no expiry date but quote date exists, calculate 1 week from quote date
                const quoteDateObj = new Date(initialData.quoteDate);
                const oneWeekLater = new Date(quoteDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
                setExpiryDate(oneWeekLater.toISOString().split('T')[0]);
            }
            
            // Handle quote and reference numbers
            if (!duplicateMode && (initialData.quotationId || initialData.id)) {
                setCustomQuoteNumber(initialData.quotationId || initialData.id);
            }
            if (!duplicateMode && initialData.referenceNumber) {
                setCustomReferenceNumber(initialData.referenceNumber);
            }
            // For duplicate mode, new numbers will be set by the config loading effects
        }
    }, [initialData, duplicateMode]);

    // Fetch complete customer details when customer is selected
    const fetchCompleteCustomerDetails = async (customerId) => {
        try {
            const vendorId = currentUser?.vendorId;
            if (!vendorId) {
                console.error('No vendor ID found');
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'x-user-info': JSON.stringify({
                    vendorId: vendorId,
                    email: currentUser?.email,
                    role: 'vendor',
                    name: currentUser?.name
                })
            };

            console.log('Fetching customer details from:', `/api/workspace/customers/${customerId}?vendorId=${vendorId}`);
            const response = await fetch(`/api/workspace/customers/${customerId}?vendorId=${vendorId}`, {
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Fetched customer details response:', result);
            
            if (result.success && result.data) {
                const customerDetails = result.data;
                console.log('Fetched complete customer details:', customerDetails);
                
                // Create a copy of customer details for quote-specific edits
                const quoteCustomerDetails = {
                    ...customerDetails,
                    // Mark this as a quote-specific copy
                    isQuoteSpecific: true,
                    // Store original customer ID for reference
                    originalCustomerId: customerDetails.id,
                    // Create editable copies of addresses
                    address: {
                        billing: { ...(customerDetails.address?.billing || {}) },
                        shipping: { ...(customerDetails.address?.shipping || customerDetails.address?.billing || {}) }
                    }
                };
                
                // Extract address information from the nested structure
                console.log('Address data from API:', customerDetails.address);
                
                const formatAddress = (addressObj) => {
                    if (!addressObj) return '';
                    
                    const parts = [];
                    
                    // Add street lines
                    if (addressObj.street1) parts.push(addressObj.street1);
                    if (addressObj.street2) parts.push(addressObj.street2);
                    
                    // Add city, state, pincode line
                    const cityStateParts = [];
                    if (addressObj.city) cityStateParts.push(addressObj.city);
                    if (addressObj.state) cityStateParts.push(addressObj.state);
                    if (addressObj.pinCode) cityStateParts.push(addressObj.pinCode);
                    
                    if (cityStateParts.length > 0) {
                        parts.push(cityStateParts.join(', '));
                    }
                    
                    // Add country if available
                    if (addressObj.country && addressObj.country !== 'IN') {
                        parts.push(addressObj.country);
                    }
                    
                    return parts.join('\n');
                };
                
                const billingAddress = formatAddress(customerDetails.address?.billing);
                const shippingAddress = formatAddress(customerDetails.address?.shipping);
                
                console.log('Formatted billing address:', billingAddress);
                console.log('Formatted shipping address:', shippingAddress);
                
                // Update the selected customer with complete details
                setSelectedCustomer(prevCustomer => {
                    const updatedCustomer = {
                        ...prevCustomer,
                        ...customerDetails,
                        // Preserve the original selection data
                        customerId: prevCustomer.customerId || prevCustomer.id,
                        id: prevCustomer.id || prevCustomer.customerId,
                        name: prevCustomer.name || customerDetails.displayName || customerDetails.companyName,
                        displayName: prevCustomer.displayName || customerDetails.displayName,
                        companyName: prevCustomer.companyName || customerDetails.companyName,
                        // Add extracted address data
                        billingAddress: billingAddress,
                        shippingAddress: shippingAddress,
                        // Add other details
                        phone: customerDetails.workPhone || customerDetails.mobile || prevCustomer.phone,
                        mobile: customerDetails.mobile || customerDetails.workPhone || prevCustomer.mobile,
                        customerType: customerDetails.customerType || prevCustomer.customerType
                    };
                    
                    return updatedCustomer;
                });

                // Initialize editable details - keep billing as Caasdi Global, allow shipping to be customized
                setEditableCustomerDetails({
                    billingAddress: CAASDI_GLOBAL_CUSTOMER.billingAddress,
                    billingPhone: CAASDI_GLOBAL_CUSTOMER.phone || '',
                    billingEmail: CAASDI_GLOBAL_CUSTOMER.email || '',
                    billingGstin: CAASDI_GLOBAL_CUSTOMER.gstin || '',
                    shippingAddress: shippingAddress || '',
                    shippingPhone: customerDetails.workPhone || customerDetails.mobile || '',
                    shippingEmail: customerDetails.email || '',
                    shippingGstin: customerDetails.gstin || ''
                });
            }
        } catch (error) {
            console.error('Error fetching complete customer details:', error);
        }
    };

    // Initialize editable customer details when customer is selected
    useEffect(() => {
        if (selectedCustomer && !selectedCustomer.isCaasdiGlobal && (selectedCustomer.customerId || selectedCustomer.id)) {
            console.log('Selected customer data:', selectedCustomer);
            
            // Always fetch complete customer details since the list API doesn't include addresses
            console.log('Fetching complete customer details for:', selectedCustomer.customerId || selectedCustomer.id);
            fetchCompleteCustomerDetails(selectedCustomer.customerId || selectedCustomer.id);
        }
    }, [selectedCustomer?.customerId, selectedCustomer?.id, selectedCustomer?.isCaasdiGlobal]);

    // Determine intra-state based on customer GSTIN
    useEffect(() => {
        if (selectedCustomer) {
            setCustomerDetails(selectedCustomer);
            
            // SET INTRA-STATE LOGIC based on GSTIN
            if (selectedCustomer.gstin && selectedCustomer.gstin.startsWith('29')) {
                setIsIntraState(true);
            } else {
                setIsIntraState(false);
            }
            
            // Set address form if we have address data
            if (selectedCustomer.address) {
                setAddressForm({
                    billing: { ...(selectedCustomer.address.billing || {}) },
                    shipping: { ...(selectedCustomer.address.shipping || {}) },
                });
            }
            
            // Set GSTIN form
            setGstinForm(selectedCustomer.gstin || '');
            setAddressLoading(false);
        } else {
            setCustomerDetails(null);
            setIsIntraState(false);
            setAddressLoading(false);
        }
    }, [selectedCustomer?.gstin, selectedCustomer?.address, selectedCustomer?.customerId]);

    // Handle item changes with GST calculations
    const handleItemChange = (index, field, value) => {
        setItems(items =>
            items.map((item, i) => {
                if (i !== index) return item;
                
                const updatedItem = { ...item, [field]: value };
                
                const quantity = Number(updatedItem.quantity) || 0;
                const rate = Number(updatedItem.rate) || 0;
                const baseAmount = quantity * rate;
                
                let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
                
                if (isIntraState) {
                    const cgstRate = Number(updatedItem.cgstRate) || 0;
                    const sgstRate = Number(updatedItem.sgstRate) || 0;
                    cgstAmount = baseAmount * (cgstRate / 100);
                    sgstAmount = baseAmount * (sgstRate / 100);
                } else {
                    const igstRate = Number(updatedItem.igstRate) || 0;
                    igstAmount = baseAmount * (igstRate / 100);
                }
                
                return {
                    ...updatedItem,
                    amount: baseAmount,
                    cgstAmount: cgstAmount,
                    sgstAmount: sgstAmount,
                    igstAmount: igstAmount,
                };
            })
        );
    };

    // Handle Rate/Sqft calculations
    const handleRateCalculation = (index, field, value) => {
        handleItemChange(index, field, value);
        
        setItems(prevItems => {
            const updatedItems = [...prevItems];
            const item = updatedItems[index];
            
            const currentRate = field === 'rate' ? value : item.rate;
            const currentRatePerSqft = field === 'ratePerSqft' ? value : item.ratePerSqft;
            const currentMeasurements = field === 'measurements' ? value : item.measurements;
            
            const target = determineCalculationTarget(currentRate, currentRatePerSqft, currentMeasurements, field);
            
            if (target === 'ratePerSqft') {
                const result = calculateRatePerSqft(currentRate, currentMeasurements);
                if (result) {
                    updatedItems[index] = {
                        ...item,
                        ratePerSqft: formatCurrency(result.ratePerSqft, 2),
                        _calculatedField: 'ratePerSqft',
                        _calculation: result.calculation
                    };
                }
            } else if (target === 'rate') {
                const result = calculateTotalRate(currentRatePerSqft, currentMeasurements);
                if (result) {
                    updatedItems[index] = {
                        ...item,
                        rate: formatCurrency(result.totalRate, 2),
                        _calculatedField: 'rate',
                        _calculation: result.calculation
                    };
                    
                    const quantity = Number(item.quantity) || 0;
                    const newRate = result.totalRate;
                    updatedItems[index].amount = quantity * newRate;
                }
            } else if (target === 'check') {
                const consistency = checkRateConsistency(currentRate, currentRatePerSqft, currentMeasurements);
                updatedItems[index] = {
                    ...item,
                    _calculatedField: null,
                    _calculation: consistency.message,
                    _isConsistent: consistency.isConsistent
                };
            } else {
                updatedItems[index] = {
                    ...item,
                    _calculatedField: null,
                    _calculation: null,
                    _isConsistent: true
                };
            }
            
            return updatedItems;
        });
    };

    // Handle measurements conversion
    const handleConvertToFeet = (index) => {
        const currentMeasurement = items[index].measurements;
        if (currentMeasurement && needsConversion(currentMeasurement)) {
            const convertedValue = convertMeasurementToFeet(currentMeasurement);
            handleItemChange(index, 'measurements', convertedValue);
        }
    };

    // Add new item
    const handleAddItem = () => {
        const newItems = [
            ...items,
            { selectedItem: null, description: '', quantity: '', rate: '', amount: 0, hsn: '', cgstRate: '', sgstRate: '', igstRate: '', cgstAmount: 0, sgstAmount: 0, igstAmount: 0, ratePerSqft: '', measurements: '' }
        ];
        setItems(newItems);
    };

    // Calculate totals
    const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
    const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
    const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0);
    const totalTax = totalCgst + totalSgst + totalIgst;
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const discountValue = subtotal * (parseFloat(discount) || 0) / 100;
    const tdsAmount = subtotal * (parseFloat(tdsValue) || 0) / 100;
    const grandTotal = subtotal + totalTax - discountValue - tdsAmount;

    // Handle TDS/TCS type change
    const handleTdsTypeChange = (type) => {
        setTdsType(type);
        setTdsValue('');
    };

    // Handle quote date change and auto-update expiry date
    const handleQuoteDateChange = (newQuoteDate) => {
        setQuoteDate(newQuoteDate);
        
        // Auto-update expiry date to 1 week from the new quote date
        if (newQuoteDate) {
            const quoteDateObj = new Date(newQuoteDate);
            const oneWeekLater = new Date(quoteDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
            setExpiryDate(oneWeekLater.toISOString().split('T')[0]);
        }
    };

    // Quote number configuration handlers
    const handleQuoteNumberConfigSave = async (newConfig) => {
        try {
            console.log('Saving new config:', newConfig);
            
            // Save to localStorage for vendor-specific config
            const configKey = `quoteNumberConfig_${currentUser?.vendorId}`;
            localStorage.setItem(configKey, JSON.stringify(newConfig));
            
            setQuoteNumberConfig(newConfig);
            
            // Immediately update the quote number field with new configuration
            if (newConfig.autoGenerate) {
                const newQuoteNumber = `${newConfig.prefix}${newConfig.nextNumber}`;
                console.log('Setting new quote number:', newQuoteNumber);
                setCustomQuoteNumber(newQuoteNumber);
            }
            
            console.log('Config saved successfully');
        } catch (error) {
            console.error('Error saving quote number config:', error);
        }
    };

    const handleQuoteNumberChange = (value) => {
        setCustomQuoteNumber(value);
    };

    // Reference number configuration handlers
    const handleReferenceNumberConfigSave = async (newConfig) => {
        try {
            console.log('Saving new reference config:', newConfig);
            
            // Save to localStorage for vendor-specific config
            const configKey = `referenceNumberConfig_${currentUser?.vendorId}`;
            localStorage.setItem(configKey, JSON.stringify(newConfig));
            
            setReferenceConfig(newConfig);
            
            // Immediately update the reference number field with new configuration
            if (newConfig.autoGenerate) {
                const newReferenceNumber = `${newConfig.prefix}${newConfig.nextNumber}`;
                console.log('Setting new reference number:', newReferenceNumber);
                setCustomReferenceNumber(newReferenceNumber);
            }
            
            console.log('Reference config saved successfully');
        } catch (error) {
            console.error('Error saving reference number config:', error);
        }
    };

    const handleReferenceNumberChange = (value) => {
        setCustomReferenceNumber(value);
    };

    // Item selection handlers
    const handleOpenItemModal = (itemIndex) => {
        setSelectedItemIndex(itemIndex);
        setShowItemModal(true);
    };

    const handleItemSelect = (selectedItem) => {
        if (selectedItemIndex !== null) {
            const newItems = [...items];
            newItems[selectedItemIndex] = {
                ...newItems[selectedItemIndex],
                selectedItem: selectedItem,
                description: selectedItem.description || selectedItem.name || selectedItem.itemName || '',
                rate: selectedItem.rate || selectedItem.sellingPrice || '',
                hsn: selectedItem.hsn || '',
                // Calculate amount if quantity is already set
                amount: newItems[selectedItemIndex].quantity && selectedItem.rate ? 
                    parseFloat(newItems[selectedItemIndex].quantity) * parseFloat(selectedItem.rate) : 0
            };
            setItems(newItems);
        }
        setShowItemModal(false);
        setSelectedItemIndex(null);
    };

    // Bill To and Ship To editing handlers
    const handleEditBillTo = () => {
        // Bill To is always fixed to Caasdi Global, so this button should be disabled
        // But we keep this for consistency
    };

    const handleEditShipTo = () => {
        if (selectedCustomer) {
            setEditableCustomerDetails(prev => ({
                ...prev,
                shippingAddress: selectedCustomer.shippingAddress || '',
                shippingPhone: selectedCustomer.shippingPhone || selectedCustomer.phone || '',
                shippingEmail: selectedCustomer.shippingEmail || selectedCustomer.email || '',
                shippingGstin: selectedCustomer.shippingGstin || selectedCustomer.gstin || ''
            }));
            setEditingShipTo(true);
        }
    };

    const handleSaveBillTo = () => {
        // Bill To is always fixed, no changes to save
    };

    const handleSaveShipTo = () => {
        try {
            const updatedCustomer = {
                ...selectedCustomer,
                shippingAddress: editableCustomerDetails.shippingAddress,
                shippingPhone: editableCustomerDetails.shippingPhone,
                shippingEmail: editableCustomerDetails.shippingEmail,
                shippingGstin: editableCustomerDetails.shippingGstin
            };
            setSelectedCustomer(updatedCustomer);
            setEditingShipTo(false);
        } catch (error) {
            console.error('Error saving ship to details:', error);
        }
    };

    const handleCancelBillTo = () => {
        // Bill To is always fixed, no cancel needed
    };

    const handleCancelShipTo = () => {
        setEditingShipTo(false);
        setEditableCustomerDetails(prev => ({
            ...prev,
            shippingAddress: selectedCustomer.shippingAddress || '',
            shippingPhone: selectedCustomer.shippingPhone || '',
            shippingEmail: selectedCustomer.shippingEmail || '',
            shippingGstin: selectedCustomer.shippingGstin || ''
        }));
    };

    // Load quote number configuration from localStorage
    useEffect(() => {
        const loadQuoteNumberConfig = async () => {
            try {
                const configKey = `quoteNumberConfig_${currentUser?.vendorId}`;
                const savedConfig = localStorage.getItem(configKey);
                
                if (savedConfig) {
                    const config = JSON.parse(savedConfig);
                    setQuoteNumberConfig(config);
                    
                    if (config.autoGenerate) {
                        setCustomQuoteNumber(`${config.prefix}${config.nextNumber}`);
                    }
                } else {
                    // Set default config for new vendors
                    const defaultConfig = {
                        autoGenerate: true,
                        prefix: 'CG-',
                        nextNumber: '2025001'
                    };
                    setQuoteNumberConfig(defaultConfig);
                    setCustomQuoteNumber(`${defaultConfig.prefix}${defaultConfig.nextNumber}`);
                }
            } catch (error) {
                console.error('Error loading quote number config:', error);
            }
        };
        
        if (currentUser?.vendorId) {
            loadQuoteNumberConfig();
        }
    }, [currentUser?.vendorId]);

    // Load reference number configuration from localStorage
    useEffect(() => {
        const loadReferenceNumberConfig = async () => {
            try {
                const configKey = `referenceNumberConfig_${currentUser?.vendorId}`;
                const savedConfig = localStorage.getItem(configKey);
                
                if (savedConfig) {
                    const config = JSON.parse(savedConfig);
                    setReferenceConfig(config);
                    
                    if (config.autoGenerate) {
                        setCustomReferenceNumber(`${config.prefix}${config.nextNumber}`);
                    }
                } else {
                    // Set default config for new vendors
                    const defaultConfig = {
                        autoGenerate: true,
                        prefix: 'REF-',
                        nextNumber: '2025001'
                    };
                    setReferenceConfig(defaultConfig);
                    setCustomReferenceNumber(`${defaultConfig.prefix}${defaultConfig.nextNumber}`);
                }
            } catch (error) {
                console.error('Error loading reference number config:', error);
            }
        };
        
        if (currentUser?.vendorId) {
            loadReferenceNumberConfig();
        }
    }, [currentUser?.vendorId]);

    // Function to increment quote number
    const incrementQuoteNumber = async () => {
        if (quoteNumberConfig.autoGenerate) {
            try {
                const currentNumber = parseInt(quoteNumberConfig.nextNumber);
                const nextNumber = (currentNumber + 1).toString();
                
                const newConfig = {
                    ...quoteNumberConfig,
                    nextNumber: nextNumber
                };
                
                // Save updated config
                const configKey = `quoteNumberConfig_${currentUser?.vendorId}`;
                localStorage.setItem(configKey, JSON.stringify(newConfig));
                
                setQuoteNumberConfig(newConfig);
                setCustomQuoteNumber(`${newConfig.prefix}${nextNumber}`);
                
                console.log('Quote number incremented to:', `${newConfig.prefix}${nextNumber}`);
            } catch (error) {
                console.error('Error incrementing quote number:', error);
            }
        }
    };

    // Function to increment reference number
    const incrementReferenceNumber = async () => {
        if (referenceConfig.autoGenerate) {
            try {
                const currentNumber = parseInt(referenceConfig.nextNumber);
                const nextNumber = (currentNumber + 1).toString();
                
                const newConfig = {
                    ...referenceConfig,
                    nextNumber: nextNumber
                };
                
                // Save updated config
                const configKey = `referenceNumberConfig_${currentUser?.vendorId}`;
                localStorage.setItem(configKey, JSON.stringify(newConfig));
                
                setReferenceConfig(newConfig);
                setCustomReferenceNumber(`${newConfig.prefix}${nextNumber}`);
                
                console.log('Reference number incremented to:', `${newConfig.prefix}${nextNumber}`);
            } catch (error) {
                console.error('Error incrementing reference number:', error);
            }
        }
    };

    // Function to generate PDF using the *same* StandardPreview layout (html2pdf)
    const generateQuotePDF = async (quoteData) => {
        try {
            console.log('Starting PDF generation with quote data:', quoteData);

            // Build company details similar to QuotesPreviewPanel
            // IMPORTANT: avoid external logo URL here to prevent html2canvas CORS/taint issues
            const company = {
                logo: null,
                name: currentUser?.companyName || currentUser?.name || 'Your Company',
                address: currentUser?.address || '',
                gstin: currentUser?.gstin || '',
                email: currentUser?.email || '',
                country: 'India'
            };

            // Adapt workspace quote shape into what StandardPreview expects
            const standardQuote = {
                ...quoteData,
                subTotal: quoteData.subtotal ?? quoteData.subTotal ?? 0,
                totalCgst: quoteData.totalCgst ?? quoteData.cgst ?? 0,
                totalSgst: quoteData.totalSgst ?? quoteData.sgst ?? 0,
                totalIgst: quoteData.totalIgst ?? quoteData.igst ?? 0,
                discount: quoteData.discount || { type: 'percentage', value: 0 }
            };

            // Container that will hold StandardPreview (kept in normal flow so html2pdf can measure it)
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.width = '900px';
            container.style.margin = '40px auto';
            container.style.backgroundColor = '#ffffff';
            container.style.zIndex = '9999';

            document.body.appendChild(container);

            // Render StandardPreview into the container
            const root = createRoot(container);
            root.render(
                <StandardPreview
                    quote={standardQuote}
                    company={company}
                    terms={quoteData.termsAndConditions}
                    notes={quoteData.notes || customerNotes}
                    docType="quote"
                />
            );

            // Wait for React + layout to settle
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const element = container.firstElementChild || container;

            console.log('StandardPreview container dimensions before html2pdf:', {
                offsetWidth: element.offsetWidth,
                offsetHeight: element.offsetHeight,
                scrollHeight: element.scrollHeight
            });
            const opt = {
                margin: 10,
                filename: `Quote-${quoteData.customQuoteId || quoteData.quotationId}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
            };

            console.log('Starting html2pdf conversion from StandardPreview element');
            const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
            console.log('PDF generated successfully from StandardPreview, blob size:', pdfBlob.size);

            // Clean up
            root.unmount();
            document.body.removeChild(container);

            return pdfBlob;
        } catch (error) {
            console.error('Error generating styled PDF with html2pdf:', error);
            throw error;
        }
    };
    
    // Function to upload PDF to S3 via backend (avoids CORS issues)
    const uploadPDFToS3 = async (pdfBlob, fileName) => {
        try {
            // Convert Blob to File object
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('email', currentUser?.email || 'vendor@example.com');
            formData.append('documentType', 'quotationPDF');
            formData.append('section', 'quotations');
            
            console.log('Uploading PDF to S3 via backend:', { fileName, fileSize: pdfBlob.size });
            
            // Use backend endpoint to avoid CORS issues
            const response = await fetch(`/api/files/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload PDF');
            }
            
            const result = await response.json();
            console.log('\ud83d\udce6 Backend upload response:', result);
            const fileUrl = result?.data?.url || result?.url || result?.fileUrl || result?.data?.fileUrl;
            console.log('\ud83d\udd17 Extracted fileUrl:', fileUrl);
            
            if (!fileUrl) {
                throw new Error('No URL returned from upload');
            }
            
            console.log('✅ PDF uploaded successfully:', fileUrl);
            return fileUrl;
        } catch (error) {
            console.error('Error uploading PDF to S3:', error);
            throw error;
        }
    };
            // Save quote
            const handleSaveQuote = async () => {
                setMessage(null);
                if (!selectedCustomer) {
                    setMessage({ type: 'error', text: 'Please select a customer.' });
                    return;
                }
                
        // Create a clean customer object for the quote
        const quoteCustomer = {
            ...selectedCustomer,
            // Only include the fields we want to save with the quote
            id: selectedCustomer.originalCustomerId || selectedCustomer.id,
            name: selectedCustomer.name || selectedCustomer.displayName || selectedCustomer.companyName,
            companyName: selectedCustomer.companyName || selectedCustomer.name || 'Unknown',
            email: editableCustomerDetails.shippingEmail || selectedCustomer.email || '',
            phone: editableCustomerDetails.shippingPhone || selectedCustomer.phone || selectedCustomer.mobile || '',
            gstin: editableCustomerDetails.shippingGstin || selectedCustomer.gstin || '',
            address: {
                billing: CAASDI_GLOBAL_CUSTOMER.address.billing,
                shipping: selectedCustomer.address?.shipping || {}
            },
            // Indicate this is a quote-specific copy
            isQuoteSpecific: true
        };
        
        // Always set billing address to Caasdi Global
        quoteCustomer.billingAddress = CAASDI_GLOBAL_CUSTOMER.billingAddress;
        
        // Use shipping address from editable details
        if (editableCustomerDetails.shippingAddress) {
            quoteCustomer.shippingAddress = editableCustomerDetails.shippingAddress;
        }
        if (!items.length || !items.some(item => item.selectedItem && item.selectedItem.name)) {
            setMessage({ type: 'error', text: 'Please add at least one item.' });
            return;
        }
        setSaving(true);
        setIsLoading(true);

        // Format customer details for StandardPreview compatibility
        // IMPORTANT: Billing address is always Caasdi Global
        const formattedCustomerDetails = {
            ...selectedCustomer,
            gstin: selectedCustomer.gstin || '',
            address: {
                billing: CAASDI_GLOBAL_CUSTOMER.address.billing,
                shipping: selectedCustomer.address?.shipping || {
                    street1: editableCustomerDetails.shippingAddress?.split('\n')[0] || '',
                    street2: editableCustomerDetails.shippingAddress?.split('\n')[1] || '',
                    city: '',
                    state: '',
                    pinCode: '',
                    country: 'India'
                }
            }
        };

        const quotationData = {
            // Core identification
            vendorId: currentUser?.vendorId,
            quotationId: customQuoteNumber,
            customQuoteId: customQuoteNumber,
            
            // Customer information
            customerId: quoteCustomer.originalCustomerId || quoteCustomer.customerId || quoteCustomer.id,
            customerName: quoteCustomer.name || quoteCustomer.displayName || quoteCustomer.companyName,
            gstin: quoteCustomer.gstin || '',
            customerDetails: {
                customerId: quoteCustomer.originalCustomerId || quoteCustomer.customerId || quoteCustomer.id,
                name: quoteCustomer.name || quoteCustomer.displayName || quoteCustomer.companyName,
                companyName: quoteCustomer.companyName || quoteCustomer.name || '',
                displayName: quoteCustomer.displayName || quoteCustomer.name || quoteCustomer.companyName || '',
                gstin: quoteCustomer.gstin || '',
                address: {
                    billing: CAASDI_GLOBAL_CUSTOMER.address.billing,
                    shipping: quoteCustomer.address?.shipping || quoteCustomer.shippingAddress || {}
                }
            },
            
            // Items with proper structure for backend
            items: items.map(item => ({
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                rate: parseFloat(item.rate) || 0,
                amount: parseFloat(item.amount) || 0,
                hsn: item.hsn || '',
                cgstRate: parseFloat(item.cgstRate) || 0,
                sgstRate: parseFloat(item.sgstRate) || 0,
                igstRate: parseFloat(item.igstRate) || 0,
                cgstAmount: parseFloat(item.cgstAmount) || 0,
                sgstAmount: parseFloat(item.sgstAmount) || 0,
                igstAmount: parseFloat(item.igstAmount) || 0,
                ratePerSqft: item.ratePerSqft || null,
                measurements: item.measurements || null,
                selectedItem: item.selectedItem ? {
                    id: item.selectedItem.id,
                    name: item.selectedItem.name || item.selectedItem.itemName,
                    ...item.selectedItem
                } : null
            })),
            
            // Financial totals
            subtotal: subtotal,
            cgst: totalCgst,
            sgst: totalSgst,
            igst: totalIgst,
            total: grandTotal,
            
            // Dates
            quotationDate: quoteDate,
            expiryDate: expiryDate,
            
            // Addresses
            billingAddress: {},
            shippingAddress: {},
            
            // Status
            status: 'draft',  
            
            // Discount structure
            discount: {
                type: 'percentage',
                value: parseFloat(discount) || 0,
            },
            
            // TDS information
            tdsType: tdsType,
            tdsValue: parseFloat(tdsValue) || 0,
            
            // Dates
            createdAt: new Date().toISOString(),
            quoteDate: quoteDate,
            expiryDate: expiryDate,
            
            // Additional information / metadata
            status: 'draft',
            projectId,
            projectName,
            // Workspace linkage (for workspace_quotations metadata)
            workspaceId: workspaceId || null,
            workspaceName:
              workspaceName ||
              (typeof window !== 'undefined' ? localStorage.getItem('currentWorkspace') : null) ||
              '',
            taskId: selectedTask?.id || null,
            taskName: selectedTask?.name || '',
            subtaskId: selectedSubtask?.id || null,
            subtaskName: selectedSubtask?.name || '',
            notes: customerNotes,
            termsAndConditions: termsAndConditions,
            vendorId: currentUser?.vendorId,
            
            // Company information (if available from context)
            company: {
                name: currentUser?.companyName || currentUser?.name || 'Your Company',
                address: currentUser?.address || '',
                gstin: currentUser?.gstin || '',
                email: currentUser?.email || '',
                logo: currentUser?.logo || null,
                country: 'India'
            }
        };

        // Debug: Log the formatted quotation data
        console.log('Saving quotation data in StandardPreview format:', quotationData);

        try {
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

            const isEdit = !!initialData && !duplicateMode;
            
            // Debug: Check what ID fields are available
            console.log('Edit mode check:', { isEdit, initialData, duplicateMode });
            
            // Try to get the quotation ID from various possible fields
            const quotationId = initialData?.id || initialData?.quotationId || initialData?._id || initialData?.quoteId;
            console.log('Quotation ID for edit:', quotationId);
            
            if (isEdit && !quotationId) {
                console.error('Cannot edit quote: No quotation ID found in initialData:', initialData);
                setMessage({ type: 'error', text: 'Cannot update quote: Missing quotation ID' });
                setSaving(false);
                setIsLoading(false);
                return;
            }
            
            // Generate PDF BEFORE saving so we can include the URL in the save
            let pdfUrl = null;
            try {
                console.log('Generating PDF before save...');
                const pdfBlob = await generateQuotePDF(quotationData);
                const fileName = `quote_${quotationData.customQuoteId || quotationData.quotationId}_${new Date().toISOString().split('T')[0]}.pdf`;
                console.log('PDF file name:', fileName);
                pdfUrl = await uploadPDFToS3(pdfBlob, fileName);
                console.log('PDF generated and uploaded successfully:', pdfUrl);
            } catch (pdfError) {
                console.error('Error generating/uploading PDF:', pdfError);
                setMessage({ type: 'warning', text: 'Quote saved successfully, but PDF generation failed. You can regenerate it later.' });
                // Continue with save even if PDF fails
            }
            
            // Add PDF URL to the quote data if generated
            if (pdfUrl) {
                quotationData.pdfUrl = pdfUrl;
                console.log('✅ Added pdfUrl to quotationData:', quotationData.pdfUrl);
            } else {
                console.log('⚠️ No pdfUrl generated - PDF upload may have failed');
            }
            
            console.log('📤 Final quotationData being saved:', {
                hasQuotationId: !!quotationData.quotationId,
                hasPdfUrl: !!quotationData.pdfUrl,
                pdfUrlValue: quotationData.pdfUrl,
                dataKeys: Object.keys(quotationData)
            });
            
            const url = isEdit ? `/api/workspace/quotations/${quotationId}` : `/api/workspace/quotations`;
            const method = isEdit ? 'PUT' : 'POST';
            
            const jsonPayload = JSON.stringify(quotationData);
            console.log('📨 Sending to backend:', {
                url,
                method,
                pdfUrlInPayload: quotationData.pdfUrl,
                payloadSize: jsonPayload.length,
                firstChars: jsonPayload.substring(0, 200)
            });
            
            const res = await fetch(url, {
                method: method,
                headers: headers,
                body: jsonPayload,
            });

            if (res.ok) {
                const saved = await res.json();
                const savedQuotationId =
                  saved?.data?.quotationId ||
                  saved?.data?.id ||
                  quotationId ||
                  quotationData.quotationId;
                
                setMessage({ type: 'success', text: isEdit ? 'Quotation updated successfully!' : 'Quotation saved successfully!' });
                
                // Increment quote and reference numbers for next quote (only for new quotes, not edits)
                if (!isEdit) {
                    incrementQuoteNumber();
                    incrementReferenceNumber();
                }
                
                setTimeout(() => onBack(), 2000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                setMessage({ type: 'error', text: isEdit ? `Failed to update quotation: ${errorData.error || 'Unknown error'}` : `Failed to save quotation: ${errorData.error || 'Unknown error'}` });
            }
        } catch (err) {
            setMessage({ type: 'error', text: (!!initialData && !duplicateMode) ? 'Failed to update quotation.' : 'Failed to save quotation.' });
        } finally {
            setSaving(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row bg-gray-100 min-h-screen font-poppins">
            {/* Loading Screen */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-95 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 mx-auto rounded-2xl shadow-2xl flex items-center justify-center"
                                 style={{ background: 'linear-gradient(135deg, #0d6b5c 0%, #000 100%)' }}>
                                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                                    <div className="w-8 h-8 bg-gradient-to-r from-[#0d6b5c] to-black rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0d6b5c] to-black bg-clip-text text-transparent">
                                Processing Quote
                            </h2>
                            <p className="text-gray-600 text-lg">
                                Please wait while we save your quote...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Quote Form */}
            <div className="flex-1 p-8 flex flex-col min-h-full">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">{initialData ? (duplicateMode ? 'Duplicate Quotation' : 'Edit Quotation') : 'New Quotation'}</h1>
                    <div className="flex items-center">
                         <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full\">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="bg-white p-8 rounded-lg shadow-sm">
                    {message && (
                      <div className={`mb-4 p-3 rounded text-center font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="col-span-2 space-y-6">
                             <div>
                                <label className="block mb-2 text-lg font-medium text-gray-700 font-poppins">Customer Name*</label>
                                <CustomerDropdown value={selectedCustomer} onChange={setSelectedCustomer} />
                                
                                {/* Bill To and Ship To Side by Side */}
                                {selectedCustomer && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-0">
                                        {/* Bill To Section */}
                                        <div className="p-4 border rounded-l-lg">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-sm font-semibold text-gray-900">Bill To</h3>
                                                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 rounded">Fixed</span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {/* Billing Address */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                                                    <div 
                                                        className="text-sm text-gray-700 bg-gray-100 p-3 rounded border border-gray-300 min-h-[80px] cursor-not-allowed overflow-auto whitespace-pre-wrap"
                                                        style={{pointerEvents: 'none', userSelect: 'none'}}
                                                    >
                                                        {editableCustomerDetails.billingAddress || CAASDI_GLOBAL_CUSTOMER.billingAddress}
                                                    </div>
                                                </div>

                                                {/* Billing Contact Info */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Information</label>
                                                    <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded border border-gray-300">
                                                        <div className="mb-2">
                                                            <span className="text-xs font-medium text-gray-600">Email:</span>
                                                            <div className="text-gray-700">{editableCustomerDetails.billingEmail || CAASDI_GLOBAL_CUSTOMER.email || 'N/A'}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-medium text-gray-600">Phone:</span>
                                                            <div className="text-gray-700">{editableCustomerDetails.billingPhone || CAASDI_GLOBAL_CUSTOMER.phone || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Billing GSTIN */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
                                                    <div 
                                                        className="text-sm text-gray-700 bg-gray-100 p-3 rounded border border-gray-300 cursor-not-allowed"
                                                        style={{pointerEvents: 'none', userSelect: 'none'}}
                                                    >
                                                        {editableCustomerDetails.billingGstin || CAASDI_GLOBAL_CUSTOMER.gstin}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vertical Divider */}
                                        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-auto bg-gray-300" style={{width: '1px', marginTop: '4px', marginBottom: '4px'}}></div>

                                        {/* Ship To Section */}
                                        <div className="p-4  border  rounded-r-lg border-l-0">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-sm font-semibold text-gray-900">Ship To</h3>
                                                {!editingShipTo ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleEditShipTo}
                                                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                                    >
                                                        <Edit2 size={14} />
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveShipTo}
                                                            className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                                                        >
                                                            <Check size={14} />
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelShipTo}
                                                            className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                                                        >
                                                            <X size={14} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {/* Shipping Address */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                                                    {!editingShipTo ? (
                                                        <div className="text-sm text-gray-800 bg-white p-3 rounded border min-h-[80px] whitespace-pre-wrap overflow-auto">
                                                            {editableCustomerDetails.shippingAddress || 'Enter shipping address...'}
                                                        </div>
                                                    ) : (
                                                        <textarea
                                                            value={editableCustomerDetails.shippingAddress}
                                                            onChange={(e) => setEditableCustomerDetails({
                                                                ...editableCustomerDetails,
                                                                shippingAddress: e.target.value
                                                            })}
                                                            className="w-full text-sm p-3 border border-gray-300 rounded resize-none"
                                                            rows="4"
                                                            placeholder="Enter shipping address..."
                                                            autoComplete="off"
                                                            data-form-type="other"
                                                            data-lpignore="true"
                                                            data-1p-ignore
                                                        />
                                                    )}
                                                </div>

                                                {/* Shipping Contact Info */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Information</label>
                                                    {!editingShipTo ? (
                                                        <div className="text-sm text-gray-800 bg-white p-3 rounded border space-y-2">
                                                            <div>
                                                                <span className="text-xs font-medium text-gray-600">Email:</span>
                                                                <div className="text-gray-700">{editableCustomerDetails.shippingEmail || 'N/A'}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-medium text-gray-600">Phone:</span>
                                                                <div className="text-gray-700">{editableCustomerDetails.shippingPhone || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="email"
                                                                value={editableCustomerDetails.shippingEmail}
                                                                onChange={(e) => setEditableCustomerDetails({
                                                                    ...editableCustomerDetails,
                                                                    shippingEmail: e.target.value
                                                                })}
                                                                className="w-full text-sm p-2 border border-gray-300 rounded"
                                                                placeholder="Enter email..."
                                                            />
                                                            <input
                                                                type="tel"
                                                                value={editableCustomerDetails.shippingPhone}
                                                                onChange={(e) => setEditableCustomerDetails({
                                                                    ...editableCustomerDetails,
                                                                    shippingPhone: e.target.value
                                                                })}
                                                                className="w-full text-sm p-2 border border-gray-300 rounded"
                                                                placeholder="Enter phone..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Shipping GSTIN */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
                                                    {!editingShipTo ? (
                                                        <div className="text-sm text-gray-800 bg-white p-3 rounded border">
                                                            {editableCustomerDetails.shippingGstin || 'N/A'}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={editableCustomerDetails.shippingGstin}
                                                            onChange={(e) => setEditableCustomerDetails({
                                                                ...editableCustomerDetails,
                                                                shippingGstin: e.target.value
                                                            })}
                                                            className="w-full text-sm p-2 border border-gray-300 rounded"
                                                            placeholder="Enter GSTIN..."
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quotation#*</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={customQuoteNumber}
                                            onChange={(e) => handleQuoteNumberChange(e.target.value)}
                                            readOnly={quoteNumberConfig.autoGenerate}
                                            className={`p-2 border border-gray-300 rounded-md w-full ${quoteNumberConfig.autoGenerate ? 'bg-gray-50' : 'bg-white'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowQuoteNumberModal(true)}
                                            onMouseEnter={() => setShowTooltip(true)}
                                            onMouseLeave={() => setShowTooltip(false)}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Settings size={16} />
                                            {showTooltip && (
                                                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50">
                                                    Click here to enable or disable auto-generation of Quotation numbers.
                                                    <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reference#*
                                        <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Auto: +1</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={customReferenceNumber}
                                            onChange={(e) => handleReferenceNumberChange(e.target.value)}
                                            readOnly={referenceConfig.autoGenerate}
                                            className={`p-2 border border-gray-300 rounded-md w-full pr-10 ${
                                                referenceConfig.autoGenerate ? 'bg-gray-50 cursor-not-allowed' : ''
                                            }`}
                                            title={referenceConfig.autoGenerate ? "Auto-generated (click settings to change)" : "Manual entry"}
                                        />
                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowReferenceModal(true)}
                                                    onMouseEnter={() => setShowReferenceTooltip(true)}
                                                    onMouseLeave={() => setShowReferenceTooltip(false)}
                                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <Settings size={16} />
                                                </button>
                                                {showReferenceTooltip && (
                                                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap z-10">
                                                        Configure reference number
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Automatically increments with each new quote (editable)</p>
                                </div>
                            </div>
                            
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quote Date*</label>
                                    <input 
                                        type="date" 
                                        value={quoteDate}
                                        onChange={(e) => handleQuoteDateChange(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-md w-full" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiry Date
                                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Auto: +7 days</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-md w-full" 
                                        title="Automatically set to 1 week from quote date (you can change this)"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Automatically set to 1 week from quote date (editable)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Table */}
                    <div className="mt-8">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Item Table</h3>
                        </div>
                        <div className="overflow-x-auto rounded-xl shadow border border-gray-200">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">ITEM DETAILS</th>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-48">DESCRIPTION</th>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">QUANTITY</th>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-32">RATE</th>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-32">AMOUNT</th>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-20">HSN</th>
                                        {isIntraState ? (
                                          <>
                                            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">CGST (%)</th>
                                            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">SGST (%)</th>
                                          </>
                                        ) : (
                                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-24">IGST (%)</th>
                                        )}
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-32">TOTAL</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="p-2 border-t">
                                                <div 
                                                    className="p-2 border border-gray-200 rounded w-full cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-between"
                                                    onClick={() => handleOpenItemModal(index)}
                                                >
                                                    <span className={item.selectedItem?.name ? 'text-gray-900' : 'text-gray-400'}>
                                                        {item.selectedItem?.name || 'Click to select item...'}
                                                    </span>
                                                    <Search size={16} className="text-gray-400" />
                                                </div>
                                            </td>
                                            <td className="p-2 border-t">
                                                <input
                                                    type="text"
                                                    value={item.description || ''}
                                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                    className="p-2 border border-gray-200 rounded w-full focus:ring-2 focus:ring-blue-200"
                                                    placeholder="Add description..."
                                                />
                                            </td>
                                            <td className="p-2 border-t">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.quantity === 0 || item.quantity === '' ? '' : item.quantity}
                                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="p-2 border border-gray-200 rounded w-full text-right focus:ring-2 focus:ring-blue-200"
                                                />
                                            </td>
                                            <td className="p-2 border-t">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.rate === 0 || item.rate === '' ? '' : item.rate}
                                                    onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                                    className="p-2 border border-gray-200 rounded w-full text-right focus:ring-2 focus:ring-blue-200"
                                                />
                                            </td>
                                            <td className="p-2 border-t font-semibold text-right">
                                                {item.amount?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="p-2 border-t text-center">
                                                <input
                                                    type="text"
                                                    value={item.hsn || ''}
                                                    onChange={e => handleItemChange(index, 'hsn', e.target.value)}
                                                    className="p-2 border border-gray-200 rounded w-full text-center focus:ring-2 focus:ring-blue-200"
                                                />
                                            </td>
                                            {isIntraState ? (
                                              <>
                                                <td className="p-2 border-t">
                                                  <input type="number" value={item.cgstRate} onChange={e => handleItemChange(index, 'cgstRate', e.target.value)} className="p-2 border rounded w-full text-right" />
                                                  <div className="text-xs text-gray-500 text-right">Amt: {item.cgstAmount.toFixed(2)}</div>
                                                </td>
                                                <td className="p-2 border-t">
                                                  <input type="number" value={item.sgstRate} onChange={e => handleItemChange(index, 'sgstRate', e.target.value)} className="p-2 border rounded w-full text-right" />
                                                  <div className="text-xs text-gray-500 text-right">Amt: {item.sgstAmount.toFixed(2)}</div>
                                                </td>
                                              </>
                                            ) : (
                                              <td className="p-2 border-t">
                                                <input type="number" value={item.igstRate} onChange={e => handleItemChange(index, 'igstRate', e.target.value)} className="p-2 border rounded w-full text-right" />
                                                <div className="text-xs text-gray-500 text-right">Amt: {item.igstAmount.toFixed(2)}</div>
                                              </td>
                                            )}
                                            <td className="p-2 border-t font-semibold text-right">
                                              {(item.amount + item.cgstAmount + item.sgstAmount + item.igstAmount).toFixed(2)}
                                            </td>
                                            <td className="p-2 border-t">
                                                <button
                                                    onClick={() => {
                                                        const newItems = [...items];
                                                        newItems.splice(index, 1);
                                                        setItems(newItems);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                            <div className="text-xl font-bold">
                                Total ( ₹ ) <span className="ml-2">{subtotal.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div className="mt-4 flex space-x-4">
                            <button onClick={handleAddItem} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                                <Plus size={16} className="mr-1.5" /> Add New Row
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <div className="w-full md:w-1/2 lg:w-1/3 space-y-4">
                            {showTotalSummary && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Sub Total</span>
                                        <span>{subtotal.toFixed(2)}</span>
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <span className="font-semibold">Discount</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              value={discount === 0 || discount === '' ? '' : discount}
                                              onChange={e => setDiscount(e.target.value)}
                                              className="w-20 p-2 border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-200"
                                            />
                                            <span className="text-gray-500">%</span>
                                            <span>{discountValue.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    
                                    <hr className="my-4" />
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold">Sub Total</span>
                                      <span>{subtotal.toFixed(2)}</span>
                                    </div>
                                    {isIntraState ? (
                                      <>
                                        <div className="flex justify-between items-center">
                                          <span className="font-semibold">Total CGST</span>
                                          <span>{totalCgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="font-semibold">Total SGST</span>
                                          <span>{totalSgst.toFixed(2)}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold">Total IGST</span>
                                        <span>{totalIgst.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <hr className="my-4" />
                                    <div className="flex justify-between items-center text-xl font-bold">
                                      <span>Total ( ₹ )</span>
                                      <span>{grandTotal.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            <div className="text-right mt-2">
                                 <button onClick={() => setShowTotalSummary(!showTotalSummary)} className="text-sm text-blue-600 font-semibold flex items-center">
                                     {showTotalSummary ? 'Hide Total Summary' : 'Show Total Summary'}
                                    <ChevronDown size={16} className={`ml-1 transform transition-transform ${showTotalSummary ? 'rotate-180' : ''}`} />
                                </button>
                             </div>
                        </div>
                    </div>

                     <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Notes</label>
                            <textarea 
                                rows="3" 
                                value={customerNotes}
                                onChange={(e) => setCustomerNotes(e.target.value)}
                                className="p-2 border border-gray-300 rounded-md w-full"
                            />
                         </div>
                          <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                                <textarea 
                                    rows="3" 
                                    value={termsAndConditions}
                                    onChange={(e) => setTermsAndConditions(e.target.value)}
                                    placeholder="Enter the terms and conditions of your business to be displayed in your transaction" 
                                    className="p-2 border border-gray-300 rounded-md w-full"
                                />
                            </div>
                     </div>
                </div>

                <footer className="mt-8 flex justify-between items-center">
                    <div className="mt-8 flex justify-end space-x-4">
                        <button
                            onClick={handleSaveQuote}
                            className="text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition"
                            style={{ background: 'linear-gradient(120deg, #0d6b5c 0%, #000 100%)' }}
                            disabled={saving}
                        >
                            Save as Draft
                        </button>
                    </div>
                </footer>
            </div>
            
            {/* Quote Number Configuration Modal */}
            <QuoteNumberConfigModal
                open={showQuoteNumberModal}
                onClose={() => setShowQuoteNumberModal(false)}
                config={quoteNumberConfig}
                onSave={handleQuoteNumberConfigSave}
            />
            
            <ReferenceNumberConfigModal
                open={showReferenceModal}
                onClose={() => setShowReferenceModal(false)}
                config={referenceConfig}
                onSave={handleReferenceNumberConfigSave}
            />
            
            <ItemSelectionModal
                open={showItemModal}
                onClose={() => setShowItemModal(false)}
                onSelect={handleItemSelect}
            />
        </div>
    );
};

// Wrapper component with AuthProvider
const NewQuoteComponent = (props) => {
  return (
    <AuthProvider>
      <NewQuoteComponentInner {...props} />
    </AuthProvider>
  );
};

export default NewQuoteComponent;
