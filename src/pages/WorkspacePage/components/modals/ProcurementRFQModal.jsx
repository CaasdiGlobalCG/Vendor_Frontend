import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Auth } from 'aws-amplify';
import authFetch from '../../../../utils/authFetch';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Sparkles,
  MessageCircle,
  Bot,
  Loader2,
} from 'lucide-react';

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

const formatChatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

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
  const [showProductAi, setShowProductAi] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiConversationId, setAiConversationId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiWarning, setAiWarning] = useState('');
  const [aiConversation, setAiConversation] = useState([]);

  const [showProcurementChat, setShowProcurementChat] = useState(false);
  const [queryConversationId, setQueryConversationId] = useState(null);
  const [queryConversation, setQueryConversation] = useState(null);
  const [queryMessages, setQueryMessages] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [querySending, setQuerySending] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [queryError, setQueryError] = useState('');
  const queryScrollRef = useRef(null);

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

  const getAuthToken = async () => {
    try {
      const session = await Auth.currentSession();
      const token = session?.getIdToken?.()?.getJwtToken?.();
      if (token) return token;
    } catch {
      // No active Amplify session — fall through to stored tokens
    }
    return (
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      ''
    );
  };

  const buildAuthHeaders = async (withJson = true) => {
    const token = await getAuthToken();
    const headers = {
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
      'x-user-info': JSON.stringify(userInfoHeader),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

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

  const askProductAi = async () => {
    const question = aiQuestion.trim();
    if (!question) return;

    setAiLoading(true);
    setAiError('');
    setAiWarning('');

    try {
      const nextConversation = [
        ...aiConversation,
        { role: 'user', content: question },
      ].slice(-10);

      const response = await authFetch('/api/ai/product-assistant', {
        method: 'POST',
        headers: await buildAuthHeaders(true),
        body: JSON.stringify({
          question,
          context: {
            basicInfo: {
              title: formData.productDetails.title,
              category: formData.productDetails.category,
              productName: formData.productDetails.productName,
              quantity: formData.quantityPricing.quantity,
              quantityUnit: formData.quantityPricing.quantityUnit,
              deliveryLocation: formData.tradeLogistics.deliveryLocation,
              requiredBy: formData.tradeLogistics.requiredByDate,
            },
            specifications: {
              technicalSpecifications: formData.productDetails.technicalSpecifications,
              brandPreference: formData.productDetails.brandPreference,
              packagingRequirements: formData.tradeLogistics.packagingRequirements,
            },
            requirements: {
              description: formData.productDetails.productDescription,
              paymentTerms: formData.supplierRequirements.paymentTerms,
              warrantyRequirement: formData.supplierRequirements.warrantyRequirement,
            },
          },
          conversation: nextConversation,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to get Product AI response.');
      }

      const payload = data?.data || {};
      const details = [];

      if (Array.isArray(payload.suggestedProducts) && payload.suggestedProducts.length) {
        const top = payload.suggestedProducts.slice(0, 3);
        details.push(
          'Suggested products:\n' +
            top
              .map((item) => `- ${item?.name || 'Option'}${item?.bestFor ? `: ${item.bestFor}` : ''}`)
              .join('\n')
        );
      }

      if (Array.isArray(payload.recommendedSpecs) && payload.recommendedSpecs.length) {
        const top = payload.recommendedSpecs.slice(0, 4);
        details.push(
          'Recommended specs:\n' +
            top
              .map((item) => `- ${item?.name || 'Spec'}: ${item?.value || '-'}`)
              .join('\n')
        );
      }

      if (Array.isArray(payload.buyingChecklist) && payload.buyingChecklist.length) {
        details.push(
          'Buying checklist:\n' +
            payload.buyingChecklist
              .slice(0, 4)
              .map((item) => `- ${item}`)
              .join('\n')
        );
      }

      const composed = [payload.assistantReply || 'No suggestions generated.', ...details]
        .filter(Boolean)
        .join('\n\n');

      setAiConversationId(`product-assistant-${Date.now()}`);
      setAiConversation([
        ...nextConversation,
        { role: 'assistant', content: payload.assistantReply || 'No suggestions generated.' },
      ]);
      setAiAnswer(composed);

      if (data?.warning || payload?.warning) {
        setAiWarning(data.warning || payload.warning);
      }
    } catch (error) {
      const message = error.message || 'Failed to get Product AI response.';
      if (message.includes('encountered an error while processing your request')) {
        setAiError('Product AI is temporarily unavailable. Please ask with more specific use-case details or use Talk to Procurement now.');
      } else {
        setAiError(message);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const loadWorkspaceQueryConversation = async (conversationIdToLoad, options = {}) => {
    if (!conversationIdToLoad) return;
    const { showSpinner = false } = options;

    if (showSpinner) setQueryLoading(true);
    setQueryError('');

    try {
      const response = await authFetch(`/api/workspace/procurement-queries/conversations/${conversationIdToLoad}`, {
        method: 'GET',
        headers: await buildAuthHeaders(false),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load procurement conversation.');
      }

      setQueryConversation(data?.conversation || null);
      setQueryMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (error) {
      setQueryError(error.message || 'Failed to load procurement conversation.');
    } finally {
      if (showSpinner) setQueryLoading(false);
    }
  };

  const openProcurementChat = async () => {
    setShowProcurementChat(true);
    setQueryError('');

    if (queryConversationId) {
      await loadWorkspaceQueryConversation(queryConversationId, { showSpinner: true });
      return;
    }

    setQueryLoading(true);
    try {
      const fallbackTitle = formData.productDetails.title?.trim()
        ? `Workspace Query • ${formData.productDetails.title.trim()}`
        : `Workspace Query • ${workspaceName}`;

      const initialMessage = [
        'Need procurement guidance for this workspace RFQ draft.',
        `Product: ${formData.productDetails.productName || '-'}`,
        `Category: ${formData.productDetails.category || '-'}`,
        `Quantity: ${formData.quantityPricing.quantity || '-'} ${formData.quantityPricing.quantityUnit || ''}`.trim(),
        `Delivery: ${formData.tradeLogistics.deliveryLocation || '-'}`,
      ].join('\n');

      const response = await authFetch('/api/workspace/procurement-queries/conversations/open', {
        method: 'POST',
        headers: await buildAuthHeaders(true),
        body: JSON.stringify({
          workspaceId,
          workspaceName,
          source: 'workspace-query',
          queryTitle: fallbackTitle,
          initialMessage,
          context: {
            workspaceId,
            workspaceName,
            module: 'workspace-procurement-rfq-form',
            rfqDraft: {
              title: formData.productDetails.title,
              category: formData.productDetails.category,
              productName: formData.productDetails.productName,
              quantity: formData.quantityPricing.quantity,
              quantityUnit: formData.quantityPricing.quantityUnit,
              requiredByDate: formData.tradeLogistics.requiredByDate,
            },
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to start procurement chat.');
      }

      const conversation = data?.conversation || null;
      const conversationId = conversation?.conversationId || null;
      setQueryConversation(conversation);
      setQueryConversationId(conversationId);

      if (conversationId) {
        await loadWorkspaceQueryConversation(conversationId);
      }
    } catch (error) {
      setQueryError(error.message || 'Failed to start procurement chat.');
    } finally {
      setQueryLoading(false);
    }
  };

  const sendWorkspaceQueryMessage = async () => {
    const text = queryText.trim();
    if (!text || !queryConversationId) return;

    setQuerySending(true);
    setQueryError('');

    try {
      const response = await authFetch(`/api/workspace/procurement-queries/conversations/${queryConversationId}/messages`, {
        method: 'POST',
        headers: await buildAuthHeaders(true),
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to send message.');
      }

      setQueryMessages((prev) => [...prev, data.message]);
      setQueryText('');
    } catch (error) {
      setQueryError(error.message || 'Failed to send message.');
    } finally {
      setQuerySending(false);
    }
  };

  useEffect(() => {
    if (!showProcurementChat || !queryConversationId) return;

    const id = setInterval(() => {
      loadWorkspaceQueryConversation(queryConversationId);
    }, 12000);

    return () => clearInterval(id);
  }, [showProcurementChat, queryConversationId]);

  useEffect(() => {
    if (!showProcurementChat || !queryScrollRef.current) return;
    queryScrollRef.current.scrollTop = queryScrollRef.current.scrollHeight;
  }, [showProcurementChat, queryMessages.length, queryLoading]);

  const sendActivity = async (requestId) => {
    try {
      await authFetch('/api/activities', {
        method: 'POST',
        headers: await buildAuthHeaders(true),
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

      const response = await authFetch('/api/procurement-requests', {
        method: 'POST',
        headers: await buildAuthHeaders(true),
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
    setShowProductAi(false);
    setAiQuestion('');
    setAiAnswer('');
    setAiConversationId(null);
    setAiLoading(false);
    setAiError('');
    setAiWarning('');
    setAiConversation([]);
    setShowProcurementChat(false);
    setQueryConversationId(null);
    setQueryConversation(null);
    setQueryMessages([]);
    setQueryLoading(false);
    setQuerySending(false);
    setQueryText('');
    setQueryError('');
    onClose();
  };

  if (!isOpen) return null;

  const inputClass = 'w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-2 focus:ring-info/10';
  const errorClass = 'mt-1 text-xs text-danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-surface shadow-xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-canvas">
          <div>
            <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-warning" />
              Procurement RFQ Form
            </h2>
            <p className="text-xs text-dim mt-1">Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step - 1]}</p>
          </div>
          <button
            type="button"
            onClick={closeAndReset}
            className="rounded-lg p-2 text-dim hover:bg-surface-hover"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-info/10 bg-info/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowProductAi((prev) => !prev)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-cta px-4 py-2 text-sm font-semibold text-cta-foreground hover:bg-cta"
                  >
                    <Sparkles className="h-4 w-4" />
                    Product AI
                  </button>
                  <button
                    type="button"
                    onClick={openProcurementChat}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-info/30 bg-surface px-4 py-2 text-sm font-semibold text-info hover:bg-info/10"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Talk to Procurement
                  </button>
                </div>
                <p className="mt-2 text-xs text-info">
                  Use Product AI for spec suggestions, or open procurement chat for direct clarifications.
                </p>
              </div>

              {showProductAi && (
                <div className="rounded-xl border border-line bg-surface-hover p-4">
                  <label className="text-sm font-semibold text-ink">Ask Product AI</label>
                  <textarea
                    rows={3}
                    className={`${inputClass} mt-2`}
                    value={aiQuestion}
                    onChange={(e) => {
                      setAiQuestion(e.target.value);
                      if (aiError) setAiError('');
                    }}
                    placeholder="Ex: Suggest technical specs and quality checks for this RFQ draft."
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={askProductAi}
                      disabled={aiLoading || !aiQuestion.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-cta px-3 py-2 text-xs font-semibold text-cta-foreground hover:bg-cta disabled:opacity-60"
                    >
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      {aiLoading ? 'Thinking...' : 'Ask AI'}
                    </button>
                    {aiError ? <span className="text-xs text-danger">{aiError}</span> : null}
                  </div>
                  {aiWarning ? <p className="mt-2 text-xs text-warning">{aiWarning}</p> : null}
                  {aiAnswer ? (
                    <div className="mt-3 rounded-lg border border-line bg-surface p-3 text-sm text-ink whitespace-pre-wrap">
                      {aiAnswer}
                    </div>
                  ) : null}
                </div>
              )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-ink">RFQ Title *</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.title}
                  onChange={(e) => updateSection('productDetails', 'title', e.target.value)}
                  placeholder="Ex: Structural Steel RFQ for Tower A"
                />
                {errors['productDetails.title'] && <p className={errorClass}>{errors['productDetails.title']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Category *</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.category}
                  onChange={(e) => updateSection('productDetails', 'category', e.target.value)}
                  placeholder="Ex: Construction Materials"
                />
                {errors['productDetails.category'] && <p className={errorClass}>{errors['productDetails.category']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Product Name *</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.productName}
                  onChange={(e) => updateSection('productDetails', 'productName', e.target.value)}
                  placeholder="Ex: TMT Bars Fe500D"
                />
                {errors['productDetails.productName'] && <p className={errorClass}>{errors['productDetails.productName']}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-ink">Product Description</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={formData.productDetails.productDescription}
                  onChange={(e) => updateSection('productDetails', 'productDescription', e.target.value)}
                  placeholder="Describe intended use, quality expectations, and standards"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-ink">Technical Specifications</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={formData.productDetails.technicalSpecifications}
                  onChange={(e) => updateSection('productDetails', 'technicalSpecifications', e.target.value)}
                  placeholder="Dimensions, grade, tolerances, performance requirements"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-ink">Brand Preference</label>
                <input
                  className={inputClass}
                  value={formData.productDetails.brandPreference}
                  onChange={(e) => updateSection('productDetails', 'brandPreference', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-ink">Quantity *</label>
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
                <label className="text-sm font-medium text-ink">Quantity Unit</label>
                <input
                  className={inputClass}
                  value={formData.quantityPricing.quantityUnit}
                  onChange={(e) => updateSection('quantityPricing', 'quantityUnit', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Currency</label>
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
                <label className="text-sm font-medium text-ink">Budget Min</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={formData.quantityPricing.budgetMin}
                  onChange={(e) => updateSection('quantityPricing', 'budgetMin', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Budget Max</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={formData.quantityPricing.budgetMax}
                  onChange={(e) => updateSection('quantityPricing', 'budgetMax', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Pricing Type</label>
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
                <label className="text-sm font-medium text-ink">Incoterm</label>
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
                <label className="text-sm font-medium text-ink">Shipping Method</label>
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
                <label className="text-sm font-medium text-ink">Delivery Location *</label>
                <input
                  className={inputClass}
                  value={formData.tradeLogistics.deliveryLocation}
                  onChange={(e) => updateSection('tradeLogistics', 'deliveryLocation', e.target.value)}
                  placeholder="City, State, Site Address"
                />
                {errors['tradeLogistics.deliveryLocation'] && <p className={errorClass}>{errors['tradeLogistics.deliveryLocation']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Required By Date *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={formData.tradeLogistics.requiredByDate}
                  onChange={(e) => updateSection('tradeLogistics', 'requiredByDate', e.target.value)}
                />
                {errors['tradeLogistics.requiredByDate'] && <p className={errorClass}>{errors['tradeLogistics.requiredByDate']}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-ink">Packaging Requirements</label>
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
                <label className="text-sm font-medium text-ink">Minimum Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={formData.supplierRequirements.minimumExperienceYears}
                  onChange={(e) => updateSection('supplierRequirements', 'minimumExperienceYears', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Minimum Supplier Rating</label>
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
                <label className="text-sm font-medium text-ink">Required Certifications</label>
                <input
                  className={inputClass}
                  value={formData.supplierRequirements.requiredCertifications}
                  onChange={(e) => updateSection('supplierRequirements', 'requiredCertifications', e.target.value)}
                  placeholder="ISO 9001, BIS, CE"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Preferred Regions</label>
                <input
                  className={inputClass}
                  value={formData.supplierRequirements.preferredRegions}
                  onChange={(e) => updateSection('supplierRequirements', 'preferredRegions', e.target.value)}
                  placeholder="India South, GCC, SEA"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Payment Terms *</label>
                <input
                  className={inputClass}
                  value={formData.supplierRequirements.paymentTerms}
                  onChange={(e) => updateSection('supplierRequirements', 'paymentTerms', e.target.value)}
                  placeholder="30% advance, 70% on delivery"
                />
                {errors['supplierRequirements.paymentTerms'] && <p className={errorClass}>{errors['supplierRequirements.paymentTerms']}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Warranty Requirement</label>
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
                <label className="text-sm font-medium text-ink">Attachments</label>
                <input
                  type="file"
                  multiple
                  className="mt-1 block w-full text-sm text-dim"
                  onChange={handleAttachmentsChange}
                />
                {formData.attachmentsAndNotes.attachmentNames.length > 0 && (
                  <div className="mt-2 rounded-lg border border-line bg-canvas p-2">
                    <p className="text-xs font-medium text-ink">Selected files</p>
                    {formData.attachmentsAndNotes.attachmentNames.map((name) => (
                      <p key={name} className="text-xs text-dim">{name}</p>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-ink">Additional Notes</label>
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
              <div className="rounded-xl border border-line bg-canvas p-4">
                <h3 className="text-sm font-semibold text-ink">Review RFQ Summary</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-ink md:grid-cols-2">
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

              <div className="rounded-xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
                Sending this RFQ will create a procurement request linked to this workspace and make it visible in procurement workflows.
              </div>

              {submitResult.message && (
                <div
                  className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${
                    submitResult.success
                      ? 'border-success/20 bg-success/10 text-success'
                      : 'border-danger/20 bg-danger/10 text-danger'
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

        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 1 || isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-xs text-dim">{STEP_LABELS[step - 1]}</div>

          {step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-2 rounded-lg bg-info px-4 py-2 text-sm font-medium text-white hover:bg-info"
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
              className="inline-flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white hover:bg-warning disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sending...' : submitResult.success ? 'Sent' : 'Send to Procurement'}
            </button>
          )}
        </div>
      </div>

      {showProcurementChat && (
        <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md bg-surface border-l border-line shadow-2xl flex flex-col">
          <div className="px-4 py-3 border-b border-line bg-black">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Workspace Procurement Chat</p>
                <p className="text-xs text-info truncate mt-0.5">
                  {queryConversation?.queryTitle || 'Procurement clarification thread'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProcurementChat(false)}
                className="h-8 w-8 rounded-lg bg-white/20 text-white hover:bg-white/30 transition flex items-center justify-center"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={queryScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-surface">
            {queryLoading ? (
              <div className="h-full flex items-center justify-center text-dim gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation...
              </div>
            ) : queryMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-dim gap-2">
                <MessageCircle className="h-5 w-5" />
                <p className="text-sm">Start your procurement clarification here.</p>
              </div>
            ) : (
              queryMessages
                .slice()
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map((msg) => {
                  const mine = msg.senderType === 'client';
                  const isAi = msg.senderType === 'ai';
                  return (
                    <div key={msg.messageId} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm  border ${
                          mine
                            ? 'bg-info text-white border-info rounded-br-sm'
                            : isAi
                              ? 'bg-surface-hover border-line text-ink rounded-bl-sm'
                              : 'bg-surface border-line text-ink rounded-bl-sm'
                        }`}
                      >
                        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${mine ? 'text-info' : isAi ? 'text-ink' : 'text-info'}`}>
                          {mine ? 'You' : isAi ? 'AI Context' : 'Procurement'}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-info' : 'text-dim'}`}>
                          {formatChatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <div className="border-t border-line p-3 space-y-2 bg-surface">
            {queryError ? <p className="text-xs text-danger">{queryError}</p> : null}
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendWorkspaceQueryMessage();
                  }
                }}
                placeholder="Type your message to procurement..."
                className="flex-1 resize-none rounded-xl border border-line px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-info/20"
              />
              <button
                type="button"
                onClick={sendWorkspaceQueryMessage}
                disabled={querySending || !queryText.trim() || !queryConversationId}
                className="h-11 w-11 rounded-xl bg-info text-white hover:bg-info disabled:opacity-50 flex items-center justify-center"
                title="Send message"
              >
                {querySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-dim">Press Enter to send, Shift+Enter for new line.</p>
          </div>
        </aside>
      )}
    </div>
  );
};

export default ProcurementRFQModal;
