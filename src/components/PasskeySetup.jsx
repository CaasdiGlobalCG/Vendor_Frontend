import React, { useState } from 'react';
import { Loader, X } from 'lucide-react';
import Alert from './ui/Alert';
import config from '../config/env';

function PasskeySetup({ userId, email, onSuccess, onCancel }) {
  const [step, setStep] = useState('info'); // 'info', 'registering', 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  const [passkeyName, setPasskeyName] = useState('');

  const startPasskeyRegistration = async () => {
    try {
      setLoading(true);
      setError('');
      setStep('registering');

      // Step 1: Get registration options from backend
      const optionsResponse = await fetch(
        `${config.VENDOR_BACKEND_URL}/api/auth/passkey/registration-options`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, email }),
          credentials: 'include'
        }
      );

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const optionsData = await optionsResponse.json();
      const registrationOptions = optionsData.data;

      // Step 2: Convert challenge to Uint8Array
      const challenge = Uint8Array.from(
        atob(registrationOptions.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      registrationOptions.challenge = challenge;

      // Step 3: Convert user ID to Uint8Array
      registrationOptions.user.id = Uint8Array.from(
        atob(registrationOptions.user.id.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // Step 4: Trigger WebAuthn registration
      if (!window.PublicKeyCredential) {
        throw new Error('Passkey registration is not supported on this device');
      }

      const credential = await navigator.credentials.create({
        publicKey: registrationOptions
      });

      if (!credential) {
        throw new Error('Passkey registration was cancelled');
      }

      // Step 5: Prepare credential data for backend
      const attestationObject = credential.response.attestationObject;
      const clientDataJSON = credential.response.clientDataJSON;
      const credentialId = credential.id;

      // Convert to base64 for transmission
      const attestationObjectB64 = btoa(
        String.fromCharCode.apply(null, new Uint8Array(attestationObject))
      );
      const clientDataJSONB64 = btoa(
        String.fromCharCode.apply(null, new Uint8Array(clientDataJSON))
      );

      // Extract public key (simplified - in production, parse attestationObject properly)
      const publicKeyB64 = btoa(JSON.stringify({
        attestationObject: attestationObjectB64,
        clientDataJSON: clientDataJSONB64
      }));

      // Step 6: Send registration to backend
      const registerResponse = await fetch(
        `${config.VENDOR_BACKEND_URL}/api/auth/passkey/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            credentialId,
            publicKey: publicKeyB64,
            passkeyName: passkeyName || 'My Passkey',
            attestationObject: attestationObjectB64,
            clientDataJSON: clientDataJSONB64
          }),
          credentials: 'include'
        }
      );

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.message || 'Failed to register passkey');
      }

      const registerData = await registerResponse.json();
      
      setStep('success');
      setAlertMessage('Passkey registered successfully!');
      setAlertType('success');
      setShowAlert(true);

      // Call success callback after 2 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(registerData.data);
        }
      }, 2000);
    } catch (error) {
      console.error('Passkey registration error:', error);
      setError(error.message);
      setAlertMessage(error.message);
      setAlertType('error');
      setShowAlert(true);
      setStep('info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Set Up Passkey</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {showAlert && (
          <div className="mb-4">
            <Alert
              message={alertMessage}
              type={alertType}
              onClose={() => setShowAlert(false)}
            />
          </div>
        )}

        {step === 'info' && (
          <>
            <p className="text-gray-600 mb-6">
              A passkey is a secure and convenient way to log in. You can use your face, fingerprint, or security key.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Benefits:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
                <li>✓ Faster login</li>
                <li>✓ More secure than passwords</li>
                <li>✓ Works across your devices</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passkey Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., My iPhone, My Laptop"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={startPasskeyRegistration}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-3 transition duration-200 font-medium"
              >
                Create Passkey
              </button>
              
              <button
                onClick={onCancel}
                className="w-full border border-gray-200 text-gray-700 rounded-lg px-6 py-3 hover:bg-gray-50 transition duration-200"
              >
                Skip for Now
              </button>
            </div>
          </>
        )}

        {step === 'registering' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
            <p className="text-sm text-gray-600 text-center">
              Creating your passkey...
            </p>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Look for biometric or security key prompts on your device
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">Success!</p>
            <p className="text-sm text-gray-600 text-center">
              Your passkey has been set up. You can now log in using it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PasskeySetup;
