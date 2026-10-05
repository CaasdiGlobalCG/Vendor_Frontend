import React, { useState } from 'react';
import { BrickWall } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * AAC Blocks Calculator — autoclaved aerated concrete block walls.
 *
 * Math: face area = (L/1000) × (H/1000); blocks = ceil(area × (1 + wastage) / faceArea);
 * adhesive (thin-bed glue) = area × adhesivePerM2 × (1 + wastage).
 */

const BLOCK_RATE = 55; // ₹ per block (editable)
const ADHESIVE_RATE = 12; // ₹ per kg

const AACBlocksCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [area, setArea] = useState('');
  const [blockLength, setBlockLength] = useState('600');
  const [blockHeight, setBlockHeight] = useState('200');
  const [blockThickness, setBlockThickness] = useState('100');
  const [adhesivePerM2, setAdhesivePerM2] = useState('3'); // kg per m² — TDS: 40kg bag covers ~160-170 sqft at 3mm joint (2.7-3.4 kg/m²)
  const [blockRate, setBlockRate] = useState(String(BLOCK_RATE));
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const areaVal = parsePositive(area);
    const lengthVal = parsePositive(blockLength);
    const heightVal = parsePositive(blockHeight);
    const thicknessVal = parsePositive(blockThickness);
    const adhesiveVal = parsePositive(adhesivePerM2);
    const rateVal = Number(blockRate) >= 0 ? Number(blockRate) : BLOCK_RATE;
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (areaVal === null) return setError('Wall area must be a positive number');
    if (lengthVal === null || heightVal === null || thicknessVal === null) {
      return setError('Block dimensions must be positive numbers');
    }
    if (adhesiveVal === null) return setError('Adhesive usage must be a positive number');

    const faceArea = (lengthVal / 1000) * (heightVal / 1000);
    const wasteFactor = 1 + wastageVal / 100;
    // Epsilon guard: keep exact-integer ceilings from floating-point round-up.
    const blocks = Math.ceil((areaVal * wasteFactor) / faceArea - 1e-9);
    const adhesiveKg = areaVal * adhesiveVal * wasteFactor;

    setResult({
      area: areaVal,
      blockSpec: `${lengthVal}×${heightVal}×${thicknessVal} mm`,
      faceArea,
      blocks,
      adhesiveKg,
      wastagePercent: wastageVal,
      cost: blocks * rateVal + adhesiveKg * ADHESIVE_RATE,
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
          icon={<BrickWall className="w-6 h-6 text-info" />}
          title="AAC Blocks Calculator"
          description="AAC block count, thin-bed adhesive & cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure AAC Blocks"
        subtitle="Autoclaved aerated concrete walls — dimensions in mm"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Wall area" value={area} onChange={setArea} placeholder="e.g. 50" suffix="m²" />
        <NumberField label="Block length" value={blockLength} onChange={setBlockLength} suffix="mm" />
        <NumberField label="Block height" value={blockHeight} onChange={setBlockHeight} suffix="mm" />
        <NumberField label="Block thickness" value={blockThickness} onChange={setBlockThickness} suffix="mm" />
        <NumberField label="Adhesive usage" value={adhesivePerM2} onChange={setAdhesivePerM2} suffix="kg per m²" />
        <NumberField label="Block rate" value={blockRate} onChange={setBlockRate} suffix="₹ per block" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="AAC Block Estimate" onEdit={handleEdit}>
          <ResultCard title="Materials Required">
            <ResultRow label="AAC blocks" value={`${result.blocks} blocks (${result.blockSpec})`} />
            <ResultRow label="Thin-bed adhesive" value={`${result.adhesiveKg.toFixed(1)} kg`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Wall area" value={`${result.area} m²`} />
            <ResultRow label="Face coverage per block" value={`${result.faceArea.toFixed(3)} m²`} />
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

export default AACBlocksCalculator;
