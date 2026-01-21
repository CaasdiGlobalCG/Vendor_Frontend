import React, { useState, useEffect, useContext, useRef } from 'react';
import { ChevronDown, MoreHorizontal, CheckCircle, AlertTriangle, FileText, MessageCircle, Paperclip, Send, Video, Edit3, Hand, Clock, User, Zap, Maximize2, Plus, Trash2, Move, Palette, Expand, Download, Eye, Bell, X } from 'lucide-react';
import { VendorContext } from '../../../context/VendorContext';
import ActivityFullScreen from './ActivityFullScreen';
import FullScreenMessages from './FullScreenMessages';
import FileUploadModal from './FileUploadModal';
import VideoCallModal from './VideoCallModal';
import PermissionGuard, { PermissionButton, PermissionInput } from './PermissionGuard';
import usePermissions from '../hooks/usePermissions';
import config from '../../../config/env';

const WorkspaceRightSidebar = ({
  sidebarCollapsed,
  selectedSubtask,
  selectedTask,
  recentActivities,
  messages,
  workspaceId,
  onActivityCreated, // New prop to trigger immediate refresh
  workspace, // For permission checking
  userRole // For permission checking
}) => {
  const { currentUser } = useContext(VendorContext);
  const [realTimeActivities, setRealTimeActivities] = useState([]);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [activityExpanded, setActivityExpanded] = useState(true);
  const [messagesExpanded, setMessagesExpanded] = useState(false);

  const handleToggleActivity = () => {
    setActivityExpanded(prev => {
      const next = !prev;
      if (next) {
        setMessagesExpanded(false);
      }
      return next;
    });
  };

  const handleToggleMessages = () => {
    setMessagesExpanded(prev => {
      const next = !prev;
      if (next) {
        setActivityExpanded(false);
      }
      return next;
    });
  };
  

  // Debug: Component loaded (only when no user)
  if (!currentUser) {
    console.log('🏗️ WorkspaceRightSidebar component loaded', { currentUser, workspaceId });
  }

  
  // Messaging state
  const [workspaceMessages, setWorkspaceMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [initialMessagesLoad, setInitialMessagesLoad] = useState(true);
  const [showFullScreenMessages, setShowFullScreenMessages] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);

  // Debug logging for selectedSubtask changes
  useEffect(() => {
    console.log('🔍 WorkspaceRightSidebar: selectedSubtask changed:', {
      selectedSubtask: selectedSubtask?.name,
      subtaskId: selectedSubtask?.id,
      selectedTask: selectedTask?.name,
      taskId: selectedTask?.id
    });
  }, [selectedSubtask, selectedTask]);
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [workspaceMessages]);

  // Load workspace messages
  const loadWorkspaceMessages = async (showLoading = false) => {
    if (!workspaceId) return;
    
    try {
      // Only show loading spinner when explicitly requested (initial load)
      if (showLoading) {
        setLoadingMessages(true);
      }
      // Removed frequent log
      
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-messages/workspace/${workspaceId}?limit=20`);
      
      if (response.ok) {
        const result = await response.json();
        // Messages are now returned in correct order from backend (oldest first)
        setWorkspaceMessages(result.messages || []);
        // Removed frequent log
      } else {
        console.error('❌ WorkspaceRightSidebar: Failed to load messages');
      }
    } catch (error) {
      console.error('❌ WorkspaceRightSidebar: Error loading messages:', error);
    } finally {
      if (showLoading) {
        setLoadingMessages(false);
        setInitialMessagesLoad(false);
      }
    }
  };

  // Send a new message
  const sendMessage = async () => {
    console.log('🚀 sendMessage function called!', {
      newMessage: newMessage.trim(),
      workspaceId,
      currentUser,
      sendingMessage
    });
    
    if (!newMessage.trim() || !workspaceId || !currentUser || sendingMessage) {
      console.log('❌ sendMessage blocked by conditions:', {
        hasMessage: !!newMessage.trim(),
        hasWorkspaceId: !!workspaceId,
        hasCurrentUser: !!currentUser,
        notSending: !sendingMessage
      });
      return;
    }
    
    try {
      setSendingMessage(true);
      console.log('💬 WorkspaceRightSidebar: Sending message...', { currentUser, workspaceId });
      
      // Detect user role properly
      const isPM = currentUser.role === 'pm' || 
                  currentUser.pmId || 
                  currentUser.email?.includes('pm') ||
                  currentUser.accessedFrom === 'pm-dashboard';
      
      const messageData = {
        workspaceId,
        content: newMessage.trim(),
        senderId: currentUser.id || currentUser.vendorId || currentUser.pmId,
        senderName: currentUser.name || currentUser.companyName || 'Unknown User',
        senderEmail: currentUser.email || '',
        senderRole: isPM ? 'pm' : 'vendor',
        messageType: 'text'
      };
      
      console.log('💬 Sending message data:', messageData);
      
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (response.ok) {
        const newMessageObj = await response.json();
        setWorkspaceMessages(prev => [...prev, newMessageObj]);
        setNewMessage('');
        console.log('✅ WorkspaceRightSidebar: Message sent successfully', newMessageObj);
      } else {
        const errorText = await response.text();
        console.error('❌ WorkspaceRightSidebar: Failed to send message', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        alert(`Failed to send message: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ WorkspaceRightSidebar: Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Enter key press in message input
  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle file uploads and create message with attachments
  const handleFilesSelected = async (uploadedFiles) => {
    if (uploadedFiles.length === 0) return;

    try {
      setSendingMessage(true);
      
      // Create a message with file attachments
      const messageData = {
        workspaceId,
        content: `📎 Shared ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}`,
        senderId: currentUser?.id || currentUser?.vendorId,
        senderName: currentUser?.name || currentUser?.companyName || 'Unknown User',
        senderEmail: currentUser?.email || '',
        senderRole: currentUser?.role || 'vendor',
        messageType: 'file',
        attachments: uploadedFiles.map(file => ({
          fileId: file.fileId,
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileType: file.fileType,
          s3Url: file.s3Url,
          uploadedAt: file.uploadedAt
        }))
      };

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      
      if (response.ok) {
        const newMessageObj = await response.json();
        setWorkspaceMessages(prev => [...prev, newMessageObj]);
        console.log('✅ WorkspaceRightSidebar: File message sent successfully');
      } else {
        console.error('❌ WorkspaceRightSidebar: Failed to send file message');
      }
    } catch (error) {
      console.error('❌ WorkspaceRightSidebar: Error sending file message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Load recent activities from API
  const loadRecentActivities = async () => {
    if (!workspaceId) return;

    // Only show loading spinner on initial load, not on refreshes
    if (initialLoad) {
      setLoading(true);
    }
    try {
      const queryParams = new URLSearchParams();
      if (selectedTask?.id) queryParams.append('taskId', selectedTask.id);
      if (selectedSubtask?.id) queryParams.append('subtaskId', selectedSubtask.id);
      queryParams.append('limit', '5');

      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/${workspaceId}/activities/recent?${queryParams}`);
      
      if (response.ok) {
        const result = await response.json();
        setRealTimeActivities(result.activities || []);
      }
    } catch (error) {
      console.error('❌ Error loading recent activities:', error);
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  // Get activity icon
  const getActivityIcon = (activity) => {
    const iconMap = {
      'task_created': Plus,
      'task_updated': Edit3,
      'task_deleted': Trash2,
      'subtask_created': Plus,
      'subtask_updated': Edit3,
      'subtask_deleted': Trash2,
      'element_added': Plus,
      'element_modified': Edit3,
      'element_removed': Trash2,
      'element_moved': Move,
      'style_changed': Palette,
      'file_uploaded': FileText,
      'canvas_zoomed': Zap
    };

    return iconMap[activity.action] || FileText;
  };

  // Get activity color
  const getActivityColor = (activity) => {
    const colorMap = {
      'create': 'text-green-600',
      'update': 'text-blue-600',
      'delete': 'text-red-600',
      'move': 'text-purple-600',
      'style': 'text-pink-600',
      'canvas': 'text-indigo-600'
    };

    return colorMap[activity.actionType] || 'text-gray-600';
  };

  // Format activity description
  const formatActivityDescription = (activity) => {
    const descriptions = {
      'task_created': `created task "${activity.details?.taskName || 'Untitled'}"`,
      'task_updated': `updated task "${activity.details?.taskName || 'Untitled'}"`,
      'subtask_created': `created subtask "${activity.details?.subtaskName || 'Untitled'}"`,
      'subtask_updated': `updated subtask "${activity.details?.subtaskName || 'Untitled'}"`,
      'element_added': `added ${activity.elementType || 'element'} to canvas`,
      'element_modified': `modified ${activity.elementType || 'element'}`,
      'element_removed': `removed ${activity.elementType || 'element'}`,
      'style_changed': `updated styling`,
      'file_uploaded': `uploaded file "${activity.fileInfo?.fileName || 'Unknown'}"`,
      'canvas_zoomed': `zoomed canvas`
    };

    return descriptions[activity.action] || activity.action.replace(/_/g, ' ');
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  useEffect(() => {
    loadRecentActivities();
    loadWorkspaceMessages(true); // Show loading spinner only on initial load
    
    // Set up polling for real-time updates - reduced to 10 seconds to reduce server load
    const interval = setInterval(() => {
      loadRecentActivities();
      loadWorkspaceMessages(false); // Don't show loading spinner on polling updates
    }, 10000); // Poll every 10 seconds (reduced frequency)
    
    return () => clearInterval(interval);
  }, [workspaceId]); // Only depend on workspaceId, not selectedTask/selectedSubtask

  // Trigger immediate refresh when activity is created
  useEffect(() => {
    if (onActivityCreated) {
      console.log('🚀 WorkspaceRightSidebar: Activity created, refreshing immediately...');
      loadRecentActivities();
    }
  }, [onActivityCreated]);
  return (
    <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-96'} bg-white-50 border-l border-gray-100 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out`}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4 min-h-0">
        {/* Accordion: Recent Activity */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all duration-300 ${activityExpanded ? 'flex-1 min-h-0' : ''}`}>
          <button
            onClick={handleToggleActivity}
            className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
          >
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
              {!initialLoad && loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 opacity-60"></div>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activityExpanded ? 'transform rotate-180' : ''}`} />
          </button>
          <div className={`${activityExpanded ? 'flex-1 flex flex-col opacity-100 min-h-0' : 'max-h-0 opacity-0 pointer-events-none'} transition-all duration-300 ease-in-out overflow-hidden`}
               style={{transitionProperty: 'max-height, opacity'}}>
            <div className="px-5 pb-5 border-t border-gray-100 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-500">Latest updates from the workspace</div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      console.log('🔄 Manual refresh clicked');
                      loadRecentActivities();
                    }}
                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-700 transition-colors"
                    title="Refresh activities"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowFullScreen(true)}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    title="View full activity history"
                  >
                    <Maximize2 className="w-3 h-3" />
                    {/* <span>Full Screen</span> */}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : realTimeActivities.length > 0 ? (
                <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0 text-xs">
                  {realTimeActivities.map((activity) => {
                    const IconComponent = getActivityIcon(activity);
                    const colorClass = getActivityColor(activity);

                    return (
                      <div key={activity.activityId} className="flex items-start space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full flex-shrink-0">
                          <IconComponent className={`w-4 h-4 ${colorClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-900 leading-snug">
                            <span className="font-medium">{activity.userName}</span>{' '}
                            {formatActivityDescription(activity)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}

              <button
                onClick={() => setShowFullScreen(true)}
                className="w-full mt-4 pt-4 border-t border-gray-100 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                View all activity
              </button>
            </div>
          </div>
        </div>

        {/* Accordion: Messages */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all duration-300 ${messagesExpanded ? 'flex-1 min-h-0' : ''}`}>
          <button
            onClick={handleToggleMessages}
            className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
          >
            <div className="flex items-center space-x-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Messages</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedSubtask ? selectedSubtask.name : selectedTask ? selectedTask.name : 'Team chat'}
                </p>
              </div>
              {!initialMessagesLoad && loadingMessages && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 opacity-60"></div>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${messagesExpanded ? 'transform rotate-180' : ''}`} />
          </button>
          <div className={`${messagesExpanded ? 'flex-1 flex flex-col opacity-100 min-h-0' : 'max-h-0 opacity-0 pointer-events-none'} transition-all duration-300 ease-in-out overflow-hidden`}
               style={{transitionProperty: 'max-height, opacity'}}>
            <div className="px-5 pb-5 border-t border-gray-100 flex-1 flex flex-col space-y-4 min-h-0">
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                  <Eye className="w-3 h-3" />
                  <span>Team chat history</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowFullScreenMessages(true)}
                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    title="View all messages"
                  >
                    <Expand className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setShowVideoCall(true)}
                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Start video call"
                  >
                    <Video className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : workspaceMessages.length > 0 ? (
                  workspaceMessages.map((message) => {
                    const isCurrentUser = message.senderId === (currentUser?.id || currentUser?.vendorId);
                    return (
                      <div key={message.messageId} className={`flex items-start space-x-3 ${isCurrentUser ? 'justify-end' : ''}`}>
                        {!isCurrentUser && (
                          <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full flex-shrink-0">
                            <User className="w-3 h-3 text-gray-600" />
                          </div>
                        )}
                        <div className={`${isCurrentUser ? 'text-right' : ''}`}>
                          <div className={`${isCurrentUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-50 text-gray-900 rounded-tl-sm'} rounded-2xl px-3 py-1.5 w-full`}>
                            <p className="text-sm leading-tight break-words whitespace-pre-wrap">
                              {message.content}
                            </p>

                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {message.attachments.map((file, index) => (
                                  <div key={index} className={`p-2 rounded-md border transition-all ${isCurrentUser ? 'border-blue-300 bg-blue-50 bg-opacity-30' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex items-center space-x-3">
                                      <div className="flex-shrink-0">
                                        {file.fileType?.startsWith('image/') ? (
                                          <img
                                            src={file.s3Url}
                                            alt={file.fileName}
                                            className="w-8 h-8 object-cover rounded-md cursor-pointer"
                                            onClick={() => window.open(file.s3Url, '_blank')}
                                          />
                                        ) : (
                                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isCurrentUser ? 'bg-blue-200' : 'bg-blue-100'}`}>
                                            <FileText className={`w-4 h-4 ${isCurrentUser ? 'text-blue-800' : 'text-blue-600'}`} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium break-words ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                                          {file.fileName}
                                        </p>
                                        <p className={`text-[11px] ${isCurrentUser ? 'text-blue-700' : 'text-gray-500'}`}>
                                          {file.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : '0 KB'}
                                        </p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={async (event) => {
                                            const button = event.currentTarget;
                                            const originalHTML = button.innerHTML;

                                            try {
                                              button.disabled = true;
                                              button.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>';

                                              const fileKey = file.key || file.s3Key ||
                                                (file.s3Url ? file.s3Url.split('amazonaws.com/').pop() : null);

                                              if (!fileKey) {
                                                console.error('No file key or URL found:', file);
                                                throw new Error('File reference is missing required information');
                                              }

                                              const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspace-files/view-url`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({
                                                  s3Key: fileKey,
                                                  fileName: file.fileName || file.name,
                                                  contentDisposition: 'inline'
                                                })
                                              });

                                              if (!response.ok) {
                                                const errorData = await response.json().catch(() => ({}));
                                                console.error('Failed to get signed URL:', response.status, errorData);
                                                throw new Error(errorData.message || 'Failed to get file access');
                                              }

                                              const result = await response.json();
                                              if (result.viewUrl) {
                                                window.open(result.viewUrl, '_blank');
                                                return;
                                              } else {
                                                console.error('No view URL in response:', result);
                                                throw new Error('Invalid response from server');
                                              }
                                            } catch (error) {
                                              console.error('Error viewing file:', error);
                                              alert(`Unable to preview file: ${error.message}. Please try downloading it instead.`);
                                            } finally {
                                              if (button) {
                                                button.disabled = false;
                                                button.innerHTML = originalHTML;
                                              }
                                            }
                                          }}
                                          className={`p-1.5 rounded transition-colors ${isCurrentUser ? 'hover:bg-blue-300 text-blue-800' : 'hover:bg-gray-200 text-gray-600'}`}
                                          title="View"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = file.s3Url;
                                            link.download = file.fileName;
                                            link.click();
                                          }}
                                          className={`p-2 rounded-md transition-colors ${isCurrentUser ? 'hover:bg-blue-300 text-blue-800' : 'hover:bg-gray-200 text-gray-600'}`}
                                          title="Download"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-1">
                            <p className={`text-[11px] text-gray-500 ${isCurrentUser ? 'mr-1' : 'ml-1'}`}>
                              {isCurrentUser ? 'You' : message.senderName} • {formatMessageTime(message.timestamp)}
                            </p>
                            {message.isEdited && (
                              <span className="text-[11px] text-gray-400 italic">edited</span>
                            )}
                          </div>
                        </div>
                        {isCurrentUser && (
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full flex-shrink-0">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-1">No messages yet</p>
                    <p className="text-xs text-gray-400">Start a conversation about this workspace</p>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-0" />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <PermissionGuard
                  permission="canAccessMessages"
                  workspace={workspace}
                  userRole={userRole}
                  fallback={
                    <div className="p-3 bg-gray-100 rounded-2xl border border-gray-200">
                      <div className="flex items-center justify-center text-gray-500">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm">Messaging disabled by project manager</span>
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:bg-white transition-all duration-200">
                    <PermissionButton
                      permission="canViewFiles"
                      workspace={workspace}
                      userRole={userRole}
                      onClick={() => setShowFileUpload(true)}
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Upload files"
                      showTooltip={false}
                    >
                      <Paperclip className="w-4 h-4 text-gray-400" />
                    </PermissionButton>

                    <PermissionInput
                      permission="canAccessMessages"
                      workspace={workspace}
                      userRole={userRole}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleMessageKeyPress}
                      placeholder={selectedSubtask ? `Message about ${selectedSubtask.name}...` : selectedTask ? `Message about ${selectedTask.name}...` : 'Type a message...'}
                      className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                      disabled={sendingMessage}
                    />

                    <PermissionButton
                      permission="canAccessMessages"
                      workspace={workspace}
                      userRole={userRole}
                      onClick={() => {
                        console.log('🔘 Send button clicked!');
                        sendMessage();
                      }}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      showTooltip={false}
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="w-4 h-4 text-white" />
                      )}
                    </PermissionButton>
                  </div>
                </PermissionGuard>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Activity Modal */}
      <ActivityFullScreen
        isOpen={showFullScreen}
        onClose={() => setShowFullScreen(false)}
        workspaceId={workspaceId}
        selectedTask={selectedTask}
        selectedSubtask={selectedSubtask}
      />

      {/* Full Screen Messages Modal */}
      <FullScreenMessages
        isOpen={showFullScreenMessages}
        onClose={() => setShowFullScreenMessages(false)}
        workspaceId={workspaceId}
        currentUser={currentUser}
        initialMessages={workspaceMessages}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onFilesSelected={handleFilesSelected}
        workspaceId={workspaceId}
        vendorId={currentUser?.id || currentUser?.vendorId}
      />

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        workspaceId={workspaceId}
        currentUser={currentUser}
        meetingTitle={selectedSubtask ? `${selectedSubtask.name} - Video Call` : selectedTask ? `${selectedTask.name} - Video Call` : 'Workspace Video Call'}
      />

    </div>
  );
};

export default WorkspaceRightSidebar;