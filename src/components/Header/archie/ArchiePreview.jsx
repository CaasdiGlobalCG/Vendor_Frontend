import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, CheckSquare, FileSpreadsheet, GitBranch, ListTodo, StickyNote, Table2 } from 'lucide-react';
import { COLUMN_WIDTH, ROW_HEIGHT, BOQ_COLUMNS, planStats, planBoqs, stepCanvas, taskDates, formatShort } from './archiePlan';

/**
 * The right-hand preview of what Archie is about to build.
 * It only shows the plan: nothing here has been written to the workspace.
 */

const TABS = [
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'canvas', label: 'Canvas', icon: GitBranch },
  { id: 'boq', label: 'BOQ', icon: FileSpreadsheet },
];

const KIND_ICON = { checklist: CheckSquare, note: StickyNote, table: Table2, boq: FileSpreadsheet };
const KIND_LABEL = { checklist: 'Checklist', note: 'Note', table: 'Table', boq: 'BOQ draft' };

const PRIORITY_STYLE = {
  high: 'bg-danger/10 text-danger',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-surface-hover text-dim',
};

const Chip = ({ children }) => <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-ink">{children}</span>;

const TasksTab = ({ plan, startDate }) => (
  <ol className="space-y-3">
    {plan.tasks.map((task, ti) => {
      const { start, due } = taskDates(task, startDate);
      return (
        <li key={`${task.name}-${ti}`} className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cta text-[11px] font-bold text-cta-foreground">{ti + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-[13px] font-semibold text-ink">{task.name}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium}`}>{task.priority}</span>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-dim">
                <CalendarDays size={11} />
                {formatShort(start)} <ArrowRight size={10} /> {formatShort(due)} · {task.durationDays} day{task.durationDays === 1 ? '' : 's'}
              </p>
              {task.description && <p className="mt-1.5 text-[12px] leading-relaxed text-dim">{task.description}</p>}
              <ul className="mt-3 space-y-2">
                {task.subtasks.map((s, si) => (
                  <li key={`${s.name}-${si}`} className="rounded-xl bg-canvas px-3 py-2">
                    <p className="text-[12px] font-medium text-ink">{s.name}</p>
                    {s.description && <p className="text-[11px] text-dim">{s.description}</p>}
                    {(s.elements.length > 0 || s.links.length > 0) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.elements.map((e) => {
                          const Icon = KIND_ICON[e.kind] || Table2;
                          return <Chip key={e.key}><Icon size={10} />{KIND_LABEL[e.kind] || e.kind}: {e.title || e.name}</Chip>;
                        })}
                        {s.links.length > 0 && <Chip><GitBranch size={10} />{s.links.length} connection{s.links.length === 1 ? '' : 's'}</Chip>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </li>
      );
    })}
  </ol>
);

const MiniCanvas = ({ step }) => {
  const { nodes, edges } = useMemo(() => stepCanvas(step, 'preview'), [step]);
  if (nodes.length === 0) return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[12px] text-dim">This step has no elements; you add them as you work.</p>;

  const cols = Math.min(2, nodes.length);
  const rows = Math.ceil(nodes.length / 2);
  const W = cols * COLUMN_WIDTH;
  const H = rows * ROW_HEIGHT;
  const BOX_W = COLUMN_WIDTH - 80;
  const BOX_H = ROW_HEIGHT - 120;
  const scale = 0.4;
  const centre = (id) => {
    const n = nodes.find((x) => x.id === id);
    return { x: n.position.x + BOX_W / 2, y: n.position.y + BOX_H / 2 };
  };

  return (
    <div className="overflow-auto rounded-xl border border-line bg-canvas p-3">
      <div style={{ width: W * scale, height: H * scale }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative' }}>
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="rgb(var(--text-muted))" />
              </marker>
            </defs>
            {edges.map((e, i) => {
              const a = centre(e.source);
              const b = centre(e.target);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(var(--text-muted))" strokeWidth="5" markerEnd="url(#arch-arrow)" />;
            })}
          </svg>
          {nodes.map((n, i) => {
            const el = step.elements[i];
            const Icon = KIND_ICON[el.kind] || Table2;
            return (
              <div key={n.id} style={{ position: 'absolute', left: n.position.x, top: n.position.y, width: BOX_W, height: BOX_H }} className="overflow-hidden rounded-3xl border-[6px] border-line bg-surface p-8">
                <div className="mb-4 flex items-center gap-4 text-ink" style={{ fontSize: 44, fontWeight: 600 }}>
                  <Icon size={48} />
                  <span className="truncate">{el.title || el.name}</span>
                </div>
                {(el.items || el.columns || []).slice(0, 5).map((t, k) => (
                  <div key={k} className="truncate text-dim" style={{ fontSize: 36, lineHeight: 1.5 }}>
                    {el.kind === 'checklist' ? '☐ ' : el.kind === 'boq' ? '· ' : ''}{typeof t === 'string' ? t : t.item}
                  </div>
                ))}
                {el.kind === 'note' && <div className="text-dim" style={{ fontSize: 34, lineHeight: 1.4 }}>{el.text}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CanvasTab = ({ plan }) => {
  const steps = useMemo(() => plan.tasks.flatMap((t) => t.subtasks.map((s) => ({ task: t.name, step: s }))), [plan]);
  const [index, setIndex] = useState(0);
  const current = steps[Math.min(index, steps.length - 1)];
  return (
    <div>
      <label htmlFor="archie-step-pick" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-dim">Step</label>
      <select id="archie-step-pick" value={Math.min(index, steps.length - 1)} onChange={(e) => setIndex(Number(e.target.value))} className="mb-3 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[12px] text-ink outline-none focus:border-cta">
        {steps.map((s, i) => <option key={i} value={i}>{s.task} · {s.step.name}</option>)}
      </select>
      {current && <MiniCanvas step={current.step} />}
      <p className="mt-2 text-[11px] text-dim">Arrows show the connections Archie will draw. You can move and edit everything once it is in the workspace.</p>
    </div>
  );
};

const BoqTab = ({ plan }) => {
  const boqs = planBoqs(plan);
  if (boqs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
        <FileSpreadsheet size={20} className="mx-auto mb-2 text-dim" />
        <p className="text-[13px] font-semibold text-ink">No BOQ for this project</p>
        <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-dim">Archie only drafts one when the work involves materials or measured quantities. Ask him to add one if you need it.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {boqs.map((b, i) => (
        <section key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <header className="border-b border-line px-4 py-2.5">
            <h4 className="text-[13px] font-semibold text-ink">{b.name}</h4>
            <p className="text-[11px] text-dim">{b.task} · {b.step}</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[12px]">
              <thead className="bg-canvas text-dim">
                <tr>{BOQ_COLUMNS.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {b.items.map((it, n) => (
                  <tr key={n}>
                    <td className="px-3 py-2 text-dim">{n + 1}</td>
                    <td className="px-3 py-2 text-ink">{it.item}</td>
                    <td className="px-3 py-2 text-dim">{it.unit}</td>
                    <td className="px-3 py-2 text-dim/50">·</td>
                    <td className="px-3 py-2 text-dim/50">·</td>
                    <td className="px-3 py-2 text-dim/50">·</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="text-[11px] leading-relaxed text-dim">Quantities and rates are left blank for you to fill in. Amounts and the total calculate as you type.</p>
    </div>
  );
};

const ArchiePreview = ({ plan, warnings = [], startDate, onStartDateChange, locked = false }) => {
  const [tab, setTab] = useState('tasks');
  const stats = useMemo(() => planStats(plan), [plan]);

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="archie-preview">
      <div className="flex-shrink-0 space-y-3 border-b border-line bg-surface px-5 py-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink">
          <Chip><ListTodo size={10} />{stats.tasks} task{stats.tasks === 1 ? '' : 's'}</Chip>
          <Chip>{stats.subtasks} step{stats.subtasks === 1 ? '' : 's'}</Chip>
          <Chip>{stats.elements} element{stats.elements === 1 ? '' : 's'}</Chip>
          <Chip><GitBranch size={10} />{stats.connections} connection{stats.connections === 1 ? '' : 's'}</Chip>
          {stats.boqs > 0 && <Chip><FileSpreadsheet size={10} />{stats.boqs} BOQ draft{stats.boqs === 1 ? '' : 's'}</Chip>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="archie-start-date" className="text-[11px] font-semibold text-dim">Project starts</label>
          <input id="archie-start-date" type="date" value={startDate} disabled={locked} onChange={(e) => onStartDateChange(e.target.value)} className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-cta disabled:opacity-60" />
          <span className="text-[11px] text-dim">About {plan.project?.durationDays || '—'} days</span>
        </div>
        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-warning/10 px-3 py-2 text-[11px] text-ink">
            {warnings.map((w) => <li key={w} className="flex items-start gap-1.5"><AlertTriangle size={11} className="mt-0.5 flex-shrink-0 text-warning" />{w}</li>)}
          </ul>
        )}
        <div role="tablist" aria-label="Preview" className="flex items-center gap-1 rounded-xl bg-surface-hover p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${tab === id ? 'bg-surface text-ink border border-line' : 'text-dim hover:text-ink'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 ai-prompt-messages-scroll" role="tabpanel">
        {tab === 'tasks' && <TasksTab plan={plan} startDate={startDate} />}
        {tab === 'canvas' && <CanvasTab plan={plan} />}
        {tab === 'boq' && <BoqTab plan={plan} />}
      </div>
    </div>
  );
};

export default ArchiePreview;
