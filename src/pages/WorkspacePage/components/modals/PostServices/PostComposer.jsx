import React, { useRef } from 'react';
import { X, Hash, AtSign, Paperclip, Send, User } from 'lucide-react';
import MentionDropdown from './MentionDropdown';
import HashtagDropdown from './HashtagDropdown';

const PostComposer = ({
  message,
  setMessage,
  handleMessageChange,
  cursorPosition,
  setCursorPosition,
  attachments,
  addAttachment,
  removeAttachment,
  onPickFile,
  fileInputRef,
  displayUser,
  currentUser,
  collaborators,
  departments,
  showMentionDropdown,
  setShowMentionDropdown,
  showHashtagDropdown,
  setShowHashtagDropdown,
  mentionQuery,
  setMentionQuery,
  hashtagQuery,
  setHashtagQuery,
  insertMention,
  insertHashtag,
  handlePost,
  isPosting,
  renderTextWithHighlights,
  selectedTaskForPost,
  selectedSubtaskForPost
}) => {
  return (
    <div className="p-3 border-b border-line bg-canvas">
      <div className="bg-surface rounded-lg border border-line ">
        <div className="flex items-center px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center mr-2 overflow-hidden">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={displayUser.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-dim" />
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-ink">{displayUser.name}</div>
            <div className="text-[10px] text-dim">{displayUser.role}</div>
          </div>
        </div>
        
        <div className="px-3 pb-2 relative">
          <div className="relative">
            <div className="w-full min-h-[60px] p-2 border border-line rounded-lg bg-surface text-[11px] text-ink whitespace-pre-wrap break-words leading-[1.3] focus-within:ring-2 focus-within:ring-info focus-within:border-transparent">
              {renderTextWithHighlights(message)}
              {!message && (
                <span className="text-dim text-[11px]">Write your service request...</span>
              )}
            </div>
            <textarea
              value={message}
              onChange={handleMessageChange}
              rows={2}
              className="absolute inset-0 w-full h-full resize-none outline-none text-[11px] text-transparent bg-transparent placeholder-transparent [text-indent:2px] cursor-text"
              style={{
                caretColor: 'rgb(var(--info))',
                fontFamily: 'inherit',
                fontSize: '11px',
                lineHeight: '1.3',
                padding: '8px',
                border: 'none',
                borderRadius: '6px'
              }}
            />
          </div>
           
          {/* Mention Dropdown */}
          <MentionDropdown
            showMentionDropdown={showMentionDropdown}
            collaborators={collaborators}
            mentionQuery={mentionQuery}
            insertMention={insertMention}
          />

          {/* Hashtag Dropdown */}
          <HashtagDropdown
            showHashtagDropdown={showHashtagDropdown}
            departments={departments}
            hashtagQuery={hashtagQuery}
            insertHashtag={insertHashtag}
          />

          {/* Attachment chips */}
          <div className="flex flex-wrap gap-1 mt-1">
            {attachments.map(att => (
              <div key={att.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-hover border border-line rounded text-[10px]">
                <span className="text-[10px] text-ink">{att.name}</span>
                <button onClick={() => removeAttachment(att.id)} className="p-0.5 hover:bg-surface-hover rounded">
                  <X className="w-2.5 h-2.5 text-dim" />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between px-3 py-2 border-t border-line">
          <div className="flex items-center gap-1.5">
            <button className="px-2 py-1 text-[10px] bg-surface-hover text-ink rounded border border-line hover:bg-surface-hover">
              <span className="inline-flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> dept</span>
            </button>
            <button className="px-2 py-1 text-[10px] bg-success/10 text-success rounded border border-success/20 hover:bg-success/10">
              <span className="inline-flex items-center gap-1"><AtSign className="w-2.5 h-2.5" /> person</span>
            </button>
            <button onClick={onPickFile} className="p-1 rounded hover:bg-surface-hover" title="Attach">
              <Paperclip className="w-3 h-3 text-dim" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => addAttachment(e.target.files?.[0])} />
          </div>
          <button 
            onClick={handlePost} 
            disabled={isPosting || !message.trim() || !selectedTaskForPost || !selectedSubtaskForPost}
            title={!selectedTaskForPost || !selectedSubtaskForPost ? 'Please select task and subtask first' : ''}
            className={`px-2.5 py-1 text-[10px] rounded inline-flex items-center gap-1 transition-colors ${
              isPosting || !message.trim() || !selectedTaskForPost || !selectedSubtaskForPost
                ? 'bg-cta text-dim cursor-not-allowed'
                : 'bg-info text-cta-foreground hover:bg-info'
            }`}
          >
            {isPosting ? (
              <>
                <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white"></div>
                <span>Posting...</span>
              </>
            ) : (
              <>
                <span>Post</span>
                <Send className="w-2.5 h-2.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
