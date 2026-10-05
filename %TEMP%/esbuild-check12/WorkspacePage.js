import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  AddTaskModal,
  AddSubtaskModal,
  WorkspaceHeader,
  WorkspaceSidebar,
  WorkspaceMain,
  WorkspaceRightSidebar,
  ElementsSidebar,
  ElementsPanel,
  LayoutsPanel,
  TextPanel,
  WorkspaceTopBar,
  WorkspaceDock,
  WorkspaceContextPanel,
  WorkspaceStatusBar,
  WorkspaceTutorialModal
} from "./components";
import "./components/WorkspaceShell.css";
import ShareProgressModal from "../../components/ShareProgressModal";
import { Sparkles, FileText, Calendar, CheckCircle, StickyNote, ClipboardCheck, PanelLeft, PanelRight, Maximize2, ZoomIn, Eye, Layout, HelpCircle, Keyboard } from "lucide-react";
import ManageBOQModal from "./components/ManageBOQModal";
import CustomBOQModal from "./components/CustomBOQModal";
import CommandPalette from "./components/CommandPalette";
import AICanvasBuilderModal from "./components/modals/AICanvasBuilderModal";
import KeyboardShortcutsOverlay from "./components/KeyboardShortcutsOverlay";
import { ToastProvider } from "./components/ToastProvider";
import { UploadProvider } from "./components/forms/UploadManager";
import { VendorContext } from "../../context/VendorContext";
import InvoiceToolReplica from "./components/InvoiceToolReplica";
import RoleBasedHeader from "./components/RoleBasedHeader";
import { PostServicesModal } from "./components/modals/PostServices";
import UpdateProgressModal from "./components/modals/UpdateProgressModal";
import ReviewProgressModal from "./components/modals/ReviewProgressModal";
import ProgressTimelineModal from "./components/modals/ProgressTimelineModal";
import ProgressSidebar from "./components/ProgressSidebar";
import DayReportModal from "./components/modals/DayReportModal";
import ProjectCompleteModal from "./components/modals/ProjectCompleteModal";
import PermissionsModal from "./components/PermissionsModal";
import InviteCASModal from "./components/InviteCASModal";
import InviteVendorsModal from "./components/InviteVendorsModal";
import CostCalculatorsModal from "./components/modals/CostCalculatorsModal";
import useWebSocketNotifications from "../../hooks/useWebSocketNotifications";
import useCanvasWebSocket from "../../hooks/useCanvasWebSocket";
import StartCallModal from "./components/modals/StartCallModal";
import IncomingCallNotification from "./components/modals/IncomingCallNotification";
import ActiveCallInterface from "./components/modals/ActiveCallInterface";
import ProcurementRFQModal from "./components/modals/ProcurementRFQModal";
import ExecutionRequestModal from "./components/modals/ExecutionRequestModal";
import WorkflowBuilderModal from "./components/modals/WorkflowBuilderModal";
import useVideoCall from "../../hooks/useVideoCall";
import config from "../../config/env";
import authFetch from "../../utils/authFetch";
import { notifyWorkspaceEvent, getWorkspaceById } from "./utils/workspaceApi";
import { findSubtaskContainingNode } from "./utils/nodePersistence";
const WorkspacePage = () => {
  const COMPACT_WORKSPACE_BREAKPOINT = 768;
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const location = useLocation();
  const vendorContextValue = useContext(VendorContext);
  const { currentUser, setUser } = vendorContextValue;
  const shareParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      isSharedVisit: params.get("shared") === "1",
      invite: params.get("invite"),
      sharedBy: params.get("sharedBy"),
      permission: params.get("permission") || "view"
    };
  }, []);
  const shareViewOnly = shareParams.isSharedVisit && shareParams.permission === "view";
  const shareCanEdit = shareParams.isSharedVisit && (shareParams.permission === "edit" || shareParams.permission === "anyone_edit");
  const shareJoinNotifiedRef = useRef(false);
  useEffect(() => {
    if (!shareParams.isSharedVisit || !shareParams.invite || !workspaceId)
      return;
    if (shareJoinNotifiedRef.current)
      return;
    const dedupeKey = `share_joined_${workspaceId}_${shareParams.invite}`;
    if (sessionStorage.getItem(dedupeKey))
      return;
    shareJoinNotifiedRef.current = true;
    (async () => {
      await notifyWorkspaceEvent({
        workspaceId,
        roles: ["pm"],
        type: "share_joined",
        title: "Shared link opened",
        message: `${shareParams.invite} opened the workspace via a shared link${shareParams.sharedBy ? ` from ${shareParams.sharedBy}` : ""}`,
        data: { invitee: shareParams.invite, permission: shareParams.permission },
        priority: "medium"
      });
      sessionStorage.setItem(dedupeKey, "1");
    })();
    const url = new URL(window.location.href);
    ["shared", "invite", "sharedBy", "permission"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
  }, [workspaceId, shareParams]);
  const urlParams = new URLSearchParams(location.search);
  const urlUserRole = urlParams.get("userRole");
  const urlPmId = urlParams.get("pmId");
  const urlUserId = urlParams.get("userId");
  const urlUserName = urlParams.get("userName");
  const urlUserEmail = urlParams.get("userEmail");
  const urlClientId = urlParams.get("clientId");
  const urlHandoff = urlParams.get("extHandoff");
  const urlReturnUrl = urlParams.get("returnUrl");
  const storedPmUser = sessionStorage.getItem("pmUser");
  let pmUserFromStorage = null;
  try {
    if (storedPmUser) {
      pmUserFromStorage = JSON.parse(storedPmUser);
    }
  } catch (e) {
    console.error("Error parsing stored user data:", e);
  }
  const isPM = urlUserRole === "pm" || urlPmId || pmUserFromStorage?.role === "pm" || pmUserFromStorage?.accessedFrom === "pm-dashboard" || currentUser?.role === "pm" || currentUser?.pmId || currentUser?.email?.includes("pm") || location.state?.userRole === "pm";
  const isCAS = urlUserRole === "cas" && Boolean(urlUserId);
  const casUser = isCAS ? {
    userId: urlUserId,
    name: urlUserName ? decodeURIComponent(urlUserName) : "CAS User",
    email: urlUserEmail ? decodeURIComponent(urlUserEmail) : "",
    role: "cas",
    accessedFrom: "trunky-dashboard"
  } : null;
  const urlClientUser = urlUserRole === "client" && urlClientId ? {
    id: urlClientId,
    userId: urlClientId,
    name: urlUserName ? decodeURIComponent(urlUserName) : "Client",
    email: urlUserEmail ? decodeURIComponent(urlUserEmail) : "",
    role: "client",
    accessedFrom: "client-dashboard"
  } : null;
  const userRole = urlUserRole || location.state?.userRole || (pmUserFromStorage?.role === "pm" ? "pm" : null) || (isCAS ? "cas" : null) || (isPM ? "pm" : "vendor");
  const getAuthToken = useCallback(() => localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "", []);
  const buildAuthHeaders = useCallback((baseHeaders = {}) => {
    const headers = { ...baseHeaders };
    const token = getAuthToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [getAuthToken]);
  const pmUserFromUrl = useMemo(() => {
    if (urlUserRole === "pm" && urlPmId) {
      return {
        id: urlPmId,
        pmId: urlPmId,
        name: "Project Manager",
        email: "pm@construction.com",
        role: "pm",
        accessedFrom: "pm-dashboard",
        timestamp: Date.now()
      };
    }
    return null;
  }, [urlUserRole, urlPmId]);
  useEffect(() => {
    if (pmUserFromStorage && !currentUser?.role) {
      setUser(pmUserFromStorage);
    } else if (pmUserFromUrl && !currentUser?.role) {
      setUser(pmUserFromUrl);
    } else if (casUser && !currentUser?.role) {
      setUser(casUser);
    } else if (urlClientUser && !currentUser?.role) {
      setUser(urlClientUser);
    }
  }, [pmUserFromStorage, pmUserFromUrl, casUser, urlClientUser, currentUser?.role, setUser]);
  const [externalAuthStatus, setExternalAuthStatus] = useState(
    urlHandoff ? "pending" : "idle"
  );
  const [externalAuthError, setExternalAuthError] = useState(null);
  useEffect(() => {
    if (!urlHandoff || externalAuthStatus !== "pending")
      return;
    const markerKey = `externalExchanged:${urlHandoff}`;
    const stripParam = () => {
      const params = new URLSearchParams(location.search);
      params.delete("extHandoff");
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
    };
    const applyResult = (data) => {
      if (data.authToken)
        localStorage.setItem("authToken", data.authToken);
      sessionStorage.setItem("externalAuthSession", "1");
      const u = data.user || {};
      const role = u.role === "cas" ? "cas" : "pm";
      setUser({
        id: u.userId,
        userId: u.userId,
        pmId: role === "pm" ? u.userId : void 0,
        name: u.name || (role === "pm" ? "Project Manager" : "CAS User"),
        email: u.email || "",
        role,
        external: true,
        accessedFrom: role === "pm" ? "pm-dashboard" : "trunky-dashboard",
        timestamp: Date.now()
      });
      stripParam();
      setExternalAuthStatus("done");
    };
    const adoptStoredResult = () => {
      const stored = sessionStorage.getItem(markerKey);
      if (stored && stored !== "pending") {
        try {
          applyResult(JSON.parse(stored));
        } catch {
        }
        return true;
      }
      return false;
    };
    (async () => {
      try {
        if (adoptStoredResult())
          return;
        if (sessionStorage.getItem(markerKey) === "pending") {
          for (let i = 0; i < 60; i++) {
            await new Promise((r) => setTimeout(r, 250));
            if (adoptStoredResult())
              return;
            if (sessionStorage.getItem(markerKey) !== "pending")
              break;
          }
          stripParam();
          setExternalAuthStatus("done");
          return;
        }
        sessionStorage.setItem(markerKey, "pending");
        try {
          const res = await fetch(
            `/api/auth/handoff/external-exchange?code=${encodeURIComponent(urlHandoff)}`,
            { credentials: "include" }
          );
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Exchange failed: ${res.status}`);
          }
          const data = await res.json();
          sessionStorage.setItem(markerKey, JSON.stringify({
            authToken: data.authToken,
            user: data.user
          }));
          applyResult(data);
        } catch (err) {
          if (adoptStoredResult())
            return;
          sessionStorage.removeItem(markerKey);
          throw err;
        }
      } catch (err) {
        console.error("[WorkspacePage] External handoff exchange failed:", err?.message || err);
        setExternalAuthStatus("failed");
        setExternalAuthError(err?.message || "Access link is invalid or expired");
      }
    })();
  }, [urlHandoff, externalAuthStatus, setUser, navigate, location.search, location.pathname]);
  const userId = currentUser?.id || currentUser?.userId || currentUser?.pmId || currentUser?.vendorId;
  const userType = currentUser?.role || "vendor";
  const {
    notifications,
    unreadCount,
    isConnected,
    markNotificationAsRead,
    markAllAsRead,
    fetchNotifications
  } = useWebSocketNotifications(userId, userType);
  const canvasWebSocket = useCanvasWebSocket(workspaceId, currentUser, {
    enabled: !!workspaceId && !!currentUser
  });
  if (!currentUser) {
    console.log("\u{1F50D} WORKSPACE PAGE - User role detection:", {
      currentUser,
      detectedRole: userRole,
      isPM,
      workspaceId
    });
  }
  const { leadId, leadDetails, workspaceId: stateWorkspaceId } = location.state || {};
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [canvasNodes, setCanvasNodes] = useState([]);
  const [detectedUserRole, setDetectedUserRole] = useState(userRole);
  const [detectedClientId, setDetectedClientId] = useState(null);
  const isClientUser = detectedUserRole === "client" || urlUserRole === "client" || Boolean(detectedClientId);
  const layoutKey = `ws-layout-${workspaceId}`;
  const savedLayout = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(layoutKey)) || {};
    } catch {
      return {};
    }
  }, [layoutKey]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < COMPACT_WORKSPACE_BREAKPOINT);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < COMPACT_WORKSPACE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [COMPACT_WORKSPACE_BREAKPOINT]);
  const [focusMode, setFocusMode] = useState(() => savedLayout.focusMode !== false);
  const [leftPanelPinned, setLeftPanelPinned] = useState(() => !!savedLayout.leftPinned);
  const [rightPanelPinned, setRightPanelPinned] = useState(() => !!savedLayout.rightPinned);
  const [leftPanelHover, setLeftPanelHover] = useState(false);
  const [rightPanelHover, setRightPanelHover] = useState(false);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  useEffect(() => {
    localStorage.setItem(layoutKey, JSON.stringify({
      focusMode,
      leftPinned: leftPanelPinned,
      rightPinned: rightPanelPinned
    }));
  }, [layoutKey, focusMode, leftPanelPinned, rightPanelPinned]);
  const [activeTab, setActiveTab] = useState("Task");
  const [zoomLevel, setZoomLevel] = useState(100);
  const handleZoomChange = useCallback((level) => {
    setZoomLevel(level);
  }, []);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [activityRefreshTrigger, setActivityRefreshTrigger] = useState(0);
  const [saveOpsInFlight, setSaveOpsInFlight] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const triggerActivityRefresh = useCallback(() => {
    console.log("\u{1F504} WorkspacePage: Triggering activity refresh");
    setActivityRefreshTrigger((prev) => prev + 1);
  }, []);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedSubtask, setSelectedSubtask] = useState(null);
  const needsTaskSelection = !selectedTask;
  const leftPanelVisible = isMobile ? mobileLeftOpen : needsTaskSelection || !focusMode || leftPanelPinned || leftPanelHover;
  const rightPanelVisible = isMobile ? mobileRightOpen : !focusMode || rightPanelPinned || rightPanelHover;
  const sidebarCollapsed = isMobile ? !mobileLeftOpen : !needsTaskSelection && focusMode && !leftPanelPinned && !leftPanelHover;
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [selectedLayerItem, setSelectedLayerItem] = useState(null);
  const [showElementsSidebar, setShowElementsSidebar] = useState(false);
  const [showElementsPanel, setShowElementsPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showLayoutsPanel, setShowLayoutsPanel] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showInvoiceTool, setShowInvoiceTool] = useState(false);
  const [selectedTextElement, setSelectedTextElement] = useState(null);
  const [showManageBOQModal, setShowManageBOQModal] = useState(false);
  const [showCustomBOQModal, setShowCustomBOQModal] = useState(false);
  const [showProcurementRFQModal, setShowProcurementRFQModal] = useState(false);
  const [showExecutionRequestModal, setShowExecutionRequestModal] = useState(false);
  const [showWorkflowBuilderModal, setShowWorkflowBuilderModal] = useState(false);
  const [executionTemplateType, setExecutionTemplateType] = useState("execution-work-order");
  const [showPostServicesModal, setShowPostServicesModal] = useState(false);
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  const [showReviewProgressModal, setShowReviewProgressModal] = useState(false);
  const [showProgressTimelineModal, setShowProgressTimelineModal] = useState(false);
  const [showProgressSidebar, setShowProgressSidebar] = useState(false);
  const [progressDay, setProgressDay] = useState(null);
  const [reportDay, setReportDay] = useState(null);
  const [liveCanvasNodes, setLiveCanvasNodes] = useState([]);
  const liveNodeIdsRef = useRef("");
  useEffect(() => {
    const handler = (e) => {
      const list = e.detail?.nodes || [];
      const ids = list.map((n) => n.id).sort().join(",");
      if (ids === liveNodeIdsRef.current)
        return;
      liveNodeIdsRef.current = ids;
      setLiveCanvasNodes(list);
    };
    document.addEventListener("canvasNodesChanged", handler);
    return () => document.removeEventListener("canvasNodesChanged", handler);
  }, []);
  useEffect(() => {
    const handler = () => setShowProgressSidebar((p) => {
      if (!p)
        refetchWorkspace?.();
      if (p)
        setProgressDay(null);
      return !p;
    });
    window.addEventListener("progress-sidebar-toggle", handler);
    return () => window.removeEventListener("progress-sidebar-toggle", handler);
  }, []);
  const workspaceForProgress = useMemo(() => {
    if (!workspace || !selectedSubtask || !liveCanvasNodes.length)
      return workspace;
    return {
      ...workspace,
      tasks: (workspace.tasks || []).map((t) => ({
        ...t,
        subtasks: (t.subtasks || []).map(
          (s) => s.id === selectedSubtask.id ? { ...s, canvasData: { ...s.canvasData || {}, nodes: liveCanvasNodes } } : s
        )
      }))
    };
  }, [workspace, selectedSubtask, liveCanvasNodes]);
  const [showClientReviewProgressModal, setShowClientReviewProgressModal] = useState(false);
  const [showProjectCompleteModal, setShowProjectCompleteModal] = useState(false);
  const [showCostCalculatorsModal, setShowCostCalculatorsModal] = useState(false);
  const [dockActiveTab, setDockActiveTab] = useState("elements");
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  const [canvasTheme, setCanvasTheme] = useState("slate");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const handleSelectDockTab = useCallback((tabId) => {
    setDockActiveTab((prev) => {
      if (prev === tabId) {
        setIsContextPanelOpen((open) => !open);
        return prev;
      }
      setIsContextPanelOpen(true);
      return tabId;
    });
  }, []);
  const externalReturnUrl = useMemo(() => {
    const isExternalSession = isPM || isCAS || isClientUser || urlUserRole === "pm" || urlUserRole === "cas";
    if (!isExternalSession)
      return null;
    try {
      if (urlReturnUrl) {
        const parsed = new URL(urlReturnUrl);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return parsed.toString();
        }
      }
    } catch {
    }
    if (isClientUser) {
      const base = (config.CLIENT_URL || "").replace(/\/+$/, "");
      return base ? `${base}/projects` : null;
    }
    return null;
  }, [urlReturnUrl, isPM, isCAS, isClientUser, urlUserRole]);
  const handleBackToDashboard = useCallback(() => {
    if (externalReturnUrl) {
      window.location.href = externalReturnUrl;
      return;
    }
    if (isPM) {
      navigate("/PMDashboard");
    } else if (isCAS) {
      navigate("/CASDashboard");
    } else {
      navigate("/VendorDashboard");
    }
  }, [externalReturnUrl, isPM, isCAS, navigate]);
  const isWorkspaceCompleted = workspace?.status === "completed";
  const isCurrentTaskUnlocked = useMemo(() => {
    if (!isWorkspaceCompleted || !selectedTask || !selectedSubtask)
      return false;
    const unlocked = workspace?.unlockedTasks || [];
    return unlocked.some(
      (ut) => ut.taskId === selectedTask.id && ut.subtaskId === selectedSubtask.id
    );
  }, [isWorkspaceCompleted, selectedTask, selectedSubtask, workspace?.unlockedTasks]);
  const shouldDisableEditing = isWorkspaceCompleted && detectedUserRole === "vendor" && !isCurrentTaskUnlocked;
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setDockActiveTab(e.detail);
        setIsContextPanelOpen(true);
      }
    };
    window.addEventListener("openDockTab", handler);
    return () => window.removeEventListener("openDockTab", handler);
  }, []);
  const [showStartCallModal, setShowStartCallModal] = useState(false);
  const [processedCallNotifications, setProcessedCallNotifications] = useState(/* @__PURE__ */ new Set());
  const [workspaceCollaborators, setWorkspaceCollaborators] = useState([]);
  const { startCall, joinCall, activeCall: callState } = useVideoCall();
  const [activeCall, setActiveCall] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const handleSelectTextElement = (event) => {
      const textElement = event.detail;
      console.log("\u{1F3AF} Text element selected from canvas:", textElement);
      setSelectedTextElement(textElement);
      if (!showTextPanel) {
        setShowTextPanel(true);
      }
    };
    document.addEventListener("selectTextElement", handleSelectTextElement);
    return () => document.removeEventListener("selectTextElement", handleSelectTextElement);
  }, [showTextPanel]);
  useEffect(() => {
    console.log("\u{1F4EC} Notifications updated:", {
      total: notifications?.length || 0,
      notifications,
      callInvitations: notifications?.filter((n) => n.type === "call_invitation") || [],
      activeCall,
      processedCount: processedCallNotifications.size,
      userId: currentUser?.id || currentUser?.userId,
      isConnected
    });
  }, [notifications, activeCall, processedCallNotifications, currentUser, isConnected]);
  const refetchWorkspace = useCallback(async () => {
    if (!workspaceId)
      return;
    try {
      console.log("\u{1F504} Refetching workspace data...");
      const response = await authFetch(`/api/workspaces/${workspaceId}`, {
        headers: buildAuthHeaders()
      });
      if (response.ok) {
        const freshWorkspaceData = await response.json();
        setWorkspace(freshWorkspaceData);
        if (Array.isArray(freshWorkspaceData?.tasks)) {
          setSelectedTask(
            (prev) => prev?.id ? freshWorkspaceData.tasks.find((t) => t.id === prev.id) || prev : prev
          );
          setSelectedSubtask((prev) => {
            if (!prev?.id)
              return prev;
            for (const t of freshWorkspaceData.tasks) {
              const s = t.subtasks?.find((s2) => s2.id === prev.id);
              if (s)
                return s;
            }
            return prev;
          });
        }
        console.log("\u2705 Workspace data refreshed");
        return freshWorkspaceData;
      }
    } catch (error2) {
      console.error("\u274C Failed to refetch workspace:", error2);
    }
  }, [workspaceId, selectedTask, selectedSubtask, buildAuthHeaders]);
  useEffect(() => {
    const unlockNotifications = notifications?.filter(
      (n) => n.type === "workspace_unlocked" && n.workspaceId === workspaceId && !n.read
    ) || [];
    if (unlockNotifications.length > 0) {
      console.log("\u{1F513} Workspace unlock notification received, refreshing workspace data...");
      refetchWorkspace();
      unlockNotifications.forEach((notification) => {
        if (markNotificationAsRead) {
          markNotificationAsRead(notification.notificationId);
        }
      });
    }
  }, [notifications, workspaceId, refetchWorkspace, markNotificationAsRead]);
  useEffect(() => {
    const isVendor = userRole === "vendor";
    const isCompleted = workspace?.status === "completed" || workspace?.status === "project completed";
    if (isVendor && isCompleted && workspaceId) {
      console.log("\u{1F504} Setting up polling for completed workspace (fallback for WebSocket)");
      const pollInterval = setInterval(() => {
        console.log("\u23F0 Polling workspace for unlock updates...");
        refetchWorkspace();
      }, 3e4);
      return () => {
        console.log("\u{1F6D1} Stopping workspace polling");
        clearInterval(pollInterval);
      };
    }
  }, [workspace?.status, userRole, workspaceId, refetchWorkspace]);
  useEffect(() => {
    if (location.pathname.includes("/invoices")) {
      setShowInvoiceTool(true);
    }
  }, [location.pathname]);
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.vendorId) {
        console.log("\u23F3 Waiting for vendorId...");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const userId2 = detectedClientId || currentUser.vendorId;
        const userRole2 = detectedClientId ? "client" : "vendor";
        const headers = {
          "Content-Type": "application/json",
          "x-user-info": JSON.stringify({
            vendorId: currentUser.vendorId,
            clientId: detectedClientId || void 0,
            email: currentUser?.email,
            role: userRole2,
            name: currentUser?.name
          }),
          "x-user-role": userRole2
        };
        console.log("\u{1F511} Using", userRole2, "ID:", userId2);
        const invoicesRes = await fetch(`/api/workspace/invoices?vendorId=${userId2}`, {
          headers
        });
        if (!invoicesRes.ok) {
          const errorData = await invoicesRes.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to fetch invoices");
        }
        const invoicesData = await invoicesRes.json();
        console.log("\u{1F4CA} Invoices data:", invoicesData);
        setInvoices(invoicesData.data || []);
        const quotesRes = await fetch(`/api/workspace/quotations?vendorId=${currentUser.vendorId}`, {
          headers
        });
        if (!quotesRes.ok) {
          const errorData = await quotesRes.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to fetch quotes");
        }
        const quotesData = await quotesRes.json();
        console.log("\u{1F4CA} Quotes data:", quotesData);
        setQuotes(quotesData.data || []);
        const creditNotesRes = await fetch(`/api/workspace/credit-notes?vendorId=${currentUser.vendorId}`, {
          headers
        });
        if (creditNotesRes.ok) {
          const creditNotesData = await creditNotesRes.json();
          console.log("\u{1F4CA} Credit notes data:", creditNotesData);
          setCreditNotes(creditNotesData.data || []);
        }
        const purchaseOrdersRes = await fetch(`/api/workspace/purchase-orders?vendorId=${currentUser.vendorId}`, {
          headers
        });
        if (purchaseOrdersRes.ok) {
          const purchaseOrdersData = await purchaseOrdersRes.json();
          console.log("\u{1F4CA} Purchase orders data:", purchaseOrdersData);
          setPurchaseOrders(purchaseOrdersData.data || []);
        }
      } catch (err) {
        console.error("\u274C Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.vendorId, detectedClientId]);
  const getStatusColor = (status = "") => {
    if (!status)
      return "bg-surface-hover text-ink";
    const statusLower = status.toLowerCase();
    if (statusLower.includes("paid") || statusLower.includes("approved")) {
      return "bg-success/10 text-success";
    } else if (statusLower.includes("pending") || statusLower.includes("draft")) {
      return "bg-warning/10 text-warning";
    } else if (statusLower.includes("rejected") || statusLower.includes("overdue")) {
      return "bg-danger/10 text-danger";
    }
    return "bg-surface-hover text-ink";
  };
  const transformToElementOptions = useCallback((invoices2, quotes2, creditNotes2, purchaseOrders2) => {
    const invoiceItems = (invoices2 || []).map((invoice) => ({
      id: invoice.id || `invoice-${invoice.invoiceId}`,
      name: invoice.displayInvoiceId ? `Tax Invoice #${invoice.displayInvoiceId}` : `Tax Invoice ${invoice.id}`,
      type: "invoice",
      nodeType: "invoice",
      preview: "Tax Invoice",
      date: invoice.date || "N/A",
      amount: invoice.totalAmount || "\u20B90.00",
      status: invoice.status || "Pending",
      statusColor: getStatusColor(invoice.status),
      categoryId: "invoices",
      ...invoice
    }));
    const quoteItems = (quotes2 || []).map((quote) => ({
      id: quote.id || `quote-${quote.quotationId}`,
      name: quote.displayQuoteId ? `Quotation #${quote.displayQuoteId}` : `Quotation ${quote.id}`,
      type: "quotation",
      nodeType: "quotation",
      preview: "Project Quotation",
      date: quote.date || "N/A",
      amount: quote.totalAmount || "\u20B90.00",
      status: quote.status || "Draft",
      statusColor: getStatusColor(quote.status),
      categoryId: "quotations",
      ...quote
    }));
    const creditNoteItems = (creditNotes2 || []).map((creditNote) => ({
      id: creditNote.id || `credit-note-${creditNote.creditNoteId}`,
      name: creditNote.displayCreditNoteId ? `Credit Note #${creditNote.displayCreditNoteId}` : `Credit Note ${creditNote.id}`,
      type: "credit-note",
      nodeType: "creditNote",
      preview: "Credit Note",
      date: creditNote.date || "N/A",
      amount: creditNote.creditAmount || "\u20B90.00",
      status: creditNote.status || "Draft",
      statusColor: getStatusColor(creditNote.status),
      categoryId: "credit-notes",
      ...creditNote
    }));
    const purchaseOrderItems = (purchaseOrders2 || []).map((purchaseOrder) => ({
      id: purchaseOrder.id || `po-${purchaseOrder.poId}`,
      name: purchaseOrder.displayPoId ? `Purchase Order #${purchaseOrder.displayPoId}` : `Purchase Order ${purchaseOrder.id}`,
      type: "purchase-order",
      nodeType: "purchaseOrder",
      preview: "Purchase Order",
      date: purchaseOrder.orderDate || "N/A",
      amount: purchaseOrder.totalAmount || "\u20B90.00",
      status: purchaseOrder.status || "Draft",
      statusColor: getStatusColor(purchaseOrder.status),
      categoryId: "purchase-orders",
      ...purchaseOrder
    }));
    return [...invoiceItems, ...quoteItems, ...creditNoteItems, ...purchaseOrderItems].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, []);
  const elementOptions = useMemo(() => ({
    "invoices-quotes": transformToElementOptions(invoices, quotes, creditNotes, purchaseOrders),
    smart: {
      name: "Smart Elements",
      icon: /* @__PURE__ */ React.createElement(Sparkles, { className: "w-5 h-5" }),
      elements: [
        {
          id: "smart-note",
          name: "Smart Note",
          type: "smart-note",
          preview: "AI-powered sticky note with smart actions",
          icon: /* @__PURE__ */ React.createElement(StickyNote, { className: "w-4 h-4 mr-2 text-warning" }),
          color: "bg-warning/10 border-warning/20 text-warning hover:bg-warning/20",
          nodeType: "smartNote",
          data: { label: "Smart Note" }
        },
        {
          id: "calendar-event",
          name: "Calendar Event",
          type: "calendar-event",
          preview: "Schedule meetings and send invites",
          icon: /* @__PURE__ */ React.createElement(Calendar, { className: "w-4 h-4 mr-2 text-info" }),
          color: "bg-info/10 border-info/20 text-info hover:bg-info/10",
          nodeType: "calendarNode",
          data: { label: "Calendar Event" }
        },
        {
          id: "approval-board",
          name: "Approval Board",
          type: "approval-board",
          preview: "Track and manage approval workflows",
          icon: /* @__PURE__ */ React.createElement(ClipboardCheck, { className: "w-4 h-4 mr-2 text-success" }),
          color: "bg-success/10 border-success/20 text-success hover:bg-success/10",
          nodeType: "approvalBoard",
          data: { label: "Approval Board" }
        },
        {
          id: "ai-helper",
          name: "AI Helper",
          type: "ai-helper",
          preview: "Summarize, suggest next steps, or generate flows with AI",
          icon: /* @__PURE__ */ React.createElement(Sparkles, { className: "w-4 h-4 mr-2 text-ink" }),
          color: "bg-surface-hover border-line text-ink hover:bg-surface-hover",
          nodeType: "aiHelper",
          data: { label: "AI Helper" }
        }
      ]
    },
    turnkey: {
      name: "Turnkey",
      elements: [
        { id: "turnkey-workflow", name: "Turnkey Workflow", type: "turnkey-workflow", preview: "Complete workflow visualization with tasks, resources, and status tracking" }
      ]
    },
    forms: {
      name: "Forms",
      elements: [
        { id: "textarea", name: "TextArea", type: "textarea", preview: "Large text input area" },
        { id: "textbox", name: "TextBox", type: "input", preview: "Single line text input" },
        { id: "input", name: "Input", type: "input", preview: "Generic input field" },
        { id: "radio", name: "Select one", type: "radio", preview: "Radio button selection" },
        { id: "checkbox", name: "Select Many", type: "checkbox", preview: "Multiple choice selection" },
        { id: "dropdown", name: "Dropdown", type: "select", preview: "Select from options" },
        { id: "button", name: "Button", type: "button", preview: "Action button" }
      ]
    },
    "cad-files": {
      name: "CAD Files",
      elements: [
        {
          id: "cad-files-basic",
          name: "CAD Files",
          type: "cad-files",
          preview: "Upload CAD drawings \u2014 each file is scanned and shown as a card",
          cadFilesData: { files: [] }
        },
        {
          id: "cdr-files-basic",
          name: "CDR Files",
          type: "cdr-files",
          preview: "Upload CorelDRAW .cdr files \u2014 each file shows as a card with SVG preview",
          cdrFilesData: { files: [] }
        },
        {
          id: "floor-plan-basic",
          name: "Floor Plan 3D",
          type: "floor-plan",
          preview: "Upload a floor plan (.dwg .dxf .png .pdf) \u2014 extrude it into a 3D model with specs",
          floorPlanData: { files: [] }
        }
      ]
    },
    "image-block": {
      name: "Image Block",
      elements: [
        {
          id: "image-block-basic",
          name: "Image Block",
          type: "image-block",
          preview: "Upload and annotate project visuals",
          imageBlockData: {
            imageUrl: "",
            caption: "South elevation \u2013 week 6 progress",
            timestamp: "2025-11-20 10:30",
            geotag: "12.9716\xB0 N, 77.5946\xB0 E",
            annotations: [
              { id: "ann-1", text: "Facade glazing completed", position: "top-left" },
              { id: "ann-2", text: "Landscape pending", position: "bottom-right" }
            ],
            width: 80
          }
        }
      ]
    },
    "task-card": {
      name: "Task Cards",
      elements: [
        {
          id: "task-card-basic",
          name: "Task Card",
          type: "task-card",
          preview: "Jira-style tracker for daily work",
          taskCardData: {
            title: "Prepare kickoff deck",
            description: "Compile agenda, assign speakers, and share pre-read with stakeholders.",
            status: "todo",
            assignedTo: "Alex Johnson",
            priority: "high",
            dueDate: "",
            checklists: [
              { id: "tc-basic-1", text: "Outline key topics", completed: true },
              { id: "tc-basic-2", text: "Collect collateral", completed: false },
              { id: "tc-basic-3", text: "Share draft for review", completed: false }
            ],
            attachments: [],
            comments: [
              {
                id: "tc-basic-comment-1",
                author: "Alex Johnson",
                text: "Waiting on inputs from finance.",
                timestamp: "2025-11-18 14:22"
              }
            ],
            dependencies: ["Finalize project scope"],
            labels: ["Kickoff", "Client"],
            activityLog: [
              {
                id: "tc-basic-activity-1",
                action: "Task created",
                meta: { by: "Alex Johnson" },
                timestamp: "2025-11-17 09:30"
              },
              {
                id: "tc-basic-activity-2",
                action: "Checklist updated",
                meta: { item: "Outline key topics", completed: true },
                timestamp: "2025-11-17 15:45"
              }
            ]
          }
        },
        {
          id: "task-card-progress",
          name: "Task Card with Progress",
          type: "task-card-progress",
          preview: "Task card showing progress and due date",
          taskCardData: {
            title: "Implement vendor portal UI",
            description: "Finish responsive layout for workspace canvas and finalize QA notes.",
            status: "in-progress",
            assignedTo: "Priya Patel",
            priority: "critical",
            dueDate: "2025-11-30",
            checklists: [
              { id: "tc-progress-1", text: "Design review sign-off", completed: true },
              { id: "tc-progress-2", text: "Implement task card block", completed: true },
              { id: "tc-progress-3", text: "Cross-browser QA", completed: false }
            ],
            attachments: [
              { id: "tc-progress-attach-1", name: "ui-spec.pdf", size: 245760 },
              { id: "tc-progress-attach-2", name: "jira-export.xlsx", size: 512e3 }
            ],
            comments: [
              {
                id: "tc-progress-comment-1",
                author: "Priya Patel",
                text: "Need confirmation on responsive breakpoints.",
                timestamp: "2025-11-19 10:05"
              },
              {
                id: "tc-progress-comment-2",
                author: "Rahul Verma",
                text: "Backend API is ready for integration.",
                timestamp: "2025-11-19 18:42"
              }
            ],
            dependencies: ["Finalize design system tokens", "API contract v2.1"],
            labels: ["Sprint 11", "Frontend", "High impact"],
            activityLog: [
              {
                id: "tc-progress-activity-1",
                action: "Status updated",
                meta: { status: "In-Progress" },
                timestamp: "2025-11-18 11:02"
              },
              {
                id: "tc-progress-activity-2",
                action: "Assignee changed",
                meta: { assignee: "Priya Patel" },
                timestamp: "2025-11-18 13:26"
              },
              {
                id: "tc-progress-activity-3",
                action: "Attachment added",
                meta: { file: "ui-spec.pdf" },
                timestamp: "2025-11-19 09:15"
              }
            ]
          }
        }
      ]
    },
    tables: {
      name: "Tables",
      elements: [
        { id: "basic-table", name: "Basic Table", type: "table", preview: "Simple data table" },
        { id: "data-table", name: "Data Table", type: "table", preview: "Advanced data table" },
        { id: "pivot-table", name: "Pivot Table", type: "table", preview: "Pivot analysis table" },
        { id: "calendar", name: "Calendar", type: "calendar", preview: "Date picker calendar" }
      ]
    },
    charts: {
      name: "Charts",
      elements: [
        { id: "bar-chart", name: "Bar Chart", type: "chart", preview: "Vertical bar chart" },
        { id: "line-chart", name: "Line Chart", type: "chart", preview: "Trend line chart" },
        { id: "pie-chart", name: "Pie Chart", type: "chart", preview: "Circular data chart" },
        { id: "area-chart", name: "Area Chart", type: "chart", preview: "Filled area chart" },
        { id: "scatter-plot", name: "Scatter Plot", type: "chart", preview: "Data point scatter" }
      ]
    },
    icons: {
      name: "Icons",
      elements: [
        { id: "basic-icons", name: "Basic Icons", type: "icon", preview: "Simple icon set" },
        { id: "social-icons", name: "Social Icons", type: "icon", preview: "Social media icons" },
        { id: "navigation-icons", name: "Navigation", type: "icon", preview: "Menu and nav icons" },
        { id: "action-icons", name: "Action Icons", type: "icon", preview: "Button and action icons" }
      ]
    },
    list: {
      name: "List",
      elements: [
        { id: "simple-list", name: "Simple List", type: "list", preview: "Basic list display" },
        { id: "numbered-list", name: "Numbered List", type: "list", preview: "Ordered list" },
        { id: "bullet-list", name: "Bullet List", type: "list", preview: "Unordered list" },
        { id: "card-list", name: "Card List", type: "list", preview: "Card-based list" }
      ]
    },
    other: {
      name: "Other Elements",
      elements: [
        { id: "grid", name: "Grid", type: "grid", preview: "Layout grid system" },
        { id: "button", name: "Button", type: "button", preview: "Action button" }
      ]
    },
    tables: {
      name: "Tables",
      elements: [
        { id: "basic-table", name: "Basic Table", type: "table", preview: "Simple data table" },
        { id: "data-table", name: "Data Table", type: "table", preview: "Advanced data table" },
        { id: "pivot-table", name: "Pivot Table", type: "table", preview: "Pivot analysis table" },
        { id: "calendar", name: "Calendar", type: "calendar", preview: "Date picker calendar" }
      ]
    },
    charts: {
      name: "Charts",
      elements: [
        { id: "bar-chart", name: "Bar Chart", type: "chart", preview: "Vertical bar chart" },
        { id: "line-chart", name: "Line Chart", type: "chart", preview: "Trend line chart" },
        { id: "pie-chart", name: "Pie Chart", type: "chart", preview: "Circular data chart" },
        { id: "area-chart", name: "Area Chart", type: "chart", preview: "Filled area chart" },
        { id: "scatter-plot", name: "Scatter Plot", type: "chart", preview: "Data point scatter" }
      ]
    },
    icons: {
      name: "Icons",
      elements: [
        { id: "basic-icons", name: "Basic Icons", type: "icon", preview: "Simple icon set" },
        { id: "social-icons", name: "Social Icons", type: "icon", preview: "Social media icons" },
        { id: "navigation-icons", name: "Navigation", type: "icon", preview: "Menu and nav icons" },
        { id: "action-icons", name: "Action Icons", type: "icon", preview: "Button and action icons" }
      ]
    },
    list: {
      name: "List",
      elements: [
        { id: "simple-list", name: "Simple List", type: "list", preview: "Basic list display" },
        { id: "numbered-list", name: "Numbered List", type: "list", preview: "Ordered list" },
        { id: "bullet-list", name: "Bullet List", type: "list", preview: "Unordered list" },
        { id: "card-list", name: "Card List", type: "list", preview: "Card-based list" }
      ]
    },
    other: {
      name: "Other Elements",
      elements: [
        { id: "grid", name: "Grid", type: "grid", preview: "Layout grid system" }
      ]
    }
  }), [invoices, quotes, creditNotes, purchaseOrders, transformToElementOptions]);
  const hasTurnkeyCASMember = useMemo(() => {
    const isTurnkeyValue = (value) => {
      const normalized = (value || "").toString().trim().toLowerCase();
      return normalized === "trunky" || normalized.includes("turnkey");
    };
    const casMembers = [
      ...Array.isArray(workspace?.casCollaborators) ? workspace.casCollaborators : [],
      ...Array.isArray(workspaceCollaborators) ? workspaceCollaborators.filter((c) => c?.isCAS) : []
    ];
    const result = casMembers.some(
      (member) => isTurnkeyValue(member?.casUnit) || isTurnkeyValue(member?.specialization) || isTurnkeyValue(member?.role) || (member?.userId || member?.vendorId || "").toString().toUpperCase().startsWith("TRNK-")
    );
    console.log("\u{1F527} Turnkey CAS member check:", { hasTurnkeyCASMember: result, casMembers });
    return result;
  }, [workspace?.casCollaborators, workspaceCollaborators]);
  const [userPermissions, setUserPermissions] = useState({
    canEdit: false,
    canComment: true,
    canViewFiles: true,
    canCreateTasks: false,
    canAssignTasks: false,
    canUpdateTaskStatus: false
  });
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  useEffect(() => {
    const handler = (e) => setIsTextToolActive(!!e.detail?.active);
    document.addEventListener("activateTextMode", handler);
    return () => document.removeEventListener("activateTextMode", handler);
  }, []);
  const handleSelectDockTabTextAware = useCallback((tabId) => {
    if (tabId === "text") {
      if (isTextToolActive || userPermissions?.canEdit) {
        document.dispatchEvent(new CustomEvent("activateTextMode", {
          detail: { active: !isTextToolActive }
        }));
      }
      return;
    }
    if (isTextToolActive) {
      document.dispatchEvent(new CustomEvent("activateTextMode", { detail: { active: false } }));
    }
    handleSelectDockTab(tabId);
  }, [isTextToolActive, userPermissions?.canEdit, handleSelectDockTab]);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showInviteVendorsModal, setShowInviteVendorsModal] = useState(false);
  const [showInviteCASModal, setShowInviteCASModal] = useState(false);
  useEffect(() => {
    if (externalAuthStatus === "pending")
      return;
    if (externalAuthStatus === "failed") {
      setWorkspaceError(externalAuthError || "Access link is invalid or expired. Please reopen the workspace from your dashboard.");
      setWorkspaceLoading(false);
      return;
    }
    const loadWorkspace = async () => {
      if (!workspaceId) {
        setWorkspaceError("No workspace ID provided");
        setWorkspaceLoading(false);
        return;
      }
      try {
        setWorkspaceLoading(true);
        let response = await authFetch(`/api/workspaces/${workspaceId}`, {
          headers: buildAuthHeaders()
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const workspaceData = await response.json();
        setWorkspace(workspaceData);
        console.log("\u2705 Loaded workspace");
        const userId2 = currentUser?.vendorId || currentUser?.userId || currentUser?.id;
        const workspaceClientId = workspaceData?.projectMetadata?.clientId;
        let isClient = false;
        let userClientId = null;
        try {
          const collaboratorsRes = await authFetch(`/api/workspaces/${workspaceId}/collaborators`, {
            headers: buildAuthHeaders({
              "x-user-info": JSON.stringify({
                vendorId: currentUser.vendorId,
                email: currentUser?.email,
                role: "vendor",
                name: currentUser?.name
              })
            })
          });
          if (collaboratorsRes.ok) {
            const collaboratorsData = await collaboratorsRes.json();
            console.log("\u{1F4CB} Collaborators fetched:", collaboratorsData.collaborators);
            setWorkspaceCollaborators(collaboratorsData.collaborators || []);
            const currentUserAsClient = collaboratorsData.collaborators?.find(
              (c) => c.isClient && (c.vendorId === userId2 || c.email === currentUser?.email)
            );
            if (currentUserAsClient) {
              console.log("\u{1F465} Client detected in collaborators! Current user is a client:", currentUserAsClient.vendorId);
              isClient = true;
              userClientId = currentUserAsClient.vendorId;
            } else {
              console.log("\u{1F50D} Not a client. Current user not found in client collaborators. userId:", userId2, "Collaborators:", collaboratorsData.collaborators?.map((c) => ({ vendorId: c.vendorId, email: c.email, isClient: c.isClient })));
            }
          }
        } catch (err) {
          console.warn("\u26A0\uFE0F Could not fetch collaborators to detect client role:", err.message);
        }
        if (isClient) {
          console.log("\u{1F504} Setting detected role to: client");
          setDetectedUserRole("client");
          setDetectedClientId(userClientId);
          if (currentUser?.role !== "client") {
            console.log("\u{1F4DD} Updating user role in VendorContext from", currentUser?.role, "to client");
            setUser({
              ...currentUser,
              role: "client"
            });
          }
          console.log("\u2705 Detected role state updated to: client");
        } else {
          console.log("\u{1F50D} Not a client. userId:", userId2, "clientId:", workspaceClientId);
          setDetectedUserRole(userRole);
          setDetectedClientId(null);
        }
        if (workspaceData.zoomLevel) {
          if (workspaceData.zoomLevel !== void 0 && workspaceData.zoomLevel !== null) {
            setZoomLevel(workspaceData.zoomLevel);
          }
        }
        if (workspaceData.accessControl && currentUser) {
          const permissions = workspaceData.accessControl.permissions || {};
          const finalRole = isClient ? "client" : userRole;
          console.log("\u{1F50D} Permission Check Debug:", {
            finalRole,
            userId: userId2,
            currentUser,
            permissions: permissions.canEdit,
            hasEditPermission: permissions.canEdit?.includes(userId2)
          });
          setUserPermissions({
            canEdit: shareViewOnly ? false : shareCanEdit || finalRole === "pm" || permissions.canEdit?.includes(userId2) || false,
            canComment: permissions.canComment?.includes(userId2) || true,
            canViewFiles: permissions.canViewFiles?.includes(userId2) || true,
            canCreateTasks: finalRole === "pm" || permissions.canCreateTasks?.includes(userId2) || false,
            canAssignTasks: finalRole === "pm" || permissions.canAssignTasks?.includes(userId2) || false,
            canUpdateTaskStatus: permissions.canUpdateTaskStatus?.includes(userId2) || finalRole === "vendor" || finalRole === "cas",
            canAddNotes: permissions.canAddNotes?.includes(userId2) || finalRole === "client",
            canApproveElements: permissions.canApproveElements?.includes(userId2) || finalRole === "client",
            canAccessMessages: true,
            // Messaging is always accessible to all collaborators
            canAccessVideoCall: true
            // Video calls are always accessible to all collaborators
          });
        } else {
          const finalRole = isClient ? "client" : userRole;
          setUserPermissions({
            canEdit: shareViewOnly ? false : shareCanEdit || finalRole === "pm",
            canComment: true,
            canViewFiles: true,
            canCreateTasks: finalRole === "pm",
            canAssignTasks: finalRole === "pm",
            canUpdateTaskStatus: finalRole === "vendor" || finalRole === "cas",
            canAddNotes: finalRole === "client",
            canApproveElements: finalRole === "client",
            canAccessMessages: true,
            // Messaging is always accessible to all collaborators
            canAccessVideoCall: true
            // Video calls are always accessible to all collaborators
          });
        }
        setWorkspaceError(null);
      } catch (error2) {
        console.error("Error loading workspace:", error2);
        setWorkspaceError("Failed to load workspace data");
      } finally {
        setWorkspaceLoading(false);
      }
    };
    loadWorkspace();
  }, [workspaceId, currentUser, buildAuthHeaders, externalAuthStatus, externalAuthError]);
  useEffect(() => {
    const handleApprovalCompleted = async (event) => {
      console.log("\u{1F3AF} WorkspacePage: Approval completed event received", event.detail);
      try {
        const response = await authFetch(`/api/workspaces/${event.detail.workspaceId}`, {
          headers: buildAuthHeaders()
        });
        if (response.ok) {
          const freshWorkspaceData = await response.json();
          setWorkspace(freshWorkspaceData);
          if (Array.isArray(freshWorkspaceData?.tasks)) {
            setSelectedTask(
              (prev) => prev?.id ? freshWorkspaceData.tasks.find((t) => t.id === prev.id) || prev : prev
            );
            setSelectedSubtask((prev) => {
              if (!prev?.id)
                return prev;
              for (const t of freshWorkspaceData.tasks) {
                const s = t.subtasks?.find((s2) => s2.id === prev.id);
                if (s)
                  return s;
              }
              return prev;
            });
          }
          console.log("\u2705 WorkspacePage: Workspace refreshed after approval completion");
        }
      } catch (error2) {
        console.error("\u274C WorkspacePage: Failed to refresh workspace after approval", error2);
      }
    };
    window.addEventListener("approvalCompleted", handleApprovalCompleted);
    return () => window.removeEventListener("approvalCompleted", handleApprovalCompleted);
  }, [selectedTask, selectedSubtask, buildAuthHeaders]);
  const saveWorkspace = async (workspaceData) => {
    if (window.__isApprovingInProgress) {
      console.log("\u23F8\uFE0F WorkspacePage: Skipping canvas save - approval submission in progress");
      return;
    }
    console.log("\u{1F504} WorkspacePage: saveWorkspace called", {
      workspaceId,
      hasWorkspace: !!workspace,
      selectedTask: selectedTask?.id,
      selectedSubtask: selectedSubtask?.id,
      workspaceData: {
        nodesCount: workspaceData.nodes?.length || 0,
        edgesCount: workspaceData.edges?.length || 0,
        zoomLevel: workspaceData.zoomLevel
      }
    });
    if (!workspaceId || !workspace) {
      console.error("\u274C WorkspacePage: Cannot save - missing workspaceId or workspace", {
        workspaceId,
        hasWorkspace: !!workspace
      });
      return;
    }
    if (selectedTask && selectedSubtask) {
      setSaveOpsInFlight((prev) => prev + 1);
      setSaveError(null);
      try {
        console.log("\u{1F680} WorkspacePage: Saving to subtask canvas");
        const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${selectedTask.id}/subtasks/${selectedSubtask.id}/canvas`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(workspaceData)
        });
        console.log("\u{1F4E1} WorkspacePage: Subtask canvas API response received", {
          status: response.status,
          ok: response.ok
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error("\u274C WorkspacePage: API error response:", errorText);
          throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        console.log("\u2705 WorkspacePage: Subtask canvas saved successfully", result);
        setLastSavedAt(Date.now());
        setWorkspace(result.workspace);
        if (result.workspace?.tasks) {
          setSelectedSubtask((prev) => {
            if (!prev?.id)
              return prev;
            for (const t of result.workspace.tasks) {
              const s = t.subtasks?.find((s2) => s2.id === prev.id);
              if (s) {
                console.log("\u{1F504} WorkspacePage: Updated selectedSubtask with new canvas data");
                return s;
              }
            }
            return prev;
          });
        }
      } catch (error2) {
        console.error("\u274C WorkspacePage: Error saving subtask canvas:", error2);
        setSaveError(error2?.message || "Failed to sync canvas changes");
        throw error2;
      } finally {
        setSaveOpsInFlight((prev) => Math.max(0, prev - 1));
      }
    } else {
      setSaveOpsInFlight((prev) => prev + 1);
      setSaveError(null);
      try {
        console.log("\u{1F680} WorkspacePage: Making API call to save general workspace canvas");
        const response = await fetch(`/api/workspaces/${workspaceId}/canvas`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(workspaceData)
        });
        console.log("\u{1F4E1} WorkspacePage: API response received", {
          status: response.status,
          ok: response.ok
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error("\u274C WorkspacePage: API error response:", errorText);
          throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        console.log("\u2705 WorkspacePage: Workspace saved successfully", result);
        setLastSavedAt(Date.now());
        setWorkspace(result.workspace);
      } catch (error2) {
        console.error("\u274C WorkspacePage: Error saving workspace:", error2);
        setSaveError(error2?.message || "Failed to sync workspace changes");
        throw error2;
      } finally {
        setSaveOpsInFlight((prev) => Math.max(0, prev - 1));
      }
    }
  };
  const syncStatus = useMemo(() => {
    if (saveOpsInFlight > 0)
      return "saving";
    if (saveError)
      return "error";
    if (canvasWebSocket && !canvasWebSocket.isConnected)
      return "offline";
    return "live";
  }, [saveOpsInFlight, saveError, canvasWebSocket]);
  useEffect(() => {
    if (!workspace)
      return;
    const autoSaveInterval = setInterval(() => {
      console.log("Auto-save ready for workspace:", workspaceId);
    }, 3e4);
    return () => clearInterval(autoSaveInterval);
  }, [workspace, workspaceId]);
  useEffect(() => {
    const handleNodesChanged = (event) => {
      const { nodes } = event.detail;
      console.log("\u{1F4CA} Canvas nodes updated:", nodes.length, "elements");
      setCanvasNodes(nodes || []);
    };
    document.addEventListener("canvasNodesChanged", handleNodesChanged);
    return () => {
      document.removeEventListener("canvasNodesChanged", handleNodesChanged);
    };
  }, []);
  useEffect(() => {
    if (!showInvoiceTool)
      return;
    const handlePopState = (event) => {
      event.preventDefault();
      setShowInvoiceTool(false);
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showInvoiceTool]);
  const handleManagePermissions = () => {
    console.log("\u{1F510} Opening permissions management modal");
    setShowPermissionsModal(true);
  };
  const handleInviteVendors = () => {
    console.log("\u{1F465} Opening invite vendors modal");
    setShowInviteVendorsModal(true);
  };
  const handleInviteCAS = () => {
    console.log("\u{1F465} Opening invite CAS modal");
    setShowInviteCASModal(true);
  };
  const handleCASInviteSuccess = (invitedEmployees) => {
    console.log("\u2705 CAS members invited successfully:", invitedEmployees);
    triggerActivityRefresh();
    refetchWorkspace();
  };
  const handleVendorInviteSuccess = (invitedVendors) => {
    console.log("\u2705 Vendors invited successfully:", invitedVendors);
    triggerActivityRefresh();
    refetchWorkspace();
  };
  const layers = workspace?.layers || [
    {
      id: 1,
      name: "Interior work",
      type: "folder",
      color: "bg-success",
      items: [
        { id: 101, name: "Internal Interior", type: "file", color: "bg-info", status: "active" },
        { id: 102, name: "Checkout", type: "file", color: "bg-info", status: "pending" }
      ]
    },
    {
      id: 2,
      name: "Marketing",
      type: "folder",
      color: "bg-success",
      items: [
        { id: 201, name: "Brand Guidelines", type: "file", color: "bg-info", status: "completed" },
        { id: 202, name: "Social Media", type: "file", color: "bg-info", status: "in-progress" }
      ]
    },
    {
      id: 3,
      name: "Inventory",
      type: "folder",
      color: "bg-cta",
      items: [
        { id: 301, name: "Stock Count", type: "file", color: "bg-info", status: "pending" },
        { id: 302, name: "Warehouse Layout", type: "file", color: "bg-info", status: "draft" }
      ]
    }
  ];
  const elementCategories = [
    { id: "forms", name: "Forms", icon: "Grid", color: "bg-warning/10 text-warning" },
    { id: "tables", name: "Tables", icon: "Table", color: "bg-surface-hover text-ink" },
    { id: "charts", name: "Charts", icon: "BarChart3", color: "bg-info/10 text-info" },
    { id: "icons", name: "Icons", icon: "Square", color: "bg-surface-hover text-ink" },
    { id: "list", name: "List", icon: "List", color: "bg-success/10 text-success" },
    { id: "other", name: "other elements", icon: "Grid", color: "bg-surface-hover text-ink" }
  ];
  const toggleSidebars = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);
  const toggleLeftPin = useCallback(() => setLeftPanelPinned((p) => !p), []);
  const toggleRightPin = useCallback(() => setRightPanelPinned((p) => !p), []);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);
  const paletteCommands = useMemo(() => [
    { id: "focus-mode", label: focusMode ? "Exit Focus Mode" : "Enter Focus Mode", category: "Layout", icon: /* @__PURE__ */ React.createElement(Maximize2, { className: "w-4 h-4" }), shortcut: "Ctrl+Shift+H", keywords: ["focus", "hide", "panels", "canvas"], action: () => setFocusMode((p) => !p) },
    { id: "pin-left", label: leftPanelPinned ? "Unpin Left Panel" : "Pin Left Panel", category: "Layout", icon: /* @__PURE__ */ React.createElement(PanelLeft, { className: "w-4 h-4" }), shortcut: "Ctrl+Shift+L", keywords: ["left", "sidebar", "pin", "tasks"], action: () => setLeftPanelPinned((p) => !p) },
    { id: "pin-right", label: rightPanelPinned ? "Unpin Right Panel" : "Pin Right Panel", category: "Layout", icon: /* @__PURE__ */ React.createElement(PanelRight, { className: "w-4 h-4" }), shortcut: "Ctrl+Shift+R", keywords: ["right", "sidebar", "pin", "activity"], action: () => setRightPanelPinned((p) => !p) },
    { id: "fit-view", label: "Fit Canvas to View", category: "Canvas", icon: /* @__PURE__ */ React.createElement(ZoomIn, { className: "w-4 h-4" }), shortcut: "Ctrl+Shift+1", keywords: ["fit", "zoom", "center", "reset"], action: () => document.dispatchEvent(new CustomEvent("canvasFitView")) },
    { id: "add-task", label: "Add New Task", category: "Tasks", icon: /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-4 h-4" }), keywords: ["create", "task", "new"], action: () => setShowAddTaskModal(true) },
    { id: "add-subtask", label: "Add Subtask", category: "Tasks", icon: /* @__PURE__ */ React.createElement(FileText, { className: "w-4 h-4" }), keywords: ["create", "subtask", "new"], action: () => selectedTask && setShowAddSubtaskModal(true) },
    { id: "elements", label: "Open Elements Panel", category: "Panels", icon: /* @__PURE__ */ React.createElement(Layout, { className: "w-4 h-4" }), keywords: ["elements", "sidebar", "components", "drag"], action: () => handleElementsClick() },
    { id: "layouts", label: "Open Layouts Panel", category: "Panels", icon: /* @__PURE__ */ React.createElement(Layout, { className: "w-4 h-4" }), keywords: ["layouts", "template", "grid"], action: () => handleLayoutsClick() },
    { id: "text", label: "Open Text Panel", category: "Panels", icon: /* @__PURE__ */ React.createElement(FileText, { className: "w-4 h-4" }), keywords: ["text", "annotation", "label"], action: () => handleTextClick() },
    { id: "templates", label: "Open Templates Panel", category: "Panels", icon: /* @__PURE__ */ React.createElement(Sparkles, { className: "w-4 h-4" }), keywords: ["templates", "flowchart", "preset"], action: () => handleTemplatesClick() },
    { id: "post-services", label: "Post Service", category: "Actions", icon: /* @__PURE__ */ React.createElement(FileText, { className: "w-4 h-4" }), keywords: ["post", "service", "publish"], action: () => setShowPostServicesModal(true) },
    { id: "shortcuts", label: "Show Keyboard Shortcuts", category: "Help", icon: /* @__PURE__ */ React.createElement(Keyboard, { className: "w-4 h-4" }), shortcut: "?", keywords: ["keyboard", "shortcuts", "help", "keys"], action: () => setShowShortcutsOverlay(true) },
    { id: "ai-canvas-builder", label: "AI Canvas Builder", category: "Canvas", icon: /* @__PURE__ */ React.createElement(Sparkles, { className: "w-4 h-4" }), keywords: ["ai", "generate", "flow", "build", "canvas", "agent", "auto"], action: () => setShowAIBuilder(true) },
    { id: "ai-helper", label: "Add AI Helper Block", category: "Canvas", icon: /* @__PURE__ */ React.createElement(Sparkles, { className: "w-4 h-4" }), keywords: ["ai", "helper", "summarize", "suggest", "generate", "flow", "assistant"], action: () => {
      document.dispatchEvent(new CustomEvent("addElementToCanvas", { detail: { type: "ai-helper", name: "AI Helper", nodeType: "aiHelper", data: { label: "AI Helper" } } }));
    } },
    // Canvas elements — "Go to" commands zoom to the node on the canvas
    ...(canvasNodes || []).filter((n) => n?.id && n?.data?.name).map((n) => ({
      id: `goto-${n.id}`,
      label: `Go to ${n.data.name}`,
      category: "Canvas Elements",
      icon: /* @__PURE__ */ React.createElement(ZoomIn, { className: "w-4 h-4" }),
      keywords: ["element", "node", "find", "zoom", "goto", String(n.data.name).toLowerCase()],
      action: () => document.dispatchEvent(new CustomEvent("zoomToElement", { detail: { elementId: n.id } }))
    }))
  ], [focusMode, leftPanelPinned, rightPanelPinned, selectedTask, canvasNodes]);
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (leftPanelHover) {
          setLeftPanelHover(false);
          return;
        }
        if (rightPanelHover) {
          setRightPanelHover(false);
          return;
        }
        window.close();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }
      if (event.key === "?" && !["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
        event.preventDefault();
        setShowShortcutsOverlay((prev) => !prev);
        return;
      }
      if (event.ctrlKey && event.shiftKey && event.key === "H") {
        event.preventDefault();
        setFocusMode((prev) => !prev);
      }
      if (event.ctrlKey && event.shiftKey && event.key === "L") {
        event.preventDefault();
        setLeftPanelPinned((p) => !p);
      }
      if (event.ctrlKey && event.shiftKey && event.key === "R") {
        event.preventDefault();
        setRightPanelPinned((p) => !p);
      }
      if (event.ctrlKey && event.shiftKey && event.key === "1") {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent("canvasFitView"));
      }
    };
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.overflow = "";
      document.documentElement.style.margin = "";
      document.documentElement.style.padding = "";
      document.documentElement.style.overflow = "";
    };
  }, []);
  const [tasks, setTasks] = useState([]);
  const taskMemberOptions = useMemo(() => {
    const members = Array.isArray(workspaceCollaborators) ? workspaceCollaborators : [];
    const normalized = members.map((member) => {
      const id = member.vendorId || member.userId || member.id;
      if (!id)
        return null;
      const name = member.name || member.userName || member.email || "Member";
      const role = member.role || member.userRole || null;
      return {
        id,
        label: name,
        role: role || null
      };
    }).filter(Boolean);
    const uniqueById = /* @__PURE__ */ new Map();
    normalized.forEach((member) => {
      if (!uniqueById.has(member.id)) {
        uniqueById.set(member.id, member);
      }
    });
    return Array.from(uniqueById.values());
  }, [workspaceCollaborators]);
  const hasAutoSelectedTaskRef = useRef(false);
  useEffect(() => {
    hasAutoSelectedTaskRef.current = false;
  }, [workspace?.workspaceId]);
  useEffect(() => {
    if (workspace?.tasks) {
      setTasks(workspace.tasks);
      if (!hasAutoSelectedTaskRef.current && !selectedTask && workspace.tasks.length > 0) {
        hasAutoSelectedTaskRef.current = true;
        const firstTask = workspace.tasks[0];
        setSelectedTask(firstTask);
        if (firstTask.subtasks && firstTask.subtasks.length > 0) {
          setSelectedSubtask(firstTask.subtasks[0]);
        }
      }
    }
  }, [workspace, selectedTask]);
  useEffect(() => {
    const callInvitations = notifications?.filter((n) => n.type === "call_invitation") || [];
    callInvitations.forEach((notification) => {
      if (!processedCallNotifications.has(notification.id)) {
        console.log("\u{1F4DE} New call invitation received:", notification);
      }
    });
  }, [notifications, processedCallNotifications]);
  const addTask = async (taskData) => {
    if (!workspaceId) {
      console.error("Cannot add task: no workspace ID");
      return;
    }
    try {
      console.log("\u{1F504} WorkspacePage: Adding task", { taskData, workspaceId });
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: taskData.title,
          description: taskData.description || "",
          priority: taskData.priority || "medium",
          assignedUserId: taskData.accessedBy || null,
          userId: currentUser?.id || "unknown",
          userEmail: currentUser?.email || "unknown@example.com",
          userName: currentUser?.name || "Unknown User"
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      console.log("\u2705 WorkspacePage: Task added successfully", result);
      setTasks((prevTasks) => [...prevTasks, result.task]);
      const updatedWorkspace = result.workspace;
      setWorkspace(updatedWorkspace);
    } catch (error2) {
      console.error("\u274C WorkspacePage: Error adding task:", error2);
      alert("Failed to add task. Please try again.");
      throw error2;
    }
  };
  const addSubtask = async (subtaskData, options = {}) => {
    const { autoSelect = true } = options;
    if (!selectedTask || !workspaceId) {
      console.error("Cannot add subtask: missing selectedTask or workspaceId");
      return;
    }
    try {
      console.log("\u{1F504} WorkspacePage: Adding subtask", {
        subtaskData,
        workspaceId,
        taskId: selectedTask.id
      });
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${selectedTask.id}/subtasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: subtaskData.title,
          description: subtaskData.description || "",
          dependsOnSubtaskId: subtaskData.dependsOnSubtaskId || "auto-previous",
          flowOrder: subtaskData.flowOrder ? Number(subtaskData.flowOrder) : void 0,
          assignedUserId: subtaskData.assignedTo || null,
          userId: currentUser?.id || "unknown",
          userEmail: currentUser?.email || "unknown@example.com",
          userName: currentUser?.name || "Unknown User"
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      console.log("\u2705 WorkspacePage: Subtask added successfully", result);
      const updatedWorkspace = result.workspace;
      setWorkspace(updatedWorkspace);
      if (Array.isArray(updatedWorkspace?.tasks)) {
        setTasks(updatedWorkspace.tasks);
        const updatedSelectedTask = updatedWorkspace.tasks.find((task) => task.id === selectedTask.id);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        }
      }
      if (autoSelect) {
        setSelectedSubtask(result.subtask);
        console.log("\u2728 WorkspacePage: Auto-selected new subtask", {
          subtaskId: result.subtask.id,
          subtaskName: result.subtask.name
        });
      }
    } catch (error2) {
      console.error("\u274C WorkspacePage: Error adding subtask:", error2);
      alert("Failed to add subtask. Please try again.");
      throw error2;
    }
  };
  const updateTaskDetails = async (taskId, updates = {}) => {
    if (!workspaceId || !taskId)
      return;
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      if (result.workspace?.tasks) {
        setWorkspace(result.workspace);
        setTasks(result.workspace.tasks);
        if (selectedTask?.id) {
          const updatedSelectedTask = result.workspace.tasks.find((task) => task.id === selectedTask.id);
          if (updatedSelectedTask) {
            setSelectedTask(updatedSelectedTask);
          }
        }
      }
    } catch (error2) {
      console.error("\u274C WorkspacePage: Error updating task:", error2);
      throw error2;
    }
  };
  const updateSubtaskDetails = async (taskId, subtaskId, updates = {}) => {
    if (!workspaceId || !taskId || !subtaskId)
      return;
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      if (result.workspace?.tasks) {
        setWorkspace(result.workspace);
        setTasks(result.workspace.tasks);
        const updatedTask = result.workspace.tasks.find((task) => task.id === taskId);
        if (updatedTask) {
          if (selectedTask?.id === taskId) {
            setSelectedTask(updatedTask);
          }
          if (selectedSubtask?.id === subtaskId) {
            const updatedSubtask = (updatedTask.subtasks || []).find((subtask) => subtask.id === subtaskId);
            if (updatedSubtask) {
              setSelectedSubtask(updatedSubtask);
            }
          }
        }
      }
    } catch (error2) {
      console.error("\u274C WorkspacePage: Error updating subtask:", error2);
      throw error2;
    }
  };
  const renameTask = async (taskId, name) => {
    const trimmedName = (name || "").trim();
    if (!trimmedName)
      return;
    await updateTaskDetails(taskId, { name: trimmedName });
  };
  const renameSubtask = async (taskId, subtaskId, name) => {
    const trimmedName = (name || "").trim();
    if (!trimmedName)
      return;
    await updateSubtaskDetails(taskId, subtaskId, { name: trimmedName });
  };
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setSelectedSubtask(null);
    setSelectedLayer(null);
    setSelectedLayerItem(null);
  };
  const handleBackToHome = () => {
    setSelectedTask(null);
    setSelectedSubtask(null);
    setActiveTab("Task");
  };
  const handleSubtaskClick = (subtask) => {
    setSelectedSubtask(subtask);
  };
  const handleNotificationClick = async (notification) => {
    const nodeId = notification?.data?.nodeId || notification?.data?.elementId;
    if (!nodeId)
      return;
    let taskId = notification.data?.taskId || null;
    let subtaskId = notification.data?.subtaskId || null;
    let ws = workspace;
    if (!taskId || !subtaskId) {
      let hit = findSubtaskContainingNode(ws, nodeId);
      if (!hit && workspaceId) {
        try {
          ws = await getWorkspaceById(workspaceId);
          hit = findSubtaskContainingNode(ws, nodeId);
        } catch (e) {
          console.warn("Could not refetch workspace for notification navigation", e);
        }
      }
      taskId = hit?.taskId || taskId;
      subtaskId = hit?.subtaskId || subtaskId;
    }
    const task = ws?.tasks?.find((t) => t.id === taskId);
    const subtask = task?.subtasks?.find((s) => s.id === subtaskId);
    if (task && subtask) {
      setSelectedTask(task);
      setSelectedSubtask(subtask);
      setSelectedLayer(null);
      setSelectedLayerItem(null);
    }
    window.dispatchEvent(new CustomEvent("focusCanvasNode", { detail: { nodeId } }));
  };
  const handleBackToTask = () => {
    setSelectedSubtask(null);
  };
  const handleLayerClick = (layer) => {
    setSelectedLayer(layer);
    setSelectedLayerItem(null);
  };
  const handleLayerItemClick = (layerItem) => {
    setSelectedLayerItem(layerItem);
  };
  const handleBackToLayer = () => {
    setSelectedLayerItem(null);
  };
  const handleLeaveWorkspace = useCallback(() => {
    handleBackToDashboard();
  }, [handleBackToDashboard]);
  const handleElementsClick = () => {
    setShowElementsSidebar(true);
    setShowLayoutsPanel(false);
    setShowInvoiceTool(false);
  };
  const handleLayoutsClick = () => {
    setShowLayoutsPanel(true);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowTextPanel(false);
    setShowInvoiceTool(false);
  };
  const handleTextClick = () => {
    setShowTextPanel(true);
    setShowLayoutsPanel(false);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowInvoiceTool(false);
  };
  const handleUpdateTextElement = (updatedElement) => {
    setSelectedTextElement(updatedElement);
    const event = new CustomEvent("updateTextElement", {
      detail: updatedElement
    });
    document.dispatchEvent(event);
  };
  const handleTemplatesClick = () => {
    setDockActiveTab("templates");
    setIsContextPanelOpen(true);
    setShowTextPanel(false);
    setShowLayoutsPanel(false);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowInvoiceTool(false);
  };
  const handleWorkflowBuilderClick = () => {
    setShowWorkflowBuilderModal(true);
    setShowTextPanel(false);
    setShowLayoutsPanel(false);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowInvoiceTool(false);
  };
  const handleDocumentClick = (document2) => {
    console.log("\u{1F4C4} Document clicked:", document2);
    setShowInvoiceTool(true);
    setShowElementsPanel(false);
    setSelectedCategory(null);
  };
  const handleTemplateSelect = (templateId) => {
    if (templateId === "quotations-invoices") {
      navigate(`/VendorDashboard/workspace/${workspaceId}/invoices`);
      setIsContextPanelOpen(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === "custom-boq") {
      setShowCustomBOQModal(true);
      setIsContextPanelOpen(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === "boq") {
      setShowManageBOQModal(true);
      setIsContextPanelOpen(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === "procurement-rfq") {
      setShowProcurementRFQModal(true);
      setIsContextPanelOpen(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === "cost-calculators") {
      setShowCostCalculatorsModal(true);
      setIsContextPanelOpen(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === "execution-work-order" || templateId === "execution-rfi" || templateId === "execution-inspection" || templateId === "execution-daily-site-log") {
      setExecutionTemplateType(templateId);
      setShowExecutionRequestModal(true);
      setIsContextPanelOpen(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    }
  };
  const handleElementSelect = (categoryId) => {
    console.log("\u{1F50D} Element selected:", categoryId);
    setSelectedCategory(categoryId);
    setShowElementsSidebar(false);
    setShowElementsPanel(true);
    setShowLayoutsPanel(false);
    setShowTextPanel(false);
    setShowInvoiceTool(false);
    console.log("\u{1F4CA} Panel state after selection:", {
      showElementsPanel: true,
      selectedCategory: categoryId,
      showElementsSidebar: false
    });
  };
  const handleElementOptionSelect = (elementData) => {
    console.log("\u{1F3AF} Selected element:", elementData);
    if (elementData.categoryId === "turnkey") {
      console.log("\u{1F527} Processing turnkey element:", elementData);
      const turnkeyElement = {
        id: elementData.elementId,
        type: elementData.elementType,
        category: "turnkey",
        name: elementData.name || "Turnkey Element"
      };
      console.log("\u{1F4E6} Creating turnkey element:", turnkeyElement);
      const turnkeyNodeEvent = new CustomEvent("elementDoubleClick", {
        detail: turnkeyElement
      });
      console.log("\u{1F680} Dispatching turnkey event:", turnkeyNodeEvent);
      document.dispatchEvent(turnkeyNodeEvent);
    }
    setShowElementsPanel(false);
  };
  const recentActivities = [
    { id: 1, type: "completed", user: "Bob Johnson", action: "Completed task Create wireframes for app", time: "10 mins ago", icon: "CheckCircle", color: "text-success" },
    { id: 2, type: "deadline", user: "System", action: "Task approaching deadline Finalize project proposal", time: "1 hour ago", icon: "AlertTriangle", color: "text-danger" },
    { id: 3, type: "completed", user: "Bob Johnson", action: "Completed task Create wireframes for app", time: "2 hours ago", icon: "FileText", color: "text-info" }
  ];
  const messages = [
    { id: 1, user: "Team Member 1", message: "Hi team, I wanted to check on the progress of the project.", time: "2 mins ago", isCurrentUser: false },
    { id: 2, user: "Team Member 2", message: "We're on track with the timeline. The development phase is almost complete.", time: "5 mins ago", isCurrentUser: false },
    { id: 3, user: "You", message: "That's great to hear. I've completed the backend integration", time: "1 min ago", isCurrentUser: true },
    { id: 4, user: "Team Member 2", message: "The development phase is almost complete.", time: "3 mins ago", isCurrentUser: false }
  ];
  const workspaceDisplayName = workspace?.name || workspace?.title || leadDetails?.name || (typeof window !== "undefined" ? localStorage.getItem("currentWorkspace") : null) || "Workspace";
  const handleStartCallClick = () => {
    console.log("\u{1F4DE} Start Call button clicked");
    setShowStartCallModal(true);
  };
  const handleStartCallSubmit = async (callData) => {
    try {
      console.log("\u{1F4DE} Starting call with data:", callData);
      const { selectedCollaborators, callTitle } = callData;
      const invitedUserIds = selectedCollaborators.map((c) => c.vendorId || c.userId || c.id);
      console.log("\u{1F4DE} Invited user IDs:", invitedUserIds);
      const callResult = await startCall({
        collaborators: selectedCollaborators,
        workspaceId,
        callTitle: callTitle || "Workspace Call",
        initiatorId: currentUser?.vendorId || currentUser?.id,
        initiatorName: currentUser?.name,
        invitedUserIds
      });
      console.log("\u2705 Call started successfully:", callResult);
      if (callResult && callResult.meetingId) {
        setActiveCall(callResult);
        console.log("\u{1F4F1} Active call state updated:", callResult);
      }
      setShowStartCallModal(false);
      alert(`Call "${callTitle}" started! Invitations sent to ${selectedCollaborators.length} collaborator(s).`);
    } catch (error2) {
      console.error("\u274C Error starting call:", error2);
      alert("Failed to start call. Please try again.");
    }
  };
  const handleAcceptCall = async (notification) => {
    try {
      console.log("\u2705 Accepting call:", notification);
      const callData = notification.data;
      const result = await joinCall(
        callData.meetingId,
        currentUser?.vendorId || currentUser?.id,
        currentUser?.name
      );
      console.log("\u2705 Joined call successfully:", result);
      if (result && result.call) {
        setActiveCall(result.call);
        console.log("\u{1F4F1} Active call state updated after join:", result.call);
      }
      setProcessedCallNotifications((prev) => /* @__PURE__ */ new Set([...prev, notification.id]));
    } catch (error2) {
      console.error("\u274C Error accepting call:", error2);
      alert("Failed to join call. Please try again.");
    }
  };
  const handleDeclineCall = async (notification) => {
    try {
      console.log("\u274C Declining call:", notification);
      const callData = notification.data;
      await authFetch("/api/calls/decline", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          meetingId: callData.meetingId,
          attendeeId: currentUser?.vendorId || currentUser?.id
        })
      });
      setProcessedCallNotifications((prev) => /* @__PURE__ */ new Set([...prev, notification.id]));
      console.log("\u2705 Call declined successfully");
    } catch (error2) {
      console.error("\u274C Error declining call:", error2);
      alert("Failed to decline call. Please try again.");
    }
  };
  const handleEndCall = async () => {
    try {
      console.log("\u{1F6D1} Ending call:", activeCall?.meetingId);
      await authFetch("/api/calls/end", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          meetingId: activeCall?.meetingId
        })
      });
      setActiveCall(null);
      console.log("\u2705 Call ended successfully");
    } catch (error2) {
      console.error("\u274C Error ending call:", error2);
      alert("Failed to end call. Please try again.");
    }
  };
  if (workspaceLoading) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center h-screen bg-canvas" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-info mx-auto mb-4" }), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink mb-2" }, "Loading Workspace"), /* @__PURE__ */ React.createElement("p", { className: "text-dim" }, leadDetails?.name ? `Loading workspace for "${leadDetails.name}"` : "Preparing your collaborative workspace...")));
  }
  if (workspaceError) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center h-screen bg-canvas" }, /* @__PURE__ */ React.createElement("div", { className: "text-center max-w-md" }, /* @__PURE__ */ React.createElement("div", { className: "text-danger mb-4" }, /* @__PURE__ */ React.createElement("svg", { className: "h-16 w-16 mx-auto", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }))), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink mb-2" }, "Workspace Error"), /* @__PURE__ */ React.createElement("p", { className: "text-dim mb-4" }, workspaceError), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => navigate(-1),
        className: "bg-info text-white px-4 py-2 rounded-md hover:bg-info transition-colors"
      },
      "Go Back"
    )));
  }
  return /* @__PURE__ */ React.createElement(ToastProvider, null, /* @__PURE__ */ React.createElement(
    UploadProvider,
    {
      workspaceId,
      vendorId: currentUser?.vendorId || currentUser?.userId || currentUser?.id,
      taskId: selectedTask?.id,
      subtaskId: selectedSubtask?.id
    },
    /* @__PURE__ */ React.createElement("style", null, `
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            height: 100vh !important;
            width: 100vw !important;
          }
          #root {
            margin: 0 !important;
            padding: 0 !important;
            height: 100vh !important;
            width: 100vw !important;
          }
          * {
            box-sizing: border-box !important;
          }
          .workspace-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          /* Canvas-first: panel overlay transitions use transform for zero-layout-shift */
          .panel-overlay-left {
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .panel-overlay-left.visible {
            transform: translateX(0);
          }
          .panel-overlay-right {
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .panel-overlay-right.visible {
            transform: translateX(0);
          }
          /* Reduce motion support */
          @media (prefers-reduced-motion: reduce) {
            .panel-overlay-left, .panel-overlay-right {
              transition: none;
            }
          }
          /* Mobile safe area for bottom bar */
          .safe-area-pb {
            padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
          }
        `),
    /* @__PURE__ */ React.createElement("div", { className: "ws-shell" }, /* @__PURE__ */ React.createElement(
      WorkspaceTopBar,
      {
        workspace,
        userRole: detectedUserRole,
        isPM,
        isCAS,
        isClient: isClientUser,
        currentUser,
        syncStatus,
        lastSavedAt,
        workspaceCollaborators,
        onBackToDashboard: handleBackToDashboard,
        onRefresh: refetchWorkspace,
        onOpenTutorial: () => setShowTutorial(true),
        onToggleActivityDrawer: () => setRightPanelPinned((p) => !p),
        isActivityDrawerOpen: rightPanelPinned,
        unreadCount,
        notifications,
        onMarkNotificationAsRead: markNotificationAsRead,
        onNotificationClick: handleNotificationClick,
        onMarkAllNotificationsAsRead: markAllAsRead,
        onStartCall: handleStartCallClick,
        onManagePermissions: handleManagePermissions,
        onInviteVendors: handleInviteVendors,
        onInviteCAS: handleInviteCAS,
        onShareProgress: detectedUserRole === "pm" ? () => setShowShareModal(true) : void 0,
        onOpenPostServices: () => setShowPostServicesModal(true),
        onOpenAIBuilder: () => setShowAIBuilder(true),
        onOpenUpdateProgress: () => setShowUpdateProgressModal(true),
        onOpenReviewProgress: () => setShowReviewProgressModal(true),
        onShowProgress: () => setShowProgressTimelineModal(true),
        onOpenClientReviewProgress: () => setShowClientReviewProgressModal(true),
        onOpenProjectComplete: () => setShowProjectCompleteModal(true),
        onOpenDeletionHistory: () => setRightPanelPinned(true),
        isWorkspaceCompleted: workspace?.status === "completed",
        shouldDisableEditing
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "ws-body" }, isMobile && /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line flex items-center justify-around px-4 py-2 safe-area-pb" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMobileLeftOpen((p) => !p);
          setMobileRightOpen(false);
        },
        className: `flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mobileLeftOpen ? "bg-info/10 text-info" : "text-dim hover:bg-surface-hover"}`
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h7" })),
      /* @__PURE__ */ React.createElement("span", null, "Tasks")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setMobileRightOpen((p) => !p);
          setMobileLeftOpen(false);
        },
        className: `flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mobileRightOpen ? "bg-info/10 text-info" : "text-dim hover:bg-surface-hover"}`
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" })),
      /* @__PURE__ */ React.createElement("span", null, "Activity")
    )), isMobile && (mobileLeftOpen || mobileRightOpen) && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "fixed inset-0 bg-black/30 z-10",
        onClick: () => {
          setMobileLeftOpen(false);
          setMobileRightOpen(false);
        }
      }
    ), !isMobile && /* @__PURE__ */ React.createElement(
      WorkspaceDock,
      {
        activeTab: dockActiveTab,
        onSelectTab: handleSelectDockTabTextAware,
        isPanelOpen: isContextPanelOpen,
        activeToolId: isTextToolActive ? "text" : null
      }
    ), (!isMobile ? isContextPanelOpen : mobileLeftOpen) && /* @__PURE__ */ React.createElement(
      WorkspaceContextPanel,
      {
        isOpen: !isMobile ? isContextPanelOpen : mobileLeftOpen,
        activeTab: dockActiveTab,
        elementOptions,
        hasTurnkeyMember: hasTurnkeyCASMember,
        onClose: () => {
          if (isMobile)
            setMobileLeftOpen(false);
          else
            setIsContextPanelOpen(false);
        },
        tasks,
        selectedTask,
        selectedSubtask,
        onTaskClick: handleTaskClick,
        onSubtaskClick: handleSubtaskClick,
        onShowAddTaskModal: () => setShowAddTaskModal(true),
        onQuickAddTask: addTask,
        onRenameTask: renameTask,
        onUpdateTask: updateTaskDetails,
        memberOptions: taskMemberOptions,
        workspace,
        userRole: detectedUserRole,
        onLeaveWorkspace: handleLeaveWorkspace,
        canvasElements: canvasNodes,
        onZoomToElement: (elementId) => {
          const event = new CustomEvent("zoomToElement", { detail: { elementId } });
          document.dispatchEvent(event);
        },
        onWorkflowBuilderClick: handleWorkflowBuilderClick,
        onTemplateSelect: handleTemplateSelect,
        selectedTextElement,
        onUpdateTextElement: handleUpdateTextElement,
        onLaunchAgent: () => setShowAIBuilder(true)
      }
    ), /* @__PURE__ */ React.createElement("div", { className: `ws-canvas-area theme-${canvasTheme}`, "data-workspace-canvas": true }, /* @__PURE__ */ React.createElement(
      WorkspaceMain,
      {
        selectedTask,
        selectedSubtask,
        selectedLayer,
        selectedLayerItem,
        sidebarCollapsed: !isContextPanelOpen,
        zoomLevel,
        showElementsPanel,
        onBackToHome: handleBackToHome,
        onTaskClick: handleTaskClick,
        onBackToTask: handleBackToTask,
        onBackToLayer: handleBackToLayer,
        onSubtaskClick: handleSubtaskClick,
        onShowAddSubtaskModal: () => setShowAddSubtaskModal(true),
        onLayerItemClick: handleLayerItemClick,
        onToggleSidebars: toggleSidebars,
        onRenameSubtask: renameSubtask,
        onUpdateSubtask: updateSubtaskDetails,
        memberOptions: taskMemberOptions,
        workspace,
        onSaveWorkspace: saveWorkspace,
        onRefreshWorkspace: refetchWorkspace,
        tasks,
        onZoomChange: handleZoomChange,
        onCreateTask: addTask,
        onCreateSubtask: addSubtask,
        onActivityCreated: triggerActivityRefresh,
        userRole: detectedUserRole,
        userPermissions,
        canvasWebSocket,
        workspaceCollaborators,
        currentUser,
        focusMode,
        canvasTheme,
        highlightDay: progressDay
      }
    )), /* @__PURE__ */ React.createElement(
      WorkspaceRightSidebar,
      {
        sidebarCollapsed: !rightPanelVisible,
        selectedSubtask,
        selectedTask,
        recentActivities,
        messages,
        workspaceId,
        onActivityCreated: activityRefreshTrigger,
        workspace,
        userRole: detectedUserRole,
        notifications,
        unreadCount,
        isConnected,
        onMarkNotificationAsRead: markNotificationAsRead,
        onNotificationClick: handleNotificationClick,
        onMarkAllAsRead: markAllAsRead,
        canvasElements: canvasNodes,
        onZoomToElement: (elementId) => {
          const event = new CustomEvent("zoomToElement", { detail: { elementId } });
          document.dispatchEvent(event);
        },
        focusMode,
        isPinned: rightPanelPinned,
        onTogglePin: toggleRightPin,
        onMouseEnter: () => setRightPanelHover(true),
        onMouseLeave: () => setRightPanelHover(false)
      }
    )), /* @__PURE__ */ React.createElement(
      WorkspaceStatusBar,
      {
        elementCount: canvasNodes?.length || 0,
        syncStatus,
        lastSavedAt,
        zoomLevel,
        onZoomIn: () => window.canvasWorkspaceRef?.current?.zoomIn?.(),
        onZoomOut: () => window.canvasWorkspaceRef?.current?.zoomOut?.(),
        onFitView: () => window.canvasWorkspaceRef?.current?.fitView?.(),
        canvasTheme,
        onSelectCanvasTheme: setCanvasTheme,
        onLeaveWorkspace: handleLeaveWorkspace
      }
    )),
    /* @__PURE__ */ React.createElement(
      ShareProgressModal,
      {
        isOpen: showShareModal,
        onClose: () => setShowShareModal(false),
        workspace,
        userRole: detectedUserRole
      }
    ),
    /* @__PURE__ */ React.createElement(
      WorkspaceTutorialModal,
      {
        isOpen: showTutorial,
        onClose: () => setShowTutorial(false)
      }
    ),
    /* @__PURE__ */ React.createElement(
      AddTaskModal,
      {
        isOpen: showAddTaskModal,
        onClose: () => setShowAddTaskModal(false),
        onAddTask: addTask,
        memberOptions: taskMemberOptions
      }
    ),
    /* @__PURE__ */ React.createElement(
      AddSubtaskModal,
      {
        isOpen: showAddSubtaskModal,
        onClose: () => setShowAddSubtaskModal(false),
        onAddSubtask: addSubtask,
        parentTaskName: selectedTask?.name,
        existingSubtasks: selectedTask?.subtasks || [],
        memberOptions: taskMemberOptions
      }
    ),
    /* @__PURE__ */ React.createElement(
      ElementsSidebar,
      {
        isOpen: showElementsSidebar,
        onClose: () => setShowElementsSidebar(false),
        onElementSelect: handleElementSelect,
        userRole: detectedUserRole,
        currentUser,
        elementOptions,
        hasTurnkeyMember: hasTurnkeyCASMember
      }
    ),
    showElementsPanel && /* @__PURE__ */ React.createElement(
      ElementsPanel,
      {
        selectedCategory,
        elementOptions,
        onClose: () => {
          setShowElementsPanel(false);
          setShowElementsSidebar(true);
        },
        onBackToCategories: () => {
          setShowElementsPanel(false);
          setShowElementsSidebar(true);
        },
        onDocumentClick: handleDocumentClick
      }
    ),
    /* @__PURE__ */ React.createElement(
      LayoutsPanel,
      {
        isOpen: showLayoutsPanel,
        onClose: () => setShowLayoutsPanel(false)
      }
    ),
    /* @__PURE__ */ React.createElement(
      TextPanel,
      {
        isOpen: showTextPanel,
        onClose: () => setShowTextPanel(false),
        selectedTextElement,
        onUpdateTextElement: handleUpdateTextElement
      }
    ),
    /* @__PURE__ */ React.createElement(
      ManageBOQModal,
      {
        isOpen: showManageBOQModal,
        onClose: () => setShowManageBOQModal(false),
        onTablesExtracted: (tables) => {
          console.log("BOQ tables extracted from template modal:", tables);
        }
      }
    ),
    /* @__PURE__ */ React.createElement(
      CustomBOQModal,
      {
        isOpen: showCustomBOQModal,
        onClose: () => setShowCustomBOQModal(false)
      }
    ),
    /* @__PURE__ */ React.createElement(
      ProcurementRFQModal,
      {
        isOpen: showProcurementRFQModal,
        onClose: () => setShowProcurementRFQModal(false),
        workspaceId,
        workspace,
        currentUser,
        onSubmitted: (rfqPayload) => {
          const canvasRef = window?.canvasWorkspaceRef?.current;
          if (canvasRef?.addProcurementRFQNode) {
            canvasRef.addProcurementRFQNode(rfqPayload);
          } else {
            sessionStorage.setItem("pendingProcurementRFQNode", JSON.stringify({ payload: rfqPayload }));
            document.dispatchEvent(new CustomEvent("addProcurementRFQNode", {
              detail: rfqPayload
            }));
          }
          triggerActivityRefresh();
        }
      }
    ),
    /* @__PURE__ */ React.createElement(
      ExecutionRequestModal,
      {
        isOpen: showExecutionRequestModal,
        onClose: () => setShowExecutionRequestModal(false),
        templateType: executionTemplateType,
        workspace,
        currentUser,
        onSubmitted: async (executionPayload) => {
          const canvasRef = window?.canvasWorkspaceRef?.current;
          if (canvasRef?.addExecutionRequestNode) {
            await canvasRef.addExecutionRequestNode(executionPayload);
          } else {
            sessionStorage.setItem("pendingExecutionRequestNode", JSON.stringify({ payload: executionPayload }));
            document.dispatchEvent(new CustomEvent("addExecutionRequestNode", {
              detail: executionPayload
            }));
          }
          triggerActivityRefresh();
        }
      }
    ),
    /* @__PURE__ */ React.createElement(
      WorkflowBuilderModal,
      {
        isOpen: showWorkflowBuilderModal,
        onClose: () => setShowWorkflowBuilderModal(false),
        workspaceId,
        currentUser,
        workspaceName: workspace?.title || workspace?.projectName || "Current Workspace"
      }
    ),
    /* @__PURE__ */ React.createElement(
      PostServicesModal,
      {
        isOpen: showPostServicesModal,
        onClose: () => {
          setShowPostServicesModal(false);
          console.log("\u{1F4E5} Post Services modal closed, refreshing workspace...");
          setTimeout(() => refetchWorkspace(), 500);
        },
        currentUser,
        workspaceId,
        subtaskId: selectedSubtask?.id,
        taskId: selectedTask?.id,
        selectedSubtask,
        workspace,
        onWorkspaceUpdate: refetchWorkspace
      }
    ),
    /* @__PURE__ */ React.createElement(
      UpdateProgressModal,
      {
        isOpen: showUpdateProgressModal,
        onClose: () => setShowUpdateProgressModal(false),
        workspaceId,
        projectId: workspace?.projectId || "",
        taskId: selectedTask?.id || "",
        subtaskId: selectedSubtask?.id || "",
        tasks: workspace?.tasks || [],
        workspace,
        onUpdate: (updatedData) => {
          console.log("Progress updated:", updatedData);
        }
      }
    ),
    /* @__PURE__ */ React.createElement(
      ReviewProgressModal,
      {
        isOpen: showReviewProgressModal,
        onClose: () => {
          setShowReviewProgressModal(false);
          setTimeout(() => refetchWorkspace(), 500);
        },
        workspace,
        userRole
      }
    ),
    /* @__PURE__ */ React.createElement(
      ProgressTimelineModal,
      {
        isOpen: showProgressTimelineModal,
        onClose: () => setShowProgressTimelineModal(false),
        workspace: workspaceForProgress,
        workspaceId
      }
    ),
    /* @__PURE__ */ React.createElement(
      DayReportModal,
      {
        isOpen: Boolean(reportDay),
        onClose: () => setReportDay(null),
        workspace: workspaceForProgress,
        workspaceId,
        date: reportDay?.date,
        dates: reportDay?.dates,
        dayLabel: reportDay?.label,
        generatedBy: currentUser?.name || currentUser?.email
      }
    ),
    /* @__PURE__ */ React.createElement(
      ProgressSidebar,
      {
        open: showProgressSidebar,
        onClose: () => {
          setShowProgressSidebar(false);
          setProgressDay(null);
        },
        workspace: workspaceForProgress,
        selectedDay: progressDay,
        onSelectDay: (day) => {
          setProgressDay(day);
          if (!day)
            return;
          const dayMatches = (n) => {
            if (!n?.data?.addedAt)
              return false;
            const d = new Date(n.data.addedAt);
            return !isNaN(d) && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === day;
          };
          for (const task of workspaceForProgress?.tasks || []) {
            for (const sub of task?.subtasks || []) {
              if ((sub?.canvasData?.nodes || []).some(dayMatches)) {
                setSelectedTask(task);
                setSelectedSubtask(sub);
                return;
              }
            }
          }
        },
        onOpenReport: (d) => setReportDay({ date: d.date ?? null, dates: d.dates ?? null, label: d.label })
      }
    ),
    /* @__PURE__ */ React.createElement(
      ReviewProgressModal,
      {
        isOpen: showClientReviewProgressModal,
        onClose: () => {
          setShowClientReviewProgressModal(false);
          setTimeout(() => refetchWorkspace(), 500);
        },
        workspace,
        userRole: "client"
      }
    ),
    /* @__PURE__ */ React.createElement(
      ProjectCompleteModal,
      {
        isOpen: showProjectCompleteModal,
        onClose: () => setShowProjectCompleteModal(false),
        workspace,
        userRole,
        isPM,
        isClient: isClientUser
      }
    ),
    showInvoiceTool && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 bg-surface" }, /* @__PURE__ */ React.createElement(
      InvoiceToolReplica,
      {
        onClose: () => navigate(location.pathname.replace("/invoices", "")),
        workspaceId,
        workspaceName: workspaceDisplayName,
        selectedTask,
        selectedSubtask
      }
    )),
    /* @__PURE__ */ React.createElement(
      PermissionsModal,
      {
        isOpen: showPermissionsModal,
        onClose: () => setShowPermissionsModal(false),
        workspace,
        onUpdatePermissions: (updatedPermissions) => {
          setWorkspace((prev) => ({
            ...prev,
            accessControl: {
              ...prev.accessControl,
              permissions: updatedPermissions
            }
          }));
        }
      }
    ),
    /* @__PURE__ */ React.createElement(
      InviteCASModal,
      {
        isOpen: showInviteCASModal,
        onClose: () => setShowInviteCASModal(false),
        workspace,
        onInviteSuccess: handleCASInviteSuccess
      }
    ),
    /* @__PURE__ */ React.createElement(
      InviteVendorsModal,
      {
        isOpen: showInviteVendorsModal,
        onClose: () => setShowInviteVendorsModal(false),
        workspace,
        onInviteSuccess: handleVendorInviteSuccess
      }
    ),
    /* @__PURE__ */ React.createElement(
      CostCalculatorsModal,
      {
        isOpen: showCostCalculatorsModal,
        onClose: () => setShowCostCalculatorsModal(false),
        onAddToCanvas: (calculatorData) => {
          const elementData = {
            type: calculatorData.type,
            id: calculatorData.id,
            name: calculatorData.name,
            data: calculatorData.data,
            preview: calculatorData.name
          };
          const event = new CustomEvent("elementFromCalculator", {
            detail: elementData
          });
          document.dispatchEvent(event);
          console.log("\u{1F4CA} Calculator added to canvas:", calculatorData);
        },
        workspaceId
      }
    ),
    !activeCall && /* @__PURE__ */ React.createElement(
      StartCallModal,
      {
        isOpen: showStartCallModal,
        onClose: () => setShowStartCallModal(false),
        workspaceId,
        currentUser,
        collaborators: workspaceCollaborators,
        onStartCall: handleStartCallSubmit
      }
    ),
    !activeCall && notifications?.map((notification) => {
      console.log("\u{1F50D} Checking notification:", {
        type: notification.type,
        id: notification.id,
        processed: processedCallNotifications.has(notification.id),
        activeCall
      });
      if (notification.type === "call_invitation" && !processedCallNotifications.has(notification.id)) {
        console.log("\u2705 Rendering IncomingCallNotification for:", notification.id);
        return /* @__PURE__ */ React.createElement(
          IncomingCallNotification,
          {
            key: notification.id,
            notification,
            onAccept: () => handleAcceptCall(notification),
            onDecline: () => handleDeclineCall(notification),
            currentUser
          }
        );
      }
      return null;
    }),
    activeCall && /* @__PURE__ */ React.createElement(
      ActiveCallInterface,
      {
        call: activeCall,
        currentUser,
        onEndCall: handleEndCall
      }
    ),
    /* @__PURE__ */ React.createElement(
      CommandPalette,
      {
        isOpen: showCommandPalette,
        onClose: () => setShowCommandPalette(false),
        commands: paletteCommands
      }
    ),
    /* @__PURE__ */ React.createElement(
      AICanvasBuilderModal,
      {
        isOpen: showAIBuilder,
        onClose: () => setShowAIBuilder(false),
        canvasElements: canvasNodes
      }
    ),
    /* @__PURE__ */ React.createElement(
      KeyboardShortcutsOverlay,
      {
        isOpen: showShortcutsOverlay,
        onClose: () => setShowShortcutsOverlay(false)
      }
    )
  ));
};
var WorkspacePage_default = WorkspacePage;
export {
  WorkspacePage_default as default
};
