// ============================================================
// FILE: header.constants.js
// PURPOSE: Single source of nav items, module tabs, copy and formatters for the
//          permanent vendor header component set.
// CONNECTS TO: every file in components/header/**;
//              mirrors the nav sets of components/Header/Header.jsx:690-712 and the
//              module tabs of components/AppHeader/tabNavigation.jsx:167-171.
// ============================================================

// ──────────────────────────────────────
// PRIMARY NAVIGATION
// ──────────────────────────────────────

// ONE definition for both breakpoints. The live header ships two different lists
// (desktop 6 items, mobile menu 7) and the desktop Workspace item is a <button>
// that can never show an active state — see Header.jsx:690-712 vs :852-874.
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', to: '/VendorDashboard', end: true, module: 'dashboard' },
  { id: 'projects', label: 'Projects', to: '/VendorDashboard/projects', module: 'projects' },
  { id: 'leads', label: 'Leads', to: '/VendorDashboard/leads', module: 'leads' },
  { id: 'workspace', label: 'Workspace', to: '/VendorDashboard/workspace', module: 'workspace' },
  { id: 'team', label: 'Team', to: '/VendorDashboard/team', module: 'user_management' },
  { id: 'notifications', label: 'Notifications', to: '/VendorDashboard/notifications', module: 'notifications' },
  // No module: the live header renders Revenue without a PermissionGate (Header.jsx:711).
  // Kept ungated to preserve that behaviour rather than silently changing access.
  { id: 'revenue', label: 'Revenue', to: '/VendorDashboard/finance-detail', module: null },
];

// ──────────────────────────────────────
// MODULE TABS (from the secondary header)
// ──────────────────────────────────────

// All three point at the single /portfolio page, selecting a view with `?tab=`.
// The `tab` field is what ModuleTabs (chrome.jsx) compares against the current `?tab=`
// value: a NavLink's isActive ignores the query string, so every tab would otherwise read
// as active on the shared pathname /portfolio.
export const MODULE_TABS = [
  { id: 'portfolio', label: 'Portfolio', to: '/portfolio?tab=company', tab: 'company' },
  { id: 'projects', label: 'Projects', to: '/portfolio?tab=projects', tab: 'projects' },
  { id: 'products', label: 'Products', to: '/portfolio?tab=catalogue', tab: 'catalogue' },
];

// ──────────────────────────────────────
// QUICK ACTIONS (static navigation shortcuts)
// ──────────────────────────────────────

// Mirrors the commandDefinitions at components/Header/Header.jsx:369-412 — these are
// static UI config, not fetched data, so the preview can show them honestly.
// Project / lead / workspace results DO require the live search fetch
// (Header.jsx:453+) which the preview does not perform; those groups stay empty.
export const QUICK_ACTIONS = [
  { id: 'go-dashboard', label: 'Go to Dashboard', description: 'Open your main vendor dashboard', to: '/VendorDashboard' },
  { id: 'view-projects', label: 'View Projects list', description: 'See all your projects', to: '/VendorDashboard/projects' },
  { id: 'view-leads', label: 'View Leads', description: 'See all your PM-sent project requests', to: '/VendorDashboard/leads' },
  { id: 'view-workspaces', label: 'View Workspaces', description: 'List all collaborative workspaces you can access', to: '/VendorDashboard/workspace' },
  { id: 'open-portfolio', label: 'Open Portfolio', description: 'Manage your products & services', to: '/portfolio?tab=catalogue' },
  { id: 'open-profile', label: 'Open Profile & Company details', description: 'View and edit your public vendor profile', to: '/portfolio?tab=company' },
  { id: 'start-kyc', label: 'Start / Update KYC', description: 'Go to vendor onboarding forms', to: '/Form1' },
];

// ──────────────────────────────────────
// COPY
// ──────────────────────────────────────

export const COPY = {
  search: 'Search',
  searchHint: 'Search projects, leads, workspaces…',
  searchShortcut: '⌘K',
  searchEmpty: 'Type at least 2 characters to search across your projects, leads and workspaces.',
  searchNoResults: 'No results found',
  searchLoading: 'Searching…',
  searchGroups: {
    projects: 'Projects',
    leads: 'Leads',
    workspaces: 'Workspaces',
    commands: 'Quick actions',
  },
  notifications: 'Notifications',
  notificationsEmpty: 'No notifications',
  notificationsAll: 'View all notifications',
  unread: 'unread',
  messages: 'Messages',
  profile: 'Profile',
  settings: 'Settings',
  logout: 'Log out',
  support: 'Support',
  gstin: 'GSTIN',
  gstinMissing: 'Not on file',
  vendor: 'Vendor',
  client: 'Client',
  switchTo: 'Switch platform',
  menuOpen: 'Open menu',
  menuClose: 'Close menu',
  // Cross-app destinations. These are dashboard-only in the live header
  // (Header.jsx:59 + :940) and stay dashboard-only here by decision.
  graviyx: 'Graviyx',
  sales: 'Sales',
  tender: 'Tender',
  prompt: 'Prompt',
  crossAppGroup: 'Switch app',
  promptPanelTitle: 'AI prompt',
  promptPanelNote:
    'Placeholder. The real AI prompt panel (components/Header/AiPromptPanel.jsx, 2894 lines) is not part of this redesign.',
};

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────

/**
 * Time-of-day greeting. Mirrors Header.jsx:222-227 exactly.
 * @returns {string}
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Long-form date, e.g. "28th September, 2026".
 * Replaces DateYearFunction.jsx, which renders white text on a white canvas in
 * light mode (DateYearFunction.jsx:57 vs main.css:15) and pulls its icon from
 * animaapp.com (:56).
 * @param {Date} [date]
 * @returns {string}
 */
export function formatLongDate(date = new Date()) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const day = date.getDate();
  const ordinal =
    day % 10 === 1 && day !== 11 ? 'st'
      : day % 10 === 2 && day !== 12 ? 'nd'
        : day % 10 === 3 && day !== 13 ? 'rd'
          : 'th';
  return `${day}${ordinal} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

/**
 * Weekday name, e.g. "Monday".
 * @param {Date} [date]
 * @returns {string}
 */
export function formatWeekday(date = new Date()) {
  return date.toLocaleDateString('en-GB', { weekday: 'long' });
}

/**
 * Initials for the avatar fallback, at most two characters.
 * @param {string} [name]
 * @returns {string}
 */
export function initialsOf(name) {
  const value = String(name || '').trim();
  if (!value) return 'V';
  const parts = value.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}
