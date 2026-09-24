# Vendor Dashboard Infinite Refresh Loop — Incident Write-up

## Symptom

A newly registered vendor, once approved by the auditor, gets stuck in an infinite
loop on **first login** to `/VendorDashboard` — the page alternates endlessly
between the dashboard and the black auth skeleton loader.

Meanwhile the Vite proxy log shows a continuous flood of requests:
`/api/vendor/me`, `/api/rbac/me`, `/api/vendor-leads`, `/api/finance/overview`,
`/api/notifications`, `/api/auth/session` — "continuously fetching user details" —
eventually producing `socket hang up` / `ECONNREFUSED` proxy errors from request
saturation.

## The Mistake

Three separate patterns combined into a feedback loop:

1. **Context writers spread `currentUser` unconditionally.** `Header.jsx` (and
   `VendorDashboard`, `UserProfileCard`) call `setUser({ ...currentUser, name })`
   after every `/api/vendor/me` fetch — creating a **brand-new object every
   time**, even when nothing actually changed.

2. **`RBACContext` depended on object identity, not values.** Its fetch effect
   used the whole `currentUser` object as a dependency, so any new object
   reference re-triggered `fetchRBAC()` → `isLoading: true`.

3. **`AccessDeniedGuard` unmounted the whole tree on every refetch.** It rendered
   the full-screen `AuthSkeletonScreen` whenever `isLoading` was true — including
   *refetches*, not just the initial load. Unmounting destroys every
   component-local "fetch once" guard (`vendorFetchOnceRef` in `Header`), so each
   remount started the whole fetch cycle again.

## Why only first-login-after-approval

`hydrateCurrentUser` resolves the user's `name` as
`v.name || v.firstName || v.primaryContactName`. A newly approved vendor has no
`firstName`/`name`, so `name` lands on `primaryContactName`. That makes
`Header`'s condition (`currentUser.name === vd.primaryContactName`) true **on
every mount**, so `setUser` fires every cycle. Established vendors have a real
name → condition false → no loop.

## The loop, step by step

```text
Header mounts → GET /api/vendor/me → setUser({...currentUser, name})
        │ (new object identity)
        ▼
RBACContext effect refires → fetchRBAC() → isLoading = true
        │
        ▼
AccessDeniedGuard renders AuthSkeletonScreen → dashboard UNMOUNTS
        │ (vendorFetchOnceRef destroyed)
        ▼
fetchRBAC completes → children REMOUNT → Header refetches /me
        │
        └──► setUser → new object → repeat forever ∞
```

## Files containing the bug

| File | Bug |
|---|---|
| `src/context/VendorContext.jsx` | `setUser` and `hydrateCurrentUser` always produced a new `currentUser` object, even when identical |
| `src/rbac/context/RBACContext.jsx` | Fetch effect depended on the whole `currentUser` object |
| `src/rbac/components/AccessDeniedScreen.jsx` | Skeleton shown on *every* `isLoading`, unmounting children on refetches |
| `src/components/Header/Header.jsx` | Trigger point — `setUser` with a spread object on every mount (left as-is; the fixes below neutralize it) |

## The fix — three independent guards

### 1. `VendorContext.jsx` — skip no-op user writes

**Before:**

```jsx
const setUser = (user) => {
  console.log("VendorContext: Setting new user:", user);
  if (currentUser && (!user || currentUser.email !== user.email)) {
    setVendorData(initialData);
  }
  setCurrentUser(user);          // ← always a new object reference
};
```

**After:**

```jsx
const setUser = (user) => {
  // No-op when the incoming user is shallow-equal — callers like Header spread
  // {...currentUser} on every fetch, and a new object identity re-fires the
  // RBAC fetch → skeleton → unmount → refetch loop.
  if (currentUser && user) {
    const keys = new Set([...Object.keys(currentUser), ...Object.keys(user)]);
    if ([...keys].every((k) => currentUser[k] === user[k])) return;
  }
  console.log("VendorContext: Setting new user:", user);
  if (currentUser && (!user || currentUser.email !== user.email)) {
    setVendorData(initialData);
  }
  setCurrentUser(user);
};
```

And in `hydrateCurrentUser`, the write became a functional update that preserves
the reference when the hydrated user is identical (functional form because
`hydrateCurrentUser` is a `useCallback` — a closure read of `currentUser` would
be stale):

**Before:** `setCurrentUser(hydratedUser);`

**After:**

```jsx
setCurrentUser((prev) => (isSameUser(prev, hydratedUser) ? prev : hydratedUser));
```

### 2. `RBACContext.jsx` — depend on identity primitives

**Before:**

```jsx
}, [currentUser, isHydratingUser, fetchRBAC]);
```

**After:**

```jsx
// Depend on identity primitives, not the whole currentUser object —
// callers spread {...currentUser} on every /me fetch, and an identity-only
// change re-fires this effect → isLoading → skeleton → unmount loop.
}, [currentUser?.vendorId, currentUser?.email, isHydratingUser, fetchRBAC]);
```

### 3. `AccessDeniedScreen.jsx` — skeleton only on first resolution

**Before:**

```jsx
if (isLoading) {
  return <AuthSkeletonScreen message="Checking your access permissions..." />;
}
```

**After:**

```jsx
const resolvedOnceRef = useRef(false);
if (!isLoading) resolvedOnceRef.current = true;

// Block rendering only until RBAC resolves the FIRST time — a refetch must not
// unmount children, or mounted pages refetch on every remount and any writer
// that produces a new currentUser object spins an infinite skeleton loop.
if (isLoading && !resolvedOnceRef.current) {
  return <AuthSkeletonScreen message="Checking your access permissions..." />;
}
```

## How it was rectified

Each guard independently breaks the cycle:

- **Guard 1** stops identity churn at the source — a spread-call with identical
  values no longer produces a state change at all.
- **Guard 2** makes RBAC immune to identity churn — even if a new `currentUser`
  object appears, the fetch only refires when `vendorId` or `email` actually
  changes.
- **Guard 3** eliminates the unmount — refetches update in the background while
  children stay mounted, so per-mount fetch guards keep working and nothing
  refetches `/me`.

## Takeaway

The classic React anti-pattern chain: **spread-writes creating fake state changes
→ effects keyed on object identity → a loading gate that unmounts children on
refetch → per-mount fetch guards destroyed on each cycle**. Any one of the three
guards prevents it; all three make it structurally impossible.
