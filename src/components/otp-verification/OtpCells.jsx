// ============================================================
// FILE: OtpCells.jsx
// PURPOSE: Segmented-cell code entry ("Segmented cells" design, variant 3).
//          Six inert spans render the code as large bordered boxes; ONE real,
//          visually-hidden <input> underneath carries the page's real props so
//          typing / paste / autofill still work exactly as before.
// CONNECTS TO: consumed by components/Verification.jsx; styles use the shared
//              Tailwind tokens (canvas/surface/line/ink/dim) and the
//              ease-signal + duration-180 motion vocabulary.
//
// PRESENTATIONAL ONLY. No business logic lives here: the component holds no
// state, no effects and no data logic — it renders `value` and forwards
// `onChange` verbatim to the caller. The single bit of behaviour is the row's
// onClick focus affordance (see below), which exists only because the real
// input is invisible.
// ============================================================

import { useRef } from 'react';
import { cn } from '../ui';

/**
 * Segmented-cell one-time-code entry.
 *
 * @param {object} props
 * @param {string} props.id - id applied to the real input and the <label> htmlFor.
 * @param {string} props.value - current code (rendered into the six cells).
 * @param {(event: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - passed straight to the input.
 * @param {boolean} props.disabled - disables the real input.
 * @param {string} props.label - visible label text.
 * @returns {JSX.Element}
 */
export function OtpCells({ id, value, onChange, disabled, label }) {
  // Only ref/handler in the file: the real input is invisible, so clicking the
  // visible cells must move focus to it. This is a focus affordance, not logic.
  const inputRef = useRef(null);

  const chars = Array.from({ length: 6 }, (_, index) => value[index] || '');
  const firstEmptyIndex = chars.findIndex((char) => char === '');

  return (
    <div className="text-left">
      <label
        htmlFor={id}
        className="mb-2 block font-mono text-mono-xs uppercase tracking-[0.2em] text-dim"
      >
        {label}
      </label>
      <div
        className="relative grid grid-cols-6 gap-2 cursor-text rounded-xl focus-within:ring-2 focus-within:ring-ink"
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={onChange}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          disabled={disabled}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
        {chars.map((char, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              'flex h-14 items-center justify-center rounded-xl border bg-surface font-mono text-2xl font-semibold tabular-nums text-ink',
              'transition-colors duration-180 ease-signal',
              index === firstEmptyIndex ? 'border-ink' : 'border-line'
            )}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
