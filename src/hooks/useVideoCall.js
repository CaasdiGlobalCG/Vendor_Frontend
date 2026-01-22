import { useState, useCallback, useRef, useEffect } from 'react';
import config from '../config/env';

/**
 * Custom hook for managing video calls
 * Handles call initiation, joining, leaving, and state management
 */
export const useVideoCall = () => {
  const [activeCall, setActiveCall] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const chimeSDKRef = useRef(null);

  /**
   * Start a new video call
   */
  const startCall = useCallback(async (callData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { workspaceId, callTitle, initiatorId, initiatorName, invitedUserIds } = callData;

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/calls/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          workspaceId,
          callTitle,
          initiatorId,
          initiatorName,
          invitedUserIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start call');
      }

      const result = await response.json();
      setActiveCall(result.call);
      setParticipants(result.call.participants || []);

      console.log('✅ Call started:', result.call.meetingId);
      return result.call;

    } catch (err) {
      console.error('❌ Error starting call:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Join an existing call
   */
  const joinCall = useCallback(async (meetingId, userId, userName) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/calls/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          meetingId,
          userId,
          userName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to join call');
      }

      const result = await response.json();
      setActiveCall(result.call);
      setParticipants(result.call.participants || []);

      console.log('✅ Joined call:', meetingId);
      return result;

    } catch (err) {
      console.error('❌ Error joining call:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Leave the current call
   */
  const leaveCall = useCallback(async (meetingId, userId, userName) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/calls/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          meetingId,
          userId,
          userName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to leave call');
      }

      setActiveCall(null);
      setParticipants([]);

      console.log('✅ Left call');
      return true;

    } catch (err) {
      console.error('❌ Error leaving call:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Decline a call invitation
   */
  const declineCall = useCallback(async (meetingId, userId, userName) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/calls/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          meetingId,
          userId,
          userName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to decline call');
      }

      console.log('✅ Call declined');
      return true;

    } catch (err) {
      console.error('❌ Error declining call:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * End the call (initiator only)
   */
  const endCall = useCallback(async (meetingId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/calls/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ meetingId })
      });

      if (!response.ok) {
        throw new Error('Failed to end call');
      }

      setActiveCall(null);
      setParticipants([]);

      console.log('✅ Call ended');
      return true;

    } catch (err) {
      console.error('❌ Error ending call:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get call details
   */
  const getCallDetails = useCallback(async (meetingId) => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/calls/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get call details');
      }

      const result = await response.json();
      return result.call;

    } catch (err) {
      console.error('❌ Error getting call details:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    activeCall,
    participants,
    isLoading,
    error,
    startCall,
    joinCall,
    leaveCall,
    declineCall,
    endCall,
    getCallDetails,
    setActiveCall,
    setParticipants,
    setError
  };
};

export default useVideoCall;
