/**
 * Node audience + readability helpers for workspace annotations.
 *
 * Audience model
 * --------------
 * A node may carry `data.visibleTo` — an array of roles that should see it.
 * Nodes without the field are visible to everyone, which keeps every existing
 * node working unchanged.
 *
 * IMPORTANT: this module is for *decluttering* the canvas. The authoritative
 * filter runs server-side (Vendor_Backend modules/workspace/utils/nodeVisibility.js)
 * because a hidden node still travels in the API payload. Never treat
 * client-side hiding as confidentiality on its own.
 */

export const AUDIENCE_ROLES = ['pm', 'vendor', 'client'];

export const ROLE_LABELS = {
  pm: 'PM',
  vendor: 'Vendor',
  client: 'Client',
};

/** Normalise an unknown role (e.g. 'admin') onto the audience vocabulary. */
export const normalizeRole = (role) => {
  if (!role) return null;
  const value = String(role).toLowerCase();
  if (value === 'admin' || value === 'owner' || value === 'manager') return 'pm';
  return AUDIENCE_ROLES.includes(value) ? value : null;
};

/** Audience for a node; missing/empty means "everyone". */
export const getAudience = (data) => {
  const raw = data?.visibleTo;
  if (!Array.isArray(raw) || raw.length === 0) return [...AUDIENCE_ROLES];
  const filtered = AUDIENCE_ROLES.filter((role) => raw.map((r) => String(r).toLowerCase()).includes(role));
  // An audience list containing only unknown roles would hide the node from
  // everyone — fall back to everyone rather than silently losing content.
  return filtered.length > 0 ? filtered : [...AUDIENCE_ROLES];
};

/** True when at least one role is excluded. */
export const isAudienceRestricted = (data) => getAudience(data).length < AUDIENCE_ROLES.length;

/** Should a viewer with this role see the node? Unknown role → yes (fail open). */
export const isVisibleToRole = (data, role) => {
  const normalized = normalizeRole(role);
  if (!normalized) return true;
  return getAudience(data).includes(normalized);
};

/** "Everyone" / "PM only" / "PM + Client" */
export const describeAudience = (data) => {
  const audience = getAudience(data);
  if (audience.length === AUDIENCE_ROLES.length) return 'Everyone';
  if (audience.length === 1) return `${ROLE_LABELS[audience[0]]} only`;
  return audience.map((role) => ROLE_LABELS[role]).join(' + ');
};

/** Add or remove one role, never producing an empty audience. */
export const toggleAudienceRole = (data, role) => {
  const normalized = normalizeRole(role);
  if (!normalized) return getAudience(data);

  const current = getAudience(data);
  const next = current.includes(normalized)
    ? current.filter((r) => r !== normalized)
    : [...current, normalized];

  if (next.length === 0) return current; // keep at least one audience
  return AUDIENCE_ROLES.filter((r) => next.includes(r));
};

/** Locked nodes can't be dragged, edited or deleted from the canvas. */
export const isLocked = (data) => data?.locked === true;

/* ── Readability guardrails ─────────────────────────────────────────────── */

export const MIN_READABLE_FONT_PT = 10;
export const MIN_CONTRAST_RATIO = 4.5;

const hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  const value = hex.trim().replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

const channelLuminance = (channel) => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ({ r, g, b }) =>
  0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);

/** WCAG contrast ratio between two hex colours; null when either is unusable. */
export const contrastRatio = (foreground, background) => {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return null;

  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Non-blocking readability warnings for the inspector. Captions sit directly on
 * the canvas, so "transparent" resolves to the canvas background.
 */
export const getReadabilityWarnings = (data, { canvasBackground = '#ffffff' } = {}) => {
  const warnings = [];

  const size = Number(data?.fontSize);
  if (Number.isFinite(size) && size > 0 && size < MIN_READABLE_FONT_PT) {
    warnings.push(`${size}pt is below the ${MIN_READABLE_FONT_PT}pt readability minimum`);
  }

  const background = data?.backgroundColor && data.backgroundColor !== 'transparent'
    ? data.backgroundColor
    : canvasBackground;
  const ratio = contrastRatio(data?.color, background);
  if (ratio !== null && ratio < MIN_CONTRAST_RATIO) {
    warnings.push(`Low contrast (${ratio.toFixed(1)}:1) against the background`);
  }

  return warnings;
};
