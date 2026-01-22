import React, { useEffect, useRef } from 'react';
import { X, Plus, Send, Loader, AlertCircle, Trash2 } from 'lucide-react';
import { useCopilot } from '../../../../context/CopilotContext';
import CopilotMessage from './CopilotMessage';

const CopilotFullPage = ({ onClose }) => {
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
    clearHistory,
    conversationHistory,
    toggleCopilot
  } = useCopilot();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (userQuery.trim()) {
      sendQuery(userQuery);
    }
  };

  const handleSuggestedQuestion = (question) => {
    setUserQuery(question);
    sendQuery(question);
  };

  const handleNewChat = () => {
    clearHistory();
    setUserQuery('');
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col z-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Workspace AI Copilot</h1>
          <p className="text-gray-600 mt-1">Your Intelligent Workspace Partner</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-gradient-to-b from-slate-700 to-slate-800 text-white flex flex-col p-6 border-r border-slate-600">
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-600">
            <h2 className="text-lg font-bold">✨ Workspace AI</h2>
            <button 
              onClick={handleNewChat}
              className="bg-slate-600 hover:bg-slate-500 p-2 rounded-lg transition"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Recent Chats</h3>
            <div className="space-y-2">
              {conversationHistory && conversationHistory.length > 0 ? (
                conversationHistory.map((msg, idx) => (
                  msg.type === 'user' && (
                    <div key={idx} className="p-3 bg-slate-600 hover:bg-slate-500 rounded-lg transition cursor-pointer">
                      <p className="text-sm text-white truncate">{msg.content.substring(0, 40)}...</p>
                      <p className="text-xs text-slate-300 mt-1">5m ago</p>
                    </div>
                  )
                ))
              ) : (
                <p className="text-sm text-slate-400">No chat history yet</p>
              )}
            </div>
          </div>

          {/* Clear History Button */}
          <button 
            onClick={clearHistory}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <Trash2 size={16} />
            Clear History
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            {messages.length === 0 ? (
              // Welcome Section
              <div className="flex flex-col items-center gap-8 py-12">
                <div className="text-6xl animate-pulse">⚡</div>
                <h2 className="text-4xl font-bold text-gray-900">Welcome to Workspace AI</h2>
                <p className="text-lg text-gray-600">Your Intelligent Workspace Management Partner</p>

                {/* Suggestions Grid */}
                <div className="grid grid-cols-2 gap-8 w-full max-w-4xl mt-8">
                  {/* Help Center */}
                  <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition">
                    <div className="text-3xl mb-3">📚</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Help Center</h3>
                    <div className="space-y-2">
                      <button 
                        onClick={() => handleSuggestedQuestion('How do I create a task?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        How do I create a task?
                      </button>
                      <button 
                        onClick={() => handleSuggestedQuestion('How do I set approval hierarchies?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        How do I set Approval Hierarchies?
                      </button>
                      <button 
                        onClick={() => handleSuggestedQuestion('How to generate DPR?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        How to generate DPR?
                      </button>
                      <button 
                        onClick={() => handleSuggestedQuestion('How to create Order for Vendor?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        How to create Order for Vendor?
                      </button>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition">
                    <div className="text-3xl mb-3">📊</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Analytics</h3>
                    <p className="text-sm text-gray-600 mb-3">Currently supported Queries on BOQ, Orders, Invoices & Payments</p>
                    <div className="space-y-2">
                      <button 
                        onClick={() => handleSuggestedQuestion('Which project has the most pending vendor payments?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        Which project has the most pending vendor payments?
                      </button>
                      <button 
                        onClick={() => handleSuggestedQuestion('Orders placed but not invoiced yet?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        Orders placed but not invoiced yet?
                      </button>
                      <button 
                        onClick={() => handleSuggestedQuestion('Which invoices are pending for approval?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        Which invoices are pending for approval?
                      </button>
                      <button 
                        onClick={() => handleSuggestedQuestion('List all payments made to XYZ Vendor?')}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                      >
                        List all payments made to XYZ Vendor?
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-500 mt-4 max-w-2xl">
                  <strong>Note:</strong> For project related insights, mention exact JOBID or project name for better results
                </p>
              </div>
            ) : (
              // Messages Display
              <div className="space-y-4">
                {messages.map((msg) => (
                  <CopilotMessage key={msg.id} message={msg} />
                ))}
                {loading && (
                  <div className="flex items-center gap-3 text-gray-600 my-4">
                    <Loader size={20} className="animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                )}
                {hasError && (
                  <div className="flex items-center gap-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                    <AlertCircle size={20} />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          {messages.length > 0 && suggestedQuestions.length > 0 && (
            <div className="bg-white border-t border-gray-200 px-8 py-4">
              <h4 className="text-xs font-bold uppercase text-gray-600 mb-3">Suggested Follow-ups:</h4>
              <div className="grid grid-cols-2 gap-3">
                {suggestedQuestions.slice(0, 2).map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 p-3 rounded-lg text-sm font-medium text-left transition"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 px-8 py-6">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !userQuery.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 transition"
              >
                {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CopilotFullPage;
