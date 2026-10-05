/**
 * Workspace utils — pure-logic + mocked-dependency suite.
 *
 * Covers: tableUtils · operationManager · nodePersistence · flowchartTemplates ·
 * floorPlanExtract (layer classifier) · canvasExport (mocked html-to-image/jsPDF).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createTableHelpers, defaultTableData } from '../src/pages/WorkspacePage/utils/tableUtils.js';
import {
  nodeChangesToOps,
  edgeChangesToOps,
  createNodeAddOp,
  createEdgeAddOp,
  createNodeUpdateOp,
  createNodeMoveOp,
  createZoomChangeOp,
  createFullSyncOp,
  OperationBatcher,
} from '../src/pages/WorkspacePage/utils/operationManager.js';
import {
  getTimeLeft,
  formatTimeLeft,
  findSubtaskContainingNode,
} from '../src/pages/WorkspacePage/utils/nodePersistence.js';
import {
  flowchartTemplates,
  getFlowchartTemplate,
  getAllFlowchartTemplates,
} from '../src/pages/WorkspacePage/utils/flowchartTemplates.js';
import { classifyLayer } from '../src/pages/WorkspacePage/utils/floorPlanExtract.js';

/* ═══════════════ tableUtils ═══════════════ */
describe('tableUtils', () => {
  const makeHelpers = (overrides = {}) => {
    const state = {
      tableData: defaultTableData.map((r) => ({ ...r })),
      sortColumn: '',
      sortDirection: 'asc',
      filterText: '',
      itemsPerPage: 2,
      currentPage: 1,
      expandedRows: new Set(),
      setTableData: vi.fn(),
      setSortColumn: vi.fn(),
      setSortDirection: vi.fn(),
      setEditingCell: vi.fn(),
      setExpandedRows: vi.fn(),
      ...overrides,
    };
    const helpers = createTableHelpers(
      state.tableData,
      state.setTableData,
      state.sortColumn,
      state.setSortColumn,
      state.sortDirection,
      state.setSortDirection,
      state.filterText,
      state.itemsPerPage,
      state.currentPage,
      state.setEditingCell,
      state.expandedRows,
      state.setExpandedRows
    );
    return { helpers, state };
  };

  it('ships the default table with 3 rows', () => {
    expect(defaultTableData).toHaveLength(3);
    expect(defaultTableData[0]).toMatchObject({ id: 1, name: 'John Doe', role: 'Admin' });
  });

  it('filters rows case-insensitively across all values', () => {
    const { helpers } = makeHelpers({ filterText: 'JANE' });
    const rows = helpers.getSortedData();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Jane Smith');
  });

  it('sorts ascending and descending by column', () => {
    const asc = makeHelpers({ sortColumn: 'name', sortDirection: 'asc' }).helpers.getSortedData();
    expect(asc.map((r) => r.name)).toEqual(['Bob Johnson', 'Jane Smith', 'John Doe']);
    const desc = makeHelpers({ sortColumn: 'name', sortDirection: 'desc' }).helpers.getSortedData();
    expect(desc.map((r) => r.name)).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
  });

  it('handleSort toggles direction on the same column, resets to asc on a new one', () => {
    const same = makeHelpers({ sortColumn: 'name', sortDirection: 'asc' });
    same.helpers.handleSort('name');
    expect(same.state.setSortDirection).toHaveBeenCalledWith('desc');

    const next = makeHelpers({ sortColumn: 'name', sortDirection: 'desc' });
    next.helpers.handleSort('role');
    expect(next.state.setSortColumn).toHaveBeenCalledWith('role');
    expect(next.state.setSortDirection).toHaveBeenCalledWith('asc');
  });

  it('paginates (2 per page → page 2 has 1 row)', () => {
    const page1 = makeHelpers({ currentPage: 1 }).helpers.getPaginatedData();
    expect(page1).toHaveLength(2);
    const page2 = makeHelpers({ currentPage: 2 }).helpers.getPaginatedData();
    expect(page2).toHaveLength(1);
    expect(page2[0].id).toBe(3);
  });

  it('addTableRow appends a row with max(id)+1', () => {
    const { helpers, state } = makeHelpers();
    helpers.addTableRow();
    const updated = state.setTableData.mock.calls[0][0];
    expect(updated).toHaveLength(4);
    expect(updated[3]).toMatchObject({ id: 4, role: 'User', status: 'Active' });
  });

  it('deleteTableRow removes the matching row', () => {
    const { helpers, state } = makeHelpers();
    helpers.deleteTableRow(2);
    const updated = state.setTableData.mock.calls[0][0];
    expect(updated.map((r) => r.id)).toEqual([1, 3]);
  });

  it('updateTableCell patches the cell and clears the editing state', () => {
    const { helpers, state } = makeHelpers();
    helpers.updateTableCell(1, 'role', 'Manager');
    const updated = state.setTableData.mock.calls[0][0];
    expect(updated[0].role).toBe('Manager');
    expect(state.setEditingCell).toHaveBeenCalledWith(null);
  });

  it('toggleRowExpansion adds and removes ids from the expanded set', () => {
    const expanded = new Set([1]);
    const { helpers, state } = makeHelpers({ expandedRows: expanded });
    helpers.toggleRowExpansion(1); // collapse → empty
    expect([...state.setExpandedRows.mock.calls[0][0]]).toEqual([]);
    // The helper captured the original set ({1}); toggling 2 adds it → {1, 2}
    helpers.toggleRowExpansion(2);
    expect([...state.setExpandedRows.mock.calls[1][0]].sort()).toEqual([1, 2]);
  });
});

/* ═══════════════ operationManager ═══════════════ */
describe('operationManager', () => {
  it('nodeChangesToOps: single final position → NODE_MOVE', () => {
    const ops = nodeChangesToOps([{ type: 'position', id: 'n1', position: { x: 10, y: 20 }, dragging: false }], 't1', 'st1');
    expect(ops).toEqual([{ type: 'NODE_MOVE', nodeId: 'n1', position: { x: 10, y: 20 }, taskId: 't1', subtaskId: 'st1' }]);
  });

  it('nodeChangesToOps: multiple final positions → NODES_BATCH_UPDATE', () => {
    const ops = nodeChangesToOps([
      { type: 'position', id: 'n1', position: { x: 1, y: 1 }, dragging: false },
      { type: 'position', id: 'n2', position: { x: 2, y: 2 }, dragging: false },
    ], 't1', 'st1');
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('NODES_BATCH_UPDATE');
    expect(ops[0].changes).toHaveLength(2);
  });

  it('nodeChangesToOps: mid-drag positions are ephemeral', () => {
    const ops = nodeChangesToOps([{ type: 'position', id: 'n1', position: { x: 5, y: 5 }, dragging: true }], 't1', 'st1');
    expect(ops[0]).toMatchObject({ type: 'NODE_MOVE', ephemeral: true });
  });

  it('nodeChangesToOps: remove → NODE_DELETE; select is ignored', () => {
    const ops = nodeChangesToOps([{ type: 'select', id: 'n1' }, { type: 'remove', id: 'n2' }], 't1', 'st1');
    expect(ops).toEqual([{ type: 'NODE_DELETE', nodeId: 'n2', taskId: 't1', subtaskId: 'st1' }]);
  });

  it('nodeChangesToOps: dimension changes batch into NODES_BATCH_UPDATE', () => {
    const ops = nodeChangesToOps([{ type: 'dimensions', id: 'n1', dimensions: { width: 100, height: 50 } }], 't1', 'st1');
    expect(ops[0].type).toBe('NODES_BATCH_UPDATE');
    expect(ops[0].changes[0]).toMatchObject({ type: 'dimensions', id: 'n1' });
  });

  it('edgeChangesToOps: remove → EDGE_DELETE; select ignored', () => {
    const ops = edgeChangesToOps([{ type: 'select', id: 'e1' }, { type: 'remove', id: 'e2' }], 't1', 'st1');
    expect(ops).toEqual([{ type: 'EDGE_DELETE', edgeId: 'e2', taskId: 't1', subtaskId: 'st1' }]);
  });

  it('createNodeAddOp strips the transient isEditing flag', () => {
    const op = createNodeAddOp({ id: 'n1', data: { isEditing: true, name: 'Calc' } }, 't1', 'st1');
    expect(op.type).toBe('NODE_ADD');
    expect(op.node.data).toEqual({ name: 'Calc' });
  });

  it('op creators produce the expected envelopes', () => {
    expect(createEdgeAddOp({ id: 'e1' }, 't1', 'st1')).toEqual({ type: 'EDGE_ADD', edge: { id: 'e1' }, taskId: 't1', subtaskId: 'st1' });
    expect(createNodeUpdateOp('n1', { a: 1 }, 't1', 'st1')).toEqual({ type: 'NODE_UPDATE', nodeId: 'n1', patch: { a: 1 }, taskId: 't1', subtaskId: 'st1' });
    expect(createNodeMoveOp('n1', { x: 0, y: 0 }, 't1', 'st1').type).toBe('NODE_MOVE');
    expect(createZoomChangeOp(150, 't1', 'st1').zoomLevel).toBe(150);
    const sync = createFullSyncOp([{ id: 'n1' }], [{ id: 'e1' }], 100, 't1', 'st1');
    expect(sync).toMatchObject({ type: 'FULL_SYNC', zoomLevel: 100 });
  });

  it('OperationBatcher dedupes repeated NODE_MOVE ops for the same node (latest wins)', () => {
    const emitted = [];
    const batcher = new OperationBatcher((op) => emitted.push(op), 50);
    batcher.add(createNodeMoveOp('n1', { x: 1, y: 1 }, 't1', 'st1'));
    batcher.add(createNodeMoveOp('n1', { x: 9, y: 9 }, 't1', 'st1'));
    batcher.add(createNodeUpdateOp('n2', { v: 2 }, 't1', 'st1'));
    batcher.flush();
    expect(emitted).toHaveLength(2);
    expect(emitted.find((o) => o.type === 'NODE_MOVE').position).toEqual({ x: 9, y: 9 });
    expect(emitted.find((o) => o.type === 'NODE_UPDATE').nodeId).toBe('n2');
  });
});

/* ═══════════════ nodePersistence (pure parts) ═══════════════ */
describe('nodePersistence', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('getTimeLeft: no deadline → zeros, not expired', () => {
    expect(getTimeLeft(null)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });
  });

  it('getTimeLeft: past deadline → expired zeros', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    const r = getTimeLeft('2026-01-01T00:00:00Z');
    expect(r.isExpired).toBe(true);
    expect(r.days).toBe(0);
  });

  it('getTimeLeft: exact countdown split (2d 3h 30m 45s)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const r = getTimeLeft('2026-01-03T03:30:45Z');
    expect(r).toMatchObject({ days: 2, hours: 3, minutes: 30, seconds: 45, isExpired: false });
  });

  it('formatTimeLeft picks the right granularity', () => {
    expect(formatTimeLeft(null)).toBe('Expired');
    expect(formatTimeLeft({ isExpired: true })).toBe('Expired');
    expect(formatTimeLeft({ days: 2, hours: 3, minutes: 0, seconds: 0 })).toBe('2d 3h');
    expect(formatTimeLeft({ days: 0, hours: 5, minutes: 10, seconds: 0 })).toBe('5h 10m');
    expect(formatTimeLeft({ days: 0, hours: 0, minutes: 10, seconds: 5 })).toBe('10m 5s');
    expect(formatTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 45 })).toBe('45s');
  });

  it('findSubtaskContainingNode locates the task/subtask that owns a canvas node', () => {
    const workspace = {
      tasks: [
        { id: 'task-1', subtasks: [{ id: 'st-1', canvasData: { nodes: [{ id: 'n-1' }], edges: [], zoomLevel: 120 } }] },
        { id: 'task-2', subtasks: [{ id: 'st-2', canvasData: { nodes: [{ id: 'n-2' }], edges: [{ id: 'e-1' }] } }] },
      ],
    };
    const found = findSubtaskContainingNode(workspace, 'n-2');
    expect(found).toMatchObject({ taskId: 'task-2', subtaskId: 'st-2' });
    expect(found.canvasData.nodes).toHaveLength(1);
    expect(found.canvasData.edges).toHaveLength(1);
    expect(findSubtaskContainingNode(workspace, 'missing')).toBeFalsy();
    expect(findSubtaskContainingNode(null, 'n-1')).toBeFalsy();
  });
});

/* ═══════════════ flowchartTemplates ═══════════════ */
describe('flowchartTemplates', () => {
  it('exposes at least one template and lists them all with ids', () => {
    const ids = Object.keys(flowchartTemplates);
    expect(ids.length).toBeGreaterThan(0);
    const all = getAllFlowchartTemplates();
    expect(all).toHaveLength(ids.length);
    all.forEach((t) => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
    });
  });

  it('getFlowchartTemplate returns a template by id and null for unknown ids', () => {
    const [firstId] = Object.keys(flowchartTemplates);
    const template = getFlowchartTemplate(firstId);
    expect(template).toBeTruthy();
    expect(getFlowchartTemplate('does-not-exist')).toBeNull();
  });
});

/* ═══════════════ floorPlanExtract — layer classifier ═══════════════ */
describe('floorPlanExtract.classifyLayer', () => {
  it.each([
    ['A-WALL', 'wall'],
    ['STR-WALL', 'wall'],
    ['Masonry', 'wall'],
    ['A-DOOR', 'door'],
    ['DRSW-1', 'door'],
    ['A-GLAZ', 'window'],
    ['WINDOW', 'window'],
    ['FURNITURE', 'furniture'],
    ['MILLWORK', 'furniture'],
    ['A-ANNO-TEXT', 'label'],
    ['ROOM-NAMES', 'label'],
    ['DEFPOINTS', 'ignore'],
    ['GRID', 'ignore'],
    ['random-layer', 'generic'],
    ['', 'generic'],
  ])('classifies "%s" as %s', (layer, role) => {
    expect(classifyLayer(layer)).toBe(role);
  });
});

/* ═══════════════ canvasExport (mocked html-to-image + jsPDF) ═══════════════ */
vi.mock('html-to-image', () => ({ toPng: vi.fn() }));
vi.mock('jspdf', () => {
  const jsPDFInstances = [];
  function MockJsPDF(options) {
    this.options = options;
    this.addImage = vi.fn();
    this.save = vi.fn();
    jsPDFInstances.push(this);
  }
  return { default: MockJsPDF, jsPDFInstances };
});

describe('canvasExport (mocked deps)', () => {
  let clickSpy;
  let toPng;
  let jsPDFModule;

  beforeEach(async () => {
    ({ toPng } = await import('html-to-image'));
    jsPDFModule = await import('jspdf');
    jsPDFModule.jsPDFInstances.length = 0;
    toPng.mockResolvedValue('data:image/png;base64,AAAA');
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // jsdom's Image never fires onload for data URLs — provide a fake.
    class FakeImage {
      constructor() {
        this.width = 800;
        this.height = 600;
      }
      set src(value) {
        this._src = value;
        queueMicrotask(() => this.onload && this.onload());
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('exportCanvasAsPng captures the element and triggers a download', async () => {
    const { exportCanvasAsPng } = await import('../src/pages/WorkspacePage/utils/canvasExport.js');
    const target = document.createElement('div');
    await exportCanvasAsPng(target, 'my-canvas.png');
    expect(toPng).toHaveBeenCalledWith(target, expect.objectContaining({ pixelRatio: 2 }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportCanvasAsPdf builds a landscape PDF for wide captures and saves it', async () => {
    const { exportCanvasAsPdf } = await import('../src/pages/WorkspacePage/utils/canvasExport.js');
    const target = document.createElement('div');
    await exportCanvasAsPdf(target, 'my-canvas.pdf');
    const instance = jsPDFModule.jsPDFInstances[0];
    expect(instance).toBeTruthy();
    expect(instance.options.orientation).toBe('landscape');
    expect(instance.addImage).toHaveBeenCalledWith('data:image/png;base64,AAAA', 'PNG', 0, 0, 800, 600);
    expect(instance.save).toHaveBeenCalledWith('my-canvas.pdf');
  });
});
