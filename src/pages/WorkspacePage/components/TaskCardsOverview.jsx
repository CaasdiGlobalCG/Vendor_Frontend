// ============================================================
// FILE: components/TaskCardsOverview.jsx
// PURPOSE: Global task overview — lists every Task Card node placed on the
//          current canvas with filters (status, assignee, label) and search.
//          Clicking a row zooms the canvas to that card.
// CONNECTS TO: WorkspaceContextPanel (rendered under the Tasks tab),
//          canvasElements + onZoomToElement props.
// ============================================================

import React, { useMemo, useState } from 'react';
import { Calendar, CheckSquare, Flag, Search, User } from 'lucide-react';

const STATUS_META = {
  'todo': { label: 'To-Do', cls: 'bg-surface-hover text-ink border-line' },
  'in-progress': { label: 'In-Progress', cls: 'bg-info/10 text-info border-info/20' },
  'blocked': { label: 'Blocked', cls: 'bg-danger/10 text-danger border-danger/20' },
  'completed': { label: 'Completed', cls: 'bg-success/10 text-success border-success/20' },
};

const PRIORITY_META = {
  critical: 'text-danger',
  high: 'text-warning',
  medium: 'text-warning',
  low: 'text-info',
};

const dueTimestamp = (d) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
};

const isOverdue = (card) => {
  const t = dueTimestamp(card.dueDate);
  return t != null && t < Date.now() && card.status !== 'completed';
};

const TaskCardsOverview = ({ canvasElements = [], onZoomToElement, selectedSubtask }) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState('all');

  // Scope to the canvas currently being viewed — each subtask has its own
  // canvas, so when a subtask is open only its cards are listed (root-level
  // cards otherwise). Nodes carry `subtaskId` on their data at creation;
  // cards with no subtask tag are treated as belonging to the canvas they
  // currently appear on (legacy nodes created before the field existed).
  const scopeId = selectedSubtask?.id || null;
  const cards = useMemo(
    () =>
      (canvasElements || [])
        .filter((el) => el.data?.taskCardData)
        .filter((el) => {
          const sid = el.data?.subtaskId ?? null;
          return sid === scopeId || sid == null;
        })
        .map((el) => ({ nodeId: el.id, ...el.data.taskCardData })),
    [canvasElements, scopeId]
  );

  const assigneeOptions = useMemo(
    () => [...new Set(cards.map((c) => c.assignedTo).filter(Boolean))].sort(),
    [cards]
  );
  const labelOptions = useMemo(
    () => [...new Set(cards.flatMap((c) => c.labels || []))].sort(),
    [cards]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      .filter((c) => {
        if (statusFilter !== 'all' && (c.status || 'todo') !== statusFilter) return false;
        if (assigneeFilter !== 'all' && c.assignedTo !== assigneeFilter) return false;
        if (labelFilter !== 'all' && !(c.labels || []).includes(labelFilter)) return false;
        if (q) {
          const haystack = [c.title, c.description, c.assignedTo, ...(c.labels || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      // overdue first, then soonest due date, then no-date last
      .sort((a, b) => {
        const aT = dueTimestamp(a.dueDate);
        const bT = dueTimestamp(b.dueDate);
        const aO = isOverdue(a) ? 0 : 1;
        const bO = isOverdue(b) ? 0 : 1;
        if (aO !== bO) return aO - bO;
        return (aT ?? Number.MAX_SAFE_INTEGER) - (bT ?? Number.MAX_SAFE_INTEGER);
      });
  }, [cards, query, statusFilter, assigneeFilter, labelFilter]);

  if (cards.length === 0) {
    return (
      <div className="px-4 py-6 border-t border-line text-center">
        <CheckSquare className="w-6 h-6 text-dim mx-auto mb-2" />
        <p className="text-xs font-semibold text-ink">Canvas Task Cards</p>
        <p className="text-[11px] text-dim mt-1">
          No task cards on {selectedSubtask ? `the "${selectedSubtask.name || selectedSubtask.title}" canvas` : 'this canvas'} yet — drop one from Elements → Task Cards.
        </p>
      </div>
    );
  }

  const done = cards.filter((c) => c.status === 'completed').length;
  const overdue = cards.filter(isOverdue).length;

  return (
    <div className="border-t border-line">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-ink uppercase tracking-wide">
            Canvas Task Cards
          </p>
          <span className="text-[10px] text-dim">
            {done}/{cards.length} done{overdue ? ` · ${overdue} overdue` : ''}
          </span>
        </div>
        <p className="text-[10px] text-dim mt-0.5 truncate">
          {selectedSubtask
            ? `Subtask: ${selectedSubtask.name || selectedSubtask.title || 'current'}`
            : 'Root canvas'}
        </p>

        {/* Filters */}
        <div className="relative mt-2">
          <Search className="w-3.5 h-3.5 text-dim absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search task cards..."
            className="w-full pl-8 pr-2 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-info"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[10px] bg-canvas border border-line rounded-lg px-1.5 py-1.5 text-ink focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="todo">To-Do</option>
            <option value="in-progress">In-Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-[10px] bg-canvas border border-line rounded-lg px-1.5 py-1.5 text-ink focus:outline-none"
          >
            <option value="all">All assignees</option>
            {assigneeOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            className="text-[10px] bg-canvas border border-line rounded-lg px-1.5 py-1.5 text-ink focus:outline-none"
          >
            <option value="all">All labels</option>
            {labelOptions.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rows */}
      <div className="px-3 pb-3 space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-dim text-center py-3">No tasks match the filters.</p>
        ) : (
          filtered.map((card) => {
            const meta = STATUS_META[card.status] || STATUS_META.todo;
            return (
              <div
                key={card.nodeId}
                onClick={() => onZoomToElement?.(card.nodeId)}
                className="p-2 bg-surface border border-line hover:border-info/40 rounded-lg cursor-pointer transition-colors group"
                title="Click to locate on canvas"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink truncate flex-1">
                    {card.title || 'Untitled Task'}
                  </span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide flex-shrink-0 ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-dim">
                  {card.assignedTo && (
                    <span className="flex items-center gap-1 truncate">
                      <User className="w-3 h-3 flex-shrink-0" />
                      {card.assignedTo}
                    </span>
                  )}
                  {card.dueDate && (
                    <span className={`flex items-center gap-1 ${isOverdue(card) ? 'text-danger font-semibold' : ''}`}>
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      {card.dueDate}
                    </span>
                  )}
                  {card.priority && (
                    <span className={`flex items-center gap-1 ${PRIORITY_META[card.priority] || ''}`}>
                      <Flag className="w-3 h-3 flex-shrink-0" />
                      {card.priority}
                    </span>
                  )}
                </div>
                {(card.labels || []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {card.labels.slice(0, 4).map((label) => (
                      <span key={label} className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-hover text-dim">
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskCardsOverview;
