import React from 'react';
import PostItem from './PostItem';

const PostList = ({
  posts,
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
  return (
    <div className="px-3 pb-3 flex-1 overflow-y-auto">
      {posts.length > 0 ? (
        <div className="space-y-2">
          {posts.map(post => (
            <PostItem
              key={post.id}
              post={post}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyMessage={replyMessage}
              setReplyMessage={setReplyMessage}
              isReplying={isReplying}
              handleReply={handleReply}
              displayUser={displayUser}
              renderTextWithHighlights={renderTextWithHighlights}
              formatSizeMB={formatSizeMB}
              // New props for reply features
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
              handleReplyMessageChange={handleReplyMessageChange}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-gray-400 text-lg">📝</span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No posts yet</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            Be the first to create a post in this subtask. Share updates, ask questions, or request services.
          </p>
        </div>
      )}
    </div>
  );
};

export default PostList;
