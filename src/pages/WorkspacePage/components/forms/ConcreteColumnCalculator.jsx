import React, { useState } from 'react';
import { Columns3 } from 'lucide-react';
import concreteEngine from './boq-engine/concreteEngine.js';
import rateEngine from './boq-engine/rateEngine.js';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Concrete Column Calculator — rectangular RCC columns.
 *
 * Math: volume = L × B × H × count (dimensions in mm → m);
 * materials per m³ from concreteEngine.CONCRETE_GRADES (cement kg, sand m³,
 * aggregate m³); steel = volume × steel density (kg/m³, editable);
 * wastage applied to the concrete volume before materials.
 */

const ConcreteColumnCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [lengthMm, setLengthMm] = useState('230');
  const [widthMm, setWidthMm] = useState('230');
  const [height, setHeight] = useState('');
  const [count, setCount] = useState('4');
  const [grade, setGrade] = useState('M20');
  const [steelDensity, setSteelDensity] = useState('120'); // kg per m³
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(lengthMm);
    const widthVal = parsePositive(widthMm);
    const heightVal = parsePositive(height);
    const countVal = parsePositive(count);
    const steelVal = Number(steelDensity) >= 0 ? Number(steelDensity) : 120;
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (lengthVal === null) return setError('Column length must be a positive number');
    if (widthVal === null) return setError('Column width must be a positive number');
    if (heightVal === null) return setError('Column height must be a positive number');
    if (countVal === null) return setError('Number of columns must be a positive number');

    const volume = (lengthVal / 1000) * (widthVal / 1000) * heightVal * countVal;
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
          icon={<Columns3 className="w-6 h-6 text-info" />}
          title="Concrete Column Calculator"
          description="RCC column concrete, steel & cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Concrete Column"
        subtitle="Rectangular RCC columns — dimensions in mm"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Column length (side A)" value={lengthMm} onChange={setLengthMm} suffix="mm" />
        <NumberField label="Column width (side B)" value={widthMm} onChange={setWidthMm} suffix="mm" />
        <NumberField label="Column height" value={height} onChange={setHeight} placeholder="e.g. 3" suffix="m" />
        <NumberField label="Number of columns" value={count} onChange={setCount} />
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
        <ResultPanel title="Column Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Cement" value={`${result.cementBags.toFixed(2)} bags (${result.cementKg.toFixed(1)} kg)`} />
            <ResultRow label="Sand" value={`${result.sandM3.toFixed(3)} m³`} />
            <ResultRow label="Aggregate" value={`${result.aggregateM3.toFixed(3)} m³`} />
            <ResultRow label="Steel (TMT)" value={`${result.steelKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Concrete volume" value={`${result.volume.toFixed(3)} m³`} />
            <ResultRow label="With wastage" value={`${result.volumeWithWaste.toFixed(3)} m³`} />
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

export default ConcreteColumnCalculator;
