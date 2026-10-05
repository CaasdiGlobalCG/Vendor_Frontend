import React, { useState } from 'react';
import { Droplets } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Waterproofing Calculator — liquid-applied membrane coatings.
 *
 * Math: litres = area × coats ÷ coverage (m² per litre per coat);
 * wastage applied; buckets = ceil(litres / bucketSize).
 */

const BUCKET_LITRES = 20;
const RATE_PER_LITRE = 250; // ₹ (editable)

const WaterproofingCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [area, setArea] = useState('');
  const [coats, setCoats] = useState('2');
  const [coverage, setCoverage] = useState('1.5'); // m² per litre per coat
  const [rate, setRate] = useState(String(RATE_PER_LITRE));
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const areaVal = parsePositive(area);
    const coatsVal = parsePositive(coats);
    const coverageVal = parsePositive(coverage);
    const rateVal = Number(rate) >= 0 ? Number(rate) : RATE_PER_LITRE;
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (areaVal === null) return setError('Area must be a positive number');
    if (coatsVal === null) return setError('Coats must be a positive number');
    if (coverageVal === null) return setError('Coverage must be a positive number');

    const baseLitres = (areaVal * coatsVal) / coverageVal;
    const litres = baseLitres * (1 + wastageVal / 100);
    const buckets = Math.ceil(litres / BUCKET_LITRES - 1e-9);

    setResult({
      area: areaVal,
      coats: coatsVal,
      coverage: coverageVal,
      litres,
      buckets,
      wastagePercent: wastageVal,
      cost: litres * rateVal,
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
          icon={<Droplets className="w-6 h-6 text-info" />}
          title="Waterproofing Calculator"
          description="Membrane litres, buckets & application cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Waterproofing"
        subtitle="Liquid-applied waterproofing — terraces, toilets, basements"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Area to waterproof" value={area} onChange={setArea} placeholder="e.g. 60" suffix="m²" />
        <NumberField label="Coats" value={coats} onChange={setCoats} />
        <NumberField label="Coverage" value={coverage} onChange={setCoverage} suffix="m² per litre per coat" />
        <NumberField label="Material rate" value={rate} onChange={setRate} suffix="₹ per litre" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Waterproofing Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Membrane" value={`${result.litres.toFixed(1)} L`} />
            <ResultRow label="Packs" value={`${result.buckets} × 20 L bucket${result.buckets === 1 ? '' : 's'}`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Area" value={`${result.area} m²`} />
            <ResultRow label="Coats" value={result.coats} />
            <ResultRow label="Coverage" value={`${result.coverage} m²/L per coat`} />
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

export default WaterproofingCalculator;
