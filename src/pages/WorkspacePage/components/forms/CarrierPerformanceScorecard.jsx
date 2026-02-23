import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertCircle, Download } from 'lucide-react';

const CarrierPerformanceScorecard = ({ data, nodeId, workspaceId, setNodes }) => {
  const [performanceData] = useState({
    carrierId: data?.carrierId || 'carrier-001',
    carrierName: data?.carrierName || 'ABC Logistics',
    totalShipments: data?.totalShipments || 127,
    onTimeDeliveries: data?.onTimeDeliveries || 118,
    damageIncidents: data?.damageIncidents || 2,
    onTimeDeliveryPercent: data?.onTimeDeliveryPercent || 92.9,
    damagePercent: data?.damagePercent || 1.6,
    costDeviationPercent: data?.costDeviationPercent || 2.3,
    rating: data?.rating || 4.5,
    performancePeriod: data?.performancePeriod || { startDate: '2024-01-01', endDate: '2024-03-31' },
    trends: data?.trends || [
      { month: 'Jan', onTime: 91, damage: 2.1, costDev: 3.2 },
      { month: 'Feb', onTime: 93, damage: 1.8, costDev: 2.5 },
      { month: 'Mar', onTime: 94, damage: 1.2, costDev: 1.4 }
    ]
  });

  const getPerformanceLevel = (percent) => {
    if (percent >= 90) return { level: 'Excellent', color: 'bg-green-100 text-green-800', border: 'border-green-300' };
    if (percent >= 75) return { level: 'Good', color: 'bg-blue-100 text-blue-800', border: 'border-blue-300' };
    if (percent >= 60) return { level: 'Fair', color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-300' };
    return { level: 'Poor', color: 'bg-red-100 text-red-800', border: 'border-red-300' };
  };

  const getRatingStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < Math.floor(rating) ? '⭐' : '☆'} />
        ))}
      </div>
    );
  };

  const onTimePerf = getPerformanceLevel(performanceData.onTimeDeliveryPercent);
  const damagePerf = getPerformanceLevel(100 - performanceData.damagePercent);
  const costPerf = getPerformanceLevel(100 - performanceData.costDeviationPercent);

  const handleExportPDF = () => {
    // PDF export logic would go here
    console.log('Exporting to PDF...');
  };

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-white" />
            <div>
              <h3 className="text-lg font-bold text-white">{performanceData.carrierName}</h3>
              <p className="text-xs text-indigo-100">Performance Scorecard</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-100">Rating</p>
            <div className="text-lg">{getRatingStars(performanceData.rating)}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Period Info */}
        <div className="text-xs text-gray-600">
          <span>Period: </span>
          <span className="font-medium">
            {new Date(performanceData.performancePeriod.startDate).toLocaleDateString()} -{' '}
            {new Date(performanceData.performancePeriod.endDate).toLocaleDateString()}
          </span>
          <span className="ml-4">Total Shipments: </span>
          <span className="font-medium">{performanceData.totalShipments}</span>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-3 gap-3">
          {/* On-Time Delivery */}
          <div className={`border-2 rounded-lg p-3 ${onTimePerf.border} bg-white`}>
            <p className="text-xs text-gray-600 font-medium mb-1">On-Time Delivery</p>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {performanceData.onTimeDeliveryPercent}%
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${onTimePerf.color}`}>
                {onTimePerf.level}
              </span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {performanceData.onTimeDeliveries}/{performanceData.totalShipments} on time
            </p>
          </div>

          {/* Damage Rate */}
          <div className={`border-2 rounded-lg p-3 ${damagePerf.border} bg-white`}>
            <p className="text-xs text-gray-600 font-medium mb-1">Damage Rate</p>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {performanceData.damagePercent}%
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${damagePerf.color}`}>
                {damagePerf.level}
              </span>
              {performanceData.damagePercent > 2 && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {performanceData.damageIncidents} damaged shipments
            </p>
          </div>

          {/* Cost Deviation */}
          <div className={`border-2 rounded-lg p-3 ${costPerf.border} bg-white`}>
            <p className="text-xs text-gray-600 font-medium mb-1">Cost Deviation</p>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {performanceData.costDeviationPercent}%
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${costPerf.color}`}>
                {costPerf.level}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">vs budget</p>
          </div>
        </div>

        {/* Trend Chart (Simple representation) */}
        <div className="border rounded-lg p-3 bg-gray-50">
          <h4 className="font-semibold text-sm mb-3">Performance Trends (Last 3 Months)</h4>
          <div className="space-y-3">
            {/* On-Time Trend */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">On-Time %</span>
                <span className="text-xs text-gray-600">
                  {performanceData.trends.map(t => t.month).join(' → ')}
                </span>
              </div>
              <div className="flex gap-2 items-end h-12">
                {performanceData.trends.map((trend, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{ height: `${(trend.onTime / 100) * 100}px` }}
                    />
                    <span className="text-xs text-gray-600 mt-1">{trend.onTime}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Damage Trend */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">Damage %</span>
              </div>
              <div className="flex gap-2 items-end h-12">
                {performanceData.trends.map((trend, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-red-500 rounded-t"
                      style={{ height: `${trend.damage * 10}px` }}
                    />
                    <span className="text-xs text-gray-600 mt-1">{trend.damage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Deviation Trend */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">Cost Deviation %</span>
              </div>
              <div className="flex gap-2 items-end h-12">
                {performanceData.trends.map((trend, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-orange-500 rounded-t"
                      style={{ height: `${trend.costDev * 10}px` }}
                    />
                    <span className="text-xs text-gray-600 mt-1">{trend.costDev}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Box */}
        <div className="border rounded-lg p-3 bg-indigo-50 border-indigo-200">
          <p className="text-xs font-semibold text-indigo-900 mb-2">Summary</p>
          <ul className="space-y-1 text-xs text-indigo-800">
            <li>✓ Consistent performance across metrics</li>
            <li>✓ Rating: {performanceData.rating}/5.0 stars</li>
            <li>✓ Recommended for {performanceData.totalShipments > 100 ? 'Critical' : 'Standard'} shipments</li>
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t flex gap-2 justify-end">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>
    </div>
  );
};

export default CarrierPerformanceScorecard;
