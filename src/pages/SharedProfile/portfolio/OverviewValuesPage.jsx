import React from 'react';
import { Eye, Compass, Heart, Star, Lightbulb, Sparkles } from 'lucide-react';

/**
 * Overview + Values page — Magazine spread for Vision, Mission, Core Values, USP, Social Impact.
 * Reference: Large numbered blocks, icon cards, accent sidebars, decorative patterns.
 */
export default function OverviewValuesPage({ visionAndMission, coreValues, uniqueSellingProposition, socialImpact, profileImage, accentColor = '#F5A623' }) {
  const vision = visionAndMission?.vision || '';
  const mission = visionAndMission?.mission || '';
  const values = Array.isArray(coreValues) ? coreValues : (coreValues ? [coreValues] : []);
  const usp = uniqueSellingProposition || '';

  const valueIcons = [Heart, Star, Lightbulb, Sparkles, Eye, Compass];

  return (
    <div pageTitle="Vision & Values" className="bg-white relative overflow-hidden" style={{ minHeight: '1123px' }}>
      {/* ===== PAGE HEADER ===== */}
      <div className="flex items-start">
        {/* Accent left bar */}
        <div className="w-16 flex-shrink-0 relative" style={{ backgroundColor: accentColor, minHeight: '1123px' }}>
          <div className="absolute top-8 left-0 right-0 flex justify-center">
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest"
              style={{ writingMode: 'vertical-rl' }}>Vision &amp; Values</span>
          </div>
          {/* Decorative pattern */}
          <div className="absolute bottom-24 left-3 right-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-full h-[1px] bg-white/20 mb-3" />
            ))}
          </div>
        </div>

        <div className="flex-1 relative">
          {/* Page number */}
          <div className="absolute top-6 right-8 text-gray-300 text-[10px] font-bold">04</div>

          {/* Header */}
          <div className="px-10 pt-10 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Our Foundation</span>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              Vision & <span className="italic font-light">Core Values</span>
            </h2>
          </div>

          {/* ===== VISION & MISSION SECTION ===== */}
          <div className="px-10 pb-6">
            <div className="grid grid-cols-2 gap-5">
              {/* Vision card */}
              <div className="relative bg-gray-900 rounded-sm p-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10"
                  style={{ backgroundColor: accentColor, transform: 'translate(30%, -30%)' }} />
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-4"
                  style={{ backgroundColor: accentColor }}>
                  <Eye size={16} className="text-white" />
                </div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Our Vision</p>
                <p className="text-white/90 text-xs leading-relaxed">
                  {vision || 'A world-class organization setting industry benchmarks.'}
                </p>
              </div>

              {/* Mission card */}
              <div className="relative border-2 border-gray-100 rounded-sm p-6 overflow-hidden">
                <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full opacity-10"
                  style={{ backgroundColor: accentColor, transform: 'translate(-30%, 30%)' }} />
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-4 bg-gray-900">
                  <Compass size={16} className="text-white" />
                </div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Our Mission</p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {mission || 'Delivering excellence through innovation and integrity.'}
                </p>
              </div>
            </div>
          </div>

          {/* ===== CORE VALUES ===== */}
          {values.length > 0 && (
            <div className="px-10 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                  <Heart size={10} className="text-white" />
                </div>
                <p className="text-sm font-bold text-gray-900">Core Values</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {values.slice(0, 6).map((value, i) => {
                  const Icon = valueIcons[i % valueIcons.length];
                  return (
                    <div key={i} className="relative p-4 rounded-sm border border-gray-100 text-center group hover:border-transparent transition-colors"
                      style={{ '--hover-bg': accentColor }}>
                      <span className="absolute top-2 left-2 text-[9px] font-bold text-gray-200">{String(i + 1).padStart(2, '0')}</span>
                      <div className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center bg-gray-50"
                        style={{ border: `1px solid ${accentColor}20` }}>
                        <Icon size={12} style={{ color: accentColor }} />
                      </div>
                      <p className="text-xs font-bold text-gray-800">{typeof value === 'string' ? value : value?.name || value?.title || 'Value'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== USP + SOCIAL IMPACT ROW ===== */}
          <div className="px-10 pb-8">
            <div className="grid grid-cols-5 gap-5">
              {/* USP */}
              <div className="col-span-3 relative p-6 rounded-sm overflow-hidden" style={{ backgroundColor: `${accentColor}08` }}>
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: accentColor }} />
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} style={{ color: accentColor }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Unique Selling Proposition</p>
                </div>
                <p className="text-gray-700 text-xs leading-relaxed pl-1">
                  {usp || 'What sets us apart is our unwavering commitment to quality and innovation.'}
                </p>
              </div>

              {/* Social Impact */}
              <div className="col-span-2 relative bg-gray-900 p-6 rounded-sm overflow-hidden">
                <svg className="absolute bottom-0 right-0 w-24 h-24 opacity-10" viewBox="0 0 100 100">
                  <circle cx="80" cy="80" r="40" fill={accentColor} />
                </svg>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Social Impact</p>
                <p className="text-white/80 text-xs leading-relaxed relative z-10">
                  {socialImpact || 'Making a positive difference in our communities and beyond.'}
                </p>
              </div>
            </div>
          </div>

          {/* Decorative bottom image area */}
          {profileImage && (
            <div className="px-10 pb-6">
              <div className="h-32 rounded-sm overflow-hidden relative">
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <p className="text-white text-[10px] font-bold uppercase tracking-widest">Driven by Purpose</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent strip */}
      <div className="absolute bottom-0 left-0 right-0 h-2">
        <div className="h-full" style={{ backgroundColor: accentColor, width: '16px' }} />
      </div>
    </div>
  );
}
