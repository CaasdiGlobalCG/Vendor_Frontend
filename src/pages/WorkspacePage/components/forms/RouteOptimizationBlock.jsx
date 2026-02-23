import React, { useState } from 'react';
import { MapPin, Zap, DollarSign, Clock, CheckCircle } from 'lucide-react';

const RouteOptimizationBlock = ({ data, nodeId, workspaceId, setNodes }) => {
  const [routes] = useState(data?.routes || [
    {
      routeId: 'route-1',
      name: 'Express Highway Route',
      distance: 245,
      estimatedTime: 5.5,
      estimatedCost: 3675,
      trafficCondition: 'low',
      tollRoads: true,
      recommended: true
    },
    {
      routeId: 'route-2',
      name: 'Scenic Bypass Route',
      distance: 280,
      estimatedTime: 6.2,
      estimatedCost: 4200,
      trafficCondition: 'moderate',
      tollRoads: false,
      recommended: false
    },
    {
      routeId: 'route-3',
      name: 'City Roads Route',
      distance: 215,
      estimatedTime: 7.8,
      estimatedCost: 3225,
      trafficCondition: 'high',
      tollRoads: false,
      recommended: false
    }
  ]);

  const [selectedRoute, setSelectedRoute] = useState(data?.selectedRoute || 'route-1');

  const handleSelectRoute = (routeId) => {
    setSelectedRoute(routeId);
    setNodes(nodes =>
      nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                selectedRoute: routeId,
                routes
              }
            }
          : node
      )
    );
  };

  const getTrafficIcon = (condition) => {
    switch (condition) {
      case 'low':
        return '🟢';
      case 'moderate':
        return '🟡';
      case 'high':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getTrafficColor = (condition) => {
    switch (condition) {
      case 'low':
        return 'bg-green-50 border-green-200';
      case 'moderate':
        return 'bg-yellow-50 border-yellow-200';
      case 'high':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-white" />
          <h3 className="text-lg font-bold text-white">Route Optimization</h3>
        </div>
      </div>

      {/* Routes Comparison */}
      <div className="p-4 space-y-3">
        {routes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No routes available</p>
          </div>
        ) : (
          routes.map((route) => (
            <div
              key={route.routeId}
              onClick={() => handleSelectRoute(route.routeId)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedRoute === route.routeId
                  ? 'border-purple-500 bg-purple-50'
                  : `${getTrafficColor(route.trafficCondition)} hover:border-purple-300`
              }`}
            >
              {/* Route Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  {selectedRoute === route.routeId && (
                    <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900">{route.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-gray-600">
                        {getTrafficIcon(route.trafficCondition)} {route.trafficCondition.toUpperCase()}
                      </span>
                      {route.tollRoads && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Toll Roads
                        </span>
                      )}
                      {route.recommended && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          ⭐ Recommended
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">Distance</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{route.distance} km</p>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">ETA</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{route.estimatedTime}h</p>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <p className="text-xs text-gray-600 font-medium">Estimated Cost</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">₹{route.estimatedCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {selectedRoute && (
        <div className="p-4 bg-purple-50 border-t border-purple-200">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900">
                {routes.find(r => r.routeId === selectedRoute)?.name} selected
              </p>
              <p className="text-xs text-purple-700 mt-1">
                This route will take approximately {routes.find(r => r.routeId === selectedRoute)?.estimatedTime}
                {' '}hours and cost around ₹{routes.find(r => r.routeId === selectedRoute)?.estimatedCost.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizationBlock;
