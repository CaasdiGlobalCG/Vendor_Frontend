// import React, { useState } from 'react';

// export const ProjectRow = ({ project }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//   const statusColors = {
//     "Completed": "bg-[#58FF4C4F] text-[#00C110E6]",
//     "InProgress": "bg-[#FFBD4C4F] text-[#FFA725]",
//     "Pending": "bg-[#FF4C4C4F] text-[#F90B0BEB]"
//   };

//   const formatDateForDisplay = (date) => {
//     if (date instanceof Date && !isNaN(date.getTime())) {
//       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
//     }
//     return typeof date === 'string' ? date : 'N/A';
//   };

//   return (
//     <>
//       <tr 
//         className={`text-xs sm:text-sm font-medium border-b border-gray-200 cursor-pointer hover:bg-gray-200 rounded-lg ${
//           isExpanded ? 'bg-gray-100' : 'hover:bg-gray-100'
//         }`}
//         onClick={() => setIsExpanded(!isExpanded)}
//       >
//         <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{project.id}</td>
//         <td className="py-2 px-2 sm:px-4">{project.name}</td>
//         <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{project.clientId}</td>
//         <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{formatDateForDisplay(project.createdAt)}</td>
//         <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{formatDateForDisplay(project.completedAt)}</td>
//         <td className="py-2 px-2 sm:px-4 whitespace-nowrap">
//           <span className={`px-2 sm:px-4 py-1 rounded-xl text-[9px] sm:text-[10px] font-semibold ${statusColors[project.status]}`}>
//             {project.status}
//           </span>
//         </td>
//         <td className="py-2 px-2 sm:px-4">
//           <img 
//             src="https://c.animaapp.com/VmmSqCQF/img/ri-arrow-drop-down-line-4.svg" 
//             alt="More" 
//             className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 ${isExpanded ? '-rotate-180' : '-rotate-90'}`}
//           />
//         </td>
//       </tr>
//       {/* Accordion Content */}
//       <tr className={`transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
//         <td colSpan="7" className="px-4 py-2 bg-gray-100">
//         <div 
//             className={`overflow-hidden transition-all duration-700 ease-in-out bg-white/50 rounded-lg shadow-xl ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
//           >
//           <div className="p-4 align">
//             <div>
//               {/* <h4 className="font-semibold">Description</h4> */}
//               <p className="text-sm text-gray-500 mb-6">{project.description || 'N/A'}</p>
//             </div>
          
//             <div className="flex flex-wrap justify-between items-end gap-4">
//                 <div className="flex gap-6 text-sm">
//                     <div>
//                         <p className="text-[.7vw] text-gray-500 ">Project Manager</p>
//                         <p className="text-[.8vw] font-medium text-gray-700">{project.manager}</p>
//                     </div>
//                     <div>
//                         <p className="text-[.7vw] text-gray-500 ">Last Updated</p>
//                         <p className="text-[.8vw] font-medium text-gray-700">{project.lastUpdate}</p>
//                     </div>
//                 </div>
//                 <button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-md transition duration-150 ease-in-out">
//                     Workspace
//                 </button>
//             </div>
//           </div>
//           </div>
//         </td>
//       </tr>
//     </>
//   );
// };















import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';

const statusColors = {
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  InProgress: 'bg-amber-50 text-amber-700 border-amber-100',
  Pending: 'bg-rose-50 text-rose-700 border-rose-100',
};

const getProgressMeta = (status) => {
  if (status === 'Completed') {
    return {
      percent: 100,
      bgClass: 'bg-emerald-200',
      fillClass: 'bg-emerald-500',
    };
  }

  if (status === 'InProgress') {
    return {
      percent: 60,
      bgClass: 'bg-amber-100',
      fillClass: 'bg-amber-500',
    };
  }

  return {
    percent: 0,
    bgClass: 'bg-slate-100',
    fillClass: 'bg-slate-400',
  };
};

const formatDateForDisplay = (date) => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return date;
    }
    return 'N/A';
  } catch (e) {
    return 'N/A';
  }
};

export const ProjectRow = ({ project, mobileView = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState(project.status || null);
  const [workspaceCreatedAt, setWorkspaceCreatedAt] = useState(null);
  const navigate = useNavigate();
  const { currentUser } = useContext(VendorContext);
  // Always fetch authoritative workspace status by projectId (ensure backend normalization is used)
  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      if (!project.id) return;
      try {
        const res = await fetch(`/api/workspaces/project/${project.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data) {
          if (data.status) setWorkspaceStatus(data.status);
          if (data.createdAt) setWorkspaceCreatedAt(data.createdAt);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchStatus();
    return () => { cancelled = true; };
  }, [project.id]);

  // API Base URL

  // Function to open workspace for this project
  const openWorkspace = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent row expansion

    try {
      if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
        alert('You must be logged in to access the workspace.');
        return;
      }

      const vendorId = currentUser.vendorId || currentUser.id;
      // 1. Try collaborative workspace logic
      let collaborativeWorkspaceId = null;
      let collaborativeLead = null;
      try {
        const checkResponse = await fetch(`/api/pm-leads/vendor-leads?vendorId=${vendorId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (checkResponse.ok) {
          const leadsData = await checkResponse.json();
          collaborativeLead = leadsData.leads.find(lead =>
            (lead.projectId === project.id || lead.leadId === project.id) &&
            lead.pmDecision?.approved &&
            lead.pmDecision?.workspaceAccess
          );
          if (collaborativeLead) {
            const collaborativeResponse = await fetch(`/api/workspace-access/collaborative`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                projectId: collaborativeLead.projectId,
                pmId: collaborativeLead.pmId,
                vendorId: vendorId,
                leadId: collaborativeLead.leadId
              })
            });
            if (collaborativeResponse.ok) {
              const workspaceData = await collaborativeResponse.json();
              collaborativeWorkspaceId = workspaceData.workspace?.workspaceId;
            }
          }
        }
      } catch (err) {
        // ignore, fallback below
      }
      if (collaborativeWorkspaceId && collaborativeLead) {
        navigate(`/VendorDashboard/workspace/${collaborativeWorkspaceId}`, {
          state: {
            leadId: collaborativeLead.leadId,
            leadDetails: {
              _id: collaborativeLead.leadId,
              name: collaborativeLead.leadTitle,
              clientId: collaborativeLead.projectId,
              description: collaborativeLead.leadDescription,
              status: 'approved'
            },
            workspaceId: collaborativeWorkspaceId,
            isCollaborative: true,
            pmId: collaborativeLead.pmId,
            vendorId: vendorId
          }
        });
        return;
      }
      // 2. Fallback: Try direct workspace lookup by projectId
      try {
        const wsRes = await fetch(`/api/workspaces/project/${project.id}`);
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          if (wsData && wsData.workspaceId) {
            navigate(`/VendorDashboard/workspace/${wsData.workspaceId}`);
            return;
          }
        }
      } catch (err) {
        // ignore
      }
      // 3. If nothing found, show alert
      alert('⚠️ This project does not have a collaborative or direct workspace. Only PM-approved projects with workspace access or existing workspaces can be opened. Please check the Leads page for collaborative projects.');
    } catch (error) {
      console.error('❌ Error opening workspace:', error);
      alert('Failed to open workspace. Please try again.');
    }
  };
  const resolvedStatus = workspaceStatus || 'Pending';
  const createdDate = workspaceCreatedAt || project.createdAt;
  const progressMeta = getProgressMeta(resolvedStatus);

  if (mobileView) {
    return (
      <article className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full flex-col gap-3 p-4 text-left"
          aria-expanded={isExpanded}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Project</p>
              <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">{project.name || 'Untitled project'}</h3>
              <p className="mt-1 text-xs text-slate-500">ID: {project.id || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColors[resolvedStatus] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {resolvedStatus}
              </span>
              <img
                src="https://c.animaapp.com/VmmSqCQF/img/ri-arrow-drop-down-line-4.svg"
                alt={isExpanded ? 'Collapse' : 'Expand'}
                className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Client</p>
              <p className="mt-1 truncate font-medium text-slate-700">{project.clientId || 'N/A'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Created</p>
              <p className="mt-1 font-medium text-slate-700">{formatDateForDisplay(createdDate)}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Progress</span>
              <span>{progressMeta.percent}%</span>
            </div>
            <div className={`h-2 rounded-full ${progressMeta.bgClass} p-0.5`}>
              <div
                className={`${progressMeta.fillClass} h-1 rounded-full transition-[width] duration-300 ease-out`}
                style={{ width: `${progressMeta.percent}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressMeta.percent}
                role="progressbar"
              />
            </div>
          </div>
        </button>

        <div className={`overflow-hidden border-t border-slate-100 transition-[max-height,opacity] duration-300 ease-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-4 bg-slate-50/70 p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Description</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{project.description || 'No description available.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Manager</p>
                <p className="mt-1 font-medium text-slate-700">{project.manager || 'N/A'}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Updated</p>
                <p className="mt-1 font-medium text-slate-700">{project.lastUpdate || 'N/A'}</p>
              </div>
            </div>

            <button
              onClick={openWorkspace}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-emerald-600 hover:to-teal-700"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <tr
        className={`text-xs sm:text-sm font-medium border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
          isExpanded ? 'bg-gray-50' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{project.id}</td>
        <td className="py-2 px-2 sm:px-4">{project.name}</td>
        <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{project.clientId ? project.clientId : 'N/A'}</td>
        <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{(workspaceCreatedAt || project.createdAt) ? formatDateForDisplay(workspaceCreatedAt || project.createdAt) : 'N/A'}</td>
        <td className="py-2 px-2 sm:px-4 whitespace-nowrap">{resolvedStatus}</td>
        <td className="py-2 px-2 sm:px-4 whitespace-nowrap">
          <div className="w-full">
            <div className={`w-full h-2 rounded-full ${progressMeta.bgClass} p-0.5`} title={`${resolvedStatus} ${progressMeta.percent}%`}>
              <div
                className={`${progressMeta.fillClass} h-1 rounded-full`}
                style={{ width: `${progressMeta.percent}%`, transition: 'width 400ms ease' }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressMeta.percent}
                role="progressbar"
              />
            </div>
          </div>
        </td>
        <td className="py-2 px-2 sm:px-4 text-right sm:text-left">
          <img
            src="https://c.animaapp.com/VmmSqCQF/img/ri-arrow-drop-down-line-4.svg"
            alt={isExpanded ? "Collapse" : "Expand"}
            className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
          />
        </td>
      </tr>
      <tr>
        <td colSpan="7" className="p-0">
          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{project.description || 'N/A'}</p>
              </div>
              <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 ">Project Manager</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-700">{project.manager || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 ">Last Updated</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-700">{project.lastUpdate || 'N/A'}</p>
                  </div>
                </div>
                <button 
                  onClick={openWorkspace}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg shadow-md transition duration-150 ease-in-out flex-shrink-0"
                >
                  Workspace
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};