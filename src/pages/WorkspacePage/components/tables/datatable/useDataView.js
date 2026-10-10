import { useCallback, useMemo, useState } from 'react';
import { applyView, normalizeViewState, toggleSort } from '../../../utils/dataView';

/**
 * useDataView — DataTable's view-state engine.
 * Owns filters / multi-sort / hidden columns / perPage + pagination and
 * reports every change upward via onViewChange(view) so the parent can
 * persist it inside the table's saved config.
 */
const useDataView = ({ cols, rows, grid, initialView, onViewChange }) => {
  const [view, setView] = useState(() => initialView || { sorts: [], filters: {}, hidden: [], perPage: 10 });
  const [page, setPage] = useState(1);

  const patchView = useCallback((patch) => {
    setView(prev => {
      const next = { ...prev, ...patch };
      onViewChange?.(next);
      return next;
    });
    setPage(1); // any view change returns to page 1 — same as Excel
  }, [onViewChange]);

  const setFilter = useCallback((colKey, spec) => {
    patchView({ filters: { ...view.filters, [colKey]: spec ?? undefined } });
  }, [view.filters, patchView]);

  const clearFilter = useCallback((colKey) => {
    const next = { ...view.filters };
    delete next[colKey];
    patchView({ filters: next });
  }, [view.filters, patchView]);

  const clickSort = useCallback((colKey, additive) => {
    patchView({ sorts: toggleSort(view.sorts, colKey, additive) });
  }, [view.sorts, patchView]);

  const toggleHidden = useCallback((colKey) => {
    const hidden = view.hidden.includes(colKey)
      ? view.hidden.filter(k => k !== colKey)
      : [...view.hidden, colKey];
    patchView({ hidden });
  }, [view.hidden, patchView]);

  const setPerPage = useCallback((n) => patchView({ perPage: n }), [patchView]);

  const items = useMemo(() => rows.map((r, i) => ({ row: r, eval: grid[i] })), [rows, grid]);
  const visible = useMemo(() => applyView(items, cols, view), [items, cols, view]);
  const totalPages = Math.max(1, Math.ceil(visible.length / view.perPage));
  const safePage = Math.min(page, totalPages);
  const pageRows = visible.slice((safePage - 1) * view.perPage, safePage * view.perPage);
  const visibleCols = useMemo(() => cols.filter(c => !view.hidden.includes(c.key)), [cols, view.hidden]);

  return {
    view, sorts: view.sorts, filters: view.filters, hidden: view.hidden,
    perPage: view.perPage, setPerPage,
    page: safePage, setPage, totalPages,
    visible, pageRows, visibleCols,
    setFilter, clearFilter, clickSort, toggleHidden
  };
};

export default useDataView;
export { normalizeViewState };
