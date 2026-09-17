import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, AlertCircle, Info, X } from 'lucide-react';

const PaintingEstimator = ({ data, nodeId, workspaceId, setNodes }) => {
  // ==================== CONSTANTS ====================
  const FEET_TO_METER = 0.3048;
  const SQFT_TO_SQM = 0.092903;
  const PAINT_COVERAGE_SQM_PER_LITRE = 10; // typical emulsion coverage per coat
  const PRIMER_COVERAGE_SQM_PER_LITRE = 11;
  const WASTAGE_DEFAULT = 5; // percent
  const DOOR_AREA_SQM = 1.9; // standard door ~ 0.9m x 2.1m
  const WINDOW_AREA_SQM = 1.35; // standard window ~ 1.2m x 1.2m

  // ==================== STATE MANAGEMENT ====================
  const [results, setResults] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state
  const [unit, setUnit] = useState('meter');
  const [wallLength, setWallLength] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const [numWalls, setNumWalls] = useState('4');
  const [numDoors, setNumDoors] = useState('1');
  const [numWindows, setNumWindows] = useState('2');
  const [includeCeiling, setIncludeCeiling] = useState(false);
  const [ceilingWidth, setCeilingWidth] = useState('');
  const [coats, setCoats] = useState('2');
  const [includePrimer, setIncludePrimer] = useState(true);
  const [coverage, setCoverage] = useState(String(PAINT_COVERAGE_SQM_PER_LITRE));
  const [wastagePercent, setWastagePercent] = useState(String(WASTAGE_DEFAULT));
  const [validationErrors, setValidationErrors] = useState([]);

  // ==================== VALIDATION ====================
  const validateInputs = () => {
    const errors = [];

    const wL = parseFloat(wallLength);
    const wH = parseFloat(wallHeight);
    const nW = parseInt(numWalls, 10);
    const nD = parseInt(numDoors, 10);
    const nWin = parseInt(numWindows, 10);
    const c = parseInt(coats, 10);
    const cov = parseFloat(coverage);
    const wP = parseFloat(wastagePercent);

    if (wallLength === '' || isNaN(wL) || wL <= 0) errors.push('Wall length must be a positive number');
    if (wallHeight === '' || isNaN(wH) || wH <= 0) errors.push('Wall height must be a positive number');
    if (isNaN(nW) || nW <= 0) errors.push('Number of walls must be a positive number');
    if (isNaN(nD) || nD < 0) errors.push('Number of doors cannot be negative');
    if (isNaN(nWin) || nWin < 0) errors.push('Number of windows cannot be negative');
    if (isNaN(c) || c <= 0) errors.push('Number of coats must be a positive number');
    if (isNaN(cov) || cov <= 0) errors.push('Paint coverage must be a positive number');
    if (isNaN(wP) || wP < 0) errors.push('Wastage percentage cannot be negative');
    if (includeCeiling) {
      const cW = parseFloat(ceilingWidth);
      if (ceilingWidth === '' || isNaN(cW) || cW <= 0) errors.push('Ceiling width must be a positive number');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // ==================== CALCULATION ENGINE ====================
  const toMeters = (value) => (unit === 'feet' ? value * FEET_TO_METER : value);

  const runCalculation = () => {
    if (!validateInputs()) return;

    const lengthM = toMeters(parseFloat(wallLength));
    const heightM = toMeters(parseFloat(wallHeight));
    const nW = parseInt(numWalls, 10);
    const nD = parseInt(numDoors, 10);
    const nWin = parseInt(numWindows, 10);
    const c = parseInt(coats, 10);
    const cov = parseFloat(coverage);
    const wastageMultiplier = 1 + parseFloat(wastagePercent) / 100;

    const grossWallArea = lengthM * heightM * nW;
    const deductions = nD * DOOR_AREA_SQM + nWin * WINDOW_AREA_SQM;
    let paintableArea = Math.max(0, grossWallArea - deductions);

    let ceilingArea = 0;
    if (includeCeiling) {
      ceilingArea = lengthM * toMeters(parseFloat(ceilingWidth));
      paintableArea += ceilingArea;
    }

    const paintableAreaR = parseFloat(paintableArea.toFixed(2));
    const paintLitres = parseFloat(((paintableArea * c) / cov * wastageMultiplier).toFixed(2));
    const primerLitres = includePrimer
      ? parseFloat(((paintableArea * 1) / PRIMER_COVERAGE_SQM_PER_LITRE * wastageMultiplier).toFixed(2))
      : 0;

    // Suggest standard cans (20L / 10L / 4L / 1L)
    const suggestCans = (litres) => {
      let remaining = Math.ceil(litres * 10) / 10;
      const cans = { '20L': 0, '10L': 0, '4L': 0, '1L': 0 };
      [20, 10, 4, 1].forEach((size) => {
        const count = Math.floor(remaining / size);
        if (count > 0) {
          cans[`${size}L`] = count;
          remaining = parseFloat((remaining - count * size).toFixed(2));
        }
      });
      if (remaining > 0) cans['1L'] += 1;
      return cans;
    };

    setResults({
      grossWallArea: parseFloat(grossWallArea.toFixed(2)),
      deductions: parseFloat(deductions.toFixed(2)),
      ceilingArea: parseFloat(ceilingArea.toFixed(2)),
      paintableArea: paintableAreaR,
      coats: c,
      coverage: cov,
      wastagePercent: parseFloat(wastagePercent),
      paintLitres,
      paintCans: suggestCans(paintLitres),
      primerLitres,
      primerCans: includePrimer ? suggestCans(primerLitres) : null,
    });
    setShowConfigModal(false);
  };

  const handleReset = () => {
    setResults(null);
    setWallLength('');
    setWallHeight('');
    setNumWalls('4');
    setNumDoors('1');
    setNumWindows('2');
    setIncludeCeiling(false);
    setCeilingWidth('');
    setCoats('2');
    setIncludePrimer(true);
    setCoverage(String(PAINT_COVERAGE_SQM_PER_LITRE));
    setWastagePercent(String(WASTAGE_DEFAULT));
    setValidationErrors([]);
    setShowConfigModal(false);
    setShowDetailsModal(false);
  };

  const renderCans = (cans) =>
    Object.entries(cans)
      .filter(([, count]) => count > 0)
      .map(([size, count]) => `${count} × ${size}`)
      .join(', ') || '—';

  // ==================== MODAL COMPONENTS ====================
  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Configure Painting Estimate</h3>
            <p className="text-sm text-gray-600 mt-1">Enter wall dimensions, coats & coverage</p>
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
                    unit === u ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {u === 'meter' ? 'Meter' : 'Feet'}
                </button>
              ))}
            </div>
          </div>

          {/* Wall Dimensions */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Wall Dimensions ({unit})</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="wallLength" className="block text-xs font-medium text-gray-700">Wall Length</label>
                <input
                  id="wallLength" name="wallLength" type="number" value={wallLength}
                  onChange={(e) => setWallLength(e.target.value)} placeholder="Length" step="0.01" autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="wallHeight" className="block text-xs font-medium text-gray-700">Wall Height</label>
                <input
                  id="wallHeight" name="wallHeight" type="number" value={wallHeight}
                  onChange={(e) => setWallHeight(e.target.value)} placeholder="Height" step="0.01" autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="numWalls" className="block text-xs font-medium text-gray-700">No. of Walls</label>
                <input
                  id="numWalls" name="numWalls" type="number" value={numWalls}
                  onChange={(e) => setNumWalls(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Openings (deducted from area)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="numDoors" className="block text-xs font-medium text-gray-700">Doors (~{DOOR_AREA_SQM} m² each)</label>
                <input
                  id="numDoors" name="numDoors" type="number" value={numDoors}
                  onChange={(e) => setNumDoors(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="numWindows" className="block text-xs font-medium text-gray-700">Windows (~{WINDOW_AREA_SQM} m² each)</label>
                <input
                  id="numWindows" name="numWindows" type="number" value={numWindows}
                  onChange={(e) => setNumWindows(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Ceiling */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox" checked={includeCeiling}
                onChange={(e) => setIncludeCeiling(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Include ceiling (length × width)
            </label>
            {includeCeiling && (
              <div className="mt-3">
                <label htmlFor="ceilingWidth" className="block text-xs font-medium text-gray-700">Ceiling Width ({unit})</label>
                <input
                  id="ceilingWidth" name="ceilingWidth" type="number" value={ceilingWidth}
                  onChange={(e) => setCeilingWidth(e.target.value)} placeholder="Ceiling width" step="0.01" autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Paint Settings */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Paint Settings</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="coats" className="block text-xs font-medium text-gray-700">Coats</label>
                <input
                  id="coats" name="coats" type="number" value={coats}
                  onChange={(e) => setCoats(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="coverage" className="block text-xs font-medium text-gray-700">Coverage (m²/L)</label>
                <input
                  id="coverage" name="coverage" type="number" value={coverage}
                  onChange={(e) => setCoverage(e.target.value)} step="0.5" autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">Typical: 10 m²/L</p>
              </div>
              <div>
                <label htmlFor="wastagePercent" className="block text-xs font-medium text-gray-700">Wastage (%)</label>
                <input
                  id="wastagePercent" name="wastagePercent" type="number" value={wastagePercent}
                  onChange={(e) => setWastagePercent(e.target.value)} step="0.1" autoComplete="off"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-3">
              <input
                type="checkbox" checked={includePrimer}
                onChange={(e) => setIncludePrimer(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Include primer coat (~{PRIMER_COVERAGE_SQM_PER_LITRE} m²/L)
            </label>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <p className="font-bold text-red-900 text-sm mb-1 flex items-center gap-2">
                <AlertCircle size={16} /> Validation Errors
              </p>
              <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                {validationErrors.map((err, i) => (<li key={i}>{err}</li>))}
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
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Paintable Area</p>
              <p className="text-3xl font-bold text-blue-600">{results.paintableArea}</p>
              <p className="text-xs text-gray-600 mt-1">m² (after deducting openings)</p>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Area Breakdown</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Wall Area</span>
                  <span className="font-bold">{results.grossWallArea} m²</span>
                </div>
                <div className="flex justify-between">
                  <span>Door/Window Deductions</span>
                  <span className="font-bold text-red-600">− {results.deductions} m²</span>
                </div>
                {results.ceilingArea > 0 && (
                  <div className="flex justify-between">
                    <span>Ceiling Area</span>
                    <span className="font-bold text-green-600">+ {results.ceilingArea} m²</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                  <span>Net Paintable Area</span>
                  <span>{results.paintableArea} m²</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-bold text-sm text-gray-900">Paint Required</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Coats</span>
                  <span className="font-bold">{results.coats}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coverage</span>
                  <span className="font-bold">{results.coverage} m²/L</span>
                </div>
                <div className="flex justify-between">
                  <span>Wastage</span>
                  <span className="font-bold">{results.wastagePercent}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-blue-600">
                  <span>Paint Required</span>
                  <span>{results.paintLitres} L</span>
                </div>
                <div className="flex justify-between">
                  <span>Suggested Cans</span>
                  <span className="font-bold">{renderCans(results.paintCans)}</span>
                </div>
                {results.primerLitres > 0 && (
                  <>
                    <div className="flex justify-between pt-2 border-t font-bold text-green-600">
                      <span>Primer Required (1 coat)</span>
                      <span>{results.primerLitres} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Primer Cans</span>
                      <span className="font-bold">{renderCans(results.primerCans)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <p className="font-bold text-amber-900 mb-3">Purchase Summary</p>
              <div className="space-y-1 text-sm text-amber-900">
                <p>✓ {results.paintLitres} L paint ({results.coats} coats)</p>
                {results.primerLitres > 0 && <p>✓ {results.primerLitres} L primer</p>}
                <p>✓ Coverage: {results.paintableArea} m²</p>
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
            <h3 className="text-xl font-bold text-gray-900">Painting Estimator</h3>
            <p className="text-sm text-gray-600 mt-1">Estimate paint & primer for walls and ceilings</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Paintable Area</p>
              <p className="text-2xl font-bold text-blue-600">{results.paintableArea}</p>
              <p className="text-xs text-gray-600">m²</p>
              <button
                onClick={() => setShowDetailsModal(true)}
                className="mt-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
              >
                <Info size={14} /> Details
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Coats</p>
              <p className="text-2xl font-bold text-gray-900">{results.coats}</p>
              <p className="text-xs text-gray-600">{results.coverage} m²/L coverage</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Paint Required</p>
              <p className="text-2xl font-bold text-blue-600">{results.paintLitres}</p>
              <p className="text-xs text-gray-600">litres</p>
            </div>

            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Primer</p>
              <p className="text-2xl font-bold text-green-600">{results.primerLitres}</p>
              <p className="text-xs text-gray-600">{results.primerLitres > 0 ? 'litres (1 coat)' : 'not included'}</p>
            </div>
          </div>

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

      {showConfigModal && ReactDOM.createPortal(<ConfigModal />, document.body)}
      {showDetailsModal && ReactDOM.createPortal(<DetailsModal />, document.body)}
    </div>
  );
};

export default PaintingEstimator;
