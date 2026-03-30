import React from 'react';
import { Target, TrendingUp, Award, Users } from 'lucide-react';

/**
 * About Us page — Magazine spread with large imagery, stats, company overview.
 * Reference: Split layout with company photo, mission icons, about text, and key metrics.
 */
export default function AboutPage({ companyName, profileImage, overview, stats, accentColor = '#F5A623' }) {
  const defaultStats = [
    { icon: Users, value: '100+', label: 'Team Members' },
    { icon: Award, value: '50+', label: 'Awards' },
    { icon: TrendingUp, value: '200+', label: 'Projects' },
    { icon: Target, value: '99%', label: 'Client Satisfaction' },
  ];

  const displayStats = stats && stats.length > 0 ? stats : [];

  return (
    <div pageTitle="About Us" className="bg-white relative" style={{ minHeight: '1123px' }}>
      {/* ===== TOP SECTION — Full-width image banner ===== */}
      <div className="relative h-[340px] overflow-hidden">
        {profileImage ? (
          <>
            <img src={profileImage} alt={companyName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full relative" style={{ backgroundColor: '#1a1a1a' }}>
            {/* Abstract geometric pattern fill */}
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 200">
              <rect x="0" y="0" width="120" height="200" fill={accentColor} />
              <circle cx="300" cy="100" r="80" fill={accentColor} opacity="0.5" />
              <polygon points="150,0 250,0 200,100" fill={accentColor} opacity="0.3" />
              <rect x="320" y="150" width="80" height="50" fill={accentColor} opacity="0.2" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[150px] font-black text-white/10">{companyName?.charAt(0)}</span>
            </div>
          </div>
        )}

        {/* Page header overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-[3px] bg-white" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">About</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">
            About Our <span className="italic font-light">Company</span>
          </h2>
        </div>

        {/* Accent corner */}
        <div className="absolute top-0 right-0 w-24 h-24"
          style={{ backgroundColor: accentColor, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="px-10 md:px-14 py-10">
        {/* Company Name + Overview */}
        <div className="flex gap-10 mb-10">
          <div className="flex-1">
            <h3 className="text-xl font-black text-gray-900 mb-4">{companyName}</h3>
            {overview ? (
              <p className="text-gray-600 text-sm leading-[1.8]">{overview}</p>
            ) : (
              <p className="text-gray-400 text-sm italic">Company overview will appear here.</p>
            )}
          </div>

          {/* Side accent block */}
          <div className="w-48 flex-shrink-0 hidden md:block">
            <div className="p-5 rounded-sm relative overflow-hidden" style={{ backgroundColor: accentColor }}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
              <p className="text-white text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">Our Mission</p>
              <p className="text-white/80 text-xs leading-relaxed relative z-10">
                Delivering excellence through innovation and commitment.
              </p>
            </div>
          </div>
        </div>

        {/* ===== STATS GRID ===== */}
        {displayStats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {displayStats.map((stat, i) => (
              <div key={i} className="relative bg-gray-50 border border-gray-100 rounded-sm p-5 text-center overflow-hidden group">
                {/* Number badge */}
                <div className="absolute top-2 right-2 text-[10px] font-bold text-gray-300">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="text-3xl font-black mb-1" style={{ color: accentColor }}>{stat.value}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{stat.label}</div>
                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: accentColor }} />
              </div>
            ))}
          </div>
        )}

        {/* ===== KEY INFO CARDS ===== */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Target, title: 'Our Values', text: 'Integrity, transparency, and innovation drive every decision we make.' },
            { icon: TrendingUp, title: 'Our Approach', text: 'Building lasting partnerships through consistent delivery and quality.' },
            { icon: Award, title: 'Our Standards', text: 'Meeting the highest industry standards with certified processes.' },
            { icon: Users, title: 'Our Team', text: 'Expert professionals dedicated to exceeding expectations.' },
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={i} className="flex gap-3 p-4 border border-gray-100 rounded-sm">
              <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: i === 0 ? accentColor : '#1a1a1a' }}>
                <Icon size={16} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-xs mb-0.5">{title}</p>
                <p className="text-gray-500 text-[10px] leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom accent strip */}
      <div className="absolute bottom-0 left-0 right-0 h-2 flex">
        <div className="flex-1" style={{ backgroundColor: accentColor }} />
        <div className="flex-1 bg-black" />
      </div>
    </div>
  );
}
