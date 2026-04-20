import React, { useEffect, useRef, useState } from 'react';
import { Plus, MoreHorizontal, FileText, CheckSquare, Clock, ArrowRight, Edit2, Loader2, Check } from 'lucide-react';
import { useToast } from './ToastProvider';

const TaskSubtasksView = ({ 
  workspaceId,
  selectedTask, 
  onSubtaskClick, 
  onShowAddSubtaskModal,
  onQuickAddSubtask,
  onRenameSubtask,
  onUpdateSubtask,
  memberOptions = []
}) => {
  const toast = useToast();
  const [quickSubtaskTitle, setQuickSubtaskTitle] = useState('');
  const [isQuickAddingSubtask, setIsQuickAddingSubtask] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskName, setEditingSubtaskName] = useState('');
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState(null);
  const [successSubtaskId, setSuccessSubtaskId] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [densityMode, setDensityMode] = useState(() => localStorage.getItem('workspace-subtask-density') || 'comfortable');
  const [sortMode, setSortMode] = useState(() => localStorage.getItem('workspace-subtask-sort') || 'flow');
  const [statusViewFilter, setStatusViewFilter] = useState(() => localStorage.getItem('workspace-subtask-status') || 'all');
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const markSubtaskSaved = (subtaskId) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessSubtaskId(subtaskId);
    successTimeoutRef.current = setTimeout(() => {
      setSuccessSubtaskId(null);
    }, 1600);
  };

  const handleQuickAddSubtask = async () => {
    if (!quickSubtaskTitle.trim() || !onQuickAddSubtask || isQuickAddingSubtask) return;
    setIsQuickAddingSubtask(true);
    try {
      await onQuickAddSubtask({ title: quickSubtaskTitle.trim() }, { autoSelect: false });
      setQuickSubtaskTitle('');
    } catch (error) {
      console.error('Quick add subtask failed:', error);
    } finally {
      setIsQuickAddingSubtask(false);
    }
  };

  const subtasks = selectedTask.subtasks || [];

  const startSubtaskRename = (subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskName(subtask.name || '');
  };

  const cancelSubtaskRename = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskName('');
  };

  const saveSubtaskRename = async (subtask) => {
    const trimmed = (editingSubtaskName || '').trim();
    if (!trimmed) {
      cancelSubtaskRename();
      return;
    }
    if (trimmed === (subtask.name || '').trim()) {
      cancelSubtaskRename();
      return;
    }
    try {
      await onRenameSubtask?.(selectedTask.id, subtask.id, trimmed);
      markSubtaskSaved(subtask.id);
      cancelSubtaskRename();
    } catch (error) {
      console.error('Subtask rename failed:', error);
      toast.error('Subtask rename failed', 4500, {
        actionLabel: 'Retry',
        onAction: () => {
          saveSubtaskRename(subtask);
        },
      });
    }
  };

  const getPrimaryAssignee = (subtask) => {
    if (Array.isArray(subtask.assignedUserIds) && subtask.assignedUserIds.length > 0) {
      return subtask.assignedUserIds[0];
    }
    return '';
  };

  const handleInlineSubtaskUpdate = async (subtask, patch) => {
    if (!subtask?.id || !onUpdateSubtask) return;
    setUpdatingSubtaskId(subtask.id);
    try {
      await onUpdateSubtask(selectedTask.id, subtask.id, patch);
      markSubtaskSaved(subtask.id);
    } catch (error) {
      console.error('Inline subtask update failed:', error);
      toast.error('Subtask update failed', 4500, {
        actionLabel: 'Retry',
        onAction: () => {
          handleInlineSubtaskUpdate(subtask, patch);
        },
      });
    } finally {
      setUpdatingSubtaskId(null);
    }
  };
  const sortedFlowSubtasks = [...subtasks].sort((a, b) => {
    if (sortMode === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortMode === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'medium'] ?? 1;
      const bPriority = priorityOrder[b.priority || 'medium'] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
    }
    const aOrder = Number.isFinite(Number(a.flowOrder)) ? Number(a.flowOrder) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(Number(b.flowOrder)) ? Number(b.flowOrder) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  const getDependencyName = (subtask) => {
    const dependencyId = subtask.dependsOnSubtaskIds?.[0];
    if (!dependencyId) return null;
    const dependency = subtasks.find((item) => item.id === dependencyId);
    return dependency?.name || null;
  };

  const getAssigneeLabel = (subtask) => {
    const assigneeId = Array.isArray(subtask?.assignedUserIds) ? subtask.assignedUserIds[0] : null;
    if (!assigneeId) return 'Unassigned';
    const match = memberOptions.find((option) => option.id === assigneeId);
    return match?.label || 'Assigned';
  };

  const getDependencyMeta = (subtask) => {
    const dependencyId = subtask.dependsOnSubtaskIds?.[0];
    if (!dependencyId) return null;
    const dependency = subtasks.find((item) => item.id === dependencyId);
    if (!dependency) return null;

    const isBlocked = (dependency.status || 'pending') !== 'completed';
    return {
      id: dependency.id,
      name: dependency.name,
      status: dependency.status || 'pending',
      assignee: getAssigneeLabel(dependency),
      isBlocked,
    };
  };

  const isSubtaskBlocked = (subtask) => {
    const dependencyMeta = getDependencyMeta(subtask);
    return Boolean(dependencyMeta?.isBlocked);
  };

  const visibleSubtasks = sortedFlowSubtasks.filter((subtask) => {
    if (statusViewFilter === 'all') return true;
    if (statusViewFilter === 'blocked') return isSubtaskBlocked(subtask);
    return (subtask.status || 'pending') === statusViewFilter;
  });

  useEffect(() => {
    localStorage.setItem('workspace-subtask-density', densityMode);
  }, [densityMode]);

  useEffect(() => {
    localStorage.setItem('workspace-subtask-sort', sortMode);
  }, [sortMode]);

  useEffect(() => {
    localStorage.setItem('workspace-subtask-status', statusViewFilter);
  }, [statusViewFilter]);

  useEffect(() => {
    const loadTimeline = async () => {
      if (!workspaceId || !selectedTask?.id) return;
      setTimelineLoading(true);
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/activities?taskId=${encodeURIComponent(selectedTask.id)}&limit=20`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        setActivityItems(Array.isArray(result.activities) ? result.activities : []);
      } catch (error) {
        console.error('Failed loading activity timeline:', error);
        setActivityItems([]);
      } finally {
        setTimelineLoading(false);
      }
    };

    loadTimeline();
  }, [workspaceId, selectedTask?.id, subtasks.length]);

  const formatTimelineTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTimelineSubtaskName = (activity) => {
    if (!activity?.subtaskId) return null;
    const match = subtasks.find((item) => item.id === activity.subtaskId);
    return match?.name || null;
  };

  const formatTimelineAction = (activity) => {
    if (!activity) return 'Activity update';
    if (activity.action) return activity.action.replace(/_/g, ' ');
    if (activity.actionType) return String(activity.actionType).replace(/_/g, ' ');
    return 'Activity update';
  };

  return (
    <div className="h-full min-h-0 px-4 py-4 sm:px-5 lg:px-6">
      {/* Task Header
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedTask.name}</h1>
        <p className="text-gray-600">Manage subtasks for {selectedTask.name}</p>
      </div> */}

      {/* Subtasks Section */}
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Subtasks Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
          <div>
          <h3 className="text-sm font-semibold text-gray-800">Subtasks</h3>
          <p className="text-xs text-gray-600 mt-0.5">
              {selectedTask.subtasks?.length || 0} subtask{selectedTask.subtasks?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onShowAddSubtaskModal}
            className="flex items-center space-x-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white shadow-sm transition-colors hover:bg-blue-700 sm:text-sm"
          >
            <Plus className="w-3 h-3" />
            <span className="font-medium">Add Subtask</span>
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 sm:px-5 xl:flex-row xl:items-center">
          <input
            type="text"
            value={quickSubtaskTitle}
            onChange={(e) => setQuickSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAddSubtask();
              }
            }}
            placeholder="Quick add subtask and press Enter"
            className="h-9 min-w-0 w-full flex-1 rounded-lg border border-gray-200 px-3 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            disabled={isQuickAddingSubtask}
          />
          <button
            type="button"
            onClick={handleQuickAddSubtask}
            disabled={isQuickAddingSubtask || !quickSubtaskTitle.trim()}
            className="h-9 w-full shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
          >
            {isQuickAddingSubtask ? 'Adding...' : 'Add'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-2 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={densityMode}
              onChange={(e) => setDensityMode(e.target.value)}
              className="h-7 rounded-md border border-gray-200 px-2 text-[11px] text-gray-700"
              title="Density"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="h-7 rounded-md border border-gray-200 px-2 text-[11px] text-gray-700"
              title="Sort subtasks"
            >
              <option value="flow">Sort: Flow order</option>
              <option value="newest">Sort: Newest first</option>
              <option value="priority">Sort: Priority</option>
            </select>
            <select
              value={statusViewFilter}
              onChange={(e) => setStatusViewFilter(e.target.value)}
              className="h-7 rounded-md border border-gray-200 px-2 text-[11px] text-gray-700"
              title="Filter subtasks"
            >
              <option value="all">All subtasks</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setDensityMode('comfortable');
              setSortMode('flow');
              setStatusViewFilter('all');
            }}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
          >
            Reset view
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {sortedFlowSubtasks.length > 0 && (
          <div className="border-b border-gray-100 bg-slate-50/70 px-4 pb-2.5 pt-3 sm:px-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Subtask Flow</h4>
              <span className="text-[11px] text-slate-500">Visual order for execution</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSubtasks.map((subtask, index) => {
                const blocked = isSubtaskBlocked(subtask);
                return (
                <React.Fragment key={`${subtask.id}-flow`}>
                  <button
                    onClick={() => onSubtaskClick(subtask)}
                    className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${blocked ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'}`}
                    title={getDependencyName(subtask) ? `Depends on ${getDependencyName(subtask)}` : 'No dependency'}
                  >
                    <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-700">
                      {Number.isFinite(Number(subtask.flowOrder)) ? Number(subtask.flowOrder) : index + 1}
                    </span>
                    <span className="max-w-[120px] truncate font-medium sm:max-w-[160px]">{subtask.name}</span>
                    {blocked && (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">Blocked</span>
                    )}
                  </button>
                  {index < visibleSubtasks.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  )}
                </React.Fragment>
              )})}
            </div>
          </div>
        )}

        <div className="border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => setTimelineExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Activity Timeline</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Updates, edits, approvals, comments for this task</p>
            </div>
            <span className="text-[11px] text-blue-600 font-medium">{timelineExpanded ? 'Hide' : 'Show'}</span>
          </button>

          {timelineExpanded && (
            <div className="mt-2 max-h-32 space-y-1.5 overflow-y-auto">
              {timelineLoading && (
                <p className="text-[11px] text-slate-500">Loading timeline...</p>
              )}
              {!timelineLoading && activityItems.length === 0 && (
                <p className="text-[11px] text-slate-500">No activity yet for this task.</p>
              )}
              {!timelineLoading && activityItems.map((item) => (
                <div key={item.activityId} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-slate-700 truncate">{formatTimelineAction(item)}</p>
                    <span className="text-[10px] text-slate-500 shrink-0">{formatTimelineTime(item.timestamp || item.createdAt)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {item.userName || 'User'}
                    {getTimelineSubtaskName(item) ? ` • ${getTimelineSubtaskName(item)}` : ''}
                    {item.targetType ? ` • ${item.targetType}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subtasks Content */}
        <div className="p-3 sm:p-4">
          {visibleSubtasks && visibleSubtasks.length > 0 ? (
            <div className={`grid grid-cols-1 xl:grid-cols-2 ${densityMode === 'compact' ? 'gap-1.5' : 'gap-2'}`}>
              {visibleSubtasks.map((subtask, index) => {
                const dependencyMeta = getDependencyMeta(subtask);
                const isBlocked = Boolean(dependencyMeta?.isBlocked);
                return (
                <div 
                  key={subtask.id} 
                   className={`flex items-center justify-between gap-2 rounded-lg border transition-colors cursor-pointer ${densityMode === 'compact' ? 'p-1.5' : 'p-2'} ${isBlocked ? 'bg-rose-50 border-rose-200 hover:bg-rose-100' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                  onClick={() => onSubtaskClick(subtask)}
                >
                  <div className="flex min-w-0 flex-1 items-center space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                      {subtask.status === 'completed' ? (
                        <CheckSquare className="w-3.5 h-3.5 text-green-600" />
                      ) : subtask.status === 'in-progress' ? (
                        <Clock className="w-4 h-4 text-blue-600" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      {editingSubtaskId === subtask.id ? (
                        <input
                          autoFocus
                          value={editingSubtaskName}
                          onChange={(e) => setEditingSubtaskName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => saveSubtaskRename(subtask)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveSubtaskRename(subtask);
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelSubtaskRename();
                            }
                          }}
                          className="rounded border border-blue-200 px-1.5 py-0.5 text-[12px] font-medium focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <h4 className="truncate text-[12px] font-medium text-gray-900">{subtask.name}</h4>
                      )}
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        Step {Number.isFinite(Number(subtask.flowOrder)) ? Number(subtask.flowOrder) : index + 1}
                        {getDependencyName(subtask) ? ` • depends on ${getDependencyName(subtask)}` : ''}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                          subtask.status === 'completed' ? 'bg-green-100 text-green-800' :
                          subtask.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                           'bg-orange-100 text-orange-700'
                        }`}>
                          {subtask.status === 'in-progress' ? 'In Progress' : 
                           subtask.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                        {isBlocked && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-700">
                            Blocked
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {subtask.assignedUsers} member{subtask.assignedUsers !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {dependencyMeta && (
                        <div className={`mt-1 rounded-md px-2 py-1 text-[10px] ${dependencyMeta.isBlocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {dependencyMeta.isBlocked ? 'Blocked by' : 'Depends on'} {dependencyMeta.name} ({dependencyMeta.assignee}, {dependencyMeta.status})
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex shrink-0 items-center space-x-1">
                    <select
                      value={subtask.priority || 'medium'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleInlineSubtaskUpdate(subtask, { priority: e.target.value })}
                      disabled={updatingSubtaskId === subtask.id}
                      className="max-w-[82px] rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px]"
                      title="Set priority"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <select
                      value={getPrimaryAssignee(subtask)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleInlineSubtaskUpdate(subtask, { assignedUserId: e.target.value || null })}
                      disabled={updatingSubtaskId === subtask.id}
                      className="max-w-[100px] rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px]"
                      title="Assign member"
                    >
                      <option value="">Unassigned</option>
                      {memberOptions.map((member) => (
                        <option key={member.id} value={member.id}>{member.label}</option>
                      ))}
                    </select>
                    <button
                      className="rounded p-1 hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        startSubtaskRename(subtask);
                      }}
                      title="Rename subtask"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button className="rounded p-1 hover:bg-gray-200">
                    <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    {updatingSubtaskId === subtask.id && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" title="Saving" />
                    )}
                    {updatingSubtaskId !== subtask.id && successSubtaskId === subtask.id && (
                      <Check className="w-3.5 h-3.5 text-emerald-600" title="Saved" />
                    )}
                  </div>
                </div>
              )})}
            </div>
          ) : (
            /* Empty State */
            <div className="py-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subtasks yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Break down "{selectedTask.name}" into smaller, manageable subtasks to track progress better.
              </p>
              <button
                onClick={onShowAddSubtaskModal}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span>Create First Subtask</span>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSubtasksView;
