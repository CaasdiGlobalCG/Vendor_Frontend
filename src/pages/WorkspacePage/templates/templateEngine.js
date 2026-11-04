/**
 * Templates: turning a saved layout into elements on a canvas. Pure functions
 * (no React, no network) so the rules are testable.
 *
 * A template is `{ id, name, description, industry, nodes, edges, variables? }`
 * where nodes/edges are React Flow nodes/edges as saved. Official templates
 * ship with the app; a vendor's own come from the server (same shape).
 */
import { createEdge } from '../utils/connectionUtils';
import { getNodeSize, isContainer } from '../utils/canvasPlacement';
import { isDecorativeBlockNode } from '../utils/blockElements';

export const INDUSTRIES = [
  { id: 'construction', label: 'Construction' },
  { id: 'interiors', label: 'Interiors' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'retail', label: 'Retail' },
  { id: 'general', label: 'General' },
];

export const industryLabel = (id) => INDUSTRIES.find((i) => i.id === id)?.label || 'General';

/** Questions asked when a template is used. Each fills a `{{key}}` in the template. */
export const TEMPLATE_VARIABLES = [
  { key: 'project', label: 'Project name', placeholder: 'e.g. Sharma residence' },
  { key: 'client', label: 'Client', placeholder: 'e.g. Mr. Sharma' },
  { key: 'site', label: 'Site / location', placeholder: 'e.g. Baner, Pune' },
  { key: 'start_date', label: 'Start date', type: 'date' },
];

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** Which `{{keys}}` appear anywhere in a template. */
export const variablesUsed = (template) => {
  const found = new Set();
  const walk = (value) => {
    if (typeof value === 'string') {
      for (const m of value.matchAll(PLACEHOLDER)) found.add(m[1].toLowerCase());
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(template?.nodes);
  return TEMPLATE_VARIABLES.filter((v) => found.has(v.key));
};

/** "2026-03-01" -> "1 Mar 2026"; anything else is returned as typed. */
const prettyDate = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!m) return String(value || '');
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const SEPARATOR = ' · ';

/**
 * Tidy a string after its placeholders were filled:
 *  - "Client: ·  Site: Pune" loses the labels that got no value ("Client:")
 *  - a leading separator left by an empty first value (": civil works") is dropped
 *    and the text starts with a capital again
 */
const tidyFilled = (out, startedWithPlaceholder) => {
  let text = out;
  if (text.includes(SEPARATOR)) {
    text = text
      .split(SEPARATOR)
      .filter((part) => !/^[^:]{1,40}:\s*$/.test(part.trim()))
      .join(SEPARATOR);
  } else if (/^[^:]{1,40}:\s*$/.test(text.trim())) {
    text = '';
  }
  text = text.replace(/\s{2,}/g, ' ').trim();
  if (startedWithPlaceholder) {
    const stripped = text.replace(/^[:·\-–]\s*/, '');
    text = stripped === text ? text : stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }
  return text;
};

/** Replace `{{key}}` in every string of `value`. Unknown or empty keys become an empty string. */
export const applyVariables = (value, values = {}) => {
  const lookup = (key) => {
    const k = key.toLowerCase();
    return k === 'start_date' ? prettyDate(values[k]) : String(values[k] ?? '');
  };
  const walk = (v) => {
    if (typeof v === 'string') {
      const out = v.replace(PLACEHOLDER, (_, key) => lookup(key));
      return out === v ? out : tidyFilled(out, /^\s*\{\{/.test(v));
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value);
};

const startOfDate = (isoDate) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
};

/** Bounding box of the top-level nodes (children are positioned relative to their frame). */
export const templateBounds = (nodes = []) => {
  const top = nodes.filter((n) => !n.parentNode);
  if (top.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of top) {
    const { w, h } = getNodeSize(n);
    const x = Number(n.position?.x) || 0;
    const y = Number(n.position?.y) || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

/** Short facts about a template for its card / preview. */
export const templateSummary = (template) => {
  const nodes = template?.nodes || [];
  const edges = template?.edges || [];
  return { elements: nodes.length, connections: edges.length, variables: variablesUsed(template).map((v) => v.label) };
};

/**
 * Build the nodes and edges to add to a canvas.
 *
 * @param {object} template
 * @param {object} ctx
 * @param {object} [ctx.values]          answers for the `{{keys}}`
 * @param {(size:{w:number,h:number}) => {x:number,y:number}} ctx.placeGroup  top-left for the whole template
 * @param {number} [ctx.startSequence]   next element number on the canvas
 * @param {object} [ctx.workspace]       { workspaceId, taskId, subtaskId, taskName, subtaskName, collaborators }
 * @param {object} [ctx.author]          { name, email, role }
 * @param {string} [ctx.suffix]          unique piece for ids (tests pass a fixed one)
 * @param {Date}   [ctx.now]
 */
export const instantiateTemplate = (template, ctx = {}) => {
  const {
    values = {},
    placeGroup = () => ({ x: 0, y: 0 }),
    startSequence = 1,
    workspace = {},
    author = {},
    suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    now = new Date(),
  } = ctx;

  const fullSource = Array.isArray(template?.nodes) ? template.nodes : [];
  // A line that is only there to show answers (client, site ...) is dropped when nothing was answered
  const isBlankLine = (n) => n.data?.hideIfEmpty && !String(applyVariables(n.data?.content ?? '', { ...values })).trim();
  const source = fullSource.filter((n) => !isBlankLine(n));
  const bounds = templateBounds(source);
  const origin = placeGroup({ w: bounds.w, h: bounds.h });
  const dx = origin.x - bounds.x;
  const dy = origin.y - bounds.y;
  const answers = { ...values };
  const startDate = startOfDate(answers.start_date);

  const idMap = new Map(source.map((n) => [n.id, `${n.id}_${suffix}`]));
  let sequence = startSequence;
  const stamp = now.toISOString();

  const nodes = source.map((n) => {
    const data = applyVariables(n.data || {}, answers);

    // Countdowns are written as "N days after the start"
    if (data.kind === 'countdown' && Number.isFinite(Number(data.targetOffsetDays))) {
      const due = new Date(startDate);
      due.setDate(due.getDate() + Number(data.targetOffsetDays));
      due.setHours(18, 0, 0, 0);
      data.target = due.toISOString();
      delete data.targetOffsetDays;
    }
    delete data.hideIfEmpty;

    const node = {
      ...n,
      id: idMap.get(n.id),
      position: n.parentNode
        ? { x: Number(n.position?.x) || 0, y: Number(n.position?.y) || 0 }
        : { x: (Number(n.position?.x) || 0) + dx, y: (Number(n.position?.y) || 0) + dy },
      selected: false,
      data: {
        ...data,
        workspaceId: workspace.workspaceId || null,
        taskId: workspace.taskId || null,
        subtaskId: workspace.subtaskId || null,
        taskName: workspace.taskName || null,
        subtaskName: workspace.subtaskName || null,
        workspaceCollaborators: workspace.collaborators || [],
        comments: [],
        addedBy: author.name || author.email || 'Unknown User',
        addedByEmail: author.email || null,
        addedByRole: author.role || 'vendor',
        addedAt: stamp,
        lastUpdatedAt: stamp,
        lastUpdatedBy: author.name || author.email || 'Unknown User',
        approvalStatus: 'pending',
      },
    };
    if (n.parentNode) node.parentNode = idMap.get(n.parentNode) || undefined;
    if (!node.parentNode) delete node.parentNode;

    // Text and decoration are not numbered "elements" (same rule as adding them by hand)
    const numbered = node.type !== 'textNode' && !isDecorativeBlockNode(node) && !isContainer(node);
    if (numbered) {
      node.data.sequenceNumber = sequence;
      sequence += 1;
    }
    return node;
  });

  const edges = (Array.isArray(template?.edges) ? template.edges : [])
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e, i) => {
      const base = e.markerEnd || e.type ? { ...e } : createEdge({ source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle });
      return {
        ...base,
        id: `edge_tpl_${suffix}_${i}`,
        source: idMap.get(e.source),
        target: idMap.get(e.target),
        data: e.data ? applyVariables(e.data, answers) : base.data,
      };
    });

  return { nodes, edges, nextSequence: sequence };
};

// ---- Tasks that come with a template ---------------------------------------

const pad2 = (n) => String(n).padStart(2, '0');
const toDateString = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const idPart = () => Math.random().toString(36).slice(2, 8);

/** Does this template carry tasks (with their working elements)? */
export const hasTemplateTasks = (template) => Array.isArray(template?.tasks) && template.tasks.length > 0;

/** Plain-language counts for the "also create tasks" option. */
export const taskPlanSummary = (template) => {
  const tasks = Array.isArray(template?.tasks) ? template.tasks : [];
  const subtasks = tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
  const days = tasks.reduce((max, t) => Math.max(max, (Number(t.offsetDays) || 0) + (Number(t.durationDays) || 0)), 0);
  return { tasks: tasks.length, subtasks, days };
};

/**
 * The task list a template brings, ready to send to the server in one request.
 *
 * Each task gets a due date (start date + its offset + its duration) and its
 * subtasks; each subtask carries its own working canvas (checklists, tables ...)
 * built the same way as a canvas template, so ids, workspace details and answers
 * are filled in. Ids are made here so the canvases can refer to them.
 *
 * @param {object} template  `template.tasks = [{ name, description, offsetDays, durationDays, priority, subtasks: [{ name, description, nodes, edges }] }]`
 * @param {object} ctx       { values, workspace: { workspaceId }, author, now, suffix, includeOverview }
 *   `includeOverview` adds a first task whose only step holds the template's overview layout. It is for a
 *   workspace with no canvas yet, where the layout has nowhere else to go.
 * @returns {Array<{ id, name, description, priority, dueDate, subtasks: Array<{ id, name, description, canvasData }> }>}
 */
export const planTemplateTasks = (template, ctx = {}) => {
  const { values = {}, workspace = {}, author = {}, now = new Date(), suffix = Date.now().toString(36), includeOverview = false } = ctx;
  const specs = Array.isArray(template?.tasks) ? template.tasks : [];
  const startDate = startOfDate(values.start_date);

  const tasks = specs.map((spec, ti) => {
    const taskId = `task_${suffix}_${ti}_${idPart()}`;
    const taskName = applyVariables(spec.name || 'Task', values);
    const due = new Date(startDate);
    due.setDate(due.getDate() + (Number(spec.offsetDays) || 0) + (Number(spec.durationDays) || 0));

    const subtasks = (spec.subtasks || []).map((sub, si) => {
      const subtaskId = `subtask_${suffix}_${ti}_${si}_${idPart()}`;
      const subtaskName = applyVariables(sub.name || 'Subtask', values);
      const canvas = instantiateTemplate(
        { nodes: sub.nodes || [], edges: sub.edges || [] },
        {
          values,
          placeGroup: () => ({ x: 120, y: 120 }),
          workspace: { ...workspace, taskId, subtaskId, taskName, subtaskName },
          author,
          suffix: `${suffix}${ti}${si}`,
          now,
        }
      );
      return {
        id: subtaskId,
        name: subtaskName,
        description: applyVariables(sub.description || '', values),
        canvasData: { nodes: canvas.nodes, edges: canvas.edges, zoomLevel: 100 },
      };
    });

    return {
      id: taskId,
      name: taskName,
      description: applyVariables(spec.description || '', values),
      priority: spec.priority || 'medium',
      dueDate: toDateString(due),
      subtasks,
    };
  });

  if (!includeOverview) return tasks;

  // The overview layout becomes the first step of a first task
  const taskId = `task_${suffix}_overview_${idPart()}`;
  const subtaskId = `subtask_${suffix}_overview_${idPart()}`;
  const project = String(values.project || '').trim();
  const taskName = project ? `${project} overview` : 'Project overview';
  const overview = instantiateTemplate(
    { nodes: template?.nodes || [], edges: template?.edges || [] },
    {
      values,
      placeGroup: () => ({ x: 120, y: 120 }),
      workspace: { ...workspace, taskId, subtaskId, taskName, subtaskName: 'Overview' },
      author,
      suffix: `${suffix}ov`,
      now,
    }
  );
  return [
    {
      id: taskId,
      name: taskName,
      description: template?.description || '',
      priority: 'medium',
      dueDate: toDateString(startDate),
      subtasks: [
        {
          id: subtaskId,
          name: 'Overview',
          description: 'The whole plan on one canvas.',
          canvasData: { nodes: overview.nodes, edges: overview.edges, zoomLevel: 100 },
        },
      ],
    },
    ...tasks,
  ];
};
