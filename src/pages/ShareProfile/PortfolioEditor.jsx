import React, { useState } from 'react';
import {
  FileText, Eye, Compass, Heart, Lightbulb, Briefcase,
  Wrench, Package, FolderOpen, Phone, ChevronDown, ChevronUp,
  Plus, Trash2, Info
} from 'lucide-react';

/**
 * Portfolio Content Editor — Tabbed form to edit all portfolio content before sharing.
 * Vendor can override any text: overview, vision, mission, values, USP, industry info, services, etc.
 */

const EDITOR_TABS = [
  { key: 'cover', label: 'Cover & Intro', icon: FileText },
  { key: 'about', label: 'About Us', icon: Info },
  { key: 'values', label: 'Vision & Values', icon: Heart },
  { key: 'whatwedo', label: 'What We Do', icon: Briefcase },
  { key: 'services', label: 'Services', icon: Wrench },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'projects', label: 'Projects', icon: FolderOpen },
  { key: 'contact', label: 'Contact', icon: Phone },
];

export default function PortfolioEditor({ content, onChange, accentColor = '#F5A623' }) {
  const [activeTab, setActiveTab] = useState('cover');

  const updateField = (key, value) => {
    onChange({ ...content, [key]: value });
  };

  const updateListItem = (listKey, index, value) => {
    const list = [...(content[listKey] || [])];
    list[index] = value;
    onChange({ ...content, [listKey]: list });
  };

  const addListItem = (listKey, defaultItem = '') => {
    const list = [...(content[listKey] || []), defaultItem];
    onChange({ ...content, [listKey]: list });
  };

  const removeListItem = (listKey, index) => {
    const list = [...(content[listKey] || [])];
    list.splice(index, 1);
    onChange({ ...content, [listKey]: list });
  };

  const updateServiceField = (index, field, value) => {
    const services = [...(content.services || [])];
    if (typeof services[index] === 'string') {
      services[index] = { name: services[index], description: '' };
    }
    services[index] = { ...services[index], [field]: value };
    onChange({ ...content, services });
  };

  const renderTextInput = (label, fieldKey, placeholder, maxLen) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={content[fieldKey] || ''}
        onChange={(e) => updateField(fieldKey, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLen}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm"
        style={{ '--tw-ring-color': accentColor }}
      />
      {maxLen && (
        <p className="text-[10px] text-gray-400 mt-1">{(content[fieldKey] || '').length}/{maxLen}</p>
      )}
    </div>
  );

  const renderTextArea = (label, fieldKey, placeholder, rows = 3) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <textarea
        value={content[fieldKey] || ''}
        onChange={(e) => updateField(fieldKey, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm resize-none"
        style={{ '--tw-ring-color': accentColor }}
      />
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'cover':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">Edit the cover page details that visitors see first.</p>
            {renderTextInput('Company Name', 'companyName', 'Your company name', 100)}
            {renderTextInput('Tagline / Subtitle', 'tagline', 'e.g. Building the future, one solution at a time', 120)}
            {renderTextArea('Welcome Message', 'welcomeMessage', 'A brief welcome note for your portfolio visitors', 2)}
          </div>
        );

      case 'about':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">Describe your company, its background and key highlights.</p>
            {renderTextArea('Company Overview', 'overview', 'Tell visitors about your company, its history, and what makes it special...', 5)}
          </div>
        );

      case 'values':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">Share your company's vision, mission, and core values.</p>
            {renderTextArea('Vision Statement', 'vision', 'What is your long-term vision?', 3)}
            {renderTextArea('Mission Statement', 'mission', 'What is your mission?', 3)}
            {renderTextArea('Unique Selling Proposition', 'usp', 'What sets you apart from competitors?', 3)}
            {renderTextArea('Social Impact', 'socialImpact', 'How does your company give back to society?', 2)}

            {/* Core Values List */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Core Values</label>
              <div className="space-y-2">
                {(content.coreValues || []).map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={typeof val === 'string' ? val : val?.name || ''}
                      onChange={(e) => updateListItem('coreValues', i, e.target.value)}
                      placeholder={`Value ${i + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      style={{ '--tw-ring-color': accentColor }}
                    />
                    <button onClick={() => removeListItem('coreValues', i)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addListItem('coreValues', '')}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                style={{ color: accentColor }}>
                <Plus size={14} /> Add Value
              </button>
            </div>
          </div>
        );

      case 'whatwedo':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">Describe your industry, business type, and market focus.</p>
            {renderTextInput('Industry Type', 'industryType', 'e.g. Manufacturing, IT Services', 80)}
            {renderTextArea('Industry Overview', 'industryOverview', 'Describe your industry expertise and market position...', 4)}
            {renderTextInput('Business Type', 'businessType', 'e.g. B2B, B2C, Both', 50)}
            {renderTextInput('Team Size', 'teamSize', 'e.g. 50+, 100-200', 30)}
            {renderTextInput('Year of Establishment', 'yearOfEstablishment', 'e.g. 2010', 10)}

            {/* Segments */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Business Segments</label>
              <div className="space-y-2">
                {(content.segments || []).map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={typeof seg === 'string' ? seg : seg?.name || ''}
                      onChange={(e) => updateListItem('segments', i, e.target.value)}
                      placeholder={`Segment ${i + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      style={{ '--tw-ring-color': accentColor }}
                    />
                    <button onClick={() => removeListItem('segments', i)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addListItem('segments', '')}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                style={{ color: accentColor }}>
                <Plus size={14} /> Add Segment
              </button>
            </div>

            {/* Certifications */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Certifications</label>
              <div className="space-y-2">
                {(content.certifications || []).map((cert, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={typeof cert === 'string' ? cert : cert?.name || ''}
                      onChange={(e) => updateListItem('certifications', i, e.target.value)}
                      placeholder={`Certification ${i + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      style={{ '--tw-ring-color': accentColor }}
                    />
                    <button onClick={() => removeListItem('certifications', i)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addListItem('certifications', '')}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                style={{ color: accentColor }}>
                <Plus size={14} /> Add Certification
              </button>
            </div>
          </div>
        );

      case 'services':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">Add or edit your services. Name and description for each.</p>
            <div className="space-y-3">
              {(content.services || []).map((svc, i) => {
                const name = typeof svc === 'string' ? svc : svc?.name || '';
                const desc = typeof svc === 'object' ? svc?.description || '' : '';
                return (
                  <div key={i} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-gray-400">{String(i + 1).padStart(2, '0')}</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updateServiceField(i, 'name', e.target.value)}
                        placeholder="Service name"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': accentColor }}
                      />
                      <button onClick={() => removeListItem('services', i)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <textarea
                      value={desc}
                      onChange={(e) => updateServiceField(i, 'description', e.target.value)}
                      placeholder="Brief description (optional)"
                      rows={2}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs resize-none focus:ring-2 focus:outline-none"
                      style={{ '--tw-ring-color': accentColor }}
                    />
                  </div>
                );
              })}
            </div>
            <button onClick={() => addListItem('services', { name: '', description: '' })}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: accentColor }}>
              <Plus size={14} /> Add Service
            </button>
          </div>
        );

      case 'products':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">
              Products are pulled from your product catalog. Toggle this section on/off in the settings step.
            </p>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <Package size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">
                {(content._productCount || 0)} products from your catalog
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Manage products from the Products section of your dashboard
              </p>
            </div>
          </div>
        );

      case 'projects':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">
              Projects are pulled from your project portfolio. Toggle this section on/off in the settings step.
            </p>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <FolderOpen size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">
                {(content._projectCount || 0)} projects from your portfolio
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Manage projects from the Projects section of your dashboard
              </p>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div>
            <p className="text-xs text-gray-500 mb-4">Override contact details shown on the portfolio's last page.</p>
            {renderTextInput('Contact Email', 'contactEmail', 'contact@company.com', 100)}
            {renderTextInput('Contact Phone', 'contactPhone', '+91 98765 43210', 30)}
            {renderTextInput('Address / Location', 'contactAddress', 'Your office address', 200)}
            {renderTextInput('Website', 'contactWebsite', 'https://www.example.com', 200)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Tab navigation — scrollable on mobile */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex min-w-max">
          {EDITOR_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-current'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={isActive ? { color: accentColor, borderColor: accentColor } : {}}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6 max-h-[480px] overflow-y-auto">
        {renderTab()}
      </div>
    </div>
  );
}
