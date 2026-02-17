import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, AlertCircle, Info, X } from 'lucide-react';

const FlooringCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  // ==================== CONSTANTS ====================
  const FEET_TO_METER = 0.3048;
  const MORTAR_THICKNESS_DEFAULT = 0.02; // meters (20mm)
  const MORTAR_DRY_MULTIPLIER = 1.33; // Dry volume multiplier for tile mortar
  const CEMENT_SAND_RATIO = [1, 4]; // 1:4 cement:sand mix
  const CEMENT_VOLUME_PER_BAG = 0.035; // m³
  const TILES_PER_BOX_DEFAULT = 10;
  const WASTAGE_DEFAULT = 10; // percent

  // ==================== STATE MANAGEMENT ====================
  const [results, setResults] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state
  const [unit, setUnit] = useState('meter');
  const [areaLength, setAreaLength] = useState('');
  const [areaWidth, setAreaWidth] = useState('');
  const [tileLength, setTileLength] = useState('');
  const [tileWidth, setTileWidth] = useState('');
  const [wastagePercent, setWastagePercent] = useState(String(WASTAGE_DEFAULT));
  const [tilesPerBox, setTilesPerBox] = useState(String(TILES_PER_BOX_DEFAULT));
  const [tileThickness, setTileThickness] = useState(String(10)); // in mm
  const [mortarThickness, setMortarThickness] = useState(String(20)); // in mm
  const [validationErrors, setValidationErrors] = useState([]);

  // ==================== VALIDATION ====================
  const validateInputs = () => {
    const errors = [];

    const aL = parseFloat(areaLength);
    const aW = parseFloat(areaWidth);
    const tL = parseFloat(tileLength);
    const tW = parseFloat(tileWidth);
    const wP = parseFloat(wastagePercent);
    const tPB = parseFloat(tilesPerBox);

    if (areaLength === '' || isNaN(aL) || aL <= 0) errors.push('Area length must be a positive number');
    if (areaWidth === '' || isNaN(aW) || aW <= 0) errors.push('Area width must be a positive number');
    if (tileLength === '' || isNaN(tL) || tL <= 0) errors.push('Tile length must be a positive number');
    if (tileWidth === '' || isNaN(tW) || tW <= 0) errors.push('Tile width must be a positive number');
    if (isNaN(wP) || wP < 0) errors.push('Wastage percentage cannot be negative');
    if (isNaN(tPB) || tPB <= 0) errors.push('Tiles per box must be a positive number');

    // Check that tiles fit in area
    const areaLengthM = unit === 'feet' ? aL * FEET_TO_METER : aL;
    const areaWidthM = unit === 'feet' ? aW * FEET_TO_METER : aW;
    const tileLengthM = unit === 'feet' ? tL * FEET_TO_METER : tL;
    const tileWidthM = unit === 'feet' ? tW * FEET_TO_METER : tW;

    if (!isNaN(tileLengthM) && !isNaN(areaLengthM) && (tileLengthM > areaLengthM || tileWidthM > areaWidthM)) {
      errors.push('Tile dimensions cannot be larger than area dimensions');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // ==================== CALCULATION ENGINE ====================

  const convertToMeters = (value) => {
    return unit === 'feet' ? value * FEET_TO_METER : value;
  };

  const calculateArea = () => {
    const lengthM = convertToMeters(parseFloat(areaLength));
    const widthM = convertToMeters(parseFloat(areaWidth));
    return parseFloat((lengthM * widthM).toFixed(2));
  };

  const calculateTiles = (totalArea) => {
    const tileLengthM = convertToMeters(parseFloat(tileLength));
    const tileWidthM = convertToMeters(parseFloat(tileWidth));
    const tileArea = parseFloat((tileLengthM * tileWidthM).toFixed(4));

    const tilesBeforeWastage = parseFloat((totalArea / tileArea).toFixed(2));
    const wastageMultiplier = 1 + parseFloat(wastagePercent) / 100;
    const tilesWithWastage = Math.ceil(tilesBeforeWastage * wastageMultiplier);

    return {
      tileArea: parseFloat(tileArea.toFixed(4)),
      tilesBeforeWastage,
      tilesWithWastage
    };
  };

  const calculateBoxes = (tilesRequired) => {
    const tPB = parseFloat(tilesPerBox);
    return Math.ceil(tilesRequired / tPB);
  };

  const calculateCement = (totalArea) => {
    const mortarThicknessM = parseFloat(mortarThickness) / 1000; // Convert mm to meters
    const mortarVolume = totalArea * mortarThicknessM;
    const dryVolume = mortarVolume * MORTAR_DRY_MULTIPLIER;

    const [cementPart, sandPart] = CEMENT_SAND_RATIO;
    const totalParts = cementPart + sandPart;

    const cementVolume = (cementPart / totalParts) * dryVolume;
    const cementBags = Math.ceil(cementVolume / CEMENT_VOLUME_PER_BAG);

    return {
      mortarVolume: parseFloat(mortarVolume.toFixed(3)),
      dryVolume: parseFloat(dryVolume.toFixed(3)),
      cementVolume: parseFloat(cementVolume.toFixed(3)),
      cementBags
    };
  };

  const calculateSand = (totalArea) => {
    const mortarThicknessM = parseFloat(mortarThickness) / 1000; // Convert mm to meters
    const mortarVolume = totalArea * mortarThicknessM;
    const dryVolume = mortarVolume * MORTAR_DRY_MULTIPLIER;

    const [cementPart, sandPart] = CEMENT_SAND_RATIO;
    const totalParts = cementPart + sandPart;

    const sandVolume = (sandPart / totalParts) * dryVolume;
    return parseFloat(sandVolume.toFixed(2));
  };

  const runCalculation = () => {
    if (!validateInputs()) return;

    const totalArea = calculateArea();
    const tilesData = calculateTiles(totalArea);
    const boxesRequired = calculateBoxes(tilesData.tilesWithWastage);
    const cementData = calculateCement(totalArea);
    const sandRequired = calculateSand(totalArea);

    const newResults = {
      totalArea,
      tileArea: tilesData.tileArea,
      tilesBeforeWastage: tilesData.tilesBeforeWastage,
      tilesRequired: tilesData.tilesWithWastage,
      boxesRequired,
      cementBags: cementData.cementBags,
      sandRequired,
      // For details modal
      mortarVolume: cementData.mortarVolume,
      dryVolume: cementData.dryVolume,
      cementVolume: cementData.cementVolume,
      wastagePercent: parseFloat(wastagePercent),
      tilesPerBox: parseFloat(tilesPerBox),
      mortarThickness: parseFloat(mortarThickness)
    };

    setResults(newResults);
    setShowConfigModal(false);
  };

  const handleReset = () => {
    setResults(null);
    setAreaLength('');
    setAreaWidth('');
    setTileLength('');
    setTileWidth('');
    setWastagePercent(String(WASTAGE_DEFAULT));
    setTilesPerBox(String(TILES_PER_BOX_DEFAULT));
    setTileThickness(String(10));
    setMortarThickness(String(20));
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
            <h3 className="text-xl font-bold text-gray-900">Configure Flooring Calculation</h3>
            <p className="text-sm text-gray-600 mt-1">Enter area, tile dimensions & settings</p>
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

          {/* Area Dimensions */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Area Dimensions ({unit})</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="areaLength" className="block text-xs font-medium text-gray-700">Length</label>
                <input
                  id="areaLength"
                  name="areaLength"
                  type="number"
                  value={areaLength}
                  onChange={(e) => setAreaLength(e.target.value)}
                  placeholder="Length"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="areaWidth" className="block text-xs font-medium text-gray-700">Width</label>
                <input
                  id="areaWidth"
                  name="areaWidth"
                  type="number"
                  value={areaWidth}
                  onChange={(e) => setAreaWidth(e.target.value)}
                  placeholder="Width"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Tile Dimensions */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Tile Dimensions ({unit})</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tileLength" className="block text-xs font-medium text-gray-700">Tile Length</label>
                <input
                  id="tileLength"
                  name="tileLength"
                  type="number"
                  value={tileLength}
                  onChange={(e) => setTileLength(e.target.value)}
                  placeholder="Tile length"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="tileWidth" className="block text-xs font-medium text-gray-700">Tile Width</label>
                <input
                  id="tileWidth"
                  name="tileWidth"
                  type="number"
                  value={tileWidth}
                  onChange={(e) => setTileWidth(e.target.value)}
                  placeholder="Tile width"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Wastage & Boxes */}
          <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="wastagePercent" className="block text-xs font-medium text-gray-700 mb-2">Wastage (%)</label>
              <input
                id="wastagePercent"
                name="wastagePercent"
                type="number"
                value={wastagePercent}
                onChange={(e) => setWastagePercent(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.1"
                autoComplete="off"
              />
              <p className="text-xs text-gray-600 mt-1">Default: {WASTAGE_DEFAULT}%</p>
            </div>

            <div>
              <label htmlFor="tilesPerBox" className="block text-xs font-medium text-gray-700 mb-2">Tiles per Box</label>
              <input
                id="tilesPerBox"
                name="tilesPerBox"
                type="number"
                value={tilesPerBox}
                onChange={(e) => setTilesPerBox(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
              <p className="text-xs text-gray-600 mt-1">Default: {TILES_PER_BOX_DEFAULT}</p>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Advanced Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="mortarThickness" className="block text-xs font-medium text-gray-700">Mortar Thickness (mm)</label>
                <input
                  id="mortarThickness"
                  name="mortarThickness"
                  type="number"
                  value={mortarThickness}
                  onChange={(e) => setMortarThickness(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="1"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-600 mt-1">Default: 20mm</p>
              </div>

              <div>
                <label htmlFor="tileThickness" className="block text-xs font-medium text-gray-700">Tile Thickness (mm)</label>
                <input
                  id="tileThickness"
                  name="tileThickness"
                  type="number"
                  value={tileThickness}
                  onChange={(e) => setTileThickness(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-600 mt-1">For reference only</p>
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
            {/* Area Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Coverage Area</p>
              <p className="text-3xl font-bold text-blue-600">{results.totalArea}</p>
              <p className="text-xs text-gray-600 mt-1">m²</p>
            </div>

            {/* Tiles Breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Tiles Required</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tile Area</span>
                  <span className="font-bold">{results.tileArea} m²</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiles (before wastage)</span>
                  <span className="font-bold">{results.tilesBeforeWastage}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Wastage</span>
                  <span className="font-bold">{results.wastagePercent}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                  <span>Tiles (with wastage)</span>
                  <span>{results.tilesRequired}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Boxes Required</span>
                  <span className="text-green-600">{results.boxesRequired}</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">({results.tilesPerBox} tiles per box)</p>
              </div>
            </div>

            {/* Cement & Sand Breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Mortar & Materials</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Mortar Thickness</span>
                  <span className="font-bold">{results.mortarThickness} mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Wet Mortar Volume</span>
                  <span className="font-bold">{results.mortarVolume} m³</span>
                </div>
                <div className="flex justify-between">
                  <span>Dry Volume (×1.33)</span>
                  <span className="font-bold">{results.dryVolume} m³</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Cement Volume (1 part)</span>
                  <span className="font-bold">{results.cementVolume} m³</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                  <span>Cement Bags (50 kg)</span>
                  <span>{results.cementBags} bags</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-green-600">
                  <span>Sand Required (4 parts)</span>
                  <span>{results.sandRequired} m³</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">Mix Ratio: 1 Cement : 4 Sand</p>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <p className="font-bold text-amber-900 mb-3">Installation Summary</p>
              <div className="space-y-1 text-sm text-amber-900">
                <p>✓ {results.tilesRequired} tiles ({results.boxesRequired} boxes)</p>
                <p>✓ {results.cementBags} cement bags</p>
                <p>✓ {results.sandRequired} m³ sand</p>
                <p>✓ Coverage area: {results.totalArea} m²</p>
              </div>
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm"
            >
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
            <h3 className="text-xl font-bold text-gray-900">Flooring Calculator</h3>
            <p className="text-sm text-gray-600 mt-1">Estimate tiles, boxes, cement & sand</p>
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
              <p className="text-xs text-gray-600 mb-1">Total Area</p>
              <p className="text-2xl font-bold text-blue-600">{results.totalArea}</p>
              <p className="text-xs text-gray-600">m²</p>
              <button
                onClick={() => setShowDetailsModal(true)}
                className="mt-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
              >
                <Info size={14} /> Details
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Tiles Required</p>
              <p className="text-2xl font-bold text-gray-900">{results.tilesRequired}</p>
              <p className="text-xs text-gray-600">({results.wastagePercent}% wastage)</p>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Tile Boxes</p>
              <p className="text-2xl font-bold text-gray-900">{results.boxesRequired}</p>
              <p className="text-xs text-gray-600">×{results.tilesPerBox} tiles</p>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Cement Bags</p>
              <p className="text-2xl font-bold text-gray-900">{results.cementBags}</p>
              <p className="text-xs text-gray-600">(50 kg each)</p>
            </div>

            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg col-span-2">
              <p className="text-xs text-gray-600 mb-1">Sand Required</p>
              <p className="text-3xl font-bold text-green-600">{results.sandRequired}</p>
              <p className="text-xs text-gray-600">m³ (for bedding)</p>
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

export default FlooringCalculator;
