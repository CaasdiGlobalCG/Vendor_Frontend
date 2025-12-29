import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Header from "./Header";
// Import SVG directly as a variable to avoid URL processing issues
import heroSvg from '../assets/hero-1.svg';

const HeroSection = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const [ref, inView] = useInView({ threshold: 0.3 });

  return (
    <section
      id="home"
      className="relative w-full min-h-[745px] h-[80vh] bg-black overflow-hidden"
    >
      <Header />
      <div className="flex flex-col justify-center items-center h-full px-8 max-w-[1440px] mx-auto relative z-[2] -top-10">       
        <motion.div
          ref={ref}
          style={{ y, opacity }}
          className="text-center mt-2"
        >
          <motion.p
            className="text-2xl md:text-3xl bg-gradient-to-r from-white to-black bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Introducing
          </motion.p>

          <motion.h1
            className="text-[2.5rem] md:text-[3.5rem] lg:text-[6rem] font-normal leading-[1.5] bg-gradient-to-r from-[#21be9c] to-[#8ff8e1] bg-clip-text text-transparent whitespace-nowrap"
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            CAASDI GLOBAL
          </motion.h1>

          <motion.p
  className="text-xl md:text-2xl font-light text-white max-w-2xl mx-auto flex justify-center items-center text-center min-h-[40px] mt-1"
  initial={{ opacity: 0, y: 30 }}
  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
  transition={{ duration: 0.8, delay: 0.4 }}
>
  <span className="relative w-[80px] sm:w-[100px] md:w-[120px] h-[40px] mr-1 sm:mr-2 md:mr-3 overflow-hidden">
    <span className="absolute top-0 left-0 w-full animate-slideUpText text-center font-bold uppercase bg-gradient-to-r from-[#fb65b5] to-[#8ff8e1] bg-clip-text text-transparent text-[1rem] sm:text-[1.25rem] md:text-[1.5rem] leading-[40px]">
      Vendor<br />
      Project<br />
      Vendor<br />
      Project
    </span>
  </span>

  <span className="inline-block h-[40px] leading-[40px]">
    Management with Human + AI
  </span>
</motion.p>




        </motion.div>
      </div>

      {/* Background ellipse - using style prop instead of bg-url for better compatibility */}
      <div 
        className="absolute w-[120%] h-[1048px] -top-[750px] -left-[10%] bg-no-repeat bg-center bg-cover blur-[120.2px] z-[1]"
        style={{ backgroundImage: `url(${heroSvg})` }}
      />

      {/* Custom Animation */}
      <style>
  {`
    @keyframes slideUpText {
      0%, 20%   { transform: translateY(0); }
      25%, 45%  { transform: translateY(-40px); }
      50%, 70%  { transform: translateY(-80px); }
      75%, 95%  { transform: translateY(-120px); }
      100%      { transform: translateY(0); }
    }

    .animate-slideUpText {
      animation: slideUpText 5s ease-in-out infinite;
      display: inline-block;
      line-height: 40px;
    }
  `}
</style>

    </section>
  );
};

export default HeroSection;
