import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, ImagePlus, Loader2, Palette, Plus, Trash2, Upload } from 'lucide-react';
import { Label, Shell, uploadWorkspaceImage } from './blockInputViews';
import { CommitField } from './blockControls';
import { ErrorLine, primaryButton, smallButton, smallField, useImagePicker } from './printingViews';
import ApprovalPanel from './ApprovalPanel';
import { chainFor, clientSafeName, describeChain } from '../../utils/approvalRouting';
import { TONE_CLASSES } from '../../utils/blockElements';
import { newId, normalizeHex, readableOn } from '../../utils/printingElements';
import {
  FURNITURE_UNITS,
  INTERIOR_LIMITS,
  MOOD_TILE,
  OPENING_TYPES,
  SCOPE_STATUSES,
  addMoodItem,
  clampMoodPosition,
  cleanQuantity,
  codeUsage,
  decideApproval,
  formatFurnitureSize,
  getScopeStatus,
  measureTotals,
  measureUnit,
  moveMoodItem,
  reopenApproval,
  roomProgress,
  sanitizeApproval,
  sanitizeMoodItems,
  sanitizeOpenings,
  sanitizeRooms,
  sanitizeSchedule,
  sanitizeWalls,
  scopeProgress,
} from '../../utils/interiorElements';

/** Visual parts of the scope sheet, finish schedule, furniture spec, moodboard and site measurement blocks. */

const Chip = ({ tone = 'neutral', children }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[tone].chip}`}>{children}</span>
);
const selectSmall =
  'nodrag rounded border border-line bg-surface px-1 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info';
const bar = (percent, tone = 'success') => (
  <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
    <div className={`h-full rounded-full ${TONE_CLASSES[tone].bar}`} style={{ width: `${percent}%` }} />
  </div>
);
const stamp = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
};
const EmptyNote = ({ children }) => (
  <div className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-xs text-dim">{children}</div>
);

// ---- Room-wise scope sheet ----------------------------------------------

export const ScopeBlock = ({ data, editable, onChange }) => {
  const rooms = useMemo(() => sanitizeRooms(data.rooms), [data.rooms]);
  const overall = scopeProgress(rooms);
  const [collapsed, setCollapsed] = useState({});
  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const updateRoom = (roomId, changes) => onChange({ rooms: rooms.map((r) => (r.id === roomId ? { ...r, ...changes } : r)) });
  const updateItem = (roomId, itemId, changes) =>
    onChange({
      rooms: rooms.map((r) =>
        r.id === roomId ? { ...r, items: r.items.map((i) => (i.id === itemId ? { ...i, ...changes } : i)) } : r
      ),
    });

  return (
    <Shell className="w-[460px]">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{data.label}</Label>
        {overall.total ? <span className="mb-2 text-[11px] tabular-nums text-dim">{overall.done} of {overall.total} done · {overall.percent}%</span> : null}
      </div>
      {overall.total ? <div className="mb-3">{bar(overall.percent, overall.percent === 100 ? 'success' : 'info')}</div> : null}

      {rooms.length ? (
        <ul className="m-0 space-y-2 p-0">
          {rooms.map((room) => {
            const p = roomProgress(room);
            const open = !collapsed[room.id];
            return (
              <li key={room.id} className="list-none rounded-lg border border-line" data-room-open={open}>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(room.id)}
                    aria-expanded={open}
                    aria-label={`${open ? 'Collapse' : 'Expand'} ${room.name || 'room'}`}
                    className="nodrag rounded p-0.5 text-dim hover:text-ink focus:outline-none focus:ring-2 focus:ring-info"
                  >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {editable ? (
                    <CommitField value={room.name} onCommit={(v) => updateRoom(room.id, { name: v })} placeholder="Room name" className={`${smallField} flex-1 font-semibold`} aria-label="Room name" />
                  ) : (
                    <span className="flex-1 truncate text-sm font-semibold text-ink">{room.name || 'Unnamed room'}</span>
                  )}
                  <span className="shrink-0 text-[11px] tabular-nums text-dim">{p.done}/{p.total}</span>
                  {p.total > 0 && p.done === p.total ? <Chip tone="success"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Complete</Chip> : null}
                  {editable ? (
                    <button type="button" onClick={() => onChange({ rooms: rooms.filter((r) => r.id !== room.id) })} aria-label={`Remove ${room.name || 'room'}`} className="nodrag rounded p-1 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {open ? (
                  <div className="border-t border-line px-2 py-2">
                    {room.items.length ? (
                      <ul className="m-0 space-y-1 p-0">
                        {room.items.map((it) => {
                          const status = getScopeStatus(it.status);
                          return (
                            <li key={it.id} className="grid list-none grid-cols-[1.4fr_1fr_auto_20px] items-center gap-1" data-item-status={it.status}>
                              {editable ? (
                                <>
                                  <CommitField value={it.text} onCommit={(v) => updateItem(room.id, it.id, { text: v })} placeholder="Work item" className={smallField} aria-label="Work item" />
                                  <CommitField value={it.finish} onCommit={(v) => updateItem(room.id, it.id, { finish: v })} placeholder="Finish" className={smallField} aria-label="Finish" />
                                  <select value={it.status} onChange={(e) => updateItem(room.id, it.id, { status: e.target.value })} aria-label="Status" className={selectSmall}>
                                    {SCOPE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                  </select>
                                  <button type="button" onClick={() => updateRoom(room.id, { items: room.items.filter((i) => i.id !== it.id) })} aria-label="Remove item" className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="truncate text-xs text-ink">{it.text || '—'}</span>
                                  <span className="truncate text-xs text-dim">{it.finish}</span>
                                  <Chip tone={status.tone}>{status.label}</Chip>
                                  <span />
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : <div className="text-xs text-dim">No items in this room yet</div>}
                    {editable ? (
                      <button
                        type="button"
                        disabled={room.items.length >= INTERIOR_LIMITS.itemsPerRoom}
                        onClick={() => updateRoom(room.id, { items: [...room.items, { id: newId('item'), text: '', finish: '', status: 'todo' }] })}
                        className={`${smallButton} mt-2`}
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" /> Add item
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <EmptyNote>No rooms yet</EmptyNote>}
      {editable ? (
        <button
          type="button"
          disabled={rooms.length >= INTERIOR_LIMITS.rooms}
          onClick={() => onChange({ rooms: [...rooms, { id: newId('room'), name: '', items: [] }] })}
          className={`${smallButton} mt-2`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add room
        </button>
      ) : null}
    </Shell>
  );
};

// ---- Finish schedule -----------------------------------------------------

export const FinishBlock = ({ data, editable, onChange }) => {
  const schedule = useMemo(() => sanitizeSchedule({ columns: data.columns, rows: data.rows }), [data.columns, data.rows]);
  const { columns, rows } = schedule;
  const usage = useMemo(() => codeUsage(schedule), [schedule]);
  const conflicts = usage.filter((u) => u.conflict);

  const save = (next) => onChange({ columns: next.columns ?? columns, rows: next.rows ?? rows });
  const updateCell = (rowId, colId, changes) =>
    save({
      rows: rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: { material: '', code: '', ...r.cells[colId], ...changes } } } : r)),
    });
  const gridTemplate = `130px repeat(${Math.max(columns.length, 1)}, minmax(110px, 1fr)) ${editable ? '20px' : ''}`;

  return (
    <Shell className="w-[620px]">
      <Label>{data.label}</Label>
      {columns.length ? (
        <div className="overflow-x-auto">
          <div className="min-w-max space-y-1">
            <div className="grid items-end gap-1" style={{ gridTemplateColumns: gridTemplate }}>
              <span className="text-[10px] font-medium uppercase tracking-wide text-dim">Room</span>
              {columns.map((c) =>
                editable ? (
                  <div key={c.id} className="flex items-center gap-0.5">
                    <CommitField value={c.name} onCommit={(v) => save({ columns: columns.map((x) => (x.id === c.id ? { ...x, name: v } : x)) })} placeholder="Surface" className={`${smallField} font-semibold`} aria-label="Surface name" />
                    <button
                      type="button"
                      onClick={() => save({ columns: columns.filter((x) => x.id !== c.id) })}
                      aria-label={`Remove column ${c.name || ''}`.trim()}
                      className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span key={c.id} className="truncate text-[11px] font-semibold uppercase tracking-wide text-ink">{c.name || '—'}</span>
                )
              )}
              {editable ? <span /> : null}
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid items-start gap-1 rounded-lg border border-line p-1" style={{ gridTemplateColumns: gridTemplate }} data-schedule-row={r.room}>
                {editable ? (
                  <CommitField value={r.room} onCommit={(v) => save({ rows: rows.map((x) => (x.id === r.id ? { ...x, room: v } : x)) })} placeholder="Room" className={`${smallField} font-semibold`} aria-label="Room" />
                ) : (
                  <span className="truncate px-1 py-1 text-xs font-semibold text-ink">{r.room || '—'}</span>
                )}
                {columns.map((c) => {
                  const cell = r.cells[c.id] || { material: '', code: '' };
                  return editable ? (
                    <div key={c.id} className="space-y-0.5">
                      <CommitField value={cell.material} onCommit={(v) => updateCell(r.id, c.id, { material: v })} placeholder="Material" className={smallField} aria-label={`${r.room || 'Room'} ${c.name || 'surface'} material`} />
                      <CommitField value={cell.code} onCommit={(v) => updateCell(r.id, c.id, { code: v })} placeholder="Code" className={`${smallField} tabular-nums text-dim`} aria-label={`${r.room || 'Room'} ${c.name || 'surface'} code`} />
                    </div>
                  ) : (
                    <div key={c.id} className="px-1 py-1">
                      <div className="truncate text-xs text-ink">{cell.material || <span className="text-dim">—</span>}</div>
                      {cell.code ? <div className="text-[11px] tabular-nums text-dim">{cell.code}</div> : null}
                    </div>
                  );
                })}
                {editable ? (
                  <button type="button" onClick={() => save({ rows: rows.filter((x) => x.id !== r.id) })} aria-label={`Remove ${r.room || 'room'}`} className="nodrag mt-1 rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : <EmptyNote>Add a surface column to begin</EmptyNote>}

      {editable ? (
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={rows.length >= INTERIOR_LIMITS.scheduleRows} onClick={() => save({ rows: [...rows, { id: newId('row'), room: '', cells: {} }] })} className={smallButton}>
            <Plus className="h-3 w-3" aria-hidden="true" /> Add room
          </button>
          <button type="button" disabled={columns.length >= INTERIOR_LIMITS.columns} onClick={() => save({ columns: [...columns, { id: newId('col'), name: '' }] })} className={smallButton}>
            <Plus className="h-3 w-3" aria-hidden="true" /> Add surface
          </button>
        </div>
      ) : null}

      {conflicts.length ? (
        <div role="alert" className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs">
          <div className="font-medium text-warning">Same code, different materials</div>
          <ul className="m-0 mt-1 space-y-0.5 p-0">
            {conflicts.map((c) => (
              <li key={c.code} className="list-none text-ink">
                <span className="font-semibold tabular-nums">{c.code}</span>: {[...new Set(c.uses.map((u) => u.material).filter(Boolean))].join(' / ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {usage.length ? (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-dim">Where each code is used ({usage.length})</summary>
          <ul className="m-0 mt-1 space-y-0.5 p-0">
            {usage.map((u) => (
              <li key={u.code} className="list-none">
                <span className="font-semibold tabular-nums text-ink">{u.code}</span>
                <span className="text-dim"> · {u.uses.length} {u.uses.length === 1 ? 'place' : 'places'}: {u.uses.map((x) => `${x.room || '?'} ${x.surface}`).join(', ')}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Shell>
  );
};

// ---- Furniture spec card -------------------------------------------------

export const FurnitureBlock = ({ id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage }) => {
  const picker = useImagePicker({ upload, workspaceId, nodeId: id, taskId, subtaskId });
  const size = formatFurnitureSize(data, data.unit);
  const imageUrl = typeof data.imageUrl === 'string' && /^https?:\/\//i.test(data.imageUrl) ? data.imageUrl : '';
  const qty = cleanQuantity(data.quantity);

  const field = (key, label, placeholder) => (
    <label className="block min-w-0 text-[11px] text-dim">
      {label}
      {editable ? (
        <CommitField value={data[key]} onCommit={(v) => onChange({ [key]: v })} placeholder={placeholder} className={`${smallField} border-line`} aria-label={label} />
      ) : <div className="truncate py-1 text-xs font-medium text-ink">{data[key] || '—'}</div>}
    </label>
  );

  return (
    <Shell className="w-[360px]">
      <Label>{data.label}</Label>
      {picker.input}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-canvas">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={data.name || 'Furniture photo'} className="h-full w-full object-cover" />
            {editable ? (
              <button type="button" onClick={() => picker.pick((url) => onChange({ imageUrl: url }))} disabled={picker.busy} className={`${smallButton} absolute right-1 top-1 bg-surface/90`}>
                {picker.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" aria-hidden="true" />} Replace
              </button>
            ) : null}
          </>
        ) : editable ? (
          <button type="button" onClick={() => picker.pick((url) => onChange({ imageUrl: url }))} disabled={picker.busy} className="nodrag flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-dim hover:text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-info">
            {picker.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
            Add a photo
          </button>
        ) : <span className="flex h-full items-center justify-center text-xs text-dim">No photo</span>}
      </div>
      <ErrorLine message={picker.error} />

      <div className="mt-2">
        {editable ? (
          <CommitField value={data.name} onCommit={(v) => onChange({ name: v })} placeholder="Item name, e.g. TV unit" className={`${smallField} border-line text-sm font-semibold`} aria-label="Item name" />
        ) : <div className="text-sm font-semibold text-ink">{data.name || 'Unnamed item'}</div>}
      </div>

      {editable ? (
        <div className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-1">
          {[['width', 'Width'], ['depth', 'Depth'], ['height', 'Height']].map(([key, label]) => (
            <label key={key} className="block text-[11px] text-dim">{label}
              <CommitField value={data[key]} onCommit={(v) => onChange({ [key]: v })} inputMode="decimal" placeholder="0" className={`${smallField} border-line`} aria-label={label} />
            </label>
          ))}
          <select value={FURNITURE_UNITS.includes(data.unit) ? data.unit : 'mm'} onChange={(e) => onChange({ unit: e.target.value })} aria-label="Size unit" className={selectSmall}>
            {FURNITURE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      ) : size ? <div className="mt-1 text-xs tabular-nums text-ink">{size}</div> : null}

      <div className="mt-2 grid grid-cols-2 gap-2">
        {field('material', 'Material', 'Teak veneer')}
        {field('finish', 'Finish', 'Matte PU')}
        <label className="block text-[11px] text-dim">Quantity
          {editable ? (
            <CommitField value={data.quantity} onCommit={(v) => onChange({ quantity: cleanQuantity(v) })} inputMode="numeric" className={`${smallField} border-line`} aria-label="Quantity" />
          ) : <div className="py-1 text-xs font-semibold tabular-nums text-ink">{qty || '—'}</div>}
        </label>
        {field('supplier', 'Supplier', 'Supplier name')}
      </div>
    </Shell>
  );
};

// ---- Moodboard -----------------------------------------------------------

export const MoodboardBlock = ({
  id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage,
  viewer, collaborators, decide, notify, onServerPatch,
}) => {
  const items = useMemo(() => sanitizeMoodItems(data.items), [data.items]);
  const approval = sanitizeApproval(data.approval);
  const chain = chainFor(data);
  // Locked while with an approver and once approved. A board approved before approvals were
  // routed keeps its decision and is read-only.
  const legacyDecided = !chain && approval.status !== 'pending';
  const locked = (chain && ['pending', 'approved'].includes(chain.state)) || legacyDecided;
  const canEdit = editable && !locked;
  const picker = useImagePicker({ upload, workspaceId, nodeId: id, taskId, subtaskId });
  const surfaceRef = useRef(null);
  const dragRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [hex, setHex] = useState('');
  const [error, setError] = useState('');
  const relative = (e) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };
  const startDrag = (e, item) => {
    if (!canEdit) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: item.id, moved: false };
    setDrag({ id: item.id, x: item.x, y: item.y });
  };
  const moveDrag = (e) => {
    if (!dragRef.current) return;
    const at = relative(e);
    if (!at) return;
    dragRef.current.moved = true;
    setDrag({ id: dragRef.current.id, ...clampMoodPosition(at.x, at.y) });
  };
  const endDrag = () => {
    const current = dragRef.current;
    dragRef.current = null;
    if (current?.moved && drag) onChange({ items: moveMoodItem(items, drag.id, drag.x, drag.y) });
    setDrag(null);
  };
  const nudge = (e, item) => {
    if (!canEdit) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    onChange({ items: moveMoodItem(items, item.id, item.x + delta[0], item.y + delta[1]) });
  };

  const addImage = () =>
    picker.pick((url) => {
      const next = addMoodItem(items, { kind: 'image', imageUrl: url });
      if (!next) { setError(`A board holds up to ${INTERIOR_LIMITS.moodItems} items`); return; }
      setError('');
      onChange({ items: next });
    });
  const addSwatch = () => {
    const color = normalizeHex(hex);
    if (!color) { setError('Enter a colour like #C9A27E'); return; }
    const next = addMoodItem(items, { kind: 'swatch', color });
    if (!next) { setError(`A board holds up to ${INTERIOR_LIMITS.moodItems} items`); return; }
    setError('');
    setHex('');
    onChange({ items: next });
  };
  const setCaption = (itemId, caption) => onChange({ items: items.map((it) => (it.id === itemId ? { ...it, caption } : it)) });

  const headline = chain
    ? describeChain(chain)
    : { tone: approval.status === 'approved' ? 'success' : approval.status === 'changes' ? 'warning' : 'neutral', text: { pending: 'Not sent for approval', approved: 'Approved', changes: 'Changes requested' }[approval.status] };
  const tone = headline.tone;
  const statusText = headline.text;

  return (
    <Shell className="w-[520px]">
      <div className="flex items-center justify-between gap-2">
        <Label icon={Palette}>{data.label}</Label>
        {!chain ? <span className="mb-2"><Chip tone={tone}>{approval.status === 'approved' ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : null}{statusText}</Chip></span> : null}
      </div>
      {picker.input}

      <div ref={surfaceRef} className="relative overflow-hidden rounded-lg border border-line bg-canvas" style={{ aspectRatio: '3 / 2' }} data-moodboard-surface>
        {items.length === 0 ? (
          <span className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-dim">
            {canEdit ? 'Add pictures and colours, then drag them into place' : 'Nothing on this board yet'}
          </span>
        ) : null}
        {items.map((it) => {
          const at = drag?.id === it.id ? drag : it;
          return (
            <figure
              key={it.id}
              role={canEdit ? 'button' : undefined}
              tabIndex={canEdit ? 0 : undefined}
              aria-label={`${it.kind === 'swatch' ? `Colour ${it.color}` : 'Picture'}${it.caption ? `: ${it.caption}` : ''}${canEdit ? '. Drag or use the arrow keys to move' : ''}`}
              data-mood-item={it.id}
              data-mood-kind={it.kind}
              onPointerDown={(e) => startDrag(e, it)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(e) => nudge(e, it)}
              className={`nodrag nopan absolute m-0 overflow-hidden rounded-md border border-white bg-surface shadow-node ${canEdit ? 'cursor-grab touch-none focus:outline-none focus:ring-2 focus:ring-info active:cursor-grabbing' : ''} ${drag?.id === it.id ? 'z-10 scale-105' : ''}`}
              style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, width: `${MOOD_TILE.w * 100}%`, height: `${MOOD_TILE.h * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
              {it.kind === 'image' ? (
                <img src={it.imageUrl} alt={it.caption || 'Moodboard picture'} className="h-full w-full select-none object-cover" draggable={false} />
              ) : (
                <div className="flex h-full w-full items-end p-1 text-[10px] font-semibold tabular-nums" style={{ background: it.color, color: readableOn(it.color) }}>{it.color}</div>
              )}
            </figure>
          );
        })}
      </div>

      {canEdit ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={addImage} disabled={picker.busy} className={smallButton}>
            {picker.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" aria-hidden="true" />} Add picture
          </button>
          <input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#C9A27E" aria-label="Colour" className="nodrag w-24 rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info" />
          <button type="button" onClick={addSwatch} className={smallButton}><Plus className="h-3 w-3" aria-hidden="true" /> Add colour</button>
        </div>
      ) : null}
      <ErrorLine message={error || picker.error} />

      {items.length ? (
        <ul className="m-0 mt-3 space-y-1 p-0" aria-label="Captions">
          {items.map((it) => (
            <li key={it.id} className="flex list-none items-center gap-2">
              <span className="h-5 w-5 shrink-0 overflow-hidden rounded border border-line" style={it.kind === 'swatch' ? { background: it.color } : undefined}>
                {it.kind === 'image' ? <img src={it.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              {canEdit ? (
                <CommitField value={it.caption} onCommit={(v) => setCaption(it.id, v)} placeholder="Caption" className={`${smallField} flex-1`} aria-label={`Caption for ${it.kind === 'swatch' ? it.color : 'picture'}`} />
              ) : <span className="flex-1 truncate text-xs text-ink">{it.caption || <span className="text-dim">{it.kind === 'swatch' ? it.color : 'Picture'}</span>}</span>}
              {canEdit ? (
                <button type="button" onClick={() => onChange({ items: items.filter((x) => x.id !== it.id) })} aria-label="Remove from board" className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 border-t border-line pt-3">
        {legacyDecided ? (
          <div className="text-xs" data-legacy-approval>
            {approval.by ? <span className="font-medium text-ink">{clientSafeName(approval.by, data.approvalChain)}</span> : null}
            {approval.at ? <span className="text-dim"> · {stamp(approval.at)}</span> : null}
            {approval.note ? <div className="mt-1 text-ink">{approval.note}</div> : null}
          </div>
        ) : (
          <ApprovalPanel
            kind="moodboard"
            id={id}
            data={data}
            editable={editable}
            viewer={viewer}
            collaborators={collaborators}
            decide={decide}
            notify={notify}
            onServerPatch={onServerPatch || onChange}
            validate={() => (items.length ? null : 'Add something to the board before asking for approval')}
            getContent={() => ({ items })}
            what={`the moodboard${data.label ? `: ${data.label}` : ''}`}
            place={[data.taskName, data.subtaskName].filter(Boolean).join(' › ')}
          />
        )}
      </div>
    </Shell>
  );
};

// ---- Site measurement sheet ---------------------------------------------

export const SiteMeasureBlock = ({ id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage }) => {
  const walls = useMemo(() => sanitizeWalls(data.walls), [data.walls]);
  const openings = useMemo(() => sanitizeOpenings(data.openings), [data.openings]);
  const unit = measureUnit(data.unit);
  const totals = measureTotals({ walls, openings, ceilingHeight: data.ceilingHeight });
  const picker = useImagePicker({ upload, workspaceId, nodeId: id, taskId, subtaskId });
  const sketch = typeof data.sketchUrl === 'string' && /^https?:\/\//i.test(data.sketchUrl) ? data.sketchUrl : '';
  const updateWall = (wid, changes) => onChange({ walls: walls.map((w) => (w.id === wid ? { ...w, ...changes } : w)) });
  const updateOpening = (oid, changes) => onChange({ openings: openings.map((o) => (o.id === oid ? { ...o, ...changes } : o)) });
  const num = 'nodrag w-full rounded border border-line bg-transparent px-1.5 py-1 text-xs tabular-nums text-ink outline-none focus:border-info';

  return (
    <Shell className="w-[480px]">
      <Label>{data.label}</Label>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-semibold text-ink">{data.room || 'Room not named'}</div>
        <div className="shrink-0 text-xs text-dim">Ceiling {data.ceilingHeight ? `${data.ceilingHeight} ${unit.label}` : 'not set'}</div>
      </div>
      {picker.input}

      <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-dim">Walls ({unit.label})</div>
      <div className="mt-1 space-y-1" role="list" aria-label="Walls">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_20px] gap-1 text-[10px] uppercase tracking-wide text-dim"><span>Wall</span><span>Length</span><span>Height</span><span /></div>
        {walls.map((w) => (
          <div key={w.id} role="listitem" className="grid grid-cols-[1.2fr_1fr_1fr_20px] items-center gap-1">
            {editable ? (
              <>
                <CommitField value={w.name} onCommit={(v) => updateWall(w.id, { name: v })} placeholder="Wall" className={smallField} aria-label="Wall name" />
                <CommitField value={w.length} onCommit={(v) => updateWall(w.id, { length: v })} inputMode="decimal" placeholder="0" className={num} aria-label={`${w.name || 'Wall'} length`} />
                <CommitField value={w.height} onCommit={(v) => updateWall(w.id, { height: v })} inputMode="decimal" placeholder={data.ceilingHeight || '0'} className={num} aria-label={`${w.name || 'Wall'} height`} />
                <button type="button" onClick={() => onChange({ walls: walls.filter((x) => x.id !== w.id) })} aria-label={`Remove ${w.name || 'wall'}`} className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            ) : (
              <>
                <span className="truncate text-xs text-ink">{w.name || '—'}</span>
                <span className="text-xs tabular-nums text-ink">{w.length || '—'}</span>
                <span className="text-xs tabular-nums text-ink">{w.height || data.ceilingHeight || '—'}</span>
                <span />
              </>
            )}
          </div>
        ))}
      </div>
      {editable ? (
        <button type="button" disabled={walls.length >= INTERIOR_LIMITS.walls} onClick={() => onChange({ walls: [...walls, { id: newId('wall'), name: '', length: '', height: '' }] })} className={`${smallButton} mt-1`}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add wall
        </button>
      ) : null}

      <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-dim">Openings</div>
      {openings.length ? (
        <div className="mt-1 space-y-1" role="list" aria-label="Openings">
          <div className="grid grid-cols-[0.9fr_1fr_0.8fr_0.8fr_0.5fr_20px] gap-1 text-[10px] uppercase tracking-wide text-dim"><span>Type</span><span>On wall</span><span>Width</span><span>Height</span><span>Nos</span><span /></div>
          {openings.map((o) => (
            <div key={o.id} role="listitem" className="grid grid-cols-[0.9fr_1fr_0.8fr_0.8fr_0.5fr_20px] items-center gap-1">
              {editable ? (
                <>
                  <select value={o.type} onChange={(e) => updateOpening(o.id, { type: e.target.value })} aria-label="Opening type" className={selectSmall}>
                    {OPENING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <CommitField value={o.wall} onCommit={(v) => updateOpening(o.id, { wall: v })} placeholder="Wall A" className={smallField} aria-label="Opening wall" />
                  <CommitField value={o.width} onCommit={(v) => updateOpening(o.id, { width: v })} inputMode="decimal" className={num} aria-label="Opening width" />
                  <CommitField value={o.height} onCommit={(v) => updateOpening(o.id, { height: v })} inputMode="decimal" className={num} aria-label="Opening height" />
                  <CommitField value={o.count} onCommit={(v) => updateOpening(o.id, { count: v })} inputMode="numeric" className={num} aria-label="Opening count" />
                  <button type="button" onClick={() => onChange({ openings: openings.filter((x) => x.id !== o.id) })} aria-label="Remove opening" className="nodrag rounded p-0.5 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              ) : (
                <>
                  <span className="text-xs text-ink">{o.type}</span><span className="truncate text-xs text-dim">{o.wall}</span>
                  <span className="text-xs tabular-nums text-ink">{o.width}</span><span className="text-xs tabular-nums text-ink">{o.height}</span>
                  <span className="text-xs tabular-nums text-ink">{o.count}</span><span />
                </>
              )}
            </div>
          ))}
        </div>
      ) : <div className="mt-1 text-xs text-dim">No doors or windows listed</div>}
      {editable ? (
        <button type="button" disabled={openings.length >= INTERIOR_LIMITS.openings} onClick={() => onChange({ openings: [...openings, { id: newId('op'), type: 'Door', wall: '', width: '', height: '', count: '1' }] })} className={`${smallButton} mt-1`}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add opening
        </button>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-surface-hover/50 p-2 text-xs" data-totals>
        <div><div className="text-dim">Wall length (perimeter)</div><div className="font-semibold tabular-nums text-ink">{totals.perimeter} {unit.label}</div></div>
        <div><div className="text-dim">Wall area</div><div className="font-semibold tabular-nums text-ink">{totals.grossArea} {unit.area}</div></div>
        <div><div className="text-dim">Openings</div><div className="font-semibold tabular-nums text-ink">{totals.openingArea} {unit.area}</div></div>
        <div><div className="text-dim">Net wall area</div><div className="font-semibold tabular-nums text-ink">{totals.netArea} {unit.area}</div></div>
      </div>
      {totals.wallsSkipped ? (
        <div role="status" className="mt-1 text-[11px] text-warning">
          {totals.wallsSkipped} {totals.wallsSkipped === 1 ? 'wall is' : 'walls are'} missing a length or height and not counted
        </div>
      ) : null}
      {totals.openingsMoreThanWalls ? <div role="alert" className="mt-1 text-[11px] text-danger">Openings are larger than the walls. Check the sizes.</div> : null}

      <div className="mt-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-dim">Sketch note</div>
        {editable ? (
          <CommitField multiline rows={3} value={data.note} onCommit={(v) => onChange({ note: v })} placeholder="Beam below the window, AC point on wall C …" className="nodrag mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info" aria-label="Sketch note" />
        ) : <div className="mt-1 whitespace-pre-wrap text-xs text-ink">{data.note || <span className="text-dim">No note</span>}</div>}
        {sketch ? <img src={sketch} alt="Hand sketch of the room" className="mt-2 max-h-48 w-full rounded-lg border border-line object-contain" /> : null}
        {editable ? (
          <button type="button" onClick={() => picker.pick((url) => onChange({ sketchUrl: url }))} disabled={picker.busy} className={`${smallButton} mt-2`}>
            {picker.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" aria-hidden="true" />}
            {sketch ? 'Replace sketch photo' : 'Add a photo of your sketch'}
          </button>
        ) : null}
        <ErrorLine message={picker.error} />
      </div>
    </Shell>
  );
};
