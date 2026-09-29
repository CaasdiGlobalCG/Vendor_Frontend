# kyc-status — the vendor KYC-status page's presentational layer

## What this is

A small directory holding the **presentational-only** pieces of the live vendor
"Auditor waiting" (KYC status) page, so the page file keeps only its logic and its two
stateful sub-components.

| File | Role |
| --- | --- |
| `status-tone.js` | The ONE status → tone contract (`STATUS_TONE`, `statusTone`). |
| `StatusTimeline.jsx` | The vertical stage timeline frame (`StatusTimeline`). |
| `KycPanels.jsx` | The five pure status panels + shared `Panel` shell. |
| `kyc-status-context.md` | This file. |

## Which live file consumes it

`src/components/AuditorWaiting.jsx` — the `/Auditorapprove` route (`App.jsx` imports it as
`Auditor`). Nothing else imports this directory.

- `StatusTimeline` is imported as `./kyc-status/StatusTimeline`.
- `KycPanels` is imported as `./kyc-status/KycPanels`.
- `statusTone` is imported as `./kyc-status/status-tone`.

Import depth from inside this directory: `../ui` for `src/components/ui`, `../../` for `src/`.

## Frozen props

`StatusTimeline({ steps, currentIndex, rejected, children })`

- `steps` — `Array<{ key, label }>`; the live page passes its existing `STATUS_STEPS`.
- `currentIndex` — from the live page's existing `getStepIndex(vendorStatus)`.
- `rejected` — when `true`, NO stage is marked complete (chips read `Pending`) and `children`
  renders **below** the timeline instead of under a node, because `getStepIndex('rejected')`
  returns `0` and would otherwise file the rejection detail under "Online KYC Review".
- `children` — the expanded content for the current stage; the live page passes `renderContent()`.

`KycPanels` exports (names and props unchanged from the live page):

- `OnlineKYCPendingPanel()` — no props.
- `PhysicalKYCReviewPanel()` — no props.
- `ApprovedPanel()` — no props.
- `ResubmitRequestedPanel({ permissions, remarks, onEditSubmission })`.
- `RejectedPanel({ reason })`.

`status-tone.js` exports `STATUS_TONE` (one entry per status, each with
`{ label, headline, chip, dot, text }`) and `statusTone(status)`.

## The "no logic here" boundary

Everything in this directory is **presentational only**:

- **No hooks, no state, no effects, no data fetching.**
- **No date parsing / formatting.** The live page's `formatDate` stays in
  `AuditorWaiting.jsx`.
- **No navigation, no API calls.** Handlers are passed in as props
  (e.g. `onEditSubmission`, `onRescheduleRequest`).
- **No imports from the deleted KYC variant preview directory** (it lived under `src/pages/`);
  the tone map and stage vocabulary were copied here.
- **Tokens only** — `canvas`, `surface`, `surface-hover`, `line`, `ink`, `dim`, `cta`,
  `success`, `danger`, `warning`, `info`. No raw hex, no `amber-*`, no nav-only `brand` teal.

All copy is carried over verbatim from the live page. The only non-copy change is that the
live page's emoji markers are replaced by `lucide-react` icons, each paired with its text label.
