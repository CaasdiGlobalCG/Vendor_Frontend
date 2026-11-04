// Table utility functions

export const createTableHelpers = (
  tableData,
  setTableData,
  sortColumn,
  setSortColumn,
  sortDirection,
  setSortDirection,
  filterText,
  itemsPerPage,
  currentPage,
  setEditingCell,
  expandedRows,
  setExpandedRows
) => {
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    let filtered = tableData.filter(row =>
      Object.values(row).some(value =>
        value.toString().toLowerCase().includes(filterText.toLowerCase())
      )
    );

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return filtered;
  };

  const getPaginatedData = () => {
    const sorted = getSortedData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  };

  const addTableRow = () => {
    const newId = Math.max(...tableData.map(row => row.id)) + 1;
    const newRow = {
      id: newId,
      name: `New User ${newId}`,
      email: `user${newId}@example.com`,
      role: 'User',
      status: 'Active'
    };
    setTableData([...tableData, newRow]);
  };

  const deleteTableRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };

  const updateTableCell = (rowId, column, value) => {
    setTableData(tableData.map(row =>
      row.id === rowId ? { ...row, [column]: value } : row
    ));
    setEditingCell(null);
  };

  const toggleRowExpansion = (rowId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  return {
    handleSort,
    getSortedData,
    getPaginatedData,
    addTableRow,
    deleteTableRow,
    updateTableCell,
    toggleRowExpansion
  };
};

// Default table data
export const defaultTableData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' }
];





// ---- Tables that hold their own data (`data.customTableData`) -------------
// Imported tables, tables made in the dialog and template tables keep their rows
// in the element's data. These helpers work on that row list.

/** Every row needs an id to be edited; rows without one get the next free number. */
export const ensureRowIds = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  const numeric = list.map((r) => Number(r?.id)).filter(Number.isFinite);
  const taken = new Set(list.map((r) => r?.id).filter((id) => id !== undefined && id !== null && id !== ''));
  if (taken.size === list.length && taken.size === new Set(list.map((r) => String(r.id))).size) return list;
  let next = numeric.length ? Math.max(...numeric) + 1 : 1;
  const seen = new Set();
  return list.map((row) => {
    const id = row?.id;
    if (id !== undefined && id !== null && id !== '' && !seen.has(String(id))) {
      seen.add(String(id));
      return row;
    }
    const fresh = next++;
    seen.add(String(fresh));
    return { ...row, id: fresh };
  });
};

export const updateCustomCell = (rows, rowId, column, value) =>
  rows.map((row) => (row.id === rowId ? { ...row, [column]: value } : row));

/** A blank row at the end. Returns the new rows and the id of the new row. */
export const addCustomRow = (rows, columns) => {
  const ids = rows.map((r) => Number(r.id)).filter(Number.isFinite);
  const newId = ids.length ? Math.max(...ids) + 1 : 1;
  const blank = Object.fromEntries((columns || []).map((c) => [c, '']));
  return { rows: [...rows, { ...blank, id: newId }], newId };
};

export const deleteCustomRow = (rows, rowId) => rows.filter((row) => row.id !== rowId);
