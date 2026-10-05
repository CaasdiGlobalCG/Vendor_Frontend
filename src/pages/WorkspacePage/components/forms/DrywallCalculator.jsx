import React, { useState } from 'react';
import { PanelsTopLeft } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Drywall / Partition Calculator — gypsum board partitions.
 *
 * Math: boards = ceil(area × (1 + wastage) ÷ board area);
 * studs = ceil(wall length ÷ stud spacing + 1);
 * screws = ceil(area × screwsPerM2 × (1 + wastage));
 * joint compound = area × compoundPerM2 × (1 + wastage).
 */

const RATES = { board: 650, stud: 180, screw: 2.5, compoundKg: 45 };

const DrywallCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [length, setLength] = useState('');
  const [height, setHeight] = useState('');
  const [boardLength, setBoardLength] = useState('2.4'); // m
  const [boardWidth, setBoardWidth] = useState('1.2'); // m
  const [studSpacingMm, setStudSpacingMm] = useState('400');
  const [screwsPerM2, setScrewsPerM2] = useState('12'); // ≈36 screws per 2.88 m² board at 300mm field centres (British Gypsum)
  const [compoundPerM2, setCompoundPerM2] = useState('0.5'); // kg per m²
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(length);
    const heightVal = parsePositive(height);
    const boardLengthVal = parsePositive(boardLength);
    const boardWidthVal = parsePositive(boardWidth);
    const spacingVal = parsePositive(studSpacingMm);
    const screwsVal = parsePositive(screwsPerM2);
    const compoundVal = parsePositive(compoundPerM2);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (lengthVal === null) return setError('Wall length must be a positive number');
    if (heightVal === null) return setError('Wall height must be a positive number');
    if (boardLengthVal === null || boardWidthVal === null) return setError('Board size must be positive numbers');
    if (spacingVal === null) return setError('Stud spacing must be a positive number');
    if (screwsVal === null) return setError('Screws per m² must be a positive number');
    if (compoundVal === null) return setError('Joint compound usage must be a positive number');

    const area = lengthVal * heightVal;
    const wasteFactor = 1 + wastageVal / 100;

    const boardArea = boardLengthVal * boardWidthVal;
    const boards = Math.ceil((area * wasteFactor) / boardArea - 1e-9);
    const studs = Math.ceil(lengthVal / (spacingVal / 1000) + 1 - 1e-9);
    const screws = Math.ceil(area * screwsVal * wasteFactor - 1e-9);
    const compoundKg = area * compoundVal * wasteFactor;

    setResult({
      area,
      boards,
      studs,
      screws,
      compoundKg,
      wastagePercent: wastageVal,
      cost:
        boards * RATES.board +
        studs * RATES.stud +
        screws * RATES.screw +
        compoundKg * RATES.compoundKg,
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
          icon={<PanelsTopLeft className="w-6 h-6 text-info" />}
          title="Drywall / Partition Calculator"
          description="Gypsum boards, studs, screws & jointing"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Drywall / Partition"
        subtitle="Gypsum board partition walls"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Wall length" value={length} onChange={setLength} placeholder="e.g. 8" suffix="m" />
        <NumberField label="Wall height" value={height} onChange={setHeight} placeholder="e.g. 3" suffix="m" />
        <NumberField label="Board length" value={boardLength} onChange={setBoardLength} suffix="m" />
        <NumberField label="Board width" value={boardWidth} onChange={setBoardWidth} suffix="m" />
        <NumberField label="Stud spacing" value={studSpacingMm} onChange={setStudSpacingMm} suffix="mm" />
        <NumberField label="Screws per m²" value={screwsPerM2} onChange={setScrewsPerM2} />
        <NumberField label="Joint compound" value={compoundPerM2} onChange={setCompoundPerM2} suffix="kg per m²" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Drywall Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Gypsum boards" value={`${result.boards} boards`} />
            <ResultRow label="Studs" value={`${result.studs} studs`} />
            <ResultRow label="Screws" value={`${result.screws} screws`} />
            <ResultRow label="Joint compound" value={`${result.compoundKg.toFixed(1)} kg`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Wall area" value={`${result.area} m²`} />
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

export default DrywallCalculator;
