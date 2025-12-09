import completed from '../assets/completed.svg';
import incompleteIcon from '../assets/incomplete.svg';

const steps = [
    { label: "Vendor Details", sub: "Please provide vendor details" },
    { label: "Company details", sub: "Please provide your company details" },
    { label: "Service/product offered", sub: "Please provide details about your service" },
    { label: "Bank details", sub: "Please provide Bank details" },
    { label: "Compliance and certifications", sub: "Please provide certifications" },
    { label: "Additional details", sub: "Please provide Additional details" }
  ];
  
  const Sidebar = ({ currentStep = 1 }) => {
    return (
      <div className="w-0 md:w-[33%] h-full bg-[#f6fffd] text-black hidden md:flex flex-col fixed md:relative overflow-y-auto px-4 md:px-6 py-6">
        <div className="text-3xl font-bold text-[#105a4a] mb-1">CG</div>
        <span className="block text-lg font-medium">Complete your KYC</span>
        <span className="block text-sm font-light leading-6 opacity-50 mb-6">
          Please complete your KYC verification by submitting the required documents to ensure seamless access to our services
        </span>
  
        <div className="space-y-4">
          {steps.map((step, index) => {
            const stepNumber = index ;
            const isCompleted = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;
  
            const iconUrl = isCompleted
              ? completed 
              : incompleteIcon;
  
            const opacity = isCurrent || isCompleted ? "opacity-100" : "opacity-50";
            const fontWeight = isCurrent || isCompleted ? "font-medium" : "font-medium opacity-50";
  
            return (
              <div key={index}>
                <div className="flex items-center">
                  <img src={iconUrl} alt="" className="w-6 h-6 mr-2" />
                  <span className={`text-base ${fontWeight}`}>{step.label}</span>
                </div>
                <span className={`block text-sm font-light ${opacity}`}>{step.sub}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  export default Sidebar;