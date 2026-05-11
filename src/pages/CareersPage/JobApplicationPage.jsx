import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '../../contexts/CandidateAuthContext';
import config from '../../config/env';
import './JobApplicationPage.css';

const JobApplicationPage = () => {
  const { jobPostingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getIdToken } = useCandidateAuth();
  
  const [job, setJob] = useState(location.state?.job || null);
  const [loading, setLoading] = useState(!job);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Get the actual job ID from either the job object or URL param
  const actualJobId = job?.id || jobPostingId;

  console.log('JobApplicationPage - jobPostingId from URL:', jobPostingId);
  console.log('JobApplicationPage - job from state:', job);
  console.log('JobApplicationPage - actualJobId:', actualJobId);

  // Pre-fill form with authenticated user data
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    currentCompany: '',
    noticePeriod: '',
    totalExperience: '',
    currentCTC: '',
    expectedCTC: '',
    resumeFile: null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!job) {
      fetchJobDetails();
    }
  }, [actualJobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${config.EMPLOYEE_BACKEND_URL}/api/v1/recruitment/public/job-postings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      const result = await response.json();
      const foundJob = result.data?.find(j => j.id === actualJobId);
      
      if (foundJob) {
        setJob(foundJob);
      } else {
        setError('Job posting not found');
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Unable to load job details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          resumeFile: 'Please upload a PDF or Word document'
        }));
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          resumeFile: 'File size must be less than 5MB'
        }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        resumeFile: file
      }));
      setErrors(prev => ({
        ...prev,
        resumeFile: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.resumeFile) {
      newErrors.resumeFile = 'Resume is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      
      // Create FormData for file upload
      const submitData = new FormData();
      
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email);
      
      // Only append optional fields if they have values
      if (formData.phone) submitData.append('phone', formData.phone);
      if (formData.location) submitData.append('location', formData.location);
      if (formData.linkedinUrl) submitData.append('linkedinUrl', formData.linkedinUrl);
      if (formData.githubUrl) submitData.append('githubUrl', formData.githubUrl);
      if (formData.portfolioUrl) submitData.append('portfolioUrl', formData.portfolioUrl);
      if (formData.currentCompany) submitData.append('currentCompany', formData.currentCompany);
      if (formData.noticePeriod) submitData.append('noticePeriod', formData.noticePeriod);
      
      // Numeric fields - only send if they have values
      if (formData.totalExperience) {
        submitData.append('totalExperience', formData.totalExperience);
      }
      if (formData.currentCTC) {
        submitData.append('currentCTC', formData.currentCTC);
      }
      if (formData.expectedCTC) {
        submitData.append('expectedCTC', formData.expectedCTC);
      }
      
      if (formData.resumeFile) {
        submitData.append('resume', formData.resumeFile);
      }

      const response = await fetch(
        `${config.EMPLOYEE_BACKEND_URL}/api/v1/recruitment/public/job-postings/${actualJobId}/applications`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getIdToken()}`,
          },
          body: submitData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle different error scenarios with user-friendly messages
        if (response.status === 409) {
          throw new Error('You have already submitted an application for this position. We have your details on file and our HR team will review your application. Please check your email for updates on your application status.');
        }
        
        if (response.status === 404) {
          throw new Error('This job posting is no longer available. Please check our careers page for other open positions.');
        }
        
        if (response.status === 403) {
          throw new Error('This job posting is not currently accepting applications. Please check back later or explore other opportunities.');
        }
        
        if (response.status === 410) {
          throw new Error('The application deadline for this position has passed. Please explore our other open positions.');
        }
        
        // Generic error with backend message if available
        const errorMessage = errorData.error?.message || errorData.message || 'We encountered an issue while submitting your application. Please try again or contact our HR team for assistance.';
        throw new Error(errorMessage);
      }

      setSuccess(true);
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="application-page">
        <div className="application-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="application-page">
        <div className="application-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <button onClick={() => navigate('/careers')} className="back-button">
              Back to Careers
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="application-page">
        <div className="application-container">
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h2>Application Submitted Successfully!</h2>
            <p>Thank you for applying to <strong>{job?.title}</strong> at CAASDI CAREERS.</p>
            <p>We've received your application and our HR team will review it shortly. You'll hear from us within 5-7 business days.</p>
            <div className="success-actions">
              <button onClick={() => navigate('/careers')} className="primary-button">
                View More Jobs
              </button>
              <button onClick={() => navigate('/')} className="secondary-button">
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="application-page">
      <div className="application-container">
        {/* Job Summary */}
        <div className="job-summary">
          <button onClick={() => navigate('/careers')} className="back-link">
            ← Back to Careers
          </button>
          <h1>Apply for {job?.title}</h1>
          <div className="job-meta">
            <span>📍 {job?.location}</span>
            <span>💼 {job?.jobType}</span>
            <span>🏢 {job?.department || 'General'}</span>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="application-form">
          <h2>Your Information</h2>

          {error && (
            <div className="form-error-banner">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <div className="error-text">
                  <strong>Unable to Submit Application</strong>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="form-section">
            <h3>Personal Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={errors.firstName ? 'error' : ''}
                  placeholder="John"
                  required
                />
                {errors.firstName && <span className="field-error">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={errors.lastName ? 'error' : ''}
                  placeholder="Doe"
                  required
                />
                {errors.lastName && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="john.doe@example.com"
                  required
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Current Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, Country"
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="form-section">
            <h3>Professional Details</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="totalExperience">Total Experience (Years)</label>
                <input
                  type="number"
                  id="totalExperience"
                  name="totalExperience"
                  value={formData.totalExperience}
                  onChange={handleInputChange}
                  placeholder="5"
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="currentCompany">Current Company</label>
                <input
                  type="text"
                  id="currentCompany"
                  name="currentCompany"
                  value={formData.currentCompany}
                  onChange={handleInputChange}
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="noticePeriod">Notice Period</label>
                <input
                  type="text"
                  id="noticePeriod"
                  name="noticePeriod"
                  value={formData.noticePeriod}
                  onChange={handleInputChange}
                  placeholder="e.g. 30 days, 2 months"
                />
              </div>

              <div className="form-group">
                <label htmlFor="currentCTC">Current CTC</label>
                <input
                  type="number"
                  id="currentCTC"
                  name="currentCTC"
                  value={formData.currentCTC}
                  onChange={handleInputChange}
                  placeholder="Annual CTC in INR"
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="expectedCTC">Expected CTC</label>
              <input
                type="number"
                id="expectedCTC"
                name="expectedCTC"
                value={formData.expectedCTC}
                onChange={handleInputChange}
                placeholder="Annual expected CTC in INR"
                min="0"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="linkedinUrl">LinkedIn Profile</label>
                <input
                  type="url"
                  id="linkedinUrl"
                  name="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="githubUrl">GitHub Profile</label>
                <input
                  type="url"
                  id="githubUrl"
                  name="githubUrl"
                  value={formData.githubUrl}
                  onChange={handleInputChange}
                  placeholder="https://github.com/johndoe"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="portfolioUrl">Portfolio/Website</label>
              <input
                type="url"
                id="portfolioUrl"
                name="portfolioUrl"
                value={formData.portfolioUrl}
                onChange={handleInputChange}
                placeholder="https://johndoe.com"
              />
            </div>
          </div>

          {/* Resume Upload */}
          <div className="form-section">
            <h3>Resume</h3>

            <div className="form-group">
              <label htmlFor="resumeFile">Resume/CV *</label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="resumeFile"
                  name="resumeFile"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className={errors.resumeFile ? 'error' : ''}
                  required
                />
                <label htmlFor="resumeFile" className="file-upload-label">
                  <span className="upload-icon">📎</span>
                  <span className="upload-text">
                    {formData.resumeFile ? formData.resumeFile.name : 'Choose file or drag here'}
                  </span>
                  <span className="upload-hint">PDF, DOC, DOCX (Max 5MB)</span>
                </label>
              </div>
              {errors.resumeFile && <span className="field-error">{errors.resumeFile}</span>}
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/careers')}
              className="cancel-button"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobApplicationPage;
