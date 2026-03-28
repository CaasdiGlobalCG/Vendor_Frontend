import React from 'react';
import { X, FileText, CreditCard, Calculator, ClipboardList } from 'lucide-react';

const TemplatesPanel = ({ isOpen, onClose, onTemplateSelect }) => {
  if (!isOpen) return null;

  const templateOptions = [
    {
      id: 'quotations-invoices',
      name: 'Manage Quotations/Invoices',
      icon: <FileText className="w-5 h-5" />,
      description: 'Create and manage quotations and invoices for your projects',
      color: 'bg-blue-100 text-blue-600',
      hoverColor: 'hover:bg-blue-50'
    },
    {
      id: 'payments',
      name: 'Manage Payments',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Track and manage payment transactions and history',
      color: 'bg-green-100 text-green-600',
      hoverColor: 'hover:bg-green-50'
    },
    {
      id: 'boq',
      name: 'Manage BOQ',
      icon: <Calculator className="w-5 h-5" />,
      description: 'Bill of Quantities management and cost estimation',
      color: 'bg-purple-100 text-purple-600',
      hoverColor: 'hover:bg-purple-50'
    },
    {
      id: 'cost-calculators',
      name: 'Cost Calculators',
      icon: <Calculator className="w-5 h-5" />,
      description: 'Open construction cost calculators and add results to canvas',
      color: 'bg-blue-100 text-blue-600',
      hoverColor: 'hover:bg-blue-50'
    },
    {
      id: 'procurement-rfq',
      name: 'Procurement RFQ Form',
      icon: <ClipboardList className="w-5 h-5" />,
      description: 'Create a detailed RFQ and send it directly to procurement',
      color: 'bg-orange-100 text-orange-600',
      hoverColor: 'hover:bg-orange-50'
    }
  ];

  const handleTemplateClick = (templateId) => {
    console.log('Template selected:', templateId);

    if (onTemplateSelect) {
      onTemplateSelect(templateId);
    }
  };

  return (
    <div className="fixed right-0 top-0 w-96 h-full bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
        <div>
        <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
        <p className="text-xs text-gray-600 mt-0">Choose a template to get started</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Close Templates Panel"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Template Options */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {templateOptions.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template.id)}
              className={`w-full p-6 bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-300 hover:shadow-md ${template.hoverColor} group text-left`}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className={`p-2.5 rounded-lg ${template.color} group-hover:scale-105 transition-transform`}>
                  {template.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-gray-700">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {template.description}
                  </p>
                </div>
                
                {/* Arrow */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-xs font-medium text-gray-900 mb-1">Need Help?</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            These templates help you quickly set up common business workflows. 
            Click on any template to get started with pre-configured forms and processes.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            More templates coming soon
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPanel;
