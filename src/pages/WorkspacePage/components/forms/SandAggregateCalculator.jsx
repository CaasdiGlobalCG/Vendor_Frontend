import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Sand & Aggregate Calculator — bulk material ordering.
 *
 * Math: weight = volume × density; truck loads = ceil(volume / truckCapacity);
 * cost = volume × rate; wastage applied to volume.
 */

const MATERIALS = {
  sand: { label: 'Sand', density: 1600, rate: 1200 },
  aggregate20: { label: '20 mm Aggregate', density: 1500, rate: 1400 },
  aggregate40: { label: '40 mm Aggregate', density: 1500, rate: 1350 },
  gravel: { label: 'Gravel', density: 1500, rate: 1100 },
};

const SandAggregateCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [volume, setVolume] = useState('');
  const [material, setMaterial] = useState('sand');
  const [truckCapacity, setTruckCapacity] = useState('6');
  const [wastage, setWastage] = useState('5');

  const handleCalculate = () => {
    setError('');
    const volumeVal = parsePositive(volume);
    const truckVal = parsePositive(truckCapacity);
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    if (volumeVal === null) return setError('Volume must be a positive number');
    if (truckVal === null) return setError('Truck capacity must be a positive number');

    const { label, density, rate } = MATERIALS[material] || MATERIALS.sand;
    const wasteFactor = 1 + wastageVal / 100;
    const volumeWithWaste = volumeVal * wasteFactor;
    const weightKg = volumeWithWaste * density;
    const trucks = Math.ceil(volumeWithWaste / truckVal);

    setResult({
      materialLabel: label,
      volume: volumeVal,
      wastagePercent: wastageVal,
      volumeWithWaste,
      weightKg,
      tonnes: weightKg / 1000,
      trucks,
      truckCapacity: truckVal,
      cost: volumeWithWaste * rate,
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
          icon={<Truck className="w-6 h-6 text-info" />}
          title="Sand & Aggregate Calculator"
          description="Volume to tonnes, truck loads & ordering cost"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Sand & Aggregate"
        subtitle="Bulk material quantity and delivery planning"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <SelectField
          label="Material"
          value={material}
          onChange={setMaterial}
          options={Object.entries(MATERIALS).map(([value, m]) => ({ value, label: m.label }))}
        />
        <NumberField label="Volume required" value={volume} onChange={setVolume} placeholder="e.g. 10" suffix="m³" />
        <NumberField label="Truck capacity" value={truckCapacity} onChange={setTruckCapacity} suffix="m³ per trip" />
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Material Order" onEdit={handleEdit}>
          <ResultCard title={result.materialLabel}>
            <ResultRow label="Quantity (with wastage)" value={`${result.volumeWithWaste.toFixed(2)} m³`} />
            <ResultRow label="Weight" value={`${result.tonnes.toFixed(1)} tonnes (${result.weightKg.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg)`} />
            <ResultRow label="Deliveries" value={`${result.trucks} truck${result.trucks === 1 ? '' : 's'} (${result.truckCapacity} m³ each)`} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Ordered volume" value={`${result.volume} m³`} />
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

export default SandAggregateCalculator;
