# RBAC Module — Vendor Frontend

## Purpose
Self-contained RBAC (Role-Based Access Control) module for the Vendor Frontend.
All RBAC-related code lives in this directory for **microservice portability** —
the entire `src/rbac/` directory can be extracted into a standalone package.

## Directory Structure
```
src/rbac/
├── api/
│   └── rbacApi.js              # API service layer (fetch wrapper + Phase 2 stubs)
├── components/
│   ├── PermissionGate.jsx      # Declarative permission gating (<PermissionGate module="x" action="y">)
│   ├── PermissionMatrix.jsx    # Visual grid of user's permissions across all modules
│   ├── RoleBadge.jsx           # Color-coded role pill component
│   ├── MemberList.jsx          # Team member table (Phase 2 ready)
│   └── InviteMemberModal.jsx   # Invite form modal (Phase 2 ready)
├── constants/
│   └── modules.js              # Module display config (labels, icons, nav paths)
├── context/
│   └── RBACContext.jsx         # React context provider + useRBAC hook
├── hooks/
│   └── usePermission.js        # Permission check hook (can, canAny, canAll)
├── pages/
│   └── TeamPage.jsx            # /VendorDashboard/team — team management page
├── index.js                    # Barrel export
└── rbac-context.md             # This file
```

## External Dependencies
- `../../context/VendorContext` — RBACContext waits for VendorContext hydration
- `../../config/env` — API base URL (VENDOR_BACKEND_URL)
- `../../utils/authFetch` — Drop-in `fetch` wrapper with 401 retry + silent Cognito refresh (since 05-03-2026)
- `localStorage.getItem('authToken')` — Bearer token fallback for dual-auth

## Auth Resilience (authFetch — since 05-03-2026)
- All authenticated fetch calls in `rbacApi.js` and `RBACContext.jsx` use `authFetch` instead of raw `fetch`
- On 401: `Auth.currentSession()` refreshes JWT via Cognito refresh token → `POST /api/auth/session` re-establishes cookie → original request retried
- Singleton promise dedup prevents concurrent refresh storms

## Backend Endpoints
| Endpoint | Phase | Status | Used By |
|----------|-------|--------|---------|
| `GET /api/rbac/me` | 1 | ✅ Live | RBACContext |
| `GET /api/rbac/members` | 2 | ✅ Live | TeamPage (MemberList) |
| `POST /api/rbac/members/invite` | 2 | ✅ Live | InviteMemberModal |
| `PATCH /api/rbac/members/:id/role` | 2 | ✅ Live | TeamPage (role change) |
| `DELETE /api/rbac/members/:id` | 2 | ✅ Live | TeamPage (remove member) |
| `GET /api/rbac/roles` | 2 | ✅ Live | InviteMemberModal, TeamPage |
| `GET /api/rbac/invitations` | 2 | ✅ Live | TeamPage (invitations tab) |
| `DELETE /api/rbac/invitations/:inviteId` | 2 | ✅ Live | TeamPage (cancel invite) |
| `GET /api/rbac/invite/validate?token=` | 2.5C | ✅ Live | InviteAcceptPage |
| `POST /api/rbac/invite/accept` | 2.5C | ✅ Live | InviteAcceptPage |

## Routes
- `/VendorDashboard/team` → TeamPage (nested under VendorDashboard layout)
- `/invite/accept` → InviteAcceptPage (public, no auth required)

## Team Member Login Flow (Frontend Side)
- `Login.jsx` → after `/api/auth/verify`, checks `isTeamMember` — if true, skips role-selection
- `Login.jsx` no longer performs its own `/api/vendor/me` fetch. It now uses `VendorContext.hydrateCurrentUser()` as the single source of truth for user bootstrap.
- `Login.jsx` → `routeVendor({ isTeamMember: true })` (via shared `getVendorDestination`) navigates directly to `/VendorDashboard`
- `App.jsx` → `VendorGuard` early-returns for `currentUser.isTeamMember === true` (bypasses onboarding checks)
- `App.jsx` → `RoleGuard` performs one guarded `hydrateCurrentUser()` retry before redirecting to `/login`, and shows a short loading state while resolving auth. This prevents brief dashboard/login/dashboard flicker caused by transient auth state during navigation.
- `App.jsx` → `RoleGuard` now also defers fallback `/login` redirect briefly (cleanup-safe timeout) after retry; this avoids loading → login → dashboard/client flash when auth state resolves slightly late.
- `App.jsx` → `RoleGuard` was refactored to a non-reentrant guard flow using refs for retry/timer control, preventing effect re-entry races while preserving existing route behavior.
- `Login.jsx` + `VendorContext.jsx` + `RoleGuard` now coordinate with a transient session flag (`vendorAuthTransitionInProgress`) so fallback login redirects are suppressed while post-login hydration is still in-flight.
- `/login` now runs behind `LoginRouteGate` in `App.jsx`, so active transition/hydration shows a neutral loading screen instead of rendering the login form for a frame.
- Auth transition screens now use a shared skeleton component (`components/loading/AuthSkeletonScreen.jsx`) for consistent UX across handoff, login gate, and role-guard loading states.
- Header cross-app switches (`Client`, `Sales`, `Tender`) now also use the same `AuthSkeletonScreen` overlay while redirect handoff is in progress.
- `AccessDeniedGuard` uses the same skeleton while RBAC access is resolving, preventing spinner-style visual mismatch before deny/allow is known.
- `App.jsx` + `Login.jsx` + `VendorGuard` now share `src/utils/vendorAuthRouting.js` for consistent destination logic (`/VendorDashboard`, `/Auditorapprove`, `/Form1`).
- `VendorContext.jsx` → reads `isTeamMember` from `/me` response, propagates to all consumers
- `RBACContext.jsx` → waits for VendorContext hydration, passes `vendorId` hint to `/api/rbac/me`
- For full details, see `Documents/RBAC/Team_Member_Login_Flow.md`.

## Nav Gating
Header nav items are wrapped with `<PermissionGate>`:
| Nav Item | Module | Action |
|----------|--------|--------|
| Dashboard | `dashboard` | `view` |
| Projects | `projects` | `view` |
| Leads | `leads` | `view` |
| Workspace | `workspace` | `view` |
| Team | `user_management` | `view` |

## Phase 1 Behavior
- All legacy users are backfilled as Super Admin with `*:*` permission
- If `/api/rbac/me` fails, falls back to Super Admin (isFallback=true)
- All nav items visible to all users (gating infrastructure in place for Phase 2)
- TeamPage shows current user's role info + permission matrix
- Team member management UI is placeholder (coming Phase 2)

## Phase 2 Will Add
- Backend member management endpoints
- InviteMemberModal connected to real API
- MemberList populated from listMembers endpoint
- Role change and member removal actions
- Invitation list with acceptance flow
