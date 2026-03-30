import React, { useState } from 'react';
import { FolderOpen, Calendar, MapPin, ChevronDown, ChevronUp, ExternalLink, Users } from 'lucide-react';

/**
 * Projects page — Magazine spread with case study cards, project timelines, expandable details.
 * Reference: Case study cards with accent top bars, project number badges, client/duration metadata.
 */
export default function ProjectsPage({ projects, accentColor = '#F5A623' }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const projectList = Array.isArray(projects) ? projects : [];

  return (
    <div pageTitle="Our Projects" className="bg-white relative overflow-hidden" style={{ minHeight: '1123px' }}>
      {/* ===== HEADER ===== */}
      <div className="px-10 md:px-14 pt-10 pb-6 flex items-start gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Case Studies</span>
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">
            Featured <span className="italic font-light" style={{ color: accentColor }}>Projects</span>
          </h2>
          <p className="text-gray-500 text-xs mt-2 leading-relaxed max-w-lg">
            A selection of our most impactful work, showcasing our expertise and commitment to excellence.
          </p>
        </div>
        {/* Stats */}
        <div className="text-right flex-shrink-0">
          <div className="text-4xl font-black" style={{ color: accentColor }}>{projectList.length}</div>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Projects</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-10 md:mx-14 h-[2px] bg-gray-100 mb-6 relative">
        <div className="absolute left-0 top-0 h-full w-20" style={{ backgroundColor: accentColor }} />
      </div>

      {/* ===== PROJECT CARDS ===== */}
      <div className="px-10 md:px-14 pb-8">
        {projectList.length > 0 ? (
          <div className="space-y-4">
            {projectList.slice(0, 5).map((project, i) => {
              const name = typeof project === 'string' ? project : project?.name || project?.title || `Project ${i + 1}`;
              const desc = typeof project === 'object' ? (project?.description || project?.desc || '') : '';
              const client = typeof project === 'object' ? (project?.client || project?.clientName || '') : '';
              const location = typeof project === 'object' ? (project?.location || '') : '';
              const duration = typeof project === 'object' ? (project?.duration || project?.timeline || '') : '';
              const status = typeof project === 'object' ? (project?.status || '') : '';
              const projectType = typeof project === 'object' ? (project?.type || 'portfolio') : 'portfolio';
              const isExpanded = expandedIdx === i;
              const isFirst = i === 0;

              return (
                <div key={i} className="relative rounded-sm overflow-hidden border border-gray-100"
                  style={{ borderLeftWidth: '3px', borderLeftColor: isFirst ? accentColor : '#e5e5e5' }}>
                  {/* Card header */}
                  <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}>
                    {/* Number badge */}
                    <div className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 text-sm font-black"
                      style={{
                        backgroundColor: isFirst ? accentColor : '#1a1a1a',
                        color: 'white'
                      }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{name}</h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {client && (
                          <span className="flex items-center gap-1 text-[9px] text-gray-400">
                            <Users size={8} /> {client}
                          </span>
                        )}
                        {location && (
                          <span className="flex items-center gap-1 text-[9px] text-gray-400">
                            <MapPin size={8} /> {location}
                          </span>
                        )}
                        {duration && (
                          <span className="flex items-center gap-1 text-[9px] text-gray-400">
                            <Calendar size={8} /> {duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Project type badge */}
                    <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: projectType === 'ongoing' ? '#fef3c7' : '#e8f5e9',
                        color: projectType === 'ongoing' ? '#92400e' : '#2e7d32'
                      }}>
                      {projectType === 'ongoing' ? 'Ongoing' : 'Completed'}
                    </span>

                    {/* Status */}
                    {status && (
                      <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-sm"
                        style={{
                          backgroundColor: status.toLowerCase() === 'completed' ? '#e8f5e9' : `${accentColor}15`,
                          color: status.toLowerCase() === 'completed' ? '#2e7d32' : accentColor
                        }}>
                        {status}
                      </span>
                    )}

                    {desc && (
                      <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && desc && (
                    <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                      <p className="text-gray-600 text-xs leading-relaxed mt-3">{desc}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-sm">
            <FolderOpen size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Projects will appear here</p>
          </div>
        )}

        {projectList.length > 5 && (
          <div className="mt-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              + {projectList.length - 5} more projects
            </span>
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-900">
        <div className="h-full w-16" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  );
}
