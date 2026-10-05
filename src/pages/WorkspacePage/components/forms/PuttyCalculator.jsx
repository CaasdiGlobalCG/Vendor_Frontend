import React, { useState } from 'react';
import { Paintbrush } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Putty & Primer Calculator — wall preparation before painting.
 *
 * Math: putty kg = area × coats × coverage (kg/m² per coat);
 * primer litres = area / primerCoverage (m² per litre); wastage on materials.
 */

const PUTTY_RATE = 45; // ₹ per kg
const PRIMER_RATE = 180; // ₹ per litre
const PUTTY_BAG_KG = 20;

const PuttyCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [area, setArea] = useState('');
  const [coats, setCoats] = useState('2');
  const [puttyCoverage, setPuttyCoverage] = useState('0.75'); // kg/m² per coat
  const [primerCoverage, setPrimerCoverage] = useState('10'); // m² per litre
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const areaVal = parsePositive(area);
    const coatsVal = parsePositive(coats);
    const puttyCovVal = parsePositive(puttyCoverage);
    const primerCovVal = parsePositive(primerCoverage);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (areaVal === null) return setError('Wall area must be a positive number');
    if (coatsVal === null) return setError('Coats must be a positive number');
    if (puttyCovVal === null) return setError('Putty coverage must be a positive number');
    if (primerCovVal === null) return setError('Primer coverage must be a positive number');

    const wasteFactor = 1 + wastageVal / 100;
    const puttyKg = areaVal * coatsVal * puttyCovVal * wasteFactor;
    const primerLitres = (areaVal / primerCovVal) * wasteFactor;

    setResult({
      area: areaVal,
      coats: coatsVal,
      wastagePercent: wastageVal,
      puttyKg,
      puttyBags: puttyKg / PUTTY_BAG_KG,
      primerLitres,
      cost: puttyKg * PUTTY_RATE + primerLitres * PRIMER_RATE,
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
          icon={<Paintbrush className="w-6 h-6 text-info" />}
          title="Putty & Primer Calculator"
          description="Wall putty kg, primer litres & preparation cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Putty & Primer"
        subtitle="Wall preparation before painting"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Wall area" value={area} onChange={setArea} placeholder="e.g. 100" suffix="m²" />
        <NumberField label="Putty coats" value={coats} onChange={setCoats} />
        <NumberField label="Putty coverage" value={puttyCoverage} onChange={setPuttyCoverage} suffix="kg/m² per coat" />
        <NumberField label="Primer coverage" value={primerCoverage} onChange={setPrimerCoverage} suffix="m² per litre" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Putty & Primer Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Wall putty" value={`${result.puttyKg.toFixed(2)} kg (${result.puttyBags.toFixed(2)} × 20 kg bags)`} />
            <ResultRow label="Primer" value={`${result.primerLitres.toFixed(2)} L`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Wall area" value={`${result.area} m²`} />
            <ResultRow label="Putty coats" value={result.coats} />
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

export default PuttyCalculator;
