// ============================================================
// FILE: components/forms/TaskBoardRenderer.jsx
// PURPOSE: On-canvas Kanban board that groups every Task Card node on the
//          canvas by status. Cards can be dragged between columns — the move
//          writes back to the task node's taskCardData via the shared
//          persistNodeDataPatch path, so the change is durable and visible to
//          collaborators in real time.
// CONNECTS TO: reactflow (useNodes/useReactFlow), utils/nodePersistence.
// ============================================================

import React, { useMemo } from 'react';
import { useNodes, useReactFlow } from 'reactflow';
import { Calendar, CheckSquare, Crosshair, Flag, User } from 'lucide-react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';

const COLUMNS = [
  { id: 'todo', label: 'To-Do', accent: 'text-dim', dropClass: 'bg-surface-hover/60' },
  { id: 'in-progress', label: 'In-Progress', accent: 'text-info', dropClass: 'bg-info/5' },
  { id: 'blocked', label: 'Blocked', accent: 'text-danger', dropClass: 'bg-danger/5' },
  { id: 'completed', label: 'Completed', accent: 'text-success', dropClass: 'bg-success/5' },
];

const PRIORITY_BADGE = {
  critical: 'bg-danger/10 text-danger border-danger/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-info/10 text-info border-info/20',
};

const checklistPercent = (checklists = []) =>
  checklists.length
    ? Math.round((checklists.filter((i) => i.completed).length / checklists.length) * 100)
    : null;

const dueSortValue = (d) => {
  if (!d) return Number.MAX_SAFE_INTEGER;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
};

const TaskBoardRenderer = ({ data, nodeId, workspaceId }) => {
  const nodes = useNodes();
  const { setNodes, setCenter } = useReactFlow();
  const [dragOverCol, setDragOverCol] = React.useState(null);

  // Every node carrying taskCardData is a task card (both variants). The board
  // node itself carries no taskCardData, so it never lists itself.
  const tasks = useMemo(
    () =>
      nodes
        .filter((n) => n.data?.taskCardData && n.id !== nodeId)
        .sort((a, b) => dueSortValue(a.data.taskCardData.dueDate) - dueSortValue(b.data.taskCardData.dueDate)),
    [nodes, nodeId]
  );

  const byColumn = useMemo(() => {
    const grouped = {};
    for (const col of COLUMNS) grouped[col.id] = [];
    for (const node of tasks) {
      const status = COLUMNS.some((c) => c.id === node.data.taskCardData.status)
        ? node.data.taskCardData.status
        : 'todo';
      grouped[status].push(node);
    }
    return grouped;
  }, [tasks]);

  // Drag-and-drop a mini card between columns -> patch that task node's data
  const moveTask = async (taskNodeId, status) => {
    const node = nodes.find((n) => n.id === taskNodeId);
    const card = node?.data?.taskCardData;
    if (!card || card.status === status) return;

    const next = {
      ...card,
      status,
      activityLog: [
        {
          id: `board-move-${Date.now()}`,
          action: 'Status updated via task board',
          meta: { status },
          timestamp: new Date().toLocaleString()
        },
        ...(card.activityLog || [])
      ]
    };

    try {
      await persistNodeDataPatch(taskNodeId, { taskCardData: next }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to move task on board:', err);
    }
  };

  // Jump the canvas viewport to the task card node
  const focusNode = (node) => {
    const w = node.width || 360;
    const h = node.height || 200;
    setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.1, duration: 400 });
  };

  return (
    <div
      className="w-[780px] bg-surface border-2 border-line rounded-2xl shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-info/10">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-info" />
          <span className="font-semibold text-white text-base">Task Board</span>
        </div>
        <span className="text-xs text-white/70">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="p-6 text-center text-xs text-dim">
          No task cards on this canvas yet. Drop a Task Card element and it will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 p-3">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`rounded-xl border border-line bg-canvas min-h-[140px] p-2 space-y-2 transition-colors ${
                dragOverCol === col.id ? col.dropClass : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol((prev) => (prev === col.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                const taskNodeId = e.dataTransfer.getData('application/x-task-node-id');
                if (taskNodeId) moveTask(taskNodeId, col.id);
              }}
            >
              <div className={`flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wide ${col.accent}`}>
                <span>{col.label}</span>
                <span className="text-dim">{byColumn[col.id].length}</span>
              </div>

              {byColumn[col.id].map((node) => {
                const card = node.data.taskCardData;
                const pct = checklistPercent(card.checklists);
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-task-node-id', node.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="group bg-surface border border-line rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-info/40 transition-colors"
                    title="Drag to move between columns"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-ink leading-snug line-clamp-2 flex-1">
                        {card.title || 'Untitled Task'}
                      </p>
                      <button
                        type="button"
                        onClick={() => focusNode(node)}
                        className="opacity-0 group-hover:opacity-100 text-dim hover:text-ink transition-opacity flex-shrink-0"
                        title="Go to card"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-1.5 space-y-1 text-[10px] text-dim">
                      {card.assignedTo && (
                        <div className="flex items-center gap-1 truncate">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{card.assignedTo}</span>
                        </div>
                      )}
                      {card.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>{card.dueDate}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between">
                      {card.priority ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wide ${PRIORITY_BADGE[card.priority] || PRIORITY_BADGE.low}`}>
                          <Flag className="w-2.5 h-2.5" />
                          {card.priority}
                        </span>
                      ) : <span />}
                      {pct != null && (
                        <span className="text-[9px] font-medium text-dim">{pct}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskBoardRenderer;
