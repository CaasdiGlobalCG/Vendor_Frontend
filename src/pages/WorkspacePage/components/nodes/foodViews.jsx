import React, { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Plus, ShieldAlert, Thermometer, Trash2 } from 'lucide-react';
import { Label, Shell } from './blockInputViews';
import { CommitField } from './blockControls';
import { primaryButton, smallButton, smallField } from './printingViews';
import ApprovalPanel from './ApprovalPanel';
import { chainFor, clientSafeName, describeChain } from '../../utils/approvalRouting';
import { TONE_CLASSES, parseDay } from '../../utils/blockElements';
import { newId } from '../../utils/printingElements';
import {
  BATCH_UNITS,
  EXPIRY_TONES,
  FOOD_LIMITS,
  LICENCE_TYPES,
  addReading,
  decideBatchQc,
  describeDaysLeft,
  describeLicence,
  dispatchedVsProduced,
  reopenBatchQc,
  sanitizeDispatches,
  sanitizeIngredients,
  sanitizeLicences,
  sanitizeQc,
  sanitizeReadings,
  sanitizeShelfItems,
  sanitizeTraceInputs,
  shelfLifeInfo,
  shelfSummary,
  sortByExpiry,
  tempRange,
  tempStatus,
  tempSummary,
  traceReport,
  warnWindow,
  yieldPercent,
  yieldTone,
} from '../../utils/foodElements';

/** Visual parts of the batch record, expiry tracker, temperature log, licence tracker and recall trace blocks. */

const Chip = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[tone].chip} ${className}`}>
    {children}
  </span>
);

const selectSmall =
  'nodrag rounded border border-line bg-surface px-1 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info';

const dateText = (value) => {
  const d = parseDay(value);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};
const stamp = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
};

const Summary = ({ children }) => <div className="mb-2 flex flex-wrap items-center gap-1.5">{children}</div>;

const EmptyNote = ({ children }) => (
  <div className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-xs text-dim">{children}</div>
);

// ---- Batch record --------------------------------------------------------

export const BatchBlock = ({ id, data, editable, onChange, viewer, collaborators, decide, notify, onServerPatch }) => {
  const qc = sanitizeQc(data.qc);
  const chain = chainFor(data);
  // Locked while with an approver and once approved. A batch signed off before approvals were
  // routed keeps its decision and is read-only.
  const legacyDecided = !chain && qc.status !== 'pending';
  const locked = (chain && ['pending', 'approved'].includes(chain.state)) || legacyDecided;
  const canEdit = editable && !locked;
  const ingredients = useMemo(() => sanitizeIngredients(data.ingredients), [data.ingredients]);
  const percent = yieldPercent(data.actualQty, data.plannedQty);
  const target = Number(data.yieldTarget) || 95;
  const tone = yieldTone(percent, target);
  const unit = BATCH_UNITS.includes(data.unit) ? data.unit : 'kg';
  const headline = chain
    ? describeChain(chain)
    : { tone: qc.status === 'passed' ? 'success' : qc.status === 'failed' ? 'danger' : 'neutral', text: qc.status === 'passed' ? 'QC passed' : qc.status === 'failed' ? 'QC failed' : 'QC not signed off' };

  const updateIngredient = (id, changes) =>
    onChange({ ingredients: ingredients.map((x) => (x.id === id ? { ...x, ...changes } : x)) });

  return (
    <Shell className="w-[460px]">
      <div className="flex items-start justify-between gap-2">
        <Label>{data.label}</Label>
        {!chain ? <Chip tone={headline.tone}>{headline.text}</Chip> : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[['product', 'Product', 'Mango pickle 400 g'], ['batchNo', 'Batch no.', 'MP-2610-01']].map(([key, label, ph]) => (
          <label key={key} className="block min-w-0 text-[11px] text-dim">
            {label}
            {canEdit ? (
              <CommitField value={data[key]} onCommit={(v) => onChange({ [key]: v })} placeholder={ph} className={`${smallField} border-line`} aria-label={label} />
            ) : (
              <div className="truncate py-1 text-xs font-semibold text-ink">{data[key] || '—'}</div>
            )}
          </label>
        ))}
        <label className="block min-w-0 text-[11px] text-dim">
          Date
          {canEdit ? (
            <CommitField type="date" value={data.date} onCommit={(v) => onChange({ date: v })} className={`${smallField} border-line`} aria-label="Batch date" />
          ) : (
            <div className="py-1 text-xs font-semibold text-ink">{dateText(data.date) || '—'}</div>
          )}
        </label>
      </div>

      <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-dim">Ingredients</div>
      {ingredients.length ? (
        <div className="mt-1 space-y-1" role="list" aria-label="Ingredients">
          <div className="grid grid-cols-[1.6fr_1fr_0.7fr_0.7fr_20px] gap-1 text-[10px] uppercase tracking-wide text-dim">
            <span>Ingredient</span><span>Lot</span><span>Qty</span><span>Unit</span><span />
          </div>
          {ingredients.map((x) => (
            <div key={x.id} role="listitem" className="grid grid-cols-[1.6fr_1fr_0.7fr_0.7fr_20px] items-center gap-1">
              {canEdit ? (
                <>
                  <CommitField value={x.name} onCommit={(v) => updateIngredient(x.id, { name: v })} placeholder="Name" className={smallField} aria-label="Ingredient name" />
                  <CommitField value={x.lot} onCommit={(v) => updateIngredient(x.id, { lot: v })} placeholder="Lot" className={smallField} aria-label="Lot number" />
                  <CommitField value={x.qty} onCommit={(v) => updateIngredient(x.id, { qty: v })} inputMode="decimal" placeholder="0" className={smallField} aria-label="Quantity" />
                  <select value={x.unit} onChange={(e) => updateIngredient(x.id, { unit: e.target.value })} aria-label="Unit" className={selectSmall}>
                    {BATCH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button type="button" onClick={() => onChange({ ingredients: ingredients.filter((i) => i.id !== x.id) })} aria-label={`Remove ${x.name || 'ingredient'}`} className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="truncate text-xs text-ink">{x.name || '—'}</span>
                  <span className="truncate text-xs tabular-nums text-dim">{x.lot || '—'}</span>
                  <span className="text-xs tabular-nums text-ink">{x.qty || '—'}</span>
                  <span className="text-xs text-dim">{x.unit}</span>
                  <span />
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1"><EmptyNote>No ingredients recorded</EmptyNote></div>
      )}
      {canEdit ? (
        <button
          type="button"
          disabled={ingredients.length >= FOOD_LIMITS.ingredients}
          onClick={() => onChange({ ingredients: [...ingredients, { id: newId('ing'), name: '', lot: '', qty: '', unit }] })}
          className={`${smallButton} mt-2`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add ingredient
        </button>
      ) : null}

      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2 border-t border-line pt-3">
        <label className="block text-[11px] text-dim">
          Planned output
          {canEdit ? (
            <CommitField value={data.plannedQty} onCommit={(v) => onChange({ plannedQty: v })} inputMode="decimal" className={`${smallField} border-line`} aria-label="Planned output" />
          ) : <div className="py-1 text-xs font-semibold tabular-nums text-ink">{data.plannedQty || '—'} {unit}</div>}
        </label>
        <label className="block text-[11px] text-dim">
          Actual output
          {canEdit ? (
            <CommitField value={data.actualQty} onCommit={(v) => onChange({ actualQty: v })} inputMode="decimal" className={`${smallField} border-line`} aria-label="Actual output" />
          ) : <div className="py-1 text-xs font-semibold tabular-nums text-ink">{data.actualQty || '—'} {unit}</div>}
        </label>
        <div className="pb-1 text-right">
          <div className="text-[11px] text-dim">Yield</div>
          <Chip tone={tone}>{percent === null ? '—' : `${percent}%`}</Chip>
        </div>
      </div>
      {percent !== null && tone !== 'success' ? (
        <div className="mt-1 text-[11px] text-dim">Target is {target}%.</div>
      ) : null}

      <div className="mt-3 border-t border-line pt-3">
        {legacyDecided ? (
          <div className="text-xs" data-legacy-qc>
            <span className="font-medium text-ink">{clientSafeName(qc.by, data.approvalChain) || (qc.status === 'passed' ? 'Passed' : 'Failed')}</span>
            {qc.at ? <span className="text-dim"> · {stamp(qc.at)}</span> : null}
            {qc.note ? <div className="mt-1 text-ink">{qc.note}</div> : null}
          </div>
        ) : (
          <ApprovalPanel
            kind="batch"
            id={id}
            data={data}
            editable={editable}
            viewer={viewer}
            collaborators={collaborators}
            decide={decide}
            notify={notify}
            onServerPatch={onServerPatch || onChange}
            validate={() => (String(data.batchNo || '').trim() ? null : 'Add the batch number before sending for approval')}
            getContent={() => ({
              product: data.product, batchNo: data.batchNo, date: data.date, plannedQty: data.plannedQty,
              actualQty: data.actualQty, unit: data.unit, ingredients,
            })}
            what={`the batch record${data.batchNo ? ` ${data.batchNo}` : ''}`}
            sendLabel="Send for QC approval"
          />
        )}
      </div>
    </Shell>
  );
};

// ---- Expiry & shelf life -------------------------------------------------

export const ShelfLifeBlock = ({ data, editable, onChange, now }) => {
  const today = now || new Date();
  const warn = warnWindow(data.warnDays, 30);
  const items = useMemo(() => sanitizeShelfItems(data.items), [data.items]);
  const counts = shelfSummary(items, today, warn);
  const shown = useMemo(() => sortByExpiry(items), [items]);
  const update = (id, changes) => onChange({ items: items.map((x) => (x.id === id ? { ...x, ...changes } : x)) });

  return (
    <Shell className="w-[460px]">
      <Label>{data.label}</Label>
      {items.length ? (
        <Summary>
          {counts.expired ? <Chip tone="danger">{counts.expired} expired</Chip> : null}
          {counts.expiring ? <Chip tone="warning">{counts.expiring} expiring within {warn} days</Chip> : null}
          {counts.ok ? <Chip tone="success">{counts.ok} in date</Chip> : null}
          {counts.unknown ? <Chip>{counts.unknown} without a date</Chip> : null}
        </Summary>
      ) : null}

      {shown.length ? (
        <ul className="m-0 space-y-2 p-0">
          {shown.map((x) => {
            const info = shelfLifeInfo(x.mfg, x.expiry, today, warn);
            const tone = EXPIRY_TONES[info.state];
            return (
              <li key={x.id} className="list-none rounded-lg border border-line p-2" data-expiry-state={info.state}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {editable ? (
                      <div className="grid grid-cols-2 gap-1">
                        <CommitField value={x.item} onCommit={(v) => update(x.id, { item: v })} placeholder="Item" className={`${smallField} font-semibold`} aria-label="Item" />
                        <CommitField value={x.batch} onCommit={(v) => update(x.id, { batch: v })} placeholder="Batch" className={smallField} aria-label="Batch" />
                      </div>
                    ) : (
                      <div className="truncate text-sm font-semibold text-ink">
                        {x.item || 'Unnamed item'}{x.batch ? <span className="font-normal text-dim"> · {x.batch}</span> : null}
                      </div>
                    )}
                  </div>
                  <Chip tone={tone}>{describeDaysLeft(info.daysLeft)}</Chip>
                </div>
                {editable ? (
                  <div className="mt-1 flex items-center gap-1">
                    <label className="flex-1 text-[10px] uppercase tracking-wide text-dim">Made
                      <CommitField type="date" value={x.mfg} onCommit={(v) => update(x.id, { mfg: v })} className={`${smallField} border-line`} aria-label="Manufactured on" />
                    </label>
                    <label className="flex-1 text-[10px] uppercase tracking-wide text-dim">Expires
                      <CommitField type="date" value={x.expiry} onCommit={(v) => update(x.id, { expiry: v })} className={`${smallField} border-line`} aria-label="Expires on" />
                    </label>
                    <button type="button" onClick={() => onChange({ items: items.filter((i) => i.id !== x.id) })} aria-label={`Remove ${x.item || 'item'}`} className="nodrag mt-3 rounded p-1 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-dim">
                    {x.mfg ? `Made ${dateText(x.mfg)} · ` : ''}{x.expiry ? `Expires ${dateText(x.expiry)}` : 'No expiry date'}
                  </div>
                )}
                {info.datesReversed ? <div role="alert" className="mt-1 text-[11px] text-danger">Expiry is not after the manufacture date</div> : null}
                {info.lifeUsed !== null ? (
                  <div
                    role="progressbar"
                    aria-label="Shelf life used"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={info.lifeUsed}
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-hover"
                  >
                    <div className={`h-full rounded-full ${TONE_CLASSES[tone].bar}`} style={{ width: `${info.lifeUsed}%` }} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyNote>No items yet</EmptyNote>
      )}
      {editable ? (
        <button
          type="button"
          disabled={items.length >= FOOD_LIMITS.shelfItems}
          onClick={() => onChange({ items: [...items, { id: newId('sl'), item: '', batch: '', mfg: '', expiry: '' }] })}
          className={`${smallButton} mt-2`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add item
        </button>
      ) : null}
    </Shell>
  );
};

// ---- Temperature log -----------------------------------------------------

const TEMP_TONE = { ok: 'success', low: 'info', high: 'danger', invalid: 'neutral' };
const TEMP_WORD = { ok: 'In range', low: 'Too cold', high: 'Too warm', invalid: '—' };

const TempChart = ({ readings, range }) => {
  const list = readings.slice(-30);
  if (list.length < 2 || !range) return null;
  const W = 400;
  const H = 70;
  const values = list.map((r) => r.value);
  const lo = Math.min(range.min, ...values);
  const hi = Math.max(range.max, ...values);
  const span = hi - lo || 1;
  const y = (v) => H - 6 - ((v - lo) / span) * (H - 12);
  const x = (i) => 6 + (i / (list.length - 1)) * (W - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full" role="img" aria-label="Temperature trend with the allowed range shaded">
      <rect x="0" y={y(range.max)} width={W} height={Math.max(2, y(range.min) - y(range.max))} fill="rgb(var(--status-success) / 0.12)" />
      <polyline points={list.map((r, i) => `${x(i)},${y(r.value)}`).join(' ')} fill="none" stroke="rgb(var(--text-muted))" strokeWidth="1.5" strokeLinejoin="round" />
      {list.map((r, i) => (
        <circle key={r.id} cx={x(i)} cy={y(r.value)} r="3"
          fill={['low', 'high'].includes(tempStatus(r.value, range.min, range.max)) ? 'rgb(var(--status-danger))' : 'rgb(var(--status-success))'} />
      ))}
    </svg>
  );
};

export const TempLogBlock = ({ data, editable, onChange }) => {
  const readings = useMemo(() => sanitizeReadings(data.readings), [data.readings]);
  const range = tempRange(data.min, data.max);
  const unit = data.unit || '°C';
  const summary = tempSummary(readings, data.min, data.max);
  const [value, setValue] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const log = () => {
    const result = addReading(readings, { value, at: time ? new Date(time).toISOString() : undefined, note });
    if (result.error) { setError(result.error); return; }
    setError('');
    onChange({ readings: result.readings });
    setValue(''); setTime(''); setNote('');
  };

  const rows = [...readings].reverse();
  const visible = showAll ? rows : rows.slice(0, 6);
  const lastStatus = summary.last ? tempStatus(summary.last.value, data.min, data.max) : null;

  return (
    <Shell className="w-[440px]">
      <Label icon={Thermometer}>{data.label}</Label>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-semibold text-ink">{data.location || 'Location not set'}</div>
        <div className="shrink-0 text-xs tabular-nums text-dim">
          {range ? `Allowed ${range.min} to ${range.max} ${unit}` : 'Set a valid allowed range in the settings'}
        </div>
      </div>

      {summary.last ? (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-3xl font-semibold tabular-nums text-ink">{summary.last.value}<span className="ml-0.5 text-base text-dim">{unit}</span></span>
          <Chip tone={TEMP_TONE[lastStatus]}>{TEMP_WORD[lastStatus]}</Chip>
          <span className="text-[11px] text-dim">{stamp(summary.last.at)}</span>
        </div>
      ) : <div className="mt-2"><EmptyNote>No readings yet</EmptyNote></div>}

      {summary.count ? (
        <Summary>
          <Chip>{summary.count} {summary.count === 1 ? 'reading' : 'readings'}</Chip>
          <Chip tone={summary.outOfRange ? 'danger' : 'success'}>
            {summary.outOfRange ? `${summary.outOfRange} out of range` : 'All in range'}
          </Chip>
          <Chip>Low {summary.lowest} · High {summary.highest} {unit}</Chip>
        </Summary>
      ) : null}
      <TempChart readings={readings} range={range} />

      {editable ? (
        <div className="mt-3 rounded-lg border border-line p-2">
          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            <label className="block text-[10px] uppercase tracking-wide text-dim">Reading ({unit})
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" aria-label="Temperature reading" placeholder="4.5" className="nodrag mt-0.5 w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info" />
            </label>
            <label className="block text-[10px] uppercase tracking-wide text-dim">Time (blank = now)
              <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Reading time" className="nodrag mt-0.5 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info" />
            </label>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (door open, defrost …)" aria-label="Reading note" className="nodrag mt-2 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info" />
          <button type="button" onClick={log} className={`${primaryButton} mt-2`}>Log reading</button>
          {error ? <div role="alert" className="mt-1 text-xs text-danger">{error}</div> : null}
        </div>
      ) : null}

      {rows.length ? (
        <>
          <ul className="m-0 mt-3 space-y-1 p-0" aria-label="Readings">
            {visible.map((r) => {
              const st = tempStatus(r.value, data.min, data.max);
              return (
                <li key={r.id} className="flex list-none items-center gap-2 text-xs" data-temp-status={st}>
                  <span className="w-24 shrink-0 tabular-nums text-dim">{stamp(r.at)}</span>
                  <span className="w-14 shrink-0 font-semibold tabular-nums text-ink">{r.value} {unit}</span>
                  <Chip tone={TEMP_TONE[st]}>{TEMP_WORD[st]}</Chip>
                  <span className="min-w-0 flex-1 truncate text-dim">{r.note}</span>
                  {editable ? (
                    <button type="button" onClick={() => onChange({ readings: readings.filter((x) => x.id !== r.id) })} aria-label="Remove reading" className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {rows.length > 6 ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className={`${smallButton} mt-2`}>
              {showAll ? 'Show fewer' : `Show all ${rows.length}`}
            </button>
          ) : null}
        </>
      ) : null}
    </Shell>
  );
};

// ---- Licence tracker -----------------------------------------------------

export const LicenceBlock = ({ data, editable, onChange, now }) => {
  const today = now || new Date();
  const warn = warnWindow(data.warnDays, 60);
  const items = useMemo(() => sanitizeLicences(data.items), [data.items]);
  const listId = `licence-types-${items.length}`;
  const update = (id, changes) => onChange({ items: items.map((x) => (x.id === id ? { ...x, ...changes } : x)) });
  const counts = items.reduce((acc, l) => { acc[describeLicence(l.expiry, today, warn).state] += 1; return acc; }, { ok: 0, expiring: 0, expired: 0, unknown: 0 });

  return (
    <Shell className="w-[460px]">
      <Label>{data.label}</Label>
      {items.length ? (
        <Summary>
          {counts.expired ? <Chip tone="danger">{counts.expired} expired</Chip> : null}
          {counts.expiring ? <Chip tone="warning">{counts.expiring} to renew within {warn} days</Chip> : null}
          {counts.ok ? <Chip tone="success">{counts.ok} valid</Chip> : null}
          {counts.unknown ? <Chip>{counts.unknown} without an expiry</Chip> : null}
        </Summary>
      ) : null}
      <datalist id={listId}>{LICENCE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>

      {items.length ? (
        <ul className="m-0 space-y-2 p-0">
          {items.map((l) => {
            const d = describeLicence(l.expiry, today, warn);
            return (
              <li key={l.id} className="list-none rounded-lg border border-line p-2" data-licence-state={d.state}>
                <div className="flex items-start justify-between gap-2">
                  {editable ? (
                    <CommitField value={l.name} onCommit={(v) => update(l.id, { name: v })} list={listId} placeholder="Licence type" className={`${smallField} font-semibold`} aria-label="Licence type" />
                  ) : (
                    <div className="min-w-0 truncate text-sm font-semibold text-ink">{l.name || 'Licence'}</div>
                  )}
                  <Chip tone={EXPIRY_TONES[d.state]} className="shrink-0">{d.text}</Chip>
                </div>
                {editable ? (
                  <>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      <CommitField value={l.number} onCommit={(v) => update(l.id, { number: v })} placeholder="Licence number" className={`${smallField} border-line`} aria-label="Licence number" />
                      <CommitField value={l.authority} onCommit={(v) => update(l.id, { authority: v })} placeholder="Issuing authority" className={`${smallField} border-line`} aria-label="Issuing authority" />
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <label className="flex-1 text-[10px] uppercase tracking-wide text-dim">Issued
                        <CommitField type="date" value={l.issued} onCommit={(v) => update(l.id, { issued: v })} className={`${smallField} border-line`} aria-label="Issued on" />
                      </label>
                      <label className="flex-1 text-[10px] uppercase tracking-wide text-dim">Expires
                        <CommitField type="date" value={l.expiry} onCommit={(v) => update(l.id, { expiry: v })} className={`${smallField} border-line`} aria-label="Licence expires on" />
                      </label>
                      <button type="button" onClick={() => onChange({ items: items.filter((i) => i.id !== l.id) })} aria-label={`Remove ${l.name || 'licence'}`} className="nodrag mt-3 rounded p-1 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <dl className="m-0 mt-1 space-y-0.5 text-[11px]">
                    {l.number ? <div className="flex justify-between"><dt className="text-dim">Number</dt><dd className="m-0 tabular-nums text-ink">{l.number}</dd></div> : null}
                    {l.authority ? <div className="flex justify-between"><dt className="text-dim">Authority</dt><dd className="m-0 text-ink">{l.authority}</dd></div> : null}
                    {l.expiry ? <div className="flex justify-between"><dt className="text-dim">Expires</dt><dd className="m-0 text-ink">{dateText(l.expiry)}</dd></div> : null}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      ) : <EmptyNote>No licences yet</EmptyNote>}
      {editable ? (
        <button
          type="button"
          disabled={items.length >= FOOD_LIMITS.licences}
          onClick={() => onChange({ items: [...items, { id: newId('lic'), name: '', number: '', authority: '', issued: '', expiry: '' }] })}
          className={`${smallButton} mt-2`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add licence
        </button>
      ) : null}
    </Shell>
  );
};

// ---- Recall trace --------------------------------------------------------

const TraceRows = ({ rows, columns, editable, onUpdate, onRemove, empty }) =>
  rows.length ? (
    <div className="mt-1 space-y-1" role="list">
      <div className="grid gap-1 text-[10px] uppercase tracking-wide text-dim" style={{ gridTemplateColumns: columns.template }}>
        {columns.fields.map((f) => <span key={f.key}>{f.label}</span>)}<span />
      </div>
      {rows.map((r) => (
        <div key={r.id} role="listitem" className="grid items-center gap-1" style={{ gridTemplateColumns: columns.template }}>
          {columns.fields.map((f) =>
            editable ? (
              f.key === 'unit' ? (
                <select key={f.key} value={r.unit} onChange={(e) => onUpdate(r.id, { unit: e.target.value })} aria-label={f.label} className={selectSmall}>
                  {BATCH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              ) : (
                <CommitField key={f.key} type={f.type} value={r[f.key]} onCommit={(v) => onUpdate(r.id, { [f.key]: v })} placeholder={f.label} inputMode={f.key === 'qty' ? 'decimal' : undefined} className={smallField} aria-label={f.label} />
              )
            ) : (
              <span key={f.key} className="truncate text-xs text-ink">{f.type === 'date' ? dateText(r[f.key]) || '—' : r[f.key] || '—'}</span>
            )
          )}
          {editable ? (
            <button type="button" onClick={() => onRemove(r.id)} aria-label="Remove row" className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : <span />}
        </div>
      ))}
    </div>
  ) : <div className="mt-1"><EmptyNote>{empty}</EmptyNote></div>;

const INPUT_COLUMNS = {
  template: '1.4fr 1.2fr 1fr 0.7fr 0.7fr 20px',
  fields: [
    { key: 'material', label: 'Material' }, { key: 'supplier', label: 'Supplier' }, { key: 'lot', label: 'Lot' },
    { key: 'qty', label: 'Qty' }, { key: 'unit', label: 'Unit' },
  ],
};
const DISPATCH_COLUMNS = {
  template: '1.3fr 1fr 1fr 0.9fr 0.7fr 0.7fr 20px',
  fields: [
    { key: 'customer', label: 'Customer' }, { key: 'location', label: 'Location' }, { key: 'date', label: 'Date', type: 'date' },
    { key: 'invoice', label: 'Invoice' }, { key: 'qty', label: 'Qty' }, { key: 'unit', label: 'Unit' },
  ],
};

export const RecallBlock = ({ data, editable, onChange }) => {
  const inputs = useMemo(() => sanitizeTraceInputs(data.inputs), [data.inputs]);
  const dispatches = useMemo(() => sanitizeDispatches(data.dispatches), [data.dispatches]);
  const unit = BATCH_UNITS.includes(data.unit) ? data.unit : 'kg';
  const totals = dispatchedVsProduced(dispatches, data.producedQty, unit);
  const [copied, setCopied] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(traceReport(data));
      setCopied('Copied to the clipboard');
    } catch {
      setCopied('Could not copy. Select the rows and copy them by hand.');
    }
  };

  return (
    <Shell className="w-[480px]">
      <div className="flex items-start justify-between gap-2">
        <Label>{data.label}</Label>
        <button type="button" onClick={copy} className={`${smallButton} -mt-0.5 shrink-0`}>
          <Copy className="h-3 w-3" aria-hidden="true" /> Copy trace
        </button>
      </div>
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        {[['product', 'Product', ''], ['batchNo', 'Batch no.', '']].map(([key, label]) => (
          <label key={key} className="block min-w-0 text-[11px] text-dim">{label}
            {editable ? <CommitField value={data[key]} onCommit={(v) => onChange({ [key]: v })} className={`${smallField} border-line`} aria-label={label} />
              : <div className="truncate py-1 text-xs font-semibold text-ink">{data[key] || '—'}</div>}
          </label>
        ))}
        <label className="block min-w-0 text-[11px] text-dim">Produced
          {editable ? (
            <div className="flex gap-1">
              <CommitField value={data.producedQty} onCommit={(v) => onChange({ producedQty: v })} inputMode="decimal" className={`${smallField} border-line`} aria-label="Produced quantity" />
              <select value={unit} onChange={(e) => onChange({ unit: e.target.value })} aria-label="Produced unit" className={selectSmall}>
                {BATCH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          ) : <div className="py-1 text-xs font-semibold tabular-nums text-ink">{data.producedQty ? `${data.producedQty} ${unit}` : '—'}</div>}
        </label>
      </div>

      {totals.produced !== null || dispatches.length ? (
        <Summary>
          <Chip>{totals.customers} {totals.customers === 1 ? 'customer' : 'customers'}</Chip>
          <Chip>{dispatches.length} {dispatches.length === 1 ? 'dispatch' : 'dispatches'}</Chip>
          {totals.produced !== null ? (
            <Chip tone={totals.percent !== null && totals.percent > 100 ? 'danger' : 'info'}>
              {totals.dispatched} of {totals.produced} {unit} dispatched ({totals.percent}%)
            </Chip>
          ) : null}
          {totals.percent !== null && totals.percent > 100 ? <Chip tone="danger">More dispatched than produced</Chip> : null}
          {totals.otherUnits ? <Chip tone="warning">{totals.otherUnits} rows in other units are not added</Chip> : null}
        </Summary>
      ) : null}

      <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-dim">Raw materials used</div>
      <TraceRows
        rows={inputs}
        columns={INPUT_COLUMNS}
        editable={editable}
        empty="No raw materials listed"
        onUpdate={(id, changes) => onChange({ inputs: inputs.map((x) => (x.id === id ? { ...x, ...changes } : x)) })}
        onRemove={(id) => onChange({ inputs: inputs.filter((x) => x.id !== id) })}
      />
      {editable ? (
        <button type="button" disabled={inputs.length >= FOOD_LIMITS.traceRows} onClick={() => onChange({ inputs: [...inputs, { id: newId('in'), material: '', supplier: '', lot: '', qty: '', unit: 'kg' }] })} className={`${smallButton} mt-1`}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add material
        </button>
      ) : null}

      <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-dim">Dispatched to</div>
      <TraceRows
        rows={dispatches}
        columns={DISPATCH_COLUMNS}
        editable={editable}
        empty="No dispatches listed"
        onUpdate={(id, changes) => onChange({ dispatches: dispatches.map((x) => (x.id === id ? { ...x, ...changes } : x)) })}
        onRemove={(id) => onChange({ dispatches: dispatches.filter((x) => x.id !== id) })}
      />
      {editable ? (
        <button type="button" disabled={dispatches.length >= FOOD_LIMITS.traceRows} onClick={() => onChange({ dispatches: [...dispatches, { id: newId('dp'), customer: '', location: '', date: '', invoice: '', qty: '', unit }] })} className={`${smallButton} mt-1`}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add dispatch
        </button>
      ) : null}
      {copied ? <div role="status" className="mt-2 text-xs text-dim">{copied}</div> : null}
    </Shell>
  );
};
