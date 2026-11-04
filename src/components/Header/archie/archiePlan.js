import { taskCard, table } from '../../../pages/WorkspacePage/templates/officialTasks';
import { planTemplateTasks } from '../../../pages/WorkspacePage/templates/templateEngine';
import { OFFICIAL_TEMPLATES } from '../../../pages/WorkspacePage/templates/officialTemplates';

/**
 * Archie's plan, as the server validated it, turned into what a workspace stores.
 *
 * plan = { summary, project, tasks: [{ name, description, priority, offsetDays, durationDays,
 *            subtasks: [{ name, description, elements: [{ key, kind, ... }], links: [{ from, to }] }] }] }
 *
 * Elements: checklist -> a checklist card, note -> a card with text, table -> an editable table,
 * boq -> an editable table with item and unit filled in and quantity / rate left blank.
 */

export const COLUMN_WIDTH = 720;
export const ROW_HEIGHT = 480;
const PER_ROW = 2;

export const BOQ_COLUMNS = ['Sl', 'Item', 'Unit', 'Qty', 'Rate', 'Amount'];

/**
 * Amount = Qty × Rate. SUM(x) is used (not x) because it reads an empty cell as 0, so a row with nothing
 * typed yet shows 0 instead of an error. The total row adds the amounts.
 */
export const boqRows = (items) => {
  const rows = items.map((it, i) => [i + 1, it.item, it.unit || '', '', '', `=SUM(D${i + 1})*SUM(E${i + 1})`]);
  rows.push(['', 'Total', '', '', '', `=SUM(F1:F${items.length})`]);
  return rows;
};

const elementNode = (stepId, el, x, y) => {
  const id = `${stepId}-${el.key}`;
  if (el.kind === 'checklist') return taskCard(id, x, y, el.title, el.items);
  if (el.kind === 'note') return taskCard(id, x, y, el.title, [], el.text);
  if (el.kind === 'boq') {
    const node = table(id, x, y, el.name, BOQ_COLUMNS, 0, boqRows(el.items));
    node.data.preview = `Draft BOQ · ${el.items.length} items · fill in quantities and rates`;
    return node;
  }
  return table(id, x, y, el.name, el.columns, 3);
};

/** Lay a step's elements out in a grid and join the ones the plan says belong together. */
export const stepCanvas = (step, stepId = 'step') => {
  const placed = new Map();
  const nodes = step.elements.map((el, i) => {
    const col = i % PER_ROW;
    const row = Math.floor(i / PER_ROW);
    const node = elementNode(stepId, el, col * COLUMN_WIDTH, row * ROW_HEIGHT);
    placed.set(el.key, { id: node.id, col, row });
    return node;
  });
  const edges = (step.links || [])
    .filter((l) => placed.has(l.from) && placed.has(l.to))
    .map((l) => {
      const a = placed.get(l.from);
      const b = placed.get(l.to);
      const sideBySide = a.row === b.row && a.col !== b.col;
      const side = sideBySide ? (a.col < b.col ? 'right' : 'left') : (a.row <= b.row ? 'bottom' : 'top');
      const opposite = { right: 'left', left: 'right', bottom: 'top', top: 'bottom' }[side];
      return { source: a.id, target: b.id, sourceHandle: `${side}-out`, targetHandle: `${opposite}-in` };
    });
  return { nodes, edges };
};

/** The plan in the same shape the official templates use for their tasks. */
export const planToTemplate = (plan) => ({
  tasks: plan.tasks.map((t) => ({
    name: t.name,
    description: t.description,
    priority: t.priority,
    offsetDays: t.offsetDays,
    durationDays: t.durationDays,
    subtasks: t.subtasks.map((s, i) => {
      const { nodes, edges } = stepCanvas(s, `s${i}`);
      return { name: s.name, description: s.description, nodes, edges };
    }),
  })),
});

/** What is sent to the workspace's bulk endpoint. */
export const planToBulkTasks = (plan, { startDate, workspaceId, author = {} }) =>
  planTemplateTasks(planToTemplate(plan), {
    values: { start_date: startDate },
    workspace: { workspaceId },
    author,
  });

export const planStats = (plan) => {
  const subtasks = plan.tasks.flatMap((t) => t.subtasks);
  const elements = subtasks.flatMap((s) => s.elements);
  return {
    tasks: plan.tasks.length,
    subtasks: subtasks.length,
    elements: elements.length,
    connections: subtasks.reduce((n, s) => n + (s.links?.length || 0), 0),
    boqs: elements.filter((e) => e.kind === 'boq').length,
    boqItems: elements.filter((e) => e.kind === 'boq').reduce((n, e) => n + e.items.length, 0),
  };
};

export const planBoqs = (plan) =>
  plan.tasks.flatMap((t) =>
    t.subtasks.flatMap((s) => s.elements.filter((e) => e.kind === 'boq').map((e) => ({ task: t.name, step: s.name, name: e.name, items: e.items })))
  );

const pad = (n) => String(n).padStart(2, '0');
export const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDateString(new Date());

/** Start and due dates of a task for a given project start (YYYY-MM-DD). */
export const taskDates = (task, startDate) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate || '');
  const base = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  const start = new Date(base);
  start.setDate(start.getDate() + (task.offsetDays || 0));
  const due = new Date(start);
  due.setDate(due.getDate() + (task.durationDays || 0));
  return { start, due };
};

export const formatShort = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Official templates reduced to names, so the planner can borrow their structure. */
export const templateHints = () =>
  OFFICIAL_TEMPLATES.filter((t) => Array.isArray(t.tasks) && t.tasks.length > 0).map((t) => ({
    id: t.id,
    name: t.name,
    phases: t.tasks.map((p) => ({ name: p.name, steps: (p.subtasks || []).map((s) => s.name) })),
  }));
