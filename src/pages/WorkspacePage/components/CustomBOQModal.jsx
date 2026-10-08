import React, { useMemo, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Plus, Trash2, FileDigit, FileText } from 'lucide-react';
import GstRateOption from './GstRateOption';

const BOQ_PURPOSES = [
  'Labours',
  'Painting',
  'Services',
  'Materials',
  'Electrical',
  'Plumbing',
  'Civil Works',
  'Carpentry',
  'HVAC',
  'Other',
];

const BOQ_UNITS = [
  'Nos', 'Sq.ft', 'Sq.m', 'R.ft', 'Cft', 'Cum', 'Kg', 'Ton',
  'Ltr', 'Bag', 'Mtr', 'Day', 'Month', 'Set', 'LS',
];

const STEPS = ['BOQ Details', 'BOQ For', 'Line Items', 'Notes'];

const formatINR = (value) =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const makeItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  description: '',
  unit: 'Nos',
  qty: '',
  rate: '',
});

const itemAmount = (item) => (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-dim focus:border-info focus:ring-1 focus:ring-info/30';

const CustomBOQModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [boqName, setBoqName] = useState('');
  const [boqDescription, setBoqDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [items, setItems] = useState([makeItem()]);
  const [notes, setNotes] = useState('');
  // GST treatment of the posted rates — inclusive requires a GST %
  const [gstMode, setGstMode] = useState('exclusive');
  const [gstPercent, setGstPercent] = useState('');

  const resolvedPurpose = purpose === 'Other' ? customPurpose.trim() : purpose;
  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + itemAmount(item), 0),
    [items]
  );

  const canProceed = () => {
    if (step === 0) return boqName.trim().length > 0;
    if (step === 1) return resolvedPurpose.length > 0;
    if (step === 2)
      return (
        items.some((item) => item.name.trim().length > 0) &&
        parseFloat(gstPercent) > 0 // GST % is needed for both inclusive & exclusive
      );
    return true;
  };

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, makeItem()]);

  const removeItem = (id) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const resetAndClose = () => {
    setStep(0);
    setBoqName('');
    setBoqDescription('');
    setPurpose('');
    setCustomPurpose('');
    setItems([makeItem()]);
    setNotes('');
    setGstMode('exclusive');
    setGstPercent('');
    onClose?.();
  };

  const handleGenerate = () => {
    const name = boqName.trim() || 'Custom BOQ';
    const filledItems = items.filter((item) => item.name.trim().length > 0);

    const boqItems = filledItems.map((item, idx) => ({
      itemNo: idx + 1,
      name: item.name.trim(),
      description: item.description.trim(),
      unit: item.unit,
      qty: parseFloat(item.qty) || 0,
      rate: parseFloat(item.rate) || 0,
      amount: itemAmount(item),
    }));

    const customBOQData = {
      name,
      description: boqDescription.trim(),
      purpose: resolvedPurpose,
      items: boqItems,
      notes: notes.trim(),
      gst: {
        mode: gstMode,
        percent: parseFloat(gstPercent) || 0,
      },
      total: grandTotal,
      // Lifecycle: pending_finance → commission_added → sent_to_client
      status: 'pending_finance',
      createdAt: new Date().toISOString(),
    };

    // Drop the structured BOQ document onto the workspace canvas
    document.dispatchEvent(
      new CustomEvent('elementDoubleClick', {
        detail: {
          type: 'custom-boq',
          name,
          preview: `${boqItems.length} item${boqItems.length === 1 ? '' : 's'} · ${formatINR(
            gstMode === 'exclusive'
              ? grandTotal * (1 + (parseFloat(gstPercent) || 0) / 100)
              : grandTotal
          )}${gstMode === 'exclusive' ? ' incl. GST' : ''}`,
          customBOQData,
        },
      })
    );

    resetAndClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={resetAndClose}
    >
      <div
        className="bg-surface rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
              <FileDigit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Custom BOQ</h2>
              <p className="text-[11px] text-dim">
                Step {step + 1} of {STEPS.length} — {STEPS[step]}
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1 hover:bg-surface-hover rounded-lg transition-colors text-dim hover:text-ink"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-4 pt-3">
          {STEPS.map((label, idx) => (
            <React.Fragment key={label}>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  idx === step ? 'text-ink' : idx < step ? 'text-success' : 'text-dim'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    idx === step
                      ? 'bg-info text-white'
                      : idx < step
                        ? 'bg-success/15 text-success'
                        : 'bg-surface-hover text-dim'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-line" />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink">
                  BOQ Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={boqName}
                  onChange={(e) => setBoqName(e.target.value)}
                  placeholder="e.g. Villa Renovation – Phase 1 BOQ"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink">Description</label>
                <textarea
                  rows={3}
                  value={boqDescription}
                  onChange={(e) => setBoqDescription(e.target.value)}
                  placeholder="Brief description of this Bill of Quantities — scope, project reference, client…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-semibold text-ink">
                  What are you building this BOQ for? <span className="text-danger">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {BOQ_PURPOSES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPurpose(option)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                        purpose === option
                          ? 'border-info bg-info text-white'
                          : 'border-line bg-surface text-ink hover:border-info/40'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              {purpose === 'Other' && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink">
                    Specify <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="e.g. Fire Safety Systems"
                    className={inputCls}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <GstRateOption
                mode={gstMode}
                percent={gstPercent}
                onModeChange={setGstMode}
                onPercentChange={setGstPercent}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-dim">
                  Amount is auto-calculated as Qty × Rate. Item numbers are assigned automatically.
                </p>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-info text-white rounded-lg hover:bg-info/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-canvas text-dim">
                      <th className="px-2 py-2 text-left font-medium w-10">#</th>
                      <th className="px-2 py-2 text-left font-medium min-w-[140px]">Item Name</th>
                      <th className="px-2 py-2 text-left font-medium min-w-[160px]">Description</th>
                      <th className="px-2 py-2 text-left font-medium w-24">Unit</th>
                      <th className="px-2 py-2 text-left font-medium w-20">Qty</th>
                      <th className="px-2 py-2 text-left font-medium w-24">Rate/Item (₹)</th>
                      <th className="px-2 py-2 text-right font-medium w-28">Amount</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="border-t border-line">
                        <td className="px-2 py-1.5 text-dim font-medium">{idx + 1}</td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="Item name"
                            className="w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Specification / description"
                            className="w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                            className="w-full rounded border border-line bg-surface px-1.5 py-1.5 text-xs outline-none focus:border-info"
                          >
                            {BOQ_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                            placeholder="0"
                            className="w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            value={item.rate}
                            onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-ink whitespace-nowrap">
                          {formatINR(itemAmount(item))}
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-dim hover:text-danger rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {gstMode === 'exclusive' && parseFloat(gstPercent) > 0 ? (
                      <>
                        <tr className="border-t border-line bg-canvas">
                          <td colSpan={6} className="px-2 py-1.5 text-right text-xs text-dim">
                            Subtotal
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-medium text-ink whitespace-nowrap">
                            {formatINR(grandTotal)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="bg-canvas">
                          <td colSpan={6} className="px-2 py-1.5 text-right text-xs text-dim">
                            GST @ {gstPercent}%
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-medium text-ink whitespace-nowrap">
                            {formatINR((grandTotal * (parseFloat(gstPercent) || 0)) / 100)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="border-t border-line bg-canvas">
                          <td colSpan={6} className="px-2 py-2 text-right text-xs font-semibold text-ink">
                            Grand Total (incl. GST)
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-bold text-ink whitespace-nowrap">
                            {formatINR(grandTotal * (1 + (parseFloat(gstPercent) || 0) / 100))}
                          </td>
                          <td></td>
                        </tr>
                      </>
                    ) : (
                      <tr className="border-t border-line bg-canvas">
                        <td colSpan={6} className="px-2 py-2 text-right text-xs font-semibold text-ink">
                          Grand Total
                          {gstMode === 'inclusive' && parseFloat(gstPercent) > 0 && (
                            <span className="text-dim font-normal">
                              {' '}(incl. GST @ {gstPercent}%: {formatINR((grandTotal * (parseFloat(gstPercent) || 0)) / (100 + (parseFloat(gstPercent) || 0)))})
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-xs font-bold text-ink whitespace-nowrap">
                          {formatINR(grandTotal)}
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink">
                  Notes to present in the BOQ
                </label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms & conditions, taxes, validity, exclusions, payment schedule…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-line bg-canvas p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-dim">BOQ Name</span>
                  <span className="font-medium text-ink">{boqName.trim() || 'Custom BOQ'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">BOQ For</span>
                  <span className="font-medium text-ink">{resolvedPurpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Line Items</span>
                  <span className="font-medium text-ink">
                    {items.filter((i) => i.name.trim()).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Rates</span>
                  <span className="font-medium text-ink">
                    {gstMode === 'inclusive'
                      ? `Inclusive of GST @ ${gstPercent || 0}%`
                      : 'Exclusive of GST'}
                  </span>
                </div>
                {gstMode === 'exclusive' && parseFloat(gstPercent) > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-dim">Subtotal</span>
                      <span className="font-medium text-ink">{formatINR(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dim">GST @ {gstPercent}%</span>
                      <span className="font-medium text-ink">
                        {formatINR((grandTotal * (parseFloat(gstPercent) || 0)) / 100)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-line pt-1.5">
                  <span className="text-dim">Grand Total{gstMode === 'exclusive' ? ' (incl. GST)' : ''}</span>
                  <span className="font-bold text-ink">
                    {formatINR(
                      gstMode === 'exclusive'
                        ? grandTotal * (1 + (parseFloat(gstPercent) || 0) / 100)
                        : grandTotal
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-line flex items-center justify-between bg-canvas">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-ink border border-line rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => canProceed() && setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-black text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-black text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate BOQ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomBOQModal;
