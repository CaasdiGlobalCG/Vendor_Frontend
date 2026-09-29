// ============================================================
// FILE: PortfolioPage.jsx
// PURPOSE: The consolidated Portfolio page — the split-rail design, hosting the three
//          REAL page bodies (Company / Projects / Catalogue) with all their logic intact.
// CONNECTS TO: components/vendor-header (VendorHeader), ./views/CompanyView,
//              ./views/ProjectsView, ./views/CatalogueView.
//
// HOW THIS WORKS — and why it is safe:
//   Each view is the ORIGINAL page component (Home.jsx's CompanyProfile,
//   UserProjectPage.jsx's UserProjectPage, UserProductPage.jsx's UserPortfolio) with ONLY
//   its outer chrome removed — the outer <div>, the VendorHeader wrapper, the flex-row
//   wrapper, the UserProfileCard and the VendorTabPanel open/close tags. This shell
//   supplies that chrome instead.
//   Every useState, useEffect, handler, API call, validation and modal inside each view is
//   byte-identical to its source — proven per view by comparing the extracted logic region.
//
// The three source pages remain live at /vendor-home, /userproject and /userproduct.
// ============================================================

import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { VendorHeader } from '../../components/vendor-header';
import { cn } from '../../components/ui';
import { usePortfolioProfile } from './profile/usePortfolioProfile';
import { PortfolioProfileCard } from './profile/PortfolioProfileCard';
import CompanyView from './views/CompanyView';
import ProjectsView from './views/ProjectsView';
import CatalogueView from './views/CatalogueView';

// Three views, not four: UserProductPage already contains its own Products/Services <Tabs>
// inside its panel, so products and services stay one view ("Catalogue") with its internal
// tabs untouched — splitting them would have meant changing that page's logic.
const VIEWS = [
  { id: 'company', label: 'Company' },
  { id: 'projects', label: 'Projects' },
  { id: 'catalogue', label: 'Catalogue' },
];

const COPY = {
  title: 'Portfolio',
  subtitle: 'Company profile, projects and catalogue',
  selectView: 'Select a view',
  notice:
    'Live page — reads and writes are the real ones. This shell only supplies the chrome; every action below is the original page logic.',
  atGlance: 'At a glance',
};

/** Move focus with the selection — roving tabindex, Left/Right/Home/End. */
function nextIndex(key, index, length) {
  if (key === 'ArrowRight') return (index + 1) % length;
  if (key === 'ArrowLeft') return (index - 1 + length) % length;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return null;
}

/**
 * Horizontal view selector, sitting above the panel. Labelled — an unlabelled list of
 * words does not read as a control.
 * @param {object} props
 * @param {string} props.active
 * @param {(id: string) => void} props.onChange
 */
function ViewTabs({ active, onChange }) {
  const listRef = useRef(null);

  const handleKeyDown = (event) => {
    const index = VIEWS.findIndex((view) => view.id === active);
    if (index === -1) return;
    const next = nextIndex(event.key, index, VIEWS.length);
    if (next === null) return;
    event.preventDefault();
    const target = VIEWS[next];
    onChange(target.id);
    listRef.current?.querySelector(`[data-view="${target.id}"]`)?.focus();
  };

  return (
    <nav aria-labelledby="portfolio-selector" className="rounded-lg border border-line bg-surface px-2 pt-2">
      <h2
        id="portfolio-selector"
        className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-dim"
      >
        {COPY.selectView}
      </h2>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Portfolio views"
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 overflow-x-auto"
      >
        {VIEWS.map((view) => {
          const selected = view.id === active;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              data-view={view.id}
              id={`portfolio-tab-${view.id}`}
              aria-selected={selected}
              aria-controls={`portfolio-panel-${view.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(view.id)}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-2 text-sm transition-colors duration-150 ease-signal',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink',
                'after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:bg-ink after:content-[""]',
                selected ? 'font-medium text-ink after:opacity-100' : 'text-dim hover:text-ink after:opacity-0'
              )}
            >
              {view.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const VIEW_IDS = VIEWS.map((view) => view.id);
const DEFAULT_VIEW = 'company';

export default function PortfolioPage() {
  // The view lives in `?tab=` so the header's module tabs can deep-link into it — on a
  // single pathname they would otherwise all read as active at once.
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const view = VIEW_IDS.includes(requested) ? requested : DEFAULT_VIEW;

  const setView = (id) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', id);
        return next;
      },
      { replace: true }
    );
  };

  const { profile, loading: profileLoading } = usePortfolioProfile();

  // The profile card lives here, in the shell, so it renders ONCE and survives tab
  // switching. Its Edit button bumps this counter; the active view watches it and opens
  // its own Edit Profile modal (each view owns that modal, so no logic moves).
  const [editProfileSignal, setEditProfileSignal] = useState(0);

  // Each view keeps its own state and its own data fetching, exactly as its source page did.
  const body = useMemo(
    () =>
      ({
        company: <CompanyView editProfileSignal={editProfileSignal} />,
        projects: <ProjectsView editProfileSignal={editProfileSignal} />,
        catalogue: <CatalogueView editProfileSignal={editProfileSignal} />,
      })[view],
    [view, editProfileSignal]
  );

  return (
    <div className="min-h-screen w-full bg-canvas pb-24 font-sans">
      {/* Same wrapper the three live pages use — VendorHeader mounts itself on these routes. */}
      <div className="pt-5 px-5 pb-0">
        <VendorHeader />
      </div>

      <div className="mx-auto mt-3 flex w-full max-w-[1400px] flex-col gap-5 px-3 py-5 sm:mt-4 sm:gap-6 sm:px-4 sm:py-8 md:px-6 lg:flex-row lg:items-start lg:px-8">
        <div className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-5 lg:w-64 lg:max-w-[280px]">
          <div className="rounded-lg border border-line bg-surface px-4 py-3">
            <h1 className="text-base font-semibold tracking-tight text-ink">{COPY.title}</h1>
            <p className="mt-0.5 text-[11px] leading-4 text-dim">{COPY.subtitle}</p>
          </div>

          {/* Rendered once, here — not per view — so switching views never re-renders it. */}
          <PortfolioProfileCard
            profile={profile}
            loading={profileLoading}
            onEdit={() => setEditProfileSignal((n) => n + 1)}
          />

          {/* Share lives at page level, not per view: /share is the portfolio share
              builder (choose template → edit content → settings & share) which publishes
              to /shared-profile/:vendorId. Route declared at App.jsx:546. */}
          <Link
            to="/share"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cta px-3 py-2.5 text-xs font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Share2 size={14} aria-hidden="true" />
            Share portfolio
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* The view selector sits ABOVE the panel as a horizontal row. */}
          <ViewTabs active={view} onChange={setView} />

          {/* NOT a panel: each view renders its own VendorTabPanel (the real one, with its
              title/description/actions). Wrapping them in a bordered panel here would nest
              two cards. */}
          <div
            role="tabpanel"
            id={`portfolio-panel-${view}`}
            aria-labelledby={`portfolio-tab-${view}`}
            className="min-w-0"
          >
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}
