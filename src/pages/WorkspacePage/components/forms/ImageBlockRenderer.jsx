import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, MapPin, Clock, Image as ImageIcon, Trash2, Plus, Eye, Download, X, Loader2 } from 'lucide-react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';

const defaultAnnotations = [
  { id: 'ann-1', text: 'Highlight key progress', position: 'top-left' }
];

const formatPositionBadge = (position) => {
  switch (position) {
    case 'top-left':
      return 'Top Left';
    case 'top-right':
      return 'Top Right';
    case 'bottom-left':
      return 'Bottom Left';
    case 'bottom-right':
      return 'Bottom Right';
    default:
      return 'Custom';
  }
};

const ImageBlockRenderer = ({ data, nodeId, workspaceId, setNodes }) => {
  const initial = data.imageBlockData || {};
  const [imageUrl, setImageUrl] = useState(initial.imageUrl || '');
  const [caption, setCaption] = useState(initial.caption || '');
  const [timestamp, setTimestamp] = useState(initial.timestamp || '');
  const [geotag, setGeotag] = useState(initial.geotag || '');
  const [annotations, setAnnotations] = useState(initial.annotations || defaultAnnotations);
  const [imageWidth, setImageWidth] = useState(initial.width ?? 80);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Auto-save ref for debouncing
  const saveTimeoutRef = useRef(null);

  // Auto-save imageBlockData changes to backend
  useEffect(() => {
    if (!workspaceId || !nodeId) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1.5 seconds of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const imageBlockData = {
          imageUrl,
          caption,
          timestamp,
          geotag,
          annotations,
          width: imageWidth,
          lastModifiedAt: new Date().toISOString()
        };
        
        console.log('💾 Auto-saving image block data:', imageBlockData);
        
        // Update local node state
        if (setNodes) {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      imageBlockData,
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
            imageBlockData,
            lastModifiedAt: new Date().toISOString()
          },
          null,
          workspaceId
        );
        console.log('✅ Image block data saved to backend');
      } catch (error) {
        console.error('❌ Error auto-saving image block:', error);
      }
    }, 1500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [imageUrl, caption, timestamp, geotag, annotations, imageWidth, workspaceId, nodeId, setNodes]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      formData.append('nodeId', nodeId);
      formData.append('fileType', 'image-block');

      console.log('📤 Uploading image to S3...', {
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
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();
      console.log('✅ Image uploaded successfully:', result);

      // Set the S3 URL as the image URL
      const s3ImageUrl = result.file?.s3Url || result.s3Url || result.url;
      setImageUrl(s3ImageUrl);
      
      // The auto-save effect will persist this to the backend
      
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      setUploadError(error.message || 'Failed to upload image');
      
      // Fallback to base64 for local preview if S3 fails
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setImageUrl(result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const addAnnotation = () => {
    const newAnnotation = {
      id: `ann-${Date.now()}`,
      text: 'New annotation',
      position: 'top-left'
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  const updateAnnotation = (id, field, value) => {
    setAnnotations((prev) =>
      prev.map((annotation) =>
        annotation.id === id ? { ...annotation, [field]: value } : annotation
      )
    );
  };

  const removeAnnotation = (id) => {
    setAnnotations((prev) => prev.filter((annotation) => annotation.id !== id));
  };

  const handlePreview = () => {
    if (!imageUrl) return;
    setShowPreview(true);
  };

  const handleDownload = () => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;

    const match = imageUrl.match(/^data:(image\/[^;]+);/);
    const extension = match ? match[1].split('/')[1] : 'png';
    const sanitizedCaption = caption?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'image-block';
    link.download = `${sanitizedCaption}.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        className="w-[420px] bg-white border-2 border-gray-200 rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-cyan-500" />
            <span className="text-sm font-semibold text-gray-800">Image Block</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!imageUrl}
              className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${imageUrl ? 'text-cyan-700 bg-white/70 hover:bg-white' : 'text-gray-400 bg-white/40 cursor-not-allowed'}`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!imageUrl}
              className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${imageUrl ? 'text-cyan-700 bg-white/70 hover:bg-white' : 'text-gray-400 bg-white/40 cursor-not-allowed'}`}
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>
            <label className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-white rounded-lg ${uploading ? 'bg-cyan-400 cursor-wait' : 'bg-cyan-600 cursor-pointer hover:bg-cyan-700'}`}>
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
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {uploadError}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div
              className="relative w-full bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ padding: '12px' }}
            >
              <div
                className="relative w-full overflow-hidden rounded-lg"
                style={{ width: `${Math.min(Math.max(imageWidth, 40), 100)}%` }}
              >
                <div className="relative w-full aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={caption || 'Uploaded image'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-60" />
                      <p className="text-sm">Upload site photos or design references</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Width</span>
              <input
                type="range"
                min={40}
                max={100}
                value={imageWidth}
                onChange={(e) => setImageWidth(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-10 text-right">{imageWidth}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-gray-600">
              <Clock className="w-4 h-4 text-blue-500" />
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="bg-transparent focus:outline-none text-sm text-gray-900"
              />
            </label>
            <label className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-gray-600">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <input
                type="text"
                value={geotag}
                onChange={(e) => setGeotag(e.target.value)}
                placeholder="Geotag (optional)"
                className="bg-transparent focus:outline-none text-sm text-gray-900"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Caption</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption or notes about this image"
              className="w-full min-h-[72px] border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Annotations</span>
              <button
                type="button"
                onClick={addAnnotation}
                className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-cyan-600 hover:text-cyan-800"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
            <div className="space-y-2">
              {annotations.length === 0 && (
                <p className="text-xs text-gray-400">No annotations yet.</p>
              )}
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="grid grid-cols-[1fr,auto] gap-2 items-start bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                >
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={annotation.text}
                      onChange={(e) => updateAnnotation(annotation.id, 'text', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-100"
                      placeholder="Annotation text"
                    />
                    <select
                      value={annotation.position}
                      onChange={(e) => updateAnnotation(annotation.id, 'position', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-200"
                    >
                      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                        <option key={pos} value={pos}>
                          {formatPositionBadge(pos)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAnnotation(annotation.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPreview && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-4xl w-11/12 max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={imageUrl} alt={caption || 'Preview'} className="w-full h-full object-contain bg-black" />
            {(caption || timestamp || geotag) && (
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-sm px-4 py-3 space-y-1">
                {caption && <p className="font-medium">{caption}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-200">
                  {timestamp && (
                    <span className="inline-flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{timestamp}</span>
                    </span>
                  )}
                  {geotag && (
                    <span className="inline-flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{geotag}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
export default ImageBlockRenderer;