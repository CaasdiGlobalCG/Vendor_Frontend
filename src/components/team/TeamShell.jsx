// ============================================================
// FILE: TeamShell.jsx
// PURPOSE: Team-page wrapper over the generic ConsoleShell — supplies the Team hero
//          copy, the tone-driven stat strip and the Team tab set.
// CONNECTS TO: components/console/ConsoleShell (the shell implementation),
//              ./team.constants (TABS, COPY).
//
// The shell itself now lives in components/console/ConsoleShell so the Team and
// Notifications pages share one implementation. `Tabs` and `FeedbackRegion` are
// re-exported here so existing imports keep working.
// ============================================================

import { ConsoleShell } from '../console/ConsoleShell';
import { COPY, TABS } from './team.constants';

export { Tabs, FeedbackRegion, Stats } from '../console/ConsoleShell';

/**
 * @param {object} props
 * @param {object} props.data shaped like the page's data object
 * @param {React.ReactNode} [props.actions] hero action slot
 * @param {React.ReactNode} [props.notice] optional notice line — omitted on the live page
 * @param {React.ReactNode} [props.aside] optional persistent rail
 * @param {React.ReactNode} props.children the active tab body
 */
export function TeamShell({ data, actions, notice, aside, children }) {
  // Colour is minimal and meaningful: only the figure is tinted, never the label or
  // the cell. A neutral count stays ink.
  const stats = [
    { label: 'Members', value: data.memberStats.total, tone: 'text-ink' },
    { label: 'Active', value: data.memberStats.active, tone: 'text-success' },
    { label: 'Suspended', value: data.memberStats.suspended, tone: 'text-danger' },
    { label: 'Pending invites', value: data.memberStats.pendingInvites, tone: 'text-warning' },
  ];

  const counts = {
    members: data.members.length,
    invitations: data.invitations.length,
    roles: data.roles.length,
  };

  return (
    <ConsoleShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
      actions={actions}
      notice={notice}
      stats={stats}
      tabs={TABS}
      activeTab={data.activeTab}
      onTabChange={data.setActiveTab}
      counts={counts}
      aside={aside}
    >
      {children}
    </ConsoleShell>
  );
}
