import React, { useMemo } from 'react';
import { X, TrendingUp, Layers, FileCheck, FileText } from 'lucide-react';

const localDay = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDay = (dateStr) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

// Days = union of element-added days (node.data.addedAt across every canvas)
// and progress-submission days (progressDate, fallback submittedAt).
const buildDayList = (workspace) => {
  const byDay = new Map(); // date -> { elements, submissions }
  const bump = (day, key) => {
    if (!day) return;
    if (!byDay.has(day)) byDay.set(day, { elements: 0, submissions: 0 });
    byDay.get(day)[key] += 1;
  };

  (workspace?.nodes || []).forEach((n) => bump(localDay(n?.data?.addedAt), 'elements'));
  (workspace?.tasks || []).forEach((t) =>
    (t?.subtasks || []).forEach((s) =>
      (s?.canvasData?.nodes || []).forEach((n) => bump(localDay(n?.data?.addedAt), 'elements'))
    )
  );

  (workspace?.progress_submissions || []).forEach((s) =>
    bump(s.progressDate || localDay(s.submittedAt), 'submissions')
  );

  return [...byDay.keys()].sort().map((date, i) => ({
    date,
    label: `Day-${i + 1}`,
    ...byDay.get(date),
  }));
};

const ProgressSidebar = ({ open, onClose, workspace = {}, selectedDay, onSelectDay, onOpenReport }) => {
  const days = useMemo(() => buildDayList(workspace), [workspace]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-72 bg-surface border-l border-line shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-info" />
          <h2 className="text-sm font-semibold text-ink">Progress by Day</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
          aria-label="Close progress sidebar"
        >
          <X className="w-4 h-4 text-dim" />
        </button>
      </div>

      <p className="px-4 py-2 text-xs text-dim border-b border-line">
        Pick a day to highlight the elements added that day on the canvas.
      </p>

      {/* Overall report */}
      {onOpenReport && (
        <button
          onClick={() => onOpenReport({ date: null, label: 'Overall Report' })}
          className="mx-4 mt-2 mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-info border border-info/40 rounded-lg py-2 hover:bg-info/10 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" /> Overall workspace report
        </button>
      )}

      {/* Day list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {days.length === 0 && (
          <p className="text-xs text-dim text-center py-8">No progress days yet.</p>
        )}
        {days.map((d) => {
          const active = selectedDay === d.date;
          return (
            <button
              key={d.date}
              onClick={() => onSelectDay(active ? null : d.date)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                active ? 'border-success bg-success/10' : 'border-line bg-surface hover:border-success/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${active ? 'text-success' : 'text-ink'}`}>
                  {d.label}
                </span>
                {active && <span className="text-[10px] font-medium text-success">highlighting</span>}
              </div>
              <p className="text-xs text-dim mt-0.5">{formatDay(d.date)}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-dim">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {d.elements} element{d.elements !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <FileCheck className="w-3 h-3" />
                  {d.submissions} update{d.submissions !== 1 ? 's' : ''}
                </span>
              </div>
              {onOpenReport && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onOpenReport(d); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onOpenReport(d); } }}
                  className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-info hover:bg-info/10 rounded py-1 transition-colors"
                >
                  <FileText className="w-3 h-3" /> View day report
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressSidebar;
