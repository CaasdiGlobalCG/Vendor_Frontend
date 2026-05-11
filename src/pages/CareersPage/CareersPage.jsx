import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '../../contexts/CandidateAuthContext';
import config from '../../config/env';
import './CareersPage.css';

const CareersPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useCandidateAuth();
  const [jobPostings, setJobPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  // Fetch published job postings from Employee backend
  useEffect(() => {
    fetchJobPostings();
  }, []);

  const fetchJobPostings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${config.EMPLOYEE_BACKEND_URL}/api/v1/recruitment/public/job-postings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job postings');
      }
      
      const result = await response.json();
      setJobPostings(result.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching job postings:', err);
      setError('Unable to load job postings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Redirect to login with job info
      navigate('/careers/login', { 
        state: { 
          from: `/careers/apply/${job.id}`,
          jobId: job.id,
          job: job
        } 
      });
    } else {
      // User is authenticated, go to application page
      navigate(`/careers/apply/${job.id}`, { state: { job } });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getJobTypeLabel = (type) => {
    const labels = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      'contract': 'Contract',
      'internship': 'Internship',
      'temporary': 'Temporary'
    };
    return labels[type] || type;
  };

  const getLocationLabel = (location) => {
    const labels = {
      'remote': 'Remote',
      'onsite': 'On-site',
      'hybrid': 'Hybrid'
    };
    return labels[location] || location;
  };

  if (loading) {
    return (
      <div className="careers-page">
        <div className="careers-hero">
          <div className="careers-hero-content">
            <h1>Join Our Team</h1>
            <p>Build your career with CAASDI CAREERS</p>
          </div>
        </div>
        <div className="careers-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="careers-page">
        <div className="careers-hero">
          <div className="careers-hero-content">
            <h1>Join Our Team</h1>
            <p>Build your career with CAASDI CAREERS</p>
          </div>
        </div>
        <div className="careers-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <button onClick={fetchJobPostings} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="careers-page">
      {/* Dashboard Banner for Logged-in Users */}
      {isAuthenticated && (
        <div className="dashboard-banner">
          <div className="banner-content">
            <div className="banner-text">
              <span className="banner-icon">👋</span>
              <span>Welcome back! View your applications and profile in your dashboard.</span>
            </div>
            <button 
              onClick={() => navigate('/careers/dashboard')}
              className="dashboard-banner-button"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="careers-hero-new">
        <div className="hero-content-new">
          <h1 className="hero-title-new">Join Our Team</h1>
          <p className="hero-subtitle-new">
            Build your career with CAASDI CAREERS. We bridge the gap between architectural excellence and high-impact technology.
          </p>
          
          <div className="hero-stats-new">
            <div className="stat-item-new">
              <div className="stat-number-new">{jobPostings.length}</div>
              <div className="stat-label-new">OPEN POSITIONS</div>
            </div>
            <div className="stat-item-new">
              <div className="stat-number-new">50+</div>
              <div className="stat-label-new">TEAM MEMBERS</div>
            </div>
            <div className="stat-item-new">
              <div className="stat-number-new">10+</div>
              <div className="stat-label-new">COUNTRIES</div>
            </div>
          </div>
        </div>
      </div>

      {/* Job Listings Section */}
      <div className="careers-container-new">
        <div className="section-header-new">
          <div>
            <h2 className="section-title-new">Open Positions</h2>
            <p className="section-subtitle-new">Explore opportunities to grow with us and shape the future of tech.</p>
          </div>
          {jobPostings.length > 0 && (
            <button className="view-all-button">View All Roles</button>
          )}
        </div>

        {loading ? (
          <div className="loading-state-new">
            <div className="spinner-new"></div>
            <p>Loading opportunities...</p>
          </div>
        ) : error ? (
          <div className="error-state-new">
            <div className="error-icon-new">⚠️</div>
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <button onClick={fetchJobPostings} className="retry-button-new">
              Try Again
            </button>
          </div>
        ) : jobPostings.length === 0 ? (
          <div className="empty-state-new">
            <div className="empty-icon-new">💼</div>
            <h3>No Open Positions</h3>
            <p>We don't have any open positions at the moment, but we're always looking for talented individuals.</p>
            <p>Check back soon or send us your resume at <a href="mailto:careers@caasdiglobal.com">careers@caasdiglobal.com</a></p>
          </div>
        ) : (
          <div className="jobs-grid-new">
            {jobPostings.map((job) => (
              <div key={job.id} className="job-card-new">
                <div className="job-card-header-new">
                  <div className="job-icon-new">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6M8 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V8C20 6.89543 19.1046 6 18 6H16M8 6H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="job-date-new">
                    POSTED {formatDate(job.publishedAt || job.createdAt).toUpperCase()}
                  </div>
                </div>

                <h3 className="job-title-new">{job.title}</h3>

                <div className="job-meta-new">
                  <span className="meta-badge-new">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 7C8.10457 7 9 6.10457 9 5C9 3.89543 8.10457 3 7 3C5.89543 3 5 3.89543 5 5C5 6.10457 5.89543 7 7 7Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 12C7 12 11 9 11 5.5C11 3.01472 9.48528 1.5 7 1.5C4.51472 1.5 3 3.01472 3 5.5C3 9 7 12 7 12Z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    {job.location || 'Remote'}
                  </span>
                  <span className="meta-badge-new">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 3.5V7L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {job.jobType || 'Full-time'}
                  </span>
                  <span className="meta-badge-new">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7H13M1 3.5H13M1 10.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {job.departmentId || 'General'}
                  </span>
                </div>

                <div className="job-card-footer-new">
                  <div className="job-salary-new">
                    {job.salaryMin && job.salaryMax
                      ? `$${(job.salaryMin / 1000).toFixed(0)}k - $${(job.salaryMax / 1000).toFixed(0)}k`
                      : 'Competitive Salary'}
                  </div>
                  <button 
                    onClick={() => handleApplyClick(job)}
                    className="apply-button-new"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="cta-section-new">
        <div className="cta-content-new">
          <h2 className="cta-title-new">Ready to design your next chapter?</h2>
          <p className="cta-subtitle-new">
            Join 50,000+ elite professionals receiving curated career opportunities every week.
          </p>
          <div className="cta-buttons-new">
            <button className="cta-button-primary-new">UPLOAD RESUME</button>
            <button className="cta-button-secondary-new">BROWSE COMPANIES</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;
