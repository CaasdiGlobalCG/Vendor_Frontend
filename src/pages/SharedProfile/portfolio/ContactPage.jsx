import React from 'react';
import { Mail, Phone, MapPin, Globe, FileText, Building, Heart } from 'lucide-react';

/**
 * Contact / Thank You page — Magazine closing spread.
 * Reference: Bold "THANK YOU" text over accent color, contact grid, compliance, footer.
 */
export default function ContactPage({ companyName, profileData, accentColor = '#F5A623', gstNumber, panNumber }) {
  const profile = profileData || {};
  const email = profile.email || profile.contactEmail || '';
  const phone = profile.phone || profile.contactPhone || profile.mobile || '';
  const address = profile.address || profile.location || '';
  const website = profile.website || profile.url || '';

  const contactItems = [
    { icon: Mail, label: 'Email', value: email },
    { icon: Phone, label: 'Phone', value: phone },
    { icon: MapPin, label: 'Address', value: address },
    { icon: Globe, label: 'Website', value: website },
  ].filter(item => item.value);

  const complianceItems = [
    { label: 'GST Number', value: gstNumber || 'Not Available' },
    { label: 'PAN Number', value: panNumber || 'Not Available' },
  ];

  return (
    <div pageTitle="Contact" className="relative overflow-hidden" style={{ minHeight: '1123px', backgroundColor: '#fafafa' }}>
      {/* ===== HERO — Large "Thank You" Section ===== */}
      <div className="relative h-[400px] overflow-hidden" style={{ backgroundColor: accentColor }}>
        {/* Geometric decorations */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
          <circle cx="700" cy="100" r="200" fill="white" opacity="0.05" />
          <circle cx="100" cy="350" r="150" fill="white" opacity="0.05" />
          <rect x="600" y="250" width="200" height="150" fill="white" opacity="0.03" transform="rotate(-15 700 325)" />
          <polygon points="0,400 200,300 400,400" fill="white" opacity="0.03" />
        </svg>

        {/* Diagonal slice at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: '#fafafa', clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }} />

        <div className="relative z-10 px-10 md:px-14 flex flex-col items-center justify-center h-full text-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
            <Heart size={20} className="text-white" />
          </div>
          <h2 className="text-6xl font-black text-white tracking-tight mb-3">
            THANK YOU
          </h2>
          <div className="w-16 h-[3px] bg-white/40 mx-auto mb-4" />
          <p className="text-white/70 text-sm max-w-md">
            We appreciate your interest in {companyName || 'our company'}.
            Let&apos;s build something great together.
          </p>
        </div>
      </div>

      {/* ===== CONTACT SECTION ===== */}
      <div className="px-10 md:px-14 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Get in Touch</span>
        </div>

        {contactItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {contactItems.map(({ icon: Icon, label, value }, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-sm border border-gray-100">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: i === 0 ? accentColor : '#1a1a1a' }}>
                  <Icon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                  <p className="text-sm font-medium text-gray-800 break-all">{value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-sm border border-gray-100 mb-8">
            <Mail size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-gray-400 text-sm">Contact information will appear here</p>
          </div>
        )}

        {/* ===== COMPLIANCE ===== */}
        {complianceItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={12} style={{ color: accentColor }} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Compliance</p>
            </div>
            <div className="flex gap-3">
              {complianceItems.map((item, i) => (
                <div key={i} className="px-4 py-3 bg-white rounded-sm border border-gray-100 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{item.label}</p>
                  <p className="text-xs font-mono font-bold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== FOOTER BAR ===== */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="bg-gray-900 px-10 md:px-14 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building size={14} style={{ color: accentColor }} />
            <span className="text-white text-xs font-bold">{companyName || 'Company'}</span>
          </div>
          <p className="text-white/30 text-[9px]">
            &copy; {new Date().getFullYear()} All rights reserved
          </p>
        </div>
        <div className="h-2" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}
