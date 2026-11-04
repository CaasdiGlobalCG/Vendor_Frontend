import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Search, Plus, LayoutTemplate } from 'lucide-react';
import TemplateThumbnail from './TemplateThumbnail';
import TemplateDialog from './TemplateDialog';
import SaveTemplateDialog from './SaveTemplateDialog';
import { Skeleton } from '../ui/Skeleton';
import { OFFICIAL_TEMPLATES } from '../../templates/officialTemplates';
import { INDUSTRIES, industryLabel, templateSummary, hasTemplateTasks, planTemplateTasks } from '../../templates/templateEngine';
import { VendorContext } from '../../../../context/VendorContext';
import { listMyTemplates, deleteTemplate, createTasksFromTemplate, templateErrorMessage } from '../../utils/templateApi';
import { useToast } from '../ToastProvider';

/** Is a canvas open to receive elements? (The canvas answers this request the moment it is asked.) */
const canvasIsOpen = () => {
  let open = false;
  window.dispatchEvent(new CustomEvent('workspace-collect-canvas', { detail: { respond: () => { open = true; } } }));
  return open;
};

const matches = (template, query, industry) => {
  if (industry !== 'all' && template.industry !== industry) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${template.name} ${template.description || ''} ${industryLabel(template.industry)}`.toLowerCase().includes(q);
};

const Card = ({ template, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(template)}
    className="group w-full overflow-hidden rounded-xl border border-line bg-surface text-left transition-colors hover:border-ink/25 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-info"
  >
    <TemplateThumbnail template={template} className="h-28 w-full border-b border-line" />
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="m-0 text-xs font-semibold text-ink">{template.name}</h4>
        <span className="shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[10px] font-medium text-dim">{industryLabel(template.industry)}</span>
      </div>
      <p className="m-0 mt-1 line-clamp-2 text-[11px] leading-relaxed text-dim">{template.description}</p>
      <p className="m-0 mt-1.5 text-[10px] text-dim">{templateSummary(template).elements} elements</p>
    </div>
  </button>
);

/**
 * The Templates tab: official templates for everyone, plus (for vendors) the
 * ones you saved yourself. Everything is added to the canvas you have open.
 */
const TemplateLibrary = ({ canEdit, isVendor, workspaceId, onClose }) => {
  const toast = useToast();
  const { currentUser } = useContext(VendorContext) || {};
  const [tab, setTab] = useState('official');
  const [industry, setIndustry] = useState('all');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(null); // null = not loaded
  const [mineError, setMineError] = useState('');
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [canvasAvailable, setCanvasAvailable] = useState(true);

  const loadMine = useCallback(async () => {
    setMineError('');
    try {
      setMine(await listMyTemplates());
    } catch (error) {
      setMine([]);
      setMineError(templateErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (isVendor && tab === 'mine' && mine === null) loadMine();
  }, [isVendor, tab, mine, loadMine]);

  // Checked when a template is opened: a workspace with no tasks yet has no canvas to add a layout to
  const openTemplate = (template) => {
    setCanvasAvailable(canvasIsOpen());
    setOpen(template);
  };

  const list = tab === 'official' ? OFFICIAL_TEMPLATES : mine || [];
  const shown = useMemo(() => list.filter((t) => matches(t, query, industry)), [list, query, industry]);

  const addToCanvas = async (template, values, { addLayout = true, createTasks = false, includeOverview = false } = {}) => {
    if (addLayout) window.dispatchEvent(new CustomEvent('workspace-apply-template', { detail: { template, values } }));
    setOpen(null);
    if (!createTasks || !hasTemplateTasks(template) || !workspaceId) return;

    // The task list comes in one request; the layout above is already on the canvas
    try {
      const tasks = planTemplateTasks(template, {
        values,
        workspace: { workspaceId },
        author: { name: currentUser?.name, email: currentUser?.email, role: currentUser?.role || 'vendor' },
        includeOverview,
      });
      const result = await createTasksFromTemplate(workspaceId, tasks);
      if (result?.workspace?.tasks) {
        // With no canvas open, open the overview so the template is there to see
        const select = includeOverview ? { taskId: tasks[0].id, subtaskId: tasks[0].subtasks[0].id } : null;
        window.dispatchEvent(new CustomEvent('workspace-tasks-created', { detail: { workspace: result.workspace, select } }));
      }
      const steps = tasks.reduce((sum, t) => sum + t.subtasks.length, 0);
      toast.success(`Created ${tasks.length} tasks and ${steps} steps. Find them in Tasks.`, 5000);
    } catch (error) {
      toast.error(`The layout was added, but the tasks could not be created: ${templateErrorMessage(error)}`, 7000);
    }
  };

  const remove = async (template) => {
    try {
      await deleteTemplate(template.templateId);
      setMine((current) => (current || []).filter((t) => t.templateId !== template.templateId));
      setOpen(null);
      toast.success(`Deleted “${template.name}”`);
    } catch (error) {
      toast.error(templateErrorMessage(error));
    }
  };

  const onSaved = (template, { skipped, edited }) => {
    setMine((current) => (edited ? (current || []).map((t) => (t.templateId === template.templateId ? template : t)) : [template, ...(current || [])]));
    setSaving(false);
    setEditing(null);
    setOpen(null);
    if (!edited) setTab('mine');
    toast.success(edited ? 'Template updated' : `Saved “${template.name}” to My templates${skipped ? ` (${skipped} document element${skipped === 1 ? '' : 's'} left out)` : ''}`);
  };

  return (
    <>
      <div className="ws-panel-head">
        <div>
          <h3 className="ws-panel-title">Templates</h3>
          <p className="ws-panel-desc">Start from a ready-made layout.</p>
        </div>
        <button onClick={onClose} className="ws-icon-btn" title="Close panel" aria-label="Close panel">
          ×
        </button>
      </div>

      <div className="ws-panel-body">
        <div className="space-y-3">
          {isVendor && (
            <div role="tablist" aria-label="Template source" className="flex rounded-lg border border-line bg-surface-hover/40 p-0.5">
              {[['official', 'Official'], ['mine', 'My templates']].map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${tab === id ? 'bg-surface text-ink shadow-node' : 'text-dim hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates"
              aria-label="Search templates"
              className="h-9 w-full rounded-lg border border-line bg-surface-hover/40 pl-8 pr-3 text-[13px] text-ink placeholder:text-dim focus:border-info focus:outline-none focus:ring-[3px] focus:ring-info/20"
            />
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by industry">
            {[{ id: 'all', label: 'All' }, ...INDUSTRIES].map((i) => (
              <button
                key={i.id}
                type="button"
                aria-pressed={industry === i.id}
                onClick={() => setIndustry(i.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  industry === i.id ? 'border-ink bg-ink text-canvas' : 'border-line text-dim hover:bg-surface-hover hover:text-ink'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>

          {isVendor && tab === 'mine' && (
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-info"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Save this canvas as a template
            </button>
          )}

          {tab === 'mine' && mine === null ? (
            <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading your templates">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {mineError && tab === 'mine' && (
                <p role="alert" className="m-0 text-xs text-danger">
                  {mineError}{' '}
                  <button type="button" onClick={loadMine} className="underline">Try again</button>
                </p>
              )}
              {shown.map((t) => (
                <Card key={t.id || t.templateId} template={t} onOpen={openTemplate} />
              ))}
              {shown.length === 0 && !mineError && (
                <div className="rounded-xl border border-dashed border-line p-5 text-center">
                  <LayoutTemplate className="mx-auto mb-2 h-6 w-6 text-dim" aria-hidden="true" />
                  <p className="m-0 text-xs font-medium text-ink">
                    {tab === 'mine' && list.length === 0 ? 'You have not saved any templates yet' : 'No templates match'}
                  </p>
                  <p className="m-0 mt-1 text-[11px] text-dim">
                    {tab === 'mine' && list.length === 0
                      ? 'Build something you will want again, then use “Save this canvas as a template”.'
                      : 'Try a different word or industry.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {open && (
        <TemplateDialog
          template={open}
          canEdit={canEdit}
          canCreateTasks={!!workspaceId}
          canvasAvailable={canvasAvailable}
          onAdd={addToCanvas}
          onClose={() => setOpen(null)}
          onDelete={remove}
          onRename={(t) => { setEditing(t); }}
        />
      )}
      {saving && <SaveTemplateDialog onSaved={onSaved} onClose={() => setSaving(false)} />}
      {editing && <SaveTemplateDialog existing={editing} onSaved={onSaved} onClose={() => setEditing(null)} />}
    </>
  );
};

export default TemplateLibrary;
