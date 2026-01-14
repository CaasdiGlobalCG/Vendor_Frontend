// import React, { useState, useContext } from 'react';
// // Import Link from react-router-dom
// import { Link, useNavigate } from 'react-router-dom';
// // Using Heroicons consistent with the project
// import { CheckIcon, XMarkIcon, ClockIcon, DocumentArrowDownIcon, PaperClipIcon, RectangleGroupIcon } from '@heroicons/react/24/solid'; // Removed file upload icons
// import { VendorContext } from '../../context/VendorContext';
// import config from '../../config/env';
// // Expect 'project' prop and onApprove/onReject from LeadsPage
// const ProjectRequestCard = ({ project, onApprove, onReject, isCompareMode, isSelected, onSelectRequest }) => {
//     const navigate = useNavigate();
//     const { currentUser } = useContext(VendorContext);
    
//     // Add loading states
//     const [isApproving, setIsApproving] = useState(false);
//     const [isRejecting, setIsRejecting] = useState(false);



//     // Function to open workspace for this lead
//     const openWorkspace = async (e) => {
//         e.preventDefault(); // Prevent any default behavior
//         e.stopPropagation(); // Stop event bubbling
        
//         try {
//             if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
//                 alert('You must be logged in to access the workspace.');
//                 return;
//             }

//             const vendorId = currentUser.vendorId || currentUser.id;
            
//             // Check if this is a PM-approved lead with workspace access
//             if (project.pmDecision?.approved && project.pmDecision?.workspaceAccess) {
//                 console.log('🏗️ Opening collaborative workspace for approved lead');
                
//                 // Create or get collaborative workspace
//                 const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     body: JSON.stringify({
//                         projectId: project.clientId, // This is actually projectId
//                         pmId: project.sentByPmId,
//                         vendorId: vendorId,
//                         leadId: project._id
//                     })
//                 });

//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     if (errorData.requiresApproval) {
//                         alert('Workspace access requires PM approval. Please wait for the PM to approve your lead response.');
//                         return;
//                     }
//                     throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
//                 }

//                 const workspaceData = await response.json();
                
//                 // Navigate to collaborative workspace
//                 navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
//                     state: {
//                         leadId: project._id,
//                         leadDetails: project,
//                         workspaceId: workspaceData.workspace.workspaceId,
//                         isCollaborative: true,
//                         pmId: project.sentByPmId,
//                         vendorId: vendorId
//                     }
//                 });
//             } else {
//                 // Check if this is a lead from the lead_invitations_table
//                 console.log('🔍 Checking if this is a valid PM-sent lead...');
                
//                 const checkResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/pm-leads/vendor-leads?vendorId=${vendorId}`, {
//                     method: 'GET',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Authorization': `Bearer ${localStorage.getItem('token')}`
//                     }
//                 });

//                 if (checkResponse.ok) {
//                     const leadsData = await checkResponse.json();
//                     const isValidLead = leadsData.leads.some(lead => lead.leadId === project._id);
                    
//                     if (!isValidLead) {
//                         alert('⚠️ Workspace access is only available for PM-approved collaborative projects. This appears to be a legacy project that is not part of the PM-Vendor collaboration workflow.');
//                         return;
//                     }
//                 }

//                 // If it's a valid lead but not PM-approved yet, show appropriate message
//                 if (project.status === 'approved' && !project.pmDecision?.approved) {
//                     alert('⏳ This lead is approved but awaiting PM decision for workspace access. Please wait for PM approval to access the collaborative workspace.');
//                     return;
//                 } else if (project.status === null) {
//                     alert('⏳ Please respond to this lead first, then wait for PM approval to access the workspace.');
//                     return;
//                 } else {
//                     alert('❌ Workspace access is not available for this project. Only PM-approved collaborative projects have workspace access.');
//                     return;
//                 }
//             }
//         } catch (error) {
//             console.error('❌ Error opening workspace:', error);
//             alert(`Failed to open workspace: ${error.message}`);
//         }
//     };

//     // Use 'project' prop now
//     const isPending = project.status === null; // Check based on mock data status

//     const handleCheckboxChange = () => {
//         if (onSelectRequest) {
//             onSelectRequest(project._id); // Use project._id from mock data
//         }
//     };

//     // Handle approve with loading state
//     const handleApprove = async () => {
//         if (isApproving || isRejecting) return; // Prevent action if already loading
        
//         setIsApproving(true);
//         try {
//             await onApprove(project._id);
//         } finally {
//             setIsApproving(false);
//         }
//     };

//     // Handle reject with loading state
//     const handleReject = async () => {
//         if (isApproving || isRejecting) return; // Prevent action if already loading
        
//         setIsRejecting(true);
//         try {
//             await onReject(project._id);
//         } finally {
//             setIsRejecting(false);
//         }
//     };

//     // Robustness checks
//     if (!project) {
//         return <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-red-200">Error: Project data missing.</div>;
//     }

//     return (
//         <div className="relative bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200/80">
//             {/* Checkbox */}
//             {isCompareMode && (
//                 <div className="absolute top-3 right-3 z-10">
//                     <input
//                         type="checkbox"
//                         checked={isSelected}
//                         onChange={handleCheckboxChange}
//                         className="h-5 w-5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
//                         aria-label={`Select ${project.name || 'project'} for comparison`}
//                     />
//                 </div>
//             )}

//             {/* Top Section */}
//             <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
//                 <div className={`${isCompareMode ? 'pr-8' : ''}`}>
//                     <h2 className="text-lg font-semibold text-gray-800 mb-1">{project.name || 'Unnamed Project'}</h2>
//                     {project.projectName && project.projectName !== project.name && (
//                         <p className="text-sm text-blue-600 font-medium mb-1">Project: {project.projectName}</p>
//                     )}
//                     <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
//                         <span className="bg-gray-100 px-2 py-0.5 rounded">Lead ID: {project._id || 'N/A'}</span>
//                         <span className="bg-gray-100 px-2 py-0.5 rounded">Project ID: {project.clientId || 'N/A'}</span>
//                         {project.specialization && (
//                             <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{project.specialization}</span>
//                         )}
//                         {project.priority && (
//                             <span className={`px-2 py-0.5 rounded font-medium ${
//                                 project.priority === 'high' ? 'bg-red-100 text-red-700' :
//                                 project.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
//                                 'bg-green-100 text-green-700'
//                             }`}>
//                                 {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
//                             </span>
//                         )}
//                     </div>
//                     {project.sentAt && (
//                         <p className="text-xs text-gray-400">
//                             Sent: {new Date(project.sentAt).toLocaleDateString('en-US', {
//                                 year: 'numeric',
//                                 month: 'short',
//                                 day: 'numeric',
//                                 hour: '2-digit',
//                                 minute: '2-digit'
//                             })}
//                         </p>
//                     )}
//                 </div>
//                 <div className={`flex flex-col items-end gap-1.5 text-xs text-gray-500 whitespace-nowrap pt-1 ${isCompareMode ? 'pr-8' : ''}`}>
//                     <div className="flex items-center gap-1.5">
//                         <ClockIcon className="h-3.5 w-3.5" />
//                         <span>Status:</span>
//                         <span className={`font-medium ${
//                             project.status === 'approved' ? 'text-green-600' :
//                             project.status === 'rejected' ? 'text-red-600' :
//                             project.status === null ? 'text-yellow-600' : // Pending (null)
//                             'text-gray-500'
//                         }`}>
//                             {project.status === null ? 'Pending Review' : project.status === 'approved' ? 'Awaiting PM Decision' : project.status === 'rejected' ? 'Declined' : 'Unknown'}
//                         </span>
//                     </div>
//                     {project.pmDecision && (
//                         <div className={`text-xs px-2 py-1 rounded ${
//                             project.pmDecision.approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
//                         }`}>
//                             PM: {project.pmDecision.approved ? 'Approved' : 'Rejected'}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* Middle Section */}
//             <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description || 'No description.'}</p>

//             {/* Vendor Response Section */}
//             {project.vendorResponse && (
//                 <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                     <h4 className="text-sm font-medium text-blue-800 mb-2">Your Response</h4>
//                     <p className="text-sm text-blue-700 mb-2">{project.vendorResponse.message}</p>
//                     {project.vendorResponse.proposedBudget && (
//                         <div className="flex gap-4 text-xs text-blue-600">
//                             <span>Proposed Budget: {project.vendorResponse.proposedBudget}</span>
//                             <span>Proposed Timeline: {project.vendorResponse.proposedTimeline}</span>
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* PM Decision Section */}
//             {project.pmDecision && (
//                 <div className={`mb-4 p-3 border rounded-lg ${
//                     project.pmDecision.approved 
//                         ? 'bg-green-50 border-green-200' 
//                         : 'bg-red-50 border-red-200'
//                 }`}>
//                     <h4 className={`text-sm font-medium mb-2 ${
//                         project.pmDecision.approved ? 'text-green-800' : 'text-red-800'
//                     }`}>
//                         PM Decision: {project.pmDecision.approved ? 'Approved' : 'Rejected'}
//                     </h4>
//                     {project.pmDecision.feedback && (
//                         <p className={`text-sm mb-2 ${
//                             project.pmDecision.approved ? 'text-green-700' : 'text-red-700'
//                         }`}>
//                             {project.pmDecision.feedback}
//                         </p>
//                     )}
//                     {project.pmDecision.approved && project.pmDecision.workspaceAccess && (
//                         <div className="flex items-center gap-1 text-xs text-green-600">
//                             <CheckIcon className="h-3 w-3" />
//                             <span>Workspace access granted</span>
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* File Section Preview (Check if fields exist in mock) */}
//             <div className="flex flex-wrap gap-4 mb-4 border-t border-gray-100 pt-3 text-xs">
//                 {project.boqFileUrl && (
//                     <div className="flex items-center gap-1 text-blue-600">
//                         <DocumentArrowDownIcon className="h-3.5 w-3.5" /> BOQ Added
//                     </div>
//                 )}
//                 {project.quotationFileUrl && (
//                     <div className="flex items-center gap-1 text-purple-600">
//                         <PaperClipIcon className="h-3.5 w-3.5" /> Quotation Added
//                     </div>
//                 )}
//                 {/* Show message only if NEITHER exists */}
//                 {!project.boqFileUrl && !project.quotationFileUrl && (
//                     <span className="text-gray-400 italic">No documents available.</span>
//                 )}
//             </div>


//             {/* Bottom Section */}
//             <div className="flex flex-wrap justify-between items-end gap-4">
//                 <div className="flex-grow">
//                     <div className="flex gap-6 text-sm mb-4">
//                         <div><p className="text-xs text-gray-500 mb-0.5">Duration</p><p className="font-medium text-gray-700">{project.duration || 'N/A'}</p></div>
//                         <div><p className="text-xs text-gray-500 mb-0.5">Budget</p><p className="font-medium text-gray-700">{project.budget || 'N/A'}</p></div>
//                     </div>
//                      {/* Learn More Link - Passes project state */}
//                      <Link
//                         to={`/leads/${project._id}`} // Link to detail page
//                         state={{ projectData: project }} // <-- Pass project data in state
//                         className="bg-gray-100 text-gray-700 text-xs sm:text-sm px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
//                      >
//                         Learn more
//                      </Link>
//                 </div>

//                 {/* --- Restore Action Buttons --- */}
//                 <div className="flex space-x-2 mt-4 sm:mt-0 flex-shrink-0">
//                     {/* Workspace Button - Only show for PM-approved collaborative projects */}
//                     {project.pmDecision?.approved && project.pmDecision?.workspaceAccess ? (
//                         <button
//                             onClick={openWorkspace}
//                             disabled={isCompareMode}
//                             title={isCompareMode ? "Cancel Compare mode to access workspace" : "Open collaborative workspace with PM"}
//                             className={`flex items-center justify-center gap-1 bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition duration-150 ease-in-out ${
//                                 isCompareMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
//                             }`}
//                         >
//                             <RectangleGroupIcon className="h-4 w-4" />
//                             <span className="hidden sm:inline">Collaborative</span>
//                         </button>
//                     ) : project.status === 'approved' && project.sentByPmId ? (
//                         <button
//                             onClick={openWorkspace}
//                             disabled={isCompareMode}
//                             title={isCompareMode ? "Cancel Compare mode to access workspace" : "Awaiting PM approval for collaborative workspace"}
//                             className={`flex items-center justify-center gap-1 bg-yellow-600 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition duration-150 ease-in-out ${
//                                 isCompareMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-700'
//                             }`}
//                         >
//                             <RectangleGroupIcon className="h-4 w-4" />
//                             <span className="hidden sm:inline">Pending PM</span>
//                         </button>
//                     ) : null}
                    
//                     {isPending ? ( // Only show approve/reject buttons if status is null (pending)
//                         <>
//                             <button
//                                 onClick={handleApprove}
//                                 // Disable button in compare mode or while loading
//                                 disabled={isCompareMode || isApproving || isRejecting}
//                                 title={
//                                     isCompareMode ? "Cancel Compare mode to approve" : 
//                                     isApproving ? "Approving..." : 
//                                     isRejecting ? "Processing reject..." : 
//                                     "Approve this lead"
//                                 }
//                                 className={`flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md transition duration-150 ease-in-out ${
//                                     (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed hover:from-emerald-500 hover:to-teal-600' : 'hover:from-emerald-600 hover:to-teal-700'
//                                 }`}
//                             >
//                                 {isApproving ? (
//                                     <>
//                                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                         </svg>
//                                         Processing
//                                     </>
//                                 ) : (
//                                     <>
//                                         <CheckIcon className="h-4 w-4" /> Approve
//                                     </>
//                                 )}
//                             </button>
//                             <button
//                                 onClick={handleReject}
//                                 // Disable button in compare mode or while loading
//                                 disabled={isCompareMode || isApproving || isRejecting}
//                                 title={
//                                     isCompareMode ? "Cancel Compare mode to reject" : 
//                                     isRejecting ? "Rejecting..." : 
//                                     isApproving ? "Processing approve..." : 
//                                     "Reject this lead"
//                                 }
//                                 className={`flex items-center justify-center gap-3 bg-[#b73d1f] text-white px-4 py-2 rounded-md transition-colors text-sm font-medium ${
//                                     (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed hover:bg-[#b73d1f]' : 'hover:bg-[#ff7a5a]/90'
//                                 }`}
//                             >
//                                 {isRejecting ? (
//                                     <>
//                                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                         </svg>
//                                         Processing
//                                     </>
//                                 ) : (
//                                     <>
//                                         <XMarkIcon className="h-4 w-4" /> Reject
//                                     </>
//                                 )}
//                             </button>
//                         </>
//                     ) : (
//                         // Optionally show status chip again if not pending
//                         <span className={`text-sm font-medium px-4 py-2 rounded-md ${project.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
//                            {project.status === 'approved' ? 'Approved' : 'Rejected'}
//                         </span>
//                     )}
//                 </div>
//                 {/* --- End Action Buttons --- */}
//             </div>
//         </div>
//     );
// };

// export default ProjectRequestCard;

import React, { useState, useContext } from 'react';
// Import Link from react-router-dom
import { Link, useNavigate } from 'react-router-dom';
// Using Heroicons consistent with the project
import { CheckIcon, XMarkIcon, ClockIcon, DocumentArrowDownIcon, PaperClipIcon, RectangleGroupIcon } from '@heroicons/react/24/solid'; // Removed file upload icons
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';
// Expect 'project' prop and onApprove/onReject from LeadsPage
const ProjectRequestCard = ({ project, onApprove, onReject, isCompareMode, isSelected, onSelectRequest }) => {
    const navigate = useNavigate();
    const { currentUser } = useContext(VendorContext);
    
    // Add loading states
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);



    // Function to open workspace for this lead
    const openWorkspace = async (e) => {
        e.preventDefault(); // Prevent any default behavior
        e.stopPropagation(); // Stop event bubbling
        
        try {
            if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
                alert('You must be logged in to access the workspace.');
                return;
            }

            const vendorId = currentUser.vendorId || currentUser.id;
            
            // Check if this is a PM-approved lead with workspace access
            if (project.pmDecision?.approved && project.pmDecision?.workspaceAccess) {
                console.log('🏗️ Opening collaborative workspace for approved lead');
                
                // Create or get collaborative workspace
                const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectId: project.clientId, // This is actually projectId
                        pmId: project.sentByPmId,
                        vendorId: vendorId,
                        leadId: project._id
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.requiresApproval) {
                        alert('Workspace access requires PM approval. Please wait for the PM to approve your lead response.');
                        return;
                    }
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }

                const workspaceData = await response.json();
                
                // Navigate to collaborative workspace
                navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
                    state: {
                        leadId: project._id,
                        leadDetails: project,
                        workspaceId: workspaceData.workspace.workspaceId,
                        isCollaborative: true,
                        pmId: project.sentByPmId,
                        vendorId: vendorId
                    }
                });
            } else {
                // Check if this is a lead from the lead_invitations_table
                console.log('🔍 Checking if this is a valid PM-sent lead...');
                
                const checkResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/pm-leads/vendor-leads?vendorId=${vendorId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (checkResponse.ok) {
                    const leadsData = await checkResponse.json();
                    const isValidLead = leadsData.leads.some(lead => lead.leadId === project._id);
                    
                    if (!isValidLead) {
                        alert('⚠️ Workspace access is only available for PM-approved collaborative projects. This appears to be a legacy project that is not part of the PM-Vendor collaboration workflow.');
                        return;
                    }
                }

                // If it's a valid lead but not PM-approved yet, show appropriate message
                if (project.status === 'approved' && !project.pmDecision?.approved) {
                    alert('⏳ This lead is approved but awaiting PM decision for workspace access. Please wait for PM approval to access the collaborative workspace.');
                    return;
                } else if (project.status === null) {
                    alert('⏳ Please respond to this lead first, then wait for PM approval to access the workspace.');
                    return;
                } else {
                    alert('❌ Workspace access is not available for this project. Only PM-approved collaborative projects have workspace access.');
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Error opening workspace:', error);
            alert(`Failed to open workspace: ${error.message}`);
        }
    };

    // Use 'project' prop now
    const isPending = project.status === null; // Check based on mock data status

    const handleCheckboxChange = () => {
        if (onSelectRequest) {
            onSelectRequest(project._id); // Use project._id from mock data
        }
    };

    // Handle approve with loading state
    const handleApprove = async () => {
        if (isApproving || isRejecting) return; // Prevent action if already loading
        
        setIsApproving(true);
        try {
            await onApprove(project._id);
        } finally {
            setIsApproving(false);
        }
    };

    // Handle reject with loading state
    const handleReject = async () => {
        if (isApproving || isRejecting) return; // Prevent action if already loading
        
        setIsRejecting(true);
        try {
            await onReject(project._id);
        } finally {
            setIsRejecting(false);
        }
    };

    // Robustness checks
    if (!project) {
        return <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-red-200">Error: Project data missing.</div>;
    }

    return (
        // APPLIED: Enhanced styling from Snippet 1
        <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100/80 backdrop-blur-sm">
            {/* APPLIED: Gradient overlay for visual depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            {/* Checkbox */}
            {isCompareMode && (
                <div className="absolute top-3 right-3 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                        aria-label={`Select ${project.name || 'project'} for comparison`}
                    />
                </div>
            )}

            {/* Top Section */}
            {/* APPLIED: gap-3 and mb-4 for larger spacing */}
            <div className="relative flex flex-wrap justify-between items-start gap-3 mb-4">
                {/* APPLIED: flex-1 on the title block */}
                <div className={`${isCompareMode ? 'pr-8' : ''} flex-1`}>
                    {/* APPLIED: Larger, bolder title typography */}
                    <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{project.name || 'Unnamed Project'}</h2>
                    {project.projectName && project.projectName !== project.name && (
                        // APPLIED: Project name with dot icon/styling
                        <p className="text-sm text-blue-600 font-semibold mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Project: {project.projectName}
                        </p>
                    )}
                    {/* APPLIED: Info tags wrapper with larger mb-3 and text-gray-600 */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-3">
                        {/* APPLIED: Styled ID tags (gradient, rounded-full, border, py-1.5) */}
                        <span className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-full border border-gray-200 font-medium">Lead ID: {project._id || 'N/A'}</span>
                        <span className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-full border border-gray-200 font-medium">Project ID: {project.clientId || 'N/A'}</span>
                        {project.specialization && (
                            // APPLIED: Styled specialization tag (gradient, rounded-full, border, py-1.5, font-semibold)
                            <span className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-semibold">{project.specialization}</span>
                        )}
                        {project.priority && (
                            // APPLIED: Styled priority tag (gradient, rounded-full, border, py-1.5, font-semibold)
                            <span className={`px-3 py-1.5 rounded-full font-semibold border ${
                                project.priority === 'high' ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200' :
                                project.priority === 'medium' ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200' :
                                'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200'
                            }`}>
                                {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
                            </span>
                        )}
                    </div>
                    {project.sentAt && (
                        // APPLIED: Clock Icon and gap-1
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            Sent: {new Date(project.sentAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>
                {/* APPLIED: Status box styling and larger icon size */}
                <div className={`flex flex-col items-end gap-2 text-xs whitespace-nowrap pt-1 ${isCompareMode ? 'pr-8' : ''}`}>
                    {/* APPLIED: Status wrapper styling */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Status:</span>
                        <span className={`font-bold ${
                            project.status === 'approved' ? 'text-emerald-600' :
                            project.status === 'rejected' ? 'text-red-600' :
                            project.status === null ? 'text-amber-600' : // Pending (null)
                            'text-gray-600'
                        }`}>
                            {project.status === null ? 'Pending Review' : project.status === 'approved' ? 'Awaiting PM Decision' : project.status === 'rejected' ? 'Declined' : 'Unknown'}
                        </span>
                    </div>
                    {project.pmDecision && (
                        // APPLIED: PM decision tag styling (gradient, rounded-full, border, py-1.5, font-semibold)
                        <div className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                            project.pmDecision.approved ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200'
                        }`}>
                            PM: {project.pmDecision.approved ? 'Approved' : 'Rejected'}
                        </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsExpanded(prev => !prev)}
                      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline mt-1"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>
                </div>
            </div>

            {/* Collapsible Details Section */}
            {isExpanded && (
              <>
                {/* Description */}
                <div className="relative mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    {project.description || 'No description.'}
                  </p>
                </div>

                {/* Vendor Response Section */}
                {project.vendorResponse && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
                    <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Your Response
                    </h4>
                    <p className="text-sm text-blue-700 mb-3 leading-relaxed">
                      {project.vendorResponse.message}
                    </p>
                    {project.vendorResponse.proposedBudget && (
                      <div className="flex flex-wrap gap-4 text-xs text-blue-600 font-medium">
                        <span className="bg-white px-3 py-1.5 rounded-full border border-blue-200">
                          Proposed Budget: {project.vendorResponse.proposedBudget}
                        </span>
                        <span className="bg-white px-3 py-1.5 rounded-full border border-blue-200">
                          Proposed Timeline: {project.vendorResponse.proposedTimeline}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* PM Decision Section */}
                {project.pmDecision && (
                  <div
                    className={`mb-4 p-4 border rounded-xl shadow-sm ${
                      project.pmDecision.approved
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200'
                        : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                    }`}
                  >
                    <h4
                      className={`text-sm font-bold mb-2 flex items-center gap-2 ${
                        project.pmDecision.approved ? 'text-emerald-800' : 'text-red-800'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          project.pmDecision.approved ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      ></span>
                      PM Decision: {project.pmDecision.approved ? 'Approved' : 'Rejected'}
                    </h4>
                    {project.pmDecision.feedback && (
                      <p
                        className={`text-sm mb-3 leading-relaxed ${
                          project.pmDecision.approved ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {project.pmDecision.feedback}
                      </p>
                    )}
                    {project.pmDecision.approved && project.pmDecision.workspaceAccess && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-100 px-3 py-2 rounded-full border border-emerald-200 font-medium">
                        <CheckIcon className="h-3 w-3" />
                        <span>Workspace access granted</span>
                      </div>
                    )}
                  </div>
                )}

                {/* File Section Preview */}
                <div className="flex flex-wrap gap-4 mb-6 border-t border-gray-100 pt-4 text-xs">
                  {project.boqFileUrl && (
                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-full border border-blue-200 font-medium">
                      <DocumentArrowDownIcon className="h-4 w-4" />
                      <span>BOQ Added</span>
                    </div>
                  )}
                  {project.quotationFileUrl && (
                    <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-2 rounded-full border border-purple-200 font-medium">
                      <PaperClipIcon className="h-4 w-4" />
                      <span>Quotation Added</span>
                    </div>
                  )}
                  {!project.boqFileUrl && !project.quotationFileUrl && (
                    <span className="text-gray-400 italic bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
                      No documents available.
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Bottom Section */}
            <div className="relative flex flex-wrap justify-between items-end gap-4">
                <div className="flex-grow">
                    {/* APPLIED: Larger gap and mb-4 */}
                    <div className="flex gap-8 text-sm mb-4">
                        {/* APPLIED: Duration Box Styling (gradient, padding, border, rounded-xl) */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 rounded-xl border border-gray-200">
                            {/* APPLIED: Bolder font and larger mb-1 */}
                            <p className="text-xs text-gray-600 mb-1 font-semibold">Duration</p>
                            {/* APPLIED: Bolder value font */}
                            <p className="font-bold text-gray-800">{project.duration || 'N/A'}</p>
                        </div>
                        {/* APPLIED: Budget Box Styling (gradient, padding, border, rounded-xl) */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 rounded-xl border border-gray-200">
                            {/* APPLIED: Bolder font and larger mb-1 */}
                            <p className="text-xs text-gray-600 mb-1 font-semibold">Budget</p>
                            {/* APPLIED: Bolder value font */}
                            <p className="font-bold text-gray-800">{project.budget || 'N/A'}</p>
                        </div>
                    </div>
                    {/* Learn More Link */}
                    <Link
                        to={`/leads/${project._id}`}
                        state={{ projectData: project }}
                        // APPLIED: Styled Learn More Button (gradient, border, shadow-sm, large padding/rounding, icon)
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 border border-gray-300 shadow-sm"
                    >
                        <span>Learn more</span>
                        {/* APPLIED: Chevron icon */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                {/* --- Restore Action Buttons --- */}
                <div className="flex space-x-2 mt-4 sm:mt-0 flex-shrink-0">
                    {/* Workspace Button - Only show for PM-approved collaborative projects */}
                    {project.pmDecision?.approved && project.pmDecision?.workspaceAccess ? (
                        <button
                            onClick={openWorkspace}
                            disabled={isCompareMode}
                            title={isCompareMode ? "Cancel Compare mode to access workspace" : "Open collaborative workspace with PM"}
                            // APPLIED: Gradient, larger size, bolder font, stronger shadow, and hover scale effect
                            className={`flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 ${
                                isCompareMode ? 'opacity-50 cursor-not-allowed hover:from-green-500 hover:to-emerald-600 transform-none' : 'hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                            }`}
                        >
                            <RectangleGroupIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Collaborative</span>
                        </button>
                    ) : project.status === 'approved' && project.sentByPmId ? (
                        <button
                            onClick={openWorkspace}
                            disabled={isCompareMode}
                            title={isCompareMode ? "Cancel Compare mode to access workspace" : "Awaiting PM approval for collaborative workspace"}
                            // APPLIED: Gradient, larger size, bolder font, stronger shadow, and hover scale effect
                            className={`flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 ${
                                isCompareMode ? 'opacity-50 cursor-not-allowed hover:from-amber-500 hover:to-yellow-600 transform-none' : 'hover:from-amber-600 hover:to-yellow-700 hover:shadow-xl'
                            }`}
                        >
                            <RectangleGroupIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Pending PM</span>
                        </button>
                    ) : null}
                    
                    {isPending ? ( // Only show approve/reject buttons if status is null (pending)
                        <>
                            <button
                                onClick={handleApprove}
                                // Disable button in compare mode or while loading
                                disabled={isCompareMode || isApproving || isRejecting}
                                title={
                                    isCompareMode ? "Cancel Compare mode to accept" : 
                                    isApproving ? "Accepting..." : 
                                    isRejecting ? "Processing reject..." : 
                                    "Accept this lead (quotation upload required)"
                                }
                                // APPLIED: Gradient, larger size, bolder font, stronger shadow, and hover scale effect
                                className={`flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 ${
                                    (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed hover:from-emerald-500 hover:to-teal-600 transform-none' : 'hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl'
                                }`}
                            >
                                {isApproving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="h-4 w-4" /> Accept with Quotation
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleReject}
                                // Disable button in compare mode or while loading
                                disabled={isCompareMode || isApproving || isRejecting}
                                title={
                                    isCompareMode ? "Cancel Compare mode to reject" : 
                                    isRejecting ? "Rejecting..." : 
                                    isApproving ? "Processing approve..." : 
                                    "Reject this lead"
                                }
                                // APPLIED: Gradient, larger size, bolder font, stronger shadow, and hover scale effect
                                className={`flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 font-bold ${
                                    (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed hover:from-red-500 hover:to-rose-600 transform-none' : 'hover:from-red-600 hover:to-rose-700 hover:shadow-xl'
                                }`}
                            >
                                {isRejecting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing
                                    </>
                                ) : (
                                    <>
                                        <XMarkIcon className="h-4 w-4" /> Reject
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        // APPLIED: Styled Final Status Chip (larger size, bolder font, border, bg/text colors)
                        <span className={`text-sm font-bold px-5 py-3 rounded-xl border-2 ${project.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                           {project.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                    )}
                </div>
                {/* --- End Action Buttons --- */}
            </div>
        </div>
    );
};

export default ProjectRequestCard;