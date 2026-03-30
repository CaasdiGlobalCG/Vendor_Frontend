import React from 'react';
import { Building2, Globe, Briefcase, Shield, Users, Calendar } from 'lucide-react';

/**
 * What We Do page — Magazine spread for industry, business type, segments, certifications.
 * Reference: Numbered highlight cards, industry badges, decorative geometric layouts.
 */
export default function WhatWeDoPage({ industryType, industryOverview, businessType, segments, certifications, teamSize, yearOfEstablishment, accentColor = '#F5A623' }) {
  const segmentList = Array.isArray(segments) ? segments : (segments ? [segments] : []);
  const certList = Array.isArray(certifications) ? certifications : (certifications ? [certifications] : []);

  const highlights = [
    { icon: Building2, label: 'Industry', value: industryType || 'Manufacturing' },
    { icon: Briefcase, label: 'Business Type', value: businessType || 'B2B' },
    { icon: Users, label: 'Team Size', value: teamSize || '50+' },
    { icon: Calendar, label: 'Established', value: yearOfEstablishment || 'N/A' },
  ];

  return (
    <div pageTitle="What We Do" className="bg-white relative overflow-hidden" style={{ minHeight: '1123px' }}>
      {/* ===== TOP HERO BAR ===== */}
      <div className="relative h-[180px] bg-gray-900 overflow-hidden">
        {/* Geometric pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 180" preserveAspectRatio="none">
          <rect x="0" y="0" width="300" height="180" fill={accentColor} />
          <polygon points="300,0 500,0 400,180 200,180" fill={accentColor} opacity="0.5" />
          <circle cx="650" cy="90" r="100" fill={accentColor} opacity="0.2" />
        </svg>

        <div className="relative z-10 px-10 md:px-14 flex items-center h-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Our Business</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">
              What We <span className="italic font-light" style={{ color: accentColor }}>Do</span>
            </h2>
          </div>

          {/* Large decorative number */}
          <div className="ml-auto">
            <span className="text-[120px] font-black leading-none text-white/5">05</span>
          </div>
        </div>
      </div>

      {/* ===== INDUSTRY OVERVIEW ===== */}
      <div className="px-10 md:px-14 py-8">
        {industryOverview && (
          <div className="mb-8 relative">
            <div className="flex gap-6">
              <div className="w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Industry Overview</p>
                <p className="text-gray-600 text-sm leading-[1.8]">{industryOverview}</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== HIGHLIGHTS GRID ===== */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {highlights.map(({ icon: Icon, label, value }, i) => (
            <div key={i} className="relative text-center p-5 rounded-sm overflow-hidden"
              style={{ backgroundColor: i === 0 ? accentColor : i === 1 ? '#1a1a1a' : '#f8f8f8' }}>
              {/* Corner number */}
              <span className="absolute top-2 right-3 text-[10px] font-bold"
                style={{ color: i < 2 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <Icon size={20} className="mx-auto mb-3"
                style={{ color: i < 2 ? 'white' : accentColor }} />
              <p className="text-lg font-black mb-0.5" style={{ color: i < 2 ? 'white' : '#1a1a1a' }}>{value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: i < 2 ? 'rgba(255,255,255,0.5)' : '#999' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ===== SEGMENTS ===== */}
        {segmentList.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={14} style={{ color: accentColor }} />
              <p className="text-sm font-bold text-gray-900">Business Segments</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {segmentList.map((seg, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-sm border border-gray-100 bg-gray-50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                  <span className="text-xs font-medium text-gray-700">
                    {typeof seg === 'string' ? seg : seg?.name || seg?.title || `Segment ${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CERTIFICATIONS ===== */}
        {certList.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={14} style={{ color: accentColor }} />
              <p className="text-sm font-bold text-gray-900">Certifications & Compliance</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {certList.map((cert, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-sm bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                    <Shield size={14} style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {typeof cert === 'string' ? cert : cert?.name || cert?.title || `Certificate ${i + 1}`}
                    </p>
                    {cert?.issuer && <p className="text-[10px] text-gray-400">{cert.issuer}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom decorative strip */}
      <div className="absolute bottom-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-gray-900" />
        <div className="w-32" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}
