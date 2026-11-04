/**
 * What each official template's main canvas holds besides the overview diagram:
 * real working elements (a checklist card and an editable table) instead of
 * typed-in notes, and which status / progress blocks follow the tasks.
 *
 * `remove`: ids of plain-text notes the real elements replace.
 * `items`:  elements laid out in a row beneath the diagram.
 * `links`:  status / progress blocks that take their numbers from the tasks:
 *           { scope: 'workspace' } or { scope: 'task', taskName } (a phase of the template's own task list).
 */
import { taskCard, table } from './officialTasks';
import { getNodeSize } from '../utils/canvasPlacement';

const TABLE_WIDTH = 560;

const card = (title, items) => ({ kind: 'card', title, items });
const grid = (name, columns, seed = [], rows = 4) => ({ kind: 'table', name, columns, seed, rows });

const WORKING = {
  'official-civil-works': {
    remove: ['chk'],
    items: [
      card('Before work starts', ['Drawings approved', 'Permits in place', 'Site safety plan signed', 'Material suppliers confirmed']),
      grid('Milestones', ['Milestone', 'Planned', 'Actual', 'Status'], [['Mobilisation done', '', '', ''], ['Foundation complete', '', '', ''], ['Structure complete', '', '', ''], ['Handover', '', '', '']]),
    ],
    links: {
      p: { scope: 'workspace' },
      s1: { scope: 'task', taskName: 'Mobilisation' },
      s2: { scope: 'task', taskName: 'Excavation & foundation' },
      s3: { scope: 'task', taskName: 'RCC structure' },
    },
  },
  'official-site-daily-progress': {
    remove: [],
    items: [
      card("Today's checklist", ['Attendance recorded', 'Work done entered', 'Material received logged', 'Photos taken', 'Issues and safety noted']),
      grid('Labour attendance', ['Trade', 'Workers', 'Hours', 'Remarks'], [], 5),
    ],
    links: {},
  },
  'official-snag-handover': {
    remove: ['chk'],
    items: [
      card('Walk-through checklist', ['Civil and finishing defects', 'Electrical points and switches', 'Plumbing and leaks', 'Doors, windows and locks', 'Paint touch-ups', 'Cleaning']),
      grid('Snag log', ['#', 'Location', 'Defect', 'Owner', 'Due', 'Status'], [], 6),
    ],
    links: { p: { scope: 'task', taskName: 'Snag closure' } },
  },
  'official-interior-fit-out': {
    remove: ['n'],
    items: [
      card('Watch-outs', ['Order joinery early: lead time decides the schedule', 'Freeze electrical points before the ceiling', 'Get client changes in writing after sign-off']),
      grid('Material schedule', ['Item', 'Brand / spec', 'Rate', 'Lead time', 'Status'], [['Flooring', '', '', '', ''], ['Wall paint', '', '', '', ''], ['Laminates', '', '', '', ''], ['Lighting', '', '', '', '']]),
    ],
    links: {
      p: { scope: 'workspace' },
      s1: { scope: 'task', taskName: 'Design & drawings' },
      s2: { scope: 'task', taskName: 'Materials' },
      s3: { scope: 'task', taskName: 'Site works' },
    },
  },
  'official-procurement-cycle': {
    remove: [],
    items: [
      card('Purchase order checklist', ['Supplier chosen with reason', 'PO issued', 'Supplier acknowledged', 'Delivery date confirmed']),
      grid('Quote comparison', ['Supplier', 'Rate', 'Delivery', 'Terms', 'Score'], [], 4),
    ],
    links: {},
  },
  'official-production-line-setup': {
    remove: [],
    items: [
      card('Go-live checklist', ['Quality targets met', 'Safety audit passed', 'Operators trained', 'Raw material in stock', 'First production order released']),
      grid('Machine tracker', ['Machine', 'Supplier', 'Delivery date', 'Installed', 'Notes'], [], 5),
    ],
    links: {
      p: { scope: 'workspace' },
      s1: { scope: 'task', taskName: 'Install machines' },
      s2: { scope: 'task', taskName: 'Go-live' },
      s3: { scope: 'task', taskName: 'Trial & quality gate' },
    },
  },
  'official-qc-inspection': {
    remove: ['n'],
    items: [
      card('Inspection checklist', ['Quantity checked', 'Sample drawn', 'Measurements taken', 'Photos attached', 'Pass / fail decided']),
      grid('NCR log', ['NCR #', 'Item', 'Defect', 'Action', 'Status'], [], 5),
    ],
    links: {},
  },
  'official-store-launch': {
    remove: [],
    items: [
      card('Pre-launch checklist', ['Licences in place', 'POS and billing tested', 'Stock on shelves and priced', 'Staff trained', 'Marketing live']),
      grid('Vendors', ['Vendor', 'Category', 'Terms', 'Status'], [], 5),
    ],
    links: {
      p: { scope: 'workspace' },
      s1: { scope: 'task', taskName: 'Site & lease' },
      s2: { scope: 'task', taskName: 'Fit-out' },
      s3: { scope: 'task', taskName: 'Stock & vendors' },
    },
  },
  'official-monthly-sales-review': {
    remove: [],
    items: [
      card('Review checklist', ['Numbers collected', 'Targets compared', 'Best and worst sellers noted', 'Actions agreed with owners']),
      grid('Action log', ['Action', 'Owner', 'Due', 'Status'], [], 5),
    ],
    links: {},
  },
};

const GAP = 70;

/** Apply a template's working elements and task links to its overview nodes. */
export const withWorking = (template) => {
  const config = WORKING[template.id];
  if (!config) return template;

  const kept = template.nodes
    .filter((n) => !config.remove.includes(n.id))
    .map((n) => (config.links[n.id] ? { ...n, data: { ...n.data, link: config.links[n.id] } } : n));

  const bottom = Math.max(...kept.map((n) => (Number(n.position.y) || 0) + getNodeSize(n).h));
  let x = 0;
  const added = config.items.map((item, i) => {
    const id = `work-${i}`;
    const node =
      item.kind === 'card'
        ? taskCard(id, x, bottom + GAP, item.title, item.items)
        : (() => {
            const t = table(id, x, bottom + GAP, item.name, item.columns, item.rows, item.seed);
            const rows = Math.max(item.rows || 0, (item.seed || []).length);
            // Width is applied to the node; the height only tells placement how much room the table will take
            return { ...t, style: { width: TABLE_WIDTH }, data: { ...t.data, height: 300 + rows * 52 } };
          })();
    x += getNodeSize(node).w + 60;
    return node;
  });

  return { ...template, nodes: [...kept, ...added] };
};
