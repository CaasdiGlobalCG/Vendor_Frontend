import React, { useState } from 'react';
import { X, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

const TablePreviewModal = ({ isOpen, onClose, tableData, tableName, tableType }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (!isOpen) return null;

  const { columns, data } = tableData;

  // Filter data based on search term
  const filteredData = data.filter(row =>
    Object.values(row).some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-line bg-black">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Eye className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink">{tableName}</h2>
              <p className="text-dim mt-1">
                {tableType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {filteredData.length} rows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-dim" />
          </button>
        </div>

        {/* Search and Controls */}
        <div className="p-6 border-b border-line bg-canvas">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform  text-dim w-4 h-4" />
              <input
                type="text"
                placeholder="Search table data..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="w-full pl-10 pr-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-info"
              />
            </div>

            {/* Items per page */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-dim">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="border border-line rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-info"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-dim">per page</span>
            </div>
          </div>

          {/* Results info */}
          <div className="mt-3 text-sm text-dim">
            {searchTerm ? (
              <span>
                Showing {filteredData.length} of {data.length} rows matching "{searchTerm}"
              </span>
            ) : (
              <span>Showing all {data.length} rows</span>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto max-h-[50vh]">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-dim">
              <Search className="w-12 h-12 mb-4 text-dim" />
              <h3 className="text-lg font-medium mb-2">No data found</h3>
              <p className="text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'This table appears to be empty'}
              </p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-surface-hover sticky top-0">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className="px-6 py-4 text-left text-xs font-medium text-dim uppercase tracking-wider border-b border-line"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-line">
                {paginatedData.map((row, rowIndex) => (
                  <tr
                    key={row.id || rowIndex}
                    className="hover:bg-canvas transition-colors"
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-ink border-b border-line"
                      >
                        {row[column] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filteredData.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-line bg-canvas">
            <div className="flex items-center justify-between">
              <div className="text-sm text-dim">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-line bg-surface text-dim hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-info text-white'
                            : 'bg-surface text-ink border border-line hover:bg-canvas'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-line bg-surface text-dim hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-line bg-canvas">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-cta text-cta-foreground rounded-lg hover:bg-cta transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TablePreviewModal;



