import React, { useState } from 'react';
import { User, Image as ImageIcon, Unlock, CheckCircle, XCircle } from 'lucide-react';
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
  handleReplyMessageChange,
  // Unlock request props
  currentUser,
  workspace,
  workspaceId,
  onUnlockRequest,
  onUnlockApprove
}) => {
  // Image modal state
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isRequestingUnlock, setIsRequestingUnlock] = useState(false);
  const [isApprovingUnlock, setIsApprovingUnlock] = useState(false);

  const handleImageClick = (attachment) => {
    setSelectedImage(attachment);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  const isPM = currentUser?.role === 'pm' || displayUser.role === 'Project manager';
  const isClient = currentUser?.role === 'client';
  const isWorkspaceCompleted = workspace?.status === 'completed';
  const hasTaskInfo = post.taskId && post.subtaskId;
  
  // Check unlock status from post
  const unlockRequest = post.unlockRequest;
  const isUnlockPending = unlockRequest?.status === 'pending';
  const isUnlockApproved = unlockRequest?.status === 'approved';
  const isUnlockRejected = unlockRequest?.status === 'rejected';

  const handleRequestUnlock = async () => {
    if (!hasTaskInfo || isRequestingUnlock) return;
    setIsRequestingUnlock(true);
    try {
      await onUnlockRequest(post.id, post.taskId, post.subtaskId);
    } finally {
      setIsRequestingUnlock(false);
    }
  };

  const handleApproveUnlock = async (approved) => {
    if (isApprovingUnlock) return;
    setIsApprovingUnlock(true);
    try {
      await onUnlockApprove(post.id, post.taskId, post.subtaskId, approved);
    } finally {
      setIsApprovingUnlock(false);
    }
  };
  return (
    <div className="bg-surface rounded-lg border border-line ">
      <div className="flex items-start justify-between px-3 py-2">
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-surface-hover flex items-center justify-center mr-2">
            <User className="w-3 h-3 text-dim" />
          </div>
          <div>
            <div className="text-xs font-medium text-ink">{post.author.name}</div>
            <div className="text-[10px] text-dim bg-surface-hover px-1.5 py-0.5 rounded-full inline-block">{post.author.role}</div>
          </div>
        </div>
        <div className="text-[10px] text-dim">{post.dateLabel}</div>
      </div>
            {/* Task/Subtask Badge */}
      {post.taskName && (
        <div className="px-3 pb-1 flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1 text-[10px] bg-info/10 text-info px-2 py-0.5 rounded-full border border-info/20">
            <span className="font-medium">{post.taskName}</span>
            {post.subtaskName && (
              <>
                <span className="text-info">→</span>
                <span>{post.subtaskName}</span>
              </>
            )}
          </div>
          
          {/* Unlock Status Badges */}
          {isUnlockPending && (
            <div className="inline-flex items-center gap-1 text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full border border-warning/20">
              <Unlock className="w-2.5 h-2.5" />
              <span>Unlock Pending</span>
            </div>
          )}
          {isUnlockApproved && (
            <div className="inline-flex items-center gap-1 text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">
              <CheckCircle className="w-2.5 h-2.5" />
              <span>Unlocked</span>
            </div>
          )}
          {isUnlockRejected && (
            <div className="inline-flex items-center gap-1 text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full border border-danger/20">
              <XCircle className="w-2.5 h-2.5" />
              <span>Unlock Rejected</span>
            </div>
          )}
        </div>
      )}
            <div className="px-3 pb-2 text-[11px] text-ink leading-relaxed">
        {renderTextWithHighlights(post.text)}
      </div>
      
      {/* Handle both old attachment format and new attachments array */}
      {(post.attachment || (post.attachments && post.attachments.length > 0)) && (
        <div className="px-3">
          <div className="text-[10px] text-dim mb-1">
            {post.attachments ? `Attachments (${post.attachments.length})` : 'Attachment'}
          </div>
          
          {/* New attachments array format */}
          {post.attachments && post.attachments.length > 0 ? (
            <div className="space-y-2">
              {post.attachments.map((attachment, index) => (
                <div key={index} className="border border-line rounded overflow-hidden">
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
                    <div className="h-20 bg-surface-hover flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-dim" />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-dim px-2 py-1 bg-canvas">
                    <span className="truncate">{attachment.fileName}</span>
                    <span>{formatSizeMB(attachment.fileSize)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Old single attachment format */
            <div className="border border-line rounded overflow-hidden">
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
                <div className="h-20 bg-surface-hover flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-dim" />
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-dim px-2 py-1 bg-canvas">
                <span>{post.attachment.name}</span>
                <span>{formatSizeMB(post.attachment.size)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="px-3 py-2 border-t border-line">
        <div className="flex items-center justify-between text-[11px] text-dim mb-2">
          <button className="inline-flex items-center gap-1 hover:text-ink">
            <span className="text-sm leading-none">▢</span>
            <span>{post.replies?.length || 0} replies</span>
          </button>
          <button 
            onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
            className="hover:text-ink text-[11px]"
          >
            reply
          </button>
        </div>
        
        {/* Unlock Request Actions */}
        {isWorkspaceCompleted && hasTaskInfo && (
          <div className="mt-2">
            {/* PM: Request Unlock Button */}
            {isPM && !unlockRequest && (
              <button
                onClick={handleRequestUnlock}
                disabled={isRequestingUnlock}
                className="inline-flex items-center gap-1 text-[11px] bg-warning/10 text-warning px-3 py-1.5 rounded-md border border-warning/20 hover:bg-warning/10 transition-colors disabled:opacity-50"
              >
                <Unlock className="w-3 h-3" />
                <span>{isRequestingUnlock ? 'Requesting...' : 'Request Unlock for This Task'}</span>
              </button>
            )}
            
            {/* Client: Approve/Reject Buttons */}
            {isClient && isUnlockPending && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApproveUnlock(true)}
                  disabled={isApprovingUnlock}
                  className="inline-flex items-center gap-1 text-[11px] bg-success/10 text-success px-3 py-1.5 rounded-md border border-success/20 hover:bg-success/10 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Approve Unlock</span>
                </button>
                <button
                  onClick={() => handleApproveUnlock(false)}
                  disabled={isApprovingUnlock}
                  className="inline-flex items-center gap-1 text-[11px] bg-danger/10 text-danger px-3 py-1.5 rounded-md border border-danger/20 hover:bg-danger/10 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        )}
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
