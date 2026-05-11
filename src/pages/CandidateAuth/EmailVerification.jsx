import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCandidateAuth } from '../../contexts/CandidateAuthContext';
import './CandidateAuth.css';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmSignup, resendConfirmationCode, error: authError } = useCandidateAuth();

  const email = location.state?.email || '';
  const from = location.state?.from || '/careers';
  const jobId = location.state?.jobId;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await confirmSignup(email, code);
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/careers/login', { state: { from, jobId } });
      }, 2000);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResending(true);

    try {
      await resendConfirmationCode(email);
      alert('Verification code resent! Please check your email.');
    } catch (err) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="candidate-auth-page">
        <div className="auth-hero-section">
          <h2>Precision in your<br />next career move.</h2>
          <p>Architecting executive futures with unrivaled professional clarity.</p>
        </div>
        
        <div className="candidate-auth-container">
          <div className="candidate-auth-header">
            <div className="success-icon-large">✓</div>
            <h1>Email Verified!</h1>
            <p>Your account has been successfully verified.</p>
            <p>Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="candidate-auth-page">
      <div className="auth-hero-section">
        <h2>Precision in your<br />next career move.</h2>
        <p>Architecting executive futures with unrivaled professional clarity.</p>
      </div>
      
      <div className="candidate-auth-container">
        <div className="candidate-auth-header">
          <h1>Verify Your Email</h1>
          <p>Enter the verification code sent to</p>
          <p><strong>{email}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="candidate-auth-form">
          {(error || authError) && (
            <div className="auth-error-banner">
              <span className="error-icon">⚠️</span>
              <span>{error || authError}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              type="text"
              id="code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="Enter 6-digit code"
              maxLength="6"
              autoComplete="one-time-code"
              className="verification-code-input"
            />
          </div>

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'VERIFYING...' : 'VERIFY EMAIL'}
          </button>

          <div className="auth-divider">
            <span>Didn't receive the code?</span>
          </div>

          <button
            type="button"
            onClick={handleResendCode}
            className="auth-secondary-button"
            disabled={resending}
          >
            {resending ? 'Resending...' : 'Resend Code'}
          </button>

          <Link to="/careers/login" className="back-to-careers-link">
            ← Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
};

export default EmailVerification;
