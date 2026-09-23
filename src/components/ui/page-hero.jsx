/**
 * FILE: page-hero.jsx
 * PURPOSE: Shared black "hero" page-header card used atop list pages
 *          (Team, Leads, Projects, Notifications, ...).
 * CONNECTS TO: components/ui design tokens; consumed by page components.
 *
 * Design notes:
 * - Literal `bg-black` (non-flipping) + `white/NN` opacity text so the bar
 *   renders identically in light and dark themes — the Vercel-style black bar.
 * - All styling lives here once; pages only pass content props.
 */

import { cn } from './cn';

/**
 * Ghost button style for actions inside the black hero bar.
 * Use on <Link>/<button> elements passed via the `actions` prop.
 */
export const heroActionClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/15 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25';

/** Muted pill/chip style inside the hero bar. */
export const heroChipClass =
  'inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white';

/**
 * Black page-header hero card.
 * @param {object} props
 * @param {string} [props.eyebrow]     - small uppercase label above the title
 * @param {string} props.title         - page title
 * @param {string} [props.description] - supporting line under the title
 * @param {Array}  [props.chips]       - strings rendered as hero pills
 * @param {import('react').ReactNode} [props.actions] - right-side action nodes
 * @param {import('react').ReactNode} [props.back]    - optional back-link node
 * @param {string} [props.className]   - extra classes on the card
 */
export function PageHero({ eyebrow, title, description, chips = [], actions, back, className }) {
  return (
    <div className={cn('rounded-lg border border-line bg-black px-6 py-6', className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {back}
          {eyebrow && (
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/60 first:mt-0">{eyebrow}</p>
          )}
          <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm text-white/70">{description}</p>}
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip, i) => (
                <span key={i} className={heroChipClass}>{chip}</span>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
