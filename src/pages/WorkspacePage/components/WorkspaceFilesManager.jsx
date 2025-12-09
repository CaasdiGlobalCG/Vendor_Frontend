import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  FileSpreadsheet,
  Archive,
  Music,
  Video,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Grid,
  List,
  RefreshCw,
  FolderOpen,
  Calendar,
  User
} from 'lucide-react';
import { useUpload } from './forms/UploadManager';
import FileUploadModal from './FileUploadModal';

const WorkspaceFilesManager = ({ 
  workspaceId, 
  vendorId, 
  taskId, 
  subtaskId,
  currentUser,
  userRole 
}) => {
  const { uploadedFiles, loading, refreshFiles, removeFile, downloadFile, getFileViewUrl } = useUpload();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'size', 'type'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Get file type icon
  const getFileIcon = (fileName, fileType) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    if (fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return <Image className="w-8 h-8 text-blue-500" />;
    } else if (fileType?.includes('pdf') || extension === 'pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else if (fileType?.includes('word') || fileType?.includes('document') || ['doc', 'docx'].includes(extension)) {
      return <FileText className="w-8 h-8 text-blue-600" />;
    } else if (fileType?.includes('excel') || fileType?.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension)) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    } else if (fileType?.includes('powerpoint') || fileType?.includes('presentation') || ['ppt', 'pptx'].includes(extension)) {
      return <FileText className="w-8 h-8 text-orange-600" />;
    } else if (fileType?.includes('zip') || fileType?.includes('rar') || fileType?.includes('7z') || ['zip', 'rar', '7z', 'gz', 'tar'].includes(extension)) {
      return <Archive className="w-8 h-8 text-purple-500" />;
    } else if (fileType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
      return <Music className="w-8 h-8 text-pink-500" />;
    } else if (fileType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm', 'mkv'].includes(extension)) {
      return <Video className="w-8 h-8 text-indigo-500" />;
    } else {
      return <File className="w-8 h-8 text-gray-500" />;
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and sort files
  const filteredAndSortedFiles = uploadedFiles
    .filter(file => {
      // Search filter
      if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (filterType !== 'all') {
        const extension = file.name?.split('.').pop()?.toLowerCase();
        const fileType = file.type?.toLowerCase();
        
        switch (filterType) {
          case 'images':
            return fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension);
          case 'documents':
            return fileType?.includes('pdf') || fileType?.includes('word') || fileType?.includes('document') || 
                   ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension);
          case 'spreadsheets':
            return fileType?.includes('excel') || fileType?.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension);
          case 'archives':
            return fileType?.includes('zip') || fileType?.includes('rar') || ['zip', 'rar', '7z', 'gz', 'tar'].includes(extension);
          case 'media':
            return fileType?.startsWith('audio/') || fileType?.startsWith('video/') || 
                   ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'avi', 'mov', 'webm', 'mkv'].includes(extension);
          default:
            return true;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        case 'date':
        default:
          comparison = new Date(a.uploadedAt || a.lastModified) - new Date(b.uploadedAt || b.lastModified);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Handle file actions
  const handleViewFile = async (file) => {
    try {
      const viewUrl = await getFileViewUrl(file);
      if (viewUrl) {
        window.open(viewUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      await downloadFile(file);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDeleteFile = async (file) => {
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await removeFile(file.id);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const handleFilesUploaded = (uploadedFiles) => {
    // Files are automatically added to the context, just refresh
    refreshFiles();
    setShowUploadModal(false);
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Workspace Files</h2>
            <span className="text-sm text-gray-500">({filteredAndSortedFiles.length} files)</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refreshFiles()}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh files"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Files</option>
            <option value="images">Images</option>
            <option value="documents">Documents</option>
            <option value="spreadsheets">Spreadsheets</option>
            <option value="archives">Archives</option>
            <option value="media">Media</option>
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              setSortBy(sort);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
          </select>
          
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Content */}
      <div className="p-4 h-[calc(100%-140px)] overflow-y-auto">
        {loading && filteredAndSortedFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">Loading files...</p>
            </div>
          </div>
        ) : filteredAndSortedFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Upload files to get started'
                }
              </p>
              {!searchTerm && filterType === 'all' && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Files</span>
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAndSortedFiles.map((file) => (
              <div key={file.id} className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3">
                    {getFileIcon(file.name, file.type)}
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-900 mb-1 truncate w-full" title={file.name}>
                    {file.name}
                  </h3>
                  
                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(file.size)}
                  </p>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {formatDate(file.uploadedAt || file.lastModified)}
                  </p>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      title="View file"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedFiles.map((file) => (
              <div key={file.id} className="group flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200">
                <div className="flex-shrink-0">
                  {getFileIcon(file.name, file.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{formatDate(file.uploadedAt || file.lastModified)}</span>
                    {file.vendorId && (
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>Vendor: {file.vendorId}</span>
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleViewFile(file)}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    title="View file"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFilesSelected={handleFilesUploaded}
        workspaceId={workspaceId}
        vendorId={vendorId}
        taskId={taskId}
        subtaskId={subtaskId}
        maxFiles={20}
        maxSizePerFile={100 * 1024 * 1024} // 100MB
      />
    </div>
  );
};

export default WorkspaceFilesManager;
