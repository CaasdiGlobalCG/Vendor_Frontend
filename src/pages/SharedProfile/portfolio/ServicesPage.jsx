import React from 'react';
import { Wrench, Settings, Truck, Package, Cpu, Zap, ArrowRight } from 'lucide-react';

/**
 * Services page — Magazine spread with numbered service cards, icon blocks, accent styling.
 * Reference: "Our Services" page with 01-06 numbered cards, descriptions, icon blocks.
 */
export default function ServicesPage({ services, accentColor = '#F5A623' }) {
  const serviceList = Array.isArray(services) ? services : [];
  const serviceIcons = [Wrench, Settings, Truck, Package, Cpu, Zap];

  return (
    <div pageTitle="Our Services" className="bg-white relative overflow-hidden" style={{ minHeight: '1123px' }}>
      {/* ===== HEADER ===== */}
      <div className="px-10 md:px-14 pt-10 pb-6 relative">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">What We Offer</span>
        </div>
        <div className="flex items-end justify-between">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">
            Our <span className="italic font-light" style={{ color: accentColor }}>Services</span>
          </h2>
          <p className="text-gray-400 text-xs max-w-[200px] text-right leading-relaxed">
            Comprehensive solutions tailored to meet your business needs.
          </p>
        </div>
        {/* Divider */}
        <div className="mt-5 h-[2px] bg-gray-100 relative">
          <div className="absolute left-0 top-0 h-full w-20" style={{ backgroundColor: accentColor }} />
        </div>
      </div>

      {/* ===== SERVICE CARDS GRID ===== */}
      <div className="px-10 md:px-14 pb-8">
        {serviceList.length > 0 ? (
          <div className="grid grid-cols-2 gap-5">
            {serviceList.slice(0, 6).map((service, i) => {
              const Icon = serviceIcons[i % serviceIcons.length];
              const name = typeof service === 'string' ? service : service?.name || service?.title || `Service ${i + 1}`;
              const desc = typeof service === 'object' ? (service?.description || service?.desc || '') : '';
              const isAccent = i === 0;
              const isDark = i === 1;

              return (
                <div key={i} className="relative p-6 rounded-sm overflow-hidden group"
                  style={{
                    backgroundColor: isAccent ? accentColor : isDark ? '#1a1a1a' : '#f8f8f8',
                    border: !isAccent && !isDark ? '1px solid #eee' : 'none'
                  }}>
                  {/* Large background number */}
                  <span className="absolute top-3 right-4 text-[60px] font-black leading-none"
                    style={{ color: isAccent || isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-4 relative z-10"
                    style={{
                      backgroundColor: isAccent ? 'rgba(255,255,255,0.2)' : isDark ? accentColor : 'white',
                      border: !isAccent && !isDark ? `1px solid ${accentColor}30` : 'none'
                    }}>
                    <Icon size={16} style={{ color: isAccent ? 'white' : isDark ? 'white' : accentColor }} />
                  </div>

                  {/* Content */}
                  <h4 className="font-bold text-sm mb-2 relative z-10"
                    style={{ color: isAccent || isDark ? 'white' : '#1a1a1a' }}>
                    {name}
                  </h4>
                  {desc && (
                    <p className="text-[11px] leading-relaxed relative z-10"
                      style={{ color: isAccent || isDark ? 'rgba(255,255,255,0.7)' : '#888' }}>
                      {desc.length > 100 ? desc.slice(0, 100) + '...' : desc}
                    </p>
                  )}

                  {/* Bottom accent bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: isAccent ? 'white' : accentColor }} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-sm">
            <Wrench size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Services will appear here</p>
          </div>
        )}
      </div>

      {/* ===== BOTTOM HIGHLIGHT STRIP ===== */}
      <div className="px-10 md:px-14 mt-auto">
        <div className="flex items-center gap-6 p-6 rounded-sm bg-gray-50 border border-gray-100">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: accentColor }}>
            <ArrowRight size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 mb-0.5">Need a custom solution?</p>
            <p className="text-[10px] text-gray-500">We tailor our services to fit your unique requirements. Get in touch to discuss.</p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>Let&apos;s Talk</span>
          </div>
        </div>
      </div>

      {/* Bottom accent strip */}
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundColor: accentColor }} />
    </div>
  );
}
