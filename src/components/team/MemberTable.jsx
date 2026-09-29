// ============================================================
// FILE: MemberTable.jsx
// PURPOSE: Members tab body — filters, a dense desktop table, mobile cards, and a
//          member detail panel with inert actions.
// CONNECTS TO: team.constants.js, components/ui, components/dashboard.
//
// Fixes carried from the live page: <th> now has scope="col"; the filter inputs have
// real labels (TeamPage.jsx:435-456 had placeholder-only inputs); the action menu is a
// real button with a menu role and Escape handling (the live one is a
// <details>/<summary> closed by direct DOM mutation — TeamPage.jsx:1007-1010).
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Search, UserMinus, UserCheck, Pencil, Shield } from 'lucide-react';
import { Badge, EmptyState, SkeletonTableRow, cn } from '../ui';
import { Panel } from '../dashboard';
import { COPY, MEMBER_STATUS, formatDate, initialsOf, memberTone, roleTreatment, timeAgo } from './team.constants';

/** Avatar: image never exists on members, so initials only — never a fake photo. */
function Avatar({ email }) {
  const local = String(email || '').split('@')[0].replace(/[._-]+/g, ' ');
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-canvas">
      {initialsOf(local)}
    </span>
  );
}

function RoleChip({ roleName }) {
  const treatment = roleTreatment(roleName);
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium', treatment.className)}>
      <span aria-hidden="true">{treatment.marker}</span>
      {treatment.label}
    </span>
  );
}

/** Access summary from real arrays; '*' means unrestricted. */
function AccessCell({ projectAccess, workspaceAccess }) {
  const summarise = (value) => {
    if (!Array.isArray(value)) return null;
    if (value.includes('*')) return 'All';
    return String(value.length);
  };
  const projects = summarise(projectAccess);
  const workspaces = summarise(workspaceAccess);
  if (projects === null && workspaces === null) return <span className="text-dim">—</span>;
  return (
    <span className="tnum text-xs text-dim">
      {projects === null ? '—' : `${projects} proj`} · {workspaces === null ? '—' : `${workspaces} ws`}
    </span>
  );
}

/**
 * Row action menu. A real button + menu role with Escape and outside-click close,
 * and every item is inert in the preview.
 */
function ActionsMenu({ member, handlers = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // A handler makes an item live; without one it renders inert and says why.
  const items = [
    { id: 'role', label: 'Change role', icon: Shield, onClick: handlers.onChangeRole },
    { id: 'scope', label: 'Edit access scope', icon: Pencil, onClick: handlers.onEditScope },
    member.status === MEMBER_STATUS.SUSPENDED
      ? { id: 'unsuspend', label: 'Unsuspend', icon: UserCheck, onClick: handlers.onUnsuspend }
      : { id: 'suspend', label: 'Suspend', icon: UserMinus, onClick: handlers.onSuspend },
    { id: 'remove', label: 'Remove member', icon: UserMinus, onClick: handlers.onRemove },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Actions for ${member.email}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-md border border-line bg-surface shadow-pop"
        >
          {items.map((item) => {
            const enabled = typeof item.onClick === 'function';
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={enabled ? () => { setOpen(false); item.onClick(member); } : undefined}
                aria-disabled={enabled ? undefined : 'true'}
                title={enabled ? item.label : COPY.previewDisabled}
                className={
                  enabled
                    ? 'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink transition-colors hover:bg-surface-hover'
                    : 'flex w-full cursor-default items-center gap-2 px-3 py-2 text-left text-xs text-dim'
                }
              >
                <item.icon size={13} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Filter rail — labelled controls, no placeholder-only inputs. */
function Filters({ data }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <label htmlFor="team-member-search" className="block text-[11px] font-medium text-dim">
          {COPY.searchMembers}
        </label>
        <div className="mt-1 flex h-9 items-center gap-2 rounded-md border border-line bg-canvas px-2.5">
          <Search size={14} className="shrink-0 text-dim" aria-hidden="true" />
          <input
            id="team-member-search"
            type="search"
            value={data.memberSearch}
            onChange={(event) => data.setMemberSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-dim"
            placeholder={COPY.searchMembers}
          />
        </div>
      </div>
      <div>
        <label htmlFor="team-member-status" className="block text-[11px] font-medium text-dim">
          {COPY.filterStatus}
        </label>
        <select
          id="team-member-status"
          value={data.memberStatusFilter}
          onChange={(event) => data.setMemberStatusFilter(event.target.value)}
          className="mt-1 h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <option value="all">{COPY.allStatuses}</option>
          <option value={MEMBER_STATUS.ACTIVE}>Active</option>
          <option value={MEMBER_STATUS.INVITED}>Invited</option>
          <option value={MEMBER_STATUS.SUSPENDED}>Suspended</option>
        </select>
      </div>
    </div>
  );
}

/** Desktop row. */
function Row({ member, handlers }) {
  const tone = memberTone(member.status || 'active');
  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar email={member.email} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{String(member.email || '').split('@')[0]}</p>
            <p className="truncate text-xs text-dim">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><RoleChip roleName={member.roleName} /></td>
      <td className="px-4 py-3"><Badge tone="neutral" dot>{tone.label}</Badge></td>
      <td className="px-4 py-3"><AccessCell projectAccess={member.projectAccess} workspaceAccess={member.workspaceAccess} /></td>
      <td className="px-4 py-3 text-xs text-dim">{formatDate(member.joinedAt || member.createdAt)}</td>
      <td className="px-4 py-3 text-right"><ActionsMenu member={member} handlers={handlers} /></td>
    </tr>
  );
}

/** Mobile card — same data, stacked. */
function Card({ member, handlers }) {
  const tone = memberTone(member.status || 'active');
  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar email={member.email} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{String(member.email || '').split('@')[0]}</p>
            <p className="truncate text-xs text-dim">{member.email}</p>
          </div>
        </div>
        <ActionsMenu member={member} handlers={handlers} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RoleChip roleName={member.roleName} />
        <Badge tone="neutral" dot>{tone.label}</Badge>
      </div>
      <p className="text-[11px] text-dim">Joined {timeAgo(member.joinedAt || member.createdAt)}</p>
    </li>
  );
}

export function MemberTable({ data, handlers }) {
  const { slices, filteredMembers, members } = data;
  const state = slices.members;
  const empty = members.length === 0;
  const noMatch = !empty && filteredMembers.length === 0;

  return (
    <Panel
      title={COPY.membersTitle}
      meta={`${filteredMembers.length}/${members.length}`}
      state={state}
      emptyTitle={COPY.noMembers}
      emptyHint={COPY.noMembersHint}
      errorHint={COPY.loadFailedHint}
      bodyPadded={false}
      action={
        <span className="tnum text-xs text-dim">
          {data.memberStats.active} active · {data.memberStats.suspended} suspended
        </span>
      }
    >
      <div className="border-b border-line p-4"><Filters data={data} /></div>

      {state === 'loading' ? (
        <table className="w-full"><tbody><SkeletonTableRow cols={6} /><SkeletonTableRow cols={6} /><SkeletonTableRow cols={6} /></tbody></table>
      ) : noMatch ? (
        <EmptyState title={COPY.noMembersMatch} description={COPY.noMembersMatchHint} />
      ) : (
        <>
          <ul className="divide-y divide-line md:hidden">
            {filteredMembers.map((member) => <Card key={member.userId} member={member} handlers={handlers} />)}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[0.12em] text-dim">
                  <th scope="col" className="px-4 py-2.5">{COPY.member}</th>
                  <th scope="col" className="px-4 py-2.5">{COPY.role}</th>
                  <th scope="col" className="px-4 py-2.5">{COPY.status}</th>
                  <th scope="col" className="px-4 py-2.5">{COPY.access}</th>
                  <th scope="col" className="px-4 py-2.5">{COPY.joined}</th>
                  <th scope="col" className="px-4 py-2.5 text-right">{COPY.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => <Row key={member.userId} member={member} handlers={handlers} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
