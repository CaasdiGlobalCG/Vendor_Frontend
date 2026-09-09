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
  Trash2
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
  onStartCall,
  onManagePermissions,
  onInviteVendors,
  onInviteCAS,
  onShareProgress,
  onOpenPostServices,
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

  // Close overflow on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setShowOverflow(false);
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
        title={`Back to ${currentUser?.role === 'pm' ? 'PM' : 'Vendor'} Dashboard`}
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
