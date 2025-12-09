import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../context/VendorContext';
import StepIndicator from './StepIndicator';
import SidebarContent from './SidebarContent';
import config from '../config/env';

export default function Form6() {
  const navigate = useNavigate();
  const vendorContext = useContext(VendorContext);
  const { vendorData, setVendorData } = vendorContext;

  const [formData, setFormData] = useState({
    clientReferences: vendorData.additionalDetails.clientReferences || '',
    specialInstructions: vendorData.additionalDetails.specialInstructions || '',
    additionalDocument: vendorData.additionalDetails.additionalDocument || null,
    acknowledgment: vendorData.additionalDetails.acknowledgment || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem("form6Data");
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setFormData(parsedData);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDeleteFile = (fieldName) => {
    setFormData(prev => ({ ...prev, [fieldName]: null }));
  };

  const handlePrevious = () => {
    navigate("/Form5");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.acknowledgment) {
      alert('Please acknowledge the terms before submitting.');
      return;
    }

    setIsSubmitting(true);
    setVendorData(prev => ({ ...prev, additionalDetails: formData }));

    const userEmail = vendorData.vendorDetails?.primaryContactEmail || (vendorContext.currentUser?.email);

    if (!userEmail) {
      alert('User email not found. Please ensure you are logged in and have filled out the vendor details form.');
      setIsSubmitting(false);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('email', userEmail);

    const complianceCertificationsForJson = { ...vendorData.complianceCertifications };
    if (complianceCertificationsForJson.uploadDocument) {
      complianceCertificationsForJson.uploadDocument = {
        url: complianceCertificationsForJson.uploadDocument.url,
        originalName: complianceCertificationsForJson.uploadDocument.originalName,
        contentType: complianceCertificationsForJson.uploadDocument.contentType
      };
    }
    if (complianceCertificationsForJson.isoCertificate) {
      complianceCertificationsForJson.isoCertificate = {
        url: complianceCertificationsForJson.isoCertificate.url,
        originalName: complianceCertificationsForJson.isoCertificate.originalName,
        contentType: complianceCertificationsForJson.isoCertificate.contentType
      };
    }

    formDataToSend.append('vendorDetails', JSON.stringify({ ...vendorData.vendorDetails, primaryContactEmail: userEmail }));
    formDataToSend.append('companyDetails', JSON.stringify(vendorData.companyDetails));
    formDataToSend.append('serviceProductDetails', JSON.stringify(vendorData.serviceProductDetails));
    formDataToSend.append('bankDetails', JSON.stringify(vendorData.bankDetails));
    formDataToSend.append('complianceCertifications', JSON.stringify(complianceCertificationsForJson));
    formDataToSend.append('additionalDetails', JSON.stringify(formData));

    if (formData.additionalDocument) {
      formDataToSend.append('additionalDocument', formData.additionalDocument);
    }

    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/submit`, {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        setVendorData({
          vendorDetails: {},
          companyDetails: {},
          serviceProductDetails: {},
          bankDetails: {},
          complianceCertifications: {},
          additionalDetails: {},
        });
        navigate('/Auditorapprove');
      } else {
        alert(`Submission failed: ${result.message}`);
      }
    } catch (error) {
      alert('Error submitting form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <SidebarContent />

      {/* Right Content */}
      <div className="flex-1 flex flex-col">
        {/* Step Indicator */}
        <StepIndicator currentStep={6} />

        {/* Form Content */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Additional Details
          </h1>

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">
            {/* Form Fields */}
            <div className="space-y-6">
              {/* Client References */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Client References</label>
                  <p className="text-xs text-gray-500">provide client references</p>
                </div>
                <div className="w-full md:w-2/3">
                  <textarea
                    name="clientReferences"
                    value={formData.clientReferences}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Special Instructions */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Special Instructions</label>
                  <p className="text-xs text-gray-500">provide special instructions or notes</p>
                </div>
                <div className="w-full md:w-2/3">
                  <textarea
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Additional Document */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Additional Document</label>
                  <p className="text-xs text-gray-500">provide additional document</p>
                </div>
                <div className="w-full md:w-2/3">
                  {formData.additionalDocument ? (
                    <div className="border border-gray-300 rounded px-3 py-2">
                      <div className="text-sm">{formData.additionalDocument.name}</div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile("additionalDocument")}
                        className="text-red-500 text-sm mt-1 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer border border-gray-300 rounded px-3 py-2 text-sm hover:border-emerald-500 transition-colors block">
                      Click to upload additional document
                      <input
                        type="file"
                        name="additionalDocument"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Acknowledgment</label>
                  <p className="text-xs text-gray-500">confirm agreement</p>
                </div>
                <div className="w-full md:w-2/3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="acknowledgment"
                      checked={formData.acknowledgment}
                      onChange={handleInputChange}
                      required
                      className="mt-1 h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700 leading-relaxed">
                      I, the undersigned, hereby confirm that the details provided are accurate and true to the best of my knowledge. I agree to abide by the policies and terms set by{" "}
                      <span className="font-semibold text-emerald-700">
                        Caasdi Global
                      </span>
                      .
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handlePrevious}
                className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-lg font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'text-white bg-gradient-to-r from-[#0F5848] to-[#21BE9C] hover:from-[#0F5848]/90 hover:to-[#21BE9C]/90'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}