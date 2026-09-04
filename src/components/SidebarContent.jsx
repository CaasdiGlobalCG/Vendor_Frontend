import React from "react";
import backgroundImage from "../assets/Rectangle 155.jpg";

const SidebarContent = () => {
  console.log('Background image path:', backgroundImage);
  
  return (
    <div
      className="hidden lg:flex lg:w-96 flex-shrink-0 h-screen sticky top-0 self-start overflow-hidden"
    >
      {/* Background image layer */}
      <img
        src={backgroundImage}
        alt="Caasdi Global onboarding background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col justify-start px-8 pt-12">
        <div className="text-white text-4xl font-normal mb-8 font-montserrat">
          CG
        </div>
        <div className="max-w-md">
          <h1 className="text-2xl font-[100] text-white mb-1">Welcome To</h1>
          <div className="mb-2">
            <span className="text-4xl font-bold bg-gradient-to-r from-white to-[#24CA97] bg-clip-text text-transparent whitespace-nowrap">
              Caasdi Global
            </span>
          </div>

          <div className="text-white space-y-4 mt-8">
            <h2 className="text-xl font-thin">We're excited to have you here!</h2>
            <p className="text-sm text-gray-200 leading-relaxed">
              Let's set up your profile so we can match you with the right Client
              and projects.
            </p>
          </div>

          <div className="mt-8">
            <button className="border border-white text-white px-6 py-2 rounded hover:bg-[#1992D3] hover:text-white transition-colors">
              Learn more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarContent;
