import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import PasskeySetup from './PasskeySetup';

function PasskeyRegistrationBanner({ userId, email, onPasskeyRegistered }) {
  const [showBanner, setShowBanner] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const handleDismiss = () => {
    setShowBanner(false);
  };

  const handleSetupSuccess = () => {
    setShowSetup(false);
    setShowBanner(false);
    if (onPasskeyRegistered) {
      onPasskeyRegistered();
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Lock className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                🔐 Enhance Your Security
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Register a passkey to log in faster and more securely. Use your face, fingerprint, or security key for instant access.
              </p>
              <button
                onClick={() => setShowSetup(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition duration-200"
              >
                Set Up Passkey Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {showSetup && (
        <PasskeySetup
          userId={userId}
          email={email}
          onSuccess={handleSetupSuccess}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </>
  );
}

export default PasskeyRegistrationBanner;
