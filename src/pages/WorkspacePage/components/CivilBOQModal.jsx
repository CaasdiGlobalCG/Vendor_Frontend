import React, { useMemo, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Plus, Trash2, FileDigit, FileText } from 'lucide-react';

/**
 * Civil Work BOQ wizard — sectioned, measurement-driven BOQ.
 *
 * Follows the shared BOQ contract (see CUSTOM_BOQ_FLOW.md): emits a
 * 'custom-boq' node whose customBOQData carries `variant: 'civil'`,
 * `sections[]`, and a flattened `items[]` (each item keeps a `section` label
 * and a globally-unique `itemNo` so finance item-wise commission keys stay
 * unchanged).
 */

// Fixed civil sections — vendors can also append custom sections below these.
const CIVIL_SECTIONS = [
  'Earthwork & Excavation',
  'PCC & RCC Work',
  'Masonry Work',
  'Plastering & Pointing',
  'Flooring & Tiling',
  'Doors & Windows',
  'Waterproofing',
  'Plumbing Works',
  'Electrical Works',
  'Painting & Finishing',
  'Miscellaneous',
];

// Per-unit measurement: which dimensions feed qty (qty = Nos × dims)
export const UNIT_DIMS = {
  'Cum': ['length', 'breadth', 'depth'],   // Nos × L × B × D
  'Cft': ['length', 'breadth', 'depth'],
  'Sq.m': ['length', 'breadth'],           // Nos × L × B
  'Sq.ft': ['length', 'breadth'],
  'R.ft': ['length'],                      // Nos × L
  'Mtr': ['length'],
  // Dimensionless units take a direct qty
  'Nos': [], 'Kg': [], 'Ton': [], 'Ltr': [], 'Bag': [],
  'Day': [], 'Month': [], 'Set': [], 'LS': [],
};

const CIVIL_UNITS = Object.keys(UNIT_DIMS);

const DIM_LABEL = { length: 'L', breadth: 'B', depth: 'D' };

const STEPS = ['BOQ Details', 'Sections & Items', 'Notes'];

const formatINR = (value) =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const makeItem = (section) => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  section,
  name: '',
  description: '',
  unit: 'Cum',
  nos: '',
  length: '',
  breadth: '',
  depth: '',
  qty: '', // used only for dimensionless units
  rate: '',
});

export const computeItemQty = (item) => {
  const dims = UNIT_DIMS[item.unit] || [];
  if (!dims.length) return parseFloat(item.qty) || 0;
  const nos = parseFloat(item.nos) || 1;
  return dims.reduce((acc, d) => acc * (parseFloat(item[d]) || 0), nos);
};

export const measurementLabel = (item) => {
  const dims = UNIT_DIMS[item.unit] || [];
  if (!dims.length) return null;
  const parts = [parseFloat(item.nos) || 1, ...dims.map((d) => parseFloat(item[d]) || 0)];
  return parts.map((p) => (Number.isInteger(p) ? p : p.toFixed(2))).join(' × ');
};

const itemAmount = (item) => computeItemQty(item) * (parseFloat(item.rate) || 0);

const inputCls =
  'w-full rounded border border-line bg-surface px-1.5 py-1.5 text-xs outline-none placeholder:text-dim focus:border-info';

const CivilBOQModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [boqName, setBoqName] = useState('');
  const [boqDescription, setBoqDescription] = useState('');
  // Flat item list; each item carries its `section` label
  const [items, setItems] = useState([makeItem(CIVIL_SECTIONS[0])]);
  const [customSections, setCustomSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [notes, setNotes] = useState('');

  // Fixed sections + any custom sections the vendor adds
  const allSections = useMemo(
    () => [...CIVIL_SECTIONS, ...customSections],
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
    if (step === 1) return items.some((item) => item.name.trim().length > 0);
    return true;
  };

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
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
      return remaining.length ? remaining : [makeItem(CIVIL_SECTIONS[0])];
    });
  };

  const resetAndClose = () => {
    setStep(0);
    setBoqName('');
    setBoqDescription('');
    setItems([makeItem(CIVIL_SECTIONS[0])]);
    setCustomSections([]);
    setNewSectionName('');
    setNotes('');
    onClose?.();
  };

  const handleGenerate = () => {
    const name = boqName.trim() || 'Civil Work BOQ';
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
          measurement: measurementLabel(item),
          qty,
          rate: parseFloat(item.rate) || 0,
          amount: qty * (parseFloat(item.rate) || 0),
        });
      });
    });

    const customBOQData = {
      variant: 'civil',
      name,
      description: boqDescription.trim(),
      purpose: 'Civil Works',
      sections: usedSections,
      items: boqItems,
      notes: notes.trim(),
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
          preview: `${boqItems.length} item${boqItems.length === 1 ? '' : 's'} · ${usedSections.length} sections · ${formatINR(customBOQData.total)}`,
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
            {CIVIL_UNITS.map((unit) => (
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
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <FileDigit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Civil Work BOQ</h2>
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
                  placeholder="e.g. Villa Renovation – Civil Works BOQ"
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
                  placeholder="Scope of civil works, site references, inclusions…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-dim focus:border-info focus:ring-1 focus:ring-info/30 resize-none"
                />
              </div>
              <div className="rounded-lg border border-line bg-canvas p-3 text-[11px] text-dim">
                Fixed civil sections are included automatically — you'll fill items under
                Earthwork, PCC/RCC, Masonry, Plastering, Flooring and more on the next step,
                and you can add your own sections if needed.
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[11px] text-dim">
                Qty auto-computes from measurements based on unit —{' '}
                <span className="font-medium">Cum/Cft: Nos×L×B×D</span>,{' '}
                <span className="font-medium">Sq.m/Sq.ft: Nos×L×B</span>,{' '}
                <span className="font-medium">R.ft/Mtr: Nos×L</span>, other units take a direct qty.
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
                          {sectionItems.map(renderItemRow)}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-canvas">
                      <td colSpan={9} className="px-2 py-2 text-right text-xs font-semibold text-ink">
                        Grand Total
                      </td>
                      <td className="px-2 py-2 text-right text-xs font-bold text-ink whitespace-nowrap">
                        {formatINR(grandTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Custom section — vendor can extend beyond the fixed civil sections */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomSection()}
                  placeholder="New section name (e.g. Demolition, Site Clearance)"
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
                  <span className="font-medium text-ink">{boqName.trim() || 'Civil Work BOQ'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dim">Purpose</span>
                  <span className="font-medium text-ink">Civil Works</span>
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
                <div className="flex justify-between border-t border-line pt-1.5">
                  <span className="text-dim">Grand Total</span>
                  <span className="font-bold text-ink">{formatINR(grandTotal)}</span>
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

export default CivilBOQModal;
