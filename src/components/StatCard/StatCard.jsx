import React from "react";

export const StatCard = ({ title, value, subtitle }) => {
  return (
    // Use w-full, responsive padding, and min-height instead of fixed dimensions
    <div className="bg-white w-full min-h-[130px] sm:min-h-[150px] rounded-[20px] p-2 sm:p-3 relative flex flex-col justify-between shadow-xl">
      {/* Responsive title font size */}
      <h3 className="text-sm sm:text-base font-medium text-black text-center">{title}</h3>
      {/* Adjusted positioning and responsive text size for value */}
      <div className="mt-auto text-center">
        {/* Responsive subtitle font size */}
        <p className="text-[11px] sm:text-[13px] text-black opacity-50">{subtitle}</p>
        {/* Responsive value font size */}
        <p className="text-4xl sm:text-10xl lg:text-[58px] font-medium text-black leading-tight [text-shadow:-1px_4px_2px_var(--tw-shadow-color)] shadow-gray-300 ">{value}</p>
      </div>
    </div>
  );
};