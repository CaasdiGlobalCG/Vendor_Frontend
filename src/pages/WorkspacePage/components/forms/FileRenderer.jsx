import React, { useState } from 'react';
import { FileText, Image, FileSpreadsheet, File, Eye, Download, Calendar, User, ExternalLink, X } from 'lucide-react';

const FileRenderer = ({ data }) => {
  const [showPreview, setShowPreview] = useState(false);
  
  // Get file data from the node data
  const fileData = data?.fileData;
  
  if (!fileData) {
    return (
      <div className="w-full p-4 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        <File className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">No file data available</p>
      </div>
    );
  }

  // Get file type icon
  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return Image;
    } else if (['xlsx', 'xls', 'csv', 'ods'].includes(extension)) {
      return FileSpreadsheet;
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
      return FileText;
    } else {
      return File;
    }
  };

  // Get file type color
  const getFileTypeColor = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return 'bg-green-100 border-green-300 text-green-800';
    } else if (['xlsx', 'xls', 'csv', 'ods'].includes(extension)) {
      return 'bg-emerald-100 border-emerald-300 text-emerald-800';
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
      return 'bg-blue-100 border-blue-300 text-blue-800';
    } else {
      return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Download file
  const downloadFile = () => {
    if (fileData.url) {
      const link = document.createElement('a');
      link.href = fileData.url;
      link.download = fileData.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Open file in new tab
  const openFile = () => {
    if (fileData.url) {
      window.open(fileData.url, '_blank');
    }
  };

  const FileIcon = getFileIcon(fileData.name);
  const colorClass = getFileTypeColor(fileData.name);
  const isImage = fileData.type?.startsWith('image/');

  return (
    <div className="w-full">
      {/* File Card */}
      <div className={`p-4 rounded-lg border-2 ${colorClass} group relative`}>
        {/* File Icon and Info */}
        <div className="flex items-start space-x-3">
          <FileIcon className="w-10 h-10 flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={fileData.name}>
              {fileData.name}
            </p>
            <p className="text-xs opacity-75 mb-1">
              {formatFileSize(fileData.size)}
            </p>
            <div className="flex items-center text-xs opacity-60">
              <Calendar className="w-3 h-3 mr-1" />
              <span>{new Date(fileData.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview(true);
            }}
            className="flex items-center space-x-1 px-3 py-1 bg-white bg-opacity-75 hover:bg-opacity-100 rounded transition-colors text-xs border"
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadFile();
            }}
            className="flex items-center space-x-1 px-3 py-1 bg-white bg-opacity-75 hover:bg-opacity-100 rounded transition-colors text-xs border"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openFile();
            }}
            className="flex items-center space-x-1 px-3 py-1 bg-white bg-opacity-75 hover:bg-opacity-100 rounded transition-colors text-xs border"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open</span>
          </button>
        </div>

        {/* File Type Badge */}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-75 border">
            File
          </span>
        </div>
      </div>

      {/* File Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FileIcon className="w-6 h-6" />
                <div>
                  <h3 className="font-medium text-gray-900">{fileData.name}</h3>
                  <p className="text-sm text-gray-600">{formatFileSize(fileData.size)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 max-h-[70vh] overflow-auto">
              {isImage ? (
                <img
                  src={fileData.url}
                  alt={fileData.name}
                  className="max-w-full max-h-full object-contain mx-auto"
                />
              ) : (
                <div className="text-center py-12">
                  <FileIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={downloadFile}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </button>
                    <button
                      onClick={openFile}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in New Tab</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage Info */}
      <div className="text-center text-xs text-gray-500 mt-2">
        Uploaded file • Click actions to interact
      </div>
    </div>
  );
};

export default FileRenderer;
