// ============================================================
// FILE: VendorHeader.jsx
// PURPOSE: The single combined vendor header — primary nav, global search,
//          notifications, cross-app destinations, platform switch, GSTIN strip and
//          module tabs. Replaces components/Header/Header.jsx and
//          components/AppHeader/Appheader.jsx, which it supersedes.
// CONNECTS TO: ./chrome, ./controls, ./CrossAppButtons, ./SearchOverlay (the header kit),
//              ./useVendorHeaderData, ./useHeaderSearch, ./useCrossAppNavigation (logic),
//              context/VendorContext, context/NotificationContext, rbac, ../Header/AiPromptPanel.
//
// All behaviour is carried over verbatim from Header.jsx via the hooks; this file is
// presentation plus the small effects that were inline there.
// ============================================================

import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Menu, X } from 'lucide-react';
import { VendorContext } from '../../context/VendorContext';
import { NotificationContext } from '../../context/NotificationContext';
import { useRBAC } from '../../rbac';
import { ThemeToggle } from '../ui';
import AiPromptPanel from '../Header/AiPromptPanel';
import AuthSkeletonScreen from '../loading/AuthSkeletonScreen';
import {
  BrandMark,
  GstinStrip,
  HeaderShell,
  ModuleTabs,
  NavList,
  NavTabs,
  NotificationPanel,
} from './chrome';
import {
  IconButton,
  NotificationButton,
  PlatformSwitch,
  ProfileButton,
  SearchTrigger,
  UtilityCluster,
} from './controls';
import { CrossAppButtons } from './CrossAppButtons';
import { SearchOverlay } from './SearchOverlay';
import { COPY, formatLongDate, formatWeekday } from './header.constants';
import { useVendorHeaderData } from './useVendorHeaderData';
import { useHeaderSearch } from './useHeaderSearch';
import { useCrossAppNavigation } from './useCrossAppNavigation';

export function VendorHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we are on the dashboard route
  const isOnDashboard = location.pathname === '/VendorDashboard';

  const { logout } = useContext(VendorContext);
  const { unreadCount, notifications, refreshNotifications, markAsRead } = useContext(NotificationContext);
  const { platformAccess } = useRBAC();
  const canAccessClient = Array.isArray(platformAccess) && platformAccess.includes('client');
  const canAccessSales = Array.isArray(platformAccess) && platformAccess.includes('sales');

  const { currentUser, vendorData, displayName } = useVendorHeaderData(isOnDashboard);
  const search = useHeaderSearch();
  const crossApp = useCrossAppNavigation();

  const [isVendor, setIsVendor] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const notificationDropdownRef = useRef(null);

  // ── Global keyboard shortcut: Cmd/Ctrl+K toggles the AI prompt panel ──
  // Preserved exactly from Header.jsx:43-53. NOTE: the search trigger's "⌘K" hint
  // is therefore misleading — see the defect log.
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAiPromptOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ── Legacy cleanup: strip query params but never set identity from them ──
  const urlParams = new URLSearchParams(location.search);
  const emailFromUrl = urlParams.get('email');
  const roleFromUrl = urlParams.get('role');
  useEffect(() => {
    if (emailFromUrl || roleFromUrl) {
      navigate(location.pathname, { replace: true });
    }
  }, [emailFromUrl, roleFromUrl, navigate, location.pathname]);

  // ── Refresh notifications when user changes ──
  // refreshNotifications is intentionally NOT a dependency: it is recreated on
  // every NotificationProvider render, so depending on it re-fires this effect
  // on each render → fetch → setNotifications(new array) → render → infinite loop.
  useEffect(() => {
    if (currentUser?.email && refreshNotifications) {
      try {
        refreshNotifications();
      } catch (err) {
        console.error('Header: Error refreshing notifications:', err);
      }
    }
  }, [currentUser]);

  // ── Handle clicks outside notification dropdown ──
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleProfileClick = () => {
    // Do not rely on localStorage-stored identity
    const hasAuthToken = Boolean(localStorage.getItem('authToken'));
    if (currentUser || hasAuthToken) {
      navigate('/portfolio?tab=company');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleSwitchPlatform = () => {
    if (!canAccessClient) return;
    crossApp.switchToClient(setIsVendor);
  };

  return (
    <HeaderShell>
      {/* ── Mobile / tablet row ── */}
      <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
        <BrandMark />
        <SearchTrigger size="icon" onClick={search.handleOpenSearch} className="ml-auto" />
        <IconButton
          label={isMobileMenuOpen ? COPY.menuClose : COPY.menuOpen}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </IconButton>
      </div>

      {/* ── Desktop row ── */}
      <div className="relative hidden h-14 items-center gap-5 px-4 lg:flex">
        <BrandMark />
        <NavTabs />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SearchTrigger onClick={search.handleOpenSearch} />

          {/* Cross-app destinations — dashboard-index only, as before. */}
          <CrossAppButtons
            show={isOnDashboard}
            canAccessSales={canAccessSales}
            treatment="compact"
            iconOnly
            onGraviyx={crossApp.openGraviyx}
            onSales={crossApp.openSales}
            onTender={crossApp.openTender}
            onPrompt={() => setIsAiPromptOpen(true)}
          />

          <div className="relative flex items-center" ref={notificationDropdownRef}>
            <NotificationButton
              count={unreadCount}
              isOpen={showNotificationDropdown}
              onClick={() => setShowNotificationDropdown((prev) => !prev)}
            />
            {showNotificationDropdown && (
              <NotificationPanel
                notifications={notifications || []}
                unreadCount={unreadCount}
                onClose={() => setShowNotificationDropdown(false)}
                onItemOpen={(notification) => {
                  if (!notification.isRead && markAsRead) markAsRead(notification.id);
                }}
              />
            )}
          </div>

          <UtilityCluster onNavigate={navigate} onLogout={handleLogout} />

          <ProfileButton name={displayName} avatarUrl={vendorData?.profileImage?.url} onClick={handleProfileClick} />

          <ThemeToggle className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {isMobileMenuOpen && (
        <div className="border-t border-line px-4 py-3 lg:hidden">
          <NavList onSelect={closeMobileMenu} />
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3">
            <ThemeToggle className="h-8 w-8 rounded-md" />
            <ProfileButton name={displayName} avatarUrl={vendorData?.profileImage?.url} onClick={handleProfileClick} />
          </div>
        </div>
      )}

      {/* ── Second line: day + date, GSTIN, role · platform switch + module tabs ── */}
      <div className="flex flex-col gap-2 border-t border-line px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {/* Day and date. Replaces DateYearFunction, which rendered white text inside a
              bg-canvas wrapper and was invisible in light mode. */}
          <p className="flex items-center gap-2 text-[11px] text-dim">
            <CalendarDays size={12} aria-hidden="true" />
            <span className="font-medium text-ink">{formatWeekday()}</span>
            <span className="h-3 w-px bg-line" aria-hidden="true" />
            <span className="tnum">{formatLongDate()}</span>
          </p>
          <GstinStrip gstin={vendorData?.companyDetails?.gstNumber || vendorData?.vendorDetails?.gstin || null} />
        </div>

        <div className="flex items-center gap-3">
          {canAccessClient && (
            <PlatformSwitch mode={isVendor ? 'vendor' : 'client'} onClick={handleSwitchPlatform} />
          )}
          <ModuleTabs onSelect={() => setIsMobileMenuOpen(false)} />
        </div>
      </div>

      {/* Redirect loading overlay — preserved from Header.jsx:961-965 */}
      {crossApp.redirectingTo && (
        <div className="fixed inset-0 z-[9999]">
          <AuthSkeletonScreen message={`Opening ${crossApp.redirectingTo}...`} />
        </div>
      )}

      {/* AI prompt panel — the real one, unchanged */}
      <AiPromptPanel isOpen={isAiPromptOpen} onClose={() => setIsAiPromptOpen(false)} />

      <SearchOverlay
        isOpen={search.isSearchOpen}
        query={search.searchQuery}
        onQueryChange={search.handleSearchQueryChange}
        onSubmit={search.performGlobalSearch}
        onClose={search.handleCloseSearch}
        loading={search.searchLoading}
        results={search.searchResults}
        onResultClick={search.handleSearchResultClick}
      />
    </HeaderShell>
  );
}

export default VendorHeader;
