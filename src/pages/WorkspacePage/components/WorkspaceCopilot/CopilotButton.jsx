import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useCopilot } from '../../../../context/CopilotContext';

const CopilotButton = () => {
  const { isOpen, toggleCopilot } = useCopilot();

  return (
    <button
      onClick={toggleCopilot}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full
        flex items-center justify-center
        font-semibold text-white
        transition-all duration-300
        shadow-lg hover:shadow-xl
        ${isOpen 
          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 animate-pulse'
        }
      `}
      title={isOpen ? 'Close Copilot' : 'Open Copilot'}
      aria-label={isOpen ? 'Close Copilot' : 'Open Copilot'}
    >
      {isOpen ? (
        <X size={24} className="text-white" />
      ) : (
        <Sparkles size={24} className="text-white" />
      )}
    </button>
  );
};

export default CopilotButton;
