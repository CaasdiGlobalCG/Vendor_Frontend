import React, { useState } from 'react';
import { AlertTriangle, DollarSign, TrendingDown } from 'lucide-react';

const REASON_CODES = [
  'Traffic Congestion',
  'Vehicle Breakdown',
  'Bad Weather',
  'Accident',
  'Documentation Issue',
  'Customs/Compliance',
  'Mechanical Failure',
  'Driver Issue',
  'Other'
];

const PENALTY_RATES = {
  'Traffic Congestion': 50,
  'Vehicle Breakdown': 150,
  'Bad Weather': 75,
  'Accident': 500,
  'Documentation Issue': 100,
  'Customs/Compliance': 200,
  'Mechanical Failure': 250,
  'Driver Issue': 300,
  'Other': 100
};

const ExceptionDelayReport = ({ data, nodeId, workspaceId, setNodes }) => {
  const [formData, setFormData] = useState({
    reasonCode: data?.reasonCode || '',
    description: data?.description || '',
    delayDuration: data?.delayDuration || '',
    delayUnit: data?.delayUnit || 'hours',
    resolution: data?.resolution || '',
    attachmentUrl: data?.attachmentUrl || null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculatePenalty = () => {
    const baseRate = PENALTY_RATES[formData.reasonCode] || 0;
    const delayAmount = parseFloat(formData.delayDuration) || 0;
    
    let multiplier = 1;
    if (formData.delayUnit === 'minutes') {
      multiplier = delayAmount / 60; // Convert to hours
    } else if (formData.delayUnit === 'days') {
      multiplier = delayAmount * 24;
    } else {
      multiplier = delayAmount; // hours
    }

    return (baseRate * multiplier).toFixed(2);
  };

  const handleSave = () => {
    const penalty = calculatePenalty();
    setNodes(nodes =>
      nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...formData,
                autoPenaltyAmount: penalty,
                penaltyReason: `${formData.reasonCode} - ${formData.delayDuration}${formData.delayUnit.charAt(0)} delay`,
                timestamp: new Date().toISOString()
              }
            }
          : node
      )
    );
  };

  const penalty = calculatePenalty();

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-white" />
          <h3 className="text-lg font-bold text-white">Exception & Delay Report</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Reason Code */}
        <div>
          <label className="text-sm font-medium text-gray-700">Reason Code *</label>
          <select
            name="reasonCode"
            value={formData.reasonCode}
            onChange={handleInputChange}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Select a reason...</option>
            {REASON_CODES.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            placeholder="Describe the issue in detail"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-20"
          />
        </div>

        {/* Delay Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Delay Duration *</label>
            <input
              type="number"
              name="delayDuration"
              placeholder="0"
              value={formData.delayDuration}
              onChange={handleInputChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              min="0"
              step="0.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Unit</label>
            <select
              name="delayUnit"
              value={formData.delayUnit}
              onChange={handleInputChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>

        {/* Penalty Calculation */}
        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">Penalty Calculation</h4>
              <div className="space-y-1 text-sm text-red-800">
                <p>
                  <span className="font-medium">Reason:</span>{' '}
                  {formData.reasonCode || 'Not selected'}
                </p>
                <p>
                  <span className="font-medium">Base Rate:</span> ₹
                  {PENALTY_RATES[formData.reasonCode] || 0}/hour
                </p>
                <p>
                  <span className="font-medium">Delay Duration:</span>{' '}
                  {formData.delayDuration || 0} {formData.delayUnit}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-red-300 flex items-center justify-between">
                <span className="font-bold text-red-900">Auto-Calculated Penalty:</span>
                <span className="text-2xl font-bold text-red-600">₹{penalty}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-sm font-medium text-gray-700">Resolution / Notes</label>
          <textarea
            name="resolution"
            placeholder="How was this issue resolved?"
            value={formData.resolution}
            onChange={handleInputChange}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-20"
          />
        </div>

        {/* Status Summary */}
        <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
          <p className="text-xs font-semibold text-yellow-900 mb-2">Report Status</p>
          <div className="space-y-1 text-xs text-yellow-800">
            <p>
              ✓ Reason: {formData.reasonCode ? '✓ Provided' : '⊘ Required'}
            </p>
            <p>
              ✓ Delay Duration: {formData.delayDuration ? '✓ Provided' : '⊘ Required'}
            </p>
            <p>✓ Penalty: ₹{penalty}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t flex gap-2 justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          disabled={!formData.reasonCode || !formData.delayDuration}
        >
          Submit Report
        </button>
      </div>
    </div>
  );
};

export default ExceptionDelayReport;
