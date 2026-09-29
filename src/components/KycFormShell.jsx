// FILE: KycFormShell.jsx
// PURPOSE: Shared layout for the vendor KYC forms (Form1..Form6) - the design
//          chosen from the Form-1 variants: a literal black step rail on the
//          left and a light content area on the right, with restrained motion
//          (animated step markers + progress bar, staggered section reveal).
//          PRESENTATION ONLY - it renders children and knows nothing about the
//          form logic, validation, or navigation of the pages that use it.
// CONNECTS TO: components/Form1..Form6.jsx · main.css (kyc-* animation utils)
//
// Design notes:
// - Colours are literal neutrals (not theme tokens) so the onboarding flow
//   looks identical in light and dark mode, matching the approved design.
// - No shadows and no hover-lift: borders carry the structure (Linear/Vercel).

import logoWhite from '../assets/operon-symbol-white.png';

/** The 7 KYC steps, matching components/StepIndicator.jsx. */
export const KYC_STEPS = [
  'Vendor details',
  'Company details',
  'Product / service',
  'Bank details',
  'Compliance',
  'Additional',
  'Terms & conditions',
];

/**
 * Shell for a single KYC step.
 * @param {object} props
 * @param {number} [props.currentStep=1] - 1-based step number, drives the rail
 * @param {string} props.title           - page heading
 * @param {string} [props.subtitle]      - supporting line under the heading
 * @param {import('react').ReactNode} [props.actions] - right-side header nodes
 * @param {import('react').ReactNode} props.children  - the form body
 * @param {number} [props.maxStep=currentStep] - furthest reached step; rail
 *        steps <= this become clickable (steps beyond stay inert)
 * @param {(step:number)=>void} [props.onStepSelect] - called when a navigable
 *        rail step is clicked; pages pass navigate(+setKycStep) here
 */
export default function KycFormShell({ currentStep = 1, title, subtitle, actions, children, maxStep = currentStep, onStepSelect }) {
  const total = KYC_STEPS.length;
  const percent = Math.round((currentStep / total) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 md:flex-row">
      {/* ── Left: black step rail (literal black in both themes) ── */}
      <aside className="bg-black px-6 py-8 md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:self-start md:overflow-y-auto md:px-8 md:py-10">
        <div className="flex items-center gap-2.5">
          <img src={logoWhite} alt="Operon" className="h-7 w-auto" />
          <span className="text-sm font-medium tracking-tight text-white">Operon</span>
        </div>

        <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
          Vendor onboarding
        </p>

        {/* step list — markers animate between todo / active / done */}
        <ol className="mt-5 space-y-1">
          {KYC_STEPS.map((step, i) => {
            const number = i + 1;
            const isActive = number === currentStep;
            const isDone = number < currentStep;

            // a step is jumpable only when the flow has reached it before and
            // the page supplied a handler — otherwise the rail stays inert
            const navigable = Boolean(onStepSelect) && number <= maxStep;

            return (
              <li key={step}>
                <button
                  type="button"
                  disabled={!navigable}
                  onClick={() => onStepSelect?.(number)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`group flex w-full gap-3 text-left ${
                    navigable ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                <div className="flex flex-col items-center">
                  <span
                    className={`kyc-step flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      isActive
                        ? 'scale-110 border-white bg-white text-black'
                        : isDone
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/15 text-white/40'
                    }`}
                  >
                    {isDone ? (
                      // completed steps collapse to a tick
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 kyc-fade-up" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      number
                    )}
                  </span>
                  {/* connector between markers */}
                  {i < total - 1 && (
                    <span
                      className={`my-1 w-px flex-1 transition-colors duration-300 ${
                        isDone ? 'bg-white/40' : 'bg-white/10'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className={`pb-5 pt-0.5 text-sm transition-colors duration-300 ${
                    isActive ? 'font-medium text-white' : isDone ? 'text-white/70' : 'text-white/40'
                  } ${navigable && !isActive ? 'group-hover:text-white' : ''}`}
                >
                  {step}
                </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* progress — fills on mount, animates smoothly between steps */}
        <div className="mt-8 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>Step {currentStep} of {total}</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <span className="mt-2.5 block h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <span
              className="kyc-progress-bar block h-full rounded-full bg-white"
              style={{ width: `${percent}%` }}
            />
          </span>
        </div>
      </aside>

      {/* ── Right: light content area ── */}
      <main className="flex-1 px-6 py-10 sm:px-10 md:px-12 md:py-12">
        <div className="mx-auto w-full max-w-4xl">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>

          {/* form body — staggered fade-up, one class per child wrapper */}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
