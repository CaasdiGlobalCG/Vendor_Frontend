import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';
import { CEILING_TYPES, falseCeiling } from './calculator-kit/extraCalcMath';

/**
 * False Ceiling Calculator — boards/tiles, GI channels, screws and cost.
 *
 * Math: sheets = ceil(area / sheet area × wastage); channel metres, screws and
 * jointing compound scale with area (per-m² allowances by ceiling type);
 * cost = area × installed rate + cove perimeter × cove rate.
 */
const FalseCeilingCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [area, setArea] = useState('');
  const [type, setType] = useState('gypsum');
  const [rate, setRate] = useState(String(CEILING_TYPES.gypsum.defaultRate));
  const [wastage, setWastage] = useState('8');
  const [perimeter, setPerimeter] = useState('');
  const [coveRate, setCoveRate] = useState('250');

  const handleTypeChange = (next) => {
    setType(next);
    setRate(String(CEILING_TYPES[next].defaultRate));
  };

  const handleCalculate = () => {
    setError('');
    const areaVal = parsePositive(area);
    const rateVal = parsePositive(rate);
    if (areaVal === null) return setError('Ceiling area must be a positive number');
    if (rateVal === null) return setError('Installed rate must be a positive number');
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 8;
    const perimeterVal = Number(perimeter) > 0 ? Number(perimeter) : 0;
    const coveRateVal = Number(coveRate) >= 0 ? Number(coveRate) : 0;

    setResult({
      area: areaVal,
      type,
      wastagePercent: wastageVal,
      perimeter: perimeterVal,
      ...falseCeiling({
        area: areaVal, type, wastagePercent: wastageVal, perimeter: perimeterVal, coveRate: coveRateVal, ratePerM2: rateVal,
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
          icon={<Layers className="w-6 h-6 text-info" />}
          title="False Ceiling Calculator"
          description="Boards or tiles, GI channels, screws & ceiling cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure False Ceiling"
        subtitle="Ceiling type, area and rates"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <SelectField
          label="Ceiling type"
          value={type}
          onChange={handleTypeChange}
          options={Object.entries(CEILING_TYPES).map(([value, t]) => ({ value, label: t.label }))}
        />
        <NumberField label="Ceiling area" value={area} onChange={setArea} placeholder="e.g. 60" suffix="m²" />
        <NumberField label="Installed rate" value={rate} onChange={setRate} suffix="₹ / m²" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <NumberField label="Cove / drop perimeter (optional)" value={perimeter} onChange={setPerimeter} suffix="m" />
        <NumberField label="Cove rate" value={coveRate} onChange={setCoveRate} suffix="₹ / m" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="False Ceiling Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label={CEILING_TYPES[result.type].label} value={`${result.sheets} ${result.sheetUnit}`} />
            <ResultRow label="GI channels" value={`${result.channelMetres.toFixed(1)} m`} />
            {result.screws > 0 && <ResultRow label="Screws" value={result.screws} />}
            {result.jointingKg > 0 && <ResultRow label="Jointing compound" value={`${result.jointingKg.toFixed(1)} kg`} />}
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Ceiling area" value={`${result.area} m²`} />
            <ResultRow label="Wastage" value={`${result.wastagePercent}%`} />
            {result.perimeter > 0 && <ResultRow label="Cove perimeter" value={`${result.perimeter} m`} />}
          </ResultCard>
          <ResultCard>
            <ResultRow label="Ceiling work" value={formatINR(result.boardCost)} />
            {result.perimeter > 0 && <ResultRow label="Cove / drop" value={formatINR(result.coveCost)} />}
            <ResultRow label="Estimated cost" value={formatINR(result.totalCost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default FalseCeilingCalculator;
