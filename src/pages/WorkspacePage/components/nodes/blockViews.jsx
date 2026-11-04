import React, { useContext, useEffect, useState } from 'react';
import { NodeResizer } from 'reactflow';
import { MessageCircle, ExternalLink, Link2, Video, Globe, Clock } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import CommentThread from '../comments/CommentThread';
import {
  TONE_CLASSES,
  safeHttpUrl,
  hostOf,
  embedSource,
  shapeColors,
  timeRemaining,
  countdownTone,
} from '../../utils/blockElements';

/** Visual parts of the shape, link, embed, comment and countdown blocks. */

const MIN_SHAPE = 48;

export const ShapeBlock = ({ data, selected, editable, onResizeEnd }) => {
  const [live, setLive] = useState(null);
  const width = live?.w ?? (Number(data.width) || 200);
  const height = live?.h ?? (Number(data.height) || 120);
  const colors = shapeColors(data.fill);
  const isArrow = data.shape === 'arrow';

  return (
    <div style={{ width, height }} className="relative" data-shape={data.shape}>
      {editable && (
        <NodeResizer
          isVisible={selected}
          minWidth={MIN_SHAPE}
          minHeight={isArrow ? 24 : MIN_SHAPE}
          lineClassName="!border-info"
          handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !border-white !bg-info"
          onResize={(_, p) => setLive({ w: Math.round(p.width), h: Math.round(p.height) })}
          onResizeEnd={(_, p) => {
            setLive(null);
            onResizeEnd({ width: Math.round(p.width), height: Math.round(p.height) });
          }}
        />
      )}
      <svg width="100%" height="100%" className="absolute inset-0 overflow-visible" aria-hidden="true">
        {data.shape === 'ellipse' && (
          <ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill={colors.fill} stroke={colors.stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        )}
        {data.shape === 'diamond' && (
          <polygon
            points={`${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}`}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
        {isArrow && (
          <>
            <line x1="2" y1={height / 2} x2={Math.max(width - 12, 4)} y2={height / 2} stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" />
            <polygon
              points={`${width - 1},${height / 2} ${width - 16},${height / 2 - 9} ${width - 16},${height / 2 + 9}`}
              fill={colors.stroke}
            />
          </>
        )}
        {(!data.shape || data.shape === 'rectangle') && (
          <rect x="1" y="1" width={Math.max(width - 2, 0)} height={Math.max(height - 2, 0)} rx="12" fill={colors.fill} stroke={colors.stroke} strokeWidth="2" />
        )}
      </svg>
      {!isArrow && data.text ? (
        <div className="absolute inset-0 flex items-center justify-center px-5 py-3 text-center text-sm font-medium text-ink">
          <span className="line-clamp-4 break-words">{data.text}</span>
        </div>
      ) : null}
    </div>
  );
};

export const LinkBlock = ({ data }) => {
  const safe = safeHttpUrl(data.url);
  const host = hostOf(data.url);
  return (
    <div className="flex w-[320px] items-start gap-3 rounded-xl border border-line bg-surface p-3 shadow-node">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
        <Link2 className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{data.title || host || 'Link card'}</div>
        {data.description ? <div className="mt-0.5 line-clamp-2 text-xs text-dim">{data.description}</div> : null}
        <div className="mt-1 truncate text-xs text-dim">{host || 'Add a web address in the settings'}</div>
      </div>
      {safe ? (
        <a
          href={safe}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="nodrag shrink-0 rounded-md p-1.5 text-dim transition-colors hover:bg-surface-hover hover:text-ink focus:outline-none focus:ring-2 focus:ring-info"
          aria-label={`Open ${host}`}
          title="Open link"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
};

export const EmbedBlock = ({ data, selected, editable, onResizeEnd }) => {
  const [live, setLive] = useState(null);
  const width = live?.w ?? (Number(data.width) || 480);
  const height = live?.h ?? (Number(data.height) || 300);
  const source = embedSource(data.url);
  const safe = safeHttpUrl(data.url);
  const isVideo = data.embedType !== 'web';
  const Icon = isVideo ? Video : Globe;

  return (
    <div style={{ width, height }} className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-node">
      {editable && (
        <NodeResizer
          isVisible={selected}
          minWidth={240}
          minHeight={160}
          lineClassName="!border-info"
          handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !border-white !bg-info"
          onResize={(_, p) => setLive({ w: Math.round(p.width), h: Math.round(p.height) })}
          onResizeEnd={(_, p) => {
            setLive(null);
            onResizeEnd({ width: Math.round(p.width), height: Math.round(p.height) });
          }}
        />
      )}
      {source ? (
        <>
          <iframe
            src={source.src}
            title={data.title || `${source.provider} embed`}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allow="fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
          />
          {/* While editing, an unselected embed is a draggable card; select it to use the player */}
          {editable && !selected && <div className="absolute inset-0" aria-hidden="true" />}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-dim">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          {!data.url ? (
            <>
              <div className="text-sm font-medium text-ink">{isVideo ? 'Add a video' : 'Add a web page'}</div>
              <div className="text-xs text-dim">
                {isVideo ? 'Select this, then paste a YouTube, Loom or Vimeo link.' : 'Select this, then paste a Figma or Google Docs, Sheets or Slides link.'}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-ink">This site cannot be shown here</div>
              <div className="text-xs text-dim">Only YouTube, Loom, Vimeo, Figma and Google Docs links are embedded.</div>
              {safe ? (
                <a
                  href={safe}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="nodrag inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
                >
                  Open {hostOf(data.url)} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const useNow = (intervalMs) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};

const pad = (n) => String(n).padStart(2, '0');

export const CountdownBlock = ({ data }) => {
  const now = useNow(30000);
  const left = timeRemaining(data.target, now);
  const tone = TONE_CLASSES[left.valid ? countdownTone(left) : 'neutral'];
  const date = left.valid ? new Date(data.target) : null;

  return (
    <div className="w-[260px] rounded-xl border border-line bg-surface p-4 shadow-node">
      <div className="flex items-center gap-2 text-xs font-medium text-dim">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate">{data.label}</span>
      </div>
      {!left.valid ? (
        <div className="mt-2 text-sm text-dim">Pick a date in the settings</div>
      ) : left.expired ? (
        <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-sm font-medium ${tone.chip}`}>Time is up</div>
      ) : (
        <div className="mt-2 flex items-end gap-3 tabular-nums" role="timer" aria-label={`${left.days} days ${left.hours} hours ${left.minutes} minutes left`}>
          {[
            [left.days, 'days'],
            [pad(left.hours), 'hrs'],
            [pad(left.minutes), 'min'],
          ].map(([value, unit]) => (
            <div key={unit} className="text-center">
              <div className={`text-3xl font-semibold leading-none ${left.totalMs < 86400000 ? 'text-danger' : 'text-ink'}`}>{value}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-dim">{unit}</div>
            </div>
          ))}
        </div>
      )}
      {date ? (
        <div className="mt-2 text-xs text-dim">
          {date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      ) : null}
    </div>
  );
};

/** A pin on the canvas that opens a comment thread (same threads as on elements). */
export const CommentPin = ({ id, data, selected, editable, onChange }) => {
  const [open, setOpen] = useState(false);
  const { currentUser } = useContext(VendorContext) || {};
  const comments = Array.isArray(data.comments) ? data.comments : [];
  const unresolved = comments.filter((c) => !c.resolved).length;
  const allResolved = comments.length > 0 && unresolved === 0;

  // Keep the thread closed when something else is selected
  useEffect(() => {
    if (!selected) setOpen(false);
  }, [selected]);

  const addComment = async (nodeId, comment) => {
    onChange({ comments: [...comments, comment] });
    if (comment.mentionedUserIds?.length && data.workspaceId) {
      try {
        await fetch('/api/workspace/comments/mention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: data.workspaceId,
            nodeId,
            elementName: 'comment pin',
            commentText: comment.text,
            authorName: comment.authorName || currentUser?.name,
            mentionedUserIds: comment.mentionedUserIds,
          }),
        });
      } catch (err) {
        console.error('Failed to send mention notifications:', err);
      }
    }
  };
  const resolve = (nodeId, commentId) =>
    onChange({
      comments: comments.map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved, resolvedAt: !c.resolved ? new Date().toISOString() : null } : c
      ),
    });
  const remove = (nodeId, commentId) => onChange({ comments: comments.filter((c) => c.id !== commentId) });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={unresolved ? `Comment pin, ${unresolved} open` : 'Comment pin'}
        aria-expanded={open}
        className={`nodrag flex h-10 w-10 items-center justify-center rounded-full rounded-bl-sm border-2 border-white shadow-pop transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-info ${
          allResolved ? 'bg-success text-white' : 'bg-cta text-cta-foreground'
        }`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {unresolved > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unresolved}
          </span>
        )}
      </button>
      {open && (
        <div
          className="nodrag nowheel nopan absolute left-12 top-0 z-50"
          style={{ width: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <CommentThread
            nodeId={id}
            comments={comments}
            collaborators={data.workspaceCollaborators || []}
            onAddComment={addComment}
            onResolve={resolve}
            onDeleteComment={remove}
            isLocked={!editable}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
