import React, { useState, useRef, useEffect, useContext } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import CommentThread from './CommentThread';

/**
 * EdgeCommentButton — A comment bubble that sits at the midpoint of a canvas edge.
 * It leverages the existing CommentThread component for the actual comment UI.
 *
 * Usage: Render inside the canvas overlay layer, positioned at the edge midpoint.
 *
 * Props:
 *   edgeId          - The edge ID
 *   sourcePos       - { x, y } position of source node
 *   targetPos       - { x, y } position of target node
 *   comments        - Comment[] from edge data
 *   collaborators   - Workspace collaborators for @mentions
 *   onAddComment    - (edgeId, comment) => void
 *   onResolve       - (edgeId, commentId) => void
 *   onDeleteComment - (edgeId, commentId) => void
 *   isLocked        - Whether editing is locked
 */
const EdgeCommentButton = ({
  edgeId,
  sourcePos,
  targetPos,
  comments = [],
  collaborators = [],
  onAddComment,
  onResolve,
  onDeleteComment,
  isLocked = false,
}) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  const unresolvedCount = comments.filter(c => !c.resolved).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Midpoint of edge
  const midX = (sourcePos.x + targetPos.x) / 2;
  const midY = (sourcePos.y + targetPos.y) / 2;

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)', zIndex: 20 }}
    >
      {/* Comment bubble trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
        className={`relative flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200 shadow-sm hover:scale-110 ${
          unresolvedCount > 0
            ? 'bg-blue-500 border-blue-400 text-white'
            : comments.length > 0
              ? 'bg-green-100 border-green-300 text-green-600'
              : 'bg-white border-gray-300 text-gray-400 opacity-0 group-hover:opacity-100'
        }`}
        title={unresolvedCount > 0 ? `${unresolvedCount} unresolved comment${unresolvedCount > 1 ? 's' : ''}` : 'Add comment'}
      >
        <MessageCircle className="w-3 h-3" />
        {unresolvedCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
            {unresolvedCount}
          </span>
        )}
      </button>

      {/* Comment thread popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute left-8 top-0 z-50 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-600">Edge Comment</span>
            <button onClick={() => setOpen(false)} className="p-0.5 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <CommentThread
            nodeId={edgeId}
            comments={comments}
            collaborators={collaborators}
            onAddComment={onAddComment}
            onResolve={onResolve}
            onDeleteComment={onDeleteComment}
            isLocked={isLocked}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default EdgeCommentButton;
