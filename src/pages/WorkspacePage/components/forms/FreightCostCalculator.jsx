import React, { useState } from 'react';
import { DollarSign, Copy, Check } from 'lucide-react';

const FreightCostCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [formData, setFormData] = useState({
    distance: data?.distance || '',
    distanceUnit: data?.distanceUnit || 'km',
    rate: data?.rate || '',
    rateType: data?.rateType || 'per-km',
    fuelSurchargePercent: data?.fuelSurchargePercent || 0,
    tollCharges: data?.tollCharges || 0,
    handlingFee: data?.handlingFee || 0
  });

  const [copied, setCopied] = useState(false);

  const calculateCosts = () => {
    const distance = parseFloat(formData.distance) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const fuelSurchargePercent = parseFloat(formData.fuelSurchargePercent) || 0;
    const tollCharges = parseFloat(formData.tollCharges) || 0;
    const handlingFee = parseFloat(formData.handlingFee) || 0;

    const baseFreightCost = distance * rate;
    const fuelSurcharge = (baseFreightCost * fuelSurchargePercent) / 100;
    const totalFreightCost = baseFreightCost + fuelSurcharge + tollCharges + handlingFee;

    return {
      baseFreightCost: baseFreightCost.toFixed(2),
      fuelSurcharge: fuelSurcharge.toFixed(2),
      tollCharges: tollCharges.toFixed(2),
      handlingFee: handlingFee.toFixed(2),
      totalFreightCost: totalFreightCost.toFixed(2)
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    const costs = calculateCosts();
    setNodes(nodes =>
      nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...formData,
                ...costs
              }
            }
          : node
      )
    );
  };

  const costs = calculateCosts();

  const handleCopyToClipboard = () => {
    const summary = `Freight Cost Summary
Distance: ${formData.distance} ${formData.distanceUnit}
Rate: ${formData.rate}/${formData.rateType}
Base Freight: ₹${costs.baseFreightCost}
Fuel Surcharge (${formData.fuelSurchargePercent}%): ₹${costs.fuelSurcharge}
Toll Charges: ₹${costs.tollCharges}
Handling Fee: ₹${costs.handlingFee}
TOTAL: ₹${costs.totalFreightCost}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-white" />
          <h3 className="text-lg font-bold text-white">Freight Cost Calculator</h3>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-4 border-b space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Distance */}
          <div>
            <label className="text-sm font-medium text-gray-700">Distance</label>
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                name="distance"
                placeholder="0"
                value={formData.distance}
                onChange={handleInputChange}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                min="0"
                step="0.1"
              />
              <select
                name="distanceUnit"
                value={formData.distanceUnit}
                onChange={handleInputChange}
                className="px-2 py-2 border rounded-lg text-sm"
              >
                <option value="km">km</option>
                <option value="miles">miles</option>
              </select>
            </div>
          </div>

          {/* Rate */}
          <div>
            <label className="text-sm font-medium text-gray-700">Rate</label>
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                name="rate"
                placeholder="0"
                value={formData.rate}
                onChange={handleInputChange}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                min="0"
                step="0.01"
              />
              <select
                name="rateType"
                value={formData.rateType}
                onChange={handleInputChange}
                className="px-2 py-2 border rounded-lg text-sm"
              >
                <option value="per-km">per km</option>
                <option value="per-mile">per mile</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charges */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Fuel Surcharge %</label>
            <input
              type="number"
              name="fuelSurchargePercent"
              placeholder="0"
              value={formData.fuelSurchargePercent}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Toll Charges (₹)</label>
            <input
              type="number"
              name="tollCharges"
              placeholder="0"
              value={formData.tollCharges}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Handling Fee (₹)</label>
            <input
              type="number"
              name="handlingFee"
              placeholder="0"
              value={formData.handlingFee}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="p-4 bg-gray-50">
        <h4 className="font-semibold mb-3 text-sm">Cost Breakdown</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Base Freight Cost</span>
            <span className="font-medium">₹{costs.baseFreightCost}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Fuel Surcharge ({formData.fuelSurchargePercent}%)</span>
            <span className="font-medium">₹{costs.fuelSurcharge}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Toll Charges</span>
            <span className="font-medium">₹{costs.tollCharges}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Handling Fee</span>
            <span className="font-medium">₹{costs.handlingFee}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center bg-blue-50 -mx-4 px-4 py-2">
            <span className="font-bold text-blue-900">Total Freight Cost</span>
            <span className="text-lg font-bold text-blue-600">₹{costs.totalFreightCost}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-white border-t flex gap-2 justify-end">
        <button
          onClick={handleCopyToClipboard}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Save Calculation
        </button>
      </div>
    </div>
  );
};

export default FreightCostCalculator;
