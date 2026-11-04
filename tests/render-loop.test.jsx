/**
 * Guard against runaway re-render loops: a mounted element must settle.
 */
import React, { Profiler } from 'react';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';

import TableRenderer from '../src/pages/WorkspacePage/components/forms/TableRenderer.jsx';
import ChartRenderer from '../src/pages/WorkspacePage/components/forms/ChartRenderer.jsx';
import FormTemplate from '../src/pages/WorkspacePage/components/forms/FormTemplate.jsx';

vi.mock('../src/pages/WorkspacePage/utils/nodePersistence', () => ({
  persistNodeDataPatch: vi.fn(() => Promise.resolve()),
}));

beforeAll(() => {
  // Like a browser, deliver an initial measurement as soon as an element is observed
  global.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      Promise.resolve().then(() => this.callback([{ contentRect: { width: 520, height: 300 } }]));
    }
    unobserve() {}
    disconnect() {}
  };
});
afterEach(cleanup);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mount, let React settle, then keep flushing pending work. A healthy element
 * makes a finite number of commits while it mounts and measures itself, then
 * stops. A render loop keeps committing on every flush, so the count keeps
 * growing. Returns the commit count after an initial settle and again after
 * much more flushing.
 */
const commitGrowth = async (ui) => {
  let commits = 0;
  render(
    <Profiler id="probe" onRender={() => { commits += 1; }}>
      {ui}
    </Profiler>
  );
  const flush = async (n) => {
    for (let i = 0; i < n; i += 1) {
      await act(async () => { await sleep(5); });
    }
  };
  await flush(25);
  const settled = commits;
  await flush(75);
  return { settled, later: commits };
};

const expectSettled = ({ settled, later }) => {
  expect(later).toBe(settled); // no further commits once settled
  expect(settled).toBeLessThan(40); // and a sane number to get there
};

const rows = [
  { id: 1, name: 'Ravi', email: 'r@x.in', role: 'Eng', status: 'Active' },
  { id: 2, name: 'Meena', email: 'm@x.in', role: 'Ops', status: 'Pending' },
];

const tableProps = (id) => ({
  data: { id },
  tableData: rows,
  sortColumn: null, sortDirection: 'asc', filterText: '', currentPage: 1, itemsPerPage: 2,
  editingCell: null, expandedRows: new Set(),
  handleSort: () => {}, addTableRow: () => {}, deleteTableRow: () => {}, updateTableCell: () => {},
  toggleRowExpansion: () => {}, setFilterText: () => {}, setItemsPerPage: () => {}, setCurrentPage: () => {}, setEditingCell: () => {},
});

describe('mounted elements settle (no render loops)', () => {
  vi.setConfig({ testTimeout: 15000 });
  it.each(['basic-table', 'sortable-table', 'filterable-table', 'paginated-table', 'editable-table', 'expandable-table'])(
    'TableRenderer %s',
    async (id) => {
      expectSettled(await commitGrowth(<TableRenderer {...tableProps(id)} />));
    }
  );

  it.each(['bar-chart', 'line-chart', 'area-chart', 'pie-chart', 'donut-chart', 'scatter-plot'])(
    'ChartRenderer %s',
    async (type) => {
      expectSettled(await commitGrowth(<ChartRenderer data={{}} chartType={type} />));
    }
  );

  it('FormTemplate', async () => {
    expectSettled(
      await commitGrowth(<ReactFlowProvider><FormTemplate nodeId="n" workspaceId="w" /></ReactFlowProvider>)
    );
  });
});
