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
    <div className="px-3 pb-3 border-t border-gray-100">
      <div className="mt-2 flex items-start space-x-2">
        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-2.5 h-2.5 text-gray-600" />
        </div>
        <div className="flex-1">
          {/* Reply Text Input with Highlighting */}
          <div className="relative">
            <div className="w-full min-h-[40px] p-1.5 border border-gray-200 rounded bg-white text-[11px] text-gray-800 whitespace-pre-wrap break-words leading-[1.3] focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-transparent">
              {renderTextWithHighlights(replyMessage)}
              {!replyMessage && (
                <span className="text-gray-400 text-[11px]">Reply to {post.author.name}...</span>
              )}
            </div>
            <textarea
              value={replyMessage}
              onChange={handleReplyMessageChange}
              placeholder={`Reply to ${post.author.name}...`}
              className="absolute inset-0 w-full h-full resize-none outline-none text-[11px] text-transparent bg-transparent placeholder-transparent [text-indent:2px] cursor-text"
              style={{
                caretColor: '#374151',
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
                <div key={att.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">
                  <span className="text-[10px] text-gray-700">{att.name}</span>
                  <button onClick={() => removeReplyAttachment(att.id)} className="p-0.5 hover:bg-gray-200 rounded">
                    <X className="w-2.5 h-2.5 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-gray-500">Replying to {post.author.name}</span>
              <div className="flex items-center gap-1">
                <button className="px-1.5 py-0.5 text-[9px] bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100">
                  <span className="inline-flex items-center gap-0.5"><Hash className="w-2 h-2" /> dept</span>
                </button>
                <button className="px-1.5 py-0.5 text-[9px] bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100">
                  <span className="inline-flex items-center gap-0.5"><AtSign className="w-2 h-2" /> person</span>
                </button>
                <button onClick={onPickReplyFile} className="p-0.5 rounded hover:bg-gray-100" title="Attach">
                  <Paperclip className="w-2.5 h-2.5 text-gray-600" />
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
                className="px-2 py-0.5 text-[10px] text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReply(post.id)}
                disabled={isReplying || !replyMessage.trim()}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  isReplying || !replyMessage.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
