// ============================================================
// FILE: controls.jsx
// PURPOSE: Shared header controls for the shared-language variants — icon buttons,
//          search trigger, notification bell, profile button and the icon-only
//          Vendor↔Client platform switch (a knob that slides while its glyph
//          crossfades).
// CONNECTS TO: header.constants.js (COPY), components/ui (cn), lucide-react.
//
// One icon library only (lucide-react) — the live header mixes heroicons in its
// search overlay (GlobalSearchOverlay.jsx:2) and ships raw inline SVG elsewhere.
// ============================================================

import { forwardRef } from 'react';
import { Bell, Building2, LogOut, MessageSquare, Search, Settings, UserRound } from 'lucide-react';
import { cn } from '../ui';
import { COPY, initialsOf } from './header.constants';

// Icon shown for each platform. Kept literal (not computed) so the scanner sees it.
const GLYPH = { vendor: Building2, client: UserRound };

// Platform → tone. Full literal class strings only: Tailwind's scanner cannot see
// class names built at runtime, so every value must be a complete literal.
// COLOUR = MEANING: Vendor = brand (teal), Client = info (blue) — existing tokens.
const TONE = {
  vendor: { track: 'border-brand bg-brand/10', knob: 'bg-brand', ring: 'focus-visible:ring-brand' },
  client: { track: 'border-info bg-info/10', knob: 'bg-info', ring: 'focus-visible:ring-info' },
};

/**
 * Ghost icon button. Always a real <button> with an accessible name.
 * @param {object} props
 * @param {string} props.label accessible name + tooltip
 * @param {React.ReactNode} props.children icon
 * @param {number} [props.badge] numeric badge, hidden when 0
 * @param {boolean} [props.inert] true = preview-disabled (no handler wired)
 */
export const IconButton = forwardRef(function IconButton(
  { label, children, badge = 0, inert = false, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={inert ? `${label} — disabled in preview` : label}
      aria-disabled={inert || undefined}
      className={cn(
        'relative inline-flex h-8 w-8 items-center justify-center rounded-md text-dim',
        'transition-colors hover:bg-surface-hover hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
        className
      )}
      {...rest}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white ring-1 ring-surface">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
});

/**
 * Search trigger. `full` = the desktop pill with the shortcut hint; `icon` = compact.
 * @param {object} props
 * @param {'full'|'icon'} [props.size='full']
 * @param {string} [props.shortcut] shortcut label, e.g. '⌘K'
 */
export function SearchTrigger({ size = 'full', shortcut = COPY.searchShortcut, className, ...rest }) {
  if (size === 'icon') {
    return (
      <IconButton label={COPY.search} className={className} {...rest}>
        <Search size={16} />
      </IconButton>
    );
  }

  return (
    <button
      type="button"
      aria-label={COPY.search}
      className={cn(
        'flex h-8 items-center gap-2 rounded-md border border-line bg-canvas px-2.5',
        'text-[13px] text-dim transition-colors hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
        'w-9 justify-center md:w-52 md:justify-start',
        className
      )}
      {...rest}
    >
      <Search size={14} className="shrink-0" />
      <span className="hidden truncate md:inline">Search…</span>
      <kbd className="ml-auto hidden rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium leading-none text-dim md:inline">
        {shortcut}
      </kbd>
    </button>
  );
}

/**
 * Notification bell. The panel itself is owned by the caller so only ONE bell
 * exists per header — the live header renders this button twice with the same
 * ref (Header.jsx:337, 730, 893), which breaks outside-click-to-close.
 */
export const NotificationButton = forwardRef(function NotificationButton(
  { count = 0, isOpen = false, onClick, className },
  ref
) {
  return (
    <IconButton
      ref={ref}
      label={COPY.notifications}
      badge={count}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      className={cn(isOpen && 'bg-surface-hover text-ink', className)}
    >
      <Bell size={16} />
    </IconButton>
  );
});

/**
 * Profile control — avatar image when the vendor has one, initials otherwise.
 * Never fabricates an image.
 */
export function ProfileButton({ name, avatarUrl, onClick, label = COPY.profile, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
        className
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-6 w-6 rounded-full object-cover ring-1 ring-line"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-canvas ring-1 ring-line">
          {initialsOf(name)}
        </span>
      )}
    </button>
  );
}

/** Message / settings / logout cluster, so every variant renders them identically. */
export function UtilityCluster({ onNavigate, onLogout, inertActions = false, className }) {
  return (
    <div className={cn('flex items-center', className)}>
      <IconButton label={COPY.messages} inert={inertActions}>
        <MessageSquare size={16} />
      </IconButton>
      <IconButton label={COPY.settings} onClick={() => onNavigate?.('/settings')}>
        <Settings size={16} />
      </IconButton>
      <IconButton label={COPY.logout} onClick={inertActions ? undefined : onLogout} inert={inertActions}>
        <LogOut size={16} />
      </IconButton>
    </div>
  );
}

/**
 * One platform glyph layer inside the knob. Both layers stay mounted so the
 * swap crossfades instead of popping: the wrapper owns the 90° rotation
 * (`transition-transform`) and the nested icon owns the fade (`transition-opacity`),
 * so no element needs two transition properties.
 */
function Glyph({ Icon, visible }) {
  return (
    <span
      className={cn(
        'absolute inset-0 flex items-center justify-center transition-transform duration-240 ease-signal',
        visible ? 'rotate-0' : 'rotate-90'
      )}
    >
      <Icon
        size={10}
        aria-hidden="true"
        className={cn(
          'text-canvas transition-opacity duration-240 ease-signal',
          visible ? 'opacity-100' : 'opacity-0'
        )}
      />
    </span>
  );
}

/**
 * Vendor/Client platform switch — a real <button> with role="switch", not a div
 * with role="button". Icon-only: the knob slides on `translate` and its two
 * glyphs crossfade, so colour alone carries the platform meaning.
 *
 * MOTION: transform + opacity only. The knob slides (`translate`), the track
 * tint and knob colour crossfade (`transition-colors`). Nothing animates
 * left/width/height/top. Reduced motion is handled globally in main.css.
 *
 * @param {object} props
 * @param {'vendor'|'client'} props.mode
 * @param {boolean} [props.inert] preview mode — the cross-app redirect is not fired
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 */
export function PlatformSwitch({ mode = 'vendor', inert = false, onClick, className }) {
  const isVendor = mode === 'vendor';
  const nextLabel = isVendor ? COPY.client : COPY.vendor;
  const tone = TONE[isVendor ? 'vendor' : 'client'];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isVendor}
      onClick={inert ? undefined : onClick}
      aria-label={`${COPY.switchTo}: ${nextLabel}`}
      title={inert ? `${COPY.switchTo} — disabled in preview` : `${COPY.switchTo}: ${nextLabel}`}
      aria-disabled={inert || undefined}
      className={cn(
        'relative h-[26px] w-[76px] shrink-0 rounded-full border transition-colors duration-240 ease-signal',
        'focus-visible:outline-none focus-visible:ring-2 ring-offset-1 ring-offset-surface',
        tone.track,
        tone.ring,
        className
      )}
    >
      <span
        className={cn(
          'absolute left-1 top-1/2 flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center rounded-full transition-transform duration-240 ease-signal',
          tone.knob,
          isVendor ? 'translate-x-0' : 'translate-x-[50px]'
        )}
      >
        <Glyph Icon={GLYPH.vendor} visible={isVendor} />
        <Glyph Icon={GLYPH.client} visible={!isVendor} />
      </span>
    </button>
  );
}
