import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import aboutUs from '../assets/about-us.png';

const AboutSection = () => {
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: false
  });

  const containerVariants = {
    hidden: { opacity: 0, y: 100 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8 }
    }
  };

  return (
    <section 
      id="about" 
      className="relative z-20 w-full min-h-[892px] h-screen bg-black flex items-center justify-center overflow-hidden" 
      ref={ref}
    >
      <div
        className="absolute w-full h-full top-0 left-0 bg-no-repeat bg-center bg-cover opacity-40 z-[1]"
        style={{ backgroundImage: `url(${aboutUs})` }}
      />
      
      <motion.div 
        className="max-w-[944px] w-full px-8 text-center relative z-[2]"
        variants={containerVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
      >
        <motion.h2 
          className="text-[4rem] font-semibold leading-[1.28] mb-8 bg-gradient-to-r from-white to-[#c6c6c6] bg-clip-text text-transparent
                     max-[1200px]:text-[3.5rem]
                     max-[768px]:text-[2.5rem]
                     max-[480px]:text-[2rem]"
          variants={itemVariants}
        >
          Step beyond marketplaces, seize success!
        </motion.h2>
        
        <motion.p 
          className="text-[1.25rem] font-normal leading-[1.5] text-white opacity-70 max-w-[891px] mx-auto
                     max-[768px]:text-[1.125rem]
                     max-[480px]:text-base"
          variants={itemVariants}
        >
          At CAASDI GLOBAL, we're making a groundbreaking platform that combines automation,
          AI-driven insights, and seamless execution. Say goodbye to traditional
          marketplaces and hello to a predictive, self-sustaining business
          ecosystem designed for your success.
        </motion.p>
      </motion.div>
    </section>
  );
};

export default AboutSection;
