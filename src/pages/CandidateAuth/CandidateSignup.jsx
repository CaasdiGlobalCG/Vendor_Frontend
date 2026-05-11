import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCandidateAuth } from '../../contexts/CandidateAuthContext';
import './CandidateAuth.css';

const CandidateSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, error: authError } = useCandidateAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVerification, setShowVerification] = useState(false);

  const from = location.state?.from || '/careers';
  const jobId = location.state?.jobId;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain uppercase, lowercase, and numbers');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });

      // Show verification page
      setShowVerification(true);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="candidate-auth-page">
        <div className="auth-hero-section">
          <h2>Precision in your<br />next career move.</h2>
          <p>Architecting executive futures with unrivaled professional clarity.</p>
        </div>
        
        <div className="candidate-auth-container">
          <div className="candidate-auth-header">
            <div className="success-icon-large">✓</div>
            <h1>Verify Your Email</h1>
            <p>We've sent a verification code to <strong>{formData.email}</strong></p>
          </div>

          <div className="verification-instructions">
            <p>Please check your email and click the verification link to activate your account.</p>
            <p>Once verified, you can login and continue your application.</p>
          </div>

          <div className="verification-actions">
            <Link
              to="/careers/verify-email"
              state={{ email: formData.email, from, jobId }}
              className="auth-submit-button"
            >
              ENTER VERIFICATION CODE
            </Link>

            <Link
              to="/careers/login"
              state={{ from, jobId }}
              className="auth-secondary-button"
            >
              Go to Login
            </Link>
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
          <h1>Create Your Account</h1>
          <p>Join us and start your career journey</p>
        </div>

        <form onSubmit={handleSubmit} className="candidate-auth-form">
          {(error || authError) && (
            <div className="auth-error-banner">
              <span className="error-icon">⚠️</span>
              <span>{error || authError}</span>
            </div>
          )}

          {jobId && (
            <div className="auth-info-banner">
              <span className="info-icon">ℹ️</span>
              <span>Create an account to apply for this position</span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="John"
                autoComplete="given-name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Doe"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a strong password"
              autoComplete="new-password"
            />
            <small className="form-hint">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>

          <div className="auth-divider">
            <span>Already have an account?</span>
          </div>

          <Link
            to="/careers/login"
            state={{ from, jobId }}
            className="auth-secondary-button"
          >
            Sign In
          </Link>

          <Link to="/careers" className="back-to-careers-link">
            ← Back to Careers
          </Link>
        </form>
      </div>
    </div>
  );
};

export default CandidateSignup;
