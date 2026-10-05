/**
 * Calculator elements — component suite.
 *
 * Layer 1: every calculator component is importable (catches broken imports).
 * Layer 2: every calculator renders standalone (catches render-time crashes).
 * Layer 3: deep interaction test for the pattern-setting calculator
 *          (BricksCalculator) — walks the real UI exactly like a manual tester.
 *
 * These components live in src/pages/WorkspacePage/components/forms/ and are
 * used both as canvas nodes (via ElementNode dispatch) and from
 * CostCalculatorsModal.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';

import BricksCalculator from '../src/pages/WorkspacePage/components/forms/BricksCalculator.jsx';
import ConcreteBlocksCalculator from '../src/pages/WorkspacePage/components/forms/ConcreteBlocksCalculator.jsx';
import ConcreteCalculator from '../src/pages/WorkspacePage/components/forms/ConcreteCalculator.jsx';
import CostCalculatorSummary from '../src/pages/WorkspacePage/components/forms/CostCalculatorSummary.jsx';
import FlooringCalculator from '../src/pages/WorkspacePage/components/forms/FlooringCalculator.jsx';
import FreightCostCalculator from '../src/pages/WorkspacePage/components/forms/FreightCostCalculator.jsx';
import SoilExcavationCalculator from '../src/pages/WorkspacePage/components/forms/SoilExcavationCalculator.jsx';
import SteelEstimationCalculator from '../src/pages/WorkspacePage/components/forms/SteelEstimationCalculator.jsx';
import VinylFlooringCalculator from '../src/pages/WorkspacePage/components/forms/VinylFlooringCalculator.jsx';
import ElectricalWiringEstimator from '../src/pages/WorkspacePage/components/forms/ElectricalWiringEstimator.jsx';
import PaintingEstimator from '../src/pages/WorkspacePage/components/forms/PaintingEstimator.jsx';
import PlasterCalculator from '../src/pages/WorkspacePage/components/forms/PlasterCalculator.jsx';
import PCCCalculator from '../src/pages/WorkspacePage/components/forms/PCCCalculator.jsx';
import PuttyCalculator from '../src/pages/WorkspacePage/components/forms/PuttyCalculator.jsx';
import SandAggregateCalculator from '../src/pages/WorkspacePage/components/forms/SandAggregateCalculator.jsx';
import ConcreteColumnCalculator from '../src/pages/WorkspacePage/components/forms/ConcreteColumnCalculator.jsx';
import ConcreteFootingCalculator from '../src/pages/WorkspacePage/components/forms/ConcreteFootingCalculator.jsx';
import ConcreteStairsCalculator from '../src/pages/WorkspacePage/components/forms/ConcreteStairsCalculator.jsx';
import RCCFormworkCalculator from '../src/pages/WorkspacePage/components/forms/RCCFormworkCalculator.jsx';
import RebarBBSCalculator from '../src/pages/WorkspacePage/components/forms/RebarBBSCalculator.jsx';
import AACBlocksCalculator from '../src/pages/WorkspacePage/components/forms/AACBlocksCalculator.jsx';
import TilesCalculator from '../src/pages/WorkspacePage/components/forms/TilesCalculator.jsx';
import WaterproofingCalculator from '../src/pages/WorkspacePage/components/forms/WaterproofingCalculator.jsx';
import RoofingCalculator from '../src/pages/WorkspacePage/components/forms/RoofingCalculator.jsx';
import DrywallCalculator from '../src/pages/WorkspacePage/components/forms/DrywallCalculator.jsx';
import RetainingWallCalculator from '../src/pages/WorkspacePage/components/forms/RetainingWallCalculator.jsx';
import DeckingCalculator from '../src/pages/WorkspacePage/components/forms/DeckingCalculator.jsx';
import FramingCalculator from '../src/pages/WorkspacePage/components/forms/FramingCalculator.jsx';
import LumberCalculator from '../src/pages/WorkspacePage/components/forms/LumberCalculator.jsx';
import RoofTrussCalculator from '../src/pages/WorkspacePage/components/forms/RoofTrussCalculator.jsx';

const nodeProps = (id, name) => ({
  data: { type: 'cost-calculator', id, name },
  nodeId: 'test-node',
  workspaceId: 'test-workspace',
  setNodes: () => {},
});

// RTL auto-cleanup is not active without vitest globals — unmount manually so
// each test starts from a clean document (otherwise portals/state leak).
afterEach(() => {
  cleanup();
});

const components = [
  ['BricksCalculator', BricksCalculator, 'bricks-calculator', 'Bricks Calculator'],
  ['ConcreteBlocksCalculator', ConcreteBlocksCalculator, 'concrete-blocks-calculator', 'Concrete Blocks Calculator'],
  ['ConcreteCalculator', ConcreteCalculator, 'concrete-calculator', 'Concrete Calculator'],
  ['FlooringCalculator', FlooringCalculator, 'flooring-calculator', 'Flooring Calculator'],
  ['SoilExcavationCalculator', SoilExcavationCalculator, 'soil-excavation-calculator', 'Soil Excavation Calculator'],
  ['SteelEstimationCalculator', SteelEstimationCalculator, 'steel-cost-calculator', 'Steel Calculator'],
  ['VinylFlooringCalculator', VinylFlooringCalculator, 'vinyl-calculator', 'Vinyl Calculator'],
  ['ElectricalWiringEstimator', ElectricalWiringEstimator, 'calc-electrical', 'Electrical Wiring Estimator'],
  ['PaintingEstimator', PaintingEstimator, 'calc-paint', 'Painting Estimator'],
  ['FreightCostCalculator', FreightCostCalculator, 'calc-freight', 'Freight Cost Calculator'],
  ['CostCalculatorSummary', CostCalculatorSummary, 'cost-calculator-summary', 'Cost Calculation Summary'],
  // Batch A — material basics (calculator-kit pattern)
  ['PlasterCalculator', PlasterCalculator, 'calc-plaster', 'Plaster Calculator'],
  ['PCCCalculator', PCCCalculator, 'calc-pcc', 'PCC Calculator'],
  ['PuttyCalculator', PuttyCalculator, 'calc-putty', 'Putty & Primer Calculator'],
  ['SandAggregateCalculator', SandAggregateCalculator, 'calc-sand-aggregate', 'Sand & Aggregate Calculator'],
  // Batch B — concrete family
  ['ConcreteColumnCalculator', ConcreteColumnCalculator, 'calc-column', 'Concrete Column Calculator'],
  ['ConcreteFootingCalculator', ConcreteFootingCalculator, 'calc-footing', 'Concrete Footing Calculator'],
  ['ConcreteStairsCalculator', ConcreteStairsCalculator, 'calc-stairs', 'Concrete Stairs Calculator'],
  ['RCCFormworkCalculator', RCCFormworkCalculator, 'calc-formwork', 'RCC Formwork Calculator'],
  // Batch C — steel & masonry
  ['RebarBBSCalculator', RebarBBSCalculator, 'calc-rebar', 'Rebar / BBS Calculator'],
  ['AACBlocksCalculator', AACBlocksCalculator, 'calc-aac', 'AAC Blocks Calculator'],
  ['TilesCalculator', TilesCalculator, 'calc-tiles', 'Tiles Calculator'],
  // Batch D — site & envelope
  ['WaterproofingCalculator', WaterproofingCalculator, 'calc-waterproofing', 'Waterproofing Calculator'],
  ['RoofingCalculator', RoofingCalculator, 'calc-roofing', 'Roofing Calculator'],
  ['DrywallCalculator', DrywallCalculator, 'calc-drywall', 'Drywall / Partition Calculator'],
  ['RetainingWallCalculator', RetainingWallCalculator, 'calc-retaining-wall', 'Retaining Wall Calculator'],
  // Wave 2 · Batch E — timber & framing
  ['DeckingCalculator', DeckingCalculator, 'calc-decking', 'Decking Calculator'],
  ['FramingCalculator', FramingCalculator, 'calc-framing', 'Framing Calculator'],
  ['LumberCalculator', LumberCalculator, 'calc-lumber', 'Lumber Calculator'],
  ['RoofTrussCalculator', RoofTrussCalculator, 'calc-truss', 'Roof Truss Calculator'],
];

describe('calculator components load', () => {
  it.each(components)('%s is importable and is a component function', (_name, Component) => {
    expect(typeof Component).toBe('function');
  });
});

describe('calculator components render standalone', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it.each(components)('%s renders without crashing', (_name, Component, id, name) => {
    cleanup();
    const { container } = render(<Component {...nodeProps(id, name)} />);
    // Every calculator must produce visible UI (not an empty mount).
    expect(container.textContent.length).toBeGreaterThan(0);
  });
});

describe('BricksCalculator — deep interaction (manual-test equivalent)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('5m × 3m wall, Indian Modular bricks, 10mm joint, 10% wastage → 826 bricks', () => {
    render(<BricksCalculator {...nodeProps('bricks-calculator', 'Bricks Calculator')} />);

    // Step 1 — choose the preset brick type (190×90mm face)
    fireEvent.click(screen.getByText('Indian Modular'));

    // Advance to wall dimensions
    fireEvent.click(screen.getByRole('button', { name: /continue to wall dimensions/i }));

    // Step 2 — enter wall dimensions (unit defaults to metres)
    fireEvent.change(screen.getByPlaceholderText('Enter length'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Enter height'), { target: { value: '3' } });

    // Calculate
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));

    // Step 3 — the result step must show the computed brick count.
    // Math: wall 5000×3000mm = 15,000,000mm²; brick face with 10mm joint
    // = 200×100 = 20,000mm² → 750 bricks; +10% wastage → ceil(750 × 1.1).
    // NOTE: displays 826 (not 825) because 750 × 1.1 = 825.0000000000001 in
    // floating point — a real off-by-one quirk of the component. Asserting the
    // CURRENT behaviour so any change to it is detected.
    expect(screen.getByText(/bricks required/i)).toBeTruthy();
    expect(screen.getAllByText(/826/).length).toBeGreaterThan(0);
  });

  it('guards against missing wall dimensions (alert shown, stays on the same step)', () => {
    render(<BricksCalculator {...nodeProps('bricks-calculator', 'Bricks Calculator')} />);
    fireEvent.click(screen.getByText('Indian Modular'));
    fireEvent.click(screen.getByRole('button', { name: /continue to wall dimensions/i }));
    // Click Calculate without entering dimensions → alert, no result step.
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));
    expect(window.alert).toHaveBeenCalled();
    expect(screen.queryByText(/bricks required/i)).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────
   Deep interaction for the remaining calculators — manual-test
   equivalent: open the calculator, fill the form the way a user
   would, press the primary action, verify the result section.
   ───────────────────────────────────────────────────────────── */

const fillAllNumberInputs = (container, value = '5') => {
  container.querySelectorAll('input[type="number"]').forEach((el) => {
    if (!el.disabled) fireEvent.change(el, { target: { value } });
  });
};

const advanceStep = () => {
  const btn = screen.getAllByRole('button').find((b) => /continue|next/i.test(b.textContent || ''));
  if (btn) fireEvent.click(btn);
};

const clickPrimaryAction = () => {
  const btn = screen.getAllByRole('button').find((b) => /calculate|estimate|compute/i.test(b.textContent || ''));
  expect(btn, 'primary calculate button was not found').toBeTruthy();
  fireEvent.click(btn);
};

/**
 * Most calculators open on a landing screen with a single primary button
 * ("Configure & Calculate" / "Start Estimation") whose config view renders in
 * a PORTAL. Portal content re-renders on every change, so input nodes must be
 * re-queried before each fill (a captured NodeList goes stale after the first
 * change and later events silently do nothing).
 */
const fillEmptyNumberInputs = (value = '5') => {
  for (let i = 0; i < 40; i += 1) {
    const el = [...document.body.querySelectorAll('input[type="number"]')].find(
      (x) => !x.disabled && !x.value
    );
    if (!el) break;
    fireEvent.change(el, { target: { value } });
  }
};

const runConfigFlow = () => {
  const landing = screen
    .getAllByRole('button')
    .find((b) => /configure|start estimation/i.test(b.textContent || ''));
  if (landing) fireEvent.click(landing);

  fillEmptyNumberInputs('5');

  const primary = screen
    .getAllByRole('button')
    .find((b) => /^(calculate|calculate & estimate|calculate estimate)/i.test((b.textContent || '').trim()));
  if (primary) fireEvent.click(primary);
  return { clickedPrimary: !!primary };
};

const expectResultVisible = (pattern) => {
  expect(screen.getAllByText(pattern).length).toBeGreaterThan(0);
  expect(document.body.textContent).toMatch(/\d/);
};

describe('calculator deep interaction — result flows', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('ConcreteCalculator: slab 5×5×5 → Volume 125 m³ + cement bags', () => {
    render(<ConcreteCalculator {...nodeProps('concrete-calculator', 'Concrete Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary, 'calculate button should be present in the config view').toBe(true);
    // Result view: Volume 125 m³ · Cement Bags 1000 · Trucks 16
    expect(screen.getAllByText(/^volume$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/125/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cement bags/i).length).toBeGreaterThan(0);
  });

  it('ConcreteBlocksCalculator: default block, 5×5m wall → shows Blocks Required', () => {
    const { container } = render(<ConcreteBlocksCalculator {...nodeProps('concrete-blocks-calculator', 'Concrete Blocks Calculator')} />);
    // Step 1 (block specification) has sane defaults — advance to wall dimensions.
    advanceStep();
    fillAllNumberInputs(container, '5');
    clickPrimaryAction();
    expectResultVisible(/blocks required/i);
  });

  it('SoilExcavationCalculator: rectangular pit 5×5×5 → Excavation Volume 125 m³ + cost', () => {
    render(<SoilExcavationCalculator {...nodeProps('soil-excavation-calculator', 'Soil Excavation Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Result view: Excavation Volume 125 m³ · Loose Volume 150 · Soil Weight 225 t · Total Earthwork Cost
    expect(screen.getAllByText(/excavation volume/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/125/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/earthwork cost/i).length).toBeGreaterThan(0);
  });

  it('SteelEstimationCalculator: quick-area 5×5, 5 floors → Total Steel 4,987.5 kg', () => {
    render(<SteelEstimationCalculator {...nodeProps('steel-cost-calculator', 'Steel Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Result view: Total Steel 4,987.5 kg — 125 m² × 38 kg/m² × 1.05 wastage
    expect(screen.getAllByText(/total steel/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4,987\.5/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/bars required/i).length).toBeGreaterThan(0);
  });

  it('FlooringCalculator: 5×5 area → Total Area + Tiles Required + Cement Bags', () => {
    render(<FlooringCalculator {...nodeProps('flooring-calculator', 'Flooring Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Result view: Total Area 25 m² · Tiles Required · Tile Boxes · Cement Bags · Sand Required
    expect(screen.getAllByText(/total area/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tiles required/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cement bags/i).length).toBeGreaterThan(0);
  });

  it('VinylFlooringCalculator: 5×5 room → Total Area to Cover + Rolls Required', () => {
    render(<VinylFlooringCalculator {...nodeProps('vinyl-calculator', 'Vinyl Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Result view: Total Area to Cover 27 m² (with 8% wastage) · Total Estimated Cost · Rolls Required
    expect(screen.getAllByText(/total area to cover/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/rolls required/i).length).toBeGreaterThan(0);
  });

  it('PaintingEstimator: 5×5 walls → shows Paint Required', () => {
    render(<PaintingEstimator {...nodeProps('calc-paint', 'Painting Estimator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    expectResultVisible(/paint required/i);
  });

  it('ElectricalWiringEstimator: 5 load points → Total Points + Wire + Conduit Required', () => {
    render(<ElectricalWiringEstimator {...nodeProps('calc-electrical', 'Electrical Wiring Estimator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Result view: Total Points · Wire Required 145.2 m (2 coils) · Conduit 58.08 m
    expect(screen.getAllByText(/total points/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/wire required/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/conduit/i).length).toBeGreaterThan(0);
  });

  it('FreightCostCalculator: 100 km × ₹10 + 10% fuel + ₹50 toll + ₹25 handling → ₹1,175.00', () => {
    render(<FreightCostCalculator {...nodeProps('calc-freight', 'Freight Cost Calculator')} />);
    // Freight recalculates on every render — no calculate button.
    // Math: 100 × 10 = ₹1,000 base; +10% fuel = ₹100; + ₹50 toll; + ₹25 handling.
    const setField = (name, value) => {
      const el = document.body.querySelector(`input[name="${name}"]`);
      expect(el, `input[name="${name}"] should exist`).toBeTruthy();
      fireEvent.change(el, { target: { value } });
    };
    setField('distance', '100');
    setField('rate', '10');
    setField('fuelSurchargePercent', '10');
    setField('tollCharges', '50');
    setField('handlingFee', '25');
    expect(screen.getAllByText(/total freight cost/i).length).toBeGreaterThan(0);
    // toFixed(2) output — no thousands separator in the component's markup.
    expect(screen.getAllByText(/1,?175\.00/).length).toBeGreaterThan(0);
  });
});

/* ─────────────────────────────────────────────────────────────
   Batch A — material basics (calculator-kit pattern).
   Driver fills the single empty input (area / length / volume) with 5;
   all other fields keep their documented defaults, so the expected
   numbers are fully deterministic (hand-computed below).
   ───────────────────────────────────────────────────────────── */

describe('Batch A calculators — deep interaction', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('Plaster: 5 m² @12mm, 1:6 mix, 5% wastage → 0.34 bags cement, 0.072 m³ sand', () => {
    render(<PlasterCalculator {...nodeProps('calc-plaster', 'Plaster Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: wet 5×0.012 = 0.06 m³ → dry ×1.33 = 0.0798 → cement 0.0798/7×1440
    // = 16.416 kg → ×1.05 = 17.24 kg = 0.3447 bags; sand 0.0798×6/7×1.05 = 0.0718.
    expect(screen.getAllByText(/plaster estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.34 bags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.072 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8\.6 L/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹224/).length).toBeGreaterThan(0);
  });

  it('PCC: 5×5m @100mm, 1:4:8, 5% wastage → 8.96 bags cement, 1.244 m³ sand, 2.488 m³ aggregate', () => {
    render(<PCCCalculator {...nodeProps('calc-pcc', 'PCC Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: volume 2.5 m³ → dry ×1.54 = 3.85 → cement 3.85/13×1440×1.05
    // = 447.8 kg = 8.96 bags; sand 3.85×4/13×1.05 = 1.244; agg 3.85×8/13×1.05 = 2.488.
    expect(screen.getAllByText(/pcc estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8\.96 bags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.244 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.488 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹8,558/).length).toBeGreaterThan(0);
  });

  it('Putty & Primer: 5 m², 2 coats → 7.88 kg putty (0.39 bags), 0.53 L primer', () => {
    render(<PuttyCalculator {...nodeProps('calc-putty', 'Putty & Primer Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: putty 5×2×0.75×1.05 = 7.875 kg → 0.3938 bags; primer 5/10×1.05 = 0.525 L.
    expect(screen.getAllByText(/putty & primer estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7\.88 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.39 × 20 kg bags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.53 L/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹449/).length).toBeGreaterThan(0);
  });

  it('Sand & Aggregate: 5 m³ sand, 5% wastage → 8.4 tonnes, 1 truck, ₹6,300', () => {
    render(<SandAggregateCalculator {...nodeProps('calc-sand-aggregate', 'Sand & Aggregate Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: 5×1.05 = 5.25 m³ → ×1600 kg/m³ = 8,400 kg = 8.4 t; trucks ceil(5.25/6) = 1;
    // cost 5.25×1200 = ₹6,300.
    expect(screen.getAllByText(/material order/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8\.4 tonnes/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8,400 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 truck/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹6,300/).length).toBeGreaterThan(0);
  });
});

/* ─────────────────────────────────────────────────────────────
   Batch B — concrete family (calculator-kit pattern, M20 mix).
   Driver fills the single empty input (height / plan dims / steps /
   area) with 5; every other field keeps its documented default.
   ───────────────────────────────────────────────────────────── */

describe('Batch B calculators — deep interaction', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('Concrete Column: 4 columns 230×230mm × 5m, M20, steel 120 → 9.95 bags, 133.3 kg steel', () => {
    render(<ConcreteColumnCalculator {...nodeProps('calc-column', 'Concrete Column Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: volume 0.23×0.23×5×4 = 1.058 m³ → ×1.05 = 1.1109 →
    // cement 1.1109×448/50 = 9.9537 bags (497.7 kg); sand 0.6943; agg 1.3886;
    // steel 1.1109×120 = 133.3 kg.
    expect(screen.getAllByText(/column estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9\.95 bags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.694 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.389 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/133\.3 kg/).length).toBeGreaterThan(0);
  });

  it('Concrete Footing: 4 footings 5×5m × 0.5m, M20, steel 60 → 470.40 bags, ₹5,24,160', () => {
    render(<ConcreteFootingCalculator {...nodeProps('calc-footing', 'Concrete Footing Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: volume 5×5×0.5×4 = 50 m³ → ×1.05 = 52.5 →
    // cement 52.5×448 = 23,520 kg = 470.40 bags; sand 32.813; agg 65.625;
    // steel 52.5×60 = 3,150 kg; cost ₹5,24,160 (Indian grouping).
    expect(screen.getAllByText(/footing estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/470\.40 bags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/32\.813 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/65\.625 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3,150 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹5,24,160/).length).toBeGreaterThan(0);
  });

  it('Concrete Stairs: 5 steps, 150/300mm, 1m wide, 150mm waist → 3.43 bags, 0.364 m³', () => {
    render(<ConcreteStairsCalculator {...nodeProps('calc-stairs', 'Concrete Stairs Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: stepped 5×(0.15×0.30/2)×1 = 0.1125; incline √(1.5²+0.75²) = 1.677 m;
    // waist 1.677×0.15 = 0.2516; total 0.3641 m³ → ×1.05 = 0.3823 →
    // cement 3.4251 bags (171.3 kg); sand 0.239; agg 0.478; steel 30.6 kg; ₹4,313.
    expect(screen.getAllByText(/stairs estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.364 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.68 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\.43 bags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.239 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.478 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/30\.6 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹4,313/).length).toBeGreaterThan(0);
  });

  it('RCC Formwork: 5 m² → 2 ply sheets, 12.5 m battens, 4 props, ₹2,675', () => {
    render(<RCCFormworkCalculator {...nodeProps('calc-formwork', 'RCC Formwork Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: ply 5×1.1 = 5.5 m² → ceil(5.5/2.97) = 2 sheets; battens 12.5 m;
    // props ceil(5/1.5) = 4; nails 0.5 kg; cost 2×850 + 12.5×36 + 4×120 + 0.5×90 = ₹2,675.
    expect(screen.getAllByText(/formwork estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 sheets/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12\.5 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.5 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹2,675/).length).toBeGreaterThan(0);
  });
});

/* ─────────────────────────────────────────────────────────────
   Batch C — steel & masonry (calculator-kit pattern).
   Driver fills every empty number input with 5.
   ───────────────────────────────────────────────────────────── */

describe('Batch C calculators — deep interaction', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('Rebar/BBS: 12mm × 5m × 5 bars, 5% wastage → 0.889 kg/m, 23.3 kg, ₹1,517', () => {
    render(<RebarBBSCalculator {...nodeProps('calc-rebar', 'Rebar / BBS Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: unit weight 12²/162 = 0.8889 kg/m → row 0.8889×5×5 = 22.2 kg;
    // total length 25 m; with 5% wastage 23.33 kg; cost 23.33×65 = ₹1,517.
    expect(screen.getAllByText(/rebar estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.889 kg\/m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25\.0 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/23\.3 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹1,517/).length).toBeGreaterThan(0);
  });

  it('AAC Blocks: 5 m², 600×200mm blocks, 5% wastage → 44 blocks, 15.8 kg adhesive, ₹2,609', () => {
    render(<AACBlocksCalculator {...nodeProps('calc-aac', 'AAC Blocks Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: face 0.6×0.2 = 0.12 m² → blocks ceil(5×1.05/0.12) = ceil(43.75) = 44;
    // adhesive 5×3×1.05 = 15.75 kg (TDS: 40kg bag covers ~160-170 sqft at 3mm ≈ 2.7-3.4 kg/m²);
    // cost 44×55 + 15.75×12 = ₹2,609.
    expect(screen.getAllByText(/aac block estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/44 blocks/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15\.8 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹2,609/).length).toBeGreaterThan(0);
  });

  it('Tiles: 5×5m room, 600×600mm tiles, 10% waste → 77 tiles, 20 boxes, ₹9,240', () => {
    render(<TilesCalculator {...nodeProps('calc-tiles', 'Tiles Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: area 25 m²; per tile 0.36 m² → base ceil(69.44) = 70;
    // +10% waste → 77 tiles (epsilon-guarded against 77.0000001 → 78);
    // boxes ceil(77/4) = 20; cost 77×120 = ₹9,240.
    expect(screen.getAllByText(/tile estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25\.00 m²/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/77 tiles/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20 boxes/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹9,240/).length).toBeGreaterThan(0);
  });
});

/* ─────────────────────────────────────────────────────────────
   Batch D — site & envelope (calculator-kit pattern).
   Driver fills every empty number input with 5.
   ───────────────────────────────────────────────────────────── */

describe('Batch D calculators — deep interaction', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('Waterproofing: 5 m² × 2 coats @1.5 m²/L, 5% wastage → 7.0 L, 1 bucket, ₹1,750', () => {
    render(<WaterproofingCalculator {...nodeProps('calc-waterproofing', 'Waterproofing Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: 5×2/1.5 = 6.667 L → ×1.05 = 7.0 L; buckets ceil(7/20) = 1;
    // cost 7×250 = ₹1,750.
    expect(screen.getAllByText(/waterproofing estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7\.0 L/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 × 20 L bucket/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹1,750/).length).toBeGreaterThan(0);
  });

  it('Roofing: 5×5m @20% slope, 3×1.05m sheets → 25.50 m² slope area, 9 sheets, ₹8,295', () => {
    render(<RoofingCalculator {...nodeProps('calc-roofing', 'Roofing Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: slope area = 25 ÷ cos(atan(0.2)) = 25.495 m² → 25.50;
    // sheets ceil(25.495×1.05/3.15) = 9; screws ceil(25.495×8×1.05) = 215;
    // cost 9×850 + 215×3 = ₹8,295.
    expect(screen.getAllByText(/roofing estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25\.50 m²/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9 sheets/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/215 screws/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹8,295/).length).toBeGreaterThan(0);
  });

  it('Drywall: 5×5m wall, 2.4×1.2m boards, studs @400mm → 10 boards, 14 studs, 315 screws, ₹10,398', () => {
    render(<DrywallCalculator {...nodeProps('calc-drywall', 'Drywall / Partition Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: area 25 m² → boards ceil(25×1.05/2.88) = 10; studs ceil(5/0.4 + 1) = 14;
    // screws ceil(25×12×1.05) = 315 (≈36 screws per 2.88 m² board at 300mm field centres);
    // compound 25×0.5×1.05 = 13.1 kg;
    // cost 10×650 + 14×180 + 315×2.5 + 13.125×45 = ₹10,398.
    expect(screen.getAllByText(/drywall estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10 boards/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/14 studs/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/315 screws/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/13\.1 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹10,398/).length).toBeGreaterThan(0);
  });

  it('Retaining Wall: 5m long × 5m high, 200mm stem, M20 → 68.21 bags, 609 kg steel, ₹85,899', () => {
    render(<RetainingWallCalculator {...nodeProps('calc-retaining-wall', 'Retaining Wall Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: stem 5×5×0.2 = 5 m³ + base 5×1.5×0.3 = 2.25 → 7.25 → ×1.05 = 7.6125;
    // cement 7.6125×448 = 3,410.4 kg = 68.21 bags; sand 4.758; agg 9.516;
    // steel 7.6125×80 = 609 kg; cost 27,283.2 + 5,709.375 + 13,321.875 + 39,585 = ₹85,899.
    expect(screen.getAllByText(/retaining wall estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/68\.21 bags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\.758 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9\.516 m³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/609 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹85,899/).length).toBeGreaterThan(0);
  });
});

/* ─────────────────────────────────────────────────────────────
   Wave 2 · Batch E — timber & framing (calculator-kit pattern).
   Driver fills every empty number input with 5.
   ───────────────────────────────────────────────────────────── */

describe('Wave 2 Batch E calculators — deep interaction', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('Decking: 5×5m deck, 140mm boards + 5mm gap, 3m lengths → 74 boards, 657 screws, ₹35,271', () => {
    render(<DeckingCalculator {...nodeProps('calc-decking', 'Decking Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: rows ceil(5/0.145) = 35; per row ceil(5/3) = 2; boards ceil(70×1.05) = 74;
    // screws ceil(25×25×1.05) = 657; cost 74×450 + 657×3 = ₹35,271.
    expect(screen.getAllByText(/decking estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/74 boards/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/657 screws/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹35,271/).length).toBeGreaterThan(0);
  });

  it('Framing: 5m × 5m wall @400mm studs → 14 studs, 73.5 m + 10.5 m timber, ₹5,220', () => {
    render(<FramingCalculator {...nodeProps('calc-framing', 'Framing Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: studs ceil(5/0.4 + 1) = 14; stud timber 14×5×1.05 = 73.5 m;
    // plates 2×5×1.05 = 10.5 m; stock lengths ceil(73.5/3) = 25 + ceil(10.5/3) = 4 → 29;
    // cost 29×180 = ₹5,220.
    expect(screen.getAllByText(/framing estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/14 studs/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/73\.5 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10\.5 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25 \+ 4 = 29/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹5,220/).length).toBeGreaterThan(0);
  });

  it('Lumber: 5 pieces 1×6in × 8ft → 20.00 BF, 1.67 cft, ₹4,167', () => {
    render(<LumberCalculator {...nodeProps('calc-lumber', 'Lumber Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: BF = 1×6×8×5/12 = 20.00; cft = 20/12 = 1.67; cost 1.6667×2500 = ₹4,167.
    expect(screen.getAllByText(/lumber estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20\.00 BF/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.67 cft/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹4,167/).length).toBeGreaterThan(0);
  });

  it('Roof Truss: 5m span, 5m length @30% pitch, 1.2m spacing → 6 trusses, 77.0 m, ₹13,858', () => {
    render(<RoofTrussCalculator {...nodeProps('calc-truss', 'Roof Truss Calculator')} />);
    const { clickedPrimary } = runConfigFlow();
    expect(clickedPrimary).toBe(true);
    // Math: trusses ceil(5/1.2 + 1) = 6; rise 0.75; rafter √(2.5²+0.75²) = 2.61;
    // per truss 2×2.61 + 5 + 2 = 12.22 m; total 6×12.22×1.05 = 77.0 m;
    // cost 76.99×180 = ₹13,858.
    expect(screen.getAllByText(/truss estimate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6 trusses/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.61 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12\.22 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/77\.0 m/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹13,858/).length).toBeGreaterThan(0);
  });
});

describe('CostCalculatorSummary — aggregated results view', () => {
  it('lists each calculator result that was added from the modal flow', () => {
    render(
      <CostCalculatorSummary
        {...nodeProps('cost-calculator-summary', 'Cost Calculation Summary')}
        data={{
          type: 'cost-calculator-summary',
          data: {
            calculatorResults: [
              { name: 'Bricks Calculator', results: {} },
              { name: 'Concrete Calculator', results: {} },
            ],
          },
        }}
      />
    );
    expect(screen.getAllByText(/bricks calculator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/concrete calculator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/calculated/i).length).toBeGreaterThan(0);
  });
});
