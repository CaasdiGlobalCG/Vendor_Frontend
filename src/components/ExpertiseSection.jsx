import React, { useRef, useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaIndustry,
  FaMoneyBillWave,
  FaHeadset,
  FaHandshake,
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const fadingItems = [
  { icon: <FaMoneyBillWave />, text: "COST EFFICIENCY" },
  { icon: <FaIndustry />, text: "MULTI INDUSTRY EXPERTISE" },
  { icon: <FaClock />, text: "TIME SAVING" },
  { icon: <FaHeadset />, text: "24/7 SUPPORT" },
  { icon: <FaHandshake />, text: "TRANSPARENT COMMUNICATION" },
  { icon: <FaChartLine />, text: "GUARANTEED GROWTH" },
];

const ExpertiseSection = ({ scrollY }) => {
  const carouselRef = useRef(null);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % fadingItems.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const iconClassName = "text-[1.5rem] text-[#21bea2]";

  return (
    <section
      id="expertise"
      className="relative h-screen flex items-center justify-center flex-wrap gap-[40px] px-[5%] text-center transition-transform duration-500 ease-in-out will-change-transform
                 max-[1024px]:flex-col max-[1024px]:gap-[30px] max-[1024px]:py-[80px] max-[1024px]:h-auto
                 max-[576px]:gap-2.5 max-[576px]:py-[60px] max-[576px]:h-auto"
      style={{ transform: `translateY(${scrollY * 0.1}px)` }}
    >
      <div className="flex-1 basis-[300px] text-left max-w-[500px]
                      max-[1024px]:overflow-hidden max-[1024px]:text-center max-[1024px]:flex-initial max-[1024px]:w-full /* Ensure it doesn't shrink excessively when stacked */
                      max-[576px]:max-w-[90%] max-[576px]:mx-auto max-[576px]:flex-none">
        <h2 className="text-[2.7rem] bg-gradient-to-r from-[#21be9c] to-[#0f5848] bg-clip-text text-transparent font-bold
                       max-[1024px]:text-[2rem]
                       max-[576px]:text-[1.8rem]">
          <span className="gradient-text">Our Comprehensive</span> Services
        </h2>

        <div className="flex justify-start mt-[25px] text-xl font-semibold text-[#0f5848] h-6 transition-opacity duration-1000 ease-in-out
                        max-[1024px]:text-base max-[1024px]:py-2 max-[1024px]:px-0 max-[1024px]:justify-center /* Center highlight bar text on tablet */
                        max-[576px]:justify-center max-[576px]:text-[0.9rem] max-[576px]:py-1.5">
          <div className="flex items-center gap-2.5">
            {React.cloneElement(fadingItems[currentTextIndex].icon, { className: iconClassName })}
            <span>
              {fadingItems[currentTextIndex].text}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[500px] min-h-[300px] rounded-[20px] overflow-hidden bg-black p-8 relative flex flex-col justify-start shadow-[0_4px_23.3px_0_rgba(0,0,0,0.25)]
                      max-[1024px]:max-w-full max-[1024px]:min-h-[280px] max-[1024px]:flex-initial /* Ensure it doesn't shrink excessively */
                      max-[576px]:p-6">
        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth p-2.5 w-full" ref={carouselRef}>
          <article className="flex-none basis-[90%] max-w-[350px] min-h-[250px] rounded-[16px] bg-white text-[rgb(106,106,106)] shadow-[0_4px_23.3px_0_rgba(0,0,0,0.25)] p-8 flex flex-col justify-start snap-center
                            max-[1024px]:basis-[80%] max-[1024px]:max-w-[320px]
                            max-[576px]:basis-[100%] max-[576px]:max-w-full max-[576px]:min-h-[240px] max-[576px]:p-6">
            <h3 className="text-2xl font-semibold mb-[0.8rem] text-black max-[576px]:text-xl">Vendor & Project Management</h3>
            <p className="text-base font-light leading-[1.5] text-black opacity-80 max-[576px]:text-sm">
              Offers smart vendor matching, private tendering, dedicated project
              managers, CRM & task management, forecasting & analytics, and
              end-to-end project support. While currently managed manually, we
              are developing an AI-driven SaaS platform to enhance efficiency
              and automation.
            </p>
          </article>
          <article className="flex-none basis-[90%] max-w-[350px] min-h-[250px] rounded-[16px] bg-white text-[rgb(106,106,106)] shadow-[0_4px_23.3px_0_rgba(0,0,0,0.25)] p-8 flex flex-col justify-start snap-center
                            max-[1024px]:basis-[80%] max-[1024px]:max-w-[320px]
                            max-[576px]:basis-[100%] max-[576px]:max-w-full max-[576px]:min-h-[240px] max-[576px]:p-6">
            <h3 className="text-2xl font-semibold mb-[0.8rem] text-black max-[576px]:text-xl">B2B E-Commerce</h3>
            <p className="text-base font-light leading-[1.5] text-black opacity-80 max-[576px]:text-sm">
              Simplifies procurement by connecting businesses with a verified
              supplier network, ensuring quality materials and competitive
              pricing. We currently provide manual procurement assistance, with
              a self-service marketplace, real-time stock updates, and secure
              transactions coming soon through our SaaS platform.
            </p>
          </article>
          <article className="flex-none basis-[90%] max-w-[350px] min-h-[250px] rounded-[16px] bg-white text-[rgb(106,106,100)] shadow-[0_4px_23.3px_0_rgba(0,0,0,0.25)] p-8 flex flex-col justify-start snap-center
                            max-[1024px]:basis-[80%] max-[1024px]:max-w-[320px]
                            max-[576px]:basis-[100%] max-[576px]:max-w-full max-[576px]:min-h-[240px] max-[576px]:p-6">
            <h3 className="text-2xl font-semibold mb-[0.8rem] text-black max-[576px]:text-xl">Cost Estimation & Business Execution</h3>
            <p className="text-base font-light leading-[1.5] text-black opacity-80 max-[576px]:text-sm">
              Streamlines project budgeting with instant cost breakdowns, vendor
              bidding insights, and transparent pricing. While these processes
              are currently manual, we are developing AI-driven automation to
              optimize cost analysis and enhance decision-making.
            </p>
          </article>
        </div>

        <div className="flex flex-col items-center relative">
          <div className="flex justify-center gap-2.5 mt-5">
            <button className="bg-[#0a0a0a] border-none text-white py-3 mb-8 px-4 rounded-full cursor-pointer text-xl transition-all duration-300 hover:bg-[#929394]" onClick={scrollLeft}>
              <FaChevronLeft />
            </button>
            <button className="bg-[#0a0a0a] border-none text-white py-8 mb-8 px-4 rounded-full cursor-pointer text-xl transition-all duration-300 hover:bg-[#929394]" onClick={scrollRight}>
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpertiseSection;
