import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '../../contexts/CandidateAuthContext';
import './CandidateDashboard.css';

const CandidateDashboard = () => {
  const { user, logout, getIdToken } = useCandidateAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobs();
    } else if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [activeTab]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/recruitment/public/job-postings`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setJobs(data.data || data.jobPostings || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const token = getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/recruitment/candidate/applications`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/careers');
  };

  const handleApply = (jobId) => {
    navigate(`/careers/apply/${jobId}`);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchQuery === '' ||
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      filterDepartment === 'all' || job.departmentId === filterDepartment;
    const matchesLocation =
      filterLocation === 'all' || job.location === filterLocation;
    return matchesSearch && matchesDepartment && matchesLocation;
  });

  const departments = [...new Set(jobs.map((job) => job.departmentId))];
  const locations = [...new Set(jobs.map((job) => job.location))];

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      submitted: 'status-submitted',
      under_review: 'status-review',
      shortlisted: 'status-shortlisted',
      interview_scheduled: 'status-interview',
      rejected: 'status-rejected',
      accepted: 'status-accepted',
      offer_extended: 'status-offer',
    };
    return statusMap[status] || 'status-default';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      submitted: 'Submitted',
      under_review: 'Under Review',
      shortlisted: 'Shortlisted',
      interview_scheduled: 'Interview Scheduled',
      rejected: 'Rejected',
      accepted: 'Accepted',
      offer_extended: 'Offer Extended',
    };
    return labelMap[status] || status;
  };

  return (
    <div className="candidate-dashboard-new">
      <header className="dashboard-header-new">
        <div className="header-container-new">
          <div className="logo-new">CAREER.ARCH</div>
          <nav className="nav-tabs-new">
            <button 
              className={`nav-tab-new ${activeTab === 'jobs' ? 'active' : ''}`} 
              onClick={() => setActiveTab('jobs')}
            >
              Browse Jobs
            </button>
            <button 
              className={`nav-tab-new ${activeTab === 'applications' ? 'active' : ''}`} 
              onClick={() => setActiveTab('applications')}
            >
              My Applications
            </button>
            <button 
              className={`nav-tab-new ${activeTab === 'profile' ? 'active' : ''}`} 
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
          </nav>
          <div className="header-actions-new">
            <button className="btn-back-new" onClick={() => navigate('/careers')}>
              ← Back to Careers
            </button>
            <button className="btn-logout-new" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content-new">
        {activeTab === 'jobs' && (
          <div className="jobs-section-new">
            <div className="welcome-section-new">
              <h1 className="welcome-title-new">Welcome back, {user?.firstName}!</h1>
              <p className="welcome-subtitle-new">Explore new opportunities and track your career growth.</p>
            </div>

            <div className="search-filters-new">
              <div className="search-box-new">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search jobs..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              <select 
                value={filterDepartment} 
                onChange={(e) => setFilterDepartment(e.target.value)} 
                className="filter-select-new"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select 
                value={filterLocation} 
                onChange={(e) => setFilterLocation(e.target.value)} 
                className="filter-select-new"
              >
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading-state-new">
                <div className="spinner-new"></div>
                <p>Loading...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="empty-state-new">
                <h3>No jobs found</h3>
              </div>
            ) : (
              <div className="jobs-grid-new">
                {filteredJobs.map((job) => (
                  <div key={job.id} className="job-card-new">
                    <div className="job-card-top-new">
                      <span className="job-department-new">{job.departmentId}</span>
                    </div>
                    <h3 className="job-title-new">{job.title}</h3>
                    <div className="job-card-footer-new">
                      <div>
                        <div className="compensation-label-new">COMPENSATION</div>
                        <div className="job-salary-new">
                          {job.salaryMin && job.salaryMax 
                            ? `${job.currency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}` 
                            : 'Competitive'}
                        </div>
                      </div>
                      <button 
                        className="btn-apply-new" 
                        onClick={() => handleApply(job.id)}
                      >
                        APPLY NOW
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="applications-section-new">
            <div className="welcome-section-new">
              <h1 className="welcome-title-new">My Applications</h1>
            </div>

            {loading ? (
              <div className="loading-state-new">
                <div className="spinner-new"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="empty-state-new">
                <h3>No applications yet</h3>
                <button 
                  className="btn-primary-new" 
                  onClick={() => setActiveTab('jobs')}
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="applications-grid-new">
                {applications.map((app) => (
                  <div key={app.id} className="application-card-new">
                    <div className="application-header-new">
                      <span className="application-department-new">{app.departmentId}</span>
                      <span className={`status-badge-new ${getStatusBadgeClass(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                    <h3 className="application-title-new">{app.jobTitle}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section-new">
            <div className="welcome-section-new">
              <h1 className="welcome-title-new">Profile</h1>
            </div>

            <div className="profile-card-new">
              <div className="profile-header-new">
                <div className="profile-avatar-new">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div className="profile-info-new">
                  <h2 className="profile-name-new">{user?.firstName} {user?.lastName}</h2>
                  <p className="profile-email-new">{user?.email}</p>
                </div>
              </div>

              <div className="profile-stats-new">
                <div className="stat-card-new">
                  <div className="stat-value-new">{applications.length}</div>
                  <div className="stat-label-new">Applications</div>
                </div>
                <div className="stat-card-new">
                  <div className="stat-value-new">
                    {applications.filter((app) => app.status === 'under_review').length}
                  </div>
                  <div className="stat-label-new">Under Review</div>
                </div>
                <div className="stat-card-new">
                  <div className="stat-value-new">
                    {applications.filter((app) => app.status === 'interview_scheduled').length}
                  </div>
                  <div className="stat-label-new">Interviews</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="dashboard-footer-new">
        <div className="footer-content-new">
          <div className="footer-left-new">
            <span className="footer-brand-new">CAREER.ARCH</span>
            <span className="footer-copyright-new">© 2023 ALL RIGHTS RESERVED</span>
          </div>
          <div className="footer-links-new">
            <a href="#">PRIVACY POLICY</a>
            <a href="#">TERMS OF SERVICE</a>
            <a href="#">CONTACT SUPPORT</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CandidateDashboard;
