


import React, { useState } from "react";
import clsx from 'clsx';
import { ProjectRow } from './ProjectRow';

const parseDateString = (dateString) => {
  if (typeof dateString !== 'string') return null;
  try {
    const cleanedString = dateString.replace(/(\d+)(st|nd|rd|th)/, "$1");
    const date = new Date(cleanedString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error("Error parsing date string:", dateString, error);
    return null;
  }
};


export const ProjectList = ({ projects }) => {
  const [filter, setFilter] = useState({ status: "All", startDate: "", endDate: "" });
  // Add state for custom dropdown visibility
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Adjust status options format slightly for easier lookup
   const statusOptions = [
    { value: "All", label: "Status" }, // Use "Status" as label for "All"
    { value: "Completed", label: "Completed" },
    { value: "InProgress", label: "In Progress" },
    { value: "Pending", label: "Pending" },
  ];

  // Filtering logic remains the same
  const filteredProjects = projects.filter(project => {
    const statusMatch = filter.status === "All" || project.status === filter.status;
    let projectDate = null;
    if (project.createdAt instanceof Date && !isNaN(project.createdAt.getTime())) { projectDate = project.createdAt; }
    else if (typeof project.createdAt === 'string') { projectDate = parseDateString(project.createdAt); }
    if (!projectDate) { if (filter.startDate || filter.endDate) { return false; } return statusMatch; } // Only skip if date filters are active
    let dateMatch = true;
    if (filter.startDate) { try { const startDate = new Date(filter.startDate); if (!isNaN(startDate.getTime())) { startDate.setHours(0, 0, 0, 0); dateMatch = dateMatch && projectDate >= startDate; } else { console.warn("Invalid start date filter:", filter.startDate); } } catch (e) { console.error("Error creating start date from filter:", e)} }
    if (filter.endDate) { try { const endDate = new Date(filter.endDate); if (!isNaN(endDate.getTime())) { endDate.setHours(23, 59, 59, 999); dateMatch = dateMatch && projectDate <= endDate; } else { console.warn("Invalid end date filter:", filter.endDate); } } catch (e) { console.error("Error creating end date from filter:", e)} }
    return statusMatch && dateMatch;
  });


  return (
    <div className="bg-white p-3 sm:p-6 rounded-[20px] shadow-2xl">
      {/* Filter UI Section */}
      <div className="flex flex-wrap justify-between items-center gap-y-3 mb-4">
         {/* Title and Subtitle */}
        <div className="flex-grow">
          <h2 className="text-base font-semibold">Projects</h2>
          <p className="text-[13px] opacity-50">Recent project list</p>
        </div>
         {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-start sm:justify-end"> {/* Adjusted alignment */}
           {/* Date Range Pickers */}
           <div className="flex items-center gap-2">
             <label htmlFor="startDate" className="text-xs text-gray-600">From:</label>
             <input
               type="date"
               id="startDate"
               // Apply consistent styling and accent color
               className="h-[31px] bg-[#D9D9D9] bg-opacity-50 rounded px-2 py-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 accent-emerald-500"
               value={filter.startDate}
               onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
               // Add placeholder styling if needed (though type="date" might override)
               placeholder="Start Date"
             />
           </div>
           <div className="flex items-center gap-2">
              <label htmlFor="endDate" className="text-xs text-gray-600">To:</label>
              <input
               type="date"
               id="endDate"
               // Apply consistent styling and accent color
               className="h-[31px] bg-[#D9D9D9] bg-opacity-50 rounded px-2 py-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 accent-emerald-500"
               value={filter.endDate}
               onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
               min={filter.startDate}
               placeholder="End Date"
             />
           </div>

          {/* Status Filter (Custom Dropdown based on reference) */}
          <div className="relative w-[99px] xs:w-auto"> {/* Adjusted width */}
            <button
              className="w-full h-[31px] bg-[#D9D9D9] bg-opacity-50 rounded px-2 py-1 text-xs flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 hover:bg-opacity-70"
              onClick={() => setDropdownOpen((open) => !open)}
              type="button"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              {/* Find the label for the currently selected value */}
              {statusOptions.find(opt => opt.value === filter.status)?.label ?? "Status"}
              {/* Use a simple SVG or character for the arrow */}
              <span className={`ml-2 transition-all duration-1000 ease-in-out ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}>
                {/* &#9662; */}
              </span>
              <svg className={`w-4 h-4 ml-1 transition-transform duration-300 ease-in-out ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Dropdown Panel */}
            <div
              className={clsx(
                "absolute left-0 right-0 mt-1 backdrop-blur-sm w-full rounded-md ", // Ensure width matches button, add z-index // Softer border
                "overflow-hidden",
                "transition-all duration-700 ease-in-out", // Adjusted duration
                // Use opacity and transform for smoother effect with backdrop-blur
                dropdownOpen
                  ? "max-h-40 opacity-100"
                  : "max-h-0 opacity-100 pointer-events-none" // Adjust transform origin if needed
              )}
              // Add transform origin if scale looks weird
              // style={{ transformOrigin: 'top' }}
            >
              {statusOptions.map((option) => (
                <div
                  key={option.value}
                  // More padding, consistent text size, better hover/selected states
                  className={clsx(
                    "px-3 py-2 text-xs cursor-pointer transition-colors",
                    "hover:bg-[#3e423d4f] text-gray-800", // Hover state
                    filter.status === option.value
                      ? "bg-[#3bf3bb4f] font-medium" // Selected state
                      : "bg-transparent"
                  )}
                  onClick={() => {
                    setFilter({ ...filter, status: option.value });
                    setDropdownOpen(false);
                  }}
                  role="option"
                  aria-selected={filter.status === option.value}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {/* Table Head */}
          <thead>
            <tr className="bg-[#D9D9D9] bg-opacity-40 text-[11px] sm:text-[13px] font-normal text-black text-opacity-50">
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">Project Id</th>
              <th className="py-2 px-2 sm:px-4 text-left">Project name</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">Client Id</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">CreatedAt</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">CompletedAt</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">Status</th>
              <th className="py-2 px-2 sm:px-4 text-left"></th>{/* Actions */}
            </tr>
          </thead>
          {/* Table Body */}
          <tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-500">
                  No projects found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};