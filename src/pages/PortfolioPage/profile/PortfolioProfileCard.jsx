// ============================================================
// FILE: PortfolioProfileCard.jsx
// PURPOSE: The vendor profile card, redesigned for the Portfolio page's left rail.
//          Rendered ONCE by the shell, so it no longer re-fetches or re-renders when a
//          different view (tab) is selected.
// CONNECTS TO: ./usePortfolioProfile.js, lucide-react, components/ui.
//
// SAME FIELDS as the previous card — company name, vendor id, phone, location, email, and
// GST/PAN when the API supplies them — in a tighter vertical layout sized for the rail
// (256-280px) rather than the old 1/3 column.
//
// Differences from components/UserProfileCard/UserProfileCard.jsx, deliberately:
//   - no internal fetch (that component had ~170 lines of unreachable fetch logic)
//   - no `https://images.app.goo.gl/...` default avatar (:193, :285) — initials instead
//   - the avatar edit affordance is a real <button>, not a bare <div onClick> (:280)
// ============================================================

import { Camera } from 'lucide-react';
import { Skeleton, cn } from '../../../components/ui';
import { initialsOf, displayValue } from './profile.utils';

/** One label/value row. */
function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-line py-1.5 first:border-t-0">
      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-dim">{label}</span>
      <span
        className={cn('min-w-0 truncate text-right text-[11px] font-medium text-ink', mono && 'tnum')}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * @param {object} props
 * @param {object} props.profile shaped by usePortfolioProfile
 * @param {boolean} props.loading
 * @param {() => void} props.onEdit
 */
export function PortfolioProfileCard({ profile, loading, onEdit }) {
  if (loading) {
    return (
      <div className="rounded-lg border border-line bg-surface p-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading profile</span>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
          <Skeleton className="h-2.5 w-3/5" />
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-surface" aria-label="Vendor profile">
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        {profile.image ? (
          <img
            src={profile.image}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-line"
          />
        ) : (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-canvas ring-1 ring-line"
            aria-hidden="true"
          >
            {initialsOf(profile.companyName || profile.name)}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink" title={displayValue(profile.companyName || profile.name)}>
            {displayValue(profile.companyName || profile.name)}
          </p>
          {profile.vendorId && (
            <p className="tnum mt-0.5 truncate text-[10px] text-dim">{profile.vendorId}</p>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <Row label="Contact" value={displayValue(profile.name)} />
        <Row label="Phone" value={displayValue(profile.phone)} mono />
        <Row label="Location" value={displayValue(profile.location)} />
        <Row label="Email" value={displayValue(profile.email)} />
        {/* Only when the API actually supplies them. */}
        {profile.gstNumber && <Row label="GSTIN" value={profile.gstNumber} mono />}
        {profile.panNumber && <Row label="PAN" value={profile.panNumber} mono />}
      </div>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <Camera size={13} aria-hidden="true" />
          Edit profile
        </button>
      </div>
    </section>
  );
}
