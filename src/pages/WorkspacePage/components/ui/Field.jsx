import React from 'react';
import { labelClasses } from './controlStyles';

/**
 * Label + control + optional helper / error text. Keeps spacing and type
 * consistent across every canvas form element.
 */
const Field = ({ label, required = false, hint, error, htmlFor, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label htmlFor={htmlFor} className={labelClasses}>
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p role="alert" className="mt-1.5 text-xs text-danger">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-dim">{hint}</p>
    ) : null}
  </div>
);

export default Field;
