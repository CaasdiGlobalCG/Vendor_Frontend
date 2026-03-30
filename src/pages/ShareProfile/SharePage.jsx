import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  Copy, Check, Mail, MessageSquare, Share2, Palette, Eye, Settings,
  ChevronRight, ChevronLeft, X, ToggleLeft, ToggleRight, Download,
  FileText, Layout, PenLine, Send, Loader2
} from 'lucide-react';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';
import { PORTFOLIO_TEMPLATES, getTemplateById } from '../SharedProfile/portfolio/templates';
import PortfolioEditor from './PortfolioEditor';
import TemplateSelector from './TemplateSelector';

const STEPS = [
  { key: 'template', label: 'Choose Template', icon: Layout },
  { key: 'content', label: 'Edit Content', icon: PenLine },
  { key: 'settings', label: 'Settings & Share', icon: Send },
];

const DEFAULT_SECTIONS = {
  about: { label: 'About Us', description: 'Company overview and key stats', enabled: true },
  values: { label: 'Overview & Values', description: 'Vision, mission, and core values', enabled: true },
  whatwedo: { label: 'What We Do', description: 'Industry, certifications, segments', enabled: true },
  services: { label: 'Our Services', description: 'Services you offer', enabled: true },
  products: { label: 'Our Products', description: 'Product catalog', enabled: true },
  projects: { label: 'Case Studies', description: 'Project portfolio', enabled: true },
  performance: { label: 'Performance', description: 'Analytics and metrics', enabled: true },
  contact: { label: 'Contact', description: 'Contact info and thank you', enabled: true },
};

export default function SharePage() {
  const { currentUser, vendorData } = useContext(VendorContext);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareMethod, setShareMethod] = useState('link');

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState(PORTFOLIO_TEMPLATES[0]);

  // Section toggles
  const [sections, setSections] = useState(DEFAULT_SECTIONS);

  // Content overrides (populated from vendor data initially)
  const [content, setContent] = useState({});

  const vendorId = currentUser?.vendorId || vendorData?._id || '';
  const companyDetails = vendorData?.companyDetails || {};

  // Fetch services and products from API
  const [fetchedServices, setFetchedServices] = useState([]);
  const [fetchedProducts, setFetchedProducts] = useState([]);
  const dataFetched = useRef(false);

  useEffect(() => {
    if (!currentUser || dataFetched.current) return;
    dataFetched.current = true;

    const token = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const fetchServices = async () => {
      try {
        const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
          credentials: 'include',
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          setFetchedServices(items);
        }
      } catch (e) {
        console.warn('Failed to fetch services for portfolio:', e);
      }
    };

    const fetchProducts = async () => {
      try {
        const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
          credentials: 'include',
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          setFetchedProducts(items);
        }
      } catch (e) {
        console.warn('Failed to fetch products for portfolio:', e);
      }
    };

    fetchServices();
    fetchProducts();
  }, [currentUser]);

  // Populate content from vendor data + fetched services/products
  useEffect(() => {
    if (!vendorData) return;
    const cd = vendorData.companyDetails || {};
    const vd = vendorData.vendorDetails || {};

    setContent(prev => {
      // Only set fields that are empty (don't overwrite user edits)
      const merged = { ...prev };
      if (!merged.companyName) merged.companyName = cd.companyName || vd.companyName || vendorData.name || '';
      if (!merged.tagline) merged.tagline = '';
      if (!merged.welcomeMessage) merged.welcomeMessage = '';
      if (!merged.overview) merged.overview = cd.companyOverview || '';
      if (!merged.vision) merged.vision = cd.visionAndMission?.vision || '';
      if (!merged.mission) merged.mission = cd.visionAndMission?.mission || '';
      if (!merged.usp) merged.usp = cd.uniqueSellingProposition || '';
      if (!merged.socialImpact) merged.socialImpact = cd.socialImpact || '';
      if (!merged.coreValues) merged.coreValues = Array.isArray(cd.coreValues) ? [...cd.coreValues] : [];
      if (!merged.industryType) merged.industryType = cd.industryType || '';
      if (!merged.industryOverview) merged.industryOverview = cd.industryOverview || '';
      if (!merged.businessType) merged.businessType = cd.businessType || '';
      if (!merged.teamSize) merged.teamSize = cd.teamSize || '';
      if (!merged.yearOfEstablishment) merged.yearOfEstablishment = cd.yearOfEstablishment || '';
      if (!merged.segments) merged.segments = Array.isArray(cd.segments) ? [...cd.segments] : [];
      if (!merged.certifications) merged.certifications = Array.isArray(cd.certifications) ? [...cd.certifications] : [];
      if (!merged.services || merged.services.length === 0) {
        merged.services = fetchedServices.map(s => ({
          name: s?.name || s?.title || s?.serviceName || '',
          description: s?.description || s?.serviceDescription || '',
        })).filter(s => s.name);
      }
      if (!merged.contactEmail) merged.contactEmail = vd.primaryContactEmail || '';
      if (!merged.contactPhone) merged.contactPhone = vd.primaryContactPhone || '';
      if (!merged.contactAddress) merged.contactAddress = '';
      if (!merged.contactWebsite) merged.contactWebsite = '';
      merged._productCount = fetchedProducts.length || 0;
      merged._projectCount = vendorData.projects?.length || 0;
      return merged;
    });
  }, [vendorData, fetchedServices, fetchedProducts]);

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem(`portfolio_config_${vendorId}`);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.templateId) {
          setSelectedTemplate(getTemplateById(config.templateId));
        }
        if (config.sections) setSections(prev => ({ ...prev, ...config.sections }));
        if (config.content) setContent(prev => ({ ...prev, ...config.content }));
      } catch (e) {
        console.warn('Failed to load portfolio config:', e);
      }
    }
  }, [vendorId]);

  const accentColor = selectedTemplate.accentColor;

  // Save full config to localStorage
  const saveConfig = () => {
    const config = {
      templateId: selectedTemplate.id,
      accentColor: selectedTemplate.accentColor,
      sections,
      content,
    };
    localStorage.setItem(`portfolio_config_${vendorId}`, JSON.stringify(config));
  };

  // Build share link — encode content overrides as base64 in `d` param
  const buildShareLink = () => {
    const base = `${window.location.origin}/shared-profile/${vendorId}`;
    const params = new URLSearchParams();

    params.set('t', selectedTemplate.id);
    if (content.tagline) params.set('tagline', content.tagline);

    Object.entries(sections).forEach(([key, val]) => {
      if (!val.enabled) params.set(key, 'false');
    });

    // Encode content overrides as base64 JSON
    const overrides = {};
    const fieldsToEncode = [
      'companyName', 'welcomeMessage', 'overview', 'vision', 'mission',
      'usp', 'socialImpact', 'coreValues', 'industryType', 'industryOverview',
      'businessType', 'teamSize', 'yearOfEstablishment', 'segments',
      'certifications', 'services', 'contactEmail', 'contactPhone',
      'contactAddress', 'contactWebsite'
    ];
    fieldsToEncode.forEach(key => {
      const val = content[key];
      if (val && (typeof val === 'string' ? val.trim() : (Array.isArray(val) && val.length > 0))) {
        overrides[key] = val;
      }
    });

    if (Object.keys(overrides).length > 0) {
      try {
        const json = JSON.stringify(overrides);
        const encoded = btoa(unescape(encodeURIComponent(json)));
        params.set('d', encoded);
      } catch (e) {
        console.warn('Could not encode content overrides:', e);
      }
    }

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const shareLink = buildShareLink();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      saveConfig();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = shareLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      saveConfig();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailShare = () => {
    saveConfig();
    const subject = `Check out ${content.companyName || 'our'} company portfolio`;
    const body = `I'd like to share our company portfolio with you.\n\nClick here to view: ${shareLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleWhatsAppShare = () => {
    saveConfig();
    const message = `Check out ${content.companyName || 'our'} company portfolio: ${shareLink}`;
    window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handlePreview = () => {
    saveConfig();
    window.open(shareLink, '_blank');
  };

  const toggleSection = (key) => {
    setSections(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  const nextStep = () => { if (step < STEPS.length - 1) { saveConfig(); setStep(step + 1); } };
  const prevStep = () => { if (step > 0) setStep(step - 1); };

  const enabledCount = Object.values(sections).filter(s => s.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 pb-12">

        {/* ===== HEADER ===== */}
        <div className="rounded-xl p-8 text-white mb-8 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${selectedTemplate.secondaryColor})` }}>
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="0.5" />
              <line x1="20" y1="0" x2="100" y2="80" stroke="white" strokeWidth="0.3" />
              <line x1="0" y1="20" x2="80" y2="100" stroke="white" strokeWidth="0.3" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Share2 size={28} />
              <h1 className="text-3xl font-bold">Share Your Portfolio</h1>
            </div>
            <p className="text-white/80">Choose a template, edit your content, and share your company portfolio</p>
          </div>
        </div>

        {/* ===== STEP INDICATOR ===== */}
        <div className="flex items-center justify-center mb-8 gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && (
                  <div className="w-12 h-0.5 mx-1"
                    style={{ backgroundColor: isDone || isActive ? accentColor : '#D1D5DB' }} />
                )}
                <button
                  onClick={() => { if (i <= step) setStep(i); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'text-white shadow-lg'
                      : isDone
                        ? 'text-white bg-opacity-80'
                        : 'text-gray-500 bg-gray-200'
                  }`}
                  style={isActive || isDone ? { backgroundColor: accentColor } : {}}
                >
                  {isDone ? <Check size={14} /> : <Icon size={14} />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* ===== STEP 1: CHOOSE TEMPLATE ===== */}
        {step === 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Choose a Template Design</h2>
              <p className="text-sm text-gray-500">Select a visual style for your company portfolio. Each template has a unique color scheme and aesthetic.</p>
            </div>
            <TemplateSelector
              selectedId={selectedTemplate.id}
              onSelect={handleTemplateSelect}
              accentColor={accentColor}
            />
          </div>
        )}

        {/* ===== STEP 2: EDIT CONTENT ===== */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Edit Portfolio Content</h2>
                <p className="text-sm text-gray-500">Customize every section's text. Changes are saved and encoded into your share link.</p>
              </div>
              <PortfolioEditor
                content={content}
                onChange={setContent}
                accentColor={accentColor}
              />
            </div>

            {/* Right sidebar — live info */}
            <div>
              <div className="sticky top-24 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                    <p className="text-sm font-bold text-gray-900">{selectedTemplate.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{selectedTemplate.description}</p>
                  <button onClick={() => setStep(0)}
                    className="text-xs font-semibold transition-colors" style={{ color: accentColor }}>
                    Change Template
                  </button>
                </div>

                <div className="p-4 rounded-lg border-2" style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}05` }}>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: accentColor }}>Editing Tips</h4>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    <li>• Edit text in each tab to customize your portfolio</li>
                    <li>• Leave fields blank to use your profile defaults</li>
                    <li>• Add/remove services, values, and segments</li>
                    <li>• Products & projects come from your dashboard data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: SETTINGS & SHARE ===== */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Section Toggles */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Settings size={18} style={{ color: accentColor }} />
                  Portfolio Sections
                </h2>
                <p className="text-sm text-gray-500 mb-4">{enabledCount} of {Object.keys(sections).length} sections enabled</p>

                <div className="space-y-2">
                  {Object.entries(sections).map(([key, section]) => (
                    <div key={key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        section.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                      }`}>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{section.label}</p>
                        <p className="text-xs text-gray-500">{section.description}</p>
                      </div>
                      <button onClick={() => toggleSection(key)} className="flex-shrink-0">
                        {section.enabled ? (
                          <ToggleRight size={28} style={{ color: accentColor }} />
                        ) : (
                          <ToggleLeft size={28} className="text-gray-300" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Methods */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Send size={18} style={{ color: accentColor }} />
                  Share Your Portfolio
                </h2>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { key: 'link', icon: Copy, label: 'Copy Link', color: accentColor },
                    { key: 'email', icon: Mail, label: 'Email', color: '#2563EB' },
                    { key: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', color: '#22C55E' },
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => setShareMethod(m.key)}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        shareMethod === m.key
                          ? 'border-current bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={shareMethod === m.key ? { borderColor: m.color, color: m.color } : {}}
                    >
                      <m.icon className={`w-5 h-5 mx-auto mb-1 ${shareMethod === m.key ? '' : 'text-gray-500'}`} />
                      <p className={`text-xs font-semibold ${shareMethod === m.key ? '' : 'text-gray-700'}`}>{m.label}</p>
                    </button>
                  ))}
                </div>

                {shareMethod === 'link' && (
                  <div>
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 bg-gray-100 rounded-lg p-3 overflow-x-auto">
                        <code className="text-xs text-gray-800 break-all font-mono">{shareLink}</code>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className="px-5 py-2 text-white rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-colors text-sm"
                        style={{ backgroundColor: accentColor }}
                      >
                        {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
                      </button>
                    </div>
                  </div>
                )}

                {shareMethod === 'email' && (
                  <button
                    onClick={handleEmailShare}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mail size={18} /> Open Email Client
                  </button>
                )}

                {shareMethod === 'whatsapp' && (
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageSquare size={18} /> Share on WhatsApp
                  </button>
                )}
              </div>
            </div>

            {/* Right Column — Preview */}
            <div>
              <div className="sticky top-24 space-y-4">
                {/* Mini Portfolio Preview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Portfolio Preview</h3>
                    <button onClick={handlePreview} className="text-xs font-semibold flex items-center gap-1" style={{ color: accentColor }}>
                      <Eye size={12} /> Open Full Preview
                    </button>
                  </div>

                  <div className="relative h-48 overflow-hidden" style={{ background: `linear-gradient(135deg, #fff 50%, ${accentColor} 50%)` }}>
                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        {vendorData?.profileImage?.url ? (
                          <img src={vendorData.profileImage.url} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: accentColor }}>
                            {(content.companyName || 'C').charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          {content.companyName || 'Company'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Company</p>
                        <p className="text-2xl font-black text-gray-900">PROFILE</p>
                        {content.tagline && (
                          <p className="text-[9px] text-gray-500 mt-1 truncate max-w-[160px]">{content.tagline}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-3 font-semibold uppercase">Included Pages ({enabledCount + 2})</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                        <span className="text-xs text-gray-700">Cover Page</span>
                      </div>
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                        <span className="text-xs text-gray-700">Table of Contents</span>
                      </div>
                      {Object.entries(sections).map(([key, section]) => section.enabled && (
                        <div key={key} className="flex items-center gap-2 py-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                          <span className="text-xs text-gray-700">{section.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview + Template info */}
                <button onClick={handlePreview}
                  className="w-full px-4 py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                  style={{ backgroundColor: accentColor }}>
                  <Eye size={18} /> Preview Full Portfolio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== BOTTOM NAVIGATION ===== */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 hover:bg-gray-100 text-gray-700"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 && (
              <button onClick={handlePreview}
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-100 text-gray-700 flex items-center gap-2 transition-colors">
                <Eye size={16} /> Preview
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                {copied ? <><Check size={16} /> Link Copied!</> : <><Copy size={16} /> Copy Share Link</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
