import React, { useEffect, useRef, useState } from "react";

const WorkflowStep = ({ position, title, sectionIndex }) => {
  const stepRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.2 }
    );

    const currentRef = stepRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const rectangleAnimationStyle = { animationDelay: `calc(${sectionIndex} * 0.2s)` };

  // --- Base Mobile/Stacked Styles first, then lg: for Desktop/Alternating ---

  const stepContainerClasses = [
    'flex w-full relative',
    'flex-col', // MOBILE Base: Stack step content and vertical line
    'lg:flex-row', // DESKTOP (lg+): Arrange in a row
  ];

  const stepContentClasses = [
    'flex items-center w-full relative',
    // Mobile base (xs specific from original CSS for alignment within column)
    'flex-col xs:items-start', // Default to items-start if not right
    position === 'right' && 'xs:items-end',
    // Desktop (lg+)
    'lg:flex-row', // Arrange content (rectangle & horizontal line) in a row
    position === 'left' ? 'lg:items-center' : 'lg:items-center', // Reset alignment for row
  ].filter(Boolean);

  const rectangleBaseClasses = `
    bg-custom-bg border-[3px] 
    relative flex items-center justify-center
    transition-colors duration-500 ease-in-out 
    text-custom-text
    
    // MOBILE Base (corresponds to @media (max-width: 1024px) .rectangle styles)
    w-[80%] h-auto min-h-[100px] rounded-[25px] mx-auto transform-none
    my-[1rem] // Margin for stacked view
    
    // DESKTOP (lg+) overrides for alternating layout
    lg:w-[38%] lg:max-w-[450px] lg:h-[140%] lg:min-h-0 lg:mx-0 lg:my-0
    
    // Smaller screen adjustments (within mobile or desktop context)
    md:py-[1rem] md:px-[1.5rem] // For 768px+
    lg:md:min-w-[200px] lg:md:h-[100px] // Specific for 768px on desktop layout

    xs:p-[0.75rem] // For 320px+
    sm:min-w-[180px] sm:h-[80px] // For 480px+ (careful with lg overrides)
    lg:sm:min-w-0 lg:sm:h-[140%] // Reset 480px specifics if on desktop

  `;
  // The lg:sm: type prefixes ensure that sm styles are correctly overridden by lg if needed,
  // or that sm styles correctly apply on mobile if lg isn't active.

  const rectangleClasses = [
    rectangleBaseClasses,
    // Corrected DESKTOP (lg+) specific border radius
    position === 'left'
      ? 'lg:rounded-r-[50px] lg:rounded-l-none' // Left rectangle: round right side, flat left side
      : 'lg:rounded-l-[50px] lg:rounded-r-none', // Right rectangle: round left side, flat right side
    
    isVisible ? 'border-line-active' : 'border-line-inactive opacity-0',
    
    position === 'left' && (isVisible ? 'lg:animate-fadeSlideIn' : 'lg:opacity-0'),
    position === 'right' && (isVisible ? 'lg:animate-fadeSlideInRight lg:ml-auto' : 'lg:opacity-0 lg:ml-auto'),
    
    isVisible && 'lg:opacity-100'

  ].filter(Boolean).join(' ');


  const titleClasses = `
    text-custom-text font-poppins font-normal
    text-[1.1rem] // Base for mobile (from xs:text-[1.1rem])
    lg:text-[1.35rem] // Desktop font size
  `;

  // For Desktop (lg+): Horizontal lines are shown and animate.
  // For Mobile (<lg): Horizontal lines are hidden by default.
  // Exception for 480px (sm) screens: they become short vertical dotted lines.
  const horizontalLinesContainerClasses = [
    'relative w-full',
    'md:hidden',
    'sm:hidden',
    'hidden', // Base: hidden (will not show on xs if not sm or lg)
    'sm:block', // Visible on sm screens (for the vertical stub)
    'lg:block lg:flex-grow', // Visible and takes space on lg screens
  ].join(' ');
  
  // Base for the line element itself, common properties
  const horizontalLineElementBase = 'transition-colors duration-500 ease-in-out relative';

  // Horizontal line on the left step
  const horizontalLineLeftClasses = [
    horizontalLineElementBase,
    // Default state (applies to xs, and is the starting point for lg animation)
    'w-0 h-[3px] opacity-0', 

    // SM specific (vertical stub, overrides default state for sm screens)
    'sm:w-[3px] sm:h-[40px] sm:my-[0.5rem] sm:border-l-[3px] sm:border-dotted sm:border-white/50 sm:bg-none sm:opacity-100',
    
    // LG specific (horizontal animated line - overrides SM styles)
    // Explicitly reset properties that SM might have set, to prepare for horizontal animation
    'lg:w-0 lg:h-[3px] lg:my-0 lg:border-none lg:bg-transparent lg:opacity-0', 
    // Apply animation and final appearance for LG when visible
    // The animation keyframes include setting opacity to 1 and the target width.
    isVisible && 'lg:animate-drawHorizontal lg:bg-gradient-to-r from-transparent to-line-active', 
  ].filter(Boolean).join(' ');

  // Horizontal line on the right step
  const horizontalLineRightClasses = [
    horizontalLineElementBase,
    'w-0 h-[3px] opacity-0', // Default state
    'ml-auto', // Positions the line element to the right of its container (for both sm stub and lg line)

    // SM specific (vertical stub)
    'sm:w-[3px] sm:h-[40px] sm:my-[0.5rem] sm:border-l-[3px] sm:border-dotted sm:border-white/50 sm:bg-none sm:opacity-100',

    // LG specific (horizontal animated line - overrides SM styles)
    'lg:w-0 lg:h-[3px] lg:my-0 lg:border-none lg:bg-transparent lg:opacity-0 lg:ml-auto', // lg:ml-auto ensures it stays right
    isVisible && 'lg:animate-drawHorizontalRight lg:bg-gradient-to-l from-transparent to-line-active',
  ].filter(Boolean).join(' ');
  
  const verticalLineClasses = [
    'absolute transform-origin-top',
    'bg-gradient-to-b from-line-active to-transparent',
    
    // --- RESPONSIVE HEIGHTS ---
    // These define the final height the line will scale to.
    'xs:h-[80%]',   // Height for extra-small screens
    'sm:h-[200%]',   // ADDED: Specific height for small screens, adjust as needed
    'md:h-[185%]',   // MODIFIED: Height for medium screens. This is the critical value. Start with 45% and adjust.
    'lg:h-[220%]',  // Height for large screens (desktop)
    
    // --- POSITIONING ---
    // Mobile/Tablet default (stacked view): centered, below current box
    'left-1/2 -translate-x-1/2 top-[103%]', 
    // Desktop (alternating view): specific left/right, adjusted top, override mobile translate
    position === 'left' 
        ? 'lg:left-auto lg:right-[15%] lg:top-[46%] lg:translate-x-0' 
        : 'lg:left-[14%] lg:right-auto lg:top-[46%] lg:translate-x-0',
    
    // --- ANIMATION & VISIBILITY STATE ---
    isVisible 
      ? 'animate-drawVertical !w-[4px]' // Apply animation (handles opacity and scaleY). Force width.
      : 'opacity-0 scale-y-0 w-0',    // Initial state: invisible, scaled to zero height, no width.
  ].filter(Boolean).join(' ');

  return (
    <div ref={stepRef} className={stepContainerClasses.join(' ')}>
      <div className={stepContentClasses.join(' ')}>
        {position === "left" ? (
          <>
            <div 
              className={rectangleClasses}
              style={isVisible ? { ...rectangleAnimationStyle, borderColor: 'var(--color-line-active)' } : { ...rectangleAnimationStyle, borderColor: 'var(--color-line-inactive)' }}
            >
              <h2 className={titleClasses}>{title}</h2>
            </div>
            <div className={horizontalLinesContainerClasses}>
              <div className={horizontalLineLeftClasses}></div>
            </div>
          </>
        ) : (
          <>
            <div className={horizontalLinesContainerClasses}>
               <div className={horizontalLineRightClasses}></div>
            </div>
            <div
              className={`${rectangleClasses} ${position === 'right' ? 'lg:ml-auto' : ''}`}
              style={isVisible ? { ...rectangleAnimationStyle, borderColor: 'var(--color-line-active)' } : { ...rectangleAnimationStyle, borderColor: 'var(--color-line-inactive)' }}
            >
              <h2 className={titleClasses}>{title}</h2>
            </div>
          </>
        )}
      </div>
      <div className={verticalLineClasses}></div>
    </div>
  );
};

export default WorkflowStep;
