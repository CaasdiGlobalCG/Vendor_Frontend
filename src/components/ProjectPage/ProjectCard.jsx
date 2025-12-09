// import React, { useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// // Updated Heroicons v2 import (using 24px outline)
// import { ClockIcon } from '@heroicons/react/24/outline';
// import { VendorContext } from '../../context/VendorContext';
// import config from '../../config/env';

// const ProjectCard = ({ project }) => {
//     const navigate = useNavigate();
//     const { currentUser } = useContext(VendorContext);

//     // Function to open workspace for this project
//     const openWorkspace = async (e) => {
//         e.preventDefault();
//         e.stopPropagation();
        
//         try {
//             if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
//                 alert('You must be logged in to access the workspace.');
//                 return;
//           }

//           const vendorId = currentUser.vendorId || currentUser.id;
          
//           // If this project came from an approved lead with workspace access,
//           // we already have everything we need to open the collaborative workspace.
//           if (project.fromLead && project.hasWorkspaceAccess && project.pmId && project.leadId && project.clientId) {
//             console.log('✅ Opening collaborative workspace from lead-mapped project:', {
//               projectId: project.clientId,
//               pmId: project.pmId,
//               leadId: project.leadId
//             });

//             const collaborativeResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({
//                 projectId: project.clientId,
//                 pmId: project.pmId,
//                 vendorId: vendorId,
//                 leadId: project.leadId
//               })
//             });

//             if (!collaborativeResponse.ok) {
//               throw new Error(`Workspace access request failed with status ${collaborativeResponse.status}`);
//             }

//             const workspaceData = await collaborativeResponse.json();

//             navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
//               state: {
//                 leadId: project.leadId,
//                 leadDetails: {
//                   _id: project.leadId,
//                   name: project.name,
//                   clientId: project.clientId,
//                   description: project.description,
//                   status: 'approved'
//                 },
//                 workspaceId: workspaceData.workspace.workspaceId,
//                 isCollaborative: true,
//                 pmId: project.pmId,
//                 vendorId: vendorId
//               }
//             });
//             return;
//           }

//           // Fallback: legacy behaviour – try to find a collaborative lead by querying PM leads
//           console.log('🔍 Checking for collaborative workspace for project via PM leads:', project.id);

//           const checkResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/pm-leads/vendor-leads?vendorId=${vendorId}`, {
//             method: 'GET',
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': `Bearer ${localStorage.getItem('token')}`
//             }
//           });

//           if (checkResponse.ok) {
//             const leadsData = await checkResponse.json();
            
//             // Look for a PM-approved lead that matches this project
//             const collaborativeLead = leadsData.leads.find(lead => 
//               (lead.projectId === project.id || lead.leadId === project.id) && 
//               lead.pmDecision?.approved && 
//               lead.pmDecision?.workspaceAccess
//             );
            
//             if (collaborativeLead) {
//               console.log('✅ Found collaborative workspace for this project via PM leads');
              
//               const collaborativeResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
//                 method: 'POST',
//                 headers: {
//                   'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                   projectId: collaborativeLead.projectId,
//                   pmId: collaborativeLead.pmId,
//                   vendorId: vendorId,
//                   leadId: collaborativeLead.leadId
//                 })
//               });

//               if (!collaborativeResponse.ok) {
//                 throw new Error(`Workspace access request failed with status ${collaborativeResponse.status}`);
//               }

//               const workspaceData = await collaborativeResponse.json();
              
//               navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
//                 state: {
//                   leadId: collaborativeLead.leadId,
//                   leadDetails: {
//                     _id: collaborativeLead.leadId,
//                     name: collaborativeLead.leadTitle,
//                     clientId: collaborativeLead.projectId,
//                     description: collaborativeLead.leadDescription,
//                     status: 'approved'
//                   },
//                   workspaceId: workspaceData.workspace.workspaceId,
//                   isCollaborative: true,
//                   pmId: collaborativeLead.pmId,
//                   vendorId: vendorId
//                 }
//               });
//               return;
//             }
//           }
          
//           // If no collaborative workspace found, show message instead of creating legacy workspace
//           alert('⚠️ This project does not have a collaborative workspace. Only PM-approved projects with workspace access can be opened. Please check the Leads page for collaborative projects.');
          
//         } catch (error) {
//           console.error('❌ Error opening workspace:', error);
//           alert('Failed to open workspace. Please try again.');
//         }
//       };
//     return (
//         <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200/80 ">
//             {/* Top Section */}
//             <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
//                 <div>
//                     <h2 className="text-lg font-semibold text-gray-800 mb-1">{project.name}</h2>
//                     <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
//                         <span className="bg-gray-100 px-2 py-0.5 rounded">Project id : {project.id}</span>
//                         <span className="bg-gray-100 px-2 py-0.5 rounded">Client id : {project.clientId}</span>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap pt-1">
//                     {/* Using ClockIcon (size adjusted via className) */}
//                     <ClockIcon className="h-3.5 w-3.5" />
//                     <span>Last update</span>
//                     <span>{project.lastUpdate}</span>
//                 </div>
//             </div>

//             {/* Middle Section */}
//             <p className="text-sm text-gray-600 mb-4">{project.description}</p>
//             <p className="text-sm mb-4">
//                 <span className="text-gray-500">Project Manager from Caasdi Global:</span>{' '}
//                 <a href="#" className="font-medium text-emerald-600 hover:underline">{project.manager}</a>
//             </p>

//             {/* Bottom Section */}
//             <div className="flex flex-wrap justify-between items-end gap-4">
//                 <div className="flex gap-6 text-sm">
//                     <div>
//                         <p className="text-xs text-gray-500 mb-0.5">Start Date</p>
//                         <p className="font-medium text-gray-700">{project.startDate}</p>
//                     </div>
//                     <div>
//                         <p className="text-xs text-gray-500 mb-0.5">Close Date</p>
//                         <p className="font-medium text-gray-700">{project.closeDate}</p>
//                     </div>
//                 </div>
//                 <button 
//                     onClick={openWorkspace}
//                     className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-md transition duration-150 ease-in-out"
//                 >
//                     Workspace
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default ProjectCard;

import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Updated Heroicons v2 import (using 24px outline)
import { ClockIcon } from '@heroicons/react/24/outline';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';

const ProjectCard = ({ project }) => {
    const navigate = useNavigate();
    const { currentUser } = useContext(VendorContext);
    const [isExpanded, setIsExpanded] = useState(false);

    // Function to open workspace for this project
    const openWorkspace = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
                alert('You must be logged in to access the workspace.');
                return;
          }

          const vendorId = currentUser.vendorId || currentUser.id;
          
          // If this project came from an approved lead with workspace access,
          // we already have everything we need to open the collaborative workspace.
          if (project.fromLead && project.hasWorkspaceAccess && project.pmId && project.leadId && project.clientId) {
            console.log('✅ Opening collaborative workspace from lead-mapped project:', {
              projectId: project.clientId,
              pmId: project.pmId,
              leadId: project.leadId
            });

            const collaborativeResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                projectId: project.clientId,
                pmId: project.pmId,
                vendorId: vendorId,
                leadId: project.leadId
              })
            });

            if (!collaborativeResponse.ok) {
              throw new Error(`Workspace access request failed with status ${collaborativeResponse.status}`);
            }

            const workspaceData = await collaborativeResponse.json();

            navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
              state: {
                leadId: project.leadId,
                leadDetails: {
                  _id: project.leadId,
                  name: project.name,
                  clientId: project.clientId,
                  description: project.description,
                  status: 'approved'
                },
                workspaceId: workspaceData.workspace.workspaceId,
                isCollaborative: true,
                pmId: project.pmId,
                vendorId: vendorId
              }
            });
            return;
          }

          // Fallback: legacy behaviour – try to find a collaborative lead by querying PM leads
          console.log('🔍 Checking for collaborative workspace for project via PM leads:', project.id);

          const checkResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/pm-leads/vendor-leads?vendorId=${vendorId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (checkResponse.ok) {
            const leadsData = await checkResponse.json();
            
            // Look for a PM-approved lead that matches this project
            const collaborativeLead = leadsData.leads.find(lead => 
              (lead.projectId === project.id || lead.leadId === project.id) && 
              lead.pmDecision?.approved && 
              lead.pmDecision?.workspaceAccess
            );
            
            if (collaborativeLead) {
              console.log('✅ Found collaborative workspace for this project via PM leads');
              
              const collaborativeResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
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

              if (!collaborativeResponse.ok) {
                throw new Error(`Workspace access request failed with status ${collaborativeResponse.status}`);
              }

              const workspaceData = await collaborativeResponse.json();
              
              navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
                state: {
                  leadId: collaborativeLead.leadId,
                  leadDetails: {
                    _id: collaborativeLead.leadId,
                    name: collaborativeLead.leadTitle,
                    clientId: collaborativeLead.projectId,
                    description: collaborativeLead.leadDescription,
                    status: 'approved'
                  },
                  workspaceId: workspaceData.workspace.workspaceId,
                  isCollaborative: true,
                  pmId: collaborativeLead.pmId,
                  vendorId: vendorId
                }
              });
              return;
            }
          }
          
          // If no collaborative workspace found, show message instead of creating legacy workspace
          alert('⚠️ This project does not have a collaborative workspace. Only PM-approved projects with workspace access can be opened. Please check the Leads page for collaborative projects.');
          
        } catch (error) {
          console.error('❌ Error opening workspace:', error);
          alert('Failed to open workspace. Please try again.');
        }
      };
    return (
        <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100/80">
            {/* Top Section */}
            <div className="relative flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{project.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-full border border-gray-200 font-medium">Project id : {project.id}</span>
                        <span className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-full border border-gray-200 font-medium">Client id : {project.clientId}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
                    <ClockIcon className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Last update</span>
                    <span className="font-bold text-gray-700">{project.lastUpdate || '—'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
                  >
                    {isExpanded ? 'Hide details' : 'View details'}
                  </button>
                </div>
            </div>

            {/* Details Section (collapsible) */}
            {isExpanded && (
              <div className="relative mb-4 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  {project.description || 'No description available.'}
                </p>
                <p className="text-sm flex flex-wrap items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <span className="text-blue-600 font-semibold">Project Manager from Caasdi Global:</span>
                  <span className="font-bold text-emerald-700">{project.manager || 'Project Manager'}</span>
                </p>
              </div>
            )}

            <div className="relative flex flex-wrap justify-between items-end gap-4">
                <div className="flex gap-8 text-sm">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Start Date</p>
                        <p className="font-bold text-gray-800">{project.startDate || '—'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Close Date</p>
                        <p className="font-bold text-gray-800">{project.closeDate || '—'}</p>
                    </div>
                </div>
                <button 
                    onClick={openWorkspace}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
                >
                    {/* APPLIED: Flex container for text and icon */}
                    <span className="flex items-center gap-2">
                        {/* APPLIED: Workspace Icon SVG */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Workspace
                    </span>
                </button>
            </div>
        </div>
    );
};

export default ProjectCard;