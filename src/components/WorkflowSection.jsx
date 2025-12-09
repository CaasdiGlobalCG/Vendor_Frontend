import React from "react";
import WorkflowStep from "./WorkflowStep";
import WorkflowDescription from "./WorkflowDescription";
import targetIcon from '../assets/target.svg';


const WorkflowSection = () => {
  return (
    <section
      className="w-full min-h-screen flex flex-col items-center bg-custom-bg text-custom-text relative 
                 px-[1rem] xs:py-[4rem] sm:py-[4rem] md:py-[8rem] lg:py-[8rem] xl:py-[13rem]"
    >
      <div
        className="w-full min-h-screen flex flex-col items-center bg-custom-bg
                   p-[1rem] xs:p-[1rem] sm:p-[1rem] md:py-[2rem] md:px-[1rem]"
      >
        <header className="text-center mb-[4rem] w-full max-w-[1200px]">
          <h1
            className="font-poppins font-medium leading-[1.2] text-center bg-gradient-to-r from-gradient-from to-gradient-to bg-clip-text text-transparent mb-[1rem]
                       text-[1.5rem] xs:text-[1.5rem] sm:text-[2rem] md:text-[clamp(2rem,4vw,3rem)] lg:text-[clamp(2.5rem,5vw,4rem)]"
            style={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 && window.innerWidth >= 640 ? '2rem' : typeof window !== 'undefined' && window.innerWidth < 640 ? '1.5rem' : 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            How We Work
          </h1>
          <p
            className="font-inter font-normal leading-[1.5] text-center max-w-[800px] mx-auto
                       text-[0.8rem] xs:text-[0.8rem] sm:text-[1rem] sm:max-w-[90%] md:text-[clamp(0.875rem,2vw,1.25rem)] lg:text-[clamp(1rem,2vw,1.5rem)] lg:max-w-[800px]"
            style={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 && window.innerWidth >= 640 ? '1rem' : typeof window !== 'undefined' && window.innerWidth < 640 ? '0.8rem' : 'clamp(1rem, 2vw, 1.5rem)' }}
          >
            Ready to transform your business? Here's how our seamless process
            works:
          </p>
        </header>

        <main
          className="flex flex-col w-full max-w-[1200px] relative
                     pb-[2rem] xs:pb-[2rem] sm:pb-[4rem] md:pb-[5rem] lg:pb-[6rem]"
        >
          {[
            { stepPos: "left", stepTitle: "Post your requirement", descText: "Describe your procurement or project needs", descPos: "left" },
            { stepPos: "right", stepTitle: "Project Manager Assigned", descText: "A dedicated expert will be assigned to guide you.", descPos: "right" },
            { stepPos: "left", stepTitle: "Compare & Choose", descText: "Receive quotes from verified vendors and select the best fit.", descPos: "left" },
            { stepPos: "right", stepTitle: "Manage & Track", descText: "Manage and Track your expenses", descPos: "right" },
            { stepPos: "left", stepTitle: "Forecasting & Insights", descText: "Get data-driven forecasts to optimize outcomes.", descPos: "left" },
            { stepPos: "right", stepTitle: "Secure payments", descText: "Seamless, transparent transaction", descPos: "right" },
            { stepPos: "left", stepTitle: "Project Report Submission", descText: "Receive a comprehensive report detailing project execution.", descPos: "left" },
          ].map((item, index) => (
            <section
              key={index}
              className="workflow-section-item flex flex-col relative w-full
                         mb-[4rem] h-auto lg:h-auto 
                         sm:h-[30vh]
                         lg:mb-[9rem]"
            >
              <WorkflowStep position={item.stepPos} title={item.stepTitle} icon={null} sectionIndex={index} />
              <WorkflowDescription text={item.descText} position={item.descPos} />
            </section>
          ))}

          <section
            className="workflow-section-item flex flex-col relative w-full
                       mb-[4rem] h-auto lg:h-auto 
                       sm:h-[38vh]
                       lg:mb-[6rem]"
          >
            <WorkflowStep
              position="right"
              title="Post-Sales Support"
              icon="https://static.codia.ai/image/2025-03-13/e419e831-5baa-4208-95f2-3e5494d21010.svg"
              sectionIndex={7}
            />
            <WorkflowDescription text="Benefit from after-sales services and continuous assistance." position="right" />
            <div
              className="bg-contain bg-center bg-no-repeat z-[1]
                         absolute w-1/2 h-1/2 left-[50%] top-[calc(100%+2rem)] -translate-x-1/2
                         md:top-[calc(100%-14.5rem)]
                         lg:relative lg:left-[14%] lg:top-[4rem] lg:w-[80px] lg:h-[80px] lg:translate-x-[-50%]
                         xs:top-[7.5rem] xs:w-[30px] xs:h-[30px] xs:relative xs:left-1/2 xs:-translate-x-1/2"
                         style={{ backgroundImage: `url(${targetIcon})` }}

            />
          </section>
        </main>
      </div>
    </section>
  );
};

export default WorkflowSection;