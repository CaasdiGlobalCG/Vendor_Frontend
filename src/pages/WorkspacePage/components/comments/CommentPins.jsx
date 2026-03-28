import React from 'react';
import { MessageCircle } from 'lucide-react';

/**
 * CommentPins — Renders small comment count badges on nodes that have comments.
 * Designed to be rendered in a ReactFlow <Panel> or overlay layer so pins
 * are always visible at a consistent size regardless of zoom.
 *
 * This is a lightweight indicator — clicking a pin dispatches a custom event
 * that ElementNode listens for to open its CommentThread.
 *
 * Props:
 *   nodes - Array of ReactFlow nodes (with data.comments)
 */
const CommentPins = ({ nodes = [] }) => {
  const nodesWithComments = nodes.filter(
    n => n.data?.comments && n.data.comments.length > 0
  );

  if (nodesWithComments.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {nodesWithComments.map(node => {
        const unresolvedCount = node.data.comments.filter(c => !c.resolved).length;
        if (unresolvedCount === 0) return null;

        return (
          <div
            key={`pin-${node.id}`}
            className="pointer-events-auto absolute"
            style={{
              left: node.position?.x ?? 0,
              top: (node.position?.y ?? 0) - 12,
              transform: 'translateX(-50%)',
            }}
          >
            <button
              onClick={() => {
                document.dispatchEvent(new CustomEvent('openNodeComments', { detail: { nodeId: node.id } }));
              }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full shadow-md hover:bg-blue-600 transition-colors"
              title={`${unresolvedCount} comment${unresolvedCount > 1 ? 's' : ''} on ${node.data?.name || 'element'}`}
            >
              <MessageCircle className="w-2.5 h-2.5" />
              {unresolvedCount}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CommentPins;
