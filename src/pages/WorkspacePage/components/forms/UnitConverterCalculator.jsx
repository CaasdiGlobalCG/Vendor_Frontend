import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, parsePositive,
} from './calculator-kit/CalculatorKit';
import { UNIT_CATEGORIES, convertAll, convertUnit } from './calculator-kit/extraCalcMath';

/**
 * Unit Converter — area, volume, length and weight in site units
 * (sq ft ↔ sq m, cu ft ↔ cu m, acre / cent / guntha, quintal / tonne …).
 */
const formatNumber = (n) => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.001 || abs >= 1e9)) return n.toExponential(3);
  return n.toLocaleString('en-IN', { maximumFractionDigits: 4 });
};

// Typical site direction: imperial / local unit in, metric out.
const DEFAULT_PAIR = {
  area: ['sqft', 'sqm'],
  volume: ['cft', 'cum'],
  length: ['ft', 'm'],
  weight: ['quintal', 'kg'],
};
const firstUnit = (category) => DEFAULT_PAIR[category][0];
const secondUnit = (category) => DEFAULT_PAIR[category][1];

const UnitConverterCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('area');
  const [value, setValue] = useState('');
  const [from, setFrom] = useState(firstUnit('area'));
  const [to, setTo] = useState(secondUnit('area'));

  const unitOptions = (cat) =>
    Object.entries(UNIT_CATEGORIES[cat].units).map(([key, u]) => ({ value: key, label: u.label }));

  const handleCategory = (next) => {
    setCategory(next);
    setFrom(firstUnit(next));
    setTo(secondUnit(next));
  };

  const handleCalculate = () => {
    setError('');
    const valueVal = parsePositive(value);
    if (valueVal === null) return setError('Value must be a positive number');
    const units = UNIT_CATEGORIES[category].units;
    setResult({
      category,
      value: valueVal,
      fromLabel: units[from].label,
      toLabel: units[to].label,
      converted: convertUnit(category, valueVal, from, to),
      all: convertAll(category, valueVal, from).filter((row) => row.key !== from),
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
          icon={<ArrowLeftRight className="w-6 h-6 text-info" />}
          title="Unit Converter"
          description="sq ft ↔ sq m, cu ft ↔ cu m, acre, cent, quintal & more"
          ctaLabel="Convert"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Convert Units"
        subtitle="Area, volume, length and weight"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <SelectField
          label="Measure"
          value={category}
          onChange={handleCategory}
          options={Object.entries(UNIT_CATEGORIES).map(([key, c]) => ({ value: key, label: c.label }))}
        />
        <NumberField label="Value" value={value} onChange={setValue} placeholder="e.g. 1200" />
        <SelectField label="From" value={from} onChange={setFrom} options={unitOptions(category)} />
        <SelectField label="To" value={to} onChange={setTo} options={unitOptions(category)} />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Unit Conversion" onEdit={handleEdit}>
          <ResultCard>
            <ResultRow
              label={`${formatNumber(result.value)} ${result.fromLabel}`}
              value={`${formatNumber(result.converted)} ${result.toLabel}`}
              strong
            />
          </ResultCard>
          <ResultCard title="All conversions">
            {result.all.map((row) => (
              <ResultRow key={row.key} label={row.label} value={formatNumber(row.value)} />
            ))}
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default UnitConverterCalculator;
