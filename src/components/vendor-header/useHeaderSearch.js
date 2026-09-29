// ============================================================
// FILE: useHeaderSearch.js
// PURPOSE: The header's global search — command list, query state, the search fetch and
//          result navigation.
// CONNECTS TO: context/VendorContext (currentUser), config/env,
//              GET /api/projects/vendor/:vendorId, POST /api/vendor-leads,
//              POST /api/workspace-access/collaborative.
//
// VERBATIM EXTRACTION from components/Header/Header.jsx:358-645. The command definitions,
// filterCommands, both fetch calls, the field lists used for filtering, and the result-click
// routing (including the collaborative-workspace exchange) are reproduced exactly.
// ============================================================

import { useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../config/env';
import { VendorContext } from '../../context/VendorContext';
import { COMMAND_DEFINITIONS, filterCommands } from './headerSearchCommands';

const EMPTY_RESULTS = { projects: [], leads: [], workspaces: [], commands: [] };

/**
 * @returns {object} search state, the four handlers, and the live command list
 */
export function useHeaderSearch() {
  const { currentUser } = useContext(VendorContext);
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(EMPTY_RESULTS);

  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
    // Show all commands by default for quick access
    setSearchResults((prev) => ({
      ...prev,
      commands: COMMAND_DEFINITIONS,
    }));
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults(EMPTY_RESULTS);
    setSearchLoading(false);
  }, []);

  const handleSearchQueryChange = useCallback((value) => {
    setSearchQuery(value);
    // Update commands live as the user types (no API required)
    const cmds = filterCommands(value);
    setSearchResults((prev) => ({
      ...prev,
      commands: cmds,
    }));
  }, []);

  const performGlobalSearch = useCallback(
    async (query) => {
      const q = query.trim();
      if (q.length < 2) return;

      if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
        alert('You need to be logged in as a vendor to use search.');
        return;
      }

      const vendorId = currentUser.vendorId || currentUser.id;

      try {
        setSearchLoading(true);

        const [projectsRes, leadsRes] = await Promise.all([
          fetch(`${config.VENDOR_BACKEND_URL}/api/projects/vendor/${vendorId}`),
          fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId }),
          }),
        ]);

        let projects = [];
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          if (Array.isArray(projectsData)) {
            projects = projectsData;
          }
        }

        let leads = [];
        let workspaces = [];
        if (leadsRes.ok) {
          const leadsPayload = await leadsRes.json();
          if (leadsPayload.success && Array.isArray(leadsPayload.leads)) {
            const pmLeads = leadsPayload.leads.filter((lead) => lead.pmId);
            leads = pmLeads;
            workspaces = pmLeads.filter(
              (lead) => lead.pmDecision?.approved && lead.pmDecision?.workspaceAccess
            );
          }
        }

        const lc = q.toLowerCase();

        const filteredProjects = projects.filter((p) => {
          const fields = [p.name, p.id, p.clientId, p.status, p.projectName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return fields.includes(lc);
        });

        const filteredLeads = leads.filter((lead) => {
          const fields = [
            lead.leadTitle,
            lead.projectName,
            lead.leadId,
            lead.projectId,
            lead.specialization,
            lead.priority,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return fields.includes(lc);
        });

        const filteredWorkspaces = workspaces.filter((lead) => {
          const fields = [lead.leadTitle, lead.projectName, lead.leadId, lead.projectId]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return fields.includes(lc);
        });

        setSearchResults({
          projects: filteredProjects,
          leads: filteredLeads,
          workspaces: filteredWorkspaces,
          commands: filterCommands(q),
        });
      } catch (err) {
        console.error('Header: Error performing global search:', err);
        alert('Failed to search. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    },
    [currentUser]
  );

  const handleSearchResultClick = useCallback(
    async (type, item) => {
      setIsSearchOpen(false);

      try {
        if (type === 'project') {
          navigate('/VendorDashboard/projects', {
            state: { focusProjectId: item.id },
          });
        } else if (type === 'lead') {
          navigate(`/leads/${item.leadId}`, {
            state: { projectData: item },
          });
        } else if (type === 'workspace') {
          if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
            alert('You must be logged in to access a workspace.');
            return;
          }
          const vendorId = currentUser.vendorId || currentUser.id;

          const response = await fetch(
            `${config.VENDOR_BACKEND_URL}/api/workspace-access/collaborative`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                projectId: item.projectId,
                pmId: item.pmId,
                vendorId,
                leadId: item.leadId,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Workspace access failed (${response.status})`);
          }

          const workspaceData = await response.json();

          navigate(`/VendorDashboard/workspace/${workspaceData.workspace.workspaceId}`, {
            state: {
              leadId: item.leadId,
              leadDetails: {
                _id: item.leadId,
                name: item.leadTitle || item.projectName,
                clientId: item.projectId,
                description: item.leadDescription,
                status: 'approved',
              },
              workspaceId: workspaceData.workspace.workspaceId,
              isCollaborative: true,
              pmId: item.pmId,
              vendorId,
            },
          });
        } else if (type === 'command') {
          switch (item.id) {
            case 'go-dashboard':
              navigate('/VendorDashboard');
              break;
            case 'view-projects':
              navigate('/VendorDashboard/projects');
              break;
            case 'view-leads':
              navigate('/VendorDashboard/leads');
              break;
            case 'view-workspaces':
              navigate('/VendorDashboard/workspace');
              break;
            case 'open-portfolio':
              navigate('/portfolio?tab=catalogue');
              break;
            case 'open-profile':
              navigate('/portfolio?tab=company');
              break;
            case 'start-kyc':
              navigate('/Form1');
              break;
            default:
              break;
          }
        }
      } catch (err) {
        console.error('Header: Error handling search result click:', err);
        alert(err.message || 'Failed to open selected item.');
      }
    },
    [currentUser, navigate]
  );

  return {
    isSearchOpen,
    searchQuery,
    searchLoading,
    searchResults,
    commandDefinitions: COMMAND_DEFINITIONS,
    handleOpenSearch,
    handleCloseSearch,
    handleSearchQueryChange,
    performGlobalSearch,
    handleSearchResultClick,
  };
}
