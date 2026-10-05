import React, { useState } from 'react';
import { Home } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Roofing Calculator — corrugated sheet roofing.
 *
 * Math: slope area = plan area ÷ cos(atan(slope% / 100));
 * sheets = ceil(slopeArea × (1 + wastage) ÷ (sheet length × effective width));
 * fasteners = ceil(slopeArea × screwsPerM2 × (1 + wastage)).
 */

const SHEET_RATE = 850; // ₹ per sheet
const SCREW_RATE = 3; // ₹ per screw

const RoofingCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [slopePercent, setSlopePercent] = useState('20');
  const [sheetLength, setSheetLength] = useState('3'); // m
  const [sheetWidth, setSheetWidth] = useState('1.05'); // effective cover m
  const [screwsPerM2, setScrewsPerM2] = useState('8');
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(length);
    const widthVal = parsePositive(width);
    const slopeVal = Number(slopePercent) >= 0 ? Number(slopePercent) : 20;
    const sheetLengthVal = parsePositive(sheetLength);
    const sheetWidthVal = parsePositive(sheetWidth);
    const screwsVal = parsePositive(screwsPerM2);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (lengthVal === null) return setError('Roof length must be a positive number');
    if (widthVal === null) return setError('Roof width must be a positive number');
    if (sheetLengthVal === null || sheetWidthVal === null) return setError('Sheet size must be positive numbers');
    if (screwsVal === null) return setError('Screws per m² must be a positive number');

    const planArea = lengthVal * widthVal;
    const slopeRadians = Math.atan(slopeVal / 100);
    const slopeArea = planArea / Math.cos(slopeRadians);
    const wasteFactor = 1 + wastageVal / 100;

    const sheetArea = sheetLengthVal * sheetWidthVal;
    const sheets = Math.ceil((slopeArea * wasteFactor) / sheetArea - 1e-9);
    const screws = Math.ceil(slopeArea * screwsVal * wasteFactor - 1e-9);

    setResult({
      planArea,
      slopeArea,
      slopePercent: slopeVal,
      sheets,
      screws,
      wastagePercent: wastageVal,
      cost: sheets * SHEET_RATE + screws * SCREW_RATE,
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
          icon={<Home className="w-6 h-6 text-info" />}
          title="Roofing Calculator"
          description="Corrugated sheet count, fasteners & cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Roofing"
        subtitle="Corrugated sheet roofing — slope adjusted area"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Roof length" value={length} onChange={setLength} placeholder="e.g. 10" suffix="m" />
        <NumberField label="Roof width" value={width} onChange={setWidth} placeholder="e.g. 6" suffix="m" />
        <NumberField label="Slope" value={slopePercent} onChange={setSlopePercent} suffix="%" />
        <NumberField label="Sheet length" value={sheetLength} onChange={setSheetLength} suffix="m" />
        <NumberField label="Sheet effective width" value={sheetWidth} onChange={setSheetWidth} suffix="m" />
        <NumberField label="Screws per m²" value={screwsPerM2} onChange={setScrewsPerM2} />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Roofing Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Roofing sheets" value={`${result.sheets} sheets`} />
            <ResultRow label="Fasteners" value={`${result.screws} screws`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Plan area" value={`${result.planArea.toFixed(2)} m²`} />
            <ResultRow label="Slope area" value={`${result.slopeArea.toFixed(2)} m²`} />
            <ResultRow label="Slope" value={`${result.slopePercent}%`} />
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

export default RoofingCalculator;
