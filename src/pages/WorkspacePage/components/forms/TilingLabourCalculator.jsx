import React, { useState } from 'react';
import { Hammer } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';
import { tilingLabour } from './calculator-kit/extraCalcMath';

/**
 * Tiling Labour Calculator — labour days and wage cost to lay tiles.
 *
 * Math: days = area / (output per mason × masons); mason-days = days × masons;
 * helper-days = mason-days × helpers per mason; cost = Σ days × wage + skirting.
 * Output and wage defaults are planning assumptions — edit to your site's rates.
 */
const TilingLabourCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [area, setArea] = useState('');
  const [output, setOutput] = useState('8');
  const [masons, setMasons] = useState('2');
  const [helpers, setHelpers] = useState('1');
  const [masonWage, setMasonWage] = useState('900');
  const [helperWage, setHelperWage] = useState('600');
  const [skirtingLength, setSkirtingLength] = useState('');
  const [skirtingRate, setSkirtingRate] = useState('40');

  const handleCalculate = () => {
    setError('');
    const areaVal = parsePositive(area);
    const outputVal = parsePositive(output);
    const masonsVal = parsePositive(masons);
    const masonWageVal = parsePositive(masonWage);
    if (areaVal === null) return setError('Tiling area must be a positive number');
    if (outputVal === null) return setError('Output per mason must be a positive number');
    if (masonsVal === null) return setError('Number of masons must be a positive number');
    if (masonWageVal === null) return setError('Mason wage must be a positive number');
    const helpersVal = Number(helpers) >= 0 ? Number(helpers) : 0;
    const helperWageVal = Number(helperWage) >= 0 ? Number(helperWage) : 0;
    const skirtingLen = Number(skirtingLength) > 0 ? Number(skirtingLength) : 0;
    const skirtingRateVal = Number(skirtingRate) >= 0 ? Number(skirtingRate) : 0;

    setResult({
      area: areaVal,
      masons: masonsVal,
      skirtingLength: skirtingLen,
      ...tilingLabour({
        area: areaVal,
        outputPerMason: outputVal,
        masons: masonsVal,
        helpersPerMason: helpersVal,
        masonWage: masonWageVal,
        helperWage: helperWageVal,
        skirtingLength: skirtingLen,
        skirtingRate: skirtingRateVal,
      }),
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
          icon={<Hammer className="w-6 h-6 text-info" />}
          title="Tiling Labour Calculator"
          description="Mason & helper days, duration and wage cost for tiling"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Tiling Labour"
        subtitle="Crew size, output and wages"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <NumberField label="Tiling area" value={area} onChange={setArea} placeholder="e.g. 120" suffix="m²" />
        <NumberField label="Output per mason" value={output} onChange={setOutput} suffix="m² / day" />
        <NumberField label="Masons" value={masons} onChange={setMasons} />
        <NumberField label="Helpers per mason" value={helpers} onChange={setHelpers} />
        <NumberField label="Mason wage" value={masonWage} onChange={setMasonWage} suffix="₹ / day" />
        <NumberField label="Helper wage" value={helperWage} onChange={setHelperWage} suffix="₹ / day" />
        <NumberField label="Skirting length (optional)" value={skirtingLength} onChange={setSkirtingLength} suffix="m" />
        <NumberField label="Skirting labour rate" value={skirtingRate} onChange={setSkirtingRate} suffix="₹ / m" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Tiling Labour Estimate" onEdit={handleEdit}>
          <ResultCard title="Crew & Duration">
            <ResultRow label="Duration" value={`${result.days.toFixed(1)} days`} />
            <ResultRow label="Mason-days" value={result.masonDays.toFixed(1)} />
            <ResultRow label="Helper-days" value={result.helperDays.toFixed(1)} />
          </ResultCard>
          <ResultCard title="Cost">
            <ResultRow label="Wages" value={formatINR(result.wageCost)} />
            {result.skirtingLength > 0 && (
              <ResultRow label={`Skirting (${result.skirtingLength} m)`} value={formatINR(result.skirtingCost)} />
            )}
            <ResultRow label="Cost per m²" value={formatINR(result.costPerM2)} />
          </ResultCard>
          <ResultCard>
            <ResultRow label="Total labour cost" value={formatINR(result.totalCost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default TilingLabourCalculator;
