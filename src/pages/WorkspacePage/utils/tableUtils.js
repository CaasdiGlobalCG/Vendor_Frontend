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



