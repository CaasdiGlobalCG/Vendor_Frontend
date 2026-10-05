import React, { useState } from 'react';
import { Rows3 } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Framing Calculator — wall studs, top/bottom plates.
 *
 * Math: studs = ceil(length ÷ spacing) + 1;
 * stud timber = studs × wall height; plates = 2 × length;
 * stock lengths = ceil(linear ÷ stock length) per component.
 */

const STOCK_LENGTH = 3; // m
const LENGTH_RATE = 180; // ₹ per 3 m length

const FramingCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [length, setLength] = useState('');
  const [height, setHeight] = useState('');
  const [spacingMm, setSpacingMm] = useState('400');
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(length);
    const heightVal = parsePositive(height);
    const spacingVal = parsePositive(spacingMm);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (lengthVal === null) return setError('Wall length must be a positive number');
    if (heightVal === null) return setError('Wall height must be a positive number');
    if (spacingVal === null) return setError('Stud spacing must be a positive number');

    const wasteFactor = 1 + wastageVal / 100;
    const studs = Math.ceil(lengthVal / (spacingVal / 1000) + 1 - 1e-9);
    const studLinear = studs * heightVal * wasteFactor;
    const plateLinear = 2 * lengthVal * wasteFactor;

    const studLengths = Math.ceil(studLinear / STOCK_LENGTH - 1e-9);
    const plateLengths = Math.ceil(plateLinear / STOCK_LENGTH - 1e-9);
    const totalLengths = studLengths + plateLengths;

    setResult({
      studs,
      studLinear,
      plateLinear,
      studLengths,
      plateLengths,
      totalLengths,
      wastagePercent: wastageVal,
      cost: totalLengths * LENGTH_RATE,
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
          icon={<Rows3 className="w-6 h-6 text-info" />}
          title="Framing Calculator"
          description="Wall studs, plates & timber lengths"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Framing"
        subtitle="Stud wall — studs + top/bottom plates"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Wall length" value={length} onChange={setLength} placeholder="e.g. 8" suffix="m" />
        <NumberField label="Wall height" value={height} onChange={setHeight} placeholder="e.g. 3" suffix="m" />
        <NumberField label="Stud spacing" value={spacingMm} onChange={setSpacingMm} suffix="mm" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Framing Estimate" onEdit={handleEdit}>
          <ResultCard title="Timber Required">
            <ResultRow label="Studs" value={`${result.studs} studs (${result.studLinear.toFixed(1)} m)`} />
            <ResultRow label="Top & bottom plates" value={`${result.plateLinear.toFixed(1)} m`} />
            <ResultRow label={`Stock lengths (${STOCK_LENGTH} m each)`} value={`${result.studLengths} + ${result.plateLengths} = ${result.totalLengths}`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Wall area" value={`${length} m × ${height} m`} />
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

export default FramingCalculator;
