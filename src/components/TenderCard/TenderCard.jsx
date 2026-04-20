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
import { ArrowUpRight, CalendarDays, Landmark } from "lucide-react";

export const TenderCard = ({ tender, className = "" }) => {
  const cardClasses = `relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-5 ${className}`;

  return (
    <div className={cardClasses}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 left-0 h-24 w-24 rounded-full bg-lime-100/60 blur-2xl" />

      <div className="relative">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Tenders
            </div>
            <h3 className="mt-1 text-[1rem] font-semibold leading-5 text-slate-900 sm:text-[1.1rem]">{tender.title}</h3>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            Bid now
            <ArrowUpRight size={12} />
          </button>
        </div>

        <p className="max-w-xl text-[12px] leading-5 text-slate-500">{tender.description || "Tender description will appear here."}</p>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarDays size={14} />
              <p className="text-[10px] font-medium uppercase tracking-[0.14em]">Closing date</p>
            </div>
            <p className="mt-2 text-[12px] font-semibold text-slate-900">{tender.closingDate || "Not available"}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Landmark size={14} />
              <p className="text-[10px] font-medium uppercase tracking-[0.14em]">Estimated value</p>
            </div>
            <p className="mt-2 text-[12px] font-semibold text-slate-900">{tender.amount || "Not available"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};