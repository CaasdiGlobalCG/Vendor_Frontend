import React, { useState } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';
import ReplyComposer from './ReplyComposer';
import ReplyThread from './ReplyThread';
import ImageModal from './ImageModal';

const PostItem = ({
  post,
  replyingTo,
  setReplyingTo,
  replyMessage,
  setReplyMessage,
  isReplying,
  handleReply,
  displayUser,
  renderTextWithHighlights,
  formatSizeMB,
  // New props for reply features
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
  handleReplyMessageChange
}) => {
  // Image modal state
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleImageClick = (attachment) => {
    setSelectedImage(attachment);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between px-3 py-2">
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
            <User className="w-3 h-3 text-gray-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-900">{post.author.name}</div>
            <div className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full inline-block">{post.author.role}</div>
          </div>
        </div>
        <div className="text-[10px] text-gray-400">{post.dateLabel}</div>
      </div>
      
      <div className="px-3 pb-2 text-[11px] text-gray-800 leading-relaxed">
        {renderTextWithHighlights(post.text)}
      </div>
      
      {/* Handle both old attachment format and new attachments array */}
      {(post.attachment || (post.attachments && post.attachments.length > 0)) && (
        <div className="px-3">
          <div className="text-[10px] text-gray-600 mb-1">
            {post.attachments ? `Attachments (${post.attachments.length})` : 'Attachment'}
          </div>
          
          {/* New attachments array format */}
          {post.attachments && post.attachments.length > 0 ? (
            <div className="space-y-2">
              {post.attachments.map((attachment, index) => (
                <div key={index} className="border border-gray-200 rounded overflow-hidden">
                  {attachment.fileType?.startsWith('image/') ? (
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleImageClick(attachment)}
                    >
                      <img 
                        src={attachment.fileUrl} 
                        alt={attachment.fileName} 
                        className="w-full max-h-32 object-cover hover:opacity-90 transition-opacity" 
                      />
                    </div>
                  ) : (
                    <div className="h-20 bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-gray-600 px-2 py-1 bg-gray-50">
                    <span className="truncate">{attachment.fileName}</span>
                    <span>{formatSizeMB(attachment.fileSize)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Old single attachment format */
            <div className="border border-gray-200 rounded overflow-hidden">
              {post.attachment.preview ? (
                <div 
                  className="cursor-pointer"
                  onClick={() => handleImageClick(post.attachment)}
                >
                  <img 
                    src={post.attachment.preview} 
                    alt={post.attachment.name} 
                    className="w-full max-h-32 object-cover hover:opacity-90 transition-opacity" 
                  />
                </div>
              ) : (
                <div className="h-20 bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-gray-600 px-2 py-1 bg-gray-50">
                <span>{post.attachment.name}</span>
                <span>{formatSizeMB(post.attachment.size)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="px-3 py-2 flex items-center justify-between text-[11px] text-gray-600 border-t border-gray-100">
        <button className="inline-flex items-center gap-1 hover:text-gray-800">
          <span className="text-sm leading-none">▢</span>
          <span>{post.replies?.length || 0} replies</span>
        </button>
        <button 
          onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
          className="hover:text-gray-800 text-[11px]"
        >
          reply
        </button>
      </div>

      {/* Reply Composer */}
      <ReplyComposer
        post={post}
        replyingTo={replyingTo}
        replyMessage={replyMessage}
        setReplyMessage={setReplyMessage}
        isReplying={isReplying}
        handleReply={handleReply}
        setReplyingTo={setReplyingTo}
        // New props for attachments and mentions
        replyAttachments={replyAttachments}
        setReplyAttachments={setReplyAttachments}
        collaborators={collaborators}
        departments={departments}
        showReplyMentionDropdown={showReplyMentionDropdown}
        setShowReplyMentionDropdown={setShowReplyMentionDropdown}
        showReplyHashtagDropdown={showReplyHashtagDropdown}
        setShowReplyHashtagDropdown={setShowReplyHashtagDropdown}
        replyMentionQuery={replyMentionQuery}
        setReplyMentionQuery={setReplyMentionQuery}
        replyHashtagQuery={replyHashtagQuery}
        setReplyHashtagQuery={setReplyHashtagQuery}
        insertReplyMention={insertReplyMention}
        insertReplyHashtag={insertReplyHashtag}
        renderTextWithHighlights={renderTextWithHighlights}
        handleReplyMessageChange={handleReplyMessageChange}
      />

      {/* Replies Thread */}
      <ReplyThread
        post={post}
        renderTextWithHighlights={renderTextWithHighlights}
        formatSizeMB={formatSizeMB}
      />
      
      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        imageUrl={selectedImage?.fileUrl || selectedImage?.preview}
        fileName={selectedImage?.fileName || selectedImage?.name}
        fileSize={selectedImage?.fileSize || selectedImage?.size}
      />
    </div>
  );
};

export default PostItem;
