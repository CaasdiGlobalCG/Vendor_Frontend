
// import React from "react";
// import "../Styles/Auditor.css";

// export default function Auditor() {
//   return (
//     <div className="a-main-container">
//       <div className="a-box">
//         <span className="a-text">Great work</span>
//         <span className="a-text-2"> .You are almost there!!</span>
//       </div>
//       <span className="a-text-3">
//         Thank you for submitting your KYC details. Our team is currently
//         reviewing your documents to ensure compliance and security.
//       </span>
//       <span className="a-text-4">What happens next?</span>
//       <div className="a-flex-row-cac">
//         <div className="a-rectangle">
//           <div className="a-qlementine-icons-preview" />
//         </div>
//         <div className="a-rectangle-1">
//           <div className="a-mdi-clock-outline" />
//         </div>
//         <div className="a-rectangle-2">
//           <div className="a-mdi-approve" />
//         </div>
//         <div className="a-rectangle-3" /> {/* No need for animate class */}
//         <div className="a-rectangle-4" />
//       </div>
//       <div className="a-flex-row-d">
//         <span className="a-review-process">Review process</span>
//         <span className="a-processing-time">Processing time</span>
//         <span className="a-approval-rejection">Approval or Rejection</span>
//       </div>
//       <div className="a-flex-row-aa">
//         <span className="a-verification-team">
//           Our verification team will manually check your submitted documents.
//         </span>
//         <span className="a-verification-process">
//           This process typically takes 5-7 working days.
//         </span>
//         <span className="a-approval-notification">
//           If approved, you can proceed to the next steps. If any issues arise,
//           we’ll notify you via email.
//         </span>
//       </div>
//       <span className="a-need-assistance">Need Assistance?</span>
//       <div className="a-contact-support-team">
//         <span className="a-contact-support-team-5">
//           If you have any questions, please contact our support team at{" "}
//         </span>
//         <span className="a-support-email">Corporate@caasdiglobal.com</span>
//         <span className="a-contact-support-team-6">
//           {" "}
//           or visit our Help Center
//         </span>
//       </div>
//     </div>
//   );
// }

import React from "react";

export default function AuditorWaiting() {
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
        If you have any questions, please contact our support team at <span className="text-[#21be9c]">Corporate@caasdiglobal.com</span> or visit our Help Center
      </p>

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
