// ============================================================
// FILE: ProjectTable.jsx
// PURPOSE: Dense, filterable project table with real status, real age and a
//          lifecycle stage rail. Mobile falls back to stacked cards.
// CONNECTS TO: components/dashboard/StatusPill, components/dashboard/StageRail, components/dashboard/dashboard.constants.
//
// Fixes carried over from the shipped ProjectList/ProjectRow:
//   - one status → one tone (ProjectRow.jsx:98-110 rendered the same status in
//     two different colours on table vs mobile)
//   - no invented progress percentage (ProjectRow.jsx:112-134)
//   - local chevron icon instead of an animaapp.com asset (ProjectRow.jsx:299,395)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { StageRail } from './StageRail';
import { COPY, STATUS_ORDER, STATUS_LABEL, formatAge, toneFor } from './dashboard.constants';

const FILTERS = [{ id: 'all', label: 'All' }, ...STATUS_ORDER.map((id) => ({ id, label: STATUS_LABEL[id] }))];

/** Soonest-priority first: in progress, then pending, then completed. */
const byPriority = (a, b) => {
  const rank = toneFor(a.status).rank - toneFor(b.status).rank;
  if (rank !== 0) return -rank;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
};

export function ProjectTable({ projects }) {
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => {
    const list = filter === 'all' ? projects : projects.filter((p) => p.status === filter);
    return [...list].sort(byPriority);
  }, [projects, filter]);

  const countFor = (id) => (id === 'all' ? projects.length : projects.filter((p) => p.status === id).length);

  return (
    <div>
      {/* Filter rail — hairline segmented control, keyboard reachable. */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 py-3 sm:px-5">
        {FILTERS.map((option) => {
          const active = filter === option.id;
          const count = countFor(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={active}
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                active ? 'bg-cta text-cta-foreground' : 'text-dim hover:bg-surface-hover hover:text-ink',
              ].join(' ')}
            >
              {option.label}
              <span className={`tnum ${active ? 'text-cta-foreground/70' : 'text-dim'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-ink">
            {projects.length === 0 ? COPY.noProjects : 'Nothing in this stage'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-dim">
            {projects.length === 0 ? COPY.noProjectsHint : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-line md:hidden">
            {visible.map((project) => (
              <li key={project.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                    <p className="mt-0.5 truncate text-xs text-dim">Ref {project.clientId || '—'}</p>
                  </div>
                  <StatusPill status={project.status} />
                </div>
                <StageRail status={project.status} />
                <p className="text-[11px] text-dim">Created {formatAge(project.createdAt)} ago</p>
              </li>
            ))}
          </ul>

          {/* Desktop: dense table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-left text-[10px] font-medium uppercase tracking-[0.12em] text-dim">
                  <th scope="col" className="px-5 py-2.5">Project</th>
                  <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Reference</th>
                  <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Age</th>
                  <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Status</th>
                  <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Stage</th>
                  <th scope="col" className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <tr key={project.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="max-w-[22rem] px-5 py-3">
                      <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                      {project.description && (
                        <p className="mt-0.5 truncate text-xs text-dim">{project.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-dim whitespace-nowrap">{project.clientId || '—'}</td>
                    <td className="tnum px-3 py-3 text-xs text-dim whitespace-nowrap">
                      {formatAge(project.createdAt)}
                    </td>
                    <td className="px-3 py-3"><StatusPill status={project.status} /></td>
                    <td className="px-3 py-3"><StageRail status={project.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to="/VendorDashboard/projects"
                        className="inline-flex items-center gap-1 text-xs font-medium text-dim transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      >
                        Open
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
