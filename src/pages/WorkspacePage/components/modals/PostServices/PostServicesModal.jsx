import React, { useMemo, useRef, useState, useEffect } from 'react';
import { X, User, Plus, ChevronDown } from 'lucide-react';
import PostComposer from './PostComposer';
import PostList from './PostList';
import { usePostServices } from './hooks/usePostServices';
import { renderTextWithHighlights, formatSizeMB } from './utils/textUtils.jsx';
import config from '../../../../../config/env.js';

const PostServicesModal = ({ isOpen, onClose, currentUser, workspaceId, subtaskId, taskId, selectedSubtask, workspace, onWorkspaceUpdate }) => {
  const fileInputRef = useRef(null);

  const displayUser = useMemo(() => {
    const name = currentUser?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
    const role = currentUser?.role ? (currentUser.role === 'pm' ? 'Project manager' : currentUser.role) : 'vendor';
    return { name, role };
  }, [currentUser]);

  // State for task and subtask selection
  const [selectedTaskForPost, setSelectedTaskForPost] = useState(taskId || '');
  const [selectedSubtaskForPost, setSelectedSubtaskForPost] = useState(subtaskId || '');
  const [availableSubtasks, setAvailableSubtasks] = useState([]);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [showSubtaskDropdown, setShowSubtaskDropdown] = useState(false);

  // State for post composer
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
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

  // Get all tasks from workspace
  const allTasks = useMemo(() => workspace?.tasks || [], [workspace]);

  // Update available subtasks when task is selected
  useEffect(() => {
    if (selectedTaskForPost) {
      const task = allTasks.find(t => t.id === selectedTaskForPost);
      setAvailableSubtasks(task?.subtasks || []);
    } else {
      setAvailableSubtasks([]);
      setSelectedSubtaskForPost('');
    }
  }, [selectedTaskForPost, allTasks]);

  // Get selected task and subtask names for display
  const selectedTaskName = useMemo(() => {
    const task = allTasks.find(t => t.id === selectedTaskForPost);
    return task?.name || 'Select Task';
  }, [allTasks, selectedTaskForPost]);

  const selectedSubtaskName = useMemo(() => {
    const subtask = availableSubtasks.find(st => st.id === selectedSubtaskForPost);
    return subtask?.name || 'Select Subtask';
  }, [availableSubtasks, selectedSubtaskForPost]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTaskDropdown || showSubtaskDropdown) {
        const target = event.target;
        const isTaskButton = target.closest('[data-task-dropdown]');
        const isSubtaskButton = target.closest('[data-subtask-dropdown]');
        
        if (!isTaskButton) setShowTaskDropdown(false);
        if (!isSubtaskButton) setShowSubtaskDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTaskDropdown, showSubtaskDropdown]);

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
      formData.append('subtaskId', selectedSubtaskForPost || '');
      formData.append('taskId', selectedTaskForPost || '');
      
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

    // Validate task and subtask selection
    if (!selectedTaskForPost || !selectedSubtaskForPost) {
      alert('Please select both a task and subtask before posting a service request.');
      return;
    }

    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('workspaceId', workspaceId);
      formData.append('senderId', currentUser?.vendorId || currentUser?.id || currentUser?.userId || 'default-user-id');
      formData.append('senderName', displayUser.name);
      formData.append('senderEmail', currentUser?.email || '');
      formData.append('senderRole', currentUser?.role || 'vendor');
      formData.append('content', message);
      formData.append('subtaskId', selectedSubtaskForPost || '');
      formData.append('taskId', selectedTaskForPost || '');

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
        // Find task and subtask names for display
        const selectedTask = allTasks.find(t => t.id === selectedTaskForPost);
        const selectedSubtask = selectedTask?.subtasks?.find(s => s.id === selectedSubtaskForPost);
        
        setPosts(prev => [
          {
            id: newPost.postId || `post-${Date.now()}`,
            author: { name: displayUser.name, role: displayUser.role },
            dateLabel: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase(),
            text: message,
            attachment: firstImage ? { name: firstImage.name, size: firstImage.size, preview: firstImage.file ? URL.createObjectURL(firstImage.file) : null } : null,
            taskId: selectedTaskForPost,
            taskName: selectedTask?.name || '',
            subtaskId: selectedSubtaskForPost,
            subtaskName: selectedSubtask?.name || ''
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

  const handleUnlockRequest = async (postId, taskId, subtaskId) => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/post-services/${postId}/unlock-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          taskId,
          subtaskId,
          requestedBy: currentUser?.id || currentUser?.userId || 'default-user-id',
          requestedByName: displayUser.name,
          requestedByRole: currentUser?.role || displayUser.role
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the post with unlock request status
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, unlockRequest: result.unlockRequest }
            : post
        ));
        
        console.log('✅ Unlock request created:', result);
        alert('Unlock request sent to client for approval');
      } else {
        const errorData = await response.json();
        console.error('Failed to create unlock request:', errorData);
        alert('Failed to create unlock request. Please try again.');
      }
    } catch (error) {
      console.error('Error creating unlock request:', error);
      alert('Error creating unlock request. Please try again.');
    }
  };

  const handleUnlockApprove = async (postId, taskId, subtaskId, approved) => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/post-services/${postId}/unlock-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          taskId,
          subtaskId,
          approved,
          approvedBy: currentUser?.id || currentUser?.userId || 'default-user-id',
          approvedByName: displayUser.name
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the post with unlock approval status
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, unlockRequest: result.unlockRequest }
            : post
        ));
        
        // Refresh workspace data if approved
        if (approved && onWorkspaceUpdate) {
          console.log('✅ Task/Subtask unlocked, refreshing workspace data...');
          await onWorkspaceUpdate();
        }
        
        console.log(`✅ Unlock ${approved ? 'approved' : 'rejected'}:`, result);
        alert(`Task unlock ${approved ? 'approved' : 'rejected'} successfully`);
      } else {
        const errorData = await response.json();
        console.error('Failed to approve unlock:', errorData);
        alert('Failed to process unlock approval. Please try again.');
      }
    } catch (error) {
      console.error('Error approving unlock:', error);
      alert('Error processing unlock approval. Please try again.');
    }
  };

  if (!isOpen) return null;

  const isVendor = displayUser.role === 'vendor';
  console.log('🔍 PostServicesModal - User Role Check:', {
    currentUser,
    displayUserRole: displayUser.role,
    isVendor
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex-1" onClick={onClose} role="presentation" />
      <div className="relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900">Post services</h2>
            
            {/* Task and Subtask Selection - Only show for non-vendors */}
            {!isVendor && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-600">Select task and subtask</span>
                  <span className="text-xs text-red-500">*Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
              
                  {/* Task Dropdown */}
                  <div className="relative" data-task-dropdown>
                <button
                  onClick={() => setShowTaskDropdown(!showTaskDropdown)}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-700">{selectedTaskName}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>
                
                {showTaskDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    <div className="py-1">
                      {allTasks.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">No tasks available</div>
                      ) : (
                        allTasks.map(task => (
                          <button
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskForPost(task.id);
                              setShowTaskDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                          >
                            {task.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Subtask Dropdown - only show if task is selected */}
              {selectedTaskForPost && (
                <>
                  <span className="text-gray-400">→</span>
                  <div className="relative" data-subtask-dropdown>
                    <button
                      onClick={() => setShowSubtaskDropdown(!showSubtaskDropdown)}
                      className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      disabled={availableSubtasks.length === 0}
                    >
                      <span className="text-gray-700">{selectedSubtaskName}</span>
                      <ChevronDown className="w-3 h-3 text-gray-500" />
                    </button>
                    
                    {showSubtaskDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        <div className="py-1">
                          {availableSubtasks.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-500">No subtasks available</div>
                          ) : (
                            availableSubtasks.map(subtask => (
                              <button
                                key={subtask.id}
                                onClick={() => {
                                  setSelectedSubtaskForPost(subtask.id);
                                  setShowSubtaskDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                              >
                                {subtask.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              </div>
            </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* New Post button - Only show for non-vendors */}
            {!isVendor && (
              <button
                onClick={() => setShowComposer(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Post
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close post services">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Post Composer - Only show for non-vendors */}
          {!isVendor && showComposer && (
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
              selectedTaskForPost={selectedTaskForPost}
              selectedSubtaskForPost={selectedSubtaskForPost}
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
            currentUser={currentUser}
            workspace={workspace}
            workspaceId={workspaceId}
            onUnlockRequest={handleUnlockRequest}
            onUnlockApprove={handleUnlockApprove}
          />
        </div>
      </div>
    </div>
  );
};

export default PostServicesModal;