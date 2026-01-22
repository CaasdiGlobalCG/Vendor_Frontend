/**
 * Copilot Service
 * Handles all API calls to the copilot backend
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001/api';

export const copilotService = {
  /**
   * Search for answers based on user query
   */
  searchAnswers: async (query, userId, workspaceId, limit = 5) => {
    try {
      const response = await fetch(`${API_BASE_URL}/copilot/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          limit,
          userId,
          workspaceId
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Copilot search error:', error);
      throw error;
    }
  },

  /**
   * Get entire knowledge base
   */
  getKnowledgeBase: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/copilot/knowledge-base`);

      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge base: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      throw error;
    }
  },

  /**
   * Get conversation history
   */
  getConversationHistory: async (userId, workspaceId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/copilot/history?userId=${userId}&workspaceId=${workspaceId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw error;
    }
  },

  /**
   * Store a message in conversation history
   */
  storeMessage: async (userId, workspaceId, type, content, relatedAnswerId = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/copilot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          workspaceId,
          type,
          content,
          relatedAnswerId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to store message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error storing message:', error);
      throw error;
    }
  },

  /**
   * Submit feedback on an answer
   */
  submitFeedback: async (userId, workspaceId, answerId, feedback) => {
    try {
      if (!['like', 'dislike'].includes(feedback)) {
        throw new Error('Feedback must be "like" or "dislike"');
      }

      const response = await fetch(`${API_BASE_URL}/copilot/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          workspaceId,
          answerId,
          feedback
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  /**
   * Get suggested follow-up questions for an answer
   */
  getSuggestedQuestions: async (answerId, limit = 3) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/copilot/suggested-questions?answerId=${answerId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting suggested questions:', error);
      throw error;
    }
  },

  /**
   * Get quick action suggestions based on current tab
   */
  getQuickActions: async (currentTab = 'tasks') => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/copilot/quick-actions?currentTab=${currentTab}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get quick actions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting quick actions:', error);
      throw error;
    }
  },

  /**
   * Clear conversation history
   */
  clearHistory: async (userId, workspaceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/copilot/clear-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          workspaceId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }
};

export default copilotService;
