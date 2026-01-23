
import React, { useState, useEffect, useContext } from "react";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/fileUpload";
import StepIndicator from "./StepIndicator";
import SidebarContent from "./SidebarContent";

export default function Form5() {
  const navigate = useNavigate();
  const { vendorData, setVendorData, currentUser: vendorContextUser } = useContext(VendorContext);
  const { currentUser } = useContext(UserContext) || {};
  const [userEmail, setUserEmail] = useState(null);

  const [formData, setFormData] = useState({
    hasCertifications: vendorData.complianceCertifications.hasCertifications || false,
    uploadDocument: vendorData.complianceCertifications.uploadDocument || null,
    isoCertificate: vendorData.complianceCertifications.isoCertificate || null,
    healthSafetyStandards: vendorData.complianceCertifications.healthSafetyStandards || "",
  });

  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user email from API as a fallback
  useEffect(() => {
<<<<<<< Updated upstream
    if (currentUser) {
      const savedData = sessionStorage.getItem(`form5Data_${currentUser.id}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
        setVendorData(prev => ({
          ...prev,
          complianceCertifications: parsedData
        }));
=======
    const fetchUserEmail = async () => {
      try {
        // First try from context
        if (vendorContextUser?.email) {
          console.log('[FORM5_USER_FROM_CONTEXT]', vendorContextUser.email);
          setUserEmail(vendorContextUser.email);
          return;
        }

        // Fallback: Fetch from API
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.log('[FORM5_NO_TOKEN] No auth token found');
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
            console.log('[FORM5_USER_FROM_API]', fetchedEmail);
            setUserEmail(fetchedEmail);
          }
        } else {
          console.log('[FORM5_API_FETCH_FAILED]', response.status);
        }
      } catch (error) {
        console.error('[FORM5_FETCH_USER_ERROR]', error);
>>>>>>> Stashed changes
      }
    };

    fetchUserEmail();
  }, [vendorContextUser]);

  const handleInputChange = async (e) => {
    const { name, value, files } = e.target;
    if (name === "hasCertifications") {
      setFormData(prev => ({ ...prev, [name]: value === "yes" }));
    } else if (files) {
      const file = files[0];
      console.log(`[FORM5_FILE_SELECTED] ${name}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        userEmail,
        timestamp: new Date().toISOString()
      });

      setFormData(prev => ({ ...prev, [name]: { file, name: file.name, uploading: true } }));

      try {
        if (!userEmail) {
          console.error('[FORM5_ERROR] User email not available');
          throw new Error('User email not available. Please refresh and try again.');
        }

        const section = "complianceCertifications";
        console.log(`[FORM5_UPLOAD_START] Uploading ${name} for ${userEmail}`);
        
        const response = await uploadFileToS3(file, userEmail, name, section);
        
        console.log(`[FORM5_UPLOAD_RESPONSE_RECEIVED] ${name}:`, response);

        const uploadedUrl = response?.data?.url;
        if (!uploadedUrl) {
          console.error(`[FORM5_ERROR] No URL in response for ${name}:`, response);
          throw new Error('No file URL returned from server. Please check the upload response.');
        }

        console.log(`[FORM5_UPLOAD_SUCCESS] ${name} uploaded to: ${uploadedUrl}`);

        setFormData(prev => ({
          ...prev,
          [name]: {
            file,
            name: file.name,
            url: uploadedUrl,
            uploading: false
          },
        }));

        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 3000);
      } catch (error) {
        console.error(`[FORM5_UPLOAD_ERROR] ${name}:`, error);
        setFormData(prev => ({ ...prev, [name]: null }));
        alert(`Failed to upload file: ${error.message}. Please try again.`);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDeleteFile = async (fieldName) => {
    try {
      if (formData[fieldName]?.url && userEmail) {
        await deleteFileFromS3(userEmail, fieldName, "complianceCertifications");
      }
      setFormData(prev => ({ ...prev, [fieldName]: null }));
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 3000);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handlePrevious = () => navigate("/Form4");

  const handleNext = () => {
    if (currentUser) {
      sessionStorage.setItem(`form5Data_${currentUser.id}`, JSON.stringify(formData));
    }
    setVendorData(prev => ({
      ...prev,
      complianceCertifications: {
        hasCertifications: formData.hasCertifications,
        uploadDocument: formData.uploadDocument ? {
          url: formData.uploadDocument.url,
          originalName: formData.uploadDocument.name,
          contentType: formData.uploadDocument.file?.type,
          file: formData.uploadDocument.file
        } : null,
        isoCertificate: formData.isoCertificate ? {
          url: formData.isoCertificate.url,
          originalName: formData.isoCertificate.name,
          contentType: formData.isoCertificate.file?.type,
          file: formData.isoCertificate.file
        } : null,
        healthSafetyStandards: formData.healthSafetyStandards,
      }
    }));
    navigate("/Form6");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (formData.hasCertifications == null) {
      alert("Please specify if you have certifications");
      setIsSubmitting(false);
      return;
    }
    if (formData.hasCertifications) {
      if (!formData.uploadDocument?.url) {
        alert("Please upload the document");
        setIsSubmitting(false);
        return;
      }
      if (!formData.isoCertificate?.url) {
        alert("Please upload the ISO certificate");
        setIsSubmitting(false);
        return;
      }
      if (!formData.healthSafetyStandards.trim()) {
        alert("Please fill the health and safety standards");
        setIsSubmitting(false);
        return;
      }
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
        <StepIndicator currentStep={5} />

        {/* Form Content */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Compliance and Certifications
          </h1>

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">
            {/* Certifications Question */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Certifications</label>
                  <p className="text-xs text-gray-500">Do you have necessary certifications/licenses?</p>
                </div>
                <div className="w-full md:w-2/3">
                  <div className="flex gap-8">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="hasCertifications" value="yes" checked={formData.hasCertifications === true} onChange={handleInputChange} />
                      Yes
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="hasCertifications" value="no" checked={formData.hasCertifications === false} onChange={handleInputChange} />
                      No
                    </label>
                  </div>
                </div>
              </div>

              {/* Conditional Certificate Upload - Only if hasCertifications is true */}
              {formData.hasCertifications && (
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-full md:w-1/3">
                    <label className="text-sm font-semibold text-gray-900 block mb-1">Certificate Upload</label>
                    <p className="text-xs text-gray-500">provide certification document</p>
                  </div>
                  <div className="w-full md:w-2/3">
                    <div onClick={() => !formData.certificateUpload && document.getElementById("certificateUpload").click()} className="cursor-pointer border border-gray-300 rounded px-3 py-2 text-sm hover:border-emerald-500 transition-colors">
                      <input type="file" name="certificateUpload" id="certificateUpload" onChange={handleInputChange} style={{ display: "none" }} />
                      {formData.certificateUpload ? (
                        <div>
                          <div className="text-sm">{formData.certificateUpload.name}</div>
                          <div className="text-xs text-green-600">{formData.certificateUpload.uploading ? "Uploading..." : "Uploaded"}</div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteFile("certificateUpload"); }} className="text-red-500 text-sm mt-1">Delete</button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Click to upload certificate</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Document */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Upload Document</label>
                  <p className="text-xs text-gray-500">provide document</p>
                </div>
                <div className="w-full md:w-2/3">
                  <div onClick={() => !formData.uploadDocument && document.getElementById("uploadDocument").click()} className="cursor-pointer border border-gray-300 rounded px-3 py-2 text-sm hover:border-emerald-500 transition-colors">
                    <input type="file" name="uploadDocument" id="uploadDocument" onChange={handleInputChange} style={{ display: "none" }} />
                    {formData.uploadDocument ? (
                      <div>
                        <div className="text-sm">{formData.uploadDocument.name}</div>
                        <div className="text-xs text-green-600">{formData.uploadDocument.uploading ? "Uploading..." : "Uploaded"}</div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteFile("uploadDocument"); }} className="text-red-500 text-sm mt-1">Delete</button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Click to upload document</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ISO Certificate */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">ISO Certificate</label>
                  <p className="text-xs text-gray-500">provide ISO certificate</p>
                </div>
                <div className="w-full md:w-2/3">
                  <div onClick={() => !formData.isoCertificate && document.getElementById("isoCertificate").click()} className="cursor-pointer border border-gray-300 rounded px-3 py-2 text-sm hover:border-emerald-500 transition-colors">
                    <input type="file" name="isoCertificate" id="isoCertificate" onChange={handleInputChange} style={{ display: "none" }} />
                    {formData.isoCertificate ? (
                      <div>
                        <div className="text-sm">{formData.isoCertificate.name}</div>
                        <div className="text-xs text-green-600">{formData.isoCertificate.uploading ? "Uploading..." : "Uploaded"}</div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteFile("isoCertificate"); }} className="text-red-500 text-sm mt-1">Delete</button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Click to upload ISO Certificate</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Health and Safety Standards - Always visible */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Health and Safety Standards</label>
                  <p className="text-xs text-gray-500">provide health and safety standards</p>
                </div>
                <div className="w-full md:w-2/3">
                  <textarea
                    required
                    name="healthSafetyStandards"
                    value={formData.healthSafetyStandards}
                    onChange={handleInputChange}
                    placeholder="Health and safety standards you take"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    rows={4}
                  />
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