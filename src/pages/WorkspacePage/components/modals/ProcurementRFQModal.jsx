import React, { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Send, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';

const TOTAL_STEPS = 6;

const INITIAL_FORM = {
  productDetails: {
    title: '',
    category: '',
    productName: '',
    productDescription: '',
    technicalSpecifications: '',
    brandPreference: ''
  },
  quantityPricing: {
    quantity: '',
    quantityUnit: 'units',
    budgetMin: '',
    budgetMax: '',
    currency: 'INR',
    pricingType: 'negotiable'
  },
  tradeLogistics: {
    incoterm: 'EXW',
    deliveryLocation: '',
    requiredByDate: '',
    shippingMethod: 'road',
    packagingRequirements: ''
  },
  supplierRequirements: {
    minimumExperienceYears: '',
    minimumRating: '',
    requiredCertifications: '',
    preferredRegions: '',
    paymentTerms: '',
    warrantyRequirement: ''
  },
  attachmentsAndNotes: {
    notes: '',
    attachmentNames: []
  }
};

const STEP_LABELS = [
  'Product Details',
  'Quantity & Pricing',
  'Trade & Logistics',
  'Supplier Requirements',
  'Attachments & Notes',
  'Review & Send'
];

const ProcurementRFQModal = ({
  isOpen,
  onClose,
  workspaceId,
  workspace,
  currentUser,
  onSubmitted
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({ success: false, message: '' });

  const workspaceName = workspace?.name || workspace?.title || 'Workspace';

  const userInfoHeader = useMemo(
    () => ({
      vendorId: currentUser?.vendorId || currentUser?.userId || currentUser?.id,
      email: currentUser?.email,
      role: currentUser?.role || 'vendor',
      name: currentUser?.name || 'Vendor User'
    }),
    [currentUser]
  );

  if (!isOpen) return null;

  const updateSection = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));

    const errorKey = `${section}.${key}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const handleAttachmentsChange = (event) => {
    const files = Array.from(event.target.files || []);
    const fileNames = files.map((file) => file.name);
    updateSection('attachmentsAndNotes', 'attachmentNames', fileNames);
  };

  const validateCurrentStep = () => {
    const nextErrors = {};

    if (step === 1) {
      if (!formData.productDetails.title.trim()) {
        nextErrors['productDetails.title'] = 'RFQ title is required';
      }
      if (!formData.productDetails.category.trim()) {
        nextErrors['productDetails.category'] = 'Category is required';
      }
      if (!formData.productDetails.productName.trim()) {
        nextErrors['productDetails.productName'] = 'Product name is required';
      }
    }

    if (step === 2) {
      if (!formData.quantityPricing.quantity || Number(formData.quantityPricing.quantity) <= 0) {
        nextErrors['quantityPricing.quantity'] = 'Quantity should be greater than 0';
      }
    }

    if (step === 3) {
      if (!formData.tradeLogistics.deliveryLocation.trim()) {
        nextErrors['tradeLogistics.deliveryLocation'] = 'Delivery location is required';
      }
      if (!formData.tradeLogistics.requiredByDate) {
        nextErrors['tradeLogistics.requiredByDate'] = 'Required by date is required';
      }
    }

    if (step === 4) {
      if (!formData.supplierRequirements.paymentTerms.trim()) {
        nextErrors['supplierRequirements.paymentTerms'] = 'Payment terms are required';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const previousStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const buildItemDescription = () => {
    const payload = {
      workspaceName,
      rfqType: 'procurement-rfq',
      productDetails: formData.productDetails,
      quantityPricing: formData.quantityPricing,
      tradeLogistics: formData.tradeLogistics,
      supplierRequirements: formData.supplierRequirements,
      attachmentsAndNotes: formData.attachmentsAndNotes,
      submittedBy: {
        name: currentUser?.name || 'Vendor User',
        email: currentUser?.email || null,
        vendorId: userInfoHeader.vendorId || null
      }
    };

    return JSON.stringify(payload);
  };

  const sendActivity = async (requestId) => {
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId,
          userId: userInfoHeader.vendorId || 'unknown-user',
          userEmail: userInfoHeader.email || null,
          userName: userInfoHeader.name,
          action: 'procurement_rfq_sent',
          actionType: 'create',
          targetType: 'procurement',
          targetId: requestId,
          details: {
            rfqTitle: formData.productDetails.title,
            productName: formData.productDetails.productName,
            quantity: formData.quantityPricing.quantity,
            quantityUnit: formData.quantityPricing.quantityUnit
          }
        })
      });
    } catch (error) {
      console.warn('Failed to write activity log for RFQ send:', error);
    }
  };

  const handleSubmit = async () => {
    if (!workspaceId) {
      setSubmitResult({ success: false, message: 'Workspace ID is missing. Please refresh and retry.' });
      return;
    }

    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setSubmitResult({ success: false, message: '' });

    try {
      const requestId = `RFQ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const budgetMax = Number(formData.quantityPricing.budgetMax) || 0;
      const budgetMin = Number(formData.quantityPricing.budgetMin) || 0;
      const amount = budgetMax || budgetMin || 0;

      const urgency = formData.tradeLogistics.requiredByDate
        ? (new Date(formData.tradeLogistics.requiredByDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        : null;

      const priority = urgency !== null && urgency <= 7 ? 'high' : urgency !== null && urgency <= 21 ? 'medium' : 'low';

      const payload = {
        requestId,
        amount,
        category: formData.productDetails.category || 'General',
        department: 'Workspace RFQ',
        item: formData.productDetails.productName.trim(),
        itemDescription: buildItemDescription(),
        priority,
        quantity: Number(formData.quantityPricing.quantity) || 1,
        requestor: userInfoHeader.vendorId || userInfoHeader.email || 'UNKNOWN_VENDOR',
        requiredByDate: formData.tradeLogistics.requiredByDate || null,
        source: 'workspace-rfq',
        status: 'Pending',
        workspaceId
      };

      const response = await fetch('/api/procurement-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify(userInfoHeader)
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseError = await response.json().catch(() => ({}));
        throw new Error(responseError.message || 'Failed to send RFQ to procurement');
      }

      const result = await response.json();
      await sendActivity(result?.data?.requestId || requestId);

      setSubmitResult({
        success: true,
        message: `RFQ sent to procurement successfully. Request ID: ${result?.data?.requestId || requestId}`
      });

      if (onSubmitted) {
        onSubmitted({
          request: result?.data || payload,
          rfqFormData: formData,
          submittedAt: new Date().toISOString(),
          workspaceId,
          workspaceName
        });
      }
    } catch (error) {
      console.error('Error sending procurement RFQ:', error);
      setSubmitResult({
        success: false,
        message: error.message || 'Failed to send RFQ to procurement'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAndReset = () => {
    setStep(1);
    setErrors({});
    setSubmitResult({ success: false, message: '' });
    setIsSubmitting(false);
    setFormData(INITIAL_FORM);
    onClose();
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-600" />
              Procurement RFQ Form
            </h2>
            <p className="text-xs text-gray-600 mt-1">Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step - 1]}</p>
          </div>
          <button
            type="button"
            onClick={closeAndReset}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">RFQ Title *</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.title}
                  onChange={(e) => updateSection('productDetails', 'title', e.target.value)}
                  placeholder="Ex: Structural Steel RFQ for Tower A"
                />
                {errors['productDetails.title'] && <p className={errorClass}>{errors['productDetails.title']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Category *</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.category}
                  onChange={(e) => updateSection('productDetails', 'category', e.target.value)}
                  placeholder="Ex: Construction Materials"
                />
                {errors['productDetails.category'] && <p className={errorClass}>{errors['productDetails.category']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Product Name *</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.productName}
                  onChange={(e) => updateSection('productDetails', 'productName', e.target.value)}
                  placeholder="Ex: TMT Bars Fe500D"
                />
                {errors['productDetails.productName'] && <p className={errorClass}>{errors['productDetails.productName']}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Product Description</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={formData.productDetails.productDescription}
                  onChange={(e) => updateSection('productDetails', 'productDescription', e.target.value)}
                  placeholder="Describe intended use, quality expectations, and standards"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Technical Specifications</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={formData.productDetails.technicalSpecifications}
                  onChange={(e) => updateSection('productDetails', 'technicalSpecifications', e.target.value)}
                  placeholder="Dimensions, grade, tolerances, performance requirements"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Brand Preference</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.brandPreference}
                  onChange={(e) => updateSection('productDetails', 'brandPreference', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={formData.quantityPricing.quantity}
                  onChange={(e) => updateSection('quantityPricing', 'quantity', e.target.value)}
                />
                {errors['quantityPricing.quantity'] && <p className={errorClass}>{errors['quantityPricing.quantity']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Quantity Unit</label>
                <input
                  className={inputClass}
                  value={formData.quantityPricing.quantityUnit}
                  onChange={(e) => updateSection('quantityPricing', 'quantityUnit', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Currency</label>
                <select
                  className={inputClass}
                  value={formData.quantityPricing.currency}
                  onChange={(e) => updateSection('quantityPricing', 'currency', e.target.value)}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Budget Min</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={formData.quantityPricing.budgetMin}
                  onChange={(e) => updateSection('quantityPricing', 'budgetMin', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Budget Max</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={formData.quantityPricing.budgetMax}
                  onChange={(e) => updateSection('quantityPricing', 'budgetMax', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Pricing Type</label>
                <select
                  className={inputClass}
                  value={formData.quantityPricing.pricingType}
                  onChange={(e) => updateSection('quantityPricing', 'pricingType', e.target.value)}
                >
                  <option value="negotiable">Negotiable</option>
                  <option value="fixed">Fixed</option>
                  <option value="best-quote">Best Quote</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Incoterm</label>
                <select
                  className={inputClass}
                  value={formData.tradeLogistics.incoterm}
                  onChange={(e) => updateSection('tradeLogistics', 'incoterm', e.target.value)}
                >
                  <option value="EXW">EXW</option>
                  <option value="FOB">FOB</option>
                  <option value="CIF">CIF</option>
                  <option value="DAP">DAP</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Shipping Method</label>
                <select
                  className={inputClass}
                  value={formData.tradeLogistics.shippingMethod}
                  onChange={(e) => updateSection('tradeLogistics', 'shippingMethod', e.target.value)}
                >
                  <option value="road">Road</option>
                  <option value="rail">Rail</option>
                  <option value="air">Air</option>
                  <option value="sea">Sea</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Delivery Location *</label>
                <input
                  className={inputClass}
                  value={formData.tradeLogistics.deliveryLocation}
                  onChange={(e) => updateSection('tradeLogistics', 'deliveryLocation', e.target.value)}
                  placeholder="City, State, Site Address"
                />
                {errors['tradeLogistics.deliveryLocation'] && <p className={errorClass}>{errors['tradeLogistics.deliveryLocation']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Required By Date *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={formData.tradeLogistics.requiredByDate}
                  onChange={(e) => updateSection('tradeLogistics', 'requiredByDate', e.target.value)}
                />
                {errors['tradeLogistics.requiredByDate'] && <p className={errorClass}>{errors['tradeLogistics.requiredByDate']}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Packaging Requirements</label>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={formData.tradeLogistics.packagingRequirements}
                  onChange={(e) => updateSection('tradeLogistics', 'packagingRequirements', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Minimum Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={formData.supplierRequirements.minimumExperienceYears}
                  onChange={(e) => updateSection('supplierRequirements', 'minimumExperienceYears', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Minimum Supplier Rating</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  className={inputClass}
                  value={formData.supplierRequirements.minimumRating}
                  onChange={(e) => updateSection('supplierRequirements', 'minimumRating', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Required Certifications</label>
                <input
                  className={inputClass}
                  value={formData.supplierRequirements.requiredCertifications}
                  onChange={(e) => updateSection('supplierRequirements', 'requiredCertifications', e.target.value)}
                  placeholder="ISO 9001, BIS, CE"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Preferred Regions</label>
                <input
                  className={inputClass}
                  value={formData.supplierRequirements.preferredRegions}
                  onChange={(e) => updateSection('supplierRequirements', 'preferredRegions', e.target.value)}
                  placeholder="India South, GCC, SEA"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Payment Terms *</label>
                <input
                  className={inputClass}
                  value={formData.supplierRequirements.paymentTerms}
                  onChange={(e) => updateSection('supplierRequirements', 'paymentTerms', e.target.value)}
                  placeholder="30% advance, 70% on delivery"
                />
                {errors['supplierRequirements.paymentTerms'] && <p className={errorClass}>{errors['supplierRequirements.paymentTerms']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Warranty Requirement</label>
                <input
                  className={inputClass}
                  value={formData.supplierRequirements.warrantyRequirement}
                  onChange={(e) => updateSection('supplierRequirements', 'warrantyRequirement', e.target.value)}
                  placeholder="12 months from commissioning"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Attachments</label>
                <input
                  type="file"
                  multiple
                  className="mt-1 block w-full text-sm text-gray-600"
                  onChange={handleAttachmentsChange}
                />
                {formData.attachmentsAndNotes.attachmentNames.length > 0 && (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <p className="text-xs font-medium text-gray-700">Selected files</p>
                    {formData.attachmentsAndNotes.attachmentNames.map((name) => (
                      <p key={name} className="text-xs text-gray-600">{name}</p>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Additional Notes</label>
                <textarea
                  rows={6}
                  className={inputClass}
                  value={formData.attachmentsAndNotes.notes}
                  onChange={(e) => updateSection('attachmentsAndNotes', 'notes', e.target.value)}
                  placeholder="Any clarifications for procurement and suppliers"
                />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-800">Review RFQ Summary</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
                  <p><span className="font-medium">Title:</span> {formData.productDetails.title || '-'}</p>
                  <p><span className="font-medium">Category:</span> {formData.productDetails.category || '-'}</p>
                  <p><span className="font-medium">Product:</span> {formData.productDetails.productName || '-'}</p>
                  <p><span className="font-medium">Quantity:</span> {formData.quantityPricing.quantity || '-'} {formData.quantityPricing.quantityUnit}</p>
                  <p><span className="font-medium">Budget:</span> {formData.quantityPricing.currency} {formData.quantityPricing.budgetMin || '0'} - {formData.quantityPricing.budgetMax || '0'}</p>
                  <p><span className="font-medium">Required By:</span> {formData.tradeLogistics.requiredByDate || '-'}</p>
                  <p><span className="font-medium">Delivery:</span> {formData.tradeLogistics.deliveryLocation || '-'}</p>
                  <p><span className="font-medium">Payment Terms:</span> {formData.supplierRequirements.paymentTerms || '-'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                Sending this RFQ will create a procurement request linked to this workspace and make it visible in procurement workflows.
              </div>

              {submitResult.message && (
                <div
                  className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${
                    submitResult.success
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {submitResult.success ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <p>{submitResult.message}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 1 || isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-xs text-gray-500">{STEP_LABELS[step - 1]}</div>

          {step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === TOTAL_STEPS && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || submitResult.success}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sending...' : submitResult.success ? 'Sent' : 'Send to Procurement'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcurementRFQModal;
