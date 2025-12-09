import React, { useState, useEffect } from 'react';
import { Search, Info, Trash2, Plus, Upload, X, ChevronDown, Edit, Loader2, Edit2, PlusCircle, Save, Settings } from 'lucide-react';
import SimplifiedViewToggle from '../../SimplifiedViewToggle';
import CustomerDetailsPanel from '../../CustomerDetailsPanel';
import ItemDropdown from '../../ItemDropdown';
import ItemSelectionModal from '../../ItemSelectionModal';
import PricingRecommendations from '../../pricing/PricingRecommendations';
import AIBrainIcon from '../../icons/AIBrainIcon';
import AddItemsInBulkModal from '../../AddItemsInBulkModal';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { convertMeasurementToFeet, needsConversion } from '../../../utils/unitConverter';
import { calculateRatePerSqft, calculateTotalRate, checkRateConsistency, determineCalculationTarget, formatCurrency } from '../../../utils/rateCalculator';

const CustomerSearchModal = ({ open, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  React.useEffect(() => {
    if (open && !fetched) {
      setLoading(true);
      fetch('/api/customers')
        .then((res) => res.json())
        .then((data) => {
          setCustomers(data);
          setFetched(true);
        })
        .finally(() => setLoading(false));
    }
  }, [open, fetched]);

  const filtered = customers.filter((c) =>
    (c.displayName || c.companyName || '').toLowerCase().includes(search.toLowerCase())
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
                {customer.displayName || customer.companyName}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const CustomerDropdown = ({ value, onChange }) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      setCustomers([]);
    }
    setLoading(false);
  };

  const handleDropdownClick = () => {
    setOpen(!open);
    if (!open && customers.length === 0) {
      fetchCustomers();
    }
  };

  return (
    <div className="relative w-full font-poppins">
      <div
        className="border-2 border-cg rounded-lg px-6 py-4 flex items-center cursor-pointer text-lg bg-white"
        onClick={handleDropdownClick}
      >
        {value ? value.displayName || value.companyName : 'Select or add a customer'}
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="p-1 rounded hover:bg-blue-50 text-blue-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setShowSearchModal(true);
            }}
          >
            <Search size={16} />
          </button>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : !Array.isArray(customers) || customers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No customers found</div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.customerId}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => {
                  onChange(customer);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{customer.displayName || customer.companyName}</div>
                <div className="text-sm text-gray-500">{customer.email}</div>
              </div>
            ))
          )}
        </div>
      )}
      <CustomerSearchModal open={showSearchModal} onClose={() => setShowSearchModal(false)} onSelect={onChange} />
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

const NewQuote = ({ onBack, projectId, initialData, duplicateMode = false }) => {
    const { token } = useAuth();
    // 1. Add new state variables for GST
    const [isIntraState, setIsIntraState] = useState(false); // Default to inter-state

    // 1. Update items state to store percentages
    const [items, setItems] = useState([
        { selectedItem: null, description: '', quantity: '', rate: '', amount: 0, hsn: '', cgstRate: '', sgstRate: '', igstRate: '', cgstAmount: 0, sgstAmount: 0, igstAmount: 0, ratePerSqft: '', measurements: '' },
    ]);
    const [showTotalSummary, setShowTotalSummary] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerDetails, setCustomerDetails] = useState(null);
    const [addressLoading, setAddressLoading] = useState(false);
    const [addressEditMode, setAddressEditMode] = useState(null); // 'billing' | 'shipping' | null
    const [addressForm, setAddressForm] = useState({
        billing: { street1: '', street2: '', city: '', state: '', country: '', pinCode: '', phone: '', fax: '' },
        shipping: { street1: '', street2: '', city: '', state: '', country: '', pinCode: '', phone: '', fax: '' },
    });
    const [addressSaving, setAddressSaving] = useState(false);
    const [addressMessage, setAddressMessage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [discount, setDiscount] = useState('');
    const [tdsType, setTdsType] = useState(''); // 'tds' or 'tcs' or empty
    const [tdsValue, setTdsValue] = useState('');
    const [projectName, setProjectName] = useState('');
    const [showCustomerDetailsPanel, setShowCustomerDetailsPanel] = useState(false);
    const [gstinForm, setGstinForm] = useState('');
    const [gstinSaving, setGstinSaving] = useState(false);
    const [gstinMessage, setGstinMessage] = useState(null);
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPricingRecommendations, setShowPricingRecommendations] = useState(false);

    // Additional columns state - removed global toggles since we'll show these fields per item

    // Quote number configuration state
    const [showQuoteNumberModal, setShowQuoteNumberModal] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [quoteNumberConfig, setQuoteNumberConfig] = useState({
        autoGenerate: true,
        prefix: 'QT-',
        nextNumber: '00001'
    });
    const [customQuoteNumber, setCustomQuoteNumber] = useState('QT-00001');

    // Date state
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [expiryDate, setExpiryDate] = useState('');

    // Terms and notes state
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [customerNotes, setCustomerNotes] = useState('Looking forward for your business.');

    // Bulk items modal state
    const [showBulkItemsModal, setShowBulkItemsModal] = useState(false);
    const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState(null);

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
            // Populate form with existing quote data
            setSelectedCustomer(initialData.customerDetails || initialData.selectedCustomer);
            setItems(initialData.items || [
                { selectedItem: null, description: '', quantity: '', rate: '', amount: 0, hsn: '', cgstRate: '', sgstRate: '', igstRate: '', cgstAmount: 0, sgstAmount: 0, igstAmount: 0 },
            ]);
            setDiscount(initialData.discount?.value?.toString() || '');
            setTdsType(initialData.tdsType || '');
            setTdsValue(initialData.tdsValue?.toString() || '');
            setProjectName(initialData.projectName || '');
            
            // For edit mode, keep existing number. For duplicate, we will generate later
            if (!duplicateMode && initialData.quotationId) {
                setCustomQuoteNumber(initialData.quotationId);
            }
        }
    }, [initialData, duplicateMode]);

    // 3. In the useEffect that fetches customerDetails, determine if it's intra-state
    useEffect(() => {
        if (selectedCustomer && selectedCustomer.customerId) {
            setAddressLoading(true);
            const customerId = selectedCustomer.customerId;
            fetch(`/api/customers/${customerId}`)
                .then(res => {
                    if (!res.ok) {
                        console.error('Failed to fetch customer details:', res.status, res.statusText);
                    }
                    return res.json();
                })
                .then(data => {
                    setCustomerDetails(data);
                    // SET INTRA-STATE LOGIC
                    if (data.gstin && data.gstin.startsWith('29')) {
                        setIsIntraState(true);
                    } else {
                        setIsIntraState(false);
                    }
                    setAddressForm({
                        billing: { ...((data.address && data.address.billing) || addressForm.billing) },
                        shipping: { ...((data.address && data.address.shipping) || addressForm.shipping) },
                    });
                    setGstinForm(data.gstin || '');
                })
                .catch(err => console.error('Error fetching customer details:', err))
                .finally(() => setAddressLoading(false));
        } else {
            setCustomerDetails(null);
            setIsIntraState(false); // Reset on customer clear
        }
    }, [selectedCustomer]);

    // 4. Update calculation logic to include GST
    // const calculateTotals = (currentItems, currentGlobalGst) => {
    //     return currentItems.map(item => {
    //         const quantity = Number(item.quantity) || 0;
    //         const rate = Number(item.rate) || 0;
    //         const baseAmount = quantity * rate;
    //         const gstRate = Number(item.gstRate) || Number(currentGlobalGst) || 0;
            
    //         let cgst = 0, sgst = 0, igst = 0;
            
    //         if (isIntraState) {
    //             cgst = baseAmount * (gstRate / 2 / 100);
    //             sgst = baseAmount * (gstRate / 2 / 100);
    //         } else {
    //             igst = baseAmount * (gstRate / 100);
    //         }
            
    //         return {
    //             ...item,
    //             amount: baseAmount, // Base amount before tax
    //             cgst: cgst,
    //             sgst: sgst,
    //             igst: igst,
    //         };
    //     });
    // };

    // Re-calculate all items when global GST or state locality changes
    // useEffect(() => {
    //     setItems(prevItems => calculateTotals(prevItems, globalGstRate));
    // }, [globalGstRate, isIntraState]);

    // 2. Update the calculation logic to use percentages
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

    // Handle measurements with optional conversion to feet
    const handleConvertToFeet = (index) => {
        const currentMeasurement = items[index].measurements;
        if (currentMeasurement && needsConversion(currentMeasurement)) {
            const convertedValue = convertMeasurementToFeet(currentMeasurement);
            handleItemChange(index, 'measurements', convertedValue);
        }
    };

    // Handle price recommendation selection
    const handlePriceRecommendationSelect = (recommendedAmount) => {
        // Update the total amount based on the recommendation
        // This is a simplified approach - proportionally adjust individual item rates
        const currentTotal = grandTotal;
        if (currentTotal > 0) {
            const adjustmentFactor = recommendedAmount / currentTotal;
            
            // Adjust all item rates proportionally
            const updatedItems = items.map(item => {
                if (item.rate && parseFloat(item.rate) > 0) {
                    const newRate = parseFloat(item.rate) * adjustmentFactor;
                    const newAmount = parseFloat(item.quantity || 0) * newRate;
                    return {
                        ...item,
                        rate: newRate.toFixed(2),
                        amount: newAmount
                    };
                }
                return item;
            });
            
            setItems(updatedItems);
        }
    };

    // Handle Rate/Sqft calculations
    const handleRateCalculation = (index, field, value) => {
        // First update the field normally
        handleItemChange(index, field, value);
        
        // Then perform rate calculations
        setItems(prevItems => {
            const updatedItems = [...prevItems];
            const item = updatedItems[index];
            
            // Get current values (including the new value we just set)
            const currentRate = field === 'rate' ? value : item.rate;
            const currentRatePerSqft = field === 'ratePerSqft' ? value : item.ratePerSqft;
            const currentMeasurements = field === 'measurements' ? value : item.measurements;
            
            // Determine what to calculate
            const target = determineCalculationTarget(currentRate, currentRatePerSqft, currentMeasurements, field);
            
            if (target === 'ratePerSqft') {
                // Calculate rate per sqft from total rate and measurements
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
                // Calculate total rate from rate per sqft and measurements
                const result = calculateTotalRate(currentRatePerSqft, currentMeasurements);
                if (result) {
                    updatedItems[index] = {
                        ...item,
                        rate: formatCurrency(result.totalRate, 2),
                        _calculatedField: 'rate',
                        _calculation: result.calculation
                    };
                    
                    // Recalculate amount since rate changed
                    const quantity = Number(item.quantity) || 0;
                    const newRate = result.totalRate;
                    updatedItems[index].amount = quantity * newRate;
                }
            } else if (target === 'check') {
                // Check consistency
                const consistency = checkRateConsistency(currentRate, currentRatePerSqft, currentMeasurements);
                updatedItems[index] = {
                    ...item,
                    _calculatedField: null,
                    _calculation: consistency.message,
                    _isConsistent: consistency.isConsistent
                };
            } else {
                // Clear calculation indicators
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

    // 6. Update handleAddItem to include GST fields
    const handleAddItem = () => {
        const newItems = [
            ...items,
            { selectedItem: null, description: '', quantity: '', rate: '', amount: 0, hsn: '', cgstRate: '', sgstRate: '', igstRate: '', cgstAmount: 0, sgstAmount: 0, igstAmount: 0, ratePerSqft: '', measurements: '' }
        ];
        setItems(newItems);
    };

    // Handle adding items in bulk
    const handleAddBulkItems = (bulkItems) => {
        // Add the bulk items to the existing items array
        // Check for duplicates and merge quantities if same item exists
        setItems(prevItems => {
            const newItems = [...prevItems];
            
            bulkItems.forEach(bulkItem => {
                const existingIndex = newItems.findIndex(item => 
                    item.selectedItem?.id === bulkItem.selectedItem?.id
                );
                
                if (existingIndex >= 0) {
                    // Item already exists, update quantity
                    const existingItem = newItems[existingIndex];
                    const newQuantity = (parseInt(existingItem.quantity) || 0) + (parseInt(bulkItem.quantity) || 0);
                    newItems[existingIndex] = {
                        ...existingItem,
                        quantity: newQuantity.toString(),
                        amount: (parseFloat(existingItem.rate) || 0) * newQuantity
                    };
                } else {
                    // New item, add it
                    newItems.push(bulkItem);
                }
            });
            
            return newItems;
        });
    };

    // 3. Update the total summary calculations
    const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
    const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
    const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0);
    const totalTax = totalCgst + totalSgst + totalIgst;
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0); // MOVED
    const discountValue = subtotal * (parseFloat(discount) || 0) / 100;
    const tdsAmount = subtotal * (parseFloat(tdsValue) || 0) / 100;
    const grandTotal = subtotal + totalTax - discountValue - tdsAmount;

    // Address form handlers
    const handleAddressInput = (type, e) => {
        const { name, value } = e.target;
        setAddressForm(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [name]: value,
            },
        }));
    };
    const handleAddressSave = async (type) => {
        setAddressSaving(true);
        setAddressMessage(null);
        try {
            // Preserve both billing and shipping addresses when updating one
            const currentAddress = customerDetails?.address || {};
            const updatedAddress = {
                ...currentAddress,
                [type]: addressForm[type],
            };
            
            const res = await fetch(`/api/customers/${selectedCustomer.customerId}/address`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedAddress),
            });
            if (res.ok) {
                setAddressMessage({ type: 'success', text: 'Address saved!' });
                // Refresh customer details
                const fresh = await fetch(`/api/customers/${selectedCustomer.customerId}`).then(r => r.json());
                setCustomerDetails(fresh);
                // Update selectedCustomer with fresh data so quotation uses updated address
                setSelectedCustomer(fresh);
                setAddressEditMode(null);
            } else {
                setAddressMessage({ type: 'error', text: 'Failed to save address.' });
            }
        } catch (e) {
            setAddressMessage({ type: 'error', text: 'Failed to save address.' });
        } finally {
            setAddressSaving(false);
        }
    };

    const handleGstinSave = async () => {
        if (!gstinForm.trim()) {
            setGstinMessage({ type: 'error', text: 'GSTIN cannot be empty.' });
            return;
        }
        setGstinSaving(true);
        try {
            const res = await fetch(`/api/customers/${selectedCustomer.customerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gstin: gstinForm }),
            });
            if (res.ok) {
                setGstinMessage({ type: 'success', text: 'GSTIN updated successfully!' });
                setAddressEditMode(null);
                // Refresh customer details and update selectedCustomer
                const fresh = await fetch(`/api/customers/${selectedCustomer.customerId}`).then(r => r.json());
                setCustomerDetails(fresh);
                setSelectedCustomer(fresh);
            } else {
                setGstinMessage({ type: 'error', text: 'Failed to update GSTIN.' });
            }
        } catch (err) {
            setGstinMessage({ type: 'error', text: 'Failed to update GSTIN.' });
        } finally {
            setGstinSaving(false);
        }
    };

    // Handle TDS/TCS type change
    const handleTdsTypeChange = (type) => {
        setTdsType(type);
        setTdsValue(''); // Reset value when type changes
    };

    // Quote number configuration handlers
    const handleQuoteNumberConfigSave = async (newConfig) => {
        try {
            console.log('Saving new config:', newConfig);
            const response = await fetch('/api/quotations/config/quote-number', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
            
            if (response.ok) {
                console.log('Config saved successfully');
                setQuoteNumberConfig(newConfig);
                // Immediately update the quote number field with new configuration
                if (newConfig.autoGenerate) {
                    const newQuoteNumber = `${newConfig.prefix}${newConfig.nextNumber}`;
                    console.log('Setting new quote number:', newQuoteNumber);
                    setCustomQuoteNumber(newQuoteNumber);
                }
                // Small delay to ensure state update is visible
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.error('Failed to save quote number config');
            }
        } catch (error) {
            console.error('Error saving quote number config:', error);
        }
    };

    const handleQuoteNumberChange = (value) => {
        setCustomQuoteNumber(value);
    };

    // Load quote number configuration from backend
    useEffect(() => {
        const loadQuoteNumberConfig = async () => {
            try {
                const response = await fetch('/api/quotations/config/quote-number');
                if (response.ok) {
                    const config = await response.json();
                    setQuoteNumberConfig(config);
                    // In duplicate mode, always prepare a fresh number
                    if (config.autoGenerate) {
                        setCustomQuoteNumber(`${config.prefix}${config.nextNumber}`);
                    }
                }
            } catch (error) {
                console.error('Error loading quote number config:', error);
            }
        };
        
        loadQuoteNumberConfig();
    }, []);

    // Function to increment quote number
    const incrementQuoteNumber = async () => {
        if (quoteNumberConfig.autoGenerate) {
            try {
                const response = await fetch('/api/quotations/generate-next-number', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                
                if (response.ok) {
                    const { nextNumber } = await response.json();
                    setCustomQuoteNumber(nextNumber);
                    
                    // Update local config with new number
                    const newConfig = {
                        ...quoteNumberConfig,
                        nextNumber: nextNumber.replace(quoteNumberConfig.prefix, '')
                    };
                    setQuoteNumberConfig(newConfig);
                }
            } catch (error) {
                console.error('Error generating next quote number:', error);
            }
        }
    };

    // Function to generate and upload PDF to S3
    const generateAndUploadPDF = async (quotationData) => {
        try {
            // Create a temporary div to render the quote preview
            const tempDiv = document.createElement('div');
            tempDiv.id = 'temp-quote-preview';
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '-9999px';
            tempDiv.style.width = '800px';
            tempDiv.style.backgroundColor = 'white';
            tempDiv.style.padding = '20px';
            document.body.appendChild(tempDiv);

            // Use the same template structure as QuotePDFPanel
            tempDiv.innerHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 100%; position: relative;">
                    <!-- Draft Ribbon -->
                    <div style="position: absolute; top: -10px; left: -10px; z-index: 10; transform: rotate(-45deg); background: rgba(100, 100, 100, 0.8); color: white; font-weight: bold; font-size: 14px; width: 120px; text-align: center; padding: 4px 0; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
                        Draft
                    </div>
                    
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 60px; height: 60px; background: #0d6b5c; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 8px;">
                                CG
                            </div>
                            <div>
                                <h1 style="margin: 0; color: #333; font-size: 28px; font-weight: bold;">Caasdi Ventures</h1>
                                <p style="margin: 5px 0; color: #666; font-size: 12px;">252, 2nd floor, BSK 1st Stage, BLR, KAR, 50</p>
                                <p style="margin: 5px 0; color: #666; font-size: 12px;">GSTIN: 29ABCDENJ1322</p>
                                <p style="margin: 5px 0; color: #666; font-size: 12px;">corporate@caasdiglobal.in</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <h1 style="margin: 0; color: #333; font-size: 36px; font-weight: bold;">QUOTE</h1>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">#: ${quotationData.quotationId}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">Date: ${quotationData.quoteDate}</p>
                        </div>
                    </div>

                    <!-- Bill To / Ship To -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                        <div style="width: 48%;">
                            <div style="background: #f0f0f0; padding: 8px 12px; margin-bottom: 10px; font-weight: bold; font-size: 14px;">Bill To</div>
                            <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">${quotationData.customerName}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">${quotationData.customerDetails?.address?.billing?.street1 || ''}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">${quotationData.customerDetails?.address?.billing?.city || ''}, ${quotationData.customerDetails?.address?.billing?.state || ''}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">${quotationData.customerDetails?.address?.billing?.country || ''} - ${quotationData.customerDetails?.address?.billing?.pinCode || ''}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">GSTIN: ${quotationData.customerDetails?.gstin || ''}</p>
                        </div>
                        <div style="width: 48%;">
                            <div style="background: #f0f0f0; padding: 8px 12px; margin-bottom: 10px; font-weight: bold; font-size: 14px;">Ship To</div>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">${quotationData.customerDetails?.address?.shipping?.street1 || ''}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">${quotationData.customerDetails?.address?.shipping?.city || ''}, ${quotationData.customerDetails?.address?.shipping?.state || ''}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">${quotationData.customerDetails?.address?.shipping?.country || ''} - ${quotationData.customerDetails?.address?.shipping?.pinCode || ''}</p>
                            <p style="margin: 5px 0; color: #666; font-size: 12px;">GSTIN: ${quotationData.customerDetails?.gstin || ''}</p>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #ddd;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold; font-size: 12px;">#</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold; font-size: 12px;">Item & Description</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold; font-size: 12px;">HSN/SAC</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">Qty</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">Rate</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">CGST</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">SGST</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${quotationData.items.map((item, index) => `
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 12px;">${index + 1}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; font-size: 12px;">
                                        ${item.selectedItem?.name ? `<div style="font-weight: bold; margin-bottom: 4px;">${item.selectedItem.name}</div>` : ''}
                                        ${item.description ? `<div style="font-size: 11px; color: #666;">${item.description}</div>` : ''}
                                    </td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 12px;">${item.hsn || ''}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-size: 12px;">${item.quantity || ''}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-size: 12px;">₹${item.rate || ''}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-size: 12px;">${item.cgst || ''}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-size: 12px;">${item.sgst || ''}</td>
                                    <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-size: 12px;">₹${item.amount || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Totals -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                        <div style="width: 50%;">
                            <div style="margin-bottom: 20px;">
                                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px; font-weight: bold;">Notes:</h4>
                                <p style="margin: 0; color: #666; font-style: italic; font-size: 12px;">${quotationData.customerNotes || ''}</p>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px; font-weight: bold;">Terms & Conditions:</h4>
                                <div style="color: #666; font-size: 10px; line-height: 1.4;">
                                    ${quotationData.termsAndConditions || ''}
                                </div>
                            </div>
                        </div>
                        <div style="width: 40%;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                                <span style="font-weight: bold;">Sub Total:</span>
                                <span>₹${quotationData.subTotal || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                                <span style="font-weight: bold;">CGST:</span>
                                <span>₹${quotationData.totalCgst || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
                                <span style="font-weight: bold;">SGST:</span>
                                <span>₹${quotationData.totalSgst || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 16px;">
                                <span style="font-weight: bold;">Total:</span>
                                <span style="font-weight: bold;">₹${quotationData.totalAmount || 0}</span>
                            </div>
                            <div style="margin-top: 20px; font-size: 12px; color: #666;">
                                <strong>Total In Words:</strong> Indian Rupees ${quotationData.totalAmount ? (quotationData.totalAmount).toLocaleString('en-IN') : 'Zero'} Only
                            </div>
                        </div>
                    </div>

                    <!-- Signature -->
                    <div style="text-align: right; margin-top: 40px;">
                        <p style="margin: 0; font-weight: bold; font-size: 14px;">Authorized Signature</p>
                        <p style="margin: 0; font-weight: bold; font-size: 16px; margin-top: 8px;">Sankeerth KM</p>
                        <div style="margin-top: 32px;">
                            <div style="border-top: 1px solid #666; width: 128px; margin-left: auto; margin-bottom: 8px;"></div>
                            <p style="margin: 0; font-size: 12px; color: #666;">Vendor/Client Signature</p>
                        </div>
                    </div>
                </div>
            `;

            // Use the same html2pdf configuration as the working PDF button
            const pdfBlob = await html2pdf()
                .set({
                    margin: 0,
                    filename: `${quotationData.quotationId}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                })
                .from(tempDiv)
                .outputPdf('blob');

            // Clean up temporary div
            document.body.removeChild(tempDiv);

            // Upload to S3
            const filename = `quote-${quotationData.quotationId}.pdf`;
            const presignRes = await fetch(`/api/s3/presign?filename=${filename}&filetype=application/pdf`);
            
            if (!presignRes.ok) {
                throw new Error('Failed to get pre-signed URL');
            }
            
            const { uploadUrl, fileUrl } = await presignRes.json();

            // Upload PDF to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/pdf',
                },
                body: pdfBlob,
            });

            // Update quote with PDF URL
            await fetch(`/api/quotations/${quotationData.quotationId}/pdfUrl`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pdfUrl: fileUrl }),
            });

            console.log('PDF uploaded to S3:', fileUrl);
            return fileUrl;
        } catch (error) {
            console.error('Error generating and uploading PDF:', error);
            return null;
        }
    };

    const handleItemSelect = (index, selectedItem) => {
        setItems(items =>
            items.map((item, i) => {
                if (i !== index) return item;
                const quantity = item.quantity === '' ? 0 : Number(item.quantity);
                const rate = selectedItem.price || 0;
                return {
                    ...item,
                    selectedItem: selectedItem,
                    description: selectedItem.description || selectedItem.name,
                    rate: rate,
                    hsn: selectedItem.hsn || '',
                    amount: quantity * rate,
                };
            })
        );
    };

    const handleOpenItemModal = (index) => {
        setCurrentItemIndex(index);
        setShowItemSelectionModal(true);
    };

    const handleModalItemSelect = (selectedItem) => {
        if (currentItemIndex !== null) {
            handleItemSelect(currentItemIndex, selectedItem);
        }
    };

    const handleSaveQuote = async () => {
        setMessage(null);
        // Validation
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
        // Calculate totalAmount
        const quotationData = {
            quotationId: customQuoteNumber, // Use custom quote number as primary key
            customerId: selectedCustomer.customerId,
            customerName: selectedCustomer.displayName || selectedCustomer.companyName,
            customerDetails: selectedCustomer,
            items: items.map(item => ({
                ...item,
                itemId: item.selectedItem?.id,
                itemName: item.selectedItem?.name,
                hsn: item.hsn,
            })),
            totalAmount: grandTotal, // Use grandTotal for the final total
            status: 'draft',
            createdAt: new Date().toISOString(),
            quoteDate: quoteDate,
            expiryDate: expiryDate,
            projectId,
            projectName,
            subTotal: subtotal,
            totalCgst,
            totalSgst,
            totalIgst,
            totalTax,
            discount: {
                type: 'percentage', // Assuming percentage, might need to be dynamic
                value: parseFloat(discount) || 0,
            },
            tdsType: tdsType,
            tdsValue: parseFloat(tdsValue) || 0,
            customerNotes: customerNotes,
            termsAndConditions: termsAndConditions,
        };
        try {
            const isEdit = !!initialData && !duplicateMode;
            const url = isEdit ? `/api/quotations/${initialData.quotationId}` : '/api/quotations';
            const method = isEdit ? 'PUT' : 'POST';
            
            console.log('Sending quotation data:', { url, method, quotationData, initialData });
            
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quotationData),
            });
            if (res.ok) {
                const saved = await res.json();
                setMessage({ type: 'success', text: isEdit ? 'Quotation updated successfully!' : 'Quotation saved successfully!' });
                
                // If this was an update and the quotationId changed, we need to handle it
                if (isEdit && saved.quotationId !== initialData.quotationId) {
                    console.log(`Quotation ID changed from ${initialData.quotationId} to ${saved.quotationId}`);
                }
                
                // Increment quote number for next quote
                incrementQuoteNumber();
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

    const handleSaveAndSend = async () => {
        setMessage(null);
        // Validation (reuse from handleSaveQuote)
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
        // Prepare quotation data
        const quotationData = {
            quotationId: customQuoteNumber, // Use custom quote number as primary key
            customerId: selectedCustomer.customerId,
            customerName: selectedCustomer.displayName || selectedCustomer.companyName,
            customerDetails: selectedCustomer,
            items: items.map(item => ({
                ...item,
                itemId: item.selectedItem?.id,
                itemName: item.selectedItem?.name,
                hsn: item.hsn,
            })),
            totalAmount: grandTotal,
            status: 'draft',
            createdAt: new Date().toISOString(),
            quoteDate: quoteDate,
            expiryDate: expiryDate,
            projectId,
            projectName,
            subTotal: subtotal,
            totalCgst,
            totalSgst,
            totalIgst,
            totalTax,
            discount: {
                type: 'percentage',
                value: parseFloat(discount) || 0,
            },
            tdsType: tdsType,
            tdsValue: parseFloat(tdsValue) || 0,
            customerNotes: customerNotes,
            termsAndConditions: termsAndConditions,
        };
        try {
            const isEdit = !!initialData && !duplicateMode;
            const url = isEdit ? `/api/quotations/${initialData.quotationId}` : '/api/quotations';
            const method = isEdit ? 'PUT' : 'POST';
            
            console.log('Sending quotation data (save and send):', { url, method, quotationData, initialData });
            
            // 1. Create or update the quotation
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotationData),
            });
            if (res.ok) {
                const saved = await res.json();
                // Use the saved quotationId (which might be different if it was changed during update)
                const quotationId = saved.quotationId;
                
                // 2. Update status to 'Sent to PM for review'
                const patchRes = await fetch(`/api/quotations/${quotationId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Sent to PM for review' }),
                });
                if (patchRes.ok) {
                    setMessage({ type: 'success', text: isEdit ? 'Quotation updated and sent to PM for review!' : 'Quotation sent to PM for review!' });
                    // Increment quote number for next quote
                    incrementQuoteNumber();
                    setTimeout(() => onBack(), 2000);
                } else {
                    setMessage({ type: 'error', text: isEdit ? 'Quotation updated, but failed to update status.' : 'Quotation saved, but failed to update status.' });
                }
            } else {
                setMessage({ type: 'error', text: (!!initialData && !duplicateMode) ? 'Failed to update quotation.' : 'Failed to save quotation.' });
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
                        {/* Animated Logo */}
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
                            
                            {/* Animated Rings */}
                            <div className="absolute inset-0 -m-4">
                                <div className="w-32 h-32 border-4 border-[#0d6b5c] border-opacity-20 rounded-full animate-ping"></div>
                            </div>
                            <div className="absolute inset-0 -m-2">
                                <div className="w-28 h-28 border-4 border-black border-opacity-20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                            </div>
                        </div>
                        
                        {/* Loading Text */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0d6b5c] to-black bg-clip-text text-transparent">
                                Processing Quote
                            </h2>
                            <p className="text-gray-600 text-lg">
                                Please wait while we save your quote...
                            </p>
                            
                            {/* Animated Dots */}
                            <div className="flex justify-center space-x-2 mt-6">
                                <div className="w-3 h-3 bg-[#0d6b5c] rounded-full animate-bounce"></div>
                                <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-3 h-3 bg-[#0d6b5c] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-8 w-64 mx-auto">
                            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-[#0d6b5c] to-black rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Quote Form */}
            <div className="flex-1 p-8 flex flex-col min-h-full">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">{initialData ? (duplicateMode ? 'Duplicate Quote' : 'Edit Quote') : 'New Quote'}</h1>
                    <div className="flex items-center">
                         <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="bg-white p-8 rounded-lg shadow-sm">
                    {message && (
                      <div className={`mb-4 p-3 rounded text-center font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Column 1 */}
                        <div className="col-span-2 space-y-6">
                             <div>
                                <label className="block mb-2 text-lg font-medium text-gray-700 font-poppins">Customer Name*</label>
                                <div className="flex items-center gap-2">
                                  <CustomerDropdown value={selectedCustomer} onChange={setSelectedCustomer} />
                                  {selectedCustomer && (
                                    <button
                                      type="button"
                                      className="ml-2 px-4 py-2 rounded bg-[#3b3b5c] text-white font-semibold text-sm hover:bg-[#23233a] transition"
                                      onClick={() => setShowCustomerDetailsPanel(true)}
                                    >
                                      {selectedCustomer.displayName || selectedCustomer.companyName || 'View Details'}'s Details
                                    </button>
                                  )}
                                </div>
                                {/* Inline address logic below */}
                                {selectedCustomer && (
                                    <div className="mt-4">
                                        {addressLoading ? (
                                            <div className="flex items-center gap-2 text-blue-600 text-sm"><Loader2 className="animate-spin" size={18} /> Loading address...</div>
                                        ) : customerDetails && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Billing Address */}
                                                <div className="bg-gray-50 rounded-lg p-4 border">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-gray-700">Billing Address</span>
                                                        {customerDetails.address?.billing?.street1 ? (
                                                            <button className="text-blue-600 flex items-center gap-1 text-xs" onClick={() => setAddressEditMode('billing')}><Edit2 size={14}/> Edit</button>
                                                        ) : (
                                                            <button className="text-blue-600 flex items-center gap-1 text-xs" onClick={() => setAddressEditMode('billing')}><PlusCircle size={14}/> Add</button>
                                                        )}
                                                    </div>
                                                    {addressEditMode === 'billing' ? (
                                                        <form className="space-y-2" onSubmit={e => { e.preventDefault(); handleAddressSave('billing'); }}>
                                                            <input className="w-full p-2 border rounded" name="street1" placeholder="Street 1" value={addressForm.billing.street1} onChange={e => handleAddressInput('billing', e)} required />
                                                            <input className="w-full p-2 border rounded" name="street2" placeholder="Street 2" value={addressForm.billing.street2} onChange={e => handleAddressInput('billing', e)} />
                                                            <input className="w-full p-2 border rounded" name="city" placeholder="City" value={addressForm.billing.city} onChange={e => handleAddressInput('billing', e)} required />
                                                            <input className="w-full p-2 border rounded" name="state" placeholder="State" value={addressForm.billing.state} onChange={e => handleAddressInput('billing', e)} required />
                                                            <input className="w-full p-2 border rounded" name="country" placeholder="Country" value={addressForm.billing.country} onChange={e => handleAddressInput('billing', e)} required />
                                                            <input className="w-full p-2 border rounded" name="pinCode" placeholder="Pin Code" value={addressForm.billing.pinCode} onChange={e => handleAddressInput('billing', e)} required />
                                                            <input className="w-full p-2 border rounded" name="phone" placeholder="Phone" value={addressForm.billing.phone} onChange={e => handleAddressInput('billing', e)} />
                                                            <input className="w-full p-2 border rounded" name="fax" placeholder="Fax" value={addressForm.billing.fax} onChange={e => handleAddressInput('billing', e)} />
                                                            <div className="flex gap-2 mt-2">
                                                                <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded flex items-center gap-1" disabled={addressSaving}><Save size={14}/>{addressSaving ? 'Saving...' : 'Save'}</button>
                                                                <button type="button" className="bg-gray-200 px-4 py-1 rounded flex items-center gap-1" onClick={() => setAddressEditMode(null)}><X size={14}/>Cancel</button>
                                                            </div>
                                                            {addressMessage && <div className={`text-xs mt-1 ${addressMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{addressMessage.text}</div>}
                                                        </form>
                                                    ) : customerDetails.address?.billing?.street1 ? (
                                                        <div className="text-sm text-gray-700 whitespace-pre-line">
                                                            {customerDetails.address.billing.street1}{customerDetails.address.billing.street2 && (', ' + customerDetails.address.billing.street2)}<br/>
                                                            {customerDetails.address.billing.city}, {customerDetails.address.billing.state} {customerDetails.address.billing.pinCode}<br/>
                                                            {customerDetails.address.billing.country}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400">No billing address.</div>
                                                    )}
                                                </div>
                                                {/* Shipping Address */}
                                                <div className="bg-gray-50 rounded-lg p-4 border">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-gray-700">Shipping Address</span>
                                                        {customerDetails.address?.shipping?.street1 ? (
                                                            <button className="text-blue-600 flex items-center gap-1 text-xs" onClick={() => setAddressEditMode('shipping')}><Edit2 size={14}/> Edit</button>
                                                        ) : (
                                                            <button className="text-blue-600 flex items-center gap-1 text-xs" onClick={() => setAddressEditMode('shipping')}><PlusCircle size={14}/> Add</button>
                                                        )}
                                                    </div>
                                                    {addressEditMode === 'shipping' ? (
                                                        <form className="space-y-2" onSubmit={e => { e.preventDefault(); handleAddressSave('shipping'); }}>
                                                            <input className="w-full p-2 border rounded" name="street1" placeholder="Street 1" value={addressForm.shipping.street1} onChange={e => handleAddressInput('shipping', e)} required />
                                                            <input className="w-full p-2 border rounded" name="street2" placeholder="Street 2" value={addressForm.shipping.street2} onChange={e => handleAddressInput('shipping', e)} />
                                                            <input className="w-full p-2 border rounded" name="city" placeholder="City" value={addressForm.shipping.city} onChange={e => handleAddressInput('shipping', e)} required />
                                                            <input className="w-full p-2 border rounded" name="state" placeholder="State" value={addressForm.shipping.state} onChange={e => handleAddressInput('shipping', e)} required />
                                                            <input className="w-full p-2 border rounded" name="country" placeholder="Country" value={addressForm.shipping.country} onChange={e => handleAddressInput('shipping', e)} required />
                                                            <input className="w-full p-2 border rounded" name="pinCode" placeholder="Pin Code" value={addressForm.shipping.pinCode} onChange={e => handleAddressInput('shipping', e)} required />
                                                            <input className="w-full p-2 border rounded" name="phone" placeholder="Phone" value={addressForm.shipping.phone} onChange={e => handleAddressInput('shipping', e)} />
                                                            <input className="w-full p-2 border rounded" name="fax" placeholder="Fax" value={addressForm.shipping.fax} onChange={e => handleAddressInput('shipping', e)} />
                                                            <div className="flex gap-2 mt-2">
                                                                <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded flex items-center gap-1" disabled={addressSaving}><Save size={14}/>{addressSaving ? 'Saving...' : 'Save'}</button>
                                                                <button type="button" className="bg-gray-200 px-4 py-1 rounded flex items-center gap-1" onClick={() => setAddressEditMode(null)}><X size={14}/>Cancel</button>
                                                            </div>
                                                            {addressMessage && <div className={`text-xs mt-1 ${addressMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{addressMessage.text}</div>}
                                                        </form>
                                                    ) : customerDetails.address?.shipping?.street1 ? (
                                                        <div className="text-sm text-gray-700 whitespace-pre-line">
                                                            {customerDetails.address.shipping.street1}{customerDetails.address.shipping.street2 && (', ' + customerDetails.address.shipping.street2)}<br/>
                                                            {customerDetails.address.shipping.city}, {customerDetails.address.shipping.state} {customerDetails.address.shipping.pinCode}<br/>
                                                            {customerDetails.address.shipping.country}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400">No shipping address.</div>
                                                    )}
                                                </div>
                                                
                                                {customerDetails.gstin && (
                                                  <div className="col-span-2 flex items-center gap-2 text-sm">
                                                    <span className="font-semibold text-gray-700">GSTIN:</span>
                                                    {addressEditMode === 'gstin' ? (
                                                      <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); handleGstinSave(); }}>
                                                        <input
                                                          className="p-1 border rounded text-sm"
                                                          value={gstinForm}
                                                          onChange={e => setGstinForm(e.target.value)}
                                                          placeholder="Enter GSTIN"
                                                          style={{ width: '180px' }}
                                                        />
                                                        <button type="submit" className="text-blue-600 flex items-center gap-1 text-xs" disabled={gstinSaving}><Save size={14}/>{gstinSaving ? 'Saving...' : 'Save'}</button>
                                                        <button type="button" className="text-gray-400 flex items-center gap-1 text-xs" onClick={() => setAddressEditMode(null)}><X size={14}/>Cancel</button>
                                                      </form>
                                                    ) : (
                                                      <>
                                                        <span className="text-gray-800">{customerDetails.gstin}</span>
                                                        <button className="text-blue-600 flex items-center gap-1 text-xs" onClick={() => { setAddressEditMode('gstin'); setGstinForm(customerDetails.gstin); }}><Edit2 size={14}/> Edit</button>
                                                      </>
                                                    )}
                                                    {gstinMessage && <span className={`ml-2 text-xs ${gstinMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{gstinMessage.text}</span>}
                                                  </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quote#*</label>
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
                                                    Click here to enable or disable auto-generation of Quote numbers.
                                                    <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference#</label>
                                    <input type="text" className="p-2 border border-gray-300 rounded-md w-full" />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quote Date*</label>
                                    <input 
                                        type="date" 
                                        value={quoteDate}
                                        onChange={(e) => setQuoteDate(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-md w-full" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                    <input 
                                        type="date" 
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-md w-full" 
                                    />
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                 <div className="flex items-center">
                                    <input type="text" placeholder="Let your customer know what this Quote is for" className="p-2 border border-gray-300 rounded-md w-full" />
                                    <Info size={16} className="ml-2 text-gray-400" />
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
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-28">RATE/SQFT</th>
                                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-28">MEASUREMENTS</th>
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
                                                <button
                                                    onClick={() => handleOpenItemModal(index)}
                                                    className="w-full p-3 border border-gray-300 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    {item.selectedItem ? (
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-medium text-gray-900 text-sm">
                                                                    {item.selectedItem.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    ₹{item.selectedItem.price} {item.selectedItem.unit && `/ ${item.selectedItem.unit}`}
                                                                </div>
                                                            </div>
                                                            <ChevronDown size={16} className="text-gray-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between text-gray-500">
                                                            <span className="text-sm">Click to select an item</span>
                                                            <ChevronDown size={16} />
                                                        </div>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-2 border-t">
                                                {item.description ? (
                                                    <input
                                                        type="text"
                                                        value={item.description || ''}
                                                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                        className="p-2 border border-gray-200 rounded w-full focus:ring-2 focus:ring-blue-200"
                                                        placeholder="Add description..."
                                                    />
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            // Set focus on description field by creating it
                                                            handleItemChange(index, 'description', '');
                                                            // Use setTimeout to focus after state update
                                                            setTimeout(() => {
                                                                const inputs = document.querySelectorAll('input[placeholder="Add description..."]');
                                                                if (inputs[index]) inputs[index].focus();
                                                            }, 0);
                                                        }}
                                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 p-2 rounded border border-dashed border-blue-300 hover:border-blue-500 w-full justify-center"
                                                        title="Add description"
                                                    >
                                                        <Plus size={16} />
                                                        <span className="text-sm">Add description</span>
                                                    </button>
                                                )}
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
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.rate === 0 || item.rate === '' ? '' : item.rate}
                                                        onChange={e => handleRateCalculation(index, 'rate', e.target.value)}
                                                        className={`p-2 border border-gray-200 rounded w-full text-right focus:ring-2 focus:ring-blue-200 ${
                                                            item._calculatedField === 'rate' ? 'bg-green-50 border-green-300' : ''
                                                        }`}
                                                    />
                                                    {item._calculatedField === 'rate' && (
                                                        <span className="absolute -top-2 -right-2 text-xs bg-green-500 text-white px-1 rounded-full" title="Auto-calculated">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2 border-t">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.ratePerSqft === 0 || item.ratePerSqft === '' ? '' : item.ratePerSqft}
                                                        onChange={e => handleRateCalculation(index, 'ratePerSqft', e.target.value)}
                                                        className={`p-2 border border-gray-200 rounded w-full text-right focus:ring-2 focus:ring-blue-200 ${
                                                            item._calculatedField === 'ratePerSqft' ? 'bg-green-50 border-green-300' : ''
                                                        }`}
                                                        placeholder="0.00"
                                                    />
                                                    {item._calculatedField === 'ratePerSqft' && (
                                                        <span className="absolute -top-2 -right-2 text-xs bg-green-500 text-white px-1 rounded-full" title="Auto-calculated">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2 border-t">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={item.measurements || ''}
                                                        onChange={e => handleRateCalculation(index, 'measurements', e.target.value)}
                                                        className="p-2 border border-gray-200 rounded w-full text-center focus:ring-2 focus:ring-blue-200"
                                                        placeholder="e.g., 10x5 m (unit required)"
                                                        title="Enter measurements with units (mm, cm, m, in, ft, yd, etc.) - units are required"
                                                    />
                                                    {item.measurements && needsConversion(item.measurements) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleConvertToFeet(index)}
                                                            className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
                                                            title={`Convert "${item.measurements}" to feet`}
                                                        >
                                                            Convert to ft
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2 border-t font-semibold text-right">
                                                {item.amount?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="p-2 border-t text-center">
                                                <span className="text-sm text-gray-600">{item.hsn || '-'}</span>
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
                            
                            {/* Rate Calculation Feedback */}
                            {items.some(item => item._calculation) && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Rate Calculations:</h4>
                                    {items.map((item, index) => (
                                        item._calculation && (
                                            <div key={index} className={`text-xs mb-1 ${
                                                item._isConsistent === false ? 'text-red-600' : 'text-blue-700'
                                            }`}>
                                                <span className="font-medium">Item {index + 1}:</span> {item._calculation}
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
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
                            <button 
                                onClick={() => setShowBulkItemsModal(true)}
                                className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={16} className="mr-1.5" /> Add items in Bulk
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
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">TDS/TCS</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-1 text-sm">
                                                    <input
                                                        type="radio"
                                                        name="tdsType"
                                                        value="tds"
                                                        checked={tdsType === 'tds'}
                                                        onChange={(e) => handleTdsTypeChange('tds')}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    TDS
                                                </label>
                                                <label className="flex items-center gap-1 text-sm">
                                                    <input
                                                        type="radio"
                                                        name="tdsType"
                                                        value="tcs"
                                                        checked={tdsType === 'tcs'}
                                                        onChange={(e) => handleTdsTypeChange('tcs')}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    TCS
                                                </label>
                                                {tdsType && (
                                                    <button
                                                        onClick={() => handleTdsTypeChange('')}
                                                        className="text-xs text-red-600 hover:text-red-800 ml-2"
                                                        title="Clear TDS/TCS"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                            {tdsType && (
                                                <>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={tdsValue === 0 || tdsValue === '' ? '' : tdsValue}
                                                        onChange={e => setTdsValue(e.target.value)}
                                                        className="w-20 p-2 border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-200"
                                                        placeholder="%"
                                                    />
                                                    <span className="text-gray-500">%</span>
                                                    <span>{tdsAmount.toFixed(2)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {tdsType && tdsValue && (
                                        <div className="flex justify-between items-center text-sm text-gray-600">
                                            <span>Total {tdsType.toUpperCase()}</span>
                                            <span>-₹{tdsAmount.toFixed(2)}</span>
                                        </div>
                                    )}
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

                    {/* AI Pricing Recommendations */}
                    {selectedCustomer && grandTotal > 0 && (
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Smart Pricing</h3>
                                <button
                                    onClick={() => {
                                        console.log('🧠 [AI-BUTTON] AI Brain button clicked!');
                                        console.log(`📊 [AI-BUTTON] Current state: ${showPricingRecommendations ? 'HIDING' : 'SHOWING'} recommendations`);
                                        setShowPricingRecommendations(!showPricingRecommendations);
                                    }}
                                    className="group relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95"
                                    title={showPricingRecommendations ? 'Hide AI Recommendations' : 'Show AI Recommendations'}
                                >
                                    {/* Rotating AI Brain Icon */}
                                    <div className={`absolute inset-2 flex items-center justify-center ${showPricingRecommendations ? 'ai-continuous-rotate' : 'transition-transform duration-700 ease-in-out hover:rotate-12'}`}>
                                        <AIBrainIcon 
                                            className="w-7 h-7 text-white" 
                                            isActive={showPricingRecommendations}
                                        />
                                    </div>
                                    
                                    {/* Pulsing Ring Animation */}
                                    <div className="absolute inset-0 rounded-full">
                                        <div className="absolute inset-0 rounded-full bg-white/30 animate-ping opacity-75"></div>
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse"></div>
                                    </div>
                                    
                                    {/* AI Badge */}
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                                        <span className="text-[10px] font-bold text-white">AI</span>
                                    </div>
                                    
                                    {/* Glow Effect */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/50 via-purple-400/50 to-pink-400/50 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                                </button>
                            </div>
                            
                            {showPricingRecommendations && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <PricingRecommendations
                                        quoteData={{
                                            customerId: selectedCustomer.customerId,
                                            customerName: selectedCustomer.displayName || selectedCustomer.companyName,
                                            totalAmount: grandTotal,
                                            projectName: projectName,
                                            items: items.filter(item => item.selectedItem),
                                            urgency: 'normal' // You can make this dynamic
                                        }}
                                        onPriceSelect={handlePriceRecommendationSelect}
                                        className="mb-6"
                                    />
                                </div>
                            )}
                        </div>
                    )}
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
                            onMouseDown={e => e.currentTarget.classList.add('scale-95')}
                            onMouseUp={e => e.currentTarget.classList.remove('scale-95')}
                            onMouseLeave={e => e.currentTarget.classList.remove('scale-95')}
                            disabled={saving}
                        >
                            Save as Draft
                        </button>
                        <button
                            onClick={handleSaveAndSend}
                            className="text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition"
                            style={{ background: 'linear-gradient(120deg, #0d6b5c 0%, #000 100%)' }}
                            onMouseDown={e => e.currentTarget.classList.add('scale-95')}
                            onMouseUp={e => e.currentTarget.classList.remove('scale-95')}
                            onMouseLeave={e => e.currentTarget.classList.remove('scale-95')}
                            disabled={saving}
                        >
                            Save & Send
                        </button>
                    </div>
                </footer>

            </div>
            {/* Customer Details Panel (right side) */}
            {showCustomerDetailsPanel && selectedCustomer && (
                <div className="w-full md:w-[420px] p-4 md:p-8 bg-gray-50 border-l border-gray-200 flex-shrink-0 flex flex-col min-h-full md:sticky md:top-0 relative">
                    <button
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                        onClick={() => setShowCustomerDetailsPanel(false)}
                        title="Close"
                    >
                        ×
                    </button>
                    <CustomerDetailsPanel customerId={selectedCustomer.customerId} />
                </div>
            )}
            
            {/* Quote Number Configuration Modal */}
            <QuoteNumberConfigModal
                open={showQuoteNumberModal}
                onClose={() => setShowQuoteNumberModal(false)}
                config={quoteNumberConfig}
                onSave={handleQuoteNumberConfigSave}
            />

            {/* Add Items in Bulk Modal */}
            <AddItemsInBulkModal
                isOpen={showBulkItemsModal}
                onClose={() => setShowBulkItemsModal(false)}
                onAddItems={handleAddBulkItems}
                existingItems={items}
            />

            {/* Item Selection Modal */}
            <ItemSelectionModal
                isOpen={showItemSelectionModal}
                onClose={() => {
                    setShowItemSelectionModal(false);
                    setCurrentItemIndex(null);
                }}
                onSelectItem={handleModalItemSelect}
                selectedItem={currentItemIndex !== null ? items[currentItemIndex]?.selectedItem : null}
            />
        </div>
    );
}

export default NewQuote; 