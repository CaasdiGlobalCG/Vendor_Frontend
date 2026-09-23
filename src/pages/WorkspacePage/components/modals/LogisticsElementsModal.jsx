import React, { useState } from 'react';
import { X, Package, Truck, Route, FileCheck, AlertCircle, BarChart3, ChevronLeft } from 'lucide-react';
import ShipmentCard from '../forms/ShipmentCard';
import FreightCostCalculator from '../forms/FreightCostCalculator';
import RouteOptimizationBlock from '../forms/RouteOptimizationBlock';
import ProofOfDeliveryBlock from '../forms/ProofOfDeliveryBlock';
import ExceptionDelayReport from '../forms/ExceptionDelayReport';
import CarrierPerformanceScorecard from '../forms/CarrierPerformanceScorecard';

const LogisticsElementsModal = ({ isOpen, onClose, onAddToCanvas, workspaceId }) => {
  const [currentStep, setCurrentStep] = useState('selection'); // 'selection' or 'preview'
  const [selectedElement, setSelectedElement] = useState(null);

  const logisticsElements = [
    {
      id: 'logistics-shipment',
      name: 'Shipment Card',
      description: 'Track shipment lifecycle from origin to delivery with status updates',
      icon: <Package className="w-6 h-6 text-info" />,
      category: 'Tracking',
      features: ['Origin/Destination tracking', 'Vehicle ID & ETA', 'Status timeline', 'Delivery confirmation']
    },
    {
      id: 'logistics-freight-cost',
      name: 'Freight Cost Calculator',
      description: 'Calculate freight costs with fuel surcharge, tolls, and handling fees',
      icon: <BarChart3 className="w-6 h-6 text-ink" />,
      category: 'Costs',
      features: ['Distance-based rates', 'Fuel surcharge %', 'Toll charges', 'Auto-calculated breakdown']
    },
    {
      id: 'logistics-route-optimization',
      name: 'Route Optimization',
      description: 'Compare multiple delivery routes by cost, time, and traffic conditions',
      icon: <Route className="w-6 h-6 text-warning" />,
      category: 'Routing',
      features: ['Multi-route comparison', 'Traffic condition alerts', 'Cost analysis', 'Recommended route badge']
    },
    {
      id: 'logistics-pod',
      name: 'Proof of Delivery',
      description: 'Capture delivery proof with digital signatures and photo documentation',
      icon: <FileCheck className="w-6 h-6 text-success" />,
      category: 'Documentation',
      features: ['Digital signature pad', 'Multi-photo upload', 'Recipient name', 'Delivery notes']
    },
    {
      id: 'logistics-exception-report',
      name: 'Exception & Delay Report',
      description: 'Report delivery exceptions and delays with auto-calculated penalties',
      icon: <AlertCircle className="w-6 h-6 text-danger" />,
      category: 'Issues',
      features: ['Reason code selection', 'Delay duration tracking', 'Penalty auto-calculation', 'Resolution notes']
    },
    {
      id: 'logistics-carrier-scorecard',
      name: 'Carrier Performance Scorecard',
      description: 'Track carrier KPIs including on-time delivery, damage rate, and cost deviation',
      icon: <Truck className="w-6 h-6 text-info" />,
      category: 'Analytics',
      features: ['On-time % tracking', 'Damage rate monitoring', 'Cost deviation analysis', 'Performance trends']
    }
  ];

  // Get component for preview
  const getPreviewComponent = (elementId) => {
    const mockData = {
      type: elementId,
      id: elementId
    };

    const mockSetNodes = (callback) => {
      // Mock function - actual nodes update handled on canvas
    };

    switch (elementId) {
      case 'logistics-shipment':
        return <ShipmentCard data={mockData} nodeId="preview-temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'logistics-freight-cost':
        return <FreightCostCalculator data={mockData} nodeId="preview-temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'logistics-route-optimization':
        return <RouteOptimizationBlock data={mockData} nodeId="preview-temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'logistics-pod':
        return <ProofOfDeliveryBlock data={mockData} nodeId="preview-temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'logistics-exception-report':
        return <ExceptionDelayReport data={mockData} nodeId="preview-temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'logistics-carrier-scorecard':
        return <CarrierPerformanceScorecard data={mockData} nodeId="preview-temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      default:
        return null;
    }
  };

  // Handle element selection
  const handleElementSelect = (elementId) => {
    setSelectedElement(elementId);
    setCurrentStep('preview');
  };

  // Handle adding to canvas
  const handleAddToCanvas = () => {
    if (selectedElement) {
      const element = logisticsElements.find(e => e.id === selectedElement);
      onAddToCanvas({
        id: selectedElement,
        name: element.name,
        type: selectedElement,
        preview: element.description,
        category: 'Logistics'
      });
      
      // Reset and close
      setSelectedElement(null);
      setCurrentStep('selection');
      onClose();
    }
  };

  // Handle back to selection
  const handleBackToSelection = () => {
    setSelectedElement(null);
    setCurrentStep('selection');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-black p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Logistics Elements</h2>
              <p className="text-info text-sm">Add logistics tracking and management components to your workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-surface hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'selection' ? (
            // Selection Grid
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logisticsElements.map((element) => (
                <div
                  key={element.id}
                  onClick={() => handleElementSelect(element.id)}
                  className="group cursor-pointer border-2 border-line rounded-xl p-4 hover:border-info  transition-all duration-300 bg-surface hover:bg-info/10"
                >
                  {/* Icon and Category */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-surface-hover rounded-lg group-hover:bg-info/10 transition-colors">
                      {element.icon}
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-info/10 text-info rounded-full">
                      {element.category}
                    </span>
                  </div>

                  {/* Title and Description */}
                  <h3 className="font-semibold text-ink mb-1 group-hover:text-info transition-colors">
                    {element.name}
                  </h3>
                  <p className="text-xs text-dim mb-3 line-clamp-2">
                    {element.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-1 mb-4">
                    {element.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-info rounded-full"></div>
                        <span className="text-xs text-dim">{feature}</span>
                      </div>
                    ))}
                    {element.features.length > 2 && (
                      <span className="text-xs text-dim pl-2">+ {element.features.length - 2} more features</span>
                    )}
                  </div>

                  {/* Action Hint */}
                  <div className="flex items-center justify-between pt-3 border-t border-line">
                    <span className="text-xs text-dim font-medium">Click to preview</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-info rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-1.5 h-1.5 bg-info rounded-full opacity-0 group-hover:opacity-100 transition-opacity delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-info rounded-full opacity-0 group-hover:opacity-100 transition-opacity delay-200"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Preview Mode
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={handleBackToSelection}
                className="flex items-center gap-2 text-info hover:text-info font-medium transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to selection
              </button>

              {/* Element Info */}
              {selectedElement && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {logisticsElements.find(e => e.id === selectedElement)?.icon}
                    <div>
                      <h3 className="text-lg font-semibold text-ink">
                        {logisticsElements.find(e => e.id === selectedElement)?.name}
                      </h3>
                      <p className="text-sm text-dim">
                        {logisticsElements.find(e => e.id === selectedElement)?.description}
                      </p>
                    </div>
                  </div>

                  {/* Preview Container */}
                  <div className="border-2 border-line rounded-xl p-4 bg-canvas overflow-auto max-h-[400px]">
                    {getPreviewComponent(selectedElement)}
                  </div>

                  {/* Features List */}
                  <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/20">
                    <h4 className="text-sm font-semibold text-ink mb-3">Features included:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {logisticsElements.find(e => e.id === selectedElement)?.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-info rounded-full"></div>
                          <span className="text-sm text-ink">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line p-6 bg-canvas flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-line rounded-lg text-ink hover:bg-surface-hover font-medium transition-colors"
          >
            Cancel
          </button>
          {currentStep === 'preview' && (
            <button
              onClick={handleAddToCanvas}
              className="px-6 py-2 bg-info hover:bg-info text-white rounded-lg font-medium transition-colors  "
            >
              Add to Canvas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticsElementsModal;
