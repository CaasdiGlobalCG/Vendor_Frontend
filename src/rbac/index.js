// ============================================================
// FILE: rbac/index.js
// PURPOSE: Barrel export — single entry point for the entire RBAC module.
//          Importing from 'src/rbac' gives access to ALL RBAC exports.
//          Designed for microservice portability — move this directory
//          to extract RBAC as a standalone package.
// CONNECTS TO: Every file in this directory
// ============================================================

// ── Context & Provider ──
export { RBACProvider, RBACContext, useRBAC } from './context/RBACContext';

// ── Hooks ──
export { usePermission } from './hooks/usePermission';

// ── Components ──
export { PermissionGate, PermissionText } from './components/PermissionGate';
export { RoleBadge } from './components/RoleBadge';
export { PermissionMatrix } from './components/PermissionMatrix';
export { MemberList } from './components/MemberList';
export { InviteMemberModal } from './components/InviteMemberModal';

// ── API Service ──
export * as rbacApi from './api/rbacApi';

// ── Constants ──
export { VENDOR_MODULE_CONFIG, NAV_ITEMS, ACTION_LABELS } from './constants/modules';
