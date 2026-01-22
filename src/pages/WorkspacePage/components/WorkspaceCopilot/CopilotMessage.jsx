import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { useCopilot } from '../../../../context/CopilotContext';

const CopilotMessage = ({ message }) => {
  const { submitFeedback } = useCopilot();
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const isUser = message.type === 'user';
  const isError = message.type === 'error';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (feedback) => {
    if (message.answerId) {
      await submitFeedback(message.answerId, feedback);
      setFeedbackGiven(feedback);
      setTimeout(() => setFeedbackGiven(null), 2000);
    }
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
        isUser ? 'bg-gradient-to-r from-blue-500 to-blue-700' : 'bg-gradient-to-r from-pink-400 to-pink-600'
      }`}>
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Message Content */}
      <div className="flex-1 max-w-2xl">
        <div className={`p-4 rounded-lg ${
          isUser 
            ? 'bg-blue-100 text-gray-900 rounded-br-none' 
            : isError 
            ? 'bg-red-100 text-red-900 rounded-bl-none border border-red-300'
            : 'bg-gray-100 text-gray-900 rounded-bl-none border border-gray-200'
        }`}>
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>

        <div className="flex justify-between items-center mt-2 px-2">
          <span className="text-xs text-gray-600">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>

          {/* Feedback and Copy Buttons */}
          {!isUser && !isError && (
            <div className="flex gap-1">
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded transition ${
                  copied 
                    ? 'bg-green-100 text-green-600' 
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Copy answer"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>

              {/* Like Button */}
              <button
                onClick={() => handleFeedback('like')}
                className={`p-1.5 rounded transition ${
                  feedbackGiven === 'like'
                    ? 'bg-green-100 text-green-600'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Helpful answer"
              >
                <ThumbsUp size={16} />
              </button>

              {/* Dislike Button */}
              <button
                onClick={() => handleFeedback('dislike')}
                className={`p-1.5 rounded transition ${
                  feedbackGiven === 'dislike'
                    ? 'bg-red-100 text-red-600'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Not helpful"
              >
                <ThumbsDown size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopilotMessage;
