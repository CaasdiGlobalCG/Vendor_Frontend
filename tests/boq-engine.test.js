/**
 * BOQ engine — pure-logic suite.
 *
 * Every assertion uses hand-computed expected values (the same numbers a manual
 * tester would verify), so any change to the engines' math fails loudly.
 *
 * Engine files: src/pages/WorkspacePage/components/forms/boq-engine/
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as concrete from '../src/pages/WorkspacePage/components/forms/boq-engine/concreteEngine.js';
import * as excavation from '../src/pages/WorkspacePage/components/forms/boq-engine/excavationEngine.js';
import * as masonry from '../src/pages/WorkspacePage/components/forms/boq-engine/masonryEngine.js';
import * as plaster from '../src/pages/WorkspacePage/components/forms/boq-engine/plasterEngine.js';
import * as steel from '../src/pages/WorkspacePage/components/forms/boq-engine/steelEngine.js';
import * as flooring from '../src/pages/WorkspacePage/components/forms/boq-engine/flooringEngine.js';
import * as rate from '../src/pages/WorkspacePage/components/forms/boq-engine/rateEngine.js';
import * as aggregator from '../src/pages/WorkspacePage/components/forms/boq-engine/boqAggregator.js';

/* ═══════════════ Concrete ═══════════════ */
describe('concreteEngine', () => {
  it('calculates slab volume: 5m × 4m × 0.15m × 2 slabs = 6.0 m³', () => {
    expect(concrete.calculateSlabVolume({ length: 5, width: 4, thickness: 0.15, numberOfSlabs: 2 })).toBeCloseTo(6.0, 6);
  });

  it('calculates beam volume: 4m × 3 beams × 0.3 × 0.5 = 1.8 m³', () => {
    expect(concrete.calculateBeamVolume({ beamLength: 4, beamWidth: 0.3, beamDepth: 0.5, numberOfBeams: 3 })).toBeCloseTo(1.8, 6);
  });

  it('calculates column volume: 0.4 × 0.4 × 3m × 4 columns = 1.92 m³', () => {
    expect(concrete.calculateColumnVolume({ columnLength: 0.4, columnWidth: 0.4, columnHeight: 3, numberOfColumns: 4 })).toBeCloseTo(1.92, 6);
  });

  it('calculates footing volume: 1.5 × 1.5 × 0.5 × 4 = 4.5 m³', () => {
    expect(concrete.calculateFootingVolume({ footingLength: 1.5, footingWidth: 1.5, footingThickness: 0.5, numberOfFootings: 4 })).toBeCloseTo(4.5, 6);
  });

  it('returns 0 for empty params (no NaN)', () => {
    expect(concrete.calculateSlabVolume({})).toBe(0);
    expect(concrete.calculateBeamVolume({})).toBe(0);
    expect(concrete.calculateColumnVolume({})).toBe(0);
    expect(concrete.calculateFootingVolume({})).toBe(0);
  });

  it('full house example: 100 m² floor, M20, 5% wastage → exact volumes + materials', () => {
    const r = concrete.calculateTotalConcrete({
      floorArea: 100, numberOfFloors: 1, slabThickness: 0.15,
      totalBeamLength: 40, beamWidth: 0.3, beamDepth: 0.5,
      numberOfColumns: 4, columnLength: 0.4, columnWidth: 0.4, columnHeight: 3,
      numberOfFootings: 4, footingLength: 1.5, footingWidth: 1.5, footingThickness: 0.5,
      pccThickness: 0.1, concreteGrade: 'M20', wastagePercent: 5,
    });
    // Elements: slab 15 · beam 6 · column 1.92 · footing 4.5 · pcc 0.9
    expect(r.elements.slabVolume).toBeCloseTo(15, 3);
    expect(r.elements.beamVolume).toBeCloseTo(6, 3);
    expect(r.elements.columnVolume).toBeCloseTo(1.92, 3);
    expect(r.elements.footingVolume).toBeCloseTo(4.5, 3);
    expect(r.elements.pccVolume).toBeCloseTo(0.9, 3);
    // Subtotal 28.32 m³ → with 5% wastage 29.736 m³
    expect(r.summary.subtotalVolume).toBeCloseTo(28.32, 3);
    expect(r.summary.totalVolumeRequired).toBeCloseTo(29.736, 3);
    // M20 mix: cement 448/1440 bags per m³ → 29.736 × 0.3111 = 9.25 bags
    expect(r.mixDesign.cementBags).toBe(9.25);
    expect(r.mixDesign.sandM3).toBe(18.585);
    expect(r.mixDesign.aggregateM3).toBe(37.17);
    expect(r.mixDesign.waterLitres).toBe(5352);
    // Ready-mix: ceil(29.736 / 8) = 4 trucks
    expect(r.readyMixTrucks.trucksRequired).toBe(4);
  });

  it('falls back to M20 for an unknown grade', () => {
    const a = concrete.calculateTotalConcrete({ floorArea: 50, concreteGrade: 'M999' });
    const b = concrete.calculateTotalConcrete({ floorArea: 50, concreteGrade: 'M20' });
    expect(a.mixDesign.cementBags).toBe(b.mixDesign.cementBags);
  });
});

/* ═══════════════ Excavation ═══════════════ */
describe('excavationEngine', () => {
  const footingParams = { numberOfFootings: 4, footingLength: 1.5, footingWidth: 1.5, excavationDepth: 1.5, soilType: 'medium' };

  it('footing excavation, medium soil: base 13.5 m³, swell 16.2 m³, 3 truck loads', () => {
    const r = excavation.calculateFootingExcavation(footingParams);
    expect(r.baseVolume).toBe(13.5);
    expect(r.swellVolume).toBe(16.2);
    expect(r.swellPercent).toBe(20);
    expect(r.truckLoads).toBe(3);
  });

  it('applies soil swell factors: loose 10%, hard 30%, unknown → medium 20%', () => {
    expect(excavation.calculateFootingExcavation({ ...footingParams, soilType: 'loose' }).swellPercent).toBe(10);
    expect(excavation.calculateFootingExcavation({ ...footingParams, soilType: 'hard' }).swellPercent).toBe(30);
    expect(excavation.calculateFootingExcavation({ ...footingParams, soilType: 'weird' }).swellPercent).toBe(20);
  });

  it('trench excavation: 20m × 0.6m × 1.2m = 14.4 m³ base, 17.28 swell', () => {
    const r = excavation.calculateTrenchExcavation({ trenchLength: 20, trenchWidth: 0.6, trenchDepth: 1.2 });
    expect(r.baseVolume).toBe(14.4);
    expect(r.swellVolume).toBe(17.28);
    expect(r.truckLoads).toBe(3);
  });

  it('total excavation combines footing + trench and computes spoil removal', () => {
    const r = excavation.calculateTotalExcavation(footingParams, { trenchLength: 20, trenchWidth: 0.6, trenchDepth: 1.2 });
    expect(r.totalBaseVolume).toBe(27.9);
    expect(r.totalSwellVolume).toBe(33.48);
    expect(r.totalTruckLoads).toBe(6);
    expect(r.breakdown.spoilRemoval).toBeCloseTo(5.58, 3);
  });

  it('total excavation works without trench data', () => {
    const r = excavation.calculateTotalExcavation(footingParams);
    expect(r.trench).toBeNull();
    expect(r.totalBaseVolume).toBe(13.5);
    expect(r.totalTruckLoads).toBe(3);
  });
});

/* ═══════════════ Masonry ═══════════════ */
describe('masonryEngine', () => {
  it('wall volume deducts openings: 10×3×0.23 − 2.5 = 4.4 m³', () => {
    expect(masonry.calculateMasonryVolume({ wallLength: 10, wallHeight: 3, wallThickness: 0.23, openingsArea: 2.5 })).toBeCloseTo(4.4, 6);
  });

  it('never returns a negative volume', () => {
    expect(masonry.calculateMasonryVolume({ wallLength: 2, wallHeight: 2, wallThickness: 0.1, openingsArea: 5 })).toBe(0);
  });

  it('brick count: 4.4 m³ × 500 bricks/m³ = 2200 bricks (rounded up)', () => {
    const r = masonry.calculateBricks({ masonryVolume: 4.4, brickType: 'standard' });
    expect(r.numberOfBricks).toBe(2200);
    expect(r.bricksPerM3).toBe(500);
  });

  it('KNOWN ISSUE: mortar volume is always ~0 and can go negative', () => {
    // The engine divides bricks back by the same bricksPerM3 that produced them,
    // so `masonryVolume - brickVolumeM3` is ~0 (or slightly negative after ceil).
    // Expected real behaviour: mortar ≈ 15-30% of wall volume. Flagged, not fixed.
    const exact = masonry.calculateBricks({ masonryVolume: 4.4 });
    expect(exact.mortarVolume).toBe(0);
    const rounded = masonry.calculateBricks({ masonryVolume: 4.4001 });
    expect(rounded.mortarVolume).toBeLessThanOrEqual(0);
  });

  it('total masonry: exterior 12 m³ + interior 3.75 m³, 5% wastage → 16.5375 m³ → 8269 bricks', () => {
    const r = masonry.calculateTotalMasonry({
      exteriorWallLength: 20, exteriorWallHeight: 3, exteriorWallThickness: 0.3, exteriorOpeningsArea: 6,
      interiorWallLength: 15, interiorWallHeight: 3, interiorWallThickness: 0.15, interiorOpeningsArea: 3,
      wastagePercent: 5,
    });
    expect(r.volumes.exteriorVolume).toBe(12);
    expect(r.volumes.interiorVolume).toBe(3.75);
    expect(r.volumes.totalMasonryVolume).toBe(15.75);
    expect(r.volumeWithWastage).toBeCloseTo(16.5375, 3);
    expect(r.bricks.numberOfBricks).toBe(8269);
  });
});

/* ═══════════════ Plaster ═══════════════ */
describe('plasterEngine', () => {
  it('plaster area: 100 m² wall − 10 deduction, both sides = 180 m²', () => {
    expect(plaster.calculatePlasterArea({ wallArea: 100, plasterBothSides: true, deductionsArea: 10 })).toBe(180);
    expect(plaster.calculatePlasterArea({ wallArea: 100, plasterBothSides: false, deductionsArea: 10 })).toBe(90);
    expect(plaster.calculatePlasterArea({ wallArea: 5, plasterBothSides: true, deductionsArea: 10 })).toBe(0);
  });

  it('plaster materials: 100 m² × 12mm = 1.2 m³ → 8 bags cement, 1.536 m³ sand', () => {
    const r = plaster.calculatePlasterMaterials({ plasterArea: 100, plasterThickness: 0.012 });
    expect(r.plasterVolume).toBe(1.2);
    expect(r.materials.cementBags).toBe(8);
    expect(r.materials.sandM3).toBe(1.536);
  });

  it('finishing: 100 m² → 9L paint (12 m²/L), 8L primer (14 m²/L), two coats = 18L', () => {
    const r = plaster.calculateFinishingMaterials({ plasterArea: 100, paintType: 'emulsion' });
    expect(r.paintLitres).toBe(9);
    expect(r.primerLitres).toBe(8);
    expect(r.twoCoats).toBe(18);
    expect(plaster.calculateFinishingMaterials({ plasterArea: 100, paintType: 'enamel' }).paintLitres).toBe(10);
  });

  it('total plaster: internal 94 m² (60% deductions) + external 56 m² (40%), 5% wastage on materials', () => {
    const r = plaster.calculateTotalPlaster({
      interiorWallArea: 100, exteriorWallArea: 60, deductionsArea: 10,
      internalPlasterThickness: 0.012, externalPlasterThickness: 0.02, wastagePercent: 5,
    });
    expect(r.internal.plasterArea).toBe(94);
    expect(r.external.plasterArea).toBe(56);
    expect(r.totalPlasterArea).toBe(150);
    expect(r.totalPlasterVolume).toBeCloseTo(2.248, 3);
    // (8 internal + 8 external bags) × 1.05 → ceil = 17
    expect(r.materials.cementBags).toBe(17);
    expect(r.materials.sandM3).toBeCloseTo(3.022, 3);
    // finishing on 150 m²
    expect(r.finishing.paintLitres).toBe(13);
    expect(r.finishing.primerLitres).toBe(11);
  });
});

/* ═══════════════ Steel ═══════════════ */
describe('steelEngine', () => {
  it('percentage mode: 29.736 m³ × 100 kg/m³ = 2973.6 kg = 2.974 t', () => {
    const r = steel.calculateSteelPercentageMode({ totalConcreteVolume: 29.736, steelPercentage: 100 });
    expect(r.totalSteelKg).toBe(2973.6);
    expect(r.totalSteelTons).toBe(2.974);
  });

  it('element-wise: slab 1200 + beam 720 + column 192 + footing 270 = 2382 kg', () => {
    const r = steel.calculateSteelElementwiseMode({ slabVolume: 15, beamVolume: 6, columnVolume: 1.92, footingVolume: 4.5 });
    expect(r.elements.slabSteel).toBe(1200);
    expect(r.elements.beamSteel).toBe(720);
    expect(r.elements.columnSteel).toBe(192);
    expect(r.elements.footingSteel).toBe(270);
    expect(r.totalSteelKg).toBe(2382);
    expect(r.totalSteelTons).toBe(2.382);
    expect(r.breakdown.slabPercent).toBe(50.4);
    expect(r.breakdown.beamPercent).toBe(30.2);
  });

  it('wastage: 2382 kg × 1.05 = 2501.1 kg = 2.501 t', () => {
    const base = steel.calculateSteelElementwiseMode({ slabVolume: 15, beamVolume: 6, columnVolume: 1.92, footingVolume: 4.5 });
    const r = steel.applySteelWastage(base, 5);
    expect(r.wastagePercent).toBe(5);
    expect(r.totalSteelKg).toBe(2501.1);
    expect(r.totalSteelTons).toBe(2.501);
  });
});

/* ═══════════════ Flooring ═══════════════ */
describe('flooringEngine', () => {
  it('area: carpetArea wins, builtUpArea fallback, 0 when empty', () => {
    expect(flooring.calculateFlooringArea({ carpetArea: 12, builtUpArea: 15 })).toBe(12);
    expect(flooring.calculateFlooringArea({ carpetArea: 0, builtUpArea: 15 })).toBe(15);
    expect(flooring.calculateFlooringArea({})).toBe(0);
  });

  it('tiles (medium 300×300): 12 m² → 134 base +10% = 148 tiles = 15 boxes', () => {
    const r = flooring.calculateTileQuantity({ flooringArea: 12, tileSize: 'medium', wastagePercent: 10 });
    expect(r.baseTiles).toBe(134);
    expect(r.totalTiles).toBe(148);
    expect(r.tilesPerBox).toBe(10);
    expect(r.boxesRequired).toBe(15);
  });

  it('tiles (large 600×600) and (small 200×200) box math', () => {
    const large = flooring.calculateTileQuantity({ flooringArea: 12, tileSize: 'large', wastagePercent: 10 });
    expect(large.baseTiles).toBe(34);
    expect(large.totalTiles).toBe(38);
    expect(large.boxesRequired).toBe(7);
    const small = flooring.calculateTileQuantity({ flooringArea: 12, tileSize: 'small', wastagePercent: 10 });
    expect(small.baseTiles).toBe(300);
    expect(small.totalTiles).toBe(330);
    expect(small.boxesRequired).toBe(14);
  });

  it('installation materials per method (12 m²)', () => {
    const glue = flooring.calculateInstallationMaterials({ flooringArea: 12, installationType: 'glue-down' });
    expect(glue.adhesiveLitres).toBe(18);
    expect(glue.groutKg).toBe(6);
    expect(glue.sealantLitres).toBe(2);
    const mortar = flooring.calculateInstallationMaterials({ flooringArea: 12, installationType: 'mortar-bed' });
    expect(mortar.cementKg).toBe(600);
    expect(mortar.sandM3).toBe(1.8);
    expect(mortar.groutKg).toBe(10);
    const floating = flooring.calculateInstallationMaterials({ flooringArea: 12, installationType: 'floating' });
    expect(floating.underlayM2).toBe(12);
    expect(floating.clipsRequired).toBe(240);
    expect(floating.spacersRequired).toBe(480);
  });

  it('total flooring: 12 m² mortar-bed → 15 boxes summary', () => {
    const r = flooring.calculateTotalFlooring({ carpetArea: 12, tileSize: 'medium', installationType: 'mortar-bed' });
    expect(r.flooringArea).toBe(12);
    expect(r.summary.totalBoxes).toBe(15);
  });

  it('total flooring with zero area returns null tiles/installation', () => {
    const r = flooring.calculateTotalFlooring({ carpetArea: 0 });
    expect(r.flooringArea).toBe(0);
    expect(r.tiles).toBeNull();
    expect(r.installation).toBeNull();
  });
});

/* ═══════════════ Rate engine ═══════════════ */
describe('rateEngine', () => {
  it('standard rates seed (spot checks)', () => {
    expect(rate.STANDARD_RATES.excavation.rate).toBe(150);
    expect(rate.STANDARD_RATES.concreteM20.rate).toBe(9000);
    expect(rate.STANDARD_RATES.steelTMT.rate).toBe(65);
    expect(rate.STANDARD_RATES.cementBag.rate).toBe(400);
    expect(rate.STANDARD_RATES.brickClay.rate).toBe(6);
  });

  it('item cost: 10 × ₹500, 5% wastage, 15% labour, 10% profit = ₹6,641.25', () => {
    const r = rate.calculateItemCost({ quantity: 10, rate: 500, wastagePercent: 5, labourPercent: 15, profitMargin: 10 });
    expect(r.quantityWithWastage).toBe(10.5);
    expect(r.materialCost).toBe(5250);
    expect(r.labourCost).toBe(787.5);
    expect(r.subtotal).toBe(6037.5);
    expect(r.profitAmount).toBe(603.75);
    expect(r.totalCost).toBe(6641.25);
  });

  it('overhead: ₹10,000 + 10% overhead + 5% contingency = ₹11,500', () => {
    const r = rate.calculateOverheadCosts({ subtotal: 10000, overheadPercent: 10, contingencyPercent: 5 });
    expect(r.overheadAmount).toBe(1000);
    expect(r.contingencyAmount).toBe(500);
    expect(r.totalAfterOverhead).toBe(11500);
  });

  it('GST: ₹11,500 + 18% = ₹13,570', () => {
    const r = rate.applyGST({ amount: 11500, gstPercent: 18 });
    expect(r.gstAmount).toBe(2070);
    expect(r.totalWithGST).toBe(13570);
  });

  it('project cost: single ₹6,641.25 item rolls up to a rounded grand total of ₹9,100', () => {
    const r = rate.calculateProjectCost({
      boqItems: [{ description: 'Test item', quantity: 10, unit: 'm³', rate: 500, wastagePercent: 5 }],
      overheadPercent: 10, contingencyPercent: 5, labourPercent: 15, profitMargin: 10, gstPercent: 18,
    });
    expect(r.itemsCost.itemCount).toBe(1);
    expect(r.itemsCost.subtotal).toBe(6641.25);
    expect(r.overhead.overheadAmount).toBeCloseTo(664.13, 1);
    expect(r.overhead.totalAfterOverhead).toBeCloseTo(7637.44, 1);
    expect(r.finalCost.exactTotal).toBeCloseTo(9012.18, 1);
    // grandTotal rounds UP to the nearest ₹100
    expect(r.summary.grandTotal).toBe(9100);
    expect(r.finalCost.roundedTotal).toBe(9100);
  });

  it('formatCostBreakdown produces the six display lines', () => {
    const cost = rate.calculateProjectCost({
      boqItems: [{ description: 'x', quantity: 1, unit: 'm³', rate: 1000 }],
      overheadPercent: 10, contingencyPercent: 5, gstPercent: 18,
    });
    const lines = rate.formatCostBreakdown(cost);
    expect(lines.line1).toMatch(/Material \+ Labour/);
    expect(lines.line6).toMatch(/Grand Total/);
  });
});

/* ═══════════════ Aggregator ═══════════════ */
describe('boqAggregator', () => {
  const concreteParams = {
    floorArea: 100, numberOfFloors: 1, slabThickness: 0.15,
    totalBeamLength: 40, beamWidth: 0.3, beamDepth: 0.5,
    numberOfColumns: 4, columnLength: 0.4, columnWidth: 0.4, columnHeight: 3,
    numberOfFootings: 4, footingLength: 1.5, footingWidth: 1.5, footingThickness: 0.5,
    concreteGrade: 'M20', wastagePercent: 5,
  };

  it('aggregates a concrete-only BOQ into sections + items + project info', () => {
    const r = aggregator.aggregateAllModules({ concreteParams, projectName: 'Unit Test BOQ' });
    expect(r.projectInfo.projectName).toBe('Unit Test BOQ');
    expect(Array.isArray(r.sections)).toBe(true);
    expect(r.sections.length).toBeGreaterThan(0);
    const concreteSection = r.sections.find((s) => /concrete/i.test(s.sectionName));
    expect(concreteSection).toBeTruthy();
    expect(concreteSection.items.length).toBeGreaterThan(0);
    expect(r.allItems.length).toBeGreaterThan(0);
    expect(typeof r.allItems[0].rate).toBe('number');
  });

  it('KNOWN ISSUE: excavation items get undefined quantity (engine/aggregator key mismatch)', () => {
    // calculateTotalExcavation returns breakdown.excavationBaseVolume, but the
    // aggregator reads breakdown.footingExcavation / trenchExcavation — so the
    // Earthwork section renders with blank quantities. Flagged, not fixed.
    const r = aggregator.aggregateAllModules({
      excavationParams: { numberOfFootings: 4, footingLength: 1.5, footingWidth: 1.5, excavationDepth: 1.5, soilType: 'medium' },
    });
    const earthwork = r.sections.find((s) => /earthwork/i.test(s.sectionName));
    expect(earthwork).toBeTruthy();
    expect(earthwork.items[0].quantity).toBeUndefined();
    expect(earthwork.items[0].rate).toBe(150);
  });

  it('calculateBOQCost prices a hand-built BOQ (same rollup as rate engine)', () => {
    const boq = { allItems: [{ description: 'Test item', quantity: 10, unit: 'm³', rate: 500 }] };
    const cost = aggregator.calculateBOQCost(boq, { overheadPercent: 10, contingencyPercent: 5, labourPercent: 15, profitMargin: 10, gstPercent: 18 });
    expect(cost.itemsCost.subtotal).toBe(6641.25);
    expect(cost.summary.grandTotal).toBe(9100);
  });

  it('generateBOQDocument contains project header, sections and grand total', () => {
    const boq = aggregator.aggregateAllModules({ concreteParams, projectName: 'Doc Test' });
    const cost = aggregator.calculateBOQCost(boq);
    const doc = aggregator.generateBOQDocument(boq, cost);
    expect(doc).toContain('BILL OF QUANTITIES');
    expect(doc).toContain('Doc Test');
    expect(doc).toContain('SECTION');
    expect(doc).toContain('GRAND TOTAL');
  });

  describe('exports (browser download shims stubbed)', () => {
    let clickSpy;
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:test');
      URL.revokeObjectURL = vi.fn();
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });
    afterEach(() => {
      clickSpy.mockRestore();
    });

    it('exportToExcel returns true and triggers a download', () => {
      const boq = aggregator.aggregateAllModules({ concreteParams, projectName: 'Export Test' });
      const cost = aggregator.calculateBOQCost(boq);
      expect(aggregator.exportToExcel(boq, cost)).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('exportToPDF returns true and triggers a download', () => {
      const boq = aggregator.aggregateAllModules({ concreteParams, projectName: 'Export Test' });
      const cost = aggregator.calculateBOQCost(boq);
      expect(aggregator.exportToPDF(boq, cost)).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
