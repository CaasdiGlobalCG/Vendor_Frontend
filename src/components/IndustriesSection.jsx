import React, { useRef, useState, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import leftArrow from '../assets/left-arrow.png';
import rightArrow from '../assets/right-arrow.png';

const industriesData = [
  { 
    id: 1, 
    title: "Manufacturing & Industrial", 
    description: "From raw materials to automation, we've got you covered",
    details: "We provide end-to-end procurement solutions for manufacturers, including raw material sourcing, equipment suppliers, quality control vendors, and automation technology partners.",
    services: ["Raw Material Sourcing", "Equipment Procurement", "Quality Assurance", "Automation Integration", "Supply Chain Optimization"]
  },
  { 
    id: 2, 
    title: "Construction and Infrastructure", 
    description: "Manage commercial builds and facility upkeep seamlessly",
    details: "Our platform connects you with verified contractors, material suppliers, and facility management experts for projects of any scale.",
    services: ["Contractor Management", "Material Procurement", "Project Planning", "Facility Maintenance", "Safety Compliance"]
  },
  { 
    id: 3, 
    title: "Logistics and Supply Chain", 
    description: "Optimize freight, warehousing and 3PL Partnership",
    details: "Streamline your logistics operations with our network of freight carriers, warehousing solutions, and third-party logistics providers.",
    services: ["Freight Management", "Warehouse Solutions", "Last-Mile Delivery", "Inventory Management", "Cross-Border Logistics"]
  },
  { 
    id: 4, 
    title: "Healthcare & Pharmaceuticals", 
    description: "Streamline medical supplies and equipment procurement",
    details: "Access compliant and certified suppliers for medical equipment, pharmaceuticals, and healthcare facility management services.",
    services: ["Medical Equipment", "Pharmaceutical Supplies", "Lab Services", "Regulatory Compliance", "Healthcare IT Solutions"]
  },
  { 
    id: 5, 
    title: "Retail & E-commerce", 
    description: "Enhance inventory management and fulfillment operations",
    details: "Connect with suppliers, fulfillment centers, and technology partners to scale your retail and e-commerce business efficiently.",
    services: ["Inventory Management", "Fulfillment Services", "Packaging Solutions", "Returns Management", "Omnichannel Integration"]
  },
  { 
    id: 6, 
    title: "Food & Beverage", 
    description: "Manage perishable goods and ensure food safety compliance",
    details: "Source quality ingredients, packaging, and cold chain logistics while maintaining strict food safety standards.",
    services: ["Ingredient Sourcing", "Cold Chain Logistics", "Food Safety Audits", "Packaging Solutions", "Quality Testing"]
  },
  { 
    id: 7, 
    title: "Energy & Utilities", 
    description: "Optimize resource allocation and maintenance scheduling",
    details: "Partner with energy suppliers, maintenance contractors, and technology providers to optimize your utility operations.",
    services: ["Energy Procurement", "Renewable Solutions", "Grid Management", "Maintenance Services", "Sustainability Consulting"]
  },
  { 
    id: 8, 
    title: "Technology & Electronics", 
    description: "Manage component sourcing and production efficiency",
    details: "Access global suppliers for electronic components, assembly services, and technology integration solutions.",
    services: ["Component Sourcing", "PCB Manufacturing", "Assembly Services", "Quality Testing", "R&D Partnerships"]
  },
  { 
    id: 9, 
    title: "Automotive & Transportation", 
    description: "Streamline parts procurement and assembly operations",
    details: "Connect with OEM suppliers, aftermarket parts vendors, and logistics partners for your automotive needs.",
    services: ["OEM Parts Supply", "Aftermarket Sourcing", "Fleet Management", "Assembly Solutions", "Compliance & Certification"]
  },
];

const IndustriesSection = ({ scrollY }) => {
  const sliderRef = useRef();
  const [prevActive, setPrevActive] = useState(false);
  const [nextActive, setNextActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    speed: 700,
    slidesToShow: 3,
    slidesToScroll: 3,
    arrows: false,
    centerMode: true,
    centerPadding: "0",
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 768, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  const goToNext = () => {
    sliderRef.current.slickNext();
    setNextActive(true);
    setTimeout(() => setNextActive(false), 300);
  };

  const goToPrev = () => {
    sliderRef.current.slickPrev();
    setPrevActive(true);
    setTimeout(() => setPrevActive(false), 300);
  };

  const openModal = (industry) => {
    setSelectedIndustry(industry);
    setModalOpen(true);
  };

  return (
    <section 
      id="industries-section" 
      className="w-full min-h-screen flex items-center justify-center p-12 px-4 bg-white relative transition-transform duration-500 ease-in-out"
      style={{ transform: `translateY(${scrollY * 0.05}px)` }}
    >
      <div className="w-full max-w-[1440px] flex flex-col items-center">
        <h2 className={`text-6xl font-medium mb-16 text-center transition-all duration-1000 ease-out text-black ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'}`}>
          <span className="bg-gradient-to-r from-[#21be9c] to-[#0f5848] bg-clip-text text-transparent">Industries </span>
          We Serve <br />
          <div className="text-base h-[10%] opacity-100 translate-y-0 italic text-black/70">
            <q>Like water, we adapt—flowing seamlessly into every industry's needs.</q>
          </div>
        </h2>
        
        <div className="w-full py-4">
          <Slider ref={sliderRef} {...settings} className="w-full">
            {industriesData.map((industry) => (
              <div key={industry.id} className="p-4">
                <div className="w-full h-[320px] bg-white rounded-[30px] shadow-[0_4px_23.3px_0_rgba(0,0,0,0.25)] p-8 flex flex-col justify-between relative transition-all duration-300 ease-in-out hover:-translate-y-[5px]">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-2xl font-medium text-black leading-normal">{industry.title}</h3>
                    <p className="text-xl text-black opacity-40 font-light leading-normal">{industry.description}</p>
                  </div>
                  <div className="flex justify-end items-center">
                    <button 
                      className="w-[57px] h-[57px] bg-black border-2 border-white rounded-full flex items-center justify-center relative cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 active:scale-90 active:opacity-70"
                      onClick={() => openModal(industry)}
                    >
                      <span className="text-white text-[2.5rem] leading-none">+</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>

        <div className="flex gap-4 mt-8 justify-center">
          <button 
            className={`w-[78px] h-[78px] border-none bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 ease hover:opacity-80 active:scale-95 active:opacity-60 ${prevActive ? 'opacity-60 scale-95' : ''}`}
            onClick={goToPrev}
          >
             <div
               className="w-full h-full bg-no-repeat bg-center bg-contain"
                 style={{ backgroundImage: `url(${leftArrow})` }}
              ></div>
          </button>
          <button 
            className={`w-[78px] h-[78px] border-none bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 ease hover:opacity-80 active:scale-95 active:opacity-60 ${nextActive ? 'opacity-60 scale-95' : ''}`}
            onClick={goToNext}
          >
            <div
              className="w-full h-full bg-no-repeat bg-center bg-contain"
              style={{ backgroundImage: `url(${rightArrow})` }}
            ></div>
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white p-8 rounded-[20px] max-w-[600px] min-w-[300px] w-[90vw] max-h-[80vh] overflow-y-auto text-left shadow-[0_5px_15px_rgba(0,0,0,0.3)] relative animate-modalFadeIn">
            <button 
              className="absolute top-4 right-4 border-none bg-black text-white w-8 h-8 rounded-full text-xl cursor-pointer flex items-center justify-center hover:bg-gray-700 transition-colors"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-black mb-2">{selectedIndustry.title}</h2>
            <p className="text-base text-gray-600 mb-4 italic">{selectedIndustry.description}</p>
            <p className="text-base text-black mb-6">{selectedIndustry.details}</p>
            
            <h3 className="text-lg font-semibold text-[#21be9c] mb-3">Key Services</h3>
            <div className="flex flex-wrap gap-2">
              {selectedIndustry.services?.map((service, index) => (
                <span 
                  key={index} 
                  className="bg-[#21be9c]/10 text-[#0f5848] px-4 py-2 rounded-full text-sm font-medium"
                >
                  {service}
                </span>
              ))}
            </div>
            
            <button 
              className="mt-6 w-full bg-black text-white py-3 px-6 rounded-full font-semibold hover:bg-gray-800 transition-colors"
              onClick={() => setModalOpen(false)}
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default IndustriesSection;
