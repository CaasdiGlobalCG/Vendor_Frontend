import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, AlertCircle, Info, X } from 'lucide-react';

const SteelEstimationCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  // ==================== CONSTANTS ====================
  const FEET_TO_METER = 0.3048;
  const PI = 3.1416;

  // Building type steel factors (kg/m²)
  const STEEL_FACTORS = {
    'residential': 38,
    'commercial': 48,
    'industrial': 65,
    'heavy': 60
  };

  // Standard bar diameters (mm)
  const STANDARD_DIAMETERS = [8, 10, 12, 16, 20, 25];

  // Bar weight per meter (kg/m)
  const BAR_WEIGHT = {
    8: 0.395,
    10: 0.617,
    12: 0.888,
    16: 1.58,
    20: 2.47,
    25: 3.86
  };

  // Seismic factors by zone
  const SEISMIC_FACTORS = {
    'none': 1.0,
    'zone2': 1.1,
    'zone3': 1.15,
    'zone4': 1.2,
    'zone5': 1.3
  };

  // ==================== STATE MANAGEMENT ====================
  const [results, setResults] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Mode selection
  const [calculationMode, setCalculationMode] = useState('area');

  // Quick Area Method
  const [unit, setUnit] = useState('meter');
  const [areaLength, setAreaLength] = useState('');
  const [areaWidth, setAreaWidth] = useState('');
  const [floors, setFloors] = useState('');
  const [buildingType, setBuildingType] = useState('residential');
  const [areaWastage, setAreaWastage] = useState('5');

  // Element-wise Method
  const [slabs, setSlabs] = useState([{ length: '', width: '', thickness: '', diameter: '12', spacing: '150', layers: 2 }]);
  const [beams, setBeams] = useState([{ length: '', width: '', depth: '', count: '1', mainBars: '4', mainDia: '16', stirrupDia: '8', stirrupSpacing: '150' }]);
  const [columns, setColumns] = useState([{ height: '', width: '', depth: '', count: '1', verticalBars: '4', verticalDia: '16', stirrupDia: '8', stirrupSpacing: '150' }]);
  const [footings, setFootings] = useState([{ length: '', width: '', thickness: '', diameter: '12', spacing: '150', count: '1' }]);

  // BBS Mode
  const [bbsItems, setBbsItems] = useState([{ barMark: 'B1', diameter: '12', quantity: '50', cuttingLength: '2.5' }]);

  // Cost inputs
  const [steelRate, setSteelRate] = useState('60');
  const [labourRate, setLabourRate] = useState('500');
  const [fabricationRate, setFabricationRate] = useState('200');

  // Advanced options
  const [wastagePercent, setWastagePercent] = useState('5');
  const [seismicZone, setSeismicZone] = useState('none');
  const [apply456Rules, setApply456Rules] = useState(true);

  const [validationErrors, setValidationErrors] = useState([]);

  // ==================== CALCULATIONS ====================

  // Quick Area Method Calculation
  const calculateQuickArea = () => {
    const l = parseFloat(areaLength);
    const w = parseFloat(areaWidth);
    const f = parseFloat(floors);
    const builtUpArea = l * w * f;
    
    const factor = STEEL_FACTORS[buildingType] || 38;
    let steelKg = builtUpArea * factor;
    
    // Add wastage
    const waste = parseFloat(wastagePercent) / 100;
    steelKg = steelKg * (1 + waste);
    
    // Apply seismic
    const seismicFactor = SEISMIC_FACTORS[seismicZone] || 1.0;
    steelKg = steelKg * seismicFactor;

    return {
      builtUpArea: parseFloat(builtUpArea.toFixed(2)),
      steelKg: parseFloat(steelKg.toFixed(2)),
      steelTons: parseFloat((steelKg / 1000).toFixed(3))
    };
  };

  // Weight per meter formula: d²/162
  const getBarWeight = (diameter) => {
    return BAR_WEIGHT[diameter] || (Math.pow(diameter, 2) / 162).toFixed(4);
  };

  // Slab Calculation
  const calculateSlabSteel = (slab) => {
    const length = parseFloat(slab.length);
    const width = parseFloat(slab.width);
    const dia = parseFloat(slab.diameter);
    const spacing = parseFloat(slab.spacing);
    const layers = parseFloat(slab.layers);

    const barsLongitudinal = Math.ceil(width / spacing) + 1;
    const barsTransverse = Math.ceil(length / spacing) + 1;

    const longLength = barsLongitudinal * length;
    const transLength = barsTransverse * width;
    const totalBarLength = (longLength + transLength) * layers;

    const weight = getBarWeight(dia);
    const totalWeight = totalBarLength * weight;

    return parseFloat(totalWeight.toFixed(2));
  };

  // Beam Calculation
  const calculateBeamSteel = (beam) => {
    const beamLength = parseFloat(beam.length);
    const width = parseFloat(beam.width);
    const depth = parseFloat(beam.depth);
    const count = parseFloat(beam.count);
    const mainBars = parseFloat(beam.mainBars);
    const mainDia = parseFloat(beam.mainDia);
    const stirrupDia = parseFloat(beam.stirrupDia);
    const stirrupSpacing = parseFloat(beam.stirrupSpacing);

    // Main steel
    const mainSteel = mainBars * beamLength * getBarWeight(mainDia);

    // Stirrup steel
    const stirrupPerimeter = 2 * (width + depth);
    const stirrupCount = Math.ceil(beamLength / stirrupSpacing);
    const stirrupSteel = stirrupPerimeter * stirrupCount * getBarWeight(stirrupDia);

    const totalPerBeam = mainSteel + stirrupSteel;
    return parseFloat((totalPerBeam * count).toFixed(2));
  };

  // Column Calculation
  const calculateColumnSteel = (column) => {
    const height = parseFloat(column.height);
    const width = parseFloat(column.width);
    const depth = parseFloat(column.depth);
    const count = parseFloat(column.count);
    const verticalBars = parseFloat(column.verticalBars);
    const verticalDia = parseFloat(column.verticalDia);
    const stirrupDia = parseFloat(column.stirrupDia);
    const stirrupSpacing = parseFloat(column.stirrupSpacing);

    // Vertical steel
    const verticalSteel = verticalBars * height * getBarWeight(verticalDia);

    // Stirrup steel
    const stirrupPerimeter = 2 * (width + depth);
    const stirrupCount = Math.ceil(height / stirrupSpacing);
    const stirrupSteel = stirrupPerimeter * stirrupCount * getBarWeight(stirrupDia);

    const totalPerColumn = verticalSteel + stirrupSteel;
    return parseFloat((totalPerColumn * count).toFixed(2));
  };

  // Footing Calculation
  const calculateFootingSteel = (footing) => {
    const length = parseFloat(footing.length);
    const width = parseFloat(footing.width);
    const dia = parseFloat(footing.diameter);
    const spacing = parseFloat(footing.spacing);
    const count = parseFloat(footing.count);

    const barsLongitudinal = Math.ceil(width / spacing) + 1;
    const barsTransverse = Math.ceil(length / spacing) + 1;

    const longLength = barsLongitudinal * length;
    const transLength = barsTransverse * width;
    const totalBarLength = longLength + transLength;

    const weight = getBarWeight(dia);
    const steelPerFooting = totalBarLength * weight;

    return parseFloat((steelPerFooting * count).toFixed(2));
  };

  // Helper: Convert weight (kg) to length (mm) for specific diameter
  const convertWeightToLength = (weightKg, diameterMm) => {
    const weightPerMeter = Math.pow(diameterMm, 2) / 162; // kg/m
    const lengthMeters = weightKg / weightPerMeter;
    return lengthMeters * 1000; // Convert to mm
  };

  // Generate BBS from calculation mode
  const generateBBSFromMode = () => {
    const items = [];

    if (calculationMode === 'area') {
      // Quick Area: Assume typical residential mix (50% 12mm, 50% 16mm)
      const l = parseFloat(areaLength);
      const w = parseFloat(areaWidth);
      const f = parseFloat(floors);
      const builtUpArea = l * w * f;
      const factor = STEEL_FACTORS[buildingType] || 38;
      let steelKg = builtUpArea * factor;
      
      // Apply wastage and seismic
      const waste = parseFloat(wastagePercent) / 100;
      steelKg = steelKg * (1 + waste);
      const seismicFactor = SEISMIC_FACTORS[seismicZone] || 1.0;
      steelKg = steelKg * seismicFactor;

      // Create BBS: 50% 12mm, 50% 16mm with 5m typical cuts
      const half12 = steelKg * 0.5;
      const half16 = steelKg * 0.5;

      const len12 = convertWeightToLength(half12, 12);
      const len16 = convertWeightToLength(half16, 16);

      items.push({
        barMark: 'M1',
        diameter: 12,
        quantity: Math.ceil(len12 / 5000), // 5m cuts
        cuttingLength: 5000,
        totalLength: Math.ceil(len12 / 5000) * 5000,
        totalWeight: half12
      });

      items.push({
        barMark: 'M2',
        diameter: 16,
        quantity: Math.ceil(len16 / 5000),
        cuttingLength: 5000,
        totalLength: Math.ceil(len16 / 5000) * 5000,
        totalWeight: half16
      });

    } else if (calculationMode === 'element') {
      // Element-wise: Calculate from structural elements
      let slabSteel = 0, beamSteel = 0, columnSteel = 0, footingSteel = 0;

      slabs.forEach(slab => {
        if (slab.length && slab.width) slabSteel += calculateSlabSteel(slab);
      });

      beams.forEach(beam => {
        if (beam.length && beam.width && beam.depth) beamSteel += calculateBeamSteel(beam);
      });

      columns.forEach(column => {
        if (column.height && column.width && column.depth) columnSteel += calculateColumnSteel(column);
      });

      footings.forEach(footing => {
        if (footing.length && footing.width) footingSteel += calculateFootingSteel(footing);
      });

      let totalSteel = slabSteel + beamSteel + columnSteel + footingSteel;
      const waste = parseFloat(wastagePercent) / 100;
      totalSteel = totalSteel * (1 + waste);
      const seismicFactor = SEISMIC_FACTORS[seismicZone] || 1.0;
      totalSteel = totalSteel * seismicFactor;

      // Convert to BBS: Typical mix for structural elements
      // Slabs: 60% 12mm (main reinforcement)
      // Beams: 25% 16mm (main), 15% 8mm (stirrups)
      const slab60 = totalSteel * 0.60;
      const beam25 = totalSteel * 0.25;
      const beam15 = totalSteel * 0.15;

      const len12 = convertWeightToLength(slab60, 12);
      const len16 = convertWeightToLength(beam25, 16);
      const len8 = convertWeightToLength(beam15, 8);

      items.push({
        barMark: 'S1',
        diameter: 12,
        quantity: Math.ceil(len12 / 5000),
        cuttingLength: 5000,
        totalLength: Math.ceil(len12 / 5000) * 5000,
        totalWeight: slab60
      });

      items.push({
        barMark: 'B1',
        diameter: 16,
        quantity: Math.ceil(len16 / 3500),
        cuttingLength: 3500,
        totalLength: Math.ceil(len16 / 3500) * 3500,
        totalWeight: beam25
      });

      items.push({
        barMark: 'B2',
        diameter: 8,
        quantity: Math.ceil(len8 / 2000),
        cuttingLength: 2000,
        totalLength: Math.ceil(len8 / 2000) * 2000,
        totalWeight: beam15
      });

    } else if (calculationMode === 'bbs') {
      // BBS Mode: Use user-provided items
      bbsItems.forEach((item, idx) => {
        const dia = parseFloat(item.diameter);
        const qty = parseFloat(item.quantity);
        const cutLength = parseFloat(item.cuttingLength);
        const weight = getBarWeight(dia);
        const totalLength = qty * cutLength;
        const totalWeight = totalLength * weight;

        items.push({
          barMark: item.barMark || `B${idx + 1}`,
          diameter: dia,
          quantity: qty,
          cuttingLength: cutLength,
          totalLength: parseFloat(totalLength.toFixed(2)),
          weight: parseFloat(weight),
          totalWeight: parseFloat(totalWeight.toFixed(2))
        });
      });
    }

    return items;
  };

  // Professional FFD Bin Packing Algorithm for 12m bars
  const optimizeRebars = (bbsItems) => {
    const STANDARD_BAR_LENGTH = 12000; // mm (12 meters)

    // Safety check: return defaults if no items
    if (!bbsItems || bbsItems.length === 0) {
      return {
        barsRequired: 0,
        totalSuppliedLength: 0,
        totalUsedLength: 0,
        totalScrapLength: 0,
        scrapPercent: 0,
        utilizationPercent: 0
      };
    }

    // Step 1: Flatten BBS into individual cutting lengths
    const cuttingList = [];
    bbsItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        cuttingList.push({
          length: item.cuttingLength,
          diameter: item.diameter,
          barMark: item.barMark || 'M'
        });
      }
    });

    // Handle edge case: no cuts
    if (cuttingList.length === 0) {
      return {
        barsRequired: 0,
        totalSuppliedLength: 0,
        totalUsedLength: 0,
        totalScrapLength: 0,
        scrapPercent: 0,
        utilizationPercent: 0
      };
    }

    // Step 2: Sort descending (First Fit Decreasing algorithm)
    cuttingList.sort((a, b) => b.length - a.length);

    // Step 3: Bin packing - place cuts into 12m bars
    const bars = []; // Each bar tracks used length and contents

    cuttingList.forEach(cut => {
      let placed = false;

      // Try to fit into existing bar
      for (let i = 0; i < bars.length; i++) {
        if (bars[i].usedLength + cut.length <= STANDARD_BAR_LENGTH) {
          bars[i].lengths.push(cut.length);
          bars[i].usedLength += cut.length;
          placed = true;
          break;
        }
      }

      // Create new bar if doesn't fit
      if (!placed) {
        bars.push({
          usedLength: cut.length,
          lengths: [cut.length],
          scrap: STANDARD_BAR_LENGTH - cut.length
        });
      }
    });

    // Step 4: Calculate metrics
    const totalSuppliedLength = bars.length * STANDARD_BAR_LENGTH;
    const totalUsedLength = cuttingList.reduce((sum, cut) => sum + cut.length, 0);
    const totalScrapLength = totalSuppliedLength - totalUsedLength;
    const scrapPercent = ((totalScrapLength / totalSuppliedLength) * 100);
    const utilizationPercent = (100 - scrapPercent);

    return {
      barsRequired: bars.length,
      totalSuppliedLength: parseFloat(totalSuppliedLength.toFixed(2)),
      totalUsedLength: parseFloat(totalUsedLength.toFixed(2)),
      totalScrapLength: parseFloat(totalScrapLength.toFixed(2)),
      scrapPercent: parseFloat(scrapPercent.toFixed(2)),
      utilizationPercent: parseFloat(utilizationPercent.toFixed(2))
    };
  };

  // Main calculation trigger
  const runCalculation = () => {
    if (!validateInputs()) return;

    let steelData = {};
    let totalSteel = 0;

    if (calculationMode === 'area') {
      steelData = calculateQuickArea();
      totalSteel = steelData.steelKg;
    } else if (calculationMode === 'element') {
      let slabSteel = 0, beamSteel = 0, columnSteel = 0, footingSteel = 0;

      slabs.forEach(slab => {
        if (slab.length && slab.width) slabSteel += calculateSlabSteel(slab);
      });

      beams.forEach(beam => {
        if (beam.length && beam.width && beam.depth) beamSteel += calculateBeamSteel(beam);
      });

      columns.forEach(column => {
        if (column.height && column.width && column.depth) columnSteel += calculateColumnSteel(column);
      });

      footings.forEach(footing => {
        if (footing.length && footing.width) footingSteel += calculateFootingSteel(footing);
      });

      totalSteel = slabSteel + beamSteel + columnSteel + footingSteel;
      const waste = parseFloat(wastagePercent) / 100;
      totalSteel = totalSteel * (1 + waste);
      const seismicFactor = SEISMIC_FACTORS[seismicZone] || 1.0;
      totalSteel = totalSteel * seismicFactor;

      steelData = {
        slabSteel: parseFloat(slabSteel.toFixed(2)),
        beamSteel: parseFloat(beamSteel.toFixed(2)),
        columnSteel: parseFloat(columnSteel.toFixed(2)),
        footingSteel: parseFloat(footingSteel.toFixed(2)),
        subtotal: parseFloat((slabSteel + beamSteel + columnSteel + footingSteel).toFixed(2)),
        totalSteel: parseFloat(totalSteel.toFixed(2))
      };
    } else if (calculationMode === 'bbs') {
      let diameterTotal = {};
      let totalBBSSteel = 0;

      bbsItems.forEach(item => {
        const dia = parseFloat(item.diameter);
        const qty = parseFloat(item.quantity);
        const cutLength = parseFloat(item.cuttingLength);
        const weight = getBarWeight(dia);
        const totalWeight = qty * cutLength * weight;

        if (!diameterTotal[dia]) diameterTotal[dia] = 0;
        diameterTotal[dia] += totalWeight;
        totalBBSSteel += totalWeight;
      });

      totalSteel = totalBBSSteel;
      steelData = { diameterTotal };
    }

    // Cost calculation
    const costData = {
      materialCost: parseFloat((totalSteel * parseFloat(steelRate)).toFixed(2)),
      labourCost: parseFloat(((totalSteel / 1000) * parseFloat(labourRate)).toFixed(2)),
      fabricationCost: parseFloat(((totalSteel / 1000) * parseFloat(fabricationRate)).toFixed(2))
    };
    costData.totalCost = costData.materialCost + costData.labourCost + costData.fabricationCost;

    // Optimization: Generate BBS and run FFD bin packing
    const bbsItems_forOptimization = generateBBSFromMode();
    const optimization = optimizeRebars(bbsItems_forOptimization);

    const newResults = {
      ...steelData,
      totalSteel: parseFloat(totalSteel.toFixed(2)),
      steelTons: parseFloat((totalSteel / 1000).toFixed(3)),
      mode: calculationMode,
      wastagePercent: parseFloat(wastagePercent),
      seismicZone,
      costs: costData,
      optimization,
      bbsItems: bbsItems_forOptimization
    };

    setResults(newResults);
    setShowConfigModal(false);
  };

  // Validation
  const validateInputs = () => {
    const errors = [];

    if (calculationMode === 'area') {
      const l = parseFloat(areaLength);
      const w = parseFloat(areaWidth);
      const f = parseFloat(floors);

      if (!areaLength || isNaN(l) || l <= 0) errors.push('Length must be positive');
      if (!areaWidth || isNaN(w) || w <= 0) errors.push('Width must be positive');
      if (!floors || isNaN(f) || f <= 0 || f > 50) errors.push('Floors must be 1-50');
    }

    if (parseFloat(wastagePercent) < 0 || parseFloat(wastagePercent) > 30) {
      errors.push('Wastage must be 0-30%');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleReset = () => {
    setResults(null);
    setCalculationMode('area');
    setAreaLength('');
    setAreaWidth('');
    setFloors('');
    setSteelRate('60');
    setLabourRate('500');
    setFabricationRate('200');
    setValidationErrors([]);
    setShowConfigModal(false);
    setShowDetailsModal(false);
  };

  // ==================== MODAL COMPONENTS ====================

  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Structural Steel Estimation</h3>
            <p className="text-sm text-gray-600 mt-1">Professional COQ estimator for contractors</p>
          </div>
          <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Calculation Mode Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">Calculation Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'area', label: '📐 Quick Area Method' },
                { id: 'element', label: '🏗 Element-wise Method' },
                { id: 'bbs', label: '📋 BBS Generator' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setCalculationMode(mode.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left font-medium text-sm ${
                    calculationMode === mode.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Area Method */}
          {calculationMode === 'area' && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="areaLength" className="block text-xs font-medium text-gray-700">Length (m)</label>
                  <input id="areaLength" type="number" value={areaLength} onChange={(e) => setAreaLength(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
                </div>
                <div>
                  <label htmlFor="areaWidth" className="block text-xs font-medium text-gray-700">Width (m)</label>
                  <input id="areaWidth" type="number" value={areaWidth} onChange={(e) => setAreaWidth(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
                </div>
                <div>
                  <label htmlFor="floors" className="block text-xs font-medium text-gray-700">Floors</label>
                  <input id="floors" type="number" value={floors} onChange={(e) => setFloors(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="1" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Building Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STEEL_FACTORS).map(([type, factor]) => (
                    <button key={type} onClick={() => setBuildingType(type)} className={`p-2 rounded border-2 text-xs font-medium capitalize ${buildingType === type ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                      {type} ({factor} kg/m²)
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Element-wise Method - Slabs */}
          {calculationMode === 'element' && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Slabs</label>
                {slabs.map((slab, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 mb-2 p-2 bg-gray-50 rounded">
                    <input type="number" value={slab.length} onChange={(e) => { const newSlabs = [...slabs]; newSlabs[idx].length = e.target.value; setSlabs(newSlabs); }} placeholder="Length" className="px-2 py-1 border text-xs rounded" step="0.1" />
                    <input type="number" value={slab.width} onChange={(e) => { const newSlabs = [...slabs]; newSlabs[idx].width = e.target.value; setSlabs(newSlabs); }} placeholder="Width" className="px-2 py-1 border text-xs rounded" step="0.1" />
                    <input type="number" value={slab.thickness} onChange={(e) => { const newSlabs = [...slabs]; newSlabs[idx].thickness = e.target.value; setSlabs(newSlabs); }} placeholder="Thickness" className="px-2 py-1 border text-xs rounded" step="0.1" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Beams</label>
                {beams.map((beam, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 mb-2 p-2 bg-gray-50 rounded">
                    <input type="number" value={beam.length} onChange={(e) => { const newBeams = [...beams]; newBeams[idx].length = e.target.value; setBeams(newBeams); }} placeholder="Length" className="px-2 py-1 border text-xs rounded" step="0.1" />
                    <input type="number" value={beam.width} onChange={(e) => { const newBeams = [...beams]; newBeams[idx].width = e.target.value; setBeams(newBeams); }} placeholder="Width" className="px-2 py-1 border text-xs rounded" step="0.1" />
                    <input type="number" value={beam.depth} onChange={(e) => { const newBeams = [...beams]; newBeams[idx].depth = e.target.value; setBeams(newBeams); }} placeholder="Depth" className="px-2 py-1 border text-xs rounded" step="0.1" />
                    <input type="number" value={beam.count} onChange={(e) => { const newBeams = [...beams]; newBeams[idx].count = e.target.value; setBeams(newBeams); }} placeholder="Count" className="px-2 py-1 border text-xs rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Advanced Options */}
          <div className="border-t border-gray-200 pt-4 grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="wastagePercent" className="block text-xs font-medium text-gray-700">Wastage (%)</label>
              <input id="wastagePercent" type="number" value={wastagePercent} onChange={(e) => setWastagePercent(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
            </div>
            <div>
              <label htmlFor="steelRate" className="block text-xs font-medium text-gray-700">Steel Rate (₹/kg)</label>
              <input id="steelRate" type="number" value={steelRate} onChange={(e) => setSteelRate(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" />
            </div>
            <div>
              <label htmlFor="seismic" className="block text-xs font-medium text-gray-700">Seismic Zone</label>
              <select id="seismic" value={seismicZone} onChange={(e) => setSeismicZone(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                {Object.keys(SEISMIC_FACTORS).map(z => <option key={z} value={z}>{z.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
            <button onClick={() => setShowConfigModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 rounded-lg text-sm">
              Cancel
            </button>
            <button onClick={runCalculation} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm">
              Calculate & Estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const DetailsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Professional Estimation Breakdown</h3>
          <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {results && (
          <div className="p-6 space-y-4">
            {/* Main Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Steel Required</p>
              <p className="text-4xl font-bold text-blue-600">{results.totalSteel.toLocaleString()} kg</p>
              <p className="text-sm text-gray-600 mt-1">≈ {results.steelTons} tons | Mode: {results.mode.toUpperCase()} | Wastage: {results.wastagePercent}%</p>
            </div>

            {/* Structural Summary */}
            {results.mode === 'element' && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b font-bold text-sm">Structural Element Summary</div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Slab Steel</span><span className="font-bold">{results.slabSteel} kg</span></div>
                  <div className="flex justify-between"><span>Beam Steel</span><span className="font-bold">{results.beamSteel} kg</span></div>
                  <div className="flex justify-between"><span>Column Steel</span><span className="font-bold">{results.columnSteel} kg</span></div>
                  <div className="flex justify-between"><span>Footing Steel</span><span className="font-bold">{results.footingSteel} kg</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold"><span>Subtotal</span><span>{results.subtotal} kg</span></div>
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm">Cost Breakdown (₹)</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Material Cost</span><span>₹{results.costs.materialCost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Labour Cost</span><span>₹{results.costs.labourCost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Fabrication Cost</span><span>₹{results.costs.fabricationCost.toLocaleString()}</span></div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Total Estimated Cost</span><span className="text-green-600">₹{results.costs.totalCost.toLocaleString()}</span></div>
              </div>
            </div>

            {/* Optimization Report */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm">12m Bar Optimization Report</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Bars Required</span><span className="font-bold text-blue-600">{results.optimization?.barsRequired || 0}</span></div>
                <div className="flex justify-between"><span>Total Supplied Length</span><span className="font-bold">{(results.optimization?.totalSuppliedLength || 0).toLocaleString()} mm</span></div>
                <div className="flex justify-between"><span>Total Used Length</span><span className="font-bold">{(results.optimization?.totalUsedLength || 0).toLocaleString()} mm</span></div>
                <div className="flex justify-between"><span>Total Scrap Volume</span><span className="font-bold text-orange-600">{(results.optimization?.totalScrapLength || 0).toLocaleString()} mm</span></div>
                <div className="flex justify-between pt-2 border-t"><span>Scrap Percentage</span><span className="font-bold text-orange-600">{results.optimization?.scrapPercent || 0}%</span></div>
                <div className="flex justify-between"><span>Utilization Efficiency</span><span className="font-bold text-green-600">{results.optimization?.utilizationPercent || 0}%</span></div>
              </div>
            </div>

            <button onClick={() => setShowDetailsModal(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================
  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      {!results ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Professional Structural Steel</h3>
            <p className="text-xs text-gray-600 mt-1">Contractor-grade BOQ estimation system</p>
          </div>
          <button onClick={() => setShowConfigModal(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm">
            Start Estimation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600">Total Steel</p>
              <p className="text-2xl font-bold text-blue-600">{results.totalSteel.toLocaleString()}</p>
              <p className="text-xs text-gray-600">kg ({results.steelTons} tons)</p>
              <button onClick={() => setShowDetailsModal(true)} className="mt-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs">
                <Info size={14} /> Details
              </button>
            </div>

            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-green-600">₹{results.costs.totalCost.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Material + Labour</p>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600">Bars Required (12m)</p>
              <p className="text-2xl font-bold text-purple-600">{results.optimization?.barsRequired || 0}</p>
              <p className="text-xs text-gray-600">Scrap: {results.optimization?.scrapPercent || 0}%</p>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600">Bar Efficiency</p>
              <p className="text-2xl font-bold text-orange-600">{results.optimization?.utilizationPercent || 0}%</p>
              <p className="text-xs text-gray-600">Utilization</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
              <RotateCcw size={16} /> Reset
            </button>
            <button onClick={() => setShowConfigModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors text-sm">
              Edit Estimation
            </button>
          </div>
        </div>
      )}

      {showConfigModal && ReactDOM.createPortal(<ConfigModal />, document.body)}
      {showDetailsModal && ReactDOM.createPortal(<DetailsModal />, document.body)}
    </div>
  );
};

export default SteelEstimationCalculator;
