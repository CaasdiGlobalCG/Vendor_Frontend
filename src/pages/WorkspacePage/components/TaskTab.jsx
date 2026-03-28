import React, { useEffect, useRef, useState } from 'react';
import { Plus, MoreHorizontal, FolderOpen, FileText, CheckSquare, Clock, AlertCircle, X, ChevronDown, Edit2, Loader2, Check, Search } from 'lucide-react';
import PermissionGuard, { PermissionButton } from './PermissionGuard';
import { useToast } from './ToastProvider';

const TaskTab = ({ 
  tasks, 
  selectedTask, 
  selectedSubtask,
  onTaskClick, 
  onSubtaskClick,
  onShowAddTaskModal,
  onQuickAddTask,
  onRenameTask,
  onUpdateTask,
  memberOptions = [],
  workspace, // For permission checking
  userRole // For permission checking
}) => {
  const toast = useToast();
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState({});
  const [selectedTaskForSubmissions, setSelectedTaskForSubmissions] = useState(null);
  const [selectedSubtaskForSubmissions, setSelectedSubtaskForSubmissions] = useState(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isQuickAddingTask, setIsQuickAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [successTaskId, setSuccessTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('workspace-tasktab-status-filter') || 'all');
  const [assigneeFilter, setAssigneeFilter] = useState(() => localStorage.getItem('workspace-tasktab-assignee-filter') || 'all');
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 180);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('workspace-tasktab-status-filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('workspace-tasktab-assignee-filter', assigneeFilter);
  }, [assigneeFilter]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const markTaskSaved = (taskId) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessTaskId(taskId);
    successTimeoutRef.current = setTimeout(() => {
      setSuccessTaskId(null);
    }, 1600);
  };

  const startTaskRename = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name || '');
  };

  const cancelTaskRename = () => {
    setEditingTaskId(null);
    setEditingTaskName('');
  };

  const saveTaskRename = async (task) => {
    const trimmed = (editingTaskName || '').trim();
    if (!trimmed) {
      cancelTaskRename();
      return;
    }
    if (trimmed === (task.name || '').trim()) {
      cancelTaskRename();
      return;
    }
    try {
      await onRenameTask?.(task.id, trimmed);
      markTaskSaved(task.id);
      cancelTaskRename();
    } catch (error) {
      console.error('Task rename failed:', error);
      toast.error('Task rename failed', 4500, {
        actionLabel: 'Retry',
        onAction: () => {
          saveTaskRename(task);
        },
      });
    }
  };

  const handleQuickAddTask = async () => {
    if (!quickTaskTitle.trim() || !onQuickAddTask || isQuickAddingTask) return;
    setIsQuickAddingTask(true);
    try {
      await onQuickAddTask({ title: quickTaskTitle.trim() });
      setQuickTaskTitle('');
    } catch (error) {
      console.error('Quick add task failed:', error);
    } finally {
      setIsQuickAddingTask(false);
    }
  };

  const getPrimaryAssignee = (task) => {
    if (Array.isArray(task.assignedUserIds) && task.assignedUserIds.length > 0) {
      return task.assignedUserIds[0];
    }
    return '';
  };

  const getPrimarySubtaskAssignee = (subtask) => {
    if (Array.isArray(subtask?.assignedUserIds) && subtask.assignedUserIds.length > 0) {
      return subtask.assignedUserIds[0];
    }
    return '';
  };

  const normalizedQuery = debouncedSearchTerm.trim().toLowerCase();
  const isFilterActive = Boolean(normalizedQuery) || statusFilter !== 'all' || assigneeFilter !== 'all';

  const matchesSubtaskFilters = (subtask) => {
    const subtaskName = (subtask?.name || '').toLowerCase();
    const assigneeId = getPrimarySubtaskAssignee(subtask);
    const matchesSearch = !normalizedQuery || subtaskName.includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all' || (subtask?.status || 'pending') === statusFilter;
    const matchesAssignee =
      assigneeFilter === 'all' ||
      (assigneeFilter === 'unassigned' && !assigneeId) ||
      (assigneeFilter !== 'unassigned' && assigneeId === assigneeFilter);

    return matchesSearch && matchesStatus && matchesAssignee;
  };

  const matchesTaskFilters = (task) => {
    const taskName = (task?.name || '').toLowerCase();
    const taskAssigneeId = getPrimaryAssignee(task);
    const taskStatus = task?.status || 'pending';
    const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];

    const taskSearchMatch = !normalizedQuery || taskName.includes(normalizedQuery);
    const subtaskSearchMatch = !normalizedQuery || subtasks.some((subtask) =>
      (subtask?.name || '').toLowerCase().includes(normalizedQuery)
    );

    const statusMatches =
      statusFilter === 'all' ||
      taskStatus === statusFilter ||
      subtasks.some((subtask) => (subtask?.status || 'pending') === statusFilter);

    const assigneeMatches =
      assigneeFilter === 'all' ||
      (assigneeFilter === 'unassigned' && !taskAssigneeId) ||
      (assigneeFilter !== 'unassigned' && taskAssigneeId === assigneeFilter) ||
      subtasks.some((subtask) => {
        const subtaskAssigneeId = getPrimarySubtaskAssignee(subtask);
        if (assigneeFilter === 'unassigned') {
          return !subtaskAssigneeId;
        }
        return subtaskAssigneeId === assigneeFilter;
      });

    return (taskSearchMatch || subtaskSearchMatch) && statusMatches && assigneeMatches;
  };

  const filteredTasks = (tasks || []).filter(matchesTaskFilters);

  const handleInlineTaskUpdate = async (task, patch) => {
    if (!task?.id || !onUpdateTask) return;
    setUpdatingTaskId(task.id);
    try {
      await onUpdateTask(task.id, patch);
      markTaskSaved(task.id);
    } catch (error) {
      console.error('Inline task update failed:', error);
      toast.error('Task update failed', 4500, {
        actionLabel: 'Retry',
        onAction: () => {
          handleInlineTaskUpdate(task, patch);
        },
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleCheckSubmissions = (task, subtask = null) => {
    setSelectedTaskForSubmissions(task);
    setSelectedSubtaskForSubmissions(subtask);
    setShowSubmissionsModal(true);
  };

  const getSubmissionsForTaskSubtask = (task, subtask) => {
    let submissions = workspace?.progress_submissions || [];
    return submissions.filter(s => {
      let matches = s.taskId === task.id;
      if (subtask) {
        matches = matches && s.subtaskId === subtask.id;
      }
      return matches;
    });
  };

  const toggleSubmissionExpand = (id) => {
    setExpandedSubmissions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  return (
    <div className="flex-1 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-gray-900">Tasks</h3>
        <PermissionButton
          permission="canCreateTasks"
          workspace={workspace}
          userRole={userRole}
          onClick={onShowAddTaskModal}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Add new task"
        >
          <Plus className="w-5 h-5 text-blue-600" />
        </PermissionButton>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={quickTaskTitle}
          onChange={(e) => setQuickTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleQuickAddTask();
            }
          }}
          placeholder="Quick add task and press Enter"
          className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          disabled={isQuickAddingTask}
        />
        <button
          type="button"
          onClick={handleQuickAddTask}
          disabled={isQuickAddingTask || !quickTaskTitle.trim()}
          className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isQuickAddingTask ? 'Adding...' : 'Add'}
        </button>
      </div>

      <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-slate-500">
            {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
          {isFilterActive && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearchTerm('');
                setStatusFilter('all');
                setAssigneeFilter('all');
              }}
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks or subtasks"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200"
            title="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200"
            title="Filter by assignee"
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {memberOptions.map((member) => (
              <option key={`filter-${member.id}`} value={member.id}>{member.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1 flex-1">
        {/* If a subtask is selected, show hierarchy: Task > Subtask */}
        {selectedSubtask ? (
          selectedTask && (
            <div className="space-y-2">
              {/* Parent Task */}
              <div 
                key={selectedTask.id} 
                onClick={() => onTaskClick(selectedTask)}
                 className="flex items-start justify-between gap-2 p-1.5 border rounded-lg bg-blue-50 border-blue-300 shadow-md cursor-pointer group"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-lg">
                    <FolderOpen className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-[11px] font-medium text-blue-800 truncate">
                    {selectedTask.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                  <span className="hidden sm:inline">{selectedTask.assignedUsers} member{selectedTask.assignedUsers !== 1 ? 's' : ''}</span>
                  <button 
                     className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"

                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle more options
                    }}
                  >
                     <MoreHorizontal className="w-2.5 h-2.5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Hierarchy Connector */}
              <div className="flex items-center pl-4">
              <div className="w-px h-4 border-l border-dashed border-gray-300"></div>
              </div>

              {/* Current Subtask */}
              <div className="ml-8 p-1.5 border-2 border-blue-400 rounded-lg bg-blue-100 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-5 h-5 bg-blue-200 rounded-lg">
                      {selectedSubtask.status === 'completed' ? (
                       <CheckSquare className="w-3 h-3 text-green-700" />
                      ) : selectedSubtask.status === 'in-progress' ? (
                        <Clock className="w-3 h-3 text-blue-700" />
                      ) : (
                        <FileText className="w-3 h-3 text-blue-700" />
                      )}
                    </div>
                    <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-blue-900">
                        {selectedSubtask.name}
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {(selectedSubtask.assignedUsers || 1)} member{(selectedSubtask.assignedUsers || 1) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    {/* Status Badge */}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${
                      selectedSubtask.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : selectedSubtask.status === 'in-progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedSubtask.status === 'completed' 
                        ? 'Completed'
                        : selectedSubtask.status === 'in-progress'
                        ? 'In Progress'
                        : 'Pending'
                      }
                    </span>
                    
                    {/* Assigned Users for Subtask
                    <div className="flex -space-x-1">
                      {Array.from({ length: selectedSubtask.assignedUsers || 1 }, (_, i) => (
                        <div key={i} className="w-5 h-5 bg-blue-300 rounded-full border-2 border-white shadow-sm"></div>
                      ))}
                    </div> */}
                  </div>
                </div>
              </div>

              {/* Quick switch: sibling subtasks */}
              {Array.isArray(selectedTask.subtasks) && selectedTask.subtasks.length > 1 && (
                <div className="ml-8 mt-1.5 rounded-md border border-blue-200 bg-white p-1.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Other subtasks
                  </p>
                  <div className="space-y-1">
                    {selectedTask.subtasks
                      .filter(matchesSubtaskFilters)
                      .filter((subtask) => subtask.id !== selectedSubtask.id)
                      .map((subtask) => (
                        <button
                          key={`quick-switch-${subtask.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSubtaskClick?.(subtask);
                          }}
                          className="w-full rounded-md border border-transparent bg-slate-50 px-2 py-1 text-left text-[11px] font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                          title={`Open ${subtask.name}`}
                        >
                          {subtask.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Show all tasks when no subtask is selected */
          filteredTasks.map((task) => (
            <div key={task.id} className="space-y-1.5">
              <div 
                onClick={() => onTaskClick(task)}
                className={`flex items-start justify-between gap-2 p-2 border rounded-lg transition-all duration-200 cursor-pointer group ${
                  selectedTask?.id === task.id
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className={`flex items-center justify-center w-6 h-6 rounded-lg ${
                    selectedTask?.id === task.id 
                      ? 'bg-blue-100' 
                      : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <FolderOpen className={`w-3 h-3 ${
                      selectedTask?.id === task.id 
                        ? 'text-blue-600' 
                        : 'text-gray-600 group-hover:text-gray-700'
                    }`} />
                  </div>
                  <div className="flex flex-col">
                    {editingTaskId === task.id ? (
                      <input
                        autoFocus
                        value={editingTaskName}
                        onChange={(e) => setEditingTaskName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => saveTaskRename(task)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveTaskRename(task);
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelTaskRename();
                          }
                        }}
                        className="text-[12px] font-medium px-1.5 py-0.5 rounded border border-blue-200 focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <span className={`text-[12px] font-medium truncate ${
                        selectedTask?.id === task.id ? 'text-blue-800' : 'text-gray-900 group-hover:text-gray-700'
                      }`}>
                        {task.name}
                      </span>
                    )}
                    {workspace?.project_status?.reviewStatus === 'client_approved' && (
                      <span className="text-[10px] text-green-600 font-medium mt-0.5">
                        ✓ Progress reviewed and approved
                      </span>
                    )}
                  </div>
                </div>
                
                {/* <div className="flex items-center space-x-2">
                  <div className="flex -space-x-1">
                    {Array.from({ length: task.assignedUsers }, (_, i) => (
                      <div key={i} className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white shadow-sm"></div>
                    ))}
                  </div> */}
                  <div className="flex items-start gap-1.5 text-[10px] text-gray-500 shrink-0 w-[152px]">
                    <div className="grid grid-cols-1 gap-1 w-full">
                      <select
                        value={task.priority || 'medium'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleInlineTaskUpdate(task, { priority: e.target.value })}
                        disabled={updatingTaskId === task.id}
                        className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        title="Set priority"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <select
                        value={getPrimaryAssignee(task)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleInlineTaskUpdate(task, { assignedUserId: e.target.value || null })}
                        disabled={updatingTaskId === task.id}
                        className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        title="Assign member"
                      >
                        <option value="">Unassigned</option>
                        {memberOptions.map((member) => (
                          <option key={member.id} value={member.id}>{member.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <button
                        className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTaskRename(task);
                        }}
                        title="Rename task"
                      >
                        <Edit2 className="w-2.5 h-2.5 text-gray-500" />
                      </button>
                      <button 
                        className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckSubmissions(task);
                        }}
                        title="Check submissions"
                      >
                        <FileText className="w-2.5 h-2.5 text-gray-500" />
                      </button>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 pt-0.5 min-w-[44px]">
                      {updatingTaskId === task.id && (
                        <Loader2 className="w-3 h-3 text-blue-500 animate-spin" title="Saving" />
                      )}
                      {updatingTaskId !== task.id && successTaskId === task.id && (
                        <Check className="w-3 h-3 text-emerald-600" title="Saved" />
                      )}
                      <span className="hidden lg:inline text-[9px]">{task.assignedUsers} member{task.assignedUsers !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
              </div>

              {selectedTask?.id === task.id && Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                <div className="ml-8 space-y-1 border-l border-blue-200 pl-2">
                  {task.subtasks.filter(matchesSubtaskFilters).map((subtask) => (
                    <button
                      key={`sidebar-subtask-${subtask.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSubtaskClick?.(subtask);
                      }}
                      className={`w-full rounded-md border px-2 py-1 text-left text-[11px] transition-colors ${
                        selectedSubtask?.id === subtask.id
                          ? 'border-blue-300 bg-blue-100 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                      }`}
                      title={`Open ${subtask.name}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{subtask.name}</span>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {subtask.status === 'in-progress' ? 'In progress' : subtask.status === 'completed' ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {!selectedSubtask && filteredTasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-xs text-gray-500">
            No tasks match your current search or filters.
          </div>
        )}
      </div>

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedTaskForSubmissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Progress Submissions</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Task: {selectedTaskForSubmissions.name}
                  {selectedSubtaskForSubmissions && ` / Subtask: ${selectedSubtaskForSubmissions.name}`}
                </p>
              </div>
              <button
                onClick={() => setShowSubmissionsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {(() => {
                const submissions = getSubmissionsForTaskSubtask(selectedTaskForSubmissions, selectedSubtaskForSubmissions);
                
                if (submissions.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No submissions found</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {submissions.map((submission, index) => {
                      const isExpanded = expandedSubmissions[submission.id];
                      
                      return (
                        <div key={submission.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Submission Header */}
                          <button
                            onClick={() => toggleSubmissionExpand(submission.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <ChevronDown
                                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Submission #{submissions.length - index}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(submission.submittedAt).toLocaleDateString()} at {new Date(submission.submittedAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                              submission.reviewStatus === 'client_approved' ? 'bg-green-100 text-green-800' :
                              submission.reviewStatus === 'client_approval_pending' ? 'bg-yellow-100 text-yellow-800' :
                              submission.reviewStatus === 'rejected' || submission.reviewStatus === 'pm_rejected' ? 'bg-red-100 text-red-800' :
                              submission.reviewStatus === 'client_rejected' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {submission.reviewStatus === 'client_approved' ? '✓ Approved' :
                               submission.reviewStatus === 'client_approval_pending' ? '⏳ Awaiting' :
                               submission.reviewStatus === 'rejected' || submission.reviewStatus === 'pm_rejected' ? '✗ Rejected' :
                               submission.reviewStatus === 'client_rejected' ? '✗ Rejected' :
                               '⏳ Pending'}
                            </span>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                                  <p className="text-sm text-gray-900">{submission.title}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                  <p className="text-sm text-gray-900">{submission.description}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded border border-gray-200">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Done</label>
                                  <p className="text-sm text-gray-900">{submission.workDone}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Pending</label>
                                  <p className="text-sm text-gray-900">{submission.workPending}</p>
                                </div>
                              </div>

                              {/* Timeline */}
                              <div className="space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Submitted:</span>
                                  <span className="font-medium text-gray-900">{new Date(submission.submittedAt).toLocaleString()}</span>
                                </div>
                                
                                {submission.pmApprovedAt && (
                                  <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                                    <span className="text-green-700">PM Approved:</span>
                                    <span className="font-medium text-green-900">{new Date(submission.pmApprovedAt).toLocaleString()}</span>
                                  </div>
                                )}
                                
                                {submission.clientApprovedAt && (
                                  <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                                    <span className="text-green-700">Client Approved:</span>
                                    <span className="font-medium text-green-900">{new Date(submission.clientApprovedAt).toLocaleString()}</span>
                                  </div>
                                )}
                                
                                {submission.rejectionReason && (
                                  <div className="flex items-start justify-between bg-red-50 p-2 rounded">
                                    <span className="text-red-700">Rejection:</span>
                                    <span className="font-medium text-red-900 text-right ml-2">{submission.rejectionReason}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTab;
