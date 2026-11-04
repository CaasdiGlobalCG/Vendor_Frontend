import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { Label, Shell, uploadWorkspaceImage } from './blockInputViews';
import { CommitField } from './blockControls';
import { ErrorLine, primaryButton, smallButton, smallField, useImagePicker } from './printingViews';
import { TONE_CLASSES, parseDay } from '../../utils/blockElements';
import { newId } from '../../utils/printingElements';
import { sanitizeApproval } from '../../utils/interiorElements';
import ApprovalPanel, { useViewer } from './ApprovalPanel';
import { ROLE_LABEL, chainFor, clientSafeName, describeChain } from '../../utils/approvalRouting';
import {
  CONSTRUCTION_LIMITS,
  INSPECT_RESULTS,
  MB_UNITS,
  PERMIT_TYPES,
  POUR_GRADES,
  STAGE_PRESETS,
  addCubeSet,
  addSnag,
  applyPermitPreset,
  applyStagePreset,
  billItemFigures,
  billTotals,
  cancelPermit,
  closePermit,
  cubeJudgement,
  getSnagStatus,
  inspectSummary,
  isSnagOverdue,
  mbTotals,
  permitClosure,
  permitIssuer,
  permitState,
  permitWindow,
  pourSummary,
  rowQuantity,
  sanitizeBillItems,
  sanitizeCubes,
  sanitizeInspectLines,
  sanitizeMbRows,
  sanitizePrecautions,
  sanitizeSnags,
  setSnagStatus,
  snagSummary,
  testDue,
  unitHint,
  visibleSnags,
} from '../../utils/constructionElements';

/** Visual parts of the snag list, inspection checklist, pour card, measurement sheet, running bill and permit blocks. */

const Chip = ({ tone = 'neutral', children }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[tone].chip}`}>{children}</span>
);
const selectSmall =
  'nodrag rounded border border-line bg-surface px-1 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info';
const numField =
  'nodrag w-full rounded border border-line bg-transparent px-1.5 py-1 text-xs tabular-nums text-ink outline-none focus:border-info';
const EmptyNote = ({ children }) => (
  <div className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-xs text-dim">{children}</div>
);
const stamp = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
};
const dayText = (value) => {
  const d = parseDay(value);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};
const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const qtyText = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 3 });

const useNow = (intervalMs) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
};

const Field = ({ label, children }) => (
  <label className="block min-w-0 text-[11px] text-dim">{label}{children}</label>
);

// ---- Snag / punch list ---------------------------------------------------

export const SnagBlock = ({ id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage, now }) => {
  const today = now || new Date();
  const items = useMemo(() => sanitizeSnags(data.items), [data.items]);
  const summary = snagSummary(items, today);
  const [filter, setFilter] = useState('all');
  const [verifying, setVerifying] = useState(null); // { id, by }
  const [error, setError] = useState('');
  const picker = useImagePicker({ upload, workspaceId, nodeId: id, taskId, subtaskId });
  const shown = visibleSnags(items, filter, today);
  const update = (snagId, changes) => onChange({ items: items.map((s) => (s.id === snagId ? { ...s, ...changes } : s)) });

  const move = (snagId, status, by) => {
    const result = setSnagStatus(items, snagId, status, { by });
    if (result.error) { setError(result.error); return; }
    setError('');
    setVerifying(null);
    onChange({ items: result.items });
  };

  return (
    <Shell className="w-[520px]">
      <Label>{data.label}</Label>
      {summary.total ? (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Chip>{summary.total} {summary.total === 1 ? 'snag' : 'snags'}</Chip>
            <Chip tone="danger">{summary.open} open</Chip>
            <Chip tone="info">{summary.fixed} fixed, awaiting check</Chip>
            <Chip tone="success">{summary.verified} verified</Chip>
            {summary.overdue ? <Chip tone="danger">{summary.overdue} overdue</Chip> : null}
          </div>
          <div role="progressbar" aria-label="Snags cleared" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percent} className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-hover">
            <div className="h-full rounded-full bg-success" style={{ width: `${summary.percent}%` }} />
          </div>
          <div className="mb-2 flex gap-1" role="group" aria-label="Filter snags">
            {[['all', 'All'], ['open', 'Not verified'], ['overdue', 'Overdue']].map(([key, text]) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`${smallButton} ${filter === key ? 'border-info text-info' : ''}`}>{text}</button>
            ))}
          </div>
        </>
      ) : null}
      {picker.input}

      {shown.length ? (
        <ul className="m-0 space-y-2 p-0">
          {shown.map((s) => {
            const status = getSnagStatus(s.status);
            const overdue = isSnagOverdue(s, today);
            return (
              <li key={s.id} className="list-none rounded-lg border border-line p-2" data-snag-no={s.no} data-snag-status={s.status}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-surface-hover px-1.5 py-0.5 text-xs font-bold tabular-nums text-ink">#{s.no}</span>
                    <Chip tone={status.tone}>{status.label}</Chip>
                    {overdue ? <Chip tone="danger">Overdue</Chip> : null}
                  </div>
                  {editable ? (
                    <button type="button" onClick={() => onChange({ items: items.filter((x) => x.id !== s.id) })} aria-label={`Remove snag ${s.no}`} className="nodrag rounded p-1 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="mt-1.5 flex gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    {editable ? (
                      <>
                        <CommitField value={s.defect} onCommit={(v) => update(s.id, { defect: v })} placeholder="What is wrong" className={`${smallField} border-line`} aria-label={`Defect for snag ${s.no}`} />
                        <div className="grid grid-cols-3 gap-1">
                          <CommitField value={s.location} onCommit={(v) => update(s.id, { location: v })} placeholder="Location" className={`${smallField} border-line`} aria-label={`Location for snag ${s.no}`} />
                          <CommitField value={s.owner} onCommit={(v) => update(s.id, { owner: v })} placeholder="Owner" className={`${smallField} border-line`} aria-label={`Owner for snag ${s.no}`} />
                          <CommitField type="date" value={s.due} onCommit={(v) => update(s.id, { due: v })} className={`${smallField} border-line`} aria-label={`Due date for snag ${s.no}`} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-ink">{s.defect || <span className="text-dim">No description</span>}</div>
                        <div className="text-[11px] text-dim">
                          {[s.location, s.owner && `Owner ${s.owner}`, s.due && `Due ${dayText(s.due)}`].filter(Boolean).join(' · ')}
                        </div>
                      </>
                    )}
                    {s.status === 'verified' ? (
                      <div className="text-[11px] text-success">Verified by {s.verifiedBy}{s.verifiedAt ? ` · ${stamp(s.verifiedAt)}` : ''}</div>
                    ) : null}
                  </div>
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt={`Snag ${s.no}`} className="h-full w-full object-cover" />
                    ) : editable ? (
                      <button type="button" disabled={picker.busy} onClick={() => picker.pick((url) => update(s.id, { photoUrl: url }))} aria-label={`Add photo to snag ${s.no}`} className="nodrag flex h-full w-full items-center justify-center text-dim hover:text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-info">
                        {picker.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </div>
                </div>

                {editable ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {s.status === 'open' ? (
                      <button type="button" onClick={() => move(s.id, 'fixed')} className={smallButton}>Mark fixed</button>
                    ) : null}
                    {s.status === 'fixed' && verifying?.id !== s.id ? (
                      <>
                        <button type="button" onClick={() => { setVerifying({ id: s.id, by: '' }); setError(''); }} className={primaryButton}>Verify</button>
                        <button type="button" onClick={() => move(s.id, 'open')} className={smallButton}>Reopen</button>
                      </>
                    ) : null}
                    {s.status === 'fixed' && verifying?.id === s.id ? (
                      <>
                        <input value={verifying.by} onChange={(e) => setVerifying({ id: s.id, by: e.target.value })} placeholder="Verified by (name)" aria-label="Verified by" className="nodrag w-40 rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info" />
                        <button type="button" onClick={() => move(s.id, 'verified', verifying.by)} className={primaryButton}>Confirm</button>
                        <button type="button" onClick={() => setVerifying(null)} className={smallButton}>Cancel</button>
                      </>
                    ) : null}
                    {s.status === 'verified' ? <button type="button" onClick={() => move(s.id, 'open')} className={smallButton}>Reopen</button> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <EmptyNote>{items.length ? 'No snags match this filter' : 'No snags logged yet'}</EmptyNote>}
      {editable ? (
        <button
          type="button"
          disabled={items.length >= CONSTRUCTION_LIMITS.snags}
          onClick={() => { const next = addSnag(items, data.snagSeq); if (next) onChange({ items: next.items, snagSeq: next.snagSeq }); }}
          className={`${smallButton} mt-2`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add snag
        </button>
      ) : null}
      <ErrorLine message={error || picker.error} />
    </Shell>
  );
};

// ---- Inspection checklist ------------------------------------------------

const SIGNOFF_LABEL = { pending: 'Not signed off', approved: 'Accepted', changes: 'Rejected' };
const SIGNOFF_TONE = { pending: 'neutral', approved: 'success', changes: 'danger' };

export const SiteInspectBlock = ({
  id, data, editable, onChange, viewer, collaborators, decide, notify, onServerPatch,
}) => {
  const lines = useMemo(() => sanitizeInspectLines(data.lines), [data.lines]);
  const signoff = sanitizeApproval(data.signoff);
  const chain = chainFor(data);
  // Locked while it is with an approver or once approved. An inspection signed off before
  // approvals were routed keeps its decision and is read-only.
  const legacyDecided = !chain && signoff.status !== 'pending';
  const locked = (chain && ['pending', 'approved'].includes(chain.state)) || legacyDecided;
  const canEdit = editable && !locked;
  const s = inspectSummary(lines);
  const updateLine = (lineId, changes) => onChange({ lines: lines.map((l) => (l.id === lineId ? { ...l, ...changes } : l)) });
  const headline = chain ? describeChain(chain) : { tone: SIGNOFF_TONE[signoff.status], text: SIGNOFF_LABEL[signoff.status] };
  const validate = () => {
    if (!s.total) return 'Add at least one line before sending for approval';
    if (s.pending) return `${s.pending} ${s.pending === 1 ? 'line is' : 'lines are'} still pending`;
    if (s.fail) return `${s.fail} ${s.fail === 1 ? 'line has' : 'lines have'} failed. Put them right and re-check them first.`;
    return null;
  };

  return (
    <Shell className="w-[480px]">
      <div className="flex items-start justify-between gap-2">
        <Label>{data.label}</Label>
        {!chain ? <span className="mb-2"><Chip tone={headline.tone}>{headline.text}</Chip></span> : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Stage">
          {canEdit ? (
            <>
              <CommitField value={data.stage} onCommit={(v) => onChange({ stage: v, lines: applyStagePreset(lines, v) })} list="inspection-stages" placeholder="Pre-pour" className={`${smallField} border-line`} aria-label="Stage" />
              <datalist id="inspection-stages">{Object.keys(STAGE_PRESETS).map((k) => <option key={k} value={k} />)}</datalist>
            </>
          ) : <div className="truncate py-1 text-xs font-semibold text-ink">{data.stage || '—'}</div>}
        </Field>
        <Field label="Location">
          {canEdit ? <CommitField value={data.location} onCommit={(v) => onChange({ location: v })} className={`${smallField} border-line`} aria-label="Location" />
            : <div className="truncate py-1 text-xs font-semibold text-ink">{data.location || '—'}</div>}
        </Field>
        <Field label="Date">
          {canEdit ? <CommitField type="date" value={data.date} onCommit={(v) => onChange({ date: v })} className={`${smallField} border-line`} aria-label="Date" />
            : <div className="py-1 text-xs font-semibold text-ink">{dayText(data.date) || '—'}</div>}
        </Field>
      </div>

      {s.total ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip tone="success">{s.pass} pass</Chip>
          <Chip tone={s.fail ? 'danger' : 'neutral'}>{s.fail} fail</Chip>
          <Chip>{s.pending} pending</Chip>
          <Chip>{s.na} n/a</Chip>
        </div>
      ) : null}

      {lines.length ? (
        <ul className="m-0 mt-2 space-y-1.5 p-0">
          {lines.map((l) => (
            <li key={l.id} className="list-none rounded-lg border border-line p-1.5" data-line-result={l.result}>
              {canEdit ? (
                <>
                  <CommitField value={l.text} onCommit={(v) => updateLine(l.id, { text: v })} placeholder="What is checked" className={smallField} aria-label="Check" />
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <div role="group" aria-label={`Result for ${l.text || 'check'}`} className="flex rounded-md border border-line p-0.5">
                      {INSPECT_RESULTS.filter((r) => r.id !== 'pending').map((r) => (
                        <button key={r.id} type="button" aria-pressed={l.result === r.id} onClick={() => updateLine(l.id, { result: l.result === r.id ? 'pending' : r.id })}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-info ${l.result === r.id ? `${TONE_CLASSES[r.tone].chip} border` : 'text-dim hover:text-ink'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <CommitField value={l.remark} onCommit={(v) => updateLine(l.id, { remark: v })} placeholder="Remark" className={`${smallField} min-w-[100px] flex-1`} aria-label="Remark" />
                    <button type="button" onClick={() => onChange({ lines: lines.filter((x) => x.id !== l.id) })} aria-label="Remove check" className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-ink">{l.text || '—'}</div>
                    {l.remark ? <div className="text-[11px] text-dim">{l.remark}</div> : null}
                  </div>
                  <Chip tone={INSPECT_RESULTS.find((r) => r.id === l.result).tone}>{INSPECT_RESULTS.find((r) => r.id === l.result).label}</Chip>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2"><EmptyNote>{canEdit ? 'Choose a stage to load its usual checks, or add your own' : 'No checks listed'}</EmptyNote></div>
      )}
      {canEdit ? (
        <button type="button" disabled={lines.length >= CONSTRUCTION_LIMITS.lines} onClick={() => onChange({ lines: [...lines, { id: newId('line'), text: '', result: 'pending', remark: '' }] })} className={`${smallButton} mt-2`}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add check
        </button>
      ) : null}

      <div className="mt-3 border-t border-line pt-3">
        {legacyDecided ? (
          <div className="text-xs" data-legacy-signoff>
            <span className="font-medium text-ink">{SIGNOFF_LABEL[signoff.status]}</span>
            {signoff.by ? <span className="text-ink"> by {clientSafeName(signoff.by, data.approvalChain)}</span> : null}
            {signoff.at ? <span className="text-dim"> · {stamp(signoff.at)}</span> : null}
            {signoff.note ? <div className="mt-1 text-ink">{signoff.note}</div> : null}
          </div>
        ) : (
          <ApprovalPanel
            kind="siteinspect"
            id={id}
            data={data}
            editable={editable}
            viewer={viewer}
            collaborators={collaborators}
            decide={decide}
            notify={notify}
            onServerPatch={onServerPatch || onChange}
            validate={validate}
            getContent={() => ({ stage: data.stage, location: data.location, date: data.date, lines })}
            what={`the ${data.stage || 'inspection'} inspection${data.location ? ` at ${data.location}` : ''}`}
            place={[data.taskName, data.subtaskName].filter(Boolean).join(' › ')}
          />
        )}
      </div>
    </Shell>
  );
};

// ---- Concrete pour card --------------------------------------------------

const CUBE_TONE = { meets: 'success', below: 'danger', pending: 'neutral', invalid: 'warning' };
const CUBE_WORD = { meets: 'Meets', below: 'Below', pending: 'Not tested', invalid: 'Check value' };

export const PourBlock = ({ data, editable, onChange, now }) => {
  const today = now || new Date();
  const cubes = useMemo(() => sanitizeCubes(data.cubes), [data.cubes]);
  const summary = pourSummary({ ...data, cubes });
  const grade = data.grade || '';
  const gradeKnown = POUR_GRADES.includes(grade);
  const updateCube = (cubeId, changes) => onChange({ cubes: cubes.map((c) => (c.id === cubeId ? { ...c, ...changes } : c)) });

  const ageSection = (age) => {
    const list = cubes.filter((c) => c.age === age);
    const stats = age === 7 ? summary.d7 : summary.d28;
    const due = testDue(data.date, age, today);
    const waiting = list.some((c) => String(c.strength).trim() === '');
    return (
      <div key={age} className="mt-3" data-age={age}>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-dim">{age}-day cubes</div>
          <div className="text-[11px] tabular-nums text-dim">
            {stats.target !== null ? `Target ≥ ${stats.target} N/mm²` : 'Set a grade like M25'}
            {stats.average !== null ? ` · Average ${stats.average}` : ''}
          </div>
        </div>
        {due && waiting ? (
          <div className={`mt-0.5 text-[11px] ${due.state === 'overdue' ? 'text-danger' : 'text-dim'}`} data-due-state={due.state}>
            {due.state === 'overdue' ? `Result overdue by ${-due.daysUntil} ${-due.daysUntil === 1 ? 'day' : 'days'} (was due ${dayText(due.dueDate)})`
              : due.state === 'today' ? 'Test due today'
                : `Test due ${dayText(due.dueDate)}`}
          </div>
        ) : null}
        {list.length ? (
          <ul className="m-0 mt-1 space-y-1 p-0">
            {list.map((c) => {
              const j = cubeJudgement(c, summary.fck, summary.expect7Pct);
              return (
                <li key={c.id} className="flex list-none items-center gap-2" data-cube-judgement={j}>
                  {editable ? (
                    <>
                      <CommitField value={c.mark} onCommit={(v) => updateCube(c.id, { mark: v })} className={`${smallField} w-20`} aria-label="Cube mark" />
                      <CommitField value={c.strength} onCommit={(v) => updateCube(c.id, { strength: v })} inputMode="decimal" placeholder="N/mm²" className={`${numField} w-24`} aria-label={`Strength of cube ${c.mark}`} />
                    </>
                  ) : (
                    <>
                      <span className="w-20 text-xs text-ink">{c.mark}</span>
                      <span className="w-24 text-xs tabular-nums text-ink">{c.strength || '—'}</span>
                    </>
                  )}
                  <Chip tone={CUBE_TONE[j]}>{CUBE_WORD[j]}</Chip>
                  {editable ? (
                    <button type="button" onClick={() => onChange({ cubes: cubes.filter((x) => x.id !== c.id) })} aria-label={`Remove cube ${c.mark}`} className="nodrag ml-auto rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info"><Trash2 className="h-3.5 w-3.5" /></button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : <div className="mt-1 text-xs text-dim">No cubes recorded</div>}
        {editable ? (
          <button type="button" disabled={cubes.length + 3 > CONSTRUCTION_LIMITS.cubes} onClick={() => { const next = addCubeSet(cubes, age, 3); if (next) onChange({ cubes: next }); }} className={`${smallButton} mt-1`}>
            <Plus className="h-3 w-3" aria-hidden="true" /> Add 3 cubes
          </button>
        ) : null}
      </div>
    );
  };

  const text = (key, label, placeholder, inputMode) => (
    <Field label={label}>
      {editable ? <CommitField value={data[key]} onCommit={(v) => onChange({ [key]: v })} inputMode={inputMode} placeholder={placeholder} className={`${smallField} border-line`} aria-label={label} />
        : <div className="truncate py-1 text-xs font-semibold text-ink">{data[key] || '—'}</div>}
    </Field>
  );

  return (
    <Shell className="w-[460px]">
      <Label>{data.label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {text('location', 'Location', 'Block B')}
        {text('member', 'Member', 'Slab L3')}
        <Field label="Grade">
          {editable ? (
            <select value={gradeKnown ? grade : '__custom'} onChange={(e) => onChange({ grade: e.target.value === '__custom' ? 'M' : e.target.value })} aria-label="Grade" className={`${selectSmall} w-full`}>
              {POUR_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              <option value="__custom">Other…</option>
            </select>
          ) : <div className="py-1 text-xs font-semibold text-ink">{grade || '—'}</div>}
        </Field>
        <Field label="Date of pour">
          {editable ? <CommitField type="date" value={data.date} onCommit={(v) => onChange({ date: v })} className={`${smallField} border-line`} aria-label="Date of pour" />
            : <div className="py-1 text-xs font-semibold text-ink">{dayText(data.date) || '—'}</div>}
        </Field>
        {text('volume', 'Volume (m³)', '24', 'decimal')}
        {text('slump', 'Slump (mm)', '100', 'decimal')}
      </div>
      {editable && !gradeKnown ? (
        <div className="mt-2 max-w-[160px]">
          <Field label="Custom grade (e.g. M32)">
            <CommitField value={grade} onCommit={(v) => onChange({ grade: v.toUpperCase() })} className={`${smallField} border-line`} aria-label="Custom grade" />
          </Field>
        </div>
      ) : null}
      {summary.fck === null ? <div role="alert" className="mt-2 text-xs text-warning">Grade not recognised. Use a grade like M25 so results can be checked.</div> : null}

      {ageSection(7)}
      {ageSection(28)}

      <div className="mt-3 rounded-lg bg-surface-hover/50 p-2 text-[11px] text-dim">
        Indicative check against the grade: 28-day results against {summary.fck ?? 'the'} N/mm², 7-day results against
        {' '}{summary.expect7Pct}% of it. Final acceptance follows your project specification.
      </div>
    </Shell>
  );
};

// ---- Measurement sheet ---------------------------------------------------

export const MeasureBookBlock = ({ data, editable, onChange }) => {
  const rows = useMemo(() => sanitizeMbRows(data.rows), [data.rows]);
  const totals = mbTotals({ rows });
  const unit = MB_UNITS.some((u) => u.value === data.unit) ? data.unit : 'm³';
  const update = (rowId, changes) => onChange({ rows: rows.map((r) => (r.id === rowId ? { ...r, ...changes } : r)) });
  const grid = '1.6fr 0.55fr 0.7fr 0.7fr 0.7fr 0.9fr 20px';

  return (
    <Shell className="w-[560px]">
      <div className="flex items-center justify-between gap-2">
        <Label>{data.label}</Label>
        {editable ? (
          <select value={unit} onChange={(e) => onChange({ unit: e.target.value })} aria-label="Unit of measurement" className={`${selectSmall} mb-2`}>
            {MB_UNITS.map((u) => <option key={u.value} value={u.value}>{u.value}</option>)}
          </select>
        ) : <span className="mb-2 text-xs font-semibold text-ink">{unit}</span>}
      </div>
      {editable ? (
        <CommitField value={data.work} onCommit={(v) => onChange({ work: v })} placeholder="Item of work, e.g. Excavation for footings" className={`${smallField} mb-2 border-line`} aria-label="Item of work" />
      ) : data.work ? <div className="mb-2 text-sm font-semibold text-ink">{data.work}</div> : null}

      {rows.length ? (
        <div className="overflow-x-auto">
          <div className="min-w-[520px] space-y-1">
            <div className="grid gap-1 text-[10px] uppercase tracking-wide text-dim" style={{ gridTemplateColumns: grid }}>
              <span>Description</span><span>Nos</span><span>L</span><span>B</span><span>D</span><span className="text-right">Qty ({unit})</span><span />
            </div>
            {rows.map((r) => {
              const q = rowQuantity(r);
              const hint = unitHint(r, unit);
              return (
                <div key={r.id} data-row-kind={r.kind} data-row-state={q.state}>
                  <div className={`grid items-center gap-1 rounded p-0.5 ${r.kind === 'deduct' ? 'bg-danger/5' : ''}`} style={{ gridTemplateColumns: grid }}>
                    {editable ? (
                      <>
                        <div className="flex items-center gap-1">
                          <select value={r.kind} onChange={(e) => update(r.id, { kind: e.target.value })} aria-label="Add or deduct" className={selectSmall}>
                            <option value="add">+</option><option value="deduct">−</option>
                          </select>
                          <CommitField value={r.desc} onCommit={(v) => update(r.id, { desc: v })} placeholder="Description" className={smallField} aria-label="Row description" />
                        </div>
                        {['nos', 'l', 'b', 'd'].map((f) => (
                          <CommitField key={f} value={r[f]} onCommit={(v) => update(r.id, { [f]: v })} inputMode="decimal" className={numField} aria-label={`${f === 'nos' ? 'Number' : f.toUpperCase()} for ${r.desc || 'row'}`} />
                        ))}
                      </>
                    ) : (
                      <>
                        <span className="truncate text-xs text-ink">{r.kind === 'deduct' ? '− ' : ''}{r.desc || '—'}</span>
                        {['nos', 'l', 'b', 'd'].map((f) => <span key={f} className="text-xs tabular-nums text-ink">{r[f] || ''}</span>)}
                      </>
                    )}
                    <span className={`text-right text-xs font-semibold tabular-nums ${r.kind === 'deduct' ? 'text-danger' : 'text-ink'}`}>
                      {q.state === 'ok' ? `${r.kind === 'deduct' ? '−' : ''}${qtyText(q.qty)}` : q.state === 'invalid' ? '!' : '—'}
                    </span>
                    {editable ? (
                      <button type="button" onClick={() => onChange({ rows: rows.filter((x) => x.id !== r.id) })} aria-label={`Remove row ${r.desc || ''}`.trim()} className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info"><Trash2 className="h-3.5 w-3.5" /></button>
                    ) : <span />}
                  </div>
                  {q.state === 'invalid' ? <div role="alert" className="pl-1 text-[11px] text-danger">Use positive numbers only. Put a deduction on a Deduct row.</div> : null}
                  {hint ? <div className="pl-1 text-[11px] text-warning">{hint}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : <EmptyNote>No measurements yet</EmptyNote>}
      {editable ? (
        <button type="button" disabled={rows.length >= CONSTRUCTION_LIMITS.rows} onClick={() => onChange({ rows: [...rows, { id: newId('mb'), desc: '', nos: '', l: '', b: '', d: '', kind: 'add' }] })} className={`${smallButton} mt-2`}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add row
        </button>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-hover/50 p-2 text-xs" data-mb-totals>
        <div><div className="text-dim">Additions</div><div className="font-semibold tabular-nums text-ink">{qtyText(totals.add)} {unit}</div></div>
        <div><div className="text-dim">Deductions</div><div className="font-semibold tabular-nums text-danger">{qtyText(totals.deduct)} {unit}</div></div>
        <div><div className="text-dim">Net quantity</div><div className="font-semibold tabular-nums text-ink">{qtyText(totals.total)} {unit}</div></div>
      </div>
      {totals.skipped ? <div role="status" className="mt-1 text-[11px] text-dim">{totals.skipped} empty {totals.skipped === 1 ? 'row is' : 'rows are'} not counted</div> : null}
      {totals.invalid ? <div role="status" className="mt-1 text-[11px] text-danger">{totals.invalid} {totals.invalid === 1 ? 'row has' : 'rows have'} a number that cannot be used and is not counted</div> : null}
      {totals.deductionExceeds ? <div role="alert" className="mt-1 text-[11px] text-danger">Deductions are larger than the additions. Check the rows.</div> : null}
    </Shell>
  );
};

// ---- Running bill --------------------------------------------------------

export const RaBillBlock = ({ data, editable, onChange }) => {
  const items = useMemo(() => sanitizeBillItems(data.items), [data.items]);
  const totals = billTotals({ ...data, items });
  const update = (itemId, changes) => onChange({ items: items.map((it) => (it.id === itemId ? { ...it, ...changes } : it)) });
  const grid = '1.7fr 0.5fr 0.8fr 0.8fr 0.8fr 0.8fr 0.9fr 1fr 20px';

  const head = (key, label, placeholder) => (
    <Field label={label}>
      {editable ? <CommitField value={data[key]} onCommit={(v) => onChange({ [key]: v })} placeholder={placeholder} className={`${smallField} border-line`} aria-label={label} />
        : <div className="truncate py-1 text-xs font-semibold text-ink">{data[key] || '—'}</div>}
    </Field>
  );
  const pct = (key, label) => (
    <Field label={label}>
      {editable ? <CommitField value={String(data[key] ?? '')} onCommit={(v) => onChange({ [key]: v })} inputMode="decimal" className={`${numField} border-line`} aria-label={label} />
        : <div className="py-1 text-xs font-semibold tabular-nums text-ink">{data[key] ?? '—'}</div>}
    </Field>
  );

  return (
    <Shell className="w-[640px]">
      <Label>{data.label}</Label>
      <div className="grid grid-cols-4 gap-2">
        {head('project', 'Project', 'Tower B')}
        {head('billNo', 'Bill no.', 'RA-03')}
        <Field label="Date">
          {editable ? <CommitField type="date" value={data.date} onCommit={(v) => onChange({ date: v })} className={`${smallField} border-line`} aria-label="Bill date" />
            : <div className="py-1 text-xs font-semibold text-ink">{dayText(data.date) || '—'}</div>}
        </Field>
        <Field label="Advance recovery (₹)">
          {editable ? <CommitField value={data.advanceRecovery} onCommit={(v) => onChange({ advanceRecovery: v })} inputMode="decimal" className={`${numField} border-line`} aria-label="Advance recovery" />
            : <div className="py-1 text-xs font-semibold tabular-nums text-ink">{data.advanceRecovery || '—'}</div>}
        </Field>
        {pct('retentionPct', 'Retention %')}
        {pct('gstPct', 'GST %')}
      </div>

      {items.length ? (
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[600px] space-y-1">
            <div className="grid gap-1 text-[10px] uppercase tracking-wide text-dim" style={{ gridTemplateColumns: grid }}>
              <span>Item</span><span>Unit</span><span>BOQ qty</span><span>Rate</span><span>Previous</span><span>This bill</span><span>To date</span><span className="text-right">This bill ₹</span><span />
            </div>
            {items.map((it) => {
              const f = billItemFigures(it);
              return (
                <div key={it.id} data-bill-item data-excess={f.valid && f.excess ? 'true' : undefined}>
                  <div className="grid items-center gap-1" style={{ gridTemplateColumns: grid }}>
                    {editable ? (
                      <>
                        <CommitField value={it.desc} onCommit={(v) => update(it.id, { desc: v })} placeholder="Item" className={smallField} aria-label="Item description" />
                        <CommitField value={it.unit} onCommit={(v) => update(it.id, { unit: v })} className={smallField} aria-label="Unit" />
                        {['boqQty', 'rate', 'prevQty', 'thisQty'].map((k) => (
                          <CommitField key={k} value={it[k]} onCommit={(v) => update(it.id, { [k]: v })} inputMode="decimal" className={numField} aria-label={`${{ boqQty: 'BOQ quantity', rate: 'Rate', prevQty: 'Previous quantity', thisQty: 'This bill quantity' }[k]} for ${it.desc || 'item'}`} />
                        ))}
                      </>
                    ) : (
                      <>
                        <span className="truncate text-xs text-ink">{it.desc || '—'}</span>
                        <span className="text-xs text-dim">{it.unit}</span>
                        {['boqQty', 'rate', 'prevQty', 'thisQty'].map((k) => <span key={k} className="text-xs tabular-nums text-ink">{it[k] || ''}</span>)}
                      </>
                    )}
                    <span className={`text-xs tabular-nums ${f.valid && f.excess ? 'font-semibold text-warning' : 'text-ink'}`}>
                      {f.valid ? `${qtyText(f.toDate)}${f.percent !== null ? ` (${f.percent}%)` : ''}` : '!'}
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-ink">{f.valid ? inr(f.amountThis) : '—'}</span>
                    {editable ? (
                      <button type="button" onClick={() => onChange({ items: items.filter((x) => x.id !== it.id) })} aria-label={`Remove ${it.desc || 'item'}`} className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info"><Trash2 className="h-3.5 w-3.5" /></button>
                    ) : <span />}
                  </div>
                  {f.valid && f.excess ? <div className="text-[11px] text-warning">Quantity to date is above the BOQ quantity</div> : null}
                  {!f.valid ? <div role="alert" className="text-[11px] text-danger">Use zero or positive numbers only</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : <div className="mt-3"><EmptyNote>No items yet</EmptyNote></div>}
      {editable ? (
        <button type="button" disabled={items.length >= CONSTRUCTION_LIMITS.billItems} onClick={() => onChange({ items: [...items, { id: newId('bi'), desc: '', unit: '', boqQty: '', rate: '', prevQty: '', thisQty: '' }] })} className={`${smallButton} mt-2`}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add item
        </button>
      ) : null}

      <dl className="m-0 mt-3 space-y-1 rounded-lg bg-surface-hover/50 p-2 text-xs" data-bill-totals>
        {[
          ['Gross this bill', inr(totals.grossThis), false],
          [`GST (${totals.gstPct}%)`, `+ ${inr(totals.gst)}`, false],
          [`Retention (${totals.retentionPct}%)`, `− ${inr(totals.retention)}`, false],
          ['Advance recovery', `− ${inr(totals.advance)}`, false],
          ['Net payable', inr(totals.net), true],
          ['Gross to date', inr(totals.grossToDate), false],
        ].map(([k, v, strong]) => (
          <div key={k} className={`flex justify-between ${strong ? 'border-t border-line pt-1 text-sm font-bold text-ink' : ''}`}>
            <dt className={strong ? '' : 'text-dim'}>{k}</dt><dd className="m-0 tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {totals.excess ? <div role="status" className="mt-1 text-[11px] text-warning">{totals.excess} {totals.excess === 1 ? 'item is' : 'items are'} above the BOQ quantity</div> : null}
      {totals.invalid ? <div role="status" className="mt-1 text-[11px] text-danger">{totals.invalid} {totals.invalid === 1 ? 'item has' : 'items have'} a number that cannot be used and is not counted</div> : null}
      <details className="mt-2 text-[11px] text-dim">
        <summary className="cursor-pointer">How this is worked out</summary>
        <p className="m-0 mt-1">
          This bill amount is this-bill quantity × rate. GST and retention are a percentage of the gross for this bill.
          Net payable = gross + GST − retention − advance recovery. This is a simplified view: check it against
          your contract terms.
        </p>
      </details>
    </Shell>
  );
};

// ---- Permit to work ------------------------------------------------------

const PERMIT_TONE = {
  draft: 'neutral', requested: 'warning', declined: 'danger', valid: 'success', expiring: 'warning',
  expired: 'danger', closed: 'neutral', cancelled: 'neutral',
};
const PERMIT_WORD = {
  draft: 'Draft', requested: 'Waiting for approval', declined: 'Declined', valid: 'Valid',
  expiring: 'Expires within the hour', expired: 'Expired: stop work and close', closed: 'Closed', cancelled: 'Cancelled',
};

export const PermitBlock = ({
  id, data, editable, onChange, now, viewer: viewerProp, collaborators, decide, notify, onServerPatch,
}) => {
  const live = useNow(30000);
  const clock = now || live;
  const viewer = useViewer(viewerProp);
  const precautions = useMemo(() => sanitizePrecautions(data.precautions), [data.precautions]);
  const state = permitState(data, clock);
  const status = data.status || 'draft';
  const closure = permitClosure(data.closure);
  const issuer = permitIssuer(data, viewer);
  const chain = chainFor(data);
  const chainOpen = !!chain && ['pending', 'approved'].includes(chain.state);
  // Editable until it has been sent; again after it is sent back
  const editing = (status === 'draft' || status === 'declined') && !chainOpen;
  const canEdit = editable && editing;
  const w = permitWindow(data.validFrom, data.validTo);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // 'close' | 'cancel'
  const [by, setBy] = useState('');
  const [note, setNote] = useState('');
  const [safe, setSafe] = useState(false);
  const resetAction = () => { setMode(null); setBy(''); setNote(''); setSafe(false); setError(''); };

  const place = [data.taskName, data.subtaskName].filter(Boolean).join(' › ');
  const where = [data.type, data.location].filter(Boolean).join(' at ');

  const changeType = (type) => {
    const answered = precautions.some((p) => p.state !== '');
    onChange({ type, precautions: answered ? precautions : applyPermitPreset([], type) });
  };
  const setPrecaution = (pid, value) => onChange({ precautions: precautions.map((p) => (p.id === pid ? { ...p, state: p.state === value ? '' : value } : p)) });

  // A quick check for a fast answer; the server checks again and is the one that counts
  const validate = () => {
    if (!data.type) return 'Choose the type of permit';
    if (!String(data.location || '').trim()) return 'Say where the work is';
    if (!w.valid) return 'Set a start and an end time, with the end after the start';
    if (new Date(data.validTo) <= clock) return 'The end time has already passed';
    if (!precautions.length) return 'Add the precautions that apply';
    const unanswered = precautions.filter((p) => p.state === '').length;
    if (unanswered) return `${unanswered} ${unanswered === 1 ? 'precaution is' : 'precautions are'} not answered yet`;
    const no = precautions.filter((p) => p.state === 'no').length;
    if (no) return `${no} ${no === 1 ? 'precaution is' : 'precautions are'} marked No. Put them right first, or mark N/A if they do not apply.`;
    return null;
  };

  const submitMode = () => {
    const result = mode === 'close'
      ? closePermit(data, { by, areaSafe: safe, note }, clock)
      : cancelPermit(data, { by, note }, clock);
    if (result.error) { setError(result.error); return; }
    onChange(result.patch);
    resetAction();
  };

  const text = (key, label, placeholder) => (
    <Field label={label}>
      {canEdit ? <CommitField value={data[key]} onCommit={(v) => onChange({ [key]: v })} placeholder={placeholder} className={`${smallField} border-line`} aria-label={label} />
        : <div className="truncate py-1 text-xs font-semibold text-ink">{data[key] || '—'}</div>}
    </Field>
  );
  const when = (key, label) => (
    <Field label={label}>
      {canEdit ? <CommitField type="datetime-local" value={data[key]} onCommit={(v) => onChange({ [key]: v })} className={`${smallField} border-line`} aria-label={label} />
        : <div className="py-1 text-xs font-semibold text-ink">{data[key] ? stamp(data[key]) : '—'}</div>}
    </Field>
  );
  const issuedByText = issuer.name ? `${issuer.name}${issuer.role ? ` (${ROLE_LABEL[issuer.role] || issuer.role})` : ''}` : '—';
  const finished = status === 'closed' || status === 'cancelled';

  return (
    <Shell className="w-[460px]">
      <div className="flex items-start justify-between gap-2">
        <Label>{data.label}</Label>
        <span className="mb-2" data-permit-state={state}><Chip tone={PERMIT_TONE[state]}>{PERMIT_WORD[state]}</Chip></span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Type of work">
          {canEdit ? (
            <select value={data.type} onChange={(e) => changeType(e.target.value)} aria-label="Type of permit" className={`${selectSmall} w-full`}>
              {Object.keys(PERMIT_TYPES).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : <div className="py-1 text-xs font-semibold text-ink">{data.type || '—'}</div>}
        </Field>
        {text('location', 'Location', 'Terrace, Block B')}
        <div className="col-span-2">{text('work', 'Work to be done', 'Welding of railing brackets')}</div>
        {when('validFrom', 'Valid from')}
        {when('validTo', 'Valid until')}
        <Field label="Issued by">
          <div className="truncate py-1 text-xs font-semibold text-ink" data-issued-by>{issuedByText}</div>
        </Field>
        <Field label="Approved by">
          <div className="truncate py-1 text-xs font-semibold text-ink" data-approved-by>
            {data.approvedBy?.name ? clientSafeName(data.approvedBy.name, data.approvalChain) : '—'}
          </div>
        </Field>
      </div>
      {data.validFrom && data.validTo && !w.valid ? <div role="alert" className="mt-1 text-xs text-danger">The end time must be after the start time</div> : null}
      {w.valid && w.tooLong ? <div role="status" className="mt-1 text-xs text-warning">This permit runs {w.hours} hours. Most sites limit a permit to a shift.</div> : null}

      <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-dim">Precautions</div>
      {precautions.length ? (
        <ul className="m-0 mt-1 space-y-1 p-0">
          {precautions.map((p) => (
            <li key={p.id} className="flex list-none items-center gap-2" data-precaution-state={p.state || 'unanswered'}>
              <span className="min-w-0 flex-1 text-xs text-ink">{p.text}</span>
              {canEdit ? (
                <div role="group" aria-label={`Answer for ${p.text}`} className="flex rounded-md border border-line p-0.5">
                  {[['yes', 'Yes'], ['no', 'No'], ['na', 'N/A']].map(([value, label2]) => (
                    <button key={value} type="button" aria-pressed={p.state === value} onClick={() => setPrecaution(p.id, value)}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-info ${p.state === value ? (value === 'no' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success') : 'text-dim hover:text-ink'}`}>{label2}</button>
                  ))}
                </div>
              ) : <Chip tone={p.state === 'yes' ? 'success' : p.state === 'no' ? 'danger' : 'neutral'}>{p.state === 'na' ? 'N/A' : p.state === 'yes' ? 'Yes' : p.state === 'no' ? 'No' : '—'}</Chip>}
            </li>
          ))}
        </ul>
      ) : <div className="mt-1"><EmptyNote>Choose a type of work to load its usual precautions</EmptyNote></div>}
      {canEdit && !precautions.length ? (
        <button type="button" onClick={() => onChange({ precautions: applyPermitPreset([], data.type) })} className={`${smallButton} mt-2`}>Load precautions for {data.type}</button>
      ) : null}

      <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs" data-permit-footer>
        {!finished ? (
          <ApprovalPanel
            kind="permit"
            id={id}
            data={data}
            editable={editable}
            viewer={viewerProp}
            collaborators={collaborators}
            decide={decide}
            notify={notify}
            onServerPatch={onServerPatch || onChange}
            validate={validate}
            getContent={() => ({
              type: data.type, location: data.location, work: data.work, validFrom: data.validFrom, validTo: data.validTo, precautions,
            })}
            what={`the permit: ${where || 'permit to work'}`}
            place={place}
            locked={status === 'issued'}
          />
        ) : null}

        {status === 'issued' && editable && !mode ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => { setMode('close'); setError(''); }} className={primaryButton}>Close permit</button>
            <button type="button" onClick={() => { setMode('cancel'); setError(''); }} className={smallButton}>Cancel permit</button>
          </div>
        ) : null}
        {(status === 'requested' || status === 'declined') && editable && !mode ? (
          <button type="button" onClick={() => { setMode('cancel'); setError(''); }} className={smallButton}>Cancel permit</button>
        ) : null}

        {mode ? (
          <div className="space-y-2">
            <label className="block text-dim">{mode === 'close' ? 'Closed by (name)' : 'Cancelled by (name)'}
              <input value={by} onChange={(e) => setBy(e.target.value)} className="nodrag mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info" />
            </label>
            {mode === 'close' ? (
              <label className="flex items-center gap-2 text-ink">
                <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="nodrag h-4 w-4" />
                The area has been made safe
              </label>
            ) : null}
            <label className="block text-dim">{mode === 'close' ? 'Note (optional)' : 'Why is it cancelled?'}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="nodrag mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={submitMode} className={primaryButton}>
                {mode === 'close' ? 'Confirm close' : 'Confirm cancel'}
              </button>
              <button type="button" onClick={resetAction} className={smallButton}>Back</button>
            </div>
          </div>
        ) : null}

        {finished ? (
          <div>
            <span className="font-medium text-ink">{status === 'closed' ? 'Closed' : 'Cancelled'}</span>
            {closure.by ? <span className="text-ink"> by {clientSafeName(closure.by, data.approvalChain)}</span> : null}
            {closure.at ? <span className="text-dim"> · {stamp(closure.at)}</span> : null}
            {status === 'closed' && closure.areaSafe ? <div className="mt-1 text-success">Area made safe</div> : null}
            {closure.note ? <div className="mt-1 text-ink">{closure.note}</div> : null}
            {data.approvedBy?.name ? <div className="mt-1 text-dim">Approved by {clientSafeName(data.approvedBy.name, data.approvalChain)}{data.approvedAt ? ` · ${stamp(data.approvedAt)}` : ''}</div> : null}
          </div>
        ) : null}
        {error ? <div role="alert" className="text-danger">{error}</div> : null}
      </div>
    </Shell>
  );
};
