import { useRef, useState, useCallback } from 'react';

/**
 * useTableHistory — undo/redo stacks for the full-view editor draft.
 *
 * The caller keeps draft state in useState and reports a snapshot BEFORE each
 * mutation via push(); undo(current)/redo(current) return the snapshot to
 * restore (or null). Capped at 50 steps so long sessions don't grow memory.
 */
const MAX = 50;

const useTableHistory = () => {
  const stacks = useRef({ past: [], future: [] });
  const [, bump] = useState(0); // rerender so canUndo/canRedo stay fresh

  const push = useCallback((snapshot) => {
    stacks.current.past.push(snapshot);
    if (stacks.current.past.length > MAX) stacks.current.past.shift();
    stacks.current.future = [];
    bump(v => v + 1);
  }, []);

  const undo = useCallback((current) => {
    const prev = stacks.current.past.pop();
    if (!prev) return null;
    stacks.current.future.push(current);
    bump(v => v + 1);
    return prev;
  }, []);

  const redo = useCallback((current) => {
    const next = stacks.current.future.pop();
    if (!next) return null;
    stacks.current.past.push(current);
    bump(v => v + 1);
    return next;
  }, []);

  const canUndo = stacks.current.past.length > 0;
  const canRedo = stacks.current.future.length > 0;

  return { push, undo, redo, canUndo, canRedo };
};

export default useTableHistory;
