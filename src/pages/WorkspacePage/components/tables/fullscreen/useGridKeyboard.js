import { useEffect } from 'react';

/**
 * useGridKeyboard — Excel-style keyboard behaviour for the full-view grid.
 *
 *   Arrows        move the selection
 *   Enter         edit the active cell (or commit+move-down when handled by input)
 *   Tab           move right (Shift+Tab left)
 *   F2            edit active cell
 *   Delete/Back   clear selected cells
 *   printable     typing replaces the cell content and opens the editor
 *   Ctrl+C / X / V  copy / cut / paste TSV (Excel & Google Sheets compatible)
 *
 * The hook attaches to document because the full view is modal; it ignores
 * events aimed at other inputs/textareas so search boxes etc. keep working.
 */
const isEditableTarget = (e) => {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

const useGridKeyboard = ({
  locked, editing, sel,
  rowCount, colCount,
  setSel, startEdit, commitCell, cancelEdit,
  deleteSelection,
  onCopy, onCut, onPaste,     // clipboard handlers
  onUndo, onRedo,             // history handlers
  typeToEdit                // (r, c, firstChar) — start editing with seeded text
}) => {
  useEffect(() => {
    const onKey = (e) => {
      // While a cell editor input is open it handles its own keys.
      if (editing) return;
      // Never steal keys from other inputs (filter box, selects…)
      if (isEditableTarget(e)) return;

      const move = (dr, dc) => {
        if (!sel) { setSel({ r0: 0, c0: 0, r1: 0, c1: 0 }); return; }
        const next = {
          r0: Math.max(0, Math.min(sel.r0 + dr, rowCount - 1)),
          c0: Math.max(0, Math.min(sel.c0 + dc, colCount - 1)),
          r1: Math.max(0, Math.min(sel.r1 + dr, rowCount - 1)),
          c1: Math.max(0, Math.min(sel.c1 + dc, colCount - 1))
        };
        setSel(next);
      };

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'c' && !e.shiftKey) { onCopy?.(); return; }
        if (k === 'x' && !e.shiftKey) { onCut?.(); return; }
        if (k === 'v' && !e.shiftKey) { onPaste?.(); return; }
        if (k === 'z') { e.preventDefault(); e.shiftKey ? onRedo?.() : onUndo?.(); return; }
        if (k === 'y') { e.preventDefault(); onRedo?.(); return; }
      }

      switch (e.key) {
        case 'ArrowUp':    e.preventDefault(); move(-1, 0); break;
        case 'ArrowDown':  e.preventDefault(); move(1, 0); break;
        case 'ArrowLeft':  e.preventDefault(); move(0, -1); break;
        case 'ArrowRight': e.preventDefault(); move(0, 1); break;
        case 'Tab':
          e.preventDefault();
          if (sel) move(0, e.shiftKey ? -1 : 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (sel) startEdit(sel.r1, sel.c1); // active corner
          break;
        case 'F2':
          e.preventDefault();
          if (sel) startEdit(sel.r1, sel.c1);
          break;
        case 'Delete':
        case 'Backspace':
          if (!locked && sel) { e.preventDefault(); deleteSelection?.(); }
          break;
        case 'Escape':
          cancelEdit?.();
          break;
        default:
          // Typing a printable character replaces the cell — like Excel
          if (!locked && sel && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            typeToEdit?.(sel.r1, sel.c1, e.key);
          }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, sel, rowCount, colCount, locked]);
};

export default useGridKeyboard;
