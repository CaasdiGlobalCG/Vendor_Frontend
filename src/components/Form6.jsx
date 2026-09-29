import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { VendorContext } from '../context/VendorContext';
import KycFormShell from './KycFormShell';
import ResubmitBanner from './ResubmitBanner';
import config from '../config/env';
import { resolveUserEmail } from '../utils/resolveUserIdentity';
import { isResubmitMode, isSectionEditable } from '../utils/resubmitPermissions';
import { clearKycStep, getKycMaxStep, setKycStep } from './KycFormGuard';

export default function Form6() {
  const navigate = useNavigate();
  const vendorContext = useContext(VendorContext);
  const { vendorData, setVendorData, currentUser } = vendorContext;
  // Resubmit gating: Form6 renders the 'additional' KYC section. When the auditor
  // requested resubmission and didn't grant this section, the fields are read-only.
  const isResubmit = isResubmitMode(currentUser);
  const sectionReadOnly = isResubmit && !isSectionEditable(currentUser, 'additional');

  const [formData, setFormData] = useState({
    clientReferences: vendorData.additionalDetails.clientReferences || '',
    specialInstructions: vendorData.additionalDetails.specialInstructions || '',
    additionalDocument: vendorData.additionalDetails.additionalDocument || null,
    acknowledgment: vendorData.additionalDetails.acknowledgment || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) return;
    const savedData = localStorage.getItem(`form6Data_${currentUser.email}`);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
      } catch {}
    }
  }, [currentUser]);

  // Auto-save on every change
  useEffect(() => {
    if (currentUser?.email) {
      const { additionalDocument, ...saveable } = formData;
      localStorage.setItem(`form6Data_${currentUser.email}`, JSON.stringify({
        ...saveable,
        additionalDocument: additionalDocument?.name ? { name: additionalDocument.name } : null,
      }));
    }
  }, [formData, currentUser]);

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
    setKycStep(5, currentUser?.email);
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

    const stripFileObjects = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(stripFileObjects);
      const result = {};
      for (const [key, val] of Object.entries(obj)) {
        if (key === 'file') continue;
        result[key] = stripFileObjects(val);
      }
      return result;
    };

    const handoffEmail = sessionStorage.getItem('vendorHandoffEmail');
    let userEmail = vendorData.vendorDetails?.primaryContactEmail
      || vendorContext.currentUser?.email
      || handoffEmail;

    // Cookie-auth fallback — handoff logins have no Cognito/localStorage token,
    // but the session cookie still authenticates the API
    // (/api/vendor/me → vendorHandoffEmail → /api/auth/verify).
    if (!userEmail) {
      try {
        userEmail = await resolveUserEmail();
      } catch (error) {
        console.warn('Form6: resolveUserEmail fallback failed', error);
      }
    }

    // Legacy Cognito session last — it may belong to a different account if the
    // user arrived via client→vendor handoff without a fresh Cognito login.
    if (!userEmail) {
      try {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        userEmail = cognitoUser?.attributes?.email || cognitoUser?.username || '';
        if (userEmail) sessionStorage.setItem('vendorHandoffEmail', userEmail);
      } catch (error) {
        console.warn('Form6: unable to resolve the authenticated user email', error);
      }
    }

    if (!userEmail) {
      alert('User email not found. Please ensure you are logged in and have filled out the vendor details form.');
      setIsSubmitting(false);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('email', userEmail);

    const complianceCertificationsForJson = stripFileObjects(vendorData.complianceCertifications);

    formDataToSend.append('vendorDetails', JSON.stringify({ ...vendorData.vendorDetails, primaryContactEmail: userEmail }));
    formDataToSend.append('companyDetails', JSON.stringify(vendorData.companyDetails));
    formDataToSend.append('serviceProductDetails', JSON.stringify(stripFileObjects(vendorData.serviceProductDetails)));
    formDataToSend.append('bankDetails', JSON.stringify(vendorData.bankDetails));
    formDataToSend.append('complianceCertifications', JSON.stringify(complianceCertificationsForJson));
    const additionalDetailsForJson = { ...formData, additionalDocument: formData.additionalDocument?.name ? { name: formData.additionalDocument.name } : (formData.additionalDocument?.url ? { url: formData.additionalDocument.url, name: formData.additionalDocument.name } : null) };
    formDataToSend.append('additionalDetails', JSON.stringify(additionalDetailsForJson));

    if (formData.additionalDocument) {
      formDataToSend.append('additionalDocument', formData.additionalDocument);
    }

    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/submit`, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok) {
        sessionStorage.removeItem('vendorHandoffEmail');
        clearKycStep(userEmail);
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
    /* Shared KYC shell: black step rail + light content area (design only) */
    <KycFormShell
      currentStep={6}
      maxStep={getKycMaxStep(currentUser?.email)}
      onStepSelect={(n) => { setKycStep(n, currentUser?.email); navigate(`/Form${n}`); }}
      title="Additional Details"
      subtitle="A few last details before you review and submit your profile."
    >
          <ResubmitBanner sectionKey="additional" />

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">
            <div className={sectionReadOnly ? 'pointer-events-none select-none opacity-60' : undefined}>
            <fieldset disabled={sectionReadOnly} className="contents space-y-8">
            {/* Form Fields */}
            <div className="space-y-6">
              {/* Client References */}
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 kyc-card kyc-fade-up">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label className="text-sm font-semibold text-neutral-900 block mb-1">Client References</label>
                  <p className="text-xs text-neutral-500">provide client references</p>
                </div>
                <div className="grid w-full gap-4 sm:grid-cols-2">
                  <textarea
                    name="clientReferences"
                    value={formData.clientReferences}
                    onChange={handleInputChange}
                    className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Special Instructions */}
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 kyc-card kyc-fade-up">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label className="text-sm font-semibold text-neutral-900 block mb-1">Special Instructions</label>
                  <p className="text-xs text-neutral-500">provide special instructions or notes</p>
                </div>
                <div className="grid w-full gap-4 sm:grid-cols-2">
                  <textarea
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleInputChange}
                    className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Additional Document */}
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 kyc-card kyc-fade-up">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label className="text-sm font-semibold text-neutral-900 block mb-1">Additional Document</label>
                  <p className="text-xs text-neutral-500">provide additional document</p>
                </div>
                <div className="grid w-full gap-4 sm:grid-cols-2">
                  {formData.additionalDocument ? (
                    <div className="border border-neutral-200 rounded px-3 py-2">
                      <div className="text-sm">{formData.additionalDocument.name}</div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile("additionalDocument")}
                        className="text-danger text-sm mt-1 hover:text-danger"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer border border-neutral-200 rounded px-3 py-2 text-sm hover:border-neutral-200 transition-colors block">
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
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 kyc-card kyc-fade-up">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label className="text-sm font-semibold text-neutral-900 block mb-1">Acknowledgment</label>
                  <p className="text-xs text-neutral-500">confirm agreement</p>
                </div>
                <div className="grid w-full gap-4 sm:grid-cols-2">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="acknowledgment"
                      checked={formData.acknowledgment}
                      onChange={handleInputChange}
                      required
                      className="mt-1 h-4 w-4 text-neutral-900 border-neutral-200 rounded focus:ring-neutral-900"
                    />
                    <span className="text-sm text-neutral-900 leading-relaxed">
                      I, the undersigned, hereby confirm that the details provided are accurate and true to the best of my knowledge. I agree to abide by the policies and terms set by{" "}
                      <span className="font-semibold text-neutral-900">
                        Caasdi Global
                      </span>
                      .
                    </span>
                  </label>
                </div>
              </div>
            </div>
            </fieldset>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handlePrevious}
                className="px-8 py-3 text-neutral-500 hover:text-neutral-900 transition-colors"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-lg font-medium  focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all ${
                  isSubmitting 
                    ? 'bg-neutral-900 cursor-not-allowed text-white' 
                    : 'text-white bg-black hover:from-black/90 hover:to-black/90'
                }`}
              >
                {isSubmitting ? 'Submitting...' : (isResubmit ? 'Resubmit' : 'Submit')}
              </button>
            </div>
          </form>
    </KycFormShell>
  );
}