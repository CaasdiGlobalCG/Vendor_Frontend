// import React, { useState } from 'react';

// export const ProjectRow = ({ project }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//   const statusColors = {
//     "Completed": "bg-[#58FF4C4F] text-[#00C110E6]",
//     "InProgress": "bg-[#FFBD4C4F] text-warning",
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
//         className={`text-xs sm:text-sm font-medium border-b border-line cursor-pointer hover:bg-surface-hover rounded-lg ${
//           isExpanded ? 'bg-surface-hover' : 'hover:bg-surface-hover'
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
//         <td colSpan="7" className="px-4 py-2 bg-surface-hover">
//         <div 
//             className={`overflow-hidden transition-all duration-700 ease-in-out bg-white/50 rounded-lg shadow-xl ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
//           >
//           <div className="p-4 align">
//             <div>
//               {/* <h4 className="font-semibold">Description</h4> */}
//               <p className="text-sm text-dim mb-6">{project.description || 'N/A'}</p>
//             </div>
          
//             <div className="flex flex-wrap justify-between items-end gap-4">
//                 <div className="flex gap-6 text-sm">
//                     <div>
//                         <p className="text-[.7vw] text-dim ">Project Manager</p>
//                         <p className="text-[.8vw] font-medium text-ink">{project.manager}</p>
//                     </div>
//                     <div>
//                         <p className="text-[.7vw] text-dim ">Last Updated</p>
//                         <p className="text-[.8vw] font-medium text-ink">{project.lastUpdate}</p>
//                     </div>
//                 </div>
//                 <button className="bg-black hover:from-black hover:to-black text-white text-sm font-semibold px-5 py-2 rounded-lg transition duration-150 ease-in-out">
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
  Completed: 'bg-surface-hover text-ink border-line',
  InProgress: 'bg-warning/10 text-warning border-warning/10',
  Pending: 'bg-danger/10 text-danger border-danger/10',
};

// Plain-text status color for the dense desktop table (no pill chrome) —
// mirrors the same semantics as statusColors above, just without the badge.
const statusTextColors = {
  Completed: 'text-ink',
  InProgress: 'text-warning',
  Pending: 'text-danger',
};

const getProgressMeta = (status) => {
  if (status === 'Completed') {
    return {
      percent: 100,
      bgClass: 'bg-surface-hover',
      fillClass: 'bg-cta',
    };
  }

  if (status === 'InProgress') {
    return {
      percent: 60,
      bgClass: 'bg-warning/10',
      fillClass: 'bg-warning',
    };
  }

  return {
    percent: 0,
    bgClass: 'bg-surface-hover',
    fillClass: 'bg-cta',
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
      <article className="overflow-hidden rounded-md border border-line bg-surface">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full flex-col gap-3 p-4 text-left"
          aria-expanded={isExpanded}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-dim">Project</p>
              <h3 className="mt-1 truncate text-sm font-semibold text-ink">{project.name || 'Untitled project'}</h3>
              <p className="mt-1 text-xs text-dim">ID: {project.id || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColors[resolvedStatus] || 'bg-surface-hover text-ink border-line'}`}>
                {resolvedStatus}
              </span>
              <img
                src="https://c.animaapp.com/VmmSqCQF/img/ri-arrow-drop-down-line-4.svg"
                alt={isExpanded ? 'Collapse' : 'Expand'}
                className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-dim">
            <div className="rounded-md bg-canvas p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-dim">Client</p>
              <p className="mt-1 truncate font-medium text-ink">{project.clientId || 'N/A'}</p>
            </div>
            <div className="rounded-md bg-canvas p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-dim">Created</p>
              <p className="mt-1 font-medium text-ink">{formatDateForDisplay(createdDate)}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-dim">
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

        <div className={`overflow-hidden border-t border-line transition-[max-height,opacity] duration-300 ease-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-4 bg-canvas p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-dim">Description</p>
              <p className="mt-2 text-sm leading-6 text-dim">{project.description || 'No description available.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-dim">
              <div className="rounded-md bg-surface p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-dim">Manager</p>
                <p className="mt-1 font-medium text-ink">{project.manager || 'N/A'}</p>
              </div>
              <div className="rounded-md bg-surface p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-dim">Updated</p>
                <p className="mt-1 font-medium text-ink">{project.lastUpdate || 'N/A'}</p>
              </div>
            </div>

            <button
              onClick={openWorkspace}
              className="w-full rounded-md bg-cta px-4 py-3 text-sm font-semibold text-cta-foreground transition hover:opacity-90"
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
        className={`border-b border-line text-xs font-normal text-ink sm:text-sm cursor-pointer hover:bg-canvas ${
          isExpanded ? 'bg-canvas' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <td className="py-2.5 px-2 text-dim sm:px-4">{project.id}</td>
        <td className="py-2.5 px-2 font-medium sm:px-4">{project.name}</td>
        <td className="py-2.5 px-2 text-dim sm:px-4">{project.clientId ? project.clientId : 'N/A'}</td>
        <td className="py-2.5 px-2 text-dim sm:px-4 whitespace-nowrap">{(workspaceCreatedAt || project.createdAt) ? formatDateForDisplay(workspaceCreatedAt || project.createdAt) : 'N/A'}</td>
        <td className={`py-2.5 px-2 font-medium sm:px-4 whitespace-nowrap ${statusTextColors[resolvedStatus] || 'text-ink'}`}>{resolvedStatus}</td>
        <td className="py-2.5 px-2 sm:px-4 whitespace-nowrap">
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
            <div className="p-3 sm:p-4 bg-canvas border-b border-line">
              <div>
                <p className="text-xs sm:text-sm text-dim mb-4 sm:mb-6">{project.description || 'N/A'}</p>
              </div>
              <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-[10px] sm:text-xs text-dim ">Project Manager</p>
                    <p className="text-xs sm:text-sm font-medium text-ink">{project.manager || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-dim ">Last Updated</p>
                    <p className="text-xs sm:text-sm font-medium text-ink">{project.lastUpdate || 'N/A'}</p>
                  </div>
                </div>
                <button 
                  onClick={openWorkspace}
                  className="flex-shrink-0 rounded-md bg-cta px-4 py-1.5 text-xs font-semibold text-cta-foreground transition hover:opacity-90 sm:px-5 sm:py-2 sm:text-sm"
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