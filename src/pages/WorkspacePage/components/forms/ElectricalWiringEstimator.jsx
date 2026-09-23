import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, AlertCircle, Info, X } from 'lucide-react';

const ElectricalWiringEstimator = ({ data, nodeId, workspaceId, setNodes }) => {
  // ==================== CONSTANTS ====================
  const FEET_TO_METER = 0.3048;
  const WIRE_COIL_LENGTH = 90; // standard wire coil in meters
  const CONDUIT_LENGTH_M = 3; // standard conduit pipe length in meters
  const SLACK_PERCENT = 10; // extra wire for slack/routing
  const WIRE_GAUGES = ['1.0', '1.5', '2.5', '4.0', '6.0']; // sq mm

  // ==================== STATE MANAGEMENT ====================
  const [results, setResults] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state
  const [unit, setUnit] = useState('meter');
  const [numRooms, setNumRooms] = useState('1');
  const [lightPoints, setLightPoints] = useState('4');
  const [fanPoints, setFanPoints] = useState('1');
  const [socketPoints, setSocketPoints] = useState('4');
  const [switchPoints, setSwitchPoints] = useState('2');
  const [avgDistance, setAvgDistance] = useState('6'); // avg wire run per point
  const [wireGauge, setWireGauge] = useState('1.5');
  const [conduitPercent, setConduitPercent] = useState('80'); // % of wire run needing conduit
  const [validationErrors, setValidationErrors] = useState([]);

  // ==================== VALIDATION ====================
  const validateInputs = () => {
    const errors = [];

    const nR = parseInt(numRooms, 10);
    const lP = parseInt(lightPoints, 10);
    const fP = parseInt(fanPoints, 10);
    const sP = parseInt(socketPoints, 10);
    const swP = parseInt(switchPoints, 10);
    const aD = parseFloat(avgDistance);
    const cP = parseFloat(conduitPercent);

    if (isNaN(nR) || nR <= 0) errors.push('Number of rooms must be a positive number');
    if (isNaN(lP) || lP < 0) errors.push('Light points cannot be negative');
    if (isNaN(fP) || fP < 0) errors.push('Fan points cannot be negative');
    if (isNaN(sP) || sP < 0) errors.push('Socket points cannot be negative');
    if (isNaN(swP) || swP < 0) errors.push('Switch points cannot be negative');
    if (isNaN(lP + fP + sP + swP) || (lP + fP + sP + swP) <= 0) errors.push('At least one point is required per room');
    if (avgDistance === '' || isNaN(aD) || aD <= 0) errors.push('Average distance per point must be a positive number');
    if (isNaN(cP) || cP < 0 || cP > 100) errors.push('Conduit percentage must be between 0 and 100');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // ==================== CALCULATION ENGINE ====================
  const runCalculation = () => {
    if (!validateInputs()) return;

    const nR = parseInt(numRooms, 10);
    const pointsPerRoom = {
      light: parseInt(lightPoints, 10) || 0,
      fan: parseInt(fanPoints, 10) || 0,
      socket: parseInt(socketPoints, 10) || 0,
      switch: parseInt(switchPoints, 10) || 0,
    };
    const totalPointsPerRoom = pointsPerRoom.light + pointsPerRoom.fan + pointsPerRoom.socket + pointsPerRoom.switch;
    const totalPoints = totalPointsPerRoom * nR;

    const distM = unit === 'feet' ? parseFloat(avgDistance) * FEET_TO_METER : parseFloat(avgDistance);
    const slackMultiplier = 1 + SLACK_PERCENT / 100;

    // Each point needs live + neutral (and earth folded into slack)
    const wirePerPoint = distM * 2 * slackMultiplier;
    const totalWireLength = parseFloat((wirePerPoint * totalPoints).toFixed(2));
    const coilsRequired = Math.ceil(totalWireLength / WIRE_COIL_LENGTH);

    const cP = parseFloat(conduitPercent) / 100;
    const conduitLength = parseFloat((distM * totalPoints * cP * slackMultiplier).toFixed(2));
    const conduitPipes = Math.ceil(conduitLength / CONDUIT_LENGTH_M);

    setResults({
      numRooms: nR,
      pointsPerRoom,
      totalPoints,
      wireGauge,
      wirePerPoint: parseFloat(wirePerPoint.toFixed(2)),
      totalWireLength,
      coilsRequired,
      conduitPercent: parseFloat(conduitPercent),
      conduitLength,
      conduitPipes,
      avgDistance: distM.toFixed(2),
    });
    setShowConfigModal(false);
  };

  const handleReset = () => {
    setResults(null);
    setNumRooms('1');
    setLightPoints('4');
    setFanPoints('1');
    setSocketPoints('4');
    setSwitchPoints('2');
    setAvgDistance('6');
    setWireGauge('1.5');
    setConduitPercent('80');
    setValidationErrors([]);
    setShowConfigModal(false);
    setShowDetailsModal(false);
  };

  // ==================== MODAL COMPONENTS ====================
  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-line p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-ink">Configure Electrical Wiring</h3>
            <p className="text-sm text-dim mt-1">Enter load points & wire run distances</p>
          </div>
          <button onClick={() => setShowConfigModal(false)} className="text-dim hover:text-dim">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Unit Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">Unit</label>
            <div className="flex gap-2">
              {['meter', 'feet'].map(u => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    unit === u ? 'bg-info text-white' : 'bg-surface-hover text-ink hover:bg-surface-hover'
                  }`}
                >
                  {u === 'meter' ? 'Meter' : 'Feet'}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms & Points */}
          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium text-ink mb-3">Rooms & Load Points (per room)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="numRooms" className="block text-xs font-medium text-ink">No. of Rooms</label>
                <input
                  id="numRooms" name="numRooms" type="number" value={numRooms}
                  onChange={(e) => setNumRooms(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
              </div>
              <div>
                <label htmlFor="lightPoints" className="block text-xs font-medium text-ink">Light Points</label>
                <input
                  id="lightPoints" name="lightPoints" type="number" value={lightPoints}
                  onChange={(e) => setLightPoints(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
              </div>
              <div>
                <label htmlFor="fanPoints" className="block text-xs font-medium text-ink">Fan Points</label>
                <input
                  id="fanPoints" name="fanPoints" type="number" value={fanPoints}
                  onChange={(e) => setFanPoints(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
              </div>
              <div>
                <label htmlFor="socketPoints" className="block text-xs font-medium text-ink">Socket Points</label>
                <input
                  id="socketPoints" name="socketPoints" type="number" value={socketPoints}
                  onChange={(e) => setSocketPoints(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
              </div>
              <div>
                <label htmlFor="switchPoints" className="block text-xs font-medium text-ink">Switch Points</label>
                <input
                  id="switchPoints" name="switchPoints" type="number" value={switchPoints}
                  onChange={(e) => setSwitchPoints(e.target.value)} autoComplete="off"
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
              </div>
              <div>
                <label htmlFor="avgDistance" className="block text-xs font-medium text-ink">Avg Run/Point ({unit})</label>
                <input
                  id="avgDistance" name="avgDistance" type="number" value={avgDistance}
                  onChange={(e) => setAvgDistance(e.target.value)} step="0.5" autoComplete="off"
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
                <p className="text-xs text-dim mt-1">Distance from board to point</p>
              </div>
            </div>
          </div>

          {/* Wire & Conduit */}
          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium text-ink mb-3">Wire & Conduit</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="wireGauge" className="block text-xs font-medium text-ink">Wire Gauge (sq mm)</label>
                <select
                  id="wireGauge" name="wireGauge" value={wireGauge}
                  onChange={(e) => setWireGauge(e.target.value)}
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                >
                  {WIRE_GAUGES.map(g => (
                    <option key={g} value={g}>{g} sq mm{g === '1.5' ? ' (light/fan)' : g === '2.5' ? ' (sockets)' : g === '4.0' || g === '6.0' ? ' (heavy load)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="conduitPercent" className="block text-xs font-medium text-ink">Concealed Conduit (%)</label>
                <input
                  id="conduitPercent" name="conduitPercent" type="number" value={conduitPercent}
                  onChange={(e) => setConduitPercent(e.target.value)} min="0" max="100" autoComplete="off"
                  className="w-full px-2 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
                <p className="text-xs text-dim mt-1">% of wiring run inside conduit</p>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-danger/10 border-l-4 border-danger p-3 rounded">
              <p className="font-bold text-danger text-sm mb-1 flex items-center gap-2">
                <AlertCircle size={16} /> Validation Errors
              </p>
              <ul className="list-disc list-inside text-xs text-danger space-y-1">
                {validationErrors.map((err, i) => (<li key={i}>{err}</li>))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-line">
            <button
              onClick={() => setShowConfigModal(false)}
              className="bg-surface-hover hover:bg-surface-hover text-ink font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={runCalculation}
              className="bg-info hover:bg-info text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
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
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-line p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-ink">Complete Breakdown</h3>
          <button onClick={() => setShowDetailsModal(false)} className="text-dim hover:text-dim">
            <X size={24} />
          </button>
        </div>

        {results && (
          <div className="p-6 space-y-4">
            <div className="bg-info/10 border-2 border-info/20 rounded-lg p-4">
              <p className="text-sm text-dim">Total Load Points</p>
              <p className="text-3xl font-bold text-info">{results.totalPoints}</p>
              <p className="text-xs text-dim mt-1">across {results.numRooms} room{results.numRooms > 1 ? 's' : ''}</p>
            </div>

            <div className="border border-line rounded-lg overflow-hidden">
              <div className="bg-canvas p-3 border-b font-bold text-sm text-ink">Points per Room</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Lights</span><span className="font-bold">{results.pointsPerRoom.light}</span></div>
                <div className="flex justify-between"><span>Fans</span><span className="font-bold">{results.pointsPerRoom.fan}</span></div>
                <div className="flex justify-between"><span>Sockets</span><span className="font-bold">{results.pointsPerRoom.socket}</span></div>
                <div className="flex justify-between pt-2 border-t"><span>Switches</span><span className="font-bold">{results.pointsPerRoom.switch}</span></div>
              </div>
            </div>

            <div className="border border-line rounded-lg overflow-hidden">
              <div className="bg-canvas p-3 border-b font-bold text-sm text-ink">Wire Required</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Wire Gauge</span><span className="font-bold">{results.wireGauge} sq mm</span></div>
                <div className="flex justify-between"><span>Wire per Point (L+N +{SLACK_PERCENT}% slack)</span><span className="font-bold">{results.wirePerPoint} m</span></div>
                <div className="flex justify-between pt-2 border-t font-bold text-info">
                  <span>Total Wire</span><span>{results.totalWireLength} m</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Coils ({WIRE_COIL_LENGTH} m each)</span><span className="text-success">{results.coilsRequired}</span>
                </div>
              </div>
            </div>

            <div className="border border-line rounded-lg overflow-hidden">
              <div className="bg-canvas p-3 border-b font-bold text-sm text-ink">Conduit Required</div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Concealed Run</span><span className="font-bold">{results.conduitPercent}%</span></div>
                <div className="flex justify-between pt-2 border-t font-bold text-info">
                  <span>Total Conduit</span><span>{results.conduitLength} m</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Pipes ({CONDUIT_LENGTH_M} m each)</span><span className="text-success">{results.conduitPipes}</span>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 border-2 border-warning/20 rounded-lg p-4">
              <p className="font-bold text-warning mb-3">Purchase Summary</p>
              <div className="space-y-1 text-sm text-warning">
                <p>✓ {results.coilsRequired} coils of {results.wireGauge} sq mm wire ({results.totalWireLength} m)</p>
                <p>✓ {results.conduitPipes} conduit pipes ({results.conduitLength} m)</p>
                <p>✓ {results.totalPoints} load points wired</p>
              </div>
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              className="w-full bg-info hover:bg-info text-white font-bold py-2 rounded-lg text-sm"
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
    <div className="w-full bg-surface rounded-lg shadow-lg p-6">
      {!results ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-ink">Electrical Wiring Estimator</h3>
            <p className="text-sm text-dim mt-1">Estimate wire coils & conduit for load points</p>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full bg-info hover:bg-info text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
          >
            Configure & Calculate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-info/10 border-2 border-info/20 p-4 rounded-lg">
              <p className="text-xs text-dim mb-1">Total Points</p>
              <p className="text-2xl font-bold text-info">{results.totalPoints}</p>
              <p className="text-xs text-dim">{results.numRooms} room{results.numRooms > 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowDetailsModal(true)}
                className="mt-2 text-info hover:text-info flex items-center gap-1 text-xs"
              >
                <Info size={14} /> Details
              </button>
            </div>

            <div className="bg-canvas border-2 border-line p-4 rounded-lg">
              <p className="text-xs text-dim mb-1">Wire Gauge</p>
              <p className="text-2xl font-bold text-ink">{results.wireGauge}</p>
              <p className="text-xs text-dim">sq mm</p>
            </div>

            <div className="bg-info/10 border-2 border-info/20 p-4 rounded-lg">
              <p className="text-xs text-dim mb-1">Wire Required</p>
              <p className="text-2xl font-bold text-info">{results.totalWireLength}</p>
              <p className="text-xs text-dim">m ({results.coilsRequired} coils)</p>
            </div>

            <div className="bg-success/10 border-2 border-success/20 p-4 rounded-lg">
              <p className="text-xs text-dim mb-1">Conduit</p>
              <p className="text-2xl font-bold text-success">{results.conduitLength}</p>
              <p className="text-xs text-dim">m ({results.conduitPipes} pipes)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleReset}
              className="bg-surface-hover hover:bg-surface-hover text-ink font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="bg-info hover:bg-info text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
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

export default ElectricalWiringEstimator;
