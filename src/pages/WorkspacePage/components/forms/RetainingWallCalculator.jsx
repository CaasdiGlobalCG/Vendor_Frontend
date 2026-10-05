import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import concreteEngine from './boq-engine/concreteEngine.js';
import rateEngine from './boq-engine/rateEngine.js';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Retaining Wall Calculator — RCC cantilever retaining walls.
 *
 * Math: stem volume = length × height × stem thickness;
 * base volume = length × base width × base thickness;
 * materials per m³ from CONCRETE_GRADES; steel = volume × density (default 80).
 */

const RetainingWallCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [length, setLength] = useState('');
  const [height, setHeight] = useState('');
  const [stemThicknessMm, setStemThicknessMm] = useState('200');
  const [baseWidth, setBaseWidth] = useState('1.5'); // m
  const [baseThickness, setBaseThickness] = useState('0.3'); // m
  const [grade, setGrade] = useState('M20');
  const [steelDensity, setSteelDensity] = useState('80'); // kg per m³
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(length);
    const heightVal = parsePositive(height);
    const stemVal = parsePositive(stemThicknessMm);
    const baseWidthVal = parsePositive(baseWidth);
    const baseThicknessVal = parsePositive(baseThickness);
    const steelVal = Number(steelDensity) >= 0 ? Number(steelDensity) : 80;
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (lengthVal === null) return setError('Wall length must be a positive number');
    if (heightVal === null) return setError('Wall height must be a positive number');
    if (stemVal === null) return setError('Stem thickness must be a positive number');
    if (baseWidthVal === null || baseThicknessVal === null) return setError('Base dimensions must be positive numbers');

    const stemVolume = lengthVal * heightVal * (stemVal / 1000);
    const baseVolume = lengthVal * baseWidthVal * baseThicknessVal;
    const volume = stemVolume + baseVolume;
    const volumeWithWaste = volume * (1 + wastageVal / 100);

    const mix = concreteEngine.CONCRETE_GRADES[grade] || concreteEngine.CONCRETE_GRADES.M20;
    const cementKg = volumeWithWaste * mix.cement;
    const sandM3 = volumeWithWaste * mix.sand;
    const aggregateM3 = volumeWithWaste * mix.aggregate;
    const cementBags = cementKg / 50;
    const steelKg = volumeWithWaste * steelVal;

    setResult({
      stemVolume,
      baseVolume,
      volume,
      volumeWithWaste,
      grade,
      wastagePercent: wastageVal,
      cementBags,
      cementKg,
      sandM3,
      aggregateM3,
      steelKg,
      cost:
        cementBags * rateEngine.STANDARD_RATES.cementBag.rate +
        sandM3 * rateEngine.STANDARD_RATES.sandM3.rate +
        aggregateM3 * rateEngine.STANDARD_RATES.aggregate20mm.rate +
        steelKg * rateEngine.STANDARD_RATES.steelTMT.rate,
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
          icon={<Shield className="w-6 h-6 text-info" />}
          title="Retaining Wall Calculator"
          description="RCC cantilever wall — concrete, steel & cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Retaining Wall"
        subtitle="RCC cantilever wall — stem + base"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Wall length" value={length} onChange={setLength} placeholder="e.g. 20" suffix="m" />
        <NumberField label="Wall height" value={height} onChange={setHeight} placeholder="e.g. 3" suffix="m" />
        <NumberField label="Stem thickness" value={stemThicknessMm} onChange={setStemThicknessMm} suffix="mm" />
        <NumberField label="Base width" value={baseWidth} onChange={setBaseWidth} suffix="m" />
        <NumberField label="Base thickness" value={baseThickness} onChange={setBaseThickness} suffix="m" />
        <SelectField
          label="Concrete grade"
          value={grade}
          onChange={setGrade}
          options={Object.keys(concreteEngine.CONCRETE_GRADES).map((g) => ({ value: g, label: g }))}
        />
        <NumberField label="Steel density" value={steelDensity} onChange={setSteelDensity} suffix="kg per m³" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Retaining Wall Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Cement" value={`${result.cementBags.toFixed(2)} bags (${result.cementKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg)`} />
            <ResultRow label="Sand" value={`${result.sandM3.toFixed(3)} m³`} />
            <ResultRow label="Aggregate" value={`${result.aggregateM3.toFixed(3)} m³`} />
            <ResultRow label="Steel (TMT)" value={`${result.steelKg.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Stem volume" value={`${result.stemVolume.toFixed(3)} m³`} />
            <ResultRow label="Base volume" value={`${result.baseVolume.toFixed(3)} m³`} />
            <ResultRow label="Total with wastage" value={`${result.volumeWithWaste.toFixed(3)} m³`} />
            <ResultRow label="Grade" value={result.grade} />
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

export default RetainingWallCalculator;
