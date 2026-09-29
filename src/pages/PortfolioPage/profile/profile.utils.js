// ============================================================
// FILE: profile.utils.js
// PURPOSE: Small presentation helpers for the Portfolio profile card.
// CONNECTS TO: profile/PortfolioProfileCard.jsx.
// ============================================================

/**
 * Initials for an avatar, at most two characters.
 * @param {string} [name]
 * @returns {string}
 */
export function initialsOf(name) {
  const value = String(name || '').trim();
  if (!value) return '?';
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * A display value, or an em dash when the API has nothing. Never a fabricated string —
 * the legacy pages seeded their profile state with '#CXV001' / 'Loading...' placeholders.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function displayValue(value) {
  if (value === null || value === undefined) return '—';
  const text = String(value).trim();
  return text === '' ? '—' : text;
}
