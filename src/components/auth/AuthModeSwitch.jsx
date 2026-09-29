// ============================================================
// FILE: components/auth/AuthModeSwitch.jsx
// PURPOSE: The Login ⇄ Signup segmented control from the approved auth
//          design. On the real pages the two modes are separate routes, so
//          `onSelect` is wired to the page's existing navigate handler —
//          the sliding indicator just marks which screen you're on.
//          Purely presentational; contains no auth logic.
// CONNECTS TO: components/Login.jsx, components/SignUp.jsx.
// ============================================================

/**
 * AuthModeSwitch
 * @param {object} props
 * @param {'login'|'signup'} props.active - which mode this page represents
 * @param {(mode: 'login'|'signup') => void} props.onSelect - page navigation hook
 * @param {string} [props.className]
 */
export default function AuthModeSwitch({ active, onSelect, className = '' }) {
  const isSignup = active === 'signup';

  return (
    <div
      role="tablist"
      aria-label="Choose login or signup"
      className={`relative grid grid-cols-2 rounded-xl border border-line bg-surface-hover p-1 ${className}`}
    >
      {/* sliding indicator — marks the active route */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-ink transition-transform duration-300 ease-out ${
          isSignup ? 'translate-x-full' : 'translate-x-0'
        }`}
      />

      <button
        type="button"
        role="tab"
        aria-selected={!isSignup}
        onClick={() => onSelect('login')}
        className={`relative z-10 h-9 text-sm font-medium transition-colors duration-200 ${
          !isSignup ? 'text-canvas' : 'text-dim'
        }`}
      >
        Login
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={isSignup}
        onClick={() => onSelect('signup')}
        className={`relative z-10 h-9 text-sm font-medium transition-colors duration-200 ${
          isSignup ? 'text-canvas' : 'text-dim'
        }`}
      >
        Signup
      </button>
    </div>
  );
}
