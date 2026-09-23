import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Download,
  MessageCircle,
  Clock,
  User,
  Layers,
  Paperclip,
  X,
  Loader2
} from 'lucide-react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';

const SUPPORTED_FORMATS = ['PDF', 'DOCX', 'XLSX', 'PPT', 'ZIP'];

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFileBadge = (type = '') => {
  switch (type.toLowerCase()) {
    case 'pdf':
      return { label: 'PDF', className: 'bg-danger/10 text-danger border-danger/20' };
    case 'doc':
    case 'docx':
      return { label: 'DOCX', className: 'bg-info/10 text-info border-info/20' };
    case 'xls':
    case 'xlsx':
      return { label: 'XLSX', className: 'bg-surface-hover text-ink border-line' };
    case 'ppt':
    case 'pptx':
      return { label: 'PPT', className: 'bg-warning/10 text-warning border-warning/20' };
    case 'zip':
      return { label: 'ZIP', className: 'bg-surface-hover text-ink border-line' };
    default:
      return { label: type.toUpperCase() || 'FILE', className: 'bg-surface-hover text-dim border-line' };
  }
};

const DocumentBlockRenderer = ({ data, nodeId, workspaceId, setNodes }) => {
  const initial = data?.documentBlockData ?? {};
  const [fileName, setFileName] = useState(initial.fileName ?? '');
  const [fileType, setFileType] = useState(initial.fileType ?? '');
  const [fileSize, setFileSize] = useState(initial.fileSize ?? '');
  const [fileUrl, setFileUrl] = useState(initial.fileUrl ?? '');
  const [versions, setVersions] = useState(initial.versions ?? []);
  const [comments, setComments] = useState(initial.comments ?? []);
  const [newComment, setNewComment] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Auto-save ref for debouncing
  const saveTimeoutRef = useRef(null);

  const fileBadge = useMemo(() => getFileBadge(fileType), [fileType]);
  const isPreviewablePdf = useMemo(() => {
    if (!fileUrl) return false;
    const normalizedType = (fileType || '').toLowerCase();
    const normalizedName = (fileName || '').toLowerCase();
    return normalizedType === 'pdf' || normalizedName.endsWith('.pdf');
  }, [fileUrl, fileType, fileName]);

  // Auto-save documentBlockData changes to backend
  useEffect(() => {
    if (!workspaceId || !nodeId) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1.5 seconds of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const documentBlockData = {
          fileName,
          fileType,
          fileSize,
          fileUrl,
          versions,
          comments,
          lastModifiedAt: new Date().toISOString()
        };
        
        console.log('💾 Auto-saving document block data:', documentBlockData);
        
        // Update local node state
        if (setNodes) {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      documentBlockData,
                      lastModifiedAt: new Date().toISOString()
                    }
                  }
                : node
            )
          );
        }
        
        await persistNodeDataPatch(
          nodeId,
          {
            documentBlockData,
            lastModifiedAt: new Date().toISOString()
          },
          null,
          workspaceId
        );
        console.log('✅ Document block data saved to backend');
      } catch (error) {
        console.error('❌ Error auto-saving document block:', error);
      }
    }, 1500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [fileName, fileType, fileSize, fileUrl, versions, comments, workspaceId, nodeId, setNodes]);

  useEffect(() => {
    if (!isPreviewablePdf && showPreview) {
      setShowPreview(false);
    }
  }, [isPreviewablePdf, showPreview]);

  const handleDownload = () => {
    if (!fileUrl) return;

    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = fileName || 'document';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handlePreview = () => {
    if (isPreviewablePdf) {
      setShowPreview(true);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB for documents)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size must be less than 50MB');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    setFileName(file.name);
    setFileType(extension);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    setUploading(true);
    setUploadError('');

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      formData.append('nodeId', nodeId);
      formData.append('fileType', 'document-block');

      console.log('📤 Uploading document to S3...', {
        fileName: file.name,
        fileSize: file.size,
        workspaceId,
        nodeId
      });

      // Upload to S3 via backend API
      const response = await fetch('/api/workspace-files/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const result = await response.json();
      console.log('✅ Document uploaded successfully:', result);

      // Set the S3 URL as the file URL
      const s3FileUrl = result.file?.s3Url || result.s3Url || result.url;
      setFileUrl(s3FileUrl);

      // Add version entry
      setVersions((prev) => {
        const nextVersionNumber = prev.length + 1;
        const newVersion = {
          id: `ver-${Date.now()}`,
          version: `v${nextVersionNumber}.0`,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'You',
          notes: `${file.name} uploaded`,
          s3Url: s3FileUrl
        };
        return [newVersion, ...prev];
      });

    } catch (error) {
      console.error('❌ Error uploading document:', error);
      setUploadError(error.message || 'Failed to upload document');
      
      // Fallback to base64 for local preview if S3 fails
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setFileUrl(result);
        }
      };
      reader.readAsDataURL(file);

      // Still add version entry for local fallback
      setVersions((prev) => {
        const nextVersionNumber = prev.length + 1;
        const newVersion = {
          id: `ver-${Date.now()}`,
          version: `v${nextVersionNumber}.0`,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'You',
          notes: `${file.name} uploaded (local)`
        };
        return [newVersion, ...prev];
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    const comment = {
      id: `comment-${Date.now()}`,
      author: 'You',
      text: trimmed,
      timestamp: new Date().toISOString()
    };
    setComments((prev) => [comment, ...prev]);
    setNewComment('');
  };

  const removeComment = (id) => {
    setComments((prev) => prev.filter((comment) => comment.id !== id));
  };

  return (
    <>
      <div
        className="w-[460px] bg-surface border-2 border-line rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-gradient-to-r from-surface-hover to-black border-b border-line flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-info" />
            <span className="text-sm font-semibold text-ink">Document Block</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!fileUrl}
              className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                fileUrl ? 'text-info bg-white/70 hover:bg-surface' : 'text-dim bg-white/40 cursor-not-allowed'
              }`}
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!isPreviewablePdf}
              className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                isPreviewablePdf ? 'text-info bg-white/70 hover:bg-surface' : 'text-dim bg-white/40 cursor-not-allowed'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Preview</span>
            </button>
            <label className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-white rounded-lg ${uploading ? 'bg-info cursor-wait' : 'bg-info cursor-pointer hover:bg-info'}`}>
              {uploading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3 h-3" />
                  <span>Upload</span>
                </>
              )}
              <input
                type="file"
                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="mx-4 mb-2 p-2 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
            {uploadError}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{fileName || 'No document attached yet'}</p>
                {fileSize && <p className="text-xs text-dim">{fileSize}</p>}
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${fileBadge.className}`}>
                {fileBadge.label}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-canvas overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-line text-xs text-dim uppercase tracking-wide">
                <span className="inline-flex items-center space-x-1">
                  <Layers className="w-3 h-3" />
                  <span>Inline Preview</span>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <Paperclip className="w-3 h-3" />
                  <span>Supported: {SUPPORTED_FORMATS.join(', ')}</span>
                </span>
              </div>
              <div className="p-4 bg-surface min-h-[160px] flex items-center justify-center">
                {fileUrl ? (
                  isPreviewablePdf ? (
                    <iframe
                      src={fileUrl}
                      title="Document Preview"
                      className="w-full h-72 rounded-lg border border-line"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <FileText className="w-12 h-12 text-info mx-auto" />
                      <p className="text-sm text-dim">Preview not available for this format.</p>
                      <p className="text-xs text-dim">Use the download button to view the file.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center space-y-2 text-dim">
                    <FileText className="w-12 h-12 mx-auto" />
                    <p className="text-sm">Upload a project document to preview it here.</p>
                    <p className="text-xs uppercase tracking-wide">PDF · DOCX · XLSX · PPT · ZIP</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Version History</span>
              <span className="text-xs text-dim">Latest on top</span>
            </div>
            {versions.length === 0 ? (
              <p className="text-xs text-dim">No versions uploaded yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="px-3 py-2 border border-line rounded-lg bg-surface hover:border-info/20 transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-ink">
                      <span>{version.version}</span>
                      <span className="text-xs text-dim">{formatTimestamp(version.uploadedAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-dim">
                      <span className="inline-flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{version.uploadedBy}</span>
                      </span>
                      <span className="inline-flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{version.notes}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Comments</span>
              <span className="text-xs text-dim">Discuss document feedback</span>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a note for collaborators"
                  rows={3}
                  className="w-full border border-line rounded-lg p-3 pr-16 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/10"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  className="absolute bottom-2 right-2 px-3 py-1 text-xs font-semibold text-white bg-info rounded-lg hover:bg-info"
                >
                  Post
                </button>
              </div>
              {comments.length === 0 ? (
                <p className="text-xs text-dim">No comments yet. Be the first to add feedback.</p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {comments.map((comment) => (
                    <div key={comment.id} className="px-3 py-2 border border-line rounded-lg bg-surface">
                      <div className="flex items-center justify-between text-xs text-dim">
                        <span className="inline-flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{comment.author}</span>
                        </span>
                        <span className="inline-flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(comment.timestamp)}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink">{comment.text}</p>
                      <button
                        type="button"
                        onClick={() => removeComment(comment.id)}
                        className="mt-2 inline-flex items-center space-x-1 text-xs text-danger hover:text-danger"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPreview && isPreviewablePdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-4xl w-11/12 max-h-[90vh] bg-surface rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe src={fileUrl} title="Document Full Preview" className="w-full h-full bg-black" />
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentBlockRenderer;