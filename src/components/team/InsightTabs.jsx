// ============================================================
// FILE: InsightTabs.jsx
// PURPOSE: Team-page bodies for the "My Permissions" matrix and the Activity log.
// CONNECTS TO: team.constants.js, components/ui, components/dashboard.
//
// Fixes carried from the live page: the matrix cells are not anonymous checkboxes —
// each cell is a labelled, read-only indicator (EditablePermissionMatrix.jsx:256-289 was a
// grid of bare <input type="checkbox"> with no accessible name); the activity rows are real
// buttons, not <tr onClick> (ActivityLogTab.jsx:324-326).
// ============================================================

import { useState } from 'react';
import { Check, ChevronDown, Minus } from 'lucide-react';
import { Badge, EmptyState, SkeletonTableRow, cn } from '../ui';
import { Panel } from '../dashboard';
import { COPY, formatDate, timeAgo } from './team.constants';

// Action vocabulary from rbac/constants/modules.js ACTION_LABELS.
const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'manage'];

/** Parse a flat permission list into { module: Set(actions) } plus a wildcard flag. */
function buildMatrix(permissions) {
  const map = new Map();
  let wildcard = false;

  for (const raw of permissions || []) {
    if (raw === '*:*') {
      wildcard = true;
      continue;
    }
    const [module, action] = String(raw).split(':');
    if (!module || !action) continue;
    if (!map.has(module)) map.set(module, new Set());
    map.get(module).add(action);
  }

  return { rows: [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])), wildcard };
}

/** Read-only permission matrix. Every cell carries a text alternative. */
export function PermissionsTab({ data }) {
  const { rows, wildcard } = buildMatrix(data.permissions);
  const moduleCount = data.moduleCount;

  return (
    <Panel
      title={COPY.permissionsTitle}
      meta={wildcard ? 'Full access' : `${rows.length} modules`}
      state={rows.length === 0 && !wildcard ? 'empty' : 'ready'}
      emptyTitle="No permissions assigned"
      emptyHint="This account has no module permissions yet."
      bodyPadded={false}
    >
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-dim">Role</p>
          <p className="mt-0.5 text-sm font-medium text-ink">{data.role?.roleName || '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-dim">Level</p>
          <p className="tnum mt-0.5 text-sm font-medium text-ink">{data.role?.roleLevel ?? '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-dim">Modules</p>
          <p className="tnum mt-0.5 text-sm font-medium text-ink">{moduleCount}</p>
        </div>
        {wildcard && <Badge tone="neutral" dot>Wildcard access</Badge>}
      </div>

      {wildcard ? (
        <p className="px-4 py-6 text-sm text-dim">
          This account has wildcard access (<span className="font-mono text-ink">*:*</span>) — every
          module and action is permitted.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-medium uppercase tracking-[0.12em] text-dim">
                <th scope="col" className="px-4 py-2.5">Module</th>
                {ACTIONS.map((action) => (
                  <th key={action} scope="col" className="px-3 py-2.5 text-center">{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([module, actions]) => (
                <tr key={module} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-mono text-xs font-normal text-ink">
                    {module}
                  </th>
                  {ACTIONS.map((action) => {
                    const granted = actions.has(action) || actions.has('manage');
                    return (
                      <td key={action} className="px-3 py-2.5 text-center">
                        <span
                          className={cn('inline-flex items-center justify-center', granted ? 'text-success' : 'text-dim')}
                          title={`${module} ${action}: ${granted ? 'granted' : 'not granted'}`}
                        >
                          {granted ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}
                          <span className="sr-only">
                            {module} {action} {granted ? 'granted' : 'not granted'}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/** One expandable activity row — a real button with aria-expanded, not <tr onClick>. */
function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const detail = log.details || {};
  const summary = detail.newRoleName
    ? `${detail.oldRoleName || '—'} → ${detail.newRoleName}`
    : detail.roleName || detail.email || detail.targetEmail || detail.reason || '—';

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
      >
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-dim transition-transform duration-150 ease-signal', open && 'rotate-180')}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
            {log.action}
          </span>
          <span className="mt-0.5 block truncate text-xs text-dim">{summary}</span>
        </span>
        <span className="shrink-0 text-xs text-dim">
          {log.actorName || log.actorEmail || '—'} · {timeAgo(log.timestamp)}
        </span>
      </button>
      {open && (
        <dl className="space-y-1.5 border-t border-line bg-canvas px-4 py-3 pl-11 text-xs">
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-dim">Event</dt>
            <dd className="font-mono text-ink">{log.eventId || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-dim">When</dt>
            <dd className="tnum text-ink">{formatDate(log.timestamp)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-dim">Actor</dt>
            <dd className="min-w-0 truncate text-ink">{log.actorEmail || '—'}</dd>
          </div>
          {detail.reason && (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-dim">Reason</dt>
              <dd className="min-w-0 text-ink">{detail.reason}</dd>
            </div>
          )}
        </dl>
      )}
    </li>
  );
}

/** Activity log — real rows, real states. */
export function ActivityTab({ data }) {
  const { logs, slices } = data;
  const state = slices.activity;

  return (
    <Panel
      title={COPY.activityTitle}
      meta={logs.length ? String(logs.length) : null}
      state={state}
      emptyTitle={COPY.noActivity}
      emptyHint={COPY.noActivityHint}
      errorHint={COPY.loadFailedHint}
      bodyPadded={false}
    >
      {state === 'loading' ? (
        <table className="w-full"><tbody><SkeletonTableRow cols={3} /><SkeletonTableRow cols={3} /><SkeletonTableRow cols={3} /></tbody></table>
      ) : logs.length === 0 ? (
        <EmptyState title={COPY.noActivity} description={COPY.noActivityHint} />
      ) : (
        <ul>{logs.map((log) => <LogRow key={log.eventId} log={log} />)}</ul>
      )}
    </Panel>
  );
}
