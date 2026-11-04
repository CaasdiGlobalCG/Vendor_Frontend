/**
 * The task list each official template brings: phases (tasks), their steps
 * (subtasks) and, inside each step, the working elements a vendor fills in
 * (a checklist card, a table). Durations are in days from the project start.
 *
 * Kept apart from the overview diagrams in officialTemplates.js.
 */

export const taskCard = (id, x, y, title, items, description = '') => ({
  id,
  type: 'elementNode',
  position: { x, y },
  data: {
    id: 'task-card-basic',
    name: 'Task Card',
    type: 'task-card',
    preview: title,
    taskCardData: {
      title,
      description,
      status: 'todo',
      assignedTo: '',
      priority: 'medium',
      dueDate: '',
      checklists: items.map((text, i) => ({ id: `cl-${id}-${i}`, text, completed: false })),
      attachments: [],
      comments: [],
      dependencies: [],
      labels: [],
      links: [],
      activityLog: [],
    },
  },
});

export const table = (id, x, y, name, columns, rowCount = 3, seedRows = []) => {
  const blank = Array.from({ length: Math.max(rowCount - seedRows.length, 0) }, () => columns.map(() => ''));
  // Every row has an id: that is what lets a cell be edited
  const rows = [...seedRows, ...blank].map((r, n) => ({ id: n + 1, ...Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ''])) }));
  return {
    id,
    type: 'elementNode',
    position: { x, y },
    data: {
      id: 'editable-table',
      name,
      type: 'table',
      preview: `${rows.length} rows × ${columns.length} columns`,
      customTableData: { columns, data: rows },
    },
  };
};

/**
 * One step. `checks` makes a checklist card; `grid` adds an editable table beside it.
 */
const step = (name, description, { checks, grid } = {}) => {
  const nodes = [];
  let x = 0;
  if (checks) {
    nodes.push(taskCard('check', x, 0, name, checks, description));
    x = 420;
  }
  if (grid) nodes.push(table('grid', x, 0, grid.name, grid.columns, grid.rows ?? 3, grid.seed));
  return { name, description, nodes, edges: [] };
};

const phase = (name, offsetDays, durationDays, description, subtasks, priority = 'medium') => ({
  name,
  offsetDays,
  durationDays,
  description,
  priority,
  subtasks,
});

export const OFFICIAL_TASKS = {
  'official-civil-works': [
    phase('Mobilisation', 0, 7, 'Get permissions, drawings and the site ready to start.', [
      step('Permits & drawings', 'Everything that must be approved before work starts.', {
        checks: ['Approved drawings issued', 'Building permit / NOC in place', 'Site safety plan signed', 'Insurance cover confirmed'],
      }),
      step('Site setup', 'Set up the site so work can run smoothly.', {
        checks: ['Hoarding and gate', 'Store and labour camp', 'Temporary water and power', 'Material storage area marked'],
      }),
    ]),
    phase('Excavation & foundation', 7, 21, 'Excavate, lay PCC and cast footings.', [
      step('Excavation', 'Dig to the designed level and check the soil.', {
        checks: ['Setting out checked by engineer', 'Excavation to level', 'Soil strata verified', 'Dewatering arrangement ready'],
      }),
      step('PCC & footing', 'Lean concrete, reinforcement and footings.', {
        checks: ['PCC laid and cured', 'Footing steel checked before pour', 'Footing concrete poured', 'Cubes taken'],
        grid: { name: 'Foundation quantities', columns: ['Item', 'Unit', 'Qty', 'Rate', 'Amount'], seed: [['PCC', 'm³', '', '', ''], ['Footing concrete', 'm³', '', '', ''], ['Reinforcement', 'kg', '', '', '']] },
      }),
    ]),
    phase('RCC structure', 28, 45, 'Columns, beams and slabs, floor by floor.', [
      step('Columns & beams', 'Formwork, steel and concrete for columns and beams.', {
        checks: ['Formwork checked', 'Steel checked before every pour', 'Concrete poured and vibrated', 'Curing started'],
      }),
      step('Slabs', 'Slab shuttering, steel and casting.', {
        checks: ['Shuttering and props checked', 'Conduits and sleeves placed', 'Slab poured', 'Curing for 14 days'],
      }),
      step('Cube test log', 'Record every concrete cube test.', {
        grid: { name: 'Cube test log', columns: ['Date', 'Pour', 'Grade', '7-day', '28-day', 'Result'], rows: 5 },
      }),
    ], 'high'),
    phase('Masonry & plaster', 73, 25, 'Walls, openings and plaster.', [
      step('Brickwork', 'Walls, lintels and openings.', { checks: ['Layout marked', 'Lintels cast', 'Brickwork complete', 'Openings checked'] }),
      step('Plaster', 'Internal and external plaster.', { checks: ['Surfaces prepared', 'Internal plaster', 'External plaster', 'Curing'] }),
    ]),
    phase('Finishing', 98, 30, 'Floors, paint and fixtures.', [
      step('Flooring & tiling', 'Flooring and wall tiles.', { checks: ['Level checked', 'Tiles laid', 'Grouting', 'Protection laid over finished floors'] }),
      step('Painting', 'Putty, primer and paint.', { checks: ['Putty and primer', 'First coat', 'Final coat', 'Touch-ups'] }),
      step('Fixtures & fittings', 'Electrical, plumbing and door fittings.', { checks: ['Electrical fittings', 'Plumbing fixtures', 'Doors and windows hardware', 'Testing'] }),
    ]),
    phase('Handover', 128, 7, 'Final snag walk and handing over to the client.', [
      step('Snag list & handover', 'Close defects and hand over.', { checks: ['Joint walk-through', 'Snags listed and closed', 'Documents handed over', 'Client sign-off'] }),
    ], 'high'),
  ],

  'official-site-daily-progress': [
    phase('Daily reporting', 0, 1, 'The numbers and notes to capture every day.', [
      step('Daily site report', 'Fill this in before you leave site.', {
        checks: ['Attendance recorded', 'Work done entered', 'Material received logged', 'Photos taken', 'Issues and safety noted'],
        grid: { name: 'Labour attendance', columns: ['Trade', 'Workers', 'Hours', 'Remarks'], rows: 5 },
      }),
    ]),
    phase('Weekly look-ahead', 0, 7, 'Plan the coming week against the schedule.', [
      step('Look-ahead plan', 'What must happen next week, and what could block it.', {
        checks: ['Activities for next week listed', 'Material needed ordered', 'Labour confirmed', 'Blockers raised with the client'],
      }),
    ]),
  ],

  'official-snag-handover': [
    phase('Walk-through', 0, 3, 'Walk the site with the client and note everything.', [
      step('Joint walk-through', 'Go room by room.', {
        checks: ['Civil and finishing defects', 'Electrical points and switches', 'Plumbing and leaks', 'Doors, windows and locks', 'Paint touch-ups', 'Cleaning'],
      }),
    ]),
    phase('Snag closure', 3, 14, 'Fix every item and re-inspect.', [
      step('Snag log', 'One row per defect.', { grid: { name: 'Snag log', columns: ['#', 'Location', 'Defect', 'Owner', 'Due', 'Status'], rows: 6 } }),
      step('Re-inspection', 'Check the fixes.', { checks: ['All snags re-checked', 'Photos of fixed items', 'Client informed'] }),
    ], 'high'),
    phase('Handover', 17, 5, 'Give the client everything they need.', [
      step('Handover pack', 'Documents and keys.', { checks: ['As-built drawings', 'Warranty cards', 'O&M manuals', 'Keys and access cards', 'Client sign-off signed'] }),
    ]),
  ],

  'official-interior-fit-out': [
    phase('Design & drawings', 0, 10, 'Drawings and approvals before anything is bought.', [
      step('Layout & drawings', 'Plans, elevations and details.', { checks: ['Measured drawings', 'Furniture layout', 'Electrical and lighting plan', 'Ceiling plan'] }),
      step('Client approval', 'Get written sign-off.', { checks: ['Design presented', 'Changes noted', 'Signed approval received', 'Drawings frozen'] }),
    ]),
    phase('Materials', 10, 10, 'Choose and order materials early; lead times decide the schedule.', [
      step('Material selection', 'Every finish in one place.', {
        grid: { name: 'Material schedule', columns: ['Item', 'Brand / spec', 'Rate', 'Lead time', 'Status'], seed: [['Flooring', '', '', '', ''], ['Wall paint', '', '', '', ''], ['Laminates', '', '', '', ''], ['Lighting', '', '', '', '']] },
      }),
      step('Orders & lead times', 'Place orders and track them.', { checks: ['Orders placed', 'Advance paid', 'Delivery dates confirmed', 'Storage arranged'] }),
    ], 'high'),
    phase('Site works', 20, 25, 'Partitions, services and ceilings.', [
      step('Civil & partitions', 'Demolition, partitions and plaster.', { checks: ['Demolition and cleaning', 'Partitions built', 'Waterproofing tested', 'Plaster'] }),
      step('MEP & false ceiling', 'Electrical, plumbing and ceilings, in that order.', { checks: ['Electrical points frozen', 'Conduits and wiring', 'Plumbing lines tested', 'False ceiling'] }),
    ]),
    phase('Joinery & furniture', 35, 25, 'Made-to-measure units and installation.', [
      step('Joinery production', 'Drawings to factory to site.', { checks: ['Shop drawings approved', 'Site measurements confirmed', 'Production started', 'Delivered to site'] }),
      step('Installation', 'Fit the units.', { checks: ['Wardrobes and units', 'Kitchen', 'Loose furniture', 'Hardware adjusted'] }),
    ]),
    phase('Finishing & snagging', 60, 12, 'Paint, lights and a clean finish.', [
      step('Painting & finishing', 'Final coats, lights and accessories.', { checks: ['Paint', 'Light fixtures', 'Curtains and accessories', 'Deep cleaning'] }),
      step('Snagging', 'Find and fix defects.', { grid: { name: 'Snag log', columns: ['#', 'Room', 'Defect', 'Owner', 'Status'], rows: 6 } }),
    ]),
    phase('Handover', 72, 3, 'Hand over the finished space.', [
      step('Handover', 'Final walk and documents.', { checks: ['Final walk-through', 'Warranties and manuals', 'Keys', 'Sign-off'] }),
    ], 'high'),
  ],

  'official-procurement-cycle': [
    phase('Requisition & approval', 0, 3, 'Get the need approved before asking suppliers.', [
      step('Raise requisition', 'What is needed, how much and by when.', { checks: ['Item and specification', 'Quantity and required date', 'Budget code', 'Approver signed'] }),
    ]),
    phase('Quotes & PO', 3, 7, 'Compare suppliers and place the order.', [
      step('RFQ & comparison', 'Compare at least three suppliers.', { grid: { name: 'Quote comparison', columns: ['Supplier', 'Rate', 'Delivery', 'Terms', 'Score'], rows: 4 } }),
      step('Issue purchase order', 'Send a clear PO.', { checks: ['Supplier chosen with reason', 'PO issued', 'Supplier acknowledged', 'Delivery date confirmed'] }),
    ]),
    phase('Delivery & payment', 10, 14, 'Receive, check and pay.', [
      step('Goods receipt', 'Check what arrived against the PO.', { checks: ['Quantity matches', 'Quality inspected', 'GRN raised', 'Damages recorded'] }),
      step('Invoice & payment', 'Match and pay.', { checks: ['Invoice matches PO and GRN', 'Approved for payment', 'Payment made', 'Supplier notified'] }),
    ]),
  ],

  'official-production-line-setup': [
    phase('Layout & utilities', 0, 15, 'Plan the floor and bring services in.', [
      step('Layout approval', 'Where every machine and walkway goes.', { checks: ['Layout drawn', 'Safety distances checked', 'Layout approved'] }),
      step('Utilities', 'Power, air, water and drainage.', { checks: ['Power load confirmed', 'Compressed air', 'Water and drainage', 'Lighting and ventilation'] }),
    ]),
    phase('Install machines', 15, 25, 'Receive and commission each machine.', [
      step('Machine installation', 'Track each machine.', { grid: { name: 'Machine tracker', columns: ['Machine', 'Supplier', 'Delivery date', 'Installed', 'Notes'], rows: 5 } }),
      step('Commissioning', 'Make each machine safe and ready to run.', { checks: ['Levelled and anchored', 'Power and air connected', 'Dry run done', 'Safety guards fitted'] }),
    ]),
    phase('Trial & quality gate', 40, 20, 'Prove the line makes good product.', [
      step('Trial run', 'Run real batches.', { checks: ['Trial batch run', 'Output counted', 'Defects recorded', 'Adjustments made'] }),
      step('Quality gate', 'Sign-off before going live.', { checks: ['Quality targets met', 'Safety audit passed', 'Gate approved'] }),
    ], 'high'),
    phase('Go-live', 60, 15, 'Train people and start production.', [
      step('Operator training', 'Everyone who runs the line.', { checks: ['Training schedule', 'Operators trained', 'Work instructions posted'] }),
      step('Go-live checklist', 'The last checks.', { checks: ['Raw material in stock', 'Maintenance plan set', 'First production order released'] }),
    ]),
  ],

  'official-qc-inspection': [
    phase('Inspection routine', 0, 1, 'Run this for every incoming lot.', [
      step('Incoming inspection', 'Check the lot against the specification.', { checks: ['Quantity checked', 'Sample drawn', 'Measurements taken', 'Photos attached', 'Pass / fail decided'] }),
      step('NCR log', 'Every failed lot gets a row.', { grid: { name: 'NCR log', columns: ['NCR #', 'Item', 'Defect', 'Action', 'Status'], rows: 5 } }),
    ]),
  ],

  'official-store-launch': [
    phase('Site & lease', 0, 20, 'Secure the location and licences.', [
      step('Lease & licences', 'Paperwork before spending on fit-out.', { checks: ['Lease signed', 'Trade licence', 'Fire and safety NOC', 'GST registration for the outlet'] }),
    ]),
    phase('Fit-out', 20, 35, 'Build the store.', [
      step('Store fit-out', 'Shelving, counters and lighting.', { checks: ['Layout approved', 'Shelving and counters', 'Lighting and signage', 'POS and CCTV wiring'] }),
    ]),
    phase('Stock & vendors', 30, 30, 'Suppliers and opening stock.', [
      step('Vendor onboarding', 'Who supplies what.', { grid: { name: 'Vendors', columns: ['Vendor', 'Category', 'Terms', 'Status'], rows: 5 } }),
      step('Opening stock', 'Get shelves full.', { checks: ['Opening order placed', 'Stock received and tagged', 'Prices loaded in POS', 'Shelves stocked'] }),
    ]),
    phase('Hiring & training', 40, 30, 'Staff ready before opening.', [
      step('Hiring', 'Fill the roster.', { checks: ['Roles defined', 'Interviews', 'Offers accepted', 'Roster made'] }),
      step('Training', 'Product, billing and service.', { checks: ['Product knowledge', 'POS and billing', 'Customer handling', 'Opening-day roles'] }),
    ]),
    phase('Launch', 80, 10, 'Soft launch, fix, then open properly.', [
      step('Soft launch', 'Open quietly and learn.', { checks: ['Invite friends and family', 'Note issues', 'Fix billing and layout problems'] }),
      step('Grand opening', 'The day itself.', { checks: ['Marketing live', 'Offers loaded', 'Staff briefed', 'Daily sales tracked'] }),
    ], 'high'),
  ],

  'official-monthly-sales-review': [
    phase('Prepare', 0, 3, 'Collect the numbers before the meeting.', [
      step('Collect the numbers', 'Same sources every month.', { checks: ['Revenue and orders', 'Average bill and returns', 'Stock and best sellers', 'Targets for the month'] }),
    ]),
    phase('Review meeting', 3, 1, 'Decide what to do next month.', [
      step('Agenda & actions', 'Leave with owners and dates.', {
        checks: ['What went well', 'What did not', 'Decisions made'],
        grid: { name: 'Action log', columns: ['Action', 'Owner', 'Due', 'Status'], rows: 5 },
      }),
    ]),
  ],
};
