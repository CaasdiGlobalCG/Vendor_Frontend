import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCandidateAuth } from '../../contexts/CandidateAuthContext';
import './CandidateAuth.css';

const CandidateLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError } = useCandidateAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get the redirect path from location state (where user was trying to go)
  const from = location.state?.from || '/careers/dashboard';
  const jobId = location.state?.jobId;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      
      // Redirect to application page if jobId exists, otherwise to careers page
      if (jobId) {
        navigate(`/careers/apply/${jobId}`);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-auth-page">
      <div className="auth-hero-section">
        <h2>Precision in your<br />next career move.</h2>
        <p>Architecting executive futures with unrivaled professional clarity.</p>
      </div>
      
      <div className="candidate-auth-container">
        <div className="candidate-auth-header">
          <h1>Welcome back</h1>
          <p>Access your professional dashboard and applications.</p>
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
              <span>Please login to apply for this position</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="alexander.vance@executive.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="form-actions-row">
            <Link to="/careers/forgot-password" className="forgot-password-link">
              Forget password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <div className="auth-divider">
            <span>Don't have an account?</span>
          </div>

          <Link
            to="/careers/signup"
            state={{ from, jobId }}
            className="auth-secondary-button"
          >
            Apply for Access
          </Link>

          <Link to="/careers" className="back-to-careers-link">
            ← Back to Careers
          </Link>
        </form>
      </div>
    </div>
  );
};

export default CandidateLogin;
