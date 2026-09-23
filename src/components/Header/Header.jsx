import React, { useState, useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
// Import NavLink, useLocation, and useNavigate
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import DateYearFunction from "./DateYearFunction";
import { VendorContext } from "../../context/VendorContext";
import { NotificationContext } from "../../context/NotificationContext";
import { PermissionGate } from "../../rbac";
import { LockedNavItem } from "../../rbac/components/LockedNavItem";
import { useRBAC } from '../../rbac/context/RBACContext';
import config from '../../config/env';
import { redirectToClientWithHandoff } from '../../utils/handoffToClient';
import { redirectToSalesWithHandoff } from '../../utils/handoffToSales';
import GlobalSearchOverlay from "./GlobalSearchOverlay";
import AiPromptPanel from "./AiPromptPanel";
import AuthSkeletonScreen from "../loading/AuthSkeletonScreen";
import operonLogo from "../../assets/operon-symbol-black.png";
import { ThemeToggle } from "../ui/theme-toggle";
/**
 * Header
 *
 * Renders the main application header with navigation, notifications, and a
 * vendor/client toggle. When switching to client mode on desktop, performs a
 * cross-app redirect to the client dashboard, passing authToken and email.
 * Also fetches vendor data once after role selection to populate context.
 */
export const Header = () => {
  // Log config values on component mount
  console.log('Header: config object:', config);
  console.log('Header: CLIENT_URL:', config.CLIENT_URL);
  console.log('Header: SALES_URL:', config.SALES_URL);
  console.log('Header: VENDOR_BACKEND_URL:', config.VENDOR_BACKEND_URL);
  
  const [isVendor, setIsVendor] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [redirectingTo, setRedirectingTo] = useState(null); // 'Graviyx' | 'Sales' | 'Tender' | null
  const notificationDropdownRef = useRef(null);

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Cmd+K / Ctrl+K → toggle AI prompt panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAiPromptOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  
  // Get current location
  const location = useLocation();
  const navigate = useNavigate();
  // Check if we are on the dashboard route
  const isOnDashboard = location.pathname === "/VendorDashboard";
  
  // Get user data from context
  const { currentUser, vendorData, setUser, setVendorData, logout } = useContext(VendorContext);
  
  // Get notification data from context
  const { unreadCount, notifications, refreshNotifications, markAsRead } = useContext(NotificationContext);

  // Get RBAC platform access — determines which switch buttons to show
  const { platformAccess } = useRBAC();
  const canAccessClient = Array.isArray(platformAccess) && platformAccess.includes('client');
  const canAccessSales = Array.isArray(platformAccess) && platformAccess.includes('sales');
  
  // Get only pending leads that need approval
  const pendingNotifications = notifications?.filter(notification => 
    notification && notification.isPending && !notification.isRead
  ) || [];
  
  // Handle clicks outside notification dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationDropdownRef]);
  
  // Extract email and role from URL parameters (legacy). Do not trust these for identity.
  const urlParams = new URLSearchParams(location.search);
  const emailFromUrl = urlParams.get('email');
  const roleFromUrl = urlParams.get('role');

  // Legacy cleanup: strip query params but never set identity from them.
  useEffect(() => {
    if (emailFromUrl || roleFromUrl) {
      navigate(location.pathname, { replace: true });
    }
  }, [emailFromUrl, roleFromUrl, navigate, location.pathname]);
  
  // Only log on first render, not on every update
  React.useEffect(() => {
    console.log("Header - Current User:", currentUser);
    console.log("Header - Vendor Data:", vendorData);
  }, []);
  
  // Refresh notifications when user changes
  useEffect(() => {
    if (currentUser?.email && refreshNotifications) {
      try {
        refreshNotifications();
      } catch (err) {
        console.error("Header: Error refreshing notifications:", err);
      }
    }
  }, [currentUser]);
  
  // Toggle notification dropdown
  const toggleNotificationDropdown = () => {
    setShowNotificationDropdown(!showNotificationDropdown);
    
    // Close mobile menu if open
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };
  
  // Effect to fetch vendor data once after role is selected, avoids loops
  const vendorFetchOnceRef = useRef(false);
  useEffect(() => {
    const fetchVendorInfo = async () => {
      // Avoid duplicate fetch loops
      if (vendorFetchOnceRef.current) {
        return;
      }
      try {
        console.log("Header: Fetching vendor data (secure /me)");
        const token = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const meResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: 'include',
          headers,
        });
        if (!meResponse.ok) {
          throw new Error(`Server responded with status: ${meResponse.status}`);
        }
        const meData = await meResponse.json();
        console.log("Header: /me response:", meData);
        if (meData.success && meData.data) {
          const vendorDetail = meData.data;
          const vendorId = vendorDetail.vendorId || vendorDetail.id;
          if (vendorDetail) {
            const vd = vendorDetail.vendorDetails || {};

            setVendorData({
              vendorId: vendorId,
              vendorDetails: vd,
              companyDetails: vendorDetail.companyDetails || {},
              serviceProductDetails: vendorDetail.serviceProductDetails || {},
              bankDetails: vendorDetail.bankDetails || {},
              complianceCertifications: vendorDetail.complianceCertifications || {},
              additionalDetails: vendorDetail.additionalDetails || {},
              profileImage: vendorDetail.profileImage || null,
            });

            // Derive a human-friendly display name from vendorDetails instead of using primaryContactName ID
            const fullName = [vd.firstName, vd.lastName].filter(Boolean).join(" ").trim();
            const displayName =
              fullName ||
              vd.vendorName ||
              vd.companyName ||
              currentUser?.name ||
              currentUser?.email;

            if (currentUser && (!currentUser.name || currentUser.name === vd.primaryContactName)) {
              setUser({
                ...currentUser,
                vendorId: vendorId,
                name: displayName
              });
            }
            vendorFetchOnceRef.current = true;
          } else {
            console.log("Header: No vendor details found in response");
          }
        } else {
          console.log("Header: No vendor found for current user");
        }
      } catch (error) {
        console.error('Header: Error fetching vendor info:', error);
      }
    };
    if (currentUser && currentUser.email) {
      fetchVendorInfo();
    }
  }, [currentUser, isOnDashboard, setVendorData, setUser]);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  // NavLink classes — underline tabs; active = ink text + hairline underline
  const getNavLinkClass = ({ isActive }) =>
    `relative px-3 py-2 text-sm transition-colors duration-150 ${isActive ? 'text-ink font-medium after:absolute after:inset-x-2 after:-bottom-[13px] after:h-[2px] after:bg-ink' : 'text-dim hover:text-ink'}`;

  // Mobile NavLink classes — same token logic, larger tap area
  const getMobileNavLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 transition-colors duration-150 ${isActive ? 'bg-surface-hover text-ink font-medium' : 'text-dim hover:bg-surface-hover hover:text-ink'}`;
  
  // Helper function to get appropriate greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Render notification dropdown
  const renderNotificationDropdown = () => {
    return (
      <div 
        ref={notificationDropdownRef}
        className="absolute right-0 mt-2 w-80 bg-surface rounded-lg shadow-pop border border-line z-50"
      >
        <div className="px-4 border-b border-line">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none bg-danger/10 text-danger rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto pt-0">
          {notifications.length > 0 ? (
            <ul className="divide-y divide-line">
              {[...notifications.filter(n => !n.isRead), ...notifications.filter(n => n.isRead)]
                .slice(0, 5)
                .map((notification) => {
                  const itemContent = (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[11px] ${notification.iconBackgroundClass || (notification.isPending ? 'bg-danger/10' : 'bg-info/10')} ${notification.iconTextClass || (notification.isPending ? 'text-danger' : 'text-info')}`}>
                          {notification.iconSymbol || 'N'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-medium ${notification.isPending ? 'text-danger' : 'text-ink'}`}>
                            {notification.title}
                          </p>
                          {notification.badge && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: notification.badge.color, color: notification.badge.textColor }}
                            >
                              {notification.badge.text}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-dim truncate">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center text-xs text-dim">
                            {notification.time}
                          </span>
                          {notification.primaryActionLabel && notification.link && (
                            <span className="inline-flex items-center rounded bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                              {notification.primaryActionLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  const handleOpen = () => {
                    if (!notification.isRead && markAsRead) {
                      markAsRead(notification.id);
                    }
                    setShowNotificationDropdown(false);
                  };

                  return (
                    <li key={notification.id} className={`p-4 hover:bg-surface-hover ${notification.isPending ? 'bg-danger/5' : ''}`}>
                      {notification.link ? (
                        <Link to={notification.link} onClick={handleOpen} className="block">
                          {itemContent}
                        </Link>
                      ) : (
                        <button type="button" onClick={handleOpen} className="block w-full text-left">
                          {itemContent}
                        </button>
                      )}
                    </li>
                  );
                })}
            </ul>
          ) : (
            <div className="py-6 text-center text-dim">
              <p>No notifications</p>
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="px-4 py-3 bg-surface-hover text-right border-t border-line">
            <Link
              to="/VendorDashboard/notifications"
              onClick={() => setShowNotificationDropdown(false)}
              className="text-brand hover:opacity-80 text-xs font-medium"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>
    );
  };
  
  // Replace your existing notification button with this one
  const notificationButton = (
    <div className="relative" ref={notificationDropdownRef}>
      <button 
        onClick={toggleNotificationDropdown}
        aria-label="Notifications" 
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white ring-1 ring-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Notification Dropdown */}
      {showNotificationDropdown && renderNotificationDropdown()}
    </div>
  );

  // Global search state (Phase 1)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({
    projects: [],
    leads: [],
    workspaces: [],
    commands: [],
  });

  const commandDefinitions = [
    {
      id: "go-dashboard",
      label: "Go to Dashboard",
      description: "Open your main vendor dashboard",
      keywords: "dashboard home main",
    },
    {
      id: "view-projects",
      label: "View Projects list",
      description: "See all your projects",
      keywords: "projects project list",
    },
    {
      id: "view-leads",
      label: "View Leads",
      description: "See all your PM-sent project requests",
      keywords: "leads requests rfq",
    },
    {
      id: "view-workspaces",
      label: "View Workspaces",
      description: "List all collaborative workspaces you can access",
      keywords: "workspace workspaces canvas board",
    },
    {
      id: "open-portfolio",
      label: "Open Portfolio",
      description: "Manage your products & services",
      keywords: "portfolio products services catalog",
    },
    {
      id: "open-profile",
      label: "Open Profile & Company details",
      description: "View and edit your public vendor profile",
      keywords: "profile company details vendor info",
    },
    {
      id: "start-kyc",
      label: "Start / Update KYC",
      description: "Go to vendor onboarding forms",
      keywords: "kyc onboarding verification forms form1",
    },
  ];

  const filterCommands = (q) => {
    const lc = q.trim().toLowerCase();
    if (!lc) return commandDefinitions;

    return commandDefinitions.filter((cmd) => {
      const fields = [cmd.label, cmd.description, cmd.keywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(lc);
    });
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    // Show all commands by default for quick access
    setSearchResults((prev) => ({
      ...prev,
      commands: commandDefinitions,
    }));
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults({ projects: [], leads: [], workspaces: [], commands: [] });
    setSearchLoading(false);
  };

  const handleSearchQueryChange = (value) => {
    setSearchQuery(value);
    // Update commands live as the user types (no API required)
    const cmds = filterCommands(value);
    setSearchResults((prev) => ({
      ...prev,
      commands: cmds,
    }));
  };

  const performGlobalSearch = async (query) => {
    const q = query.trim();
    if (q.length < 2) return;

    if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
      alert("You need to be logged in as a vendor to use search.");
      return;
    }

    const vendorId = currentUser.vendorId || currentUser.id;

    try {
      setSearchLoading(true);

      const [projectsRes, leadsRes] = await Promise.all([
        fetch(`${config.VENDOR_BACKEND_URL}/api/projects/vendor/${vendorId}`),
        fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorId }),
        }),
      ]);

      let projects = [];
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        if (Array.isArray(projectsData)) {
          projects = projectsData;
        }
      }

      let leads = [];
      let workspaces = [];
      if (leadsRes.ok) {
        const leadsPayload = await leadsRes.json();
        if (leadsPayload.success && Array.isArray(leadsPayload.leads)) {
          const pmLeads = leadsPayload.leads.filter((lead) => lead.pmId);
          leads = pmLeads;
          workspaces = pmLeads.filter(
            (lead) => lead.pmDecision?.approved && lead.pmDecision?.workspaceAccess
          );
        }
      }

      const lc = q.toLowerCase();

      const filteredProjects = projects.filter((p) => {
        const fields = [
          p.name,
          p.id,
          p.clientId,
          p.status,
          p.projectName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fields.includes(lc);
      });

      const filteredLeads = leads.filter((lead) => {
        const fields = [
          lead.leadTitle,
          lead.projectName,
          lead.leadId,
          lead.projectId,
          lead.specialization,
          lead.priority,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fields.includes(lc);
      });

      const filteredWorkspaces = workspaces.filter((lead) => {
        const fields = [
          lead.leadTitle,
          lead.projectName,
          lead.leadId,
          lead.projectId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fields.includes(lc);
      });

      const filteredCommands = filterCommands(q);

      setSearchResults({
        projects: filteredProjects,
        leads: filteredLeads,
        workspaces: filteredWorkspaces,
        commands: filteredCommands,
      });
    } catch (err) {
      console.error("Header: Error performing global search:", err);
      alert("Failed to search. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchResultClick = async (type, item) => {
    setIsSearchOpen(false);

    try {
      if (type === "project") {
        navigate("/VendorDashboard/projects", {
          state: { focusProjectId: item.id },
        });
      } else if (type === "lead") {
        navigate(`/leads/${item.leadId}`, {
          state: { projectData: item },
        });
      } else if (type === "workspace") {
        if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
          alert("You must be logged in to access a workspace.");
          return;
        }
        const vendorId = currentUser.vendorId || currentUser.id;

        const response = await fetch(
          `${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              projectId: item.projectId,
              pmId: item.pmId,
              vendorId,
              leadId: item.leadId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Workspace access failed (${response.status})`);
        }

        const workspaceData = await response.json();

        navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
          state: {
            leadId: item.leadId,
            leadDetails: {
              _id: item.leadId,
              name: item.leadTitle || item.projectName,
              clientId: item.projectId,
              description: item.leadDescription,
              status: "approved",
            },
            workspaceId: workspaceData.workspace.workspaceId,
            isCollaborative: true,
            pmId: item.pmId,
            vendorId,
          },
        });
      } else if (type === "command") {
        switch (item.id) {
          case "go-dashboard":
            navigate("/VendorDashboard");
            break;
          case "view-projects":
            navigate("/VendorDashboard/projects");
            break;
          case "view-leads":
            navigate("/VendorDashboard/leads");
            break;
          case "view-workspaces":
            navigate("/VendorDashboard/workspace");
            break;
          case "open-portfolio":
            navigate("/userproduct");
            break;
          case "open-profile":
            navigate("/userproduct");
            break;
          case "start-kyc":
            navigate("/Form1");
            break;
          default:
            break;
        }
      }
    } catch (err) {
      console.error("Header: Error handling search result click:", err);
      alert(err.message || "Failed to open selected item.");
    }
  };

  return (
    <header className="relative flex flex-col rounded-lg border border-line bg-surface">
      {/* --- Mobile / Tablet Top Section — single compact row --- */}
      <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
        <NavLink to="/VendorDashboard" className="flex-shrink-0" aria-label="Homepage">
          <img src={operonLogo} alt="Operon" className="h-7 w-auto" />
        </NavLink>

        <button
          type="button"
          onClick={handleOpenSearch}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-[13px] text-dim"
          aria-label="Open search"
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="truncate">Search</span>
        </button>

        <button
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-line text-dim transition hover:bg-surface-hover hover:text-ink"
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          )}
        </button>
      </div>

      {/* --- Desktop Top Section — single 56px row --- */}
      <div className="relative hidden h-14 items-center gap-5 px-4 lg:flex">

        {/* Logo */}
        <NavLink to="/VendorDashboard" className="flex-shrink-0" aria-label="Homepage">
          <img src={operonLogo} alt="Operon" className="h-7 w-auto" />
        </NavLink>

        {/* Desktop Navigation — underline tabs */}
        <nav className="flex h-full items-center gap-0.5 self-stretch text-sm font-sans" aria-label="Primary">
          <PermissionGate module="dashboard" action="view" lockedFallback={<LockedNavItem label="Dashboard" className="px-3 py-2 text-dim" />}>
            <NavLink to="/VendorDashboard" className={getNavLinkClass} end>Dashboard</NavLink>
          </PermissionGate>
          <PermissionGate module="projects" action="view" lockedFallback={<LockedNavItem label="Projects" className="px-3 py-2 text-dim" />}>
            <NavLink to="/VendorDashboard/projects" className={getNavLinkClass}>Projects</NavLink>
          </PermissionGate>
          <PermissionGate module="leads" action="view" lockedFallback={<LockedNavItem label="Leads" className="px-3 py-2 text-dim" />}>
            <NavLink to="/VendorDashboard/leads" className={getNavLinkClass}>Leads</NavLink>
          </PermissionGate>
          <PermissionGate module="workspace" action="view" lockedFallback={<LockedNavItem label="Workspace" className="px-3 py-2 text-dim" />}>
            <button 
              onClick={() => navigate('/VendorDashboard/workspace')}
              className="px-3 py-2 text-sm text-dim transition-colors duration-150 hover:text-ink"
            >
              Workspace
            </button>
          </PermissionGate>
          <PermissionGate module="user_management" action="view" lockedFallback={<LockedNavItem label="Team" className="px-3 py-2 text-dim" />}>
            <NavLink to="/VendorDashboard/team" className={getNavLinkClass}>Team</NavLink>
          </PermissionGate>
          <NavLink to="/VendorDashboard/finance-detail" className={getNavLinkClass}>Revenue</NavLink>
        </nav>
        {/* --- Desktop --- Right Controls --- */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {/* Search trigger — ⌘K */}
          <button
            type="button"
            onClick={handleOpenSearch}
            className="flex h-8 w-52 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-[13px] text-dim transition-colors hover:text-ink"
            aria-label="Open search"
          >
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="truncate">Search…</span>
            <kbd className="ml-auto rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium leading-none text-dim">⌘K</kbd>
          </button>
          {/* Icons Container — uniform 32px ghost buttons */}
          <div className="flex items-center">
             {notificationButton}
             <button aria-label="Messages" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
               </svg>
             </button>
             <button 
               onClick={() => {
                 // Do not rely on localStorage-stored identity
                 const hasAuthToken = Boolean(localStorage.getItem('authToken'));
                 if (currentUser || hasAuthToken) {
                   console.log("Header: User found, navigating to profile");
                   navigate('/userproduct');
                 } else {
                   console.log("Header: No authenticated user found");
                   navigate('/login');
                 }
               }}
               aria-label="Profile" 
               className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink"
             > 
               {vendorData?.profileImage?.url ? (
                 <img
                   src={vendorData.profileImage.url}
                   alt="Profile"
                   className="h-6 w-6 rounded-full object-cover ring-1 ring-line"
                 />
               ) : (
                 <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper ring-1 ring-line">
                   {(currentUser?.name || currentUser?.email || 'V').charAt(0).toUpperCase()}
                 </div>
               )}
             </button>
             {/* Theme switcher - flips .dark on <html>, all tokens invert at once */}
             <ThemeToggle className="h-8 w-8 rounded-md" />
             <button 
               onClick={() => navigate('/settings')}
               className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink"
               aria-label="Settings"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
             </button>
             <button 
               onClick={() => {
                 console.log("Logout button clicked");
                 // Clear all data
                 logout();
                 // Clear any session storage
                 sessionStorage.clear();
                 // Clear any remaining localStorage items
                 localStorage.clear();
                 // Force a complete page reload to clear any state
                 window.location.href = "/login";
               }} 
               className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink"
               aria-label="Logout"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
               </svg>
             </button>
          </div>
          {/* Desktop Toggle — slim monochrome switch */}
          {canAccessClient && (
          <div
             className="relative h-[22px] w-[62px] cursor-pointer rounded-full bg-surface-hover ring-1 ring-line"
             onClick={async () => {
               const next = !isVendor;
               setIsVendor(next);
               if (!next) {
                 // Switching to Client: redirect to client app
                 const clientBase = config.CLIENT_URL;
                 console.log('Header Toggle: CLIENT_URL value:', clientBase);
                 console.log('Header Toggle: Type of CLIENT_URL:', typeof clientBase);
                 
                 if (!clientBase) {
                   console.error('CLIENT_URL is not configured');
                   alert('Client dashboard URL is not configured. Please contact support.');
                   setIsVendor(true); // Revert toggle
                   return;
                 }
                 
                 // Clear any stale client-specific data from localStorage
                 // to ensure fresh client status check based on email only
                 try {
                   localStorage.removeItem('clientId');
                   sessionStorage.removeItem('bootRouted');
                 } catch (e) {
                   console.warn('Header Toggle: Error clearing client localStorage:', e);
                 }
                 
                 try {
                   await redirectToClientWithHandoff();
                 } catch (e) {
                   console.error('Header Toggle: handoff redirect failed:', e);
                   alert('Unable to switch to client right now. Please try again.');
                   setIsVendor(true); // revert toggle, stay in vendor app
                 }
               }
             }}
             role="button" aria-label="Toggle Vendor/Client mode" tabIndex={0}
           >
             <span className={`absolute top-1/2 -translate-y-1/2 text-[9px] font-medium text-dim ${isVendor ? 'right-2' : 'left-2'}`}>
               {isVendor ? 'Client' : 'Vendor'}
             </span>
             <div
               className={`absolute top-1/2 flex h-[16px] w-[26px] -translate-y-1/2 items-center justify-center rounded-full bg-ink transition-all duration-200 ${isVendor ? 'left-1' : 'left-[33px]'}`}
             >
               <span className="text-[7px] font-semibold text-paper">{isVendor ? 'V' : 'C'}</span>
             </div>
          </div>
          )}
        </div>
        </div>

      {/* Mobile Menu Dropdown (Appears below header when toggled) */}
      {/* Positioned relative to the main header */}
      {isMobileMenuOpen && (
        <div className="absolute right-4 top-[56px] z-50 w-[min(18rem,calc(100%-2rem))] rounded-lg border border-line bg-surface shadow-pop lg:hidden">
          <nav className="flex flex-col space-y-2 p-4 text-base font-medium font-sans text-ink">
            <PermissionGate module="dashboard" action="view">
              <NavLink to="/VendorDashboard" className={getMobileNavLinkClass} onClick={closeMobileMenu} end>Dashboard</NavLink>
            </PermissionGate>
            <PermissionGate module="projects" action="view">
              <NavLink to="/VendorDashboard/projects" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Projects</NavLink>
            </PermissionGate>
            <PermissionGate module="leads" action="view">
              <NavLink to="/VendorDashboard/leads" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Leads</NavLink>
            </PermissionGate>
            <PermissionGate module="notifications" action="view">
              <NavLink to="/VendorDashboard/notifications" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Notifications</NavLink>
            </PermissionGate>
            <PermissionGate module="workspace" action="view">
              <NavLink to="/VendorDashboard/workspace" className={getMobileNavLinkClass} onClick={closeMobileMenu}>
                Workspace
              </NavLink>
            </PermissionGate>
            <PermissionGate module="user_management" action="view">
              <NavLink to="/VendorDashboard/team" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Team</NavLink>
            </PermissionGate>
            <NavLink to="/VendorDashboard/finance-detail" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Revenue</NavLink>
          </nav>

          <div className="mb-4 mt-2 flex items-center justify-between px-4">
            {canAccessClient && (
              <div
                className="relative h-[22px] w-[62px] cursor-pointer rounded-full bg-surface-hover ring-1 ring-line"
                onClick={() => setIsVendor(!isVendor)}
                role="button" aria-label="Toggle Vendor/Client mode" tabIndex={0}
              >
                <span className={`absolute top-1/2 -translate-y-1/2 text-[9px] font-medium text-dim ${isVendor ? 'right-2' : 'left-2'}`}>
                  {isVendor ? 'Client' : 'Vendor'}
                </span>
                <div className={`absolute top-1/2 flex h-[16px] w-[26px] -translate-y-1/2 items-center justify-center rounded-full bg-ink transition-all duration-200 ${isVendor ? 'left-1' : 'left-[33px]'}`}>
                  <span className="text-[7px] font-semibold text-paper">{isVendor ? 'V' : 'C'}</span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 sm:space-x-3">
              {notificationButton}
              <button aria-label="Messages" className="p-1 text-dim hover:text-ink hover:bg-surface-hover rounded-full transition-colors duration-150">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (currentUser) {
                    console.log("Header Mobile: User found, navigating to profile");
                    navigate('/userproduct');
                  } else {
                    console.log("Header Mobile: No authenticated user found");
                    navigate('/login');
                  }
                }}
                aria-label="Profile"
                className="p-1 text-dim hover:text-ink hover:bg-surface-hover rounded-full transition-colors duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {/* Theme switcher (mobile menu) */}
              <ThemeToggle className="h-8 w-8 rounded-full" />
              <button
                onClick={() => {
                  console.log("Mobile logout button clicked");
                  logout();
                  sessionStorage.clear();
                  localStorage.clear();
                  window.location.href = "/login";
                }}
                className="p-1 text-dim hover:text-ink hover:bg-surface-hover rounded-full transition-colors duration-150"
                aria-label="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Bottom Section (Conditional Rendering for Dashboard) --- */}
      {/* Only render this div if isOnDashboard is true */}
      {isOnDashboard && (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Greeting */}
          <div className="min-w-0 text-ink">
            <h2 className="text-sm font-medium leading-tight font-sans tracking-tight lg:text-base">
              {getGreeting()},{" "}
              {vendorData?.vendorDetails?.firstName || vendorData?.vendorDetails?.lastName || vendorData?.vendorDetails?.vendorId ||
                vendorData?.vendorDetails?.id ||
                currentUser?.vendorId ||
                "Vendor"}
            </h2>
          </div>
          {/* Bottom Right Buttons */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start xl:justify-end">
            {/* Date Section */}
            <div className="w-fit max-w-full shrink-0 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-dim">
              <DateYearFunction />
            </div>
            {/* Wrapper for B2B and Prompt buttons */}
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              {/* Redirect loading overlay */}
              {redirectingTo && (
                <div className="fixed inset-0 z-[9999]">
                  <AuthSkeletonScreen message={`Opening ${redirectingTo}...`} />
                </div>
              )}
              <button
                className="flex h-9 w-full max-w-full items-center justify-center whitespace-nowrap rounded-md border border-line bg-surface px-3 text-[13px] font-medium font-sans text-ink transition-colors duration-150 hover:bg-surface-hover sm:w-auto"
                onClick={async () => {
                  let idToken = '';
                  try {
                    const session = await Auth.currentSession();
                    idToken = session.getIdToken().getJwtToken();
                  } catch {
                    idToken = localStorage.getItem('authToken') || '';
                  }

                  if (!idToken) {
                    alert('You need to be logged in to access Graviyx.');
                    navigate('/login');
                    return;
                  }

                  const b2bMarketplaceUrl = config.B2B_MARKETPLACE_URL;
                  if (!b2bMarketplaceUrl) {
                    alert('B2B marketplace URL is not configured. Please contact support.');
                    return;
                  }

                  setRedirectingTo('Graviyx');
                  window.location.href = `${b2bMarketplaceUrl}/?token=${encodeURIComponent(idToken)}`;
                }}
              >
                Graviyx <svg className="ml-2 w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </button>
              {/* B2B button — only if user has sales platform access */}
              {canAccessSales && (
              <button
                className="flex h-9 w-full max-w-full items-center justify-center whitespace-nowrap rounded-md border border-line bg-surface px-3 text-[13px] font-medium font-sans text-ink transition-colors duration-150 hover:bg-surface-hover sm:w-auto"
                onClick={async () => {
                  if (!config.SALES_URL) {
                    console.error('SALES_URL is not configured');
                    alert('B2B Sales dashboard URL is not configured. Please contact support.');
                    return;
                  }

                  setRedirectingTo('Sales');
                  try {
                    await redirectToSalesWithHandoff();
                  } catch (e) {
                    setRedirectingTo(null);
                    console.error('B2B handoff redirect failed:', e);
                    // Show specific error if 403 (access denied), otherwise generic
                    const is403 = e?.message?.includes('403');
                    alert(is403
                      ? 'You do not have access to the B2B Sales module. Please contact your administrator.'
                      : 'Unable to open B2B Sales dashboard right now. Please try again.');
                  }
                }}
              >
                Sales <svg className="ml-2 w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </button>
              )}
              {/* Tender button — only if user has sales platform access */}
              {canAccessSales && (
              <button
                className="flex h-9 w-full max-w-full items-center justify-center whitespace-nowrap rounded-md border border-line bg-surface px-3 text-[13px] font-medium font-sans text-ink transition-colors duration-150 hover:bg-surface-hover sm:w-auto"
                onClick={async () => {
                  if (!config.SALES_URL) {
                    console.error('SALES_URL is not configured');
                    alert('Tender URL is not configured. Please contact support.');
                    return;
                  }

                  setRedirectingTo('Tender');
                  try {
                    await redirectToSalesWithHandoff('/tender');
                  } catch (e) {
                    setRedirectingTo(null);
                    console.error('Tender handoff redirect failed:', e);
                    const is403 = e?.message?.includes('403');
                    alert(is403
                      ? 'You do not have access to the Tender module. Please contact your administrator.'
                      : 'Unable to open Tender dashboard right now. Please try again.');
                  }
                }}
              >
                Tender <svg className="ml-2 w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
              )}
              <button
                className="flex h-9 w-full max-w-full items-center justify-center whitespace-nowrap rounded-md border border-line bg-surface px-3 text-[13px] font-medium font-sans text-ink transition-colors duration-150 hover:bg-surface-hover sm:w-auto"
                onClick={() => setIsAiPromptOpen(true)}
              >
                Prompt <img src="https://c.animaapp.com/VmmSqCQF/img/vector.svg" alt="Prompt" className="ml-2 w-3 h-3 lg:w-4 lg:h-4" />
              </button>
          </div>
          </div>
        </div>
      )}
      {/* AI Prompt Side Panel */}
      <AiPromptPanel isOpen={isAiPromptOpen} onClose={() => setIsAiPromptOpen(false)} />
      {/* Global Search Overlay */}
      <GlobalSearchOverlay
        isOpen={isSearchOpen}
        query={searchQuery}
        onQueryChange={handleSearchQueryChange}
        onSubmit={performGlobalSearch}
        onClose={handleCloseSearch}
        loading={searchLoading}
        results={searchResults}
        onResultClick={handleSearchResultClick}
      />
      </header>
    );
  };
