import React, { useRef, useState } from 'react';
import { Ruler } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';

/**
 * Rebar / BBS Calculator — bar bending schedule style weight take-off.
 *
 * Math (per bar row): unit weight = d² / 162 kg/m (standard steel formula);
 * weight = unit weight × cutting length × number of bars.
 * Totals sum all rows; wastage applied to the total weight.
 */

const DIAMETERS = ['8', '10', '12', '16', '20', '25', '32'];
const unitWeight = (diaMm) => (diaMm * diaMm) / 162;

const RebarBBSCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([{ id: 1, dia: '12', length: '', count: '' }]);
  const [wastage, setWastage] = useState('5');
  const [rate, setRate] = useState('65'); // ₹ per kg
  const nextIdRef = useRef(2);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setRows((prev) => [...prev, { id, dia: '12', length: '', count: '' }]);
  };

  const removeRow = (id) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleCalculate = () => {
    setError('');
    const wastageVal = Number(wastage) >= 0 ? Number(wastage) : 5;
    const rateVal = Number(rate) >= 0 ? Number(rate) : 65;

    const computed = [];
    for (const row of rows) {
      const lengthVal = parsePositive(row.length);
      const countVal = parsePositive(row.count);
      if (lengthVal === null || countVal === null) {
        return setError('Every bar row needs a positive cutting length and bar count');
      }
      const dia = Number(row.dia);
      const uw = unitWeight(dia);
      const weightKg = uw * lengthVal * countVal;
      computed.push({
        dia,
        length: lengthVal,
        count: countVal,
        unitWeight: uw,
        weightKg,
        totalLength: lengthVal * countVal,
      });
    }

    const totalLength = computed.reduce((sum, c) => sum + c.totalLength, 0);
    const weightBefore = computed.reduce((sum, c) => sum + c.weightKg, 0);
    const wasteFactor = 1 + wastageVal / 100;
    const totalWeight = weightBefore * wasteFactor;

    setResult({
      rows: computed,
      totalLength,
      weightBefore,
      totalWeight,
      wastagePercent: wastageVal,
      cost: totalWeight * rateVal,
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
          icon={<Ruler className="w-6 h-6 text-info" />}
          title="Rebar / BBS Calculator"
          description="Bar weight from diameter × cutting length × bars"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure Rebar / BBS"
        subtitle="Add one row per bar type (d² / 162 kg per metre)"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id} className="flex items-end gap-2">
              <div className="w-28">
                <SelectField
                  label={idx === 0 ? 'Dia (mm)' : ''}
                  value={row.dia}
                  onChange={(v) => updateRow(row.id, { dia: v })}
                  options={DIAMETERS.map((d) => ({ value: d, label: `${d} mm` }))}
                />
              </div>
              <div className="flex-1">
                <NumberField
                  label={idx === 0 ? 'Cutting length' : ''}
                  value={row.length}
                  onChange={(v) => updateRow(row.id, { length: v })}
                  placeholder="e.g. 3.5"
                  suffix="m"
                />
              </div>
              <div className="w-24">
                <NumberField
                  label={idx === 0 ? 'Bars' : ''}
                  value={row.count}
                  onChange={(v) => updateRow(row.id, { count: v })}
                  placeholder="e.g. 20"
                />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="mb-2 text-sm text-dim hover:text-danger"
                  aria-label={`Remove bar row ${idx + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="text-xs font-medium text-info hover:underline">
          + Add bar
        </button>
        <NumberField label="Wastage" value={wastage} onChange={setWastage} suffix="%" />
        <NumberField label="Steel rate" value={rate} onChange={setRate} suffix="₹ per kg" />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="Rebar Estimate" onEdit={handleEdit}>
          <ResultCard title="Bar Schedule">
            {result.rows.map((r, idx) => (
              <ResultRow
                key={`${r.dia}-${idx}`}
                label={`B${idx + 1} · ${r.dia} mm × ${r.length} m × ${r.count}`}
                value={`${r.weightKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`}
              />
            ))}
          </ResultCard>
          <ResultCard title="Totals">
            <ResultRow label={`Unit weight (${result.rows[0].dia} mm)`} value={`${result.rows[0].unitWeight.toFixed(3)} kg/m`} />
            <ResultRow label="Total bar length" value={`${result.totalLength.toFixed(1)} m`} />
            <ResultRow label="Weight (before wastage)" value={`${result.weightBefore.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`} />
            <ResultRow label="Weight with wastage" value={`${result.totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`} />
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

export default RebarBBSCalculator;
