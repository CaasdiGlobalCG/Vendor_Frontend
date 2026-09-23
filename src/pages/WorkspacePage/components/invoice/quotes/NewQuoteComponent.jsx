import React, { useState, useEffect, useContext, useRef } from 'react';
import { Search, Info, Trash2, Plus, Upload, X, ChevronDown, Edit, Loader2, Edit2, PlusCircle, Save, Settings, Check, Eye } from 'lucide-react';
import { VendorContext } from '../../../../../context/VendorContext';
import { AuthProvider } from '../../../../../context/AuthContext';
import { convertMeasurementToFeet, needsConversion } from '../../../../../utils/unitConverter';
import { calculateRatePerSqft, calculateTotalRate, checkRateConsistency, determineCalculationTarget, formatCurrency } from '../../../../../utils/rateCalculator';
import config from '../../../../../config/env';
import authFetch from '../../../../../utils/authFetch';
import html2pdf from 'html2pdf.js';
import StandardPreview from '../shared/StandardPreview.jsx';
import { createRoot } from 'react-dom/client';
import invoiceFetch, { getIdToken } from '../utils/invoiceFetch';

// Fixed Caasdi Global customer used for all quotations
const CAASDI_GLOBAL_CUSTOMER = {
  id: 'caasdi-global',
  customerId: 'caasdi-global',
  name: 'Caasdi Global',
  displayName: 'Caasdi Global',
  companyName: 'Caasdi Global',
  email: 'corporate@caasdiglobal.in',
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
      
      invoiceFetch(`/api/workspace/customers?vendorId=${currentUser?.vendorId}`, { headers })
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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fadeIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-dim hover:text-ink text-2xl">×</button>
        <h2 className="text-xl font-bold mb-4 text-ink">Search Customers</h2>
        <input
          className="w-full border rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-info/20"
          placeholder="Type a customer name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center text-dim py-8">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-dim py-8">No customers found</div>
          ) : (
            filtered.map((customer) => (
              <div
                key={customer.customerId}
                className="px-4 py-3 hover:bg-info/10 cursor-pointer rounded"
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
      <div className="border-2 border-cg rounded-lg px-6 py-4 flex items-center text-lg bg-canvas cursor-not-allowed">
        <div>
          <div className="font-semibold text-ink">Caasdi Global</div>
          <div className="text-xs text-dim mt-1">
            262, 2nd floor, Srinivasa Nagar, Banashankari 1st Stage, Bengaluru, Karnataka, 560050
          </div>
          <div className="text-xs text-dim mt-0.5">GSTIN: 29AATFC6640B1ZB</div>
        </div>
        <span className="ml-auto text-xs text-dim">Fixed bill-to</span>
      </div>
    </div>
  );
};

// How often the quote form is auto-saved as a draft (ms)
const AUTO_SAVE_INTERVAL_MS = 5000;

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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg p-0 relative animate-fadeInUp" style={{overflow: 'hidden'}}>
        {/* Gradient Header */}
        <div style={{background: 'linear-gradient(120deg, rgb(var(--text-ink)) 0%, rgb(var(--text-ink)) 100%)'}} className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Configure Quote Number Preferences</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1 transition"><span className="text-2xl">×</span></button>
        </div>
        
        <div className="p-6">
          <p className="text-dim mb-6">
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
                <label htmlFor="autoGenerate" className="block text-sm font-medium text-ink">
                  Continue auto-generating quote numbers
                </label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-dim mb-1">Prefix</label>
                    <input
                      type="text"
                      value={localConfig.prefix}
                      onChange={(e) => setLocalConfig({...localConfig, prefix: e.target.value})}
                      className="w-full p-2 border border-line rounded text-sm"
                      disabled={!localConfig.autoGenerate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dim mb-1">Next Number</label>
                    <input
                      type="text"
                      value={localConfig.nextNumber}
                      onChange={(e) => setLocalConfig({...localConfig, nextNumber: e.target.value})}
                      className="w-full p-2 border border-line rounded text-sm"
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
              <label htmlFor="manualEntry" className="block text-sm font-medium text-ink">
                Enter quote numbers manually
              </label>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-line rounded-lg text-ink hover:bg-canvas transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-info text-white rounded-lg hover:bg-info transition"
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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg p-0 relative animate-fadeInUp" style={{overflow: 'hidden'}}>
        {/* Gradient Header */}
        <div style={{background: 'linear-gradient(120deg, rgb(var(--text-ink)) 0%, rgb(var(--text-ink)) 100%)'}} className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Configure Reference Number Preferences</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1 transition"><span className="text-2xl">×</span></button>
        </div>
        
        <div className="p-6">
          <p className="text-dim mb-6">
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
                <label htmlFor="autoGenerateRef" className="block text-sm font-medium text-ink">
                  Continue auto-generating reference numbers
                </label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-dim mb-1">Prefix</label>
                    <input
                      type="text"
                      value={localConfig.prefix}
                      onChange={(e) => setLocalConfig({...localConfig, prefix: e.target.value})}
                      className="w-full p-2 border border-line rounded text-sm"
                      disabled={!localConfig.autoGenerate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dim mb-1">Next Number</label>
                    <input
                      type="text"
                      value={localConfig.nextNumber}
                      onChange={(e) => setLocalConfig({...localConfig, nextNumber: e.target.value})}
                      className="w-full p-2 border border-line rounded text-sm"
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
              <label htmlFor="manualEntryRef" className="block text-sm font-medium text-ink">
                Enter reference numbers manually
              </label>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-line rounded-lg text-ink hover:bg-canvas transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-info text-white rounded-lg hover:bg-info transition"
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
      
      invoiceFetch(`/api/workspace/items?vendorId=${currentUser?.vendorId}`, { headers })
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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative animate-fadeIn max-h-[80vh] overflow-hidden flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-dim hover:text-ink text-2xl">×</button>
        
        {!showAddForm ? (
          <>
            <h2 className="text-xl font-bold mb-4 text-ink">Select Item</h2>
            
            <input
              className="w-full border rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-info/20"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={() => setShowAddForm(true)}
              className="mb-4 px-4 py-2 bg-success text-white rounded-lg hover:bg-success transition flex items-center gap-2 w-full justify-center"
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
                <div className="text-center py-8 text-dim">
                  {search ? 'No items found matching your search.' : 'No items available.'}
                </div>
              ) : (
                filtered.map((item, index) => (
                  <div
                    key={item.id || item.itemId || index}
                    className="px-4 py-3 hover:bg-info/10 cursor-pointer rounded border-b border-line last:border-b-0"
                    onClick={() => { onSelect(item); onClose(); }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-ink">
                          {item.name || item.itemName || 'Unnamed Item'}
                        </div>
                        {item.description && (
                          <div className="text-sm text-dim mt-1">
                            {item.description}
                          </div>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-dim">
                          {item.hsn && <span>HSN: {item.hsn}</span>}
                          {item.unit && <span>Unit: {item.unit}</span>}
                          {item.category && <span>Category: {item.category}</span>}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {item.rate && (
                          <div className="font-semibold text-success">
                            ₹{parseFloat(item.rate).toLocaleString()}
                          </div>
                        )}
                        {item.sellingPrice && item.sellingPrice !== item.rate && (
                          <div className="text-sm text-dim">
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
            <h2 className="text-xl font-bold mb-4 text-ink">Add New Item</h2>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Item Name*</label>
                <input
                  type="text"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                  className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-info/20"
                  placeholder="Enter item name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                <textarea
                  value={newItemData.description}
                  onChange={(e) => setNewItemData({...newItemData, description: e.target.value})}
                  className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-info/20"
                  placeholder="Enter item description..."
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Price*</label>
                  <input
                    type="number"
                    value={newItemData.rate}
                    onChange={(e) => setNewItemData({...newItemData, rate: e.target.value})}
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-info/20"
                    placeholder="Enter price..."
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newItemData.quantity}
                    onChange={(e) => setNewItemData({...newItemData, quantity: e.target.value})}
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-info/20"
                    placeholder="Enter quantity..."
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-line text-ink rounded-lg hover:bg-canvas transition"
              >
                Back
              </button>
              <button
                onClick={handleAddNewItem}
                disabled={savingItem}
                className="flex-1 px-4 py-2 bg-success text-white rounded-lg hover:bg-success transition disabled:opacity-50"
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

    // PDF preview modal state
    const [showPreview, setShowPreview] = useState(false);
    const [previewQuote, setPreviewQuote] = useState(null);

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

    // ----- Draft auto-save state -----
    // The form auto-saves to the backend as a draft every 5s so work survives
    // navigation, tab closes, and power loss. The first save creates a draft
    // quotation; subsequent saves update that same draft via PUT.
    const existingQuotationId = (!duplicateMode && initialData)
        ? (initialData.quotationId || initialData.id || initialData._id || initialData.quoteId || null)
        : null;
    const autoSavedQuotationIdRef = useRef(existingQuotationId);
    const lastAutoSaveSnapshotRef = useRef(null);
    const autoSaveInFlightRef = useRef(false);
    const manualSaveInFlightRef = useRef(false);
    const savedManuallyRef = useRef(false);
    const quoteNumbersConsumedRef = useRef(!!existingQuotationId);
    const authTokenRef = useRef(null);
    const performAutoSaveRef = useRef(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle | saving | saved | error
    const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);

    useEffect(() => {
        if (projectId) {
            invoiceFetch(`/api/projects/${projectId}`)
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
                    shippingAddress: customer.shippingAddress || formatAddress(customer.address?.shipping) || '',
                    shippingPhone: customer.shippingPhone || customer.phone || '',
                    shippingEmail: customer.shippingEmail || customer.email || '',
                    shippingGstin: customer.shippingGstin || customer.gstin || ''
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
                // Prefer the human-friendly quote number (CG-...) over the system QT- id
                setCustomQuoteNumber(
                    initialData.customQuoteId || initialData.quoteNumber || initialData.displayQuoteId ||
                    initialData.quotationId || initialData.id
                );
                // Track the persisted quotation id so auto-save updates instead of duplicating
                autoSavedQuotationIdRef.current = initialData.quotationId || initialData.id;
                quoteNumbersConsumedRef.current = true;
            }
            if (!duplicateMode && initialData.referenceNumber) {
                setCustomReferenceNumber(initialData.referenceNumber);
            }
            // For duplicate mode, new numbers will be set by the config loading effects

            // Restore terms & notes so drafts reopen exactly where they left off
            setTermsAndConditions(initialData.termsAndConditions || '');
            if (initialData.customerNotes || initialData.notes) {
                setCustomerNotes(initialData.customerNotes || initialData.notes);
            }
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
            const response = await invoiceFetch(`/api/workspace/customers/${customerId}?vendorId=${vendorId}`, {
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
            
            // Initialize editable customer details with email for Ship To
            setEditableCustomerDetails(prev => ({
                ...prev,
                billingAddress: CAASDI_GLOBAL_CUSTOMER.billingAddress,
                billingPhone: CAASDI_GLOBAL_CUSTOMER.phone || '',
                billingEmail: CAASDI_GLOBAL_CUSTOMER.email || '',
                billingGstin: CAASDI_GLOBAL_CUSTOMER.gstin || '',
                shippingEmail: selectedCustomer.email || '',
                shippingPhone: selectedCustomer.phone || '',
                shippingGstin: selectedCustomer.gstin || ''
            }));
        } else {
            setCustomerDetails(null);
            setIsIntraState(false);
            setAddressLoading(false);
        }
    }, [selectedCustomer?.gstin, selectedCustomer?.address, selectedCustomer?.customerId, selectedCustomer?.email, selectedCustomer?.phone]);

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
            const response = await authFetch(`/api/files/upload`, {
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
    // Build the quotation payload shared by Save as Draft and the PDF preview
    const buildQuotationData = () => {
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
                // Persist ship-to edits so reopening a draft restores them
                shippingAddress: editableCustomerDetails.shippingAddress || '',
                shippingPhone: editableCustomerDetails.shippingPhone || '',
                shippingEmail: editableCustomerDetails.shippingEmail || '',
                shippingGstin: editableCustomerDetails.shippingGstin || '',
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

        return quotationData;
    };

    // Open the PDF preview modal with the current form data
    const handleOpenPreview = () => {
        setMessage(null);
        const quotationData = buildQuotationData();
        // Adapt into the shape StandardPreview expects (same mapping as generateQuotePDF)
        setPreviewQuote({
            ...quotationData,
            subTotal: quotationData.subtotal ?? 0,
            totalCgst: quotationData.cgst ?? 0,
            totalSgst: quotationData.sgst ?? 0,
            totalIgst: quotationData.igst ?? 0,
        });
        setShowPreview(true);
    };

    // True when the form has anything worth persisting as a draft — prevents
    // junk drafts when the form is opened and closed without being touched.
    const formHasMeaningfulContent = () => {
        const hasItemContent = items.some(item =>
            item.selectedItem?.name ||
            (item.description || '').trim() !== '' ||
            parseFloat(item.quantity) > 0 ||
            parseFloat(item.rate) > 0
        );
        return hasItemContent ||
            (termsAndConditions || '').trim() !== '' ||
            (discount || '').toString().trim() !== '' ||
            (tdsValue || '').toString().trim() !== '' ||
            (customerNotes || '').trim() !== 'Looking forward for your business.';
    };

    // Serialized form state used to detect changes since the last auto-save
    const buildAutoSaveSnapshot = () => JSON.stringify({
        items,
        discount,
        tdsType,
        tdsValue,
        quoteDate,
        expiryDate,
        termsAndConditions,
        customerNotes,
        customQuoteNumber,
        customReferenceNumber,
        editableCustomerDetails,
        selectedCustomer,
    });

    // Consume the current quote/reference numbers exactly once per new quote —
    // called on the first successful persist (auto-save or manual save) so an
    // abandoned draft can't collide with the next quote's visible number.
    const consumeQuoteNumbersOnce = () => {
        if (quoteNumbersConsumedRef.current) return;
        quoteNumbersConsumedRef.current = true;
        try {
            // Bump the stored configs without changing the number shown in the
            // form — the displayed number now belongs to this quote.
            if (quoteNumberConfig.autoGenerate) {
                const nextNumber = (parseInt(quoteNumberConfig.nextNumber) + 1).toString();
                const newConfig = { ...quoteNumberConfig, nextNumber };
                localStorage.setItem(`quoteNumberConfig_${currentUser?.vendorId}`, JSON.stringify(newConfig));
                setQuoteNumberConfig(newConfig);
            }
            if (referenceConfig.autoGenerate) {
                const nextNumber = (parseInt(referenceConfig.nextNumber) + 1).toString();
                const newConfig = { ...referenceConfig, nextNumber };
                localStorage.setItem(`referenceNumberConfig_${currentUser?.vendorId}`, JSON.stringify(newConfig));
                setReferenceConfig(newConfig);
            }
        } catch (error) {
            console.error('Error consuming quote/reference numbers:', error);
        }
    };

    // Persist the current form as a draft without blocking the UI or generating
    // a PDF. Called every 5s, on close, and on unmount/page-unload.
    const performAutoSave = async ({ force = false, keepalive = false } = {}) => {
        if (savedManuallyRef.current || autoSaveInFlightRef.current || manualSaveInFlightRef.current || saving) return;
        if (!currentUser?.vendorId || !selectedCustomer) return;

        const draftId = autoSavedQuotationIdRef.current;
        // Never create a brand-new draft for an untouched form
        if (!draftId && !formHasMeaningfulContent()) return;

        const snapshot = buildAutoSaveSnapshot();
        if (!force) {
            if (lastAutoSaveSnapshotRef.current === null && draftId) {
                // First check for an existing quote — treat the freshly hydrated
                // state as the baseline so we don't write identical data.
                lastAutoSaveSnapshotRef.current = snapshot;
                return;
            }
            if (snapshot === lastAutoSaveSnapshotRef.current) return;
        }

        const quotationData = buildQuotationData();
        // Keep the workflow status when editing an existing quote; brand-new
        // quotes and duplicates are always saved as drafts.
        quotationData.status = (draftId && initialData && !duplicateMode && initialData.status)
            ? String(initialData.status).toLowerCase()
            : 'draft';
        // Don't let an update overwrite the original creation timestamp
        delete quotationData.createdAt;

        const url = draftId ? `/api/workspace/quotations/${draftId}` : `/api/workspace/quotations`;
        const method = draftId ? 'PUT' : 'POST';
        const headers = {
            'Content-Type': 'application/json',
            'x-user-info': JSON.stringify({
                vendorId: currentUser.vendorId,
                email: currentUser?.email,
                role: 'vendor',
                name: currentUser?.name
            })
        };
        const body = JSON.stringify(quotationData);

        // During page unload there is no time to resolve a token — reuse the
        // one cached by the last auto-save and fire a keepalive request.
        if (keepalive && authTokenRef.current) {
            try {
                fetch(url, {
                    method,
                    headers: { ...headers, Authorization: `Bearer ${authTokenRef.current}` },
                    body,
                    credentials: 'include',
                    keepalive: true,
                });
            } catch {}
            return;
        }

        autoSaveInFlightRef.current = true;
        setAutoSaveStatus('saving');
        try {
            // Cache the id token so unload-time saves can skip async work
            getIdToken().then(token => { if (token) authTokenRef.current = token; }).catch(() => {});

            const res = await invoiceFetch(url, { method, headers, body });
            if (res.ok) {
                const result = await res.json().catch(() => ({}));
                const newId = result?.data?.quotationId || result?.data?.id;
                if (method === 'POST' && newId) {
                    autoSavedQuotationIdRef.current = newId;
                    consumeQuoteNumbersOnce();
                }
                lastAutoSaveSnapshotRef.current = snapshot;
                setLastAutoSavedAt(new Date());
                setAutoSaveStatus('saved');
            } else {
                setAutoSaveStatus('error');
            }
        } catch (error) {
            console.warn('Quote auto-save failed:', error);
            setAutoSaveStatus('error');
        } finally {
            autoSaveInFlightRef.current = false;
        }
    };
    performAutoSaveRef.current = performAutoSave;

    // Auto-save every 5s, plus a final best-effort save on in-app unmount and
    // on tab close/refresh (keepalive request with the cached token).
    useEffect(() => {
        // Warm the token cache so unload-time saves can skip async token lookup
        getIdToken().then(token => { if (token) authTokenRef.current = token; }).catch(() => {});

        const interval = setInterval(() => {
            performAutoSaveRef.current?.();
        }, AUTO_SAVE_INTERVAL_MS);

        const handleBeforeUnload = () => {
            performAutoSaveRef.current?.({ force: true, keepalive: true });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            performAutoSaveRef.current?.({ force: true, keepalive: true });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Final draft save before leaving via the close button — bounded wait so
    // the quotes list refresh (in onBack) picks up the saved draft.
    const handleCloseWithAutoSave = async () => {
        try {
            await Promise.race([
                performAutoSaveRef.current?.({ force: true }),
                new Promise(resolve => setTimeout(resolve, 3000)),
            ]);
        } catch {}
        onBack();
    };

    // Save quote
    const handleSaveQuote = async () => {
        setMessage(null);
        if (!selectedCustomer) {
            setMessage({ type: 'error', text: 'Please select a customer.' });
            return;
        }
        if (!items.length || !items.some(item => item.selectedItem && item.selectedItem.name)) {
            setMessage({ type: 'error', text: 'Please add at least one item.' });
            return;
        }
        setSaving(true);
        setIsLoading(true);
        // Block auto-save for the duration of the manual save
        manualSaveInFlightRef.current = true;

        const quotationData = buildQuotationData();
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

            // If an auto-save POST is in-flight, wait for it so we update the
            // draft it creates instead of POSTing a duplicate quotation.
            for (let i = 0; i < 40 && autoSaveInFlightRef.current; i++) {
                await new Promise(resolve => setTimeout(resolve, 250));
            }

            // If auto-save already persisted a draft, update it instead of
            // creating a second quotation for the same form.
            const autoDraftId = autoSavedQuotationIdRef.current;
            const isUpdate = isEdit || !!autoDraftId;

            // Debug: Check what ID fields are available
            console.log('Edit mode check:', { isEdit, isUpdate, autoDraftId, initialData, duplicateMode });

            // Try to get the quotation ID from various possible fields
            const quotationId =
                initialData?.id || initialData?.quotationId || initialData?._id || initialData?.quoteId ||
                autoDraftId;
            console.log('Quotation ID for edit:', quotationId);

            if (isUpdate && !quotationId) {
                console.error('Cannot edit quote: No quotation ID found in initialData:', initialData);
                setMessage({ type: 'error', text: 'Cannot update quote: Missing quotation ID' });
                manualSaveInFlightRef.current = false;
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
            
            const url = isUpdate ? `/api/workspace/quotations/${quotationId}` : `/api/workspace/quotations`;
            const method = isUpdate ? 'PUT' : 'POST';
            
            const jsonPayload = JSON.stringify(quotationData);
            console.log('📨 Sending to backend:', {
                url,
                method,
                pdfUrlInPayload: quotationData.pdfUrl,
                payloadSize: jsonPayload.length,
                firstChars: jsonPayload.substring(0, 200)
            });
            
            const res = await invoiceFetch(url, {
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
                
                setMessage({ type: 'success', text: isUpdate ? 'Quotation updated successfully!' : 'Quotation saved successfully!' });
                savedManuallyRef.current = true;

                // Consume the quote/reference numbers for the next quote. No-op
                // when auto-save already consumed them for this draft.
                consumeQuoteNumbersOnce();

                setTimeout(() => onBack(), 2000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                setMessage({ type: 'error', text: isEdit ? `Failed to update quotation: ${errorData.error || 'Unknown error'}` : `Failed to save quotation: ${errorData.error || 'Unknown error'}` });
            }
        } catch (err) {
            setMessage({ type: 'error', text: (!!initialData && !duplicateMode) ? 'Failed to update quotation.' : 'Failed to save quotation.' });
        } finally {
            manualSaveInFlightRef.current = false;
            setSaving(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row bg-surface-hover min-h-screen font-poppins">
            {/* Loading Screen */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface bg-opacity-95 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 mx-auto rounded-2xl shadow-2xl flex items-center justify-center"
                                 style={{ background: 'linear-gradient(135deg, rgb(var(--text-ink)) 0%, rgb(var(--text-ink)) 100%)' }}>
                                <div className="w-16 h-16 bg-surface rounded-xl flex items-center justify-center">
                                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold ">
                                Processing Quote
                            </h2>
                            <p className="text-dim text-lg">
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
                    <div className="flex items-center gap-3">
                        {autoSaveStatus === 'saving' && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Loader2 size={13} className="animate-spin" /> Auto-saving draft…
                            </span>
                        )}
                        {autoSaveStatus === 'saved' && lastAutoSavedAt && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Check size={13} className="text-green-600" />
                                Draft auto-saved at {lastAutoSavedAt.toLocaleTimeString()}
                            </span>
                        )}
                        {autoSaveStatus === 'error' && (
                            <span className="text-xs text-amber-600">Auto-save failed — will retry</span>
                        )}
                         <button onClick={handleCloseWithAutoSave} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full\">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="bg-surface p-8 rounded-lg ">
                    {message && (
                      <div className={`mb-4 p-3 rounded text-center font-medium ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{message.text}</div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="col-span-2 space-y-6">
                             <div>
                                <label className="block mb-2 text-lg font-medium text-ink font-poppins">Customer Name*</label>
                                <CustomerDropdown value={selectedCustomer} onChange={setSelectedCustomer} />
                                
                                {/* Bill To and Ship To Side by Side */}
                                {selectedCustomer && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-0">
                                        {/* Bill To Section */}
                                        <div className="p-4 border rounded-l-lg">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-sm font-semibold text-ink">Bill To</h3>
                                                <span className="text-xs text-dim px-2 py-1 bg-surface-hover rounded">Fixed</span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {/* Billing Address */}
                                                <div>
                                                    <label className="block text-xs font-medium text-dim mb-1">Address</label>
                                                    <div 
                                                        className="text-sm text-ink bg-surface-hover p-3 rounded border border-line min-h-[80px] cursor-not-allowed overflow-auto whitespace-pre-wrap"
                                                        style={{pointerEvents: 'none', userSelect: 'none'}}
                                                    >
                                                        {editableCustomerDetails.billingAddress || CAASDI_GLOBAL_CUSTOMER.billingAddress}
                                                    </div>
                                                </div>

                                                {/* Billing Contact Info */}
                                                <div>
                                                    <label className="block text-xs font-medium text-dim mb-1">Contact Information</label>
                                                    <div className="text-sm text-ink bg-surface-hover p-3 rounded border border-line">
                                                        <div>
                                                            <span className="text-xs font-medium text-dim">Email:</span>
                                                            <div className="text-ink">{editableCustomerDetails.billingEmail || CAASDI_GLOBAL_CUSTOMER.email || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Billing GSTIN */}
                                                <div>
                                                    <label className="block text-xs font-medium text-dim mb-1">GSTIN</label>
                                                    <div 
                                                        className="text-sm text-ink bg-surface-hover p-3 rounded border border-line cursor-not-allowed"
                                                        style={{pointerEvents: 'none', userSelect: 'none'}}
                                                    >
                                                        {editableCustomerDetails.billingGstin || CAASDI_GLOBAL_CUSTOMER.gstin}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vertical Divider */}
                                        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-auto bg-surface-hover" style={{width: '1px', marginTop: '4px', marginBottom: '4px'}}></div>

                                        {/* Ship To Section */}
                                        <div className="p-4  border  rounded-r-lg border-l-0">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-sm font-semibold text-ink">Ship To</h3>
                                                {!editingShipTo ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleEditShipTo}
                                                        className="text-info hover:text-info text-sm flex items-center gap-1"
                                                    >
                                                        <Edit2 size={14} />
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveShipTo}
                                                            className="text-success hover:text-success text-sm flex items-center gap-1"
                                                        >
                                                            <Check size={14} />
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelShipTo}
                                                            className="text-danger hover:text-danger text-sm flex items-center gap-1"
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
                                                    <label className="block text-xs font-medium text-dim mb-1">Address</label>
                                                    {!editingShipTo ? (
                                                        <div className="text-sm text-ink bg-surface p-3 rounded border min-h-[80px] whitespace-pre-wrap overflow-auto">
                                                            {editableCustomerDetails.shippingAddress || 'Enter shipping address...'}
                                                        </div>
                                                    ) : (
                                                        <textarea
                                                            value={editableCustomerDetails.shippingAddress}
                                                            onChange={(e) => setEditableCustomerDetails({
                                                                ...editableCustomerDetails,
                                                                shippingAddress: e.target.value
                                                            })}
                                                            className="w-full text-sm p-3 border border-line rounded resize-none"
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
                                                    <label className="block text-xs font-medium text-dim mb-1">Contact Information</label>
                                                    {!editingShipTo ? (
                                                        <div className="text-sm text-ink bg-surface p-3 rounded border space-y-2">
                                                            <div>
                                                                <span className="text-xs font-medium text-dim">Email:</span>
                                                                <div className="text-ink">{editableCustomerDetails.shippingEmail || 'N/A'}</div>
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
                                                                className="w-full text-sm p-2 border border-line rounded"
                                                                placeholder="Enter email..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Shipping GSTIN */}
                                                <div>
                                                    <label className="block text-xs font-medium text-dim mb-1">GSTIN</label>
                                                    {!editingShipTo ? (
                                                        <div className="text-sm text-ink bg-surface p-3 rounded border">
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
                                                            className="w-full text-sm p-2 border border-line rounded"
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
                                    <label className="block text-sm font-medium text-ink mb-1">Quotation#*</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={customQuoteNumber}
                                            onChange={(e) => handleQuoteNumberChange(e.target.value)}
                                            readOnly={quoteNumberConfig.autoGenerate}
                                            className={`p-2 border border-line rounded-md w-full ${quoteNumberConfig.autoGenerate ? 'bg-canvas' : 'bg-surface'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowQuoteNumberModal(true)}
                                            onMouseEnter={() => setShowTooltip(true)}
                                            onMouseLeave={() => setShowTooltip(false)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 transform  p-1 text-dim hover:text-info transition-colors"
                                        >
                                            <Settings size={16} />
                                            {showTooltip && (
                                                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-cta text-cta-foreground text-sm rounded-lg whitespace-nowrap z-50">
                                                    Click here to enable or disable auto-generation of Quotation numbers.
                                                    <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-ink mb-1">
                                        Reference#*
                                        <span className="ml-2 text-xs text-success bg-success/10 px-2 py-1 rounded">Auto: +1</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={customReferenceNumber}
                                            onChange={(e) => handleReferenceNumberChange(e.target.value)}
                                            readOnly={referenceConfig.autoGenerate}
                                            className={`p-2 border border-line rounded-md w-full pr-10 ${
                                                referenceConfig.autoGenerate ? 'bg-canvas cursor-not-allowed' : ''
                                            }`}
                                            title={referenceConfig.autoGenerate ? "Auto-generated (click settings to change)" : "Manual entry"}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 transform ">
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowReferenceModal(true)}
                                                    onMouseEnter={() => setShowReferenceTooltip(true)}
                                                    onMouseLeave={() => setShowReferenceTooltip(false)}
                                                    className="text-dim hover:text-dim transition-colors"
                                                >
                                                    <Settings size={16} />
                                                </button>
                                                {showReferenceTooltip && (
                                                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-cta-foreground bg-cta rounded whitespace-nowrap z-10">
                                                        Configure reference number
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-dim mt-1">Automatically increments with each new quote (editable)</p>
                                </div>
                            </div>
                            
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-ink mb-1">Quote Date*</label>
                                    <input 
                                        type="date" 
                                        value={quoteDate}
                                        onChange={(e) => handleQuoteDateChange(e.target.value)}
                                        className="p-2 border border-line rounded-md w-full" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-ink mb-1">
                                        Expiry Date
                                        <span className="ml-2 text-xs text-info bg-info/10 px-2 py-1 rounded">Auto: +7 days</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="p-2 border border-line rounded-md w-full" 
                                        title="Automatically set to 1 week from quote date (you can change this)"
                                    />
                                    <p className="text-xs text-dim mt-1">Automatically set to 1 week from quote date (editable)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Table */}
                    <div className="mt-8">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-ink">Item Table</h3>
                        </div>
                        <div className="overflow-x-auto rounded-xl shadow border border-line">
                            <table className="w-full">
                                <thead className="bg-canvas">
                                    <tr>
                                        <th className="p-3 text-left text-xs font-semibold text-dim uppercase">ITEM DETAILS</th>
                                        <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-48">DESCRIPTION</th>
                                        <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-24">QUANTITY</th>
                                        <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-32">RATE</th>
                                        <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-32">AMOUNT</th>
                                        <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-20">HSN</th>
                                        {isIntraState ? (
                                          <>
                                            <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-24">CGST (%)</th>
                                            <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-24">SGST (%)</th>
                                          </>
                                        ) : (
                                          <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-24">IGST (%)</th>
                                        )}
                                        <th className="p-3 text-left text-xs font-semibold text-dim uppercase w-32">TOTAL</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-surface' : 'bg-canvas'}>
                                            <td className="p-2 border-t">
                                                <div 
                                                    className="p-2 border border-line rounded w-full cursor-pointer hover:bg-info/10 hover:border-info/30 transition-colors flex items-center justify-between"
                                                    onClick={() => handleOpenItemModal(index)}
                                                >
                                                    <span className={item.selectedItem?.name ? 'text-ink' : 'text-dim'}>
                                                        {item.selectedItem?.name || 'Click to select item...'}
                                                    </span>
                                                    <Search size={16} className="text-dim" />
                                                </div>
                                            </td>
                                            <td className="p-2 border-t">
                                                <input
                                                    type="text"
                                                    value={item.description || ''}
                                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                    className="p-2 border border-line rounded w-full focus:ring-2 focus:ring-info/20"
                                                    placeholder="Add description..."
                                                />
                                            </td>
                                            <td className="p-2 border-t">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.quantity === 0 || item.quantity === '' ? '' : item.quantity}
                                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="p-2 border border-line rounded w-full text-right focus:ring-2 focus:ring-info/20"
                                                />
                                            </td>
                                            <td className="p-2 border-t">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.rate === 0 || item.rate === '' ? '' : item.rate}
                                                    onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                                    className="p-2 border border-line rounded w-full text-right focus:ring-2 focus:ring-info/20"
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
                                                    className="p-2 border border-line rounded w-full text-center focus:ring-2 focus:ring-info/20"
                                                />
                                            </td>
                                            {isIntraState ? (
                                              <>
                                                <td className="p-2 border-t">
                                                  <input type="number" value={item.cgstRate} onChange={e => handleItemChange(index, 'cgstRate', e.target.value)} className="p-2 border rounded w-full text-right" />
                                                  <div className="text-xs text-dim text-right">Amt: {item.cgstAmount.toFixed(2)}</div>
                                                </td>
                                                <td className="p-2 border-t">
                                                  <input type="number" value={item.sgstRate} onChange={e => handleItemChange(index, 'sgstRate', e.target.value)} className="p-2 border rounded w-full text-right" />
                                                  <div className="text-xs text-dim text-right">Amt: {item.sgstAmount.toFixed(2)}</div>
                                                </td>
                                              </>
                                            ) : (
                                              <td className="p-2 border-t">
                                                <input type="number" value={item.igstRate} onChange={e => handleItemChange(index, 'igstRate', e.target.value)} className="p-2 border rounded w-full text-right" />
                                                <div className="text-xs text-dim text-right">Amt: {item.igstAmount.toFixed(2)}</div>
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
                                                    className="text-dim hover:text-danger transition"
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
                            <button onClick={handleAddItem} className="flex items-center text-sm font-semibold text-info hover:text-info">
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
                                              className="w-20 p-2 border border-line rounded-md text-right focus:ring-2 focus:ring-info/20"
                                            />
                                            <span className="text-dim">%</span>
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
                                 <button onClick={() => setShowTotalSummary(!showTotalSummary)} className="text-sm text-info font-semibold flex items-center">
                                     {showTotalSummary ? 'Hide Total Summary' : 'Show Total Summary'}
                                    <ChevronDown size={16} className={`ml-1 transform transition-transform ${showTotalSummary ? 'rotate-180' : ''}`} />
                                </button>
                             </div>
                        </div>
                    </div>

                     <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                         <div>
                            <label className="block text-sm font-medium text-ink mb-1">Customer Notes</label>
                            <textarea 
                                rows="3" 
                                value={customerNotes}
                                onChange={(e) => setCustomerNotes(e.target.value)}
                                className="p-2 border border-line rounded-md w-full"
                            />
                         </div>
                          <div>
                                <label className="block text-sm font-medium text-ink mb-1">Terms & Conditions</label>
                                <textarea 
                                    rows="3" 
                                    value={termsAndConditions}
                                    onChange={(e) => setTermsAndConditions(e.target.value)}
                                    placeholder="Enter the terms and conditions of your business to be displayed in your transaction" 
                                    className="p-2 border border-line rounded-md w-full"
                                />
                            </div>
                     </div>
                </div>

                <footer className="mt-8 flex justify-between items-center">
                    <div className="mt-8 flex justify-end space-x-4">
                        <button
                            onClick={handleOpenPreview}
                            className="flex items-center gap-2 font-semibold py-2 px-6 rounded-lg border border-line text-ink hover:bg-canvas transition"
                        >
                            <Eye size={16} /> Preview
                        </button>
                        <button
                            onClick={handleSaveQuote}
                            className="text-white font-semibold py-2 px-6 rounded-lg  transition"
                            style={{ background: 'linear-gradient(120deg, rgb(var(--text-ink)) 0%, rgb(var(--text-ink)) 100%)' }}
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

            {/* Quote PDF Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black bg-opacity-50 animate-fadeIn">
                    <div className="flex items-center justify-between px-6 py-3 bg-surface ">
                        <div>
                            <h2 className="text-lg font-bold text-ink">Quotation Preview</h2>
                            <p className="text-xs text-dim">This is how the quotation PDF will look.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="font-semibold py-2 px-5 rounded-lg border border-line text-ink hover:bg-canvas transition"
                            >
                                Back to Edit
                            </button>
                            <button
                                onClick={() => { setShowPreview(false); handleSaveQuote(); }}
                                className="flex items-center gap-2 text-white font-semibold py-2 px-6 rounded-lg  transition"
                                style={{ background: 'linear-gradient(120deg, rgb(var(--text-ink)) 0%, rgb(var(--text-ink)) 100%)' }}
                                disabled={saving}
                            >
                                <Save size={16} /> Save as Draft
                            </button>
                            <button onClick={() => setShowPreview(false)} className="p-2 text-dim hover:bg-surface-hover rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-surface-hover px-4">
                        <StandardPreview
                            quote={previewQuote}
                            company={{
                                logo: null,
                                name: currentUser?.companyName || currentUser?.name || 'Your Company',
                                address: currentUser?.address || '',
                                gstin: currentUser?.gstin || '',
                                email: currentUser?.email || '',
                                country: 'India'
                            }}
                            terms={previewQuote?.termsAndConditions}
                            notes={previewQuote?.notes || customerNotes}
                            docType="quote"
                        />
                    </div>
                </div>
            )}
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
