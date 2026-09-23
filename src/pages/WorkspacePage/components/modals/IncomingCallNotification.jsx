import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, X } from 'lucide-react';
import useVideoCall from '../../../../hooks/useVideoCall';

/**
 * IncomingCallNotification - Component to show incoming call notification
 * Allows user to accept or decline a call
 */
const IncomingCallNotification = ({
  notification,
  onAccept,
  onDecline,
  currentUser
}) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const { declineCall, isLoading } = useVideoCall();

  // Auto-dismiss after 30 seconds if not accepted or declined
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDecline();
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async () => {
    try {
      if (onAccept) {
        await onAccept(notification.data);
      }
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  };

  const handleDecline = async () => {
    try {
      const { meetingId } = notification.data;
      const userId = currentUser?.vendorId || currentUser?.id;
      const userName = currentUser?.name || 'User';

      await declineCall(meetingId, userId, userName);

      if (onDecline) {
        onDecline(notification.id);
      }
    } catch (err) {
      console.error('Error declining call:', err);
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm transform transition-all duration-300 ${
        isAnimating ? ' opacity-100' : ' opacity-0'
      }`}
    >
      <div className="bg-black text-white rounded-lg shadow-2xl overflow-hidden">
        {/* Top border animated */}
        <div className="h-1 bg-black animate-pulse"></div>

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold">📞 Incoming Call</h3>
              <p className="text-sm text-info mt-1">
                {notification.data.initiatorName} is calling...
              </p>
            </div>
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="p-1 hover:bg-info rounded-full transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Call Title */}
          <div className="bg-info bg-opacity-50 rounded-lg p-3">
            <p className="text-sm font-semibold text-info">Call Title:</p>
            <p className="text-white font-medium truncate">{notification.data.callTitle}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-success hover:bg-success disabled:bg-cta text-cta-foreground font-semibold py-2 px-4 rounded-lg transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Phone className="w-5 h-5" />
              {isLoading ? 'Joining...' : 'Accept'}
            </button>

            {/* Decline Button */}
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-danger hover:bg-danger disabled:bg-cta text-cta-foreground font-semibold py-2 px-4 rounded-lg transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <PhoneOff className="w-5 h-5" />
              {isLoading ? 'Declining...' : 'Decline'}
            </button>
          </div>

          {/* Ringing animation */}
          <div className="flex justify-center gap-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-info/20 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
