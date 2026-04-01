import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import Alert from './ui/Alert';
import config from '../config/env';
import authFetch from '../utils/authFetch';

function TOTPVerificationModal({ userEmail, onSuccess, onCancel }) {
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  const [verified, setVerified] = useState(false);

  // Debug logging when modal mounts
  React.useEffect(() => {
    console.log('[TOTPVerificationModal] Modal mounted for email:', userEmail);
  }, [userEmail]);

  const handleVerifyTOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowAlert(false);

    try {
      const codeToVerify = useBackupCode ? backupCode : totpCode;
      
      if (!codeToVerify) {
        setAlertMessage(`Please enter a ${useBackupCode ? 'backup' : 'TOTP'} code`);
        setAlertType('error');
        setShowAlert(true);
        setLoading(false);
        return;
      }

      if (!useBackupCode && !/^\d{6}$/.test(codeToVerify)) {
        setAlertMessage('TOTP code must be 6 digits');
        setAlertType('error');
        setShowAlert(true);
        setLoading(false);
        return;
      }

      const response = await authFetch(
        `${config.VENDOR_BACKEND_URL}/api/vendor/mfa/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            totpCode: codeToVerify,
            useBackupCode: useBackupCode
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setAlertMessage(errorData.message || 'Invalid code. Please try again.');
        setAlertType('error');
        setShowAlert(true);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setVerified(true);
        setAlertMessage('✓ Verification successful!');
        setAlertType('success');
        setShowAlert(true);
        
        // Call onSuccess after a brief delay
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setAlertMessage(data.message || 'Verification failed. Please try again.');
        setAlertType('error');
        setShowAlert(true);
      }
    } catch (err) {
      console.error('Error verifying TOTP:', err);
      setAlertMessage(err.message || 'An error occurred during verification');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (useBackupCode) {
      setBackupCode(value);
    } else {
      // Only allow digits
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      setTotpCode(cleaned);
    }
  };

  if (verified) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified!</h3>
          <p className="text-gray-600">Your account is now verified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Two-Factor Authentication</h2>
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

        <p className="text-gray-600 mb-6">
          {useBackupCode 
            ? 'Enter one of your backup codes to continue'
            : 'Enter the 6-digit code from your authenticator app'
          }
        </p>

        <form onSubmit={handleVerifyTOTP}>
          {!useBackupCode ? (
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength="6"
              value={totpCode}
              onChange={handleInputChange}
              className="w-full text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              disabled={loading}
              required
            />
          ) : (
            <input
              type="text"
              placeholder="Enter backup code"
              value={backupCode}
              onChange={handleInputChange}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              disabled={loading}
              required
            />
          )}

          <button
            type="submit"
            disabled={loading || (useBackupCode ? !backupCode : totpCode.length !== 6)}
            className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setTotpCode('');
              setBackupCode('');
              setError('');
            }}
            className="w-full text-emerald-600 hover:text-emerald-700 text-sm font-medium py-2 transition"
            disabled={loading}
          >
            {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
          </button>
        </form>

        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full text-gray-600 hover:text-gray-700 text-sm py-2 mt-2 transition disabled:opacity-50"
        >
          Cancel
        </button>

        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <p>Don't have access to your authenticator? Use a backup code to sign in.</p>
        </div>
      </div>
    </div>
  );
}

export default TOTPVerificationModal;
