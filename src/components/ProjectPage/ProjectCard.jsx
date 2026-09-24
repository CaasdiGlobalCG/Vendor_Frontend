import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
// Updated Heroicons v2 import (using 24px outline)
import { CalendarDaysIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';

function resolveStatusMeta(project) {
  const rawStatus = String(project?.status || '').toLowerCase();

  if (rawStatus === 'active' || rawStatus === 'approved' || rawStatus === 'confirmed') {
    return {
      label: 'Confirmed',
      badge: 'border-success/20 bg-success/10 text-success',
      accent: 'bg-success',
    };
  }

  if (rawStatus === 'rejected' || rawStatus === 'declined') {
    return {
      label: 'Rejected',
      badge: 'border-danger/20 bg-danger/10 text-danger',
      accent: 'bg-danger',
    };
  }

  if (rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'closed') {
    return {
      label: 'Completed',
      badge: 'border-info/20 bg-info/10 text-info',
      accent: 'bg-info',
    };
  }

  if (rawStatus === 'pending' || rawStatus === 'sent' || project?.fromLead) {
    return {
      label: 'Pending',
      badge: 'border-warning/20 bg-warning/10 text-warning',
      accent: 'bg-warning',
    };
  }

  if (!project?.status) {
    return {
      label: 'New',
      badge: 'border-line bg-surface-hover text-ink',
      accent: 'bg-cta',
    };
  }

  return {
    label: project.status,
    badge: 'border-line bg-canvas text-ink',
    accent: 'bg-cta',
  };
}

const ProjectCard = ({ project, onManageAccess, canManageAccess = false, onRaiseSupport }) => {
  const navigate = useNavigate();
  const { currentUser } = useContext(VendorContext);
  const statusMeta = resolveStatusMeta(project);
  const projectId = String(project?.id || project?.projectId || '—').trim() || '—';
  const clientId = String(project?.clientId || '—').trim() || '—';
  const description = String(project?.description || '').trim();
  const visibleDescription = description.length > 110
    ? `${description.slice(0, 110)}...`
    : (description || 'No description available.');

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
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-none transition-colors duration-200 hover:border-line">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 ${statusMeta.accent}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold leading-5 text-ink" title={project.name || 'Untitled Project'}>
            {project.name || 'Untitled Project'}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-dim">
            {`ID ${projectId} · Client ${clientId}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusMeta.badge}`}>
            {statusMeta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-dim">
            <ClockIcon className="h-3 w-3" />
            {`Updated ${project.lastUpdate || '—'}`}
          </span>
        </div>
      </div>

      {project.fromLead && (
        <p className="mt-1.5 text-[11px] font-medium text-info">Lead approved for collaboration</p>
      )}

      <p className="mt-2 text-xs leading-5 text-dim">{visibleDescription}</p>

      <div className="mb-2 mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-dim">
        <span className="inline-flex items-center gap-1">
          <UserCircleIcon className="h-3.5 w-3.5" />
          <span className="font-medium text-ink">{project.manager || 'Project Manager'}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDaysIcon className="h-3.5 w-3.5" />
          Start <span className="font-medium text-ink">{project.startDate || '—'}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDaysIcon className="h-3.5 w-3.5" />
          Close <span className="font-medium text-ink">{project.closeDate || '—'}</span>
        </span>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-1.5 border-t border-line pt-2.5">
        {canManageAccess && onManageAccess ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onManageAccess(project);
            }}
            className="h-7 rounded-md border border-line bg-surface px-2.5 text-[11px] font-medium text-ink transition-colors hover:bg-surface-hover"
          >
            Manage Access
          </button>
        ) : null}

        <button
          onClick={openWorkspace}
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-cta px-2.5 text-[11px] font-semibold text-cta-foreground transition-colors hover:bg-cta"
        >
          <CalendarDaysIcon className="h-3.5 w-3.5" />
          Open Workspace
        </button>
        {onRaiseSupport ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRaiseSupport(project);
            }}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface-hover px-2.5 text-[11px] font-semibold text-ink transition-colors hover:bg-surface-hover"
          >
            Support
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ProjectCard;