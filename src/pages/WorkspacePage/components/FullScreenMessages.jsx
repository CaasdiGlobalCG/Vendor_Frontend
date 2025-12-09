import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Filter, Download, Calendar, User, MessageCircle, Send, Paperclip, MoreVertical, Reply, Edit3, Trash2, FileText, Eye } from 'lucide-react';
import config from '../../../config/env';

const FullScreenMessages = ({ 
  isOpen, 
  onClose, 
  workspaceId, 
  currentUser,
  initialMessages = []
}) => {
  const [messages, setMessages] = useState(initialMessages);
  const [filteredMessages, setFilteredMessages] = useState(initialMessages);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Load messages when component opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadAllMessages();
    }
  }, [isOpen, workspaceId]);

  // Filter messages based on search and filters
  useEffect(() => {
    let filtered = messages;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(message => 
        message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.senderName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date filter
    if (selectedDate) {
      filtered = filtered.filter(message => 
        message.date === selectedDate
      );
    }

    // User filter
    if (selectedUser) {
      filtered = filtered.filter(message => 
        message.senderId === selectedUser
      );
    }

    setFilteredMessages(filtered);
  }, [messages, searchQuery, selectedDate, selectedUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  const loadAllMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace-messages/workspace/${workspaceId}?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const messageData = {
        workspaceId,
        content: newMessage.trim(),
        senderId: currentUser?.id || currentUser?.vendorId,
        senderName: currentUser?.name || currentUser?.companyName || 'Unknown User',
        senderEmail: currentUser?.email || '',
        senderRole: currentUser?.role || 'vendor',
        messageType: 'text',
        replyTo: replyingTo?.messageId || null
      };

      const response = await fetch(`/api/workspace-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const exportMessages = () => {
    const exportData = filteredMessages.map(msg => ({
      timestamp: msg.timestamp,
      sender: msg.senderName,
      content: msg.content,
      date: msg.date
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-messages-${workspaceId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setSelectedUser('');
  };

  const uniqueUsers = [...new Set(messages.map(msg => ({ id: msg.senderId, name: msg.senderName })))];
  const uniqueDates = [...new Set(messages.map(msg => msg.date))].sort().reverse();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Workspace Messages</h2>
              <p className="text-sm text-gray-500">
                {filteredMessages.length} of {messages.length} messages
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportMessages}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export Messages"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              title="Toggle Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-100 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">All dates</option>
                  {uniqueDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">All users</option>
                  {uniqueUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {(searchQuery || selectedDate || selectedUser) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMessages.length > 0 ? (
            <>
              {filteredMessages.map((message) => {
                const isCurrentUser = message.senderId === (currentUser?.id || currentUser?.vendorId);
                return (
                  <div key={message.messageId} className={`flex items-start space-x-4 ${isCurrentUser ? 'justify-end' : ''}`}>
                    {!isCurrentUser && (
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full flex-shrink-0">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    
                    <div className={`flex-1 max-w-2xl ${isCurrentUser ? 'text-right' : ''}`}>
                      <div className={`${isCurrentUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'} rounded-2xl px-6 py-4 ${isCurrentUser ? 'inline-block' : ''}`}>
                        {message.replyTo && (
                          <div className="mb-2 p-2 bg-black bg-opacity-10 rounded-lg text-sm opacity-75">
                            <p className="text-xs mb-1">Replying to:</p>
                            <p className="truncate">Previous message content...</p>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {message.content}
                        </p>
                        
                        {/* File Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {message.attachments.map((file, index) => (
                              <div key={index} className={`p-5 rounded-xl border-2 border-dashed transition-all hover:border-solid hover:shadow-sm ${isCurrentUser ? 'border-blue-300 bg-blue-50 bg-opacity-50' : 'border-gray-300 bg-gray-50'}`}>
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    {file.fileType?.startsWith('image/') ? (
                                      <img 
                                        src={file.s3Url} 
                                        alt={file.fileName}
                                        className="w-14 h-14 object-cover rounded-xl cursor-pointer shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                                        onClick={() => window.open(file.s3Url, '_blank')}
                                      />
                                    ) : (
                                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isCurrentUser ? 'bg-blue-100' : 'bg-blue-50'} shadow-sm`}>
                                        <FileText className={`w-7 h-7 ${isCurrentUser ? 'text-blue-700' : 'text-blue-600'}`} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-base font-semibold break-words ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                                      {file.fileName}
                                    </p>
                                    <p className={`text-sm mt-1 ${isCurrentUser ? 'text-blue-700' : 'text-gray-600'}`}>
                                      {file.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : 'Unknown size'}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => window.open(file.s3Url, '_blank')}
                                      className={`p-3 rounded-xl transition-all shadow-sm hover:shadow-md ${isCurrentUser ? 'hover:bg-blue-200 text-blue-700 bg-blue-100' : 'hover:bg-gray-200 text-gray-700 bg-gray-100'}`}
                                      title="View file"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = file.s3Url;
                                        link.download = file.fileName;
                                        link.click();
                                      }}
                                      className={`p-3 rounded-xl transition-all shadow-sm hover:shadow-md ${isCurrentUser ? 'hover:bg-blue-200 text-blue-700 bg-blue-100' : 'hover:bg-gray-200 text-gray-700 bg-gray-100'}`}
                                      title="Download file"
                                    >
                                      <Download className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <p className={`text-xs text-gray-500 ${isCurrentUser ? 'mr-1' : 'ml-1'}`}>
                            {isCurrentUser ? 'You' : message.senderName} • {formatMessageTime(message.timestamp)}
                          </p>
                          {message.isEdited && (
                            <span className="text-xs text-gray-400 italic">edited</span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setReplyingTo(message)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            title="Reply"
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                          {isCurrentUser && (
                            <>
                              <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors" title="Edit">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors" title="More">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {isCurrentUser && (
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500 mb-2">
                {searchQuery || selectedDate || selectedUser ? 'No messages match your filters' : 'No messages yet'}
              </p>
              <p className="text-sm text-gray-400">
                {searchQuery || selectedDate || selectedUser ? 'Try adjusting your search or filters' : 'Start a conversation in this workspace'}
              </p>
            </div>
          )}
        </div>

        {/* Reply Banner */}
        {replyingTo && (
          <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Reply className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-900">Replying to {replyingTo.senderName}</p>
                  <p className="text-xs text-blue-700 truncate max-w-md">{replyingTo.content}</p>
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 text-blue-600 hover:text-blue-700 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-end space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:bg-white transition-all duration-200">
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <Paperclip className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : "Type a message..."}
                className="w-full bg-transparent text-sm outline-none placeholder-gray-400 resize-none"
                rows="1"
                style={{ minHeight: '20px', maxHeight: '120px' }}
                disabled={sendingMessage}
              />
            </div>
            <button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenMessages;
