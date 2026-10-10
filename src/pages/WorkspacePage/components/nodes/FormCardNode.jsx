import React, { useState, useEffect, useRef, useContext } from 'react';
import { useReactFlow, Handle, Position, NodeResizer } from 'reactflow';
import { Edit2, Save, Plus, Trash2, RotateCcw, MoreVertical, MessageCircle, UserCheck, Lock, Link2, Type, Hash, Mail, Phone, Calendar, AlignLeft, CheckCircle2, GripVertical, Send, Info, Copy } from 'lucide-react';
import { notifyWorkspaceEvent } from '../../utils/workspaceApi';
import {
  persistNodeDataPatch,
  persistIsImportant,
  persistDeadline,
  getTimeLeft as calculateTimeLeft,
  formatTimeLeft
} from '../../utils/nodePersistence';
import CommentThread from '../comments/CommentThread';
import FieldAccessPanel from '../forms/FieldAccessPanel';
import {
  buildViewerIdentity,
  getFieldAccessState,
  appendAnswer,
  formatAnswerValue,
  resolveViewerRole,
  canConfigureFieldAccess
} from '../../utils/fieldAccess';
import { VendorContext } from '../../../../context/VendorContext';

const DEFAULT_FIELDS = [
  { id: 'field1', label: 'Field 1', type: 'text', required: false },
  { id: 'field2', label: 'Field 2', type: 'text', required: false }
];

const FormCardNode = ({ id, data, selected, isConnectable }) => {
  const { setNodes, getNodes } = useReactFlow();
  const workspaceId = data?.workspaceId || null;
  const { currentUser } = useContext(VendorContext) || {};

  // Standard element chrome state (matches ElementNode look & feel)
  const [isNodeHovered, setIsNodeHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const menuRef = useRef(null);
  const isLocked = Boolean(data?.locked);

  useEffect(() => {
    if (!showMenu) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showMenu]);

  // ── Chrome parity with other elements: important / deadline / comments ──
  const [isImportant, setIsImportant] = useState(data?.isImportant || false);
  const [deadline, setDeadline] = useState(data?.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [savingChrome, setSavingChrome] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Sync externally-loaded node data (refresh / collaborator edits)
  useEffect(() => {
    setIsImportant(data?.isImportant || false);
    setDeadline(data?.deadline || null);
  }, [data?.isImportant, data?.deadline]);

  // Tick the deadline countdown once per second while a deadline exists
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);

  const nodeComments = data?.comments || [];
  const unresolvedCommentCount = nodeComments.filter(c => !c.resolved).length;

  const toggleImportant = async () => {
    const next = !isImportant;
    setIsImportant(next);
    try {
      await persistIsImportant(id, next, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist isImportant:', err);
    }
  };

  const saveDeadline = async () => {
    setShowDeadlineInput(false);
    if (!workspaceId) return;
    setSavingChrome(true);
    try {
      await persistDeadline(id, deadline, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist deadline:', err);
    } finally {
      setSavingChrome(false);
    }
  };

  const handleAddComment = async (nodeId, comment) => {
    const updated = [...nodeComments, comment];
    try {
      await persistNodeDataPatch(nodeId, { comments: updated }, setNodes, workspaceId);
      if (comment.mentionedUserIds?.length) {
        await fetch('/api/workspace/comments/mention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            nodeId,
            elementName: data?.name || data?.type || 'form-card',
            commentText: comment.text,
            authorName: comment.authorName,
            mentionedUserIds: comment.mentionedUserIds
          })
        }).catch(err => console.error('Failed to send mention notifications:', err));
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleResolveComment = async (nodeId, commentId) => {
    const updated = nodeComments.map(c =>
      c.id === commentId ? { ...c, resolved: !c.resolved, resolvedAt: !c.resolved ? new Date().toISOString() : null } : c
    );
    try {
      await persistNodeDataPatch(nodeId, { comments: updated }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const handleDeleteComment = async (nodeId, commentId) => {
    const updated = nodeComments.filter(c => c.id !== commentId);
    try {
      await persistNodeDataPatch(nodeId, { comments: updated }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const getTimeLeft = () => {
    const left = calculateTimeLeft(deadline);
    if (!left) return null;
    return left.isExpired ? 'Deadline reached' : formatTimeLeft(left);
  };

  // Same 5-minute "recently updated" rule other elements use for the NEW badge
  const isRecentlyUpdated = () => {
    const timestamp = data?.lastUpdatedAt || data?.addedAt;
    if (!timestamp) return false;
    return (Date.now() - new Date(timestamp).getTime()) / 60000 < 5;
  };

  const isOverdue = Boolean(deadline) && Boolean(calculateTimeLeft(deadline)?.isExpired);

  // ── Menu actions — same CustomEvent contract ElementNode uses ──
  const handleDuplicate = () => {
    setShowMenu(false);
    window.dispatchEvent(new CustomEvent('element-duplicate', { detail: { nodeId: id, nodeData: data } }));
  };

  const handleDuplicateToAllSubtasks = () => {
    setShowMenu(false);
    window.dispatchEvent(new CustomEvent('element-duplicate-to-all-subtasks', { detail: { nodeId: id, nodeData: data } }));
  };

  // Vendors request deletion (PM reviews); PMs delete directly — mirrors ElementNode.
  const handleDelete = async () => {
    setShowMenu(false);
    if (viewerRole === 'vendor') {
      if (data?.deletionRequested) return;
      if (!window.confirm('Request deletion of this element? A PM will review it.')) return;
      const patch = {
        deletionRequested: true,
        deletionRequestedAt: new Date().toISOString(),
        deletionRequestedBy: viewerIdentity?.name || viewerIdentity?.email || currentUser?.name || currentUser?.email || 'Unknown User',
        deletionReason: 'Requested via element menu'
      };
      try {
        await persistNodeDataPatch(id, patch, setNodes, workspaceId, { bypassApprovalFlow: true });
        setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
        window.dispatchEvent(new CustomEvent('element-deletion-requested', { detail: { nodeId: id } }));
        // Fire-and-forget — notifyWorkspaceEvent logs its own failures
        notifyWorkspaceEvent({
          workspaceId,
          roles: ['pm'],
          excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
          type: 'deletion_request',
          title: 'Deletion requested',
          message: `${patch.deletionRequestedBy} requested deletion of "${data?.name || 'Form Card'}"`,
          data: { nodeId: id, elementName: data?.name, elementType: data?.type },
          priority: 'high',
          actionRequired: true
        });
      } catch (err) {
        console.error('Failed to submit deletion request:', err);
      }
      return;
    }
    if (viewerRole === 'pm') {
      const msg = data?.deletionRequested
        ? 'Approve deletion of this element?'
        : 'Are you sure you want to delete this element?';
      if (window.confirm(msg)) {
        document.dispatchEvent(new CustomEvent('deleteElement', { detail: { elementId: id } }));
      }
    }
  };

  // Form structure (what the builder edits)
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: data?.title || 'Form Card',
    fields: data?.fields || DEFAULT_FIELDS,
    submitButton: data?.submitButton || 'Submit',
    status: data?.status || 'draft'
  });

  // Responses (what a filler enters)
  const [responses, setResponses] = useState(data?.formResponses || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmitted = Boolean(data?.submittedAt) && !isEditing;

  // Keep local state in sync when node data loads/changes externally
  useEffect(() => {
    setFormData({
      title: data?.title || 'Form Card',
      fields: data?.fields || DEFAULT_FIELDS,
      submitButton: data?.submitButton || 'Submit',
      status: data?.status || 'draft'
    });
    setResponses(data?.formResponses || {});
  }, [data?.title, data?.fields, data?.submitButton, data?.status, data?.formResponses]);

  const persistPatch = async (updates) => {
    if (!id || !workspaceId) {
      console.warn('⚠️ FormCardNode: cannot persist without node id / workspaceId');
      return;
    }
    try {
      await persistNodeDataPatch(id, updates, setNodes, workspaceId);
    } catch (err) {
      console.error('❌ FormCardNode persist failed:', err);
    }
  };

  // ── Access control: who should answer / who can see the submission ──
  const [showFieldAccess, setShowFieldAccess] = useState(false);
  const [fieldAnswers, setFieldAnswers] = useState(data?.fieldAnswers || []);

  useEffect(() => {
    setFieldAnswers(data?.fieldAnswers || []);
  }, [data?.fieldAnswers]);

  const fieldAccess = data?.fieldAccess || null;
  const viewerIdentity = buildViewerIdentity(
    currentUser,
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const viewerRole = resolveViewerRole(
    currentUser,
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const st = getFieldAccessState({
    fieldAccess,
    fieldAnswers,
    viewer: viewerIdentity,
    isPM: viewerRole === 'pm'
  });
  const canFill = st.canAnswer && !isLocked;
  // Only the element's creator or a PM may configure who answers / who sees
  const canConfigureAccess = canConfigureFieldAccess({
    data,
    viewer: viewerIdentity,
    isPM: viewerRole === 'pm'
  });

  const accessCollaborators = (data?.workspaceCollaborators || []).filter(
    (c, i, arr) => arr.findIndex(x => (x.vendorId || x.userId || x.email) === (c.vendorId || c.userId || c.email)) === i
  );

  const relatedElementOptions = () => {
    try {
      return (getNodes?.() || [])
        .filter(n => n.id !== id && (n.data?.name || n.data?.title))
        .map(n => ({ id: n.id, name: n.data.name || n.data.title }));
    } catch {
      return [];
    }
  };

  const persistFieldAccess = async (next) => {
    const payload = next
      ? {
          ...next,
          createdBy: next.createdBy || {
            name: viewerIdentity.name,
            email: viewerIdentity.email,
            role: viewerIdentity.role
          }
        }
      : null;
    setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, fieldAccess: payload } } : n)));
    await persistPatch({ fieldAccess: payload });
  };

  // ── Builder mode (edit the form's fields) ─────────────────────
  const handleSaveStructure = () => {
    persistPatch({ ...formData, lastModifiedAt: new Date().toISOString() });
    data?.onUpdate?.(formData);
    setIsEditing(false);
  };

  const handleAddField = () => {
    const newField = {
      id: `field${Date.now()}`,
      label: `Field ${formData.fields.length + 1}`,
      type: 'text',
      required: false
    };
    setFormData({ ...formData, fields: [...formData.fields, newField] });
  };

  const handleRemoveField = (fieldId) => {
    setFormData({ ...formData, fields: formData.fields.filter(f => f.id !== fieldId) });
  };

  const handleFieldChange = (fieldId, key, value) => {
    setFormData({
      ...formData,
      fields: formData.fields.map(f =>
        f.id === fieldId ? { ...f, [key]: value } : f
      )
    });
  };

  // ── Fill mode (a user fills the form) ─────────────────────────
  const handleResponseChange = (fieldId, value) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const missingRequired = formData.fields.filter(
    f => f.required && !responses[f.id]?.toString().trim()
  );

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isSubmitting || missingRequired.length > 0) return;

    setIsSubmitting(true);
    try {
      // Attribute the submission when an assignment exists (same rule as the fields)
      const patch = {
        formResponses: responses,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString()
      };
      if (fieldAccess) {
        const next = appendAnswer({
          fieldAnswers,
          viewer: viewerIdentity,
          value: `${responseCount} of ${formData.fields.length} fields`,
          mode: 'single'
        });
        setFieldAnswers(next);
        patch.fieldAnswers = next;
      }
      await persistPatch(patch);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetResponses = () => {
    setResponses({});
    persistPatch({ formResponses: {}, status: 'draft', submittedAt: null, lastModifiedAt: new Date().toISOString() });
  };

  const FIELD_ICONS = { text: Type, number: Hash, email: Mail, tel: Phone, date: Calendar, textarea: AlignLeft };

  const renderInputFor = (field) => {
    const Icon = FIELD_ICONS[field.type] || Type;
    const filled = Boolean(responses[field.id]?.toString().trim());
    const inputId = `fc-${id}-${field.id}`;
    const common = {
      id: inputId,
      value: st.restricted ? '' : (responses[field.id] || ''),
      onChange: (e) => canFill && handleResponseChange(field.id, e.target.value),
      onClick: (e) => e.stopPropagation(),
      onKeyDown: (e) => e.stopPropagation(),
      readOnly: !canFill,
      disabled: !canFill,
      className: `w-full bg-transparent text-sm mt-0.5 focus:outline-none placeholder:text-dim/60 ${
        !canFill ? 'text-dim cursor-not-allowed' : 'text-ink'
      }`,
      placeholder: st.restricted ? 'Answer restricted'
        : !canFill && st.assigned ? `Waiting for ${st.waitingFor}`
        : `Enter ${field.label.toLowerCase()}`
    };
    // Composite field card: the label lives inside the bordered surface and the
    // input itself is borderless — the card is the affordance, not the input.
    return (
      <div
        className={`rounded-xl border px-3 pt-1.5 pb-2 transition-all duration-150 ${
          !canFill
            ? 'border-line bg-canvas/60'
            : `bg-surface shadow-sm hover:border-info/50 focus-within:border-info focus-within:ring-2 focus-within:ring-info/15 ${
                filled ? 'border-success/30' : 'border-line'
              }`
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={inputId}
            className="text-[10px] font-semibold uppercase tracking-wider text-dim flex items-center gap-1.5 min-w-0"
          >
            <Icon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{field.label}</span>
            {field.required && <span className="text-danger">*</span>}
          </label>
          {filled && canFill && <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />}
        </div>
        {field.type === 'textarea'
          ? <textarea {...common} rows={3} className={`${common.className} resize-none`} />
          : <input type={field.type} {...common} />}
      </div>
    );
  };

  const handleStyle = 'w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta';
  const handleSides = [
    ['top', Position.Top, { left: '50%' }],
    ['right', Position.Right, { top: '50%' }],
    ['bottom', Position.Bottom, { left: '50%' }],
    ['left', Position.Left, { top: '50%' }]
  ];

  const responseCount = Object.values(responses).filter(v => v?.toString().trim()).length;

  return (
    <div
      className={`${isImportant ? 'bg-warning/10' : 'bg-surface'} border-2 rounded-xl shadow-xl relative group transition-all p-6 w-full h-full min-w-[320px] flex flex-col ${
        isImportant ? 'border-warning ring-2 ring-warning/20'
          : selected ? 'border-info'
          : 'border-line hover:border-info/40'
      } ${isOverdue ? 'ring-2 ring-danger ring-offset-1' : !isImportant && isRecentlyUpdated() ? 'ring-2 ring-warning/30 ring-offset-1' : ''}`}
      onMouseEnter={() => setIsNodeHovered(true)}
      onMouseLeave={() => { setIsNodeHovered(false); setShowMenu(false); setShowInfo(false); }}
    >
      <NodeResizer
        isVisible={selected || isNodeHovered}
        minWidth={280}
        minHeight={220}
        lineClassName="!border-info"
        handleClassName="!w-3 !h-3 !bg-info !border-2 !border-white !rounded-md"
      />

      {handleSides.map(([side, pos, style]) => (
        <React.Fragment key={side}>
          <Handle type="source" position={pos} id={`${side}-out`} style={style} className={handleStyle} isConnectable={isConnectable} />
          <Handle type="target" position={pos} id={`${side}-in`} style={style} className={handleStyle} isConnectable={isConnectable} />
        </React.Fragment>
      ))}

      {/* Info & status cluster — top-right corner, same as other elements */}
      <div className="absolute -top-3 -right-3 z-20 flex items-center space-x-1">
        {isRecentlyUpdated() && (
          <div className="w-8 h-8 bg-warning text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white font-bold text-lg animate-pulse" title="Recently updated" role="status" aria-label="Recently updated">
            ✨
          </div>
        )}
        {isLocked && (
          <div className="w-5 h-5 bg-warning text-white rounded-full flex items-center justify-center border-2 border-white" title="Element is locked">
            <Lock className="w-3 h-3" />
          </div>
        )}
        <div
          className="relative"
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }}
            className="w-5 h-5 bg-info text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 border-2 border-white"
            title="Element Info"
          >
            <Info className="w-3 h-3" />
          </button>
          {showInfo && (
            <div className="absolute right-7 -top-1 z-50 w-64 bg-surface rounded-lg shadow-xl border border-line p-3 text-left">
              <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-line">
                <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center">
                  <Info className="w-4 h-4 text-info" />
                </div>
                <h4 className="text-sm font-semibold text-ink">Element Details</h4>
              </div>
              <p className="text-xs text-dim uppercase tracking-wide">Element Type</p>
              <p className="text-sm font-medium text-ink mb-2 flex items-center">
                <span className="w-2 h-2 bg-info rounded-full mr-2" />
                {data?.name || 'Form Card'}
              </p>
              <p className="text-xs text-dim uppercase tracking-wide">Added By</p>
              <p className="text-sm font-medium text-ink mb-2 flex items-center">
                <span className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center mr-2 text-xs font-bold text-success">
                  {(data?.addedBy || 'U').charAt(0).toUpperCase()}
                </span>
                {data?.addedBy || 'Unknown User'}
              </p>
              {data?.addedAt && (
                <>
                  <p className="text-xs text-dim uppercase tracking-wide">Added On</p>
                  <p className="text-sm font-medium text-ink mb-2">📅 {new Date(data.addedAt).toLocaleString()}</p>
                </>
              )}
              <p className="text-xs text-dim pt-2 border-t border-line">ID: <span className="font-mono">{id?.slice(0, 20)}…</span></p>
            </div>
          )}
        </div>
      </div>

      {/* ── Header — centered, same layout as every other element ── */}
      <div className="mb-4 text-center relative">
        <div className="flex items-center justify-center flex-wrap gap-y-1 space-x-2">
          <h4 className="text-lg font-semibold text-ink">{data?.name || 'Form Card'}</h4>

          {isRecentlyUpdated() && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning border border-warning/30 whitespace-nowrap">
              ✨ NEW
            </span>
          )}

          {/* Three-dot menu — same items as other elements */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(m => !m); }}
              className="p-1 text-dim hover:text-ink hover:bg-surface-hover rounded transition-all duration-200"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-line rounded-lg shadow-lg z-50 text-left">
                <button
                  onClick={handleDuplicate}
                  className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 rounded-t-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-dim" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={handleDuplicateToAllSubtasks}
                  className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
                >
                  <Copy className="w-4 h-4 text-dim" />
                  <span>Duplicate to all subtasks</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); if (!isLocked) setIsEditing(true); }}
                  className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-dim" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowComments(true); }}
                  className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-dim" />
                  <span>Comments</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center space-x-2 rounded-b-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                  <span>{data?.deletionRequested && viewerRole === 'pm' ? 'Approve Deletion' : 'Delete'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Comments — count badge mirrors other elements */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowComments(v => !v); }}
            className={`relative p-1 rounded transition-all duration-200 ${
              showComments ? 'text-info bg-info/10' : 'text-dim hover:text-info hover:bg-info/10'
            }`}
            title={`Comments${unresolvedCommentCount > 0 ? ` (${unresolvedCommentCount})` : ''}`}
          >
            <MessageCircle className="w-4 h-4" />
            {unresolvedCommentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-info text-white rounded-full text-[8px] font-bold flex items-center justify-center border border-white">
                {unresolvedCommentCount}
              </span>
            )}
          </button>

          {/* Mark as Important */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleImportant(); }}
            className={`ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 ${
              isImportant ? 'bg-warning text-white border-warning' : 'bg-surface text-warning border-warning hover:bg-warning/10'
            }`}
            title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
          >
            {isImportant ? '★ Important' : '☆ Mark Important'}
          </button>

          {/* Deadline */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowDeadlineInput(v => !v); }}
            className="ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 bg-surface text-info border-info hover:bg-info/10"
            title="Set Deadline"
          >
            {deadline ? 'Edit Deadline' : 'Set Deadline'}
          </button>
        </div>

        <p className="text-sm text-dim mt-2">
          <span className="font-medium text-ink">{formData.title}</span>
          {' '}· {formData.fields.length} field{formData.fields.length === 1 ? '' : 's'}
        </p>

        {/* Deadline input UI — centered, same as other elements */}
        {showDeadlineInput && (
          <div className="mt-2 flex flex-col items-center">
            <input
              type="datetime-local"
              className="border border-line rounded px-2 py-1 text-xs bg-surface"
              onChange={(e) => setDeadline(e.target.value)}
              value={deadline ? new Date(deadline).toISOString().slice(0, 16) : ''}
              min={new Date().toISOString().slice(0, 16)}
              disabled={savingChrome}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="mt-1 px-2 py-1 text-xs bg-info text-white rounded disabled:opacity-50"
              onClick={(e) => { e.stopPropagation(); saveDeadline(); }}
              disabled={savingChrome}
            >
              {savingChrome ? 'Saving…' : 'Done'}
            </button>
          </div>
        )}

        {/* Timer display */}
        {deadline && (
          <div className={`mt-2 text-xs font-semibold ${isOverdue ? 'text-danger' : 'text-info'}`}>
            {isOverdue ? '⚠ Overdue — deadline reached' : `⏰ Time left: ${getTimeLeft()}`}
          </div>
        )}

        {/* Pending deletion notice (vendor requested, awaiting PM) */}
        {data?.deletionRequested && !data?.deletionApprovedAt && (
          <div className="mt-2 text-xs font-semibold text-warning">
            🗑 Deletion requested — waiting for PM approval
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

      {isEditing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wide mb-1">Form Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-info/40 focus:border-info"
              placeholder="Form title"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wide mb-1">Submit Button Text</label>
            <input
              type="text"
              value={formData.submitButton}
              onChange={(e) => setFormData({ ...formData, submitButton: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-info/40 focus:border-info"
              placeholder="Submit"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wide">Form Fields</label>
              <span className="text-[10px] text-dim">{formData.fields.length} total</span>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
              {formData.fields.map((field) => (
                <div key={field.id} className="flex items-center gap-1.5 p-1.5 bg-canvas border border-line rounded-lg hover:border-info/30 transition-colors">
                  <GripVertical className="w-3.5 h-3.5 text-dim/40 flex-shrink-0" />
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                    className="flex-1 px-2 py-1 border border-line rounded-md text-xs min-w-0 bg-surface focus:outline-none focus:ring-1 focus:ring-info/40 focus:border-info"
                    placeholder="Field label"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                    className="px-1.5 py-1 border border-line rounded-md text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-info/40"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="date">Date</option>
                    <option value="textarea">Textarea</option>
                  </select>
                  <label className="flex items-center gap-1 text-[10px] text-dim whitespace-nowrap px-1" title="Required">
                    <input
                      type="checkbox"
                      checked={field.required || false}
                      onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)}
                      className="w-3.5 h-3.5 accent-info"
                    />
                    Req
                  </label>
                  <button
                    onClick={() => handleRemoveField(field.id)}
                    className="p-1 text-dim hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                    title="Remove field"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddField}
              className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-info/40 text-info rounded-lg text-xs font-medium hover:bg-info/5 hover:border-info/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveStructure}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cta text-cta-foreground rounded-lg text-sm font-semibold shadow-md shadow-cta/25 hover:shadow-lg hover:shadow-cta/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 border border-line rounded-lg text-sm font-medium text-dim hover:text-ink hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* ── Who should answer: status banner + assignment trigger ── */}
          <div className="space-y-1.5">
            {st.assigned && !st.answered && (
              <div className="flex items-center gap-2 rounded-lg border border-info/20 bg-info/5 px-3 py-2">
                <UserCheck className="w-3.5 h-3.5 text-info flex-shrink-0" />
                <p className="text-[11px] text-dim">
                  Waiting for <span className="font-semibold text-ink">{st.waitingFor}</span> to answer
                </p>
              </div>
            )}

            {st.answered && (
              st.restricted ? (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-hover px-3 py-2 w-fit">
                  <Lock className="w-3.5 h-3.5 text-dim" />
                  <span className="text-[11px] text-dim font-medium">Answer restricted</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/5 px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                  <p className="text-[11px] flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-success">
                      {formatAnswerValue(st.lastAnswer?.value)}
                    </span>
                    <span className="text-dim">
                      by {st.lastAnswer?.by}
                      {st.lastAnswer?.at ? ` · ${new Date(st.lastAnswer.at).toLocaleDateString()}` : ''}
                    </span>
                  </p>
                </div>
              )
            )}

            {st.assigned && !st.restricted && fieldAccess?.reason && (
              <p className="text-[11px] text-dim italic px-1">“{fieldAccess.reason}”</p>
            )}

            {st.assigned && !st.restricted && fieldAccess?.relatedNodeId && (
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('zoomToElement', { detail: { elementId: fieldAccess.relatedNodeId } }))}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-info/10 text-info text-[10px] font-medium hover:bg-info/20 transition-colors"
                title="Jump to the related element"
              >
                <Link2 className="w-2.5 h-2.5" /> Related element
              </button>
            )}

            {!showFieldAccess && canConfigureAccess && (
              <button
                onClick={() => setShowFieldAccess(true)}
                className="text-[11px] text-info hover:text-info/80 font-medium flex items-center gap-1 transition-colors"
              >
                <UserCheck className="w-3 h-3" />
                {st.assigned ? 'Change who answers' : 'Assign to someone'}
              </button>
            )}
          </div>

          {/* Fill progress */}
          {formData.fields.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isSubmitted ? 'bg-success' : 'bg-info'}`}
                  style={{ width: `${Math.round(responseCount / formData.fields.length * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-dim whitespace-nowrap">
                {responseCount}/{formData.fields.length}
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            {formData.fields.map((field) => (
              <React.Fragment key={field.id}>{renderInputFor(field)}</React.Fragment>
            ))}
          </div>

          {missingRequired.length > 0 && Object.keys(responses).length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-danger/25 bg-danger/5 px-3 py-1.5">
              <span className="text-[11px] text-danger">
                Required: {missingRequired.map(f => f.label).join(', ')}
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canFill || isSubmitting || missingRequired.length > 0}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
              !canFill || isSubmitting || missingRequired.length > 0
                ? 'bg-surface-hover text-dim cursor-not-allowed border border-line'
                : 'bg-cta text-cta-foreground shadow-md shadow-cta/25 hover:shadow-lg hover:shadow-cta/30 hover:-translate-y-px active:translate-y-0'
            }`}
          >
            {isSubmitting ? (
              'Saving…'
            ) : st.assigned && st.answered ? (
              <><CheckCircle2 className="w-4 h-4" /> Submitted</>
            ) : st.assigned && !canFill ? (
              `Waiting for ${st.waitingFor}`
            ) : (
              <><Send className="w-3.5 h-3.5" /> {formData.submitButton}</>
            )}
          </button>

          {isSubmitted && (
            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-success/25 bg-success/5 px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span className="text-[11px] font-medium text-success">
                Submitted {new Date(data.submittedAt).toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-0.5">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-line rounded-lg text-xs font-medium text-dim hover:text-ink hover:border-ink/30 hover:bg-surface-hover transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Form
            </button>
            {Object.keys(responses).length > 0 && (
              <button
                onClick={handleResetResponses}
                title="Clear responses"
                className="px-3 py-2 border border-line rounded-lg text-dim hover:text-danger hover:border-danger/40 hover:bg-danger/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      </div>
      {/* ── end Body ── */}

      {/* ── Footer — status pill + authorship, same as other elements ── */}
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
            isSubmitted
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-surface-hover text-ink border-line'
          }`}>
            {isSubmitted ? '✔ Submitted' : '📝 Draft'}
          </span>
          <span className="text-[10px] text-dim truncate">
            {formData.fields.filter(f => f.required).length} required · {responseCount} filled
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
          data?.addedByRole === 'pm' ? 'bg-surface-hover text-ink' : 'bg-info/10 text-info'
        }`}>
          Added by {data?.addedByRole === 'pm' ? 'PM' : 'Vendor'}
        </span>
      </div>

      {/* Sequence Number Badge — top-left corner, same as other elements */}
      {data?.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}

      {/* Element Type Label — revealed on hover */}
      {data?.type && (
        <div className="absolute -top-2 left-5 px-2 py-1 bg-info text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
          {data.type.toUpperCase()}
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-info text-white rounded-full flex items-center justify-center text-xs font-bold">
          E
        </div>
      )}

      {/* Comment count badge — bottom-left corner, same as other elements */}
      {unresolvedCommentCount > 0 && !showComments && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          className="absolute -bottom-2 -left-2 z-20 flex items-center space-x-0.5 px-1.5 py-0.5 bg-info text-white rounded-full text-[10px] font-bold border-2 border-white hover:bg-info transition-colors cursor-pointer"
          title={`${unresolvedCommentCount} unresolved comment${unresolvedCommentCount !== 1 ? 's' : ''}`}
        >
          <MessageCircle className="w-3 h-3" />
          <span>{unresolvedCommentCount}</span>
        </button>
      )}

      {/* Who-should-answer popover (outside the scrolling body so it doesn't clip) */}
      {showFieldAccess && canConfigureAccess && (
        <FieldAccessPanel
          access={fieldAccess}
          collaborators={accessCollaborators}
          elements={relatedElementOptions()}
          sourceNodeId={id}
          sourceLabel={formData.title}
          allowPoll={false}
          onSave={async (next) => {
            await persistFieldAccess(next);
            setShowFieldAccess(false);
          }}
          onClear={async () => {
            await persistFieldAccess(null);
            setShowFieldAccess(false);
          }}
          onClose={() => setShowFieldAccess(false)}
        />
      )}

      {/* Comment thread popover */}
      {showComments && (
        <div
          className="absolute top-0 -right-[320px] z-50"
          style={{ width: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <CommentThread
            nodeId={id}
            comments={nodeComments}
            collaborators={data?.workspaceCollaborators || []}
            onAddComment={handleAddComment}
            onResolve={handleResolveComment}
            onDeleteComment={handleDeleteComment}
            isLocked={false}
            onClose={() => setShowComments(false)}
          />
        </div>
      )}
    </div>
  );
};

export default FormCardNode;
