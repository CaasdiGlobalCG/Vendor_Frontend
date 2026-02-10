import { useState, useEffect } from 'react';
import config from '../../../../../../config/env.js';

export const usePostServices = (workspaceId, subtaskId, isOpen) => {
  const [posts, setPosts] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchPosts = async () => {
    try {
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
          attachments: post.attachments || [], // Pass the full attachments array
          attachment: post.attachments && post.attachments.length > 0 ? {
            name: post.attachments[0].fileName,
            size: post.attachments[0].fileSize,
            preview: post.attachments[0].fileUrl
          } : null,
          taskId: post.taskId || '',
          taskName: post.taskName || '',
          subtaskId: post.subtaskId || '',
          subtaskName: post.subtaskName || '',
          unlockRequest: post.unlockRequest || null, // Include unlock request data
          replies: post.replies ? post.replies.map(reply => ({
            id: reply.replyId,
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
            attachments: reply.attachments || [], // Pass reply attachments
            parentPostId: post.postId // The parent post ID is the post's own ID
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

  const fetchDepartments = () => {
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

  useEffect(() => {
    if (isOpen && workspaceId) {
      console.log('🔍 PostServicesModal: Opening with context:', {
        workspaceId,
        subtaskId
      });
      fetchCollaborators();
      fetchDepartments();
      fetchPosts();
    }
  }, [isOpen, workspaceId, subtaskId]);

  return {
    posts,
    setPosts,
    collaborators,
    departments,
    fetchPosts
  };
};
