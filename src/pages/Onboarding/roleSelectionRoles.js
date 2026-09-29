// FILE: roleSelectionRoles.js
// PURPOSE: Role content for the role-selection page (copy + features + icons).
//          Presentation only - no API calls, no auth, no routing logic.
// CONNECTS TO: pages/Onboarding/RoleSelection.jsx

import { Store, Building2 } from 'lucide-react';

/** The two selectable roles, with copy + features used by the picker. */
export const ROLES = [
  {
    id: 'vendor',
    title: 'Vendor',
    tagline: 'Sell and deliver',
    description: 'Manage leads, projects and your service catalog as a verified vendor.',
    icon: Store,
    features: [
      'Vendor dashboard, leads & notifications',
      'Project portfolio and submissions',
      'Manage services and company profile',
    ],
  },
  {
    id: 'client',
    title: 'Client',
    tagline: 'Buy and manage',
    description: 'Raise enquiries, compare vendors and track quotations end to end.',
    icon: Building2,
    features: [
      'Guided onboarding',
      'Track enquiries and quotations',
      'Compare vendors and manage requests',
    ],
  },
];
