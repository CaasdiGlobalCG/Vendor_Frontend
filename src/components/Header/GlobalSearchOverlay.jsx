import React from "react";
import { XMarkIcon, MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const GlobalSearchOverlay = ({
  isOpen,
  query,
  onQueryChange,
  onSubmit,
  onClose,
  loading,
  results,
  onResultClick,
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(query);
    }
  };

  const hasResults =
    (results.projects && results.projects.length > 0) ||
    (results.leads && results.leads.length > 0) ||
    (results.workspaces && results.workspaces.length > 0) ||
    (results.commands && results.commands.length > 0);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 hidden sm:block" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, leads, or workspaces..."
            className="flex-1 bg-transparent outline-none text-sm sm:text-base placeholder-gray-400"
          />
          <span className="hidden sm:inline text-xs text-gray-400 mr-2">Press Enter to search • Esc to close</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close search"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[480px] overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-emerald-600" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {!loading && !hasResults && query.trim().length >= 2 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No results found for <span className="font-semibold">"{query}"</span>.
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="text-center py-10 text-gray-500 text-sm">
              Type at least 2 characters to search across your projects, leads, and workspaces.
            </div>
          )}

          {/* Projects */}
          {results.projects && results.projects.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Projects
              </h3>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/40">
                {results.projects.map((project) => (
                  <li
                    key={project.id}
                    className="px-3 sm:px-4 py-2.5 hover:bg-white cursor-pointer flex items-center justify-between gap-3"
                    onClick={() => onResultClick("project", project)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.name || "Untitled project"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Project ID: <span className="font-mono">{project.id}</span>
                        {project.clientId && (
                          <>
                            {" • "}Client ID: <span className="font-mono">{project.clientId}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {project.status && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                        {project.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Leads */}
          {results.leads && results.leads.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Leads
              </h3>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/40">
                {results.leads.map((lead) => (
                  <li
                    key={lead.leadId}
                    className="px-3 sm:px-4 py-2.5 hover:bg-white cursor-pointer flex items-center justify-between gap-3"
                    onClick={() => onResultClick("lead", lead)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {lead.leadTitle || lead.projectName || "Lead"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Lead ID: <span className="font-mono">{lead.leadId}</span>
                        {lead.projectId && (
                          <>
                            {" • "}Project ID: <span className="font-mono">{lead.projectId}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {lead.priority && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)} Priority
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Workspaces */}
          {results.workspaces && results.workspaces.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Workspaces
              </h3>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/40">
                {results.workspaces.map((ws) => (
                  <li
                    key={ws.leadId}
                    className="px-3 sm:px-4 py-2.5 hover:bg-white cursor-pointer flex items-center justify-between gap-3"
                    onClick={() => onResultClick("workspace", ws)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ws.leadTitle || ws.projectName || "Workspace"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Lead ID: <span className="font-mono">{ws.leadId}</span>
                        {ws.projectId && (
                          <>
                            {" • "}Project ID: <span className="font-mono">{ws.projectId}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Workspace access
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Commands */}
          {results.commands && results.commands.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Quick actions
              </h3>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/40">
                {results.commands.map((cmd) => (
                  <li
                    key={cmd.id}
                    className="px-3 sm:px-4 py-2.5 hover:bg-white cursor-pointer flex items-center justify-between gap-3"
                    onClick={() => onResultClick("command", cmd)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cmd.label}</p>
                      {cmd.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{cmd.description}</p>
                      )}
                    </div>
                    {cmd.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cmd.badge}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchOverlay;


