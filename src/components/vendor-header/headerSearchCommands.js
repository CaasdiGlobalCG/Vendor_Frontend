// ============================================================
// FILE: headerSearchCommands.js
// PURPOSE: The global search's static command catalogue and its keyword filter.
// CONNECTS TO: consumed by components/Header/useHeaderSearch.js.
//
// VERBATIM EXTRACTION from components/Header/Header.jsx:369-425 — same seven commands,
// same keyword strings, same matching behaviour.
// ============================================================

export const COMMAND_DEFINITIONS = [
  {
    id: 'go-dashboard',
    label: 'Go to Dashboard',
    description: 'Open your main vendor dashboard',
    keywords: 'dashboard home main',
  },
  {
    id: 'view-projects',
    label: 'View Projects list',
    description: 'See all your projects',
    keywords: 'projects project list',
  },
  {
    id: 'view-leads',
    label: 'View Leads',
    description: 'See all your PM-sent project requests',
    keywords: 'leads requests rfq',
  },
  {
    id: 'view-workspaces',
    label: 'View Workspaces',
    description: 'List all collaborative workspaces you can access',
    keywords: 'workspace workspaces canvas board',
  },
  {
    id: 'open-portfolio',
    label: 'Open Portfolio',
    description: 'Manage your products & services',
    keywords: 'portfolio products services catalog',
  },
  {
    id: 'open-profile',
    label: 'Open Profile & Company details',
    description: 'View and edit your public vendor profile',
    keywords: 'profile company details vendor info',
  },
  {
    id: 'start-kyc',
    label: 'Start / Update KYC',
    description: 'Go to vendor onboarding forms',
    keywords: 'kyc onboarding verification forms form1',
  },
];

/**
 * @param {string} q raw query
 * @returns {typeof COMMAND_DEFINITIONS} matching commands; all of them when the query is blank
 */
export function filterCommands(q) {
  const lc = q.trim().toLowerCase();
  if (!lc) return COMMAND_DEFINITIONS;

  return COMMAND_DEFINITIONS.filter((cmd) => {
    const fields = [cmd.label, cmd.description, cmd.keywords]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return fields.includes(lc);
  });
}
