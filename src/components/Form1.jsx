import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import StepIndicator from "./StepIndicator";
import SidebarContent from "./SidebarContent";

function Form1() {
  const navigate = useNavigate();
  const vendorContext = useContext(VendorContext);
  const { vendorData, setVendorData, currentUser: vendorContextUser } = vendorContext;
  const { currentUser: userContextUser } = useContext(UserContext) || {};
  
  // Use either context's user
  const currentUser = vendorContextUser || userContextUser;

  const PHONE_RULES = {
    "+91": { maxLength: 10, label: "India (+91)" },
    "+1": { maxLength: 10, label: "USA / Canada (+1)" },
    "+44": { maxLength: 10, label: "UK (+44)" },
  };

  // Initialize state for form fields based on new design
  const [formData, setFormData] = useState({
    vendorName: vendorData.vendorDetails.vendorName || "",
    firstName:
      vendorData.vendorDetails.firstName ||
      currentUser?.name?.split(" ")[0] ||
      "",
    lastName:
      vendorData.vendorDetails.lastName ||
      currentUser?.name?.split(" ").slice(1).join(" ") ||
      "",
    countryCode: vendorData.vendorDetails.countryCode || "+91",
    phoneNumber: vendorData.vendorDetails.phoneNumber || "",
    organizationMailId:
      vendorData.vendorDetails.organizationMailId || currentUser?.email || "",
    address: vendorData.vendorDetails.address || "",
    state: vendorData.vendorDetails.state || "",
    city: vendorData.vendorDetails.city || "",
    pincode: vendorData.vendorDetails.pincode || "",
  });

  // State to control the visibility of the "Save Changes" indicator
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for phone number validation warning
  const [showPhoneWarning, setShowPhoneWarning] = useState(false);

  // Load saved data from localStorage when component mounts
  useEffect(() => {
    if (currentUser) {
      const userKey = `user-${currentUser.id}-form1Data`;
      const savedData = localStorage.getItem(userKey);
      if (savedData) {
        setFormData(JSON.parse(savedData));
      }
    }
  }, [currentUser]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "phoneNumber") {
      const currentCode = formData.countryCode || "+91";
      const maxLength = PHONE_RULES[currentCode]?.maxLength || 15;
      const numericOnly = value.replace(/\D/g, "");
      const trimmedValue = numericOnly.slice(0, maxLength);
      const isValidPhoneNumber = new RegExp(`^\\d{0,${maxLength}}$`).test(trimmedValue);
      
      if (!isValidPhoneNumber) {
        // Show warning popup
        setShowPhoneWarning(true);
        
        // Hide warning after 2 seconds
        setTimeout(() => {
          setShowPhoneWarning(false);
        }, 2000);
        
        return; // Exit if the value is not valid
      } else {
        // Hide warning if input becomes valid
        setShowPhoneWarning(false);
      }

      setFormData((prevData) => ({
        ...prevData,
        [name]: trimmedValue,
      }));
      return;
    }
    
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleNext = () => {
    setIsSubmitting(true);
    setVendorData((prev) => ({
      ...prev,
      vendorDetails: {
        vendorName: formData.vendorName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        countryCode: formData.countryCode,
        phoneNumber: formData.phoneNumber,
        organizationMailId: formData.organizationMailId,
        address: formData.address,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode,
      },
    }));
    navigate("/Form2");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const requiredFields = [
      "vendorName",
      "firstName",
      "lastName",
      "phoneNumber",
      "organizationMailId",
      "address",
      "state",
      "city",
      "pincode",
    ];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") {
        alert(
          "Please fill the field: " +
            field.replace(/([A-Z])/g, " $1").toLowerCase()
        );
        setIsSubmitting(false);
        return;
      }
    }
    handleNext();
  };

  const renderField = (label, name, type = "text") => (
    <div className="flex flex-col md:flex-row items-start gap-6">
      <div className="w-full md:w-1/3">
        <label className="text-sm font-semibold text-gray-900 block mb-1">{label}</label>
        <p className="text-xs text-gray-500">provide {label.toLowerCase()}</p>
      </div>
      <input
        required
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleInputChange}
        placeholder={label}
        className="w-full md:w-2/3 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
    </div>
  );

  // Special render function for phone number field with warning popup
  const renderPhoneField = (label, name) => (
    <div className="flex flex-col md:flex-row items-start gap-6">
      <div className="w-full md:w-1/3">
        <label className="text-sm font-semibold text-gray-900 block mb-1">{label}</label>
        <p className="text-xs text-gray-500">provide {label.toLowerCase()}</p>
      </div>
      <div className="w-full md:w-2/3 relative">
        <input
          required
          type="text"
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          placeholder={label}
          maxLength="10"
          className={`w-full border rounded px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
            showPhoneWarning ? 'border-red-500 border-2' : 'border-gray-300'
          }`}
        />
        
        {/* Warning Popup */}
        {showPhoneWarning && (
          <div className="absolute top-full left-0 mt-1 bg-red-500 text-white px-3 py-2 rounded text-sm whitespace-nowrap z-50 shadow-lg animate-fade-in">
            Please enter numbers only
            {/* Arrow pointing up */}
            <div className="absolute -top-1 left-5 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-red-500"></div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <SidebarContent />

      {/* Right Content */}
      <div className="flex-1 flex flex-col">
        {/* Step Indicator */}
        <StepIndicator currentStep={1} />

        {/* Form Content */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Vendor Details
          </h1>

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">
            {/* Vendor Information Section */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Vendor Information</h3>
                  <p className="text-xs text-gray-500">provide vendor info</p>
                </div>
                <div className="w-full md:w-2/3">
                  <input
                    required
                    type="text"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleInputChange}
                    placeholder="Vendor name"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Primary Contact Section */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Primary Contact name</h3>
                  <p className="text-xs text-gray-500">provide your name</p>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                  <input
                    required
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    required
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details Section */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Contact Details</h3>
                  <p className="text-xs text-gray-500">Provide Contact details</p>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                  <div className="relative flex">
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="border border-gray-300 rounded-l px-2 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US/CA)</option>
                      <option value="+44">+44 (UK)</option>
                    </select>
                    <input
                      required
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Phone number"
                      maxLength={PHONE_RULES[formData.countryCode]?.maxLength || 15}
                      className={`flex-1 border border-l-0 rounded-r px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        showPhoneWarning ? 'border-red-500 border-2' : 'border-gray-300'
                      }`}
                    />
                    {showPhoneWarning && (
                      <div className="absolute top-full left-0 mt-1 bg-red-500 text-white px-3 py-2 rounded text-sm whitespace-nowrap z-50 shadow-lg">
                        Please enter numbers only and ensure the length matches the selected country code.
                        <div className="absolute -top-1 left-5 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-red-500"></div>
                      </div>
                    )}
                  </div>
                  <input
                    required
                    type="email"
                    name="organizationMailId"
                    value={formData.organizationMailId}
                    onChange={handleInputChange}
                    placeholder="Organization mail ID"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Address</h3>
                  <p className="text-xs text-gray-500">Provide Address details</p>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                  <input
                    required
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Address"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    required
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    required
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    required
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="Pincode"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
          </div>

            {/* Save Changes Indicator */}
            {showSaveIndicator && (
              <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
                Changes saved!
              </div>
            )}

            {/* Phone Number Validation Warning */}
            {showPhoneWarning && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p className="text-sm">
                  <strong>Warning:</strong> Phone number should contain only numbers and match the length for the selected country code.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate("/role-selection")}
                className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-white px-8 py-3 rounded-lg font-medium shadow-md bg-gradient-to-r from-[#0F5848] to-[#21BE9C] hover:from-[#0F5848]/90 hover:to-[#21BE9C]/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Please wait..." : "Next"}
              </button>
            </div>
        </form>
        </div>
      </div>
    </div>
  );
}

export default Form1;