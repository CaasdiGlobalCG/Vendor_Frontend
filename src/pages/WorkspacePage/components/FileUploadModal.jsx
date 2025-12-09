import React, { useState, useRef } from 'react';
import { X, Upload, File, Image, FileText, Archive, Music, Video, Paperclip, Trash2, Eye } from 'lucide-react';
import config from '../../../config/env';

const FileUploadModal = ({ 
  isOpen, 
  onClose, 
  onFilesSelected,
  workspaceId,
  vendorId,
  taskId,
  subtaskId,
  maxFiles = 10,
  maxSizePerFile = 100 * 1024 * 1024 // 100MB for workspace files
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-8 h-8 text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileText className="w-8 h-8 text-green-600" />;
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileText className="w-8 h-8 text-orange-600" />;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return <Archive className="w-8 h-8 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <Music className="w-8 h-8 text-pink-500" />;
    if (fileType.startsWith('video/')) return <Video className="w-8 h-8 text-indigo-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];

    fileArray.forEach(file => {
      // Check file size
      if (file.size > maxSizePerFile) {
        alert(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSizePerFile)}.`);
        return;
      }

      // Check if we're not exceeding max files
      if (selectedFiles.length + validFiles.length >= maxFiles) {
        alert(`Maximum ${maxFiles} files allowed.`);
        return;
      }

      validFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      });
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const removeFile = (fileId) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Clean up preview URLs
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const fileData of selectedFiles) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('workspaceId', workspaceId);
        if (vendorId) formData.append('vendorId', vendorId);
        if (taskId) formData.append('taskId', taskId);
        if (subtaskId) formData.append('subtaskId', subtaskId);

        const response = await fetch(`/api/workspace-files/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include' // Include cookies for authenticated requests
        });

        if (response.ok) {
          const result = await response.json();
          uploadedFiles.push(result.file);
        } else {
          const error = await response.json();
          console.error('Upload failed for', fileData.name, error);
          alert(`Failed to upload ${fileData.name}: ${error.error}`);
        }
      }

      // Call the callback with uploaded files
      onFilesSelected(uploadedFiles);
      
      // Clean up and close
      selectedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setSelectedFiles([]);
      onClose();

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URLs
    selectedFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Support for images, documents, spreadsheets, presentations, archives, media files, CAD files, and code files
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.xml,.zip,.rar,.7z,audio/*,video/*,.dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj,.py,.java,.c,.cpp,.h,.hpp,.php,.rb,.go,.rs,.log,.conf,.ini,.cfg,.properties,.md,.yaml,.yml"
            />
          </div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Selected Files ({selectedFiles.length}/{maxFiles})
              </h3>
              <div className="space-y-3">
                {selectedFiles.map((fileData) => (
                  <div key={fileData.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex-shrink-0">
                      {fileData.preview ? (
                        <img 
                          src={fileData.preview} 
                          alt={fileData.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        getFileIcon(fileData.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileData.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(fileData.size)} • {fileData.type}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(fileData.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Max {maxFiles} files, {formatFileSize(maxSizePerFile)} per file
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={uploadFiles}
              disabled={selectedFiles.length === 0 || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
