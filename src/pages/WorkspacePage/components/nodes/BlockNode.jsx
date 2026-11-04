import React, { useCallback, useMemo, useState } from 'react';
import { useReactFlow, useStore } from 'reactflow';
import { AlignLeft, AlignCenter, AlignRight, TrendingUp, TrendingDown, Minus, Link2, ArrowUpRight } from 'lucide-react';
import NodeHandles from './NodeHandles';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import { inputClasses, selectClasses } from '../ui/controlStyles';
import { CommitField, Row, Segment, UrlField } from './blockControls';
import { ShapeBlock, LinkBlock, EmbedBlock, CountdownBlock, CommentPin } from './blockViews';
import {
  SignatureBlock, PhotosBlock, LocationBlock, RatingBlock, DateRangeBlock, MeasureBlock, CodeBlock, CalloutBlock,
} from './blockInputViews';
import InputBlockSettings from './blockInputSettings';
import { ProofBlock, ArtworkBlock, ElevationBlock, PaletteBlock, SwatchBoardBlock } from './printingViews';
import PrintingBlockSettings from './printingSettings';
import { PRINTING_KINDS } from '../../utils/printingElements';
import { BatchBlock, ShelfLifeBlock, TempLogBlock, LicenceBlock, RecallBlock } from './foodViews';
import FoodBlockSettings from './foodSettings';
import { FOOD_KINDS } from '../../utils/foodElements';
import { ScopeBlock, FinishBlock, FurnitureBlock, MoodboardBlock, SiteMeasureBlock } from './interiorViews';
import InteriorBlockSettings from './interiorSettings';
import { INTERIOR_KINDS } from '../../utils/interiorElements';
import { SnagBlock, SiteInspectBlock, PourBlock, MeasureBookBlock, RaBillBlock, PermitBlock } from './constructionViews';
import ConstructionBlockSettings from './constructionSettings';
import { CONSTRUCTION_KINDS } from '../../utils/constructionElements';
import { useWorkspaceProgress } from '../../utils/WorkspaceProgressContext';
import { resolveLink, statusFromProgress } from '../../utils/taskProgress';
import {
  STATUS_OPTIONS,
  TONE_CLASSES,
  HEADING_SIZES,
  DIVIDER_STYLES,
  getStatusOption,
  progressPercent,
  progressTone,
  describeDelta,
  sparklinePoints,
  isDecorativeBlock,
  INPUT_KINDS,
  SHAPE_FILLS,
} from '../../utils/blockElements';

// <input type=datetime-local> works in local time without a zone
const toLocalInput = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Settings popover shown under a selected block. */
/** "Linked to" picker: take the numbers from the checklists in the tasks, or type them in. */
const LinkField = ({ data, patch }) => {
  const { tasks } = useWorkspaceProgress();
  const link = data.link;
  const value = !link?.scope ? '' : link.scope === 'workspace' ? 'workspace' : `task:${link.taskName || ''}`;
  const names = [...new Set((tasks || []).map((t) => t.name).filter(Boolean))];
  return (
    <Row label="Take it from your tasks">
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) patch({ link: null });
          else if (v === 'workspace') patch({ link: { scope: 'workspace' } });
          else patch({ link: { scope: 'task', taskName: v.slice(5) } });
        }}
        className={selectClasses()}
      >
        <option value="">No: I will type it in</option>
        <option value="workspace">Yes: the whole project</option>
        {names.map((n) => (
          <option key={n} value={`task:${n}`}>Yes: {n}</option>
        ))}
        {value.startsWith('task:') && !names.includes(value.slice(5)) && <option value={value}>{value.slice(5)} (not found)</option>}
      </select>
      {link?.scope ? <span className="mt-1 block text-xs text-dim">Worked out from the ticked items on the checklists in those tasks.</span> : null}
    </Row>
  );
};

const Settings = ({ data, patch }) => {
  const kind = data.kind;
  const field = inputClasses();
  return (
    <div
      className="nodrag nowheel nopan absolute left-0 top-full z-50 mt-2 w-72 space-y-3 rounded-xl border border-line bg-surface p-3 shadow-pop"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      data-testid="block-settings"
    >
      {kind === 'heading' && (
        <>
          <Row label="Text">
            <CommitField value={data.text} onCommit={(v) => patch({ text: v })} className={field} />
          </Row>
          <Row label="Size">
            <Segment
              label="Heading size"
              value={data.level || 'h2'}
              onChange={(level) => patch({ level })}
              options={Object.entries(HEADING_SIZES).map(([value, s]) => ({ value, title: s.label }))}
            />
          </Row>
          <Row label="Align">
            <Segment
              label="Alignment"
              value={data.align || 'left'}
              onChange={(align) => patch({ align })}
              options={[
                { value: 'left', title: 'Left', content: <AlignLeft className="h-3.5 w-3.5" /> },
                { value: 'center', title: 'Centre', content: <AlignCenter className="h-3.5 w-3.5" /> },
                { value: 'right', title: 'Right', content: <AlignRight className="h-3.5 w-3.5" /> },
              ]}
            />
          </Row>
        </>
      )}

      {kind === 'divider' && (
        <>
          <Row label="Direction">
            <Segment
              label="Direction"
              value={data.orientation || 'horizontal'}
              onChange={(orientation) => patch({ orientation })}
              options={[
                { value: 'horizontal', title: 'Horizontal' },
                { value: 'vertical', title: 'Vertical' },
              ]}
            />
          </Row>
          <Row label="Line">
            <Segment
              label="Line style"
              value={data.lineStyle || 'solid'}
              onChange={(lineStyle) => patch({ lineStyle })}
              options={DIVIDER_STYLES.map((value) => ({ value, title: value[0].toUpperCase() + value.slice(1) }))}
            />
          </Row>
          <Row label="Length">
            <Segment
              label="Length"
              value={Number(data.length) || 360}
              onChange={(length) => patch({ length })}
              options={[240, 360, 600, 900].map((value) => ({ value, title: String(value) }))}
            />
          </Row>
        </>
      )}

      {kind === 'status' && (
        <>
          <Row label="Label">
            <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
          </Row>
          <LinkField data={data} patch={patch} />
          {!data.link?.scope && (
            <Row label="Status">
              <select
                value={data.status}
                onChange={(e) => patch({ status: e.target.value })}
                className={selectClasses()}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Row>
          )}
          <Row label="Note">
            <CommitField value={data.note} onCommit={(v) => patch({ note: v })} className={field} placeholder="Optional" />
          </Row>
        </>
      )}

      {kind === 'progress' && (
        <>
          <Row label="Label">
            <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
          </Row>
          <LinkField data={data} patch={patch} />
          {!data.link?.scope && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Row label="Done">
                  <CommitField value={String(data.value ?? '')} onCommit={(v) => patch({ value: v })} inputMode="decimal" className={field} />
                </Row>
                <Row label="Out of">
                  <CommitField value={String(data.target ?? 100)} onCommit={(v) => patch({ target: v })} inputMode="decimal" className={field} />
                </Row>
              </div>
              <Row label="Unit">
                <CommitField value={data.unit} onCommit={(v) => patch({ unit: v })} className={field} placeholder="%, m², kg ..." />
              </Row>
            </>
          )}
        </>
      )}

      {kind === 'shape' && (
        <>
          <Row label="Fill">
            <Segment
              label="Fill colour"
              value={data.fill || 'neutral'}
              onChange={(fill) => patch({ fill })}
              options={SHAPE_FILLS.map((f) => ({ value: f.id, title: f.label }))}
            />
          </Row>
          {data.shape !== 'arrow' && (
            <Row label="Text">
              <CommitField value={data.text} onCommit={(v) => patch({ text: v })} className={field} placeholder="Label inside the shape" />
            </Row>
          )}
        </>
      )}

      {kind === 'embed' && (
        <>
          <Row label={data.embedType === 'web' ? 'Page address' : 'Video address'}>
            <UrlField
              value={data.url}
              onCommit={(url) => patch({ url })}
              placeholder={data.embedType === 'web' ? 'Figma or Google Docs link' : 'YouTube, Loom or Vimeo link'}
            />
          </Row>
          <Row label="Title">
            <CommitField value={data.title} onCommit={(v) => patch({ title: v })} className={field} placeholder="Optional" />
          </Row>
        </>
      )}

      {kind === 'link' && (
        <>
          <Row label="Address">
            <UrlField value={data.url} onCommit={(url) => patch({ url })} />
          </Row>
          <Row label="Title">
            <CommitField value={data.title} onCommit={(v) => patch({ title: v })} className={field} placeholder="Defaults to the site name" />
          </Row>
          <Row label="Description">
            <CommitField value={data.description} onCommit={(v) => patch({ description: v })} className={field} placeholder="Optional" />
          </Row>
        </>
      )}

      {kind === 'countdown' && (
        <>
          <Row label="Label">
            <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
          </Row>
          <Row label="Counts down to">
            <CommitField
              type="datetime-local"
              value={toLocalInput(data.target)}
              onCommit={(v) => { const d = new Date(v); if (!Number.isNaN(d.getTime())) patch({ target: d.toISOString() }); }}
              className={field}
            />
          </Row>
        </>
      )}

      {INPUT_KINDS.includes(kind) && <InputBlockSettings kind={kind} data={data} patch={patch} />}
      {PRINTING_KINDS.includes(kind) && <PrintingBlockSettings kind={kind} data={data} patch={patch} />}
      {FOOD_KINDS.includes(kind) && <FoodBlockSettings kind={kind} data={data} patch={patch} />}
      {INTERIOR_KINDS.includes(kind) && <InteriorBlockSettings kind={kind} data={data} patch={patch} />}
      {CONSTRUCTION_KINDS.includes(kind) && <ConstructionBlockSettings kind={kind} data={data} patch={patch} />}

      {kind === 'kpi' && (
        <>
          <Row label="Label">
            <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
          </Row>
          <div className="grid grid-cols-3 gap-2">
            <Row label="Prefix">
              <CommitField value={data.prefix} onCommit={(v) => patch({ prefix: v })} className={field} />
            </Row>
            <div className="col-span-1">
              <Row label="Value">
                <CommitField value={data.value} onCommit={(v) => patch({ value: v })} className={field} />
              </Row>
            </div>
            <Row label="Suffix">
              <CommitField value={data.suffix} onCommit={(v) => patch({ suffix: v })} className={field} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Change %">
              <CommitField value={String(data.delta ?? '')} onCommit={(v) => patch({ delta: v })} inputMode="decimal" className={field} />
            </Row>
            <Row label="Compared to">
              <CommitField value={data.deltaLabel} onCommit={(v) => patch({ deltaLabel: v })} className={field} />
            </Row>
          </div>
          <Row label="Trend (comma separated)">
            <CommitField
              value={Array.isArray(data.trend) ? data.trend.join(', ') : data.trend}
              onCommit={(v) => patch({ trend: v.split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite) })}
              className={field}
              placeholder="12, 18, 15, 24"
            />
          </Row>
        </>
      )}
    </div>
  );
};

const Heading = ({ data, editable, patch }) => {
  const size = HEADING_SIZES[data.level] || HEADING_SIZES.h2;
  const [editing, setEditing] = useState(false);
  const alignClass = data.align === 'center' ? 'text-center' : data.align === 'right' ? 'text-right' : 'text-left';
  if (editing && editable) {
    return (
      <CommitField
        autoFocus
        value={data.text}
        onCommit={(text) => { patch({ text }); setEditing(false); }}
        onBlurCapture={() => setEditing(false)}
        className={`nodrag w-full bg-transparent text-ink outline-none ${size.className} ${alignClass}`}
      />
    );
  }
  return (
    <h2
      className={`m-0 w-full text-ink ${size.className} ${alignClass} ${editable ? 'cursor-text' : ''}`}
      onDoubleClick={() => editable && setEditing(true)}
      title={editable ? 'Double-click to edit' : undefined}
    >
      {data.text || (editable ? <span className="text-dim">Heading</span> : null)}
    </h2>
  );
};

const Divider = ({ data }) => {
  const vertical = data.orientation === 'vertical';
  const length = Number(data.length) || 360;
  const style = DIVIDER_STYLES.includes(data.lineStyle) ? data.lineStyle : 'solid';
  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      className="flex items-center justify-center"
      style={vertical ? { width: 24, height: length } : { width: length, height: 24 }}
    >
      <div
        className=""
        style={
          vertical
            ? { height: '100%', borderLeftWidth: 2, borderLeftStyle: style, borderColor: 'rgb(var(--text-muted) / 0.45)' }
            : { width: '100%', borderTopWidth: 2, borderTopStyle: style, borderColor: 'rgb(var(--text-muted) / 0.45)' }
        }
      />
    </div>
  );
};

/** Small tag shown when a block's numbers come from the tasks. */
/** Go to the task a linked block reads from (a task opens its steps; the whole project opens the Tasks list). */
export const openLinkedTask = (linked) =>
  window.dispatchEvent(
    new CustomEvent('workspace-open-task', {
      detail: { scope: linked.scope, taskId: linked.taskId, taskName: linked.taskName },
    })
  );

const LinkedTag = ({ linked }) => {
  const text = linked?.missing ? 'Task not found' : linked?.hasData ? `From ${linked.label}` : `From ${linked?.label}: nothing to tick yet`;
  if (!linked || linked.missing) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-dim" title="The linked task was not found, so the typed-in value is shown">
        <Link2 className="h-3 w-3" aria-hidden="true" />
        {text}
      </span>
    );
  }
  const wholeProject = linked.scope === 'workspace';
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); openLinkedTask(linked); }}
      className="nodrag inline-flex items-center gap-1 rounded text-[10px] font-medium text-dim underline-offset-2 transition-colors hover:text-info hover:underline focus:outline-none focus:ring-2 focus:ring-info"
      title={wholeProject ? 'Open the Tasks list' : `Open the task "${linked.label}" to see its steps`}
    >
      <Link2 className="h-3 w-3" aria-hidden="true" />
      {text}
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    </button>
  );
};

/**
 * A linked block you cannot edit (view-only, client view) goes to its task when you click anywhere on it.
 * When you can edit, a click selects the block (to change its settings), so only the link line opens the task.
 */
const clickThrough = (linked, editable) =>
  linked && !linked.missing && !editable
    ? { onClick: () => openLinkedTask(linked), style: { cursor: 'pointer' }, role: 'link', tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter') openLinkedTask(linked); } }
    : {};

/**
 * Reads the workspace's tasks only for blocks that are linked, so ordinary blocks
 * are not redrawn every time something on the canvas changes.
 * `children` gets the block's data with the linked numbers applied.
 */
const LinkedData = ({ data, children }) => {
  const { tasks, live } = useWorkspaceProgress();
  const linked = useMemo(() => resolveLink(data.link, tasks, live), [data.link, tasks, live]);
  if (!linked || linked.missing || !linked.hasData) return children(data, linked);
  if (data.kind === 'progress') {
    return children({ ...data, value: linked.done, target: linked.total, unit: 'items' }, linked);
  }
  const status = statusFromProgress(linked) || data.status;
  return children({ ...data, status }, linked);
};

const StatusBadge = ({ data, linked, editable = true }) => {
  const option = getStatusOption(data.status);
  const tone = TONE_CLASSES[option.tone] || TONE_CLASSES.neutral;
  return (
    <div className="min-w-[220px] max-w-[320px] rounded-xl border border-line bg-surface p-3 shadow-node" {...clickThrough(linked, editable)}>
      {data.label ? <div className="mb-1.5 truncate text-xs font-medium text-dim">{data.label}</div> : null}
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${tone.chip}`}>
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden="true" />
        {option.label}
      </span>
      {data.note ? <div className="mt-2 text-xs text-dim">{data.note}</div> : null}
      {linked ? <div className="mt-2"><LinkedTag linked={linked} /></div> : null}
    </div>
  );
};

const ProgressBlock = ({ data, linked, editable = true }) => {
  const percent = progressPercent(data.value, data.target);
  const tone = TONE_CLASSES[progressTone(percent)];
  const unit = data.unit && data.unit !== '%' ? ` ${data.unit}` : '';
  return (
    <div className="w-[300px] rounded-xl border border-line bg-surface p-3 shadow-node" {...clickThrough(linked, editable)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-ink">{data.label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={data.label || 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-hover"
      >
        <div className={`h-full rounded-full transition-[width] duration-300 ${tone.bar}`} style={{ width: `${percent}%` }} />
      </div>
      {unit ? (
        <div className="mt-1.5 text-xs tabular-nums text-dim">{data.value}{unit} of {data.target}{unit}</div>
      ) : null}
      {linked ? <div className="mt-1.5"><LinkedTag linked={linked} /></div> : null}
    </div>
  );
};

const KpiCard = ({ data }) => {
  const delta = describeDelta(data.delta);
  const points = sparklinePoints(data.trend);
  const Icon = delta.sign === 'up' ? TrendingUp : delta.sign === 'down' ? TrendingDown : Minus;
  const deltaTone = delta.sign === 'up' ? TONE_CLASSES.success : delta.sign === 'down' ? TONE_CLASSES.danger : TONE_CLASSES.neutral;
  return (
    <div className="w-[280px] rounded-xl border border-line bg-surface p-4 shadow-node">
      <div className="truncate text-xs font-medium text-dim">{data.label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink">
        {data.prefix}{data.value}{data.suffix}
      </div>
      {points ? (
        <svg width="100%" height="28" viewBox="0 0 96 28" preserveAspectRatio="none" className="mt-2 block" aria-hidden="true">
          <polyline
            points={points}
            fill="none"
            stroke={delta.sign === 'down' ? 'rgb(var(--status-danger))' : 'rgb(var(--status-success))'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
      {delta.text ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-medium tabular-nums ${deltaTone.chip}`}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {delta.text}
          </span>
          {data.deltaLabel ? <span className="truncate text-dim">{data.deltaLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
};

/**
 * One canvas node for the "basics": heading, divider, status badge, progress
 * bar and KPI card. Select it to open its settings underneath.
 */
const BlockNode = ({ id, data, selected, isConnectable = true }) => {
  const { setNodes } = useReactFlow();
  // Settings belong to one block: with several selected (to align or move them) stay out of the way
  const selectedCount = useStore((s) => {
    if (!selected) return 0;
    let count = 0;
    s.nodeInternals.forEach((n) => { if (n.selected) count += 1; });
    return count;
  });
  const kind = data.kind || 'heading';
  const editable = !data.readOnly;
  const decorative = isDecorativeBlock(kind, data);

  // Show a change the server made and already stored (nothing is saved again from here)
  const applyServerPatch = useCallback(
    (changes) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...changes } } : n))),
    [id, setNodes]
  );

  const patch = useCallback(
    (changes) => {
      if (!editable) return;
      // Show the change immediately; persisting (live op to collaborators, or the
      // durable write when offline) follows.
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...changes } } : n)));
      if (data.workspaceId) persistNodeDataPatch(id, changes, setNodes, data.workspaceId);
    },
    [id, data.workspaceId, editable, setNodes]
  );

  return (
    <div
      className={`group relative rounded-xl ${
        selected && decorative ? 'outline outline-[1.5px] outline-offset-4 outline-info/60' : ''
      } ${selected && !decorative ? 'ring-[1.5px] ring-info' : ''}`}
      data-block-kind={kind}
    >
      {!decorative && <NodeHandles isConnectable={isConnectable} />}

      {kind === 'heading' && <div className="min-w-[160px]" style={{ width: Number(data.width) || 420 }}><Heading data={data} editable={editable} patch={patch} /></div>}
      {kind === 'divider' && <Divider data={data} />}
      {kind === 'status' &&
        (data.link?.scope ? <LinkedData data={data}>{(d, linked) => <StatusBadge data={d} linked={linked} editable={editable} />}</LinkedData> : <StatusBadge data={data} />)}
      {kind === 'progress' &&
        (data.link?.scope ? <LinkedData data={data}>{(d, linked) => <ProgressBlock data={d} linked={linked} editable={editable} />}</LinkedData> : <ProgressBlock data={data} />)}
      {kind === 'kpi' && <KpiCard data={data} />}
      {kind === 'shape' && <ShapeBlock data={data} selected={selected} editable={editable} onResizeEnd={patch} />}
      {kind === 'embed' && <EmbedBlock data={data} selected={selected} editable={editable} onResizeEnd={patch} />}
      {kind === 'link' && <LinkBlock data={data} />}
      {kind === 'countdown' && <CountdownBlock data={data} />}
      {kind === 'signature' && <SignatureBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'photos' && <PhotosBlock id={id} data={data} editable={editable} onChange={patch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'location' && <LocationBlock data={data} />}
      {kind === 'rating' && <RatingBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'daterange' && <DateRangeBlock data={data} />}
      {kind === 'measure' && <MeasureBlock data={data} />}
      {kind === 'code' && <CodeBlock data={data} />}
      {kind === 'callout' && <CalloutBlock data={data} />}
      {kind === 'proof' && <ProofBlock id={id} data={data} editable={editable} onChange={patch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'artwork' && <ArtworkBlock id={id} data={data} editable={editable} onChange={patch} onServerPatch={applyServerPatch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'elevation' && <ElevationBlock data={data} />}
      {kind === 'palette' && <PaletteBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'swatches' && <SwatchBoardBlock id={id} data={data} editable={editable} onChange={patch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'batch' && <BatchBlock id={id} data={data} editable={editable} onChange={patch} onServerPatch={applyServerPatch} />}
      {kind === 'shelflife' && <ShelfLifeBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'templog' && <TempLogBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'licence' && <LicenceBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'recall' && <RecallBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'scope' && <ScopeBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'finish' && <FinishBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'furniture' && <FurnitureBlock id={id} data={data} editable={editable} onChange={patch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'moodboard' && <MoodboardBlock id={id} data={data} editable={editable} onChange={patch} onServerPatch={applyServerPatch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'sitemeasure' && <SiteMeasureBlock id={id} data={data} editable={editable} onChange={patch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'snag' && <SnagBlock id={id} data={data} editable={editable} onChange={patch} workspaceId={data.workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} />}
      {kind === 'siteinspect' && <SiteInspectBlock id={id} data={data} editable={editable} onChange={patch} onServerPatch={applyServerPatch} />}
      {kind === 'pour' && <PourBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'mbook' && <MeasureBookBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'rabill' && <RaBillBlock data={data} editable={editable} onChange={patch} />}
      {kind === 'permit' && <PermitBlock id={id} data={data} editable={editable} onChange={patch} onServerPatch={applyServerPatch} />}
      {kind === 'comment' && <CommentPin id={id} data={data} selected={selected} editable={editable} onChange={patch} />}

      {selected && selectedCount <= 1 && editable && kind !== 'comment' && <Settings data={{ ...data, kind }} patch={patch} />}
    </div>
  );
};

export default React.memo(BlockNode);
