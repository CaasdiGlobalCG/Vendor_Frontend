import React, { useState, useRef } from 'react';
import { Upload, Camera, CheckCircle, Trash2 } from 'lucide-react';

const ProofOfDeliveryBlock = ({ data, nodeId, workspaceId, setNodes }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(data?.signature?.imageUrl || null);
  const [photos, setPhotos] = useState(data?.photos || []);
  const [formData, setFormData] = useState({
    recipientName: data?.recipientName || '',
    deliveryNotes: data?.deliveryNotes || '',
    timestamp: data?.timestamp || new Date().toISOString()
  });

  // Signature Pad Methods
  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignatureData(null);
    }
  };

  const saveSignature = () => {
    if (canvasRef.current) {
      const imageData = canvasRef.current.toDataURL('image/png');
      setSignatureData(imageData);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto = {
          id: Date.now(),
          url: event.target.result,
          timestamp: new Date().toISOString(),
          description: ''
        };
        setPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    setNodes(nodes =>
      nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...formData,
                signature: signatureData ? { imageUrl: signatureData, type: 'canvas' } : null,
                photos,
                deliveryConfirmed: !!signatureData || photos.length > 0
              }
            }
          : node
      )
    );
  };

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-white" />
          <h3 className="text-lg font-bold text-white">Proof of Delivery (POD)</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Recipient Info */}
        <div>
          <label className="text-sm font-medium text-gray-700">Recipient Name</label>
          <input
            type="text"
            name="recipientName"
            placeholder="Enter recipient name"
            value={formData.recipientName}
            onChange={handleInputChange}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        {/* Signature Pad */}
        <div className="border rounded-lg p-3 bg-gray-50">
          <h4 className="font-semibold mb-2 text-sm">📝 Signature</h4>
          <div className="border-2 border-dashed border-gray-300 rounded bg-white mb-2">
            <canvas
              ref={canvasRef}
              width={480}
              height={160}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full cursor-crosshair bg-white rounded"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveSignature}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              Save Signature
            </button>
            <button
              onClick={clearSignature}
              className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
            >
              Clear
            </button>
          </div>
          {signatureData && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Signature captured
            </div>
          )}
        </div>

        {/* Photo Upload */}
        <div className="border rounded-lg p-3 bg-gray-50">
          <h4 className="font-semibold mb-2 text-sm">📸 Photos</h4>
          <label className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">Click to upload photos</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {photos.map(photo => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.url}
                    alt="POD"
                    className="w-full h-24 object-cover rounded border border-gray-200"
                  />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(photo.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Notes */}
        <div>
          <label className="text-sm font-medium text-gray-700">Delivery Notes</label>
          <textarea
            name="deliveryNotes"
            placeholder="Add any additional delivery notes or comments"
            value={formData.deliveryNotes}
            onChange={handleInputChange}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-24"
          />
        </div>

        {/* Timestamp */}
        <div>
          <p className="text-xs text-gray-600 font-medium">Delivery Time</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {new Date(formData.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Status Summary */}
        <div className="border rounded-lg p-3 bg-green-50 border-green-200">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Delivery Confirmation</p>
              <div className="mt-1 space-y-1 text-xs text-green-800">
                <p>✓ Signature: {signatureData ? 'Captured' : 'Pending'}</p>
                <p>✓ Photos: {photos.length > 0 ? `${photos.length} captured` : 'No photos'}</p>
                <p>✓ Recipient: {formData.recipientName || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t flex gap-2 justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
        >
          Save POD
        </button>
      </div>
    </div>
  );
};

export default ProofOfDeliveryBlock;
