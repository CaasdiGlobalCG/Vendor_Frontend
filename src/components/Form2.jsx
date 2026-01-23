
import React, { useState, useEffect, useContext } from "react";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/fileUpload";
import { validateGSTIN } from "../utils/gstinValidation";
import { validatePAN } from "../utils/panValidation";
import StepIndicator from "./StepIndicator";
import SidebarContent from "./SidebarContent";
import SearchableSelect from "./SearchableSelect";
import { BUSINESS_TYPES, FLAT_BUSINESS_TYPES, INDUSTRY_TYPES, FLAT_INDUSTRY_TYPES } from "../constants/businessIndustryTypes";

export default function Form2() {
  const navigate = useNavigate();
  const { vendorData, setVendorData, currentUser: vendorContextUser } = useContext(VendorContext);
  const { currentUser } = useContext(UserContext) || {};
  const currentYear = new Date().getFullYear();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  const [formData, setFormData] = useState({
    businessType: vendorData.companyDetails.businessType || "",
    industryType: vendorData.companyDetails.industryType || "",
    yearOfEstablishment: vendorData.companyDetails.yearOfEstablishment || "",
    gstNumber: vendorData.companyDetails.gstNumber || "",
    panNumber: vendorData.companyDetails.panNumber || "",
    gstCertificate: vendorData.companyDetails.gstCertificate || null,
    panCertificate: vendorData.companyDetails.panCertificate || null,
  });

  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [gstinErrors, setGstinErrors] = useState({});
  const [panErrors, setPanErrors] = useState({});

  // Fetch user email from API as a fallback
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        // First try from context
        if (vendorContextUser?.email) {
          console.log('[FORM2_USER_FROM_CONTEXT]', vendorContextUser.email);
          setUserEmail(vendorContextUser.email);
          return;
        }

        // Fallback: Fetch from API
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.log('[FORM2_NO_TOKEN] No auth token found');
          return;
        }

        const response = await fetch(`${window.location.origin}/api/vendor/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          const fetchedEmail = data?.data?.email || data?.data?.vendorDetails?.primaryContactEmail;
          if (fetchedEmail) {
            console.log('[FORM2_USER_FROM_API]', fetchedEmail);
            setUserEmail(fetchedEmail);
          }
        } else {
          console.log('[FORM2_API_FETCH_FAILED]', response.status);
        }
      } catch (error) {
        console.error('[FORM2_FETCH_USER_ERROR]', error);
      }
    };

    fetchUserEmail();
  }, [vendorContextUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Prevent entering a future year for yearOfEstablishment
    if (name === "yearOfEstablishment") {
      // Allow only digits and limit to 4 characters
      const sanitized = value.replace(/\D/g, "").slice(0, 4);
      const numericYear = parseInt(sanitized, 10);

      if (!isNaN(numericYear) && numericYear > currentYear) {
        // Ignore values beyond the current year
        return;
      }

      setFormData((prevData) => ({
        ...prevData,
        [name]: sanitized,
      }));
      return;
    }

    // GSTIN validation
    if (name === "gstNumber") {
      const sanitized = value.toUpperCase().trim();
      setFormData((prevData) => ({
        ...prevData,
        [name]: sanitized,
      }));

      // Validate GSTIN only if it's not empty and has some content
      if (sanitized.length > 0) {
        const validation = validateGSTIN(sanitized);
        if (!validation.isValid) {
          setGstinErrors({ gstNumber: validation.error });
        } else {
          setGstinErrors({});
        }
      } else {
        setGstinErrors({});
      }
      return;
    }

    // PAN validation
    if (name === "panNumber") {
      const sanitized = value.toUpperCase().trim();
      setFormData((prevData) => ({
        ...prevData,
        [name]: sanitized,
      }));

      // Validate PAN only if it's not empty and has some content
      if (sanitized.length > 0) {
        const validation = validatePAN(sanitized);
        if (!validation.isValid) {
          setPanErrors({ panNumber: validation.error });
        } else {
          setPanErrors({});
        }
      } else {
        setPanErrors({});
      }
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const file = files[0];
      
      console.log(`[FORM2_FILE_SELECTED] ${name}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        userEmail,
        timestamp: new Date().toISOString()
      });
      
      setFormData((prev) => ({ ...prev, [name]: { file, name: file.name, uploading: true } }));
      
      try {
        // Use email from state (fetched from context or API)
        if (!userEmail) {
          console.error('[FORM2_ERROR] User email still not available');
          throw new Error('User email not available. Please refresh and try again.');
        }
        
        const section = "companyDetails";
        console.log(`[FORM2_UPLOAD_START] Uploading ${name} for ${userEmail}`);
        
        const response = await uploadFileToS3(file, userEmail, name, section);
        
        console.log(`[FORM2_UPLOAD_RESPONSE_RECEIVED] ${name}:`, response);
        
        // Extract the URL from the response - it should be in response.data.url
        const uploadedUrl = response?.data?.url;
        
        if (!uploadedUrl) {
          console.error(`[FORM2_ERROR] No URL in response for ${name}:`, response);
          throw new Error('No file URL returned from server. Please check the upload response.');
        }
        
        console.log(`[FORM2_UPLOAD_SUCCESS] ${name} uploaded to: ${uploadedUrl}`);
        
        setFormData((prev) => ({
          ...prev,
          [name]: {
            file,
            name: file.name,
            url: uploadedUrl,
            uploading: false,
          },
        }));
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 3000);
      } catch (error) {
        console.error(`[FORM2_UPLOAD_ERROR] ${name}:`, {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        setFormData((prev) => ({ ...prev, [name]: null }));
        alert(`Failed to upload file: ${error.message}. Please try again.`);
      }
    }
  };

  const handleDeleteFile = async (fieldName) => {
    try {
      if (formData[fieldName]?.url && currentUser?.email) {
        await deleteFileFromS3(currentUser.email, fieldName, "companyDetails");
      }
      setFormData((prev) => ({ ...prev, [fieldName]: null }));
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 3000);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handlePrevious = () => {
    navigate("/Form1");
  };

  const handleNext = () => {
    if (currentUser) {
      sessionStorage.setItem(`form2Data_${currentUser.id}`, JSON.stringify(formData));
    }
    setVendorData(prev => ({
      ...prev,
      companyDetails: {
        businessType: formData.businessType,
        industryType: formData.industryType,
        yearOfEstablishment: formData.yearOfEstablishment,
        gstNumber: formData.gstNumber,
        panNumber: formData.panNumber,
        gstCertificate: formData.gstCertificate,
        panCertificate: formData.panCertificate,
      }
    }));
    navigate("/Form3");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const requiredFields = [
      "businessType",
      "industryType",
      "yearOfEstablishment",
      "gstNumber",
      "panNumber"
    ];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") {
        alert("Please fill the field: " + field);
        setIsSubmitting(false);
        return;
      }
    }

    // Additional validation for Year of Establishment
    const year = parseInt(formData.yearOfEstablishment, 10);
    if (isNaN(year) || formData.yearOfEstablishment.length !== 4) {
      alert("Please enter a valid Year of Establishment (YYYY).");
      setIsSubmitting(false);
      return;
    }
    if (year > currentYear) {
      alert("Year of Establishment cannot be in the future.");
      setIsSubmitting(false);
      return;
    }

    // Validate GSTIN format
    const gstValidation = validateGSTIN(formData.gstNumber);
    if (!gstValidation.isValid) {
      alert(`Invalid GSTIN: ${gstValidation.error}`);
      setGstinErrors({ gstNumber: gstValidation.error });
      setIsSubmitting(false);
      return;
    }

    // Validate PAN format
    const panValidation = validatePAN(formData.panNumber);
    if (!panValidation.isValid) {
      alert(`Invalid PAN: ${panValidation.error}`);
      setPanErrors({ panNumber: panValidation.error });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    handleNext();
  };


  return (
    <div className="flex min-h-screen bg-white">
       {showSaveIndicator && (
        <div className="fixed top-5 right-5 bg-green-600 text-white py-2 px-4 rounded shadow z-50">
          Changes saved successfully!
        </div>
      )}
      {/* Left Sidebar */}
      <SidebarContent />

      {/* Right Content */}
      <div className="flex-1 flex flex-col">
        {/* Step Indicator */}
        <StepIndicator currentStep={2} />

        {/* Form Content */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Business Details
          </h1>

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">
            {/* Business Information Section */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Business Type</h3>
                  <p className="text-xs text-gray-500">select your business type</p>
                </div>
                <div className="w-full md:w-2/3">
                  <SearchableSelect
                    required
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    options={FLAT_BUSINESS_TYPES}
                    placeholder="Select Business Type"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Industry Type</h3>
                  <p className="text-xs text-gray-500">select your industry type</p>
                </div>
                <div className="w-full md:w-2/3">
                  <SearchableSelect
                    required
                    name="industryType"
                    value={formData.industryType}
                    onChange={handleInputChange}
                    options={FLAT_INDUSTRY_TYPES}
                    placeholder="Select Industry Type"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3"></div>
                <div className="w-full md:w-2/3">
                  <input
                    required
                  type="number"
                    name="yearOfEstablishment"
                    value={formData.yearOfEstablishment}
                    onChange={handleInputChange}
                  placeholder="Year of establishment (YYYY)"
                  min="1900"
                  max={currentYear}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">GST Number</h3>
                  <p className="text-xs text-gray-500">enter your GST number</p>
                </div>
                <div className="w-full md:w-2/3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        required
                        type="text"
                        name="gstNumber"
                        value={formData.gstNumber || ""}
                        onChange={handleInputChange}
                        placeholder="GST number (15 characters)"
                        maxLength="15"
                        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                          gstinErrors.gstNumber
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-emerald-500'
                        } bg-white`}
                      />
                      {gstinErrors.gstNumber && (
                        <p className="mt-1 text-xs text-red-500">{gstinErrors.gstNumber}</p>
                      )}
                    </div>
                    <input type="file" name="gstCertificate" id="gstCertificate" onChange={handleFileChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => document.getElementById('gstCertificate').click()}
                      className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      {formData.gstCertificate
                        ? formData.gstCertificate.uploading
                          ? "Uploading..."
                          : "Uploaded"
                        : "Upload"}
                    </button>
                  </div>
                  {formData.gstCertificate && 
                    <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                      <span>{formData.gstCertificate.name}</span>
                      <button type="button" onClick={() => handleDeleteFile('gstCertificate')} className="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  }
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">PAN Number</h3>
                  <p className="text-xs text-gray-500">enter your PAN number</p>
                </div>
                <div className="w-full md:w-2/3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        required
                        type="text"
                        name="panNumber"
                        value={formData.panNumber || ""}
                        onChange={handleInputChange}
                        placeholder="PAN number (10 characters)"
                        maxLength="10"
                        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                          panErrors.panNumber
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-emerald-500'
                        } bg-white`}
                      />
                      {panErrors.panNumber && (
                        <p className="mt-1 text-xs text-red-500">{panErrors.panNumber}</p>
                      )}
                    </div>
                    <input type="file" name="panCertificate" id="panCertificate" onChange={handleFileChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => document.getElementById('panCertificate').click()}
                      className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                     {formData.panCertificate
                       ? formData.panCertificate.uploading
                         ? "Uploading..."
                         : "Uploaded"
                       : "Upload"}
                    </button>
                  </div>
                  {formData.panCertificate &&
                    <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                      <span>{formData.panCertificate.name}</span>
                      <button type="button" onClick={() => handleDeleteFile('panCertificate')} className="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  }
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handlePrevious}
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
