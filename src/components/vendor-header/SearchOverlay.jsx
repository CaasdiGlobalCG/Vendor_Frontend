// ============================================================
// FILE: SearchOverlay.jsx
// PURPOSE: Accessible rebuild of the global search overlay — dialog semantics,
//          a labelled input, and keyboard-reachable results.
// CONNECTS TO: header.constants.js (COPY), lucide-react.
//
// Fixes carried from components/Header/GlobalSearchOverlay.jsx:
//   - results were <li onClick> with no role, no tabIndex and no keyboard path
//     (:86-108) — every result here is a real <button>
//   - the dialog had no role="dialog" / aria-modal and the input had no label
//     (:34-46)
//   - it pulled @heroicons/react while the rest of the app uses lucide-react (:2)
// Props are unchanged from the live component so adoption is a drop-in swap.
// ============================================================

import { useEffect, useRef } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '../ui';
import { COPY } from './header.constants';

const GROUPS = [
  { key: 'projects', title: COPY.searchGroups.projects, idOf: (item) => item.id, titleOf: (item) => item.name || 'Untitled project' },
  { key: 'leads', title: COPY.searchGroups.leads, idOf: (item) => item.leadId, titleOf: (item) => item.leadTitle || item.projectName || 'Lead' },
  { key: 'workspaces', title: COPY.searchGroups.workspaces, idOf: (item) => item.leadId, titleOf: (item) => item.leadTitle || item.projectName || 'Workspace' },
  { key: 'commands', title: COPY.searchGroups.commands, idOf: (item) => item.id, titleOf: (item) => item.label },
];

export function SearchOverlay({
  isOpen,
  query,
  onQueryChange,
  onSubmit,
  onClose,
  loading,
  results,
  onResultClick,
}) {
  const inputRef = useRef(null);

  // Restore focus to whatever was focused before the dialog opened.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit(query);
    }
  };

  const safe = results || {};
  const groups = GROUPS.map((group) => ({
    ...group,
    items: Array.isArray(safe[group.key]) ? safe[group.key] : [],
  }));
  const hasResults = groups.some((group) => group.items.length > 0);
  const tooShort = query.trim().length < 2;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 pt-24 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={COPY.search}
        className="w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-surface"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
          <Search size={18} className="hidden shrink-0 text-dim sm:block" />
          <input
            ref={inputRef}
            id="header-variant-search"
            aria-label={COPY.searchHint}
            autoComplete="off"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={COPY.searchHint}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-dim sm:text-base"
          />
          <span className="hidden shrink-0 text-xs text-dim sm:inline">
            Press Enter to search · Esc to close
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 rounded-md p-1.5 text-dim transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[480px] space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-dim" aria-live="polite">
              <Loader2 size={18} className="animate-spin text-ink" />
              <span className="text-sm">{COPY.searchLoading}</span>
            </div>
          )}

          {!loading && tooShort && (
            <p className="py-10 text-center text-sm text-dim">{COPY.searchEmpty}</p>
          )}

          {!loading && !tooShort && !hasResults && (
            <p className="py-12 text-center text-sm text-dim">
              {COPY.searchNoResults} for <span className="font-semibold text-ink">“{query}”</span>
            </p>
          )}

          {!loading &&
            groups.map((group) =>
              group.items.length === 0 ? null : (
                <section key={group.key}>
                  <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
                    {group.title}
                  </h3>
                  <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-canvas">
                    {group.items.map((item) => (
                      <li key={`${group.key}-${group.idOf(item)}`}>
                        <button
                          type="button"
                          onClick={() => onResultClick(group.key.slice(0, -1), item)}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4',
                            'transition-colors hover:bg-surface',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink'
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {group.titleOf(item)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-dim">
                              {group.key === 'commands' && item.description
                                ? item.description
                                : `ID: ${group.idOf(item)}`}
                            </span>
                          </span>
                          {(item.status || item.priority || item.badge) && (
                            <span className="shrink-0 rounded-full bg-surface-hover px-2.5 py-1 text-[11px] text-ink">
                              {item.status || item.priority || item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            )}
        </div>
      </div>
    </div>
  );
}
