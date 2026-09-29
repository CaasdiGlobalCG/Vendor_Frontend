// ============================================================
// FILE: index.js
// PURPOSE: Barrel export — import the vendor header or any of its primitives from
//          one path.
// CONNECTS TO: all files in src/components/vendor-header/.
//
// Usage: import { VendorHeader } from '@/components/vendor-header';
//        (or a relative path depending on the page location)
//
// NOTE: this directory is deliberately named `vendor-header`, not `header`. A
// `src/components/header/` would collide with the existing `src/components/Header/`
// on case-insensitive filesystems (Windows/macOS), silently merging the two, and
// then fail to resolve on a case-sensitive Linux build.
// ============================================================

export { default as VendorHeader } from './VendorHeader';
export * from './header.constants';
export { HeaderShell, BrandMark, NavTabs, NavList, ModuleTabs, GstinStrip, NotificationPanel } from './chrome';
export { IconButton, SearchTrigger, NotificationButton, ProfileButton, UtilityCluster, PlatformSwitch } from './controls';
export { CrossAppButtons } from './CrossAppButtons';
export { SearchOverlay } from './SearchOverlay';
