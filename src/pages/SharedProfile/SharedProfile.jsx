import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import config from '../../config/env';
import { getTemplateById } from './portfolio/templates';

// Portfolio page components
import PortfolioLayout from './portfolio/PortfolioLayout';
import CoverPage from './portfolio/CoverPage';
import TableOfContentsPage from './portfolio/TableOfContentsPage';
import AboutPage from './portfolio/AboutPage';
import OverviewValuesPage from './portfolio/OverviewValuesPage';
import WhatWeDoPage from './portfolio/WhatWeDoPage';
import ServicesPage from './portfolio/ServicesPage';
import ProductsPage from './portfolio/ProductsPage';
import ProjectsPage from './portfolio/ProjectsPage';
import PerformancePage from './portfolio/PerformancePage';
import ContactPage from './portfolio/ContactPage';

export default function SharedProfile() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPdfRender = searchParams.get('render') === 'pdf';
  const [vendorData, setVendorData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailsForm, setShowDetailsForm] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [salesMetrics, setSalesMetrics] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [visitorData, setVisitorData] = useState({
    visitorName: '',
    visitorCompany: '',
    visitorPhone: '',
    visitorState: '',
    visitorCountry: ''
  });

  // Decode template + content overrides from URL params
  const template = getTemplateById(searchParams.get('t') || 'classic');

  const contentOverrides = useMemo(() => {
    const dParam = searchParams.get('d');
    if (!dParam) return {};
    try {
      const json = decodeURIComponent(escape(atob(dParam)));
      return JSON.parse(json);
    } catch (e) {
      console.warn('Failed to decode content overrides:', e);
      return {};
    }
  }, [searchParams]);

  // Portfolio customization from URL params or defaults
  const portfolioConfig = {
    accentColor: searchParams.get('color') || template.accentColor || '#F5A623',
    tagline: contentOverrides.tagline || searchParams.get('tagline') || '',
    showAbout: searchParams.get('about') !== 'false',
    showValues: searchParams.get('values') !== 'false',
    showWhatWeDo: searchParams.get('whatwedo') !== 'false',
    showServices: searchParams.get('services') !== 'false',
    showProducts: searchParams.get('products') !== 'false',
    showProjects: searchParams.get('projects') !== 'false',
    showPerformance: searchParams.get('performance') !== 'false',
    showContact: searchParams.get('contact') !== 'false',
  };

  useEffect(() => {
    if (isPdfRender) {
      setShowDetailsForm(false);
    } else {
      const visitorKey = `visitor_submitted_${vendorId}`;
      const hasSubmitted = localStorage.getItem(visitorKey);
      setShowDetailsForm(!hasSubmitted);
    }
    fetchSharedData();
    fetchSalesMetrics();
  }, [isPdfRender, vendorId]);

  const fetchSharedData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/shared/${vendorId}`);
      if (!response.ok) throw new Error('Failed to load shared profile');
      const data = await response.json();

      if (data.success && data.data) {
        const vendor = data.data;
        const stateVal = vendor.companyDetails?.state;
        const countryVal = vendor.companyDetails?.country;
        let location = 'Not provided';
        if (stateVal && stateVal !== 'Not Specified') {
          location = stateVal;
          if (countryVal && countryVal !== 'Not Specified') location = `${stateVal}, ${countryVal}`;
        } else if (countryVal && countryVal !== 'Not Specified') {
          location = countryVal;
        }

        setProfileData({
          name: vendor.vendorDetails?.primaryContactName || 'Not provided',
          vendorId: `#${vendor._id?.substring(0, 6) || 'UNKNOWN'}`,
          companyName: vendor.companyDetails?.companyName || vendor.vendorDetails?.companyName || vendor.name || 'Not provided',
          phone: vendor.vendorDetails?.primaryContactPhone || 'Not provided',
          location,
          email: vendor.vendorDetails?.primaryContactEmail || 'Not provided',
          gstNumber: vendor.companyDetails?.gstNumber || 'Not provided',
          panNumber: vendor.companyDetails?.panNumber || 'Not provided',
        });

        setVendorData(vendor);
        // Use combined projects array (both portfolio + ongoing) if available
        if (vendor.projects?.length > 0) setProjects(vendor.projects);
        if (vendor.products?.length > 0) setProducts(vendor.products);
        if (vendor.services?.length > 0) setServices(vendor.services);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading shared profile:', err);
      setError('Unable to load this profile. It may have been removed or the link is invalid.');
      setLoading(false);
    }
  };

  const fetchSalesMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const statsResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/analytics/subscriptions/stats/${vendorId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setSalesMetrics(statsData.data || statsData.currentMetrics || statsData);
      }
      const forecastResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/analytics/forecast/${vendorId}`);
      if (forecastResponse.ok) {
        const forecastResponseData = await forecastResponse.json();
        setForecastData(forecastResponseData.data || forecastResponseData.forecast || forecastResponseData);
      }
      setLoadingMetrics(false);
    } catch (err) {
      console.warn('Error loading sales metrics:', err);
      setLoadingMetrics(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setVisitorData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDetails = async () => {
    try {
      setIsSaving(true);
      if (!visitorData.visitorName || !visitorData.visitorCompany || !visitorData.visitorPhone || !visitorData.visitorState || !visitorData.visitorCountry) {
        alert('Please fill in all fields');
        setIsSaving(false);
        return;
      }

      const visitorPayload = {
        vendorId,
        visitorName: visitorData.visitorName,
        visitorCompany: visitorData.visitorCompany,
        visitorPhone: visitorData.visitorPhone,
        visitorState: visitorData.visitorState,
        visitorCountry: visitorData.visitorCountry,
        visitedAt: new Date().toISOString()
      };

      try {
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/save-visitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(visitorPayload)
        });
        if (response.ok) console.log('Visitor data saved to backend');
      } catch (backendError) {
        console.warn('Could not save to backend:', backendError);
      }

      localStorage.setItem(`visitor_submitted_${vendorId}`, JSON.stringify({
        submittedAt: new Date().toISOString(),
        ...visitorData
      }));
      setShowDetailsForm(false);
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving visitor details:', error);
      alert('Error. Please try again.');
      setIsSaving(false);
    }
  };

  const buildTOCSections = () => {
    const sections = [];
    let page = 3;
    if (portfolioConfig.showAbout) { sections.push({ title: 'About Us', pageNumber: page }); page++; }
    if (portfolioConfig.showValues && (mergedVisionMission.vision || mergedVisionMission.mission || mergedCoreValues?.length)) {
      sections.push({ title: 'Overview & Values', pageNumber: page }); page++;
    }
    if (portfolioConfig.showWhatWeDo) { sections.push({ title: 'What We Do', pageNumber: page }); page++; }
    if (portfolioConfig.showServices && mergedServices.length > 0) { sections.push({ title: 'Our Services', pageNumber: page }); page++; }
    if (portfolioConfig.showProducts && products.length > 0) { sections.push({ title: 'Our Products', pageNumber: page }); page++; }
    if (portfolioConfig.showProjects && projects.length > 0) { sections.push({ title: 'Case Studies', pageNumber: page }); page++; }
    if (portfolioConfig.showPerformance && salesMetrics) { sections.push({ title: 'Performance & Analytics', pageNumber: page }); page++; }
    if (portfolioConfig.showContact) { sections.push({ title: 'Contact', pageNumber: page }); }
    return sections;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: portfolioConfig.accentColor }} />
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Profile not found'}</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-700 font-medium">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const companyDetails = vendorData.companyDetails || {};
  const co = contentOverrides; // shorthand
  const companyName = co.companyName || profileData?.companyName || 'Company';
  const profileImage = vendorData?.profileImage?.url || null;

  // Merge overrides into data used by pages
  const mergedOverview = co.overview || companyDetails.companyOverview;
  const mergedVisionMission = {
    vision: co.vision || companyDetails.visionAndMission?.vision || '',
    mission: co.mission || companyDetails.visionAndMission?.mission || '',
  };
  const mergedCoreValues = (co.coreValues && co.coreValues.length > 0) ? co.coreValues : companyDetails.coreValues;
  const mergedUSP = co.usp || companyDetails.uniqueSellingProposition;
  const mergedSocialImpact = co.socialImpact || companyDetails.socialImpact;
  const mergedIndustryType = co.industryType || companyDetails.industryType;
  const mergedIndustryOverview = co.industryOverview || companyDetails.industryOverview;
  const mergedBusinessType = co.businessType || companyDetails.businessType;
  const mergedTeamSize = co.teamSize || companyDetails.teamSize;
  const mergedYear = co.yearOfEstablishment || companyDetails.yearOfEstablishment;
  const mergedSegments = (co.segments && co.segments.length > 0) ? co.segments : companyDetails.segments;
  const mergedCerts = (co.certifications && co.certifications.length > 0) ? co.certifications : companyDetails.certifications;
  const mergedServices = (co.services && co.services.length > 0) ? co.services : services;

  // Contact overrides
  const mergedProfileData = {
    ...profileData,
    email: co.contactEmail || profileData?.email,
    phone: co.contactPhone || profileData?.phone,
    address: co.contactAddress || profileData?.address || profileData?.location,
    website: co.contactWebsite || profileData?.website,
  };

  const aboutStats = [
    (mergedTeamSize) && { value: mergedTeamSize, label: 'Team Size' },
    (mergedYear) && { value: mergedYear, label: 'Established' },
    projects.length > 0 && { value: projects.length, label: 'Projects' },
    products.length > 0 && { value: products.length, label: 'Products' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-100">
      {showDetailsForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200" style={{ background: `linear-gradient(135deg, ${portfolioConfig.accentColor}, #1a1a1a)` }}>
              <h2 className="text-xl font-bold text-white">Welcome</h2>
              <p className="text-white/70 text-sm mt-1">Please provide your details to view this company portfolio</p>
            </div>
            <div className="p-6 space-y-4">
              {[
                { name: 'visitorName', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
                { name: 'visitorCompany', label: 'Company Name', type: 'text', placeholder: 'Your company name' },
                { name: 'visitorPhone', label: 'Phone Number', type: 'tel', placeholder: 'Your phone number' },
                { name: 'visitorState', label: 'State', type: 'text', placeholder: 'Your state' },
                { name: 'visitorCountry', label: 'Country', type: 'text', placeholder: 'Your country' },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label} *</label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={visitorData[field.name]}
                    onChange={handleFormChange}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleSaveDetails}
                disabled={isSaving}
                className="w-full px-4 py-3 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                style={{ backgroundColor: portfolioConfig.accentColor }}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Submitting...
                  </>
                ) : 'View Portfolio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showDetailsForm && (
        <PortfolioLayout
          companyName={companyName}
          accentColor={portfolioConfig.accentColor}
          downloadUrl={`${config.VENDOR_BACKEND_URL}/api/vendor/shared/${vendorId}/pdf${window.location.search}`}
        >
          <CoverPage
            pageTitle="Cover"
            companyName={companyName}
            profileImage={profileImage}
            tagline={portfolioConfig.tagline || mergedOverview?.substring(0, 120)}
            accentColor={portfolioConfig.accentColor}
            gstNumber={profileData?.gstNumber}
            panNumber={profileData?.panNumber}
          />
          <TableOfContentsPage
            pageTitle="Table of Contents"
            sections={buildTOCSections()}
            accentColor={portfolioConfig.accentColor}
            tagline={co.welcomeMessage || portfolioConfig.tagline || "Guided by vision, inspired by possibility."}
            profileImage={profileImage}
            contactName={profileData?.name}
          />
          {portfolioConfig.showAbout && (
            <AboutPage
              pageTitle="About Us"
              companyName={companyName}
              profileImage={profileImage}
              overview={mergedOverview}
              stats={aboutStats}
              accentColor={portfolioConfig.accentColor}
            />
          )}
          {portfolioConfig.showValues && (mergedVisionMission.vision || mergedVisionMission.mission || mergedCoreValues?.length) && (
            <OverviewValuesPage
              pageTitle="Overview & Values"
              visionAndMission={mergedVisionMission}
              coreValues={mergedCoreValues}
              uniqueSellingProposition={mergedUSP}
              socialImpact={mergedSocialImpact}
              profileImage={profileImage}
              accentColor={portfolioConfig.accentColor}
            />
          )}
          {portfolioConfig.showWhatWeDo && (
            <WhatWeDoPage
              pageTitle="What We Do"
              industryType={mergedIndustryType}
              industryOverview={mergedIndustryOverview}
              businessType={mergedBusinessType}
              segments={mergedSegments}
              certifications={mergedCerts}
              teamSize={mergedTeamSize}
              yearOfEstablishment={mergedYear}
              accentColor={portfolioConfig.accentColor}
            />
          )}
          {portfolioConfig.showServices && mergedServices.length > 0 && (
            <ServicesPage
              pageTitle="Our Services"
              services={mergedServices}
              accentColor={portfolioConfig.accentColor}
            />
          )}
          {portfolioConfig.showProducts && products.length > 0 && (
            <ProductsPage
              pageTitle="Our Products"
              products={products}
              accentColor={portfolioConfig.accentColor}
            />
          )}
          {portfolioConfig.showProjects && projects.length > 0 && (
            <ProjectsPage
              pageTitle="Case Studies"
              projects={projects}
              accentColor={portfolioConfig.accentColor}
            />
          )}
          {portfolioConfig.showPerformance && !loadingMetrics && salesMetrics && (
            <PerformancePage
              pageTitle="Performance"
              salesMetrics={salesMetrics}
              forecastData={forecastData}
              accentColor={portfolioConfig.accentColor}
            />
          )}
          {portfolioConfig.showContact && (
            <ContactPage
              pageTitle="Contact"
              companyName={companyName}
              profileData={mergedProfileData}
              accentColor={portfolioConfig.accentColor}
              gstNumber={profileData?.gstNumber || companyDetails.gstNumber}
              panNumber={profileData?.panNumber || companyDetails.panNumber}
            />
          )}
        </PortfolioLayout>
      )}
    </div>
  );
}
