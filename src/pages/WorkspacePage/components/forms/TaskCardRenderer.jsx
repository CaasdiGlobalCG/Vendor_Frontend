import React, { useMemo, useState, useEffect, useRef, useCallback, useContext } from 'react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import { VendorContext } from '../../../../context/VendorContext';
import { useReactFlow } from 'reactflow';
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
  CheckCircle,
  Download,
  Loader2,
  Link2,
  Globe,
  ExternalLink,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Pencil,
  Lock
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

const TaskCardRenderer = ({ data, nodeId, workspaceId, setNodes }) => {
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
      links: data?.taskCardData?.links || [],
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
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

  // Compact summary is the default canvas display once the card has data —
  // the full editor expands on demand so the canvas stays tidy.
  const [expanded, setExpanded] = useState(() => {
    const d = data?.taskCardData;
    return !d || Object.keys(d).length === 0;
  });

  // Workspace file uploads are scoped to subtasks on the backend
  const taskId = data?.taskId;
  const subtaskId = data?.subtaskId;

  // ---- Persistence: write taskCardData back to node.data via the shared
  // nodePersistence path (WS op when connected, HTTP read-then-write
  // otherwise). Debounced so typing doesn't spam writes.
  const taskStateRef = useRef(taskState);
  const dirtyRef = useRef(false);
  const persistTimerRef = useRef(null);

  useEffect(() => {
    taskStateRef.current = taskState;
  }, [taskState]);

  const schedulePersist = useCallback(() => {
    if (!nodeId || !workspaceId) return;
    dirtyRef.current = true;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      persistTimerRef.current = null;
      try {
        await persistNodeDataPatch(
          nodeId,
          { taskCardData: taskStateRef.current },
          setNodes,
          workspaceId
        );
      } catch (err) {
        console.error('Failed to persist task card:', err);
      } finally {
        dirtyRef.current = false;
      }
    }, 800);
  }, [nodeId, workspaceId, setNodes]);

  // Flush any pending write when the node unmounts (e.g. canvas switched)
  useEffect(() => () => {
    if (persistTimerRef.current && nodeId && workspaceId) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      persistNodeDataPatch(
        nodeId,
        { taskCardData: taskStateRef.current },
        setNodes,
        workspaceId
      ).catch((err) => console.error('Failed to persist task card on unmount:', err));
    }
  }, [nodeId, workspaceId, setNodes]);

  // Adopt external updates to node.data (config modal re-edit, collaborator
  // writes) only when no local edit is in flight — otherwise the echo of our
  // own persist would clobber the user's typing.
  useEffect(() => {
    if (dirtyRef.current) return;
    setTaskState((prev) =>
      JSON.stringify(prev) === JSON.stringify(defaultState) ? prev : defaultState
    );
  }, [defaultState]);

  const logActivity = (action, meta) => {
    setTaskState((prev) => ({
      ...prev,
      activityLog: [createActivityEntry(action, meta), ...prev.activityLog]
    }));
    schedulePersist();
  };

  const updateField = (field, value) => {
    if (!canEditCard) return; // read-only for non-creator/non-assignee viewers
    setTaskState((prev) => ({
      ...prev,
      [field]: value
    }));
    schedulePersist();
  };

  const handleStatusChange = (value) => {
    updateField('status', value);
    logActivity('Status updated', { status: value });
  };

  const handlePriorityChange = (value) => {
    updateField('priority', value);
    logActivity('Priority updated', { priority: value });
  };

  // Workspace collaborators are injected into node.data at creation
  // (CanvasWorkspace injects `workspaceCollaborators` for @mentions) —
  // dedupe by vendorId/userId/email like ElementNode does.
  const collaborators = useMemo(
    () =>
      (data?.workspaceCollaborators || []).filter(
        (c, i, arr) =>
          arr.findIndex(
            (x) => (x.vendorId || x.userId || x.email) === (c.vendorId || c.userId || c.email)
          ) === i
      ),
    [data?.workspaceCollaborators]
  );
  const collaboratorKey = (c) => c.vendorId || c.userId || c.email;
  const matchedAssignee = collaborators.find(
    (c) =>
      collaboratorKey(c) === taskState.assignedToKey ||
      collaboratorKey(c) === taskState.assignedTo ||
      (c.name || c.email) === taskState.assignedTo
  );
  const assigneeSelectValue =
    taskState.assignedToKey ||
    (matchedAssignee ? collaboratorKey(matchedAssignee) : taskState.assignedTo || '');

  // ---- Edit permission: only the card's creator or its assignee may edit ----
  // Identity mirrors ElementNode: VendorContext, plus URL params for users who
  // arrive via shared links (PM/client/CAS).
  const { currentUser } = useContext(VendorContext);
  const urlUserParams = new URLSearchParams(window.location.search);
  const myIds = [
    currentUser?.vendorId,
    currentUser?.userId,
    currentUser?.pmId,
    currentUser?.id,
    urlUserParams.get('pmId'),
    urlUserParams.get('userId'),
    urlUserParams.get('clientId')
  ].filter(Boolean);
  const myEmail = currentUser?.email || urlUserParams.get('email') || '';
  const myName = currentUser?.name || urlUserParams.get('name') || '';

  const creatorKeys = [data?.addedByEmail, data?.addedBy, data?.addedById].filter(Boolean);
  const assigneeKeys = [taskState.assignedToKey, taskState.assignedTo].filter(Boolean);

  const matchesMe = (k) => myIds.includes(k) || (!!k && (k === myEmail || k === myName));
  // Legacy cards without a creator stamp stay editable rather than locking
  // everyone out.
  const isCreator = creatorKeys.length === 0 || creatorKeys.some(matchesMe);
  const isAssignee = assigneeKeys.some(matchesMe);
  const canEditCard = isCreator || isAssignee;

  const handleAssignedToChange = (key) => {
    const collab = collaborators.find((c) => collaboratorKey(c) === key);
    const name = collab ? collab.name || collab.email || '' : key;
    setTaskState((prev) => ({
      ...prev,
      assignedTo: name,
      assignedToKey: key
    }));
    logActivity('Task reassigned', { assignee: name || 'Unassigned' });
  };

  // ---- Links / smart embeds ----
  // `links` entries are { kind: 'url'|'node', url?, nodeId?, title? }. URL
  // links render as thumbnails/inline widgets (images, Figma, YouTube, PDF);
  // node links point at another canvas element and can focus it.
  const reactFlow = useReactFlow();
  const [linkUrl, setLinkUrl] = useState('');
  const [pickedNodeId, setPickedNodeId] = useState('');

  const linkableNodes = (reactFlow.getNodes?.() || []).filter(
    (n) => n.id !== nodeId && n.data?.type !== 'task-board'
  );

  const addUrlLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    setTaskState((prev) => ({
      ...prev,
      links: [...(prev.links || []), { id: `link-${Date.now()}`, kind: 'url', url }]
    }));
    logActivity('Link added', { url });
    setLinkUrl('');
  };

  const addNodeLink = () => {
    if (!pickedNodeId) return;
    const node = reactFlow.getNodes().find((n) => n.id === pickedNodeId);
    const label =
      node?.data?.taskCardData?.title ||
      node?.data?.name ||
      node?.data?.preview ||
      node?.data?.type ||
      pickedNodeId;
    setTaskState((prev) => ({
      ...prev,
      links: [...(prev.links || []), { id: `link-${Date.now()}`, kind: 'node', nodeId: pickedNodeId, title: label }]
    }));
    logActivity('Element linked', { element: label });
    setPickedNodeId('');
  };

  const removeLink = (linkId) => {
    const removed = (taskState.links || []).find((l) => l.id === linkId);
    setTaskState((prev) => ({
      ...prev,
      links: (prev.links || []).filter((l) => l.id !== linkId)
    }));
    logActivity('Link removed', { link: removed?.title || removed?.url });
  };

  // The element's ⋮-menu "Edit" dispatches this event — expand into the
  // inline editor so title/assignee/etc. are editable right on the card.
  useEffect(() => {
    const handleEditRequest = (event) => {
      if (event.detail?.nodeId === nodeId) setExpanded(true);
    };
    document.addEventListener('editTaskCardNode', handleEditRequest);
    return () => document.removeEventListener('editTaskCardNode', handleEditRequest);
  }, [nodeId]);

  const focusLinkedNode = (node) => {
    const w = node.width || 360;
    const h = node.height || 200;
    reactFlow.setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.1, duration: 400 });
  };

  // Renders a rich preview for one link entry (Smart-Link style).
  const renderLinkEmbed = (link) => {
    const removeBtn = (
      <button
        type="button"
        className="text-dim hover:text-danger p-0.5 flex-shrink-0"
        onClick={() => removeLink(link.id)}
        title="Remove link"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    );

    // --- Canvas element link ---
    if (link.kind === 'node') {
      const node = reactFlow.getNodes().find((n) => n.id === link.nodeId);
      const label =
        node?.data?.taskCardData?.title ||
        node?.data?.name ||
        node?.data?.preview ||
        link.title ||
        'Canvas element';
      const status = node?.data?.taskCardData?.status || node?.data?.approvalStatus || null;
      return (
        <div key={link.id} className="flex items-center justify-between gap-2 bg-canvas border border-line rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="w-4 h-4 text-info flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-ink font-medium truncate">{label}</p>
              <p className="text-[10px] text-dim uppercase tracking-wide">
                {node?.data?.type || 'element'}{status ? ` · ${status}` : ''}{node ? '' : ' · removed'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {node && (
              <button
                type="button"
                onClick={() => focusLinkedNode(node)}
                className="text-dim hover:text-ink p-1"
                title="Go to element"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            )}
            {removeBtn}
          </div>
        </div>
      );
    }

    // --- URL link ---
    const url = link.url || '';
    let hostname = '';
    try { hostname = new URL(url).hostname; } catch { hostname = url; }

    const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(url);
    const isFigma = /figma\.com\/(file|design|proto|board)/i.test(url);
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    const isPdf = /\.pdf(\?|#|$)/i.test(url);

    const header = (
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] font-medium text-dim truncate uppercase tracking-wide">{hostname}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-dim hover:text-ink p-1" title="Open link">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {removeBtn}
        </div>
      </div>
    );

    if (isFigma) {
      return (
        <div key={link.id} className="space-y-1">
          {header}
          <iframe
            src={`https://www.figma.com/embed?embed_host=vd&url=${encodeURIComponent(url)}`}
            title={`Figma embed - ${hostname}`}
            className="w-full h-44 border border-line rounded-lg bg-white"
            allowFullScreen
          />
        </div>
      );
    }

    if (ytMatch) {
      return (
        <div key={link.id} className="space-y-1">
          {header}
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}`}
            title={`YouTube embed - ${hostname}`}
            className="w-full h-44 border border-line rounded-lg bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (isImage) {
      return (
        <div key={link.id} className="space-y-1">
          {header}
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={link.title || hostname}
              className="w-full h-36 object-cover rounded-lg border border-line"
            />
          </a>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div key={link.id} className="space-y-1">
          {header}
          <iframe
            src={`${url}#toolbar=0`}
            title={`PDF embed - ${hostname}`}
            className="w-full h-44 border border-line rounded-lg bg-white"
          />
        </div>
      );
    }

    // Generic link card
    return (
      <div key={link.id} className="flex items-center justify-between gap-2 bg-canvas border border-line rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-info flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-ink font-medium truncate">{link.title || hostname || url}</p>
            <p className="text-[10px] text-dim truncate">{url}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-dim hover:text-ink p-1" title="Open link">
            <ExternalLink className="w-4 h-4" />
          </a>
          {removeBtn}
        </div>
      </div>
    );
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

  // Upload one file to the workspace-files endpoint (S3). Entries that fail
  // are still listed locally and flagged 'not synced' so nothing is lost.
  const uploadAttachment = async (file) => {
    const entry = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date().toISOString(),
      url: null,
      s3Key: null,
      fileId: null
    };
    try {
      if (!subtaskId) {
        throw new Error(`${file.name}: add this element inside a subtask to enable uploads`);
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      formData.append('nodeId', nodeId);
      formData.append('fileType', 'task-attachment');
      if (taskId) formData.append('taskId', taskId);
      formData.append('subtaskId', subtaskId);

      const response = await fetch('/api/workspace-files/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Upload failed');
      }
      const result = await response.json();
      entry.url = result.file?.s3Url || null;
      entry.s3Key = result.file?.s3Key || null;
      entry.fileId = result.file?.fileId || null;
    } catch (err) {
      entry.localOnly = true;
      entry.uploadError = err.message;
      console.error('❌ Task attachment upload failed:', err);
    }
    return entry;
  };

  // Prefer the same-origin stream endpoint — the raw S3 URL can 403 when the
  // uploads bucket is not publicly readable.
  const attachmentHref = (file) => {
    if (file.fileId && workspaceId && subtaskId) {
      return `/api/workspace-files/stream/${file.fileId}?workspaceId=${encodeURIComponent(workspaceId)}&subtaskId=${encodeURIComponent(subtaskId)}`;
    }
    return file.url || null;
  };

  const handleAttachment = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setAttachmentsUploading(true);
    setAttachmentError('');
    const uploaded = [];
    const failures = [];
    for (const file of files) {
      const entry = await uploadAttachment(file);
      uploaded.push(entry);
      if (entry.uploadError) failures.push(entry.uploadError);
    }

    if (uploaded.length) {
      setTaskState((prev) => ({
        ...prev,
        attachments: [...uploaded, ...prev.attachments]
      }));
      logActivity('Files attached', { count: uploaded.length });
    }
    if (failures.length) setAttachmentError(failures.join(' · '));
    setAttachmentsUploading(false);
  };

  const removeAttachment = (attachmentId) => {
    const removed = taskState.attachments.find((file) => file.id === attachmentId);
    setTaskState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((file) => file.id !== attachmentId)
    }));
    logActivity('Attachment removed', { file: removed?.name });

    // Delete the stored file too — fire-and-forget; the card entry is already gone.
    if (removed?.fileId && workspaceId && subtaskId) {
      fetch(
        `/api/workspace-files/${removed.fileId}?workspaceId=${encodeURIComponent(workspaceId)}&subtaskId=${encodeURIComponent(subtaskId)}`,
        { method: 'DELETE' }
      ).catch((err) => console.error('Failed to delete attachment from storage:', err));
    }
  };

  const plannedCompletion = taskState.checklists.length
    ? Math.round(
        (taskState.checklists.filter((item) => item.completed).length /
          taskState.checklists.length) *
          100
      )
    : 0;

  // ---- Collapsed canvas view: a compact, structured summary card ----
  if (!expanded) {
    const statusMeta = STATUS_OPTIONS.find((o) => o.value === taskState.status) || STATUS_OPTIONS[0];
    const priorityMeta = PRIORITY_OPTIONS.find((o) => o.value === taskState.priority) || PRIORITY_OPTIONS[1];
    const doneCount = taskState.checklists.filter((i) => i.completed).length;
    const linkCount = (taskState.links || []).length;

    return (
      <div
        className="nodrag w-[300px] bg-surface border-2 border-line rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header — title is editable inline */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-black">
          <CheckSquare className="w-4 h-4 text-info flex-shrink-0" />
          {canEditCard ? (
            <input
              type="text"
              value={taskState.title}
              onChange={(e) => updateField('title', e.target.value)}
              onBlur={() => logActivity('Title updated', { title: taskState.title })}
              placeholder="Task title"
              title="Click to edit title"
              className="bg-transparent font-semibold text-white text-sm placeholder-white/50 focus:outline-none flex-1 min-w-0"
            />
          ) : (
            <span className="font-semibold text-white text-sm truncate flex-1 min-w-0 flex items-center gap-1" title={taskState.title}>
              {taskState.title || 'Untitled Task'}
              <Lock className="w-3 h-3 text-white/50 flex-shrink-0" />
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${getStatusBadgeClass(taskState.status)}`}>
            {statusMeta.label}
          </span>
        </div>

        <div className="px-3.5 py-3 space-y-2.5">
          {/* Assignee + due date */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-dim">
            <span className="flex items-center gap-1.5 min-w-0" title={taskState.assignedTo || 'Unassigned'}>
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{taskState.assignedTo || 'Unassigned'}</span>
            </span>
            <span className="flex items-center gap-1.5 min-w-0" title={taskState.dueDate || 'No due date'}>
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{taskState.dueDate || 'No due date'}</span>
            </span>
          </div>

          {/* Priority badge + live checklist progress bar */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${getPriorityBadgeClass(taskState.priority)}`}>
              {priorityMeta.label}
            </span>
            {taskState.checklists.length > 0 && (
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className="h-full bg-info rounded-full transition-all"
                    style={{ width: `${plannedCompletion}%` }}
                  />
                </div>
                <span className="text-[10px] text-dim flex-shrink-0">
                  {doneCount}/{taskState.checklists.length} · {plannedCompletion}%
                </span>
              </div>
            )}
          </div>

          {/* Quick checklist — tick items right on the card; bar updates live */}
          {taskState.checklists.length > 0 && (
            <div className="space-y-1">
              {taskState.checklists.slice(0, 3).map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-1.5 text-[11px] cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.completed)}
                    onChange={() => toggleChecklistItem(item.id)}
                    disabled={!canEditCard}
                    className="w-3 h-3 accent-info flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  />
                  <span className={`truncate ${item.completed ? 'line-through text-dim' : 'text-ink'}`} title={item.text}>
                    {item.text}
                  </span>
                </label>
              ))}
              {taskState.checklists.length > 3 && (
                <p className="text-[10px] text-dim">+{taskState.checklists.length - 3} more — open Edit to see all</p>
              )}
            </div>
          )}

          {/* Content counts + labels */}
          {(taskState.attachments.length > 0 || taskState.comments.length > 0 || linkCount > 0 || taskState.labels.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-dim">
              {taskState.attachments.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-hover">
                  <Paperclip className="w-3 h-3" />{taskState.attachments.length}
                </span>
              )}
              {taskState.comments.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-hover">
                  <MessageCircle className="w-3 h-3" />{taskState.comments.length}
                </span>
              )}
              {linkCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-hover">
                  <Link2 className="w-3 h-3" />{linkCount}
                </span>
              )}
              {taskState.labels.slice(0, 3).map((label) => (
                <span key={label} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-hover">
                  <Tag className="w-3 h-3" />{label}
                </span>
              ))}
            </div>
          )}

          {/* Description preview */}
          {taskState.description && (
            <p className="text-[11px] text-dim line-clamp-2 leading-relaxed">{taskState.description}</p>
          )}

          {/* Update — expands the card into its inline editor; locked when the
              viewer is neither the creator nor the assignee */}
          {canEditCard ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-center gap-1.5 pt-1 px-2 py-1.5 text-[11px] font-semibold text-white bg-black hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Update task
            </button>
          ) : (
            <p className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-dim">
              <Lock className="w-3 h-3 flex-shrink-0" />
              Only the creator or assignee can edit this card
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="nodrag w-[360px] bg-surface border-2 border-line rounded-2xl shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-info/10">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <CheckSquare className="w-5 h-5 text-info flex-shrink-0" />
          {canEditCard ? (
            <input
              type="text"
              value={taskState.title}
              onChange={(e) => updateField('title', e.target.value)}
              onBlur={() => logActivity('Title updated', { title: taskState.title })}
              placeholder="Task title"
              className="bg-transparent font-semibold text-white text-base placeholder-white/50 focus:outline-none w-full min-w-0"
            />
          ) : (
            <span className="font-semibold text-white text-base truncate flex-1 min-w-0 flex items-center gap-1.5">
              {taskState.title || 'Untitled Task'}
              <Lock className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-white/60 hover:text-white p-1 flex-shrink-0"
          title="Done editing — collapse to card"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {!canEditCard && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg text-[11px] text-warning">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          Only the creator or assignee can edit this card — you're viewing it read-only.
        </div>
      )}

      <fieldset disabled={!canEditCard} className="px-4 py-3 space-y-4 border-0 m-0 min-w-0">
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
            <User className="w-4 h-4 text-info flex-shrink-0" />
            <select
              value={assigneeSelectValue}
              onChange={(e) => handleAssignedToChange(e.target.value)}
              className="bg-transparent focus:outline-none text-sm text-ink w-full truncate"
            >
              <option value="">Unassigned</option>
              {collaborators.map((collab) => {
                const key = collaboratorKey(collab);
                const roleLabel = collab.role || collab.userType || (collab.isClient ? 'client' : null);
                return (
                  <option key={key} value={key}>
                    {collab.name || collab.email || 'Unknown'}
                    {roleLabel ? ` (${String(roleLabel).toUpperCase()})` : ''}
                  </option>
                );
              })}
              {/* Keep a legacy free-text assignee visible when it's not a workspace member */}
              {taskState.assignedTo && !matchedAssignee && !taskState.assignedToKey && (
                <option value={taskState.assignedTo}>{taskState.assignedTo}</option>
              )}
            </select>
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
            <label
              className={`flex items-center space-x-1 text-xs font-medium text-info ${
                attachmentsUploading || !subtaskId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={!subtaskId ? 'Uploads need a subtask canvas — add this element inside a task/subtask' : undefined}
            >
              {attachmentsUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload</span>
                </>
              )}
              <input
                type="file"
                multiple
                onChange={handleAttachment}
                disabled={attachmentsUploading || !subtaskId}
                className="hidden"
              />
            </label>
          </div>
          {attachmentError && (
            <p className="text-[11px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {attachmentError}
            </p>
          )}
          {!subtaskId && (
            <p className="text-[11px] text-warning">
              Uploads are enabled when this element sits inside a task/subtask canvas.
            </p>
          )}
          <div className="space-y-2">
            {taskState.attachments.length === 0 && (
              <p className="text-xs text-dim bg-canvas rounded-lg px-3 py-2">
                No files attached yet
              </p>
            )}
            {taskState.attachments.map((file) => {
              const href = attachmentHref(file);
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-surface border border-line rounded-lg px-3 py-2 text-sm text-dim"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-dim flex-shrink-0" />
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate max-w-[160px] text-ink hover:underline"
                        title={file.name}
                      >
                        {file.name}
                      </a>
                    ) : (
                      <span className="truncate max-w-[160px]" title={file.name}>
                        {file.name}
                      </span>
                    )}
                    {typeof file.size === 'number' && file.size > 0 && (
                      <span className="text-xs text-dim flex-shrink-0">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                    {file.localOnly && (
                      <span className="text-[10px] font-medium text-warning flex-shrink-0">not synced</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {href && (
                      <a
                        href={href}
                        download={file.name}
                        className="text-dim hover:text-ink"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      className="text-dim hover:text-danger"
                      onClick={() => removeAttachment(file.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
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

        {/* Links & smart embeds — URLs render as previews/widgets; canvas
            elements render as reference chips that can jump to the element */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Links & Embeds</span>

          {(taskState.links || []).map(renderLinkEmbed)}

          {(taskState.links || []).length === 0 && (
            <p className="text-xs text-dim bg-canvas rounded-lg px-3 py-2">
              Paste a link (image, PDF, Figma, YouTube) or connect a canvas element
            </p>
          )}

          <div className="flex space-x-2">
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrlLink();
                }
              }}
              placeholder="Paste a URL — https://..."
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/10"
            />
            <button
              type="button"
              onClick={addUrlLink}
              className="px-3 py-2 bg-info text-white rounded-lg text-sm font-medium hover:bg-info"
              title="Add link"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {linkableNodes.length > 0 && (
            <div className="flex space-x-2">
              <select
                value={pickedNodeId}
                onChange={(e) => setPickedNodeId(e.target.value)}
                className="flex-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info/10"
              >
                <option value="">Link a canvas element...</option>
                {linkableNodes.map((n) => {
                  const label =
                    n.data?.taskCardData?.title ||
                    n.data?.name ||
                    n.data?.preview ||
                    n.data?.type ||
                    n.id;
                  return (
                    <option key={n.id} value={n.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={addNodeLink}
                disabled={!pickedNodeId}
                className="px-3 py-2 bg-info text-white rounded-lg text-sm font-medium hover:bg-info disabled:opacity-50 disabled:cursor-not-allowed"
                title="Link element"
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>
          )}
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

      </fieldset>
    </div>
  );
};

export default TaskCardRenderer;