import React, { useMemo, useRef, useState, useEffect } from 'react';
import { X, Hash, AtSign, Paperclip, Send, Image as ImageIcon, User, ChevronDown } from 'lucide-react';
import config from '../../../../config/env';

const PostServicesModal = ({ isOpen, onClose, currentUser, workspaceId, subtaskId, taskId, selectedSubtask }) => {
  const fileInputRef = useRef(null);

  const displayUser = useMemo(() => {
    // Try different possible name properties from currentUser
    const name = currentUser?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
    const role = currentUser?.role ? (currentUser.role === 'pm' ? 'Project manager' : currentUser.role) : 'vendor';
    return { name, role };
  }, [currentUser]);

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [posts, setPosts] = useState([
    {
      id: 'post-1',
      author: { name: 'David', role: 'Client' },
      dateLabel: '24th aug 2025',
      text: 'Hello @Sanjay  I need immediate Service for my AC  #Turnkey',
      attachment: { name: 'Photos.jpeg', size: 2.5 * 1024 * 1024, preview: null }
    }
  ]);

  // Dropdown states
  const [collaborators, setCollaborators] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  // Fetch collaborators, departments, and existing posts
  useEffect(() => {
    if (isOpen && workspaceId) {
      console.log('🔍 PostServicesModal: Opening with context:', {
        workspaceId,
        subtaskId,
        taskId,
        selectedSubtask: selectedSubtask?.name
      });
      fetchCollaborators();
      fetchDepartments();
      fetchPosts();
    }
  }, [isOpen, workspaceId, subtaskId]);

  const fetchPosts = async () => {
    try {
      // Use subtask-specific endpoint if subtaskId is provided, otherwise use workspace endpoint
      const url = subtaskId 
        ? `/api/post-services/${workspaceId}/subtask/${subtaskId}`
        : `/api/post-services/${workspaceId}`;
      
      console.log('🔍 Fetching posts from:', url);
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        const formattedPosts = result.posts.map(post => ({
          id: post.postId,
          author: { 
            name: post.senderName, 
            role: post.senderRole === 'pm' ? 'Project manager' : post.senderRole 
          },
          dateLabel: new Date(post.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }).toLowerCase(),
          text: post.content,
          attachment: post.attachments && post.attachments.length > 0 ? {
            name: post.attachments[0].fileName,
            size: post.attachments[0].size,
            preview: null
          } : null,
          replies: post.replies ? post.replies.map(reply => ({
            id: reply.postId,
            author: { 
              name: reply.senderName, 
              role: reply.senderRole === 'pm' ? 'Project manager' : reply.senderRole 
            },
            dateLabel: new Date(reply.createdAt).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            }).toLowerCase(),
            text: reply.content,
            parentPostId: reply.parentPostId
          })) : []
        }));
        setPosts(formattedPosts);
        console.log(`✅ Loaded ${formattedPosts.length} posts for ${subtaskId ? `subtask ${subtaskId}` : 'workspace'}`);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/collaborators`);
      if (response.ok) {
        const result = await response.json();
        setCollaborators(result.collaborators || []);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchDepartments = async () => {
    // Mock departments - in real app, fetch from API
    setDepartments([
      'Turnkey',
      'Procurement', 
      'Finance',
      'Logistics',
      'Quality Control',
      'Safety',
      'Engineering',
      'Project Management'
    ]);
  };

  const addAttachment = (file) => {
    if (!file) return;
    
    const newItem = { 
      id: `${Date.now()}-${file.name}`, 
      name: file.name, 
      size: file.size, 
      file: file
    };
    
    setAttachments(prev => [...prev, newItem]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const formatSizeMB = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} mb`;
  };

  // Render text with colored mentions and hashtags
  const renderTextWithHighlights = (text) => {
    if (!text) return null; // Return null instead of '' for React rendering
    
    // Find all complete mentions and hashtags (followed by space or end of string)
    const mentionRegex = /@[a-zA-Z0-9_\s]+(?=\s|$)/g;
    const hashtagRegex = /#[a-zA-Z0-9_\s]+(?=\s|$)/g;
    
    let result = text;
    let parts = [];
    let lastIndex = 0;
    
    // Find all matches and their positions
    const matches = [];
    let match;
    
    // Find mentions
    while ((match = mentionRegex.exec(text)) !== null) {
      matches.push({
        type: 'mention',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Find hashtags
    while ((match = hashtagRegex.exec(text)) !== null) {
      matches.push({
        type: 'hashtag',
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);
    
    // Build the result
    matches.forEach((match, index) => {
      // Add text before the match
      if (match.start > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.start)
        });
      }
      
      // Add the match
      parts.push({
        type: match.type,
        content: match.text
      });
      
      lastIndex = match.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    // If no matches, return the original text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'mention') {
        return (
          <span key={index} className="text-green-600 font-medium">
            {part.content}
          </span>
        );
      } else if (part.type === 'hashtag') {
        return (
          <span key={index} className="text-purple-600 font-medium">
            {part.content}
          </span>
        );
      }
      return part.content;
    });
  };

  // Handle text input changes and detect @ and # triggers
  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessage(value);
    setCursorPosition(cursorPos);

    // Check for @ mention trigger - support multi-word names
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([^\s]*(?:\s+[^\s]*)*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
      setShowHashtagDropdown(false);
    } else {
      setShowMentionDropdown(false);
    }

    // Check for # hashtag trigger - support multi-word names
    const hashtagMatch = beforeCursor.match(/#([^\s]*(?:\s+[^\s]*)*)$/);
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
    const beforeMention = beforeCursor.replace(/@[^\s]*(?:\s+[^\s]*)*$/, '');
    const newMessage = beforeMention + `@${name} ` + afterCursor;
    setMessage(newMessage);
    setShowMentionDropdown(false);
  };

  const insertHashtag = (department) => {
    const beforeCursor = message.substring(0, cursorPosition);
    const afterCursor = message.substring(cursorPosition);
    const beforeHashtag = beforeCursor.replace(/#[^\s]*(?:\s+[^\s]*)*$/, '');
    const newMessage = beforeHashtag + `#${department} ` + afterCursor;
    setMessage(newMessage);
    setShowHashtagDropdown(false);
  };

  // Filter options based on query
  const filteredCollaborators = collaborators.filter(collab => 
    collab.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const filteredDepartments = departments.filter(dept => 
    dept.toLowerCase().includes(hashtagQuery.toLowerCase())
  );

  // Handle reply to a specific post
  const handleReply = async (parentPostId) => {
    if (!replyMessage.trim() || isReplying) return;

    setIsReplying(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add text fields
      formData.append('workspaceId', workspaceId);
      formData.append('senderId', currentUser?.vendorId || currentUser?.id || currentUser?.userId || 'default-user-id');
      formData.append('senderName', displayUser.name);
      formData.append('senderEmail', currentUser?.email);
      formData.append('senderRole', currentUser?.role || 'vendor');
      formData.append('content', replyMessage);
      formData.append('parentPostId', parentPostId);
      formData.append('subtaskId', subtaskId || '');
      formData.append('taskId', taskId || '');
      
      // Add reply files
      replyAttachments.forEach((attachment) => {
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });

      const response = await fetch(`/api/post-services/reply`, {
        method: 'POST',
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
        setReplyingTo(null);
        setReplyAttachments([]);
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
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add text fields
      formData.append('workspaceId', workspaceId);
      formData.append('senderId', currentUser?.vendorId || currentUser?.id || currentUser?.userId || 'default-user-id');
      formData.append('senderName', displayUser.name);
      formData.append('senderEmail', currentUser?.email);
      formData.append('senderRole', currentUser?.role || 'vendor');
      formData.append('content', message);
      formData.append('subtaskId', subtaskId || '');
      formData.append('taskId', taskId || '');
      
      // Add files
      attachments.forEach((attachment) => {
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });

      // Send post to backend API with FormData
      const response = await fetch(`/api/post-services`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newPost = await response.json();
        
        // Add the new post to local state for immediate UI update
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
        
        // Clear the form
        setMessage('');
        setAttachments([]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Post services</h2>
            {subtaskId && (
              <p className="text-sm text-gray-500 mt-1">
                Posts for: {selectedSubtask?.name || `Subtask ${subtaskId}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Composer */}
        <div className="p-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={displayUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{displayUser.name}</div>
                <div className="text-xs text-gray-500">{displayUser.role}</div>
              </div>
            </div>
            <div className="px-4 pb-3 relative">
              <div className="relative">
                <div className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg bg-white text-[13px] text-gray-800 whitespace-pre-wrap break-words leading-[1.4] focus-within:ring-8 focus-within:ring-blue-500 focus-within:border-transparent">
                  {renderTextWithHighlights(message)}
                  {!message && (
                    <span className="text-gray-400">Write your service request...</span>
                  )}
                </div>
                <textarea
                  value={message}
                  onChange={handleMessageChange}
                  rows={3}
                  className="absolute inset-0 w-full h-full resize-none outline-none text-[13px] text-transparent bg-transparent placeholder-transparent [text-indent:2px] cursor-text"
                  style={{
                    caretColor: '#374151',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                />
              </div>
               
               {/* Mention Dropdown */}
               {showMentionDropdown && (
                 <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                   {filteredCollaborators.length > 0 ? (
                     filteredCollaborators.map((collab) => (
                       <button
                         key={collab.vendorId}
                         onClick={() => insertMention(collab.name)}
                         className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                       >
                         <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                           <span className="text-xs font-medium text-gray-600">
                             {collab.avatar || collab.name.charAt(0).toUpperCase()}
                           </span>
                         </div>
                         <div>
                           <div className="text-sm font-medium text-gray-900">{collab.name}</div>
                           <div className="text-xs text-gray-500">{collab.specialization}</div>
                         </div>
                       </button>
                     ))
                   ) : (
                     <div className="px-3 py-2 text-sm text-gray-500">No collaborators found</div>
                   )}
                 </div>
               )}

               {/* Hashtag Dropdown */}
               {showHashtagDropdown && (
                 <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                   {filteredDepartments.length > 0 ? (
                     filteredDepartments.map((dept) => (
                       <button
                         key={dept}
                         onClick={() => insertHashtag(dept)}
                         className="w-full px-2 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                       >
                         <Hash className="w-4 h-4 text-gray-400 font-bold" />
                         <span className="text-sm text-gray-900 font-bold">{dept}</span>
                       </button>
                     ))
                   ) : (
                     <div className="px-3 py-2 text-sm text-gray-500">No departments found</div>
                   )}
                 </div>
               )}

               {/* Attachment chips */}
               <div className="flex flex-wrap gap-2 mt-2">
                 {attachments.map(att => (
                   <div key={att.id} className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 border border-gray-200 rounded-md">
                     <span className="text-xs text-gray-700">{att.name}</span>
                     <button onClick={() => removeAttachment(att.id)} className="p-1 hover:bg-gray-200 rounded">
                       <X className="w-3 h-3 text-gray-500" />
                     </button>
                   </div>
                 ))}
               </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-md border border-purple-200 hover:bg-purple-100">
                  <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" /> department</span>
                </button>
                <button className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-md border border-green-200 hover:bg-green-100">
                  <span className="inline-flex items-center gap-1"><AtSign className="w-3 h-3" /> Person</span>
                </button>
                <button onClick={onPickFile} className="p-1.5 rounded-md hover:bg-gray-100" title="Attach">
                  <Paperclip className="w-4 h-4 text-gray-600" />
                </button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  className="hidden" 
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      Array.from(e.target.files).forEach((file) => {
                        addAttachment(file);
                      });
                    }
                  }} 
                />
              </div>
              <button 
                onClick={handlePost} 
                disabled={isPosting || !message.trim()}
                className={`px-3 py-1.5 text-xs rounded-md inline-flex items-center gap-1 transition-colors ${
                  isPosting || !message.trim()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isPosting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <span>Post</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="px-5 pb-5 flex-1 overflow-y-auto">
          <div className="text-sm font-semibold text-gray-800 mb-3">Services</div>
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
              <div className="flex items-start justify-between px-4 py-3">
                <div className="flex items-center">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{post.author.name}</div>
                    <div className="text-xs text-gray-500">{post.author.role}</div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400">{post.dateLabel}</div>
              </div>
              <div className="px-4 pb-3 text-[13px] text-gray-800">
                {renderTextWithHighlights(post.text)}
              </div>
              {post.attachment && (
                <div className="px-4">
                  <div className="text-xs text-gray-600 mb-2">Attachment</div>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    {post.attachment.preview ? (
                      <img src={post.attachment.preview} alt={post.attachment.name} className="w-full max-h-48 object-cover" />
                    ) : (
                      <div className="h-28 bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600 border border-gray-200 rounded-md px-3 py-2">
                    <span>{post.attachment.name}</span>
                    <span>{formatSizeMB(post.attachment.size)}</span>
                  </div>
                </div>
              )}
              <div className="px-4 py-3 flex items-center justify-between text-[13px] text-gray-600">
                <button className="inline-flex items-center gap-1 hover:text-gray-800">
                  <span className="text-base leading-none">▢</span>
                  <span>{post.replies?.length || 0} replies</span>
                </button>
                <button 
                  onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                  className="hover:text-gray-800"
                >
                  reply
                </button>
              </div>

              {/* Reply Composer */}
              {replyingTo === post.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder={`Reply to ${post.author.name}...`}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Replying to {post.author.name}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyMessage('');
                            }}
                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReply(post.id)}
                            disabled={isReplying || !replyMessage.trim()}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
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
              )}

              {/* Replies Thread */}
              {post.replies && post.replies.length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 space-y-3">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start space-x-3 pl-6 border-l-2 border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{reply.author.name}</span>
                            <span className="text-xs text-gray-500">{reply.author.role}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">{reply.dateLabel}</span>
                          </div>
                          <div className="text-sm text-gray-800">
                            {renderTextWithHighlights(reply.text)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostServicesModal;


