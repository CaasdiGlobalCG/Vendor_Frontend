import React, { useState, useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
// Import NavLink, useLocation, and useNavigate
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import DateYearFunction from "./DateYearFunction";
import { VendorContext } from "../../context/VendorContext";
import { NotificationContext } from "../../context/NotificationContext";
import config from '../../config/env';
import { redirectToClientWithHandoff } from '../../utils/handoffToClient';
import { redirectToSalesWithHandoff } from '../../utils/handoffToSales';
import GlobalSearchOverlay from "./GlobalSearchOverlay";
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
  const notificationDropdownRef = useRef(null);
  
  // Get current location
  const location = useLocation();
  const navigate = useNavigate();
  // Check if we are on the dashboard route
  const isOnDashboard = location.pathname === "/VendorDashboard";
  
  // Get user data from context
  const { currentUser, vendorData, setUser, setVendorData, logout } = useContext(VendorContext);
  
  // Get notification data from context
  const { unreadCount, notifications, refreshNotifications } = useContext(NotificationContext);
  
  // Get only pending leads that need approval
  const pendingNotifications = notifications?.filter(notification => 
    notification.isPending && !notification.isRead
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
              additionalDetails: vendorDetail.additionalDetails || {}
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
  
  // Helper function for NavLink classes
  const getNavLinkClass = ({ isActive }) => {
    return `hover:text-emerald-200 transition-colors ${isActive ? 'opacity-100 font-semibold' : 'opacity-50'}`;
  };
  
  // Helper function for Mobile NavLink classes
  const getMobileNavLinkClass = ({ isActive }) => {
    return `hover:opacity-75 ${isActive ? 'opacity-100 font-semibold' : 'opacity-50'}`;
  };
  
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
        className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
      >
        <div className="px-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none bg-red-100 text-red-800 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto pt-0">
          {notifications.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {[...notifications.filter(n => !n.isRead), ...notifications.filter(n => n.isRead)]
                .slice(0, 5)
                .map((notification) => (
                <li key={notification.id} className={`p-4 hover:bg-gray-50 ${notification.isPending ? 'bg-red-50' : ''}`}>
                  <Link
                    to={notification.link}
                    onClick={() => setShowNotificationDropdown(false)}
                    className="block"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 ${notification.isPending ? 'bg-red-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${notification.isPending ? 'text-red-600' : 'text-blue-600'}`}>
                            {notification.isPending ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${notification.isPending ? 'text-red-800' : 'text-gray-800'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {notification.message}
                        </p>
                        <div className="mt-1 flex">
                          <span className="inline-flex items-center text-xs text-gray-500">
                            {notification.time}
                          </span>
                          {notification.isPending && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Action Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center text-gray-500">
              <p>No notifications</p>
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 text-right border-t border-gray-200">
            <Link
              to="/VendorDashboard/notifications"
              onClick={() => setShowNotificationDropdown(false)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-medium"
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
        className="relative p-1 text-white hover:bg-white/20 rounded-full"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black ring-2 ring-gray-900">
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
    // Conditional Height: Apply min-h-[150px] only on dashboard, else min-h-[80px]
    // lg:h-[291px] remains dashboard-only, lg:h-auto for others.
    <header className={`[background:linear-gradient(90deg,rgba(9,91,73,1)_0%,rgba(0,0,0,1)_100%)] rounded-[20px] p-4 lg:p-[18px] shadow-2xl relative flex flex-col justify-between ${isOnDashboard ? 'min-h-[150px] lg:h-[291px]' : 'min-h-[80px] lg:h-auto'}`}>
      {/* --- Top Section --- */}
      {/* Removed flex-wrap from here, handling mobile layout differently */}
      <div className="relative flex justify-between items-start gap-4"> {/* Changed items-center to items-start for mobile alignment */}

        {/* Logo (Stays Top-Left) */}
        <NavLink to="/VendorDashboard" className="text-white text-2xl lg:text-[32px] font-bold font-['Montserrat'] flex-shrink-0" aria-label="Homepage">
          CG
        </NavLink>

        {/* --- Mobile --- Search & Hamburger Container --- */}
        {/* This container holds search and hamburger, appears only on mobile */}
        <div className="flex-grow flex flex-col items-center gap-3 lg:hidden px-2"> {/* Added px-2 for spacing */}
           {/* Hamburger Button (Moved to top-right of this container) */}
           {/* Using absolute positioning relative to the overall top section div */}
           <button
              className="absolute top-0 right-0 text-white hover:bg-white/20 p-1 rounded z-20" // Added z-20
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
            {isMobileMenuOpen ? (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            )}
           </button>

           {/* Search Bar (Centers below logo/button row because of flex-col and items-center on parent) */}
           {/* Takes full width of its container, max-w-xs keeps it from getting too wide */}
           <div className="relative w-full max-w-xs mt-8"> {/* Added margin-top to push it down slightly */}
            <input
              type="text"
              placeholder="Search here"
              className="w-full h-9 bg-white bg-opacity-10 rounded-xl py-[7px] px-2.5 text-sm text-white placeholder-white placeholder-opacity-50 border-none focus:ring-1 focus:ring-white/50"
              aria-label="Search"
            />
            <img
              src="https://c.animaapp.com/VmmSqCQF/img/tabler-search.svg"
              alt="Search"
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50"
            />
          </div>
        </div>


        {/* Desktop Navigation (Hidden on Mobile) */}
        <nav className="hidden lg:flex space-x-[30px] text-white text-base font-normal font-['Poppins'] flex-shrink-0"> {/* Added flex-shrink-0 */}
          <NavLink to="/VendorDashboard" className={getNavLinkClass} end>Dashboard</NavLink>
          <NavLink to="/VendorDashboard/projects" className={getNavLinkClass}>Projects</NavLink>
          <NavLink to="/VendorDashboard/leads" className={getNavLinkClass}>Leads</NavLink>
          <button 
            onClick={() => navigate('/VendorDashboard/workspace')}
            className="hover:text-emerald-200 transition-colors opacity-50 hover:opacity-100"
          >
            Workspace
          </button>
          {/* <NavLink to="/pricing" className={getNavLinkClass}>Pricing</NavLink> */}
        </nav>


        {/* Mobile Menu Dropdown (Appears below header when toggled) */}
        {/* Positioned relative to the main header */}
        {isMobileMenuOpen && (
          // Adjusted top to account for potentially shorter header, using mt-2 relative to header top section
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 mx-4 bg-gray-900 bg-opacity-95 rounded-lg shadow-lg lg:hidden z-50"> {/* Increased z-index */}
             {/* Navigation Links */}
            <nav className="flex flex-col space-y-4 p-4 text-white text-base font-medium font-['Poppins']">
              <NavLink to="/VendorDashboard" className={getMobileNavLinkClass} onClick={closeMobileMenu} end>Dashboard</NavLink>
              <NavLink to="VendorDashboard/projects" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Projects</NavLink>
              <NavLink to="VendorDashboard/leads" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Leads</NavLink>
              <NavLink to="VendorDashboard/notifications" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Notifications</NavLink>
              <NavLink 
                to="VendorDashboard/workspace" 
                className={getMobileNavLinkClass} 
                onClick={closeMobileMenu}
              >
                Workspace
              </NavLink>
              {/* If you had Pricing */}
              {/* <NavLink to="/pricing" className={getMobileNavLinkClass} onClick={closeMobileMenu}>Pricing</NavLink> */}
            </nav>

            {/* Mobile Controls Section (Vendor/Client Toggle, Icons) */}
            <div className="mt-2 mb-4 px-4 flex items-center justify-between">
              {/* Updated Mobile Toggle */}
              <div
                className={`w-[59px] h-[23px] rounded-[17px] cursor-pointer relative ${isVendor ? 'bg-gradient-to-r from-teal-400 to-[#423e3e]' : 'bg-gradient-to-r from-[#423e3e] to-[#efcf4e]'}`}
            onClick={() => setIsVendor(!isVendor)}
                role="button" aria-label="Toggle Vendor/Client mode" tabIndex={0}
          >
            {isVendor ? (
                  <span className="text-white text-[8px] font-medium absolute right-[5%] top-1/2 -translate-y-1/2">Vendor</span>
                ) : (
                  <span className="text-white text-[8px] font-medium absolute left-[10%] top-1/2 -translate-y-1/2">Client</span>
                )}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-[30%] h-[19px] bg-white rounded-full transition-all duration-200 ease-in-out ${ isVendor ? 'left-[5%]' : 'left-[65%]' }`} />
              </div>

              {/* Icons */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {notificationButton}
                 <button aria-label="Messages" className="p-1 text-white hover:bg-white/20 rounded-full">
                   <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                   </svg>
                 </button>
                 <button 
                   onClick={() => {
                     // Do not rely on localStorage-stored identity
                     if (currentUser) {
                       console.log("Header Mobile: User found, navigating to profile");
                       navigate('/userproduct');
                     } else {
                       console.log("Header Mobile: No authenticated user found");
                       navigate('/login');
                     }
                   }}
                   aria-label="Profile" 
                   className="p-1 text-white hover:bg-white/20 rounded-full"
                 > 
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                 </button>
                 <button 
                   onClick={() => {
                     console.log("Mobile logout button clicked");
                     // Clear all data
                     logout();
                     // Clear any session storage
                     sessionStorage.clear();
                     // Clear any remaining localStorage items
                     localStorage.clear();
                     // Force a complete page reload to clear any state
                     window.location.href = "/login";
                   }} 
                   className="p-1 text-white hover:bg-white/20 rounded-full"
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

        {/* --- Desktop --- Right Controls (Hidden on Mobile) --- */}
        <div className="hidden lg:flex items-center justify-end gap-2 sm:gap-4 flex-shrink-0"> {/* Added flex-shrink-0 */}
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search here"
              className="w-[254px] h-9 bg-white bg-opacity-10 rounded-xl py-[7px] px-2.5 text-sm text-white placeholder-white placeholder-opacity-50 border-none focus:ring-1 focus:ring-white/50 cursor-pointer"
              aria-label="Search"
              readOnly
              onClick={handleOpenSearch}
            />
            <button
              type="button"
              onClick={handleOpenSearch}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50"
              aria-label="Open search"
            >
              <img
                src="https://c.animaapp.com/VmmSqCQF/img/tabler-search.svg"
                alt="Search"
                className="w-4 h-4 pointer-events-none"
              />
            </button>
          </div>
          {/* Icons Container */}
          <div className="flex items-center space-x-1 sm:space-x-2">
             {notificationButton}
             <button aria-label="Messages" className="p-1 text-white hover:bg-white/20 rounded-full">
               <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
               className="p-1 text-white hover:bg-white/20 rounded-full"
             > 
               <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
               className="p-1 text-white hover:bg-white/20 rounded-full"
               aria-label="Logout"
             >
               <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
               </svg>
             </button>
          </div>
          {/* Updated Desktop Toggle */}
          <div
             className={`w-[59px] h-[23px] rounded-[17px] cursor-pointer relative ${isVendor ? 'bg-gradient-to-r from-teal-400 to-[#423e3e]' : 'bg-gradient-to-r from-[#423e3e] to-[#efcf4e]'}`}
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
             {isVendor ? (
               <span className="text-white text-[8px] font-medium absolute right-[5%] top-1/2 -translate-y-1/2">Vendor</span>
             ) : (
               <span className="text-white text-[8px] font-medium absolute left-[10%] top-1/2 -translate-y-1/2">Client</span>
             )}
             <div
               className={`absolute top-1/2 -translate-y-1/2 w-[30%] h-[19px] bg-white rounded-full transition-all duration-200 ease-in-out ${ isVendor ? 'left-[5%]' : 'left-[65%]' }`} />
          </div>
        </div>
        </div>

      {/* --- Bottom Section (Conditional Rendering for Dashboard) --- */}
      {/* Only render this div if isOnDashboard is true */}
      {isOnDashboard && (
        // This section will only appear on the dashboard, contributing to its larger height
        <div className="mt-auto pt-4 flex flex-col lg:flex-row flex-wrap justify-between items-start lg:items-end gap-4">
          {/* Greeting */}
          <div className="text-white">
            <h2 className="text-xl lg:text-[20px] font-medium font-['Montserrat']">
              {getGreeting()},{" "}
              {vendorData?.vendorDetails?.firstName || vendorData?.vendorDetails?.lastName || vendorData?.vendorDetails?.vendorId ||
                vendorData?.vendorDetails?.id ||
                currentUser?.vendorId ||
                "Vendor"}{" "}
              😎
            </h2>
          </div>
          {/* Bottom Right Buttons */}
          <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 lg:gap-4">
            {/* Date Section */}
            <div className="mr-4"><DateYearFunction /></div>
            {/* Wrapper for B2B and Prompt buttons */}
            <div className="flex items-center gap-2 lg:gap-4">
              <button
                className="w-auto px-3 h-[36px] bg-white bg-opacity-5 hover:bg-opacity-10 rounded-[9px] flex items-center justify-center text-white text-xs lg:text-sm font-semibold font-['Montserrat']"
                onClick={async () => {
                  let idToken = '';
                  try {
                    const session = await Auth.currentSession();
                    idToken = session.getIdToken().getJwtToken();
                  } catch {
                    idToken = localStorage.getItem('authToken') || '';
                  }

                  if (!idToken) {
                    alert('You need to be logged in to access GravityX.');
                    navigate('/login');
                    return;
                  }

                  const b2bMarketplaceUrl = config.B2B_MARKETPLACE_URL;
                  if (!b2bMarketplaceUrl) {
                    alert('B2B marketplace URL is not configured. Please contact support.');
                    return;
                  }

                  window.location.href = `${b2bMarketplaceUrl}/?token=${encodeURIComponent(idToken)}`;
                }}
              >
                GravityX <img src="https://c.animaapp.com/VmmSqCQF/img/guidance-shop.svg" alt="Shop" className="ml-2 w-4 h-4 lg:w-6 lg:h-6" />
              </button>
              <button
                className="w-auto px-3 h-[36px] bg-white bg-opacity-5 hover:bg-opacity-10 rounded-[9px] flex items-center justify-center text-white text-xs lg:text-sm font-semibold font-['Montserrat']"
                onClick={async () => {
                  if (!config.SALES_URL) {
                    console.error('SALES_URL is not configured');
                    alert('B2B Sales dashboard URL is not configured. Please contact support.');
                    return;
                  }

                  try {
                    await redirectToSalesWithHandoff();
                  } catch (e) {
                    console.error('B2B handoff redirect failed:', e);
                    alert('Unable to open B2B Sales dashboard right now. Please try again.');
                    navigate('/login');
                  }
                }}
              >
                B2B <img src="https://c.animaapp.com/VmmSqCQF/img/guidance-shop.svg" alt="Shop" className="ml-2 w-4 h-4 lg:w-6 lg:h-6" />
              </button>
              <button
                className="w-auto px-3 h-[36px] bg-white bg-opacity-5 hover:bg-opacity-10 rounded-[9px] flex items-center justify-center text-white text-xs lg:text-sm font-semibold font-['Montserrat']"
                onClick={async () => {
                  if (!config.SALES_URL) {
                    console.error('SALES_URL is not configured');
                    alert('Tender URL is not configured. Please contact support.');
                    return;
                  }

                  try {
                    await redirectToSalesWithHandoff('/tender');
                  } catch (e) {
                    console.error('Tender handoff redirect failed:', e);
                    alert('Unable to open Tender dashboard right now. Please try again.');
                    navigate('/login');
                  }
                }}
              >
                Tender <img src="https://c.animaapp.com/VmmSqCQF/img/guidance-shop.svg" alt="Tender" className="ml-2 w-4 h-4 lg:w-6 lg:h-6" />
              </button>
              <button className="w-auto px-3 h-[36px] bg-white bg-opacity-5 hover:bg-opacity-10 rounded-[9px] flex items-center justify-center text-white text-xs lg:text-sm font-semibold font-['Montserrat']"> Prompt <img src="https://c.animaapp.com/VmmSqCQF/img/vector.svg" alt="Prompt" className="ml-2 w-3 h-3 lg:w-4 lg:h-4" /> </button>
          </div>
          </div>
        </div>
      )}
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