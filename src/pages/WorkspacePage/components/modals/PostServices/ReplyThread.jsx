import React, { useState } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';
import ImageModal from './ImageModal';

const ReplyThread = ({ post, renderTextWithHighlights, formatSizeMB }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleImageClick = (attachment) => {
    setSelectedImage(attachment);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  if (!post.replies || post.replies.length === 0) return null;

  return (
    <div className="px-3 pb-3 border-t border-line">
      <div className="mt-2 space-y-2">
        {post.replies.map((reply) => (
          <div key={reply.id} className="flex items-start space-x-2 pl-4 border-l-2 border-line">
            <div className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center flex-shrink-0">
              <User className="w-2.5 h-2.5 text-dim" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5 mb-0.5">
                <span className="text-[11px] font-medium text-ink">{reply.author.name}</span>
                <span className="text-[10px] text-dim bg-surface-hover px-1 py-0.5 rounded-full">{reply.author.role}</span>
                <span className="text-[10px] text-dim">•</span>
                <span className="text-[10px] text-dim">{reply.dateLabel}</span>
              </div>
              <div className="text-[11px] text-ink leading-relaxed">
                {renderTextWithHighlights(reply.text)}
              </div>
              
              {/* Reply Attachments */}
              {reply.attachments && reply.attachments.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] text-dim mb-1">
                    Attachments ({reply.attachments.length})
                  </div>
                  <div className="space-y-2">
                    {reply.attachments.map((attachment, index) => (
                      <div key={index} className="border border-line rounded overflow-hidden">
                        {attachment.fileType?.startsWith('image/') ? (
                          <div 
                            className="cursor-pointer"
                            onClick={() => handleImageClick(attachment)}
                          >
                            <img 
                              src={attachment.fileUrl} 
                              alt={attachment.fileName} 
                              className="w-full max-h-24 object-cover hover:opacity-90 transition-opacity" 
                            />
                          </div>
                        ) : (
                          <div className="h-16 bg-surface-hover flex items-center justify-center">
                            <ImageIcon className="w-3 h-3 text-dim" />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-dim px-2 py-1 bg-canvas">
                          <span className="truncate">{attachment.fileName}</span>
                          <span>{formatSizeMB(attachment.fileSize)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Image Modal for reply attachments */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        imageUrl={selectedImage?.fileUrl}
        fileName={selectedImage?.fileName}
        fileSize={selectedImage?.fileSize}
      />
    </div>
  );
};

export default ReplyThread;
