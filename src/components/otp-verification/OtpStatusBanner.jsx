// ============================================================
// FILE: OtpStatusBanner.jsx
// PURPOSE: Token-styled status banner for the email-verification page
//          ("Segmented cells" design, variant 3). One component, two tones —
//          colour carries meaning only: success = verified, danger = error.
// CONNECTS TO: consumed by components/Verification.jsx; tokens success/danger
//              from the shared palette, icons from lucide-react.
//
// PRESENTATIONAL ONLY. Renders `children` and picks the role from `tone`.
// ============================================================

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui';

/**
 * Verification status banner.
 *
 * @param {object} props
 * @param {'success'|'danger'} props.tone - colour + a11y role selector.
 * @param {React.ReactNode} props.children - banner message.
 * @returns {JSX.Element}
 */
export function OtpStatusBanner({ tone, children }) {
  const isSuccess = tone === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={cn(
        'rounded-2xl border p-6',
        isSuccess ? 'border-success/25 bg-success/10' : 'border-danger/25 bg-danger/10'
      )}
    >
      <Icon
        size={22}
        aria-hidden="true"
        className={cn('mx-auto', isSuccess ? 'text-success' : 'text-danger')}
      />
      <p className={cn('mt-3 text-sm font-medium', isSuccess ? 'text-success' : 'text-danger')}>
        {children}
      </p>
    </div>
  );
}
