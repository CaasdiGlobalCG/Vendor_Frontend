/**
 * Progress read from the work itself.
 *
 * A status badge or progress bar can be "linked" to the workspace's tasks. The
 * numbers then come from the checklists on the task cards inside each step
 * (ticked items out of all items), so nothing has to be typed in by hand.
 *
 * `live` describes what is fresher than the copy stored with each task:
 *   - `subtaskId` / `nodes`: the canvas that is open right now
 *   - `others`: a Map of subtaskId -> nodes for canvases opened earlier in this visit
 *     (ticks made there have not been reloaded into the workspace yet)
 * For a step the order is: the open canvas, then a canvas opened earlier, then the stored copy.
 */

/** Ticked and total items of one task card (a card with no checklist counts as one item: done when "completed"). */
export const cardProgress = (node) => {
  const card = node?.data?.taskCardData;
  if (!card) return null;
  const items = Array.isArray(card.checklists) ? card.checklists : [];
  if (items.length > 0) return { done: items.filter((c) => c?.completed).length, total: items.length };
  return { done: card.status === 'completed' ? 1 : 0, total: 1 };
};

const nodesOf = (subtask, live) => {
  if (live && subtask?.id === live.subtaskId) return live.nodes || [];
  const earlier = live?.others?.get?.(subtask?.id);
  return earlier || subtask?.canvasData?.nodes || [];
};

/** Checklist progress across every task card in a task's steps. */
export const taskStats = (task, live) => {
  let done = 0;
  let total = 0;
  const subtasks = task?.subtasks || [];
  for (const subtask of subtasks) {
    for (const node of nodesOf(subtask, live)) {
      const p = cardProgress(node);
      if (p) {
        done += p.done;
        total += p.total;
      }
    }
  }
  return { done, total, steps: subtasks.length };
};

/** The same across the whole workspace. */
export const projectStats = (tasks = [], live) =>
  tasks.reduce(
    (sum, task) => {
      const s = taskStats(task, live);
      return { done: sum.done + s.done, total: sum.total + s.total, steps: sum.steps + s.steps };
    },
    { done: 0, total: 0, steps: 0 }
  );

/** Which task a link points at: by id, else by name (names are how templates refer to their own phases). */
export const findLinkedTask = (tasks = [], link) => {
  if (!link) return null;
  if (link.taskId) {
    const byId = tasks.find((t) => t.id === link.taskId);
    if (byId) return byId;
  }
  if (link.taskName) {
    const wanted = String(link.taskName).trim().toLowerCase();
    return tasks.find((t) => String(t.name || '').trim().toLowerCase() === wanted) || null;
  }
  return null;
};

/**
 * What a block linked to the tasks should show.
 * @returns {null | { missing: true } | { label, done, total, percent, hasData, dueDate }}
 *   null = not linked; missing = linked to a task that is not there (fall back to the typed-in value).
 */
export const resolveLink = (link, tasks, live) => {
  if (!link || !link.scope) return null;
  let stats;
  let label;
  let taskId = null;
  let dueDate = null;
  if (link.scope === 'workspace') {
    stats = projectStats(tasks, live);
    label = 'the whole project';
    dueDate = tasks.map((t) => t.dueDate).filter(Boolean).sort().pop() || null;
  } else {
    const task = findLinkedTask(tasks, link);
    if (!task) return { missing: true };
    stats = taskStats(task, live);
    label = task.name;
    taskId = task.id;
    dueDate = task.dueDate || null;
  }
  const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  return { label, scope: link.scope, taskId, taskName: link.taskName || null, done: stats.done, total: stats.total, percent, hasData: stats.total > 0, dueDate };
};

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Status badge id for linked progress: pending / in-progress / done, or delayed when past the due date and not finished. */
export const statusFromProgress = ({ done, total, dueDate }, today = new Date()) => {
  if (total === 0) return null;
  if (done >= total) return 'done';
  if (dueDate && dueDate < dateKey(today)) return 'delayed';
  return done > 0 ? 'in-progress' : 'pending';
};

/**
 * Which task to open when a linked block is clicked.
 * `null` for "the whole project" (the caller opens the Tasks list) or when the task is gone.
 */
export const taskToOpen = (tasks = [], detail = {}) => {
  if (detail.scope === 'workspace') return null;
  return findLinkedTask(tasks, { taskId: detail.taskId, taskName: detail.taskName });
};
