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
      {/* Slim one-line notice — visible but never dominant */}
      <div className="mb-4 flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2">
        <Lock size={14} className="flex-shrink-0 text-dim" />
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink">
          <span className="font-medium">Enhance your security</span>
          <span className="hidden text-dim sm:inline"> — log in faster with face, fingerprint, or a security key.</span>
        </p>
        <button
          onClick={() => setShowSetup(true)}
          className="flex-shrink-0 rounded-md bg-cta px-3 py-1.5 text-xs font-medium text-cta-foreground transition hover:opacity-90"
        >
          Set up passkey
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded p-1 text-dim transition hover:text-ink"
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
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
