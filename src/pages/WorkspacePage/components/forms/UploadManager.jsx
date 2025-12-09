import React, { useState, useRef, createContext, useContext, useEffect } from 'react';
import { Upload, FileText, Image, FileSpreadsheet, File, X, Plus, FolderOpen, Download, Eye } from 'lucide-react';
import config from '../../../../config/env';

// Create context for managing uploaded files globally
const UploadContext = createContext();

// Provider component to wrap the workspace
export const UploadProvider = ({ children, workspaceId, vendorId, taskId, subtaskId }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load existing files for the workspace
  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceFiles();
    }
  }, [workspaceId, vendorId, taskId, subtaskId]);

  const loadWorkspaceFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (vendorId) params.append('vendorId', vendorId);
      if (taskId) params.append('taskId', taskId);
      if (subtaskId) params.append('subtaskId', subtaskId);

      const response = await fetch(`/api/workspace-files/workspace/${workspaceId}?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        const files = result.files.map(file => ({
          id: file.fileId,
          name: file.fileName,
          size: file.size,
          type: file.contentType || 'application/octet-stream',
          lastModified: file.lastModified,
          url: null, // Will be loaded on demand
          s3Key: file.key,
          uploadedAt: file.uploadedAt || file.lastModified,
          isUploaded: true,
          workspaceId: file.workspaceId,
          vendorId: file.vendorId,
          taskId: file.taskId,
          subtaskId: file.subtaskId
        }));
        setUploadedFiles(files);
      }
    } catch (error) {
      console.error('Error loading workspace files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files) => {
    const fileArray = Array.from(files);
    const uploadPromises = fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      if (vendorId) formData.append('vendorId', vendorId);
      if (taskId) formData.append('taskId', taskId);
      if (subtaskId) formData.append('subtaskId', subtaskId);

      try {
        const response = await fetch(`/api/workspace-files/upload`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          return {
            id: result.file.fileId,
            name: result.file.fileName,
            size: result.file.fileSize,
            type: result.file.fileType,
            lastModified: Date.now(),
            url: result.file.s3Url,
            s3Key: result.file.s3Key,
            uploadedAt: result.file.uploadedAt,
            isUploaded: true,
            workspaceId: result.file.workspaceId,
            vendorId: result.file.vendorId,
            taskId: result.file.taskId,
            subtaskId: result.file.subtaskId
          };
        } else {
          const error = await response.json();
          console.error('Upload failed for', file.name, error);
          throw new Error(`Failed to upload ${file.name}: ${error.error}`);
        }
      } catch (error) {
        console.error('Upload error for', file.name, error);
        throw error;
      }
    });

    try {
      const uploadedFileResults = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploadedFileResults]);
      return uploadedFileResults;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  };

  const addFiles = async (files) => {
    try {
      setLoading(true);
      const uploadedFiles = await uploadFiles(files);
      return uploadedFiles; // Return the uploaded files
    } catch (error) {
      console.error('Error adding files:', error);
      alert('Failed to upload some files. Please try again.');
      throw error; // Re-throw the error so the caller can handle it
    } finally {
      setLoading(false);
    }
  };

  const removeFile = async (fileId) => {
    try {
      const fileToRemove = uploadedFiles.find(f => f.id === fileId);
      if (!fileToRemove) return;

      // If it's an uploaded file, delete from S3
      if (fileToRemove.isUploaded) {
        const response = await fetch(`/api/workspace-files/${fileId}?workspaceId=${workspaceId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Delete failed:', error);
          throw new Error(`Failed to delete file: ${error.error}`);
        }
      }

      // Remove from local state
      setUploadedFiles(prev => {
        const updated = prev.filter(f => f.id !== fileId);
        // Clean up local URLs if any
        if (fileToRemove.url && fileToRemove.url.startsWith('blob:')) {
          URL.revokeObjectURL(fileToRemove.url);
        }
        return updated;
      });
    } catch (error) {
      console.error('Error removing file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const getFileViewUrl = async (file) => {
    try {
      if (file.url && !file.url.startsWith('blob:')) {
        return file.url; // Already have a valid URL
      }

      const response = await fetch(`/api/workspace-files/view-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ s3Key: file.s3Key })
      });

      if (response.ok) {
        const result = await response.json();
        return result.viewUrl;
      } else {
        throw new Error('Failed to get view URL');
      }
    } catch (error) {
      console.error('Error getting view URL:', error);
      return null;
    }
  };

  const downloadFile = async (file) => {
    try {
      const response = await fetch(`/api/workspace-files/download/${file.id}?workspaceId=${workspaceId}`);
      
      if (response.ok) {
        const result = await response.json();
        // Open download URL in new tab
        window.open(result.downloadUrl, '_blank');
      } else {
        throw new Error('Failed to get download URL');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  return (
    <UploadContext.Provider value={{ 
      uploadedFiles, 
      addFiles, 
      removeFile, 
      loading,
      getFileViewUrl,
      downloadFile,
      refreshFiles: loadWorkspaceFiles
    }}>
      {children}
    </UploadContext.Provider>
  );
};

// Hook to use upload context
export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider');
  }
  return context;
};

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

// Draggable File Card Component
const DraggableFileCard = ({ file }) => {
  const { removeFile, getFileViewUrl, downloadFile } = useUpload();
  const FileIcon = getFileIcon(file.name);
  const colorClass = getFileTypeColor(file.name);
  const [isLoading, setIsLoading] = useState(false);

  const handleDragStart = (event) => {
    // Create a file element that can be dropped on canvas
    const fileElement = {
      id: `file_${file.id}`,
      name: file.name,
      type: 'file',
      preview: `Uploaded file: ${file.name}`,
      fileData: {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        uploadedAt: file.uploadedAt
      }
    };
    
    event.dataTransfer.setData('application/json', JSON.stringify(fileElement));
    console.log('📁 File drag started:', fileElement);
  };

  const handleDoubleClick = () => {
    // Dispatch custom event for double-click
    const fileElement = {
      id: `file_${file.id}`,
      name: file.name,
      type: 'file',
      preview: `Uploaded file: ${file.name}`,
      fileData: {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        s3Key: file.s3Key,
        uploadedAt: file.uploadedAt,
        isUploaded: file.isUploaded
      }
    };
    
    const event = new CustomEvent('elementDoubleClick', { detail: fileElement });
    document.dispatchEvent(event);
    console.log('📁 File double-click event dispatched:', fileElement);
  };

  const handleViewFile = async () => {
    if (!file.isUploaded) return;
    
    setIsLoading(true);
    try {
      const viewUrl = await getFileViewUrl(file);
      if (viewUrl) {
        window.open(viewUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!file.isUploaded) return;
    
    setIsLoading(true);
    try {
      await downloadFile(file);
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className={`p-3 rounded-lg border-2 ${colorClass} group relative cursor-move hover:shadow-md transition-all duration-200`}
      title="Drag to canvas or double-click to add"
    >
      {/* File Icon and Info */}
      <div className="flex items-start space-x-3">
        <FileIcon className="w-8 h-8 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs opacity-75">
            {formatFileSize(file.size)}
          </p>
          <p className="text-xs opacity-60 mt-1">
            {new Date(file.uploadedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
        {file.isUploaded && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewFile();
              }}
              disabled={isLoading}
              className="text-blue-500 hover:text-blue-700 transition-colors bg-white rounded-full p-1 shadow-sm"
              title="View file"
            >
              <Eye className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadFile();
              }}
              disabled={isLoading}
              className="text-green-500 hover:text-green-700 transition-colors bg-white rounded-full p-1 shadow-sm"
              title="Download file"
            >
              <Download className="w-3 h-3" />
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeFile(file.id);
          }}
          className="text-red-500 hover:text-red-700 transition-colors bg-white rounded-full p-1 shadow-sm"
          title="Remove file"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Status indicator */}
      {file.isUploaded && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            Uploaded
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Drag Indicator */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-xs text-gray-500 bg-white bg-opacity-75 px-2 py-1 rounded">
          Drag to canvas
        </div>
      </div>
    </div>
  );
};

// Main Upload Manager Component
const UploadManager = ({ data }) => {
  const { uploadedFiles, addFiles, loading } = useUpload();
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      addFiles(files);
    }
  };

  // If this is the upload button element
  if (data?.id === 'upload-button') {
    return (
      <div className="w-full space-y-4">
        {/* Upload Button */}
        <div className="text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFileSelect();
            }}
            disabled={loading}
            className="flex items-center space-x-3 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload Files</span>
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-600 mt-2">
            Click to select files to upload
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            accept="*/*"
          />
        </div>

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <FolderOpen className="w-4 h-4" />
              <span>Uploaded Files ({uploadedFiles.length})</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <DraggableFileCard key={file.id} file={file} />
              ))}
            </div>
            
            <div className="text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileSelect();
                }}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Upload More Files</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {uploadedFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No files uploaded yet</p>
            <p className="text-xs mt-1">Click the upload button to add files</p>
          </div>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <div className="w-full p-4 text-center text-gray-500">
      <Upload className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Upload Manager</p>
    </div>
  );
};

export default UploadManager;
