

import React from "react";
import { useNavigate } from "react-router-dom";

export default function AuditorWaiting() {
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    // Clear any stored tokens and user data
    localStorage.clear();
    // Navigate to login page
    navigate("/");
  };

  return (
    <div className="w-screen min-h-screen bg-white overflow-x-hidden p-6 font-[Poppins]">
      <div className="mt-2 ml-20 text-3xl font-medium">
        <span className="text-[#00c298]">Great work</span>
        <span className="text-black">.You are almost there!!</span>
      </div>

      <p className="max-w-4xl text-xl leading-9 text-black opacity-50 mt-4 ml-20">
        Thank you for submitting your KYC details. Our team is currently
        reviewing your documents to ensure compliance and security.
      </p>

      <h2 className="text-3xl font-medium text-center mt-16">What happens next?</h2>

      {/* Icons and Progress */}
      <div className="w-full max-w-5xl mx-auto mt-12 px-4 md:px-0">
  {/* Icons + Progress Bars */}
  <div className="flex items-center justify-between w-full">
    {/* Icon 1 */}
    {/* <div className="w-16 h-16 border border-black rounded-lg flex items-center justify-center shrink-0">
      <div className="w-10 h-10 bg-[url('https://static.codia.ai/custom_image/2025-04-03/090824/qlementine-icon.svg')] bg-center bg-cover" />
    </div> */}
        <div className="flex flex-col items-center text-center w-[20%]">
      <div className="w-16 h-16 border border-black rounded-lg flex items-center justify-center ml-auto">
        <div className="w-10 h-10 bg-[url('https://static.codia.ai/custom_image/2025-04-03/090824/qlementine-icon.svg')] bg-center bg-cover" />
      </div>
    </div>

    {/* Progress Bar 1 */}
    <div className="flex-1 mx-2 h-2 bg-[#21be9c] rounded-full animate-grow" />

    {/* Icon 2 */}
    {/* <div className="w-16 h-16 border border-black rounded-lg flex items-center justify-center shrink-0">
      <div className="w-10 h-10 bg-[url('https://static.codia.ai/custom_image/2025-04-03/090824/clock-outline-icon.svg')] bg-center bg-cover" />
    </div> */}
        <div className="flex flex-col items-center text-center w-[7%] relative">
      {/* <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-[#21be9c] rounded-full z-0" /> */}
      <div className="relative z-10 w-16 h-16 border border-black rounded-lg flex items-center justify-center">
        <div className="w-10 h-10 bg-[url('https://static.codia.ai/custom_image/2025-04-03/090824/clock-outline-icon.svg')] bg-center bg-cover" />
      </div>
    </div>

    {/* Progress Bar 2 */}
    <div className="flex-1 mx-2 h-2 bg-[#d9d9d9] rounded-full" />

    {/* Icon 3 */}
    <div className="flex flex-col items-start text-center w-[20%]">
      <div className="w-16 h-16 border border-black rounded-lg flex items-center justify-center">
        <div className="w-10 h-10 bg-[url('https://static.codia.ai/custom_image/2025-04-03/090824/approve-icon.svg')] bg-center bg-cover" />
      </div>
    </div>
  </div>

  {/* Labels + Descriptions */}
  <div className="grid grid-cols-3 gap-6 text-center mt-6">
    <div>
      <p className="text-lg font-medium">Review process</p>
      <p className="text-sm opacity-50 mt-1">Our verification team will manually check your submitted documents.</p>
    </div>
    <div>
      <p className="text-lg font-medium">Processing time</p>
      <p className="text-sm opacity-50 mt-1">This process typically takes 5-7 working days.</p>
    </div>
    <div>
      <p className="text-lg font-medium">Approval or Rejection</p>
      <p className="text-sm opacity-50 mt-1">If approved, you can proceed to the next steps. If any issues arise, we'll notify you via email.</p>
    </div>
  </div>
</div>


      <h2 className="text-xl font-medium text-center mt-32">Need Assistance?</h2>
      <p className="text-center text-base opacity-80 mt-2">
        If you have any questions, please contact our support team at <span className="text-[#21be9c]">corporate@caasdiglobal.com</span> or visit our Help Center
      </p>
      {/* Back to Login Button */}
      <div className="flex justify-center mt-16 pb-10">
        <button
          onClick={handleBackToLogin}
          className="px-8 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-[#0F5848] to-[#21BE9C] hover:from-[#0F5848]/90 hover:to-[#21BE9C]/90 transition-all duration-200 shadow-md"
        >
          Back to Login
        </button>
      </div>
      <style>
        {`
          @keyframes grow {
            0% { width: 0; }
            100% { width: 297px; }
          }
          .animate-grow {
            animation: grow 2s ease-in-out forwards;
          }
        `}
      </style>
    </div>
  );
}
