import React from 'react';

const TableRenderer = ({ 
  data, 
  tableData, 
  sortColumn, 
  sortDirection, 
  filterText, 
  currentPage, 
  itemsPerPage, 
  editingCell, 
  expandedRows,
  handleSort,
  getSortedData,
  getPaginatedData,
  addTableRow,
  deleteTableRow,
  updateTableCell,
  toggleRowExpansion,
  setFilterText,
  setItemsPerPage,
  setCurrentPage,
  setEditingCell
}) => {
  // Use custom table data if available, otherwise use default columns
  const customData = data.customTableData;
  const columns = customData ? customData.columns : ['name', 'email', 'role', 'status'];
  const actualTableData = customData ? customData.data : tableData;
  
  // Update helper functions to use actual data
  const getActualSortedData = () => {
    let filtered = actualTableData.filter(row =>
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

  const getActualPaginatedData = () => {
    const sorted = getActualSortedData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  };
  
  const totalPages = Math.ceil(getActualSortedData().length / itemsPerPage);

  switch (data.id) {
    case 'basic-table':
      return (
        <div className="w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead className="bg-canvas">
                <tr>
                  {columns.map(column => (
                    <th key={column} className="border border-line px-4 py-2 text-left font-semibold text-ink capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actualTableData.slice(0, 3).map(row => (
                  <tr key={row.id} className="hover:bg-canvas">
                    {columns.map(column => (
                      <td key={column} className="border border-line px-4 py-2 text-dim">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'sortable-table':
      return (
        <div className="w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead className="bg-canvas">
                <tr>
                  {columns.map(column => (
                    <th 
                      key={column} 
                      className="border border-line px-4 py-2 text-left font-semibold text-ink capitalize cursor-pointer hover:bg-surface-hover"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSort(column);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {column}
                        {sortColumn === column && (
                          <span className="text-info">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getActualSortedData().slice(0, 3).map(row => (
                  <tr key={row.id} className="hover:bg-canvas">
                    {columns.map(column => (
                      <td key={column} className="border border-line px-4 py-2 text-dim">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-dim text-center">
            Click column headers to sort
          </div>
        </div>
      );

    case 'filterable-table':
      return (
        <div className="w-full space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search table..."
              value={filterText}
              onChange={(e) => {
                e.stopPropagation();
                setFilterText(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-1 border border-line rounded text-sm focus:outline-none focus:ring-1 focus:ring-info"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFilterText('');
              }}
              className="px-3 py-1 bg-surface-hover text-dim rounded text-sm hover:bg-surface-hover"
            >
              Clear
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead className="bg-canvas">
                <tr>
                  {columns.map(column => (
                    <th key={column} className="border border-line px-4 py-2 text-left font-semibold text-ink capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getActualSortedData().slice(0, 3).map(row => (
                  <tr key={row.id} className="hover:bg-canvas">
                    {columns.map(column => (
                      <td key={column} className="border border-line px-4 py-2 text-dim">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-dim text-center">
            Showing {getActualSortedData().length} of {actualTableData.length} rows
          </div>
        </div>
      );

    case 'paginated-table':
      return (
        <div className="w-full space-y-3">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead className="bg-canvas">
                <tr>
                  {columns.map(column => (
                    <th key={column} className="border border-line px-4 py-2 text-left font-semibold text-ink capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getActualPaginatedData().map(row => (
                  <tr key={row.id} className="hover:bg-canvas">
                    {columns.map(column => (
                      <td key={column} className="border border-line px-4 py-2 text-dim">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-dim">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  e.stopPropagation();
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                onClick={(e) => e.stopPropagation()}
                className="border border-line rounded px-2 py-1 text-sm"
              >
                <option value={2}>2</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage(Math.max(1, currentPage - 1));
                }}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-surface-hover text-dim rounded disabled:opacity-50 hover:bg-surface-hover"
              >
                Previous
              </button>
              <span className="text-dim">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage(Math.min(totalPages, currentPage + 1));
                }}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-surface-hover text-dim rounded disabled:opacity-50 hover:bg-surface-hover"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      );

    case 'editable-table':
      return (
        <div className="w-full space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-dim">Double-click cells to edit</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                addTableRow();
              }}
              className="px-3 py-1 bg-success text-white rounded text-sm hover:bg-success"
            >
              Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead className="bg-canvas">
                <tr>
                  {columns.map(column => (
                    <th key={column} className="border border-line px-4 py-2 text-left font-semibold text-ink capitalize">
                      {column}
                    </th>
                  ))}
                  <th className="border border-line px-4 py-2 text-left font-semibold text-ink">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {actualTableData.slice(0, 3).map(row => (
                  <tr key={row.id} className="hover:bg-canvas">
                    {columns.map(column => (
                      <td 
                        key={column} 
                        className="border border-line px-4 py-2 text-dim cursor-pointer hover:bg-info/10"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingCell(`${row.id}-${column}`);
                        }}
                      >
                        {editingCell === `${row.id}-${column}` ? (
                          <input
                            type="text"
                            value={row[column]}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateTableCell(row.id, column, e.target.value);
                            }}
                            onBlur={() => setEditingCell(null)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                setEditingCell(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-info/30 rounded focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          row[column]
                        )}
                      </td>
                    ))}
                    <td className="border border-line px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTableRow(row.id);
                        }}
                        className="px-2 py-1 bg-danger text-white rounded text-xs hover:bg-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'expandable-table':
      return (
        <div className="w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead className="bg-canvas">
                <tr>
                  <th className="border border-line px-4 py-2 text-left font-semibold text-ink w-8">
                    
                  </th>
                  {columns.map(column => (
                    <th key={column} className="border border-line px-4 py-2 text-left font-semibold text-ink capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actualTableData.slice(0, 3).map(row => (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-canvas">
                      <td className="border border-line px-4 py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(row.id);
                          }}
                          className="text-info hover:text-info"
                        >
                          {expandedRows.has(row.id) ? '−' : '+'}
                        </button>
                      </td>
                      {columns.map(column => (
                        <td key={column} className="border border-line px-4 py-2 text-dim">
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                    {expandedRows.has(row.id) && (
                      <tr>
                        <td colSpan={columns.length + 1} className="border border-line px-4 py-2 bg-canvas">
                          <div className="text-sm text-dim">
                            <strong>Additional Details for {row.name}:</strong>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>User ID: {row.id}</div>
                              <div>Created: 2024-01-01</div>
                              <div>Last Login: 2024-01-15</div>
                              <div>Department: Engineering</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-dim text-center">
            Click + to expand row details
          </div>
        </div>
      );

    default:
      return (
        <div className="w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead className="bg-canvas">
                <tr>
                  {columns.map(column => (
                    <th key={column} className="border border-line px-4 py-2 text-left font-semibold text-ink capitalize">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actualTableData.slice(0, 3).map(row => (
                  <tr key={row.id} className="hover:bg-canvas">
                    {columns.map(column => (
                      <td key={column} className="border border-line px-4 py-2 text-dim">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
  }
};

export default TableRenderer;
