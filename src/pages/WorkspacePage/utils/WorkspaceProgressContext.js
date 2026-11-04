import { createContext, useContext } from 'react';

/**
 * The workspace's tasks and the canvas that is open, for blocks linked to the tasks.
 * `tasks` come from the workspace; `live` ({ subtaskId, nodes }) is the open canvas.
 */
export const WorkspaceProgressContext = createContext({ tasks: [], live: null });

/**
 * Canvases opened earlier in this visit, newest state. Ticking a checklist on one canvas must show
 * on a progress block on another one at once, but the tasks held by the page are only reloaded now
 * and then, so what each canvas last held is remembered here and used until the tasks reload.
 */
const remembered = new Map();

export const rememberCanvas = (subtaskId, nodes) => {
  if (subtaskId && Array.isArray(nodes)) remembered.set(subtaskId, nodes);
};

/** The tasks were reloaded from the server: its copies are the newest again (keep the open canvas's own). */
export const forgetCanvases = (exceptSubtaskId) => {
  for (const id of [...remembered.keys()]) if (id !== exceptSubtaskId) remembered.delete(id);
};

export const rememberedCanvases = () => remembered;

export const useWorkspaceProgress = () => useContext(WorkspaceProgressContext);
