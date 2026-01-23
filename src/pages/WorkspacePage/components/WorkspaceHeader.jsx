import React, { useContext, useState, useEffect, useCallback } from 'react';
import { ChevronDown, Plus, Save, MessageCircle, HelpCircle, X, ChevronLeft, ChevronRight, Lightbulb, MousePointer, Link2, Trash2, Users, Zap, Layout, Settings, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../../context/VendorContext';

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
  onElementsClick,
  onLayoutsClick,
  onTextClick,
  onTemplatesClick,
  showPostServicesActions = false,
  onOpenPostServices,
  onOpenUpdateProgress,
  onOpenReviewProgress,
  onOpenClientReviewProgress,
  onOpenProjectComplete,
  userRole = 'vendor',
  isPM = false,
  isClient = false
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

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-1" data-workspace-header>
      <div className="flex items-center justify-between relative">
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleBackToDashboard}
            className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={`Back to ${currentUser?.role === 'pm' ? 'PM' : 'Vendor'} Dashboard`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {/* <span>Back to Dashboard</span> */}
          </button>
          
          <div className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
              CG
            </div>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              data-tour="elements-btn"
              disabled={!isCanvasActive}
              onClick={isCanvasActive ? onElementsClick : undefined}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-normal transition-all duration-200 ${
                isCanvasActive
                  ? 'text-gray-700 hover:shadow-md cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
}`}
            >
              <Plus className="w-4 h-4" />
              <span>Elements</span>
            </button>
            <button 
              data-tour="text-btn"
              disabled={!isCanvasActive}
              onClick={isCanvasActive ? onTextClick : undefined}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-normal transition-all duration-200 ${
                isCanvasActive
                  ? 'text-gray-700 hover:shadow-md cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
}`}
            >
              <Plus className="w-4 h-4" />
              <span>Text</span>
            </button>
            <button 
              data-tour="templates-btn"
              disabled={!isCanvasActive}
              onClick={isCanvasActive ? onTemplatesClick : undefined}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-normal transition-all duration-200 ${
                isCanvasActive
                    ? 'text-gray-700 hover:shadow-md cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
            >
              <Plus className="w-4 h-4" />
              <span>Templates</span>
            </button>
          </div>
        </div>

          {/* Centered Workspace Title */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h1 className="text-xl font-semibold text-gray-800">
            {localStorage.getItem('currentWorkspace') || 'Workspace'}
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {showPostServicesActions && (
            <>
              <button
                onClick={onOpenPostServices}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1"
                title="Post Services"
              >
                <MessageCircle className="w-4 h-4 text-gray-600" />
                <span className="text-[10px] font-medium text-gray-500">Post Service</span>
              </button>
              
              {isPM ? (
                <>
                  <button
                    onClick={onOpenReviewProgress}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1"
                    title="Review Progress"
                  >
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span className="text-[10px] font-medium text-gray-500">Review Progress</span>
                  </button>
                  <button
                    onClick={onOpenProjectComplete}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1"
                    title="Project Complete Request"
                  >
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-medium text-gray-500">Complete Request</span>
                  </button>
                </>
              ) : isClient ? (
                <>
                  <button
                    onClick={onOpenClientReviewProgress}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1"
                    title="Approve Progress"
                  >
                    <Zap className="w-4 h-4 text-green-600" />
                    <span className="text-[10px] font-medium text-gray-500">Approve Progress</span>
                  </button>
                  <button
                    onClick={onOpenProjectComplete}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1"
                    title="Project Complete Request"
                  >
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-medium text-gray-500">Complete Request</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenUpdateProgress}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1"
                  title="Update Progress"
                >
                  <Zap className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] font-medium text-gray-500">Update Progress</span>
                </button>
              )}
            </>
          )}

          {/* Help Button - Small icon style */}
          <button
            data-tour="help-btn"
            onClick={openTutorial}
            className="p-2 hover:bg-purple-50 rounded-full transition-all duration-200 group border border-purple-200 hover:border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100"
            title="Workspace Tutorial"
          >
            <HelpCircle className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
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
