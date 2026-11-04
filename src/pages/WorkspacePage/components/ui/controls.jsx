import React from 'react';
import { inputClasses, textAreaClasses, selectClasses } from './controlStyles';

/**
 * Canvas element controls. Each one stops click / key events from reaching the
 * canvas, so typing never triggers shortcuts (Delete, Space ...) and clicking
 * into a field never selects or drags the node behind it.
 */
const isolate = (props) => ({
  onClick: (e) => {
    e.stopPropagation();
    props.onClick?.(e);
  },
  onKeyDown: (e) => {
    e.stopPropagation();
    props.onKeyDown?.(e);
  },
  onFocus: (e) => {
    e.stopPropagation();
    props.onFocus?.(e);
  },
});

export const TextInput = React.forwardRef(({ invalid, locked, className = '', ...props }, ref) => (
  <input
    ref={ref}
    type="text"
    {...props}
    {...isolate(props)}
    readOnly={locked || props.readOnly}
    aria-invalid={invalid || undefined}
    className={`${inputClasses({ invalid, locked })} ${className}`}
  />
));
TextInput.displayName = 'TextInput';

export const TextArea = React.forwardRef(({ invalid, locked, className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    {...props}
    {...isolate(props)}
    readOnly={locked || props.readOnly}
    aria-invalid={invalid || undefined}
    className={`${textAreaClasses({ invalid, locked })} ${className}`}
  />
));
TextArea.displayName = 'TextArea';

export const Select = React.forwardRef(({ invalid, locked, className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    {...props}
    {...isolate(props)}
    disabled={locked || props.disabled}
    aria-invalid={invalid || undefined}
    className={`${selectClasses({ invalid, locked })} ${className}`}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
