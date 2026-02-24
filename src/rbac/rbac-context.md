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
- `localStorage.getItem('authToken')` — Bearer token fallback for dual-auth

## Backend Endpoints
| Endpoint | Phase | Status | Used By |
|----------|-------|--------|---------|
| `GET /api/rbac/me` | 1 | ✅ Live | RBACContext |
| `GET /api/rbac/members` | 2 | ❌ Stub | MemberList |
| `POST /api/rbac/members/invite` | 2 | ❌ Stub | InviteMemberModal |
| `PATCH /api/rbac/members/:id/role` | 2 | ❌ Stub | MemberList |
| `DELETE /api/rbac/members/:id` | 2 | ❌ Stub | MemberList |
| `GET /api/rbac/roles` | 2 | ❌ Stub | InviteMemberModal |
| `GET /api/rbac/invitations` | 2 | ❌ Stub | TeamPage |

## Routes
- `/VendorDashboard/team` → TeamPage (nested under VendorDashboard layout)

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
