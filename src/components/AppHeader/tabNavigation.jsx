// import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
// import { Link, useLocation, useNavigate } from 'react-router-dom';

// function ResponsiveNavigationTabs() {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState(location.pathname);
//   const [indicatorStyle, setIndicatorStyle] = useState({ 
//     width: '0px', 
//     transform: 'translateX(0px)', 
//     opacity: 0 
//   });
//   const tabRefs = useRef({});
//   const isInitialRender = useRef(true);
  
//   // Update active tab when URL changes
//   useEffect(() => {
//     setActiveTab(location.pathname);
//   }, [location.pathname]);
  
//   // Handles direct button click (for manual navigation)
//   const handleTabClick = (path) => {
//     setActiveTab(path);
//     navigate(path);
//   };

//   // Handle indicator position and animation
//   useLayoutEffect(() => {
//     // Skip animation on first render to prevent unwanted transitions
//     if (isInitialRender.current) {
//       isInitialRender.current = false;
      
//       const initialTabRef = tabRefs.current[activeTab];
//       if (initialTabRef) {
//         const { offsetWidth, offsetLeft } = initialTabRef;
//         // Set initial position without animation
//         setIndicatorStyle({
//           width: `${offsetWidth}px`,
//           transform: `translateX(${offsetLeft}px)`,
//           opacity: 1,
//           transition: 'none' // Prevent animation on first render
//         });
        
//         // Reset transition after initial positioning
//         setTimeout(() => {
//           setIndicatorStyle(prev => ({
//             ...prev,
//             transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), width 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-in-out'
//           }));
//         }, 50);
//       }
//       return;
//     }
    
//     // For subsequent tab changes, animate normally with requestAnimationFrame for smoother transitions
//     requestAnimationFrame(() => {
//       const currentTabRef = tabRefs.current[activeTab];
//       if (currentTabRef) {
//         const { offsetWidth, offsetLeft } = currentTabRef;
        
//         // Use better cubic-bezier timing for extra smoothness
//         setIndicatorStyle(prev => ({
//           ...prev,
//           width: `${offsetWidth}px`,
//           transform: `translateX(${offsetLeft}px)`,
//           opacity: 1,
//           transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), width 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-in-out'
//         }));
//       } else {
//         setIndicatorStyle(prev => ({ 
//           ...prev, 
//           opacity: 0, 
//           width: '0px' 
//         }));
//       }
//     });

//     // Handle window resize
//     const handleResize = () => {
//       const ref = tabRefs.current[activeTab];
//       if (ref) {
//         const { offsetWidth, offsetLeft } = ref;
//         requestAnimationFrame(() => {
//           setIndicatorStyle(prev => ({
//             ...prev,
//             width: `${offsetWidth}px`,
//             transform: `translateX(${offsetLeft}px)`,
//             opacity: 1,
//           }));
//         });
//       }
//     };

//     // Debounce the resize handler for better performance
//     let resizeTimeout;
//     const debouncedResize = () => {
//       clearTimeout(resizeTimeout);
//       resizeTimeout = setTimeout(handleResize, 100);
//     };

//     window.addEventListener('resize', debouncedResize);
//     return () => window.removeEventListener('resize', debouncedResize);
//   }, [activeTab]);

//   const tabsConfig = [
//     { path: '/vendor-home', label: 'Portfolio' },
//     { path: '/userproject', label: 'Projects' },
//     { path: '/userproduct', label: 'Products' },
//   ];

//   return (
//     <div className="flex justify-center pt-6">
//       <div className="bg-white rounded-full overflow-hidden flex shadow-md relative">
//         {/* The moving indicator */}
//         <div
//           className="absolute h-[90%] rounded-full bg-gradient-to-r from-[#10b981] to-[#047857] will-change-transform"
//           style={{
//             width: indicatorStyle.width ? `${parseFloat(indicatorStyle.width) * 0.97}px` : '0px',
//             transform: indicatorStyle.transform,
//             opacity: indicatorStyle.opacity,
//             left: '.8%',
//             top: '5%',
//             transition: indicatorStyle.transition || 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), width 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-in-out',
//           }}
//         />
        
//         {tabsConfig.map(tab => (
//           <div 
//             key={tab.path}
//             ref={el => (tabRefs.current[tab.path] = el)}
//             className="relative cursor-pointer"
//             onClick={() => handleTabClick(tab.path)}
//           >
//             <button 
//               className={`relative px-6 py-2 z-10 transition-colors duration-300 ${
//                 activeTab === tab.path ? 'text-white' : 'text-gray-700 hover:text-gray-900'
//               }`}
//             >
//               {tab.label}
//             </button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default ResponsiveNavigationTabs;

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ResponsiveNavigationTabs({ compact = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.pathname);
  
  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);
  
  const handleTabClick = (path) => {
    setActiveTab(path);
    navigate(path);
  };

  const tabsConfig = [
    { path: '/vendor-home', label: 'Portfolio' },
    { path: '/userproject', label: 'Projects' },
    { path: '/userproduct', label: 'Products' },
  ];

  const activeTabIndex = Math.max(tabsConfig.findIndex(tab => tab.path === activeTab), 0);
  const verticalInset = compact ? 2 : 3;
  const horizontalInset = compact ? 2 : 3;

  return (
    <div className={`flex justify-center transition-all duration-300 ${compact ? 'pt-8' : 'pt-6'}`}>
      <div className={`relative grid grid-cols-3 overflow-hidden rounded-full bg-white shadow-md transition-all duration-300 ${compact ? 'ring-1 ring-white/80' : ''}`}>
        <div
          className="absolute rounded-full bg-gradient-to-l from-[#095B49] to-[#000000] shadow-[0_6px_18px_rgba(0,0,0,0.18)] will-change-transform"
          style={{
            width: `calc(33.3333% - ${horizontalInset * 2}px)`,
            left: `calc(${activeTabIndex * 33.3333}% + ${horizontalInset}px)`,
            opacity: 1,
            top: `${verticalInset}px`,
            bottom: `${verticalInset}px`,
            transition: 'left 300ms cubic-bezier(0.34, 1.56, 0.64, 1), width 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-in-out',
          }}
        />
        
        {tabsConfig.map(tab => (
          <button
            key={tab.path}
            type="button"
            className={`relative z-10 min-w-[88px] font-medium text-center transition-all duration-300 ${compact ? 'px-4 py-2 text-[13px]' : 'px-8 py-3 text-sm'} ${
              activeTab === tab.path ? 'text-white' : 'text-gray-700 hover:text-gray-900'
            }`}
            onClick={() => handleTabClick(tab.path)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ResponsiveNavigationTabs;