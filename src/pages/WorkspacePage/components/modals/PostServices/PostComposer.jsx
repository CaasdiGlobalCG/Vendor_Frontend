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
  renderTextWithHighlights
}) => {
  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center mr-2 overflow-hidden">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={displayUser.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-gray-600" />
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-gray-900">{displayUser.name}</div>
            <div className="text-[10px] text-gray-500">{displayUser.role}</div>
          </div>
        </div>
        
        <div className="px-3 pb-2 relative">
          <div className="relative">
            <div className="w-full min-h-[60px] p-2 border border-gray-200 rounded-lg bg-white text-[11px] text-gray-800 whitespace-pre-wrap break-words leading-[1.3] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              {renderTextWithHighlights(message)}
              {!message && (
                <span className="text-gray-400 text-[11px]">Write your service request...</span>
              )}
            </div>
            <textarea
              value={message}
              onChange={handleMessageChange}
              rows={2}
              className="absolute inset-0 w-full h-full resize-none outline-none text-[11px] text-transparent bg-transparent placeholder-transparent [text-indent:2px] cursor-text"
              style={{
                caretColor: '#374151',
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
              <div key={att.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">
                <span className="text-[10px] text-gray-700">{att.name}</span>
                <button onClick={() => removeAttachment(att.id)} className="p-0.5 hover:bg-gray-200 rounded">
                  <X className="w-2.5 h-2.5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">
          <div className="flex items-center gap-1.5">
            <button className="px-2 py-1 text-[10px] bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100">
              <span className="inline-flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> dept</span>
            </button>
            <button className="px-2 py-1 text-[10px] bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100">
              <span className="inline-flex items-center gap-1"><AtSign className="w-2.5 h-2.5" /> person</span>
            </button>
            <button onClick={onPickFile} className="p-1 rounded hover:bg-gray-100" title="Attach">
              <Paperclip className="w-3 h-3 text-gray-600" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => addAttachment(e.target.files?.[0])} />
          </div>
          <button 
            onClick={handlePost} 
            disabled={isPosting || !message.trim()}
            className={`px-2.5 py-1 text-[10px] rounded inline-flex items-center gap-1 transition-colors ${
              isPosting || !message.trim()
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
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
