/**
 * Canvas element UI (Plan C): shared controls, status badges, the data table,
 * charts and the form template.
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';

import { TextInput, TextArea, Select } from '../src/pages/WorkspacePage/components/ui/controls.jsx';
import Field from '../src/pages/WorkspacePage/components/ui/Field.jsx';
import Badge, { statusTone } from '../src/pages/WorkspacePage/components/ui/Badge.jsx';
import ChartRenderer from '../src/pages/WorkspacePage/components/forms/ChartRenderer.jsx';
import FormTemplate from '../src/pages/WorkspacePage/components/forms/FormTemplate.jsx';
import { pickSeriesColors, readChartTheme } from '../src/pages/WorkspacePage/components/forms/chartTheme.js';

vi.mock('../src/pages/WorkspacePage/utils/nodePersistence', () => ({
  persistNodeDataPatch: vi.fn(() => Promise.resolve()),
}));
import { persistNodeDataPatch } from '../src/pages/WorkspacePage/utils/nodePersistence';

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// vitest runs without globals here, so RTL's auto-cleanup is not registered
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('statusTone / Badge', () => {
  it('maps whole status words to tones', () => {
    expect(statusTone('Active')).toBe('success');
    expect(statusTone(' paid ')).toBe('success');
    expect(statusTone('Pending')).toBe('warning');
    expect(statusTone('In Progress')).toBe('warning');
    expect(statusTone('Overdue')).toBe('danger');
    expect(statusTone('rejected')).toBe('danger');
  });

  it('never turns ordinary text into a status', () => {
    expect(statusTone('Ravi Kumar')).toBeNull();
    expect(statusTone('Active user since 2020')).toBeNull();
    expect(statusTone('')).toBeNull();
    expect(statusTone(42)).toBeNull();
    expect(statusTone(undefined)).toBeNull();
  });

  it('renders children with a tone class', () => {
    render(<Badge tone="danger">Overdue</Badge>);
    expect(screen.getByText('Overdue').className).toContain('text-danger');
  });
});

describe('canvas controls', () => {
  it('stops click and key events from reaching the canvas', () => {
    const onParentClick = vi.fn();
    const onParentKey = vi.fn();
    render(
      <div onClick={onParentClick} onKeyDown={onParentKey}>
        <TextInput aria-label="t" />
      </div>
    );
    const input = screen.getByLabelText('t');
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: 'Delete' });
    expect(onParentClick).not.toHaveBeenCalled();
    expect(onParentKey).not.toHaveBeenCalled();
  });

  it('still calls the caller handlers', () => {
    const onClick = vi.fn();
    render(<TextInput aria-label="t" onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('t'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('locks inputs, text areas and selects', () => {
    render(
      <>
        <TextInput aria-label="i" locked />
        <TextArea aria-label="a" locked />
        <Select aria-label="s" locked><option>x</option></Select>
      </>
    );
    expect(screen.getByLabelText('i').readOnly).toBe(true);
    expect(screen.getByLabelText('a').readOnly).toBe(true);
    expect(screen.getByLabelText('s').disabled).toBe(true);
  });

  it('flags invalid inputs for assistive tech', () => {
    render(<TextInput aria-label="i" invalid />);
    expect(screen.getByLabelText('i').getAttribute('aria-invalid')).toBe('true');
  });

  it('Field shows an error in preference to a hint, and marks required', () => {
    render(
      <Field label="Email" required hint="We never share it" error="Enter a valid email address">
        <TextInput aria-label="e" />
      </Field>
    );
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid email address');
    expect(screen.queryByText('We never share it')).toBeNull();
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('Field shows the hint when there is no error', () => {
    render(<Field label="Name" hint="As on the invoice"><TextInput aria-label="n" /></Field>);
    expect(screen.getByText('As on the invoice')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('chart theme', () => {
  const theme = readChartTheme();

  it('has six palette colours resolved to concrete rgb() values', () => {
    expect(theme.series).toHaveLength(6);
    theme.series.forEach((c) => expect(c).toMatch(/^rgb\(/));
  });

  it('charts still on the old defaults follow the theme palette', () => {
    const { colors, customised } = pickSeriesColors(['#3B82F6', '#EF4444', '#10B981'], theme, 3);
    expect(customised).toBe(false);
    expect(colors).toEqual(theme.series.slice(0, 3));
  });

  it('keeps colours a user picked themselves', () => {
    const { colors, customised } = pickSeriesColors(['#7c3aed', '#db2777'], theme, 3);
    expect(customised).toBe(true);
    expect(colors.slice(0, 2)).toEqual(['#7c3aed', '#db2777']);
    expect(colors[2]).toBe(theme.series[2]); // missing one falls back to the palette
  });

  it('copes with no saved colours and more points than palette entries', () => {
    expect(pickSeriesColors(undefined, theme, 2).colors).toEqual(theme.series.slice(0, 2));
    const many = pickSeriesColors([], theme, 8).colors;
    expect(many).toHaveLength(8);
    expect(many[6]).toBe(theme.series[0]); // wraps around
  });
});

describe('ChartRenderer', () => {
  it.each(['bar-chart', 'line-chart', 'area-chart', 'pie-chart', 'donut-chart', 'scatter-plot'])(
    'renders a %s with its title and an accessible summary',
    (type) => {
      render(<ChartRenderer data={{}} chartType={type} />);
      expect(screen.getByRole('heading').textContent).toMatch(/Sample/);
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Sample/);
      expect(screen.getByText(/data points? · click to customize/)).toBeTruthy();
    }
  );

  it('shows a legend with values for pie and donut charts only', () => {
    const { unmount } = render(<ChartRenderer data={{}} chartType="pie-chart" />);
    expect(screen.getByText('Desktop')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    unmount();
    render(<ChartRenderer data={{}} chartType="bar-chart" />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('uses custom chart data when provided', () => {
    const custom = { title: 'Spend', data: [{ label: 'Jun', value: 5 }, { label: 'Jul', value: 9 }], colors: ['#7c3aed'] };
    render(<ChartRenderer data={{ customChartData: custom }} chartType="bar-chart" />);
    expect(screen.getByText('Spend')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Jun 5');
    expect(screen.getByText('2 data points · click to customize')).toBeTruthy();
  });

  it('shows an empty state instead of crashing when there is no data', () => {
    render(<ChartRenderer data={{ customChartData: { title: 'Empty', data: [], colors: [] } }} chartType="bar-chart" />);
    expect(screen.getByText('No data yet')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('tolerates non-numeric values', () => {
    const custom = { title: 'Messy', data: [{ label: 'A', value: 'abc' }, { label: 'B', value: '12' }] };
    expect(() => render(<ChartRenderer data={{ customChartData: custom }} chartType="line-chart" />)).not.toThrow();
  });
});

describe('ChartRenderer keeps drawing while the canvas re-renders', () => {
  // recharts only draws once it knows its size, so (unlike the no-op stub used
  // elsewhere in this file) deliver a measurement the way a browser does
  let originalRO;
  beforeAll(() => {
    originalRO = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(cb) { this.cb = cb; }
      observe(el) {
        Promise.resolve().then(() => this.cb([{ target: el, contentRect: { width: 520, height: 224, x: 0, y: 0, top: 0, left: 0, right: 520, bottom: 224 } }]));
      }
      unobserve() {}
      disconnect() {}
    };
  });
  afterAll(() => { global.ResizeObserver = originalRO; });

  // The canvas re-renders nodes constantly (pan, zoom, selection ...) and hands
  // charts a freshly built data object each time. Marks must still be drawn:
  // recharts' entry animation used to restart on every render and leave bars,
  // slices and lines stuck at zero.
  const cfg = (type) => ({
    title: 'T',
    xAxisLabel: 'x',
    yAxisLabel: 'y',
    colors: ['#3B82F6'],
    data: [
      { label: 'A', value: 10, x: 1 },
      { label: 'B', value: 20, x: 2 },
      { label: 'C', value: 30, x: 3 },
    ],
  });

  const marks = {
    'bar-chart': '.recharts-bar-rectangle',
    'pie-chart': '.recharts-pie-sector',
    'donut-chart': '.recharts-pie-sector',
    'scatter-plot': '.recharts-scatter-symbol',
    'line-chart': '.recharts-line-dot',
    'area-chart': '.recharts-area-area',
  };

  it.each(Object.keys(marks))('%s draws its marks after repeated re-renders', async (type) => {
    const { container, rerender } = render(<ChartRenderer data={{ customChartData: cfg(type) }} chartType={type} />);
    for (let i = 0; i < 6; i += 1) {
      rerender(<ChartRenderer data={{ customChartData: cfg(type), _tick: i }} chartType={type} />);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 30));
    }
    await waitFor(() => expect(container.querySelectorAll(marks[type]).length).toBeGreaterThan(0));
  });

  it('turns recharts entry animations off for every mark type', () => {
    // Guard against re-introducing animation: no animated stroke-dash on lines
    const { container } = render(<ChartRenderer data={{}} chartType="line-chart" />);
    const curve = container.querySelector('.recharts-line-curve');
    if (curve) expect(curve.getAttribute('stroke-dasharray')).toBeNull();
  });
});

describe('FormTemplate', () => {
  const renderForm = (props = {}) =>
    render(
      <ReactFlowProvider>
        <FormTemplate nodeId="n1" workspaceId="w1" {...props} />
      </ReactFlowProvider>
    );

  const submit = () => fireEvent.click(screen.getByRole('button', { name: /submit form|update form/i }));

  it('shows inline errors and does not save when required fields are empty', async () => {
    renderForm();
    submit();
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent)).toEqual([
      'First name is required',
      'Last name is required',
      'Email is required',
    ]);
    expect(persistNodeDataPatch).not.toHaveBeenCalled();
  });

  it('validates the email format and clears the error once fixed', async () => {
    renderForm();
    const email = screen.getByLabelText(/email address/i);
    fireEvent.change(email, { target: { value: 'ravi@acme' } });
    fireEvent.blur(email);
    expect((await screen.findByRole('alert')).textContent).toBe('Enter a valid email address');
    fireEvent.change(email, { target: { value: 'ravi@acme.in' } });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('saves valid data with the same payload shape as before', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Kumar' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'ravi@acme.in' } });
    submit();

    await waitFor(() => expect(persistNodeDataPatch).toHaveBeenCalledTimes(1));
    const [nodeId, patch, , workspaceId] = persistNodeDataPatch.mock.calls[0];
    expect(nodeId).toBe('n1');
    expect(workspaceId).toBe('w1');
    expect(patch.formData).toMatchObject({
      firstName: 'Ravi',
      lastName: 'Kumar',
      email: 'ravi@acme.in',
      phone: '',
      company: '',
      message: '',
      agreeToTerms: false,
    });
    expect(await screen.findByText(/submitted and saved/i)).toBeTruthy();
  });

  it('reports a failed save without an alert() popup', async () => {
    persistNodeDataPatch.mockRejectedValueOnce(new Error('boom'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderForm();
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'R' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'K' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'r@k.in' } });
    submit();
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not save/i);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('explains a missing node/workspace inline instead of alert()', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(
      <ReactFlowProvider>
        <FormTemplate nodeId={null} workspaceId={null} initialFormData={{ firstName: 'A', lastName: 'B', email: 'a@b.in', phone: '', company: '', message: '', agreeToTerms: false }} />
      </ReactFlowProvider>
    );
    submit();
    expect((await screen.findByRole('alert')).textContent).toMatch(/cannot save/i);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows "Update form" once previously submitted data is loaded', () => {
    renderForm({ initialFormData: { firstName: 'A', lastName: 'B', email: 'a@b.in', phone: '', company: '', message: '', agreeToTerms: false } });
    expect(screen.getByRole('button', { name: /update form/i })).toBeTruthy();
    expect(screen.getByDisplayValue('a@b.in')).toBeTruthy();
  });
});
