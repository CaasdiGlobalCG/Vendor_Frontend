import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  User,
  Calendar,
  Flag,
  Paperclip,
  MessageCircle,
  Link as LinkIcon,
  Tag
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

const ACTION_OPTIONS = [
  'Create',
  'Update',
  'Delete',
  'Drag to reposition',
  'Change status',
  'Assign or reassign',
  'Attach files',
  'Add comments',
  'Add labels/tags'
];

const generateId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const TaskCardConfigModal = ({
  isOpen,
  onClose,
  onConfirm,
  elementName = 'Task Card',
  initialData = {}
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [checklists, setChecklists] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [labels, setLabels] = useState([]);
  const [activityEntries, setActivityEntries] = useState([]);
  const [selectedActions, setSelectedActions] = useState(ACTION_OPTIONS);

  const hasInitialData = useMemo(() => Boolean(initialData && Object.keys(initialData).length), [initialData]);

  useEffect(() => {
    if (!isOpen) return;

    const data = initialData || {};

    setTitle(data.title || '');
    setDescription(data.description || '');
    setStatus(data.status || 'todo');
    setAssignedTo(data.assignedTo || '');
    setPriority(data.priority || 'medium');
    setDueDate(data.dueDate ? data.dueDate : '');
    setChecklists(
      Array.isArray(data.checklists) ? data.checklists.map((item) => ({
        id: item.id || generateId('checklist'),
        text: item.text || '',
        completed: Boolean(item.completed)
      })) : []
    );
    setAttachments(
      Array.isArray(data.attachments) ? data.attachments.map((file) => ({
        id: file.id || generateId('attachment'),
        name: file.name || '',
        size: file.size ? (Number(file.size) / 1024).toFixed(1) : ''
      })) : []
    );
    setComments(
      Array.isArray(data.comments) ? data.comments.map((comment) => ({
        id: comment.id || generateId('comment'),
        author: comment.author || '',
        text: comment.text || ''
      })) : []
    );
    setDependencies(
      Array.isArray(data.dependencies) ? data.dependencies.map((item) => item || '') : []
    );
    setLabels(Array.isArray(data.labels) ? data.labels.map((label) => label || '') : []);
    setActivityEntries(
      Array.isArray(data.activityLog) ? data.activityLog.map((entry) => ({
        id: entry.id || generateId('activity'),
        action: entry.action || '',
        metaSummary: entry.meta ? JSON.stringify(entry.meta) : ''
      })) : []
    );
    setSelectedActions(Array.isArray(data.actions) && data.actions.length ? data.actions : ACTION_OPTIONS);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const closeAndReset = () => {
    onClose?.();
  };

  const addChecklistItem = () => {
    setChecklists((prev) => [...prev, { id: generateId('checklist'), text: '', completed: false }]);
  };

  const updateChecklistItem = (id, field, value) => {
    setChecklists((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'completed' ? Boolean(value) : value
            }
          : item
      )
    );
  };

  const removeChecklistItem = (id) => {
    setChecklists((prev) => prev.filter((item) => item.id !== id));
  };

  const addAttachment = () => {
    setAttachments((prev) => [...prev, { id: generateId('attachment'), name: '', size: '' }]);
  };

  const updateAttachment = (id, field, value) => {
    setAttachments((prev) =>
      prev.map((file) => (file.id === id ? { ...file, [field]: value } : file))
    );
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const addComment = () => {
    setComments((prev) => [...prev, { id: generateId('comment'), author: assignedTo || '', text: '' }]);
  };

  const updateComment = (id, field, value) => {
    setComments((prev) =>
      prev.map((comment) => (comment.id === id ? { ...comment, [field]: value } : comment))
    );
  };

  const removeComment = (id) => {
    setComments((prev) => prev.filter((comment) => comment.id !== id));
  };

  const addDependency = () => {
    setDependencies((prev) => [...prev, '']);
  };

  const updateDependency = (index, value) => {
    setDependencies((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const removeDependency = (index) => {
    setDependencies((prev) => prev.filter((_, i) => i !== index));
  };

  const addLabel = () => {
    setLabels((prev) => [...prev, '']);
  };

  const updateLabel = (index, value) => {
    setLabels((prev) => prev.map((label, i) => (i === index ? value : label)));
  };

  const removeLabel = (index) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const addActivityEntry = () => {
    setActivityEntries((prev) => [...prev, { id: generateId('activity'), action: '', metaSummary: '' }]);
  };

  const updateActivityEntry = (id, field, value) => {
    setActivityEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const removeActivityEntry = (id) => {
    setActivityEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const toggleAction = (action) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((item) => item !== action)
        : [...prev, action]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const sanitizedChecklists = checklists
      .filter((item) => item.text.trim())
      .map((item, index) => ({
        id: item.id || generateId(`checklist-${index}`),
        text: item.text.trim(),
        completed: Boolean(item.completed)
      }));

    const sanitizedAttachments = attachments
      .filter((file) => file.name.trim())
      .map((file, index) => ({
        id: file.id || generateId(`attachment-${index}`),
        name: file.name.trim(),
        size: file.size ? Math.max(Number(file.size) * 1024, 0) : undefined
      }));

    const sanitizedComments = comments
      .filter((comment) => comment.text.trim())
      .map((comment, index) => ({
        id: comment.id || generateId(`comment-${index}`),
        author: comment.author?.trim() || 'Unassigned',
        text: comment.text.trim(),
        timestamp: new Date().toLocaleString()
      }));

    const sanitizedDependencies = dependencies
      .map((item) => item.trim())
      .filter(Boolean);

    const sanitizedLabels = labels.map((label) => label.trim()).filter(Boolean);

    const sanitizedActivityLog = activityEntries
      .filter((entry) => entry.action.trim())
      .map((entry, index) => ({
        id: entry.id || generateId(`activity-${index}`),
        action: entry.action.trim(),
        meta: entry.metaSummary ? { note: entry.metaSummary.trim() } : {},
        timestamp: new Date().toLocaleString()
      }));

    if (!title.trim()) {
      alert('Please provide a title for the task card.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      assignedTo: assignedTo.trim(),
      priority,
      dueDate,
      checklists: sanitizedChecklists,
      attachments: sanitizedAttachments,
      comments: sanitizedComments,
      dependencies: sanitizedDependencies,
      labels: sanitizedLabels,
      activityLog: sanitizedActivityLog.length
        ? sanitizedActivityLog
        : [
            {
              id: generateId('activity'),
              action: 'Task created',
              meta: { by: assignedTo.trim() || 'Unassigned' },
              timestamp: new Date().toLocaleString()
            }
          ],
      actions: selectedActions.length ? selectedActions : ACTION_OPTIONS
    };

    onConfirm?.(payload);
    closeAndReset();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-auto bg-slate-900/60 backdrop-blur-sm p-6">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Configure {elementName}</h2>
            <p className="text-sm text-slate-500">Fill in the details to create a rich Jira-style task card.</p>
          </div>
          <button
            onClick={closeAndReset}
            className="p-2 rounded-full hover:bg-white border border-transparent hover:border-slate-200 transition"
            type="button"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col space-y-2 text-sm text-slate-700">
              <span className="font-medium flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-blue-500" /><span>Title</span></span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Prepare kickoff deck"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={120}
                required
              />
            </label>

            <label className="flex flex-col space-y-2 text-sm text-slate-700">
              <span className="font-medium flex items-center space-x-2"><User className="w-4 h-4 text-indigo-500" /><span>Assigned To</span></span>
              <input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Owner name"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>

            <label className="flex flex-col space-y-2 text-sm text-slate-700 md:col-span-2">
              <span className="font-medium flex items-center space-x-2"><MessageCircle className="w-4 h-4 text-rose-500" /><span>Description</span></span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task, goals, blockers..."
                className="rounded-lg border border-slate-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[96px]"
              />
            </label>

            <label className="flex flex-col space-y-2 text-sm text-slate-700">
              <span className="font-medium flex items-center space-x-2"><Flag className="w-4 h-4 text-amber-500" /><span>Priority</span></span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col space-y-2 text-sm text-slate-700">
              <span className="font-medium flex items-center space-x-2"><Calendar className="w-4 h-4 text-emerald-500" /><span>Due Date</span></span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>

            <label className="flex flex-col space-y-2 text-sm text-slate-700">
              <span className="font-medium flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span>Status</span></span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-blue-500" /><span>Checklist Items</span></h3>
              <button type="button" onClick={addChecklistItem} className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </header>
            <div className="space-y-2">
              {checklists.length === 0 && (
                <p className="text-xs text-slate-400">No checklist items yet.</p>
              )}
              {checklists.map((item) => (
                <div key={item.id} className="grid grid-cols-[auto,1fr,auto] gap-3 items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => updateChecklistItem(item.id, 'completed', e.target.checked)}
                    className="w-4 h-4 text-blue-500 border-slate-300 rounded"
                  />
                  <input
                    value={item.text}
                    onChange={(e) => updateChecklistItem(item.id, 'text', e.target.value)}
                    placeholder="Checklist detail"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2"><Paperclip className="w-4 h-4 text-purple-500" /><span>Attachments</span></h3>
              <button type="button" onClick={addAttachment} className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                <Plus className="w-4 h-4" />
                <span>Add attachment</span>
              </button>
            </header>
            <div className="space-y-2">
              {attachments.length === 0 && (
                <p className="text-xs text-slate-400">No attachments configured.</p>
              )}
              {attachments.map((file) => (
                <div key={file.id} className="grid grid-cols-1 md:grid-cols-[3fr,1fr,auto] gap-3 items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <input
                    value={file.name}
                    onChange={(e) => updateAttachment(file.id, 'name', e.target.value)}
                    placeholder="File name"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <input
                    value={file.size}
                    onChange={(e) => updateAttachment(file.id, 'size', e.target.value)}
                    placeholder="Size (KB)"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <button type="button" onClick={() => removeAttachment(file.id)} className="text-slate-400 hover:text-rose-500 justify-self-end">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2"><MessageCircle className="w-4 h-4 text-sky-500" /><span>Comments</span></h3>
              <button type="button" onClick={addComment} className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                <Plus className="w-4 h-4" />
                <span>Add comment</span>
              </button>
            </header>
            <div className="space-y-2">
              {comments.length === 0 && (
                <p className="text-xs text-slate-400">No comments yet.</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="grid grid-cols-1 md:grid-cols-[1fr,2fr,auto] gap-3 items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <input
                    value={comment.author}
                    onChange={(e) => updateComment(comment.id, 'author', e.target.value)}
                    placeholder="Author"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <textarea
                    value={comment.text}
                    onChange={(e) => updateComment(comment.id, 'text', e.target.value)}
                    placeholder="Comment"
                    className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <button type="button" onClick={() => removeComment(comment.id)} className="text-slate-400 hover:text-rose-500 justify-self-end">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2"><LinkIcon className="w-4 h-4 text-amber-500" /><span>Dependencies (Linked tasks)</span></h3>
              <button type="button" onClick={addDependency} className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                <Plus className="w-4 h-4" />
                <span>Add dependency</span>
              </button>
            </header>
            <div className="space-y-2">
              {dependencies.length === 0 && (
                <p className="text-xs text-slate-400">No dependencies linked.</p>
              )}
              {dependencies.map((dependency, index) => (
                <div key={`dependency-${index}`} className="grid grid-cols-[1fr,auto] gap-3 items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <input
                    value={dependency}
                    onChange={(e) => updateDependency(index, e.target.value)}
                    placeholder="Task or document reference"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <button type="button" onClick={() => removeDependency(index)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2"><Tag className="w-4 h-4 text-purple-500" /><span>Labels / Tags</span></h3>
              <button type="button" onClick={addLabel} className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                <Plus className="w-4 h-4" />
                <span>Add label</span>
              </button>
            </header>
            <div className="space-y-2">
              {labels.length === 0 && (
                <p className="text-xs text-slate-400">No labels yet.</p>
              )}
              {labels.map((label, index) => (
                <div key={`label-${index}`} className="grid grid-cols-[1fr,auto] gap-3 items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <input
                    value={label}
                    onChange={(e) => updateLabel(index, e.target.value)}
                    placeholder="e.g. Sprint 11"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <button type="button" onClick={() => removeLabel(index)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span>Activity Log</span></h3>
              <button type="button" onClick={addActivityEntry} className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                <Plus className="w-4 h-4" />
                <span>Add entry</span>
              </button>
            </header>
            <div className="space-y-2">
              {activityEntries.length === 0 && (
                <p className="text-xs text-slate-400">No manual activity entries. A default "Task created" log will be generated.</p>
              )}
              {activityEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-1 md:grid-cols-[2fr,2fr,auto] gap-3 items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <input
                    value={entry.action}
                    onChange={(e) => updateActivityEntry(entry.id, 'action', e.target.value)}
                    placeholder="Activity description"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <input
                    value={entry.metaSummary}
                    onChange={(e) => updateActivityEntry(entry.id, 'metaSummary', e.target.value)}
                    placeholder="Optional notes / metadata"
                    className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                  <button type="button" onClick={() => removeActivityEntry(entry.id)} className="text-slate-400 hover:text-rose-500 justify-self-end">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Available Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ACTION_OPTIONS.map((action) => (
                <label key={action} className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(action)}
                    onChange={() => toggleAction(action)}
                    className="w-4 h-4 text-blue-500 border-slate-300 rounded"
                  />
                  <span>{action}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={closeAndReset}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow"
            >
              Save task card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCardConfigModal;