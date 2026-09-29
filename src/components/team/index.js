// ============================================================
// FILE: index.js
// PURPOSE: Barrel for the permanent Team-page component set — re-exports the shared
//          constants, the page shell, and the tab bodies from one entry point.
// CONNECTS TO: team.constants.js, TeamShell.jsx, MemberTable.jsx, AccessTabs.jsx,
//              InsightTabs.jsx.
// ============================================================

export * from './team.constants';
export { Tabs, FeedbackRegion, TeamShell } from './TeamShell';
export { MemberTable } from './MemberTable';
export { InvitationsTab, RolesTab } from './AccessTabs';
export { PermissionsTab, ActivityTab } from './InsightTabs';
