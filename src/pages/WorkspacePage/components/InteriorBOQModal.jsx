import React, { useMemo, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Plus, Trash2, FileDigit, FileText, Minus } from 'lucide-react';
import GstRateOption from './GstRateOption';
import { UNIT_DIMS, computeItemQty, computeGrossQty, computeDeduction, measurementLabel } from './CivilBOQModal';

/**
 * Interior Fit-Out BOQ wizard — sectioned, measurement-driven BOQ.
 *
 * Follows the shared BOQ contract (see CUSTOM_BOQ_FLOW.md): emits a
 * 'custom-boq' node whose customBOQData carries `variant: 'interior'`,
 * `sections[]`, and a flattened `items[]` (each item keeps a `section` label
 * and a globally-unique `itemNo` so finance item-wise commission keys stay
 * unchanged). Same lifecycle and renderer as Custom/Civil BOQ.
 */

// Fixed interior sections — vendors can also append custom sections below these.
const INTERIOR_SECTIONS = [
  'Demolition & Site Prep',
  'Partitions & Drywall',
  'Flooring & Skirting',
  'False Ceiling & Grid',
  'Doors & Joinery',
  'Painting & Wall Finishes',
  'Electrical & Fixtures',
  'HVAC & Ventilation',
  'Modular Furniture & Joinery',
  'Loose Furniture & Décor',
  'Washrooms & Plumbing',
  'Branding & Signage',
  'Miscellaneous',
];

const INTERIOR_UNITS = Object.keys(UNIT_DIMS);

const DIM_LABEL = { length: 'L', breadth: 'B', depth: 'D' };

const STEPS = ['BOQ Details', 'Sections & Items', 'Notes'];

const formatINR = (value) =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const makeItem = (section) => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  section,
  name: '',
  description: '',
  unit: 'Sq.ft',
  nos: '',
  length: '',
  breadth: '',
  depth: '',
  qty: '', // used only for dimensionless units
  rate: '',
  // IS 1200-style deduction (openings/voids subtracted from gross qty)
  showDeduction: false,
  deduction: { label: 'Openings', nos: '', length: '', breadth: '', depth: '' },
});

const itemAmount = (item) => computeItemQty(item) * (parseFloat(item.rate) || 0);

const inputCls =
  'w-full rounded border border-line bg-surface px-1.5 py-1.5 text-xs outline-none placeholder:text-dim focus:border-info';

const InteriorBOQModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [boqName, setBoqName] = useState('');
  const [boqDescription, setBoqDescription] = useState('');
  // Flat item list; each item carries its `section` label
  const [items, setItems] = useState([makeItem(INTERIOR_SECTIONS[0])]);
  const [customSections, setCustomSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [notes, setNotes] = useState('');
  // GST treatment of the posted rates — inclusive requires a GST %
  const [gstMode, setGstMode] = useState('exclusive');
  const [gstPercent, setGstPercent] = useState('');

  // Fixed sections + any custom sections the vendor adds
  const allSections = useMemo(
    () => [...INTERIOR_SECTIONS, ...customSections],
    [customSections]
  );

  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + itemAmount(item), 0),
    [items]
  );

  const itemsBySection = useMemo(() => {
    const map = new Map(allSections.map((s) => [s, []]));
    items.forEach((item) => {
      const bucket = map.get(item.section);
      if (bucket) bucket.push(item);
      else map.set(item.section, [item]);
    });
    return map;
  }, [items, allSections]);

  const canProceed = () => {
    if (step === 0) return boqName.trim().length > 0;
    if (step === 1)
      return (
        items.some((item) => item.name.trim().length > 0) &&
        parseFloat(gstPercent) > 0 // GST % is needed for both inclusive & exclusive
      );
    return true;
  };

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const updateDeduction = (id, field, value) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, deduction: { ...(item.deduction || {}), [field]: value } } : item
    ));
  };

  const addItem = (section) => setItems((prev) => [...prev, makeItem(section)]);

  const removeItem = (id) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const addCustomSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    const exists = allSections.some((s) => s.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setCustomSections((prev) => [...prev, name]);
      addItem(name);
    }
    setNewSectionName('');
  };

  const removeCustomSection = (name) => {
    setCustomSections((prev) => prev.filter((s) => s !== name));
    setItems((prev) => {
      const remaining = prev.filter((item) => item.section !== name);
      return remaining.length ? remaining : [makeItem(INTERIOR_SECTIONS[0])];
    });
  };

  const resetAndClose = () => {
    setStep(0);
    setBoqName('');
    setBoqDescription('');
    setItems([makeItem(INTERIOR_SECTIONS[0])]);
    setCustomSections([]);
    setNewSectionName('');
    setNotes('');
    setGstMode('exclusive');
    setGstPercent('');
    onClose?.();
  };

  const handleGenerate = () => {
    const name = boqName.trim() || 'Interior Fit-Out BOQ';
    const filled = items.filter((item) => item.name.trim().length > 0);

    // Flatten in section order with a globally-unique itemNo
    const boqItems = [];
    const usedSections = [];
    allSections.forEach((sectionName, sIdx) => {
      const sectionItems = filled.filter((i) => i.section === sectionName);
      if (!sectionItems.length) return;
      usedSections.push({ id: `sec-${sIdx + 1}`, name: sectionName });
      sectionItems.forEach((item) => {
        const qty = computeItemQty(item);
        const grossQty = computeGrossQty(item);
        const deductionQty = computeDeduction(item);
        boqItems.push({
          itemNo: boqItems.length + 1,
          section: sectionName,
          name: item.name.trim(),
          description: item.description.trim(),
          unit: item.unit,
          nos: parseFloat(item.nos) || (UNIT_DIMS[item.unit]?.length ? 1 : null),
          length: parseFloat(item.length) || null,
          breadth: parseFloat(item.breadth) || null,
          depth: parseFloat(item.depth) || null,
          ...(deductionQty > 0
            ? {
                grossQty,
                deductionQty,
                deduction: {
                  label: (item.deduction?.label || '').trim() || 'Openings',
                  nos: parseFloat(item.deduction?.nos) || null,
                  length: parseFloat(item.deduction?.length) || null,
                  breadth: parseFloat(item.deduction?.breadth) || null,
                  depth: parseFloat(item.deduction?.depth) || null,
                },
              }
            : {}),
          measurement: measurementLabel(item),
          qty,
          rate: parseFloat(item.rate) || 0,
          amount: qty * (parseFloat(item.rate) || 0),
        });
      });
    });

    const customBOQData = {
      variant: 'interior',
      name,
      description: boqDescription.trim(),
      purpose: 'Interior Fit-Out',
      sections: usedSections,
      items: boqItems,
      notes: notes.trim(),
      gst: {
        mode: gstMode,
        percent: parseFloat(gstPercent) || 0,
      },
      total: boqItems.reduce((s, i) => s + i.amount, 0),
      // Lifecycle: pending_finance → commission_added → sent_to_client
      status: 'pending_finance',
      createdAt: new Date().toISOString(),
    };

    document.dispatchEvent(
      new CustomEvent('elementDoubleClick', {
        detail: {
          type: 'custom-boq',
          name,
          preview: `${boqItems.length} item${boqItems.length === 1 ? '' : 's'} · ${usedSections.length} sections · ${formatINR(
            gstMode === 'exclusive'
              ? customBOQData.total * (1 + (parseFloat(gstPercent) || 0) / 100)
              : customBOQData.total
          )}${gstMode === 'exclusive' ? ' incl. GST' : ''}`,
          customBOQData,
        },
      })
    );

    resetAndClose();
  };

  if (!isOpen) return null;

  const renderItemRow = (item) => {
    const dims = UNIT_DIMS[item.unit] || [];
    const qty = computeItemQty(item);
    return (
      <tr key={item.id} className="border-t border-line">
        <td className="px-1 py-1 min-w-[130px]">
          <input
            type="text"
            value={item.name}
            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
            placeholder="Item name"
            className={inputCls}
          />
        </td>
        <td className="px-1 py-1 min-w-[140px]">
          <input
            type="text"
            value={item.description}
            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
            placeholder="Specification"
            className={inputCls}
          />
        </td>
        <td className="px-1 py-1 w-20">
          <select
            value={item.unit}
            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
            className={inputCls}
          >
            {INTERIOR_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </td>
        {dims.length ? (
          <>
            <td className="px-1 py-1 w-14">
              <input
                type="number"
                min="0"
                value={item.nos}
                onChange={(e) => updateItem(item.id, 'nos', e.target.value)}
                placeholder="Nos"
                title="Number of units"
                className={inputCls}
              />
            </td>
            {dims.map((d) => (
              <td key={d} className="px-1 py-1 w-14">
                <input
                  type="number"
                  min="0"
                  value={item[d]}
                  onChange={(e) => updateItem(item.id, d, e.target.value)}
                  placeholder={DIM_LABEL[d]}
                  title={DIM_LABEL[d]}
                  className={inputCls}
                />
              </td>
            ))}
            {/* pad unused dim columns so the table stays aligned */}
            {Array.from({ length: 3 - dims.length }).map((_, i) => (
              <td key={i} className="px-1 py-1 w-14 bg-canvas/50" />
            ))}
          </>
        ) : (
          <td colSpan={4} className="px-1 py-1">
            <input
              type="number"
              min="0"
              value={item.qty}
              onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
              placeholder="Qty"
              className={inputCls}
            />
          </td>
        )}
        <td className="px-2 py-1.5 text-right text-ink font-medium whitespace-nowrap w-20">
          {qty ? qty.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '—'}
        </td>
        <td className="px-1 py-1 w-24">
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.rate}
            onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
            placeholder="0.00"
            className={`${inputCls} text-right`}
          />
        </td>
        <td className="px-2 py-1.5 text-right font-medium text-ink whitespace-nowrap w-24">
          {formatINR(itemAmount(item))}
        </td>
        <td className="px-1 py-1 w-8 text-center">
          <div className="flex flex-col items-center gap-0.5">
            {dims.length > 0 && (
              <button
                type="button"
                onClick={() => updateItem(item.id, 'showDeduction', !item.showDeduction)}
                className={`p-1 rounded transition-colors ${item.showDeduction ? 'text-rose-600 bg-rose-50' : 'text-dim hover:text-rose-600'}`}
                title="Deduct openings/voids (IS 1200)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1 text-dim hover:text-danger rounded transition-colors"
              title="Remove item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // IS 1200 deduction row — openings/voids (nos × same dims as the item's
  // unit) subtracted from the item's gross measured qty
  const renderDeductionRow = (item) => {
    const dims = UNIT_DIMS[item.unit] || [];
    if (!dims.length || !item.showDeduction) return null;
    const dedQty = computeDeduction(item);
    return (
      <tr key={`${item.id}-ded`} className="border-t border-line bg-rose-50/50">
        <td colSpan={2} className="px-1 py-1">
          <input
            type="text"
            value={item.deduction?.label || ''}
            onChange={(e) => updateDeduction(item.id, 'label', e.target.value)}
            placeholder="Deduction — e.g. Door D1, Window W1, void"
            className={`${inputCls} text-rose-800`}
          />
        </td>
        <td className="px-1 py-1 w-20 text-center text-[10px] font-semibold uppercase tracking-wide text-rose-600">
          less
        </td>
        <td className="px-1 py-1 w-14">
          <input
            type="number"
            min="0"
            value={item.deduction?.nos}
            onChange={(e) => updateDeduction(item.id, 'nos', e.target.value)}
            placeholder="Nos"
            title="Number of openings"
            className={inputCls}
          />
        </td>
        {dims.map((d) => (
          <td key={d} className="px-1 py-1 w-14">
            <input
              type="number"
              min="0"
              value={item.deduction?.[d]}
              onChange={(e) => updateDeduction(item.id, d, e.target.value)}
              placeholder={DIM_LABEL[d]}
              title={DIM_LABEL[d]}
              className={inputCls}
            />
          </td>
        ))}
        {Array.from({ length: 3 - dims.length }).map((_, i) => (
          <td key={i} className="px-1 py-1 w-14 bg-rose-50/30" />
        ))}
        <td className="px-2 py-1.5 text-right font-medium text-rose-700 whitespace-nowrap w-20">
          {dedQty ? `−${dedQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}` : '—'}
        </td>
        <td colSpan={2} className="px-2 py-1.5 text-right text-ink font-medium whitespace-nowrap">
          <span className="text-[10px] text-dim">
            Net {computeItemQty(item).toLocaleString('en-IN', { maximumFractionDigits: 3 })} {item.unit}
          </span>
        </td>
        <td className="px-1 py-1 w-8 text-center">
          <button
            type="button"
            onClick={() => {
              updateItem(item.id, 'showDeduction', false);
              updateItem(item.id, 'deduction', { label: 'Openings', nos: '', length: '', breadth: '', depth: '' });
            }}
            className="p-1 text-dim hover:text-rose-600 rounded transition-colors"
            title="Clear deduction"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={resetAndClose}
    >
      <div
        className="bg-surface rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-100 text-violet-800">
              <FileDigit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Interior Fit-Out BOQ</h2>
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
                  placeholder="e.g. Office Fit-Out – Interior BOQ"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-dim focus:border-info focus:ring-1 focus:ring-info/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-ink">Description</label>
                <textarea
                  rows={3}
                  value={boqDescription}
                  onChange={(e) => setBoqDescription(e.target.value)}
                  placeholder="Scope of fit-out works, space references, inclusions…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-dim focus:border-info focus:ring-1 focus:ring-info/30 resize-none"
                />
              </div>
              <div className="rounded-lg border border-line bg-canvas p-3 text-[11px] text-dim">
                Fixed interior sections are included automatically — you'll fill items under
                Partitions, Flooring, Ceiling, Joinery, Electrical and more on the next step,
                and you can add your own sections if needed.
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <GstRateOption
                mode={gstMode}
                percent={gstPercent}
                onModeChange={setGstMode}
                onPercentChange={setGstPercent}
              />
              <p className="text-[11px] text-dim">
                Qty auto-computes from measurements per IS 1200 mensuration —{' '}
                <span className="font-medium">Sq.m/Sq.ft: Nos×L×B</span>,{' '}
                <span className="font-medium">R.ft/Mtr: Nos×L</span>,{' '}
                <span className="font-medium">Cum/Cft: Nos×L×B×D</span>, other units take a direct qty.
              </p>

              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-canvas text-dim">
                      <th className="px-2 py-2 text-left font-medium">Item</th>
                      <th className="px-2 py-2 text-left font-medium">Description</th>
                      <th className="px-2 py-2 text-left font-medium">Unit</th>
                      <th className="px-2 py-2 text-left font-medium">Nos</th>
                      <th className="px-2 py-2 text-left font-medium">L</th>
                      <th className="px-2 py-2 text-left font-medium">B</th>
                      <th className="px-2 py-2 text-left font-medium">D</th>
                      <th className="px-2 py-2 text-right font-medium">Qty</th>
                      <th className="px-2 py-2 text-left font-medium">Rate/Item (₹)</th>
                      <th className="px-2 py-2 text-right font-medium">Amount</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {allSections.map((sectionName) => {
                      const sectionItems = itemsBySection.get(sectionName) || [];
                      const isCustom = customSections.includes(sectionName);
                      return (
                        <React.Fragment key={sectionName}>
                          <tr className="bg-slate-100/80 border-t border-line">
                            <td
                              colSpan={8}
                              className="px-2 py-1.5 text-[11px] font-bold text-ink uppercase tracking-wide"
                            >
                              {sectionName}
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => removeCustomSection(sectionName)}
                                  className="ml-2 text-[10px] font-semibold text-danger/70 hover:text-danger normal-case"
                                  title="Remove section and its items"
                                >
                                  Remove section
                                </button>
                              )}
                            </td>
                            <td colSpan={3} className="px-2 py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => addItem(sectionName)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-info hover:text-info/80"
                              >
                                <Plus className="w-3 h-3" /> Add item
                              </button>
                            </td>
                          </tr>
                          {sectionItems.map((item) => (
                            <React.Fragment key={item.id}>
                              {renderItemRow(item)}
                              {renderDeductionRow(item)}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {gstMode === 'exclusive' && parseFloat(gstPercent) > 0 ? (
                      <>
                        <tr className="border-t border-line bg-canvas">
                          <td colSpan={9} className="px-2 py-1.5 text-right text-xs text-dim">
                            Subtotal
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-medium text-ink whitespace-nowrap">
                            {formatINR(grandTotal)}
                          </td>
                          <td />
                        </tr>
                        <tr className="bg-canvas">
                          <td colSpan={9} className="px-2 py-1.5 text-right text-xs text-dim">
                            GST @ {gstPercent}%
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-medium text-ink whitespace-nowrap">
                            {formatINR((grandTotal * (parseFloat(gstPercent) || 0)) / 100)}
                          </td>
                          <td />
                        </tr>
                        <tr className="border-t border-line bg-canvas">
                          <td colSpan={9} className="px-2 py-2 text-right text-xs font-semibold text-ink">
                            Grand Total (incl. GST)
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-bold text-ink whitespace-nowrap">
                            {formatINR(grandTotal * (1 + (parseFloat(gstPercent) || 0) / 100))}
                          </td>
                          <td />
                        </tr>
                      </>
                    ) : (
                      <tr className="border-t border-line bg-canvas">
                        <td colSpan={9} className="px-2 py-2 text-right text-xs font-semibold text-ink">
                          Grand Total
                          {gstMode === 'inclusive' && parseFloat(gstPercent) > 0 && (
                            <span className="text-dim font-normal">
                              {' '}(incl. GST @ {gstPercent}%: {formatINR((grandTotal * (parseFloat(gstPercent) || 0)) / (100 + (parseFloat(gstPercent) || 0)))})
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-xs font-bold text-ink">
                          {formatINR(grandTotal)}
                        </td>
                        <td />
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Custom section — vendor can extend beyond the fixed interior sections */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomSection()}
                  placeholder="New section name (e.g. Glass Partitions, Fire Alarm)"
                  className="w-64 rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none placeholder:text-dim focus:border-info"
                />
                <button
                  type="button"
                  onClick={addCustomSection}
                  disabled={!newSectionName.trim()}
                  className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" /> Add section
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
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
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-dim focus:border-info focus:ring-1 focus:ring-info/30 resize-none"
                />
              </div>

              <div className="rounded-lg border border-line bg-canvas p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-dim">BOQ Name</span>
                  <span className="font-medium text-ink">{boqName.trim() || 'Interior Fit-Out BOQ'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Purpose</span>
                  <span className="font-medium text-ink">Interior Fit-Out</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Sections</span>
                  <span className="font-medium text-ink">
                    {allSections.filter((s) => items.some((i) => i.section === s && i.name.trim())).length}
                  </span>
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

export default InteriorBOQModal;
