
import React, { useState, useEffect, useContext } from "react";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/fileUpload";
import StepIndicator from "./StepIndicator";
import SidebarContent from "./SidebarContent";

export default function Form5() {
  const navigate = useNavigate();
  const { vendorData, setVendorData } = useContext(VendorContext);
  const { currentUser } = useContext(UserContext) || {};

  const [formData, setFormData] = useState({
    hasCertifications: vendorData.complianceCertifications.hasCertifications || false,
    uploadDocument: vendorData.complianceCertifications.uploadDocument || null,
    isoCertificate: vendorData.complianceCertifications.isoCertificate || null,
    healthSafetyStandards: vendorData.complianceCertifications.healthSafetyStandards || "",
  });

  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const savedData = localStorage.getItem(`form5Data_${currentUser.id}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
        setVendorData(prev => ({
          ...prev,
          complianceCertifications: parsedData
        }));
      }
    }
  }, [currentUser, setVendorData]);

  const handleInputChange = async (e) => {
    const { name, value, files } = e.target;
    if (name === "hasCertifications") {
      setFormData(prev => ({ ...prev, [name]: value === "yes" }));
    } else if (files) {
      const file = files[0];
      setFormData(prev => ({ ...prev, [name]: { file, name: file.name, uploading: true } }));

      try {
        if (currentUser?.email) {
          const section = "complianceCertifications";
          const response = await uploadFileToS3(file, currentUser.email, name, section);

          setFormData(prev => ({
            ...prev,
            [name]: {
              file,
              name: file.name,
              url: response.data.url,
              uploading: false
            },
          }));

          setShowSaveIndicator(true);
          setTimeout(() => setShowSaveIndicator(false), 3000);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setFormData(prev => ({ ...prev, [name]: null }));
        alert(`Failed to upload file: ${error.message}. Please try again.`);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDeleteFile = async (fieldName) => {
    try {
      if (formData[fieldName]?.url && currentUser?.email) {
        await deleteFileFromS3(currentUser.email, fieldName, "complianceCertifications");
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
      localStorage.setItem(`form5Data_${currentUser.id}`, JSON.stringify(formData));
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
    }
    if (!formData.healthSafetyStandards.trim()) {
      alert("Please fill the health and safety standards");
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

              {/* Health and Safety Standards */}
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