import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Plaster Calculator — cement, sand & water for wall plaster.
 *
 * Math: wet volume = area × thickness; dry volume = wet × 1.33;
 * cement = dry × (1 / (1+sandParts)); sand = dry × (sandParts / (1+sandParts));
 * wastage applied to materials; water ≈ 0.5 × cement weight (w/c 0.5).
 */

const MIXES = {
  '1:4': { cement: 1, sand: 4, label: '1:4 (rich — external)' },
  '1:5': { cement: 1, sand: 5, label: '1:5' },
  '1:6': { cement: 1, sand: 6, label: '1:6 (common — internal)' },
};
const DRY_FACTOR = 1.33;
const CEMENT_DENSITY = 1440; // kg per m³
const BAG_KG = 50;
const CEMENT_BAG_RATE = 400; // ₹ per 50kg bag
const SAND_RATE = 1200; // ₹ per m³

const PlasterCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [area, setArea] = useState('');
  const [thicknessMm, setThicknessMm] = useState('12');
  const [mix, setMix] = useState('1:6');
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const areaVal = parsePositive(area);
    const thicknessVal = parsePositive(thicknessMm);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (areaVal === null) return setError('Wall area must be a positive number');
    if (thicknessVal === null) return setError('Thickness must be a positive number');

    const { cement, sand } = MIXES[mix] || MIXES['1:6'];
    const parts = cement + sand;

    const wetVolume = areaVal * (thicknessVal / 1000);
    const dryVolume = wetVolume * DRY_FACTOR;
    const cementKg = (dryVolume * (cement / parts)) * CEMENT_DENSITY;
    const sandM3 = dryVolume * (sand / parts);

    const wasteFactor = 1 + wastageVal / 100;
    const cementKgWithWaste = cementKg * wasteFactor;
    const sandWithWaste = sandM3 * wasteFactor;
    const cementBags = cementKgWithWaste / BAG_KG;
    const waterLitres = cementKgWithWaste * 0.5;

    setResult({
      area: areaVal,
      thicknessMm: thicknessVal,
      mix,
      wastagePercent: wastageVal,
      wetVolume,
      dryVolume,
      cementBags,
      cementKg: cementKgWithWaste,
      sandM3: sandWithWaste,
      waterLitres,
      cost: cementBags * CEMENT_BAG_RATE + sandWithWaste * SAND_RATE,
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
          icon={<Layers className="w-6 h-6 text-info" />}
          title="Plaster Calculator"
          description="Cement, sand & water for wall plaster at any thickness"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Plaster"
        subtitle="Enter the plastering area, thickness and mix"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Plaster area" value={area} onChange={setArea} placeholder="e.g. 100" suffix="m²" />
        <NumberField label="Thickness" value={thicknessMm} onChange={setThicknessMm} suffix="mm" />
        <SelectField
          label="Cement : Sand mix"
          value={mix}
          onChange={setMix}
          options={Object.entries(MIXES).map(([value, m]) => ({ value, label: m.label }))}
        />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Plaster Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Cement" value={`${result.cementBags.toFixed(2)} bags (${result.cementKg.toFixed(1)} kg)`} />
            <ResultRow label="Sand" value={`${result.sandM3.toFixed(3)} m³`} />
            <ResultRow label="Water" value={`${result.waterLitres.toFixed(1)} L`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Plaster area" value={`${result.area} m²`} />
            <ResultRow label="Thickness" value={`${result.thicknessMm} mm`} />
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

export default PlasterCalculator;
