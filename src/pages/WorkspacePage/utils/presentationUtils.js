/**
 * Present mode: which parts of the canvas are the "slides", and in what order.
 *
 * - If the canvas has frames, each frame is a slide (a frame groups related
 *   content, so zooming to it shows the whole group).
 * - Otherwise every element is a slide.
 * Slides follow the element numbering (the numbered badge on each element),
 * and anything unnumbered follows in reading order (top to bottom, then left
 * to right).
 */

import { isNonSlideBlockNode } from './blockElements';

const ROW_HEIGHT = 120; // elements within this vertical band read as one row

const isFrame = (node) => node.type === 'layoutNode' && node.data?.type === 'frame';

const isContainerOnly = (node) =>
  node.type === 'docGroup' ||
  isNonSlideBlockNode(node) || !!node.data?.isGroupContainer || node.data?.type === 'group-container';

const sequenceOf = (node) => {
  const n = Number(node.data?.sequenceNumber);
  return Number.isFinite(n) ? n : null;
};

const readingOrder = (a, b) => {
  const rowA = Math.round((a.position?.y || 0) / ROW_HEIGHT);
  const rowB = Math.round((b.position?.y || 0) / ROW_HEIGHT);
  if (rowA !== rowB) return rowA - rowB;
  return (a.position?.x || 0) - (b.position?.x || 0);
};

const bySlideOrder = (a, b) => {
  const sa = sequenceOf(a);
  const sb = sequenceOf(b);
  if (sa !== null && sb !== null && sa !== sb) return sa - sb;
  if (sa !== null && sb === null) return -1; // numbered first
  if (sa === null && sb !== null) return 1;
  return readingOrder(a, b);
};

const labelOf = (node) =>
  String(
    (node.type === 'blockNode' && (node.data?.text || node.data?.label)) ||
      node.data?.title ||
      node.data?.name ||
      node.data?.label ||
      node.data?.type ||
      'Element'
  ).slice(0, 60);

/**
 * @returns {{ id: string, label: string }[]} slides in presentation order
 */
export const getPresentationStops = (nodes = []) => {
  const usable = nodes.filter((n) => n && !n.hidden && !isContainerOnly(n));
  const frames = usable.filter(isFrame);
  const pool = frames.length > 0 ? frames : usable;
  return [...pool].sort(bySlideOrder).map((n) => ({ id: n.id, label: labelOf(n) }));
};

/** Index is -1 for the overview; clamp anything else into [-1, count - 1]. */
export const clampPresentIndex = (index, count) => Math.max(-1, Math.min(index, count - 1));

/** Next index, stopping at the last slide. */
export const nextPresentIndex = (index, count) => clampPresentIndex(index + 1, count);

/** Previous index, going back as far as the overview (-1). */
export const prevPresentIndex = (index, count) => clampPresentIndex(index - 1, count);
