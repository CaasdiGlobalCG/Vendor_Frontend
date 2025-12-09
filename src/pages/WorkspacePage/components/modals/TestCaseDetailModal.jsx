import React, { useState, useEffect } from 'react';
import { X, User, FileText, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import config from '../../../../config/env';

const TestCaseDetailModal = ({ isOpen, onClose, testCase }) => {
  const [signedUrls, setSignedUrls] = useState({});
  const [loadingUrls, setLoadingUrls] = useState(new Set());
  const [previewImage, setPreviewImage] = useState(null);

  if (!isOpen || !testCase) return null;

  // Function to get signed URL for a file
  const getSignedUrl = async (file) => {
    if (signedUrls[file.id]) {
      return signedUrls[file.id];
    }

    if (loadingUrls.has(file.id)) {
      return null; // Already loading
    }

    try {
      setLoadingUrls(prev => new Set([...prev, file.id]));
      console.log('🔗 Fetching signed URL for:', file.name, file.s3Key);

      const response = await fetch('/api/workspace-files/view-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          s3Key: file.s3Key
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got signed URL for:', file.name, data.viewUrl);
        
        setSignedUrls(prev => ({
          ...prev,
          [file.id]: data.viewUrl
        }));
        
        return data.viewUrl;
      } else {
        console.error('❌ Failed to get signed URL:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting signed URL:', error);
      return null;
    } finally {
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  // Load signed URLs when modal opens or test case changes
  useEffect(() => {
    if (isOpen && testCase && Array.isArray(testCase.evidenceFiles)) {
      testCase.evidenceFiles.forEach(file => {
        if (file.type?.startsWith('image/') && !signedUrls[file.id] && !loadingUrls.has(file.id)) {
          getSignedUrl(file);
        }
      });
    }
  }, [isOpen, testCase]);

  // Handle image click for preview
  const handleImageClick = (file) => {
    const imageUrl = signedUrls[file.id] || file.url;
    setPreviewImage({
      url: imageUrl,
      name: file.name,
      file: file
    });
  };

  // Close image preview
  const closeImagePreview = () => {
    setPreviewImage(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending':
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-[9999] flex justify-end" onClick={handleBackdropClick}>
      <div className="bg-white shadow-2xl w-full max-w-md h-full flex flex-col transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getStatusIcon(testCase.status)}
            <h2 className="text-xl font-semibold text-gray-900">{testCase.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Description with Date */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {testCase.description || 'Foundation testing - phase 1'}
            </h3>
            <div className="flex items-center text-gray-500 text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{formatDate()}</span>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(testCase.status)}`}>
                {testCase.status.charAt(0).toUpperCase() + testCase.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Tester Information */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Tester</span>
              </div>
              <div className="text-gray-900 font-medium">{testCase.tester || 'QA team Alpha'}</div>
            </div>
          </div>

          {/* Evidence Section */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Evidence</span>
              </div>
              <div className="text-gray-900 font-medium mb-3">
                {Array.isArray(testCase.evidenceFiles) ? testCase.evidenceFiles.length : 0} files
              </div>

              {/* Evidence Files Grid */}
              {Array.isArray(testCase.evidenceFiles) && testCase.evidenceFiles.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {testCase.evidenceFiles.map((file, index) => {
                    const signedUrl = signedUrls[file.id];
                    const isLoadingUrl = loadingUrls.has(file.id);
                    
                    
                    return (
                      <div key={file.id || index} className="relative group">
                        {file.type?.startsWith('image/') ? (
                          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-sm">
                            {isLoadingUrl ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            ) : signedUrl ? (
                              <img
                                src={signedUrl}
                                alt={file.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                onClick={() => handleImageClick(file)}
                                onError={(e) => {
                                  console.error('❌ Signed URL failed, trying direct URL:', {
                                    signedUrl: e.target.src,
                                    directUrl: file.url,
                                    file: file.name
                                  });
                                  // Fallback to direct URL if signed URL fails
                                  e.target.src = file.url;
                                }}
                                onLoad={() => {
                                  console.log('✅ Image loaded successfully:', file.name);
                                }}
                              />
                            ) : file.url ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                onClick={() => handleImageClick(file)}
                                onError={(e) => {
                                  console.error('❌ Direct URL also failed:', {
                                    src: e.target.src,
                                    file: file.name,
                                    url: file.url
                                  });
                                }}
                                onLoad={() => {
                                  console.log('✅ Direct URL image loaded successfully:', file.name);
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                  <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                  <p className="text-xs text-gray-600">Loading image...</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                            <div className="text-center">
                              <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                              <p className="text-xs text-gray-600 truncate px-2">{file.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No evidence files uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Full-Screen Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]">
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Image */}
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={closeImagePreview}
            />
            
            {/* Image name overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
              <p className="text-sm font-medium">{previewImage.name}</p>
            </div>
          </div>
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={closeImagePreview}
          />
        </div>
      )}
    </div>
  );
};

export default TestCaseDetailModal;
