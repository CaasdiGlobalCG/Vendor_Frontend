import React, { useState, useEffect } from 'react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import { useReactFlow } from 'reactflow';

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
  const [submitMessage, setSubmitMessage] = useState(null);
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!nodeId || !workspaceId) {
      console.warn('⚠️ Cannot submit form: Missing nodeId or workspaceId');
      alert('Error: Cannot save form data. Please try again.');
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
      
      setSubmitMessage('✅ Form ' + (isFormSubmitted ? 'updated' : 'submitted') + ' and saved successfully!');
      
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
      setSubmitMessage('❌ Error ' + (isFormSubmitted ? 'updating' : 'saving') + ' form. Please try again.');
      setTimeout(() => {
        setSubmitMessage(null);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className="w-full p-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="John"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="w-full p-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Doe"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            required
          />
        </div>
      </div>

      {/* Contact Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full p-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="john.doe@example.com"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full p-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="+1 (555) 123-4567"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => handleInputChange('company', e.target.value)}
          className="w-full p-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Acme Corporation"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      </div>

      {/* Message Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          className="w-full p-2 border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          rows="3"
          placeholder="Tell us about your inquiry..."
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      </div>

      {/* Terms Checkbox */}
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          id="terms"
          checked={formData.agreeToTerms}
          onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
        <label htmlFor="terms" className="text-sm text-gray-700">
          I agree to the{' '}
          <span className="text-blue-600 hover:text-blue-800 cursor-pointer underline">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="text-blue-600 hover:text-blue-800 cursor-pointer underline">
            Privacy Policy
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <div className="pt-2 space-y-2">
        {submitMessage && (
          <div className={`p-3 rounded-lg text-sm font-medium text-center ${
            submitMessage.includes('Error') 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {submitMessage}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isSubmitting 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : isFormSubmitted
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 focus:ring-amber-500'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {isSubmitting 
            ? (isFormSubmitted ? 'Updating...' : 'Submitting...') 
            : (isFormSubmitted ? '✏️ Update Form' : '📝 Submit Form')
          }
        </button>
      </div>
    </form>
  );
};

export default FormTemplate;



