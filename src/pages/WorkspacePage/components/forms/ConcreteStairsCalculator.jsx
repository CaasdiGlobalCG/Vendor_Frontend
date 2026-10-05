import React, { useState } from 'react';
import { Footprints } from 'lucide-react';
import concreteEngine from './boq-engine/concreteEngine.js';
import rateEngine from './boq-engine/rateEngine.js';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Concrete Stairs Calculator — straight flight RCC stairs.
 *
 * Math:
 *  stepped volume = steps × (riser/2 × tread) × width   [triangular step prisms]
 *  waist volume   = inclineLength × width × waistThickness,
 *                   inclineLength = √((steps×tread)² + (steps×riser)²)
 *  materials per m³ from CONCRETE_GRADES; steel = volume × density (default 80).
 */

const ConcreteStairsCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [steps, setSteps] = useState('');
  const [riserMm, setRiserMm] = useState('150');
  const [treadMm, setTreadMm] = useState('300');
  const [width, setWidth] = useState('1');
  const [waistMm, setWaistMm] = useState('150');
  const [grade, setGrade] = useState('M20');
  const [steelDensity, setSteelDensity] = useState('80'); // kg per m³
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const stepsVal = parsePositive(steps);
    const riserVal = parsePositive(riserMm);
    const treadVal = parsePositive(treadMm);
    const widthVal = parsePositive(width);
    const waistVal = parsePositive(waistMm);
    const steelVal = Number(steelDensity) >= 0 ? Number(steelDensity) : 80;
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (stepsVal === null) return setError('Number of steps must be a positive number');
    if (riserVal === null) return setError('Riser height must be a positive number');
    if (treadVal === null) return setError('Tread depth must be a positive number');
    if (widthVal === null) return setError('Stair width must be a positive number');
    if (waistVal === null) return setError('Waist slab thickness must be a positive number');

    const riser = riserVal / 1000;
    const tread = treadVal / 1000;
    const waist = waistVal / 1000;

    const steppedVolume = stepsVal * ((riser * tread) / 2) * widthVal;
    const inclineLength = Math.sqrt(Math.pow(stepsVal * tread, 2) + Math.pow(stepsVal * riser, 2));
    const waistVolume = inclineLength * widthVal * waist;
    const volume = steppedVolume + waistVolume;
    const volumeWithWaste = volume * (1 + wastageVal / 100);

    const mix = concreteEngine.CONCRETE_GRADES[grade] || concreteEngine.CONCRETE_GRADES.M20;
    const cementKg = volumeWithWaste * mix.cement;
    const sandM3 = volumeWithWaste * mix.sand;
    const aggregateM3 = volumeWithWaste * mix.aggregate;
    const cementBags = cementKg / 50;
    const steelKg = volumeWithWaste * steelVal;

    setResult({
      volume,
      volumeWithWaste,
      inclineLength,
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
          icon={<Footprints className="w-6 h-6 text-info" />}
          title="Concrete Stairs Calculator"
          description="Straight flight RCC stairs — concrete, steel & cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Concrete Stairs"
        subtitle="Straight flight — includes the waist slab"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Number of steps" value={steps} onChange={setSteps} placeholder="e.g. 12" />
        <NumberField label="Riser height" value={riserMm} onChange={setRiserMm} suffix="mm" />
        <NumberField label="Tread depth" value={treadMm} onChange={setTreadMm} suffix="mm" />
        <NumberField label="Stair width" value={width} onChange={setWidth} suffix="m" />
        <NumberField label="Waist slab thickness" value={waistMm} onChange={setWaistMm} suffix="mm" />
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
        <ResultPanel title="Stairs Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Cement" value={`${result.cementBags.toFixed(2)} bags (${result.cementKg.toFixed(1)} kg)`} />
            <ResultRow label="Sand" value={`${result.sandM3.toFixed(3)} m³`} />
            <ResultRow label="Aggregate" value={`${result.aggregateM3.toFixed(3)} m³`} />
            <ResultRow label="Steel (TMT)" value={`${result.steelKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Concrete volume" value={`${result.volume.toFixed(3)} m³`} />
            <ResultRow label="Incline length" value={`${result.inclineLength.toFixed(2)} m`} />
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

export default ConcreteStairsCalculator;
