import React, { useState } from 'react';
import { Triangle } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Roof Truss Calculator — truss count + timber take-off (gable trusses).
 *
 * Math: trusses = ceil(roof length ÷ spacing) + 1;
 * rise = span × (pitch% ÷ 100) ÷ 2; rafter = √((span/2)² + rise²);
 * timber per truss = 2 × rafter (top chords) + span (bottom chord)
 *                    + 0.4 × span (webs estimate);
 * total timber = trusses × per-truss × (1 + wastage).
 */

const TIMBER_RATE = 180; // ₹ per metre (editable)
const WEB_FACTOR = 0.4; // web members ≈ 40% of span (editable estimate)

const RoofTrussCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [span, setSpan] = useState('');
  const [length, setLength] = useState('');
  const [pitchPercent, setPitchPercent] = useState('30');
  const [spacing, setSpacing] = useState('1.2'); // m
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const spanVal = parsePositive(span);
    const lengthVal = parsePositive(length);
    const pitchVal = Number(pitchPercent) >= 0 ? Number(pitchPercent) : 30;
    const spacingVal = parsePositive(spacing);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (spanVal === null) return setError('Building span must be a positive number');
    if (lengthVal === null) return setError('Roof length must be a positive number');
    if (spacingVal === null) return setError('Truss spacing must be a positive number');

    const trusses = Math.ceil(lengthVal / spacingVal + 1 - 1e-9);
    const rise = (spanVal * (pitchVal / 100)) / 2;
    const rafter = Math.sqrt(Math.pow(spanVal / 2, 2) + Math.pow(rise, 2));
    const timberPerTruss = 2 * rafter + spanVal + WEB_FACTOR * spanVal;
    const totalTimber = trusses * timberPerTruss * (1 + wastageVal / 100);

    setResult({
      trusses,
      rise,
      rafter,
      timberPerTruss,
      totalTimber,
      wastagePercent: wastageVal,
      cost: totalTimber * TIMBER_RATE,
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
          icon={<Triangle className="w-6 h-6 text-info" />}
          title="Roof Truss Calculator"
          description="Truss count, chord lengths & timber cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Roof Truss"
        subtitle="Gable trusses — chords + web estimate"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Building span" value={span} onChange={setSpan} placeholder="e.g. 8" suffix="m" />
        <NumberField label="Roof length" value={length} onChange={setLength} placeholder="e.g. 12" suffix="m" />
        <NumberField label="Roof pitch" value={pitchPercent} onChange={setPitchPercent} suffix="%" />
        <NumberField label="Truss spacing" value={spacing} onChange={setSpacing} suffix="m" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Truss Estimate" onEdit={handleEdit}>
          <ResultCard title="Trusses & Timber">
            <ResultRow label="Trusses required" value={`${result.trusses} trusses`} />
            <ResultRow label="Rafter length" value={`${result.rafter.toFixed(2)} m (rise ${result.rise.toFixed(2)} m)`} />
            <ResultRow label="Timber per truss" value={`${result.timberPerTruss.toFixed(2)} m`} />
            <ResultRow label="Total timber" value={`${result.totalTimber.toFixed(1)} m`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Wastage" value={`${result.wastagePercent}%`} />
          </ResultCard>
          <ResultCard>
            <ResultRow label="Estimated cost" value={formatINR(result.cost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default RoofTrussCalculator;
