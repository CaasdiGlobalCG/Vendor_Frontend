/**
 * Official templates: layouts we ship for construction, interiors,
 * manufacturing and retail. They use only elements every workspace already has
 * (headings, shapes, status / progress / KPI / countdown blocks, text), so a
 * template never depends on a vendor's own data.
 *
 * `{{project}}`, `{{client}}`, `{{site}}` and `{{start_date}}` are filled in
 * when the template is used. A countdown with `targetOffsetDays` counts down to
 * that many days after the start date.
 */
import { defaultBlockData } from '../utils/blockElements';
import { OFFICIAL_TASKS } from './officialTasks';
import { withWorking } from './officialWorking';

const block = (id, x, y, kind, data, label) => ({
  id,
  type: 'blockNode',
  position: { x, y },
  data: { ...defaultBlockData(kind), name: label, type: `block-${kind}`, preview: label, ...data },
});

const heading = (id, x, y, text, level = 'h2') => block(id, x, y, 'heading', { text, level, width: 520 }, 'Heading');

const shape = (id, x, y, shapeName, text, fill, w, h) =>
  block(id, x, y, 'shape', { shape: shapeName, text, fill, width: w, height: h }, 'Shape');

const step = (id, x, y, text, fill = 'info') => shape(id, x, y, 'rectangle', text, fill, 190, 84);
const decision = (id, x, y, text) => shape(id, x, y, 'diamond', text, 'warning', 210, 140);
const terminator = (id, x, y, text, fill = 'success') => shape(id, x, y, 'ellipse', text, fill, 190, 84);

const status = (id, x, y, label, state, note = '') => block(id, x, y, 'status', { label, status: state, note }, 'Status Badge');
const progress = (id, x, y, label, value) => block(id, x, y, 'progress', { label, value, target: 100, unit: '%' }, 'Progress Bar');
const kpi = (id, x, y, label, value, extra = {}) => block(id, x, y, 'kpi', { label, value, delta: '', trend: [], ...extra }, 'KPI Card');
const countdown = (id, x, y, label, days) => block(id, x, y, 'countdown', { label, targetOffsetDays: days }, 'Countdown');

const note = (id, x, y, content) => ({
  id,
  type: 'textNode',
  position: { x, y },
  data: {
    name: 'Text',
    type: 'text',
    caption: true,
    content,
    fontSize: '14',
    fontFamily: 'Arial',
    color: '#111827',
    backgroundColor: 'transparent',
    formats: [],
  },
});

const edge = (source, target, side = 'right', label) => ({
  source,
  target,
  sourceHandle: `${side}-out`,
  targetHandle: `${{ right: 'left', bottom: 'top', left: 'right', top: 'bottom' }[side]}-in`,
  ...(label ? { data: { label } } : {}),
});

/** Edges joining each id to the next, left to right. */
const chain = (ids, side = 'right') => ids.slice(1).map((id, i) => edge(ids[i], id, side));

const projectLine = (id, x, y) => {
  const line = note(id, x, y, 'Client: {{client}} · Site: {{site}} · Start: {{start_date}}');
  line.data.hideIfEmpty = true; // nothing answered: no line at all
  return line;
};

const make = (meta, nodes, edges) => ({ official: true, visibility: 'official', ...meta, nodes, edges });

// ---------------------------------------------------------------- construction

const civilWorks = (() => {
  const ids = ['mob', 'exc', 'rcc', 'mas', 'fin', 'hand'];
  return make(
    { id: 'official-civil-works', name: 'Civil Works Project Plan', industry: 'construction', description: 'Mobilisation to handover in six stages, with progress, budget and a handover countdown.' },
    [
      heading('h', 0, 0, '{{project}}: civil works plan'),
      projectLine('meta', 0, 60),
      step('mob', 0, 150, 'Mobilisation', 'neutral'),
      step('exc', 260, 150, 'Excavation & foundation'),
      step('rcc', 520, 150, 'RCC structure'),
      step('mas', 780, 150, 'Masonry & plaster'),
      step('fin', 1040, 150, 'Finishing'),
      terminator('hand', 1300, 150, 'Handover'),
      status('s1', 0, 290, 'Site mobilisation', 'in-progress'),
      status('s2', 260, 290, 'Foundation', 'pending'),
      status('s3', 520, 290, 'Structure', 'pending'),
      progress('p', 0, 430, 'Overall progress', 0),
      kpi('k', 360, 430, 'Contract value', '0', { prefix: '₹' }),
      countdown('c', 700, 430, 'Handover', 135),
      note('chk', 0, 590, 'Before work starts:\n• Drawings approved\n• Permits in place\n• Site safety plan signed\n• Material suppliers confirmed'),
    ],
    chain(ids)
  );
})();

const dailyProgress = make(
  { id: 'official-site-daily-progress', name: 'Site Daily Progress Board', industry: 'construction', description: 'One-page daily view: workers, work done, activity progress, weather and safety.' },
  [
    heading('h', 0, 0, '{{project}}: daily site report'),
    projectLine('meta', 0, 60),
    kpi('k1', 0, 140, 'Workers on site', '0'),
    kpi('k2', 330, 140, 'Work done today', '0', { suffix: '%' }),
    kpi('k3', 660, 140, 'Material received', '0', { suffix: ' loads' }),
    progress('p1', 0, 360, 'Excavation', 0),
    progress('p2', 340, 360, 'Shuttering', 0),
    progress('p3', 680, 360, 'Concreting', 0),
    progress('p4', 1020, 360, 'Curing', 0),
    status('w', 0, 500, 'Weather', 'on-track', 'Clear'),
    status('sf', 280, 500, 'Safety', 'on-track', 'No incidents'),
    status('dl', 560, 500, 'Delays', 'on-track'),
    note('iss', 0, 640, 'Issues & decisions needed:\n• \n• \n\nTomorrow\'s plan:\n• \n• '),
  ],
  []
);

const snagHandover = make(
  { id: 'official-snag-handover', name: 'Snag & Handover Checklist', industry: 'construction', description: 'Walk-through checklist, snag closure decision and client sign-off.' },
  [
    heading('h', 0, 0, '{{project}}: snag list & handover'),
    projectLine('meta', 0, 60),
    note('chk', 0, 140, 'Walk-through checklist:\n• Civil and finishing defects\n• Electrical points and switches\n• Plumbing and leaks\n• Doors, windows, locks\n• Paint touch-ups\n• Cleaning'),
    step('walk', 380, 150, 'Joint walk-through'),
    step('snag', 640, 150, 'Log snags', 'warning'),
    step('fix', 900, 150, 'Contractor fixes'),
    decision('ok', 640, 290, 'All snags closed?'),
    terminator('sign', 960, 320, 'Client sign-off'),
    status('s', 380, 290, 'Open snags', 'at-risk'),
    progress('p', 380, 450, 'Snags closed', 0),
    countdown('c', 380, 560, 'Handover date', 22),
  ],
  [edge('walk', 'snag'), edge('snag', 'fix'), edge('fix', 'ok', 'bottom'), edge('ok', 'sign', 'right', 'Yes'), edge('ok', 'snag', 'top', 'No')]
);

// ------------------------------------------------------------------- interiors

const fitOut = (() => {
  const row1 = ['des', 'appr', 'mat', 'civ'];
  const row2 = ['mep', 'joi', 'fin', 'snag'];
  return make(
    { id: 'official-interior-fit-out', name: 'Interior Fit-Out Plan', industry: 'interiors', description: 'Design approval to handover for a fit-out, in two rows of stages with a handover countdown.' },
    [
      heading('h', 0, 0, '{{project}}: interior fit-out'),
      projectLine('meta', 0, 60),
      step('des', 0, 150, 'Design & drawings', 'neutral'),
      step('appr', 260, 150, 'Client approval'),
      step('mat', 520, 150, 'Material selection'),
      step('civ', 780, 150, 'Civil & partitions'),
      step('mep', 780, 320, 'MEP & false ceiling'),
      step('joi', 520, 320, 'Joinery & furniture'),
      step('fin', 260, 320, 'Painting & finishing'),
      step('snag', 0, 320, 'Snagging', 'warning'),
      terminator('hand', 0, 470, 'Handover'),
      progress('p', 340, 470, 'Overall progress', 0),
      countdown('c', 700, 470, 'Handover', 75),
      status('s1', 340, 620, 'Design', 'in-progress'),
      status('s2', 620, 620, 'Materials', 'pending'),
      status('s3', 900, 620, 'Site works', 'pending'),
      note('n', 0, 600, 'Watch-outs:\n• Lead time on joinery\n• Electrical points frozen before ceiling\n• Client changes after sign-off'),
    ],
    [...chain(row1), edge('civ', 'mep', 'bottom'), ...chain(['mep', 'joi', 'fin', 'snag'], 'left'), edge('snag', 'hand', 'bottom')]
  );
})();

// --------------------------------------------------------------- manufacturing

const procurement = make(
  { id: 'official-procurement-cycle', name: 'Procurement Cycle (PR → PO → GRN)', industry: 'manufacturing', description: 'Purchase requisition through quotes, PO, goods receipt and payment, with the approval decision.' },
  [
    heading('h', 0, 0, 'Procurement cycle: {{project}}'),
    step('pr', 0, 100, 'Purchase requisition', 'neutral'),
    decision('ap', 260, 70, 'Approved?'),
    step('rfq', 560, 100, 'Send RFQ to suppliers'),
    step('cmp', 820, 100, 'Compare quotes'),
    step('po', 1080, 100, 'Issue purchase order'),
    step('grn', 1080, 260, 'Goods receipt (GRN)'),
    decision('qc', 820, 230, 'Quality OK?'),
    step('inv', 560, 260, 'Match invoice'),
    terminator('pay', 300, 260, 'Pay supplier'),
    step('rej', 820, 410, 'Return / raise NCR', 'danger'),
    status('s1', 0, 270, 'Open requisitions', 'in-progress'),
    kpi('k', 0, 420, 'Average cycle time', '0', { suffix: ' days' }),
  ],
  [
    edge('pr', 'ap'),
    edge('ap', 'rfq', 'right', 'Yes'),
    edge('rfq', 'cmp'),
    edge('cmp', 'po'),
    edge('po', 'grn', 'bottom'),
    edge('grn', 'qc', 'left'),
    edge('qc', 'inv', 'left', 'Yes'),
    edge('inv', 'pay', 'left'),
    edge('qc', 'rej', 'bottom', 'No'),
  ]
);

const productionLine = make(
  { id: 'official-production-line-setup', name: 'Production Line Setup', industry: 'manufacturing', description: 'Layout, machine installation, trial run and go-live with a quality gate and a target date.' },
  [
    heading('h', 0, 0, '{{project}}: production line setup'),
    projectLine('meta', 0, 60),
    step('lay', 0, 150, 'Layout & utilities', 'neutral'),
    step('mach', 260, 150, 'Install machines'),
    step('trial', 520, 150, 'Trial run'),
    decision('gate', 780, 120, 'Quality gate passed?'),
    terminator('live', 1080, 150, 'Go live'),
    step('fix', 780, 310, 'Adjust & re-run', 'warning'),
    progress('p', 0, 330, 'Setup progress', 0),
    countdown('c', 340, 330, 'Target go-live', 75),
    status('s1', 0, 470, 'Machines', 'in-progress'),
    status('s2', 280, 470, 'Operators trained', 'pending'),
    status('s3', 560, 470, 'Safety audit', 'pending'),
  ],
  [...chain(['lay', 'mach', 'trial', 'gate']), edge('gate', 'live', 'right', 'Yes'), edge('gate', 'fix', 'bottom', 'No'), edge('fix', 'trial', 'left')]
);

const qcInspection = make(
  { id: 'official-qc-inspection', name: 'QC Inspection Flow', industry: 'manufacturing', description: 'Incoming goods inspection with pass / fail routes, non-conformance and rework.' },
  [
    heading('h', 0, 0, 'Quality inspection: {{project}}'),
    step('in', 0, 100, 'Goods received', 'neutral'),
    step('insp', 260, 100, 'Inspect against spec'),
    decision('pass', 520, 70, 'Passed?'),
    terminator('store', 820, 100, 'Accept & store'),
    step('ncr', 520, 260, 'Raise NCR report', 'danger'),
    step('rework', 310, 260, 'Rework / return to supplier', 'warning'),
    kpi('k1', 0, 260, 'Pass rate', '0', { suffix: '%' }),
    kpi('k2', 0, 430, 'Open NCRs', '0'),
    note('n', 340, 430, 'Inspection notes:\n• Sample size\n• Measurements taken\n• Photos attached'),
  ],
  [edge('in', 'insp'), edge('insp', 'pass'), edge('pass', 'store', 'right', 'Yes'), edge('pass', 'ncr', 'bottom', 'No'), edge('ncr', 'rework', 'left'), edge('rework', 'insp', 'top')]
);

// ---------------------------------------------------------------------- retail

const storeLaunch = make(
  { id: 'official-store-launch', name: 'Retail Store Launch Plan', industry: 'retail', description: 'Site to opening day: stages, readiness checks, a launch countdown and first-month targets.' },
  [
    heading('h', 0, 0, '{{project}}: store launch'),
    projectLine('meta', 0, 60),
    step('site', 0, 150, 'Site & lease', 'neutral'),
    step('fit', 260, 150, 'Fit-out'),
    step('stock', 520, 150, 'Stock & vendors'),
    step('staff', 780, 150, 'Hiring & training'),
    step('soft', 1040, 150, 'Soft launch', 'warning'),
    terminator('open', 1300, 150, 'Grand opening'),
    countdown('c', 0, 290, 'Opening day', 90),
    progress('p', 340, 290, 'Launch readiness', 0),
    kpi('k1', 0, 440, 'Month-1 sales target', '0', { prefix: '₹' }),
    kpi('k2', 330, 440, 'Footfall target / day', '0'),
    kpi('k3', 660, 440, 'Inventory value', '0', { prefix: '₹' }),
    status('s1', 0, 660, 'Licences', 'pending'),
    status('s2', 280, 660, 'POS & billing', 'pending'),
    status('s3', 560, 660, 'Marketing', 'pending'),
  ],
  chain(['site', 'fit', 'stock', 'staff', 'soft', 'open'])
);

const salesReview = make(
  { id: 'official-monthly-sales-review', name: 'Monthly Sales Review', industry: 'retail', description: 'Revenue, orders, basket size and returns against target, with space for highlights and actions.' },
  [
    heading('h', 0, 0, 'Sales review: {{project}}'),
    kpi('k1', 0, 80, 'Revenue', '0', { prefix: '₹' }),
    kpi('k2', 330, 80, 'Orders', '0'),
    kpi('k3', 660, 80, 'Average bill', '0', { prefix: '₹' }),
    kpi('k4', 990, 80, 'Returns', '0', { suffix: '%' }),
    progress('p1', 0, 300, 'Revenue vs target', 0),
    progress('p2', 340, 300, 'Orders vs target', 0),
    progress('p3', 680, 300, 'New customers vs target', 0),
    note('hi', 0, 440, 'Highlights:\n• \n• \n• '),
    note('is', 340, 440, 'Issues:\n• \n• \n• '),
    note('ac', 680, 440, 'Actions for next month:\n• \n• \n• '),
  ],
  []
);

const BASE_TEMPLATES = [
  civilWorks,
  dailyProgress,
  snagHandover,
  fitOut,
  procurement,
  productionLine,
  qcInspection,
  storeLaunch,
  salesReview,
];

// Each template brings its task list and working elements (see officialTasks.js)
export const OFFICIAL_TEMPLATES = BASE_TEMPLATES.map((t) => withWorking({ ...t, tasks: OFFICIAL_TASKS[t.id] || [] }));

export const getOfficialTemplate = (id) => OFFICIAL_TEMPLATES.find((t) => t.id === id) || null;
