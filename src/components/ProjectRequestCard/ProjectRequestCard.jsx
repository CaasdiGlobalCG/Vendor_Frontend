

import React, { useState, useContext } from 'react';
// Import Link from react-router-dom
import { Link, useNavigate } from 'react-router-dom';
// Using Heroicons consistent with the project
import { CheckIcon, XMarkIcon, ClockIcon, DocumentArrowDownIcon, PaperClipIcon, RectangleGroupIcon } from '@heroicons/react/24/solid'; // Removed file upload icons
import { VendorContext } from '../../context/VendorContext';
import { PermissionGate } from '../../rbac/components/PermissionGate';
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
    const isApproved = project.status === 'approved';
    const isRejected = project.status === 'rejected';
    const statusLabel = isPending
      ? 'Pending Review'
      : isApproved
        ? 'Awaiting PM Decision'
        : isRejected
          ? 'Declined'
          : 'Unknown';
    const statusTone = isPending
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : isApproved
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : isRejected
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';
    const accentTone = isPending
      ? 'from-amber-500/90 via-orange-500/70 to-transparent'
      : isApproved
        ? 'from-emerald-500/90 via-teal-500/70 to-transparent'
        : isRejected
          ? 'from-rose-500/90 via-red-500/70 to-transparent'
          : 'from-slate-400/80 via-slate-300/60 to-transparent';

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
        <div className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTone}`}></div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.06),transparent_28%)] opacity-70"></div>
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
            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className={`${isCompareMode ? 'pr-8' : ''} min-w-0`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Lead
                  </span>
                  {project.priority && (
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                      project.priority === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      project.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-900">{project.name || 'Unnamed Project'}</h2>
                    {project.projectName && project.projectName !== project.name && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Project: {project.projectName}
                        </p>
                    )}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">Lead ID: {project._id || 'N/A'}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">Project ID: {project.clientId || 'N/A'}</span>
                        {project.specialization && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">{project.specialization}</span>
                        )}
                    </div>
                    {project.sentAt && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
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
                    <div className={`flex flex-col gap-2 pt-1 lg:min-w-[220px] lg:items-end ${isCompareMode ? 'pr-8' : ''}`}>
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${statusTone}`}>
                        <ClockIcon className="h-4 w-4" />
                        <span>Status: {statusLabel}</span>
                    </div>
                    {project.pmDecision && (
                        <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          project.pmDecision.approved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                            PM: {project.pmDecision.approved ? 'Approved' : 'Rejected'}
                        </div>
                    )}
                    {/* Needs Revision Badge (NEW) */}
                    {(project.status === 'sent' || project.rawStatus === 'sent') && project.rejectionReason && (
                        <div className={`text-xs px-3 py-1.5 rounded-full font-semibold border bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200 flex items-center gap-1 animate-pulse`}>
                            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                            Needs Revision
                        </div>
                    )}
                    {project.rawStatus === 'pm_rejected_for_revision' && project.rejectionReason && (
                        <div className="text-xs px-3 py-1.5 rounded-full font-semibold border bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                            Needs Revision
                        </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsExpanded(prev => !prev)}
                      className="mt-2 text-xs font-medium text-emerald-700 underline-offset-2 transition hover:text-emerald-900 hover:underline"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>
                </div>
            </div>

                <div className="relative mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3 xl:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Duration</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{project.duration || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Budget</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{project.budget || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-1 xl:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Summary</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {project.description || 'No description provided yet for this lead.'}
                    </p>
                  </div>
                  <div className="flex items-center sm:justify-end xl:justify-end">
                    <Link
                      to={`/leads/${project._id}`}
                      state={{ projectData: project }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    >
                      <span>Learn more</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

            {/* Collapsible Details Section */}
            {isExpanded && (
              <>
                {/* Description */}
                  <div className="relative mt-5 mb-4">
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
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

                {/* PM Rejection Feedback - For Revision */}
                {(project.status === 'sent' || project.rawStatus === 'sent') && project.rejectionReason && (
                  <div className="mb-4 rounded-xl border border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                      Lead Returned for Revision (v{project.leadVersion || 1})
                    </h4>
                    
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-rose-700 mb-1">Reason for Rejection:</p>
                      <p className="text-sm text-rose-800 bg-white rounded px-3 py-2 border border-rose-200 font-medium">
                        {project.rejectionReason}
                      </p>
                    </div>

                    {project.pmDecision?.feedback && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-rose-700 mb-1">PM Feedback:</p>
                        <p className="text-sm text-rose-700 bg-white rounded px-3 py-2 border border-rose-200">
                          {project.pmDecision.feedback}
                        </p>
                      </div>
                    )}

                    {project.negotiationHistory && project.negotiationHistory.length > 0 && (
                      <div className="pt-3 border-t border-rose-200">
                        <p className="text-xs font-semibold text-rose-700 mb-2">Negotiation History:</p>
                        <div className="space-y-1">
                          {project.negotiationHistory.map((entry, idx) => (
                            <div key={idx} className="text-xs text-rose-700 bg-white rounded px-2 py-1 border border-rose-100">
                              <span className="font-semibold">v{entry.version}:</span> {entry.action === 'pm_rejected' ? 'PM Rejected' : 'PM Resent'} {entry.rejectionReason && `- ${entry.rejectionReason}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-rose-600 mt-3 italic">
                      💡 Please review the feedback and update your quotation to address the concerns.
                    </p>
                  </div>
                )}

                {/* File Section Preview */}
                <div className="mb-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs">
                  {project.boqFileUrl && (
                    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 font-medium text-blue-600">
                      <DocumentArrowDownIcon className="h-4 w-4" />
                      <span>BOQ Added</span>
                    </div>
                  )}
                  {project.quotationFileUrl && (
                    <div className="flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-2 font-medium text-purple-600">
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
            <div className="relative mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-5">
              <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* Workspace Button - Only show for PM-approved collaborative projects */}
                    {project.pmDecision?.approved && project.pmDecision?.workspaceAccess ? (
                      <PermissionGate module="workspace" action="view">
                        <button
                          onClick={openWorkspace}
                          disabled={isCompareMode}
                          title={isCompareMode ? "Cancel Compare mode to access workspace" : "Open collaborative workspace with PM"}
                          // APPLIED: Gradient, larger size, bolder font, stronger shadow, and hover scale effect
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 ${
                            isCompareMode ? 'opacity-50 cursor-not-allowed' : 'hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg'
                          }`}
                        >
                          <RectangleGroupIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Collaborative</span>
                        </button>
                      </PermissionGate>
                    ) : project.status === 'approved' && project.sentByPmId ? (
                      <PermissionGate module="workspace" action="view">
                        <button
                          onClick={openWorkspace}
                          disabled={isCompareMode}
                          title={isCompareMode ? "Cancel Compare mode to access workspace" : "Awaiting PM approval for collaborative workspace"}
                          // APPLIED: Gradient, larger size, bolder font, stronger shadow, and hover scale effect
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 ${
                            isCompareMode ? 'opacity-50 cursor-not-allowed' : 'hover:from-amber-600 hover:to-orange-600 hover:shadow-lg'
                          }`}
                        >
                          <RectangleGroupIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Pending PM</span>
                        </button>
                      </PermissionGate>
                    ) : null}
                    
                    {isPending ? ( // Only show approve/reject buttons if status is null (pending)
                        <PermissionGate module="leads" action="edit">
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
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 ${
                                (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed' : 'hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg'
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
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 ${
                                (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed' : 'hover:from-rose-600 hover:to-red-700 hover:shadow-lg'
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
                        </PermissionGate>
                    ) : (
                      <span className={`rounded-2xl border px-5 py-3 text-sm font-semibold ${project.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                           {project.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectRequestCard;