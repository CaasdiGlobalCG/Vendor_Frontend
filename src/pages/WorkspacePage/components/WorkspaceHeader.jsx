import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Plus, Save, MessageCircle, HelpCircle, X, ChevronLeft, ChevronRight, Lightbulb, MousePointer, Link2, Trash2, Users, Zap, Layout, Settings, CheckCircle, MoreHorizontal, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../../context/VendorContext';
import config from '../../../config/env';
import { Auth } from 'aws-amplify';

// Tutorial steps with target selectors for highlighting actual elements
const tutorialSteps = [
  {
    title: "Welcome to the Workspace! 👋",
    description: "This interactive canvas is where you design and build your project workflow. Let's walk through the key features!",
    target: null, // No target for welcome - shows centered modal
    position: "center",
    icon: "🎯"
  },
  {
    title: "Elements Panel",
    description: "Click here to open the Elements sidebar. Browse categories like Forms, Charts, Tables and drag elements onto the canvas to build your workflow.",
    target: "[data-tour='elements-btn']",
    position: "bottom",
    icon: "🧩"
  },
  {
    title: "Layouts",
    description: "Use pre-configured layouts to quickly arrange multiple elements in common patterns.",
    target: "[data-tour='layouts-btn']",
    position: "bottom",
    icon: "📐"
  },
  {
    title: "Text Annotations",
    description: "Add text elements to annotate your workflow, create labels, or add notes for your team.",
    target: "[data-tour='text-btn']",
    position: "bottom",
    icon: "✏️"
  },
  {
    title: "Templates",
    description: "Jumpstart your project with ready-made workflow templates. Perfect for common use cases!",
    target: "[data-tour='templates-btn']",
    position: "bottom",
    icon: "📋"
  },
  {
    title: "The Canvas",
    description: "This is your workspace canvas. Drop elements here, connect them, and build your workflow. Use scroll to zoom, and drag to pan around!",
    target: "[data-tour='canvas']",
    position: "center",
    icon: "🎨"
  },
  {
    title: "Auto-Connect Magic ⚡",
    description: "When you drop a new element near existing ones, they automatically connect! The system detects the best connection direction based on positions.",
    target: "[data-tour='canvas']",
    position: "center",
    icon: "🔗"
  },
  {
    title: "Element Info",
    description: "Hover over the 'i' icon on any element to see details: what it does, who added it, and when it was added.",
    target: "[data-tour='canvas']",
    position: "center",
    icon: "ℹ️"
  },
  {
    title: "You're Ready! 🎉",
    description: "Start building by clicking Elements and dragging items to the canvas. Need help again? Click the Help button anytime!",
    target: "[data-tour='help-btn']",
    position: "bottom-left",
    icon: "🚀"
  }
];

const WorkspaceHeader = ({
  isCanvasActive = false,
  syncStatus = 'idle',
  lastSavedAt = null,
  onElementsClick,
  onLayoutsClick,
  onTextClick,
  onTemplatesClick,
  onWorkflowBuilderClick,
  showPostServicesActions = false,
  onOpenPostServices,
  onOpenUpdateProgress,
  onOpenReviewProgress,
  onOpenClientReviewProgress,
  onOpenProjectComplete,
  userRole = 'vendor',
  isPM = false,
  isClient = false,
  workspace = null,
  selectedTask = null,
  selectedSubtask = null
}) => {
  const navigate = useNavigate();
  const { currentUser } = useContext(VendorContext);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState({});
  const [arrowPosition, setArrowPosition] = useState('top');

  // Calculate tooltip position based on target element
  const calculatePosition = useCallback(() => {
    const step = tutorialSteps[currentStep];
    
    if (!step.target || step.position === 'center') {
      // Center the tooltip
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      setHighlightStyle({});
      setArrowPosition('none');
      return;
    }

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      // Fallback to center if element not found
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      setHighlightStyle({});
      setArrowPosition('none');
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const padding = 8;
    
    // Set highlight around target element
    setHighlightStyle({
      position: 'fixed',
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: '12px'
    });

    // Calculate tooltip position based on step.position
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const gap = 16;

    let newStyle = { position: 'fixed' };
    let arrow = 'top';

    switch (step.position) {
      case 'bottom':
        newStyle.top = rect.bottom + gap;
        newStyle.left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrow = 'top';
        break;
      case 'top':
        newStyle.top = rect.top - tooltipHeight - gap;
        newStyle.left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrow = 'bottom';
        break;
      case 'left':
        newStyle.top = rect.top + rect.height / 2 - tooltipHeight / 2;
        newStyle.left = rect.left - tooltipWidth - gap;
        arrow = 'right';
        break;
      case 'right':
        newStyle.top = rect.top + rect.height / 2 - tooltipHeight / 2;
        newStyle.left = rect.right + gap;
        arrow = 'left';
        break;
      case 'bottom-left':
        newStyle.top = rect.bottom + gap;
        newStyle.left = rect.left - tooltipWidth + rect.width;
        arrow = 'top-right';
        break;
      default:
        newStyle.top = rect.bottom + gap;
        newStyle.left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrow = 'top';
    }

    // Ensure tooltip stays within viewport
    if (newStyle.left < 16) newStyle.left = 16;
    if (newStyle.left + tooltipWidth > window.innerWidth - 16) {
      newStyle.left = window.innerWidth - tooltipWidth - 16;
    }
    if (newStyle.top < 16) newStyle.top = 16;

    setTooltipStyle(newStyle);
    setArrowPosition(arrow);
  }, [currentStep]);

  // Recalculate position when step changes or window resizes
  useEffect(() => {
    if (showTutorial) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      return () => window.removeEventListener('resize', calculatePosition);
    }
  }, [showTutorial, currentStep, calculatePosition]);


  // Determine the correct dashboard based on user role and access method
 const handleBackToDashboard = () => {
  // Check if user came from PM dashboard
  const storedPmUser = sessionStorage.getItem('pmUser');
  let accessedFromPM = false;

  try {
    if (storedPmUser) {
      const pmUser = JSON.parse(storedPmUser);
      accessedFromPM = pmUser.accessedFrom === 'pm-dashboard';
    }
  } catch (e) {
    console.error('Error parsing stored user data:', e);
  }

  const isPM = currentUser?.role === 'pm' || 
               currentUser?.pmId || 
               currentUser?.email?.includes('pm') ||
               accessedFromPM;

  if (isPM || accessedFromPM) {
    // Navigate back to PM dashboard on port 3001
    window.location.href = 'http://localhost:3001/dashboard';
  } else {
    navigate('/VendorDashboard');
  }
};

  // Tutorial navigation helpers
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    setCurrentStep(0);
  };

  const openTutorial = () => {
    setShowTutorial(true);
    setCurrentStep(0);
  };

  // Check if workspace is completed - disable editing for vendors
  const isWorkspaceCompleted = workspace?.status === 'completed' || workspace?.status === 'project completed';
  const isVendor = userRole === 'vendor';
  
  // Check if current task/subtask is unlocked
  const isCurrentTaskUnlocked = React.useMemo(() => {
    if (!isWorkspaceCompleted || !selectedTask || !selectedSubtask) return false;
    const unlockedTasks = workspace?.unlockedTasks || [];
    
    console.log('🔍 WorkspaceHeader - Unlock Check:', {
      isWorkspaceCompleted,
      selectedTaskId: selectedTask?.id,
      selectedSubtaskId: selectedSubtask?.id,
      unlockedTasks,
      checking: unlockedTasks.some(
        ut => ut.taskId === selectedTask.id && ut.subtaskId === selectedSubtask.id
      )
    });
    
    return unlockedTasks.some(
      ut => ut.taskId === selectedTask.id && ut.subtaskId === selectedSubtask.id
    );
  }, [isWorkspaceCompleted, selectedTask, selectedSubtask, workspace?.unlockedTasks]);
  
  // Vendors: disable editing only if workspace is completed AND current task is NOT unlocked
  const shouldDisableEditing = isWorkspaceCompleted && isVendor && !isCurrentTaskUnlocked;
  
  console.log('🔍 WorkspaceHeader - Editing State:', {
    isWorkspaceCompleted,
    isVendor,
    isCurrentTaskUnlocked,
    shouldDisableEditing
  });
  
  // Manual refresh handler for vendors on completed workspaces
  const handleRefresh = () => {
    console.log('🔄 Manual workspace refresh triggered');
    window.location.reload();
  };

  const getSyncBadge = () => {
    const lastSavedText = lastSavedAt
      ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    switch (syncStatus) {
      case 'saving':
        return {
          label: 'Syncing...',
          subLabel: 'Saving latest updates',
          dotClass: 'bg-amber-500 animate-pulse',
          containerClass: 'border-amber-200 bg-amber-50 text-amber-800',
        };
      case 'offline':
        return {
          label: 'Offline',
          subLabel: 'Changes may not sync',
          dotClass: 'bg-rose-500',
          containerClass: 'border-rose-200 bg-rose-50 text-rose-800',
        };
      case 'error':
        return {
          label: 'Sync issue',
          subLabel: 'Retrying automatically',
          dotClass: 'bg-rose-500',
          containerClass: 'border-rose-200 bg-rose-50 text-rose-800',
        };
      case 'live':
      default:
        return {
          label: 'Live',
          subLabel: lastSavedText ? `Saved ${lastSavedText}` : 'All changes synced',
          dotClass: 'bg-emerald-500',
          containerClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        };
    }
  };

  const syncBadge = getSyncBadge();

  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowRef = useRef(null);

  // Close overflow menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) setShowOverflowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-1.5" data-workspace-header>
      <div className="relative flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:gap-4">
          <button 
            onClick={handleBackToDashboard}
            className="flex shrink-0 items-center space-x-2 rounded-lg px-2.5 py-2 text-gray-700 transition-colors hover:bg-gray-100"
            title={`Back to ${currentUser?.role === 'pm' ? 'PM' : 'Vendor'} Dashboard`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {/* <span>Back to Dashboard</span> */}
          </button>
          
          <div className="flex shrink-0 items-center space-x-2">
            <div className="flex items-center space-x-2 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                CG
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </div>
            
            {/* Refresh button for vendors on completed workspace */}
            {isWorkspaceCompleted && isVendor && (
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Refresh to check for unlocked tasks"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            )}
          </div>
          
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5 lg:gap-2">
            <button 
              data-tour="elements-btn"
              disabled={!isCanvasActive || shouldDisableEditing}
              onClick={isCanvasActive && !shouldDisableEditing ? onElementsClick : undefined}
              className={`flex shrink-0 items-center space-x-1.5 rounded-lg px-2 py-2 text-sm font-normal transition-all duration-200 lg:px-2.5 ${
                isCanvasActive && !shouldDisableEditing
                  ? 'text-gray-700 hover:shadow-md cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
}`}
              title={shouldDisableEditing ? 'Project is completed - editing disabled' : 'Add Elements'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline xl:hidden">Elem</span>
              <span className="hidden xl:inline">Elements</span>
            </button>
            <button 
              data-tour="text-btn"
              disabled={!isCanvasActive || shouldDisableEditing}
              onClick={isCanvasActive && !shouldDisableEditing ? onTextClick : undefined}
              className={`flex shrink-0 items-center space-x-1.5 rounded-lg px-2 py-2 text-sm font-normal transition-all duration-200 lg:px-2.5 ${
                isCanvasActive && !shouldDisableEditing
                  ? 'text-gray-700 hover:shadow-md cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
}`}
              title={shouldDisableEditing ? 'Project is completed - editing disabled' : 'Add Text'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Text</span>
            </button>
            <button 
              data-tour="templates-btn"
              disabled={!isCanvasActive || shouldDisableEditing}
              onClick={isCanvasActive && !shouldDisableEditing ? onTemplatesClick : undefined}
              className={`flex shrink-0 items-center space-x-1.5 rounded-lg px-2 py-2 text-sm font-normal transition-all duration-200 lg:px-2.5 ${
                isCanvasActive && !shouldDisableEditing
                    ? 'text-gray-700 hover:shadow-md cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              title={shouldDisableEditing ? 'Project is completed - editing disabled' : 'Add Templates'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline xl:hidden">Temps</span>
              <span className="hidden xl:inline">Templates</span>
            </button>

            <button
              data-tour="workflow-builder-btn"
              disabled={!isCanvasActive || shouldDisableEditing}
              onClick={isCanvasActive && !shouldDisableEditing ? onWorkflowBuilderClick : undefined}
              className={`flex shrink-0 items-center space-x-1.5 rounded-lg px-2 py-2 text-sm font-normal transition-all duration-200 lg:px-2.5 ${
                isCanvasActive && !shouldDisableEditing
                  ? 'text-gray-700 hover:shadow-md cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
              title={shouldDisableEditing ? 'Project is completed - editing disabled' : 'Open Workflow Builder'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline xl:hidden">Workflow</span>
              <span className="hidden xl:inline">Workflow Builder</span>
            </button>
          </div>
        </div>

          {/* Centered Workspace Title */}
        <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 2xl:block">
          <h1 className="text-xl font-semibold text-gray-800">
            {localStorage.getItem('currentWorkspace') || 'Workspace'}
          </h1>
        </div>

        {/* Right side actions — compact with overflow */}
        <div className="flex shrink-0 items-center space-x-1 md:space-x-1.5">
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium ${syncBadge.containerClass}`}
            title={syncBadge.subLabel}
            aria-live="polite"
          >
            <span className={`inline-block w-2 h-2 rounded-full ${syncBadge.dotClass}`} />
            <span>{syncBadge.label}</span>
          </div>

          {/* Primary actions always visible */}
          {showPostServicesActions && (
            <>
              <button
                onClick={onOpenPostServices}
                className="flex items-center space-x-1 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                title="Post Services"
              >
                <MessageCircle className="w-4 h-4 text-gray-600" />
                <span className="hidden 2xl:inline text-[10px] font-medium text-gray-500">Post Service</span>
              </button>
            </>
          )}

          {/* Overflow menu for secondary actions */}
          {showPostServicesActions && (
            <div ref={overflowRef} className="relative">
              <button
                onClick={() => setShowOverflowMenu(prev => !prev)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="More actions"
                aria-label="More workspace actions"
                aria-expanded={showOverflowMenu}
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>

              {showOverflowMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                  {isPM ? (
                    <>
                      <button onClick={() => { onOpenReviewProgress(); setShowOverflowMenu(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Zap className="w-4 h-4 text-orange-600" />
                        <span>Review Progress</span>
                      </button>
                      <button onClick={() => { onOpenProjectComplete(); setShowOverflowMenu(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span>Complete Request</span>
                      </button>
                    </>
                  ) : isClient ? (
                    <>
                      <button onClick={() => { onOpenClientReviewProgress(); setShowOverflowMenu(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Zap className="w-4 h-4 text-green-600" />
                        <span>Approve Progress</span>
                      </button>
                      <button onClick={() => { onOpenProjectComplete(); setShowOverflowMenu(false); }} className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span>Complete Request</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { if (!shouldDisableEditing) { onOpenUpdateProgress(); setShowOverflowMenu(false); } }}
                      disabled={shouldDisableEditing}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm ${shouldDisableEditing ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Zap className="w-4 h-4 text-gray-600" />
                      <span>Update Progress</span>
                    </button>
                  )}

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={async () => {
                      setShowOverflowMenu(false);
                      const targetHome = config.B2B_MARKETPLACE_URL;
                      if (!targetHome) { alert('B2B marketplace URL is not configured.'); return; }
                      let idToken = '';
                      try { const session = await Auth.currentSession(); idToken = session.getIdToken().getJwtToken(); } catch { idToken = localStorage.getItem('authToken') || ''; }
                      if (idToken) { window.location.href = `${targetHome}/?token=${encodeURIComponent(idToken)}`; return; }
                      const base = targetHome.replace(/\/home\/?$/, '');
                      window.location.href = `${base}/signup`;
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Link2 className="w-4 h-4 text-emerald-700" />
                    <span>B2B Marketplace</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Help Button — always visible */}
          <button
            data-tour="help-btn"
            onClick={openTutorial}
            className="p-1.5 hover:bg-purple-50 rounded-full transition-all duration-200 group border border-purple-200 hover:border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100"
            title="Workspace Tutorial"
          >
            <HelpCircle className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </button>

          {/* Command Palette shortcut hint */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
              window.dispatchEvent(event);
            }}
            className="hidden xl:flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100"
            title="Open command palette (Ctrl+K)"
          >
            <Search className="w-3 h-3" />
            <span className="text-[10px]">Search</span>
            <kbd className="ml-0.5 px-1 py-0.5 text-[9px] bg-white border border-gray-200 rounded">⌘K</kbd>
          </button>
        </div>
      </div>

      {/* Tutorial Overlay with Spotlight */}
      {showTutorial && (
        <>
          {/* Dark overlay with spotlight cutout */}
          <div className="fixed inset-0 z-[9998] pointer-events-none">
            {/* Full screen dark overlay */}
            <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" />
            
            {/* Spotlight highlight on target element */}
            {highlightStyle.width && (
              <div
                className="absolute bg-transparent transition-all duration-300 ease-out"
                style={{
                  ...highlightStyle,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px 4px rgba(139, 92, 246, 0.5)',
                  zIndex: 9999
                }}
              />
            )}
          </div>

          {/* Tutorial Tooltip */}
          <div
            className="fixed z-[10000] w-80 animate-fade-in"
            style={tooltipStyle}
          >
            {/* Arrow pointing to element */}
            {arrowPosition === 'top' && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
            )}
            {arrowPosition === 'bottom' && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
            )}
            {arrowPosition === 'left' && (
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
            )}
            {arrowPosition === 'right' && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
            )}
            {arrowPosition === 'top-right' && (
              <div className="absolute -top-2 right-8 w-4 h-4 bg-white rotate-45 shadow-lg" />
            )}
            
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-purple-100">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 relative">
                <button
                  onClick={closeTutorial}
                  className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{tutorialSteps[currentStep].icon}</span>
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      {tutorialSteps[currentStep].title}
                    </h3>
                    <p className="text-purple-200 text-xs">
                      Step {currentStep + 1} of {tutorialSteps.length}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {tutorialSteps[currentStep].description}
                </p>
                
                {/* Progress bar */}
                <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Footer with navigation */}
              <div className="px-4 pb-4 flex justify-between items-center">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    currentStep === 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                
                {/* Step dots */}
                <div className="flex space-x-1">
                  {tutorialSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        index === currentStep 
                          ? 'w-4 bg-purple-600' 
                          : index < currentStep
                            ? 'bg-purple-400'
                            : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
                
                {currentStep === tutorialSteps.length - 1 ? (
                  <button
                    onClick={closeTutorial}
                    className="flex items-center space-x-1 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                  >
                    <span>Finish</span>
                    <Zap className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    className="flex items-center space-x-1 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceHeader;
