import React, { useMemo } from 'react';
import { getNodeSize } from '../../utils/canvasPlacement';
import { shapeColors } from '../../utils/blockElements';

const PAD = 24;

const paint = (node) => {
  const d = node.data || {};
  if (node.type === 'textNode') return { fill: 'rgb(var(--text-muted) / 0.18)', stroke: 'none', round: 6 };
  if (d.kind === 'shape') {
    const c = shapeColors(d.fill);
    return { ...c, round: d.shape === 'ellipse' ? 999 : d.shape === 'diamond' ? 10 : 14 };
  }
  if (d.kind === 'heading') return { fill: 'rgb(var(--text-primary) / 0.75)', stroke: 'none', round: 6 };
  if (d.kind === 'status') return { fill: 'rgb(var(--status-info) / 0.18)', stroke: 'rgb(var(--status-info) / 0.5)', round: 12 };
  if (d.kind === 'progress') return { fill: 'rgb(var(--status-success) / 0.18)', stroke: 'rgb(var(--status-success) / 0.5)', round: 12 };
  if (d.kind === 'kpi' || d.kind === 'countdown') return { fill: 'rgb(var(--status-warning) / 0.16)', stroke: 'rgb(var(--status-warning) / 0.5)', round: 12 };
  return { fill: 'rgb(var(--surface-hover))', stroke: 'rgb(var(--text-muted) / 0.5)', round: 12 };
};

/**
 * A small drawing of a template: each element as a coloured box where it sits.
 * Cheap (no rendering of the real elements) and works for any saved template.
 */
const TemplateThumbnail = ({ template, className = '' }) => {
  const layout = useMemo(() => {
    const nodes = (template?.nodes || []).filter((n) => !n.parentNode);
    if (nodes.length === 0) return null;
    const boxes = nodes.map((n) => {
      const { w, h } = getNodeSize(n);
      return { id: n.id, x: Number(n.position?.x) || 0, y: Number(n.position?.y) || 0, w, h, paint: paint(n), diamond: n.data?.shape === 'diamond' };
    });
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.w));
    const maxY = Math.max(...boxes.map((b) => b.y + b.h));
    const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
    const lines = (template.edges || [])
      .map((e) => [byId[e.source], byId[e.target]])
      .filter(([a, b]) => a && b)
      .map(([a, b]) => ({ x1: a.x + a.w / 2, y1: a.y + a.h / 2, x2: b.x + b.w / 2, y2: b.y + b.h / 2 }));
    return { boxes, lines, minX, minY, width: maxX - minX, height: maxY - minY };
  }, [template]);

  if (!layout) return <div className={`bg-surface-hover ${className}`} aria-hidden="true" />;

  return (
    <svg
      viewBox={`${layout.minX - PAD} ${layout.minY - PAD} ${layout.width + PAD * 2} ${layout.height + PAD * 2}`}
      preserveAspectRatio="xMidYMid meet"
      className={`bg-canvas ${className}`}
      role="img"
      aria-label={`Preview of ${template?.name || 'template'}`}
    >
      {layout.lines.map((l, i) => (
        <line key={i} {...l} style={{ stroke: 'rgb(var(--text-muted) / 0.45)' }} strokeWidth={Math.max(layout.width, layout.height) / 220} />
      ))}
      {layout.boxes.map((b) =>
        b.diamond ? (
          <polygon
            key={b.id}
            points={`${b.x + b.w / 2},${b.y} ${b.x + b.w},${b.y + b.h / 2} ${b.x + b.w / 2},${b.y + b.h} ${b.x},${b.y + b.h / 2}`}
            style={{ fill: b.paint.fill, stroke: b.paint.stroke }}
            strokeWidth={Math.max(layout.width, layout.height) / 300}
          />
        ) : (
          <rect
            key={b.id}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={Math.min(b.paint.round, b.h / 2)}
            style={{ fill: b.paint.fill, stroke: b.paint.stroke }}
            strokeWidth={Math.max(layout.width, layout.height) / 300}
          />
        )
      )}
    </svg>
  );
};

export default TemplateThumbnail;
