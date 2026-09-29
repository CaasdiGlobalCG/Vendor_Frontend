# Support Kit Context

## What This Feature Does

The shared presentation kit for the vendor **Support Centre**. It owns the status/priority tone
language, the ticket list primitives, and the landing FAQ panel.

It was **promoted from the winning "Refined" design variant** of the Support Centre redesign cycle
(`Documents/Support_Variants_Plan.md`). The five temporary preview routes and the whole
`src/pages/SupportVariants/` directory — including its sample-data files — have been deleted.

## How It Connects

- **Consumers:** `src/pages/support/SupportPage.jsx` and `src/pages/support/SupportTicketDetail.jsx`.
- **Depends on:** `../ui` (`Button`, `EmptyState`, `Skeleton`) and `lucide-react`. Nothing else.
- **Does NOT own:** any state, any API call, any route. This kit is presentational only — every
  handler and every fetch stays in the consuming page.

## Files

| File | Purpose |
|---|---|
| `support-tone.js` | `STATUS_TONE` · `PRIORITY_TONE` · `STATUS_FILTERS` · `SUPPORT_HOURS` · `SUPPORT_TEAM` · `statusTone` · `priorityTone` · `fmtDate` · `fmtRelative` |
| `SupportPills.jsx` | `StatusPill` · `PriorityPill` — the single source of tone |
| `SupportList.jsx` | `ListStates` (loading/error/empty) · `TicketRow` · `StatusFilterChips` |
| `SupportFaqPanel.jsx` | `SupportFaqPanel` — the landing FAQ panel |
| `index.js` | Barrel export |

## Why it exists

The live support page carried two inline tone maps that made the UI hard to scan:

- `STATUS_META` collapsed four states onto two colours — `in_progress` and `resolved` were both
  `text-ink`, and `resolved` shared its `bg-cta` bar with `in_progress`.
- `PRIORITY_META` made `high` and `medium` byte-identical.

Both are replaced here by four visually distinct statuses and four distinguishable priorities.

## The tone contract

| Status | Dot | Meaning |
|---|---|---|
| `open` | `bg-success` | waiting on support |
| `in_progress` | `bg-info` | support is working it |
| `resolved` | `bg-ink` | settled |
| `closed` | `bg-dim` | archived |

| Priority | Chip |
|---|---|
| `urgent` | `border-danger/25 bg-danger/10 text-danger` |
| `high` | `border-warning/25 bg-warning/10 text-warning` |
| `medium` | `border-line bg-surface-hover text-ink` |
| `low` | `border-line bg-transparent text-dim` |

**Colour = meaning only.** Status and priority are the only coloured things; hierarchy comes from
hairlines, opacity and type scale. `brand` (teal) is deliberately unused — `tailwind.config.js:43-44`
reserves teal for nav.

## Important Notes

1. **No new Tailwind keys.** Only existing palette classes; a duplicate key silently overrides theme
   tokens app-wide.
2. **`sm` is 480px here**, not Tailwind's 640px (`tailwind.config.js:222`). Real breakpoints:
   `xs 320 · sm 480 · md 768 · lg 1024 · xl 1280 · 2xl 1536` (`:220-227`).
3. **Presentational only.** Do not add fetching, state, or navigation here — the pages own all of it.
4. **`TicketRow` carries an `unread` flag** because the live page tracks read receipts per ticket
   (`SupportPage.jsx` writes and reads `localStorage['support_read_<id>']`). Keep it.
5. **`SupportFaqPanel` ignores the `iconBg` / `iconColor` keys** that the page's `FAQ_ITEMS` entries
   still carry from the previous design. The icon chip is neutral on purpose. Those keys are left in
   place rather than edited, since that data was not part of this change.
6. `SupportTicketDetail.jsx` deliberately keeps its **own** `initials` / `fmt` / `waitingOnLabel`
   helpers rather than importing equivalents from here — the adoption firewall required that file's
   helper region to stay byte-identical. Consolidating them is a separate, explicit task.
