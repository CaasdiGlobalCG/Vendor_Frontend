import React, { useState, useEffect, useContext } from 'react';
import { ArrowLeft, X, Upload, Plus, Trash2 } from 'lucide-react';
import { Country, State } from 'country-state-city';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import config from "../../../../../config/env";

const NewCustomerForm = ({ onClose, onCustomerCreated, editMode = false, customerData = null }) => {
  const { currentUser } = useContext(VendorContext);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [billingStates, setBillingStates] = useState([]);
  const [shippingStates, setShippingStates] = useState([]);
  const [formData, setFormData] = useState({
    // Customer Type
    customerType: 'business',
    
    // Primary Contact
    salutation: '',
    firstName: '',
    lastName: '',
    
    // Company Details
    companyName: '',
    displayName: '',
    
    // Contact Information
    email: '',
    workPhone: '',
    mobile: '',
    gstin: '',
    
    // Address (will be added in Address tab)
    address: {
      billing: {
        attention: '',
        street1: '',
        street2: '',
        city: '',
        state: '',
        pinCode: '',
        country: 'IN',
        phone: '',
        fax: ''
      },
      shipping: {
        attention: '',
        street1: '',
        street2: '',
        city: '',
        state: '',
        pinCode: '',
        country: 'IN',
        phone: '',
        fax: ''
      }
    },
    
    // Other Details
    paymentTerms: 'Due on Receipt',
    pan: '',
    remarks: '',
    
    // Additional contact persons
    additionalContacts: [],
    
    // Documents
    documents: []
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (type, field, value) => {
    setFormData(prev => ({
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
    setFormData(prev => ({
      ...prev,
      additionalContacts: [
        ...prev.additionalContacts,
        {
          id: Date.now(),
          salutation: '',
          firstName: '',
          lastName: '',
          email: '',
          workPhone: '',
          mobile: ''
        }
      ]
    }));
  };

  const removeContactPerson = (id) => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: prev.additionalContacts.filter(contact => contact.id !== id)
    }));
  };

  const updateContactPerson = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: prev.additionalContacts.map(contact =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const copyBillingToShipping = () => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        shipping: { ...prev.address.billing }
      }
    }));
    
    // Also update shipping states to match billing country
    if (formData.address.billing.country) {
      const states = State.getStatesOfCountry(formData.address.billing.country);
      setShippingStates(states);
    }
  };

  // Load countries on component mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
    
    // Load initial states for default country (India)
    const indianStates = State.getStatesOfCountry('IN');
    setBillingStates(indianStates);
    setShippingStates(indianStates);
  }, []);

  // Populate form with existing customer data in edit mode
  useEffect(() => {
    if (editMode && customerData) {
      // Extract additional contacts (exclude the primary contact)
      const additionalContacts = customerData.contactPersons?.slice(1) || [];
      
      setFormData({
        customerType: customerData.customerType || 'business',
        salutation: customerData.primaryContact?.salutation || customerData.contactPersons?.[0]?.salutation || '',
        firstName: customerData.primaryContact?.firstName || customerData.contactPersons?.[0]?.firstName || '',
        lastName: customerData.primaryContact?.lastName || customerData.contactPersons?.[0]?.lastName || '',
        email: customerData.email || customerData.contactPersons?.[0]?.email || '',
        workPhone: customerData.workPhone || customerData.contactPersons?.[0]?.workPhone || '',
        mobile: customerData.mobile || customerData.contactPersons?.[0]?.mobile || '',
        companyName: customerData.companyName || '',
        displayName: customerData.displayName || '',
        gstin: customerData.gstin || '',
        address: {
          billing: {
            attention: customerData.address?.billing?.attention || '',
            street1: customerData.address?.billing?.street1 || '',
            street2: customerData.address?.billing?.street2 || '',
            city: customerData.address?.billing?.city || '',
            state: customerData.address?.billing?.state || '',
            pinCode: customerData.address?.billing?.pinCode || '',
            country: customerData.address?.billing?.country || 'IN',
            phone: customerData.address?.billing?.phone || '',
            fax: customerData.address?.billing?.fax || ''
          },
          shipping: {
            attention: customerData.address?.shipping?.attention || '',
            street1: customerData.address?.shipping?.street1 || '',
            street2: customerData.address?.shipping?.street2 || '',
            city: customerData.address?.shipping?.city || '',
            state: customerData.address?.shipping?.state || '',
            pinCode: customerData.address?.shipping?.pinCode || '',
            country: customerData.address?.shipping?.country || 'IN',
            phone: customerData.address?.shipping?.phone || '',
            fax: customerData.address?.shipping?.fax || ''
          }
        },
        paymentTerms: customerData.paymentTerms || 'Due on Receipt',
        pan: customerData.pan || '',
        remarks: customerData.remarks || '',
        additionalContacts: additionalContacts.map(contact => ({
          id: Date.now() + Math.random(),
          salutation: contact.salutation || '',
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          workPhone: contact.workPhone || '',
          mobile: contact.mobile || ''
        })),
        documents: []
      });

      // Load states for the selected countries
      if (customerData.address?.billing?.country) {
        const billingStatesData = State.getStatesOfCountry(customerData.address.billing.country);
        setBillingStates(billingStatesData);
      }
      if (customerData.address?.shipping?.country) {
        const shippingStatesData = State.getStatesOfCountry(customerData.address.shipping.country);
        setShippingStates(shippingStatesData);
      }
    }
  }, [editMode, customerData]);

  // Handle country change for billing address
  const handleBillingCountryChange = (countryCode) => {
    const states = State.getStatesOfCountry(countryCode);
    setBillingStates(states);
    handleAddressChange('billing', 'country', countryCode);
    handleAddressChange('billing', 'state', ''); // Reset state when country changes
  };

  // Handle country change for shipping address
  const handleShippingCountryChange = (countryCode) => {
    const states = State.getStatesOfCountry(countryCode);
    setShippingStates(states);
    handleAddressChange('shipping', 'country', countryCode);
    handleAddressChange('shipping', 'state', ''); // Reset state when country changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare customer data for API
      const customerDataPayload = {
        customerType: formData.customerType,
        companyName: formData.companyName,
        displayName: formData.displayName || formData.companyName,
        email: formData.email,
        workPhone: formData.workPhone,
        mobile: formData.mobile,
        gstin: formData.gstin,
        pan: formData.pan,
        paymentTerms: formData.paymentTerms,
        remarks: formData.remarks,
        address: formData.address,
        primaryContact: {
          salutation: formData.salutation,
          firstName: formData.firstName,
          lastName: formData.lastName
        },
        contactPersons: [
          {
            salutation: formData.salutation,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            workPhone: formData.workPhone,
            mobile: formData.mobile
          },
          ...formData.additionalContacts
        ]
      };

      // Add customerId for edit mode
      if (editMode && customerData?.customerId) {
        customerDataPayload.customerId = customerData.customerId;
      }

      // Use workspace customers endpoint with authentication
      const vendorId = currentUser?.vendorId;

      if (!vendorId) {
        throw new Error('Vendor ID not found. Please log in again.');
      }

      console.log('Submitting customer data:', customerDataPayload);

      const url = editMode ? `/api/workspace/customers/${customerData.customerId}` : `/api/workspace/customers`;
      const method = editMode ? 'PUT' : 'POST';

      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      // Backend expects { vendorId, customerData } format
      const requestBody = {
        vendorId: vendorId,
        customerData: customerDataPayload
      };

      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Customer created successfully:', result.data);
        if (onCustomerCreated) {
          onCustomerCreated(result.data);
        }
        onClose();
      } else {
        throw new Error(result.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error creating customer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', name: 'Basic Details', active: true },
    { id: 'address', name: 'Address', active: false },
    { id: 'contact', name: 'Contact Persons', active: false },
    { id: 'other', name: 'Other Details', active: false }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? 'Edit Customer' : 'New Customer'}
              </h2>
              <p className="text-sm text-gray-500">
                {editMode ? 'Update the details for this customer' : 'Add a new customer to your system'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-300"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : 'Save Customer'}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  ${activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          {/* Basic Details Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-8">
              {/* Customer Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Type</h3>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="customerType"
                      value="business"
                      checked={formData.customerType === 'business'}
                      onChange={(e) => handleInputChange('customerType', e.target.value)}
                      className="mt-1 w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Business</div>
                      <div className="text-sm text-gray-500">For companies and organizations</div>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="customerType"
                      value="individual"
                      checked={formData.customerType === 'individual'}
                      onChange={(e) => handleInputChange('customerType', e.target.value)}
                      className="mt-1 w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Individual</div>
                      <div className="text-sm text-gray-500">For personal customers</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Primary Contact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Salutation
                        </label>
                        <select
                          value={formData.salutation}
                          onChange={(e) => handleInputChange('salutation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="">Select Salutation</option>
                          <option value="Mr.">Mr.</option>
                          <option value="Ms.">Ms.</option>
                          <option value="Mrs.">Mrs.</option>
                          <option value="Dr.">Dr.</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          placeholder="Enter first name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          placeholder="Enter last name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Work Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.workPhone}
                          onChange={(e) => handleInputChange('workPhone', e.target.value)}
                          placeholder="Enter work phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mobile
                        </label>
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => handleInputChange('mobile', e.target.value)}
                          placeholder="Enter mobile number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Enter company name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      placeholder="Enter display name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => handleInputChange('gstin', e.target.value)}
                    placeholder="Enter GSTIN (e.g., 29ABCDE1234F1Z5)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency</h3>
                <div>
                  <input
                    type="text"
                    value="INR - Indian Rupee"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Currency cannot be edited as multi-currency handling is unavailable.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Billing Address */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-900">Billing Address</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <select
                          value={formData.address.billing.country}
                          onChange={(e) => handleBillingCountryChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="">Select Country</option>
                          {countries.map((country) => (
                            <option key={country.isoCode} value={country.isoCode}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <select
                          value={formData.address.billing.state}
                          onChange={(e) => handleAddressChange('billing', 'state', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={!formData.address.billing.country}
                        >
                          <option value="">Select State</option>
                          {billingStates.map((state) => (
                            <option key={state.isoCode} value={state.isoCode}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.address.billing.city}
                        onChange={(e) => handleAddressChange('billing', 'city', e.target.value)}
                        placeholder="Enter city"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address 1</label>
                      <input
                        type="text"
                        value={formData.address.billing.street1}
                        onChange={(e) => handleAddressChange('billing', 'street1', e.target.value)}
                        placeholder="Enter street address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address 2 (Optional)</label>
                      <input
                        type="text"
                        value={formData.address.billing.street2}
                        onChange={(e) => handleAddressChange('billing', 'street2', e.target.value)}
                        placeholder="Enter additional address details"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
                        <input
                          type="text"
                          value={formData.address.billing.pinCode}
                          onChange={(e) => handleAddressChange('billing', 'pinCode', e.target.value)}
                          placeholder="Enter pin code"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.address.billing.phone}
                          onChange={(e) => handleAddressChange('billing', 'phone', e.target.value)}
                          placeholder="Enter phone number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            copyBillingToShipping();
                          }
                        }}
                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-600">Same as billing address</span>
                    </label>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <select
                          value={formData.address.shipping.country}
                          onChange={(e) => handleShippingCountryChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="">Select Country</option>
                          {countries.map((country) => (
                            <option key={country.isoCode} value={country.isoCode}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <select
                          value={formData.address.shipping.state}
                          onChange={(e) => handleAddressChange('shipping', 'state', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          disabled={!formData.address.shipping.country}
                        >
                          <option value="">Select State</option>
                          {shippingStates.map((state) => (
                            <option key={state.isoCode} value={state.isoCode}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.address.shipping.city}
                        onChange={(e) => handleAddressChange('shipping', 'city', e.target.value)}
                        placeholder="Enter city"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address 1</label>
                      <input
                        type="text"
                        value={formData.address.shipping.street1}
                        onChange={(e) => handleAddressChange('shipping', 'street1', e.target.value)}
                        placeholder="Enter street address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address 2 (Optional)</label>
                      <input
                        type="text"
                        value={formData.address.shipping.street2}
                        onChange={(e) => handleAddressChange('shipping', 'street2', e.target.value)}
                        placeholder="Enter additional address details"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
                        <input
                          type="text"
                          value={formData.address.shipping.pinCode}
                          onChange={(e) => handleAddressChange('shipping', 'pinCode', e.target.value)}
                          placeholder="Enter pin code"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.address.shipping.phone}
                          onChange={(e) => handleAddressChange('shipping', 'phone', e.target.value)}
                          placeholder="Enter phone number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Persons Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Contact Persons</h3>
                <button
                  type="button"
                  onClick={addContactPerson}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Contact</span>
                </button>
              </div>

              {/* Primary Contact (Contact Person 1) */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Contact Person 1</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salutation</label>
                    <input
                      type="text"
                      value={formData.salutation}
                      onChange={(e) => handleInputChange('salutation', e.target.value)}
                      placeholder="Mr./Ms./Dr."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                    <input
                      type="tel"
                      value={formData.workPhone}
                      onChange={(e) => handleInputChange('workPhone', e.target.value)}
                      placeholder="Enter work phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                      placeholder="Enter mobile number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Contact Persons */}
              {formData.additionalContacts.map((contact, index) => (
                <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-900">Contact Person {index + 2}</h4>
                    <button
                      type="button"
                      onClick={() => removeContactPerson(contact.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salutation</label>
                      <input
                        type="text"
                        value={contact.salutation}
                        onChange={(e) => updateContactPerson(contact.id, 'salutation', e.target.value)}
                        placeholder="Mr./Ms./Dr."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={contact.firstName}
                        onChange={(e) => updateContactPerson(contact.id, 'firstName', e.target.value)}
                        placeholder="Enter first name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={contact.lastName}
                        onChange={(e) => updateContactPerson(contact.id, 'lastName', e.target.value)}
                        placeholder="Enter last name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContactPerson(contact.id, 'email', e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                      <input
                        type="tel"
                        value={contact.workPhone}
                        onChange={(e) => updateContactPerson(contact.id, 'workPhone', e.target.value)}
                        placeholder="Enter work phone"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                      <input
                        type="tel"
                        value={contact.mobile}
                        onChange={(e) => updateContactPerson(contact.id, 'mobile', e.target.value)}
                        placeholder="Enter mobile number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Other Details Tab */}
          {activeTab === 'other' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Other Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                      <input
                        type="text"
                        value={formData.pan}
                        onChange={(e) => handleInputChange('pan', e.target.value)}
                        placeholder="Enter PAN number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 45">Net 45</option>
                        <option value="Net 60">Net 60</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Documents</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Upload File
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          Drag and drop files here or click to browse
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => handleInputChange('remarks', e.target.value)}
                      placeholder="Add any internal notes about this customer..."
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default NewCustomerForm;
