import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CopilotContext = createContext();

export const useCopilot = () => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within CopilotProvider');
  }
  return context;
};

export const CopilotProvider = ({ children, userId, workspaceId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [currentTab, setCurrentTab] = useState('tasks');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);

  const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
  // Check if /api is already included in the URL
  const API_BASE_URL = baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`;

  // Initialize with welcome message and suggested questions
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const welcomeMsg = {
        id: 'welcome',
        type: 'assistant',
        content: 'Hi! 👋 I\'m your Workspace Copilot. Ask me anything about creating tasks, using elements, collaborating with your team, or best practices. How can I help?',
        timestamp: new Date(),
        suggestedQuestions: [
          'How do I create a task?',
          'What are elements?',
          'How do I invite team members?',
          'How does real-time collaboration work?'
        ]
      };

      setMessages([welcomeMsg]);
      setSuggestedQuestions(welcomeMsg.suggestedQuestions);
    }
  }, [isOpen]);

  // Fetch knowledge base on mount
  useEffect(() => {
    const fetchKnowledgeBase = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/copilot/knowledge-base`);
        const data = await response.json();
        if (data.success) {
          console.log('✅ Copilot knowledge base loaded:', data.data);
        }
      } catch (error) {
        console.error('Error fetching knowledge base:', error);
      }
    };

    fetchKnowledgeBase();
  }, []);

  const toggleCopilot = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const sendQuery = useCallback(async (query) => {
    if (!query.trim()) return;

    try {
      setHasError(false);
      setLoading(true);

      // Add user message to chat
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: query,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setUserQuery('');

      // Call backend API to search for answers
      const response = await fetch(`${API_BASE_URL}/copilot/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          limit: 5,
          userId,
          workspaceId
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.data || data.data.length === 0) {
        // No results found
        const noResultMsg = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: 'I couldn\'t find a specific answer to your question. Try rephrasing or ask about tasks, elements, layouts, workspace management, or collaboration features.',
          timestamp: new Date(),
          suggestedQuestions: [
            'How do I create a task?',
            'What are elements?',
            'How do I invite team members?'
          ]
        };

        setMessages(prev => [...prev, noResultMsg]);
        setSuggestedQuestions(noResultMsg.suggestedQuestions);
      } else {
        // Get the best matching answer
        const bestMatch = data.data[0];

        // Create assistant message with the answer
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: bestMatch.answer,
          timestamp: new Date(),
          answerId: bestMatch.id,
          category: bestMatch.category,
          followUpQuestions: bestMatch.followUpQuestions || [],
          allResults: data.data // For debugging/showing alternatives
        };

        setMessages(prev => [...prev, assistantMessage]);
        setSuggestedQuestions(bestMatch.followUpQuestions || []);

        // Store message in backend history
        if (userId && workspaceId) {
          try {
            await fetch(`${API_BASE_URL}/copilot/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                workspaceId,
                type: 'assistant',
                content: bestMatch.answer,
                relatedAnswerId: bestMatch.id
              })
            });
          } catch (error) {
            console.error('Error storing assistant message:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending query:', error);
      setHasError(true);
      setErrorMessage('Failed to get answer. Please try again.');

      const errorMsg = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [userId, workspaceId]);

  const submitFeedback = useCallback(async (answerId, feedback) => {
    try {
      await fetch(`${API_BASE_URL}/copilot/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          workspaceId,
          answerId,
          feedback // 'like' or 'dislike'
        })
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  }, [userId, workspaceId]);

  const clearHistory = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/copilot/clear-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workspaceId })
      });

      // Reset local state
      setMessages([]);
      setSuggestedQuestions([]);
      setUserQuery('');
      setConversationHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }, [userId, workspaceId]);

  const value = {
    // State
    isOpen,
    messages,
    loading,
    userQuery,
    suggestedQuestions,
    currentTab,
    hasError,
    errorMessage,
    conversationHistory,

    // Actions
    toggleCopilot,
    sendQuery,
    setUserQuery,
    setCurrentTab,
    submitFeedback,
    clearHistory,
    setIsOpen
  };

  return (
    <CopilotContext.Provider value={value}>
      {children}
    </CopilotContext.Provider>
  );
};

export default CopilotContext;
