import React, { useEffect, useState } from 'react';
import TemplateModal from './TemplateModal';
import { inputClasses, textAreaClasses, selectClasses, labelClasses } from '../ui/controlStyles';
import { INDUSTRIES } from '../../templates/templateEngine';
import { saveTemplate, updateTemplate, templateErrorMessage } from '../../utils/templateApi';

const askCanvas = () =>
  new Promise((resolve) => {
    let answered = false;
    window.dispatchEvent(
      new CustomEvent('workspace-collect-canvas', {
        detail: { respond: (data) => { answered = true; resolve(data); } },
      })
    );
    if (!answered) resolve(null); // no canvas is open to answer
  });

/**
 * Save part of the canvas (or all of it) as one of your own templates, or edit
 * the name / description / industry of one you saved. Templates are private to you.
 */
const SaveTemplateDialog = ({ existing = null, onSaved, onClose }) => {
  const editing = !!existing;
  const [canvas, setCanvas] = useState(undefined); // undefined = still asking
  const [scope, setScope] = useState('all');
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [industry, setIndustry] = useState(existing?.industry || 'general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) return;
    askCanvas().then((data) => {
      setCanvas(data);
      if (data?.selected?.length) setScope('selection');
    });
  }, [editing]);

  const chosen = canvas ? (scope === 'selection' && canvas.selected.length ? canvas.selected : canvas.all) : [];
  const nothingToSave = !editing && canvas !== undefined && chosen.length === 0;
  const nameError = name.trim().length === 0 ? 'Give the template a name.' : '';

  const submit = async (e) => {
    e.preventDefault();
    if (nameError || busy || nothingToSave || (!editing && canvas === undefined)) return;
    setBusy(true);
    setError('');
    try {
      const meta = { name: name.trim(), description: description.trim(), industry };
      if (editing) {
        onSaved(await updateTemplate(existing.templateId, meta), { skipped: 0, edited: true });
      } else {
        const ids = new Set(chosen.map((n) => n.id));
        const { template, skipped } = await saveTemplate({
          ...meta,
          nodes: chosen,
          edges: canvas.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
        });
        onSaved(template, { skipped, edited: false });
      }
    } catch (err) {
      setError(templateErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <TemplateModal title={editing ? 'Edit template details' : 'Save as template'} onClose={onClose} width="max-w-lg" labelledBy="save-template-title">
      <form onSubmit={submit} className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
        {!editing && (
          <fieldset className="m-0 border-0 p-0">
            <legend className={labelClasses}>What to save</legend>
            {canvas === undefined ? (
              <p className="m-0 text-sm text-dim">Reading the canvas…</p>
            ) : canvas === null ? (
              <p className="m-0 text-sm text-danger">Open a canvas first, then save it as a template.</p>
            ) : (
              <div className="space-y-2">
                {[
                  { id: 'selection', label: `Selected elements (${canvas.selected.length})`, disabled: canvas.selected.length === 0 },
                  { id: 'all', label: `Whole canvas (${canvas.all.length} elements)`, disabled: canvas.all.length === 0 },
                ].map((o) => (
                  <label key={o.id} className={`flex items-center gap-2 text-sm ${o.disabled ? 'text-dim opacity-60' : 'text-ink'}`}>
                    <input type="radio" name="scope" checked={scope === o.id} disabled={o.disabled} onChange={() => setScope(o.id)} />
                    {o.label}
                  </label>
                ))}
                {nothingToSave && <p className="m-0 text-xs text-danger">There is nothing on this canvas to save yet.</p>}
              </div>
            )}
          </fieldset>
        )}

        <label className="block">
          <span className={labelClasses}>Name</span>
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 3BHK fit-out plan"
            className={inputClasses({ invalid: !!error && !!nameError })}
            aria-required="true"
          />
        </label>

        <label className="block">
          <span className={labelClasses}>Description <span className="font-normal">(optional)</span></span>
          <textarea
            value={description}
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="When would you use this?"
            className={textAreaClasses()}
          />
        </label>

        <label className="block">
          <span className={labelClasses}>Industry</span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClasses()}>
            {INDUSTRIES.map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
        </label>

        {!editing && (
          <p className="m-0 rounded-lg bg-surface-hover px-3 py-2 text-xs text-dim">
            Only you can see and use this template. Names, comments, approvals, uploaded files and contact details are left out, and quotations,
            invoices and purchase orders are not included.
          </p>
        )}

        {error && <p role="alert" className="m-0 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-dim transition-colors hover:bg-surface-hover hover:text-ink">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !!nameError || nothingToSave || (!editing && canvas == null)}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-cta-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-info disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save template'}
          </button>
        </div>
      </form>
    </TemplateModal>
  );
};

export default SaveTemplateDialog;
