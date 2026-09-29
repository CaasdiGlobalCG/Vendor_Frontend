# Vendor Frontend Context

## What This App Does

The Vendor-facing web app of the Caasdi platform. A vendor signs up, completes KYC onboarding
(Form1–Form6), waits for auditor approval, then works from a dashboard: approved leads, project
workspaces, purchase orders and invoices, tenders, finance, team/RBAC and support.

## How It Connects

- **Backend:** `venodr/Vendor_Backend`. In dev, Vite proxies `/api` → `http://localhost:5001`
  (`vite.config.js:37-38`). `config.VENDOR_BACKEND_URL` is an **empty string** — all API calls are
  relative (`src/config/env.js:25`).
- **Sibling apps:** client (`VITE_CLIENT_URL`), sales (`VITE_SALES_URL`), B2B marketplace
  (`VITE_B2B_MARKETPLACE_URL`), employee backend (`VITE_EMPLOYEE_BACKEND_URL`) — see
  `src/config/env.js:36-39`.
- **Auth:** AWS Cognito via `aws-amplify` + `amazon-cognito-identity-js`, plus a cookie session
  (`/api/vendor/me`) and optional passkey registration. `authFetch` handles 401 retry.
- **Cross-app handoff:** one-time handoff codes are exchanged on arrival
  (`?handoff=…` → `/api/auth/handoff/vendor-exchange`) for both the client→vendor and sales→vendor
  switches.
- **Repos:** this directory is its **own git repo** (`venodr/Vendor_Frontend/.git`) and is ignored by
  the monorepo root (`Caasdi/.gitignore:7` → `/*`).

## Key Files

| Path | Purpose |
|---|---|
| `src/App.jsx` | Router + provider tree + guards (`RoleGuard`, `VendorGuard`, `AuthVerifiedGuard`, `ProtectedRBACLayout`) |
| `src/main.jsx` | Entry |
| `src/main.css` | **Design token source of truth** + motion/utility classes |
| `tailwind.config.js` | Token → Tailwind class mapping |
| `src/config/env.js` | Env resolution and app URLs |
| `src/context/VendorContext.jsx` | Identity (`currentUser`, `vendorData`), hydration, logout |
| `src/context/UserContext.jsx` | Secondary user context |
| `src/components/ui/` | Shared UI kit — `Button`, `Card`, `Badge`, `Modal`, `Input`, `Table`, `EmptyState`, `Skeleton`, `PageHeader`, `PageHero`, `StatCard`, `Reveal`, `ThemeToggle` |
| `src/components/dashboard/` | Dashboard kit — `MetricTile`, `StatusPill`, `StageRail`, `StatusBar`, `ProgressBar`, `Panel`, `ProjectTable`, `TenderPanel`, `FinancePanel`, `Sparkline` + `dashboard.constants.js` |
| `src/pages/VendorDashboard/VendorDashboard.jsx` | Main dashboard (the `/VendorDashboard` index route) |
| `src/pages/WorkspacePage/` | Project workspace — largest feature in the app |
| `src/rbac/` | Roles, permissions, `ModuleGuard`, `TeamPage` |
| `src/components/auth/` | Shared auth presentation kit used by `Login.jsx` + `SignUp.jsx` |

## Design System

Closed monochrome, matching `operon-site/BRAND.md`. Tokens are CSS variables in `main.css:13-55` and
are surfaced as Tailwind classes in `tailwind.config.js:20-45`:

`canvas` · `surface` / `surface-hover` · `line` · `ink` · `dim` · `cta` / `cta-foreground` ·
`brand` (teal — the only non-status hue) · `success` · `danger` · `warning` · `info`

- **Status colours mean state, never decoration** (`main.css:28`). Colour is for status,
  notifications and highlights only; hierarchy comes from opacity steps and hairlines.
- Light/dark flip automatically through the `.dark` class on `<html>` (`index.html:15-23`), applied
  before first paint.
- Fonts: Inter (UI), Poppins (`font-display`), JetBrains Mono (`font-mono`) — `index.html:8,13`.
- **Breakpoints are non-standard** (`tailwind.config.js:220-227`): `xs 320 · sm 480 · md 768 ·
  lg 1024 · xl 1280 · 2xl 1536`. **`sm` is 480px, not 640px** — use `md:` for tablet-up.
- Utilities in `main.css`: `.tnum`, `.vd-reveal`/`.reveal-visible`, `.vd-spotlight`, `.vd-lift`,
  `.vd-row-arrow`, `.brand-press`, `.animate-hero-in`, `.kyc-*`; all neutralised by a global
  `prefers-reduced-motion` block (`:247-260`).

## Data Flow

`VendorContext` hydrates identity from the cookie-authenticated `/api/vendor/me` on mount (and on tab
re-focus, to detect cross-tab session changes). Pages then resolve `vendorId` as
`currentUser?.vendorId || vendorData?.vendorId || currentUser?.id` and fetch their own slices. The
dashboard reads `/api/vendor/me`, `POST /api/vendor-leads`, `/api/workspaces/project/:id`,
`/api/vendor/tenders`, `/api/finance/overview`, with `sessionStorage` caching for projects and
workspace statuses.

## Important Notes

1. **Never add new design tokens.** A duplicate `ink`/`paper` key once silently overrode the theme
   tokens and broke dark mode app-wide. Brand-palette values that must not flip are namespaced `op-*`
   (`tailwind.config.js:91-105`).
2. **Never fabricate data in the UI.** The dashboard currently ships `mockTenders` and a synthetic
   revenue series as fallbacks, `ProjectRow` invents a `60%` progress figure, and `StatCard` defaults
   its status label to `'Healthy'`. These are known defects — do not add more.
3. **Clear `node_modules/.vite`** before verifying CSS changes; a dev server started before a token
   existed will serve CSS without it.
4. **Vite's SPA fallback requires `Accept: text/html`** — a bare request 404s on every route,
   including pre-existing ones, so that is not a signal of a broken route.
5. **Use the `edit` tool for edits**, never PowerShell `Get-Content`/`Set-Content` round-trips —
   PS 5.1 is not byte-safe and has already mangled non-ASCII characters in this repo.
6. The app has no test runner configured beyond `npm run test:auth-flow` (two node scripts in
   `tests/`).
7. `src/components/dashboard/` is the dashboard's own component set (promoted from the winning design
   variant). The temporary review routes `/dashboard-variant-1..5` **no longer exist** — the design was
   adopted and the variants deleted. Do not reintroduce fabricated fallback data into that kit: the
   removed `mockTenders` and synthetic revenue series are documented in `Documents/28-09-2026.md`.
8. **The vendor app has two headers, and both are slated to merge into one.** `components/Header/Header.jsx`
   (1075 lines, mounted in `Layout`) and `components/AppHeader/Appheader.jsx` (70 lines, mounted directly
   by `Home.jsx:567`, `UserProductPage.jsx:1616`, `UserProjectPage.jsx:2309`). Temporary review routes
   `/header-variant-1..5` exist for choosing the combined design — they are wrapped in `RBACProvider`
   but **not** `AccessDeniedGuard`, so they never redirect, and a signed-in session is required for
   gated nav to render. See `Documents/Vendor_Header_Variants_Plan.md`.
9. **`useRBAC()` throws outside an `RBACProvider`** (`rbac/context/RBACContext.jsx:289-291`) and
   `usePermission`/`PermissionGate` depend on it. Any route that renders gated nav must supply the
   provider, even if it is otherwise unguarded.
10. **There is now ONE combined vendor header:** `src/components/vendor-header/VendorHeader.jsx`,
    mounted at four points — `App.jsx` `Layout`, `Home.jsx`, `UserProductPage.jsx`,
    `UserProjectPage.jsx`. It superseded and replaced `components/Header/Header.jsx`,
    `components/Header/GlobalSearchOverlay.jsx`, `components/Header/DateYearFunction.jsx`,
    `components/Header/Profile.jsx` and the whole `components/AppHeader/` directory (all deleted).
    Only `components/Header/AiPromptPanel.jsx` survives there, because the combined header still
    renders it.
11. **Do not name anything `src/components/header/`.** NTFS is case-insensitive, so it silently merges
    with the existing `src/components/Header/` directory and then fails to resolve on a
    case-sensitive Linux build. The vendor header kit is deliberately `vendor-header/`.
12. **`src/components/Header.jsx` (a FILE) is a different, unrelated header** — the public landing-page
    nav used by `HeroSection.jsx`, which `HomePage.jsx` renders. `import './Header'` resolves to that
    file, not to the `Header/` directory. Do not confuse the three.
13. **The Support Centre was redesigned and the winning design is now live.** The "Refined" variant
    was adopted into `src/pages/support/SupportPage.jsx` and `SupportTicketDetail.jsx`, and its
    presentation kit was promoted to `src/components/support/` (`support-tone.js`, `SupportPills.jsx`,
    `SupportList.jsx`, `SupportFaqPanel.jsx`) — see `src/components/support/support-context.md`. The
    temporary preview routes `/support-variant-1..5`, the whole `src/pages/SupportVariants/`
    directory and its sample-data files have been **deleted**. During that cycle the live support
    logic (all hooks, handlers, API calls, storage access and guards) was held byte-identical to the
    pre-redesign files; the only removed hook was `FaqItem`'s accordion `useState`, whose open/close
    behaviour the kit now provides via native `<details>`. See
    `Documents/Support_Variants_Plan.md` and `Documents/29-09-2026.md`.
14. **The support tone maps now live in one place.** `STATUS_TONE` / `PRIORITY_TONE` are in
    `src/components/support/support-tone.js` — do not re-declare them inside a page. The old inline
    maps collapsed four statuses onto two colours and made `high` and `medium` identical; the kit's
    four-distinct-status contract is documented in that kit's context file.
15. **The OTP / email-verification page now uses the "Segmented cells" design.** `src/components/Verification.jsx`
    (routes `/verification` and `/verify-email`) renders the six-cell code entry from
    `src/components/otp-verification/` (`OtpCells.jsx`, `OtpStatusBanner.jsx`) — see
    `src/components/otp-verification/otp-verification-context.md`. All page logic (six `useState`,
    the link-confirmation `useEffect`, `handleVerifyCode`, `handleContinue`, `handleResendEmail`) is
    **unchanged and still in `Verification.jsx`**; the kit is presentational only. `OtpCells` keeps
    ONE real input (carrying the original props and the original `onChange`) visually hidden under
    six inert cells — the only added behaviour is a wrapper `onClick` that focuses it. The page's
    old stylesheet `src/styles/Verification.css` is now **unreferenced** and left on disk.
16. **The Auditor waiting / KYC-status page now uses the "Timeline" design.** `src/components/AuditorWaiting.jsx`
    (route `/Auditorapprove`) renders the vertical stage timeline from `src/components/kyc-status/`
    (`status-tone.js`, `StatusTimeline.jsx`, `KycPanels.jsx`) — see
    `src/components/kyc-status/kyc-status-context.md`. All page logic stays in `AuditorWaiting.jsx`,
    including `ScheduleCard` and `EvidenceUploadPanel`, which **keep their own state there** and were
    only restyled. The five pure status panels moved to `KycPanels.jsx`; the old horizontal
    `ProgressStepper` was deleted as unused. `STATUS_TONE` in `status-tone.js` is now the single
    status→colour contract, replacing the page's previous mix of `text-success`, raw `amber-*` and a
    hard-coded `#0F5848`.
17. **Both variant preview features are deleted.** `/verify-otp-variant-1..5` and
    `/auditor-waiting-variant-1..5` no longer exist, nor do their directories. When adopting a design
    into a page that is itself a component **file** (`Verification.jsx`, `AuditorWaiting.jsx`), do
    **not** create a sibling directory differing only by case — a new `components/verification/`
    would resolve `./verification` to the existing `Verification.jsx` on NTFS. Use a distinct name
    (`otp-verification/`, `kyc-status/`).

