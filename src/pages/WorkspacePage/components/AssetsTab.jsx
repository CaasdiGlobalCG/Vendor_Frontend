import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Upload, Trash2, AlertCircle, Check } from 'lucide-react';

const AssetsTab = ({ selectedSubtask, workspaceId }) => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [assets, setAssets] = useState({
    images: [],
    documents: [],
    icons: [],
    fonts: []
  });
  const [uploading, setUploading] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'images', name: 'Images', label: 'IMG', bgColor: 'bg-info/10', textColor: 'text-info', ext: ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    { id: 'documents', name: 'Documents', label: 'DOC', bgColor: 'bg-success/10', textColor: 'text-success', ext: ['.pdf', '.doc', '.docx'] },
    { id: 'icons', name: 'Icons', label: 'ICON', bgColor: 'bg-surface-hover', textColor: 'text-ink', ext: ['.svg', '.png', '.jpeg'] },
    { id: 'fonts', name: 'Fonts', label: 'FONT', bgColor: 'bg-warning/10', textColor: 'text-warning', ext: ['.ttf', '.otf', '.woff', '.woff2'] }
  ];

  // Load subtask assets on mount
  useEffect(() => {
    if (workspaceId && selectedSubtask?.id) {
      loadSubtaskAssets();
    }
  }, [workspaceId, selectedSubtask?.id]);

  const loadSubtaskAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets/subtask/${workspaceId}/${selectedSubtask.id}`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || {
          images: [],
          documents: [],
          icons: [],
          fonts: []
        });
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedSubtask) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-sm text-dim">Select a subtask to view/manage assets</p>
      </div>
    );
  }

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleUploadAsset = (categoryId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      
      setUploading(prev => ({
        ...prev,
        [categoryId]: true
      }));

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('subtaskId', selectedSubtask.id);
          formData.append('workspaceId', workspaceId);
          formData.append('category', categoryId);

          const response = await fetch('/api/assets/upload', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            const newAsset = {
              id: data.asset.id,
              name: data.asset.name,
              size: data.asset.size,
              type: data.asset.type,
              s3Key: data.asset.s3Key,
              s3Url: data.asset.s3Url,
              uploadedAt: data.asset.uploadedAt
            };

            setAssets(prev => ({
              ...prev,
              [categoryId]: [...prev[categoryId], newAsset]
            }));

            setUploadStatus(prev => ({
              ...prev,
              [file.name]: 'success'
            }));

            setTimeout(() => {
              setUploadStatus(prev => ({
                ...prev,
                [file.name]: null
              }));
            }, 2000);
          } else {
            const error = await response.json();
            console.error('Upload error:', error);
            setUploadStatus(prev => ({
              ...prev,
              [file.name]: 'error'
            }));
          }
        } catch (error) {
          console.error('Upload error:', error);
          setUploadStatus(prev => ({
            ...prev,
            [file.name]: 'error'
          }));
        }
      }

      setUploading(prev => ({
        ...prev,
        [categoryId]: false
      }));
    };
    input.click();
  };

  const handleDeleteAsset = async (categoryId, asset) => {
    try {
      const response = await fetch('/api/assets/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          s3Key: asset.s3Key,
          workspaceId,
          assetId: asset.assetId
        })
      });

      if (response.ok) {
        setAssets(prev => ({
          ...prev,
          [categoryId]: prev[categoryId].filter(a => a.id !== asset.id)
        }));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDragStart = (e, asset, categoryId) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('asset', JSON.stringify({
      ...asset,
      category: categoryId
    }));
  };

  const getFilePreview = (asset, categoryId) => {
    if (categoryId === 'images' && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(asset.type)) {
      return (
        <img 
          src={asset.s3Url} 
          alt={asset.name} 
          className="w-8 h-8 rounded object-cover"
        />
      );
    }
    if (categoryId === 'icons' && ['image/svg+xml', 'image/png', 'image/jpeg'].includes(asset.type)) {
      return (
        <img 
          src={asset.s3Url} 
          alt={asset.name} 
          className="w-8 h-8 rounded object-cover"
        />
      );
    }
    if (asset.type === 'application/pdf') {
      return <div className="w-8 h-8 bg-danger/10 rounded flex items-center justify-center text-xs text-danger">PDF</div>;
    }
    return <div className="w-8 h-8 bg-surface-hover rounded flex items-center justify-center text-xs text-dim">FILE</div>;
  };

  return (
    <div className="flex-1 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ink">Assets</h3>
        <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
          <Plus className="w-5 h-5 text-ink" />
        </button>
      </div>
      
      {/* Subtask Context */}
      <div className="mb-4">
        <div className="p-3 bg-surface-hover border-2 border-line rounded-lg">
          <span className="text-sm font-medium text-ink">{selectedSubtask.title} Assets</span>
        </div>
      </div>

      {/* Info Text */}
      <div className="text-xs text-dim mb-3 bg-info/10 border border-info/20 rounded p-2">
        💡 Subtask-specific assets. Drag to canvas to use.
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-info"></div>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {categories.map(category => (
            <div key={category.id} className="border border-line rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-3 bg-canvas hover:bg-surface-hover transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {expandedCategories[category.id] ? (
                    <ChevronDown className="w-4 h-4 text-dim" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-dim" />
                  )}
                  <div className={`w-10 h-10 ${category.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className={`text-xs font-semibold ${category.textColor}`}>{category.label}</span>
                  </div>
                  <span className="text-sm font-medium text-ink">{category.name}</span>
                  <span className="text-xs bg-surface-hover text-ink px-2 py-0.5 rounded-full">
                    {assets[category.id].length}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUploadAsset(category.id);
                  }}
                  disabled={uploading[category.id]}
                  className="p-1.5 hover:bg-info/10 rounded transition-colors disabled:opacity-50"
                  title="Upload assets"
                >
                  {uploading[category.id] ? (
                    <div className="w-4 h-4 border-2 border-info border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-4 h-4 text-info" />
                  )}
                </button>
              </button>

              {/* Expanded Content */}
              {expandedCategories[category.id] && (
                <div className="p-3 bg-surface border-t border-line">
                  {assets[category.id].length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-dim mb-2">No assets yet</p>
                      <button
                        onClick={() => handleUploadAsset(category.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-info/10 text-info hover:bg-info/10 rounded transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        Upload
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assets[category.id].map(asset => (
                        <div
                          key={asset.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, asset, category.id)}
                          className="flex items-center justify-between p-2 bg-canvas hover:bg-info/10 rounded transition-colors cursor-move border border-transparent hover:border-info/30"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getFilePreview(asset, category.id)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-ink truncate">{asset.name}</p>
                              <p className="text-xs text-dim">{asset.size} KB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            {uploadStatus[asset.name] === 'success' && (
                              <Check className="w-3.5 h-3.5 text-success" />
                            )}
                            {uploadStatus[asset.name] === 'error' && (
                              <AlertCircle className="w-3.5 h-3.5 text-danger" />
                            )}
                            <button
                              onClick={() => handleDeleteAsset(category.id, asset)}
                              className="p-1.5 hover:bg-danger/10 rounded transition-colors"
                              title="Delete asset"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-danger" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetsTab;
