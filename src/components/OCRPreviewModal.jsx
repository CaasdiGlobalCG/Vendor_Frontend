import React, { useState } from "react";

/**
 * OCR Preview Modal - Displays extracted cheque data for user confirmation
 * Allows user to accept, edit, or retry the OCR processing
 */
export default function OCRPreviewModal({
  isOpen,
  data,
  onConfirm,
  onEdit,
  onRetry,
  onClose,
  isLoading = false
}) {
  const [editedData, setEditedData] = useState({
    accountNumber: data?.accountNumber || "",
    accountName: data?.accountName || ""
  });

  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  const confidence = data?.confidence || 0;
  const warnings = data?.warnings || [];
  const errors = data?.errors || [];
  const fieldConfidence = data?.fieldConfidence || {};

  const getConfidenceColor = (conf) => {
    if (conf >= 85) return "text-green-600";
    if (conf >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBg = (conf) => {
    if (conf >= 85) return "bg-green-100";
    if (conf >= 70) return "bg-yellow-100";
    return "bg-red-100";
  };

  const handleConfirm = () => {
    if (isEditing) {
      // Validate edited data
      if (!editedData.accountNumber.trim() || !editedData.accountName.trim()) {
        alert("Please fill in both account number and name");
        return;
      }
      onConfirm({
        accountNumber: editedData.accountNumber.trim(),
        accountName: editedData.accountName.trim()
      });
    } else {
      onConfirm({
        accountNumber: data.accountNumber,
        accountName: data.accountName
      });
    }
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedData({
        accountNumber: data.accountNumber || "",
        accountName: data.accountName || ""
      });
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <h2 className="text-lg font-semibold">OCR Verification</h2>
          <p className="text-sm text-blue-100 mt-1">
            Please review the extracted data
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Overall Confidence Score */}
          {!isEditing && (
            <div className={`p-4 rounded-lg ${getConfidenceBg(confidence)} border border-opacity-30`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Extraction Confidence
                </span>
                <span className={`text-xl font-bold ${getConfidenceColor(confidence)}`}>
                  {confidence}%
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    confidence >= 85
                      ? "bg-green-500"
                      : confidence >= 70
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>
          )}

          {/* Errors */}
          {errors && errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2">Issues Found:</h3>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">Warnings:</h3>
              <ul className="space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-700 flex items-start">
                    <span className="mr-2">⚠️</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Data */}
          <div className="space-y-4">
            {/* Account Number */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-900">
                  Account Number
                </label>
                {!isEditing && fieldConfidence.accountNumber && (
                  <span className={`text-xs font-medium ${getConfidenceColor(fieldConfidence.accountNumber)}`}>
                    {fieldConfidence.accountNumber}% confidence
                  </span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.accountNumber}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      accountNumber: e.target.value
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter account number"
                />
              ) : (
                <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-900">
                  {data?.accountNumber || "Not detected"}
                </div>
              )}
            </div>

            {/* Account Name */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-900">
                  Account Holder Name
                </label>
                {!isEditing && fieldConfidence.accountName && (
                  <span className={`text-xs font-medium ${getConfidenceColor(fieldConfidence.accountName)}`}>
                    {fieldConfidence.accountName}% confidence
                  </span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.accountName}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      accountName: e.target.value
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter account holder name"
                />
              ) : (
                <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900">
                  {data?.accountName || "Not detected"}
                </div>
              )}
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              ℹ️ Please verify the extracted information. You can manually correct any errors before confirming.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={handleEditToggle}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? "Cancel Edit" : "Edit"}
          </button>

          <button
            onClick={onRetry}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Retry
          </button>

          <button
            onClick={handleConfirm}
            disabled={isLoading || (isEditing && (!editedData.accountNumber || !editedData.accountName))}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}
            {isLoading ? "Processing..." : "Confirm & Use"}
          </button>
        </div>
      </div>
    </div>
  );
}
