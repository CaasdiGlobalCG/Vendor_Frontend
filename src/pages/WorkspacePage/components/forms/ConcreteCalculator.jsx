import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, AlertCircle, Info, X } from 'lucide-react';

const ConcreteCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  // ==================== CONSTANTS ====================
  const PI = 3.1416;
  const FEET_TO_METER = 0.3048;
  const DRY_VOLUME_MULTIPLIER = 1.54;
  const CEMENT_BAG_WEIGHT = 50; // kg
  const CEMENT_VOLUME_PER_BAG = 0.035; // m³
  const STEEL_DENSITY = 7850; // kg/m³
  const TRUCK_CAPACITIES = [6, 8, 10]; // m³

  const CONCRETE_GRADES = {
    'M10': { ratio: [1, 3, 6], waterCementRatio: 0.6, label: 'M10 (1:3:6)' },
    'M15': { ratio: [1, 2, 4], waterCementRatio: 0.55, label: 'M15 (1:2:4)' },
    'M20': { ratio: [1, 1.5, 3], waterCementRatio: 0.5, label: 'M20 (1:1.5:3)' },
    'M25': { ratio: [1, 1, 2], waterCementRatio: 0.45, label: 'M25 (1:1:2)' }
  };

  const STEEL_PERCENTAGES = {
    'Slab': 1,
    'Pillar': 2,
    'Cylinder': 0.8,
    'Hollow Cylinder': 0.8
  };

  // ==================== STATE MANAGEMENT ====================
  const [results, setResults] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state for config modal
  const [structureType, setStructureType] = useState('Slab');
  const [unit, setUnit] = useState('meter');
  const [slab, setSlab] = useState({ length: '', width: '', depth: '' });
  const [cylinder, setCylinder] = useState({ outerDiameter: '', height: '' });
  const [pillar, setPillar] = useState({ length: '', width: '', height: '' });
  const [hollowCylinder, setHollowCylinder] = useState({ outerDiameter: '', innerDiameter: '', height: '' });
  const [selectedGrade, setSelectedGrade] = useState('M20');
  const [customRatio, setCustomRatio] = useState([1, 1.5, 3]);
  const [useCustom, setUseCustom] = useState(false);
  const [selectedTruckCapacity, setSelectedTruckCapacity] = useState(8);
  const [includeReinforcement, setIncludeReinforcement] = useState(true);
  const [costs, setCosts] = useState({
    cementPrice: 500,
    sandPrice: 1500,
    aggregatePrice: 2000,
    steelPrice: 60,
    labourPrice: 500
  });
  const [validationErrors, setValidationErrors] = useState([]);

  // ==================== VALIDATION ====================
  const validateInputs = () => {
    const errors = [];
    const inputs = getActiveInputs();

    Object.entries(inputs).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        errors.push(`${key} must be a positive number`);
      }
    });

    if (structureType === 'Hollow Cylinder') {
      const outer = parseFloat(hollowCylinder.outerDiameter);
      const inner = parseFloat(hollowCylinder.innerDiameter);
      if (inner >= outer) {
        errors.push('Inner diameter must be less than outer diameter');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getActiveInputs = () => {
    switch (structureType) {
      case 'Slab':
        return { 'Length': slab.length, 'Width': slab.width, 'Depth': slab.depth };
      case 'Cylinder':
        return { 'Outer Diameter': cylinder.outerDiameter, 'Height': cylinder.height };
      case 'Pillar':
        return { 'Length': pillar.length, 'Width': pillar.width, 'Height': pillar.height };
      case 'Hollow Cylinder':
        return {
          'Outer Diameter': hollowCylinder.outerDiameter,
          'Inner Diameter': hollowCylinder.innerDiameter,
          'Height': hollowCylinder.height
        };
      default:
        return {};
    }
  };

  // ==================== CALCULATIONS ====================
  const convertToMeters = (value) => {
    return unit === 'feet' ? value * FEET_TO_METER : value;
  };

  const calculateVolume = () => {
    let volume = 0;
    switch (structureType) {
      case 'Slab':
        volume = convertToMeters(parseFloat(slab.length)) *
                 convertToMeters(parseFloat(slab.width)) *
                 convertToMeters(parseFloat(slab.depth));
        break;
      case 'Cylinder':
        const radius = convertToMeters(parseFloat(cylinder.outerDiameter)) / 2;
        const height = convertToMeters(parseFloat(cylinder.height));
        volume = PI * radius * radius * height;
        break;
      case 'Pillar':
        volume = convertToMeters(parseFloat(pillar.length)) *
                 convertToMeters(parseFloat(pillar.width)) *
                 convertToMeters(parseFloat(pillar.height));
        break;
      case 'Hollow Cylinder':
        const outerRadius = convertToMeters(parseFloat(hollowCylinder.outerDiameter)) / 2;
        const innerRadius = convertToMeters(parseFloat(hollowCylinder.innerDiameter)) / 2;
        const hcHeight = convertToMeters(parseFloat(hollowCylinder.height));
        volume = PI * (outerRadius * outerRadius - innerRadius * innerRadius) * hcHeight;
        break;
      default:
        volume = 0;
    }
    return parseFloat(volume.toFixed(3));
  };

  const calculateMaterials = (wetVolume) => {
    const dryVolume = wetVolume * DRY_VOLUME_MULTIPLIER;
    const gradeConfig = useCustom ? { ratio: customRatio, waterCementRatio: 0.5 } : CONCRETE_GRADES[selectedGrade];
    const [cementPart, sandPart, aggregatePart] = gradeConfig.ratio;
    const totalParts = cementPart + sandPart + aggregatePart;

    const cementVolume = (cementPart / totalParts) * dryVolume;
    const sandVolume = (sandPart / totalParts) * dryVolume;
    const aggregateVolume = (aggregatePart / totalParts) * dryVolume;

    const cementBags = Math.ceil(cementVolume / CEMENT_VOLUME_PER_BAG);
    const waterLitres = Math.round(cementBags * CEMENT_BAG_WEIGHT * gradeConfig.waterCementRatio);

    return {
      dryVolume: parseFloat(dryVolume.toFixed(3)),
      cementVolume: parseFloat(cementVolume.toFixed(3)),
      sandVolume: parseFloat(sandVolume.toFixed(2)),
      aggregateVolume: parseFloat(aggregateVolume.toFixed(2)),
      cementBags,
      waterLitres
    };
  };

  const calculateReinforcement = (wetVolume) => {
    if (!includeReinforcement) {
      return { steelWeight: 0, steelPercentage: 0 };
    }
    const steelPercentage = STEEL_PERCENTAGES[structureType] || 1;
    const steelWeight = parseFloat((wetVolume * STEEL_DENSITY * (steelPercentage / 100)).toFixed(2));
    return { steelWeight, steelPercentage };
  };

  const calculateTrucks = (wetVolume) => {
    const trucksRequired = Math.ceil(wetVolume / selectedTruckCapacity);
    const leftoverVolume = parseFloat(((trucksRequired * selectedTruckCapacity) - wetVolume).toFixed(3));
    return { trucksRequired, leftoverVolume };
  };

  const calculateCosts = (materials, reinforcement, volume) => {
    const cementCost = materials.cementBags * costs.cementPrice;
    const sandCost = materials.sandVolume * costs.sandPrice;
    const aggregateCost = materials.aggregateVolume * costs.aggregatePrice;
    const steelCost = reinforcement.steelWeight * costs.steelPrice;
    const labourCost = volume * costs.labourPrice;

    const totalCost = cementCost + sandCost + aggregateCost + steelCost + labourCost;

    return {
      cementCost: parseFloat(cementCost.toFixed(2)),
      sandCost: parseFloat(sandCost.toFixed(2)),
      aggregateCost: parseFloat(aggregateCost.toFixed(2)),
      steelCost: parseFloat(steelCost.toFixed(2)),
      labourCost: parseFloat(labourCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2))
    };
  };

  const runCalculation = () => {
    if (!validateInputs()) return;

    const volume = calculateVolume();
    const materials = calculateMaterials(volume);
    const reinforcement = calculateReinforcement(volume);
    const trucks = calculateTrucks(volume);
    const costBreakdown = calculateCosts(materials, reinforcement, volume);

    const newResults = {
      volume,
      structureType,
      unit,
      selectedGrade: useCustom ? `Custom (${customRatio.join(':')})` : selectedGrade,
      materials,
      reinforcement,
      trucks,
      costs: costBreakdown
    };

    setResults(newResults);
    setShowConfigModal(false);
  };

  const handleReset = () => {
    setResults(null);
    setSlab({ length: '', width: '', depth: '' });
    setCylinder({ outerDiameter: '', height: '' });
    setPillar({ length: '', width: '', height: '' });
    setHollowCylinder({ outerDiameter: '', innerDiameter: '', height: '' });
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
            <h3 className="text-xl font-bold text-gray-900">Configure Concrete Calculation</h3>
            <p className="text-sm text-gray-600 mt-1">Enter dimensions & settings</p>
          </div>
          <button
            onClick={() => setShowConfigModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Structure Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Structure Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['Slab', 'Pillar', 'Cylinder', 'Hollow Cylinder'].map(type => (
                <button
                  key={type}
                  onClick={() => setStructureType(type)}
                  className={`p-3 rounded-lg border-2 transition-all text-left text-sm ${
                    structureType === type
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{type}</p>
                </button>
              ))}
            </div>
          </div>

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

          {/* Dynamic Dimensions */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Dimensions ({unit})</p>
            {structureType === 'Slab' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Length</label>
                  <input type="number" value={slab.length} onChange={(e) => setSlab({...slab, length: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Width</label>
                  <input type="number" value={slab.width} onChange={(e) => setSlab({...slab, width: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Depth</label>
                  <input type="number" value={slab.depth} onChange={(e) => setSlab({...slab, depth: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
              </div>
            )}
            {structureType === 'Cylinder' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Outer Diameter</label>
                  <input type="number" value={cylinder.outerDiameter} onChange={(e) => setCylinder({...cylinder, outerDiameter: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Height</label>
                  <input type="number" value={cylinder.height} onChange={(e) => setCylinder({...cylinder, height: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
              </div>
            )}
            {structureType === 'Pillar' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Length</label>
                  <input type="number" value={pillar.length} onChange={(e) => setPillar({...pillar, length: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Width</label>
                  <input type="number" value={pillar.width} onChange={(e) => setPillar({...pillar, width: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Height</label>
                  <input type="number" value={pillar.height} onChange={(e) => setPillar({...pillar, height: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
              </div>
            )}
            {structureType === 'Hollow Cylinder' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Outer Diameter</label>
                  <input type="number" value={hollowCylinder.outerDiameter} onChange={(e) => setHollowCylinder({...hollowCylinder, outerDiameter: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Inner Diameter</label>
                  <input type="number" value={hollowCylinder.innerDiameter} onChange={(e) => setHollowCylinder({...hollowCylinder, innerDiameter: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Height</label>
                  <input type="number" value={hollowCylinder.height} onChange={(e) => setHollowCylinder({...hollowCylinder, height: e.target.value})} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" />
                </div>
              </div>
            )}
          </div>

          {/* Concrete Grade */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Concrete Grade</label>
            <div className="space-y-2">
              {Object.entries(CONCRETE_GRADES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedGrade(key); setUseCustom(false); }}
                  className={`w-full p-2 text-left rounded-lg border-2 transition-all text-sm ${
                    selectedGrade === key && !useCustom
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{config.label}</p>
                  <p className="text-xs text-gray-600">W/C: {config.waterCementRatio}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setUseCustom(!useCustom)}
              className={`w-full p-2 mt-2 text-left rounded-lg border-2 transition-all text-sm ${
                useCustom
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-400'
              }`}
            >
              <p className="font-semibold text-gray-900">Custom Mix</p>
            </button>

            {useCustom && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <input type="number" value={customRatio[0]} onChange={(e) => setCustomRatio([parseFloat(e.target.value), customRatio[1], customRatio[2]])} placeholder="Cement" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" step="0.1" />
                <input type="number" value={customRatio[1]} onChange={(e) => setCustomRatio([customRatio[0], parseFloat(e.target.value), customRatio[2]])} placeholder="Sand" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" step="0.1" />
                <input type="number" value={customRatio[2]} onChange={(e) => setCustomRatio([customRatio[0], customRatio[1], parseFloat(e.target.value)])} placeholder="Aggregate" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" step="0.1" />
              </div>
            )}
          </div>

          {/* Truck & Reinforcement */}
          <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Truck Capacity</label>
              <div className="grid grid-cols-3 gap-2">
                {TRUCK_CAPACITIES.map(cap => (
                  <button
                    key={cap}
                    onClick={() => setSelectedTruckCapacity(cap)}
                    className={`p-2 rounded text-sm font-medium border transition-all ${
                      selectedTruckCapacity === cap
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    {cap}m³
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 mt-6">
                <input
                  type="checkbox"
                  checked={includeReinforcement}
                  onChange={(e) => setIncludeReinforcement(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Reinforcement</span>
              </label>
            </div>
          </div>

          {/* Cost Rates */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Cost Rates</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Cement (₹/bag)</label>
                <input type="number" value={costs.cementPrice} onChange={(e) => setCosts({...costs, cementPrice: parseFloat(e.target.value)})} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Sand (₹/m³)</label>
                <input type="number" value={costs.sandPrice} onChange={(e) => setCosts({...costs, sandPrice: parseFloat(e.target.value)})} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Aggregate (₹/m³)</label>
                <input type="number" value={costs.aggregatePrice} onChange={(e) => setCosts({...costs, aggregatePrice: parseFloat(e.target.value)})} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Steel (₹/kg)</label>
                <input type="number" value={costs.steelPrice} onChange={(e) => setCosts({...costs, steelPrice: parseFloat(e.target.value)})} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700">Labour (₹/m³)</label>
                <input type="number" value={costs.labourPrice} onChange={(e) => setCosts({...costs, labourPrice: parseFloat(e.target.value)})} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
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
                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowConfigModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={runCalculation}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
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
              <p className="text-sm text-gray-600">Volume Required</p>
              <p className="text-3xl font-bold text-blue-600">{results.volume} m³</p>
              <p className="text-xs text-gray-600 mt-1">{results.structureType} | {results.selectedGrade}</p>
            </div>

            {/* Materials */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Materials Required</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Cement (50kg bags)</span><span className="font-bold">{results.materials.cementBags} bags</span></div>
                <div className="flex justify-between"><span>Sand</span><span className="font-bold">{results.materials.sandVolume} m³</span></div>
                <div className="flex justify-between"><span>Aggregate</span><span className="font-bold">{results.materials.aggregateVolume} m³</span></div>
                <div className="flex justify-between"><span>Water</span><span className="font-bold">{results.materials.waterLitres} litres</span></div>
                {includeReinforcement && (
                  <div className="flex justify-between pt-2 border-t"><span>Steel ({results.reinforcement.steelPercentage}%)</span><span className="font-bold">{results.reinforcement.steelWeight} kg</span></div>
                )}
                <div className="flex justify-between pt-2 border-t"><span>Ready-Mix Trucks</span><span className="font-bold">{results.trucks.trucksRequired} trucks ({selectedTruckCapacity}m³ each)</span></div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Cost Breakdown</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Cement</span><span>₹{results.costs.cementCost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Sand</span><span>₹{results.costs.sandCost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Aggregate</span><span>₹{results.costs.aggregateCost.toLocaleString()}</span></div>
                {includeReinforcement && (
                  <div className="flex justify-between"><span>Steel</span><span>₹{results.costs.steelCost.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between"><span>Labour</span><span>₹{results.costs.labourCost.toLocaleString()}</span></div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Total</span><span className="text-green-600">₹{results.costs.totalCost.toLocaleString()}</span></div>
              </div>
            </div>

            <button onClick={() => setShowDetailsModal(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg">
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
            <h3 className="text-xl font-bold text-gray-900">Concrete Calculator</h3>
            <p className="text-sm text-gray-600 mt-1">Estimate materials, reinforcement & costs</p>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Configure & Calculate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Compact Result Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Volume</p>
              <p className="text-2xl font-bold text-blue-600">{results.volume}</p>
              <p className="text-xs text-gray-600">m³</p>
              <button
                onClick={() => setShowDetailsModal(true)}
                className="mt-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
              >
                <Info size={14} /> Details
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Cement Bags</p>
              <p className="text-2xl font-bold text-gray-900">{results.materials.cementBags}</p>
              <p className="text-xs text-gray-600">(50 kg each)</p>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Ready-Mix Trucks</p>
              <p className="text-2xl font-bold text-gray-900">{results.trucks.trucksRequired}</p>
              <p className="text-xs text-gray-600">({selectedTruckCapacity}m³ each)</p>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Steel</p>
              <p className="text-2xl font-bold text-gray-900">{results.reinforcement.steelWeight}</p>
              <p className="text-xs text-gray-600">kg</p>
            </div>

            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg col-span-2">
              <p className="text-xs text-gray-600 mb-1">Total Cost</p>
              <p className="text-3xl font-bold text-green-600">₹{results.costs.totalCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleReset}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
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

export default ConcreteCalculator;
