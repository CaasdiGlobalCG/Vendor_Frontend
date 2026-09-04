import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '../../contexts/CandidateAuthContext';
import { 
  Briefcase, 
  FileText, 
  Gift, 
  User, 
  Search, 
  MapPin, 
  Building2, 
  Clock, 
  DollarSign,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  FileCheck,
  Calendar,
  Download,
  Eye
} from 'lucide-react';
import './CandidateDashboard.css';

const CandidateDashboard = () => {
  console.log('🔍 CandidateDashboard loaded - My Offers tab should be visible');
  const { user, logout, getIdToken } = useCandidateAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobs();
    } else if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'offers') {
      fetchOffers();
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

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const token = getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/recruitment/candidate/offers`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOffers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
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

  const handleAcceptOffer = async (offerId) => {
    if (!confirm('Are you sure you want to accept this offer?')) {
      return;
    }

    try {
      const token = getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/recruitment/candidate/offers/${offerId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert('Offer accepted successfully!');
        fetchOffers();
      } else {
        const error = await response.json();
        alert(error.detail || error.message || 'Failed to accept offer');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert('Failed to accept offer');
    }
  };

  const handleUploadSignedOfferLetter = async (offerId, file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF files are allowed for signed offer letter');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'signed-offer-letters');

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.fileUrl || uploadData.url;

      if (!fileUrl) {
        throw new Error('No file URL returned from upload');
      }

      const token = getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/recruitment/candidate/offers/${offerId}/upload-signed-letter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ fileUrl }),
        }
      );

      if (response.ok) {
        alert('Signed offer letter uploaded successfully! You can now accept the offer.');
        fetchOffers();
      } else {
        const error = await response.json();
        alert(error.detail || error.message || 'Failed to upload signed offer letter');
      }
    } catch (error) {
      console.error('Error uploading signed offer letter:', error);
      alert('Failed to upload signed offer letter: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOffer = async (offerId) => {
    const reason = prompt('Please provide a reason for rejecting this offer (optional):');
    
    if (reason === null) {
      return; // User cancelled
    }

    try {
      const token = getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/recruitment/candidate/offers/${offerId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: reason || undefined }),
        }
      );

      if (response.ok) {
        alert('Offer rejected');
        fetchOffers();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reject offer');
      }
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert('Failed to reject offer');
    }
  };

  const handleDocumentUpload = async (offerId, documentName, file) => {
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    try {
      setLoading(true);

      // 1. Upload file to S3
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'verification-documents');

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.fileUrl || uploadData.url;

      if (!fileUrl) {
        throw new Error('No file URL returned from upload');
      }

      // 2. Update offer with document URL
      const token = getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_BACKEND_URL}/api/v1/recruitment/candidate/offers/${offerId}/upload-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            documentName,
            fileUrl,
          }),
        }
      );

      if (response.ok) {
        alert('Document uploaded successfully!');
        fetchOffers(); // Refresh offers
      } else {
        const error = await response.json();
        alert(error.detail || error.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  const getOfferStatusBadgeClass = (status) => {
    const statusMap = {
      draft: 'status-default',
      pending_approval: 'status-review',
      approved: 'status-review',
      sent: 'status-interview',
      accepted: 'status-accepted',
      rejected: 'status-rejected',
      expired: 'status-rejected',
    };
    return statusMap[status] || 'status-default';
  };

  const getOfferStatusLabel = (status) => {
    const labelMap = {
      draft: 'Draft',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      sent: 'Sent',
      accepted: 'Accepted',
      rejected: 'Rejected',
      expired: 'Expired',
    };
    return labelMap[status] || status;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="candidate-dashboard-new">
      <header className="dashboard-header-new">
        <div className="header-container-new">
          <div className="logo-new">CAASDI CAREERS</div>
          <nav className="nav-tabs-new">
            <button 
              className={`nav-tab-new ${activeTab === 'jobs' ? 'active' : ''}`} 
              onClick={() => setActiveTab('jobs')}
            >
              <Briefcase size={18} />
              <span>Browse Jobs</span>
            </button>
            <button 
              className={`nav-tab-new ${activeTab === 'applications' ? 'active' : ''}`} 
              onClick={() => setActiveTab('applications')}
            >
              <FileText size={18} />
              <span>My Applications</span>
            </button>
            <button 
              className={`nav-tab-new ${activeTab === 'offers' ? 'active' : ''}`} 
              onClick={() => setActiveTab('offers')}
            >
              <Gift size={18} />
              <span>My Offers</span>
            </button>
            <button 
              className={`nav-tab-new ${activeTab === 'profile' ? 'active' : ''}`} 
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} />
              <span>Profile</span>
            </button>
          </nav>
          <div className="header-actions-new">
            <button className="btn-back-new" onClick={() => navigate('/careers')}>
              <ArrowLeft size={16} />
              <span>Back to Careers</span>
            </button>
            <button className="btn-logout-new" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
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
                <Search size={20} />
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
                      <span className="job-department-new">
                        <Building2 size={14} />
                        {job.departmentId}
                      </span>
                      {job.location && (
                        <span className="job-location-new">
                          <MapPin size={14} />
                          {job.location}
                        </span>
                      )}
                    </div>
                    <h3 className="job-title-new">{job.title}</h3>
                    <div className="job-card-footer-new">
                      <div>
                        <div className="compensation-label-new">
                          <DollarSign size={14} />
                          COMPENSATION
                        </div>
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

        {activeTab === 'offers' && (
          <div className="offers-section-new">
            <div className="welcome-section-new">
              <h1 className="welcome-title-new">My Offers</h1>
              <p className="welcome-subtitle-new">Review and respond to your job offers.</p>
            </div>

            {loading ? (
              <div className="loading-state-new">
                <div className="spinner-new"></div>
              </div>
            ) : offers.length === 0 ? (
              <div className="empty-state-new">
                <h3>No offers yet</h3>
                <p>When you receive an offer, it will appear here.</p>
              </div>
            ) : (
              <div className="offers-grid-new">
                {offers.map((offer) => (
                  <div key={offer.id} className="offer-card-new">
                    <div className="offer-header-new">
                      <div>
                        <span className="offer-department-new">
                          <Building2 size={14} />
                          {offer.department}
                        </span>
                        <span className={`status-badge-new ${getOfferStatusBadgeClass(offer.status)}`}>
                          {getOfferStatusLabel(offer.status)}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="offer-title-new">{offer.offeredRole}</h3>
                    
                    <div className="offer-details-new">
                      <div className="offer-detail-row-new">
                        <span className="offer-label-new">
                          <DollarSign size={16} />
                          CTC
                        </span>
                        <span className="offer-value-new">{formatCurrency(offer.offeredCTC)}</span>
                      </div>
                      <div className="offer-detail-row-new">
                        <span className="offer-label-new">
                          <Clock size={16} />
                          Employment Type
                        </span>
                        <span className="offer-value-new">
                          {offer.employmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="offer-detail-row-new">
                        <span className="offer-label-new">
                          <Calendar size={16} />
                          Joining Date
                        </span>
                        <span className="offer-value-new">{formatDate(offer.joiningDate)}</span>
                      </div>
                      {offer.expiresAt && (
                        <div className="offer-detail-row-new">
                          <span className="offer-label-new">
                            <AlertCircle size={16} />
                            Expires On
                          </span>
                          <span className="offer-value-new">{formatDate(offer.expiresAt)}</span>
                        </div>
                      )}
                    </div>

                    {offer.offerLetterUrl && (
                      <div className="offer-document-new">
                        <a 
                          href={offer.offerLetterUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-view-letter-new"
                        >
                          <Download size={18} />
                          Download Offer Letter
                        </a>
                      </div>
                    )}

                    {offer.status === 'sent' && (
                      <>
                        {!offer.signedOfferLetterUrl && (
                          <div className="offer-signed-upload-new">
                            <h4 className="signed-upload-title-new">
                              <FileCheck size={18} />
                              Step 1: Upload Signed Offer Letter
                            </h4>
                            <p className="signed-upload-hint-new">
                              Please download the offer letter, sign it, and upload the signed copy before accepting.
                            </p>
                            <div className="signed-upload-input-new">
                              <label htmlFor={`signed-file-${offer.id}`} className="upload-label-new">
                                <Upload size={16} />
                                Choose Signed PDF
                              </label>
                              <input 
                                type="file" 
                                accept=".pdf"
                                onChange={(e) => handleUploadSignedOfferLetter(offer.id, e.target.files[0])}
                                id={`signed-file-${offer.id}`}
                                className="upload-input-new"
                                disabled={loading}
                              />
                              <div className="upload-hint-new">
                                PDF only (Max 10MB)
                              </div>
                            </div>
                          </div>
                        )}

                        {offer.signedOfferLetterUrl && (
                          <div className="offer-signed-uploaded-new">
                            <span className="upload-badge-success-new">
                              <CheckCircle2 size={16} />
                              Signed Offer Letter Uploaded
                            </span>
                            <a 
                              href={offer.signedOfferLetterUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-view-doc-new"
                            >
                              <Eye size={16} />
                              View
                            </a>
                          </div>
                        )}

                        <div className="offer-actions-new">
                          <button 
                            className="btn-accept-new" 
                            onClick={() => handleAcceptOffer(offer.id)}
                            disabled={!offer.signedOfferLetterUrl || loading}
                            style={{
                              opacity: !offer.signedOfferLetterUrl ? 0.5 : 1,
                              cursor: !offer.signedOfferLetterUrl ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <CheckCircle2 size={18} />
                            Accept Offer
                          </button>
                          <button 
                            className="btn-reject-new" 
                            onClick={() => handleRejectOffer(offer.id)}
                          >
                            <XCircle size={18} />
                            Decline
                          </button>
                        </div>
                      </>
                    )}

                    {offer.status === 'accepted' && (
                      <div className="offer-accepted-message-new">
                        <CheckCircle2 size={18} />
                        You accepted this offer on {formatDate(offer.acceptedAt)}
                      </div>
                    )}

                    {offer.status === 'accepted' && offer.verificationDocumentsRequested && (
                      <div className="offer-documents-section-new">
                        <h4 className="documents-title-new">
                          <FileCheck size={20} />
                          Verification Documents Required
                        </h4>
                        
                        <div className="document-deadline-box-new">
                          <AlertCircle size={18} />
                          <div>
                            <strong>Deadline:</strong> {formatDate(offer.documentDeadline)}
                          </div>
                        </div>
                        
                        {offer.instructions && (
                          <div className="document-instructions-box-new">
                            <FileText size={18} />
                            <div>
                              <strong>Instructions:</strong>
                              <p>{offer.instructions}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="documents-list-new">
                          {offer.requiredDocuments?.map((doc, idx) => (
                            <div key={idx} className="document-item-new">
                              <div className="document-info-new">
                                <strong>{doc.name}</strong>
                                {doc.description && <p>{doc.description}</p>}
                              </div>
                              
                              {doc.uploaded ? (
                                <div className="document-uploaded-new">
                                  <span className="upload-badge-success-new">
                                    <CheckCircle2 size={16} />
                                    Uploaded
                                  </span>
                                  {doc.fileUrl && (
                                    <a 
                                      href={doc.fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="btn-view-doc-new"
                                    >
                                      <Eye size={16} />
                                      View
                                    </a>
                                  )}
                                  {doc.uploadedAt && (
                                    <span className="upload-date-new">
                                      {formatDate(doc.uploadedAt)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="document-upload-new">
                                  <label htmlFor={`file-${offer.id}-${idx}`} className="upload-label-new">
                                    <Upload size={16} />
                                    Choose File
                                  </label>
                                  <input 
                                    type="file" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleDocumentUpload(offer.id, doc.name, e.target.files[0])}
                                    id={`file-${offer.id}-${idx}`}
                                    className="upload-input-new"
                                  />
                                  <div className="upload-hint-new">
                                    PDF, JPG, PNG (Max 5MB)
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {offer.allDocumentsUploaded && (
                          <div className="all-docs-uploaded-new">
                            <CheckCircle2 size={20} />
                            All documents uploaded successfully! HR will review them shortly.
                          </div>
                        )}
                      </div>
                    )}

                    {offer.status === 'rejected' && (
                      <div className="offer-rejected-message-new">
                        You declined this offer on {formatDate(offer.rejectedAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="dashboard-footer-new">
        <div className="footer-content-new">
          <div className="footer-left-new">
            <span className="footer-brand-new">CAASDI CAREERS</span>
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
