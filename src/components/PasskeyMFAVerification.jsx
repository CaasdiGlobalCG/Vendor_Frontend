import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import Alert from './ui/Alert';
import config from '../config/env';

function PasskeyMFAVerification({ userId, userEmail, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    // Automatically start passkey verification when component mounts
    verifyWithPasskey();
  }, []);

  const verifyWithPasskey = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('[PasskeyMFAVerification] Starting verification for userId:', userId);

      // Step 1: Get MFA verification options from backend
      const optionsResponse = await fetch(
        `${config.VENDOR_BACKEND_URL}/api/auth/passkey/mfa-verification-options`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId }),
          credentials: 'include'
        }
      );

      if (!optionsResponse.ok) {
        throw new Error('Failed to get MFA verification options');
      }

      const optionsData = await optionsResponse.json();
      const authenticationOptions = optionsData.data;

      console.log('[PasskeyMFAVerification] Got authentication options:', authenticationOptions);

      // Step 2: Convert base64 strings back to Uint8Array
      const challenge = Uint8Array.from(
        atob(authenticationOptions.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      authenticationOptions.challenge = challenge;

      // Convert credential IDs
      authenticationOptions.allowCredentials = authenticationOptions.allowCredentials.map(cred => ({
        ...cred,
        id: Uint8Array.from(
          atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')),
          c => c.charCodeAt(0)
        )
      }));

      // Step 3: Trigger WebAuthn authentication
      if (!window.PublicKeyCredential) {
        throw new Error('Passkey authentication is not supported on this device');
      }

      const assertion = await navigator.credentials.get({
        publicKey: authenticationOptions
      });

      if (!assertion) {
        throw new Error('Passkey verification was cancelled');
      }

      // Step 4: Send assertion to backend for verification
      console.log('[PasskeyMFAVerification] Sending verification request with userId:', userId);
      const verifyResponse = await fetch(
        `${config.VENDOR_BACKEND_URL}/api/auth/passkey/verify-mfa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            credentialId: assertion.id, // assertion.id is already the credential ID string
            authenticatorData: btoa(
              String.fromCharCode.apply(null, new Uint8Array(assertion.response.authenticatorData))
            ),
            clientDataJSON: btoa(
              String.fromCharCode.apply(null, new Uint8Array(assertion.response.clientDataJSON))
            ),
            signature: btoa(
              String.fromCharCode.apply(null, new Uint8Array(assertion.response.signature))
            )
          }),
          credentials: 'include'
        }
      );

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify passkey');
      }

      const verifyData = await verifyResponse.json();
      
      // Success!
      if (onSuccess) {
        onSuccess(verifyData.data);
      }
    } catch (error) {
      console.error('Passkey verification error:', error);
      setError(error.message);
      setAlertMessage(error.message);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${config.VENDOR_BACKEND_URL}/api/auth/passkey/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: userEmail }),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      setOtpSent(true);
      setShowOTPInput(true);
      setAlertMessage('OTP sent to your email');
      setAlertType('success');
      setShowAlert(true);
    } catch (error) {
      console.error('Send OTP error:', error);
      setError(error.message);
      setAlertMessage(error.message);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${config.VENDOR_BACKEND_URL}/api/auth/passkey/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: userEmail, otp }),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Invalid OTP');
      }

      const verifyData = await response.json();

      // Success!
      if (onSuccess) {
        onSuccess(verifyData.data);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.message);
      setAlertMessage(error.message);
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {showAlert && (
          <div className="mb-4">
            <Alert
              message={alertMessage}
              type={alertType}
              onClose={() => setShowAlert(false)}
            />
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {showOTPInput ? 'Verify with OTP' : 'Verify with Passkey'}
          </h2>
          <button
            aria-label="Close"
            onClick={onCancel}
            className="ml-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
            style={{ lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        {!showOTPInput ? (
          <>
            <p className="text-gray-600 mb-6">
              Please verify your identity using your passkey. Use your biometric or security key to continue.
            </p>

            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
                <p className="text-sm text-gray-600">
                  Waiting for passkey verification...
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Check your device for biometric or security key prompt
                </p>
              </div>
            )}

            {!loading && (
              <div className="space-y-3">
                <button
                  onClick={verifyWithPasskey}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-3 transition duration-200 font-medium"
                >
                  Verify with Passkey
                </button>

                <button
                  onClick={sendOTP}
                  disabled={otpSent}
                  className="w-full text-emerald-600 hover:text-emerald-500 text-sm font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpSent ? 'OTP Sent' : 'Error signing in?'}
                </button>

                {/* Cancel button removed as per request */}
              </div>
            )}

            {/* Try Again button removed as per request */}
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">
                Enter the 6-digit code sent to your email
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
            </div>

            {!loading && (
              <div className="space-y-3">
                <button
                  onClick={verifyOTP}
                  disabled={otp.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition duration-200 font-medium"
                >
                  Verify OTP
                </button>

                <button
                  onClick={() => setShowOTPInput(false)}
                  className="w-full text-emerald-600 hover:text-emerald-500 text-sm font-medium hover:underline"
                >
                  Back to Passkey
                </button>

                <button
                  onClick={onCancel}
                  className="w-full border border-gray-200 text-gray-700 rounded-lg px-6 py-3 hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PasskeyMFAVerification;
