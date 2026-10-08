import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { persistIsImportant, persistDeadline, persistNodeDataPatch, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { notifyWorkspaceEvent } from '../../utils/workspaceApi';
import { VendorContext } from '../../../../context/VendorContext';
import { Handle, Position, useReactFlow } from 'reactflow';
import { CheckCircle, Clock, AlertCircle, XCircle, X, Plus, User, Check, ChevronRight, FileText } from 'lucide-react';

// Real workspace approval lifecycle — same statuses ElementNode stamps:
//   sent_to_pm → pm_approved → client_approved   (rejected at any stage)
// Manual items use the semantic equivalents: submitted → pm_approved → …
const COLUMNS = [
  { id: 'submitted', title: 'Submitted', Icon: Clock, color: 'text-info', accept: ['submitted', 'sent_to_pm'] },
  { id: 'pm_approved', title: 'PM Approved', Icon: AlertCircle, color: 'text-warning', accept: ['pm_approved'] },
  { id: 'client_approved', title: 'Client Approved', Icon: CheckCircle, color: 'text-success', accept: ['client_approved'] },
  { id: 'rejected', title: 'Rejected', Icon: XCircle, color: 'text-danger', accept: ['rejected'] },
];

const columnFor = (status) =>
  COLUMNS.find((c) => c.accept.includes(status)) || COLUMNS[0];

// Next stage when an item is approved at its current status
const nextStatus = (status) =>
  status === 'submitted' || status === 'sent_to_pm'
    ? 'pm_approved'
    : status === 'pm_approved'
      ? 'client_approved'
      : null;

const ApprovalBoardNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;
  const { setNodes, getNodes } = useReactFlow();
  const { currentUser } = useContext(VendorContext) || {};
  // Client/PM sessions may not populate VendorContext — fall back to the
  // workspace URL params (?userId= &userType=client).
  const urlParams = new URLSearchParams(window.location.search);
  // Clients arrive with ?clientId=&userRole=client; PMs may use ?userId= or ?pmId=
  const urlUserId =
    urlParams.get('userId') || urlParams.get('clientId') || urlParams.get('pmId');
  const urlUserType = urlParams.get('userType') || urlParams.get('userRole');
  const myUserId =
    currentUser?.id || currentUser?.userId || currentUser?.pmId ||
    currentUser?.vendorId || currentUser?.email || urlUserId || null;
  const myName = currentUser?.name || currentUser?.email || 'You';
  const myRole = currentUser?.role || currentUser?.userType || urlUserType || 'vendor';
  const myIds = [
    currentUser?.id, currentUser?.userId, currentUser?.pmId,
    currentUser?.vendorId, currentUser?.clientId, currentUser?.email, urlUserId,
  ].filter(Boolean);

  // Who may decide at each stage — PM-side roles approve submitted items,
  // only the client can give final sign-off. Vendors never approve.
  const PM_ROLES = ['pm', 'cas', 'admin', 'project_manager', 'projectmanager'];
  const isPMSide = PM_ROLES.includes(String(myRole).toLowerCase());
  const isClient = String(myRole).toLowerCase() === 'client';
  const canDecide = (status) =>
    status === 'submitted' || status === 'sent_to_pm'
      ? isPMSide
      : status === 'pm_approved'
        ? isClient
        : false;
  const canResubmit = (item) =>
    item.status === 'rejected' &&
    (myIds.includes(item.submittedById) || (!isClient && !isPMSide));

  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', dueDate: '' });
  const [moveMenuFor, setMoveMenuFor] = useState(null); // manual item id
  const [detailItem, setDetailItem] = useState(null); // { ...item, source, columnId }
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const manualItems = data.approvalItems || [];

  // Live canvas elements with a real approvalStatus — read-only dashboard rows
  const elementItems = useMemo(() => {
    try {
      return (getNodes() || [])
        .filter((n) => {
          const s = n.data?.approvalStatus;
          return s && s !== 'pending' && n.id !== id;
        })
        .map((n) => ({
          id: `el-${n.id}`,
          nodeId: n.id,
          source: 'element',
          title:
            n.data?.label || n.data?.name || n.data?.title || n.data?.type || 'Element',
          status: n.data.approvalStatus,
          assignedTo: n.data.submittedBy || n.data.approvedBy || '—',
          description: n.data.rejectionReason || n.data.preview || '',
          submittedDate: n.data.submittedAt || n.data.updatedAt || '',
          rejectReason: n.data.rejectionReason,
        }));
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getNodes, id, data]);

  const allItems = [...manualItems.map((i) => ({ ...i, source: 'manual' })), ...elementItems];

  const itemsInColumn = (col) =>
    allItems.filter((i) => columnFor(i.status).id === col.id);

  // Update time left display every second
  useEffect(() => {
    if (!deadline) return;
    const updateTimer = () => setTimeLeft(getTimeLeft(deadline));
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  useEffect(() => {
    if (deadlineJustSetRef.current) return;
    if (data.deadline && data.deadline !== deadline) setDeadline(data.deadline);
    if (data.isImportant !== undefined && data.isImportant !== isImportant)
      setIsImportant(data.isImportant);
  }, [data.deadline, data.isImportant]);

  const persistIsImportantLocal = async (important) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await persistIsImportant(id, important, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist isImportant:', err);
    } finally {
      setSaving(false);
    }
  };

  const persistDeadlineLocal = async (newDeadline) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      deadlineJustSetRef.current = true;
      await persistDeadline(id, newDeadline, setNodes, workspaceId);
      setDeadline(newDeadline instanceof Date ? newDeadline.toISOString() : newDeadline);
      setTimeout(() => { deadlineJustSetRef.current = false; }, 2000);
    } catch (err) {
      console.error('Failed to persist deadline:', err);
    } finally {
      setSaving(false);
    }
  };

  const persistItems = (items) =>
    persistNodeDataPatch(id, { approvalItems: items }, setNodes, workspaceId);

  // ---- Add a manual approval request ----
  const handleAddItem = () => {
    if (!newItem.title.trim()) return;
    const item = {
      id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newItem.title.trim(),
      description: newItem.description.trim(),
      status: 'submitted',
      submittedBy: myName,
      submittedById: myUserId,
      submittedAt: new Date().toISOString(),
      dueDate: newItem.dueDate || '',
      history: [
        { status: 'submitted', by: myName, role: myRole, at: new Date().toISOString() },
      ],
    };
    persistItems([...manualItems, item]);

    // Notify approvers — first stage is the PM
    notifyWorkspaceEvent({
      workspaceId,
      roles: ['pm'],
      excludeUserId: myUserId,
      type: 'approval_request',
      title: `Approval requested: ${item.title}`,
      message: `${myName} submitted "${item.title}" for approval on the ${data.label || 'Approval Board'}.`,
      data: { boardNodeId: id, itemId: item.id },
      priority: 'high',
    }).catch(() => {});

    setNewItem({ title: '', description: '', dueDate: '' });
    setShowAddModal(false);
  };

  const handleDeleteItem = (itemId) => {
    if (!window.confirm('Delete this approval request?')) return;
    persistItems(manualItems.filter((i) => i.id !== itemId));
    if (detailItem?.id === itemId) setDetailItem(null);
  };

  // Move a manual item to another stage (or re-submit a rejected one)
  const moveManualItem = (itemId, toStatus, reason) => {
    const next = manualItems.map((i) =>
      i.id === itemId
        ? {
            ...i,
            status: toStatus,
            rejectReason: reason || undefined,
            history: [
              ...(i.history || []),
              { status: toStatus, by: myName, role: myRole, at: new Date().toISOString(), reason: reason || undefined },
            ],
          }
        : i
    );
    persistItems(next);
    setMoveMenuFor(null);

    const item = manualItems.find((i) => i.id === itemId);
    if (!item) return;
    const nextCol = columnFor(toStatus);
    notifyWorkspaceEvent({
      workspaceId,
      roles:
        toStatus === 'pm_approved'
          ? ['client']
          : toStatus === 'rejected'
            ? ['vendor', 'pm', 'client']
            : ['pm'],
      excludeUserId: myUserId,
      type: 'approval_status',
      title: `"${item.title}" → ${nextCol.title}`,
      message: reason
        ? `${myName} ${toStatus === 'rejected' ? 'rejected' : 'updated'} "${item.title}": ${reason}`
        : `${myName} moved "${item.title}" to ${nextCol.title}.`,
      data: { boardNodeId: id, itemId },
      priority: toStatus === 'rejected' ? 'high' : 'medium',
    }).catch(() => {});
  };

  // Approve / reject — manual items patch the board node, element items patch
  // their source node's approvalStatus (same field the real flow uses).
  const decide = (item, approve, reason) => {
    const to = approve ? nextStatus(item.status) : 'rejected';
    if (!to) return;

    const patch =
      to === 'rejected'
        ? { approvalStatus: 'rejected', rejectionReason: reason || '', rejectedBy: myName, rejectedAt: new Date().toISOString() }
        : { approvalStatus: to, [`${to === 'pm_approved' ? 'pmApprovedBy' : 'clientApprovedBy'}`]: myName };

    if (item.source === 'element') {
      persistNodeDataPatch(item.nodeId, patch, setNodes, workspaceId);
    } else {
      moveManualItem(item.id, to, reason);
      return; // moveManualItem already notified
    }

    // Element item — notify the submitter side
    notifyWorkspaceEvent({
      workspaceId,
      roles: to === 'pm_approved' ? ['client'] : ['vendor', 'pm'],
      excludeUserId: myUserId,
      type: 'approval_status',
      title: `"${item.title}" ${approve ? 'approved' : 'rejected'}`,
      message: reason
        ? `${myName} rejected "${item.title}": ${reason}`
        : `${myName} approved "${item.title}"${to === 'pm_approved' ? ' — now pending client sign-off' : ''}.`,
      data: { elementNodeId: item.nodeId, boardNodeId: id },
      priority: approve ? 'medium' : 'high',
    }).catch(() => {});
  };

  const getStatusBadge = (status) => {
    const col = columnFor(status);
    const I = col.Icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${col.color}`}>
        <I className="w-3 h-3" />
        {col.title}
      </span>
    );
  };

  const isOverdue = (d) => d && new Date(d) < new Date(new Date().toDateString());

  return (
    <div className="w-[1150px] max-w-[92vw] relative">
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white">
          {data.sequenceNumber}
        </div>
      )}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="bg-surface rounded-lg border border-line overflow-hidden">
      {/* Header */}
      <div className="bg-info text-white p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Approval Board</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              setIsImportant(!isImportant);
              await persistIsImportantLocal(!isImportant);
            }}
            className={`px-2 py-1 rounded text-sm ${isImportant ? 'bg-warning text-white' : 'bg-surface text-info hover:bg-info/10'}`}
            title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
          >
            {isImportant ? '★' : '☆'}
          </button>
          <button
            onClick={() => setShowDeadlineInput(!showDeadlineInput)}
            className="p-2 rounded bg-surface text-info hover:bg-info/10"
            title="Set Deadline"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1 bg-surface text-info text-sm rounded hover:bg-info/10 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Request Approval</span>
          </button>
        </div>
      </div>

      {/* Deadline Input */}
      {showDeadlineInput && (
        <div className="px-3 py-2 bg-info/10 border-b border-info/10 flex gap-1">
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 text-xs flex-1"
            value={deadline ? new Date(deadline).toISOString().slice(0, 16) : ''}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={saving}
          />
          <button
            className="px-2 py-1 text-xs bg-info text-white rounded"
            onClick={async () => {
              setShowDeadlineInput(false);
              await persistDeadlineLocal(deadline);
            }}
            disabled={saving}
          >
            {saving ? '...' : '✓'}
          </button>
        </div>
      )}

      {/* Deadline Display */}
      {deadline && timeLeft && !timeLeft.isExpired && (
        <div className="px-3 py-1 bg-info/10 border-b border-info/10 text-xs text-info">
          ⏱ {formatTimeLeft(timeLeft)}
        </div>
      )}

      {/* Board */}
      <div className="grid grid-cols-4 gap-4 p-4">
        {COLUMNS.map((column) => {
          const items = itemsInColumn(column);
          return (
            <div key={column.id} className="min-w-0">
              <div className="bg-canvas rounded-lg p-3 h-full min-h-[160px]">
                <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-line">
                  <column.Icon className={`w-4 h-4 ${column.color}`} />
                  <span className="font-medium text-sm truncate">{column.title}</span>
                  <span className="ml-auto bg-surface text-dim text-[10px] px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-surface p-3 rounded border transition-shadow cursor-pointer relative group"
                      onClick={() => { setDetailItem(item); setShowRejectInput(false); setRejectReason(''); }}
                    >
                      {/* Quick actions */}
                      <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.source === 'manual' && item.status !== 'client_approved' && (
                          (canDecide(item.status) || canResubmit(item)) && (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMoveMenuFor(moveMenuFor === item.id ? null : item.id);
                                }}
                                className="p-1 text-dim hover:text-info rounded-full hover:bg-info/10"
                                title="Move to stage"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              {moveMenuFor === item.id && (
                                <div className="absolute right-0 mt-1 w-44 bg-surface rounded-md shadow-lg z-10 border">
                                  {COLUMNS.filter((c) => {
                                    if (c.id === columnFor(item.status).id) return false;
                                    if (canResubmit(item) && c.id === 'submitted') return true;
                                    return canDecide(item.status);
                                  }).map((c) => (
                                    <button
                                      key={c.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveManualItem(item.id, c.id);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-info/10 flex items-center justify-between"
                                    >
                                      {c.title}
                                      <c.Icon className={`w-3 h-3 ${c.color}`} />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        )}
                        {item.source === 'manual' && (myIds.includes(item.submittedById) || isPMSide) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                            }}
                            className="p-1 text-dim hover:text-danger rounded-full hover:bg-danger/10"
                            title="Delete request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <h4 className="font-medium text-sm leading-snug pr-6 break-words">
                        {item.title}
                      </h4>

                      {item.description && (
                        <p className="mt-1 text-[11px] text-dim line-clamp-2 break-words">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-line/60 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1 min-w-0 text-dim">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate" title={item.submittedBy || item.assignedTo}>
                              {item.submittedBy || item.assignedTo || '—'}
                            </span>
                          </div>
                          {item.dueDate && (
                            <span
                              className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                                isOverdue(item.dueDate) && item.status !== 'client_approved'
                                  ? 'bg-danger/10 text-danger font-medium'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {new Date(item.dueDate).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-dim">
                          {item.source === 'element' ? (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Canvas element
                            </span>
                          ) : (
                            item.submittedAt && (
                              <span>Submitted {new Date(item.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center text-dim text-[11px] py-6 border border-dashed border-line rounded">
                      No items
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />

      {/* Add Request Modal — portal escapes the node's transform/overflow */}
      {showAddModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Request Approval</h3>
              <button onClick={() => setShowAddModal(false)} className="text-dim hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Title *</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g. Final floor plan, Invoice INV-004"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="What should the approver check?"
                  rows={3}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Due Date</label>
                <input
                  type="date"
                  value={newItem.dueDate}
                  onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
                />
              </div>
              <p className="text-[11px] text-dim">
                Approval flow: Submitted → PM Approved → Client Approved. The PM is
                notified when you submit.
              </p>
            </div>
            <div className="p-4 bg-canvas flex justify-end space-x-2 rounded-b-lg">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-dim hover:bg-surface-hover rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-info text-white text-sm rounded hover:bg-info disabled:opacity-50"
                disabled={!newItem.title.trim()}
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Item Detail Modal — portal escapes the node's transform/overflow */}
      {detailItem && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-medium">{detailItem.title}</h3>
                <div className="mt-1">{getStatusBadge(detailItem.status)}</div>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-dim hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              {detailItem.description && (
                <p className="text-ink">{detailItem.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-dim">
                <span>Submitted by: <span className="text-ink">{detailItem.submittedBy || detailItem.assignedTo || '—'}</span></span>
                {detailItem.submittedDate && (
                  <span>On: <span className="text-ink">{new Date(detailItem.submittedDate).toLocaleDateString()}</span></span>
                )}
                {detailItem.dueDate && (
                  <span>Due: <span className={isOverdue(detailItem.dueDate) ? 'text-danger font-medium' : 'text-ink'}>{new Date(detailItem.dueDate).toLocaleDateString()}</span></span>
                )}
              </div>
              {detailItem.rejectReason && (
                <p className="text-xs text-danger bg-danger/10 rounded px-2 py-1.5">
                  Rejected: {detailItem.rejectReason}
                </p>
              )}

              {/* History trail */}
              {(detailItem.history || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-dim uppercase tracking-wide mb-1.5">History</p>
                  <div className="space-y-1.5">
                    {detailItem.history.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${columnFor(h.status).color.replace('text-', 'bg-')}`} />
                        <div>
                          <span className="text-ink">{h.by}</span>
                          <span className="text-dim"> → {columnFor(h.status).title}</span>
                          <span className="text-dim"> · {new Date(h.at).toLocaleString()}</span>
                          {h.reason && <p className="text-danger text-[10px] mt-0.5">{h.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decision actions — only the stage's approver role sees them */}
            {nextStatus(detailItem.status) && canDecide(detailItem.status) && (
              <div className="p-4 bg-canvas border-t space-y-2 rounded-b-lg">
                {showRejectInput ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (required)"
                      rows={2}
                      className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-danger/20 focus:border-danger/30 outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                        className="px-3 py-1.5 text-xs text-dim hover:bg-surface-hover rounded"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => { decide(detailItem, false, rejectReason.trim()); setDetailItem(null); }}
                        disabled={!rejectReason.trim()}
                        className="px-3 py-1.5 text-xs bg-danger text-white rounded hover:opacity-90 disabled:opacity-40"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="px-4 py-2 text-sm border border-danger text-danger rounded hover:bg-danger/10"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => { decide(detailItem, true); setDetailItem(null); }}
                      className="px-4 py-2 text-sm bg-success text-white rounded hover:opacity-90 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      {detailItem.status === 'submitted' || detailItem.status === 'sent_to_pm'
                        ? 'Approve (PM)'
                        : 'Approve (Client)'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ApprovalBoardNode;
