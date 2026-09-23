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
        return 'bg-success/10 border-success/20';
      case 'moderate':
        return 'bg-warning/10 border-warning/20';
      case 'high':
        return 'bg-danger/10 border-danger/20';
      default:
        return 'bg-canvas border-line';
    }
  };

  return (
    <div className="w-full bg-surface rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-black p-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-white" />
          <h3 className="text-lg font-bold text-white">Route Optimization</h3>
        </div>
      </div>

      {/* Routes Comparison */}
      <div className="p-4 space-y-3">
        {routes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-dim">No routes available</p>
          </div>
        ) : (
          routes.map((route) => (
            <div
              key={route.routeId}
              onClick={() => handleSelectRoute(route.routeId)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedRoute === route.routeId
                  ? 'border-line bg-surface-hover'
                  : `${getTrafficColor(route.trafficCondition)} hover:border-line`
              }`}
            >
              {/* Route Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  {selectedRoute === route.routeId && (
                    <CheckCircle className="w-5 h-5 text-ink flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="font-semibold text-ink">{route.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-dim">
                        {getTrafficIcon(route.trafficCondition)} {route.trafficCondition.toUpperCase()}
                      </span>
                      {route.tollRoads && (
                        <span className="text-xs bg-info/10 text-info px-2 py-1 rounded">
                          Toll Roads
                        </span>
                      )}
                      {route.recommended && (
                        <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">
                          ⭐ Recommended
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface p-3 rounded border border-line">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-dim" />
                    <p className="text-xs text-dim font-medium">Distance</p>
                  </div>
                  <p className="text-lg font-bold text-ink">{route.distance} km</p>
                </div>

                <div className="bg-surface p-3 rounded border border-line">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-dim" />
                    <p className="text-xs text-dim font-medium">ETA</p>
                  </div>
                  <p className="text-lg font-bold text-ink">{route.estimatedTime}h</p>
                </div>

                <div className="bg-surface p-3 rounded border border-line">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-dim" />
                    <p className="text-xs text-dim font-medium">Estimated Cost</p>
                  </div>
                  <p className="text-lg font-bold text-ink">₹{route.estimatedCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {selectedRoute && (
        <div className="p-4 bg-surface-hover border-t border-line">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-ink flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">
                {routes.find(r => r.routeId === selectedRoute)?.name} selected
              </p>
              <p className="text-xs text-ink mt-1">
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
