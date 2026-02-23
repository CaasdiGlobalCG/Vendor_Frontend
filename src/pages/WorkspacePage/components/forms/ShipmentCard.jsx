import React, { useState } from 'react';
import { MapPin, Truck, Clock, CheckCircle, AlertCircle, Calendar, Edit2, Save, X } from 'lucide-react';

const ShipmentCard = ({ data, nodeId, workspaceId, setNodes }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    origin: data?.origin || { address: '', city: '', postalCode: '' },
    destination: data?.destination || { address: '', city: '', postalCode: '' },
    vehicleId: data?.vehicleId || '',
    eta: data?.eta || '',
    actualDelivery: data?.actualDelivery || '',
    status: data?.status || 'pending',
    carrier: data?.carrier || '',
    trackingNumber: data?.trackingNumber || '',
    weight: data?.weight || '',
    notes: data?.notes || ''
  });

  const [statusTimeline] = useState(data?.statusTimeline || [
    { status: 'pending', timestamp: new Date().toISOString(), notes: 'Shipment created' }
  ]);

  const handleInputChange = (e, section = null) => {
    const { name, value } = e.target;
    
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = () => {
    // Add new timeline entry
    const newTimeline = [
      ...statusTimeline,
      {
        status: formData.status,
        timestamp: new Date().toISOString(),
        notes: `Status updated to ${formData.status}`
      }
    ];

    setNodes(nodes =>
      nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                origin: formData.origin,
                destination: formData.destination,
                vehicleId: formData.vehicleId,
                eta: formData.eta,
                actualDelivery: formData.actualDelivery,
                status: formData.status,
                carrier: formData.carrier,
                trackingNumber: formData.trackingNumber,
                weight: formData.weight,
                notes: formData.notes,
                statusTimeline: newTimeline
              }
            }
          : node
      )
    );
    setIsEditing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in-transit':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'delayed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-50 border-green-200';
      case 'in-transit':
        return 'bg-blue-50 border-blue-200';
      case 'delayed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isEditing) {
    return (
      <div className="w-full bg-white p-6 rounded-lg border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Edit Shipment</h3>
          <button
            onClick={() => setIsEditing(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Origin */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-2">📍 Origin</h4>
            <input
              type="text"
              placeholder="Address"
              name="address"
              value={formData.origin.address}
              onChange={(e) => handleInputChange(e, 'origin')}
              className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"
            />
            <input
              type="text"
              placeholder="City"
              name="city"
              value={formData.origin.city}
              onChange={(e) => handleInputChange(e, 'origin')}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Destination */}
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-2">📍 Destination</h4>
            <input
              type="text"
              placeholder="Address"
              name="address"
              value={formData.destination.address}
              onChange={(e) => handleInputChange(e, 'destination')}
              className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"
            />
            <input
              type="text"
              placeholder="City"
              name="city"
              value={formData.destination.city}
              onChange={(e) => handleInputChange(e, 'destination')}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Shipment Details */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Vehicle ID"
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Tracking Number"
              name="trackingNumber"
              value={formData.trackingNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Carrier"
              name="carrier"
              value={formData.carrier}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Weight (kg)"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Time Fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ETA</label>
            <input
              type="datetime-local"
              name="eta"
              value={formData.eta}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <label className="text-sm font-medium">Actual Delivery</label>
            <input
              type="datetime-local"
              name="actualDelivery"
              value={formData.actualDelivery}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          {/* Notes */}
          <textarea
            placeholder="Additional notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-lg text-sm h-20"
          />

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`border-2 p-4 ${getStatusColor(formData.status)}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(formData.status)}
            <h3 className="text-lg font-bold capitalize">{formData.status} Shipment</h3>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-gray-200 rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Route Overview */}
        <div className="border rounded-lg p-3">
          <div className="text-sm">
            <div className="mb-2">
              <span className="font-semibold">📍 From:</span>
              <p className="text-gray-700">{formData.origin.address}, {formData.origin.city}</p>
            </div>
            <div className="mb-2">
              <span className="font-semibold">→</span>
            </div>
            <div>
              <span className="font-semibold">📍 To:</span>
              <p className="text-gray-700">{formData.destination.address}, {formData.destination.city}</p>
            </div>
          </div>
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded p-2">
            <p className="text-xs text-gray-600 font-medium">Vehicle ID</p>
            <p className="text-sm font-semibold">{formData.vehicleId || 'N/A'}</p>
          </div>
          <div className="border rounded p-2">
            <p className="text-xs text-gray-600 font-medium">Carrier</p>
            <p className="text-sm font-semibold">{formData.carrier || 'N/A'}</p>
          </div>
          <div className="border rounded p-2">
            <p className="text-xs text-gray-600 font-medium">Weight</p>
            <p className="text-sm font-semibold">{formData.weight ? `${formData.weight} kg` : 'N/A'}</p>
          </div>
          <div className="border rounded p-2">
            <p className="text-xs text-gray-600 font-medium">Tracking #</p>
            <p className="text-sm font-semibold">{formData.trackingNumber || 'N/A'}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="border rounded-lg p-3">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Timeline
          </h4>
          <div className="space-y-2">
            {formData.eta && (
              <div className="text-sm">
                <span className="text-gray-600">⏰ ETA: </span>
                <span className="font-medium">{new Date(formData.eta).toLocaleString()}</span>
              </div>
            )}
            {formData.actualDelivery && (
              <div className="text-sm">
                <span className="text-gray-600">✓ Delivered: </span>
                <span className="font-medium">{new Date(formData.actualDelivery).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status History */}
        {statusTimeline.length > 0 && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-semibold mb-2 text-sm">Status History</h4>
            <div className="space-y-1 text-xs">
              {statusTimeline.slice(-3).map((entry, idx) => (
                <div key={idx} className="text-gray-600">
                  <span className="font-medium capitalize">{entry.status}</span>
                  <span className="text-gray-500"> - {new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {formData.notes && (
          <div className="border rounded-lg p-3 bg-blue-50">
            <p className="text-xs font-medium text-gray-600 mb-1">Notes</p>
            <p className="text-sm">{formData.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentCard;
