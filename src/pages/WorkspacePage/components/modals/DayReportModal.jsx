import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { X, Download, FileText, Layers, FileCheck, Users, Trash2, CheckCircle, Clock } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
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

const snapshotNodeTypes = {
  elementNode: ElementNode, layoutNode: LayoutNode, textNode: TextNode,
  turnkeyNode: TurnkeyNode, smartNote: SmartNoteNode, calendarNode: CalendarNode,
  approvalBoard: ApprovalBoardNode, aiHelper: AIHelperNode, creditNote: CreditNoteNode,
  invoice: InvoiceNode, quotation: QuotationNode, purchaseOrder: PurchaseOrderNode,
  infoCard: InfoCardNode, formCard: FormCardNode,
};
const snapshotEdgeTypes = { custom: CustomEdge };

const localDay = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
});
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_LABEL = {
  client_approved: 'Client Approved', client_approval_pending: 'Awaiting Client',
  pm_approved: 'PM Approved', pending: 'Pending Review',
  rejected: 'PM Rejected', pm_rejected: 'PM Rejected', client_rejected: 'Client Rejected',
};

const ACTION_LABEL = (a) =>
  a.action === 'element_added' ? 'added an element'
  : a.action === 'element_removed' ? 'removed an element'
  : a.actionType === 'update' ? 'edited an element'
  : a.actionType === 'move' ? 'moved an element'
  : a.action?.replace(/_/g, ' ') || a.actionType || 'changed something';

const DayReportModal = ({ isOpen, onClose, workspace = {}, workspaceId, date, dayLabel, generatedBy }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef(null);

  const wsId = workspaceId || workspace?.workspaceId || workspace?.id;
  const isOverall = !date; // date === null → whole-workspace report

  // Full activity feed — selected day, or the whole workspace for overall
  useEffect(() => {
    if (!isOpen || !wsId) return;
    let cancelled = false;
    setLoading(true);
    const range = date ? `?startDate=${date}&endDate=${date}&` : '?';
    fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/${wsId}/activities${range}limit=500`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => { if (!cancelled) setActivities(Array.isArray(d.activities) ? d.activities : []); })
      .catch(() => { if (!cancelled) setActivities([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, wsId, date]);

  const report = useMemo(() => {
    const onDay = (ts) => !date || localDay(ts) === date;
    const tasks = workspace?.tasks || [];

    // Elements added on this day — or every element for the overall report
    const elements = [];
    (workspace?.nodes || []).forEach((n) => {
      if (onDay(n?.data?.addedAt))
        elements.push({ name: n.data?.name || n.data?.type || 'Element', type: n.data?.type || n.type, where: 'Main canvas', by: n.data?.addedBy, at: n.data?.addedAt });
    });
    tasks.forEach((t) => (t?.subtasks || []).forEach((s) =>
      (s?.canvasData?.nodes || []).forEach((n) => {
        if (onDay(n?.data?.addedAt))
          elements.push({ name: n.data?.name || n.data?.type || 'Element', type: n.data?.type || n.type, where: `${t.name} / ${s.name}`, by: n.data?.addedBy, at: n.data?.addedAt });
      })
    ));
    elements.sort((a, b) => new Date(a.at) - new Date(b.at));

    // Progress submissions for the day (or all of them)
    const allSubmissions = workspace?.progress_submissions || [];
    const submissions = allSubmissions
      .filter((s) => !date || (s.progressDate || localDay(s.submittedAt)) === date)
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    const taskName = (id) => tasks.find((t) => t.id === id)?.name || '';
    const subtaskName = (tid, sid) => tasks.find((t) => t.id === tid)?.subtasks?.find((s) => s.id === sid)?.name || '';

    // Reviews acted on this day — or every reviewed submission for overall
    const reviewed = allSubmissions.filter((s) =>
      date
        ? [s.pmApprovedAt, s.clientApprovedAt, s.reviewedAt].some((t) => t && localDay(t) === date)
        : s.reviewStatus && s.reviewStatus !== 'pending'
    );

    // Per-day breakdown (overall report only)
    const byDay = new Map();
    const bumpDay = (day, key) => {
      if (!day) return;
      if (!byDay.has(day)) byDay.set(day, { elements: 0, submissions: 0, actions: 0 });
      byDay.get(day)[key] += 1;
    };
    elements.forEach((e) => bumpDay(localDay(e.at), 'elements'));
    submissions.forEach((s) => bumpDay(s.progressDate || localDay(s.submittedAt), 'submissions'));
    activities.forEach((a) => bumpDay(localDay(a.timestamp || a.createdAt), 'actions'));
    const daysBreakdown = [...byDay.keys()].sort().map((d, i) => ({ date: d, label: `Day-${i + 1}`, ...byDay.get(d) }));

    // Contributors: activity counts + submissions + elements per person
    const people = new Map();
    const bump = (name, key) => {
      const k = name || 'Unknown';
      if (!people.has(k)) people.set(k, { name: k, activities: 0, elements: 0, updates: 0 });
      people.get(k)[key] += 1;
    };
    activities.forEach((a) => bump(a.userName, 'activities'));
    elements.forEach((e) => bump(e.by, 'elements'));
    submissions.forEach((s) => bump(s.vendorId, 'updates'));
    const contributors = [...people.values()].sort((a, b) => (b.activities + b.elements + b.updates) - (a.activities + a.elements + a.updates));

    const deletions = activities.filter((a) => a.actionType === 'delete' || a.action === 'element_removed');
    const timeline = activities.slice().sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));

    const times = timeline.map((a) => new Date(a.timestamp || a.createdAt).getTime()).filter(Boolean);
    const span = times.length ? { first: Math.min(...times), last: Math.max(...times) } : null;

    return { elements, submissions, reviewed, contributors, deletions, timeline, span, taskName, subtaskName, daysBreakdown };
  }, [workspace, date, activities]);

  // Day snapshot: the real canvas nodes added on this date, rendered with the
  // workspace's own node components (same look as the live canvas).
  const snapshotNodes = useMemo(() => {
    const found = [];
    (workspace?.nodes || []).forEach((n) => { if (!date || localDay(n?.data?.addedAt) === date) found.push(n); });
    (workspace?.tasks || []).forEach((t) => (t?.subtasks || []).forEach((s) =>
      (s?.canvasData?.nodes || []).forEach((n) => { if (!date || localDay(n?.data?.addedAt) === date) found.push(n); })
    ));
    const ids = new Set(found.map((n) => n.id));
    const edges = [];
    const pushEdges = (list) => (Array.isArray(list) ? list : []).forEach((e) => {
      if (e && ids.has(e.source) && ids.has(e.target)) edges.push({ ...e, selectable: false });
    });
    pushEdges(workspace?.edges);
    (workspace?.tasks || []).forEach((t) => (t?.subtasks || []).forEach((s) => pushEdges(s?.canvasData?.edges)));
    return {
      nodes: found.map((n) => ({
        ...n,
        type: n.type && snapshotNodeTypes[n.type] ? n.type : 'elementNode',
        draggable: false, selectable: false, connectable: false,
      })),
      edges,
    };
  }, [workspace, date]);

  const downloadPdf = async () => {
    if (!reportRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
      });
      const pageW = 794;  // A4 @96dpi
      const pageH = 1123;
      const scale = pageW / img.width;
      const pageImgH = Math.floor(pageH / scale); // source px per page
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [pageW, pageH] });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      for (let y = 0; y < img.height; y += pageImgH) {
        const h = Math.min(pageImgH, img.height - y);
        canvas.width = img.width;
        canvas.height = h;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
        if (y > 0) pdf.addPage([pageW, pageH], 'portrait');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, h * scale);
      }
      pdf.save(date ? `progress-report-${date}.pdf` : 'progress-report-overall.pdf');
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <FileText className="w-5 h-5 text-info" /> {isOverall ? 'Overall Progress Report' : 'Daily Progress Report'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadPdf}
              disabled={downloading || loading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-info rounded-lg hover:bg-info/90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <X className="w-5 h-5 text-dim" />
            </button>
          </div>
        </div>

        {/* Report body (this node is what gets exported to PDF) */}
        <div className="overflow-y-auto">
          <div ref={reportRef} className="bg-white p-8" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div className="border-b-2 border-slate-200 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-info uppercase tracking-wide">{dayLabel || (isOverall ? 'Overall Report' : 'Progress Report')}</p>
                  <h1 className="text-2xl font-bold text-slate-900 mt-1">{workspace?.title || 'Workspace'}</h1>
                  <p className="text-sm text-slate-500 mt-1">{isOverall ? 'All days combined' : fmtDay(date)}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Generated {new Date().toLocaleString('en-IN')}</p>
                  {generatedBy && <p>by {generatedBy}</p>}
                  {report?.span && (
                    <p className="mt-1">Activity {fmtTime(report.span.first)} – {fmtTime(report.span.last)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics strip */}
            <div className="grid grid-cols-5 gap-3 mb-8">
              {[
                { icon: Layers, label: 'Elements added', value: report?.elements.length ?? 0, cls: 'text-info bg-info/10' },
                { icon: FileCheck, label: 'Progress updates', value: report?.submissions.length ?? 0, cls: 'text-success bg-success/10' },
                { icon: CheckCircle, label: 'Reviews done', value: report?.reviewed.length ?? 0, cls: 'text-warning bg-warning/10' },
                { icon: Trash2, label: 'Deletions', value: report?.deletions.length ?? 0, cls: 'text-danger bg-danger/10' },
                { icon: Users, label: 'Contributors', value: report?.contributors.length ?? 0, cls: 'text-ink bg-surface-hover' },
              ].map((m) => (
                <div key={m.label} className="border border-slate-200 rounded-lg p-3 text-center">
                  <m.icon className={`w-4 h-4 mx-auto mb-1.5 p-0 ${m.cls.split(' ')[0]}`} />
                  <p className="text-xl font-bold text-slate-900">{m.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Per-day breakdown — overall report only */}
            {isOverall && report?.daysBreakdown?.length > 0 && (
              <section className="mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                  Day-by-Day Breakdown
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-1.5 pr-3 font-medium">Day</th>
                      <th className="py-1.5 pr-3 font-medium">Date</th>
                      <th className="py-1.5 pr-3 font-medium">Elements added</th>
                      <th className="py-1.5 pr-3 font-medium">Progress updates</th>
                      <th className="py-1.5 font-medium">Canvas actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daysBreakdown.map((d) => (
                      <tr key={d.date} className="border-b border-slate-100">
                        <td className="py-1.5 pr-3 text-slate-800 font-semibold">{d.label}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{fmtDay(d.date)}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{d.elements}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{d.submissions}</td>
                        <td className="py-1.5 text-slate-500">{d.actions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* 1. Progress submissions */}
            <section className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                Progress Submissions
              </h3>
              {report?.submissions.length ? report.submissions.map((s) => (
                <div key={s.id} className="border border-slate-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {STATUS_LABEL[s.reviewStatus] || s.reviewStatus || 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-info mb-2">
                    {[report.taskName(s.taskId), report.subtaskName(s.taskId, s.subtaskId)].filter(Boolean).join(' / ') || 'General'}
                    {' · '}by {s.vendorId} · {fmtTime(s.submittedAt)}
                  </p>
                  <p className="text-xs text-slate-600 mb-2">{s.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {s.workDone && <div><span className="font-semibold text-slate-700">Done:</span> <span className="text-slate-600">{s.workDone}</span></div>}
                    {s.workPending && <div><span className="font-semibold text-slate-700">Pending:</span> <span className="text-slate-600">{s.workPending}</span></div>}
                  </div>
                  {s.rejectionReason && (
                    <p className="text-xs text-danger mt-2">Rejection reason: {s.rejectionReason}</p>
                  )}
                  {s.proofOfCompletion && (
                    <a href={s.proofOfCompletion} target="_blank" rel="noopener noreferrer" className="text-xs text-info underline mt-1 inline-block">Proof of completion</a>
                  )}
                </div>
              )) : <p className="text-xs text-slate-400">No progress submissions on this day.</p>}
            </section>

            {/* 2. Elements added */}
            <section className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                Elements Added
              </h3>
              {report?.elements.length ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-1.5 pr-3 font-medium">Element</th>
                      <th className="py-1.5 pr-3 font-medium">Type</th>
                      <th className="py-1.5 pr-3 font-medium">Canvas</th>
                      <th className="py-1.5 pr-3 font-medium">Added by</th>
                      <th className="py-1.5 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.elements.map((e, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1.5 pr-3 text-slate-800 font-medium">{e.name}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{e.type}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{e.where}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{e.by || '—'}</td>
                        <td className="py-1.5 text-slate-500">{fmtTime(e.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-xs text-slate-400">No elements added on this day.</p>}
            </section>

            {/* 3. Canvas snapshot — only elements added this day, rendered
                   with the real workspace node components */}
            <section className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                Canvas Snapshot
              </h3>
              {snapshotNodes.nodes.length === 0 ? (
                <p className="text-xs text-slate-400">No elements on the canvas carry this date.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden" style={{ height: 320 }}>
                  <ReactFlow
                    nodes={snapshotNodes.nodes}
                    edges={snapshotNodes.edges}
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
            </section>

            {/* 4. Contributors */}
            <section className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                Contributors
              </h3>
              {report?.contributors.length ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-1.5 pr-3 font-medium">Person</th>
                      <th className="py-1.5 pr-3 font-medium">Actions</th>
                      <th className="py-1.5 pr-3 font-medium">Elements added</th>
                      <th className="py-1.5 font-medium">Progress updates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.contributors.map((c) => (
                      <tr key={c.name} className="border-b border-slate-100">
                        <td className="py-1.5 pr-3 text-slate-800 font-medium">{c.name}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{c.activities}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{c.elements}</td>
                        <td className="py-1.5 text-slate-500">{c.updates}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-xs text-slate-400">No contributors recorded.</p>}
            </section>

            {/* 5. Activity timeline */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-3">
                Activity Timeline
              </h3>
              {loading ? (
                <p className="text-xs text-slate-400">Loading activity…</p>
              ) : report?.timeline.length ? (
                <div className="space-y-1.5">
                  {report.timeline.map((a, i) => (
                    <div key={a.activityId || i} className="flex items-baseline gap-3 text-xs">
                      <span className="text-slate-400 w-14 flex-shrink-0 tabular-nums">{fmtTime(a.timestamp || a.createdAt)}</span>
                      <span className="font-medium text-slate-700">{a.userName || 'Unknown'}</span>
                      <span className="text-slate-500">
                        {ACTION_LABEL(a)}
                        {a.details?.elementName ? ` — ${a.details.elementName}` : a.elementType ? ` — ${a.elementType}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400">No canvas activity recorded.</p>}
            </section>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>Caasdi Global — Workspace progress report</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {isOverall ? 'All days' : fmtDay(date)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayReportModal;
