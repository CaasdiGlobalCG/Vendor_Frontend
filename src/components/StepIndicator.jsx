import React from "react";

const StepIndicator = ({ currentStep = 1 }) => {
  const steps = [
    { number: 1, title: "vendor details" },
    { number: 2, title: "Company details" },
    { number: 3, title: "Product / service" },
    { number: 4, title: "Bank details" },
    { number: 5, title: "Compliance" },
    { number: 6, title: "Additional" },
    { number: 7, title: "Terms & Conditions" },
  ];

  return (
    <div className="relative mb-8 py-6 px-8">
      {/* Main step circles and labels */}
      <div className="grid grid-cols-7 gap-2 md: items-center relative">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div
              key={step.number}
              className="flex items-center relative z-10 justify-start gap-2"
            >
              {/* Circle */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs md:text-sm font-thin flex-shrink-0 ${
                  isActive || isCompleted
                    ? "bg-[#0F5848] text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </div>

              {/* Step label */}
              <span
                className={`text-[10px] md:text-xs font-medium leading-tight ${
                  isActive || isCompleted ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom progress bar - show on md and up */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-[#0F5848] to-[#21BE9C] transition-all duration-300 ease-in-out"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
};

export default StepIndicator;
