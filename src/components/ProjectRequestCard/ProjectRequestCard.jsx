

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
      ? 'border-warning/20 bg-warning/10 text-warning'
      : isApproved
        ? 'border-line bg-surface-hover text-ink'
        : isRejected
          ? 'border-danger/20 bg-danger/10 text-danger'
          : 'border-line bg-canvas text-ink';
    const accentBar = isPending
      ? 'bg-warning'
      : isApproved
        ? 'bg-success'
        : isRejected
          ? 'bg-danger'
          : 'bg-line';

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
        return <div className="bg-surface rounded-md p-4 border border-danger/20">Error: Project data missing.</div>;
    }

    return (
        <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface p-3 transition-colors duration-150">
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 ${accentBar}`}></div>
            {/* Checkbox */}
            {isCompareMode && (
                <div className="absolute top-3 right-3 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded text-ink border-line focus:ring-ink cursor-pointer"
                        aria-label={`Select ${project.name || 'project'} for comparison`}
                    />
                </div>
            )}

            {/* Top Section */}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className={`${isCompareMode ? 'pr-8' : ''} min-w-0`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-dim">
                    Lead
                  </span>
                  {project.priority && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                      project.priority === 'high' ? 'bg-danger/10 text-danger border-danger/20' :
                      project.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                      'bg-surface-hover text-ink border-line'
                    }`}>
                      {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} priority
                    </span>
                  )}
                </div>
                <h2 className="mt-1 truncate text-sm font-semibold leading-5 text-ink">{project.name || 'Unnamed Project'}</h2>
                    {project.projectName && project.projectName !== project.name && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-info">
                            <span className="w-1.5 h-1.5 bg-info rounded-full"></span>
                            Project: {project.projectName}
                        </p>
                    )}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-dim">
                  <span>Lead ID {project._id || 'N/A'}</span>
                  <span>·</span>
                  <span>Project ID {project.clientId || 'N/A'}</span>
                        {project.specialization && (
                    <span className="rounded-full border border-info/20 bg-info/10 px-1.5 py-px font-medium text-info">{project.specialization}</span>
                        )}
                    </div>
                    {project.sentAt && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-dim">
                            <ClockIcon className="h-3 w-3" />
                            Sent {new Date(project.sentAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>
                    <div className={`flex flex-col gap-1 lg:min-w-[150px] lg:items-end ${isCompareMode ? 'pr-8' : ''}`}>
                      <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone}`}>
                        <ClockIcon className="h-3 w-3" />
                        <span>{statusLabel}</span>
                    </div>
                    {project.pmDecision && (
                        <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          project.pmDecision.approved ? 'bg-surface-hover text-ink border-line' : 'bg-danger/10 text-danger border-danger/20'
                        }`}>
                            PM: {project.pmDecision.approved ? 'Approved' : 'Rejected'}
                        </div>
                    )}
                    {/* Needs Revision Badge (NEW) */}
                    {(project.status === 'sent' || project.rawStatus === 'sent') && project.rejectionReason && (
                        <div className={`text-[11px] px-2 py-0.5 rounded-full font-medium border bg-warning/10 text-warning border-warning/20 flex items-center gap-1`}>
                            <span className="inline-block w-1.5 h-1.5 bg-warning rounded-full"></span>
                            Needs revision
                        </div>
                    )}
                    {project.rawStatus === 'pm_rejected_for_revision' && project.rejectionReason && (
                        <div className="text-[11px] px-2 py-0.5 rounded-full font-medium border bg-danger/10 text-danger border-danger/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-danger rounded-full"></span>
                            Needs revision
                        </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsExpanded(prev => !prev)}
                      className="text-[11px] font-medium text-ink underline-offset-2 transition hover:underline"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>
                </div>
            </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[11px] text-dim">
                  <span>Duration <span className="font-medium text-ink">{project.duration || 'N/A'}</span></span>
                  <span>·</span>
                  <span>Budget <span className="font-medium text-ink">{project.budget || 'N/A'}</span></span>
                  <span className="line-clamp-1 min-w-0 flex-1 basis-40">{project.description || 'No description provided yet for this lead.'}</span>
                  <Link
                    to={`/leads/${project._id}`}
                    state={{ projectData: project }}
                    className="ml-auto inline-flex items-center gap-1 font-medium text-ink transition hover:underline"
                  >
                    <span>Learn more</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

            {/* Collapsible Details Section */}
            {isExpanded && (
              <>
                {/* Description */}
                  <div className="mt-3">
                    <p className="rounded-md border border-line bg-canvas p-3 text-xs leading-relaxed text-ink">
                    {project.description || 'No description.'}
                  </p>
                </div>

                {/* Vendor Response Section */}
                {project.vendorResponse && (
                  <div className="mt-3 rounded-md border border-info/20 bg-info/10 p-3">
                    <h4 className="text-xs font-semibold text-info mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-info rounded-full"></span>
                      Your Response
                    </h4>
                    <p className="text-xs text-info mb-2 leading-relaxed">
                      {project.vendorResponse.message}
                    </p>
                    {project.vendorResponse.proposedBudget && (
                      <div className="flex flex-wrap gap-2 text-[11px] text-info font-medium">
                        <span className="bg-surface px-2 py-0.5 rounded-full border border-info/20">
                          Proposed budget: {project.vendorResponse.proposedBudget}
                        </span>
                        <span className="bg-surface px-2 py-0.5 rounded-full border border-info/20">
                          Proposed timeline: {project.vendorResponse.proposedTimeline}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* PM Decision Section */}
                {project.pmDecision && (
                  <div
                    className={`mt-3 rounded-md border p-3 ${
                      project.pmDecision.approved
                        ? 'border-line bg-canvas'
                        : 'border-danger/20 bg-danger/10'
                    }`}
                  >
                    <h4
                      className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
                        project.pmDecision.approved ? 'text-ink' : 'text-danger'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          project.pmDecision.approved ? 'bg-cta' : 'bg-danger'
                        }`}
                      ></span>
                      PM decision: {project.pmDecision.approved ? 'Approved' : 'Rejected'}
                    </h4>
                    {project.pmDecision.feedback && (
                      <p
                        className={`text-xs mb-2 leading-relaxed ${
                          project.pmDecision.approved ? 'text-ink' : 'text-danger'
                        }`}
                      >
                        {project.pmDecision.feedback}
                      </p>
                    )}
                    {project.pmDecision.approved && project.pmDecision.workspaceAccess && (
                      <div className="flex items-center gap-1.5 text-[11px] text-ink bg-surface-hover px-2 py-1 rounded-full border border-line font-medium">
                        <CheckIcon className="h-3 w-3" />
                        <span>Workspace access granted</span>
                      </div>
                    )}
                  </div>
                )}

                {/* PM Rejection Feedback - For Revision */}
                {(project.status === 'sent' || project.rawStatus === 'sent') && project.rejectionReason && (
                  <div className="mt-3 rounded-md border border-danger/20 border-l-2 border-l-danger bg-danger/10 p-3">
                    <h4 className="text-xs font-semibold text-danger mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-danger rounded-full"></span>
                      Lead returned for revision (v{project.leadVersion || 1})
                    </h4>
                    
                    <div className="mb-2">
                      <p className="text-[11px] font-semibold text-danger mb-1">Reason for rejection</p>
                      <p className="text-xs text-danger bg-surface rounded px-2 py-1.5 border border-danger/20 font-medium">
                        {project.rejectionReason}
                      </p>
                    </div>

                    {project.pmDecision?.feedback && (
                      <div className="mb-2">
                        <p className="text-[11px] font-semibold text-danger mb-1">PM feedback</p>
                        <p className="text-xs text-danger bg-surface rounded px-2 py-1.5 border border-danger/20">
                          {project.pmDecision.feedback}
                        </p>
                      </div>
                    )}

                    {project.negotiationHistory && project.negotiationHistory.length > 0 && (
                      <div className="pt-2 border-t border-danger/20">
                        <p className="text-[11px] font-semibold text-danger mb-1.5">Negotiation history</p>
                        <div className="space-y-1">
                          {project.negotiationHistory.map((entry, idx) => (
                            <div key={idx} className="text-[11px] text-danger bg-surface rounded px-2 py-1 border border-danger/10">
                              <span className="font-semibold">v{entry.version}:</span> {entry.action === 'pm_rejected' ? 'PM Rejected' : 'PM Resent'} {entry.rejectionReason && `- ${entry.rejectionReason}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-danger mt-2 italic">
                      Please review the feedback and update your quotation to address the concerns.
                    </p>
                  </div>
                )}

                {/* File Section Preview */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3 text-xs">
                  {project.boqFileUrl && (
                    <div className="flex items-center gap-1.5 rounded-full border border-info/20 bg-info/10 px-2 py-1 font-medium text-info">
                      <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                      <span>BOQ added</span>
                    </div>
                  )}
                  {project.quotationFileUrl && (
                    <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface-hover px-2 py-1 font-medium text-ink">
                      <PaperClipIcon className="h-3.5 w-3.5" />
                      <span>Quotation added</span>
                    </div>
                  )}
                  {!project.boqFileUrl && !project.quotationFileUrl && (
                    <span className="text-dim bg-canvas px-2 py-1 rounded-full border border-line">
                      No documents available.
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Bottom Section */}
            <div className="mt-auto pt-2.5">
              <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-line pt-2.5">
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {/* Workspace Button - Only show for PM-approved collaborative projects */}
                    {project.pmDecision?.approved && project.pmDecision?.workspaceAccess ? (
                      <PermissionGate module="workspace" action="view">
                        <button
                          onClick={openWorkspace}
                          disabled={isCompareMode}
                          title={isCompareMode ? "Cancel Compare mode to access workspace" : "Open collaborative workspace with PM"}
                          className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-cta px-2.5 text-[11px] font-semibold text-cta-foreground transition-colors ${
                            isCompareMode ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                          }`}
                        >
                          <RectangleGroupIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Collaborative</span>
                        </button>
                      </PermissionGate>
                    ) : project.status === 'approved' && project.sentByPmId ? (
                      <PermissionGate module="workspace" action="view">
                        <button
                          onClick={openWorkspace}
                          disabled={isCompareMode}
                          title={isCompareMode ? "Cancel Compare mode to access workspace" : "Awaiting PM approval for collaborative workspace"}
                          className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-line bg-surface-hover px-2.5 text-[11px] font-semibold text-ink transition-colors ${
                            isCompareMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-hover'
                          }`}
                        >
                          <RectangleGroupIcon className="h-3.5 w-3.5" />
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
                              className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-cta px-2.5 text-[11px] font-semibold text-cta-foreground transition-colors ${
                                (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                              }`}
                            >
                              {isApproving ? (
                                <>
                                  <svg className="animate-spin h-3.5 w-3.5 text-cta-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing
                                </>
                              ) : (
                                <>
                                  <CheckIcon className="h-3.5 w-3.5" /> Accept with quotation
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
                              className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[11px] font-semibold text-ink transition-colors ${
                                (isCompareMode || isApproving || isRejecting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-hover'
                              }`}
                            >
                              {isRejecting ? (
                                <>
                                  <svg className="animate-spin h-3.5 w-3.5 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing
                                </>
                              ) : (
                                <>
                                  <XMarkIcon className="h-3.5 w-3.5" /> Reject
                                </>
                              )}
                            </button>
                          </>
                        </PermissionGate>
                    ) : (
                      <span className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${project.status === 'approved' ? 'bg-surface-hover text-ink border-line' : 'bg-danger/10 text-danger border-danger/20'}`}>
                           {project.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                    )}
                </div>
              </div>
            </div>
        </div>
    );
};

export default ProjectRequestCard;