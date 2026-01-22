// import React, { useState, useEffect, useMemo, useContext } from 'react';
// import { Link } from 'react-router-dom';
// import { ChevronLeftIcon, CheckBadgeIcon, EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/solid';
// import ProjectRequestCard from '../../components/ProjectRequestCard/ProjectRequestCard';
// import { VendorContext } from '../../context/VendorContext';
// import ComparisonModal from '../../components/ComparisonModal/ComparisonModal';
// import config from '../../config/env';

// const LeadsPage = () => {
//     // Get the current vendor from context
//     const { currentUser } = useContext(VendorContext);
    
//     // State for project requests
//     const [requests, setRequests] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
    
//     // Reset activeTab to 'All' as statuses are null, approved, rejected
//     const [activeTab, setActiveTab] = useState('All');
//     const [isCompareMode, setIsCompareMode] = useState(false);
//     const [selectedRequests, setSelectedRequests] = useState([]);
    
//     // State for comparison modal
//     const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

//     // Helper to construct a public S3 URL from BOQ attachment metadata
//     const getBoqFileUrl = (boqAttachment) => {
//         if (!boqAttachment?.bucket || !boqAttachment?.key) return null;
//         // Use virtual-hosted S3 URL; encode key but keep path separators
//         const encodedKey = encodeURI(boqAttachment.key);
//         return `https://${boqAttachment.bucket}.s3.amazonaws.com/${encodedKey}`;
//     };

//     // Fetch leads from the new PM lead management API
//     useEffect(() => {
//         const fetchLeads = async () => {
//             try {
//                 setLoading(true);
                
//                 // If no user is logged in or both vendor ID and user ID are missing, show error
//                 if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
//                     setError("You must be logged in to view leads.");
//                     setLoading(false);
//                     return;
//                 }
                
//                 // Get vendor ID from either vendorId or id property
//                 const vendorId = currentUser.vendorId || currentUser.id;
//                 console.log("🔍 Fetching PM leads for vendor ID:", vendorId);
                
//                 // Use the new vendor leads API
//                 const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     body: JSON.stringify({ vendorId })
//                 });
                
//                 if (!response.ok) {
//                     throw new Error(`HTTP error! Status: ${response.status}`);
//                 }
                
//                 const data = await response.json();
//                 console.log("📬 Received vendor leads:", data);
                
//                 if (!data.success) {
//                     throw new Error(data.error || 'Failed to fetch leads');
//                 }
                
//                 // Map the new lead data to match the expected format
//                 // Filter to only include PM-sent leads (those with sentByPmId)
//                 const formattedData = data.leads
//                     .filter(lead => lead.pmId) // Only include leads sent by PMs
//                     .map(lead => ({
//                         _id: lead.leadId,
//                         name: lead.leadTitle,
//                         clientId: lead.projectId,
//                         description: lead.leadDescription,
//                         duration: lead.estimatedTimeline,
//                         budget: lead.estimatedBudget,
//                         // Map new status values to old format for compatibility
//                         status: mapLeadStatus(lead.status),
//                         // BOQ attachment from lead_invitations_table (via backend)
//                         boqAttachment: lead.boqAttachment || null,
//                         boqFileUrl: lead.boqAttachment ? getBoqFileUrl(lead.boqAttachment) : null,
//                         boqFileName: lead.boqAttachment?.fileName || (lead.boqAttachment ? 'BOQ.pdf' : null),
//                         pmId: lead.pmId,
//                         quotationFileUrl: lead.vendorResponse?.attachments?.[0] || null,
//                         quotationFileName: lead.vendorResponse?.attachments?.[0] ? 'Response Document' : null,
//                         assignedVendorId: lead.vendorId,
//                         sentByPmId: lead.pmId,
//                         // Additional PM lead data
//                         projectName: lead.projectName,
//                         specialization: lead.specialization,
//                         priority: lead.priority,
//                         sentAt: lead.sentAt,
//                         updatedAt: lead.updatedAt,
//                         vendorResponse: lead.vendorResponse,
//                         pmDecision: lead.pmDecision,
//                         tags: lead.tags || []
//                     }));
                
//                 console.log(`📊 Filtered ${formattedData.length} PM-sent leads out of ${data.leads.length} total leads`);
                
//                 setRequests(formattedData);
//                 setError(null);
//             } catch (err) {
//                 console.error("❌ Error fetching PM leads:", err);
//                 setError("Failed to load project requests. Please try again later.");
//             } finally {
//                 setLoading(false);
//             }
//         };
        
//         fetchLeads();
//     }, [currentUser]);

//     // Helper function to map new lead statuses to old format
//     const mapLeadStatus = (newStatus) => {
//         switch (newStatus) {
//             case 'sent':
//                 return null; // Pending
//             case 'vendor_accepted':
//                 return 'approved';
//             case 'vendor_declined':
//                 return 'rejected';
//             case 'pm_approved':
//                 return 'approved';
//             case 'pm_rejected':
//                 return 'rejected';
//             default:
//                 return null;
//         }
//     };

//     // --- Stats Calculation (Based on current state) ---
//     const stats = useMemo(() => {
//         // If no user is logged in, return zeros
//         if (!currentUser) {
//             return {
//                 pending: 0,
//                 approved: 0,
//                 rejected: 0
//             };
//         }
        
//         // Filter leads for the current vendor
//         // Get vendor ID from either vendorId or id property
//         const vendorId = currentUser.vendorId || currentUser.id;
//         // Convert both IDs to strings for comparison to avoid type mismatches
//         const vendorLeads = requests.filter(lead => 
//             String(lead.assignedVendorId) === String(vendorId)
//         );
        
//         const calculatedStats = {
//             pending: vendorLeads.filter(r => r.status === null).length,
//             approved: vendorLeads.filter(r => r.status === 'approved').length,
//             rejected: vendorLeads.filter(r => r.status === 'rejected').length,
//         };
//         return calculatedStats;
//     }, [requests, currentUser]);

//     // --- Handlers (Update in Database and State) ---
//     const handleApprove = async (id) => {
//         try {
//             // Find the lead to be approved
//             const leadToApprove = requests.find(req => req._id === id);
            
//             if (!leadToApprove) {
//                 throw new Error("Lead not found");
//             }

//             console.log("✅ Vendor accepting lead:", id);
            
//             // Get vendor ID
//             const vendorId = currentUser.vendorId || currentUser.id;
            
//             // Use the new vendor lead response API
//             const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads/${id}/respond`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     vendorId: vendorId,
//                     accepted: true,
//                     message: `I am interested in this project and would like to proceed. I can deliver within the estimated timeline of ${leadToApprove.duration} and budget of ${leadToApprove.budget}.`,
//                     proposedBudget: leadToApprove.budget,
//                     proposedTimeline: leadToApprove.duration,
//                     attachments: []
//                 }),
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
//             }

//             const result = await response.json();
//             console.log("✅ Lead response submitted:", result);

//             // Update local state
//             setRequests(prevRequests =>
//                 prevRequests.map(req =>
//                     req._id === id ? { 
//                         ...req, 
//                         status: 'approved',
//                         vendorResponse: {
//                             acceptedAt: result.respondedAt,
//                             accepted: true,
//                             message: `I am interested in this project and would like to proceed. I can deliver within the estimated timeline of ${leadToApprove.duration} and budget of ${leadToApprove.budget}.`,
//                             proposedBudget: leadToApprove.budget,
//                             proposedTimeline: leadToApprove.duration
//                         }
//                     } : req
//                 )
//             );
            
//             // Show success message
//             alert("Lead accepted successfully! The PM will review your response.");
//         } catch (error) {
//             console.error("❌ Error accepting lead:", error);
//             alert(`Failed to accept the lead: ${error.message}`);
//         }
//     };

//     const handleReject = async (id) => {
//         try {
//             // Find the lead to be rejected
//             const leadToReject = requests.find(req => req._id === id);
            
//             if (!leadToReject) {
//                 throw new Error("Lead not found");
//             }

//             console.log("❌ Vendor declining lead:", id);
            
//             // Get vendor ID
//             const vendorId = currentUser.vendorId || currentUser.id;
            
//             // Use the new vendor lead response API
//             const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads/${id}/respond`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     vendorId: vendorId,
//                     accepted: false,
//                     message: "Thank you for considering me for this project. Unfortunately, I am not available for this project at this time.",
//                     attachments: []
//                 }),
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
//             }

//             const result = await response.json();
//             console.log("❌ Lead declined:", result);

//             // Update local state
//             setRequests(prevRequests =>
//                 prevRequests.map(req =>
//                     req._id === id ? { 
//                         ...req, 
//                         status: 'rejected',
//                         vendorResponse: {
//                             acceptedAt: result.respondedAt,
//                             accepted: false,
//                             message: "Thank you for considering me for this project. Unfortunately, I am not available for this project at this time."
//                         }
//                     } : req
//                 )
//             );
            
//             // Show success message
//             alert("Lead declined successfully.");
//         } catch (error) {
//             console.error("❌ Error declining lead:", error);
//             alert(`Failed to decline the lead: ${error.message}`);
//         }
//     };

//     // --- Comparison Handlers ---
//     const handleSelectRequest = (id) => { setSelectedRequests(prev => prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]); };
//     const handleClearSelection = () => { setSelectedRequests([]); };
//     const toggleCompareMode = () => { setIsCompareMode(!isCompareMode); if (isCompareMode) { setSelectedRequests([]); } };
    
//     // Updated compare selection handler to open the modal
//     const handleCompareSelection = () => {
//         if (selectedRequests.length >= 2) {
//             setIsComparisonModalOpen(true);
//         } else {
//             alert('Please select at least 2 projects to compare');
//         }
//     };
    
//     // Get the data for selected leads
//     const selectedLeadsData = useMemo(() => {
//         return requests.filter(req => selectedRequests.includes(req._id));
//     }, [requests, selectedRequests]);
    
//     // Simple algorithm to recommend a lead (can be expanded with more complex logic)
//     const recommendedLead = useMemo(() => {
//         if (selectedLeadsData.length < 2) return null;
        
//         // Example simple algorithm: recommend the lead with the lowest budget
//         // You can replace this with more complex logic
//         return [...selectedLeadsData].sort((a, b) => {
//             const budgetA = parseFloat(a.budget?.replace(/[^0-9.-]+/g, '') || 0);
//             const budgetB = parseFloat(b.budget?.replace(/[^0-9.-]+/g, '') || 0);
//             return budgetA - budgetB;
//         })[0];
//     }, [selectedLeadsData]);

//     // --- Filter displayed requests (Adjust for statuses) ---
//     const filteredRequests = useMemo(() => {
//         // If no user is logged in, return empty array
//         if (!currentUser) {
//             return [];
//         }
        
//         // Filter leads for the current vendor
//         // Get vendor ID from either vendorId or id property
//         const vendorId = currentUser.vendorId || currentUser.id;
//         // Convert both IDs to strings for comparison to avoid type mismatches
//         const vendorLeads = requests.filter(lead => 
//             String(lead.assignedVendorId) === String(vendorId)
//         );
        
//         // Keep minimal logging for troubleshooting
//         console.log(`Found ${vendorLeads.length} leads for vendor ID: ${vendorId}`);
        
//         switch (activeTab) {
//             case 'Pending':
//                 return vendorLeads.filter(r => r.status === null);
//             case 'Approved':
//                 return vendorLeads.filter(r => r.status === 'approved');
//             case 'Rejected':
//                 return vendorLeads.filter(r => r.status === 'rejected');
//             case 'All':
//             default:
//                 return vendorLeads;
//         }
//     }, [requests, activeTab, currentUser]);

//     // --- Tab Counts (Use calculated stats) ---
//     const tabCounts = useMemo(() => {
//         // If no user is logged in, return zeros
//         if (!currentUser) {
//             return {
//                 all: 0,
//                 pending: 0,
//                 approved: 0,
//                 rejected: 0
//             };
//         }
        
//         // Filter leads for the current vendor
//         // Get vendor ID from either vendorId or id property
//         const vendorId = currentUser.vendorId || currentUser.id;
//         // Convert both IDs to strings for comparison to avoid type mismatches
//         const vendorLeads = requests.filter(lead => 
//             String(lead.assignedVendorId) === String(vendorId)
//         );
        
//         return {
//             all: vendorLeads.length,
//             pending: stats.pending,
//             approved: stats.approved,
//             rejected: stats.rejected,
//         };
//     }, [requests, stats, currentUser]);

//     // --- Tab Class Helpers (Remain the same, adjust keys if needed) ---
//      const getTabClassName = (tabName) => {
//         return `px-2 sm:px-4 py-2 text-sm font-medium focus:outline-none flex items-center gap-1 sm:gap-1.5 ${activeTab === tabName && !isCompareMode ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'} ${isCompareMode ? 'opacity-50 cursor-not-allowed' : ''}`;
//      };
//      const getTabCountClassName = (tabName) => {
//         return `ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tabName && !isCompareMode ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`;
//      };

//     return (
//         <div className="p-4 sm:p-5 space-y-6">
//             {/* Back Navigation */}
//             <div className="mb-6">
//                 <Link to="/VendorDashboard/projects" className="flex items-center text-lg font-medium text-gray-700 hover:text-black">
//                     <ChevronLeftIcon className="mr-2 h-5 w-5" />
//                     Project Requests
//                 </Link>
//             </div>
            
//             {/* Welcome Message */}
//             {currentUser && (
//                 <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
//                     <h3 className="text-emerald-800 font-medium mb-2">
//                         Welcome, {currentUser.name || currentUser.email || 'Vendor'}
//                     </h3>
//                     <p className="text-sm text-emerald-700">
//                         This page shows all project leads assigned to you. You can view details, approve or reject leads, and track their status.
//                     </p>
//                 </div>
//             )}

//             {/* Approval Status Card */}
//             <div className="bg-white rounded-xl shadow-sm mb-6 p-4 sm:p-6">
//                  <div className="flex items-center justify-between mb-6">
//                      <div className="flex items-center text-gray-700">
//                         <CheckBadgeIcon className="h-5 w-5 mr-2 text-emerald-600" />
//                         <h2 className="text-lg font-medium">Approval Status</h2>
//                      </div>
//                      <button className="text-gray-500 hover:bg-gray-100 rounded-full p-1"><EllipsisHorizontalIcon className="h-6 w-6" /></button>
//                  </div>
//                 <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200">
//                     <div className="px-2 sm:px-4 text-center"><div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Pending</div><div className="text-xl sm:text-3xl font-bold text-gray-800">{stats.pending}</div></div>
//                     <div className="px-2 sm:px-4 text-center"><div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Approved</div><div className="text-xl sm:text-3xl font-bold text-gray-800">{stats.approved}</div></div>
//                     <div className="px-2 sm:px-4 text-center"><div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Rejected</div><div className="text-xl sm:text-3xl font-bold text-gray-800">{stats.rejected}</div></div>
//                     <div className="px-2 sm:px-4 text-center"><div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Total</div><div className="text-xl sm:text-3xl font-bold text-gray-800">{requests.length}</div></div>
//                 </div>
//             </div>

//             {/* Comparison Bar */}
//             {isCompareMode && (
//                 <div className="w-full bg-teal-100/50 border-2 border-teal-400 rounded-xl p-4 sm:p-6 mb-6 flex flex-wrap justify-between items-center gap-3 sm:gap-4">
//                     <div className="flex-grow">
//                         <h3 className="text-lg sm:text-xl font-medium text-gray-800">
//                             {selectedRequests.length} Project{selectedRequests.length !== 1 ? 's' : ''} selected
//                         </h3>
//                         <p className="text-xs sm:text-sm text-gray-600 opacity-80 mt-1">
//                             Select at least 2 projects to compare
//                         </p>
//                     </div>
//                     <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
//                         <button
//                             onClick={handleClearSelection}
//                             className="bg-white text-gray-700 text-xs sm:text-sm font-medium px-3 sm:px-5 py-2 sm:py-2.5 rounded-md shadow-sm hover:bg-gray-50 border border-gray-300 transition"
//                         >
//                             Clear selection
//                         </button>
//                         <button
//                             onClick={handleCompareSelection}
//                             disabled={selectedRequests.length < 2}
//                             className={`bg-emerald-600 text-white text-xs sm:text-sm font-medium px-3 sm:px-5 py-2 sm:py-2.5 rounded-md shadow-sm transition ${selectedRequests.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'}`}
//                         >
//                             Compare selection
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* Filter Tabs & Compare Button */}
//             <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-2">
//                 <div className="flex space-x-2 sm:space-x-4">
//                     <button onClick={() => setActiveTab('All')} disabled={isCompareMode} className={getTabClassName('All')}> All <span className={getTabCountClassName('All')}>{tabCounts.all}</span> </button>
//                     <button onClick={() => setActiveTab('Pending')} disabled={isCompareMode} className={getTabClassName('Pending')}> Pending <span className={getTabCountClassName('Pending')}>{tabCounts.pending}</span> </button>
//                     <button onClick={() => setActiveTab('Approved')} disabled={isCompareMode} className={getTabClassName('Approved')}> Approved <span className={getTabCountClassName('Approved')}>{tabCounts.approved}</span> </button>
//                     <button onClick={() => setActiveTab('Rejected')} disabled={isCompareMode} className={getTabClassName('Rejected')}> Rejected <span className={getTabCountClassName('Rejected')}>{tabCounts.rejected}</span> </button>
//                 </div>
//                 <button onClick={toggleCompareMode} className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition flex items-center gap-1 sm:gap-1.5 ${isCompareMode ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'}`}> {isCompareMode ? (<><XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Cancel Compare</>) : ('Compare Leads')} </button>
//             </div>

//             {/* Project Request Cards */}
//             <div className="space-y-4">
//                 {!currentUser ? (
//                     <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-8 rounded-lg text-center">
//                         <p>You need to be logged in to view your project leads.</p>
//                         <Link 
//                             to="/login" 
//                             className="mt-4 inline-block px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-md transition"
//                         >
//                             Go to Login
//                         </Link>
//                     </div>
//                 ) : loading ? (
//                     <div className="flex justify-center items-center py-12">
//                         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
//                     </div>
//                 ) : error ? (
//                     <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-lg text-center">
//                         <p>{error}</p>
//                         <button 
//                             onClick={() => window.location.reload()} 
//                             className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition"
//                         >
//                             Try Again
//                         </button>
//                     </div>
//                 ) : filteredRequests.length > 0 ? (
//                     filteredRequests.map(project => (
//                         <ProjectRequestCard
//                             key={project._id}
//                             project={project}
//                             onApprove={handleApprove}
//                             onReject={handleReject}
//                             isCompareMode={isCompareMode}
//                             isSelected={selectedRequests.includes(project._id)}
//                             onSelectRequest={handleSelectRequest}
//                         />
//                     ))
//                 ) : (
//                     <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-8 rounded-lg text-center">
//                         <p>No PM-sent collaborative leads found for the "{activeTab}" filter.</p>
//                         <p className="mt-2 text-sm text-gray-500">
//                             {activeTab === 'All' 
//                                 ? "You don't have any PM-sent collaborative project leads yet." 
//                                 : `You don't have any ${activeTab.toLowerCase()} PM-sent collaborative leads.`}
//                         </p>
//                         <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
//                             <p className="text-sm font-medium text-blue-800">📋 About Collaborative Leads</p>
//                             <p className="text-xs text-blue-700 mt-2">
//                                 This page shows only leads sent by Project Managers through the PM-Vendor collaboration system. 
//                                 These leads can be approved for collaborative workspace access.
//                             </p>
//                             <p className="text-xs text-blue-600 mt-2">
//                                 <strong>Your Vendor ID:</strong> <span className="font-mono bg-blue-100 px-1">{currentUser.vendorId || currentUser.id}</span>
//                             </p>
//                             <p className="text-xs text-blue-600 mt-1">
//                                 <strong>Total PM leads loaded:</strong> {requests.length}
//                             </p>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {/* Comparison Modal */}
//             <ComparisonModal
//                 isOpen={isComparisonModalOpen}
//                 onClose={() => setIsComparisonModalOpen(false)}
//                 selectedLeadsData={selectedLeadsData}
//                 recommendedLead={recommendedLead}
//             />
//         </div>
//     );
// };

// export default LeadsPage;


import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, CheckBadgeIcon, EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/solid';
import ProjectRequestCard from '../../components/ProjectRequestCard/ProjectRequestCard';
import { VendorContext } from '../../context/VendorContext';
import ComparisonModal from '../../components/ComparisonModal/ComparisonModal';
import config from '../../config/env';

const LeadsPage = () => {
    const { currentUser } = useContext(VendorContext);
    
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [activeTab, setActiveTab] = useState('All');
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedRequests, setSelectedRequests] = useState([]);
    
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

    const getBoqFileUrl = (boqAttachment) => {
        if (!boqAttachment?.bucket || !boqAttachment?.key) return null;
        const encodedKey = encodeURI(boqAttachment.key);
        return `https://${boqAttachment.bucket}.s3.amazonaws.com/${encodedKey}`;
    };

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                setLoading(true);
                
                if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
                    setError("You must be logged in to view leads.");
                    setLoading(false);
                    return;
                }
                
                const vendorId = currentUser.vendorId || currentUser.id;
                console.log("🔍 Fetching PM leads for vendor ID:", vendorId);
                
                const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ vendorId })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("📬 Received vendor leads:", data);
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch leads');
                }
                
                const formattedData = data.leads
                    .filter(lead => lead.pmId)
                    .map(lead => ({
                        _id: lead.leadId,
                        name: lead.leadTitle,
                        clientId: lead.projectId,
                        description: lead.leadDescription,
                        duration: lead.estimatedTimeline,
                        budget: lead.estimatedBudget,
                        status: mapLeadStatus(lead.status),
                        boqAttachment: lead.boqAttachment || null,
                        boqFileUrl: lead.boqAttachment ? getBoqFileUrl(lead.boqAttachment) : null,
                        boqFileName: lead.boqAttachment?.fileName || (lead.boqAttachment ? 'BOQ.pdf' : null),
                        pmId: lead.pmId,
                        quotationFileUrl: lead.vendorResponse?.attachments?.[0] || null,
                        quotationFileName: lead.vendorResponse?.attachments?.[0] ? 'Response Document' : null,
                        assignedVendorId: lead.vendorId,
                        sentByPmId: lead.pmId,
                        projectName: lead.projectName,
                        specialization: lead.specialization,
                        priority: lead.priority,
                        sentAt: lead.sentAt,
                        updatedAt: lead.updatedAt,
                        vendorResponse: lead.vendorResponse,
                        pmDecision: lead.pmDecision,
                        tags: lead.tags || [],
                        // New fields for rejection feedback
                        rejectionReason: lead.rejectionReason || null,
                        leadVersion: lead.leadVersion || null,
                        negotiationHistory: lead.negotiationHistory || [],
                        rawStatus: lead.status // Keep original status for checking pm_rejected_for_revision
                    }));
                
                console.log(`📊 Filtered ${formattedData.length} PM-sent leads out of ${data.leads.length} total leads`);
                
                setRequests(formattedData);
                setError(null);
            } catch (err) {
                console.error("❌ Error fetching PM leads:", err);
                setError("Failed to load project requests. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchLeads();
    }, [currentUser]);

    const mapLeadStatus = (newStatus) => {
        switch (newStatus) {
            case 'sent': return null;
            case 'vendor_accepted': return 'approved';
            case 'vendor_declined': return 'rejected';
            case 'pm_approved': return 'approved';
            case 'pm_rejected': return 'rejected';
            default: return null;
        }
    };

    const stats = useMemo(() => {
        if (!currentUser) {
            return { pending: 0, approved: 0, rejected: 0 };
        }
        
        const vendorId = currentUser.vendorId || currentUser.id;
        const vendorLeads = requests.filter(lead => String(lead.assignedVendorId) === String(vendorId));
        
        return {
            pending: vendorLeads.filter(r => r.status === null).length,
            approved: vendorLeads.filter(r => r.status === 'approved').length,
            rejected: vendorLeads.filter(r => r.status === 'rejected').length,
        };
    }, [requests, currentUser]);

    const handleApprove = async (id) => {
        try {
            const leadToApprove = requests.find(req => req._id === id);
            if (!leadToApprove) throw new Error("Lead not found");

            console.log("✅ Vendor accepting lead:", id);
            const vendorId = currentUser.vendorId || currentUser.id;
            
            const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads/${id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId: vendorId,
                    accepted: true,
                    message: `I am interested in this project and would like to proceed. I can deliver within the estimated timeline of ${leadToApprove.duration} and budget of ${leadToApprove.budget}.`,
                    proposedBudget: leadToApprove.budget,
                    proposedTimeline: leadToApprove.duration,
                    attachments: []
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            console.log("✅ Lead response submitted:", result);

            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req._id === id
                        ? {
                              ...req,
                              status: 'approved',
                              vendorResponse: {
                                  acceptedAt: result.respondedAt,
                                  accepted: true,
                                  message: `I am interested in this project and would like to proceed. I can deliver within the estimated timeline of ${leadToApprove.duration} and budget of ${leadToApprove.budget}.`,
                                  proposedBudget: leadToApprove.budget,
                                  proposedTimeline: leadToApprove.duration
                              }
                          }
                        : req
                )
            );

            alert("Lead accepted successfully! The PM will review your response.");
        } catch (error) {
            console.error("❌ Error accepting lead:", error);
            
            // Handle specific validation errors
            if (error.message.includes('Quotation upload is required when accepting a lead')) {
                alert('Quotation upload is required when accepting a lead. Please go to the lead details page to upload your quotation and accept the lead.');
            } else {
                alert(`Failed to accept the lead: ${error.message}`);
            }
        }
    };

    const handleReject = async (id) => {
        try {
            const leadToReject = requests.find(req => req._id === id);
            if (!leadToReject) throw new Error("Lead not found");

            console.log("❌ Vendor declining lead:", id);
            const vendorId = currentUser.vendorId || currentUser.id;
            
            const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads/${id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId: vendorId,
                    accepted: false,
                    message: "Thank you for considering me for this project. Unfortunately, I am not available for this project at this time.",
                    attachments: []
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            console.log("❌ Lead declined:", result);

            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req._id === id
                        ? {
                              ...req,
                              status: 'rejected',
                              vendorResponse: {
                                  acceptedAt: result.respondedAt,
                                  accepted: false,
                                  message:
                                      "Thank you for considering me for this project. Unfortunately, I am not available for this project at this time."
                              }
                          }
                        : req
                )
            );

            alert("Lead declined successfully.");
        } catch (error) {
            console.error("❌ Error declining lead:", error);
            alert(`Failed to decline the lead: ${error.message}`);
        }
    };

    const handleSelectRequest = (id) => {
        setSelectedRequests(prev =>
            prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
        );
    };

    const handleClearSelection = () => setSelectedRequests([]);

    const toggleCompareMode = () => {
        setIsCompareMode(!isCompareMode);
        if (isCompareMode) setSelectedRequests([]);
    };

    const handleCompareSelection = () => {
        if (selectedRequests.length >= 2) {
            setIsComparisonModalOpen(true);
        } else {
            alert('Please select at least 2 projects to compare');
        }
    };

    const selectedLeadsData = useMemo(() => {
        return requests.filter(req => selectedRequests.includes(req._id));
    }, [requests, selectedRequests]);

    const recommendedLead = useMemo(() => {
        if (selectedLeadsData.length < 2) return null;
        
        return [...selectedLeadsData].sort((a, b) => {
            const budgetA = parseFloat(a.budget?.replace(/[^0-9.-]+/g, '') || 0);
            const budgetB = parseFloat(b.budget?.replace(/[^0-9.-]+/g, '') || 0);
            return budgetA - budgetB;
        })[0];
    }, [selectedLeadsData]);

    const filteredRequests = useMemo(() => {
        if (!currentUser) return [];
        
        const vendorId = currentUser.vendorId || currentUser.id;
        const vendorLeads = requests.filter(lead => String(lead.assignedVendorId) === String(vendorId));
        
        console.log(`Found ${vendorLeads.length} leads for vendor ID: ${vendorId}`);
        
        switch (activeTab) {
            case 'Pending': return vendorLeads.filter(r => r.status === null);
            case 'Approved': return vendorLeads.filter(r => r.status === 'approved');
            case 'Rejected': return vendorLeads.filter(r => r.status === 'rejected');
            default: return vendorLeads;
        }
    }, [requests, activeTab, currentUser]);

    const tabCounts = useMemo(() => {
        if (!currentUser) {
            return { all: 0, pending: 0, approved: 0, rejected: 0 };
        }
        
        const vendorId = currentUser.vendorId || currentUser.id;
        const vendorLeads = requests.filter(lead => String(lead.assignedVendorId) === String(vendorId));
        
        return {
            all: vendorLeads.length,
            pending: stats.pending,
            approved: stats.approved,
            rejected: stats.rejected,
        };
    }, [requests, stats, currentUser]);

    const getTabClassName = (tabName) => {
        return `px-2 sm:px-4 py-2 text-sm font-medium focus:outline-none flex items-center gap-1 sm:gap-1.5 ${
            activeTab === tabName && !isCompareMode
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
        } ${isCompareMode ? 'opacity-50 cursor-not-allowed' : ''}`;
    };

    const getTabCountClassName = (tabName) => {
        return `ml-1 text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === tabName && !isCompareMode
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-700'
        }`;
    };

    return (
        <div className="p-4 sm:p-5 space-y-6">

            <div className="mb-6">
                <Link to="/VendorDashboard/projects" className="flex items-center text-lg font-medium text-gray-700 hover:text-black">
                    <ChevronLeftIcon className="mr-2 h-5 w-5" />
                    Project Requests
                </Link>
            </div>

            {currentUser && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h3 className="text-emerald-800 font-medium mb-2">
                        Welcome, {currentUser.name || currentUser.email || 'Vendor'}
                    </h3>
                    <p className="text-sm text-emerald-700">
                        This page shows all project leads assigned to you. You can view details, approve or reject leads, and track their status.
                    </p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm mb-6 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center text-gray-700">
                        <CheckBadgeIcon className="h-5 w-5 mr-2 text-emerald-600" />
                        <h2 className="text-lg font-medium">Approval Status</h2>
                    </div>
                    <button className="text-gray-500 hover:bg-gray-100 rounded-full p-1">
                        <EllipsisHorizontalIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200">
                    <div className="px-2 sm:px-4 text-center">
                        <div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Pending</div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-800">{stats.pending}</div>
                    </div>
                    <div className="px-2 sm:px-4 text-center">
                        <div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Approved</div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-800">{stats.approved}</div>
                    </div>
                    <div className="px-2 sm:px-4 text-center">
                        <div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Rejected</div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-800">{stats.rejected}</div>
                    </div>
                    <div className="px-2 sm:px-4 text-center">
                        <div className="text-sm sm:text-base font-medium mb-1 text-gray-600">Total</div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-800">{requests.length}</div>
                    </div>
                </div>
            </div>

            {isCompareMode && (
                <div className="w-full bg-teal-100/50 border-2 border-teal-400 rounded-xl p-4 sm:p-6 mb-6 flex flex-wrap justify-between items-center gap-3 sm:gap-4">
                    <div className="flex-grow">
                        <h3 className="text-lg sm:text-xl font-medium text-gray-800">
                            {selectedRequests.length} Project{selectedRequests.length !== 1 ? 's' : ''} selected
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 opacity-80 mt-1">
                            Select at least 2 projects to compare
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <button
                            onClick={handleClearSelection}
                            className="bg-white text-gray-700 text-xs sm:text-sm font-medium px-3 sm:px-5 py-2 sm:py-2.5 rounded-md shadow-sm hover:bg-gray-50 border border-gray-300 transition"
                        >
                            Clear selection
                        </button>
                        <button
                            onClick={handleCompareSelection}
                            disabled={selectedRequests.length < 2}
                            className={`bg-emerald-600 text-white text-xs sm:text-sm font-medium px-3 sm:px-5 py-2 sm:py-2.5 rounded-md shadow-sm transition ${
                                selectedRequests.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'
                            }`}
                        >
                            Compare selection
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-2">
                <div className="flex space-x-2 sm:space-x-4">
                    <button onClick={() => setActiveTab('All')} disabled={isCompareMode} className={getTabClassName('All')}>
                        All <span className={getTabCountClassName('All')}>{tabCounts.all}</span>
                    </button>
                    <button onClick={() => setActiveTab('Pending')} disabled={isCompareMode} className={getTabClassName('Pending')}>
                        Pending <span className={getTabCountClassName('Pending')}>{tabCounts.pending}</span>
                    </button>
                    <button onClick={() => setActiveTab('Approved')} disabled={isCompareMode} className={getTabClassName('Approved')}>
                        Approved <span className={getTabCountClassName('Approved')}>{tabCounts.approved}</span>
                    </button>
                    <button onClick={() => setActiveTab('Rejected')} disabled={isCompareMode} className={getTabClassName('Rejected')}>
                        Rejected <span className={getTabCountClassName('Rejected')}>{tabCounts.rejected}</span>
                    </button>
                </div>

                <button
                    onClick={toggleCompareMode}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition flex items-center gap-1 sm:gap-1.5 ${
                        isCompareMode ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                    }`}
                >
                    {isCompareMode ? (
                        <>
                            <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Cancel Compare
                        </>
                    ) : (
                        'Compare Leads'
                    )}
                </button>
            </div>

            <div className="space-y-4">
                {!currentUser ? (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-8 rounded-lg text-center">
                        <p>You need to be logged in to view your project leads.</p>
                        <Link
                            to="/login"
                            className="mt-4 inline-block px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-md transition"
                        >
                            Go to Login
                        </Link>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-lg text-center">
                        <p>{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredRequests.length > 0 ? (
                    filteredRequests.map(project => (
                        <ProjectRequestCard
                            key={project._id}
                            project={project}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            isCompareMode={isCompareMode}
                            isSelected={selectedRequests.includes(project._id)}
                            onSelectRequest={handleSelectRequest}
                        />
                    ))
                ) : (
                    <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-8 rounded-lg text-center">
                        <p>No PM-sent collaborative leads found for the "{activeTab}" filter.</p>
                        <p className="mt-2 text-sm text-gray-500">
                            {activeTab === 'All'
                                ? "You don't have any PM-sent collaborative project leads yet."
                                : `You don't have any ${activeTab.toLowerCase()} PM-sent collaborative leads.`}
                        </p>
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                            <p className="text-sm font-medium text-blue-800">📋 About Collaborative Leads</p>
                            <p className="text-xs text-blue-700 mt-2">
                                This page shows only leads sent by Project Managers through the PM-Vendor collaboration system.
                                These leads can be approved for collaborative workspace access.
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                                <strong>Your Vendor ID:</strong>{' '}
                                <span className="font-mono bg-blue-100 px-1">{currentUser.vendorId || currentUser.id}</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                <strong>Total PM leads loaded:</strong> {requests.length}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <ComparisonModal
                isOpen={isComparisonModalOpen}
                onClose={() => setIsComparisonModalOpen(false)}
                selectedLeadsData={selectedLeadsData}
                recommendedLead={recommendedLead}
            />
        </div>
    );
};

export default LeadsPage;
