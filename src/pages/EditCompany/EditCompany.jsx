import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { VendorContext } from "../../context/VendorContext";
import {
  Download,
  Award,
  Share2,
  Settings,
  ArrowLeft,
  Upload,
  X as CloseIcon
} from "lucide-react";
import config from '../../config/env';

export default function EditCompany() {
  const navigate = useNavigate();
  const { currentUser, vendorData, setVendorData } = useContext(VendorContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Form data state
  const [formData, setFormData] = useState({
    industryType: "",
    segments: [],
    yearOfEstablishment: "",
    visionAndMission: "",
    companyOverview: "",
    industryOverview: "",
    coreValues: [],
    certifications: [],
    teamSize: "",
    uniqueSellingProposition: "",
    socialImpact: ""
  });

  // New segment and core value inputs
  const [newSegment, setNewSegment] = useState("");
  const [newCoreValue, setNewCoreValue] = useState("");
  
  // File uploads
  const [certificationFiles, setCertificationFiles] = useState([]);

  // Fetch company data on component mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          setError("Not authenticated. Please log in again.");
          setLoading(false);
          return;
        }

        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Vendor data response:", data);

        if (data.success && data.data) {
          const vendor = data.data;
          
          // Update the vendor data in context
          setVendorData(prevData => ({
            ...prevData,
            vendorDetails: vendor.vendorDetails || {},
            companyDetails: vendor.companyDetails || {},
            serviceProductDetails: vendor.serviceProductDetails || {},
            bankDetails: vendor.bankDetails || {},
            complianceCertifications: vendor.complianceCertifications || {},
            additionalDetails: vendor.additionalDetails || {}
          }));
          
          // Set form data from vendor data
          setFormData({
            industryType: vendor.companyDetails?.industryType || "",
            segments: vendor.companyDetails?.segments || [],
            yearOfEstablishment: vendor.companyDetails?.yearOfEstablishment || "",
            visionAndMission: vendor.companyDetails?.visionAndMission || "",
            companyOverview: vendor.companyDetails?.companyOverview || "",
            industryOverview: vendor.companyDetails?.industryOverview || "",
            coreValues: vendor.companyDetails?.coreValues || [],
            certifications: vendor.companyDetails?.certifications || [],
            teamSize: vendor.companyDetails?.teamSize || "",
            uniqueSellingProposition: vendor.companyDetails?.uniqueSellingProposition || "",
            socialImpact: vendor.companyDetails?.socialImpact || ""
          });
        } else {
          setError("No vendor data found");
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        setError("Failed to fetch vendor data");
        setLoading(false);
      }
    };
    
    fetchCompanyData();
  }, [currentUser, setVendorData]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle adding a new segment
  const handleAddSegment = () => {
    if (newSegment.trim() !== "") {
      setFormData(prev => ({
        ...prev,
        segments: [...prev.segments, newSegment.trim()]
      }));
      setNewSegment("");
    }
  };

  // Handle removing a segment
  const handleRemoveSegment = (index) => {
    setFormData(prev => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index)
    }));
  };

  // Handle adding a new core value
  const handleAddCoreValue = () => {
    if (newCoreValue.trim() !== "") {
      setFormData(prev => ({
        ...prev,
        coreValues: [...prev.coreValues, newCoreValue.trim()]
      }));
      setNewCoreValue("");
    }
  };

  // Handle removing a core value
  const handleRemoveCoreValue = (index) => {
    setFormData(prev => ({
      ...prev,
      coreValues: prev.coreValues.filter((_, i) => i !== index)
    }));
  };

  // Handle certification file upload
  const handleCertificationUpload = (e) => {
    const files = Array.from(e.target.files);
    setCertificationFiles(prev => [...prev, ...files]);
  };

  // Handle removing a certification file
  const handleRemoveCertificationFile = (index) => {
    setCertificationFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Create FormData object for the API call
      const formDataToSend = new FormData();
      
      // Add company details
      formDataToSend.append('companyDetails', JSON.stringify({
        ...formData,
        // Add any additional fields needed
      }));
      
      // Add certification files
      certificationFiles.forEach(file => {
        formDataToSend.append('certifications', file);
      });
      
      // Add email for identification
      formDataToSend.append('vendorDetails', JSON.stringify({
        primaryContactEmail: currentUser?.email
      }));
      
      // Send update to backend
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-company`, {
        method: 'POST',
        body: formDataToSend
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Company update result:", result);
      
      // Update vendor data in context
      setVendorData(prevData => ({
        ...prevData,
        companyDetails: {
          ...prevData.companyDetails,
          ...formData
        }
      }));
      
      setSuccessMessage("Company details updated successfully!");
      setTimeout(() => {
        navigate("/home");
      }, 2000);
    } catch (error) {
      console.error("Error updating company details:", error);
      setError(`Failed to update company details: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-800 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading company data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-12">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#095B49] to-[#000000] text-white rounded-xl p-4 relative rounded-b-lg" style={{ height: "120px" }}>
        <div className="absolute top-2 left-4 text-xs text-white/80">
          GSTIN: {vendorData?.companyDetails?.taxIdentificationNumber || "Not provided"}
        </div>

        {/* Top right icons */}
        <div className="absolute top-4 right-4 flex items-center gap-4">
          <Award className="w-5 h-5 text-yellow-400" />
          <button>
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button>
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex items-center mt-8">
          <button 
            onClick={handleCancel}
            className="flex items-center text-white hover:text-emerald-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Profile
          </button>
          <h1 className="text-xl font-bold ml-4">Edit Company Details</h1>
          <button
            type="button"
            onClick={() => navigate(`/VendorDashboard/support?module=vendor&ref=${encodeURIComponent(currentUser?.vendorId || currentUser?.id || vendorData?.vendorId || vendorData?.id || '')}`)}
            className="ml-auto inline-flex items-center rounded-md border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Account Support
          </button>
        </div>
      </section>

      {/* Form Section */}
      <div className="max-w-4xl mx-auto mt-8 bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p>{successMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Industry Type */}
          <div>
            <label htmlFor="industryType" className="block text-sm font-medium text-gray-700 mb-1">
              Industry Type
            </label>
            <select
              id="industryType"
              name="industryType"
              value={formData.industryType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select Industry Type</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Finance">Finance</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Segments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Segments
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.segments.map((segment, index) => (
                <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <span>{segment}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSegment(index)}
                    className="ml-2 text-gray-500 hover:text-red-500"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value)}
                placeholder="Add a segment"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddSegment}
                className="bg-emerald-800 text-white px-4 py-2 rounded-r-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Add
              </button>
            </div>
          </div>

          {/* Year of Establishment */}
          <div>
            <label htmlFor="yearOfEstablishment" className="block text-sm font-medium text-gray-700 mb-1">
              Year of Establishment
            </label>
            <input
              type="text"
              id="yearOfEstablishment"
              name="yearOfEstablishment"
              value={formData.yearOfEstablishment}
              onChange={handleInputChange}
              placeholder="e.g., 25th March, 1990"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Vision and Mission */}
          <div>
            <label htmlFor="visionAndMission" className="block text-sm font-medium text-gray-700 mb-1">
              Vision and Mission
            </label>
            <textarea
              id="visionAndMission"
              name="visionAndMission"
              value={formData.visionAndMission}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Describe your company's vision and mission"
            />
          </div>

          {/* Company Overview */}
          <div>
            <label htmlFor="companyOverview" className="block text-sm font-medium text-gray-700 mb-1">
              Company Overview
            </label>
            <textarea
              id="companyOverview"
              name="companyOverview"
              value={formData.companyOverview}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Provide an overview of your company"
            />
          </div>

          {/* Industry Overview */}
          <div>
            <label htmlFor="industryOverview" className="block text-sm font-medium text-gray-700 mb-1">
              Industry Overview
            </label>
            <textarea
              id="industryOverview"
              name="industryOverview"
              value={formData.industryOverview}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Provide an overview of your industry"
            />
          </div>

          {/* Core Values */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Core Values
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.coreValues.map((value, index) => (
                <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <span>{value}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCoreValue(index)}
                    className="ml-2 text-gray-500 hover:text-red-500"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                value={newCoreValue}
                onChange={(e) => setNewCoreValue(e.target.value)}
                placeholder="Add a core value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddCoreValue}
                className="bg-emerald-800 text-white px-4 py-2 rounded-r-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Add
              </button>
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certifications
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.certifications.map((cert, index) => (
                <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                  {cert.name || "Certificate"}
                </div>
              ))}
              {certificationFiles.map((file, index) => (
                <div key={`new-${index}`} className="bg-emerald-100 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCertificationFile(index)}
                    className="ml-2 text-gray-500 hover:text-red-500"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <label htmlFor="certifications" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md transition-colors flex items-center w-fit">
                <Upload className="w-4 h-4 mr-2" />
                Upload Certifications
                <input
                  id="certifications"
                  type="file"
                  multiple
                  onChange={handleCertificationUpload}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">Upload certification documents (PDF, JPG, PNG)</p>
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">
              Team Size
            </label>
            <textarea
              id="teamSize"
              name="teamSize"
              value={formData.teamSize}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Describe your team size and global presence"
            />
          </div>

          {/* Unique Selling Proposition */}
          <div>
            <label htmlFor="uniqueSellingProposition" className="block text-sm font-medium text-gray-700 mb-1">
              Unique Selling Proposition
            </label>
            <textarea
              id="uniqueSellingProposition"
              name="uniqueSellingProposition"
              value={formData.uniqueSellingProposition}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="What makes your company unique?"
            />
          </div>

          {/* Social Impact/ECG Focus */}
          <div>
            <label htmlFor="socialImpact" className="block text-sm font-medium text-gray-700 mb-1">
              Social Impact/ECG Focus
            </label>
            <textarea
              id="socialImpact"
              name="socialImpact"
              value={formData.socialImpact}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Describe your company's social impact initiatives"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-l from-[#095B49] to-[#000000] text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-opacity flex items-center"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}