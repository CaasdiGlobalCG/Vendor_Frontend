/**
 * Second-wave site calculators — maths + interaction.
 *
 * Maths: pure functions in calculator-kit/extraCalcMath.js (hand-checked values).
 * Interaction: open each calculator, fill the form like a user, press Calculate,
 * verify the result panel. ElementNode dispatch is checked from source so a
 * rename cannot silently route a new calculator to the default Blocks calculator.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';

import {
  tilingLabour, falseCeiling, plumbingPipe, defaultPipeRate, convertUnit, convertAll,
  labourProductivity, gstMargin,
} from '../src/pages/WorkspacePage/components/forms/calculator-kit/extraCalcMath.js';
import TilingLabourCalculator from '../src/pages/WorkspacePage/components/forms/TilingLabourCalculator.jsx';
import FalseCeilingCalculator from '../src/pages/WorkspacePage/components/forms/FalseCeilingCalculator.jsx';
import PlumbingPipeCalculator from '../src/pages/WorkspacePage/components/forms/PlumbingPipeCalculator.jsx';
import UnitConverterCalculator from '../src/pages/WorkspacePage/components/forms/UnitConverterCalculator.jsx';
import LabourProductivityCalculator from '../src/pages/WorkspacePage/components/forms/LabourProductivityCalculator.jsx';
import GstMarginCalculator from '../src/pages/WorkspacePage/components/forms/GstMarginCalculator.jsx';

afterEach(() => cleanup());

const props = (id, name) => ({
  data: { type: 'cost-calculator', id, name },
  nodeId: 'n1',
  workspaceId: 'w1',
  setNodes: () => {},
});

const byPlaceholder = (text) => screen.getByPlaceholderText(text);
const open = (label = /configure & calculate/i) => fireEvent.click(screen.getByRole('button', { name: label }));
const calculate = () => fireEvent.click(screen.getByRole('button', { name: /^calculate$/i }));

describe('maths', () => {
  it('tiling labour: 120 m² at 8 m²/mason/day, 2 masons + 1 helper each', () => {
    const r = tilingLabour({
      area: 120, outputPerMason: 8, masons: 2, helpersPerMason: 1, masonWage: 900, helperWage: 600,
    });
    expect(r.days).toBe(7.5);
    expect(r.masonDays).toBe(15);
    expect(r.helperDays).toBe(15);
    expect(r.totalCost).toBe(22500);
    expect(r.costPerM2).toBe(187.5);
  });

  it('tiling labour adds skirting cost', () => {
    const r = tilingLabour({
      area: 16, outputPerMason: 8, masons: 1, helpersPerMason: 0, masonWage: 1000, helperWage: 0,
      skirtingLength: 20, skirtingRate: 40,
    });
    expect(r.wageCost).toBe(2000);
    expect(r.skirtingCost).toBe(800);
    expect(r.totalCost).toBe(2800);
  });

  it('false ceiling gypsum: 60 m², 8% wastage', () => {
    const r = falseCeiling({ area: 60, type: 'gypsum', wastagePercent: 8, ratePerM2: 950 });
    expect(r.sheets).toBe(23); // 60 / 2.88 × 1.08 = 22.5
    expect(r.screws).toBe(1620); // float noise must not push this to 1621
    expect(r.channelMetres).toBe(142.56);
    expect(r.totalCost).toBe(57000);
  });

  it('false ceiling: cove perimeter is priced separately', () => {
    const r = falseCeiling({ area: 10, type: 'pvc', wastagePercent: 0, perimeter: 12, coveRate: 250, ratePerM2: 600 });
    expect(r.coveCost).toBe(3000);
    expect(r.totalCost).toBe(9000);
  });

  it('plumbing: 45 m of 20 mm CPVC', () => {
    const r = plumbingPipe({
      runLength: 45, diameter: 20, material: 'cpvc', wastagePercent: 5,
      metresPerFitting: 1.5, fittingRate: 45, ratePerM: defaultPipeRate(20, 'cpvc'),
    });
    expect(defaultPipeRate(20, 'cpvc')).toBe(85);
    expect(r.metres).toBe(47.25);
    expect(r.pieces).toBe(16);
    expect(r.fittings).toBe(30);
    expect(r.totalCost).toBe(5430);
  });

  it('unit converter: area, volume, length and weight', () => {
    expect(convertUnit('area', 1200, 'sqft', 'sqm')).toBeCloseTo(111.4836, 4);
    expect(convertUnit('area', 1, 'acre', 'sqft')).toBeCloseTo(43560, 0);
    expect(convertUnit('volume', 1, 'cum', 'cft')).toBeCloseTo(35.3147, 4);
    expect(convertUnit('length', 10, 'ft', 'm')).toBeCloseTo(3.048, 6);
    expect(convertUnit('weight', 2, 'tonne', 'quintal')).toBeCloseTo(20, 6);
    expect(convertUnit('area', 1, 'sqft', 'cum')).toBeNull();
    expect(convertAll('area', 1, 'sqm').length).toBe(7);
  });

  it('labour productivity: 300 m² plaster, 4 workers + 2 helpers', () => {
    const r = labourProductivity({
      quantity: 300, outputPerWorker: 10, workers: 4, helpers: 2, workerWage: 850, helperWage: 600,
    });
    expect(r.days).toBe(7.5);
    expect(r.workerDays).toBe(30);
    expect(r.helperDays).toBe(15);
    expect(r.cost).toBe(34500);
    expect(r.costPerUnit).toBe(115);
  });

  it('GST: markup, margin and reverse', () => {
    const markup = gstMargin({ mode: 'markup', amount: 100000, percent: 15, gstRate: 18, interState: false });
    expect(markup.taxable).toBe(115000);
    expect(markup.cgst).toBe(10350);
    expect(markup.sgst).toBe(10350);
    expect(markup.total).toBe(135700);

    const margin = gstMargin({ mode: 'margin', amount: 100000, percent: 20, gstRate: 18, interState: true });
    expect(margin.taxable).toBe(125000);
    expect(margin.profit).toBe(25000);
    expect(margin.marginPercent).toBe(20);
    expect(margin.igst).toBe(22500);
    expect(margin.total).toBe(147500);

    const reverse = gstMargin({ mode: 'reverse', amount: 118000, gstRate: 18, interState: false });
    expect(reverse.taxable).toBe(100000);
    expect(reverse.gst).toBe(18000);
    expect(reverse.total).toBe(118000);
  });

  it('GST: a margin of 100% or more is rejected', () => {
    expect(gstMargin({ mode: 'margin', amount: 100, percent: 100, gstRate: 18, interState: false })).toBeNull();
  });
});

describe('interaction', () => {
  it('Tiling Labour: fills the form and shows days and cost', () => {
    render(<TilingLabourCalculator {...props('calc-tiling-labour', 'Tiling Labour Calculator')} />);
    open();
    fireEvent.change(byPlaceholder('e.g. 120'), { target: { value: '120' } });
    calculate();
    expect(screen.getByText(/tiling labour estimate/i)).toBeTruthy();
    expect(screen.getByText('7.5 days')).toBeTruthy();
    expect(screen.getAllByText('₹22,500').length).toBeGreaterThan(0);
  });

  it('Tiling Labour: rejects an empty area', () => {
    render(<TilingLabourCalculator {...props('calc-tiling-labour', 'Tiling Labour Calculator')} />);
    open();
    calculate();
    expect(screen.getByText(/tiling area must be a positive number/i)).toBeTruthy();
    expect(screen.queryByText(/tiling labour estimate/i)).toBeNull();
  });

  it('False Ceiling: gypsum 60 m²', () => {
    render(<FalseCeilingCalculator {...props('calc-false-ceiling', 'False Ceiling Calculator')} />);
    open();
    fireEvent.change(byPlaceholder('e.g. 60'), { target: { value: '60' } });
    calculate();
    expect(screen.getByText(/false ceiling estimate/i)).toBeTruthy();
    expect(screen.getAllByText('₹57,000').length).toBeGreaterThan(0);
  });

  it('Plumbing Pipe: 45 m of 20 mm CPVC', () => {
    render(<PlumbingPipeCalculator {...props('calc-plumbing-pipe', 'Plumbing Pipe Calculator')} />);
    open();
    fireEvent.change(byPlaceholder('e.g. 45'), { target: { value: '45' } });
    calculate();
    expect(screen.getByText(/plumbing pipe estimate/i)).toBeTruthy();
    expect(screen.getAllByText('₹5,430').length).toBeGreaterThan(0);
  });

  it('Unit Converter: 1200 sq ft → sq m', () => {
    render(<UnitConverterCalculator {...props('calc-unit-converter', 'Unit Converter')} />);
    open(/^convert$/i);
    fireEvent.change(byPlaceholder('e.g. 1200'), { target: { value: '1200' } });
    calculate();
    expect(screen.getByText(/unit conversion/i)).toBeTruthy();
    expect(screen.getByText(/111\.4836 sq m/)).toBeTruthy();
  });

  it('Labour Productivity: plastering 300 m²', () => {
    render(<LabourProductivityCalculator {...props('calc-labour-productivity', 'Labour Productivity Calculator')} />);
    open();
    fireEvent.change(byPlaceholder('e.g. 300'), { target: { value: '300' } });
    calculate();
    expect(screen.getByText(/plastering — labour estimate/i)).toBeTruthy();
    expect(screen.getAllByText('₹34,500').length).toBeGreaterThan(0);
  });

  it('GST & Margin: 15% markup on ₹1,00,000 at 18% GST', () => {
    render(<GstMarginCalculator {...props('calc-gst-margin', 'GST & Margin Calculator')} />);
    open();
    fireEvent.change(byPlaceholder('e.g. 100000'), { target: { value: '100000' } });
    calculate();
    expect(screen.getByText('₹1,35,700')).toBeTruthy();
    expect(screen.getAllByText('₹10,350').length).toBe(2); // CGST and SGST
  });

  it('GST & Margin: margin of 100% shows an error, not a result', () => {
    render(<GstMarginCalculator {...props('calc-gst-margin', 'GST & Margin Calculator')} />);
    open();
    fireEvent.change(byPlaceholder('e.g. 100000'), { target: { value: '1000' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'margin' } });
    const pct = [...document.body.querySelectorAll('input[type="number"]')].find((el) => el.value === '15');
    fireEvent.change(pct, { target: { value: '100' } });
    calculate();
    expect(screen.getByText(/margin must be below 100%/i)).toBeTruthy();
  });
});

describe('wiring', () => {
  const SRC = path.resolve(__dirname, '../src/pages/WorkspacePage/components');
  const node = fs.readFileSync(path.join(SRC, 'nodes/ElementNode.jsx'), 'utf8');
  const panel = fs.readFileSync(path.join(SRC, 'WorkspaceContextPanel.jsx'), 'utf8');

  it.each([
    ['calc-tiling-labour', 'TilingLabourCalculator'],
    ['calc-false-ceiling', 'FalseCeilingCalculator'],
    ['calc-plumbing-pipe', 'PlumbingPipeCalculator'],
    ['calc-unit-converter', 'UnitConverterCalculator'],
    ['calc-labour-productivity', 'LabourProductivityCalculator'],
    ['calc-gst-margin', 'GstMarginCalculator'],
  ])('%s is listed in the panel and dispatched to %s', (id, component) => {
    expect(panel).toContain(`id: '${id}'`);
    expect(node).toContain(`<${component} data={data}`);
  });

  it('new calculators are dispatched before the material calculators', () => {
    const firstNew = node.indexOf('<TilingLabourCalculator data');
    const firstOld = node.indexOf('<VinylFlooringCalculator data');
    expect(firstNew).toBeGreaterThan(0);
    expect(firstNew).toBeLessThan(firstOld);
  });
});
