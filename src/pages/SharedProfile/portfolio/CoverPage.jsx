import React from 'react';

/**
 * Cover Page — Bold magazine cover with geometric shapes, brand imagery, and large typography.
 * Matches the reference: diagonal yellow block, large PROFILE text, year badge, geometric lines.
 */
export default function CoverPage({ companyName, profileImage, tagline, accentColor = '#F5A623', year, gstNumber, panNumber }) {
  const displayYear = year || new Date().getFullYear();

  return (
    <div pageTitle="Cover" className="relative flex flex-col overflow-hidden bg-white" style={{ minHeight: '1123px' }}>
      {/* ---- BACKGROUND GEOMETRIC ELEMENTS ---- */}
      {/* Diagonal accent block */}
      <div className="absolute top-0 right-0 h-full" style={{
        width: '55%',
        backgroundColor: accentColor,
        clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)',
      }} />

      {/* Subtle grid lines on white area */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="coverGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 60" stroke="#000" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#coverGrid)" />
      </svg>

      {/* Decorative corner squares */}
      <div className="absolute top-12 right-12 w-20 h-20 border-2 border-white/30 rotate-12 z-10" />
      <div className="absolute top-20 right-24 w-12 h-12 border-2 border-white/20 rotate-45 z-10" />
      <div className="absolute bottom-32 right-16 w-16 h-16 border-2 border-white/20 z-10" />

      {/* Small accent squares */}
      <div className="absolute top-8 left-8 w-3 h-3" style={{ backgroundColor: accentColor }} />
      <div className="absolute top-8 left-14 w-3 h-3 border" style={{ borderColor: accentColor }} />
      <div className="absolute top-14 left-8 w-3 h-3 border" style={{ borderColor: accentColor }} />

      {/* ---- CONTENT ---- */}
      <div className="relative z-20 flex flex-col h-full p-10 md:p-14" style={{ minHeight: '1123px' }}>

        {/* Top Row — Logo / Brand + Year */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            {profileImage ? (
              <img src={profileImage} alt={companyName}
                className="w-14 h-14 rounded-lg object-cover shadow-md border-2 border-white z-[50] relative" />
            ) : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-black text-2xl shadow-md"
                style={{ backgroundColor: accentColor }}>
                {companyName?.charAt(0)}
              </div>
            )}
            <div>
              <span className="font-black text-gray-900 text-sm tracking-[0.2em] uppercase block">{companyName}</span>
              <span className="text-[10px] text-gray-400 tracking-widest uppercase">Company Portfolio</span>
              {(gstNumber || panNumber) && (
                <div className="mt-2 space-y-0.5">
                  {gstNumber && gstNumber !== 'Not provided' && (
                    <p className="text-[8px] text-gray-500 tracking-widest uppercase font-medium">GST: <span className="font-mono text-gray-700">{gstNumber}</span></p>
                  )}
                  {panNumber && panNumber !== 'Not provided' && (
                    <p className="text-[8px] text-gray-500 tracking-widest uppercase font-medium">PAN: <span className="font-mono text-gray-700">{panNumber}</span></p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Year badge */}
          <div className="relative">
            <div className="bg-black text-white px-5 py-3 rounded-sm">
              <span className="text-4xl font-black leading-none tracking-tight">{displayYear}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-full h-full border-2 rounded-sm -z-10" style={{ borderColor: accentColor }} />
          </div>
        </div>

        {/* Left side vertical text accent */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 hidden md:block">
          <span className="text-[9px] tracking-[0.4em] text-gray-300 uppercase font-semibold whitespace-nowrap">
            Company Portfolio {displayYear}
          </span>
        </div>

        {/* ---- HERO IMAGE AREA ---- */}
        <div className="flex-1 flex items-center">
          <div className="flex w-full gap-6">
            {/* Left: Main Title Block */}
            <div className="flex-1 flex flex-col justify-center pr-4 z-20">
              {/* Decorative line */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-[3px]" style={{ backgroundColor: accentColor }} />
                <div className="w-3 h-[3px]" style={{ backgroundColor: accentColor }} />
              </div>

              <h1 className="text-gray-900 mb-2">
                <span className="block text-lg font-semibold tracking-[0.3em] uppercase text-gray-500 mb-1">Company</span>
                <span className="block text-7xl md:text-[90px] font-black leading-[0.85] tracking-tight">
                  PROFILE
                </span>
              </h1>

              <p className="text-xs text-gray-400 uppercase tracking-[0.25em] mt-6 mb-8 font-medium">
                Grow Your Business To The Next Level
              </p>

              {tagline && (
                <p className="text-gray-600 text-sm leading-relaxed max-w-xs border-l-2 pl-4 italic"
                  style={{ borderColor: accentColor }}>
                  {tagline}
                </p>
              )}
            </div>

            {/* Right: Profile Image / Mockup Area */}
            <div className="w-[45%] relative hidden md:flex items-center justify-center">
              {profileImage ? (
                <div className="relative">
                  {/* Image with decorative frame */}
                  <div className="relative z-10 overflow-hidden rounded-sm shadow-2xl"
                    style={{ border: `4px solid ${accentColor}`, zIndex: 50, position: 'relative' }}>
                    <img src={profileImage} alt={companyName}
                      className="w-64 h-80 object-cover z-[50] relative" />
                  </div>
                  {/* Offset decorative box */}
                  <div className="absolute -bottom-4 -left-4 w-full h-full bg-black/10 rounded-sm -z-10" />
                  <div className="absolute -top-4 -right-4 w-20 h-20" style={{ backgroundColor: accentColor, opacity: 0.3 }} />
                </div>
              ) : (
                <div className="relative">
                  {/* Geometric abstract placeholder */}
                  <div className="w-64 h-80 bg-black/5 rounded-sm relative overflow-hidden border-4"
                    style={{ borderColor: accentColor }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[120px] font-black" style={{ color: `${accentColor}20` }}>
                        {companyName?.charAt(0)}
                      </span>
                    </div>
                    {/* Decorative diagonal */}
                    <div className="absolute bottom-0 left-0 w-full h-1/3" style={{
                      backgroundColor: accentColor,
                      clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)',
                      opacity: 0.15,
                    }} />
                  </div>
                  <div className="absolute -bottom-4 -left-4 w-full h-full bg-black/10 rounded-sm -z-10" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- BOTTOM BAR ---- */}
        <div className="mt-auto flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 text-white text-sm font-bold tracking-wide"
              style={{ backgroundColor: accentColor }}>
              prepared by
            </div>
            <span className="font-black text-gray-900 uppercase tracking-wider text-sm">{companyName}</span>
          </div>

          {/* Bottom-right decorative dots */}
          <div className="flex gap-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? accentColor : '#ddd' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
