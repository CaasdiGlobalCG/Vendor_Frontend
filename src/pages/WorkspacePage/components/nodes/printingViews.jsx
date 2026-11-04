import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, ImagePlus, Loader2, MapPin, MessageSquareWarning, Plus, Trash2, Upload,
} from 'lucide-react';
import { Label, Shell, uploadWorkspaceImage } from './blockInputViews';
import ApprovalPanel from './ApprovalPanel';
import { chainFor, clientSafeName } from '../../utils/approvalRouting';
import { CommitField } from './blockControls';
import { TONE_CLASSES } from '../../utils/blockElements';
import {
  ELEVATION_VIEW,
  MATERIAL_TYPES,
  PIN_STATUSES,
  PRINTING_LIMITS,
  NUDGE,
  addPin,
  addVersion,
  currentVersion,
  elevationArea,
  elevationLayout,
  formatDimension,
  getPinStatus,
  matchedCount,
  movePin,
  newId,
  normalizeHex,
  parseCmyk,
  pinCounts,
  readableOn,
  sanitizeMaterials,
  sanitizePins,
  sanitizeSwatches,
  sanitizeVersions,
  swatchColor,
} from '../../utils/printingElements';

/** Visual parts of the proof markup, artwork approval, signage elevation, colour palette and material swatch blocks. */

import { smallField, smallButton, primaryButton } from './blockStyles';
export { smallField, smallButton, primaryButton };

/** One hidden file input plus its busy / error state; `pick(onUrl)` opens the chooser. */
export const useImagePicker = ({ upload, workspaceId, nodeId, taskId, subtaskId }) => {
  const inputRef = useRef(null);
  const callback = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = (onUrl) => {
    callback.current = onUrl;
    inputRef.current?.click();
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await upload(file, { workspaceId, nodeId, taskId, subtaskId });
      callback.current?.(url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
  const input = <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-label="Choose image" />;
  return { pick, busy, error, input };
};

export const ErrorLine = ({ message }) =>
  message ? <div role="alert" className="mt-2 text-xs text-danger">{message}</div> : null;

// ---- Proof markup --------------------------------------------------------

export const ProofBlock = ({ id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage }) => {
  const pins = useMemo(() => sanitizePins(data.pins), [data.pins]);
  const counts = pinCounts(pins);
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState('');
  const [drag, setDrag] = useState(null); // { id, x, y }: a pin being moved, before it is saved
  const surfaceRef = useRef(null);
  const dragRef = useRef(null);
  const picker = useImagePicker({ upload, workspaceId, nodeId: id, taskId, subtaskId });
  const imageUrl = typeof data.imageUrl === 'string' && /^https?:\/\//i.test(data.imageUrl) ? data.imageUrl : '';

  const relative = (e) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const place = (e) => {
    if (!placing || !editable) return;
    const at = relative(e);
    if (!at) return;
    const next = addPin(pins, at.x, at.y, data.pinSeq);
    if (!next) {
      setNotice(`A proof holds up to ${PRINTING_LIMITS.pins} pins`);
      return;
    }
    setNotice('');
    onChange({ pins: next.pins, pinSeq: next.pinSeq });
  };

  const update = (pinId, changes) => onChange({ pins: pins.map((p) => (p.id === pinId ? { ...p, ...changes } : p)) });
  const remove = (pinId) => onChange({ pins: pins.filter((p) => p.id !== pinId) });

  // Dragging: follow the pointer locally, save once on release (one update to collaborators, not one per move)
  const startDrag = (e, pin) => {
    if (!editable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: pin.id, moved: false };
    setDrag({ id: pin.id, x: pin.x, y: pin.y });
  };
  const moveDrag = (e) => {
    if (!dragRef.current) return;
    const at = relative(e);
    if (!at) return;
    dragRef.current.moved = true;
    setDrag({ id: dragRef.current.id, ...at });
  };
  const endDrag = () => {
    const current = dragRef.current;
    dragRef.current = null;
    if (current?.moved && drag) onChange({ pins: movePin(pins, drag.id, drag.x, drag.y) });
    setDrag(null);
  };
  const nudge = (e, pin) => {
    if (!editable) return;
    const step = e.shiftKey ? NUDGE.large : NUDGE.small;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    onChange({ pins: movePin(pins, pin.id, pin.x + delta[0], pin.y + delta[1]) });
  };

  return (
    <Shell className="w-[440px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label icon={MessageSquareWarning}>{data.label}</Label>
        {pins.length ? (
          <span className="mb-2 shrink-0 text-[11px] tabular-nums text-dim">
            {counts.open} open · {counts.fixed} fixed · {counts.approved} approved
          </span>
        ) : null}
      </div>
      {picker.input}

      {imageUrl ? (
        <>
          <div
            ref={surfaceRef}
            className={`relative overflow-hidden rounded-lg border border-line bg-canvas ${placing ? 'cursor-crosshair' : ''}`}
            onClick={place}
            data-placing={placing || undefined}
          >
            <img src={imageUrl} alt={data.label || 'Artwork proof'} className="block w-full select-none" draggable={false} />
            {pins.map((p) => {
              const tone = TONE_CLASSES[getPinStatus(p.status).tone];
              const at = drag?.id === p.id ? drag : p;
              const label = `Pin ${p.n}: ${p.text || 'no comment yet'}`;
              return (
                <span
                  key={p.id}
                  role={editable ? 'button' : undefined}
                  tabIndex={editable ? 0 : undefined}
                  aria-label={editable ? `${label}. Drag or use the arrow keys to move` : label}
                  title={label}
                  data-pin={p.n}
                  onPointerDown={(e) => startDrag(e, p)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => nudge(e, p)}
                  className={`nodrag nopan absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-node ${tone.dot} ${
                    editable ? 'cursor-grab touch-none focus:outline-none focus:ring-2 focus:ring-info active:cursor-grabbing' : 'pointer-events-none'
                  } ${drag?.id === p.id ? 'scale-110' : ''}`}
                  style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
                >
                  {p.n}
                </span>
              );
            })}
          </div>
          {editable ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={placing} onClick={() => setPlacing((v) => !v)} className={`${smallButton} ${placing ? 'border-info text-info' : ''}`}>
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {placing ? 'Click the artwork to drop a pin' : 'Add pin'}
              </button>
              <button type="button" onClick={() => picker.pick((url) => onChange({ imageUrl: url }))} disabled={picker.busy} className={smallButton}>
                {picker.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" aria-hidden="true" />}
                Replace artwork
              </button>
            </div>
          ) : null}
          {notice ? <div role="status" className="mt-1 text-xs text-warning">{notice}</div> : null}

          {pins.length ? (
            <ol className="mt-3 space-y-1.5 p-0" aria-label="Proof comments">
              {pins.map((p) => {
                const tone = TONE_CLASSES[getPinStatus(p.status).tone];
                return (
                  <li key={p.id} className="flex items-start gap-2 list-none">
                    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${tone.dot}`}>{p.n}</span>
                    {editable ? (
                      <CommitField value={p.text} onCommit={(text) => update(p.id, { text })} placeholder="What needs attention?" className={`${smallField} flex-1`} aria-label={`Comment for pin ${p.n}`} />
                    ) : (
                      <span className="flex-1 py-1 text-xs text-ink">{p.text || <span className="text-dim">No comment</span>}</span>
                    )}
                    {editable ? (
                      <>
                        <select
                          value={p.status}
                          onChange={(e) => update(p.id, { status: e.target.value })}
                          aria-label={`Status of pin ${p.n}`}
                          className="nodrag rounded border border-line bg-surface px-1 py-1 text-[11px] text-ink focus:outline-none focus:ring-2 focus:ring-info"
                        >
                          {PIN_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <button type="button" onClick={() => remove(p.id)} aria-label={`Remove pin ${p.n}`} className="nodrag rounded p-1 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.chip}`}>{getPinStatus(p.status).label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mt-2 text-xs text-dim">{editable ? 'Choose Add pin, then click the spot that needs a change. Drag a pin to move it.' : 'No comments on this proof.'}</div>
          )}
        </>
      ) : editable ? (
        <button
          type="button"
          onClick={() => picker.pick((url) => onChange({ imageUrl: url }))}
          disabled={picker.busy}
          className="nodrag flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-xs text-dim transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-info"
        >
          {picker.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
          Upload the artwork to mark up
        </button>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-line text-xs text-dim">No artwork yet</div>
      )}
      <ErrorLine message={picker.error} />
    </Shell>
  );
};

// ---- Artwork approval ----------------------------------------------------

const VERSION_TONE = { pending: 'neutral', approved: 'success', changes: 'warning' };
const VERSION_LABEL = { pending: 'No decision yet', approved: 'Approved', changes: 'Changes requested' };

const formatStamp = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
};

export const ArtworkBlock = ({
  id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage,
  viewer, collaborators, decide, notify, onServerPatch,
}) => {
  const versions = useMemo(() => sanitizeVersions(data.versions), [data.versions]);
  const current = currentVersion(versions);
  const past = versions.slice(0, -1).reverse();
  const picker = useImagePicker({ upload, workspaceId, nodeId: id, taskId, subtaskId });
  const [error, setError] = useState('');
  // The approval belongs to the version it was sent for; a newer version starts afresh
  const chain = chainFor(data, current?.id);
  const waiting = chain?.state === 'pending';

  const uploadVersion = () =>
    picker.pick((url) => {
      const next = addVersion(versions, { imageUrl: url });
      if (!next) {
        setError(`An approval holds up to ${PRINTING_LIMITS.versions} versions`);
        return;
      }
      setError('');
      onChange({ versions: next });
    });

  const tone = current ? TONE_CLASSES[VERSION_TONE[current.status]] : TONE_CLASSES.neutral;

  return (
    <Shell className="w-[380px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Label>{data.label}</Label>
          {data.job || data.client ? (
            <div className="-mt-1 mb-2 truncate text-sm font-semibold text-ink">
              {[data.job, data.client].filter(Boolean).join(' · ')}
            </div>
          ) : null}
        </div>
        {current ? (
          <span className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-xs font-bold tabular-nums text-ink">v{current.version}</span>
        ) : null}
      </div>
      {picker.input}

      {current ? (
        <>
          <div className="overflow-hidden rounded-lg border border-line bg-canvas">
            {current.imageUrl ? <img src={current.imageUrl} alt={`Artwork version ${current.version}`} className="block max-h-[260px] w-full object-contain" /> : null}
          </div>
          <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone.chip}`}>
            {current.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {current.status === 'pending' ? (waiting ? 'Waiting for approval' : 'Not sent for approval') : VERSION_LABEL[current.status]}
          </div>
          <div className="mt-3">
            <ApprovalPanel
              kind="artwork"
              id={id}
              data={data}
              editable={editable}
              viewer={viewer}
              collaborators={collaborators}
              decide={decide}
              notify={notify}
              subject={current.id}
              onServerPatch={onServerPatch || onChange}
              validate={() => (current.imageUrl ? null : 'Upload the artwork before sending it for approval')}
              getContent={() => ({ versions })}
              what={`the artwork${data.job ? ` for ${data.job}` : ''} (v${current.version})`}
              place={[data.taskName, data.subtaskName].filter(Boolean).join(' › ')}
            />
          </div>

          {editable && !waiting && current.status !== 'pending' ? (
            <div className="mt-3">
              <button type="button" onClick={uploadVersion} disabled={picker.busy} className={smallButton}>
                {picker.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
                Upload version {current.version + 1}
              </button>
            </div>
          ) : null}

          {past.length ? (
            <div className="mt-3 border-t border-line pt-2">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-dim">Earlier versions</div>
              <ul className="m-0 space-y-1 p-0">
                {past.map((v) => (
                  <li key={v.id} className="flex list-none items-center gap-2 text-xs">
                    {v.imageUrl ? <img src={v.imageUrl} alt="" className="h-8 w-8 rounded border border-line object-cover" /> : <span className="h-8 w-8 rounded border border-line" />}
                    <span className="font-semibold tabular-nums text-ink">v{v.version}</span>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${TONE_CLASSES[VERSION_TONE[v.status]].chip}`}>{VERSION_LABEL[v.status]}</span>
                    <span className="truncate text-dim">{clientSafeName(v.decidedBy, data.approvalChain) || formatStamp(v.uploadedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : editable ? (
        <button type="button" onClick={uploadVersion} disabled={picker.busy} className="nodrag flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-xs text-dim transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-info">
          {picker.busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
          Upload version 1
        </button>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-line text-xs text-dim">No artwork yet</div>
      )}
      <ErrorLine message={error || picker.error} />
    </Shell>
  );
};

// ---- Signage elevation ---------------------------------------------------

const DIM_COLOR = 'rgb(var(--text-muted))';

const DimensionLine = ({ x1, y1, x2, y2, label, vertical = false }) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const tick = 5;
  return (
    <g stroke={DIM_COLOR} strokeWidth="1" fill={DIM_COLOR}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
          <text x={mx - 8} y={my} textAnchor="middle" stroke="none" fontSize="11" fontWeight="600" transform={`rotate(-90 ${mx - 8} ${my})`}>{label}</text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
          <text x={mx} y={my - 6} textAnchor="middle" stroke="none" fontSize="11" fontWeight="600">{label}</text>
        </>
      )}
    </g>
  );
};

export const ElevationBlock = ({ data }) => {
  const layout = elevationLayout(data);
  const area = elevationArea(data.width, data.height, data.unit);
  const widthLabel = formatDimension(data.width, data.unit);
  const heightLabel = formatDimension(data.height, data.unit);
  const mountLabel = formatDimension(data.mountingHeight, data.unit);
  const specs = [
    ['Face', data.material],
    ['Frame', data.frame],
    ['Lighting', data.lighting],
    ['Finish', data.finish],
  ].filter(([, value]) => value);

  return (
    <Shell className="w-[400px]">
      <Label>{data.label}</Label>
      {layout ? (
        <svg
          viewBox={`0 0 ${ELEVATION_VIEW.w} ${ELEVATION_VIEW.h}`}
          className="block w-full rounded-lg border border-line bg-canvas"
          role="img"
          aria-label={`Signage elevation, ${widthLabel} by ${heightLabel}${mountLabel ? `, mounted ${mountLabel} above ground` : ''}`}
        >
          {layout.groundY !== null ? (
            <line x1="12" y1={layout.groundY} x2={ELEVATION_VIEW.w - 12} y2={layout.groundY} stroke={DIM_COLOR} strokeWidth="1.5" strokeDasharray="6 4" />
          ) : null}
          <rect
            x={layout.board.x}
            y={layout.board.y}
            width={layout.board.w}
            height={layout.board.h}
            rx="2"
            fill="rgb(var(--status-info) / 0.14)"
            stroke="rgb(var(--status-info))"
            strokeWidth="2"
          />
          <DimensionLine x1={layout.board.x} y1={layout.board.y - 14} x2={layout.board.x + layout.board.w} y2={layout.board.y - 14} label={widthLabel} />
          <DimensionLine x1={layout.board.x - 16} y1={layout.board.y} x2={layout.board.x - 16} y2={layout.board.y + layout.board.h} label={heightLabel} vertical />
          {layout.mountingY !== null ? (
            <DimensionLine x1={layout.board.x + layout.board.w + 14} y1={layout.mountingY} x2={layout.board.x + layout.board.w + 14} y2={layout.groundY} label={mountLabel} vertical />
          ) : null}
        </svg>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-line px-6 text-center text-xs text-dim">
          Enter the board&apos;s width and height in the settings to draw it
        </div>
      )}
      {area ? <div className="mt-2 text-xs text-dim">Board area <span className="font-semibold tabular-nums text-ink">{area}</span></div> : null}
      {specs.length ? (
        <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {specs.map(([term, value]) => (
            <React.Fragment key={term}>
              <dt className="text-dim">{term}</dt>
              <dd className="m-0 font-medium text-ink">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      ) : null}
    </Shell>
  );
};

// ---- Colour palette ------------------------------------------------------

export const PaletteBlock = ({ data, editable, onChange }) => {
  const swatches = useMemo(() => sanitizeSwatches(data.swatches), [data.swatches]);
  const { matched, total } = matchedCount(swatches);
  const update = (swId, changes) => onChange({ swatches: swatches.map((s) => (s.id === swId ? { ...s, ...changes } : s)) });
  const full = swatches.length >= PRINTING_LIMITS.swatches;

  return (
    <Shell className="w-[440px]">
      <div className="flex items-center justify-between gap-2">
        <Label>{data.label}</Label>
        {total ? <span className="mb-2 shrink-0 text-[11px] tabular-nums text-dim">{matched} of {total} matched</span> : null}
      </div>
      {swatches.length ? (
        <ul className="m-0 grid grid-cols-2 gap-2 p-0">
          {swatches.map((s) => {
            const color = swatchColor(s);
            const hexOk = !s.hex || normalizeHex(s.hex);
            const cmykOk = !s.cmyk || parseCmyk(s.cmyk);
            return (
              <li key={s.id} className="list-none overflow-hidden rounded-lg border border-line">
                <div
                  className="flex h-14 items-end justify-between px-2 py-1 text-[11px] font-semibold"
                  style={{ background: color || 'transparent', color: readableOn(color) }}
                  data-swatch-color={color || ''}
                >
                  <span className="truncate">{s.name || 'Unnamed'}</span>
                  {color ? <span className="tabular-nums">{color}</span> : null}
                </div>
                <div className="space-y-0.5 p-1.5">
                  {editable ? (
                    <>
                      <CommitField value={s.name} onCommit={(v) => update(s.id, { name: v })} placeholder="Name" className={smallField} aria-label="Colour name" />
                      <CommitField value={s.hex} onCommit={(v) => update(s.id, { hex: v })} placeholder="HEX  #D62828" className={`${smallField} ${hexOk ? '' : '!border-danger'}`} aria-label="HEX" aria-invalid={hexOk ? undefined : true} />
                      <CommitField value={s.cmyk} onCommit={(v) => update(s.id, { cmyk: v })} placeholder="CMYK  0 90 90 10" className={`${smallField} ${cmykOk ? '' : '!border-danger'}`} aria-label="CMYK" aria-invalid={cmykOk ? undefined : true} />
                      <CommitField value={s.pantone} onCommit={(v) => update(s.id, { pantone: v })} placeholder="Pantone  186 C" className={smallField} aria-label="Pantone" />
                    </>
                  ) : (
                    <dl className="m-0 space-y-0.5 text-[11px]">
                      {s.cmyk ? <div className="flex justify-between"><dt className="text-dim">CMYK</dt><dd className="m-0 tabular-nums text-ink">{s.cmyk}</dd></div> : null}
                      {s.pantone ? <div className="flex justify-between"><dt className="text-dim">Pantone</dt><dd className="m-0 text-ink">{s.pantone}</dd></div> : null}
                    </dl>
                  )}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <label className={`flex items-center gap-1.5 text-[11px] ${s.matched ? 'font-medium text-success' : 'text-dim'}`}>
                      <input
                        type="checkbox"
                        checked={s.matched}
                        disabled={!editable}
                        onChange={(e) => update(s.id, { matched: e.target.checked })}
                        className="nodrag h-3.5 w-3.5"
                      />
                      {s.matched ? 'Matched' : 'Not matched'}
                    </label>
                    {editable ? (
                      <button type="button" onClick={() => onChange({ swatches: swatches.filter((x) => x.id !== s.id) })} aria-label={`Remove ${s.name || 'colour'}`} className="nodrag rounded p-1 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-dim">No colours yet</div>
      )}
      {editable ? (
        <button
          type="button"
          disabled={full}
          onClick={() => onChange({ swatches: [...swatches, { id: newId('sw'), name: '', hex: '', cmyk: '', pantone: '', matched: false }] })}
          className={`${smallButton} mt-2`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          {full ? `Up to ${PRINTING_LIMITS.swatches} colours` : 'Add colour'}
        </button>
      ) : null}
    </Shell>
  );
};

// ---- Material swatch board -----------------------------------------------

export const SwatchBoardBlock = ({ id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage }) => {
  const items = useMemo(() => sanitizeMaterials(data.items), [data.items]);
  const picker = useImagePicker({ upload, workspaceId, nodeId: id, taskId, subtaskId });
  const update = (itemId, changes) => onChange({ items: items.map((m) => (m.id === itemId ? { ...m, ...changes } : m)) });
  const full = items.length >= PRINTING_LIMITS.materials;

  return (
    <Shell className="w-[440px]">
      <Label>{data.label}</Label>
      {picker.input}
      {items.length ? (
        <ul className="m-0 grid grid-cols-2 gap-2 p-0">
          {items.map((m) => (
            <li key={m.id} className="list-none overflow-hidden rounded-lg border border-line">
              <div className="group/mat relative aspect-[4/3] bg-canvas">
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt={m.name || `${m.type} sample`} className="h-full w-full object-cover" loading="lazy" />
                ) : editable ? (
                  <button type="button" disabled={picker.busy} onClick={() => picker.pick((url) => update(m.id, { imageUrl: url }))} className="nodrag flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-dim hover:text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-info">
                    {picker.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                    Add photo
                  </button>
                ) : (
                  <span className="flex h-full items-center justify-center text-[11px] text-dim">No photo</span>
                )}
                <span className="pointer-events-none absolute left-1 top-1 rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">{m.type}</span>
              </div>
              <div className="space-y-0.5 p-1.5">
                {editable ? (
                  <>
                    <CommitField value={m.name} onCommit={(v) => update(m.id, { name: v })} placeholder="Material name" className={`${smallField} font-semibold`} aria-label="Material name" />
                    <select value={m.type} onChange={(e) => update(m.id, { type: e.target.value })} aria-label="Material type" className="nodrag w-full rounded border border-line bg-surface px-1 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-info">
                      {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <CommitField value={m.finish} onCommit={(v) => update(m.id, { finish: v })} placeholder="Finish (matte, gloss ...)" className={smallField} aria-label="Finish" />
                    <CommitField value={m.thickness} onCommit={(v) => update(m.id, { thickness: v })} placeholder="Thickness (3 mm)" className={smallField} aria-label="Thickness" />
                    <CommitField value={m.supplier} onCommit={(v) => update(m.id, { supplier: v })} placeholder="Supplier" className={smallField} aria-label="Supplier" />
                    <div className="flex justify-between pt-0.5">
                      {m.imageUrl ? (
                        <button type="button" onClick={() => picker.pick((url) => update(m.id, { imageUrl: url }))} className={smallButton}>Replace photo</button>
                      ) : <span />}
                      <button type="button" onClick={() => onChange({ items: items.filter((x) => x.id !== m.id) })} aria-label={`Remove ${m.name || 'material'}`} className="nodrag rounded p-1 text-dim hover:text-danger focus:outline-none focus:ring-2 focus:ring-info">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-ink">{m.name || 'Unnamed material'}</div>
                    {[['Finish', m.finish], ['Thickness', m.thickness], ['Supplier', m.supplier]].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px]"><span className="text-dim">{k}</span><span className="text-ink">{v}</span></div>
                    ))}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-dim">No materials yet</div>
      )}
      {editable ? (
        <button
          type="button"
          disabled={full}
          onClick={() => onChange({ items: [...items, { id: newId('mat'), name: '', type: 'Vinyl', imageUrl: '', finish: '', thickness: '', supplier: '' }] })}
          className={`${smallButton} mt-2`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          {full ? `Up to ${PRINTING_LIMITS.materials} materials` : 'Add material'}
        </button>
      ) : null}
      <ErrorLine message={picker.error} />
    </Shell>
  );
};
