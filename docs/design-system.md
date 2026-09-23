# Caasdi Monochrome Design System — v1.0

**Applies to:** `venodr/Vendor_Frontend` + `Complete_B2B_With_Sales_final/sales/whiteboard-ui`
**Style:** Minimalism & Swiss Style (Vercel/Linear pattern — monochrome base, color = meaning only)
**Date:** 18-09-2026

---

## 1. Color Tokens

### 1.1 Light Mode (default)
> Billing pages, document-heavy screens, client-facing text-dense views.

| Token | Hex | Usage |
|---|---|---|
| `canvas-bg` | `#F8FAFC` | App background — soft off-white, reduces glare |
| `surface-card` | `#FFFFFF` | Cards, modals, elevated containers |
| `surface-hover` | `#F1F5F9` | Hover tint on rows, menu items, cards |
| `border-subtle` | `#E2E8F0` | 1px dividers, input borders, panel separators |
| `text-primary` | `#0F172A` | Headings + body — deep ink charcoal |
| `text-muted` | `#64748B` | Captions, subheaders, placeholders |
| `cta-action` | `#000000` | Primary buttons — stark black for max focus |
| `cta-text` | `#FFFFFF` | Text inside primary CTAs |

### 1.2 Dark Mode
> Dashboards, data-dense views, power-user tools.

| Token | Hex | Usage |
|---|---|---|
| `canvas-bg` | `#050505` | App background — pitch black canvas |
| `surface-card` | `#0F0F11` | Cards, modals, elevated widgets |
| `surface-hover` | `#1A1A1E` | Hover tint on rows, menu items, cards |
| `border-subtle` | `#1F1F23` | 1px dividers, input borders, grid lines |
| `text-primary` | `#F8FAFC` | Headings + body — off-white, no glow |
| `text-muted` | `#8E919A` | Captions, subheaders, side labels |
| `cta-action` | `#FFFFFF` | Primary buttons — stark white |
| `cta-text` | `#000000` | Text inside primary CTAs |

### 1.3 Functional / Status Colors (the ONLY non-neutral hues)
Monochrome rule: color conveys meaning, never decoration.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `status-success` | `#10B981` | `#34D399` | Paid, approved, completed |
| `status-error` | `#DC2626` | `#F87171` | Failed, rejected, destructive |
| `status-warning` | `#D97706` | `#FBBF24` | Pending, expiring, attention |
| `status-info` | `#2563EB` | `#60A5FA` | Informational badges |

### 1.3b Brand Accent — DECIDED (option b)
Monochrome + single teal accent. Used for: primary actions where brand presence matters, links, active nav items, focus rings, success-adjacent highlights.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `brand` | `#21BE9C` | `#2DD4B8` | Teal accent (lifted ~10% in dark for contrast) |
| `brand-foreground` | `#FFFFFF` | `#051E1A` | Text/icons on teal surfaces |

### 1.4 Opacity Tiers (charts, grids, overlays)
Single parent hex + opacity tiers — never new hex values.

| Element | Light | Dark |
|---|---|---|
| Grid/border line | `rgba(15,23,42,0.08)` | `rgba(255,255,255,0.08)` |
| Chart area fill (gradient top→0) | `rgba(15,23,42,0.03)→0` | `rgba(255,255,255,0.03)→0` |
| Modal backdrop | `rgba(15,23,42,0.5)` | `rgba(0,0,0,0.6)` |
| Disabled element | `opacity: 0.4` | `opacity: 0.4` |

### 1.5 CSS Variable Names (implement as)
```css
:root {
  --canvas-bg: #F8FAFC;   --surface-card: #FFFFFF;  --surface-hover: #F1F5F9;
  --border-subtle: #E2E8F0;
  --text-primary: #0F172A; --text-muted: #64748B;
  --cta-action: #000000;  --cta-text: #FFFFFF;
  --status-success: #10B981; --status-error: #DC2626;
  --status-warning: #D97706; --status-info: #2563EB;
}
[data-theme="dark"], .dark {
  --canvas-bg: #050505;   --surface-card: #0F0F11;  --surface-hover: #1A1A1E;
  --border-subtle: #1F1F23;
  --text-primary: #F8FAFC; --text-muted: #8E919A;
  --cta-action: #FFFFFF;  --cta-text: #000000;
  --status-success: #34D399; --status-error: #F87171;
  --status-warning: #FBBF24; --status-info: #60A5FA;
}
```

---

## 2. Typography

**One family everywhere: `Inter`** (both apps already ship it).
Kill: Montserrat + Poppins (vendor), all other imports.
Monospace (IDs, invoice numbers, SKUs, numeric columns): `JetBrains Mono` or Inter `font-feature-settings: "tnum"`.

| Style | Size / Line-height | Weight | Tracking | Usage |
|---|---|---|---|---|
| `display` | 36 / 40 | 700 | -0.02em | Page heroes only |
| `h1` | 30 / 36 | 700 | -0.02em | Page titles |
| `h2` | 24 / 32 | 600 | -0.01em | Section headers |
| `h3` | 20 / 28 | 600 | -0.01em | Card/panel titles |
| `h4` | 16 / 24 | 600 | 0 | Sub-sections |
| `body` | 14 / 22 | 400 | 0 | Default app text |
| `body-sm` | 13 / 20 | 400 | 0 | Dense tables, secondary info |
| `label` | 13 / 18 | 500 | 0 | Form labels, nav items |
| `caption` | 12 / 16 | 400 | 0 | Timestamps, meta — always `text-muted` |
| `mono` | 13 / 20 | 400 | 0 | IDs, SKUs, amounts |

Rules: never <12px · headings weight ≥600 · body weight 400 · no uppercase except tiny badges (tracking +0.05em).

---

## 3. Spacing, Radius, Shadow, Borders

**Spacing — 4px grid:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Card padding default `24px` (dense tables `16px`).

**Radius:**
| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Inputs, badges, small buttons |
| `radius-md` | 8px | Buttons, cards, dropdowns |
| `radius-lg` | 12px | Modals, panels |
| `radius-full` | 9999px | Pills, avatars, status dots |

**Borders-first depth** (Vercel pattern): elevation comes from 1px `border-subtle`, NOT shadows.
Shadows only for floating layers:
- `shadow-pop`: `0 4px 12px rgba(0,0,0,0.08)` — dropdowns, tooltips
- `shadow-modal`: `0 8px 32px rgba(0,0,0,0.12)` — modals, command palettes
- Dark mode: same shadows at ~2× opacity.

**Z-index scale:** base 0 · sticky 10 · header 20 · dropdown 40 · modal 100 · toast 200 · tooltip 300.

---

## 4. Motion

| Element | Duration | Easing | Property |
|---|---|---|---|
| Hover states | 150ms | ease-out | color, background, border |
| Dropdown/popover open | 150-200ms | ease-out | opacity + translateY(4px→0) |
| Modal/dialog | 200-250ms | ease-out | opacity + scale(0.96→1) |
| Page/view transitions | 200-300ms | ease-out | opacity, transform only |
| Toast in/out | 200ms / 150ms | ease-out / ease-in | translateY + opacity |
| List stagger | 30-50ms per item | ease-out | max 8 items staggered |
| Skeleton shimmer | 1.5s loop | linear | background-position |

Rules: transform + opacity ONLY (never width/height/top) · exits ~60-70% of enter duration · everything respects `prefers-reduced-motion` · no animation may block input.

---

## 5. Shared Component Kit (build once per app, `src/components/ui/`)

| Component | Variants | Replaces (vendor count) |
|---|---|---|
| `Button` | primary (cta), secondary, ghost, danger, icon-only | ~20 bespoke buttons |
| `Card` | default, hoverable, bordered | ~15 card implementations |
| `Modal` | sm/md/lg, confirm variant | ~30 modal implementations |
| `Input` / `Select` / `Textarea` | default, error, disabled | scattered per-form styles |
| `Table` | head/body/row + sticky header, hover, empty slot | per-page tables |
| `Badge` / `StatusPill` | success/error/warning/info/neutral | ad-hoc colored spans |
| `EmptyState` | icon + title + description + CTA | ~10 versions |
| `Skeleton` | text, card, table-row | spinners everywhere |
| `Toast` | wrapper over react-hot-toast / react-toastify | unify API |
| `Tabs`, `Dropdown`, `Avatar`, `PageHeader`, `StatCard`, `SidebarItem` | — | per-page versions |

Icons: **lucide-react only** — remove `react-icons` from both apps (dual icon libs = inconsistent stroke widths).

---

## 6. Current-State Findings (what this fixes)

### Vendor_Frontend — severe inconsistencies
- **4 competing brand systems:** teal `#21BE9C` (global.css), HSL green (main.css), pink→teal gradient `#b9258f→#1bf6c6` (tailwind), 1,863 hardcoded hex literals
- **3 fonts:** Montserrat, Poppins, Inter
- **4 styling methods:** Tailwind + 30 per-page CSS files + styled-components/styled-jsx (installed, ~0 real usage) + inline
- **66 bespoke Modal/Button/Card files** vs 5 files in `components/ui`
- Forced-black `custom-bg:#000` — no real dark-mode system
- Nonstandard breakpoints (sm:480, lg:1024)
- Dead deps: `styled-components`, `styled-jsx`, `react-scripts` (CRA), `react-slick`; framer-motion used in only 2 files
- 20+ files >1,000 lines (CanvasWorkspace = 5,802) — logic untouched this phase, but style extraction shrinks them

### whiteboard-ui (sales) — cleaner but accent chaos
- HSL token skeleton exists — light mode only, no `.dark` block
- 3 conflicting accents: green `162 47% 30%` + `violetCustom #7B0399` + `magentaCustom #E206FF` + tender orange gradient `#ff7243→#994428`
- 147 hex literals (small cleanup)
- Dual icon libs, no animation system (single keyframe)
- 15 files >300 lines

---

## 7. Decision — RESOLVED
**Accent strategy:** option **(b)** — monochrome + `#21BE9C` teal single brand accent. Implemented as `--brand` token (see §1.3b).

### 7.1 Single-source-of-truth mechanism (REQUIRED)
Colors live ONLY in CSS vars (`src/main.css` vendor · `src/index.css` sales). Tailwind config maps every class to `rgb(var(--token) / <alpha-value>)`. To recolor the app: edit the var values once — never touch components.

### 7.2 Legacy alias layer
Old class names resolve through the same vars so nothing breaks during migration:

| Legacy class | Resolves to |
|---|---|
| `bg-primary`, `violetCustom`, `magentaCustom`, `gradient-from/to`, `line-active` | `--brand` (teal) |
| `bg-background`, `custom-bg` | `--canvas-bg` |
| `text-foreground`, `custom-text` | `--text-primary` |
| `bg-card`, `bg-popover` | `--surface-card` |
| `bg-muted`, `bg-secondary`, `bg-accent` | `--surface-hover` |
| `text-muted-foreground` | `--text-muted` |
| `border-border`, `border-input`, `line-inactive` | `--border-subtle` |
| `bg-destructive` | `--status-danger` |
| `ring` | `--brand` |
| `font-poppins`, `font-montserrat` | Inter (fonts removed) |

### 7.3 Tailwind-only rule
New UI = Tailwind utilities only. When remodeling a page that has a `.css` file, convert the rules to Tailwind classes inline and delete the CSS file. No new `.css` files except the token file.

---

## 8. Execution Phases (frontend-only, zero logic changes)

| Phase | Scope | Output |
|---|---|---|
| 0 — Tokens | CSS vars (light+dark) + tailwind theme mapping + Inter-only fonts, both apps | Single source of truth |
| 1 — UI kit | Build/complete `components/ui` per app; lucide-only icons | Shared primitives |
| 2 — App shell | Sidebar, header, login, settings shell reskin | Biggest visual ROI |
| 3 — Pages | Migrate by traffic: dashboard → workspace → invoices/quotes → forms | Page-by-page |
| 4 — Polish | Motion pass, a11y audit (4.5:1, focus rings), dark-mode QA | Ship-ready |
