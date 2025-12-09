// // import React from "react";

// // export const TenderCard = ({ tender }) => {
// //   return (
// //     <div className="bg-white p-8 py-0 rounded-[20px]">
      
// //       <h2 className="text-base font-semibold mb-4">Tenders</h2>
// //       <button className="bg-[#D9D9D9] text-[10px] font-normal px-6 py-2 rounded-[14px] float-right">
// //         Bid now
// //       </button>
// //       <h3 className="text-xl font-light mb-2">{tender.title}</h3>
// //       <p className="text-[11px] text-black opacity-50 mb-7">{tender.description}</p>
// //       <div className="flex justify-between text-[10px] mb-4">
// //         <div>
// //           <p className="font-light">Closing Date</p>
// //           <p className="font-semibold text-[11px]">{tender.closingDate}</p>
// //         </div>
// //         <div>
// //           <p className="font-light">Tender amount</p>
// //           <p className="font-semibold text-[11px]">{tender.amount}</p>
// //         </div>
// //       </div>
    
// //     </div>
// //   );
// // };






// import React from "react";

// export const TenderCard = ({ tender, className = "" }) => { // Accept className prop
//   // Combine base classes with incoming className
//   const cardClasses = `bg-white shadow-xl rounded-[20px] p-4 sm:p-6 ${className}`;

//   return (
//     // Use combined classes and responsive padding
//     <div className={cardClasses}>
//       {/* Header with Title and Button using Flexbox */}
//       <div className="flex justify-between items-center mb-3 sm:mb-4">
//         <h2 className="text-base font-semibold">Tenders</h2>
//         {/* Responsive button styling */}
//         <button className="bg-[#D9D9D9] text-[9px] sm:text-[10px] font-normal px-4 sm:px-6 py-1 sm:py-2 rounded-[14px]">
//           Bid now
//         </button>
//       </div>

//       {/* Tender Details */}
//       {/* Responsive title font size and margin */}
//       <h3 className="text-lg sm:text-xl font-light mb-1 sm:mb-2">{tender.title}</h3>
//       {/* Responsive description font size and margin */}
//       <p className="text-[10px] sm:text-[11px] text-black opacity-50 mb-4 sm:mb-7">{tender.description}</p>

//       {/* Bottom Section (Date and Amount) */}
//       {/* Responsive text size and margin */}
//       <div className="flex flex-wrap justify-between gap-y-2 text-[9px] sm:text-[10px] mb-2 sm:mb-4">
//         <div>
//           <p className="font-light">Closing Date</p>
//           {/* Responsive value font size */}
//           <p className="font-semibold text-[10px] sm:text-[11px]">{tender.closingDate}</p>
//         </div>
//         <div className="text-right sm:text-left"> {/* Adjust text alignment for small screens */}
//           <p className="font-light">Tender amount</p>
//           {/* Responsive value font size */}
//           <p className="font-semibold text-[10px] sm:text-[11px]">{tender.amount}</p>
//         </div>
//       </div>
//     </div>
//   );
// };




















import React from "react";

export const TenderCard = ({ tender, className = "" }) => { // Accept className prop
  // Combine base classes with incoming className
  const cardClasses = `bg-white shadow-lg rounded-[20px] p-4 sm:p-6 ${className}`;

  return (
    // Use combined classes and responsive padding
    <div className={cardClasses} >
      <div className="text-red-500 text-xs">Note: It's Just for example purpose</div> 
      {/* Header with Title and Button using Flexbox */}
      <div className="flex justify-between items-center mb-3 sm:mb-4 ">
        <h2 className="text-base font-semibold">Tenders</h2>
        {/* Responsive button styling */}
        <button className="bg-[#D9D9D9] text-[9px] sm:text-[10px] font-normal px-4 sm:px-6 py-1 sm:py-2 rounded-[14px]">
          Bid now
        </button>
      </div>

      {/* Tender Details */}
      {/* Responsive title font size and margin */}
      <h3 className="text-lg sm:text-xl font-light mb-1 sm:mb-2">{tender.title}</h3>
      {/* Responsive description font size and margin */}
      <p className="text-[10px] sm:text-[11px] text-black opacity-50 mb-4 sm:mb-7">{tender.description}</p>

      {/* Bottom Section (Date and Amount) */}
      {/* Responsive text size and margin */}
      <div className="flex flex-wrap justify-between gap-y-2 text-[9px] sm:text-[10px] mb-2 sm:mb-4">
        <div>
          <p className="font-light">Closing Date</p>
          {/* Responsive value font size */}
          <p className="font-semibold text-[10px] sm:text-[11px]">{tender.closingDate}</p>
        </div>
        <div className="text-right sm:text-left"> {/* Adjust text alignment for small screens */}
          <p className="font-light">Tender amount</p>
          {/* Responsive value font size */}
          <p className="font-semibold text-[10px] sm:text-[11px]">{tender.amount}</p>
        </div>
      </div>
    </div>
  );
};