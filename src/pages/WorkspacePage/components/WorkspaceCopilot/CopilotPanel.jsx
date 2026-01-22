import React, { useEffect, useRef } from 'react';
import { Send, Loader, AlertCircle, Trash2 } from 'lucide-react';
import { useCopilot } from '../../../../context/CopilotContext';
import CopilotMessage from './CopilotMessage';
import './copilot.css';

const CopilotPanel = () => {
  const {
    isOpen,
    messages,
    loading,
    userQuery,
    suggestedQuestions,
    hasError,
    errorMessage,
    sendQuery,
    setUserQuery,
    clearHistory
  } = useCopilot();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendQuery = (e) => {
    e.preventDefault();
    if (userQuery.trim() && !loading) {
      sendQuery(userQuery);
    }
  };

  const handleSuggestedQuestion = (question) => {
    sendQuery(question);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed bottom-24 right-6 z-50
        w-96 h-[500px]
        bg-white rounded-lg shadow-2xl
        flex flex-col
        border border-gray-200
        overflow-hidden
        animate-slide-up
      `}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div>
            <h3 className="font-semibold">Workspace Copilot</h3>
            <p className="text-xs opacity-90">Ask anything about this workspace</p>
          </div>
        </div>
        <button
          onClick={clearHistory}
          className="p-1 hover:bg-blue-700 rounded transition-colors"
          title="Clear history"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <CopilotMessage key={message.id} message={message} />
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && messages.length > 0 && !loading && (
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <p className="text-xs text-gray-600 font-semibold mb-2">Suggested Questions:</p>
          <div className="space-y-2">
            {suggestedQuestions.slice(0, 2).map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedQuestion(question)}
                className="w-full text-left text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-3 py-2 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-3">
        <form onSubmit={handleSendQuery} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={loading || !userQuery.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg p-2 transition-colors"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CopilotPanel;
