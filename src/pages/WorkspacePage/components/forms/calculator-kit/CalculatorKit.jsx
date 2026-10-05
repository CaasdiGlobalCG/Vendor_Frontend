import React from 'react';
import ReactDOM from 'react-dom';
import { Calculator, X } from 'lucide-react';

/**
 * CalculatorKit — shared UI shell for construction calculators.
 *
 * Provides the established workspace pattern:
 *   landing card → portaled config modal → result panel (with Edit to reopen).
 *
 * All calculators built on the kit follow the same visual language as the
 * existing calculators (Concrete, Soil, Flooring…) so the canvas stays
 * consistent, and they are testable with the same interaction driver.
 */

export const CalcLandingCard = ({ icon, title, description, ctaLabel = 'Configure & Calculate', onOpen }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-canvas rounded-lg border-2 border-line min-h-[140px]">
    <div className="bg-info/10 p-3 rounded-full mb-3">
      {icon || <Calculator className="w-6 h-6 text-info" />}
    </div>
    <h3 className="text-sm font-semibold text-ink mb-1">{title}</h3>
    <p className="text-xs text-dim mb-4 text-center">{description}</p>
    <button
      type="button"
      onClick={onOpen}
      className="px-5 py-2 bg-info text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
    >
      {ctaLabel}
    </button>
  </div>
);

export const CalcModal = ({ open, title, subtitle, onClose, onCalculate, children, calculateDisabled = false }) => {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 z-[10000] flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-line">
          <div>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {subtitle && <p className="text-[11px] text-dim mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-dim hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-line">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-dim hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={onCalculate}
            disabled={calculateDisabled}
            className="px-5 py-2 bg-info text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40"
          >
            Calculate
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const NumberField = ({ label, value, onChange, placeholder, suffix, min = '0', step = 'any', disabled }) => (
  <div>
    <label className="block text-xs text-dim mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-info"
      />
      {suffix && <span className="text-xs text-dim whitespace-nowrap">{suffix}</span>}
    </div>
  </div>
);

export const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs text-dim mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-info"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

export const CalcError = ({ message }) => {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
      {message}
    </div>
  );
};

export const ResultPanel = ({ title, onEdit, children }) => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-[11px] font-medium text-info hover:underline">
          Edit
        </button>
      )}
    </div>
    {children}
  </div>
);

export const ResultCard = ({ title, children }) => (
  <div className="border border-line rounded-lg overflow-hidden mb-3">
    {title && <div className="bg-canvas p-3 border-b border-line font-bold text-sm text-ink">{title}</div>}
    <div className="p-3 space-y-2 text-xs text-ink">{children}</div>
  </div>
);

export const ResultRow = ({ label, value, strong }) => (
  <div className={`flex justify-between gap-3 ${strong ? 'pt-2 border-t border-line font-bold text-sm' : ''}`}>
    <span>{label}</span>
    <span className={strong ? '' : 'font-medium'}>{value}</span>
  </div>
);

/** Indian-format currency (₹6,300) */
export const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/** Parse a numeric input safely; returns null when invalid/negative. */
export const parsePositive = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};
