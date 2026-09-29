// ============================================================
// FILE: AccessTabs.jsx
// PURPOSE: Team-page bodies for the Invitations and Roles tabs.
// CONNECTS TO: team.constants.js, components/ui, components/dashboard.
//
// Fixes carried from the live page: <th> has scope="col"; the cancel-invitation action
// no longer uses window.confirm (TeamPage.jsx:223) and is inert in the preview.
// ============================================================

import { Badge, EmptyState, SkeletonTableRow } from '../ui';
import { Panel } from '../dashboard';
import { COPY, formatDate, invitationTone, roleTreatment, timeAgo } from './team.constants';

/** Invitations tab — pending invites with a real status chip and inert cancel. */
export function InvitationsTab({ data, onCancelInvitation }) {
  const { invitations, slices } = data;
  const state = slices.invitations;

  return (
    <Panel
      title={COPY.invitations}
      meta={invitations.length ? String(invitations.length) : null}
      state={state}
      emptyTitle={COPY.noInvitations}
      emptyHint={COPY.noInvitationsHint}
      errorHint={COPY.loadFailedHint}
      bodyPadded={false}
    >
      {state === 'loading' ? (
        <table className="w-full"><tbody><SkeletonTableRow cols={5} /><SkeletonTableRow cols={5} /></tbody></table>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[0.12em] text-dim">
                <th scope="col" className="px-4 py-2.5">{COPY.email}</th>
                <th scope="col" className="px-4 py-2.5">{COPY.role}</th>
                <th scope="col" className="px-4 py-2.5">{COPY.invited}</th>
                <th scope="col" className="px-4 py-2.5">{COPY.expires}</th>
                <th scope="col" className="px-4 py-2.5">{COPY.status}</th>
                <th scope="col" className="px-4 py-2.5 text-right">{COPY.actions}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const tone = invitationTone(invitation);
                return (
                  <tr key={invitation.inviteId} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 text-sm text-ink">{invitation.email}</td>
                    <td className="px-4 py-3 text-xs text-dim">{invitation.roleName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-dim">{timeAgo(invitation.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-dim">{formatDate(invitation.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                        {tone.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={
                          typeof onCancelInvitation === 'function'
                            ? () => onCancelInvitation(invitation)
                            : undefined
                        }
                        aria-disabled={typeof onCancelInvitation === 'function' ? undefined : 'true'}
                        title={
                          typeof onCancelInvitation === 'function'
                            ? COPY.cancelInvitation
                            : COPY.previewDisabled
                        }
                        className={
                          typeof onCancelInvitation === 'function'
                            ? 'rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-surface-hover'
                            : 'cursor-default rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-dim'
                        }
                      >
                        {COPY.cancelInvitation}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/** Roles tab — the role catalogue. Level and permission count come from real fields. */
export function RolesTab({ data }) {
  const { roles, rolesMeta, slices } = data;
  const state = slices.roles;

  return (
    <Panel
      title={COPY.roles}
      meta={roles.length ? String(roles.length) : null}
      state={state}
      emptyTitle={COPY.noRoles}
      errorHint={COPY.loadFailedHint}
      bodyPadded={false}
      action={
        typeof rolesMeta?.maxCustomRoles === 'number' ? (
          <span className="tnum text-xs text-dim">
            {rolesMeta.customRoleCount ?? roles.length}/{rolesMeta.maxCustomRoles} custom roles
          </span>
        ) : null
      }
    >
      {state === 'loading' ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-md bg-surface-hover" />)}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState title={COPY.noRoles} description="Roles define what a member can do across modules." />
      ) : (
        <ul className="divide-y divide-line">
          {roles.map((role) => {
            const treatment = roleTreatment(role.roleName);
            const permissionCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
            return (
              <li key={role.roleId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${treatment.className}`}>
                      <span aria-hidden="true">{treatment.marker}</span>
                      {treatment.label}
                    </span>
                    {role.isSystem && <Badge tone="neutral">System</Badge>}
                    {role.canAssign === false && <Badge tone="neutral">Not assignable</Badge>}
                  </div>
                  {role.description && (
                    <p className="mt-1.5 max-w-measure text-xs leading-5 text-dim">{role.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs text-dim">
                  <span className="tnum">Level {role.roleLevel ?? '—'}</span>
                  <span className="tnum">{permissionCount} permissions</span>
                  <button
                    type="button"
                    aria-disabled="true"
                    title={COPY.previewDisabled}
                    className="cursor-default rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-dim"
                  >
                    Edit
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
