import React, { useState, useEffect, useContext } from 'react';
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  Building, 
  User, 
  Calendar,
  FileText,
  Receipt,
  Clock,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown
} from 'lucide-react';
import { VendorContext } from "../../../../../context/VendorContext";
import config from '../../../../../config/env';

const CustomerDetailPage = ({ customerId, onClose, onCustomerUpdated }) => {
  const { currentUser } = useContext(VendorContext);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({
    billing: false,
    shipping: false,
    gstin: false
  });
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsedSections, setCollapsedSections] = useState({
    address: false,
    otherDetails: false,
    contactPersons: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});


  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchCustomerTimeline();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
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

      const response = await fetch(`/api/workspace/customers/${customerId}?vendorId=${vendorId}`, {
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setCustomer(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch customer details');
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerTimeline = async () => {
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

      // Fetch quotations for this customer
      const quotationsResponse = await fetch(`/api/workspace/quotations?vendorId=${vendorId}`, {
        headers: headers
      });

      // Fetch invoices for this customer
      const invoicesResponse = await fetch(`/api/workspace/invoices?vendorId=${vendorId}`, {
        headers: headers
      });

      const timelineEvents = [];

      if (quotationsResponse.ok) {
        const quotationsData = await quotationsResponse.json();
        if (quotationsData.success && quotationsData.data) {
          quotationsData.data
            .filter(quote => quote.customerId === customerId)
            .forEach(quote => {
              timelineEvents.push({
                id: quote.quotationId,
                type: 'quotation',
                title: 'Quotation Created',
                description: `Quotation ${quote.quotationId} of amount ₹${parseFloat(quote.totalAmount || 0).toLocaleString('en-IN')}`,
                date: quote.createdAt,
                status: quote.status || 'draft',
                amount: quote.totalAmount
              });
            });
        }
      }

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        if (invoicesData.success && invoicesData.data) {
          invoicesData.data
            .filter(invoice => invoice.customerId === customerId)
            .forEach(invoice => {
              timelineEvents.push({
                id: invoice.invoiceId,
                type: 'invoice',
                title: 'Invoice Created',
                description: `Invoice ${invoice.invoiceId} of amount ₹${parseFloat(invoice.totalAmount || 0).toLocaleString('en-IN')}`,
                date: invoice.createdAt,
                status: invoice.status || 'draft',
                amount: invoice.totalAmount
              });
            });
        }
      }

      // Sort by date (newest first)
      timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTimeline(timelineEvents);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const handleEdit = (field) => {
    setEditMode(prev => ({ ...prev, [field]: true }));
    setEditData({
      ...editData,
      gstin: customer.gstin || '',
      address: customer.address || { billing: {}, shipping: {} }
    });
  };

  const handleCancel = (field) => {
    setEditMode(prev => ({ ...prev, [field]: false }));
    setEditData({});
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, type, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [type]: value
      }
    }));
  };

  const handleSave = async (field) => {
    try {
      setSaving(true);
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

      let updates = {};
      if (field === 'gstin') {
        updates.gstin = editData.gstin;
      } else if (field === 'address') {
        updates.address = editData.address;
      }

      const response = await fetch(`/api/workspace/customers/${customerId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          vendorId: vendorId,
          updates: updates
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setCustomer(result.data);
        setEditMode(prev => ({ ...prev, [field]: false }));
        setEditData({});
        if (onCustomerUpdated) {
          onCustomerUpdated(result.data);
        }
      } else {
        throw new Error(result.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'paid':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'pending':
      case 'draft':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'rejected':
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const getTimelineIcon = (event) => {
    switch (event.type) {
      case 'quotation':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'invoice':
        return <Receipt className="w-5 h-5 text-purple-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const startEditing = () => {
    setEditForm({
      displayName: customer.displayName || '',
      companyName: customer.companyName || '',
      email: customer.email || '',
      workPhone: customer.workPhone || '',
      mobile: customer.mobile || '',
      gstin: customer.gstin || '',
      customerType: customer.customerType || 'Business',
      paymentTerms: customer.paymentTerms || 'Due on Receipt',
      address: {
        billing: {
          street1: customer.address?.billing?.street1 || '',
          street2: customer.address?.billing?.street2 || '',
          city: customer.address?.billing?.city || '',
          state: customer.address?.billing?.state || '',
          pinCode: customer.address?.billing?.pinCode || ''
        },
        shipping: {
          street1: customer.address?.shipping?.street1 || '',
          street2: customer.address?.shipping?.street2 || '',
          city: customer.address?.shipping?.city || '',
          state: customer.address?.shipping?.state || '',
          pinCode: customer.address?.shipping?.pinCode || ''
        }
      },
      contactPersons: customer.contactPersons || []
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const updateEditForm = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAddressField = (type, field, value) => {
    setEditForm(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [type]: {
          ...prev.address[type],
          [field]: value
        }
      }
    }));
  };

  const addContactPerson = () => {
    setEditForm(prev => ({
      ...prev,
      contactPersons: [
        ...prev.contactPersons,
        {
          salutation: 'Mr.',
          firstName: '',
          lastName: '',
          email: '',
          mobile: '',
          designation: ''
        }
      ]
    }));
  };

  const updateContactPerson = (index, field, value) => {
    setEditForm(prev => ({
      ...prev,
      contactPersons: prev.contactPersons.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeContactPerson = (index) => {
    setEditForm(prev => ({
      ...prev,
      contactPersons: prev.contactPersons.filter((_, i) => i !== index)
    }));
  };

  const saveCustomer = async () => {
    try {
      setSaving(true);
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

      const response = await fetch(`/api/workspace/customers/${customerId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          vendorId: vendorId,
          updates: editForm
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setCustomer(result.data);
        setIsEditing(false);
        setEditForm({});
        // Show success message
        alert('Customer updated successfully!');
      } else {
        throw new Error(result.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert(`Error updating customer: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customer</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Not Found</h3>
          <p className="text-gray-600 mb-4">The requested customer could not be found.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center text-stone-600 font-semibold text-xl">
                {(customer.displayName || customer.companyName || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800">
                  {customer.displayName || customer.companyName}
                </h2>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={startEditing}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
            >
              Edit
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm">
              New Transaction
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-6 border-b border-stone-200 flex-shrink-0">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
              activeTab === 'overview'
                ? 'text-blue-600 border-blue-600'
                : 'text-stone-500 hover:text-stone-800 border-transparent hover:border-stone-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
              activeTab === 'timeline'
                ? 'text-blue-600 border-blue-600'
                : 'text-stone-500 hover:text-stone-800 border-transparent hover:border-stone-300'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-stone-100 min-h-0">
        {isEditing ? (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto pb-8">
              {/* Edit Form Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-stone-800">Edit Customer</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={cancelEditing}
                    className="px-5 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-all duration-200 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCustomer}
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-sm"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6 sm:p-8">
                  <h3 className="text-xl font-semibold text-stone-800 mb-6">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editForm.displayName || ''}
                        onChange={(e) => updateEditForm('displayName', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={editForm.companyName || ''}
                        onChange={(e) => updateEditForm('companyName', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => updateEditForm('email', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editForm.workPhone || ''}
                        onChange={(e) => updateEditForm('workPhone', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Mobile</label>
                      <input
                        type="tel"
                        value={editForm.mobile || ''}
                        onChange={(e) => updateEditForm('mobile', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">GSTIN</label>
                      <input
                        type="text"
                        value={editForm.gstin || ''}
                        onChange={(e) => updateEditForm('gstin', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Customer Type</label>
                      <select
                        value={editForm.customerType || 'Business'}
                        onChange={(e) => updateEditForm('customerType', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value="Business">Business</option>
                        <option value="Individual">Individual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">Payment Terms</label>
                      <select
                        value={editForm.paymentTerms || 'Due on Receipt'}
                        onChange={(e) => updateEditForm('paymentTerms', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 60">Net 60</option>
                        <option value="Net 90">Net 90</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6 sm:p-8">
                  <h3 className="text-xl font-semibold text-stone-800 mb-6">Billing Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-600 mb-1">Street Address 1</label>
                      <input
                        type="text"
                        value={editForm.address?.billing?.street1 || ''}
                        onChange={(e) => updateAddressField('billing', 'street1', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-600 mb-1">Street Address 2</label>
                      <input
                        type="text"
                        value={editForm.address?.billing?.street2 || ''}
                        onChange={(e) => updateAddressField('billing', 'street2', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">City</label>
                      <input
                        type="text"
                        value={editForm.address?.billing?.city || ''}
                        onChange={(e) => updateAddressField('billing', 'city', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">State</label>
                      <input
                        type="text"
                        value={editForm.address?.billing?.state || ''}
                        onChange={(e) => updateAddressField('billing', 'state', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">PIN Code</label>
                      <input
                        type="text"
                        value={editForm.address?.billing?.pinCode || ''}
                        onChange={(e) => updateAddressField('billing', 'pinCode', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6 sm:p-8">
                  <h3 className="text-xl font-semibold text-stone-800 mb-6">Shipping Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-600 mb-1">Street Address 1</label>
                      <input
                        type="text"
                        value={editForm.address?.shipping?.street1 || ''}
                        onChange={(e) => updateAddressField('shipping', 'street1', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-600 mb-1">Street Address 2</label>
                      <input
                        type="text"
                        value={editForm.address?.shipping?.street2 || ''}
                        onChange={(e) => updateAddressField('shipping', 'street2', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">City</label>
                      <input
                        type="text"
                        value={editForm.address?.shipping?.city || ''}
                        onChange={(e) => updateAddressField('shipping', 'city', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">State</label>
                      <input
                        type="text"
                        value={editForm.address?.shipping?.state || ''}
                        onChange={(e) => updateAddressField('shipping', 'state', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">PIN Code</label>
                      <input
                        type="text"
                        value={editForm.address?.shipping?.pinCode || ''}
                        onChange={(e) => updateAddressField('shipping', 'pinCode', e.target.value)}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Persons */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-stone-800">Contact Persons</h3>
                    <button
                      onClick={addContactPerson}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 shadow-sm"
                    >
                      Add Contact
                    </button>
                  </div>
                  {editForm.contactPersons && editForm.contactPersons.length > 0 ? (
                    <div className="space-y-6">
                      {editForm.contactPersons.map((contact, index) => (
                        <div key={index} className="border border-stone-200 rounded-xl p-5 bg-stone-50/50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-stone-700">Contact {index + 1}</h4>
                            <button
                              onClick={() => removeContactPerson(index)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                              <label className="block text-sm font-medium text-stone-600 mb-1">Salutation</label>
                              <select
                                value={contact.salutation || 'Mr.'}
                                onChange={(e) => updateContactPerson(index, 'salutation', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              >
                                <option value="Mr.">Mr.</option>
                                <option value="Ms.">Ms.</option>
                                <option value="Mrs.">Mrs.</option>
                                <option value="Dr.">Dr.</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-stone-600 mb-1">First Name</label>
                              <input
                                type="text"
                                value={contact.firstName || ''}
                                onChange={(e) => updateContactPerson(index, 'firstName', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-stone-600 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={contact.lastName || ''}
                                onChange={(e) => updateContactPerson(index, 'lastName', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-stone-600 mb-1">Email</label>
                              <input
                                type="email"
                                value={contact.email || ''}
                                onChange={(e) => updateContactPerson(index, 'email', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-stone-600 mb-1">Mobile</label>
                              <input
                                type="tel"
                                value={contact.mobile || ''}
                                onChange={(e) => updateContactPerson(index, 'mobile', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-stone-600 mb-1">Designation</label>
                              <input
                                type="text"
                                value={contact.designation || ''}
                                onChange={(e) => updateContactPerson(index, 'designation', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-600 text-sm">No contact persons added. Click "Add Contact" to add one.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-6 lg:space-y-8">
                {/* Customer Profile Card */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center">
                        <User className="w-10 h-10 text-stone-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-stone-800">
                          {customer.displayName || customer.companyName}
                        </h3>
                        <p className="text-sm text-stone-500 mt-1">Customer since {formatDate(customer.createdAt)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={startEditing}
                      className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-full"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Address</h3>
                    <button 
                      onClick={() => toggleSection('address')}
                      className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${collapsedSections.address ? '' : 'rotate-180'}`} />
                    </button>
                  </div>
                  {!collapsedSections.address && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-700 mb-2">Billing Address</p>
                        {customer.address?.billing?.street1 ? (
                          <div className="text-sm text-stone-600 leading-relaxed">
                            <p>{customer.address.billing.street1}</p>
                            {customer.address.billing.street2 && <p>{customer.address.billing.street2}</p>}
                            <p>{customer.address.billing.city}, {customer.address.billing.state} {customer.address.billing.pinCode}</p>
                          </div>
                        ) : (
                          <a href="#" className="text-blue-600 text-sm hover:underline">Add Billing Address</a>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-700 mb-2">Shipping Address</p>
                        {customer.address?.shipping?.street1 ? (
                          <div className="text-sm text-stone-600 leading-relaxed">
                            <p>{customer.address.shipping.street1}</p>
                            {customer.address.shipping.street2 && <p>{customer.address.shipping.street2}</p>}
                            <p>{customer.address.shipping.city}, {customer.address.shipping.state} {customer.address.shipping.pinCode}</p>
                          </div>
                        ) : (
                          <a href="#" className="text-blue-600 text-sm hover:underline">Add Shipping Address</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Other Details Section */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Other Details</h3>
                    <button 
                      onClick={() => toggleSection('otherDetails')}
                      className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${collapsedSections.otherDetails ? '' : 'rotate-180'}`} />
                    </button>
                  </div>
                  {!collapsedSections.otherDetails && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4">
                      <span className="text-sm text-stone-500">Customer Type</span>
                      <span className="text-sm font-medium text-stone-800 text-right">{customer.customerType || 'Business'}</span>
                      
                      <span className="text-sm text-stone-500">Email</span>
                      <span className="text-sm font-medium text-stone-800 text-right truncate">{customer.email || 'Not provided'}</span>
                      
                      <span className="text-sm text-stone-500">Phone</span>
                      <span className="text-sm font-medium text-stone-800 text-right">{customer.workPhone || 'Not provided'}</span>
                      
                      <span className="text-sm text-stone-500">Mobile</span>
                      <span className="text-sm font-medium text-stone-800 text-right">{customer.mobile || 'Not provided'}</span>

                      <span className="text-sm text-stone-500">GSTIN</span>
                      <span className="text-sm font-medium text-stone-800 text-right">{customer.gstin || 'Not provided'}</span>
                      
                      <span className="text-sm text-stone-500">Payment Terms</span>
                      <span className="text-sm font-medium text-stone-800 text-right">{customer.paymentTerms || 'Due on Receipt'}</span>
                    </div>
                  )}
                </div>

                {/* Contact Persons Section */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Contact Persons</h3>
                    <div className="flex items-center space-x-2">
                      <button className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleSection('contactPersons')}
                        className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${collapsedSections.contactPersons ? '' : 'rotate-180'}`} />
                      </button>
                    </div>
                  </div>
                  {!collapsedSections.contactPersons && (
                    customer.contactPersons && customer.contactPersons.length > 0 ? (
                      <div className="space-y-4 pt-4">
                        {customer.contactPersons.map((contact, index) => (
                          <div key={index} className="flex justify-between items-center p-4 bg-stone-50 rounded-lg border border-stone-200">
                            <div>
                              <p className="text-sm font-semibold text-stone-800">
                                {contact.salutation} {contact.firstName} {contact.lastName}
                              </p>
                              <p className="text-sm text-stone-600">{contact.email || contact.mobile}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-stone-600 pt-4">No contact persons found.</p>
                    )
                  )}
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="xl:col-span-1 space-y-6 lg:space-y-8">
                {/* Payment Due Period */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <h4 className="text-sm font-semibold text-stone-500 mb-2">Payment Due Period</h4>
                  <p className="text-2xl font-bold text-stone-800">{customer.paymentTerms || 'Due on Receipt'}</p>
                </div>
                {/* Receivables */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <h4 className="text-sm font-semibold text-stone-500 mb-4">Receivables</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-stone-600 text-sm">Outstanding</span>
                      <span className="text-stone-800 font-semibold text-lg">₹{customer.outstandingReceivables || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-stone-600 text-sm">Unused Credits</span>
                      <span className="text-stone-800 font-semibold text-lg">₹{customer.unusedCredits || '0.00'}</span>
                    </div>
                  </div>
                </div>
                {/* Income and Expense */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-stone-500">Income</h4>
                    <select className="text-xs bg-white border border-stone-200 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500">
                      <option>Last 6 Months</option>
                    </select>
                  </div>
                  <div className="flex justify-around items-end h-32 bg-stone-50 rounded-lg p-4">
                    {[20, 45, 60, 30, 80, 50].map((bar, i) => (
                      <div key={i} className="w-5 bg-stone-200 hover:bg-stone-300 transition-colors rounded-t" style={{ height: `${bar}%` }}></div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm text-stone-600 mt-3">
                    <span>Total Income</span>
                    <span className="font-semibold text-stone-800">₹0.00</span>
                  </div>
                </div>
                {/* Activity Timeline */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-6">
                  <h4 className="text-sm font-semibold text-stone-500 mb-4">Activity Timeline</h4>
                  <div className="text-center text-sm text-stone-500 py-6">
                    No recent activity
                  </div>
                </div>
            </div>
          </div>
        )}
        
        {activeTab === 'timeline' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-3xl font-bold text-stone-800 mb-8">Timeline</h2>
            <div className="border-l-2 border-stone-200 ml-4 pl-8 space-y-10">
              {/* Customer Created Event */}
              <div className="relative">
                <div className="absolute -left-[42px] top-1 w-6 h-6 bg-blue-600 rounded-full border-4 border-stone-100"></div>
                <p className="text-sm text-stone-500 mb-1">{formatDate(customer.createdAt)}</p>
                <h3 className="font-semibold text-stone-800">Customer Created</h3>
                <p className="text-sm text-stone-600">
                  Customer profile for {customer.displayName || customer.companyName} was created.
                </p>
              </div>

              {timeline.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[42px] top-1 w-6 h-6 bg-stone-300 rounded-full border-4 border-stone-100 flex items-center justify-center">
                    {getTimelineIcon(event)}
                  </div>
                  <p className="text-sm text-stone-500 mb-1">{formatDate(event.date)}</p>
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-stone-800">{event.title}</h3>
                    {event.status && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(event.status).bg} ${getStatusColor(event.status).text}`}>
                        {event.status}
                      </span>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-stone-200 mt-2">
                    <p className="text-sm text-stone-600">
                      {event.description}
                    </p>
                    <p className="text-sm font-bold text-stone-700 mt-2">
                      Amount: {event.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailPage;
