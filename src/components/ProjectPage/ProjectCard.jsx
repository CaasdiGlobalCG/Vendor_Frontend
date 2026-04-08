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
      badge: 'border-green-200 bg-green-50 text-green-700',
      accent: 'bg-green-500',
    };
  }

  if (rawStatus === 'rejected' || rawStatus === 'declined') {
    return {
      label: 'Rejected',
      badge: 'border-red-200 bg-red-50 text-red-700',
      accent: 'bg-red-500',
    };
  }

  if (rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'closed') {
    return {
      label: 'Completed',
      badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      accent: 'bg-indigo-500',
    };
  }

  if (rawStatus === 'pending' || rawStatus === 'sent' || project?.fromLead) {
    return {
      label: 'Pending',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      accent: 'bg-amber-500',
    };
  }

  if (!project?.status) {
    return {
      label: 'New',
      badge: 'border-teal-200 bg-teal-50 text-teal-700',
      accent: 'bg-teal-500',
    };
  }

  return {
    label: project.status,
    badge: 'border-gray-200 bg-gray-50 text-gray-700',
    accent: 'bg-gray-500',
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
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-none transition-colors duration-200 hover:border-gray-300">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 ${statusMeta.accent}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Project</p>
          <h2 className="mt-1 truncate text-[15px] font-semibold leading-5 text-gray-900" title={project.name || 'Untitled Project'}>
            {project.name || 'Untitled Project'}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {`ID ${projectId} • Client ${clientId}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta.badge}`}>
            {statusMeta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <ClockIcon className="h-3.5 w-3.5" />
            {`Updated ${project.lastUpdate || '—'}`}
          </span>
        </div>
      </div>

      {project.fromLead && (
        <p className="mt-2 text-xs font-medium text-sky-700">Lead approved for collaboration</p>
      )}

      <p className="mt-3 text-[13px] leading-5 text-gray-700">{visibleDescription}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CompactMeta
          icon={UserCircleIcon}
          label="Manager"
          value={project.manager || 'Project Manager'}
        />
        <CompactMeta
          icon={CalendarDaysIcon}
          label="Start"
          value={project.startDate || '—'}
        />
        <CompactMeta
          icon={CalendarDaysIcon}
          label="Close"
          value={project.closeDate || '—'}
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
        {canManageAccess && onManageAccess ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onManageAccess(project);
            }}
            className="h-8 rounded-md border border-teal-300 bg-white px-3 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50"
          >
            Manage Access
          </button>
        ) : null}

        <button
          onClick={openWorkspace}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
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
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Support
          </button>
        ) : null}
      </div>
    </div>
  );
};

function CompactMeta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2">
      <div className="flex items-start gap-1.5">
        <Icon className="mt-0.5 h-4 w-4 text-gray-500" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
          <p className="truncate text-xs font-semibold text-gray-800">{value || '—'}</p>
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;