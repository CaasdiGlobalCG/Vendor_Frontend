import React, { useRef, useState, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import leftArrow from '../assets/left-arrow.png';
import rightArrow from '../assets/right-arrow.png';

const industriesData = [
  { id: 1, title: "Manufacturing & Industrial", description: "From raw materials to automation, we've got you covered" },
  { id: 2, title: "Construction and Infrastructure", description: "Manage commercial builds and facility upkeep seamlessly" },
  { id: 3, title: "Logistics and Supply chain", description: "Optimize freight, warehousing and 3PL Partnership" },
  { id: 4, title: "Healthcare & Pharmaceuticals", description: "Streamline medical supplies and equipment procurement" },
  { id: 5, title: "Retail & E-commerce", description: "Enhance inventory management and fulfillment operations" },
  { id: 6, title: "Food & Beverage", description: "Manage perishable goods and ensure food safety compliance" },
  { id: 7, title: "Energy & Utilities", description: "Optimize resource allocation and maintenance scheduling" },
  { id: 8, title: "Technology & Electronics", description: "Manage component sourcing and production efficiency" },
  { id: 9, title: "Automotive & Transportation", description: "Streamline parts procurement and assembly operations" },
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
        <h2 className={`text-6xl font-medium mb-16 text-center transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'}`}>
          <span className="bg-gradient-to-r from-[#21be9c] to-[#0f5848] bg-clip-text text-transparent">Industries </span>
          We Serve <br />
          <div className="text-base h-[10%] opacity-100 translate-y-0 italic">
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
          <div className="bg-white p-5 rounded-[10px] max-w-[90vw] min-w-[300px] w-auto max-h-[80vh] overflow-y-auto text-center shadow-[0_5px_15px_rgba(0,0,0,0.3)] relative animate-modalFadeIn">
            <button 
              className="absolute top-[10px] right-[10px] border-none bg-none text-2xl cursor-pointer"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
            <h2>{selectedIndustry.title}</h2>
            <p>{selectedIndustry.description}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default IndustriesSection;
