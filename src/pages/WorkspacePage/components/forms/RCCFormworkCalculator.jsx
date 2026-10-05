import React, { useState } from 'react';
import { LayoutPanelTop } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * RCC Formwork (Shuttering) Calculator — plywood, battens, props & cost.
 *
 * Coefficients per m² of formwork area:
 *  plywood    = area × 1.10 m² → sheets (2.97 m² per 8×4 ft sheet)
 *  battens    = area × 2.50 running metres
 *  props      = area ÷ 1.50 (ceil)
 *  nails      = area × 0.10 kg
 */

const PLY_SHEET_M2 = 2.97; // 8ft × 4ft
const RATES = { plySheet: 850, battenM: 36, prop: 120, nailsKg: 90 };

const RCCFormworkCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [area, setArea] = useState('');

  const handleCalculate = () => {
    setError('');
    const areaVal = parsePositive(area);
    if (areaVal === null) return setError('Formwork area must be a positive number');

    const plywoodArea = areaVal * 1.1;
    const plySheets = Math.ceil(plywoodArea / PLY_SHEET_M2);
    const battensM = areaVal * 2.5;
    const props = Math.ceil(areaVal / 1.5);
    const nailsKg = areaVal * 0.1;

    setResult({
      area: areaVal,
      plywoodArea,
      plySheets,
      battensM,
      props,
      nailsKg,
      cost:
        plySheets * RATES.plySheet +
        battensM * RATES.battenM +
        props * RATES.prop +
        nailsKg * RATES.nailsKg,
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
          icon={<LayoutPanelTop className="w-6 h-6 text-info" />}
          title="RCC Formwork Calculator"
          description="Shuttering plywood, battens, props & cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure RCC Formwork"
        subtitle="Shuttering material estimate for slabs, beams & columns"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Formwork area" value={area} onChange={setArea} placeholder="e.g. 120" suffix="m²" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Formwork Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Shuttering plywood" value={`${result.plySheets} sheets (${result.plywoodArea.toFixed(2)} m²)`} />
            <ResultRow label="Battens / joinery" value={`${result.battensM.toFixed(1)} m`} />
            <ResultRow label="Props" value={`${result.props}`} />
            <ResultRow label="Nails & screws" value={`${result.nailsKg.toFixed(1)} kg`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Formwork area" value={`${result.area} m²`} />
          </ResultCard>
          <ResultCard>
            <ResultRow label="Estimated cost" value={formatINR(result.cost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default RCCFormworkCalculator;
