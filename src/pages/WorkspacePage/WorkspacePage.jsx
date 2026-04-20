import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  TemplatesPanel
} from './components';
import { Sparkles, FileText, Calendar, CheckCircle, StickyNote, ClipboardCheck, PanelLeft, PanelRight, Maximize2, ZoomIn, Eye, Layout, HelpCircle, Keyboard } from 'lucide-react';
import ManageBOQModal from './components/ManageBOQModal';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcutsOverlay from './components/KeyboardShortcutsOverlay';
import { ToastProvider } from './components/ToastProvider';
import { UploadProvider } from './components/forms/UploadManager';
import { VendorContext } from '../../context/VendorContext';
import InvoiceToolReplica from './components/InvoiceToolReplica';
import RoleBasedHeader from './components/RoleBasedHeader';
import { PostServicesModal } from './components/modals/PostServices';
import UpdateProgressModal from './components/modals/UpdateProgressModal';
import ReviewProgressModal from './components/modals/ReviewProgressModal';
import ProjectCompleteModal from './components/modals/ProjectCompleteModal';
import PermissionsModal from './components/PermissionsModal';
import InviteCASModal from './components/InviteCASModal';
import CostCalculatorsModal from './components/modals/CostCalculatorsModal';
import useWebSocketNotifications from '../../hooks/useWebSocketNotifications';
import useCanvasWebSocket from '../../hooks/useCanvasWebSocket';
import StartCallModal from './components/modals/StartCallModal';
import IncomingCallNotification from './components/modals/IncomingCallNotification';
import ActiveCallInterface from './components/modals/ActiveCallInterface';
import ProcurementRFQModal from './components/modals/ProcurementRFQModal';
import ExecutionRequestModal from './components/modals/ExecutionRequestModal';
import WorkflowBuilderModal from './components/modals/WorkflowBuilderModal';
import useVideoCall from '../../hooks/useVideoCall';
import config from '../../config/env';
import authFetch from '../../utils/authFetch';

const WorkspacePage = () => {
  const COMPACT_WORKSPACE_BREAKPOINT = 768;
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const location = useLocation();
  const vendorContextValue = useContext(VendorContext);
  const { currentUser, setUser } = vendorContextValue;
  
  // Enhanced PM and CAS detection for cross-origin access
  const urlParams = new URLSearchParams(location.search);
  const urlUserRole = urlParams.get('userRole');
  const urlPmId = urlParams.get('pmId');
  const urlUserId = urlParams.get('userId');
  const urlUserName = urlParams.get('userName');
  const urlUserEmail = urlParams.get('userEmail');
  
  // Check sessionStorage for PM user data (from PM dashboard)
  const storedPmUser = sessionStorage.getItem('pmUser');
  let pmUserFromStorage = null;
  
  try {
    if (storedPmUser) {
      pmUserFromStorage = JSON.parse(storedPmUser);
    }
  } catch (e) {
    console.error('Error parsing stored user data:', e);
  }
  
  // Comprehensive PM detection
  const isPM = urlUserRole === 'pm' ||
               urlPmId ||
               pmUserFromStorage?.role === 'pm' ||
               pmUserFromStorage?.accessedFrom === 'pm-dashboard' ||
               currentUser?.role === 'pm' || 
               currentUser?.pmId || 
               currentUser?.email?.includes('pm') ||
               location.state?.userRole === 'pm';
  
  // CAS user detection
  const isCAS = urlUserRole === 'cas' && Boolean(urlUserId);
  

  
  // Create CAS user object if accessing as CAS
  const casUser = isCAS ? {
    userId: urlUserId,
    name: urlUserName ? decodeURIComponent(urlUserName) : 'CAS User',
    email: urlUserEmail ? decodeURIComponent(urlUserEmail) : '',
    role: 'cas',
    accessedFrom: 'trunky-dashboard'
  } : null;

  // Client detection will be done after workspace loads (in useState and useEffect)
  // For now, initialize with basic role logic
  const userRole = urlUserRole || 
                   location.state?.userRole || 
                   (pmUserFromStorage?.role === 'pm' ? 'pm' : null) ||
                   (isCAS ? 'cas' : null) ||
                   (isPM ? 'pm' : 'vendor');

  const getAuthToken = useCallback(() => (
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    ''
  ), []);

  const buildAuthHeaders = useCallback((baseHeaders = {}) => {
    const headers = { ...baseHeaders };
    const token = getAuthToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [getAuthToken]);
  

  
  // Memoize PM user creation to prevent unnecessary re-renders
  const pmUserFromUrl = useMemo(() => {
    if (urlUserRole === 'pm' && urlPmId) {
      return {
        id: urlPmId,
        pmId: urlPmId,
        name: 'Project Manager',
        email: 'pm@construction.com',
        role: 'pm',
        accessedFrom: 'pm-dashboard',
        timestamp: Date.now()
      };
    }
    return null;
  }, [urlUserRole, urlPmId]);

  // Update current user if PM or CAS data is available from storage OR URL parameters
  useEffect(() => {
    if (pmUserFromStorage && !currentUser?.role) {
      setUser(pmUserFromStorage);
    } else if (pmUserFromUrl && !currentUser?.role) {
      setUser(pmUserFromUrl);
    } else if (casUser && !currentUser?.role) {
      setUser(casUser);
    }
  }, [pmUserFromStorage, pmUserFromUrl, casUser, currentUser?.role, setUser]);

  // WebSocket notifications hook
  const userId = currentUser?.id || currentUser?.userId || currentUser?.pmId || currentUser?.vendorId;
  const userType = currentUser?.role || 'vendor';
  const {
    notifications,
    unreadCount,
    isConnected,
    markNotificationAsRead,
    markAllAsRead,
    fetchNotifications
  } = useWebSocketNotifications(userId, userType);

  // Canvas WebSocket hook for real-time collaboration
  const canvasWebSocket = useCanvasWebSocket(workspaceId, currentUser, {
    enabled: !!workspaceId && !!currentUser,
  });
  
  // Debug logging (only when needed)
  if (!currentUser) {
    console.log('🔍 WORKSPACE PAGE - User role detection:', {
      currentUser,
      detectedRole: userRole,
      isPM,
      workspaceId
    });
  }
  
  // Get lead/project data from navigation state
  const { leadId, leadDetails, workspaceId: stateWorkspaceId } = location.state || {};
  
  // Workspace state
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [canvasNodes, setCanvasNodes] = useState([]);
  
  // User role state (detected dynamically including client detection)
  const [detectedUserRole, setDetectedUserRole] = useState(userRole);
  const [detectedClientId, setDetectedClientId] = useState(null);
  
  // ── Focus-mode layout state (canvas-first UX) ──────────────────────
  // Persist per-workspace so each workspace remembers its layout
  const layoutKey = `ws-layout-${workspaceId}`;
  const savedLayout = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(layoutKey)) || {}; } catch { return {}; }
  }, [layoutKey]);

  // Mobile/touch detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < COMPACT_WORKSPACE_BREAKPOINT);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < COMPACT_WORKSPACE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [COMPACT_WORKSPACE_BREAKPOINT]);

  const [focusMode, setFocusMode] = useState(() => savedLayout.focusMode !== false); // ON by default
  const [leftPanelPinned, setLeftPanelPinned] = useState(() => !!savedLayout.leftPinned);
  const [rightPanelPinned, setRightPanelPinned] = useState(() => !!savedLayout.rightPinned);
  const [leftPanelHover, setLeftPanelHover] = useState(false);
  const [rightPanelHover, setRightPanelHover] = useState(false);
  // Mobile: explicit toggle instead of hover
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // NOTE: Derived panel visibility is computed below, after selectedTask is declared

  // Persist layout prefs
  useEffect(() => {
    localStorage.setItem(layoutKey, JSON.stringify({
      focusMode,
      leftPinned: leftPanelPinned,
      rightPinned: rightPanelPinned,
    }));
  }, [layoutKey, focusMode, leftPanelPinned, rightPanelPinned]);

  // UI state
  const [activeTab, setActiveTab] = useState('Task');
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

  // Function to trigger activity refresh (memoized)
  const triggerActivityRefresh = useCallback(() => {
    console.log('🔄 WorkspacePage: Triggering activity refresh');
    setActivityRefreshTrigger(prev => prev + 1);
  }, []);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedSubtask, setSelectedSubtask] = useState(null);

  // Derived panel visibility (must be after selectedTask declaration)
  const needsTaskSelection = !selectedTask;
  const leftPanelVisible = isMobile
    ? mobileLeftOpen
    : (needsTaskSelection || !focusMode || leftPanelPinned || leftPanelHover);
  const rightPanelVisible = isMobile
    ? mobileRightOpen
    : (!focusMode || rightPanelPinned || rightPanelHover);
  const sidebarCollapsed = isMobile ? !mobileLeftOpen : (!needsTaskSelection && focusMode && !leftPanelPinned && !leftPanelHover);

  // sidebarCollapsed is now derived from focusMode state above
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [selectedLayerItem, setSelectedLayerItem] = useState(null);
  const [showElementsSidebar, setShowElementsSidebar] = useState(false);
  const [showElementsPanel, setShowElementsPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showLayoutsPanel, setShowLayoutsPanel] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [showInvoiceTool, setShowInvoiceTool] = useState(false);
  const [selectedTextElement, setSelectedTextElement] = useState(null);
  const [showManageBOQModal, setShowManageBOQModal] = useState(false);
  const [showProcurementRFQModal, setShowProcurementRFQModal] = useState(false);
  const [showExecutionRequestModal, setShowExecutionRequestModal] = useState(false);
  const [showWorkflowBuilderModal, setShowWorkflowBuilderModal] = useState(false);
  const [executionTemplateType, setExecutionTemplateType] = useState('execution-work-order');
  const [showPostServicesModal, setShowPostServicesModal] = useState(false);
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  const [showReviewProgressModal, setShowReviewProgressModal] = useState(false);
  const [showClientReviewProgressModal, setShowClientReviewProgressModal] = useState(false);
  const [showProjectCompleteModal, setShowProjectCompleteModal] = useState(false);
  const [showCostCalculatorsModal, setShowCostCalculatorsModal] = useState(false);
  
  // Video call states
  const [showStartCallModal, setShowStartCallModal] = useState(false);
  const [processedCallNotifications, setProcessedCallNotifications] = useState(new Set());
  const [workspaceCollaborators, setWorkspaceCollaborators] = useState([]);
  
  // Video call hooks
  const { startCall, joinCall, activeCall: callState } = useVideoCall();
  const [activeCall, setActiveCall] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Listen for text element selection from canvas
  useEffect(() => {
    const handleSelectTextElement = (event) => {
      const textElement = event.detail;
      console.log('🎯 Text element selected from canvas:', textElement);
      setSelectedTextElement(textElement);
      // Optionally open the text panel
      if (!showTextPanel) {
        setShowTextPanel(true);
      }
    };

    document.addEventListener('selectTextElement', handleSelectTextElement);
    return () => document.removeEventListener('selectTextElement', handleSelectTextElement);
  }, [showTextPanel]);

  // Debug: Log notifications array whenever it changes
  useEffect(() => {
    console.log('📬 Notifications updated:', {
      total: notifications?.length || 0,
      notifications: notifications,
      callInvitations: notifications?.filter(n => n.type === 'call_invitation') || [],
      activeCall,
      processedCount: processedCallNotifications.size,
      userId: currentUser?.id || currentUser?.userId,
      isConnected
    });
  }, [notifications, activeCall, processedCallNotifications, currentUser, isConnected]);
  
  // Refetch workspace data (for use after updates) - MUST be defined before useEffects that use it
  const refetchWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    
    try {
      console.log('🔄 Refetching workspace data...');
      const response = await authFetch(`/api/workspaces/${workspaceId}`, {
        headers: buildAuthHeaders()
      });
      if (response.ok) {
        const freshWorkspaceData = await response.json();
        setWorkspace(freshWorkspaceData);
        
        // Keep selectedTask/selectedSubtask in sync
        if (selectedTask?.id && selectedSubtask?.id && Array.isArray(freshWorkspaceData?.tasks)) {
          const updatedTask = freshWorkspaceData.tasks.find(t => t.id === selectedTask.id);
          const updatedSubtask = updatedTask?.subtasks?.find(s => s.id === selectedSubtask.id);
          if (updatedTask) setSelectedTask(updatedTask);
          if (updatedSubtask) setSelectedSubtask(updatedSubtask);
        }
        
        console.log('✅ Workspace data refreshed');
        return freshWorkspaceData;
      }
    } catch (error) {
      console.error('❌ Failed to refetch workspace:', error);
    }
  }, [workspaceId, selectedTask, selectedSubtask, buildAuthHeaders]);
  
  // Listen for workspace unlock notifications and refresh workspace data
  useEffect(() => {
    const unlockNotifications = notifications?.filter(n => 
      n.type === 'workspace_unlocked' && 
      n.workspaceId === workspaceId &&
      !n.read
    ) || [];
    
    if (unlockNotifications.length > 0) {
      console.log('🔓 Workspace unlock notification received, refreshing workspace data...');
      refetchWorkspace();
      
      // Mark notifications as read
      unlockNotifications.forEach(notification => {
        if (markNotificationAsRead) {
          markNotificationAsRead(notification.notificationId);
        }
      });
    }
  }, [notifications, workspaceId, refetchWorkspace, markNotificationAsRead]);
  
  // Polling fallback: For vendors on completed workspaces, poll for updates every 30 seconds
  useEffect(() => {
    const isVendor = userRole === 'vendor';
    const isCompleted = workspace?.status === 'completed' || workspace?.status === 'project completed';
    
    if (isVendor && isCompleted && workspaceId) {
      console.log('🔄 Setting up polling for completed workspace (fallback for WebSocket)');
      
      const pollInterval = setInterval(() => {
        console.log('⏰ Polling workspace for unlock updates...');
        refetchWorkspace();
      }, 30000); // Poll every 30 seconds
      
      return () => {
        console.log('🛑 Stopping workspace polling');
        clearInterval(pollInterval);
      };
    }
  }, [workspace?.status, userRole, workspaceId, refetchWorkspace]);

  // Check if we should show invoice tool based on URL
  useEffect(() => {
    if (location.pathname.includes('/invoices')) {
      setShowInvoiceTool(true);
    }
  }, [location.pathname]);

  // Fetch invoices and quotes data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.vendorId) {
        console.log('⏳ Waiting for vendorId...');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Prepare headers with user info
        // Use clientId if available (when user is a client), otherwise use vendorId
        const userId = detectedClientId || currentUser.vendorId;
        const userRole = detectedClientId ? 'client' : 'vendor';
        
        const headers = {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify({
            vendorId: currentUser.vendorId,
            clientId: detectedClientId || undefined,
            email: currentUser?.email,
            role: userRole,
            name: currentUser?.name
          }),
          'x-user-role': userRole
        };
        
        console.log('🔑 Using', userRole, 'ID:', userId);
        
        // Fetch invoices
        const invoicesRes = await fetch(`/api/workspace/invoices?vendorId=${userId}`, {
          headers: headers
        });
        
        if (!invoicesRes.ok) {
          const errorData = await invoicesRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch invoices');
        }
        
        const invoicesData = await invoicesRes.json();
        console.log('📊 Invoices data:', invoicesData);
        setInvoices(invoicesData.data || []);
        
        // Fetch quotes (using quotations endpoint to match other components)
        const quotesRes = await fetch(`/api/workspace/quotations?vendorId=${currentUser.vendorId}`, {
          headers: headers
        });
        
        if (!quotesRes.ok) {
          const errorData = await quotesRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch quotes');
        }
        
        const quotesData = await quotesRes.json();
        console.log('📊 Quotes data:', quotesData);
        setQuotes(quotesData.data || []);
        
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser?.vendorId, detectedClientId]);

  // Helper function to get status color
  const getStatusColor = (status = '') => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('paid') || statusLower.includes('approved')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('pending') || statusLower.includes('draft')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower.includes('rejected') || statusLower.includes('overdue')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Transform API data to match the expected format for elementOptions
  const transformToElementOptions = useCallback((invoices, quotes) => {
    const invoiceItems = (invoices || []).map(invoice => ({
      id: invoice.id || `invoice-${invoice.invoiceId}`,
      name: invoice.displayInvoiceId ? `Tax Invoice #${invoice.displayInvoiceId}` : `Tax Invoice ${invoice.id}`,
      type: 'invoice',
      preview: 'Tax Invoice',
      date: invoice.date || 'N/A',
      amount: invoice.totalAmount || '₹0.00',
      status: invoice.status || 'Pending',
      statusColor: getStatusColor(invoice.status),
      ...invoice
    }));

    const quoteItems = (quotes || []).map(quote => ({
      id: quote.id || `quote-${quote.quotationId}`,
      name: quote.displayQuoteId ? `Quotation #${quote.displayQuoteId}` : `Quotation ${quote.id}`,
      type: 'quotation',
      preview: 'Project Quotation',
      date: quote.date || 'N/A',
      amount: quote.totalAmount || '₹0.00',
      status: quote.status || 'Draft',
      statusColor: getStatusColor(quote.status),
      ...quote
    }));

    return [...invoiceItems, ...quoteItems].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  }, []);

  // Define element options with real data
  const elementOptions = useMemo(() => ({
    'invoices-quotes': transformToElementOptions(invoices, quotes),
    smart: {
      name: 'Smart Elements',
      icon: <Sparkles className="w-5 h-5" />,
      elements: [
        { 
          id: 'smart-note', 
          name: 'Smart Note', 
          type: 'smart-note', 
          preview: 'AI-powered sticky note with smart actions',
          icon: <StickyNote className="w-4 h-4 mr-2 text-yellow-600" />,
          color: 'bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200',
          nodeType: 'smartNote',
          data: { label: 'Smart Note' }
        },
        { 
          id: 'calendar-event', 
          name: 'Calendar Event', 
          type: 'calendar-event', 
          preview: 'Schedule meetings and send invites',
          icon: <Calendar className="w-4 h-4 mr-2 text-blue-600" />,
          color: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
          nodeType: 'calendarNode',
          data: { label: 'Calendar Event' }
        },
        { 
          id: 'approval-board', 
          name: 'Approval Board', 
          type: 'approval-board', 
          preview: 'Track and manage approval workflows',
          icon: <ClipboardCheck className="w-4 h-4 mr-2 text-green-600" />,
          color: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
          nodeType: 'approvalBoard',
          data: { label: 'Approval Board' }
        },
        { 
          id: 'ai-helper', 
          name: 'AI Helper', 
          type: 'ai-helper', 
          preview: 'Summarize, suggest next steps, or generate flows with AI',
          icon: <Sparkles className="w-4 h-4 mr-2 text-purple-600" />,
          color: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
          nodeType: 'aiHelper',
          data: { label: 'AI Helper' }
        }
      ]
    },
    turnkey: {
      name: 'Turnkey',
      elements: [
        { id: 'turnkey-workflow', name: 'Turnkey Workflow', type: 'turnkey-workflow', preview: 'Complete workflow visualization with tasks, resources, and status tracking' }
      ]
    },
    forms: {
      name: 'Forms',
      elements: [
        { id: 'textarea', name: 'TextArea', type: 'textarea', preview: 'Large text input area' },
        { id: 'textbox', name: 'TextBox', type: 'input', preview: 'Single line text input' },
        { id: 'input', name: 'Input', type: 'input', preview: 'Generic input field' },
        { id: 'radio', name: 'Select one', type: 'radio', preview: 'Radio button selection' },
        { id: 'checkbox', name: 'Select Many', type: 'checkbox', preview: 'Multiple choice selection' },
        { id: 'dropdown', name: 'Dropdown', type: 'select', preview: 'Select from options' },
        { id: 'button', name: 'Button', type: 'button', preview: 'Action button' }
      ]
    },
    'image-block': {
      name: 'Image Block',
      elements: [
        {
          id: 'image-block-basic',
          name: 'Image Block',
          type: 'image-block',
          preview: 'Upload and annotate project visuals',
          imageBlockData: {
            imageUrl: '',
            caption: 'South elevation – week 6 progress',
            timestamp: '2025-11-20 10:30',
            geotag: '12.9716° N, 77.5946° E',
            annotations: [
              { id: 'ann-1', text: 'Facade glazing completed', position: 'top-left' },
              { id: 'ann-2', text: 'Landscape pending', position: 'bottom-right' }
            ],
            width: 80
          }
        }
      ]
    },
    'task-card': {
      name: 'Task Cards',
      elements: [
        {
          id: 'task-card-basic',
          name: 'Task Card',
          type: 'task-card',
          preview: 'Jira-style tracker for daily work',
          taskCardData: {
            title: 'Prepare kickoff deck',
            description: 'Compile agenda, assign speakers, and share pre-read with stakeholders.',
            status: 'todo',
            assignedTo: 'Alex Johnson',
            priority: 'high',
            dueDate: '',
            checklists: [
              { id: 'tc-basic-1', text: 'Outline key topics', completed: true },
              { id: 'tc-basic-2', text: 'Collect collateral', completed: false },
              { id: 'tc-basic-3', text: 'Share draft for review', completed: false }
            ],
            attachments: [],
            comments: [
              {
                id: 'tc-basic-comment-1',
                author: 'Alex Johnson',
                text: 'Waiting on inputs from finance.',
                timestamp: '2025-11-18 14:22'
              }
            ],
            dependencies: ['Finalize project scope'],
            labels: ['Kickoff', 'Client'],
            activityLog: [
              {
                id: 'tc-basic-activity-1',
                action: 'Task created',
                meta: { by: 'Alex Johnson' },
                timestamp: '2025-11-17 09:30'
              },
              {
                id: 'tc-basic-activity-2',
                action: 'Checklist updated',
                meta: { item: 'Outline key topics', completed: true },
                timestamp: '2025-11-17 15:45'
              }
            ]
          }
        },
        {
          id: 'task-card-progress',
          name: 'Task Card with Progress',
          type: 'task-card-progress',
          preview: 'Task card showing progress and due date',
          taskCardData: {
            title: 'Implement vendor portal UI',
            description: 'Finish responsive layout for workspace canvas and finalize QA notes.',
            status: 'in-progress',
            assignedTo: 'Priya Patel',
            priority: 'critical',
            dueDate: '2025-11-30',
            checklists: [
              { id: 'tc-progress-1', text: 'Design review sign-off', completed: true },
              { id: 'tc-progress-2', text: 'Implement task card block', completed: true },
              { id: 'tc-progress-3', text: 'Cross-browser QA', completed: false }
            ],
            attachments: [
              { id: 'tc-progress-attach-1', name: 'ui-spec.pdf', size: 245760 },
              { id: 'tc-progress-attach-2', name: 'jira-export.xlsx', size: 512000 }
            ],
            comments: [
              {
                id: 'tc-progress-comment-1',
                author: 'Priya Patel',
                text: 'Need confirmation on responsive breakpoints.',
                timestamp: '2025-11-19 10:05'
              },
              {
                id: 'tc-progress-comment-2',
                author: 'Rahul Verma',
                text: 'Backend API is ready for integration.',
                timestamp: '2025-11-19 18:42'
              }
            ],
            dependencies: ['Finalize design system tokens', 'API contract v2.1'],
            labels: ['Sprint 11', 'Frontend', 'High impact'],
            activityLog: [
              {
                id: 'tc-progress-activity-1',
                action: 'Status updated',
                meta: { status: 'In-Progress' },
                timestamp: '2025-11-18 11:02'
              },
              {
                id: 'tc-progress-activity-2',
                action: 'Assignee changed',
                meta: { assignee: 'Priya Patel' },
                timestamp: '2025-11-18 13:26'
              },
              {
                id: 'tc-progress-activity-3',
                action: 'Attachment added',
                meta: { file: 'ui-spec.pdf' },
                timestamp: '2025-11-19 09:15'
              }
            ]
          }
        }
      ]
    },
    tables: {
      name: 'Tables',
      elements: [
        { id: 'basic-table', name: 'Basic Table', type: 'table', preview: 'Simple data table' },
        { id: 'data-table', name: 'Data Table', type: 'table', preview: 'Advanced data table' },
        { id: 'pivot-table', name: 'Pivot Table', type: 'table', preview: 'Pivot analysis table' },
        { id: 'calendar', name: 'Calendar', type: 'calendar', preview: 'Date picker calendar' }
      ]
    },
    charts: {
      name: 'Charts',
      elements: [
        { id: 'bar-chart', name: 'Bar Chart', type: 'chart', preview: 'Vertical bar chart' },
        { id: 'line-chart', name: 'Line Chart', type: 'chart', preview: 'Trend line chart' },
        { id: 'pie-chart', name: 'Pie Chart', type: 'chart', preview: 'Circular data chart' },
        { id: 'area-chart', name: 'Area Chart', type: 'chart', preview: 'Filled area chart' },
        { id: 'scatter-plot', name: 'Scatter Plot', type: 'chart', preview: 'Data point scatter' }
      ]
    },
    icons: {
      name: 'Icons',
      elements: [
        { id: 'basic-icons', name: 'Basic Icons', type: 'icon', preview: 'Simple icon set' },
        { id: 'social-icons', name: 'Social Icons', type: 'icon', preview: 'Social media icons' },
        { id: 'navigation-icons', name: 'Navigation', type: 'icon', preview: 'Menu and nav icons' },
        { id: 'action-icons', name: 'Action Icons', type: 'icon', preview: 'Button and action icons' }
      ]
    },
    list: {
      name: 'List',
      elements: [
        { id: 'simple-list', name: 'Simple List', type: 'list', preview: 'Basic list display' },
        { id: 'numbered-list', name: 'Numbered List', type: 'list', preview: 'Ordered list' },
        { id: 'bullet-list', name: 'Bullet List', type: 'list', preview: 'Unordered list' },
        { id: 'card-list', name: 'Card List', type: 'list', preview: 'Card-based list' }
      ]
    },
    other: {
      name: 'Other Elements',
      elements: [
        { id: 'grid', name: 'Grid', type: 'grid', preview: 'Layout grid system' },
        { id: 'button', name: 'Button', type: 'button', preview: 'Action button' }
      ]
    },
    tables: {
      name: 'Tables',
      elements: [
        { id: 'basic-table', name: 'Basic Table', type: 'table', preview: 'Simple data table' },
        { id: 'data-table', name: 'Data Table', type: 'table', preview: 'Advanced data table' },
        { id: 'pivot-table', name: 'Pivot Table', type: 'table', preview: 'Pivot analysis table' },
        { id: 'calendar', name: 'Calendar', type: 'calendar', preview: 'Date picker calendar' }
      ]
    },
    charts: {
      name: 'Charts',
      elements: [
        { id: 'bar-chart', name: 'Bar Chart', type: 'chart', preview: 'Vertical bar chart' },
        { id: 'line-chart', name: 'Line Chart', type: 'chart', preview: 'Trend line chart' },
        { id: 'pie-chart', name: 'Pie Chart', type: 'chart', preview: 'Circular data chart' },
        { id: 'area-chart', name: 'Area Chart', type: 'chart', preview: 'Filled area chart' },
        { id: 'scatter-plot', name: 'Scatter Plot', type: 'chart', preview: 'Data point scatter' }
      ]
    },
    icons: {
      name: 'Icons',
      elements: [
        { id: 'basic-icons', name: 'Basic Icons', type: 'icon', preview: 'Simple icon set' },
        { id: 'social-icons', name: 'Social Icons', type: 'icon', preview: 'Social media icons' },
        { id: 'navigation-icons', name: 'Navigation', type: 'icon', preview: 'Menu and nav icons' },
        { id: 'action-icons', name: 'Action Icons', type: 'icon', preview: 'Button and action icons' }
      ]
    },
    list: {
      name: 'List',
      elements: [
        { id: 'simple-list', name: 'Simple List', type: 'list', preview: 'Basic list display' },
        { id: 'numbered-list', name: 'Numbered List', type: 'list', preview: 'Ordered list' },
        { id: 'bullet-list', name: 'Bullet List', type: 'list', preview: 'Unordered list' },
        { id: 'card-list', name: 'Card List', type: 'list', preview: 'Card-based list' }
      ]
    },
    other: {
      name: 'Other Elements',
      elements: [
        { id: 'grid', name: 'Grid', type: 'grid', preview: 'Layout grid system' }
      ]
    }
  }), [invoices, quotes, transformToElementOptions]);
  
  // RBAC state
  const [userPermissions, setUserPermissions] = useState({
    canEdit: false,
    canComment: true,
    canViewFiles: true,
    canCreateTasks: false,
    canAssignTasks: false,
    canUpdateTaskStatus: false
  });
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showInviteVendorsModal, setShowInviteVendorsModal] = useState(false);
  const [showInviteCASModal, setShowInviteCASModal] = useState(false);

  // Load workspace data
  useEffect(() => {
    const loadWorkspace = async () => {
      if (!workspaceId) {
        setWorkspaceError('No workspace ID provided');
        setWorkspaceLoading(false);
        return;
      }

      try {
        setWorkspaceLoading(true);
        
        // Try to load workspace from API
        let response = await authFetch(`/api/workspaces/${workspaceId}`, {
          headers: buildAuthHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const workspaceData = await response.json();
        setWorkspace(workspaceData);
        console.log('✅ Loaded workspace');
        
        // Detect if current user is a client by checking if they're listed as a client in collaborators
        const userId = currentUser?.vendorId || currentUser?.userId || currentUser?.id;
        const workspaceClientId = workspaceData?.projectMetadata?.clientId;
        
        // Fetch collaborators to check if current user is listed as a client
        let isClient = false;
        let userClientId = null;
        
        try {
          const collaboratorsRes = await authFetch(`/api/workspaces/${workspaceId}/collaborators`, {
            headers: buildAuthHeaders({
              'x-user-info': JSON.stringify({
                vendorId: currentUser.vendorId,
                email: currentUser?.email,
                role: 'vendor',
                name: currentUser?.name
              })
            })
          });
          
          if (collaboratorsRes.ok) {
            const collaboratorsData = await collaboratorsRes.json();
            console.log('📋 Collaborators fetched:', collaboratorsData.collaborators);
            
            // Save collaborators to state for video calls
            setWorkspaceCollaborators(collaboratorsData.collaborators || []);
            
            // Check if CURRENT USER is marked as a client in the collaborators list
            const currentUserAsClient = collaboratorsData.collaborators?.find(
              c => c.isClient && (c.vendorId === userId || c.email === currentUser?.email)
            );
            
            if (currentUserAsClient) {
              console.log('👥 Client detected in collaborators! Current user is a client:', currentUserAsClient.vendorId);
              isClient = true;
              userClientId = currentUserAsClient.vendorId;
            } else {
              console.log('🔍 Not a client. Current user not found in client collaborators. userId:', userId, 'Collaborators:', collaboratorsData.collaborators?.map(c => ({ vendorId: c.vendorId, email: c.email, isClient: c.isClient })));
            }
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch collaborators to detect client role:', err.message);
        }
        
        if (isClient) {
          console.log('🔄 Setting detected role to: client');
          setDetectedUserRole('client');
          setDetectedClientId(userClientId);
          // Update the currentUser's role in VendorContext ONLY if role is not already 'client'
          if (currentUser?.role !== 'client') {
            console.log('📝 Updating user role in VendorContext from', currentUser?.role, 'to client');
            setUser({
              ...currentUser,
              role: 'client'
            });
          }
          console.log('✅ Detected role state updated to: client');
        } else {
          console.log('🔍 Not a client. userId:', userId, 'clientId:', workspaceClientId);
          setDetectedUserRole(userRole);
          setDetectedClientId(null);
        }
        
        // Set zoom level from workspace data
        if (workspaceData.zoomLevel) {
          if (workspaceData.zoomLevel !== undefined && workspaceData.zoomLevel !== null) {
          setZoomLevel(workspaceData.zoomLevel);
          }
        }
        
        // Set user permissions based on role and workspace access control
        if (workspaceData.accessControl && currentUser) {
          const permissions = workspaceData.accessControl.permissions || {};
          
          const finalRole = isClient ? 'client' : userRole;
          
          console.log('🔍 Permission Check Debug:', {
            finalRole,
            userId,
            currentUser,
            permissions: permissions.canEdit,
            hasEditPermission: permissions.canEdit?.includes(userId)
          });
          
          setUserPermissions({
            canEdit: finalRole === 'pm' || permissions.canEdit?.includes(userId) || false,
            canComment: permissions.canComment?.includes(userId) || true,
            canViewFiles: permissions.canViewFiles?.includes(userId) || true,
            canCreateTasks: finalRole === 'pm' || permissions.canCreateTasks?.includes(userId) || false,
            canAssignTasks: finalRole === 'pm' || permissions.canAssignTasks?.includes(userId) || false,
            canUpdateTaskStatus: permissions.canUpdateTaskStatus?.includes(userId) || finalRole === 'vendor' || finalRole === 'cas',
            canAddNotes: permissions.canAddNotes?.includes(userId) || finalRole === 'client',
            canApproveElements: permissions.canApproveElements?.includes(userId) || finalRole === 'client',
            canAccessMessages: permissions.canAccessMessages?.includes(userId) || finalRole === 'client',
            canAccessVideoCall: permissions.canAccessVideoCall?.includes(userId) || finalRole === 'client'
          });
        } else {
          // Default permissions for non-RBAC workspaces
          const finalRole = isClient ? 'client' : userRole;
          setUserPermissions({
            canEdit: finalRole === 'pm',
            canComment: true,
            canViewFiles: true,
            canCreateTasks: finalRole === 'pm',
            canAssignTasks: finalRole === 'pm',
            canUpdateTaskStatus: finalRole === 'vendor' || finalRole === 'cas',
            canAddNotes: finalRole === 'client',
            canApproveElements: finalRole === 'client',
            canAccessMessages: finalRole === 'client',
            canAccessVideoCall: finalRole === 'client'
          });
        }
        
        setWorkspaceError(null);
      } catch (error) {
        console.error('Error loading workspace:', error);
        setWorkspaceError('Failed to load workspace data');
      } finally {
        setWorkspaceLoading(false);
      }
    };

    loadWorkspace();
  }, [workspaceId, currentUser, buildAuthHeaders]);

  // Listen for approval completion events and refresh workspace
  useEffect(() => {
    const handleApprovalCompleted = async (event) => {
      console.log('🎯 WorkspacePage: Approval completed event received', event.detail);
      
      // Refresh workspace data to get the updated approval status
      try {
        const response = await authFetch(`/api/workspaces/${event.detail.workspaceId}`, {
          headers: buildAuthHeaders()
        });
        if (response.ok) {
          const freshWorkspaceData = await response.json();
          setWorkspace(freshWorkspaceData);

          // Keep selectedTask/selectedSubtask in sync so CanvasWorkspace renders latest canvasData
          if (selectedTask?.id && selectedSubtask?.id && Array.isArray(freshWorkspaceData?.tasks)) {
            const updatedTask = freshWorkspaceData.tasks.find(t => t.id === selectedTask.id);
            const updatedSubtask = updatedTask?.subtasks?.find(s => s.id === selectedSubtask.id);
            if (updatedTask) setSelectedTask(updatedTask);
            if (updatedSubtask) setSelectedSubtask(updatedSubtask);
          }

          console.log('✅ WorkspacePage: Workspace refreshed after approval completion');
        }
      } catch (error) {
        console.error('❌ WorkspacePage: Failed to refresh workspace after approval', error);
      }
    };

    window.addEventListener('approvalCompleted', handleApprovalCompleted);
    return () => window.removeEventListener('approvalCompleted', handleApprovalCompleted);
  }, [selectedTask, selectedSubtask, buildAuthHeaders]);
  const saveWorkspace = async (workspaceData) => {
    // IMPORTANT: Skip canvas saves if approval submission is in progress
    // This prevents stale canvas data from overwriting newly submitted approvals
    if (window.__isApprovingInProgress) {
      console.log('⏸️ WorkspacePage: Skipping canvas save - approval submission in progress');
      return;
    }

    console.log('🔄 WorkspacePage: saveWorkspace called', {
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
      console.error('❌ WorkspacePage: Cannot save - missing workspaceId or workspace', {
        workspaceId,
        hasWorkspace: !!workspace
      });
      return;
    }

    // If we have a selected subtask, save to that subtask's canvas
    if (selectedTask && selectedSubtask) {
      setSaveOpsInFlight((prev) => prev + 1);
      setSaveError(null);
      try {
        console.log('🚀 WorkspacePage: Saving to subtask canvas');
        const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${selectedTask.id}/subtasks/${selectedSubtask.id}/canvas`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workspaceData)
        });

        console.log('📡 WorkspacePage: Subtask canvas API response received', {
          status: response.status,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ WorkspacePage: API error response:', errorText);
          throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ WorkspacePage: Subtask canvas saved successfully', result);
        setLastSavedAt(Date.now());
        
        // Update the workspace with the latest data
        setWorkspace(result.workspace);
        
        // Update selectedSubtask to reflect the new canvas data
        if (result.workspace?.tasks) {
          const updatedTask = result.workspace.tasks.find(t => t.id === selectedTask.id);
          if (updatedTask?.subtasks) {
            const updatedSubtask = updatedTask.subtasks.find(s => s.id === selectedSubtask.id);
            if (updatedSubtask) {
              setSelectedSubtask(updatedSubtask);
              console.log('🔄 WorkspacePage: Updated selectedSubtask with new canvas data');
            }
          }
        }
        
      } catch (error) {
        console.error('❌ WorkspacePage: Error saving subtask canvas:', error);
        setSaveError(error?.message || 'Failed to sync canvas changes');
        throw error;
      } finally {
        setSaveOpsInFlight((prev) => Math.max(0, prev - 1));
      }
    } else {
      // Fallback to general workspace canvas save
      setSaveOpsInFlight((prev) => prev + 1);
      setSaveError(null);
      try {
        console.log('🚀 WorkspacePage: Making API call to save general workspace canvas');
        const response = await fetch(`/api/workspaces/${workspaceId}/canvas`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workspaceData)
        });

        console.log('📡 WorkspacePage: API response received', {
          status: response.status,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ WorkspacePage: API error response:', errorText);
          throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ WorkspacePage: Workspace saved successfully', result);
        setLastSavedAt(Date.now());
        // Update the workspace with the latest data
        setWorkspace(result.workspace);
      } catch (error) {
        console.error('❌ WorkspacePage: Error saving workspace:', error);
        setSaveError(error?.message || 'Failed to sync workspace changes');
        throw error; // Re-throw to let CanvasWorkspace handle the error state
      } finally {
        setSaveOpsInFlight((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const syncStatus = useMemo(() => {
    if (saveOpsInFlight > 0) return 'saving';
    if (saveError) return 'error';
    if (canvasWebSocket && !canvasWebSocket.isConnected) return 'offline';
    return 'live';
  }, [saveOpsInFlight, saveError, canvasWebSocket]);

  // Auto-save workspace data periodically
  useEffect(() => {
    if (!workspace) return;

    const autoSaveInterval = setInterval(() => {
      // This will be called by the CanvasWorkspace component when data changes
      // For now, we'll just log that auto-save is ready
      console.log('Auto-save ready for workspace:', workspaceId);
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [workspace, workspaceId]);

  // Listen for canvas nodes changes and update the canvasNodes state
  useEffect(() => {
    const handleNodesChanged = (event) => {
      const { nodes } = event.detail;
      console.log('📊 Canvas nodes updated:', nodes.length, 'elements');
      setCanvasNodes(nodes || []);
    };

    document.addEventListener('canvasNodesChanged', handleNodesChanged);

    return () => {
      document.removeEventListener('canvasNodesChanged', handleNodesChanged);
    };
  }, []);

  // Handle browser back button when invoice tool overlay is open
  useEffect(() => {
    if (!showInvoiceTool) return;

    const handlePopState = (event) => {
      // Prevent the default back navigation
      event.preventDefault();
      // Close the invoice tool overlay instead
      setShowInvoiceTool(false);
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.href);
    };

    // Push a new state to the history stack when overlay opens
    window.history.pushState(null, '', window.location.href);
    
    // Add event listener for popstate
    window.addEventListener('popstate', handlePopState);

    return () => {
      // Cleanup: remove event listener
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showInvoiceTool]);

  // Handler functions for role-based actions
  const handleManagePermissions = () => {
    console.log('🔐 Opening permissions management modal');
    setShowPermissionsModal(true);
  };

  const handleInviteVendors = () => {
    console.log('👥 Opening invite vendors modal');
    setShowInviteVendorsModal(true);
  };

  const handleInviteCAS = () => {
    console.log('👥 Opening invite CAS modal');
    setShowInviteCASModal(true);
  };

  const handleCASInviteSuccess = (invitedEmployees) => {
    console.log('✅ CAS members invited successfully:', invitedEmployees);
    // Optionally refresh workspace data or show a success message
    triggerActivityRefresh();
  };

  // Use workspace layers or fallback to mock data
  const layers = workspace?.layers || [
    {
      id: 1,
      name: 'Interior work',
      type: 'folder',
      color: 'bg-green-500',
      items: [
        { id: 101, name: 'Internal Interior', type: 'file', color: 'bg-blue-500', status: 'active' },
        { id: 102, name: 'Checkout', type: 'file', color: 'bg-blue-500', status: 'pending' }
      ]
    },
    {
      id: 2,
      name: 'Marketing',
      type: 'folder',
      color: 'bg-green-500',
      items: [
        { id: 201, name: 'Brand Guidelines', type: 'file', color: 'bg-blue-500', status: 'completed' },
        { id: 202, name: 'Social Media', type: 'file', color: 'bg-blue-500', status: 'in-progress' }
      ]
    },
    {
      id: 3,
      name: 'Inventory',
      type: 'folder',
      color: 'bg-purple-500',
      items: [
        { id: 301, name: 'Stock Count', type: 'file', color: 'bg-blue-500', status: 'pending' },
        { id: 302, name: 'Warehouse Layout', type: 'file', color: 'bg-blue-500', status: 'draft' }
      ]
    }
  ];

  // Element categories and options for the elements panel
  const elementCategories = [
    { id: 'forms', name: 'Forms', icon: 'Grid', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'tables', name: 'Tables', icon: 'Table', color: 'bg-gray-100 text-gray-800' },
    { id: 'charts', name: 'Charts', icon: 'BarChart3', color: 'bg-blue-100 text-blue-800' },
    { id: 'icons', name: 'Icons', icon: 'Square', color: 'bg-purple-100 text-purple-800' },
    { id: 'list', name: 'List', icon: 'List', color: 'bg-green-100 text-green-800' },
    { id: 'other', name: 'other elements', icon: 'Grid', color: 'bg-gray-100 text-gray-800' }
  ];

  // Removed duplicate elementOptions declaration

  // Toggle sidebar function (legacy compat — now toggles focus mode)
  const toggleSidebars = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  const toggleLeftPin = useCallback(() => setLeftPanelPinned(p => !p), []);
  const toggleRightPin = useCallback(() => setRightPanelPinned(p => !p), []);

  // ── Command Palette & Shortcuts Overlay state ──────────────────
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false);

  // Build command palette commands list
  const paletteCommands = useMemo(() => [
    { id: 'focus-mode', label: focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode', category: 'Layout', icon: <Maximize2 className="w-4 h-4" />, shortcut: 'Ctrl+Shift+H', keywords: ['focus', 'hide', 'panels', 'canvas'], action: () => setFocusMode(p => !p) },
    { id: 'pin-left', label: leftPanelPinned ? 'Unpin Left Panel' : 'Pin Left Panel', category: 'Layout', icon: <PanelLeft className="w-4 h-4" />, shortcut: 'Ctrl+Shift+L', keywords: ['left', 'sidebar', 'pin', 'tasks'], action: () => setLeftPanelPinned(p => !p) },
    { id: 'pin-right', label: rightPanelPinned ? 'Unpin Right Panel' : 'Pin Right Panel', category: 'Layout', icon: <PanelRight className="w-4 h-4" />, shortcut: 'Ctrl+Shift+R', keywords: ['right', 'sidebar', 'pin', 'activity'], action: () => setRightPanelPinned(p => !p) },
    { id: 'fit-view', label: 'Fit Canvas to View', category: 'Canvas', icon: <ZoomIn className="w-4 h-4" />, shortcut: 'Ctrl+Shift+1', keywords: ['fit', 'zoom', 'center', 'reset'], action: () => document.dispatchEvent(new CustomEvent('canvasFitView')) },
    { id: 'add-task', label: 'Add New Task', category: 'Tasks', icon: <CheckCircle className="w-4 h-4" />, keywords: ['create', 'task', 'new'], action: () => setShowAddTaskModal(true) },
    { id: 'add-subtask', label: 'Add Subtask', category: 'Tasks', icon: <FileText className="w-4 h-4" />, keywords: ['create', 'subtask', 'new'], action: () => selectedTask && setShowAddSubtaskModal(true) },
    { id: 'elements', label: 'Open Elements Panel', category: 'Panels', icon: <Layout className="w-4 h-4" />, keywords: ['elements', 'sidebar', 'components', 'drag'], action: () => handleElementsClick() },
    { id: 'layouts', label: 'Open Layouts Panel', category: 'Panels', icon: <Layout className="w-4 h-4" />, keywords: ['layouts', 'template', 'grid'], action: () => handleLayoutsClick() },
    { id: 'text', label: 'Open Text Panel', category: 'Panels', icon: <FileText className="w-4 h-4" />, keywords: ['text', 'annotation', 'label'], action: () => handleTextClick() },
    { id: 'templates', label: 'Open Templates Panel', category: 'Panels', icon: <Sparkles className="w-4 h-4" />, keywords: ['templates', 'flowchart', 'preset'], action: () => handleTemplatesClick() },
    { id: 'post-services', label: 'Post Service', category: 'Actions', icon: <FileText className="w-4 h-4" />, keywords: ['post', 'service', 'publish'], action: () => setShowPostServicesModal(true) },
    { id: 'shortcuts', label: 'Show Keyboard Shortcuts', category: 'Help', icon: <Keyboard className="w-4 h-4" />, shortcut: '?', keywords: ['keyboard', 'shortcuts', 'help', 'keys'], action: () => setShowShortcutsOverlay(true) },
    { id: 'ai-helper', label: 'Add AI Helper Block', category: 'Canvas', icon: <Sparkles className="w-4 h-4" />, keywords: ['ai', 'helper', 'summarize', 'suggest', 'generate', 'flow', 'assistant'], action: () => {
      document.dispatchEvent(new CustomEvent('addElementToCanvas', { detail: { type: 'ai-helper', name: 'AI Helper', nodeType: 'aiHelper', data: { label: 'AI Helper' } } }));
    }},
  ], [focusMode, leftPanelPinned, rightPanelPinned, selectedTask]);

  // Add keyboard shortcuts and ensure full-page display
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Close any open overlay panel first, then close window
        if (leftPanelHover) { setLeftPanelHover(false); return; }
        if (rightPanelHover) { setRightPanelHover(false); return; }
        window.close();
      }
      // Command palette with Ctrl+K
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setShowCommandPalette(prev => !prev);
        return;
      }
      // Keyboard shortcuts overlay with ? (when not typing in an input)
      if (event.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        event.preventDefault();
        setShowShortcutsOverlay(prev => !prev);
        return;
      }
      // Toggle focus mode with Ctrl+Shift+H (hides all panels)
      if (event.ctrlKey && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        setFocusMode(prev => !prev);
      }
      // Toggle left panel pin with Ctrl+Shift+L
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        setLeftPanelPinned(p => !p);
      }
      // Toggle right panel pin with Ctrl+Shift+R
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        setRightPanelPinned(p => !p);
      }
      // Fit to view with Ctrl+Shift+1
      if (event.ctrlKey && event.shiftKey && event.key === '1') {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('canvasFitView'));
      }
    };

    // Ensure full-page display
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Reset body styles when component unmounts
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Use workspace tasks or empty array
  const [tasks, setTasks] = useState([]);

  const taskMemberOptions = useMemo(() => {
    const members = Array.isArray(workspaceCollaborators) ? workspaceCollaborators : [];
    const normalized = members
      .map((member) => {
        const id = member.vendorId || member.userId || member.id;
        if (!id) return null;
        const name = member.name || member.userName || member.email || 'Member';
        const role = member.role || member.userRole || null;
        return {
          id,
          label: name,
          role: role || null,
        };
      })
      .filter(Boolean);

    const uniqueById = new Map();
    normalized.forEach((member) => {
      if (!uniqueById.has(member.id)) {
        uniqueById.set(member.id, member);
      }
    });

    return Array.from(uniqueById.values());
  }, [workspaceCollaborators]);
  
  // Update tasks when workspace loads
  useEffect(() => {
    if (workspace?.tasks) {
      // Loading tasks from workspace (log removed for performance)
      setTasks(workspace.tasks);
    }
  }, [workspace]);

  // Handle incoming call notifications - just log, don't mark as processed
  // Notifications are marked as processed only when user accepts or declines
  useEffect(() => {
    // Filter for incoming call invitations
    const callInvitations = notifications?.filter(n => n.type === 'call_invitation') || [];

    // Log unread invitations (don't mark as processed here - that happens on accept/decline)
    callInvitations.forEach(notification => {
      if (!processedCallNotifications.has(notification.id)) {
        console.log('📞 New call invitation received:', notification);
        // Don't mark as processed here - let the notification stay visible until user acts
      }
    });
  }, [notifications, processedCallNotifications]);

  // Add task via API
  const addTask = async (taskData) => {
    if (!workspaceId) {
      console.error('Cannot add task: no workspace ID');
      return;
    }

    try {
      console.log('🔄 WorkspacePage: Adding task', { taskData, workspaceId });
      
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      name: taskData.title,
          description: taskData.description || '',
          priority: taskData.priority || 'medium',
          assignedUserId: taskData.accessedBy || null,
          userId: currentUser?.id || 'unknown',
          userEmail: currentUser?.email || 'unknown@example.com',
          userName: currentUser?.name || 'Unknown User'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ WorkspacePage: Task added successfully', result);
      
      // Update local tasks state
      setTasks(prevTasks => [...prevTasks, result.task]);
      
      // Refresh workspace data
      const updatedWorkspace = result.workspace;
      setWorkspace(updatedWorkspace);
      
    } catch (error) {
      console.error('❌ WorkspacePage: Error adding task:', error);
      alert('Failed to add task. Please try again.');
      throw error;
    }
  };

  // Add subtask via API
  const addSubtask = async (subtaskData, options = {}) => {
    const { autoSelect = true } = options;
    if (!selectedTask || !workspaceId) {
      console.error('Cannot add subtask: missing selectedTask or workspaceId');
      return;
    }

    try {
      console.log('🔄 WorkspacePage: Adding subtask', { 
        subtaskData, 
        workspaceId, 
        taskId: selectedTask.id 
      });
      
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${selectedTask.id}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      name: subtaskData.title,
          description: subtaskData.description || '',
          dependsOnSubtaskId: subtaskData.dependsOnSubtaskId || 'auto-previous',
          flowOrder: subtaskData.flowOrder ? Number(subtaskData.flowOrder) : undefined,
          assignedUserId: subtaskData.assignedTo || null,
          userId: currentUser?.id || 'unknown',
          userEmail: currentUser?.email || 'unknown@example.com',
          userName: currentUser?.name || 'Unknown User'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ WorkspacePage: Subtask added successfully', result);
      
      // Refresh workspace data and local tasks from API response
      const updatedWorkspace = result.workspace;
      setWorkspace(updatedWorkspace);
      if (Array.isArray(updatedWorkspace?.tasks)) {
        setTasks(updatedWorkspace.tasks);
        const updatedSelectedTask = updatedWorkspace.tasks.find(task => task.id === selectedTask.id);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        }
      }

      if (autoSelect) {
        // Select newly created subtask when coming from full modal flow
        setSelectedSubtask(result.subtask);
        console.log('✨ WorkspacePage: Auto-selected new subtask', {
          subtaskId: result.subtask.id,
          subtaskName: result.subtask.name
        });
      }
      
    } catch (error) {
      console.error('❌ WorkspacePage: Error adding subtask:', error);
      alert('Failed to add subtask. Please try again.');
      throw error;
    }
  };

  const updateTaskDetails = async (taskId, updates = {}) => {
    if (!workspaceId || !taskId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
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
    } catch (error) {
      console.error('❌ WorkspacePage: Error updating task:', error);
      throw error;
    }
  };

  const updateSubtaskDetails = async (taskId, subtaskId, updates = {}) => {
    if (!workspaceId || !taskId || !subtaskId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
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
    } catch (error) {
      console.error('❌ WorkspacePage: Error updating subtask:', error);
      throw error;
    }
  };

  const renameTask = async (taskId, name) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return;
    await updateTaskDetails(taskId, { name: trimmedName });
  };

  const renameSubtask = async (taskId, subtaskId, name) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return;
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
    setActiveTab('Task'); // Switch back to Task tab when no task is selected
  };

  const handleSubtaskClick = (subtask) => {
    setSelectedSubtask(subtask);
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
    navigate('/VendorDashboard');
  }, [navigate]);

  const handleElementsClick = () => {
    setShowElementsSidebar(true);
    setShowLayoutsPanel(false); // Close layouts if open
    setShowTemplatesPanel(false);
    setShowInvoiceTool(false);
  };

  const handleLayoutsClick = () => {
    setShowLayoutsPanel(true);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowTextPanel(false);
    setShowTemplatesPanel(false);
    setShowInvoiceTool(false);
  };

  const handleTextClick = () => {
    setShowTextPanel(true);
    setShowLayoutsPanel(false);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowTemplatesPanel(false);
    setShowInvoiceTool(false);
  };

  const handleUpdateTextElement = (updatedElement) => {
    setSelectedTextElement(updatedElement);
    // Emit event to CanvasWorkspace to update the text element
    const event = new CustomEvent('updateTextElement', {
      detail: updatedElement
    });
    document.dispatchEvent(event);
  };

  const handleTemplatesClick = () => {
    setShowTemplatesPanel(true);
    setShowTextPanel(false);
    setShowLayoutsPanel(false);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowInvoiceTool(false);
  };

  const handleWorkflowBuilderClick = () => {
    setShowWorkflowBuilderModal(true);
    setShowTemplatesPanel(false);
    setShowTextPanel(false);
    setShowLayoutsPanel(false);
    setShowElementsSidebar(false);
    setShowElementsPanel(false);
    setSelectedCategory(null);
    setShowInvoiceTool(false);
  };

  const handleTemplateSelect = (templateId) => {
    if (templateId === 'quotations-invoices') {
      // Navigate to invoices route instead of showing overlay
      navigate(`/VendorDashboard/workspace/${workspaceId}/invoices`);
      setShowTemplatesPanel(false);
      // Close other panels
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === 'boq') {
      // Open Manage BOQ modal
      setShowManageBOQModal(true);
      setShowTemplatesPanel(false);
      // Close other panels
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === 'procurement-rfq') {
      setShowProcurementRFQModal(true);
      setShowTemplatesPanel(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === 'cost-calculators') {
      setShowCostCalculatorsModal(true);
      setShowTemplatesPanel(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    } else if (templateId === 'execution-work-order' || templateId === 'execution-rfi' || templateId === 'execution-inspection' || templateId === 'execution-daily-site-log') {
      setExecutionTemplateType(templateId);
      setShowExecutionRequestModal(true);
      setShowTemplatesPanel(false);
      setShowTextPanel(false);
      setShowLayoutsPanel(false);
      setShowElementsSidebar(false);
      setShowElementsPanel(false);
      setSelectedCategory(null);
    }
    // Handle other template types here in the future
  };

  // RBAC Handlers (already defined above)

  const handleElementSelect = (categoryId) => {
    console.log('🔍 Element selected:', categoryId);
    setSelectedCategory(categoryId);
    setShowElementsSidebar(false);
    setShowElementsPanel(true); // Show the ElementsPanel
    
    // Close other panels
    setShowLayoutsPanel(false);
    setShowTextPanel(false);
    setShowTemplatesPanel(false);
    setShowInvoiceTool(false);
    
    console.log('📊 Panel state after selection:', {
      showElementsPanel: true,
      selectedCategory: categoryId,
      showElementsSidebar: false
    });
  };

  const handleElementOptionSelect = (elementData) => {
    console.log('🎯 Selected element:', elementData);
    
    // Handle turnkey elements
    if (elementData.categoryId === 'turnkey') {
      console.log('🔧 Processing turnkey element:', elementData);
      
      // Create a turnkey node and add it to the canvas
      const turnkeyElement = {
        id: elementData.elementId,
        type: elementData.elementType,
        category: 'turnkey',
        name: elementData.name || 'Turnkey Element'
      };
      
      console.log('📦 Creating turnkey element:', turnkeyElement);
      
      const turnkeyNodeEvent = new CustomEvent('elementDoubleClick', {
        detail: turnkeyElement
      });
      
      console.log('🚀 Dispatching turnkey event:', turnkeyNodeEvent);
      document.dispatchEvent(turnkeyNodeEvent);
    }
    
    setShowElementsPanel(false);
  };

  const recentActivities = [
    { id: 1, type: 'completed', user: 'Bob Johnson', action: 'Completed task Create wireframes for app', time: '10 mins ago', icon: 'CheckCircle', color: 'text-green-500' },
    { id: 2, type: 'deadline', user: 'System', action: 'Task approaching deadline Finalize project proposal', time: '1 hour ago', icon: 'AlertTriangle', color: 'text-red-500' },
    { id: 3, type: 'completed', user: 'Bob Johnson', action: 'Completed task Create wireframes for app', time: '2 hours ago', icon: 'FileText', color: 'text-blue-500' }
  ];

  const messages = [
    { id: 1, user: 'Team Member 1', message: 'Hi team, I wanted to check on the progress of the project.', time: '2 mins ago', isCurrentUser: false },
    { id: 2, user: 'Team Member 2', message: "We're on track with the timeline. The development phase is almost complete.", time: '5 mins ago', isCurrentUser: false },
    { id: 3, user: 'You', message: "That's great to hear. I've completed the backend integration", time: '1 min ago', isCurrentUser: true },
    { id: 4, user: 'Team Member 2', message: 'The development phase is almost complete.', time: '3 mins ago', isCurrentUser: false }
  ];

  // Derive a human-friendly workspace name for metadata (quotes/invoices, header, etc.)
  const workspaceDisplayName =
    workspace?.name ||
    workspace?.title ||
    leadDetails?.name ||
    (typeof window !== 'undefined' ? localStorage.getItem('currentWorkspace') : null) ||
    'Workspace';

  // ========================================
  // VIDEO CALL HANDLERS
  // ========================================
  
  const handleStartCallClick = () => {
    console.log('📞 Start Call button clicked');
    setShowStartCallModal(true);
  };

  const handleStartCallSubmit = async (callData) => {
    try {
      console.log('📞 Starting call with data:', callData);
      const { selectedCollaborators, callTitle } = callData;
      
      // Prepare invited user IDs from selected collaborators
      const invitedUserIds = selectedCollaborators.map(c => c.vendorId || c.userId || c.id);
      console.log('📞 Invited user IDs:', invitedUserIds);
      
      // Start the call via API
      const callResult = await startCall({
        collaborators: selectedCollaborators,
        workspaceId,
        callTitle: callTitle || 'Workspace Call',
        initiatorId: currentUser?.vendorId || currentUser?.id,
        initiatorName: currentUser?.name,
        invitedUserIds: invitedUserIds
      });

      console.log('✅ Call started successfully:', callResult);
      
      // Set the active call directly from the result (backend returns all Chime SDK data)
      if (callResult && callResult.meetingId) {
        setActiveCall(callResult);
        console.log('📱 Active call state updated:', callResult);
      }
      
      // Close the modal
      setShowStartCallModal(false);
      
      // Show success message
      alert(`Call "${callTitle}" started! Invitations sent to ${selectedCollaborators.length} collaborator(s).`);
    } catch (error) {
      console.error('❌ Error starting call:', error);
      alert('Failed to start call. Please try again.');
    }
  };

  const handleAcceptCall = async (notification) => {
    try {
      console.log('✅ Accepting call:', notification);
      const callData = notification.data;
      
      // Join the call via API
      const result = await joinCall(
        callData.meetingId,
        currentUser?.vendorId || currentUser?.id,
        currentUser?.name
      );

      console.log('✅ Joined call successfully:', result);
      
      // Set the active call from the result
      if (result && result.call) {
        setActiveCall(result.call);
        console.log('📱 Active call state updated after join:', result.call);
      }
      
      // Mark notification as processed
      setProcessedCallNotifications(prev => new Set([...prev, notification.id]));
      
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      alert('Failed to join call. Please try again.');
    }
  };

  const handleDeclineCall = async (notification) => {
    try {
      console.log('❌ Declining call:', notification);
      const callData = notification.data;
      
      // Decline the call via API
      await authFetch('/api/calls/decline', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: callData.meetingId,
          attendeeId: currentUser?.vendorId || currentUser?.id
        })
      });

      // Mark notification as processed
      setProcessedCallNotifications(prev => new Set([...prev, notification.id]));
      console.log('✅ Call declined successfully');
      
    } catch (error) {
      console.error('❌ Error declining call:', error);
      alert('Failed to decline call. Please try again.');
    }
  };

  const handleEndCall = async () => {
    try {
      console.log('🛑 Ending call:', activeCall?.meetingId);
      
      // End the call via API
      await authFetch('/api/calls/end', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: activeCall?.meetingId
        })
      });

      // Clear active call
      setActiveCall(null);
      console.log('✅ Call ended successfully');
      
    } catch (error) {
      console.error('❌ Error ending call:', error);
      alert('Failed to end call. Please try again.');
    }
  };

  // Show loading state
  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Workspace</h2>
          <p className="text-gray-600">
            {leadDetails?.name ? `Loading workspace for "${leadDetails.name}"` : 'Preparing your collaborative workspace...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (workspaceError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Workspace Error</h2>
          <p className="text-gray-600 mb-4">{workspaceError}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
    <UploadProvider 
      workspaceId={workspaceId}
      vendorId={currentUser?.vendorId || currentUser?.userId || currentUser?.id}
      taskId={selectedTask?.id}
      subtaskId={selectedSubtask?.id}
    >
      <style>
        {`
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
        `}
      </style>
      
      <div className="workspace-container flex h-screen w-screen flex-col bg-white overflow-hidden" style={{ margin: 0, padding: 0 }}>
        {/* Role-based header */}
        {console.log('🔍 RoleBasedHeader rendering with detectedUserRole:', detectedUserRole)}
        <RoleBasedHeader 
          userRole={detectedUserRole}
          currentUser={currentUser}
          workspace={workspace}
          onManagePermissions={handleManagePermissions}
          onInviteVendors={handleInviteVendors}
          onInviteCAS={handleInviteCAS}
          onStartCall={handleStartCallClick}
        />
        
        <WorkspaceHeader 
          isCanvasActive={!!selectedSubtask} 
          syncStatus={syncStatus}
          lastSavedAt={lastSavedAt}
          onElementsClick={handleElementsClick}
          onLayoutsClick={handleLayoutsClick}
          onTextClick={handleTextClick}
          onTemplatesClick={handleTemplatesClick}
          onWorkflowBuilderClick={handleWorkflowBuilderClick}
          showPostServicesActions
          onOpenPostServices={() => setShowPostServicesModal(true)}
          onOpenUpdateProgress={() => setShowUpdateProgressModal(true)}
          onOpenReviewProgress={() => setShowReviewProgressModal(true)}
          onOpenClientReviewProgress={() => setShowClientReviewProgressModal(true)}
          onOpenProjectComplete={() => setShowProjectCompleteModal(true)}
          userRole={userRole}
          isPM={isPM}
          isClient={!!detectedClientId}
          workspace={workspace}
          selectedTask={selectedTask}
          selectedSubtask={selectedSubtask}
        />
        
        <div className="relative flex min-h-0 flex-1">
          {/* Mobile panel toggle buttons — fixed bottom bar */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-4 py-2 safe-area-pb">
              <button
                onClick={() => { setMobileLeftOpen(p => !p); setMobileRightOpen(false); }}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mobileLeftOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                <span>Tasks</span>
              </button>
              <button
                onClick={() => { setMobileRightOpen(p => !p); setMobileLeftOpen(false); }}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mobileRightOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Activity</span>
              </button>
            </div>
          )}

          {/* Mobile backdrop overlay */}
          {isMobile && (mobileLeftOpen || mobileRightOpen) && (
            <div
              className="fixed inset-0 bg-black/30 z-10"
              onClick={() => { setMobileLeftOpen(false); setMobileRightOpen(false); }}
            />
          )}

          {/* Left edge hover handle — visible tab that reveals left panel in focus mode (desktop only) */}
          {!isMobile && focusMode && !leftPanelPinned && !leftPanelVisible && (
            <div
              className="absolute left-0 top-0 bottom-0 w-3 z-30 cursor-pointer group"
              onMouseEnter={() => setLeftPanelHover(true)}
              title="Hover to show Tasks panel"
            >
              {/* Visible handle indicator */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gray-300 group-hover:bg-blue-400 rounded-r-full transition-colors" />
            </div>
          )}

          <WorkspaceSidebar
            sidebarCollapsed={!leftPanelVisible}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedTask={selectedTask}
            tasks={tasks}
            selectedSubtask={selectedSubtask}
            onTaskClick={handleTaskClick}
            onSubtaskClick={handleSubtaskClick}
            onShowAddTaskModal={() => setShowAddTaskModal(true)}
            onQuickAddTask={addTask}
            onRenameTask={renameTask}
            onUpdateTask={updateTaskDetails}
            memberOptions={taskMemberOptions}
            workspace={workspace}
            userRole={detectedUserRole}
            onLeaveWorkspace={handleLeaveWorkspace}
            focusMode={focusMode}
            isPinned={leftPanelPinned}
            onTogglePin={toggleLeftPin}
            onMouseEnter={() => setLeftPanelHover(true)}
            onMouseLeave={() => setLeftPanelHover(false)}
          />

          <WorkspaceMain
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            selectedLayer={selectedLayer}
            selectedLayerItem={selectedLayerItem}
            sidebarCollapsed={sidebarCollapsed}
            zoomLevel={zoomLevel}
            showElementsPanel={showElementsPanel}
            onBackToHome={handleBackToHome}
            onBackToTask={handleBackToTask}
            onBackToLayer={handleBackToLayer}
            onSubtaskClick={handleSubtaskClick}
            onShowAddSubtaskModal={() => setShowAddSubtaskModal(true)}
            onLayerItemClick={handleLayerItemClick}
            onToggleSidebars={toggleSidebars}
            onRenameSubtask={renameSubtask}
            onUpdateSubtask={updateSubtaskDetails}
            memberOptions={taskMemberOptions}
            workspace={workspace}
            onSaveWorkspace={saveWorkspace}
            onRefreshWorkspace={refetchWorkspace}
            tasks={tasks}
            onZoomChange={handleZoomChange}
            onCreateTask={addTask}
            onCreateSubtask={addSubtask}
            onActivityCreated={triggerActivityRefresh}
            userRole={detectedUserRole}
            userPermissions={userPermissions}
            canvasWebSocket={canvasWebSocket}
            workspaceCollaborators={workspaceCollaborators}
            focusMode={focusMode}
          />

          {/* Right edge hover handle — visible tab (desktop only) */}
          {!isMobile && focusMode && !rightPanelPinned && !rightPanelVisible && (
            <div
              className="absolute right-0 top-0 bottom-0 w-3 z-30 cursor-pointer group"
              onMouseEnter={() => setRightPanelHover(true)}
              title="Hover to show Activity panel"
            >
              {/* Visible handle indicator */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gray-300 group-hover:bg-blue-400 rounded-l-full transition-colors" />
            </div>
          )}

          <WorkspaceRightSidebar
            sidebarCollapsed={!rightPanelVisible}
            selectedSubtask={selectedSubtask}
            selectedTask={selectedTask}
            recentActivities={recentActivities}
            messages={messages}
            workspaceId={workspaceId}
            onActivityCreated={activityRefreshTrigger}
            workspace={workspace}
            userRole={detectedUserRole}
            notifications={notifications}
            unreadCount={unreadCount}
            isConnected={isConnected}
            onMarkNotificationAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllAsRead}
            canvasElements={canvasNodes}
            onZoomToElement={(elementId) => {
              // Emit event to CanvasWorkspace to zoom and focus on the element
              const event = new CustomEvent('zoomToElement', {
                detail: { elementId }
              });
              document.dispatchEvent(event);
            }}
            focusMode={focusMode}
            isPinned={rightPanelPinned}
            onTogglePin={toggleRightPin}
            onMouseEnter={() => setRightPanelHover(true)}
            onMouseLeave={() => setRightPanelHover(false)}
          />
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal 
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onAddTask={addTask}
        memberOptions={taskMemberOptions}
      />

      {/* Add Subtask Modal */}
      <AddSubtaskModal 
        isOpen={showAddSubtaskModal}
        onClose={() => setShowAddSubtaskModal(false)}
        onAddSubtask={addSubtask}
        parentTaskName={selectedTask?.name}
        existingSubtasks={selectedTask?.subtasks || []}
        memberOptions={taskMemberOptions}
      />

      {/* Elements Sidebar */}
      <ElementsSidebar
        isOpen={showElementsSidebar}
        onClose={() => setShowElementsSidebar(false)}
        onElementSelect={handleElementSelect}
        userRole={detectedUserRole}
        currentUser={currentUser}
        elementOptions={elementOptions}
      />

      {/* Elements Panel - Render only when visible */}
      {showElementsPanel && (
        <ElementsPanel
          selectedCategory={selectedCategory}
          elementOptions={elementOptions}
          onClose={() => {
            setShowElementsPanel(false);
            setShowElementsSidebar(true);
          }}
          onBackToCategories={() => {
            setShowElementsPanel(false);
            setShowElementsSidebar(true);
          }}
        />
      )}

      {/* Layouts Panel */}
      <LayoutsPanel
        isOpen={showLayoutsPanel}
        onClose={() => setShowLayoutsPanel(false)}
      />

      {/* Text Panel */}
      <TextPanel
        isOpen={showTextPanel}
        onClose={() => setShowTextPanel(false)}
        selectedTextElement={selectedTextElement}
        onUpdateTextElement={handleUpdateTextElement}
      />

      {/* Templates Panel */}
      <TemplatesPanel
        isOpen={showTemplatesPanel}
        onClose={() => setShowTemplatesPanel(false)}
        onTemplateSelect={handleTemplateSelect}
      />

      {/* Manage BOQ Modal (template shortcut) */}
      <ManageBOQModal
        isOpen={showManageBOQModal}
        onClose={() => setShowManageBOQModal(false)}
        onTablesExtracted={(tables) => {
          // Future: handle extracted tables here if needed
          console.log('BOQ tables extracted from template modal:', tables);
        }}
      />

      <ProcurementRFQModal
        isOpen={showProcurementRFQModal}
        onClose={() => setShowProcurementRFQModal(false)}
        workspaceId={workspaceId}
        workspace={workspace}
        currentUser={currentUser}
        onSubmitted={(rfqPayload) => {
          const canvasRef = window?.canvasWorkspaceRef?.current;
          if (canvasRef?.addProcurementRFQNode) {
            canvasRef.addProcurementRFQNode(rfqPayload);
          } else {
            sessionStorage.setItem('pendingProcurementRFQNode', JSON.stringify({ payload: rfqPayload }));
            document.dispatchEvent(new CustomEvent('addProcurementRFQNode', {
              detail: rfqPayload
            }));
          }
          triggerActivityRefresh();
        }}
      />

      <ExecutionRequestModal
        isOpen={showExecutionRequestModal}
        onClose={() => setShowExecutionRequestModal(false)}
        templateType={executionTemplateType}
        workspace={workspace}
        currentUser={currentUser}
        onSubmitted={async (executionPayload) => {
          const canvasRef = window?.canvasWorkspaceRef?.current;
          if (canvasRef?.addExecutionRequestNode) {
            await canvasRef.addExecutionRequestNode(executionPayload);
          } else {
            sessionStorage.setItem('pendingExecutionRequestNode', JSON.stringify({ payload: executionPayload }));
            document.dispatchEvent(new CustomEvent('addExecutionRequestNode', {
              detail: executionPayload
            }));
          }
          triggerActivityRefresh();
        }}
      />

      <WorkflowBuilderModal
        isOpen={showWorkflowBuilderModal}
        onClose={() => setShowWorkflowBuilderModal(false)}
        workspaceId={workspaceId}
        currentUser={currentUser}
        workspaceName={workspace?.title || workspace?.projectName || 'Current Workspace'}
      />

      {/* Post Services Modal */}
      <PostServicesModal
        isOpen={showPostServicesModal}
        onClose={() => {
          setShowPostServicesModal(false);
          // Refetch workspace when modal closes (fallback for non-WebSocket scenarios)
          console.log('📥 Post Services modal closed, refreshing workspace...');
          setTimeout(() => refetchWorkspace(), 500);
        }}
        currentUser={currentUser}
        workspaceId={workspaceId}
        subtaskId={selectedSubtask?.id}
        taskId={selectedTask?.id}
        selectedSubtask={selectedSubtask}
        workspace={workspace}
        onWorkspaceUpdate={refetchWorkspace}
      />

      {/* Update Progress Modal */}
      <UpdateProgressModal
        isOpen={showUpdateProgressModal}
        onClose={() => setShowUpdateProgressModal(false)}
        workspaceId={workspaceId}
        projectId={workspace?.projectId || ''}
        taskId={selectedTask?.id || ''}
        subtaskId={selectedSubtask?.id || ''}
        tasks={workspace?.tasks || []}
        workspace={workspace}
        onUpdate={(updatedData) => {
          // Handle successful update - could refresh workspace data or show success message
          console.log('Progress updated:', updatedData);
        }}
      />

      {/* Review Progress Modal */}
      <ReviewProgressModal
        isOpen={showReviewProgressModal}
        onClose={() => setShowReviewProgressModal(false)}
        workspace={workspace}
        userRole={userRole}
      />

      {/* Client Review Progress Modal */}
      <ReviewProgressModal
        isOpen={showClientReviewProgressModal}
        onClose={() => setShowClientReviewProgressModal(false)}
        workspace={workspace}
        userRole="client"
      />

      {/* Project Complete Request Modal */}
      <ProjectCompleteModal
        isOpen={showProjectCompleteModal}
        onClose={() => setShowProjectCompleteModal(false)}
        workspace={workspace}
        userRole={userRole}
        isPM={isPM}
        isClient={!!detectedClientId}
      />

      {/* Invoice Tool Full Screen */}
      {showInvoiceTool && (
        <div className="fixed inset-0 z-50 bg-white">
          <InvoiceToolReplica 
            onClose={() => navigate(location.pathname.replace('/invoices', ''))}
            workspaceId={workspaceId}
            workspaceName={workspaceDisplayName}
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
          />
        </div>
      )}

      {/* Permissions Management Modal */}
      <PermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        workspace={workspace}
        onUpdatePermissions={(updatedPermissions) => {
          // Update local workspace state with new permissions
          setWorkspace(prev => ({
            ...prev,
            accessControl: {
              ...prev.accessControl,
              permissions: updatedPermissions
            }
          }));
        }}
      />

      {/* Invite CAS Modal */}
      <InviteCASModal
        isOpen={showInviteCASModal}
        onClose={() => setShowInviteCASModal(false)}
        workspace={workspace}
        onInviteSuccess={handleCASInviteSuccess}
      />

      {/* Cost Calculators Modal */}
      <CostCalculatorsModal
        isOpen={showCostCalculatorsModal}
        onClose={() => setShowCostCalculatorsModal(false)}
        onAddToCanvas={(calculatorData) => {
          // Handle adding calculator to canvas
          const elementData = {
            type: calculatorData.type,
            id: calculatorData.id,
            name: calculatorData.name,
            data: calculatorData.data,
            preview: calculatorData.name
          };
          const event = new CustomEvent('elementFromCalculator', {
            detail: elementData
          });
          document.dispatchEvent(event);
          console.log('📊 Calculator added to canvas:', calculatorData);
        }}
        workspaceId={workspaceId}
      />

      {/* ========================================
           VIDEO CALL COMPONENTS
         ======================================== */}

      {/* Start Call Modal - Shows collaborators list for selection */}
      {!activeCall && (
        <StartCallModal
          isOpen={showStartCallModal}
          onClose={() => setShowStartCallModal(false)}
          workspaceId={workspaceId}
          currentUser={currentUser}
          collaborators={workspaceCollaborators}
          onStartCall={handleStartCallSubmit}
        />
      )}

      {/* Incoming Call Notifications - Show popup for each incoming call invitation */}
      {!activeCall && notifications?.map(notification => {
        console.log('🔍 Checking notification:', { 
          type: notification.type, 
          id: notification.id, 
          processed: processedCallNotifications.has(notification.id),
          activeCall: activeCall 
        });
        
        if (notification.type === 'call_invitation' && !processedCallNotifications.has(notification.id)) {
          console.log('✅ Rendering IncomingCallNotification for:', notification.id);
          return (
            <IncomingCallNotification
              key={notification.id}
              notification={notification}
              onAccept={() => handleAcceptCall(notification)}
              onDecline={() => handleDeclineCall(notification)}
              currentUser={currentUser}
            />
          );
        }
        return null;
      })}

      {/* Active Call Interface - Full screen call UI when in active call */}
      {activeCall && (
        <ActiveCallInterface
          call={activeCall}
          currentUser={currentUser}
          onEndCall={handleEndCall}
        />
      )}



      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={paletteCommands}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        isOpen={showShortcutsOverlay}
        onClose={() => setShowShortcutsOverlay(false)}
      />

    </UploadProvider>
    </ToastProvider>
  );
};

export default WorkspacePage;
