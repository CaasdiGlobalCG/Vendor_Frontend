import React, { useMemo, useRef, useState } from 'react';
import { X, User, Plus } from 'lucide-react';
import PostComposer from './PostComposer';
import PostList from './PostList';
import { usePostServices } from './hooks/usePostServices';
import { renderTextWithHighlights, formatSizeMB } from './utils/textUtils.jsx';
import config from '../../../../../config/env.js';

const PostServicesModal = ({ isOpen, onClose, currentUser, workspaceId, subtaskId, taskId, selectedSubtask }) => {
  const fileInputRef = useRef(null);

  const displayUser = useMemo(() => {
    const name = currentUser?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
    const role = currentUser?.role ? (currentUser.role === 'pm' ? 'Project manager' : currentUser.role) : 'vendor';
    return { name, role };
  }, [currentUser]);

  // State for post composer
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([{ id: 'att-1', name: 'Photo.jpeg', size: 2.5 * 1024 * 1024 }]);
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(true);

  // State for replies
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState([]);
  
  // State for reply mentions and hashtags
  const [showReplyMentionDropdown, setShowReplyMentionDropdown] = useState(false);
  const [showReplyHashtagDropdown, setShowReplyHashtagDropdown] = useState(false);
  const [replyMentionQuery, setReplyMentionQuery] = useState('');
  const [replyHashtagQuery, setReplyHashtagQuery] = useState('');
  const [replyCursorPosition, setReplyCursorPosition] = useState(0);

  // Dropdown states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  // Custom hook for post services data
  const { posts, setPosts, collaborators, departments } = usePostServices(workspaceId, subtaskId, isOpen);

  // Attachment handlers
  const addAttachment = (file) => {
    if (!file) return;
    const newItem = { id: `${Date.now()}-${file.name}`, name: file.name, size: file.size, file };
    setAttachments(prev => [...prev, newItem]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const onPickFile = () => fileInputRef.current?.click();

  // Handle text input changes and detect @ and # triggers
  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessage(value);
    setCursorPosition(cursorPos);

    // Check for @ mention trigger - single word only
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([^\s]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
      setShowHashtagDropdown(false);
    } else {
      setShowMentionDropdown(false);
    }

    // Check for # hashtag trigger - single word only
    const hashtagMatch = beforeCursor.match(/#([^\s]*)$/);
    if (hashtagMatch) {
      setHashtagQuery(hashtagMatch[1]);
      setShowHashtagDropdown(true);
      setShowMentionDropdown(false);
    } else {
      setShowHashtagDropdown(false);
    }
  };

  // Insert mention or hashtag
  const insertMention = (name) => {
    const beforeCursor = message.substring(0, cursorPosition);
    const afterCursor = message.substring(cursorPosition);
    const beforeMention = beforeCursor.replace(/@[^\s]*$/, '');
    const newMessage = beforeMention + `@${name} ` + afterCursor;
    setMessage(newMessage);
    setShowMentionDropdown(false);
  };

  const insertHashtag = (department) => {
    const beforeCursor = message.substring(0, cursorPosition);
    const afterCursor = message.substring(cursorPosition);
    const beforeHashtag = beforeCursor.replace(/#[^\s]*$/, '');
    const newMessage = beforeHashtag + `#${department} ` + afterCursor;
    setMessage(newMessage);
    setShowHashtagDropdown(false);
  };

  // Reply mention and hashtag handlers
  const insertReplyMention = (name) => {
    const beforeCursor = replyMessage.substring(0, replyCursorPosition);
    const afterCursor = replyMessage.substring(replyCursorPosition);
    const beforeMention = beforeCursor.replace(/@[^\s]*$/, '');
    const newMessage = beforeMention + `@${name} ` + afterCursor;
    setReplyMessage(newMessage);
    setShowReplyMentionDropdown(false);
    setReplyMentionQuery('');
  };

  const insertReplyHashtag = (department) => {
    const beforeCursor = replyMessage.substring(0, replyCursorPosition);
    const afterCursor = replyMessage.substring(replyCursorPosition);
    const beforeHashtag = beforeCursor.replace(/#[^\s]*$/, '');
    const newMessage = beforeHashtag + `#${department} ` + afterCursor;
    setReplyMessage(newMessage);
    setShowReplyHashtagDropdown(false);
    setReplyHashtagQuery('');
  };

  // Handle reply message changes and detect @ and # triggers
  const handleReplyMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setReplyMessage(value);
    setReplyCursorPosition(cursorPos);

    // Check for @ mention trigger - single word only
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([^\s]*)$/);
    if (mentionMatch) {
      console.log('🔍 Reply @ mention detected:', mentionMatch[1]);
      setReplyMentionQuery(mentionMatch[1]);
      setShowReplyMentionDropdown(true);
      setShowReplyHashtagDropdown(false);
    } else {
      setShowReplyMentionDropdown(false);
    }

    // Check for # hashtag trigger - single word only
    const hashtagMatch = beforeCursor.match(/#([^\s]*)$/);
    if (hashtagMatch) {
      console.log('🔍 Reply # hashtag detected:', hashtagMatch[1]);
      setReplyHashtagQuery(hashtagMatch[1]);
      setShowReplyHashtagDropdown(true);
      setShowReplyMentionDropdown(false);
    } else {
      setShowReplyHashtagDropdown(false);
    }
  };

  // Handle reply to a specific post
  const handleReply = async (parentPostId) => {
    if (!replyMessage.trim() || isReplying) return;

    setIsReplying(true);
    try {
      // Create FormData to handle file uploads for replies
      const formData = new FormData();
      
      // Add text data
      formData.append('workspaceId', workspaceId);
      formData.append('senderId', currentUser?.vendorId || currentUser?.id || currentUser?.userId || 'default-user-id');
      formData.append('senderName', displayUser.name);
      formData.append('senderEmail', currentUser?.email || '');
      formData.append('senderRole', currentUser?.role || 'vendor');
      formData.append('content', replyMessage);
      formData.append('parentPostId', parentPostId);
      formData.append('subtaskId', subtaskId || '');
      formData.append('taskId', taskId || '');
      
      // Add actual files to FormData for replies with the correct field name 'attachments'
      replyAttachments.forEach((attachment) => {
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });

      console.log('📝 PostServicesModal: Creating reply with FormData:', {
        parentPostId,
        senderName: displayUser.name,
        content: replyMessage.substring(0, 50) + '...',
        attachmentsCount: replyAttachments.length,
        hasFiles: replyAttachments.some(att => att.file)
      });

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/post-services/reply`, {
        method: 'POST',
        // Don't set Content-Type header - let browser set it with boundary for FormData
        body: formData
      });

      if (response.ok) {
        const newReply = await response.json();
        
        // Add the reply to the local state
        setPosts(prev => prev.map(post => {
          if (post.id === parentPostId) {
            return {
              ...post,
              replies: [...(post.replies || []), {
                id: newReply.postId || `reply-${Date.now()}`,
                author: { name: displayUser.name, role: displayUser.role },
                dateLabel: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase(),
                text: replyMessage,
                parentPostId: parentPostId
              }]
            };
          }
          return post;
        }));
        
        // Clear the reply form
        setReplyMessage('');
        setReplyAttachments([]);
        setReplyingTo(null);
        
        console.log('Reply created successfully:', newReply);
      } else {
        const errorData = await response.json();
        console.error('Failed to create reply:', errorData);
        alert('Failed to create reply. Please try again.');
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('Error creating reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const handlePost = async () => {
    if (!message.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('workspaceId', workspaceId);
      formData.append('senderId', currentUser?.vendorId || currentUser?.id || currentUser?.userId || 'default-user-id');
      formData.append('senderName', displayUser.name);
      formData.append('senderEmail', currentUser?.email || '');
      formData.append('senderRole', currentUser?.role || 'vendor');
      formData.append('content', message);
      formData.append('subtaskId', subtaskId || '');
      formData.append('taskId', taskId || '');

      attachments.forEach((attachment) => {
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/post-services`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newPost = await response.json();
        const firstImage = attachments.find(a => a.file?.type?.startsWith('image/')) || attachments[0] || null;
        setPosts(prev => [
          {
            id: newPost.postId || `post-${Date.now()}`,
            author: { name: displayUser.name, role: displayUser.role },
            dateLabel: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase(),
            text: message,
            attachment: firstImage ? { name: firstImage.name, size: firstImage.size, preview: firstImage.file ? URL.createObjectURL(firstImage.file) : null } : null
          },
          ...prev
        ]);

        setMessage('');
        setAttachments([]);
        setShowComposer(true);
      } else {
        const errorData = await response.json();
        console.error('Failed to create post:', errorData);
        alert('Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex-1" onClick={onClose} role="presentation" />
      <div className="relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Post services</h2>
            {subtaskId && (
              <p className="text-xs text-gray-500 mt-0.5">
                Posts for: {selectedSubtask?.name || `Subtask ${subtaskId}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComposer(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Post
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close post services">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showComposer && (
            <PostComposer
              message={message}
              setMessage={setMessage}
              handleMessageChange={handleMessageChange}
              cursorPosition={cursorPosition}
              setCursorPosition={setCursorPosition}
              attachments={attachments}
              addAttachment={addAttachment}
              removeAttachment={removeAttachment}
              onPickFile={onPickFile}
              fileInputRef={fileInputRef}
              displayUser={displayUser}
              currentUser={currentUser}
              collaborators={collaborators}
              departments={departments}
              showMentionDropdown={showMentionDropdown}
              setShowMentionDropdown={setShowMentionDropdown}
              showHashtagDropdown={showHashtagDropdown}
              setShowHashtagDropdown={setShowHashtagDropdown}
              mentionQuery={mentionQuery}
              setMentionQuery={setMentionQuery}
              hashtagQuery={hashtagQuery}
              setHashtagQuery={setHashtagQuery}
              insertMention={insertMention}
              insertHashtag={insertHashtag}
              handlePost={handlePost}
              isPosting={isPosting}
              renderTextWithHighlights={renderTextWithHighlights}
            />
          )}

          <PostList
            posts={posts}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyMessage={replyMessage}
            setReplyMessage={setReplyMessage}
            isReplying={isReplying}
            handleReply={handleReply}
            displayUser={displayUser}
            renderTextWithHighlights={renderTextWithHighlights}
            formatSizeMB={formatSizeMB}
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
        </div>
      </div>
    </div>
  );
};

export default PostServicesModal;