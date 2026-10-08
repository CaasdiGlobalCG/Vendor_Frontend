import React from 'react';
import { Percent } from 'lucide-react';

/**
 * GST treatment selector shared by the BOQ creation wizards (Custom + Civil).
 * mode: 'exclusive' | 'inclusive'.
 *  - exclusive → GST % is added on top of the subtotal to form the grand total
 *  - inclusive → GST % is already inside the posted rates (component is shown)
 * `percent` is required for both modes.
 */
const GstRateOption = ({ mode = 'exclusive', percent = '', onModeChange, onPercentChange }) => {
  const pill = (active) =>
    `px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
      active
        ? 'border-info bg-info text-white'
        : 'border-line bg-surface text-ink hover:border-info/40'
    }`;

  const inclusive = mode === 'inclusive';

  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-semibold text-ink">
          Are the posted rates inclusive or exclusive of GST?
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onModeChange?.('exclusive')}
            className={pill(!inclusive)}
          >
            Exclusive of GST
          </button>
          <button
            type="button"
            onClick={() => onModeChange?.('inclusive')}
            className={pill(inclusive)}
          >
            Inclusive of GST
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <Percent className="w-3.5 h-3.5 text-info flex-shrink-0" />
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={percent}
          onChange={(e) => onPercentChange?.(e.target.value)}
          placeholder="e.g. 18"
          className="w-24 rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none placeholder:text-dim focus:border-info"
        />
        <span className="text-[11px] text-dim">
          {inclusive
            ? 'GST % — the rates you enter already include GST at this rate'
            : 'GST % — automatically added on top of the item total'}
          {!(parseFloat(percent) > 0) && (
            <span className="text-danger"> · required</span>
          )}
        </span>
      </div>
    </div>
  );
};

export default GstRateOption;
