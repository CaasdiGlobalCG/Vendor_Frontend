import React, { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Decking Calculator — deck boards + fasteners.
 *
 * Math: rows = ceil(deck width ÷ (board width + gap));
 * boards per row = ceil(deck length ÷ board length);
 * boards = ceil(rows × perRow × (1 + wastage));
 * screws = ceil(area × screws/m² × (1 + wastage)).
 */

const BOARD_RATE = 450; // ₹ per board
const SCREW_RATE = 3; // ₹ per screw

const DeckingCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [boardWidthMm, setBoardWidthMm] = useState('140');
  const [gapMm, setGapMm] = useState('5');
  const [boardLength, setBoardLength] = useState('3'); // m
  const [screwsPerM2, setScrewsPerM2] = useState('25');
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(length);
    const widthVal = parsePositive(width);
    const boardWidthVal = parsePositive(boardWidthMm);
    const gapVal = Number(gapMm) >= 0 ? Number(gapMm) : 5;
    const boardLengthVal = parsePositive(boardLength);
    const screwsVal = parsePositive(screwsPerM2);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (lengthVal === null) return setError('Deck length must be a positive number');
    if (widthVal === null) return setError('Deck width must be a positive number');
    if (boardWidthVal === null) return setError('Board width must be a positive number');
    if (boardLengthVal === null) return setError('Board length must be a positive number');
    if (screwsVal === null) return setError('Screws per m² must be a positive number');

    const area = lengthVal * widthVal;
    const wasteFactor = 1 + wastageVal / 100;
    const rows = Math.ceil(widthVal / ((boardWidthVal + gapVal) / 1000) - 1e-9);
    const boardsPerRow = Math.ceil(lengthVal / boardLengthVal - 1e-9);
    const boards = Math.ceil(rows * boardsPerRow * wasteFactor - 1e-9);
    const screws = Math.ceil(area * screwsVal * wasteFactor - 1e-9);

    setResult({
      area,
      rows,
      boardsPerRow,
      boards,
      screws,
      wastagePercent: wastageVal,
      cost: boards * BOARD_RATE + screws * SCREW_RATE,
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
          icon={<LayoutGrid className="w-6 h-6 text-info" />}
          title="Decking Calculator"
          description="Deck boards, fasteners & laying cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Decking"
        subtitle="Boards laid with a gap — rows × board runs"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Deck length" value={length} onChange={setLength} placeholder="e.g. 6" suffix="m" />
        <NumberField label="Deck width" value={width} onChange={setWidth} placeholder="e.g. 4" suffix="m" />
        <NumberField label="Board width" value={boardWidthMm} onChange={setBoardWidthMm} suffix="mm" />
        <NumberField label="Gap between boards" value={gapMm} onChange={setGapMm} suffix="mm" />
        <NumberField label="Board length" value={boardLength} onChange={setBoardLength} suffix="m" />
        <NumberField label="Screws per m²" value={screwsPerM2} onChange={setScrewsPerM2} />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Decking Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="Deck boards" value={`${result.boards} boards`} />
            <ResultRow label="Fasteners" value={`${result.screws} screws`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Deck area" value={`${result.area.toFixed(2)} m²`} />
            <ResultRow label="Board rows" value={`${result.rows} (${result.boardsPerRow} per row)`} />
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

export default DeckingCalculator;
