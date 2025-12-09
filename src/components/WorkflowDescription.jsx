import React, { useEffect, useState, useRef } from "react";

const WorkflowDescription = ({ text, position }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // If you want descriptions to also re-animate when they scroll
          // out and back in, uncomment the line below.
          // setIsVisible(false); 
        }
      },
      { threshold: 0.2 } // Trigger when 20% of the component is visible
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const baseContainerClasses = [
    'transition-all duration-600 ease-out',
    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[20px]',
    
    // --- MOBILE & TABLET FIRST (<lg) ---
    // Full width, centered text, appropriate margins below the box.
    // The box in WorkflowStep is w-[80%] mx-auto on mobile.
    // This description will be part of the same flex column in WorkflowSection's item.
    'w-full max-w-full text-center mt-[1rem]', // Base styles for mobile/tablet
    'mx-auto px-4', // Center the container itself and add some padding
    
    // --- DESKTOP Overrides (lg+) ---
    'lg:max-w-[364px]', // Max width for desktop
    'lg:mt-[1.5rem]',  // Margin for desktop
    'lg:px-0', // Reset padding for desktop if specific margins are used
    // Remove lg:text-center if left/right alignment is desired for desktop
  ];

  const positionalClasses = [];
  if (position === 'left') {
    // Desktop specific alignment
    positionalClasses.push('lg:self-start lg:text-left lg:ml-[2rem]');
    // For screens smaller than lg, it will inherit text-center from base.
    // No specific ml for mobile as it's centered with mx-auto.
  } else if (position === 'right') {
    // Desktop specific alignment
    positionalClasses.push('lg:self-end lg:text-right lg:ml-0 lg:mr-[2rem]'); 
    // Ensure ml-0 is set if lg:ml-auto was on the box for right position previously.
  }

  const finalContainerClasses = [...baseContainerClasses, ...positionalClasses];

  const textPClasses = "text-white font-medium leading-[1.5] opacity-70 font-['Poppins']";
  // Note: Original CSS had .description-text opacity: 0.7. Tailwind's opacity-70 is 0.7.

  return (
    <div
      ref={ref}
      className={finalContainerClasses.filter(Boolean).join(' ')}
    >
      <p
        className={textPClasses}
        style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
      >
        {text}
      </p>
    </div>
  );
};

export default WorkflowDescription;