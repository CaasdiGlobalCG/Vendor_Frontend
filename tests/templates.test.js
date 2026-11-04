import { describe, it, expect } from 'vitest';
import {
  INDUSTRIES,
  applyVariables,
  variablesUsed,
  templateBounds,
  templateSummary,
  instantiateTemplate,
  planTemplateTasks,
  hasTemplateTasks,
  taskPlanSummary,
} from '../src/pages/WorkspacePage/templates/templateEngine.js';
import { OFFICIAL_TEMPLATES, getOfficialTemplate } from '../src/pages/WorkspacePage/templates/officialTemplates.js';
import { getNodeSize, hasCollision } from '../src/pages/WorkspacePage/utils/canvasPlacement.js';
import { isConnectableNode } from '../src/pages/WorkspacePage/utils/connectionUtils.js';

const HANDLE = /^(top|right|bottom|left)-(in|out)$/;

describe('official templates', () => {
  it('cover construction, interiors, manufacturing and retail', () => {
    const industries = new Set(OFFICIAL_TEMPLATES.map((t) => t.industry));
    for (const id of ['construction', 'interiors', 'manufacturing', 'retail']) expect(industries.has(id), id).toBe(true);
    OFFICIAL_TEMPLATES.forEach((t) => expect(INDUSTRIES.some((i) => i.id === t.industry), t.id).toBe(true));
  });

  it('have unique ids and the fields a card needs', () => {
    expect(new Set(OFFICIAL_TEMPLATES.map((t) => t.id)).size).toBe(OFFICIAL_TEMPLATES.length);
    OFFICIAL_TEMPLATES.forEach((t) => {
      expect(t.name.length, t.id).toBeGreaterThan(3);
      expect(t.description.length, t.id).toBeGreaterThan(10);
      expect(t.official).toBe(true);
      expect(getOfficialTemplate(t.id)).toBe(t);
    });
  });

  describe.each(OFFICIAL_TEMPLATES.map((t) => [t.name, t]))('%s', (_, t) => {
    it('is well formed: unique node ids, finite positions, edges that join real nodes through real handles', () => {
      const ids = t.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      t.nodes.forEach((n) => {
        expect(Number.isFinite(n.position.x) && Number.isFinite(n.position.y), n.id).toBe(true);
        expect(['blockNode', 'textNode', 'elementNode']).toContain(n.type);
      });
      t.edges.forEach((e) => {
        expect(ids, `${e.source}→${e.target}`).toContain(e.source);
        expect(ids).toContain(e.target);
        expect(e.sourceHandle).toMatch(HANDLE);
        expect(e.targetHandle).toMatch(HANDLE);
      });
    });

    it('only connects elements that can be connected', () => {
      const byId = Object.fromEntries(t.nodes.map((n) => [n.id, n]));
      t.edges.forEach((e) => {
        expect(isConnectableNode(byId[e.source]), e.source).toBe(true);
        expect(isConnectableNode(byId[e.target]), e.target).toBe(true);
      });
    });

    it('lays elements out without overlap', () => {
      t.nodes.forEach((n) => {
        const others = t.nodes.filter((o) => o.id !== n.id);
        expect(hasCollision(n.position, getNodeSize(n), others), `${n.id} overlaps another element`).toBe(false);
      });
    });

    it('contains no personal data or workspace ids', () => {
      const json = JSON.stringify(t);
      expect(json).not.toMatch(/workspaceId|@|\+91|password|token/i);
    });
  });
});

describe('applyVariables', () => {
  const values = { project: 'Sharma residence', client: 'Mr. Sharma', site: '', start_date: '2026-03-01' };
  it('fills placeholders, case-insensitively and with spaces', () => {
    expect(applyVariables('{{project}} for {{ CLIENT }}', values)).toBe('Sharma residence for Mr. Sharma');
  });
  it('formats the start date for reading', () => {
    expect(applyVariables('Start: {{start_date}}', values)).toBe('Start: 1 Mar 2026');
  });
  it('an unanswered or unknown placeholder leaves no stray spaces', () => {
    expect(applyVariables('Site: {{site}} done', values)).toBe('Site: done');
    expect(applyVariables('{{nope}}', values)).toBe('');
  });
  it('walks nested data and leaves other values alone', () => {
    expect(applyVariables({ a: ['{{client}}', 3, true, null], b: { c: 'x' } }, values)).toEqual({ a: ['Mr. Sharma', 3, true, null], b: { c: 'x' } });
  });
  it('drops the labels of answers left blank instead of leaving "Client: · Site:"', () => {
    const line = 'Client: {{client}} · Site: {{site}} · Start: {{start_date}}';
    expect(applyVariables(line, { start_date: '2026-10-16' })).toBe('Start: 16 Oct 2026');
    expect(applyVariables(line, { client: 'Mr. Sharma', site: 'Pune' })).toBe('Client: Mr. Sharma · Site: Pune');
    expect(applyVariables(line, {})).toBe('');
    expect(applyVariables(line, { client: 'A', site: 'B', start_date: '2026-10-16' })).toBe('Client: A · Site: B · Start: 16 Oct 2026');
  });
  it('strings without placeholders are returned untouched, spaces included', () => {
    expect(applyVariables('two  spaces', values)).toBe('two  spaces');
  });
});

describe('variablesUsed / templateSummary', () => {
  it('lists only the questions a template actually uses', () => {
    const t = { nodes: [{ data: { text: '{{project}} at {{site}}' } }], edges: [] };
    expect(variablesUsed(t).map((v) => v.key)).toEqual(['project', 'site']);
    expect(variablesUsed({ nodes: [{ data: { text: 'plain' } }] })).toEqual([]);
  });
  it('counts elements and connections', () => {
    const s = templateSummary(OFFICIAL_TEMPLATES[0]);
    expect(s.elements).toBe(OFFICIAL_TEMPLATES[0].nodes.length);
    expect(s.connections).toBe(OFFICIAL_TEMPLATES[0].edges.length);
  });
});

describe('instantiateTemplate', () => {
  const template = {
    name: 'Mini plan',
    nodes: [
      { id: 'a', type: 'blockNode', position: { x: 100, y: 50 }, data: { kind: 'heading', text: '{{project}}', width: 300, height: 40 } },
      { id: 'b', type: 'blockNode', position: { x: 400, y: 250 }, data: { kind: 'status', label: 'Site: {{site}}', status: 'pending', width: 200, height: 80 } },
      { id: 'c', type: 'blockNode', position: { x: 100, y: 350 }, data: { kind: 'countdown', label: 'Due', targetOffsetDays: 10 } },
      { id: 't', type: 'textNode', position: { x: 0, y: 500 }, data: { content: 'note' } },
    ],
    edges: [
      { source: 'b', target: 'c', sourceHandle: 'bottom-out', targetHandle: 'top-in' },
      { source: 'b', target: 'ghost' },
    ],
  };
  const ctx = (extra = {}) => ({
    values: { project: 'Villa', site: 'Pune', start_date: '2026-03-01' },
    placeGroup: () => ({ x: 1000, y: 2000 }),
    startSequence: 5,
    workspace: { workspaceId: 'W9', taskId: 'T1', subtaskId: 'S1', taskName: 'Task', subtaskName: 'Sub', collaborators: [{ id: 'u1' }] },
    author: { name: 'Asha', email: 'a@x.com', role: 'vendor' },
    suffix: 'z1',
    now: new Date('2026-02-01T10:00:00Z'),
    ...extra,
  });

  it('places the whole template at the chosen spot, keeping its shape', () => {
    const { nodes } = instantiateTemplate(template, ctx());
    // template top-left is (0, 50): the text note at x=0 pins the left edge, the heading the top
    const byOld = (old) => nodes.find((n) => n.id === `${old}_z1`);
    expect(byOld('a').position).toEqual({ x: 1100, y: 2000 });
    expect(byOld('b').position).toEqual({ x: 1400, y: 2200 });
    expect(byOld('b').position.x - byOld('a').position.x).toBe(300); // distances preserved
  });

  it('asks where to put it using the template\'s real size', () => {
    let asked;
    instantiateTemplate(template, ctx({ placeGroup: (size) => { asked = size; return { x: 0, y: 0 }; } }));
    expect(asked.w).toBeGreaterThan(500);
    expect(asked.h).toBeGreaterThan(400);
  });

  it('gives every node and edge a fresh id and rewires edges; drops edges to missing nodes', () => {
    const first = instantiateTemplate(template, ctx({ suffix: 'one' }));
    const second = instantiateTemplate(template, ctx({ suffix: 'two' }));
    expect(first.nodes.map((n) => n.id)).not.toEqual(second.nodes.map((n) => n.id));
    expect(first.edges).toHaveLength(1);
    expect(first.edges[0].source).toBe('b_one');
    expect(first.edges[0].target).toBe('c_one');
    expect(first.edges[0].sourceHandle).toBe('bottom-out');
    expect(first.edges[0].type).toBe('custom'); // the canvas's standard look
  });

  it('fills the answers in and ties the nodes to this workspace', () => {
    const { nodes } = instantiateTemplate(template, ctx());
    expect(nodes[0].data.text).toBe('Villa');
    expect(nodes[1].data.label).toBe('Site: Pune');
    expect(nodes[0].data.workspaceId).toBe('W9');
    expect(nodes[0].data.subtaskId).toBe('S1');
    expect(nodes[0].data.addedBy).toBe('Asha');
    expect(nodes[0].data.approvalStatus).toBe('pending');
    expect(nodes[0].data.comments).toEqual([]);
    expect(nodes.every((n) => n.selected === false)).toBe(true);
  });

  it('with no project name the heading just reads without it', () => {
    const t = { nodes: [{ id: 'h', type: 'blockNode', position: { x: 0, y: 0 }, data: { kind: 'heading', text: '{{project}}: civil works plan' } }], edges: [] };
    expect(instantiateTemplate(t, ctx({ values: {} })).nodes[0].data.text).toBe('Civil works plan');
    expect(instantiateTemplate(t, ctx({ values: { project: 'Sharma Villa' } })).nodes[0].data.text).toBe('Sharma Villa: civil works plan');
  });

  it('numbers elements from where the canvas left off; text and decoration are not numbered', () => {
    const { nodes, nextSequence } = instantiateTemplate(template, ctx());
    const seq = (id) => nodes.find((n) => n.id === `${id}_z1`).data.sequenceNumber;
    expect(seq('a')).toBeUndefined(); // heading is decoration
    expect(seq('b')).toBe(5);
    expect(seq('c')).toBe(6);
    expect(seq('t')).toBeUndefined();
    expect(nextSequence).toBe(7);
  });

  it('turns "N days after the start" into a real countdown date', () => {
    const { nodes } = instantiateTemplate(template, ctx());
    const c = nodes.find((n) => n.id === 'c_z1');
    expect('targetOffsetDays' in c.data).toBe(false);
    const due = new Date(c.data.target);
    expect([due.getFullYear(), due.getMonth(), due.getDate(), due.getHours()]).toEqual([2026, 2, 11, 18]);
  });

  it('counts from today when no start date was given', () => {
    const { nodes } = instantiateTemplate(template, ctx({ values: {} }));
    const due = new Date(nodes.find((n) => n.id === 'c_z1').data.target);
    expect(due.getTime()).toBeGreaterThan(Date.now());
  });

  it('keeps children relative to their frame and re-points the parent', () => {
    const framed = {
      nodes: [
        { id: 'f', type: 'layoutNode', position: { x: 0, y: 0 }, width: 400, height: 300, data: { type: 'frame', name: 'Area' } },
        { id: 'k', type: 'blockNode', position: { x: 20, y: 30 }, parentNode: 'f', data: { kind: 'status', label: 'x', status: 'pending' } },
      ],
      edges: [],
    };
    const { nodes } = instantiateTemplate(framed, ctx());
    const child = nodes.find((n) => n.id === 'k_z1');
    expect(child.parentNode).toBe('f_z1');
    expect(child.position).toEqual({ x: 20, y: 30 }); // unchanged: relative to the frame
    expect(nodes.find((n) => n.id === 'f_z1').position).toEqual({ x: 1000, y: 2000 });
  });

  it('does not change the template it was given', () => {
    const copy = JSON.stringify(template);
    instantiateTemplate(template, ctx());
    expect(JSON.stringify(template)).toBe(copy);
  });

  it('copes with an empty template', () => {
    expect(instantiateTemplate({ nodes: [], edges: [] }, ctx())).toMatchObject({ nodes: [], edges: [] });
    expect(templateBounds([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it('a vendor-saved edge keeps its saved look', () => {
    const saved = { nodes: [template.nodes[1], template.nodes[2]], edges: [{ id: 'old', source: 'b', target: 'c', type: 'custom', markerEnd: { type: 'arrowclosed' }, data: { label: '{{project}}' } }] };
    const { edges } = instantiateTemplate(saved, ctx());
    expect(edges[0].markerEnd).toEqual({ type: 'arrowclosed' });
    expect(edges[0].data.label).toBe('Villa');
    expect(edges[0].id).not.toBe('old');
  });
});

describe('real elements on the main canvas', () => {
  it('every official template has a working checklist card and an editable table, not just a diagram', () => {
    OFFICIAL_TEMPLATES.forEach((t) => {
      const cards = t.nodes.filter((n) => n.data?.type === 'task-card');
      const tables = t.nodes.filter((n) => n.data?.type === 'table');
      expect(cards.length, `${t.id} card`).toBeGreaterThan(0);
      expect(tables.length, `${t.id} table`).toBeGreaterThan(0);
      cards.forEach((c) => expect(c.data.taskCardData.checklists.length).toBeGreaterThan(2));
      tables.forEach((n) => {
        expect(n.data.id).toBe('editable-table');
        expect(n.data.customTableData.columns.length).toBeGreaterThan(2);
      });
    });
  });

  it('they sit below the diagram, in a row, without touching it', () => {
    OFFICIAL_TEMPLATES.forEach((t) => {
      const working = t.nodes.filter((n) => n.id.startsWith('work-'));
      const rest = t.nodes.filter((n) => !n.id.startsWith('work-'));
      const diagramBottom = Math.max(...rest.map((n) => n.position.y + getNodeSize(n).h));
      working.forEach((w) => expect(w.position.y, t.id).toBeGreaterThan(diagramBottom));
    });
  });

  it('plain-text notes are replaced by real checklists where a checklist is what they were', () => {
    const ids = (id) => getOfficialTemplate(id).nodes.map((n) => n.id);
    expect(ids('official-civil-works')).not.toContain('chk');
    expect(ids('official-interior-fit-out')).not.toContain('n');
    expect(ids('official-qc-inspection')).not.toContain('n');
  });

  it('progress and status blocks that follow the tasks point at phases that really exist', () => {
    OFFICIAL_TEMPLATES.forEach((t) => {
      const phases = t.tasks.map((x) => x.name);
      t.nodes.filter((n) => n.data?.link).forEach((n) => {
        expect(['workspace', 'task'], `${t.id}/${n.id}`).toContain(n.data.link.scope);
        if (n.data.link.scope === 'task') expect(phases, `${t.id}/${n.id}`).toContain(n.data.link.taskName);
        expect(['status', 'progress']).toContain(n.data.kind);
      });
    });
    const civil = getOfficialTemplate('official-civil-works').nodes.filter((n) => n.data?.link);
    expect(civil.map((n) => n.id).sort()).toEqual(['p', 's1', 's2', 's3']);
  });

  it('linked phases hold checklists, so there is something to measure', () => {
    OFFICIAL_TEMPLATES.forEach((t) => {
      t.nodes.filter((n) => n.data?.link?.scope === 'task').forEach((n) => {
        const phase = t.tasks.find((x) => x.name === n.data.link.taskName);
        const cards = phase.subtasks.flatMap((s) => s.nodes).filter((x) => x.data.type === 'task-card');
        expect(cards.length, `${t.id}/${n.data.link.taskName}`).toBeGreaterThan(0);
      });
    });
  });
});

describe('answer-only lines', () => {
  const t = {
    nodes: [
      { id: 'line', type: 'textNode', position: { x: 0, y: 0 }, data: { content: 'Client: {{client}} · Site: {{site}}', hideIfEmpty: true } },
      { id: 'x', type: 'blockNode', position: { x: 0, y: 100 }, data: { kind: 'status', label: 'a', status: 'pending' } },
    ],
    edges: [{ source: 'line', target: 'x' }],
  };
  const run = (values) => instantiateTemplate(t, { values, placeGroup: () => ({ x: 0, y: 0 }), suffix: 's' });

  it('is left out, with its connections, when nothing was answered', () => {
    const r = run({});
    expect(r.nodes.map((n) => n.id)).toEqual(['x_s']);
    expect(r.edges).toEqual([]);
  });
  it('is kept, filled in, when something was', () => {
    const r = run({ site: 'Pune' });
    expect(r.nodes).toHaveLength(2);
    expect(r.nodes[0].data.content).toBe('Site: Pune');
    expect('hideIfEmpty' in r.nodes[0].data).toBe(false);
  });
});

describe('official template tasks', () => {
  it('every official template brings a task list', () => {
    OFFICIAL_TEMPLATES.forEach((t) => expect(hasTemplateTasks(t), t.id).toBe(true));
  });

  describe.each(OFFICIAL_TEMPLATES.map((t) => [t.name, t]))('%s', (_, t) => {
    it('has phases with steps, sensible days and a working element in every step', () => {
      t.tasks.forEach((task) => {
        expect(task.name.length).toBeGreaterThan(2);
        expect(task.subtasks.length, task.name).toBeGreaterThan(0);
        expect(task.durationDays, task.name).toBeGreaterThan(0);
        expect(task.offsetDays, task.name).toBeGreaterThanOrEqual(0);
        task.subtasks.forEach((s) => {
          expect(s.nodes.length, `${task.name} / ${s.name}`).toBeGreaterThan(0);
          const ids = s.nodes.map((n) => n.id);
          expect(new Set(ids).size).toBe(ids.length);
          s.nodes.forEach((n) => expect(['check', 'grid']).toContain(n.id));
        });
      });
    });

    it('phases run in order, and the last one ends when the overview says', () => {
      const starts = t.tasks.map((x) => x.offsetDays);
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    });

    it('working elements sit side by side without overlapping', () => {
      t.tasks.forEach((task) =>
        task.subtasks.forEach((s) =>
          s.nodes.forEach((n) => {
            const others = s.nodes.filter((o) => o.id !== n.id);
            expect(hasCollision(n.position, getNodeSize(n), others), `${task.name} / ${s.name} / ${n.id}`).toBe(false);
          })
        )
      );
    });

    it('checklist cards and tables have the data their elements read', () => {
      t.tasks.forEach((task) =>
        task.subtasks.forEach((s) =>
          s.nodes.forEach((n) => {
            if (n.data.type === 'task-card') {
              const card = n.data.taskCardData;
              expect(card.title).toBeTruthy();
              expect(card.checklists.length).toBeGreaterThan(0);
              card.checklists.forEach((c) => expect(c.completed).toBe(false));
            } else {
              const { columns, data } = n.data.customTableData;
              expect(n.data.id).toBe('editable-table');
              expect(columns.length).toBeGreaterThan(1);
              data.forEach((row, i) => {
                expect(Object.keys(row)).toEqual(['id', ...columns]); // the id is what lets a cell be edited
                expect(row.id).toBe(i + 1);
              });
            }
          })
        )
      );
    });
  });

  it('the overview countdown matches the end of the last phase', () => {
    const endOf = (t) => Math.max(...t.tasks.map((x) => x.offsetDays + x.durationDays));
    const countdown = (t) => t.nodes.find((n) => n.data?.kind === 'countdown')?.data.targetOffsetDays;
    expect(countdown(getOfficialTemplate('official-civil-works'))).toBe(endOf(getOfficialTemplate('official-civil-works')));
    expect(countdown(getOfficialTemplate('official-interior-fit-out'))).toBe(endOf(getOfficialTemplate('official-interior-fit-out')));
    expect(countdown(getOfficialTemplate('official-production-line-setup'))).toBe(endOf(getOfficialTemplate('official-production-line-setup')));
    expect(countdown(getOfficialTemplate('official-store-launch'))).toBe(endOf(getOfficialTemplate('official-store-launch')));
    expect(countdown(getOfficialTemplate('official-snag-handover'))).toBe(endOf(getOfficialTemplate('official-snag-handover')));
  });
});

describe('planTemplateTasks', () => {
  const civil = getOfficialTemplate('official-civil-works');
  const plan = (extra = {}) =>
    planTemplateTasks(civil, {
      values: { project: 'Sharma Villa', client: 'Mr. Sharma', start_date: '2026-03-01' },
      workspace: { workspaceId: 'W9' },
      author: { name: 'Asha', email: 'a@x.com' },
      suffix: 'abc',
      now: new Date('2026-02-01T10:00:00Z'),
      ...extra,
    });

  it('makes one task per phase, with due dates counted from the start date', () => {
    const tasks = plan();
    expect(tasks.map((t) => t.name)).toEqual(civil.tasks.map((t) => t.name));
    expect(tasks[0].dueDate).toBe('2026-03-08'); // start + 0 + 7
    expect(tasks[1].dueDate).toBe('2026-03-29'); // start + 7 + 21
    expect(tasks.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate))).toBe(true);
    expect(tasks[2].priority).toBe('high');
  });

  it('every task and subtask has an id the server will accept, and none repeat', () => {
    const tasks = plan();
    const ids = tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    tasks.forEach((t) => {
      expect(t.id).toMatch(/^task_[A-Za-z0-9_-]{6,80}$/);
      t.subtasks.forEach((s) => expect(s.id).toMatch(/^subtask_[A-Za-z0-9_-]{6,80}$/));
    });
    expect(plan({ suffix: 'other' })[0].id).not.toBe(tasks[0].id);
  });

  it('each subtask carries its own canvas, tied to that task and subtask', () => {
    const tasks = plan();
    const sub = tasks[0].subtasks[0];
    expect(sub.canvasData.zoomLevel).toBe(100);
    expect(sub.canvasData.nodes.length).toBeGreaterThan(0);
    sub.canvasData.nodes.forEach((n) => {
      expect(n.data.workspaceId).toBe('W9');
      expect(n.data.taskId).toBe(tasks[0].id);
      expect(n.data.subtaskId).toBe(sub.id);
      expect(n.data.subtaskName).toBe(sub.name);
      expect(n.data.addedBy).toBe('Asha');
    });
  });

  it('canvas node ids are unique across the whole plan', () => {
    const all = plan().flatMap((t) => t.subtasks.flatMap((s) => s.canvasData.nodes.map((n) => n.id)));
    expect(new Set(all).size).toBe(all.length);
  });

  it('the checklist card keeps its items, unticked', () => {
    const card = plan()[0].subtasks[0].canvasData.nodes.find((n) => n.data.type === 'task-card');
    expect(card.data.taskCardData.checklists.map((c) => c.text)).toContain('Approved drawings issued');
    expect(card.data.taskCardData.checklists.every((c) => c.completed === false)).toBe(true);
    expect(card.data.sequenceNumber).toBe(1);
  });

  it('does not change the template, and summarises it for the checkbox', () => {
    const before = JSON.stringify(civil);
    plan();
    expect(JSON.stringify(civil)).toBe(before);
    const s = taskPlanSummary(civil);
    expect(s.tasks).toBe(6);
    expect(s.subtasks).toBeGreaterThan(8);
    expect(s.days).toBe(135);
  });

  it('a template with no tasks plans nothing', () => {
    expect(planTemplateTasks({ nodes: [] }, {})).toEqual([]);
    expect(hasTemplateTasks({ tasks: [] })).toBe(false);
  });
});
