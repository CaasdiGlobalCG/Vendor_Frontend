import React, { useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertOctagon, AlertTriangle, CalendarRange, CheckCircle2, ExternalLink, ImagePlus, Info,
  Loader2, MapPin, Star, Trash2,
} from 'lucide-react';
import authFetch from '../../../../utils/authFetch';
import { getActiveCanvasScope } from '../../utils/nodePersistence';
import {
  TONE_CLASSES,
  SIGNATURE_BOX,
  PHOTO_LIMITS,
  clampRating,
  ratingMax,
  code128Bars,
  dateRangeInfo,
  formatMeasure,
  getCalloutTone,
  mapEmbedUrl,
  mapsUrl,
  parseCoordinate,
  parseDay,
  sanitizeStrokes,
  strokesToPath,
  visiblePhotos,
} from '../../utils/blockElements';
import { CommitField } from './blockControls';

/** Visual parts of the signature, photos, location, rating, date range, measure, code and callout blocks. */

export const Shell = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-line bg-surface p-3 shadow-node ${className}`}>{children}</div>
);

export const Label = ({ icon: Icon, children }) =>
  children ? (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-dim">
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{children}</span>
    </div>
  ) : null;

const formatDay = (value) => {
  const d = parseDay(value);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

// ---- Signature -----------------------------------------------------------

export const SignatureBlock = ({ data, editable, onChange }) => {
  const svgRef = useRef(null);
  const [live, setLive] = useState(null); // strokes while drawing
  const strokes = live || sanitizeStrokes(data.strokes);
  const path = strokesToPath(strokes);
  const signed = path !== '';

  const point = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = rect.width ? SIGNATURE_BOX.w / rect.width : 1;
    const sy = rect.height ? SIGNATURE_BOX.h / rect.height : 1;
    return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
  };

  const start = (e) => {
    if (!editable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setLive([...sanitizeStrokes(data.strokes), [point(e)]]);
  };
  const move = (e) => {
    if (!live) return;
    const last = live[live.length - 1];
    const [x, y] = point(e);
    const [px, py] = last[last.length - 1];
    if (Math.hypot(x - px, y - py) < 1.5) return; // ignore sub-pixel jitter
    setLive([...live.slice(0, -1), [...last, [x, y]]]);
  };
  const end = () => {
    if (!live) return;
    onChange({ strokes: sanitizeStrokes(live), signedAt: new Date().toISOString() });
    setLive(null);
  };

  const signedAt = data.signedAt ? new Date(data.signedAt) : null;
  return (
    <Shell className="w-[340px]">
      <Label>{data.label}</Label>
      <div className="relative overflow-hidden rounded-lg border border-dashed border-line bg-canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIGNATURE_BOX.w} ${SIGNATURE_BOX.h}`}
          className={`nodrag nopan block w-full ${editable ? 'cursor-crosshair touch-none' : ''}`}
          style={{ aspectRatio: `${SIGNATURE_BOX.w} / ${SIGNATURE_BOX.h}` }}
          role="img"
          aria-label={signed ? 'Signature' : 'Signature pad, empty'}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <line x1="16" y1={SIGNATURE_BOX.h - 28} x2={SIGNATURE_BOX.w - 16} y2={SIGNATURE_BOX.h - 28} stroke="rgb(var(--border-subtle))" strokeWidth="1" />
          {signed ? (
            <path d={path} fill="none" stroke="rgb(var(--text-primary))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </svg>
        {!signed && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-dim">
            {editable ? 'Sign here' : 'Not signed yet'}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2 text-xs">
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{data.signerName || (signed ? 'Signed' : '')}</div>
          {data.role ? <div className="truncate text-dim">{data.role}</div> : null}
          {signed && signedAt && !Number.isNaN(signedAt.getTime()) ? (
            <div className="text-dim">{signedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
          ) : null}
        </div>
        {editable && signed ? (
          <button
            type="button"
            onClick={() => onChange({ strokes: [], signedAt: null })}
            className="nodrag shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-dim transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-info"
          >
            Clear
          </button>
        ) : null}
      </div>
    </Shell>
  );
};

// ---- Photos --------------------------------------------------------------

/**
 * Uploads to the same workspace file store the Image element uses; resolves to an https address.
 * Files are stored per subtask, so a task and subtask are sent with the file: the one open on the
 * canvas, or else the one the element was created in.
 */
export const uploadWorkspaceImage = async (file, { workspaceId, nodeId, taskId, subtaskId }) => {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10 MB');
  const active = getActiveCanvasScope();
  // The subtask on screen wins: a node copied from another subtask still carries the old ids
  const scope = { taskId: active.subtaskId ? active.taskId : taskId, subtaskId: active.subtaskId || subtaskId };
  if (!scope.subtaskId) throw new Error('Open a subtask to upload files. Files are saved inside a subtask.');
  const form = new FormData();
  form.append('file', file);
  form.append('workspaceId', workspaceId);
  form.append('nodeId', nodeId);
  form.append('fileType', 'image-block');
  if (scope.taskId) form.append('taskId', scope.taskId);
  form.append('subtaskId', scope.subtaskId);
  const response = await authFetch('/api/workspace-files/upload', { method: 'POST', body: form, credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Upload failed');
  }
  const result = await response.json();
  const url = result.file?.s3Url || result.s3Url || result.url;
  if (!url) throw new Error('Upload did not return an address');
  return url;
};

export const PhotosBlock = ({ id, data, editable, onChange, workspaceId, taskId, subtaskId, upload = uploadWorkspaceImage }) => {
  const mode = data.mode === 'beforeafter' ? 'beforeafter' : 'grid';
  const limit = PHOTO_LIMITS[mode];
  const photos = useMemo(() => visiblePhotos(data.photos, mode), [data.photos, mode]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const targetSlot = useRef(0);

  const choose = (slot) => {
    targetSlot.current = slot;
    inputRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await upload(file, { workspaceId, nodeId: id, taskId, subtaskId });
      const next = [...photos];
      next[Math.min(targetSlot.current, limit - 1)] = { url, caption: next[targetSlot.current]?.caption || '' };
      onChange({ photos: next.filter(Boolean) });
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const setCaption = (slot, caption) => {
    onChange({ photos: photos.map((p, i) => (i === slot ? { ...p, caption } : p)) });
  };
  const remove = (slot) => onChange({ photos: photos.filter((_, i) => i !== slot) });

  const slotCount = mode === 'beforeafter' ? 2 : Math.min(limit, Math.max(photos.length + (editable ? 1 : 0), 1));
  const slotLabels = mode === 'beforeafter' ? ['Before', 'After'] : [];

  return (
    <Shell className={mode === 'beforeafter' ? 'w-[400px]' : 'w-[380px]'}>
      <Label icon={ImagePlus}>{data.label}</Label>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-label="Choose photo" />
      <div className={`grid gap-2 ${mode === 'beforeafter' ? 'grid-cols-2' : 'grid-cols-3'}`} data-photo-mode={mode}>
        {Array.from({ length: slotCount }).map((_, slot) => {
          const photo = photos[slot];
          return (
            <figure key={slot} className="m-0 min-w-0">
              <div className="group/photo relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-canvas">
                {photo ? (
                  <>
                    <img src={photo.url} alt={photo.caption || slotLabels[slot] || `Photo ${slot + 1}`} className="h-full w-full object-cover" loading="lazy" />
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => remove(slot)}
                        aria-label={`Remove photo ${slot + 1}`}
                        className="nodrag absolute right-1 top-1 rounded-md bg-surface/90 p-1 text-dim opacity-0 shadow-node transition-opacity hover:text-danger focus:opacity-100 group-hover/photo:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </>
                ) : editable ? (
                  <button
                    type="button"
                    onClick={() => choose(slot)}
                    disabled={busy}
                    className="nodrag flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-dim transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-info disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {slotLabels[slot] ? `Add ${slotLabels[slot].toLowerCase()} photo` : 'Add photo'}
                  </button>
                ) : (
                  <span className="flex h-full items-center justify-center text-[11px] text-dim">No photo</span>
                )}
                {slotLabels[slot] ? (
                  <span className="pointer-events-none absolute left-1 top-1 rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
                    {slotLabels[slot]}
                  </span>
                ) : null}
              </div>
              {photo && editable ? (
                <CommitField
                  value={photo.caption}
                  onCommit={(v) => setCaption(slot, v)}
                  placeholder="Caption"
                  className="nodrag mt-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-ink outline-none placeholder:text-dim hover:border-line focus:border-info"
                />
              ) : photo?.caption ? (
                <figcaption className="mt-1 truncate text-[11px] text-dim">{photo.caption}</figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
      {error ? <div role="alert" className="mt-2 text-xs text-danger">{error}</div> : null}
    </Shell>
  );
};

// ---- Location ------------------------------------------------------------

export const LocationBlock = ({ data }) => {
  const embed = mapEmbedUrl(data.lat, data.lng);
  const link = mapsUrl(data.lat, data.lng, data.address);
  const hasCoords = parseCoordinate(data.lat, 'lat') !== null && parseCoordinate(data.lng, 'lng') !== null;
  return (
    <Shell className="w-[340px]">
      <Label icon={MapPin}>{data.label}</Label>
      <div className="overflow-hidden rounded-lg border border-line bg-canvas" style={{ height: 170 }}>
        {embed ? (
          <iframe
            title={data.label || 'Map'}
            src={embed}
            className="nodrag h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-xs text-dim">
            <MapPin className="h-5 w-5" aria-hidden="true" />
            Add latitude and longitude in the settings to show the map
          </div>
        )}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2 text-xs">
        <div className="min-w-0">
          {data.address ? <div className="font-medium text-ink">{data.address}</div> : null}
          {hasCoords ? (
            <div className="tabular-nums text-dim">
              {parseCoordinate(data.lat, 'lat').toFixed(5)}, {parseCoordinate(data.lng, 'lng').toFixed(5)}
            </div>
          ) : null}
        </div>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="nodrag inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-info transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-info"
          >
            Open in Maps
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </Shell>
  );
};

// ---- Rating --------------------------------------------------------------

export const RatingBlock = ({ data, editable, onChange }) => {
  const max = ratingMax(data.max);
  const value = clampRating(data.value, max);
  return (
    <Shell className="min-w-[220px]">
      <Label>{data.label}</Label>
      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label={data.label || 'Rating'} className="flex items-center gap-0.5">
          {Array.from({ length: max }).map((_, i) => {
            const n = i + 1;
            const on = n <= value;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={n === value}
                aria-label={`${n} of ${max}`}
                disabled={!editable}
                onClick={() => onChange({ value: n === value ? 0 : n })}
                className={`nodrag rounded p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-info ${editable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <Star
                  className={`h-5 w-5 ${on ? 'fill-warning text-warning' : 'text-dim'}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
        <span className="text-sm font-semibold tabular-nums text-ink">{value} / {max}</span>
      </div>
    </Shell>
  );
};

// ---- Date range ----------------------------------------------------------

export const DateRangeBlock = ({ data }) => {
  const info = dateRangeInfo(data.start, data.end);
  let chip = null;
  if (info.reversed) chip = ['danger', 'End is before start'];
  else if (info.state === 'upcoming') chip = ['info', info.daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${info.daysUntil} days`];
  else if (info.state === 'active') chip = ['success', info.daysLeft === 0 ? 'Last day' : `${info.daysLeft} days left`];
  else if (info.state === 'ended') chip = ['neutral', 'Ended'];
  const tone = chip ? TONE_CLASSES[chip[0]] : null;
  return (
    <Shell className="w-[280px]">
      <Label icon={CalendarRange}>{data.label}</Label>
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span>{formatDay(data.start) || 'Start date'}</span>
        <span className="text-dim" aria-hidden="true">→</span>
        <span>{formatDay(data.end) || 'End date'}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {info.valid ? <span className="tabular-nums text-dim">{info.days} {info.days === 1 ? 'day' : 'days'}</span> : null}
        {chip ? <span className={`inline-flex rounded-full border px-2 py-0.5 font-medium ${tone.chip}`}>{chip[1]}</span> : null}
      </div>
    </Shell>
  );
};

// ---- Number with unit ----------------------------------------------------

export const MeasureBlock = ({ data }) => {
  const value = formatMeasure(data.value);
  return (
    <Shell className="min-w-[200px]">
      <Label>{data.label}</Label>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{value || '—'}</span>
        {value && data.unit ? <span className="text-sm font-medium text-dim">{data.unit}</span> : null}
      </div>
    </Shell>
  );
};

// ---- QR code / barcode ---------------------------------------------------

const QR_MAX_CHARS = 500;

const qrMatrix = (text) => {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    return { size: qr.modules.size, get: (r, c) => qr.modules.get(r, c) };
  } catch {
    return null;
  }
};

export const CodeBlock = ({ data }) => {
  const value = String(data.value ?? '');
  const isQr = data.format !== 'barcode';

  const qr = useMemo(() => (isQr && value && value.length <= QR_MAX_CHARS ? qrMatrix(value) : null), [isQr, value]);
  const barcode = useMemo(() => (!isQr && value ? code128Bars(value) : null), [isQr, value]);

  let problem = '';
  if (value) {
    if (isQr && !qr) problem = value.length > QR_MAX_CHARS ? `Too long for a QR code (max ${QR_MAX_CHARS} characters)` : 'Could not make a QR code from this text';
    if (!isQr && !barcode) problem = 'Barcodes take up to 40 letters, numbers and symbols (no accents or emoji)';
  }

  return (
    <Shell className="w-[220px]">
      <Label>{data.label}</Label>
      <div className="flex items-center justify-center rounded-lg border border-line bg-white p-2" style={{ minHeight: 140 }}>
        {qr ? (
          <svg viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} className="h-[150px] w-[150px]" role="img" aria-label={`QR code for ${value}`} shapeRendering="crispEdges">
            <rect x="-2" y="-2" width={qr.size + 4} height={qr.size + 4} fill="#fff" />
            {Array.from({ length: qr.size }).flatMap((_, r) =>
              Array.from({ length: qr.size }).map((__, c) => (qr.get(r, c) ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000" /> : null))
            )}
          </svg>
        ) : barcode ? (
          <svg viewBox={`0 0 ${barcode.width} 60`} className="h-[84px] w-full" role="img" aria-label={`Barcode for ${value}`} preserveAspectRatio="none" shapeRendering="crispEdges">
            <rect width={barcode.width} height="60" fill="#fff" />
            {barcode.bars.map((b, i) => <rect key={i} x={b.x} y="0" width={b.w} height="60" fill="#000" />)}
          </svg>
        ) : (
          <span className="px-2 text-center text-xs text-dim">{problem || 'Enter the text to encode in the settings'}</span>
        )}
      </div>
      {value && !problem ? <div className="mt-2 break-all text-center text-xs tabular-nums text-ink">{value}</div> : null}
      {problem && value ? <div role="alert" className="mt-2 text-xs text-danger">{problem}</div> : null}
    </Shell>
  );
};

// ---- Callout -------------------------------------------------------------

const CALLOUT_ICONS = { info: Info, warning: AlertTriangle, success: CheckCircle2, danger: AlertOctagon };

export const CalloutBlock = ({ data }) => {
  const tone = getCalloutTone(data.tone);
  const Icon = CALLOUT_ICONS[tone.id] || Info;
  const classes = TONE_CLASSES[tone.id] || TONE_CLASSES.info;
  return (
    <div
      role={tone.id === 'danger' || tone.id === 'warning' ? 'alert' : 'note'}
      className={`flex w-[360px] gap-3 rounded-xl border p-3 shadow-node ${classes.chip}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {data.title ? <div className="text-sm font-semibold">{data.title}</div> : null}
        {data.text ? <div className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{data.text}</div> : null}
      </div>
    </div>
  );
};
