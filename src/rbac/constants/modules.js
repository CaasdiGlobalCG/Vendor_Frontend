// ============================================================
// FILE: rbac/constants/modules.js
// PURPOSE: Module display config for the vendor UI. Mirrors backend
//          VENDOR_MODULES but adds UI-specific metadata (icons, nav paths).
//          Modules are grouped by category for PermissionMatrix display.
// CONNECTS TO: Backend modules.js (same module codes),
//              Header nav gating, PermissionMatrix, TeamPage
// ============================================================

// ──────────────────────────────────────
// MODULE CATEGORIES — PermissionMatrix groups rows by these
// ──────────────────────────────────────

export const MODULE_CATEGORIES = {
  core: {
    label: 'Core Modules',
    description: 'Core vendor platform features',
    order: 1,
  },
  sales: {
    label: 'Sales Modules',
    description: 'Sales pipeline & CRM features',
    order: 2,
  },
  system: {
    label: 'System & Admin',
    description: 'Platform settings and team management',
    order: 3,
  },
};

// ──────────────────────────────────────
// MODULE CONFIG — each module has a category
// ──────────────────────────────────────

export const VENDOR_MODULE_CONFIG = {
  // ── Core Modules ──
  dashboard:       { label: 'Dashboard',         icon: 'LayoutDashboard', navPath: '/VendorDashboard',          navOrder: 1, category: 'core' },
  projects:        { label: 'Projects & Access', icon: 'FolderKanban',    navPath: '/VendorDashboard/projects', navOrder: 2, category: 'core' },
  leads:           { label: 'Leads',             icon: 'Users',           navPath: '/VendorDashboard/leads',    navOrder: 3, category: 'core' },
  workspace:       { label: 'Workspace & Access', icon: 'Briefcase',       navPath: '/VendorDashboard/workspace', navOrder: 4, category: 'core' },
  products:        { label: 'Products',          icon: 'Package',         category: 'core' },
  inventory:       { label: 'Inventory',         icon: 'Warehouse',       category: 'core' },
  purchase_orders: { label: 'Purchase Orders',   icon: 'ClipboardList',   category: 'core' },

  // ── Sales Modules ──
  enquiry:         { label: 'Enquiry / RFQ',     icon: 'FileQuestion',    category: 'sales' },
  quotations:      { label: 'Quotations',        icon: 'FileText',        category: 'sales' },
  orders:          { label: 'Orders / Sales',    icon: 'ShoppingCart',    category: 'sales' },
  crm:             { label: 'CRM',               icon: 'Contact',         category: 'sales' },
  shipments:       { label: 'Shipments',         icon: 'Truck',           category: 'sales' },
  warranty:        { label: 'Warranty',           icon: 'Shield',          category: 'sales' },

  // ── System & Admin ──
  notifications:   { label: 'Notifications',     icon: 'Bell',            category: 'system' },
  settings:        { label: 'Settings',          icon: 'Settings',        category: 'system' },
  user_management: { label: 'Team',              icon: 'UserCog',        navPath: '/VendorDashboard/team', navOrder: 5, category: 'system' },
  activity_log:    { label: 'Activity Log',      icon: 'ScrollText',      category: 'system' },
};

/**
 * Nav items for the main header — auto-generated from module config.
 * Only includes modules with a navPath defined.
 * Sorted by navOrder for consistent display.
 */
export const NAV_ITEMS = Object.entries(VENDOR_MODULE_CONFIG)
  .filter(([, cfg]) => cfg.navPath)
  .sort((a, b) => (a[1].navOrder || 999) - (b[1].navOrder || 999))
  .map(([moduleCode, cfg]) => ({
    moduleCode,
    label: cfg.label,
    path: cfg.navPath,
    icon: cfg.icon,
  }));

/**
 * Human-readable action labels for the permission matrix UI.
 * Order matters — displayed left-to-right in the grid.
 */
export const ACTION_LABELS = {
  view:   'View',
  create: 'Create',
  edit:   'Edit',
  delete: 'Delete',
  export: 'Export',
  manage: 'Full Access',
};

/**
 * Returns modules grouped by category, sorted by category order.
 * Each entry: { categoryKey, category, modules: [{ code, config }] }
 */
export function getModulesByCategory(moduleConfig = VENDOR_MODULE_CONFIG) {
  const groups = {};

  for (const [code, config] of Object.entries(moduleConfig)) {
    const cat = config.category || 'core';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ code, config });
  }

  return Object.entries(MODULE_CATEGORIES)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([categoryKey, category]) => ({
      categoryKey,
      category,
      modules: groups[categoryKey] || [],
    }))
    .filter(g => g.modules.length > 0);
}
