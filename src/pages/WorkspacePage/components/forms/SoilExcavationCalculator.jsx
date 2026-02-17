import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, AlertCircle, Info, X } from 'lucide-react';

const SoilExcavationCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  // ==================== CONSTANTS ====================
  const FEET_TO_METER = 0.3048;
  const PI = 3.1416;

  // Swell factors for different soil types
  const SWELL_FACTORS = {
    'loose': 0.10,      // 10%
    'medium': 0.20,     // 20%
    'hard': 0.30,       // 30%
    'rock': 0.50        // 50%
  };

  // Soil density (kg/m³)
  const SOIL_DENSITY = {
    'loose': 1600,
    'medium': 1800,
    'hard': 2000,
    'rock': 2400
  };

  // Vehicle capacities (m³)
  const VEHICLE_CAPACITY = {
    'tractor': 3,
    '6-wheeler': 6,
    '10-wheeler': 10
  };

  // ==================== STATE MANAGEMENT ====================
  const [results, setResults] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state
  const [unit, setUnit] = useState('meter');
  const [excavationType, setExcavationType] = useState('rectangular');
  
  // Dimensions
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [diameter, setDiameter] = useState('');
  const [depth, setDepth] = useState('');
  
  // Soil settings
  const [soilType, setSoilType] = useState('medium');
  const [safetyMargin, setSafetyMargin] = useState(String(0));
  const [overExcavation, setOverExcavation] = useState(String(0));
  
  // Cost inputs
  const [excavationRate, setExcavationRate] = useState(String(500));
  const [loadingRate, setLoadingRate] = useState(String(300));
  const [transportationRate, setTransportationRate] = useState(String(800));
  const [dumpingFee, setDumpingFee] = useState(String(100));
  
  const [validationErrors, setValidationErrors] = useState([]);

  // ==================== VALIDATION ====================
  const validateInputs = () => {
    const errors = [];
    
    let l, w, d, dia;
    
    if (excavationType === 'rectangular' || excavationType === 'trench') {
      l = parseFloat(length);
      w = parseFloat(width);
      d = parseFloat(depth);
      
      if (length === '' || isNaN(l) || l <= 0) errors.push('Length must be a positive number');
      if (width === '' || isNaN(w) || w <= 0) errors.push('Width must be a positive number');
      if (depth === '' || isNaN(d) || d <= 0) errors.push('Depth must be a positive number');
      
      if (d > 20) errors.push('Depth seems unrealistic (>20m)');
    } else if (excavationType === 'circular') {
      dia = parseFloat(diameter);
      d = parseFloat(depth);
      
      if (diameter === '' || isNaN(dia) || dia <= 0) errors.push('Diameter must be a positive number');
      if (depth === '' || isNaN(d) || d <= 0) errors.push('Depth must be a positive number');
      
      if (d > 20) errors.push('Depth seems unrealistic (>20m)');
    }
    
    const sm = parseFloat(safetyMargin);
    const oe = parseFloat(overExcavation);
    
    if (isNaN(sm) || sm < 0 || sm > 20) errors.push('Safety margin must be 0-20%');
    if (isNaN(oe) || oe < 0 || oe > 20) errors.push('Over-excavation must be 0-20%');
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // ==================== CALCULATION ENGINE ====================

  const convertToMeters = (value) => {
    return unit === 'feet' ? value * FEET_TO_METER : value;
  };

  const calculateVolume = () => {
    let volume = 0;
    
    if (excavationType === 'rectangular' || excavationType === 'trench') {
      const l = convertToMeters(parseFloat(length));
      const w = convertToMeters(parseFloat(width));
      const d = convertToMeters(parseFloat(depth));
      volume = l * w * d;
    } else if (excavationType === 'circular') {
      const dia = convertToMeters(parseFloat(diameter));
      const r = dia / 2;
      const d = convertToMeters(parseFloat(depth));
      volume = PI * r * r * d;
    }
    
    return parseFloat(volume.toFixed(2));
  };

  const calculateAdjustedVolume = (baseVolume) => {
    const sm = parseFloat(safetyMargin) / 100;
    const oe = parseFloat(overExcavation) / 100;
    const adjustedVolume = baseVolume * (1 + sm) * (1 + oe);
    return parseFloat(adjustedVolume.toFixed(2));
  };

  const calculateLooseVolume = (volume) => {
    const swellFactor = SWELL_FACTORS[soilType] || 0.20;
    const looseVolume = volume * (1 + swellFactor);
    return parseFloat(looseVolume.toFixed(2));
  };

  const calculateSoilWeight = (volume) => {
    const density = SOIL_DENSITY[soilType] || 1800;
    const weightKg = volume * density;
    const weightTons = weightKg / 1000;
    return parseFloat(weightTons.toFixed(2));
  };

  const calculateLoads = (looseVolume) => {
    return {
      tractorLoads: Math.ceil(looseVolume / VEHICLE_CAPACITY.tractor),
      sixWheelerLoads: Math.ceil(looseVolume / VEHICLE_CAPACITY['6-wheeler']),
      tenWheelerLoads: Math.ceil(looseVolume / VEHICLE_CAPACITY['10-wheeler'])
    };
  };

  const calculateCosts = (baseVolume) => {
    const excRate = parseFloat(excavationRate);
    const loadRate = parseFloat(loadingRate);
    const transRate = parseFloat(transportationRate);
    const dumpRate = parseFloat(dumpingFee);
    
    const loads = calculateLoads(calculateLooseVolume(baseVolume));
    
    const excavationCost = baseVolume * excRate;
    const loadingCost = baseVolume * loadRate;
    const transportationCost = (loads.tractorLoads + loads.sixWheelerLoads + loads.tenWheelerLoads) * transRate;
    const dumpingCost = baseVolume * dumpRate;
    
    const totalCost = excavationCost + loadingCost + transportationCost + dumpingCost;
    
    return {
      excavationCost: parseFloat(excavationCost.toFixed(2)),
      loadingCost: parseFloat(loadingCost.toFixed(2)),
      transportationCost: parseFloat(transportationCost.toFixed(2)),
      dumpingCost: parseFloat(dumpingCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2))
    };
  };

  const runCalculation = () => {
    if (!validateInputs()) return;

    const baseVolume = calculateVolume();
    const adjustedVolume = calculateAdjustedVolume(baseVolume);
    const looseVolume = calculateLooseVolume(adjustedVolume);
    const soilWeight = calculateSoilWeight(adjustedVolume);
    const loads = calculateLoads(looseVolume);
    const costs = calculateCosts(adjustedVolume);

    const newResults = {
      baseVolume,
      adjustedVolume,
      looseVolume,
      soilWeight,
      tractorLoads: loads.tractorLoads,
      sixWheelerLoads: loads.sixWheelerLoads,
      tenWheelerLoads: loads.tenWheelerLoads,
      costs,
      soilType,
      swellFactor: (SWELL_FACTORS[soilType] * 100),
      safetyMargin: parseFloat(safetyMargin),
      overExcavation: parseFloat(overExcavation),
      excavationType
    };

    setResults(newResults);
    setShowConfigModal(false);
  };

  const handleReset = () => {
    setResults(null);
    setLength('');
    setWidth('');
    setDiameter('');
    setDepth('');
    setSoilType('medium');
    setSafetyMargin(String(0));
    setOverExcavation(String(0));
    setExcavationRate(String(500));
    setLoadingRate(String(300));
    setTransportationRate(String(800));
    setDumpingFee(String(100));
    setValidationErrors([]);
    setShowConfigModal(false);
    setShowDetailsModal(false);
  };

  // ==================== MODAL COMPONENTS ====================

  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Configure Soil Excavation</h3>
            <p className="text-sm text-gray-600 mt-1">Enter excavation type, dimensions & settings</p>
          </div>
          <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Unit Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <div className="flex gap-2">
              {['meter', 'feet'].map(u => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    unit === u
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {u === 'meter' ? 'Meter' : 'Feet'}
                </button>
              ))}
            </div>
          </div>

          {/* Excavation Type */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Excavation Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'rectangular', label: 'Rectangular Pit' },
                { id: 'trench', label: 'Trench' },
                { id: 'circular', label: 'Circular Pit' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setExcavationType(type.id)}
                  className={`p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    excavationType === type.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Dimensions ({unit})</p>
            
            {(excavationType === 'rectangular' || excavationType === 'trench') && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="length" className="block text-xs font-medium text-gray-700">Length</label>
                  <input
                    id="length"
                    type="number"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="width" className="block text-xs font-medium text-gray-700">Width</label>
                  <input
                    id="width"
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="depth" className="block text-xs font-medium text-gray-700">Depth</label>
                  <input
                    id="depth"
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
            
            {excavationType === 'circular' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="diameter" className="block text-xs font-medium text-gray-700">Diameter</label>
                  <input
                    id="diameter"
                    type="number"
                    value={diameter}
                    onChange={(e) => setDiameter(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="depthCirc" className="block text-xs font-medium text-gray-700">Depth</label>
                  <input
                    id="depthCirc"
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Soil Type */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Soil Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'loose', label: 'Loose (10% swell)' },
                { id: 'medium', label: 'Medium (20% swell)' },
                { id: 'hard', label: 'Hard (30% swell)' },
                { id: 'rock', label: 'Rock (50% swell)' }
              ].map(soil => (
                <button
                  key={soil.id}
                  onClick={() => setSoilType(soil.id)}
                  className={`p-2 rounded-lg border-2 transition-all text-sm ${
                    soilType === soil.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400'
                  }`}
                >
                  <p className="font-semibold">{soil.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Safety & Over-excavation */}
          <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="safetyMargin" className="block text-xs font-medium text-gray-700 mb-2">Safety Margin (%)</label>
              <input
                id="safetyMargin"
                type="number"
                value={safetyMargin}
                onChange={(e) => setSafetyMargin(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="overExcavation" className="block text-xs font-medium text-gray-700 mb-2">Over-excavation (%)</label>
              <input
                id="overExcavation"
                type="number"
                value={overExcavation}
                onChange={(e) => setOverExcavation(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Cost Rates */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Cost Rates (₹/unit)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="excavationRate" className="block text-xs font-medium text-gray-700">Excavation (₹/m³)</label>
                <input
                  id="excavationRate"
                  type="number"
                  value={excavationRate}
                  onChange={(e) => setExcavationRate(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="loadingRate" className="block text-xs font-medium text-gray-700">Loading (₹/m³)</label>
                <input
                  id="loadingRate"
                  type="number"
                  value={loadingRate}
                  onChange={(e) => setLoadingRate(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="transportationRate" className="block text-xs font-medium text-gray-700">Transportation (₹/trip)</label>
                <input
                  id="transportationRate"
                  type="number"
                  value={transportationRate}
                  onChange={(e) => setTransportationRate(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="dumpingFee" className="block text-xs font-medium text-gray-700">Dumping Fee (₹/m³)</label>
                <input
                  id="dumpingFee"
                  type="number"
                  value={dumpingFee}
                  onChange={(e) => setDumpingFee(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <p className="font-bold text-red-900 text-sm mb-1 flex items-center gap-2">
                <AlertCircle size={16} /> Validation Errors
              </p>
              <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowConfigModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={runCalculation}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Calculate
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const DetailsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Complete Breakdown</h3>
          <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {results && (
          <div className="p-6 space-y-4">
            {/* Volume Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Excavation Volume</p>
              <p className="text-3xl font-bold text-blue-600">{results.adjustedVolume}</p>
              <p className="text-xs text-gray-600 mt-1">m³ ({results.excavationType})</p>
            </div>

            {/* Volume Breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Volume Analysis</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base Volume</span>
                  <span className="font-bold">{results.baseVolume} m³</span>
                </div>
                <div className="flex justify-between">
                  <span>Safety Margin ({results.safetyMargin}%)</span>
                  <span className="font-bold">{parseFloat((results.baseVolume * results.safetyMargin / 100).toFixed(2))} m³</span>
                </div>
                <div className="flex justify-between">
                  <span>Over-excavation ({results.overExcavation}%)</span>
                  <span className="font-bold">{parseFloat((results.baseVolume * results.overExcavation / 100).toFixed(2))} m³</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                  <span>Adjusted Volume</span>
                  <span>{results.adjustedVolume} m³</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-orange-600 font-bold">
                  <span>Loose Volume (swell +{results.swellFactor}%)</span>
                  <span>{results.looseVolume} m³</span>
                </div>
              </div>
            </div>

            {/* Vehicle Loads */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Vehicle Loads Required</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tractor Trolley (3 m³)</span>
                  <span className="font-bold text-blue-600">{results.tractorLoads} loads</span>
                </div>
                <div className="flex justify-between">
                  <span>6-Wheeler Truck (6 m³)</span>
                  <span className="font-bold text-green-600">{results.sixWheelerLoads} loads</span>
                </div>
                <div className="flex justify-between">
                  <span>10-Wheeler Truck (10 m³)</span>
                  <span className="font-bold text-purple-600">{results.tenWheelerLoads} loads</span>
                </div>
              </div>
            </div>

            {/* Weight & Soil Info */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Soil Properties</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Soil Type</span>
                  <span className="font-bold capitalize">{results.soilType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Swell Factor</span>
                  <span className="font-bold">{results.swellFactor}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Soil Density</span>
                  <span className="font-bold">{SOIL_DENSITY[results.soilType]} kg/m³</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-green-600">
                  <span>Total Soil Weight</span>
                  <span>{results.soilWeight} tons</span>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Cost Breakdown</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Excavation Cost</span>
                  <span>₹{results.costs.excavationCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Loading Cost</span>
                  <span>₹{results.costs.loadingCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transportation Cost</span>
                  <span>₹{results.costs.transportationCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dumping Fee</span>
                  <span>₹{results.costs.dumpingCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                  <span>Total Earthwork Cost</span>
                  <span className="text-green-600">₹{results.costs.totalCost.toLocaleString()}</span>
                </div>
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
            <h3 className="text-xl font-bold text-gray-900">Soil Excavation Calculator</h3>
            <p className="text-sm text-gray-600 mt-1">Estimate volume, loads & costs</p>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
          >
            Configure & Calculate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Compact Result Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Excavation Volume</p>
              <p className="text-2xl font-bold text-blue-600">{results.adjustedVolume}</p>
              <p className="text-xs text-gray-600">m³</p>
              <button
                onClick={() => setShowDetailsModal(true)}
                className="mt-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
              >
                <Info size={14} /> Details
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Loose Volume</p>
              <p className="text-2xl font-bold text-gray-900">{results.looseVolume}</p>
              <p className="text-xs text-gray-600">(+{results.swellFactor}%)</p>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Soil Weight</p>
              <p className="text-2xl font-bold text-gray-900">{results.soilWeight}</p>
              <p className="text-xs text-gray-600">tons</p>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Vehicle Loads</p>
              <p className="text-2xl font-bold text-purple-600">{results.tractorLoads + results.sixWheelerLoads + results.tenWheelerLoads}</p>
              <p className="text-xs text-gray-600">all types</p>
            </div>

            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg col-span-2">
              <p className="text-xs text-gray-600 mb-1">Total Earthwork Cost</p>
              <p className="text-3xl font-bold text-green-600">₹{results.costs.totalCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleReset}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Portals for Modals */}
      {showConfigModal && ReactDOM.createPortal(<ConfigModal />, document.body)}
      {showDetailsModal && ReactDOM.createPortal(<DetailsModal />, document.body)}
    </div>
  );
};

export default SoilExcavationCalculator;
