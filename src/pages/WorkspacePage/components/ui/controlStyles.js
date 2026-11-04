/**
 * Shared class strings for canvas element controls (text box, text area,
 * dropdown ...). One place defines the look: a 1px hairline on a softly tinted
 * fill that turns white with a soft ring on focus. Colours come from the
 * Tailwind tokens, so dark mode follows automatically.
 */

// Colours live in the per-state classes below (never in `base`), so a state can
// override them without fighting Tailwind's generated-CSS order.
const base =
  'w-full rounded-lg border text-[13px] placeholder:text-dim ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ' +
  'focus:outline-none focus:border-info focus:ring-[3px] focus:ring-info/20';

const normal = 'border-line bg-surface-hover/40 text-ink hover:border-ink/25 focus:bg-surface';
const invalid = 'border-danger bg-surface text-ink ring-[3px] ring-danger/15 focus:border-danger focus:ring-danger/20';
const locked = 'border-line bg-canvas text-dim cursor-not-allowed opacity-80';

const pick = ({ invalid: isInvalid, locked: isLocked }) =>
  isLocked ? locked : isInvalid ? invalid : normal;

/** Single-line control, 36px high. */
export const inputClasses = (state = {}) => `${base} h-9 px-3 ${pick(state)}`;

/** Multi-line control. */
export const textAreaClasses = (state = {}) => `${base} min-h-[96px] px-3 py-2 resize-none leading-5 ${pick(state)}`;

/** Native select with room for the chevron the browser draws. */
export const selectClasses = (state = {}) => `${base} h-9 pl-3 pr-8 ${pick(state)}`;

/** Small muted label above a control. */
export const labelClasses = 'mb-1.5 block text-xs font-medium text-dim';
