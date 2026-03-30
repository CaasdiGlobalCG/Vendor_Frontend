import React from 'react';

/**
 * Table of Contents — Magazine-style index page with visual welcome panel.
 * Reference: Split layout - left has TOC list, right has welcome message + photo.
 */
export default function TableOfContentsPage({ sections, accentColor = '#F5A623', tagline, profileImage, contactName }) {
  return (
    <div pageTitle="Table of Contents" className="flex bg-white" style={{ minHeight: '1123px' }}>
      {/* ===== LEFT HALF — INDEX ===== */}
      <div className="w-[48%] p-10 md:p-14 flex flex-col">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
            <div className="w-3 h-[3px]" style={{ backgroundColor: accentColor }} />
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Index</h2>
        </div>

        {/* TOC Items */}
        <div className="flex-1">
          {sections.map((section, i) => (
            <div key={i} className="flex items-center py-3 border-b border-gray-100 group">
              <span className="text-gray-800 text-sm font-medium flex-1">{section.title}</span>
              <div className="flex-shrink-0 flex items-center gap-2 ml-4">
                <div className="w-16 border-b border-dotted border-gray-300" />
                <span className="text-sm font-black w-6 text-right" style={{ color: accentColor }}>
                  {String(section.pageNumber).padStart(2, '0')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom quote */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="flex gap-3">
            <div className="text-3xl font-serif leading-none" style={{ color: accentColor }}>"</div>
            <p className="text-gray-500 text-xs italic leading-relaxed">
              {tagline || 'Guided by vision, inspired by possibility.'}
            </p>
          </div>
        </div>
      </div>

      {/* ===== CENTER DIVIDER ===== */}
      <div className="w-[4%] flex items-center justify-center">
        <div className="w-px h-[70%] bg-gray-200" />
      </div>

      {/* ===== RIGHT HALF — WELCOME MESSAGE ===== */}
      <div className="w-[48%] flex flex-col">
        {/* Top accent bar */}
        <div className="h-2" style={{ backgroundColor: accentColor }} />

        {/* Welcome card */}
        <div className="flex-1 flex flex-col p-10 md:p-12">
          {/* Section Label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-[3px] bg-black" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Welcome</span>
          </div>

          <h3 className="text-3xl font-black text-gray-900 mb-8 leading-tight">
            Welcome<br />
            <span style={{ color: accentColor }}>Message</span>
          </h3>

          {/* Photo + Name card */}
          <div className="relative mb-8">
            {profileImage ? (
              <div className="relative">
                <img src={profileImage} alt="Profile"
                  className="w-full h-56 object-cover rounded-sm" />
                {/* Overlay name badge */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
                  style={{ backgroundColor: accentColor }}>
                  <p className="font-bold text-white text-sm">{contactName || 'Leadership'}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-wider">Company Representative</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-56 bg-gray-100 rounded-sm flex items-center justify-center relative overflow-hidden">
                {/* Abstract pattern fill */}
                <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 100 100">
                  <circle cx="20" cy="20" r="15" fill="currentColor" />
                  <circle cx="80" cy="80" r="20" fill="currentColor" />
                  <rect x="60" y="10" width="30" height="30" fill="currentColor" />
                </svg>
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black"
                  style={{ backgroundColor: accentColor }}>
                  {contactName?.charAt(0) || 'W'}
                </div>
                {/* Bottom badge */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3" style={{ backgroundColor: accentColor }}>
                  <p className="font-bold text-white text-sm">{contactName || 'Leadership'}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-wider">Company Representative</p>
                </div>
              </div>
            )}
          </div>

          {/* Welcome text */}
          <p className="text-gray-600 text-xs leading-relaxed italic border-l-3 pl-4"
            style={{ borderLeftWidth: '3px', borderLeftColor: accentColor }}>
            "We turn aspirations into accomplishments through strategic planning and dedicated execution."
          </p>

          {/* Decorative elements */}
          <div className="mt-auto pt-8 flex justify-between items-end">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-2 h-2" style={{
                  backgroundColor: i < 2 ? accentColor : '#e5e7eb',
                }} />
              ))}
            </div>
            <div className="w-8 h-8 border-2 rotate-45" style={{ borderColor: accentColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}
