import React, { useState, useEffect, useContext } from 'react';
import { 
  X, 
  Calendar, 
  Filter, 
  Search, 
  User, 
  Clock, 
  ChevronDown,
  FileText,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  Move,
  Palette,
  Upload,
  Users,
  Eye,
  Download
} from 'lucide-react';
import { VendorContext } from '../../../context/VendorContext';
import config from '../../../config/env';

const ActivityFullScreen = ({ 
  isOpen, 
  onClose, 
  workspaceId, 
  selectedTask, 
  selectedSubtask 
}) => {
  const { currentUser } = useContext(VendorContext);
  const [activities, setActivities] = useState([]);
  const [groupedActivities, setGroupedActivities] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    actionType: '',
    targetType: '',
    searchTerm: ''
  });
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'list'
  const [stats, setStats] = useState(null);

  // Activity type icons
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
      'text_changed': Edit3,
      'style_changed': Palette,
      'file_uploaded': Upload,
      'file_deleted': Trash2,
      'canvas_zoomed': Eye,
      'canvas_cleared': Trash2,
      'user_joined': Users,
      'user_left': Users,
      'workspace_shared': Users
    };

    const IconComponent = iconMap[activity.action] || FileText;
    return IconComponent;
  };

  // Activity type colors
  const getActivityColor = (activity) => {
    const colorMap = {
      'create': 'text-green-600 bg-green-100',
      'update': 'text-blue-600 bg-blue-100',
      'delete': 'text-red-600 bg-red-100',
      'move': 'text-purple-600 bg-purple-100',
      'style': 'text-pink-600 bg-pink-100',
      'canvas': 'text-indigo-600 bg-indigo-100',
      'collaboration': 'text-orange-600 bg-orange-100'
    };

    return colorMap[activity.actionType] || 'text-gray-600 bg-gray-100';
  };

  // Format activity description
  const formatActivityDescription = (activity) => {
    const descriptions = {
      'task_created': `created task "${activity.details?.taskName || 'Untitled'}"`,
      'task_updated': `updated task "${activity.details?.taskName || 'Untitled'}"`,
      'task_deleted': `deleted task "${activity.details?.taskName || 'Untitled'}"`,
      'subtask_created': `created subtask "${activity.details?.subtaskName || 'Untitled'}"`,
      'subtask_updated': `updated subtask "${activity.details?.subtaskName || 'Untitled'}"`,
      'subtask_deleted': `deleted subtask "${activity.details?.subtaskName || 'Untitled'}"`,
      'element_added': `added ${activity.elementType || 'element'} to canvas`,
      'element_modified': `modified ${activity.elementType || 'element'}`,
      'element_removed': `removed ${activity.elementType || 'element'}`,
      'element_moved': `moved ${activity.elementType || 'element'}`,
      'text_changed': `changed text content`,
      'style_changed': `updated styling`,
      'file_uploaded': `uploaded file "${activity.fileInfo?.fileName || 'Unknown'}"`,
      'file_deleted': `deleted file "${activity.fileInfo?.fileName || 'Unknown'}"`,
      'canvas_zoomed': `zoomed canvas to ${activity.details?.zoomLevel || '100'}%`,
      'canvas_cleared': `cleared the canvas`,
      'user_joined': `joined the workspace`,
      'user_left': `left the workspace`,
      'workspace_shared': `shared workspace`
    };

    return descriptions[activity.action] || activity.action.replace(/_/g, ' ');
  };

  // Load activities
  const loadActivities = async () => {
    if (!workspaceId) {
      console.log('❌ ActivityFullScreen: No workspaceId provided');
      return;
    }

    console.log('🔄 ActivityFullScreen: Loading activities', {
      workspaceId,
      viewMode,
      selectedTask: selectedTask?.id,
      selectedSubtask: selectedSubtask?.id,
      filters
    });

    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (selectedTask?.id) queryParams.append('taskId', selectedTask.id);
      if (selectedSubtask?.id) queryParams.append('subtaskId', selectedSubtask.id);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.actionType) queryParams.append('actionType', filters.actionType);
      if (filters.targetType) queryParams.append('targetType', filters.targetType);
      queryParams.append('limit', '200');

      const endpoint = viewMode === 'grouped' 
        ? `/api/workspaces/${workspaceId}/activities/grouped?${queryParams}`
        : `/api/workspaces/${workspaceId}/activities?${queryParams}`;

      console.log('🌐 ActivityFullScreen: Making API request to:', `${config.VENDOR_BACKEND_URL}${endpoint}`);

      const response = await fetch(`${config.VENDOR_BACKEND_URL}${endpoint}`);
      
      console.log('📡 ActivityFullScreen: API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ActivityFullScreen: API error response:', errorText);
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 ActivityFullScreen: API response data:', result);
      
      if (viewMode === 'grouped') {
        const activitiesByDate = result.activitiesByDate || {};
        console.log('📅 ActivityFullScreen: Setting grouped activities:', {
          dateCount: Object.keys(activitiesByDate).length,
          dates: Object.keys(activitiesByDate)
        });
        setGroupedActivities(activitiesByDate);
      } else {
        const activitiesList = result.activities || [];
        console.log('📋 ActivityFullScreen: Setting activities list:', {
          count: activitiesList.length
        });
        setActivities(activitiesList);
      }

      // Load stats
      loadStats();

    } catch (error) {
      console.error('❌ ActivityFullScreen: Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load activity statistics
  const loadStats = async () => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/${workspaceId}/activities/stats?days=30`);
      if (response.ok) {
        const result = await response.json();
        setStats(result.stats);
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  };

  // Filter activities by search term
  const filteredActivities = (activitiesList) => {
    if (!filters.searchTerm) return activitiesList;
    
    return activitiesList.filter(activity => 
      activity.userName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      formatActivityDescription(activity).toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(filters.searchTerm.toLowerCase())
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Format time for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get unique users for filter
  const getUniqueUsers = () => {
    const users = new Set();
    const allActivities = viewMode === 'grouped' 
      ? Object.values(groupedActivities).flat()
      : activities;
    
    allActivities.forEach(activity => {
      users.add(JSON.stringify({ id: activity.userId, name: activity.userName }));
    });
    
    return Array.from(users).map(user => JSON.parse(user));
  };

  // Export activities
  const exportActivities = () => {
    const allActivities = viewMode === 'grouped' 
      ? Object.values(groupedActivities).flat()
      : activities;
    
    const csvContent = [
      ['Date', 'Time', 'User', 'Action', 'Description', 'Target Type'].join(','),
      ...allActivities.map(activity => [
        activity.date,
        formatTime(activity.timestamp),
        activity.userName,
        activity.action,
        formatActivityDescription(activity),
        activity.targetType
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-activities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadActivities();
    }
  }, [isOpen, workspaceId, filters, viewMode, selectedTask, selectedSubtask]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
          <h2 className="text-xl font-bold text-gray-900">Activity History</h2>
          <p className="text-sm text-gray-600 mt-1">

              {selectedSubtask 
                ? `${selectedSubtask.name} activities`
                : selectedTask 
                ? `${selectedTask.name} activities`
                : 'All workspace activities'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'grouped' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                By Date
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportActivities}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span className="text-xs">Export</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalActivities}</div>
                <div className="text-sm text-gray-600">Total Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Object.keys(stats.activitiesByUser).length}</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.activitiesByType.create || 0}</div>
                <div className="text-sm text-gray-600">Items Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.mostActiveUser || 'N/A'}</div>
                <div className="text-sm text-gray-600">Most Active User</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="grid grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                 className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range */}
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* User Filter */}
            <select
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Users</option>
              {getUniqueUsers().map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>

            {/* Action Type Filter */}
            <select
              value={filters.actionType}
              onChange={(e) => setFilters(prev => ({ ...prev, actionType: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="move">Move</option>
              <option value="style">Style</option>
              <option value="canvas">Canvas</option>
              <option value="collaboration">Collaboration</option>
            </select>

            {/* Target Type Filter */}
            <select
              value={filters.targetType}
              onChange={(e) => setFilters(prev => ({ ...prev, targetType: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="task">Tasks</option>
              <option value="subtask">Subtasks</option>
              <option value="element">Elements</option>
              <option value="canvas">Canvas</option>
              <option value="file">Files</option>
            </select>
          </div>
        </div>

        {/* Activities Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : viewMode === 'grouped' ? (
            // Grouped by date view
            <div className="space-y-8">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">{formatDate(date)}</h3>
                    <span className="text-xs text-gray-500">({dateActivities.length} activities)</span>
                  </div>
                  
                  <div className="space-y-3 ml-8">
                    {filteredActivities(dateActivities).map((activity) => {
                      const IconComponent = getActivityIcon(activity);
                      const colorClass = getActivityColor(activity);
                      
                      return (
                        <div key={activity.activityId} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${colorClass}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{activity.userName}</span>{' '}
                                {formatActivityDescription(activity)}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(activity.timestamp)}</span>
                              </div>
                            </div>
                            
                            {activity.details && Object.keys(activity.details).length > 0 && (
                              <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                                {JSON.stringify(activity.details, null, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {Object.keys(groupedActivities).length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-gray-900 mb-2">No activities found</h3>
                    <p className="text-sm text-gray-600">Try adjusting your filters or date range.</p>
                </div>
              )}
            </div>
          ) : (
            // List view
            <div className="space-y-3">
              {filteredActivities(activities).map((activity) => {
                const IconComponent = getActivityIcon(activity);
                const colorClass = getActivityColor(activity);
                
                return (
                  <div key={activity.activityId} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${colorClass}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.userName}</span>{' '}
                          {formatActivityDescription(activity)}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatDate(activity.date)}</span>
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(activity.timestamp)}</span>
                        </div>
                      </div>
                      
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                          {JSON.stringify(activity.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {activities.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                  <p className="text-gray-600">Try adjusting your filters or date range.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityFullScreen;
