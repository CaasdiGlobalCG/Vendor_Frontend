import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// Inlined SVG content
const LineSvg = () => (
  <svg width="100%" height="100%" viewBox="0 0 1431 327" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <path d="M-16.9989 325.496C126.5 168.5 283.582 -2.21773 518.292 81.6402C753.001 165.498 761 233.5 989.958 251.6C1218.92 269.699 1429.23 0.996465 1429.23 0.996465" stroke="url(#paint0_linear_316_249_inline)" strokeWidth="3"/>
    <defs>
      <linearGradient id="paint0_linear_316_249_inline" x1="-51.6359" y1="241.134" x2="1429.59" y2="238.867" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00C398"/>
        <stop offset="0.544" stopColor="#EF21DB"/>
        <stop offset="1" stopColor="#EF21DB" stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

const TaglineSection = () => {
  const lineRef = useRef(null);
  const { scrollY } = useScroll();

  const lineScale = useTransform(scrollY, [200, 400], [0.8, 1]);
  const lineOpacity = useTransform(scrollY, [200, 400], [0, 1]);

  useEffect(() => {
    const motionDivElement = lineRef.current;
    if (!motionDivElement) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const lineElementToAnimate = entry.target.querySelector('[data-line-animation]');
        if (lineElementToAnimate) {
          if (entry.isIntersecting) {
            lineElementToAnimate.classList.remove('animate-drawLine');
            void lineElementToAnimate.offsetWidth;
            lineElementToAnimate.classList.add('animate-drawLine');
          } else {
            lineElementToAnimate.classList.remove('animate-drawLine');
          }
        }
      },
      {
        threshold: 0.5
      }
    );
    observer.observe(motionDivElement);
    return () => {
      if (motionDivElement) {
         observer.unobserve(motionDivElement);
      }
    };
  }, []);

  return (
    <section
      id="tagline"
      className="sticky top-0 z-10 min-h-screen bg-black text-[5rem] font-normal leading-[1.5] mb-4 overflow-x-hidden max-[480px]:text-[3.5rem]"
    >
      <div className="sticky top-[23vh] h-0 z-0 max-[768px]:top-[20vh] max-[480px]:top-[18vh]">
        <motion.div
          ref={lineRef}
          className="relative w-full h-[70vh] min-h-[10rem] max-[1024px]:h-[65vh] max-[768px]:h-[60vh] max-[480px]:h-[55vh]"
          style={{
            scale: lineScale,
            opacity: lineOpacity,
            zIndex: 5
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-[8vh] max-[1024px]:pt-[7vh] max-[768px]:pt-[6vh] max-[480px]:pt-[4vh] z-[1]">
            <span
              className="flex items-center justify-center h-auto font-['Poppins',var(--default-font-family)] text-center bg-gradient-to-r from-[#21be9c] to-[#0f5848] z-[2] bg-clip-text text-transparent px-4
                         text-[clamp(3rem,10vw,6.25rem)] leading-[1.3] mb-[3vh]
                         max-[1024px]:text-[clamp(2.8rem,9vw,5rem)] max-[1024px]:mb-[2.5vh]
                         max-[768px]:text-[clamp(2.5rem,10vw,4rem)] max-[768px]:mb-[2vh] max-[768px]:w-[95%]
                         max-[480px]:text-[clamp(1.8rem,9vw,2.8rem)] max-[480px]:mb-[1.5vh] max-[480px]:w-[90%]"
            >
              Invest your time
            </span>
            <span
              className="flex flex-wrap items-center justify-center h-auto font-['Poppins',var(--default-font-family)] text-center bg-gradient-to-r from-white to-[#c9c9c9] opacity-50 z-[3] bg-clip-text text-transparent px-4
                         text-[clamp(1.5rem,5vw,2.5rem)] leading-[1.3]
                         max-[1024px]:text-[clamp(1.25rem,4vw,2rem)] max-[1024px]:w-[90%]
                         max-[768px]:text-[clamp(1rem,4.5vw,1.5rem)] max-[768px]:w-[85%]
                         max-[480px]:text-[clamp(0.875rem,4.5vw,1.25rem)] max-[480px]:w-[90%]"
            >
              Embark on an&nbsp;
              <span className="bg-gradient-to-r from-[hsl(166,70%,60%)] to-[hsl(166,71%,50%)] bg-clip-text text-transparent z-[2] whitespace-nowrap">
                Innovative, Adaptive, Efficient
              </span>
              &nbsp;journey of growth
            </span>
          </div>

          <div
            data-line-animation
            className="absolute w-full left-0 opacity-70 [clip-path:inset(0_100%_0_0)] z-0
                       top-[5vh] h-[37vh]
                       max-[1024px]:top-[2vh] max-[1024px]:h-[27vh]
                       max-[768px]:top-[3vh] max-[768px]:h-[20vh]
                       max-[480px]:top-[6vh] max-[480px]:h-[10vh]"
          >
            <LineSvg />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TaglineSection;