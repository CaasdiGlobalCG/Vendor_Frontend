import React from 'react';

/**
 * Character avatars for the agents in the workspace's Agents panel.
 * Each one is a small self-contained SVG so it stays sharp at any size
 * and works in light and dark themes.
 */

// Archie: the workspace builder. A friendly robot in a hard hat holding a blueprint.
export const ArchieAvatar = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Archie, the workspace builder" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="archie-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#dbeafe" />
        <stop offset="1" stopColor="#b0d4f1" />
      </linearGradient>
      <linearGradient id="archie-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e2e8f0" />
        <stop offset="1" stopColor="#cbd5e1" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#archie-bg)" />
    {/* antenna */}
    <line x1="32" y1="9" x2="32" y2="15" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="8" r="2.6" fill="#f59e0b" />
    {/* hard hat */}
    <path d="M17 26c0-8.5 6.7-14 15-14s15 5.5 15 14z" fill="#6495ed" stroke="#2f55a4" strokeWidth="1.5" />
    <rect x="14" y="25" width="36" height="5" rx="2.5" fill="#4f7fe0" stroke="#2f55a4" strokeWidth="1.5" />
    <rect x="29" y="12.5" width="6" height="9" rx="2" fill="#93b4f5" />
    {/* head */}
    <rect x="17" y="30" width="30" height="19" rx="7" fill="url(#archie-body)" stroke="#94a3b8" strokeWidth="1.5" />
    {/* visor + eyes */}
    <rect x="21" y="33.5" width="22" height="11" rx="5.5" fill="#0f172a" />
    <circle cx="27.5" cy="39" r="2.6" fill="#bfdbfe" />
    <circle cx="36.5" cy="39" r="2.6" fill="#bfdbfe" />
    <circle cx="28.3" cy="38.2" r="0.8" fill="#fff" />
    <circle cx="37.3" cy="38.2" r="0.8" fill="#fff" />
    {/* smile */}
    <path d="M29 46.2c1.8 1.4 4.2 1.4 6 0" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    {/* body */}
    <rect x="22" y="50" width="20" height="9" rx="4" fill="#475569" />
    <rect x="29" y="52.5" width="6" height="4" rx="1" fill="#6495ed" />
    {/* blueprint */}
    <g transform="rotate(-10 50 54)">
      <rect x="44" y="47" width="14" height="11" rx="1.5" fill="#fff7ed" stroke="#f59e0b" strokeWidth="1.2" />
      <path d="M46.5 51h9M46.5 54h5.5M51 48.5v8" stroke="#f59e0b" strokeWidth="0.9" strokeLinecap="round" />
    </g>
  </svg>
);

const AVATARS = { archie: ArchieAvatar };

export const AgentAvatar = ({ id, size }) => {
  const Avatar = AVATARS[id];
  return Avatar ? <Avatar size={size} /> : null;
};
