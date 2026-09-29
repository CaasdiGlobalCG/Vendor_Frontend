# otp-verification — context

## What this is

Presentational kit for the **live** vendor email-verification / OTP page, restyled to the
approved **"Segmented cells"** design (originally variant 3 of the now-deleted OTP preview
directory under `src/pages/`). This directory holds only
presentation — nothing here performs verification, resending or navigation.

## Who consumes it

`src/components/Verification.jsx` — the live vendor page. It imports:

```js
import { OtpCells } from './otp-verification/OtpCells';
import { OtpStatusBanner } from './otp-verification/OtpStatusBanner';
```

The page's own logic (`useState`, `useEffect`, handlers, `Auth.*` calls, `navigate`
calls, `sessionStorage` / `alert` behaviour) stays in `Verification.jsx` and is **not**
duplicated or moved here.

## Frozen public props

### `OtpCells({ id, value, onChange, disabled, label })`

| prop | type | notes |
| --- | --- | --- |
| `id` | `string` | applied to the real `<input>` and the `<label htmlFor>`. |
| `value` | `string` | rendered into the six inert cells (`value[i] || ''`). |
| `onChange` | `(event) => void` | forwarded verbatim to the real input — the caller owns all parsing. |
| `disabled` | `boolean` | disables the real input. |
| `label` | `string` | visible label text. |

Renders one real, visually-hidden `<input>` (carrying `id`, `value`, `onChange`,
`inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={6}`,
`placeholder="000000"`, `disabled`) with six `aria-hidden` `<span>` cells over it.
The first empty cell gets `border-ink` to hint focus.

### `OtpStatusBanner({ tone, children })`

| prop | type | notes |
| --- | --- | --- |
| `tone` | `'success' \| 'danger'` | `success` → `role="status"`; `danger` → `role="alert"`. |
| `children` | `ReactNode` | the message text. |

Icons come from `lucide-react` (`CheckCircle2` / `AlertCircle`).

## The "no logic here" boundary

- No `useState`, no `useEffect`, no data fetching, no `Auth.*`, no `navigate`.
- The **only** behaviour in this directory is the focus affordance in `OtpCells`:
  the row wrapper is `onClick={() => inputRef.current?.focus()}` because the real
  input is invisible. This is focus, not business logic.

## Tokens used (read from the app, not invented)

Palette `canvas`, `surface`, `line`, `ink`, `dim`, `cta`, `cta-foreground`, `success`,
`danger` (`tailwind.config.js:19-40`). Teal `brand` is nav-only — not used.
Type `font-display`, `font-mono`, `text-mono-xs`. Motion `ease-signal`, `duration-180`,
plus `.auth-rise` / `.brand-press` from `src/main.css`.
