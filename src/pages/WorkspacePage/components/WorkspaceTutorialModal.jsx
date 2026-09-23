import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const tutorialSteps = [
  {
    title: "Welcome to the Workspace! 👋",
    description: "This interactive canvas is where you design and build your project workflow. Let's walk through the key features!",
    target: null,
    position: "center",
    icon: "🎯"
  },
  {
    title: "Elements Panel",
    description: "Browse cards, tables, images, inputs, and drag elements directly onto the canvas to build your workflow.",
    target: "[data-tour='elements-btn']",
    position: "right",
    icon: "🧩"
  },
  {
    title: "Text Annotations",
    description: "Add headings, subheadings, sticky notes, or callouts to label and document your project stages.",
    target: "[data-tour='text-btn']",
    position: "right",
    icon: "✏️"
  },
  {
    title: "Templates Library",
    description: "Jumpstart your document with pre-built templates for quotations, purchase orders, RFQ responses, and BOQ.",
    target: "[data-tour='templates-btn']",
    position: "right",
    icon: "📋"
  },
  {
    title: "Workflow Builder",
    description: "Design multi-tier approval chains and transitions for project sign-offs.",
    target: "[data-tour='workflow-btn']",
    position: "right",
    icon: "⚡"
  },
  {
    title: "Tasks & Subtasks",
    description: "Organize project deliverables into tasks and subtasks, assign members, and track completion status.",
    target: "[data-tour='tasks-btn']",
    position: "right",
    icon: "✅"
  },
  {
    title: "The Canvas",
    description: "Drop elements here, connect them, and build your workflow. Use scroll to zoom, and drag with Space to pan!",
    target: "[data-workspace-canvas]",
    position: "center",
    icon: "🎨"
  },
  {
    title: "You're All Set! 🚀",
    description: "Start building your workspace. You can click the Help icon anytime to revisit this walkthrough.",
    target: "[data-tour='help-btn']",
    position: "bottom-left",
    icon: "🎉"
  }
];

const WorkspaceTutorialModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState({});
  const [arrowPosition, setArrowPosition] = useState('none');

  const calculatePosition = useCallback(() => {
    if (!isOpen) return;
    const step = tutorialSteps[currentStep];

    if (!step.target || step.position === 'center') {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000
      });
      setHighlightStyle({});
      setArrowPosition('none');
      return;
    }

    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000
      });
      setHighlightStyle({});
      setArrowPosition('none');
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const padding = 6;
    setHighlightStyle({
      top: `${rect.top - padding}px`,
      left: `${rect.left - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
      borderRadius: '8px'
    });

    if (step.position === 'right') {
      setTooltipStyle({
        position: 'fixed',
        top: `${Math.max(16, rect.top)}px`,
        left: `${rect.right + 16}px`,
        zIndex: 10000
      });
      setArrowPosition('left');
    } else if (step.position === 'bottom-left') {
      setTooltipStyle({
        position: 'fixed',
        top: `${rect.bottom + 12}px`,
        left: `${Math.max(16, rect.right - 280)}px`,
        zIndex: 10000
      });
      setArrowPosition('top-right');
    } else {
      setTooltipStyle({
        position: 'fixed',
        top: `${rect.bottom + 12}px`,
        left: `${rect.left + rect.width / 2 - 140}px`,
        zIndex: 10000
      });
      setArrowPosition('top');
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      return () => window.removeEventListener('resize', calculatePosition);
    }
  }, [isOpen, calculatePosition]);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998] transition-opacity pointer-events-auto" onClick={onClose} />

      {/* Spotlight cutout */}
      {highlightStyle.width && (
        <div
          className="fixed pointer-events-none transition-all duration-300"
          style={{
            ...highlightStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 20px 4px rgba(37, 99, 235, 0.4)',
            zIndex: 9999
          }}
        />
      )}

      {/* Tooltip dialog */}
      <div className="fixed w-80 z-[10000] bg-surface rounded-xl shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={tooltipStyle}>
        <div className="bg-black px-4 py-3 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{step.icon}</span>
            <div>
              <h4 className="font-semibold text-sm leading-tight">{step.title}</h4>
              <p className="text-info text-[11px] mt-0.5">Step {currentStep + 1} of {tutorialSteps.length}</p>
            </div>
          </div>
        </div>

        <div className="p-4 text-xs text-dim leading-relaxed">
          {step.description}
        </div>

        <div className="px-4 pb-3 pt-1 flex items-center justify-between border-t border-line">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-dim hover:text-ink disabled:opacity-30 disabled:hover:text-dim"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          {currentStep < tutorialSteps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-info hover:bg-info text-white rounded-lg text-xs font-semibold  transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-cta hover:bg-cta text-cta-foreground rounded-lg text-xs font-semibold  transition-colors"
            >
              Finish Tour
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default WorkspaceTutorialModal;
