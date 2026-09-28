import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { X, Calendar, FileText, PlusCircle, Image as ImageIcon } from 'lucide-react';
import config from '../../../../config/env';
import ElementNode from '../nodes/ElementNode';
import LayoutNode from '../nodes/LayoutNode';
import TextNode from '../nodes/TextNode';
import TurnkeyNode from '../nodes/TurnkeyNode';
import SmartNoteNode from '../nodes/SmartNoteNode';
import CalendarNode from '../nodes/CalendarNode';
import ApprovalBoardNode from '../nodes/ApprovalBoardNode';
import AIHelperNode from '../nodes/AIHelperNode';
import CreditNoteNode from '../nodes/CreditNoteNode';
import InvoiceNode from '../nodes/InvoiceNode';
import QuotationNode from '../nodes/QuotationNode';
import PurchaseOrderNode from '../nodes/PurchaseOrderNode';
import InfoCardNode from '../nodes/InfoCardNode';
import FormCardNode from '../nodes/FormCardNode';
import CustomEdge from '../edges/CustomEdge';

// Render the day's canvas with the workspace's REAL node components
const snapshotNodeTypes = {
  elementNode: ElementNode,
  layoutNode: LayoutNode,
  textNode: TextNode,
  turnkeyNode: TurnkeyNode,
  smartNote: SmartNoteNode,
  calendarNode: CalendarNode,
  approvalBoard: ApprovalBoardNode,
  aiHelper: AIHelperNode,
  creditNote: CreditNoteNode,
  invoice: InvoiceNode,
  quotation: QuotationNode,
  purchaseOrder: PurchaseOrderNode,
  infoCard: InfoCardNode,
  formCard: FormCardNode,
};
const snapshotEdgeTypes = { custom: CustomEdge };

// Local (browser-timezone) YYYY-MM-DD for a timestamp — matches the date
// the user picks in the date input.
const localDay = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Every canvas node across the workspace (root canvas + each subtask canvas),
// each tagged with the canvas it belongs to.
const collectAllNodes = (workspace) => {
  const out = [];
  const pushNodes = (nodes, ctx) => (Array.isArray(nodes) ? nodes : []).forEach((n) => n && out.push({ ...n, _ctx: ctx }));
  pushNodes(workspace?.nodes, { label: 'Main canvas' });
  (workspace?.tasks || []).forEach((task) =>
    (task?.subtasks || []).forEach((sub) =>
      pushNodes(sub?.canvasData?.nodes, { label: `${task.name || 'Task'} / ${sub.name || 'Subtask'}` })
    )
  );
  return out;
};

const collectAllEdges = (workspace, nodeIds) => {
  const edges = [];
  const pushEdges = (list) => (Array.isArray(list) ? list : []).forEach((e) => {
    if (e && nodeIds.has(e.source) && nodeIds.has(e.target)) edges.push(e);
  });
  pushEdges(workspace?.edges);
  (workspace?.tasks || []).forEach((task) =>
    (task?.subtasks || []).forEach((sub) => pushEdges(sub?.canvasData?.edges))
  );
  return edges;
};



const todayStr = () => new Date().toISOString().slice(0, 10);

// Resolve the day a submission's work belongs to — progressDate is the
// vendor-chosen work date; older records fall back to the submit day.
const dayOf = (s) => s.progressDate || (s.submittedAt ? s.submittedAt.slice(0, 10) : '');

const STATUS_BADGE = {
  client_approved: 'bg-success/10 text-success',
  client_approval_pending: 'bg-warning/10 text-warning',
  pm_approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  pm_rejected: 'bg-danger/10 text-danger',
  client_rejected: 'bg-danger/10 text-danger',
};

const STATUS_LABEL = {
  client_approved: 'Approved',
  client_approval_pending: 'Awaiting Client',
  pm_approved: 'PM Approved',
  rejected: 'PM Rejected',
  pm_rejected: 'PM Rejected',
  client_rejected: 'Client Rejected',
  pending: 'Pending Review',
};

const formatDay = (dateStr) => {
  if (!dateStr) return 'Unknown date';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });
};

const ProgressTimelineModal = ({ isOpen, onClose, workspace = {}, workspaceId }) => {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [createActivities, setCreateActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const wsId = workspaceId || workspace?.workspaceId || workspace?.id;
  const submissions = useMemo(() => workspace?.progress_submissions || [], [workspace]);

  // Element-add events — fetched once per open, grouped client-side by local day
  useEffect(() => {
    if (!isOpen || !wsId) return;
    let cancelled = false;
    setActivitiesLoading(true);
    fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/${wsId}/activities?actionType=create&limit=500`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled) setCreateActivities(Array.isArray(data.activities) ? data.activities : (data.data || []));
      })
      .catch(() => {
        if (!cancelled) setCreateActivities([]);
      })
      .finally(() => {
        if (!cancelled) setActivitiesLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, wsId]);

  const dayActivities = useMemo(
    () => createActivities
      .filter((a) => localDay(a.timestamp || a.createdAt) === selectedDate)
      .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)),
    [createActivities, selectedDate]
  );

  // Elements whose data.addedAt falls on the selected day — used for the
  // "day snapshot" mini-canvas AND as a fallback for the added list when the
  // activity log is empty.
  const dayNodes = useMemo(
    () => collectAllNodes(workspace).filter((n) => localDay(n?.data?.addedAt) === selectedDate),
    [workspace, selectedDate]
  );

  // Pass the real node objects through so each element renders exactly as it
  // does on the workspace canvas (same node type, same data, same size).
  const dayCanvasNodes = useMemo(() => dayNodes.map((n) => ({
    ...n,
    type: n.type && snapshotNodeTypes[n.type] ? n.type : 'elementNode',
    draggable: false,
    selectable: false,
    connectable: false,
  })), [dayNodes]);

  const dayCanvasEdges = useMemo(() => {
    const ids = new Set(dayNodes.map((n) => n.id));
    return collectAllEdges(workspace, ids).map((e) => ({ ...e, selectable: false }));
  }, [workspace, dayNodes]);

  // Days that actually have progress — for quick navigation chips
  const activeDays = useMemo(
    () => [...new Set(submissions.map(dayOf).filter(Boolean))].sort().reverse(),
    [submissions]
  );

  const dayItems = useMemo(
    () => submissions
      .filter((s) => dayOf(s) === selectedDate)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
    [submissions, selectedDate]
  );

  // Look up task/subtask display names
  const taskName = (taskId) => workspace?.tasks?.find((t) => t.id === taskId)?.name || '';
  const subtaskName = (taskId, subtaskId) =>
    workspace?.tasks?.find((t) => t.id === taskId)?.subtasks?.find((s) => s.id === subtaskId)?.name || '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-info" />
            <h2 className="text-xl font-semibold text-ink">Progress Timeline</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>

        <div className="p-6">
          {/* Date picker */}
          <div className="mb-5">
            <label htmlFor="timeline-date" className="block text-sm font-medium text-ink mb-2">
              Pick a date
            </label>
            <input
              type="date"
              id="timeline-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-info text-sm"
            />
          </div>

          {/* Quick-jump chips for days that have progress */}
          {activeDays.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {activeDays.slice(0, 14).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    d === selectedDate
                      ? 'bg-info text-white border-info'
                      : 'border-line text-dim hover:bg-canvas'
                  }`}
                >
                  {new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </button>
              ))}
            </div>
          )}

          {/* Day's submissions */}
          {dayItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-line rounded-lg">
              <p className="text-dim">No progress submitted on {formatDay(selectedDate)}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dayItems.map((s) => (
                <div key={s.id} className="border border-line rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[s.reviewStatus] || 'bg-info/10 text-info'}`}>
                      {STATUS_LABEL[s.reviewStatus] || 'Pending Review'}
                    </span>
                  </div>

                  {(taskName(s.taskId) || subtaskName(s.taskId, s.subtaskId)) && (
                    <p className="text-xs text-info mb-2">
                      {taskName(s.taskId)}{subtaskName(s.taskId, s.subtaskId) ? ` / ${subtaskName(s.taskId, s.subtaskId)}` : ''}
                    </p>
                  )}

                  <p className="text-sm text-ink mb-2">{s.description}</p>

                  {(s.workDone || s.workPending) && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-canvas rounded text-sm mb-2">
                      {s.workDone && (
                        <div>
                          <span className="text-xs font-medium text-ink block mb-1">Done</span>
                          <p className="text-ink">{s.workDone}</p>
                        </div>
                      )}
                      {s.workPending && (
                        <div>
                          <span className="text-xs font-medium text-ink block mb-1">Pending</span>
                          <p className="text-ink">{s.workPending}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-dim border-t border-line pt-2">
                    <span>
                      by {s.vendorId || 'vendor'}
                      {s.submittedAt && ` · submitted ${new Date(s.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                    {s.proofOfCompletion && (
                      <a
                        href={s.proofOfCompletion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-info hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Proof
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Elements added on this day */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2 mb-3">
              <PlusCircle className="w-4 h-4 text-info" />
              Elements added on {formatDay(selectedDate)}
            </h3>
            {activitiesLoading ? (
              <p className="text-xs text-dim">Loading activity…</p>
            ) : dayActivities.length === 0 && dayNodes.length === 0 ? (
              <p className="text-xs text-dim">No elements added this day.</p>
            ) : (
              <div className="border border-line rounded-lg divide-y divide-line">
                {(dayActivities.length > 0 ? dayActivities : dayNodes.map((n) => ({
                  activityId: n.id,
                  userName: n.data?.addedBy || n.data?.addedByName || 'Unknown',
                  timestamp: n.data?.addedAt,
                  elementType: n.data?.type || n.type,
                  details: { elementName: n.data?.name || n.data?.elementName || n.data?.type },
                  _ctxLabel: n._ctx?.label,
                }))).map((a, i) => (
                  <div key={a.activityId || a.id || i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-ink font-medium truncate">
                        {a.details?.elementName || a.details?.name || a.elementType || a.targetId || 'Element'}
                      </p>
                      <p className="text-xs text-dim truncate">
                        {a.elementType && a.details?.elementName ? `${a.elementType}` : ''}
                        {a._ctxLabel
                          ? ` · ${a._ctxLabel}`
                          : (a.subtaskId ? (subtaskName(a.taskId, a.subtaskId) ? ` · ${subtaskName(a.taskId, a.subtaskId)}` : '') : ' · main canvas')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-xs font-medium text-ink">{a.userName || 'Unknown'}</p>
                      <p className="text-xs text-dim">
                        {a.timestamp || a.createdAt
                          ? new Date(a.timestamp || a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Day snapshot — only the elements added on this date */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-info" />
              Workspace snapshot — {formatDay(selectedDate)}
            </h3>
            {dayCanvasNodes.length === 0 ? (
              <p className="text-xs text-dim">No elements on the canvas carry this date — nothing to snapshot.</p>
            ) : (
              <div className="border border-line rounded-lg overflow-hidden" style={{ height: 320 }}>
                <ReactFlow
                  nodes={dayCanvasNodes}
                  edges={dayCanvasEdges}
                  nodeTypes={snapshotNodeTypes}
                  edgeTypes={snapshotEdgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  panOnDrag
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={16} color="#e2e8f0" />
                </ReactFlow>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTimelineModal;
