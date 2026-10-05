import React, { useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Tiles Calculator — tile count, waste allowance and whole boxes.
 *
 * Math (calculate.co.nz pattern): area = L × W; tiles = ceil(area / tileArea);
 * tilesWithWaste = ceil(tiles × (1 + waste%)); boxes = ceil(tilesWithWaste / perBox).
 */

const TILE_RATE = 120; // ₹ per tile (editable)

const TilesCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [tileLengthMm, setTileLengthMm] = useState('600');
  const [tileWidthMm, setTileWidthMm] = useState('600');
  const [wastePercent, setWastePercent] = useState('10');
  const [perBox, setPerBox] = useState('4');
  const [tileRate, setTileRate] = useState(String(TILE_RATE));

  const handleCalculate = () => {
    setError('');
    const lengthVal = parsePositive(length);
    const widthVal = parsePositive(width);
    const tileLengthVal = parsePositive(tileLengthMm);
    const tileWidthVal = parsePositive(tileWidthMm);
    const perBoxVal = parsePositive(perBox);
    const rateVal = Number(tileRate) >= 0 ? Number(tileRate) : TILE_RATE;
    const wasteVal = Number(wastePercent) >= 0 ? Number(wastePercent) : 10;
    if (lengthVal === null) return setError('Room length must be a positive number');
    if (widthVal === null) return setError('Room width must be a positive number');
    if (tileLengthVal === null || tileWidthVal === null) return setError('Tile size must be positive numbers');
    if (perBoxVal === null) return setError('Tiles per box must be a positive number');

    const area = lengthVal * widthVal;
    const tileArea = (tileLengthVal / 1000) * (tileWidthVal / 1000);
    const tilesBase = Math.ceil(area / tileArea);
    // Epsilon guard: floating point can make an exact-integer ceiling round up
    // (e.g. 70 × 1.1 = 77.00000000000001 → 78). Subtract a tiny epsilon first.
    const tilesWithWaste = Math.ceil(tilesBase * (1 + wasteVal / 100) - 1e-9);
    const boxes = Math.ceil(tilesWithWaste / perBoxVal - 1e-9);

    setResult({
      area,
      tileArea,
      tilesBase,
      tilesWithWaste,
      boxes,
      perBox: perBoxVal,
      wastePercent: wasteVal,
      cost: tilesWithWaste * rateVal,
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
          icon={<Grid3x3 className="w-6 h-6 text-info" />}
          title="Tiles Calculator"
          description="Tile count, waste allowance & whole boxes"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Tiles"
        subtitle="Floor or wall tiling — dimensions in metres / millimetres"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Room length" value={length} onChange={setLength} placeholder="e.g. 4" suffix="m" />
        <NumberField label="Room width" value={width} onChange={setWidth} placeholder="e.g. 3" suffix="m" />
        <NumberField label="Tile length" value={tileLengthMm} onChange={setTileLengthMm} suffix="mm" />
        <NumberField label="Tile width" value={tileWidthMm} onChange={setTileWidthMm} suffix="mm" />
        <NumberField label="Waste allowance" value={wastePercent} onChange={setWastePercent} suffix="%" />
        <NumberField label="Tiles per box" value={perBox} onChange={setPerBox} />
        <NumberField label="Tile rate" value={tileRate} onChange={setTileRate} suffix="₹ per tile" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Tile Estimate" onEdit={handleEdit}>
          <ResultCard title="Tiles Required">
            <ResultRow label="Area to tile" value={`${result.area.toFixed(2)} m²`} />
            <ResultRow label="Per tile" value={`${result.tileArea.toFixed(2)} m²`} />
            <ResultRow label="Tiles (base)" value={`${result.tilesBase}`} />
            <ResultRow label="Tiles (incl. waste)" value={`${result.tilesWithWaste} tiles`} />
            <ResultRow label="Boxes" value={`${result.boxes} boxes (${result.perBox} tiles/box)`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Waste allowance" value={`${result.wastePercent}%`} />
          </ResultCard>
          <ResultCard>
            <ResultRow label="Estimated cost" value={formatINR(result.cost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default TilesCalculator;
