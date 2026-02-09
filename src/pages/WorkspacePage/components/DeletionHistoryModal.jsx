import React, { useState, useEffect } from 'react';
import { X, Trash2, Clock, User, FileText } from 'lucide-react';

const DeletionHistoryModal = ({ isOpen, onClose, subtaskId }) => {
  const [deletionHistory, setDeletionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && subtaskId) {
      fetchDeletionHistory();
    }
  }, [isOpen, subtaskId]);

  const fetchDeletionHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/element-deletion-history/subtask/${subtaskId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch deletion history');
      }
      const data = await response.json();
      setDeletionHistory(data.deletions || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching deletion history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-800">Deletion History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading deletion history...</div>
            </div>
          ) : error ? (
            <div className="text-red-500 bg-red-50 p-4 rounded">
              <strong>Error:</strong> {error}
            </div>
          ) : deletionHistory.length === 0 ? (
            <div className="text-center py-8">
              <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No deleted elements in this subtask</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletionHistory.map((deletion) => (
                <div
                  key={deletion.deletionId}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Top row - Element info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        {deletion.elementName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Type: <span className="font-medium">{deletion.elementType}</span>
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      {deletion.details?.deletedVia || 'canvas'}
                    </span>
                  </div>

                  {/* Deletion info grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                    {/* Deleted by */}
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Deleted by</p>
                        <p className="font-medium text-gray-900">{deletion.deletedBy}</p>
                        {deletion.deletedByEmail && (
                          <p className="text-gray-500 text-xs">{deletion.deletedByEmail}</p>
                        )}
                      </div>
                    </div>

                    {/* Deleted at */}
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Deleted at</p>
                        <p className="font-medium text-gray-900">
                          {new Date(deletion.deletedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Element ID and snapshot info */}
                  <div className="border-t border-gray-100 pt-3 text-xs">
                    <p className="text-gray-500 mb-2">
                      <strong>Element ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{deletion.elementId}</code>
                    </p>
                    
                    {/* Show element snapshot summary */}
                    {deletion.elementDataSnapshot && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                          📋 View element snapshot
                        </summary>
                        <div className="mt-2 bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(deletion.elementDataSnapshot, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      deletion.status === 'recovered' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {deletion.status === 'recovered' ? '✓ Recovered' : '🗑️ Deleted'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletionHistoryModal;
