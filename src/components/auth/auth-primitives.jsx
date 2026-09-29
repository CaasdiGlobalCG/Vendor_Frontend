// ============================================================
// FILE: components/auth/auth-primitives.jsx
// PURPOSE: Shared field/button primitives for the real Login and SignUp
//          screens, styled to the approved two-panel auth design (compact
//          sizing, app tokens: bg-canvas/surface, text-ink/dim, border-line,
//          bg-cta). Purely presentational — every value, handler and error
//          stays owned by the page component that renders them.
// CONNECTS TO: components/Login.jsx, components/SignUp.jsx,
//              tailwind.config.js (canvas/surface/ink/dim/line/cta tokens).
// ============================================================

import { Eye, EyeOff } from 'lucide-react';
import operonLogo from '../../assets/operon-symbol-white.png';
import operonLogoBlack from '../../assets/operon-symbol-black.png';

/**
 * BrandMark — the Operon mark in the colour that reads on its surface.
 * `tone="onBlack"` is for literal black panels (identical in both themes);
 * the default swaps black/white assets with the app theme.
 * @param {{ className?: string, tone?: 'token'|'onBlack' }} props
 */
export function BrandMark({ className = 'h-6', tone = 'token' }) {
  if (tone === 'onBlack') return <img src={operonLogo} alt="Operon" className={className} />;
  return (
    <>
      <img src={operonLogoBlack} alt="Operon" className={`${className} dark:hidden`} />
      <img src={operonLogo} alt="" aria-hidden="true" className={`hidden ${className} dark:block`} />
    </>
  );
}

/** MonoEyebrow — small tracked label used next to the brand mark. */
export function MonoEyebrow({ children, className = '' }) {
  return (
    <span className={`text-xs font-medium uppercase tracking-[0.18em] text-dim ${className}`}>
      {children}
    </span>
  );
}

/**
 * Field — boxed input: label above, tinted fill at rest (`bg-canvas`),
 * ink ring on focus. `error` renders the inline message under the control.
 * @param {object} props
 */
export function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  required,
  error,
  trailing,
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          className={`h-10 w-full rounded-xl border bg-canvas px-4 pr-10 text-sm text-ink placeholder:text-dim transition-colors duration-150 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ink ${
            error ? 'border-danger' : 'border-line'
          }`}
        />
        {trailing}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** PasswordField — Field with the eye show/hide toggle inside the box. */
export function PasswordField({ id, label, show, onToggle, ...rest }) {
  return (
    <Field
      id={id}
      label={label}
      type={show ? 'text' : 'password'}
      autoComplete={rest.autoComplete || 'current-password'}
      trailing={
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-dim transition-colors hover:text-ink"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
      {...rest}
    />
  );
}

/** PrimaryButton — the app's CTA pair (bg-cta / text-cta-foreground). */
export function PrimaryButton({ children, loading, className = '', ...rest }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cta text-sm font-medium text-cta-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** CheckboxRow — square checkbox with the terms text beside it. */
export function CheckboxRow({ checked, onToggle, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {/* checked state is driven by the page; onToggle is the page's handler */}
        <input type="checkbox" checked={checked} readOnly onClick={onToggle} className="peer absolute inset-0 opacity-0" />
        <span
          className={`h-4 w-4 rounded border transition-colors ${
            checked ? 'border-ink bg-ink' : 'border-line'
          }`}
        />
        {checked && <span className="pointer-events-none absolute h-1.5 w-1.5 rounded-[1px] bg-canvas" />}
      </span>
      <span className="text-xs leading-5 text-dim">{children}</span>
    </label>
  );
}

/** TextLink — weight + underline, matching the rest of the app. */
export function TextLink({ children, className = '', ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      className={`font-semibold text-ink underline decoration-line underline-offset-4 transition-opacity hover:opacity-70 ${className}`}
    >
      {children}
    </button>
  );
}
