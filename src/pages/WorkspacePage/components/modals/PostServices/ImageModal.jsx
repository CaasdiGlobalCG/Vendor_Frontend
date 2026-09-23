import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const ImageModal = ({ isOpen, onClose, imageUrl, fileName, fileSize }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-full bg-surface rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line bg-canvas">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center">
              <img src={imageUrl} alt="Preview" className="w-6 h-6 rounded-full object-cover" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-ink truncate max-w-xs">
                {fileName || 'Image'}
              </h3>
              {fileSize && (
                <p className="text-xs text-dim">
                  {(fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-dim hover:text-ink hover:bg-surface-hover rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="p-2 text-dim hover:text-ink hover:bg-surface-hover rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-dim hover:text-ink hover:bg-surface-hover rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="flex items-center justify-center p-4 bg-surface-hover">
          <div className="max-w-full max-h-[70vh] flex items-center justify-center">
            <img
              src={imageUrl}
              alt={fileName || 'Image'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              style={{ maxHeight: '70vh' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-canvas">
          <div className="flex items-center justify-between">
            <div className="text-xs text-dim">
              Click outside or press ESC to close
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-xs bg-info text-white rounded-md hover:bg-info transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs bg-cta text-cta-foreground rounded-md hover:bg-cta transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
