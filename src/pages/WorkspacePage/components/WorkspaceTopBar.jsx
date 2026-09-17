import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  Search,
  Video,
  MessageSquare,
  HelpCircle,
  MoreHorizontal,
  Zap,
  CheckCircle,
  Link2,
  RotateCw,
  Shield,
  UserPlus,
  Share2,
  Trash2,
  Sparkles,
  Bell,
  Send
} from 'lucide-react';
import config from '../../../config/env';
import { Auth } from 'aws-amplify';

const WorkspaceTopBar = ({
  workspace,
  userRole = 'vendor',
  isPM = false,
  isCAS = false,
  isClient = false,
  currentUser,
  syncStatus = 'idle',
  lastSavedAt,
  workspaceCollaborators = [],
  onBackToDashboard,
  onRefresh,
  onOpenTutorial,
  onToggleActivityDrawer,
  isActivityDrawerOpen = false,
  unreadCount = 0,
  notifications = [],
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onStartCall,
  onManagePermissions,
  onInviteVendors,
  onInviteCAS,
  onShareProgress,
  onOpenPostServices,
  onOpenAIBuilder,
  onOpenUpdateProgress,
  onOpenReviewProgress,
  onOpenClientReviewProgress,
  onOpenProjectComplete,
  onOpenDeletionHistory,
  isWorkspaceCompleted = false,
  shouldDisableEditing = false,
}) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  // Close overflow on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setShowOverflow(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const roleColors = {
    pm: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    vendor: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    cas: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    client: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }
  };
  const activeRoleColor = roleColors[userRole] || roleColors.vendor;

  const handleSearchClick = () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'workspace_message':
      case 'comment_mention':
        return MessageSquare;
      case 'approval_request':
        return Send;
      case 'approval_result':
        return CheckCircle;
      case 'deletion_request':
      case 'deletion_approved':
      case 'deletion_rejected':
        return Trash2;
      case 'call_invitation':
        return Video;
      default:
        return Bell;
    }
  };

  const formatNotificationTime = (n) => {
    const raw = n?.time || n?.createdAt || n?.timestamp;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : d.toLocaleDateString();
  };

  const handleB2BClick = async () => {
    setShowOverflow(false);
    const targetHome = config.B2B_MARKETPLACE_URL;
    if (!targetHome) {
      alert('B2B marketplace URL is not configured.');
      return;
    }
    let idToken = '';
    try {
      const session = await Auth.currentSession();
      idToken = session.getIdToken().getJwtToken();
    } catch {
      idToken = localStorage.getItem('authToken') || '';
    }
    if (idToken) {
      window.location.href = `${targetHome}/?token=${encodeURIComponent(idToken)}`;
      return;
    }
    const base = targetHome.replace(/\/home\/?$/, '');
    window.location.href = `${base}/signup`;
  };

  return (
    <header className="ws-topbar" data-workspace-topbar>
      {/* Back Button */}
      <button
        onClick={onBackToDashboard}
        className="ws-back-btn"
        title={`Back to ${userRole === 'pm' ? 'PM' : userRole === 'cas' ? 'CAS' : userRole === 'client' ? 'Client' : 'Vendor'} Dashboard`}
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* Brand Mark */}
      <div className="ws-mark" title="Caasdi Global">
        CG
      </div>

      {/* Title & Role crumb */}
      <div className="ws-crumb">
        <div className="ws-crumb-title" title={workspace?.title || 'Project — Collaborative Workspace'}>
          {workspace?.title || 'Project — Collaborative Workspace'}
        </div>
        <div className="ws-crumb-sub">
          <span>Role</span>
          <span
            className="ws-role-pill"
            style={{
              backgroundColor: activeRoleColor.bg,
              color: activeRoleColor.text,
              borderColor: activeRoleColor.border
            }}
          >
            {userRole ? userRole.toUpperCase() : 'VENDOR'}
          </span>
        </div>
      </div>

      {/* Refresh button if available */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="ws-icon-btn text-gray-500 hover:text-gray-900"
          title="Refresh workspace"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Quick Search ⌘K */}
      <div className="ws-search-box" onClick={handleSearchClick} title="Search actions & elements (Ctrl+K)">
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <span>Search</span>
        <kbd>⌘K</kbd>
      </div>

      {/* Live Sync Status */}
      <div className="ws-live-pill" title={syncStatus === 'saving' ? 'Saving changes...' : 'Connected and synced'}>
        <span
          className="ws-live-dot"
          style={{
            backgroundColor: syncStatus === 'saving' ? '#f59e0b' : '#10b981'
          }}
        />
        <span>{syncStatus === 'saving' ? 'Saving...' : 'Live'}</span>
      </div>

      {/* Collaborators Avatar Stack */}
      {workspaceCollaborators && workspaceCollaborators.length > 0 && (
        <div className="ws-avatars" title={`${workspaceCollaborators.length} collaborator(s) online`}>
          {workspaceCollaborators.slice(0, 3).map((c, i) => {
            const name = c.name || c.userName || 'Collaborator';
            const initial = name.charAt(0).toUpperCase();
            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
            return (
              <div
                key={c.userId || i}
                className="ws-avatar"
                style={{ backgroundColor: colors[i % colors.length], zIndex: 3 - i }}
                title={name}
              >
                {initial}
              </div>
            );
          })}
          {workspaceCollaborators.length > 3 && (
            <div className="ws-avatar" style={{ backgroundColor: '#64748b', zIndex: 0 }}>
              +{workspaceCollaborators.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Video Call button */}
      {onStartCall && (
        <button
          onClick={onStartCall}
          className="ws-icon-btn"
          title="Start video call with team"
        >
          <Video className="w-4 h-4 text-gray-600 hover:text-blue-600" />
        </button>
      )}

      {/* Notifications bell — visible to all roles */}
      <div ref={notificationsRef} className="relative">
        <button
          onClick={() => setShowNotifications(prev => !prev)}
          className={`ws-icon-btn ${showNotifications ? 'active' : ''}`}
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && onMarkAllNotificationsAsRead && (
                <button
                  onClick={onMarkAllNotificationsAsRead}
                  className="text-[11px] text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 15).map((n) => {
                  const Icon = getNotificationIcon(n.type);
                  const nid = n.notificationId || n.id;
                  return (
                    <button
                      key={nid || Math.random()}
                      onClick={() => nid && onMarkNotificationAsRead?.(nid)}
                      className={`w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                    >
                      <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${n.actionRequired ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-gray-900 truncate">{n.title || 'Notification'}</span>
                        {n.message && (
                          <span className="block text-[11px] text-gray-500 line-clamp-2">{n.message}</span>
                        )}
                        <span className="block text-[10px] text-gray-400 mt-0.5">{formatNotificationTime(n)}</span>
                      </span>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comments / Activity drawer toggle */}
      <button
        onClick={onToggleActivityDrawer}
        className={`ws-icon-btn ${isActivityDrawerOpen ? 'active' : ''}`}
        title="Activity & Comments"
      >
        <MessageSquare className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Help / Tutorial button */}
      <button
        data-tour="help-btn"
        onClick={onOpenTutorial}
        className="ws-icon-btn"
        title="Interactive Workspace Tutorial"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Overflow Menu for More Actions */}
      <div ref={overflowRef} className="relative">
        <button
          onClick={() => setShowOverflow(prev => !prev)}
          className="ws-icon-btn"
          title="More actions"
          aria-expanded={showOverflow}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {showOverflow && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-gray-700 animate-in fade-in duration-150">
            {/* PM specific actions */}
            {isPM && (
              <>
                {onManagePermissions && (
                  <button
                    onClick={() => { onManagePermissions(); setShowOverflow(false); }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Manage Permissions</span>
                  </button>
                )}
                {onInviteVendors && (
                  <button
                    onClick={() => { onInviteVendors(); setShowOverflow(false); }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Invite Vendors</span>
                  </button>
                )}
                {onInviteCAS && (
                  <button
                    onClick={() => { onInviteCAS(); setShowOverflow(false); }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-purple-600" />
                    <span>Invite CAS</span>
                  </button>
                )}
                <div className="border-t border-gray-100 my-1" />
              </>
            )}

            {/* Share progress */}
            {onShareProgress && (
              <button
                onClick={() => { onShareProgress(); setShowOverflow(false); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4 text-blue-500" />
                <span>Share Progress</span>
              </button>
            )}

            {/* Deletion history */}
            {onOpenDeletionHistory && (
              <button
                onClick={() => { onOpenDeletionHistory(); setShowOverflow(false); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-gray-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-500" />
                <span>Deletion History</span>
              </button>
            )}

            {/* Complete request */}
            {(isPM || isClient) && onOpenProjectComplete && (
              <button
                onClick={() => { onOpenProjectComplete(); setShowOverflow(false); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-gray-50 text-blue-600 font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>Complete Request</span>
              </button>
            )}

            <div className="border-t border-gray-100 my-1" />

            {/* B2B Marketplace Link */}
            <button
              onClick={handleB2BClick}
              className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-gray-50 text-emerald-700 font-medium transition-colors"
            >
              <Link2 className="w-4 h-4 text-emerald-600" />
              <span>B2B Marketplace</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Canvas Builder */}
      {onOpenAIBuilder && (
        <button
          onClick={onOpenAIBuilder}
          className="ws-btn-secondary"
          title="AI Canvas Builder — describe it, AI builds it"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
          <span>AI Builder</span>
        </button>
      )}

      {/* Post Services - separate button */}
      {onOpenPostServices && (
        <button
          onClick={onOpenPostServices}
          className="ws-btn-secondary"
          title="Post services"
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
          <span>Post Services</span>
        </button>
      )}

      {/* Primary Action Button based on Role */}
      {isPM ? (
        <button
          onClick={onOpenReviewProgress}
          className="ws-btn-primary"
          title="Review project progress"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Review Progress</span>
        </button>
      ) : isClient ? (
        <button
          onClick={onOpenClientReviewProgress}
          className="ws-btn-primary"
          title="Approve client progress"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-300" />
          <span>Approve Progress</span>
        </button>
      ) : (
        <button
          onClick={onOpenUpdateProgress || onOpenPostServices}
          disabled={shouldDisableEditing}
          className={`ws-btn-primary ${shouldDisableEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Update progress or post service"
        >
          <Zap className="w-3.5 h-3.5 text-blue-300" />
          <span>Update Progress</span>
        </button>
      )}
    </header>
  );
};

export default WorkspaceTopBar;
