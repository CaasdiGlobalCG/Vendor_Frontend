import React, { useState } from 'react';
import { HardHat } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';
import { WORK_TYPES, labourProductivity } from './calculator-kit/extraCalcMath';

/**
 * Labour Productivity Calculator — crew-days, duration and cost per unit of work.
 *
 * Math: days = quantity / (output per worker per day × workers);
 * cost = worker-days × wage + helper-days × helper wage; cost/unit = cost / quantity.
 * Output per worker defaults to a typical figure for the chosen trade and is editable.
 */
const LabourProductivityCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [workType, setWorkType] = useState('plaster');
  const [quantity, setQuantity] = useState('');
  const [output, setOutput] = useState(String(WORK_TYPES.plaster.output));
  const [workers, setWorkers] = useState('4');
  const [helpers, setHelpers] = useState('2');
  const [workerWage, setWorkerWage] = useState('850');
  const [helperWage, setHelperWage] = useState('600');
  const [customUnit, setCustomUnit] = useState('unit');

  const unitFor = (type) => (type === 'custom' ? customUnit || 'unit' : WORK_TYPES[type].unit);

  const handleWorkType = (next) => {
    setWorkType(next);
    setOutput(String(WORK_TYPES[next].output));
  };

  const handleCalculate = () => {
    setError('');
    const quantityVal = parsePositive(quantity);
    const outputVal = parsePositive(output);
    const workersVal = parsePositive(workers);
    const workerWageVal = parsePositive(workerWage);
    if (quantityVal === null) return setError('Quantity of work must be a positive number');
    if (outputVal === null) return setError('Output per worker must be a positive number');
    if (workersVal === null) return setError('Number of workers must be a positive number');
    if (workerWageVal === null) return setError('Worker wage must be a positive number');
    const helpersVal = Number(helpers) >= 0 ? Number(helpers) : 0;
    const helperWageVal = Number(helperWage) >= 0 ? Number(helperWage) : 0;

    setResult({
      workLabel: WORK_TYPES[workType].label,
      unit: unitFor(workType),
      quantity: quantityVal,
      workers: workersVal,
      helpers: helpersVal,
      ...labourProductivity({
        quantity: quantityVal,
        outputPerWorker: outputVal,
        workers: workersVal,
        helpers: helpersVal,
        workerWage: workerWageVal,
        helperWage: helperWageVal,
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
          icon={<HardHat className="w-6 h-6 text-info" />}
          title="Labour Productivity Calculator"
          description="Crew-days, duration and labour cost per unit of work"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Labour"
        subtitle="Work type, crew and wages"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <SelectField
          label="Work type"
          value={workType}
          onChange={handleWorkType}
          options={Object.entries(WORK_TYPES).map(([value, w]) => ({ value, label: `${w.label} (${w.unit})` }))}
        />
        {workType === 'custom' && (
          <div>
            <label className="block text-xs text-dim mb-1">Unit of measure</label>
            <input
              type="text"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-info"
            />
          </div>
        )}
        <NumberField label="Quantity of work" value={quantity} onChange={setQuantity} placeholder="e.g. 300" suffix={unitFor(workType)} />
        <NumberField label="Output per worker" value={output} onChange={setOutput} suffix={`${unitFor(workType)} / day`} />
        <NumberField label="Skilled workers" value={workers} onChange={setWorkers} />
        <NumberField label="Helpers" value={helpers} onChange={setHelpers} />
        <NumberField label="Skilled wage" value={workerWage} onChange={setWorkerWage} suffix="₹ / day" />
        <NumberField label="Helper wage" value={helperWage} onChange={setHelperWage} suffix="₹ / day" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title={`${result.workLabel} — Labour Estimate`} onEdit={handleEdit}>
          <ResultCard title="Crew & Duration">
            <ResultRow label="Duration" value={`${result.days.toFixed(1)} days`} />
            <ResultRow label="Skilled worker-days" value={result.workerDays.toFixed(1)} />
            <ResultRow label="Helper-days" value={result.helperDays.toFixed(1)} />
          </ResultCard>
          <ResultCard title="Work Summary">
            <ResultRow label="Quantity" value={`${result.quantity} ${result.unit}`} />
            <ResultRow label="Crew" value={`${result.workers} skilled + ${result.helpers} helpers`} />
            <ResultRow label={`Cost per ${result.unit}`} value={formatINR(result.costPerUnit)} />
          </ResultCard>
          <ResultCard>
            <ResultRow label="Total labour cost" value={formatINR(result.cost)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default LabourProductivityCalculator;
