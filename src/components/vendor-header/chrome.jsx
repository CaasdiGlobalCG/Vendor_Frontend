// ============================================================
// FILE: chrome.jsx
// PURPOSE: Shared header chrome for the shared-language variants — shell, brand
//          mark, primary nav, module tabs, GSTIN strip and notification panel.
// CONNECTS TO: header.constants.js (NAV_ITEMS, MODULE_TABS, COPY),
//              rbac (PermissionGate + LockedNavItem), components/ui (cn).
//
// Fixes carried from the live header:
//   - one NAV_ITEMS list feeds desktop and mobile (Header.jsx:690-712 vs :852-874)
//   - every nav item is a NavLink, so all of them get an active state
//     (the live desktop Workspace item is a <button> — Header.jsx:700-707)
//   - every nav item is gated, including Revenue (Header.jsx:711 has no gate)
//   - module tabs are token-based, readable on light and dark, and the active
//     state uses ink rather than `success` (tabNavigation.jsx:175,182,183)
// ============================================================

import { Link, NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { PermissionGate } from '../../rbac';
import { LockedNavItem } from '../../rbac/components/LockedNavItem';
import { cn } from '../ui';
import { COPY, MODULE_TABS, NAV_ITEMS } from './header.constants';
import blackMark from '../../assets/operon-symbol-black.png';
import whiteMark from '../../assets/operon-symbol-white.png';

/** Outer shell. Hairline structure, no shadow — the brand's structural device. */
export function HeaderShell({ children, className, as: Tag = 'header' }) {
  return (
    <Tag className={cn('relative rounded-lg border border-line bg-surface', className)}>
      {children}
    </Tag>
  );
}

/**
 * Brand mark. Uses the colour-correct asset per theme rather than one fixed image,
 * so the mark can never be the wrong colour for its surface.
 */
export function BrandMark({ to = '/VendorDashboard', label = 'Operon' }) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <img src={blackMark} alt="" className="h-7 w-auto dark:hidden" />
      <img src={whiteMark} alt="" className="hidden h-7 w-auto dark:block" />
    </NavLink>
  );
}

// Active state is a drawn underline anchored to the bottom of the row — no magic
// pixel offset like the live `after:-bottom-[13px]` (Header.jsx:215).
function navLinkClass({ isActive }) {
  return cn(
    'relative flex items-center px-3 text-sm transition-colors duration-150 ease-signal',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
    'after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:bg-ink after:content-[""]',
    isActive
      ? 'text-ink font-medium after:opacity-100'
      : 'text-dim hover:text-ink after:opacity-0 hover:after:opacity-30'
  );
}

/**
 * Horizontal primary nav for the desktop row. Stretches to the row height so the
 * active underline sits on the header's own hairline.
 */
export function NavTabs({ items = NAV_ITEMS, ariaLabel = 'Primary', className }) {
  return (
    <nav className={cn('flex items-stretch gap-0.5 self-stretch', className)} aria-label={ariaLabel}>
      {items.map((item) => {
        const link = (
          <NavLink key={item.id} to={item.to} end={item.end} className={navLinkClass}>
            {item.label}
          </NavLink>
        );

        if (!item.module) return link;

        return (
          <PermissionGate
            key={item.id}
            module={item.module}
            action="view"
            lockedFallback={<LockedNavItem label={item.label} className="px-3 py-2 text-dim" />}
          >
            {link}
          </PermissionGate>
        );
      })}
    </nav>
  );
}

/** Vertical nav list — the mobile menu / drawer form of the same items. */
export function NavList({ items = NAV_ITEMS, onSelect, className }) {
  return (
    <nav className={cn('flex flex-col', className)} aria-label="Primary">
      {items.map((item) => {
        const link = (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            onClick={onSelect}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-2 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                isActive ? 'bg-surface-hover font-medium text-ink' : 'text-dim hover:bg-surface-hover hover:text-ink'
              )
            }
          >
            {item.label}
          </NavLink>
        );

        if (!item.module) return link;

        return (
          <PermissionGate
            key={item.id}
            module={item.module}
            action="view"
            lockedFallback={<LockedNavItem label={item.label} className="px-3 py-2 text-dim" />}
          >
            {link}
          </PermissionGate>
        );
      })}
    </nav>
  );
}

/**
 * Module tabs (Portfolio / Projects / Products). All three now live on the single /portfolio
 * route and pick a view with `?tab=`, so the active state is compared against that param
 * rather than NavLink's `isActive`: `isActive` ignores the query string (react-router
 * NavLink: `locationPathname === toPathname`), so every tab would read as active on the
 * shared pathname /portfolio.
 *
 * A plain `Link` is used for the same reason `aria-current` cannot be left to NavLink —
 * NavLink applies its own `aria-current` after spreading `{...rest}`, so it would mark all
 * three tabs as the current page. The active pill styling is unchanged.
 */
export function ModuleTabs({ compact = false, onSelect, className }) {
  const { search } = useLocation();
  const currentTab = new URLSearchParams(search).get('tab');

  return (
    <nav
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-line bg-canvas p-1',
        className
      )}
      aria-label="Modules"
    >
      {MODULE_TABS.map((tab) => {
        const active = tab.tab === currentTab;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            onClick={onSelect}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-full font-medium transition-colors duration-150 ease-signal',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              compact ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-1.5 text-[13px]',
              active ? 'bg-cta text-cta-foreground' : 'text-dim hover:bg-surface-hover hover:text-ink'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * GSTIN strip. Renders an explicit "not on file" state instead of the live
 * 'Not Available' string (Appheader.jsx:18), so an absent value never looks like data.
 */
export function GstinStrip({ gstin, className }) {
  return (
    <p className={cn('flex items-center gap-2 text-[11px] text-dim', className)}>
      <span className="font-medium uppercase tracking-[0.14em]">{COPY.gstin}</span>
      <span className="h-3 w-px bg-line" aria-hidden="true" />
      <span className={cn('tnum', gstin ? 'text-ink' : 'italic')}>{gstin || COPY.gstinMissing}</span>
    </p>
  );
}

/**
 * Notification dropdown. Rendered once per header so there is a single surface and
 * a single ref — the live header mounts the same button twice with one ref
 * (Header.jsx:337, 730, 893).
 */
export function NotificationPanel({ notifications = [], unreadCount = 0, onClose, onItemOpen, panelRef, className }) {
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={COPY.notifications}
      className={cn(
        'absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden',
        'rounded-lg border border-line bg-surface shadow-pop',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{COPY.notifications}</h2>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="tnum inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
              {unreadCount} {COPY.unread}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="rounded-md p-1 text-dim transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-dim">{COPY.notificationsEmpty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {[...notifications.filter((n) => !n.isRead), ...notifications.filter((n) => n.isRead)]
              .slice(0, 5)
              .map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={notification.link || '/VendorDashboard/notifications'}
                    onClick={() => {
                      // Preserved from Header.jsx:291-296 — opening a notification marks it read.
                      if (onItemOpen) onItemOpen(notification);
                      onClose();
                    }}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors hover:bg-surface-hover',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                      notification.isPending && 'bg-danger/5'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                        notification.isPending ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info'
                      )}
                      aria-hidden="true"
                    >
                      {notification.iconSymbol || 'N'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-xs font-medium',
                          notification.isPending ? 'text-danger' : 'text-ink'
                        )}
                      >
                        {notification.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-dim">{notification.message}</span>
                      {notification.time && (
                        <span className="mt-1 block text-[11px] text-dim">{notification.time}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-4 py-3 text-right">
        <Link
          to="/VendorDashboard/notifications"
          onClick={onClose}
          className="text-xs font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {COPY.notificationsAll}
        </Link>
      </div>
    </div>
  );
}
