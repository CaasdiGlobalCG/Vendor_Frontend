import React, { useMemo, useState } from 'react';
import { Layers, GitBranch, Trash2, Pencil } from 'lucide-react';
import TemplateModal from './TemplateModal';
import TemplateThumbnail from './TemplateThumbnail';
import { inputClasses, labelClasses } from '../ui/controlStyles';
import { industryLabel, templateSummary, variablesUsed, hasTemplateTasks, taskPlanSummary } from '../../templates/templateEngine';

/**
 * Preview of one template: a drawing of it, what it contains, a few questions
 * that fill it in, and a choice of what to add:
 *   - the layout, on the canvas you have open
 *   - the task list and steps, in the workspace's Tasks (asks for confirmation first)
 * With no canvas open (a workspace with no tasks yet) the only way in is the task
 * list, and the layout becomes its first step, "Overview".
 */
const TemplateDialog = ({ template, canEdit, canCreateTasks = false, canvasAvailable = true, onAdd, onClose, onDelete, onRename }) => {
  const questions = useMemo(() => variablesUsed(template), [template]);
  const summary = useMemo(() => templateSummary(template), [template]);
  const basePlan = useMemo(() => taskPlanSummary(template), [template]);
  const [values, setValues] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mine = !template.official;

  const offersTasks = canEdit && canCreateTasks && hasTemplateTasks(template);
  const tasksOnly = offersTasks && !canvasAvailable; // nowhere to put a layout yet
  // With no canvas the layout becomes one more task ("Overview") with one step
  const plan = tasksOnly ? { ...basePlan, tasks: basePlan.tasks + 1, subtasks: basePlan.subtasks + 1 } : basePlan;
  const [addLayout, setAddLayout] = useState(true);
  // Creating tasks changes the workspace for everyone with access, so it is opt-in and confirmed
  const [tickTasks, setTickTasks] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const layoutOn = canvasAvailable && addLayout;
  const tasksOn = tasksOnly || (offersTasks && tickTasks);
  const nothingChosen = !layoutOn && !tasksOn;

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const finish = (withTasks, withLayout) =>
    onAdd(template, values, { addLayout: withLayout, createTasks: withTasks, includeOverview: tasksOnly });

  return (
    <TemplateModal title={template.name} onClose={onClose}>
      <form
        className="flex min-h-0 flex-1 flex-col md:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canEdit || nothingChosen) return;
          if (tasksOn && !confirming) {
            setConfirming(true); // ask before touching the task list
            return;
          }
          finish(false, layoutOn);
        }}
      >
        <div className="flex min-h-[200px] flex-1 flex-col border-b border-line bg-canvas md:border-b-0 md:border-r">
          <TemplateThumbnail template={template} className="h-full min-h-[200px] w-full flex-1" />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto p-5 md:w-80">
          <div>
            <span className="inline-flex rounded-full border border-line bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-dim">
              {industryLabel(template.industry)}
            </span>
            {template.description ? <p className="mb-0 mt-2 text-sm text-ink">{template.description}</p> : null}
            <p className="mb-0 mt-2 flex items-center gap-3 text-xs text-dim">
              <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" aria-hidden="true" />{summary.elements} elements</span>
              <span className="inline-flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" aria-hidden="true" />{summary.connections} connections</span>
            </p>
          </div>

          {questions.length > 0 && canEdit && (
            <fieldset className="m-0 space-y-3 border-0 p-0">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-dim">Fill in (optional)</legend>
              {questions.map((q) => (
                <label key={q.key} className="block">
                  <span className={labelClasses}>{q.label}</span>
                  <input
                    type={q.type || 'text'}
                    value={values[q.key] || ''}
                    placeholder={q.placeholder}
                    maxLength={120}
                    onChange={(e) => set(q.key, e.target.value)}
                    className={inputClasses()}
                  />
                </label>
              ))}
            </fieldset>
          )}

          {canEdit && (
            <fieldset className="m-0 space-y-2 border-0 p-0">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-dim">What to add</legend>

              {canvasAvailable && (
                <label className="flex items-start gap-2.5 rounded-lg border border-line p-3">
                  <input
                    type="checkbox"
                    checked={addLayout}
                    onChange={(e) => { setAddLayout(e.target.checked); setConfirming(false); }}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-ink">
                    The layout, on this canvas
                    <span className="mt-0.5 block text-xs text-dim">
                      The diagram plus a checklist and table to fill in. Placed in free space near what you are looking at; undo with Ctrl+Z.
                    </span>
                  </span>
                </label>
              )}

              {offersTasks && (
                <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-hover/40 p-3">
                  <input
                    type="checkbox"
                    checked={tasksOn}
                    disabled={tasksOnly}
                    onChange={(e) => { setTickTasks(e.target.checked); setConfirming(false); }}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-ink">
                    The task list and steps
                    <span className="mt-0.5 block text-xs text-dim">
                      {plan.tasks} tasks and {plan.subtasks} steps with due dates over about {plan.days} days, each step with its own checklist or
                      table. Nothing is created unless you tick this and confirm.
                      {tasksOnly ? ' This workspace has no canvas yet, so the layout becomes the first task, “Overview”.' : ''}
                    </span>
                  </span>
                </label>
              )}
            </fieldset>
          )}

          {canEdit && !canvasAvailable && !offersTasks && (
            <p className="m-0 text-xs text-dim">There is no canvas open yet. Create your first task to get one, then add this template.</p>
          )}

          {!canEdit && <p className="m-0 text-xs text-dim">You have view-only access to this canvas, so you can look at templates but not add them.</p>}

          <div className="mt-auto space-y-2">
            {confirming ? (
              <div role="alertdialog" aria-label="Confirm creating tasks" className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="m-0 text-sm font-medium text-ink">Create {plan.tasks} tasks and {plan.subtasks} steps?</p>
                <p className="m-0 text-xs text-dim">
                  They are added to this workspace's Tasks, with due dates from the start date, and everyone with access will see them. You can
                  delete them later from the Tasks panel.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => finish(true, layoutOn)}
                    className="rounded-lg bg-cta px-3 py-2 text-xs font-medium text-cta-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-info"
                  >
                    Yes, create them
                  </button>
                  {layoutOn && (
                    <button
                      type="button"
                      onClick={() => finish(false, true)}
                      className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      Add the layout only
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="rounded-lg px-3 py-2 text-xs text-dim hover:bg-surface-hover"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!canEdit || nothingChosen}
                className="w-full rounded-lg bg-cta px-4 py-2.5 text-sm font-medium text-cta-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-info disabled:cursor-not-allowed disabled:opacity-40"
              >
                {nothingChosen ? 'Choose what to add' : tasksOn ? 'Continue' : 'Add to canvas'}
              </button>
            )}

            {mine && (
              <div className="flex items-center justify-between border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => onRename(template)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-surface-hover hover:text-ink focus:outline-none focus:ring-2 focus:ring-info"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit details
                </button>
                {confirmDelete ? (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => onDelete(template)} className="rounded-md bg-danger px-2 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-info">
                      Delete for good
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md px-2 py-1.5 text-xs text-dim hover:bg-surface-hover">
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-info"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </TemplateModal>
  );
};

export default TemplateDialog;
