import React, { useState } from 'react';
import { Waves } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';
import {
  PIPE_DIAMETERS, PIPE_LENGTH_M, PIPE_MATERIALS, defaultPipeRate, plumbingPipe,
} from './calculator-kit/extraCalcMath';

/**
 * Plumbing Pipe Calculator — pipe lengths, fittings and cost for a run.
 *
 * Math: pipes = ceil(run × wastage / 3 m); fittings = ceil(run / metres per
 * fitting); cost = pipes × 3 m × rate + fittings × fitting rate. Rate defaults
 * follow diameter and material and stay editable.
 */
const PlumbingPipeCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [runLength, setRunLength] = useState('');
  const [diameter, setDiameter] = useState('20');
  const [material, setMaterial] = useState('cpvc');
  const [rate, setRate] = useState(String(defaultPipeRate(20, 'cpvc')));
  const [fittingRate, setFittingRate] = useState('45');
  const [metresPerFitting, setMetresPerFitting] = useState('1.5');
  const [wastage, setWastage] = useState('5');

  const handleDiameter = (next) => {
    setDiameter(next);
    setRate(String(defaultPipeRate(Number(next), material)));
  };
  const handleMaterial = (next) => {
    setMaterial(next);
    setRate(String(defaultPipeRate(Number(diameter), next)));
  };

  const handleCalculate = () => {
    setError('');
    const runVal = parsePositive(runLength);
    const rateVal = parsePositive(rate);
    const perFittingVal = parsePositive(metresPerFitting);
    if (runVal === null) return setError('Pipe run length must be a positive number');
    if (rateVal === null) return setError('Pipe rate must be a positive number');
    if (perFittingVal === null) return setError('Metres per fitting must be a positive number');
    const fittingRateVal = Number(fittingRate) >= 0 ? Number(fittingRate) : 0;
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;

    setResult({
      runLength: runVal,
      wastagePercent: wastageVal,
      ...plumbingPipe({
        runLength: runVal,
        diameter: Number(diameter),
        material,
        wastagePercent: wastageVal,
        metresPerFitting: perFittingVal,
        fittingRate: fittingRateVal,
        ratePerM: rateVal,
      }),
    });
    setOpen(false);
  };

  const handleEdit = () => {
    setResult(null);
    setOpen(true);
  };

  return (
    <div className="w-full">
      {!result && !open && (
        <CalcLandingCard
          icon={<Waves className="w-6 h-6 text-info" />}
          title="Plumbing Pipe Calculator"
          description="Pipe lengths, fittings and cost for a plumbing run"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Plumbing Run"
        subtitle="Pipe size, material and fittings"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Total pipe run" value={runLength} onChange={setRunLength} placeholder="e.g. 45" suffix="m" />
        <SelectField
          label="Pipe diameter"
          value={diameter}
          onChange={handleDiameter}
          options={PIPE_DIAMETERS.map((d) => ({ value: String(d), label: `${d} mm` }))}
        />
        <SelectField
          label="Material"
          value={material}
          onChange={handleMaterial}
          options={Object.entries(PIPE_MATERIALS).map(([value, m]) => ({ value, label: m.label }))}
        />
        <NumberField label="Pipe rate" value={rate} onChange={setRate} suffix="₹ / m" />
        <NumberField label="One fitting every" value={metresPerFitting} onChange={setMetresPerFitting} suffix="m" />
        <NumberField label="Fitting rate" value={fittingRate} onChange={setFittingRate} suffix="₹ each" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Plumbing Pipe Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label={`${result.diameter} mm ${PIPE_MATERIALS[result.material].label}`} value={`${result.metres.toFixed(1)} m`} />
            <ResultRow label={`Pipe pieces (${PIPE_LENGTH_M} m)`} value={result.pieces} />
            <ResultRow label="Fittings (elbows, tees, couplers)" value={result.fittings} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Pipe run" value={`${result.runLength} m`} />
            <ResultRow label="Wastage" value={`${result.wastagePercent}%`} />
          </ResultCard>
          <ResultCard>
            <ResultRow label="Pipes" value={formatINR(result.pipeCost)} />
            <ResultRow label="Fittings" value={formatINR(result.fittingCost)} />
            <ResultRow label="Estimated cost" value={formatINR(result.totalCost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default PlumbingPipeCalculator;
