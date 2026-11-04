import React, { useState, useEffect } from 'react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import { useReactFlow } from 'reactflow';
import Field from '../ui/Field';
import { TextInput, TextArea } from '../ui/controls';

const FormTemplate = ({ nodeId, workspaceId, onSubmitSuccess, initialFormData = null }) => {
  const { setNodes } = useReactFlow();
  const [formData, setFormData] = useState(initialFormData || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    agreeToTerms: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null); // { type: 'success' | 'error', text }
  const [touched, setTouched] = useState({});
  const [isFormSubmitted, setIsFormSubmitted] = useState(!!initialFormData && Object.keys(initialFormData).length > 0);

  // Load saved form data if available
  useEffect(() => {
    if (initialFormData && Object.keys(initialFormData).length > 0) {
      console.log('📥 Loading saved form data:', initialFormData);
      setFormData(prev => ({
        ...initialFormData
      }));
      setIsFormSubmitted(true);
    }
  }, [JSON.stringify(initialFormData)]);

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validate = (values) => {
    const errors = {};
    if (!values.firstName?.trim()) errors.firstName = 'First name is required';
    if (!values.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!values.email?.trim()) errors.email = 'Email is required';
    else if (!EMAIL.test(values.email.trim())) errors.email = 'Enter a valid email address';
    return errors;
  };
  const errors = validate(formData);
  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const errorFor = (field) => (touched[field] ? errors[field] : undefined);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (Object.keys(errors).length > 0) {
      setTouched({ firstName: true, lastName: true, email: true });
      return;
    }

    if (!nodeId || !workspaceId) {
      console.warn('⚠️ Cannot submit form: Missing nodeId or workspaceId');
      setSubmitMessage({ type: 'error', text: 'Cannot save this form right now. Please try again.' });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('💾 Saving form data for node:', nodeId);
      
      await persistNodeDataPatch(
        nodeId,
        {
          formData: formData,
          lastSubmittedAt: new Date().toISOString(),
        },
        setNodes,
        workspaceId
      );

      console.log('✅ Form data saved to database successfully!');
      
      // Update only the current node's data, not all nodes
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === nodeId 
            ? {
                ...node,
                data: {
                  ...node.data,
                  formData: formData,
                  lastSubmittedAt: new Date().toISOString(),
                  submissionCount: (node.data?.submissionCount || 0) + 1
                }
              }
            : node
        )
      );
      
      // Mark form as submitted
      setIsFormSubmitted(true);
      
      setSubmitMessage({ type: 'success', text: `Form ${isFormSubmitted ? 'updated' : 'submitted'} and saved.` });
      
      // Call optional callback
      if (onSubmitSuccess) {
        onSubmitSuccess(formData);
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        setSubmitMessage(null);
      }, 3000);
    } catch (error) {
      console.error('❌ Error saving form data:', error);
      setSubmitMessage({ type: 'error', text: `Could not ${isFormSubmitted ? 'update' : 'save'} the form. Please try again.` });
      setTimeout(() => {
        setSubmitMessage(null);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" required error={errorFor('firstName')} htmlFor={`${nodeId}-firstName`}>
          <TextInput
            id={`${nodeId}-firstName`}
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            onBlur={() => touch('firstName')}
            invalid={!!errorFor('firstName')}
            placeholder="John"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" required error={errorFor('lastName')} htmlFor={`${nodeId}-lastName`}>
          <TextInput
            id={`${nodeId}-lastName`}
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            onBlur={() => touch('lastName')}
            invalid={!!errorFor('lastName')}
            placeholder="Doe"
            autoComplete="family-name"
          />
        </Field>
      </div>

      <Field label="Email address" required error={errorFor('email')} htmlFor={`${nodeId}-email`}>
        <TextInput
          id={`${nodeId}-email`}
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => touch('email')}
          invalid={!!errorFor('email')}
          placeholder="john.doe@example.com"
          autoComplete="email"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone number" htmlFor={`${nodeId}-phone`}>
          <TextInput
            id={`${nodeId}-phone`}
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            autoComplete="tel"
          />
        </Field>
        <Field label="Company" htmlFor={`${nodeId}-company`}>
          <TextInput
            id={`${nodeId}-company`}
            value={formData.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            placeholder="Acme Corporation"
            autoComplete="organization"
          />
        </Field>
      </div>

      <Field label="Message" htmlFor={`${nodeId}-message`}>
        <TextArea
          id={`${nodeId}-message`}
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          rows={3}
          className="!min-h-[80px]"
          placeholder="Tell us about your inquiry..."
        />
      </Field>

      <label htmlFor={`${nodeId}-terms`} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-ink">
        <input
          type="checkbox"
          id={`${nodeId}-terms`}
          checked={formData.agreeToTerms}
          onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="mt-0.5 h-4 w-4 rounded border-line accent-[rgb(var(--status-info))] focus:outline-none focus-visible:ring-2 focus-visible:ring-info/40"
        />
        <span>
          I agree to the <span className="text-info underline underline-offset-2">Terms of Service</span> and{' '}
          <span className="text-info underline underline-offset-2">Privacy Policy</span>
        </span>
      </label>

      <div className="space-y-2 border-t border-line pt-4">
        {submitMessage && (
          <div
            role={submitMessage.type === 'error' ? 'alert' : 'status'}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              submitMessage.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
            }`}
          >
            {submitMessage.text}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-9 items-center rounded-lg bg-cta px-4 text-[13px] font-medium text-cta-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-info/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? isFormSubmitted ? 'Updating…' : 'Submitting…'
              : isFormSubmitted ? 'Update form' : 'Submit form'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default FormTemplate;
