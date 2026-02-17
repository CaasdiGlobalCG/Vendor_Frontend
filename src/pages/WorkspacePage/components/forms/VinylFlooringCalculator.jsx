import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, AlertCircle, Info, X } from 'lucide-react';

const VinylFlooringCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  // ==================== CONSTANTS ====================
  const FEET_TO_METER = 0.3048;
  const METER_TO_FEET = 3.28084;
  
  // Adhesive coverage per bucket (m²)
  const ADHESIVE_COVERAGE = {
    'sheet': 15, // m² per bucket for sheet flooring
    'plank': 20, // m² per bucket for planks
    'tile': 18   // m² per bucket for tiles
  };

  // Underlayment coverage (m²/roll)
  const UNDERLAYMENT_COVERAGE = 25;

  // Pattern layout factors
  const PATTERN_FACTORS = {
    'straight': 1.0,
    'staggered': 1.05,
    'herringbone': 1.12
  };

  // Traffic grade multipliers (commercial)
  const TRAFFIC_GRADES = {
    'residential': 1.0,
    'light-commercial': 1.08,
    'heavy-commercial': 1.15
  };

  // Standard thickness options (mm)
  const THICKNESS_OPTIONS = [
    { label: '2mm', value: 2 },
    { label: '3mm', value: 3 },
    { label: '5mm', value: 5 },
    { label: '8mm', value: 8 }
  ];

  // ==================== STATE MANAGEMENT ====================
  const [results, setResults] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Mode selection
  const [flooringType, setFlooringType] = useState('sheet');

  // General inputs
  const [unit, setUnit] = useState('meter');
  const [roomLength, setRoomLength] = useState('');
  const [roomWidth, setRoomWidth] = useState('');
  const [wastagePercent, setWastagePercent] = useState('8');
  const [installationType, setInstallationType] = useState('glue-down');

  // Sheet-specific
  const [rollWidth, setRollWidth] = useState('3.66');
  const [rollLength, setRollLength] = useState('');
  const [seamAllowance, setSeamAllowance] = useState('5');
  const [overlapAllowance, setOverlapAllowance] = useState('3');

  // Plank/Tile-specific
  const [plankLength, setPlankLength] = useState('1.2');
  const [plankWidth, setPlankWidth] = useState('0.2');
  const [piecesPerBox, setPiecesPerBox] = useState('10');
  const [coveragePerBox, setCoveragePerBox] = useState('2.4');
  const [patternLayout, setPatternLayout] = useState('straight');

  // Installation materials
  const [needsPrimer, setNeedsPrimer] = useState(false);
  const [unevenFloorPercent, setUnevenFloorPercent] = useState('0');
  const [expansionGap, setExpansionGap] = useState('8');

  // Commercial options
  const [trafficGrade, setTrafficGrade] = useState('residential');
  const [thickness, setThickness] = useState('3');

  // Cost inputs
  const [costPerM2, setCostPerM2] = useState('500');
  const [costPerBox, setCostPerBox] = useState('1200');
  const [adhesiveCost, setAdhesiveCost] = useState('800');
  const [underlaymentCost, setUnderlaymentCost] = useState('2000');
  const [laborCostPerM2, setLaborCostPerM2] = useState('100');
  const [currency, setCurrency] = useState('₹');

  const [validationErrors, setValidationErrors] = useState([]);

  // ==================== CALCULATION FUNCTIONS ====================

  // Helper: Convert area to meters if needed
  const convertAreaToMeters = (length, width) => {
    let l = parseFloat(length);
    let w = parseFloat(width);
    
    if (unit === 'feet') {
      l = l * FEET_TO_METER;
      w = w * FEET_TO_METER;
    }
    
    return l * w;
  };

  // Helper: Convert value to meters
  const toMeters = (value) => {
    let v = parseFloat(value);
    if (unit === 'feet') v = v * FEET_TO_METER;
    return v;
  };

  // Calculate base room area
  const calculateRoomArea = () => {
    return convertAreaToMeters(roomLength, roomWidth);
  };

  // Calculate adjusted area with wastage
  const calculateAdjustedArea = (baseArea) => {
    const waste = parseFloat(wastagePercent) / 100;
    const patternFactor = PATTERN_FACTORS[patternLayout] || 1.0;
    const trafficFactor = TRAFFIC_GRADES[trafficGrade] || 1.0;
    
    return baseArea * (1 + waste) * patternFactor * trafficFactor;
  };

  // Sheet / Roll flooring calculation
  const calculateSheetFlooring = (adjArea) => {
    const rWidth = toMeters(rollWidth);
    const rLength = rollLength ? toMeters(rollLength) : 10; // Default 10m if not specified
    const rollArea = rWidth * rLength;
    
    const seamAllowanceVal = parseFloat(seamAllowance) / 100;
    const adjustedArea = adjArea * (1 + seamAllowanceVal);
    
    const rollsRequired = Math.ceil(adjustedArea / rollArea);
    const estimatedSeams = rollsRequired - 1; // Seams between rolls
    
    return {
      rollsRequired,
      totalLinearMeters: rollsRequired * rLength,
      seamCount: estimatedSeams,
      adjustedArea: parseFloat(adjustedArea.toFixed(2))
    };
  };

  // Plank / Tile flooring calculation
  const calculatePlankFlooring = (adjArea) => {
    const pLength = toMeters(plankLength);
    const pWidth = toMeters(plankWidth);
    const tileArea = pLength * pWidth;
    
    const tilesRequired = Math.ceil(adjArea / tileArea);
    const boxesRequired = Math.ceil(tilesRequired / parseFloat(piecesPerBox));
    
    return {
      tilesRequired,
      boxesRequired,
      totalCoverage: parseFloat((tilesRequired * tileArea).toFixed(2))
    };
  };

  // Adhesive calculation
  const calculateAdhesive = (adjArea) => {
    const coverage = ADHESIVE_COVERAGE[flooringType] || 18;
    const bucketsRequired = Math.ceil(adjArea / coverage);
    
    return {
      bucketsRequired,
      actualCoverage: bucketsRequired * coverage
    };
  };

  // Underlayment calculation
  const calculateUnderlayment = (adjArea) => {
    if (installationType !== 'click-lock' && installationType !== 'floating') {
      return { underlaymentRequired: 0, rolls: 0 };
    }
    
    const overlap = 1.05; // 5% overlap
    const underlayArea = adjArea * overlap;
    const rolls = Math.ceil(underlayArea / UNDERLAYMENT_COVERAGE);
    
    return {
      underlaymentRequired: parseFloat(underlayArea.toFixed(2)),
      rolls
    };
  };

  // Self-leveling compound calculation
  const calculateSelfLeveling = (adjArea) => {
    const unevenPercent = parseFloat(unevenFloorPercent) / 100;
    const slcArea = adjArea * unevenPercent;
    const coverage = 2; // m² per kg
    const kgRequired = Math.ceil(slcArea / coverage);
    
    return kgRequired > 0 ? kgRequired : 0;
  };

  // Cost calculation
  const calculateCosts = (baseArea, adjArea, materials) => {
    const vinylCost = materials.vinylQuantity * parseFloat(costPerM2);
    const boxCost = materials.boxesRequired 
      ? materials.boxesRequired * parseFloat(costPerBox) 
      : 0;
    
    const adhesiveCostValue = materials.adhesive.bucketsRequired * parseFloat(adhesiveCost);
    const underlaymentCostValue = materials.underlayment.rolls 
      ? materials.underlayment.rolls * parseFloat(underlaymentCost) 
      : 0;
    
    const laborCost = baseArea * parseFloat(laborCostPerM2);
    
    return {
      vinylCost: parseFloat(vinylCost.toFixed(2)),
      boxCost: parseFloat(boxCost.toFixed(2)),
      adhesiveCost: parseFloat(adhesiveCostValue.toFixed(2)),
      underlaymentCost: parseFloat(underlaymentCostValue.toFixed(2)),
      laborCost: parseFloat(laborCost.toFixed(2)),
      totalMaterialCost: parseFloat((vinylCost + boxCost + adhesiveCostValue + underlaymentCostValue).toFixed(2)),
      grandTotal: parseFloat((vinylCost + boxCost + adhesiveCostValue + underlaymentCostValue + laborCost).toFixed(2))
    };
  };

  // Main calculation
  const runCalculation = () => {
    if (!validateInputs()) return;

    const baseArea = calculateRoomArea();
    const adjustedArea = calculateAdjustedArea(baseArea);

    let materials = {
      adhesive: calculateAdhesive(adjustedArea),
      underlayment: calculateUnderlayment(adjustedArea),
      selfLeveling: calculateSelfLeveling(adjustedArea),
      expansionGap: parseFloat(expansionGap)
    };

    if (flooringType === 'sheet') {
      const sheetData = calculateSheetFlooring(adjustedArea);
      materials.rollsRequired = sheetData.rollsRequired;
      materials.seamCount = sheetData.seamCount;
      materials.vinylQuantity = sheetData.adjustedArea;
    } else {
      const plankData = calculatePlankFlooring(adjustedArea);
      materials.tilesRequired = plankData.tilesRequired;
      materials.boxesRequired = plankData.boxesRequired;
      materials.vinylQuantity = plankData.totalCoverage;
    }

    const costs = calculateCosts(baseArea, adjustedArea, materials);

    const newResults = {
      baseArea: parseFloat(baseArea.toFixed(2)),
      adjustedArea: parseFloat(adjustedArea.toFixed(2)),
      materials,
      costs,
      flooringType,
      installationType,
      patternLayout,
      trafficGrade,
      thickness,
      wastagePercent: parseFloat(wastagePercent)
    };

    setResults(newResults);
    setShowConfigModal(false);
  };

  // Validation
  const validateInputs = () => {
    const errors = [];

    const l = parseFloat(roomLength);
    const w = parseFloat(roomWidth);

    if (!roomLength || isNaN(l) || l <= 0) errors.push('Room length must be positive');
    if (!roomWidth || isNaN(w) || w <= 0) errors.push('Room width must be positive');

    if (flooringType === 'sheet') {
      const rw = parseFloat(rollWidth);
      if (!rollWidth || isNaN(rw) || rw <= 0) errors.push('Roll width must be positive');
    } else {
      const pl = parseFloat(plankLength);
      const pw = parseFloat(plankWidth);
      if (!plankLength || isNaN(pl) || pl <= 0) errors.push('Plank/Tile length must be positive');
      if (!plankWidth || isNaN(pw) || pw <= 0) errors.push('Plank/Tile width must be positive');
    }

    const waste = parseFloat(wastagePercent);
    if (waste < 0 || waste > 30) errors.push('Wastage must be 0-30%');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleReset = () => {
    setResults(null);
    setFlooringType('sheet');
    setRoomLength('');
    setRoomWidth('');
    setWastagePercent('8');
    setCostPerM2('500');
    setLaborCostPerM2('100');
    setValidationErrors([]);
    setShowConfigModal(false);
    setShowDetailsModal(false);
  };

  // ==================== MODAL COMPONENTS ====================

  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Vinyl Flooring Calculator</h3>
            <p className="text-sm text-gray-600 mt-1">Professional contractor-grade estimator</p>
          </div>
          <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Flooring Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900">Flooring Type</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'sheet', label: '🌊 Vinyl Sheet' },
                { id: 'plank', label: '🪵 Vinyl Plank (LVP)' },
                { id: 'tile', label: '⬜ Vinyl Tile' },
                { id: 'roll', label: '📦 Commercial Roll' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setFlooringType(type.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left font-medium text-xs ${
                    flooringType === type.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* General Inputs */}
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label htmlFor="unit" className="block text-xs font-medium text-gray-700">Unit</label>
                <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                  <option value="meter">Meter (m)</option>
                  <option value="feet">Feet (ft)</option>
                </select>
              </div>
              <div>
                <label htmlFor="roomLength" className="block text-xs font-medium text-gray-700">Length ({unit === 'meter' ? 'm' : 'ft'})</label>
                <input id="roomLength" type="number" value={roomLength} onChange={(e) => setRoomLength(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
              </div>
              <div>
                <label htmlFor="roomWidth" className="block text-xs font-medium text-gray-700">Width ({unit === 'meter' ? 'm' : 'ft'})</label>
                <input id="roomWidth" type="number" value={roomWidth} onChange={(e) => setRoomWidth(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
              </div>
              <div>
                <label htmlFor="wastage" className="block text-xs font-medium text-gray-700">Wastage (%)</label>
                <input id="wastage" type="number" value={wastagePercent} onChange={(e) => setWastagePercent(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="installation" className="block text-xs font-medium text-gray-700">Installation Type</label>
                <select id="installation" value={installationType} onChange={(e) => setInstallationType(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                  <option value="glue-down">Glue-down</option>
                  <option value="click-lock">Click-lock (Floating)</option>
                  <option value="loose-lay">Loose Lay</option>
                </select>
              </div>
              <div>
                <label htmlFor="traffic" className="block text-xs font-medium text-gray-700">Traffic Grade</label>
                <select id="traffic" value={trafficGrade} onChange={(e) => setTrafficGrade(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                  <option value="residential">Residential</option>
                  <option value="light-commercial">Light Commercial</option>
                  <option value="heavy-commercial">Heavy Commercial</option>
                </select>
              </div>
              <div>
                <label htmlFor="thickness" className="block text-xs font-medium text-gray-700">Thickness</label>
                <select id="thickness" value={thickness} onChange={(e) => setThickness(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                  {THICKNESS_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Sheet-specific inputs */}
          {(flooringType === 'sheet' || flooringType === 'roll') && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <label className="block text-sm font-bold text-gray-900">Sheet Specifications</label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label htmlFor="rollWidth" className="block text-xs font-medium text-gray-700">Roll Width (m)</label>
                  <input id="rollWidth" type="number" value={rollWidth} onChange={(e) => setRollWidth(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
                </div>
                <div>
                  <label htmlFor="rollLength" className="block text-xs font-medium text-gray-700">Roll Length (m) (optional)</label>
                  <input id="rollLength" type="number" value={rollLength} onChange={(e) => setRollLength(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
                </div>
                <div>
                  <label htmlFor="seamAllowance" className="block text-xs font-medium text-gray-700">Seam Allowance (%)</label>
                  <input id="seamAllowance" type="number" value={seamAllowance} onChange={(e) => setSeamAllowance(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.1" />
                </div>
                <div>
                  <label htmlFor="expansionGap" className="block text-xs font-medium text-gray-700">Expansion Gap (mm)</label>
                  <input id="expansionGap" type="number" value={expansionGap} onChange={(e) => setExpansionGap(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Plank/Tile-specific inputs */}
          {(flooringType === 'plank' || flooringType === 'tile') && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <label className="block text-sm font-bold text-gray-900">Plank/Tile Specifications</label>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label htmlFor="plankLength" className="block text-xs font-medium text-gray-700">Length (m)</label>
                  <input id="plankLength" type="number" value={plankLength} onChange={(e) => setPlankLength(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.01" />
                </div>
                <div>
                  <label htmlFor="plankWidth" className="block text-xs font-medium text-gray-700">Width (m)</label>
                  <input id="plankWidth" type="number" value={plankWidth} onChange={(e) => setPlankWidth(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" step="0.01" />
                </div>
                <div>
                  <label htmlFor="piecesPerBox" className="block text-xs font-medium text-gray-700">Pieces/Box</label>
                  <input id="piecesPerBox" type="number" value={piecesPerBox} onChange={(e) => setPiecesPerBox(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label htmlFor="pattern" className="block text-xs font-medium text-gray-700">Pattern</label>
                  <select id="pattern" value={patternLayout} onChange={(e) => setPatternLayout(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                    <option value="straight">Straight</option>
                    <option value="staggered">Staggered (+5%)</option>
                    <option value="herringbone">Herringbone (+12%)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Cost inputs */}
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <label className="block text-sm font-bold text-gray-900">Cost Information</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="costPerM2" className="block text-xs font-medium text-gray-700">Cost per m² ({currency})</label>
                <input id="costPerM2" type="number" value={costPerM2} onChange={(e) => setCostPerM2(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" />
              </div>
              <div>
                <label htmlFor="adhesiveCost" className="block text-xs font-medium text-gray-700">Adhesive/Bucket ({currency})</label>
                <input id="adhesiveCost" type="number" value={adhesiveCost} onChange={(e) => setAdhesiveCost(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" />
              </div>
              <div>
                <label htmlFor="laborCost" className="block text-xs font-medium text-gray-700">Labor per m² ({currency})</label>
                <input id="laborCost" type="number" value={laborCostPerM2} onChange={(e) => setLaborCostPerM2(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded text-sm" />
              </div>
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
              Calculate Estimate
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
          <h3 className="text-xl font-bold text-gray-900">Professional Flooring Breakdown</h3>
          <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {results && (
          <div className="p-6 space-y-4">
            {/* Coverage Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm font-bold text-gray-900 mb-3">Coverage Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Base Room Area</span><span className="font-bold">{results.baseArea} m²</span></div>
                <div className="flex justify-between"><span>Wastage Applied</span><span className="font-bold">{results.wastagePercent}%</span></div>
                <div className="flex justify-between"><span>Pattern Factor</span><span className="font-bold">{PATTERN_FACTORS[results.patternLayout] || 1}x</span></div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Total Adjusted Area</span><span className="text-blue-600">{results.adjustedArea} m²</span></div>
              </div>
            </div>

            {/* Material Requirements */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm">Material Requirements</div>
              <div className="p-4 space-y-2 text-sm">
                {results.materials.rollsRequired && (
                  <>
                    <div className="flex justify-between"><span>Rolls Required</span><span className="font-bold text-blue-600">{results.materials.rollsRequired}</span></div>
                    <div className="flex justify-between"><span>Estimated Seams</span><span className="font-bold">{results.materials.seamCount}</span></div>
                  </>
                )}
                {results.materials.tilesRequired && (
                  <>
                    <div className="flex justify-between"><span>Total {results.flooringType === 'plank' ? 'Planks' : 'Tiles'}</span><span className="font-bold text-blue-600">{results.materials.tilesRequired}</span></div>
                    <div className="flex justify-between"><span>Boxes Required</span><span className="font-bold text-blue-600">{results.materials.boxesRequired}</span></div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t"><span>Adhesive Buckets</span><span className="font-bold">{results.materials.adhesive.bucketsRequired}</span></div>
                {results.materials.underlayment.rolls > 0 && (
                  <div className="flex justify-between"><span>Underlayment Rolls</span><span className="font-bold">{results.materials.underlayment.rolls}</span></div>
                )}
                {results.materials.selfLeveling > 0 && (
                  <div className="flex justify-between"><span>Self-leveling Compound</span><span className="font-bold">{results.materials.selfLeveling} kg</span></div>
                )}
                <div className="flex justify-between"><span>Expansion Gap</span><span className="font-bold">{results.materials.expansionGap} mm</span></div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm">Cost Breakdown ({currency})</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Vinyl Material</span><span>{currency}{results.costs.vinylCost.toLocaleString()}</span></div>
                {results.costs.boxCost > 0 && (
                  <div className="flex justify-between"><span>Box Cost</span><span>{currency}{results.costs.boxCost.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between"><span>Adhesive</span><span>{currency}{results.costs.adhesiveCost.toLocaleString()}</span></div>
                {results.costs.underlaymentCost > 0 && (
                  <div className="flex justify-between"><span>Underlayment</span><span>{currency}{results.costs.underlaymentCost.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between pt-2 border-t"><span>Material Subtotal</span><span className="font-bold">{currency}{results.costs.totalMaterialCost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Labor Cost</span><span className="font-bold">{currency}{results.costs.laborCost.toLocaleString()}</span></div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Grand Total</span><span className="text-green-600">{currency}{results.costs.grandTotal.toLocaleString()}</span></div>
              </div>
            </div>

            {/* Layout Notes */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm">Installation Notes</div>
              <div className="p-4 space-y-2 text-sm">
                <div><span className="font-bold">Type:</span> {results.flooringType.toUpperCase()}</div>
                <div><span className="font-bold">Installation:</span> {results.installationType.toUpperCase()}</div>
                <div><span className="font-bold">Pattern:</span> {results.patternLayout === 'straight' ? 'Straight' : results.patternLayout === 'staggered' ? 'Staggered' : 'Herringbone'}</div>
                <div><span className="font-bold">Traffic Grade:</span> {results.trafficGrade.charAt(0).toUpperCase() + results.trafficGrade.slice(1)}</div>
                <div><span className="font-bold">Thickness:</span> {results.thickness} mm</div>
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
            <h3 className="text-lg font-bold text-gray-900">Professional Vinyl Flooring</h3>
            <p className="text-xs text-gray-600 mt-1">Contractor-grade cost estimator</p>
          </div>
          <button onClick={() => setShowConfigModal(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm">
            Start Estimation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600">Total Area to Cover</p>
              <p className="text-2xl font-bold text-blue-600">{results.adjustedArea}</p>
              <p className="text-xs text-gray-600">m² (with {results.wastagePercent}% wastage)</p>
              <button onClick={() => setShowDetailsModal(true)} className="mt-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs">
                <Info size={14} /> Details
              </button>
            </div>

            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600">Total Estimated Cost</p>
              <p className="text-2xl font-bold text-green-600">{currency}{results.costs.grandTotal.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Material + Labor</p>
            </div>

            {results.materials.boxesRequired && (
              <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Boxes Required</p>
                <p className="text-2xl font-bold text-purple-600">{results.materials.boxesRequired}</p>
                <p className="text-xs text-gray-600">{results.materials.tilesRequired} pieces</p>
              </div>
            )}

            {results.materials.rollsRequired && (
              <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Rolls Required</p>
                <p className="text-2xl font-bold text-orange-600">{results.materials.rollsRequired}</p>
                <p className="text-xs text-gray-600">{results.materials.seamCount} seams</p>
              </div>
            )}
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

export default VinylFlooringCalculator;
