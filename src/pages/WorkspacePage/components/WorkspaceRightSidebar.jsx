import React, { useState, useEffect, useContext, useRef } from 'react';
import { ChevronDown, MoreHorizontal, CheckCircle, AlertTriangle, FileText, MessageCircle, Paperclip, Send, Video, Edit3, Hand, Clock, User, Zap, Maximize2, Plus, Trash2, Move, Palette, Expand, Download, Eye, Bell, X, Info, Edit2, Check, Pin, PinOff } from 'lucide-react';
import { VendorContext } from '../../../context/VendorContext';
import ActivityFullScreen from './ActivityFullScreen';
import FullScreenMessages from './FullScreenMessages';
import FileUploadModal from './FileUploadModal';
import VideoCallModal from './VideoCallModal';
import PermissionGuard, { PermissionButton, PermissionInput } from './PermissionGuard';
import usePermissions from '../hooks/usePermissions';
import config from '../../../config/env';
import authFetch from '../../../utils/authFetch';
import { renderMentions } from '../utils/renderMentions';

const WorkspaceRightSidebar = ({
  sidebarCollapsed,
  selectedSubtask,
  selectedTask,
  recentActivities,
  messages,
  workspaceId,
  onActivityCreated, // New prop to trigger immediate refresh
  workspace, // For permission checking
  userRole, // For permission checking
  canvasElements = [], // Elements on the canvas
  onZoomToElement, // Callback to zoom to an element
  focusMode,
  isPinned,
  onTogglePin,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { currentUser } = useContext(VendorContext);
  const [realTimeActivities, setRealTimeActivities] = useState([]);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [activityExpanded, setActivityExpanded] = useState(true);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [elementsOverviewExpanded, setElementsOverviewExpanded] = useState(false);
  const [deletionHistoryExpanded, setDeletionHistoryExpanded] = useState(false);
  const [elementsSortBy, setElementsSortBy] = useState('sequence'); // 'sequence' or 'recently-updated'
  const [deletionHistory, setDeletionHistory] = useState([]);
  const [loadingDeletionHistory, setLoadingDeletionHistory] = useState(false);
  const [infoTooltipId, setInfoTooltipId] = useState(null);
  const [editingElementId, setEditingElementId] = useState(null);
  const [editingElementName, setEditingElementName] = useState('');
  const editInputRef = useRef(null);

  const handleToggleActivity = () => {
    setActivityExpanded(prev => {
      const next = !prev;
      if (next) {
        setMessagesExpanded(false);
        setDeletionHistoryExpanded(false);
      }
      return next;
    });
  };

  const handleToggleDeletionHistory = () => {
    setDeletionHistoryExpanded(prev => {
      const next = !prev;
      if (next) {
        setActivityExpanded(false);
        setMessagesExpanded(false);
        fetchDeletionHistory();
      }
      return next;
    });
  };



  const isRecentlyDeleted = (deletion) => {
    const deletedTime = new Date(deletion.deletedAt);
    const now = new Date();
    const diffInMinutes = (now - deletedTime) / (1000 * 60);
    return diffInMinutes < 5; // Recently deleted if within 5 minutes
  };

  const fetchDeletionHistory = async () => {
    if (!selectedSubtask?.id) {
      console.warn('⚠️ Cannot fetch deletion history - no subtask selected');
      return;
    }
    
    setLoadingDeletionHistory(true);
    const subtaskId = selectedSubtask.id;
    console.log('🔄 Fetching deletion history for subtask:', subtaskId);
    
    try {
      const url = `/api/element-deletion-history/subtask/${subtaskId}`;
      console.log('📡 Making request to:', url);
      
      const response = await fetch(url);
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch deletion history:', response.status, errorText);
        throw new Error(`Failed to fetch deletion history: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Deletion history response:', data);
      console.log('   - subtaskId searched:', subtaskId);
      console.log('   - deletions found:', data.deletions?.length || 0);
      if (data.deletions?.length > 0) {
        console.log('   - first deletion subtaskId:', data.deletions[0].subtaskId);
        // Sort by most recent first
        const sortedDeletions = data.deletions.sort((a, b) => 
          new Date(b.deletedAt) - new Date(a.deletedAt)
        );
        setDeletionHistory(sortedDeletions);
      } else {
        setDeletionHistory([]);
      }
    } catch (error) {
      console.error('❌ Error fetching deletion history:', error);
      setDeletionHistory([]);
    } finally {
      setLoadingDeletionHistory(false);
    }
  };

  const handleEditElement = (elementId, currentName) => {
    setEditingElementId(elementId);
    setEditingElementName(currentName);
  };

  const handleSaveElementName = (elementId) => {
    if (editingElementName.trim()) {
      // Emit event to update element name on canvas
      const event = new CustomEvent('updateElementName', {
        detail: {
          elementId: elementId,
          newName: editingElementName.trim(),
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser?.name || currentUser?.email || 'Unknown User'
        }
      });
      document.dispatchEvent(event);
      setEditingElementId(null);
      setEditingElementName('');
    }
  };

  const handleKeyDown = (e, elementId) => {
    if (e.key === 'Enter') {
      handleSaveElementName(elementId);
    } else if (e.key === 'Escape') {
      setEditingElementId(null);
      setEditingElementName('');
    }
  };

  const handleDeleteElement = (elementId, elementName) => {
    // Emit event to delete element from canvas
    const event = new CustomEvent('deleteElement', {
      detail: {
        elementId: elementId
      }
    });
    document.dispatchEvent(event);
    console.log('🗑️ Element deleted:', elementId);
  };

  const handleLockElement = (elementId) => {
    // Emit event to lock/unlock element
    const event = new CustomEvent('toggleLockElement', {
      detail: {
        elementId: elementId
      }
    });
    document.dispatchEvent(event);
    console.log('🔒 Element lock toggled:', elementId);
  };

  useEffect(() => {
    if (editingElementId !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingElementId]);

  const handleToggleMessages = () => {
    setMessagesExpanded(prev => {
      const next = !prev;
      if (next) {
        setActivityExpanded(false);
      }
      return next;
    });
  };

  const handleToggleElementsOverview = () => {
    setElementsOverviewExpanded(prev => {
      const next = !prev;
      if (next) {
        setActivityExpanded(false);
        setMessagesExpanded(false);
      }
      return next;
    });
  };

  // Helper function to check if an element is recently updated
  // An element is considered recently updated if it was added/updated within the last 5 minutes
  const isRecentlyUpdated = (element) => {
    if (!element.data?.addedAt && !element.data?.lastUpdatedAt) {
      return false;
    }
    
    const timestamp = element.data?.lastUpdatedAt || element.data?.addedAt;
    const now = new Date();
    const elementTime = new Date(timestamp);
    const minutesDiff = (now - elementTime) / (1000 * 60);
    
    // Consider element recently updated if added/updated within last 5 minutes
    return minutesDiff < 5;
  };

  // Filter and sort elements
  const sortedElements = canvasElements
    .filter(el => el && el.data)
    .sort((a, b) => {
      if (elementsSortBy === 'recently-updated') {
        // Sort by most recently updated first, then by sequence
        const isRecentA = isRecentlyUpdated(a) ? 1 : 0;
        const isRecentB = isRecentlyUpdated(b) ? 1 : 0;
        
        if (isRecentA !== isRecentB) {
          return isRecentB - isRecentA; // Recently updated first
        }
        
        // If both are recent or both are not, sort by timestamp
        const timeA = new Date(a.data?.lastUpdatedAt || a.data?.addedAt || 0).getTime();
        const timeB = new Date(b.data?.lastUpdatedAt || b.data?.addedAt || 0).getTime();
        if (timeA !== timeB) {
          return timeB - timeA; // Most recent first
        }
      }
      
      // Default sort by sequence number
      const seqA = a.data?.sequenceNumber || Infinity;
      const seqB = b.data?.sequenceNumber || Infinity;
      return seqA - seqB;
    });

  // Debug logging
  useEffect(() => {
    const approvalSummary = (sortedElements || [])
      .filter((el) => el && el.id)
      .map((el) => ({
        id: el.id,
        name: el.data?.name,
        approvalStatus: el.data?.approvalStatus
      }));

    console.log('🔍 Elements Overview Debug:', {
      canvasElementsCount: canvasElements?.length || 0,
      filteredCount: sortedElements.length,
      approvalSummary,
      canvasElements: canvasElements,
      sortedElements: sortedElements,
      selectedSubtask: selectedSubtask?.id,
      selectedTask: selectedTask?.id
    });
  }, [canvasElements, sortedElements, selectedSubtask, selectedTask]);
  
  // Auto-refresh to update recently updated indicators
  // This ensures the "Recently Updated" badge disappears after 5 minutes
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    // Set up interval to refresh every 30 seconds
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

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

      const canvasRef = window?.canvasWorkspaceRef?.current;
      if (canvasRef?.addDrawingFilesToCanvas) {
        await canvasRef.addDrawingFilesToCanvas(uploadedFiles, {
          source: 'right-sidebar-upload',
        });
      }
      
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
  // In focus mode when not pinned, render as overlay
  const isOverlay = focusMode && !isPinned && !sidebarCollapsed;

  return (
    <div
      className={`
        ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[min(20rem,32vw)] 2xl:w-96'}
        ${isOverlay ? 'absolute right-0 top-0 bottom-0 z-20 shadow-2xl' : ''}
        bg-white border-l border-gray-100 flex flex-col flex-shrink-0 overflow-hidden
        transition-all duration-300 ease-in-out
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Pin control in focus mode */}
      {focusMode && !sidebarCollapsed && (
        <div className="flex items-center justify-start px-3 pt-2">
          <button
            onClick={onTogglePin}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors group"
            title={isPinned ? 'Unpin panel (Ctrl+Shift+R)' : 'Pin panel (Ctrl+Shift+R)'}
            aria-label={isPinned ? 'Unpin right panel' : 'Pin right panel'}
          >
            {isPinned
              ? <PinOff className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-700" />
              : <Pin className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3 min-h-0 lg:p-4 lg:gap-4">
        {/* Accordion: Recent Activity */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all duration-300 ${activityExpanded ? 'flex-1 min-h-0' : ''}`}>
          <button
            onClick={handleToggleActivity}
            className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none lg:px-5 lg:py-4"
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
            <div className="px-4 pb-4 border-t border-gray-100 flex-1 flex flex-col min-h-0 lg:px-5 lg:pb-5">
              <div className="flex items-center justify-between mb-3 pt-3 lg:mb-4 lg:pt-4">
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
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0 text-xs lg:space-y-4">
                  {realTimeActivities.map((activity) => {
                    const IconComponent = getActivityIcon(activity);
                    const colorClass = getActivityColor(activity);

                    return (
                      <div key={activity.activityId} className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full flex-shrink-0 lg:w-8 lg:h-8">
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
                <div className="text-center py-7 lg:py-8">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}

              <button
                onClick={() => setShowFullScreen(true)}
                className="w-full mt-3 pt-3 border-t border-gray-100 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors lg:mt-4 lg:pt-4"
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
            className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none lg:px-5 lg:py-4"
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
                              {renderMentions(message.content)}
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

                                              const response = await authFetch(`${config.VENDOR_BACKEND_URL}/api/workspace-files/view-url`, {
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
                      onClick={() => {
                        if (!selectedSubtask?.id) {
                          alert('Please select a subtask before uploading drawings or files.');
                          return;
                        }
                        setShowFileUpload(true);
                      }}
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

        {/* Accordion: Elements Overview */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all duration-300 ${elementsOverviewExpanded ? 'flex-1 min-h-0' : ''}`}>
          <button
            onClick={handleToggleElementsOverview}
            className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none hover:bg-gray-50 transition-colors lg:px-5 lg:py-4"
          >
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-gray-900">Elements Overview</h4>
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{sortedElements.length}</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${elementsOverviewExpanded ? 'transform rotate-180' : ''}`} />
          </button>
          
          {/* Sort Options */}
          {elementsOverviewExpanded && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 lg:px-5">
              <span className="text-xs text-gray-600 font-medium">Sort by:</span>
              <select
                value={elementsSortBy}
                onChange={(e) => setElementsSortBy(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="sequence">Sequence</option>
                <option value="recently-updated">Recently Updated</option>
              </select>
            </div>
          )}
          <div className={`${elementsOverviewExpanded ? 'flex-1 flex flex-col opacity-100 min-h-0' : 'max-h-0 opacity-0 pointer-events-none'} transition-all duration-300 ease-in-out overflow-hidden`}
               style={{transitionProperty: 'max-height, opacity'}}>
            <div className="px-3 pb-4 border-t border-gray-100 flex-1 flex flex-col min-h-0 pt-3">
              {sortedElements.length > 0 ? (
                <div className="space-y-0.5 flex-1 overflow-y-auto pr-2 min-h-0">
                  {sortedElements.map((element, idx) => (
                    <div key={element.id || idx} className={`group ${isRecentlyUpdated(element) ? 'bg-amber-50 border-l-2 border-amber-400' : ''}`}>
                      <button
                        onClick={() => {
                          if (onZoomToElement) {
                            onZoomToElement(element.id);
                          }
                        }}
                        className={`w-full px-3 py-2 text-left rounded-lg transition-colors duration-150 flex items-center justify-between ${isRecentlyUpdated(element) ? 'hover:bg-amber-100' : 'hover:bg-blue-50'}`}
                        title={`Click to zoom to ${element.data?.name || element.data?.type || 'element'}`}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-2.5">
                          {/* Sequence Number */}
                          <span className={`inline-flex items-center justify-center w-5 h-5 text-white text-[10px] font-bold rounded-full flex-shrink-0 ${isRecentlyUpdated(element) ? 'bg-amber-500' : 'bg-blue-600'}`}>
                            {element.data?.sequenceNumber || idx + 1}
                          </span>

                          {/* Element Type Icon */}
                          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-600">
                            {element.data?.type === 'form' || element.data?.type === 'form-template' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : element.data?.type === 'table' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            ) : element.data?.type === 'chart' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            ) : element.data?.type === 'image' || element.data?.type === 'file' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : element.data?.type === 'text' || element.data?.type === 'textNode' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                              </svg>
                            )}
                          </div>

                          {/* Element Name and Type */}
                          <div className="min-w-0 flex-1">
                            {editingElementId === element.id ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingElementName}
                                onChange={(e) => setEditingElementName(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, element.id)}
                                onBlur={() => handleSaveElementName(element.id)}
                                className="w-full text-xs font-medium text-gray-900 px-2 py-1 bg-white border border-blue-400 rounded outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {element.data?.name || element.data?.type || 'Element'}
                                  </p>
                                  {isRecentlyUpdated(element) && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200 text-amber-800 flex-shrink-0 whitespace-nowrap">
                                      ✨ NEW
                                    </span>
                                  )}
                                </div>
                                {element.data?.type && element.data?.type !== (element.data?.name) && (
                                  <p className="text-xs text-gray-500 capitalize truncate">{element.data?.type}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingElementId === element.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveElementName(element.id);
                              }}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="Save name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditElement(element.id, element.data?.name || '');
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit name"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLockElement(element.id);
                                }}
                                className={`p-1 rounded transition-colors ${element.data?.locked ? 'text-orange-600 bg-orange-50' : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'}`}
                                title={element.data?.locked ? 'Unlock element' : 'Lock element'}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete element "${element.data?.name || 'Unnamed'}"?`)) {
                                    handleDeleteElement(element.id, element.data?.name || 'Unnamed');
                                  }
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete element"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoTooltipId(infoTooltipId === element.id ? null : element.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Element information"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </button>

                      {/* Info Tooltip */}
                      {infoTooltipId === element.id && (
                        <div className="mx-3 mt-1 p-2.5 bg-gray-900 text-white text-xs rounded-lg border border-gray-700 space-y-1">
                          <div>
                            <p className="text-gray-400 text-[10px] font-semibold mb-0.5">NAME</p>
                            <p className="font-medium truncate text-gray-100">{element.data?.name || 'Unnamed'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-[10px] font-semibold mb-0.5">TYPE</p>
                            <p className="font-medium capitalize truncate text-gray-100">{element.data?.type || 'Unknown'}</p>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <p className="text-gray-400 text-[10px] font-semibold mb-0.5">X</p>
                              <p className="font-mono text-gray-100">{Math.round(element.position?.x || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-[10px] font-semibold mb-0.5">Y</p>
                              <p className="font-mono text-gray-100">{Math.round(element.position?.y || 0)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                  <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">No elements yet</p>
                  <p className="text-xs text-gray-500 mt-1">Drag elements from the left panel</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accordion: Deletion History */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all duration-300 ${deletionHistoryExpanded ? 'flex-1 min-h-0' : ''}`}>
          <button
            onClick={handleToggleDeletionHistory}
            className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none hover:bg-gray-50 transition-colors lg:px-5 lg:py-4"
          >
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-gray-900">Deletion History</h4>
              {deletionHistory.length > 0 && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">{deletionHistory.length}</span>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${deletionHistoryExpanded ? 'transform rotate-180' : ''}`} />
          </button>

          <div className={`${deletionHistoryExpanded ? 'flex-1 flex flex-col opacity-100 min-h-0' : 'max-h-0 opacity-0 pointer-events-none'} transition-all duration-300 ease-in-out overflow-hidden`}
               style={{transitionProperty: 'max-height, opacity'}}>
            <div className="px-3 pb-4 border-t border-gray-100 flex-1 flex flex-col min-h-0 pt-3">
              {loadingDeletionHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                </div>
              ) : deletionHistory.length > 0 ? (
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 min-h-0">
                  {deletionHistory.map((deletion) => {
                    const recently = isRecentlyDeleted(deletion);
                    return (
                      <div 
                        key={deletion.deletionId} 
                        className={`p-3 rounded-lg border transition-colors group ${
                          recently 
                            ? 'bg-red-100 border-red-300 shadow-sm' 
                            : 'bg-red-50 border-red-100 hover:border-red-200'
                        }`}
                      >
                        {/* Recently deleted badge */}
                        {recently && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white">
                              🔥 RECENTLY DELETED
                            </span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {deletion.elementName}
                            </p>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">
                                {deletion.elementType}
                              </span>
                            </p>
                          </div>
                          <span className="text-[10px] text-red-600 font-medium flex-shrink-0 whitespace-nowrap">
                            {deletion.details?.deletedVia || 'canvas'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[10px] mb-3">
                          <div className="flex items-center gap-1 text-gray-700">
                            <User className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <span className="truncate">{deletion.deletedBy}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-700">
                            <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <span className="truncate">{new Date(deletion.deletedAt).toLocaleString()}</span>
                          </div>
                        </div>


                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trash2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No deleted elements</p>
                </div>
              )}
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
        taskId={selectedTask?.id}
        subtaskId={selectedSubtask?.id}
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