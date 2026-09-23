import React, { useRef, useState } from 'react';
import { User, Paperclip, X, Hash, AtSign } from 'lucide-react';
import MentionDropdown from './MentionDropdown';
import HashtagDropdown from './HashtagDropdown';

const ReplyComposer = ({
  post,
  replyingTo,
  replyMessage,
  setReplyMessage,
  isReplying,
  handleReply,
  setReplyingTo,
  // New props for attachments and mentions
  replyAttachments,
  setReplyAttachments,
  collaborators,
  departments,
  showReplyMentionDropdown,
  setShowReplyMentionDropdown,
  showReplyHashtagDropdown,
  setShowReplyHashtagDropdown,
  replyMentionQuery,
  setReplyMentionQuery,
  replyHashtagQuery,
  setReplyHashtagQuery,
  insertReplyMention,
  insertReplyHashtag,
  renderTextWithHighlights,
  handleReplyMessageChange
}) => {
  const fileInputRef = useRef(null);
  
  if (replyingTo !== post.id) return null;

  // Debug logging
  console.log('🔍 ReplyComposer render:', {
    showReplyMentionDropdown,
    showReplyHashtagDropdown,
    replyMentionQuery,
    replyHashtagQuery,
    collaboratorsCount: collaborators?.length,
    departmentsCount: departments?.length
  });

  // Handle file attachment
  const addReplyAttachment = (file) => {
    if (!file) return;
    const newAttachment = {
      id: `reply-att-${Date.now()}`,
      name: file.name,
      size: file.size,
      file: file
    };
    setReplyAttachments(prev => [...prev, newAttachment]);
  };

  const removeReplyAttachment = (attachmentId) => {
    setReplyAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const onPickReplyFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="px-3 pb-3 border-t border-line">
      <div className="mt-2 flex items-start space-x-2">
        <div className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center flex-shrink-0">
          <User className="w-2.5 h-2.5 text-dim" />
        </div>
        <div className="flex-1">
          {/* Reply Text Input with Highlighting */}
          <div className="relative">
            <div className="w-full min-h-[40px] p-1.5 border border-line rounded bg-surface text-[11px] text-ink whitespace-pre-wrap break-words leading-[1.3] focus-within:ring-1 focus-within:ring-info focus-within:border-transparent">
              {renderTextWithHighlights(replyMessage)}
              {!replyMessage && (
                <span className="text-dim text-[11px]">Reply to {post.author.name}...</span>
              )}
            </div>
            <textarea
              value={replyMessage}
              onChange={handleReplyMessageChange}
              placeholder={`Reply to ${post.author.name}...`}
              className="absolute inset-0 w-full h-full resize-none outline-none text-[11px] text-transparent bg-transparent placeholder-transparent [text-indent:2px] cursor-text"
              style={{
                caretColor: 'rgb(var(--info))',
                fontFamily: 'inherit',
                fontSize: '11px',
                lineHeight: '1.3',
                padding: '6px',
                border: 'none',
                borderRadius: '4px'
              }}
              rows={1}
            />

            {/* Mention and Hashtag Dropdowns - positioned relative to text input */}
            <MentionDropdown
              showMentionDropdown={showReplyMentionDropdown}
              collaborators={collaborators}
              mentionQuery={replyMentionQuery}
              insertMention={insertReplyMention}
            />

            <HashtagDropdown
              showHashtagDropdown={showReplyHashtagDropdown}
              departments={departments}
              hashtagQuery={replyHashtagQuery}
              insertHashtag={insertReplyHashtag}
            />
          </div>

          {/* Attachment chips */}
          {replyAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {replyAttachments.map(att => (
                <div key={att.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-hover border border-line rounded text-[10px]">
                  <span className="text-[10px] text-ink">{att.name}</span>
                  <button onClick={() => removeReplyAttachment(att.id)} className="p-0.5 hover:bg-surface-hover rounded">
                    <X className="w-2.5 h-2.5 text-dim" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-dim">Replying to {post.author.name}</span>
              <div className="flex items-center gap-1">
                <button className="px-1.5 py-0.5 text-[9px] bg-surface-hover text-ink rounded border border-line hover:bg-surface-hover">
                  <span className="inline-flex items-center gap-0.5"><Hash className="w-2 h-2" /> dept</span>
                </button>
                <button className="px-1.5 py-0.5 text-[9px] bg-success/10 text-success rounded border border-success/20 hover:bg-success/10">
                  <span className="inline-flex items-center gap-0.5"><AtSign className="w-2 h-2" /> person</span>
                </button>
                <button onClick={onPickReplyFile} className="p-0.5 rounded hover:bg-surface-hover" title="Attach">
                  <Paperclip className="w-2.5 h-2.5 text-dim" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => addReplyAttachment(e.target.files?.[0])} />
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyMessage('');
                  setReplyAttachments([]);
                }}
                className="px-2 py-0.5 text-[10px] text-dim hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReply(post.id)}
                disabled={isReplying || !replyMessage.trim()}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  isReplying || !replyMessage.trim()
                    ? 'bg-surface-hover text-dim cursor-not-allowed'
                    : 'bg-info text-white hover:bg-info'
                }`}
              >
                {isReplying ? 'Replying...' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyComposer;
