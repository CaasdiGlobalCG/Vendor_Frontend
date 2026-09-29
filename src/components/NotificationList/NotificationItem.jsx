// ============================================================
// FILE: NotificationItem.jsx
// PURPOSE: One notification row in the Console format — hairline separated, status
//          carried by a dot and a token-toned badge, with a real action menu.
// CONNECTS TO: components/ui (Badge, cn), react-router-dom (Link), lucide-react.
//
// Fixes carried from the previous version:
//   - unread rows were given `bg-cta` while the title was `text-ink`, so in light mode
//     unread notifications rendered BLACK TEXT ON A BLACK FILL (old :219)
//   - pending rows used a solid `bg-danger` fill (:219)
//   - the row was a `<li onClick>` with no role, tabIndex or keyboard handler (:220)
//   - a fabricated `https://via.placeholder.com/...` avatar default (:12) — destructured,
//     never rendered, and an external placeholder service
//   - `console.log` on every single render (:78)
//   - the badge used inline hex from the API (`badge.color` / `badge.textColor`, :116)
//   - "Mark as important" / "Save" menu items called handlers that are no-ops upstream,
//     so they could never persist anything (:47-50)
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge, cn } from '../ui';

/** Row action menu — real menu semantics with Escape and outside-click close. */
function ActionsMenu({ notification, onDelete, onMarkRead }) {
  const { id, isRead } = notification;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [
    !isRead && { id: 'read', label: 'Mark as read', icon: Check, onClick: () => onMarkRead?.(id) },
    { id: 'delete', label: 'Delete notification', icon: Trash2, danger: true, onClick: () => onDelete?.(id) },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notification actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-md border border-line bg-surface shadow-pop"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink',
                item.danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface-hover'
              )}
            >
              <item.icon size={13} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationItem({ notification, onDelete, onMarkRead }) {
  const {
    id,
    title = 'Notification',
    message = 'No details available',
    time = 'Recently',
    sender = 'System',
    iconSymbol = 'N',
    iconBackgroundClass = 'bg-surface-hover',
    iconTextClass = 'text-ink',
    badge,
    isImportant = false,
    isRead = false,
    link,
    isPending = false,
    primaryActionLabel = null,
  } = notification || {};

  const tone = isPending ? 'danger' : isImportant ? 'warning' : 'neutral';

  return (
    <li className="border-b border-line last:border-0">
      <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-canvas">
        {/* The row body is a real button, so marking read is keyboard reachable.
            It is not the only path — the action menu offers it too. */}
        <button
          type="button"
          onClick={() => onMarkRead?.(id)}
          aria-label={isRead ? `${title} (read)` : `Mark "${title}" as read`}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold',
              iconBackgroundClass,
              iconTextClass
            )}
            aria-hidden="true"
          >
            {iconSymbol}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              {!isRead && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cta" aria-hidden="true" />
              )}
              <span className={cn('truncate text-sm text-ink', isRead ? 'font-medium' : 'font-semibold')}>
                {title}
              </span>
              {isPending && <Badge tone="danger" dot>Action needed</Badge>}
              {isImportant && <Badge tone="warning">Important</Badge>}
              {badge?.text && <Badge tone={tone === 'neutral' ? 'neutral' : tone}>{badge.text}</Badge>}
            </span>
            <span className={cn('mt-1 block text-sm leading-6', isRead ? 'text-dim' : 'text-ink')}>
              {message}
            </span>
            <span className="mt-1.5 block text-[11px] text-dim">
              {time}
              {sender ? ` · ${sender}` : ''}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {link && (isPending || primaryActionLabel) && (
            <Link
              to={link}
              onClick={() => {
                if (!isRead) onMarkRead?.(id);
              }}
              className="inline-flex items-center rounded-md bg-cta px-3 py-2 text-xs font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {primaryActionLabel || 'Open'}
            </Link>
          )}
          <ActionsMenu notification={notification} onDelete={onDelete} onMarkRead={onMarkRead} />
        </div>
      </div>
    </li>
  );
}
