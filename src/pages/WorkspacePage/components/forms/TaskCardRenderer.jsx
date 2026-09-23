import React, { useMemo, useState, useEffect } from 'react';
import {
  Calendar,
  Flag,
  Paperclip,
  Plus,
  Tag,
  User,
  MessageCircle,
  CheckSquare,
  Trash2,
  UploadCloud,
  Activity,
  CheckCircle
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To-Do' },
  { value: 'in-progress', label: 'In-Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'in-progress':
      return 'bg-info/10 text-info border-info/20';
    case 'blocked':
      return 'bg-danger/10 text-danger border-danger/20';
    case 'completed':
      return 'bg-surface-hover text-ink border-line';
    default:
      return 'bg-surface-hover text-ink border-line';
  }
};

const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case 'high':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'critical':
      return 'bg-danger/10 text-danger border-danger/20';
    case 'medium':
      return 'bg-warning/10 text-warning border-warning/20';
    default:
      return 'bg-info/10 text-info border-info/20';
  }
};

const createActivityEntry = (action, meta = {}) => ({
  id: `${action}-${Date.now()}`,
  action,
  meta,
  timestamp: new Date().toLocaleString()
});

const TaskCardRenderer = ({ data }) => {
  const defaultState = useMemo(
    () => ({
      title: data?.taskCardData?.title || 'Untitled Task',
      description: data?.taskCardData?.description || '',
      status: data?.taskCardData?.status || 'todo',
      assignedTo: data?.taskCardData?.assignedTo || '',
      priority: data?.taskCardData?.priority || 'medium',
      dueDate: data?.taskCardData?.dueDate || '',
      checklists: data?.taskCardData?.checklists || [],
      attachments: data?.taskCardData?.attachments || [],
      comments: data?.taskCardData?.comments || [],
      dependencies: data?.taskCardData?.dependencies || [],
      labels: data?.taskCardData?.labels || [],
      activityLog: data?.taskCardData?.activityLog || [
        createActivityEntry('Task created')
      ]
    }),
    [data?.taskCardData]
  );

  const [taskState, setTaskState] = useState(defaultState);
  const [checklistText, setChecklistText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [dependencyText, setDependencyText] = useState('');
  const [labelText, setLabelText] = useState('');

  useEffect(() => {
    setTaskState(defaultState);
  }, [defaultState]);

  const logActivity = (action, meta) => {
    setTaskState((prev) => ({
      ...prev,
      activityLog: [createActivityEntry(action, meta), ...prev.activityLog]
    }));
  };

  const updateField = (field, value) => {
    setTaskState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStatusChange = (value) => {
    updateField('status', value);
    logActivity('Status updated', { status: value });
  };

  const handlePriorityChange = (value) => {
    updateField('priority', value);
    logActivity('Priority updated', { priority: value });
  };

  const handleAssignedToChange = (value) => {
    updateField('assignedTo', value);
    logActivity('Task reassigned', { assignee: value });
  };

  const handleDueDateChange = (value) => {
    updateField('dueDate', value);
    logActivity('Due date updated', { dueDate: value });
  };

  const addChecklistItem = () => {
    if (!checklistText.trim()) return;
    const newItem = {
      id: `cl-${Date.now()}`,
      text: checklistText.trim(),
      completed: false
    };
    setTaskState((prev) => ({
      ...prev,
      checklists: [...prev.checklists, newItem]
    }));
    logActivity('Checklist item added', { item: newItem.text });
    setChecklistText('');
  };

  const toggleChecklist = (itemId) => {
    setTaskState((prev) => ({
      ...prev,
      checklists: prev.checklists.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    }));
    const toggledItem = taskState.checklists.find((item) => item.id === itemId);
    logActivity('Checklist toggled', {
      item: toggledItem?.text,
      completed: !toggledItem?.completed
    });
  };

  const removeChecklistItem = (itemId) => {
    const removed = taskState.checklists.find((item) => item.id === itemId);
    setTaskState((prev) => ({
      ...prev,
      checklists: prev.checklists.filter((item) => item.id !== itemId)
    }));
    logActivity('Checklist removed', { item: removed?.text });
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const comment = {
      id: `comment-${Date.now()}`,
      author: taskState.assignedTo || 'You',
      text: commentText.trim(),
      timestamp: new Date().toLocaleString()
    };
    setTaskState((prev) => ({
      ...prev,
      comments: [comment, ...prev.comments]
    }));
    logActivity('Comment added', { excerpt: comment.text.slice(0, 40) });
    setCommentText('');
  };

  const addDependency = () => {
    if (!dependencyText.trim()) return;
    setTaskState((prev) => ({
      ...prev,
      dependencies: [...prev.dependencies, dependencyText.trim()]
    }));
    logActivity('Dependency linked', { task: dependencyText.trim() });
    setDependencyText('');
  };

  const addLabel = () => {
    if (!labelText.trim()) return;
    const nextLabel = labelText.trim();
    if (taskState.labels.includes(nextLabel)) {
      setLabelText('');
      return;
    }
    setTaskState((prev) => ({
      ...prev,
      labels: [...prev.labels, nextLabel]
    }));
    logActivity('Label added', { label: nextLabel });
    setLabelText('');
  };

  const removeLabel = (label) => {
    setTaskState((prev) => ({
      ...prev,
      labels: prev.labels.filter((item) => item !== label)
    }));
    logActivity('Label removed', { label });
  };

  const handleAttachment = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const attachments = files.map((file) => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size
    }));
    setTaskState((prev) => ({
      ...prev,
      attachments: [...attachments, ...prev.attachments]
    }));
    logActivity('Files attached', { count: attachments.length });
    event.target.value = '';
  };

  const removeAttachment = (attachmentId) => {
    const removed = taskState.attachments.find((file) => file.id === attachmentId);
    setTaskState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((file) => file.id !== attachmentId)
    }));
    logActivity('Attachment removed', { file: removed?.name });
  };

  const plannedCompletion = taskState.checklists.length
    ? Math.round(
        (taskState.checklists.filter((item) => item.completed).length /
          taskState.checklists.length) *
          100
      )
    : 0;

  return (
    <div
      className="w-[360px] bg-surface border-2 border-line rounded-2xl shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center px-4 py-3 bg-black border-b border-info/10">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-info" />
          <input
            type="text"
            value={taskState.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => logActivity('Title updated', { title: taskState.title })}
            placeholder="Task title"
            className="bg-transparent font-semibold text-ink text-base focus:outline-none"
          />
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex items-center justify-between bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-dim">
            <span className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-info" />
              <span className="text-sm font-medium text-ink">Status</span>
            </span>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-lg border ${getStatusBadgeClass(taskState.status)}`}
              >
                {STATUS_OPTIONS.find((item) => item.value === taskState.status)?.label}
              </span>
              <select
                value={taskState.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="appearance-none bg-surface border border-line text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-info"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="flex items-center space-x-2 text-sm text-dim bg-canvas border border-line rounded-lg px-3 py-2">
            <User className="w-4 h-4 text-info" />
            <input
              type="text"
              value={taskState.assignedTo}
              onChange={(e) => handleAssignedToChange(e.target.value)}
              placeholder="Assigned to"
              className="bg-transparent focus:outline-none text-sm text-ink"
            />
          </label>
          <label className="flex items-center space-x-2 text-sm text-dim bg-canvas border border-line rounded-lg px-3 py-2">
            <Flag className="w-4 h-4 text-warning" />
            <select
              value={taskState.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className={`bg-transparent focus:outline-none text-sm ${getPriorityBadgeClass(
                taskState.priority
              )} rounded-lg px-1 py-0.5 border-0`}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center space-x-2 text-sm text-dim bg-canvas border border-line rounded-lg px-3 py-2 col-span-2">
            <Calendar className="w-4 h-4 text-ink" />
            <input
              type="date"
              value={taskState.dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="bg-transparent focus:outline-none text-sm text-ink"
            />
          </label>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-dim uppercase tracking-wide">Description</span>
          <textarea
            value={taskState.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => logActivity('Description updated')}
            placeholder="Describe the task, context, goals, or blockers..."
            className="w-full min-h-[72px] border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/10"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Checklist</span>
            <span className="text-xs text-dim">{plannedCompletion}% complete</span>
          </div>
          <div className="space-y-2">
            {taskState.checklists.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-canvas border border-line rounded-lg px-3 py-2"
              >
                <label className="flex items-center space-x-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleChecklist(item.id)}
                    className="rounded border-line text-info focus:ring-info"
                  />
                  <span className={item.completed ? 'line-through text-dim' : ''}>
                    {item.text}
                  </span>
                </label>
                <button
                  type="button"
                  className="text-dim hover:text-danger"
                  onClick={() => removeChecklistItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex space-x-2">
              <input
                type="text"
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Add checklist item"
                className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/10"
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="px-3 py-2 bg-info text-white rounded-lg text-sm font-medium hover:bg-info"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Attachments</span>
            <label className="flex items-center space-x-1 text-xs font-medium text-info cursor-pointer">
              <UploadCloud className="w-4 h-4" />
              <span>Upload</span>
              <input
                type="file"
                multiple
                onChange={handleAttachment}
                className="hidden"
              />
            </label>
          </div>
          <div className="space-y-2">
            {taskState.attachments.length === 0 && (
              <p className="text-xs text-dim bg-canvas rounded-lg px-3 py-2">
                No files attached yet
              </p>
            )}
            {taskState.attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-surface border border-line rounded-lg px-3 py-2 text-sm text-dim"
              >
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-4 h-4 text-dim" />
                  <span className="truncate max-w-[180px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-dim">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  className="text-dim hover:text-danger"
                  onClick={() => removeAttachment(file.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-semibold text-ink">Comments</span>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) {
                addComment();
              }
            }}
            placeholder="Add a comment (⌘ + Enter to submit)"
            className="w-full min-h-[64px] border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/10"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addComment}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-cta text-cta-foreground rounded-lg text-sm hover:bg-cta"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Comment</span>
            </button>
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {taskState.comments.length === 0 && (
              <p className="text-xs text-dim">No comments yet</p>
            )}
            {taskState.comments.map((comment) => (
              <div key={comment.id} className="bg-canvas border border-line rounded-lg px-3 py-2">
                <div className="flex items-center justify_between text-xs text-dim">
                  <span className="font-medium text-ink">{comment.author}</span>
                  <span>{comment.timestamp}</span>
                </div>
                <p className="text-sm text-ink mt-1">{comment.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold text-ink">
            <span>Dependencies</span>
          </div>
          <div className="space-y-2">
            {taskState.dependencies.map((dependency) => (
              <div
                key={dependency}
                className="flex items-center justify_between bg-surface border border-line rounded-lg px-3 py-2 text-sm text-dim"
              >
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-info" />
                  <span>{dependency}</span>
                </div>
                <button
                  type="button"
                  className="text-dim hover:text-danger"
                  onClick={() => {
                    setTaskState((prev) => ({
                      ...prev,
                      dependencies: prev.dependencies.filter((item) => item !== dependency)
                    }));
                    logActivity('Dependency removed', { task: dependency });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex space-x-2">
              <input
                type="text"
                value={dependencyText}
                onChange={(e) => setDependencyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDependency();
                  }
                }}
                placeholder="Link tasks or milestones"
                className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/10"
              />
              <button
                type="button"
                onClick={addDependency}
                className="px-3 py-2 bg-info text-white rounded-lg text-sm font-medium hover:bg-info"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Labels / Tags</span>
          <div className="flex flex-wrap gap-2">
            {taskState.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center space-x-1 bg-surface-hover text-ink border border-line rounded-full px-3 py-1 text-xs font-medium"
              >
                <Tag className="w-3 h-3" />
                <span>{label}</span>
                <button
                  type="button"
                  className="text-ink hover:text-ink"
                  onClick={() => removeLabel(label)}
                >
                  ×
                </button>
              </span>
            ))}
            {taskState.labels.length === 0 && (
              <span className="text-xs text-dim">No labels yet</span>
            )}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLabel();
                }
              }}
              placeholder="Add label or tag"
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/10"
            />
            <button
              type="button"
              onClick={addLabel}
              className="px-3 py-2 bg-cta text-cta-foreground rounded-lg text-sm font-medium hover:bg-cta"
            >
              Add
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Activity Log</span>
          <div className="max-h-36 overflow-y-auto space-y-2">
            {taskState.activityLog.map((entry) => (
              <div
                key={entry.id}
                className="bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-dim"
              >
                <div className="flex justify-between">
                  <span className="font-medium text-ink">{entry.action}</span>
                  <span className="text-[11px] text-dim">{entry.timestamp}</span>
                </div>
                {entry.meta && Object.keys(entry.meta).length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(entry.meta).map(([key, value]) => (
                      <div key={key} className="flex items-center text-[11px] text-dim">
                        <span className="uppercase tracking-wide mr-1">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TaskCardRenderer;