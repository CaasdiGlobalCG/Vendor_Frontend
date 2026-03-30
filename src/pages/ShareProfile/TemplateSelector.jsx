import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { PORTFOLIO_TEMPLATES } from '../SharedProfile/portfolio/templates';

/**
 * Template selector — Grid of template previews with mini-mockup cards.
 * Vendor picks a template design for their portfolio.
 */
export default function TemplateSelector({ selectedId, onSelect, accentColor }) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {PORTFOLIO_TEMPLATES.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`relative text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg group ${
                isSelected ? 'ring-2 ring-offset-2 shadow-lg scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
              style={{
                borderColor: isSelected ? template.accentColor : '#e5e7eb',
                ringColor: isSelected ? template.accentColor : 'transparent',
              }}
            >
              {/* Selected badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: template.accentColor }}>
                  <Check size={14} />
                </div>
              )}

              {/* Mini mockup preview */}
              <div className="h-40 relative overflow-hidden" style={{ background: template.preview.gradient }}>
                {/* Mock cover layout */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  {/* Top: mock logo area */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/20" />
                    <div className="h-2 w-16 bg-white/20 rounded" />
                  </div>

                  {/* Center: mock text */}
                  <div>
                    <div className="h-1.5 w-10 bg-white/30 rounded mb-2" />
                    <div className="h-3 w-24 bg-white/50 rounded mb-1" />
                    <div className="h-4 w-32 bg-white/80 rounded" />
                  </div>

                  {/* Bottom: mock footer */}
                  <div className="flex justify-between items-center">
                    <div className="h-1.5 w-20 bg-white/20 rounded" />
                    <div className="w-6 h-6 rounded border border-white/30 flex items-center justify-center">
                      <Sparkles size={8} className="text-white/50" />
                    </div>
                  </div>
                </div>

                {/* Diagonal accent shape */}
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2"
                  style={{
                    backgroundColor: template.accentColor,
                    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                    opacity: 0.3,
                  }}
                />
              </div>

              {/* Template info */}
              <div className="p-3" style={{ backgroundColor: isSelected ? template.preview.cardBg : '#fff' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: template.accentColor }} />
                  <p className="text-sm font-bold text-gray-900">{template.name}</p>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">{template.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
