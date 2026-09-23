import React, { useState, useRef, useEffect, useContext } from 'react';
import { MessageCircle, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, X, MoreHorizontal, Trash2 } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import MentionInput from './MentionInput';

/**
 * CommentThread — A Figma-style threaded comment popover anchored to canvas elements.
 *
 * Props:
 *   nodeId         - The element node ID
 *   comments       - Array of comment objects from node data
 *   collaborators  - Array of workspace collaborators for @mentions
 *   onAddComment   - (nodeId, comment) => void — called to persist a new comment
 *   onResolve      - (nodeId, threadId) => void — toggle resolved
 *   onDeleteComment - (nodeId, commentId) => void — delete a single comment
 *   isLocked       - Whether the element is locked
 *   onClose        - Close callback
 */
const CommentThread = ({ nodeId, comments = [], collaborators = [], onAddComment, onResolve, onDeleteComment, isLocked = false, onClose }) => {
  const { currentUser } = useContext(VendorContext);
  const [showResolved, setShowResolved] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const menuRef = useRef(null);

  // Group comments into threads. A "thread" = first comment + its replies.
  // For now, all comments are in one flat thread per element. We support resolve at the thread level.
  const unresolvedComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);

  // Scroll to bottom when new comment added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddComment = (text, mentionedIds) => {
    if (!text.trim()) return;
    const comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text,
      authorId: currentUser?.vendorId || 'unknown',
      authorName: currentUser?.name || currentUser?.email || 'Unknown',
      authorEmail: currentUser?.email || '',
      mentionedUserIds: mentionedIds || [],
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    onAddComment?.(nodeId, comment);
  };

  const handleResolveToggle = (commentId) => {
    onResolve?.(nodeId, commentId);
  };

  const handleDelete = (commentId) => {
    setMenuOpenId(null);
    onDeleteComment?.(nodeId, commentId);
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderComment = (comment) => {
    const isOwn = comment.authorId === currentUser?.vendorId;
    const initial = (comment.authorName || '?').charAt(0).toUpperCase();

    return (
      <div key={comment.id} className={`group/comment px-3 py-2 ${comment.resolved ? 'opacity-60' : ''}`}>
        <div className="flex items-start space-x-2">
          {/* Avatar */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border ${
            comment.resolved
              ? 'bg-success/10 text-success border-success/20'
              : 'bg-black text-white border-white'
          }`}>
            {comment.resolved ? '✓' : initial}
          </div>

          <div className="flex-1 min-w-0">
            {/* Author line */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-ink truncate max-w-[100px]">{comment.authorName}</span>
                <span className="text-[10px] text-dim">{formatTime(comment.createdAt)}</span>
                {comment.resolved && (
                  <span className="text-[9px] px-1 py-0.5 bg-success/10 text-success rounded font-medium">Resolved</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                {/* Resolve / Reopen */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleResolveToggle(comment.id); }}
                  className={`p-0.5 rounded transition-colors ${
                    comment.resolved
                      ? 'text-warning hover:bg-warning/10'
                      : 'text-success hover:bg-success/10'
                  }`}
                  title={comment.resolved ? 'Reopen' : 'Resolve'}
                >
                  {comment.resolved ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                </button>

                {/* Delete (own comments only) */}
                {isOwn && (
                  <div className="relative" ref={menuOpenId === comment.id ? menuRef : null}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === comment.id ? null : comment.id); }}
                      className="p-0.5 text-dim hover:text-dim hover:bg-surface-hover rounded transition-colors"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                    {menuOpenId === comment.id && (
                      <div className="absolute right-0 mt-1 w-28 bg-surface border border-line rounded-lg shadow-xl z-50 py-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                          className="w-full px-2.5 py-1.5 text-left text-xs text-danger hover:bg-danger/10 flex items-center space-x-1.5"
                        >
                          <Trash2 className="w-3 h-3" /><span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comment text — render @mentions in blue */}
            <p className="text-xs text-ink mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
              {renderCommentText(comment.text)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render comment text with @mentions highlighted
  const renderCommentText = (text) => {
    const parts = text.split(/(@[\w\s.]+?)(?=\s@|\s|$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1).trim();
        const isKnown = collaborators.some(c => c.name === name);
        return (
          <span key={i} className={`font-medium ${isKnown ? 'text-info bg-info/10 px-0.5 rounded' : 'text-info'}`}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      ref={containerRef}
      className="bg-surface rounded-xl shadow-2xl border border-line overflow-hidden flex flex-col"
      style={{ width: 300, maxHeight: 400 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-canvas border-b border-line">
        <div className="flex items-center space-x-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-info" />
          <span className="text-xs font-semibold text-ink">
            Comments {unresolvedComments.length > 0 && `(${unresolvedComments.length})`}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {resolvedComments.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowResolved(!showResolved); }}
              className="flex items-center space-x-1 px-1.5 py-0.5 text-[10px] text-dim hover:text-ink hover:bg-surface-hover rounded transition-colors"
            >
              <CheckCircle2 className="w-3 h-3 text-success" />
              <span>{resolvedComments.length} resolved</span>
              {showResolved ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="p-0.5 text-dim hover:text-dim hover:bg-surface-hover rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto divide-y divide-line" style={{ maxHeight: 260 }}>
        {unresolvedComments.length === 0 && !showResolved && (
          <div className="px-4 py-6 text-center">
            <MessageCircle className="w-8 h-8 text-dim mx-auto mb-2" />
            <p className="text-xs text-dim">No comments yet</p>
            <p className="text-[10px] text-dim mt-0.5">Use @name to mention collaborators</p>
          </div>
        )}

        {/* Active comments */}
        {unresolvedComments.map(renderComment)}

        {/* Resolved comments (collapsible) */}
        {showResolved && resolvedComments.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-success/10 border-t border-b border-success/10">
              <span className="text-[10px] font-semibold text-success uppercase tracking-wide">Resolved</span>
            </div>
            {resolvedComments.map(renderComment)}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!isLocked && (
        <div className="border-t border-line p-2 bg-canvas">
          <MentionInput
            collaborators={collaborators}
            onSubmit={handleAddComment}
            placeholder="Comment or @mention..."
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default CommentThread;
