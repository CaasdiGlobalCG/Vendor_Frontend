


import React, { useState } from "react";
// Standardize status values (copied from dashboard logic)
const getStandardStatus = (status) => {
  if (!status) return "Pending";
  const lowercaseStatus = status.toLowerCase();
  if (lowercaseStatus.includes('complete') || lowercaseStatus === 'done' || lowercaseStatus === 'finished') {
    return "Completed";
  } else if (lowercaseStatus.includes('progress') || lowercaseStatus === 'ongoing' || lowercaseStatus === 'inprogress') {
    return "InProgress";
  } else if (lowercaseStatus.includes('pend') || lowercaseStatus === 'new' || lowercaseStatus === 'waiting') {
    return "Pending";
  }
  return status;
};
import clsx from 'clsx';
import { ProjectRow } from './ProjectRow';

const parseDateString = (dateString) => {
  if (typeof dateString !== 'string') return null;
  try {
    // Try native Date first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;
    // Try to parse 'MMM dd, yyyy' (e.g., 'Dec 30, 2025')
    const mmmDdYyyy = /^(\w{3,}) (\d{1,2}), (\d{4})$/;
    const match = dateString.match(mmmDdYyyy);
    if (match) {
      const [_, monthStr, day, year] = match;
      const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const monthIdx = months.findIndex(m => monthStr.toLowerCase().startsWith(m));
      if (monthIdx !== -1) {
        return new Date(Number(year), monthIdx, Number(day));
      }
    }
    // Remove ordinal suffixes and try again
    const cleanedString = dateString.replace(/(\d+)(st|nd|rd|th)/, "$1");
    date = new Date(cleanedString);
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
    const standardizedStatus = getStandardStatus(project.status);
    const statusMatch = filter.status === "All" || standardizedStatus === filter.status;
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
    <div className="rounded-[20px] bg-white p-3 shadow-2xl sm:p-5">
      {/* Filter UI Section */}
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
         {/* Title and Subtitle */}
        <div className="flex-grow">
          <h2 className="text-sm font-semibold">Projects</h2>
          <p className="text-xs opacity-50">Recent project list</p>
        </div>
         {/* Filters */}
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-4"> {/* Adjusted alignment */}
           {/* Date Range Pickers */}
           <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 sm:justify-start sm:bg-transparent sm:px-0 sm:py-0">
             <label htmlFor="startDate" className="text-[11px] text-gray-600">From:</label>
             <input
               type="date"
               id="startDate"
               // Apply consistent styling and accent color
               className="h-[31px] rounded bg-[#D9D9D9] bg-opacity-50 px-2 py-1 text-[11px] border-none accent-emerald-500 focus:ring-1 focus:ring-emerald-500"
               value={filter.startDate}
               onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
               // Add placeholder styling if needed (though type="date" might override)
               placeholder="Start Date"
             />
           </div>
           <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 sm:justify-start sm:bg-transparent sm:px-0 sm:py-0">
              <label htmlFor="endDate" className="text-[11px] text-gray-600">To:</label>
              <input
               type="date"
               id="endDate"
               // Apply consistent styling and accent color
               className="h-[31px] rounded bg-[#D9D9D9] bg-opacity-50 px-2 py-1 text-[11px] border-none accent-emerald-500 focus:ring-1 focus:ring-emerald-500"
               value={filter.endDate}
               onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
               min={filter.startDate}
               placeholder="End Date"
             />
           </div>

          {/* Status Filter (Custom Dropdown based on reference) */}
          <div className="relative w-full sm:w-[99px] xs:w-auto"> {/* Adjusted width */}
            <button
              className="flex h-[40px] w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[11px] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 sm:h-[31px] sm:rounded sm:bg-[#D9D9D9] sm:bg-opacity-50 sm:px-2 sm:py-1 sm:hover:bg-opacity-70"
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
                    "px-3 py-2 text-[11px] cursor-pointer transition-colors",
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
      <div className="space-y-3 md:hidden">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <ProjectRow key={project.id} project={project} mobileView />
          ))
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No projects found matching the selected filters.
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse">
          {/* Table Head */}
          <thead>
            <tr className="bg-[#D9D9D9] bg-opacity-40 text-[10px] sm:text-[11px] font-normal text-black text-opacity-50">
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">Project Id</th>
              <th className="py-2 px-2 sm:px-4 text-left">Project name</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">Client Id</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">CreatedAt</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">Status</th>
              <th className="py-2 px-2 sm:px-4 text-left whitespace-nowrap">Progress</th>
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
                <td colSpan="7" className="text-center py-4 text-sm text-gray-500">
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