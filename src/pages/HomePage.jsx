import React, { useState, useEffect } from "react";
import HeroSection from "../components/HeroSection";
import TaglineSection from "../components/TaglineSection";
import AboutSection from "../components/AboutSection";
import ExpertiseSection from "../components/ExpertiseSection";
import IndustriesSection from "../components/IndustriesSection";
import ScrollCards from "../components/ScrollCards";
import WorkflowSection from "../components/WorkflowSection";
import ContactForm from "../components/ContactForm";
import Staytuned from "../components/Staytuned";
import Footer from "../components/Footer";
import "../styles/HomePage.css";

const HomePage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [hideScrollLink, setHideScrollLink] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      const industriesSection = document.getElementById("industries-section");
      if (industriesSection) {
        const rect = industriesSection.getBoundingClientRect();
        setHideScrollLink(rect.top <= 100);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="home-page">
      <HeroSection />
      <div className="relative h-[200vh] bg-black"> 
        <TaglineSection /> 
        <AboutSection />   
      </div>

      <ExpertiseSection scrollY={scrollY} hideScrollLink={hideScrollLink} />
      <IndustriesSection scrollY={scrollY} />
      <ScrollCards />
      <WorkflowSection /> 
      <ContactForm />
      <Staytuned />
      <Footer />
    </main>
  );
};

export default HomePage;
