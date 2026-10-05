import React, { useState } from 'react';
import { Box } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * PCC Calculator — Plain Cement Concrete for beds, bases and levelling courses.
 *
 * Math: volume = L × W × T; dry volume = volume × 1.54;
 * cement = dry × (cementParts / parts) × 1440 kg/m³; sand & aggregate
 * proportional; wastage applied to materials.
 */

const MIXES = {
  '1:4:8': { cement: 1, sand: 4, aggregate: 8, label: '1:4:8 (levelling / base)' },
  '1:3:6': { cement: 1, sand: 3, aggregate: 6, label: '1:3:6 (bed concrete)' },
  '1:2:4': { cement: 1, sand: 2, aggregate: 4, label: '1:2:4 (strong base)' },
};
const DRY_FACTOR = 1.54;
const CEMENT_DENSITY = 1440; // kg per m³
const BAG_KG = 50;
const RATES = { cementBag: 400, sandM3: 1200, aggregateM3: 1400 };

const PCCCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thicknessMm, setThicknessMm] = useState('100');
  const [mix, setMix] = useState('1:4:8');
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(length);
    const widthVal = parsePositive(width);
    const thicknessVal = parsePositive(thicknessMm);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (lengthVal === null) return setError('Length must be a positive number');
    if (widthVal === null) return setError('Width must be a positive number');
    if (thicknessVal === null) return setError('Thickness must be a positive number');

    const { cement, sand, aggregate } = MIXES[mix] || MIXES['1:4:8'];
    const parts = cement + sand + aggregate;

    const volume = lengthVal * widthVal * (thicknessVal / 1000);
    const dryVolume = volume * DRY_FACTOR;
    const wasteFactor = 1 + wastageVal / 100;

    const cementKg = dryVolume * (cement / parts) * CEMENT_DENSITY * wasteFactor;
    const sandM3 = dryVolume * (sand / parts) * wasteFactor;
    const aggregateM3 = dryVolume * (aggregate / parts) * wasteFactor;
    const cementBags = cementKg / BAG_KG;

    setResult({
      volume,
      mix,
      wastagePercent: wastageVal,
      cementBags,
      cementKg,
      sandM3,
      aggregateM3,
      cost: cementBags * RATES.cementBag + sandM3 * RATES.sandM3 + aggregateM3 * RATES.aggregateM3,
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
          icon={<Box className="w-6 h-6 text-info" />}
          title="PCC Calculator"
          description="Plain cement concrete quantities for beds and bases"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure PCC"
        subtitle="Enter the base dimensions and cement : sand : aggregate mix"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Length" value={length} onChange={setLength} placeholder="e.g. 5" suffix="m" />
        <NumberField label="Width" value={width} onChange={setWidth} placeholder="e.g. 5" suffix="m" />
        <NumberField label="Thickness" value={thicknessMm} onChange={setThicknessMm} suffix="mm" />
        <SelectField
          label="Mix (cement : sand : aggregate)"
          value={mix}
          onChange={setMix}
          options={Object.entries(MIXES).map(([value, m]) => ({ value, label: m.label }))}
        />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="PCC Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Cement" value={`${result.cementBags.toFixed(2)} bags (${result.cementKg.toFixed(1)} kg)`} />
            <ResultRow label="Sand" value={`${result.sandM3.toFixed(3)} m³`} />
            <ResultRow label="Aggregate" value={`${result.aggregateM3.toFixed(3)} m³`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Concrete volume" value={`${result.volume.toFixed(3)} m³`} />
            <ResultRow label="Mix" value={result.mix} />
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

export default PCCCalculator;
