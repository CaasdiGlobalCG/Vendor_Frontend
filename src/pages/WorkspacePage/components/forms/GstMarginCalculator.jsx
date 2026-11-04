import React, { useState } from 'react';
import { Percent } from 'lucide-react';
import {
  CalcLandingCard, CalcModal, NumberField, SelectField, CalcError,
  ResultPanel, ResultCard, ResultRow, formatINR, parsePositive,
} from './calculator-kit/CalculatorKit';
import { GST_RATES, gstMargin } from './calculator-kit/extraCalcMath';

/**
 * GST & Margin Calculator — price a job from cost, or split a GST-inclusive amount.
 *
 * Modes:
 *   markup  — price = cost × (1 + markup%)
 *   margin  — price = cost ÷ (1 − margin%)   (margin is a share of the selling price)
 *   reverse — amount already includes GST; back out taxable value and tax
 * GST splits into CGST + SGST for intra-state supply, IGST for inter-state.
 */
const MODES = [
  { value: 'markup', label: 'Add markup to cost' },
  { value: 'margin', label: 'Target profit margin' },
  { value: 'reverse', label: 'GST-inclusive amount → taxable + GST' },
];

const GstMarginCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('markup');
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState('15');
  const [gstRate, setGstRate] = useState('18');
  const [supply, setSupply] = useState('intra');

  const handleCalculate = () => {
    setError('');
    const amountVal = parsePositive(amount);
    if (amountVal === null) return setError('Amount must be a positive number');
    let percentVal = 0;
    if (mode !== 'reverse') {
      percentVal = Number(percent);
      if (!Number.isFinite(percentVal) || percentVal < 0) return setError('Percentage must be zero or more');
      if (mode === 'margin' && percentVal >= 100) return setError('Margin must be below 100%');
    }

    const calc = gstMargin({
      mode, amount: amountVal, percent: percentVal, gstRate: Number(gstRate), interState: supply === 'inter',
    });
    if (!calc) return setError('Could not calculate with these values');
    setResult({ ...calc, gstRate: Number(gstRate), interState: supply === 'inter', percent: percentVal });
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
          icon={<Percent className="w-6 h-6 text-info" />}
          title="GST & Margin Calculator"
          description="Markup or margin on cost, GST split, or back out GST"
          onOpen={() => setOpen(true)}
        />
      )}

      <CalcModal
        open={open}
        title="Configure GST & Margin"
        subtitle="Selling price, profit and tax"
        onClose={() => setOpen(false)}
        onCalculate={handleCalculate}
      >
        <SelectField label="What do you want to find?" value={mode} onChange={setMode} options={MODES} />
        <NumberField
          label={mode === 'reverse' ? 'GST-inclusive amount' : 'Your cost'}
          value={amount}
          onChange={setAmount}
          placeholder="e.g. 100000"
          suffix="₹"
        />
        {mode !== 'reverse' && (
          <NumberField
            label={mode === 'margin' ? 'Profit margin' : 'Markup'}
            value={percent}
            onChange={setPercent}
            suffix="%"
          />
        )}
        <SelectField
          label="GST rate"
          value={gstRate}
          onChange={setGstRate}
          options={GST_RATES.map((r) => ({ value: String(r), label: `${r}%` }))}
        />
        <SelectField
          label="Supply"
          value={supply}
          onChange={setSupply}
          options={[
            { value: 'intra', label: 'Within state (CGST + SGST)' },
            { value: 'inter', label: 'Between states (IGST)' },
          ]}
        />
        <CalcError message={error} />
      </CalcModal>

      {result && !open && (
        <ResultPanel title="GST & Margin" onEdit={handleEdit}>
          {result.mode !== 'reverse' && (
            <ResultCard title="Pricing">
              <ResultRow label="Your cost" value={formatINR(result.cost)} />
              <ResultRow label="Profit" value={formatINR(result.profit)} />
              <ResultRow label="Margin on price" value={`${result.marginPercent.toFixed(1)}%`} />
              <ResultRow label="Markup on cost" value={`${result.markupPercent.toFixed(1)}%`} />
            </ResultCard>
          )}
          <ResultCard title="Tax">
            <ResultRow label="Taxable value" value={formatINR(result.taxable)} />
            {result.interState ? (
              <ResultRow label={`IGST (${result.gstRate}%)`} value={formatINR(result.igst)} />
            ) : (
              <>
                <ResultRow label={`CGST (${result.gstRate / 2}%)`} value={formatINR(result.cgst)} />
                <ResultRow label={`SGST (${result.gstRate / 2}%)`} value={formatINR(result.sgst)} />
              </>
            )}
          </ResultCard>
          <ResultCard>
            <ResultRow label={result.mode === 'reverse' ? 'Invoice total' : 'Invoice total (incl. GST)'} value={formatINR(result.total)} strong />
          </ResultCard>
        </ResultPanel>
      )}
    </div>
  );
};

export default GstMarginCalculator;
