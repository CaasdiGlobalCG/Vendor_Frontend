import React, { useState } from 'react';
import { TreePine } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Lumber Calculator — board feet & cubic feet.
 *
 * Math: board feet = thickness(in) × width(in) × length(ft) × pieces ÷ 12;
 * cubic feet (CFT) = board feet ÷ 12; cost = CFT × rate per CFT.
 */

const CFT_RATE = 2500; // ₹ per cubic foot (editable)

const LumberCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [pieces, setPieces] = useState('');
  const [thicknessIn, setThicknessIn] = useState('1');
  const [widthIn, setWidthIn] = useState('6');
  const [lengthFt, setLengthFt] = useState('8');
  const [rate, setRate] = useState(String(CFT_RATE));

  const handleCalculate = () => {
    setError('');
    const piecesVal = parsePositive(pieces);
    const thicknessVal = parsePositive(thicknessIn);
    const widthVal = parsePositive(widthIn);
    const lengthVal = parsePositive(lengthFt);
    const rateVal = Number(rate) >= 0 ? Number(rate) : CFT_RATE;
    if (piecesVal === null) return setError('Number of pieces must be a positive number');
    if (thicknessVal === null) return setError('Thickness must be a positive number');
    if (widthVal === null) return setError('Width must be a positive number');
    if (lengthVal === null) return setError('Length must be a positive number');

    const boardFeet = (thicknessVal * widthVal * lengthVal * piecesVal) / 12;
    const cft = boardFeet / 12;

    setResult({
      pieces: piecesVal,
      boardFeet,
      cft,
      cost: cft * rateVal,
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
          icon={<TreePine className="w-6 h-6 text-info" />}
          title="Lumber Calculator"
          description="Board feet, cubic feet & lumber cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Lumber"
        subtitle="Board foot: T(in) × W(in) × L(ft) × pieces ÷ 12"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Number of pieces" value={pieces} onChange={setPieces} placeholder="e.g. 10" />
        <NumberField label="Thickness" value={thicknessIn} onChange={setThicknessIn} suffix="inches" />
        <NumberField label="Width" value={widthIn} onChange={setWidthIn} suffix="inches" />
        <NumberField label="Length" value={lengthFt} onChange={setLengthFt} suffix="feet" />
        <NumberField label="Rate" value={rate} onChange={setRate} suffix="₹ per CFT" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Lumber Estimate" onEdit={handleEdit}>
          <ResultCard title="Quantity">
            <ResultRow label="Board feet" value={`${result.boardFeet.toFixed(2)} BF`} />
            <ResultRow label="Cubic feet" value={`${result.cft.toFixed(2)} cft`} />
            <ResultRow label="Pieces" value={`${result.pieces}`} />
          </ResultCard>
          <ResultCard>
            <ResultRow label="Estimated cost" value={formatINR(result.cost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default LumberCalculator;
