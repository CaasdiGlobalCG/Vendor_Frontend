import React, { useState } from 'react';
import { X, Calculator, Package, Layers, Grid, Plus, ChevronDown, Download, FileSpreadsheet, Eye, Trash2 } from 'lucide-react';
import ConcreteBlocksCalculator from '../forms/ConcreteBlocksCalculator';
import BricksCalculator from '../forms/BricksCalculator';
import ConcreteCalculator from '../forms/ConcreteCalculator';
import FlooringCalculator from '../forms/FlooringCalculator';
import SoilExcavationCalculator from '../forms/SoilExcavationCalculator';
import SteelEstimationCalculator from '../forms/SteelEstimationCalculator';
import VinylFlooringCalculator from '../forms/VinylFlooringCalculator';

const CostCalculatorsModal = ({ isOpen, onClose, onAddToCanvas, workspaceId }) => {
  // State management
  const [currentStep, setCurrentStep] = useState('dropdown'); // 'dropdown', 'calculator', 'addMore', 'labour', 'summary'
  const [selectedCalculator, setSelectedCalculator] = useState(null);
  const [selectedCalculatorResults, setSelectedCalculatorResults] = useState(null); // Current calculator's results
  const [accumulatedResults, setAccumulatedResults] = useState([]); // All calculator results
  const [labourCosts, setLabourCosts] = useState([]);
  const [newLabourEntry, setNewLabourEntry] = useState({ description: '', quantity: '', unitCost: '', totalCost: 0 });

  const calculators = [
    {
      id: 'concrete-blocks-calculator',
      name: 'Concrete Blocks Calculator',
      description: 'Calculate the number of concrete blocks for your project',
      icon: <Package className="w-6 h-6 text-orange-600" />
    },
    {
      id: 'bricks-calculator',
      name: 'Bricks Calculator',
      description: 'Estimate the number of bricks required for walls',
      icon: <Package className="w-6 h-6 text-red-600" />
    },
    {
      id: 'concrete-calculator',
      name: 'Concrete Calculator',
      description: 'Calculate amount of concrete mix needed for foundations or columns',
      icon: <Layers className="w-6 h-6 text-gray-600" />
    },
    {
      id: 'flooring-calculator',
      name: 'Flooring Calculator',
      description: 'Plan flooring materials and get accurate cost estimates',
      icon: <Grid className="w-6 h-6 text-amber-700" />
    },
    {
      id: 'soil-excavation-calculator',
      name: 'Soil Excavation Calculator',
      description: 'Calculate volume of soil excavation for foundations',
      icon: <Plus className="w-6 h-6 text-yellow-700" />
    },
    {
      id: 'steel-cost-calculator',
      name: 'Steel Calculator',
      description: 'Estimate steel reinforcement required for structures',
      icon: <Layers className="w-6 h-6 text-slate-700" />
    },
    {
      id: 'vinyl-calculator',
      name: 'Vinyl Calculator',
      description: 'Calculate vinyl material and installation costs',
      icon: <Grid className="w-6 h-6 text-green-600" />
    }
  ];

  // Get calculator component
  const getCalculatorComponent = (calculatorId) => {
    const mockData = {
      type: 'cost-calculator',
      id: calculatorId,
      name: calculators.find(c => c.id === calculatorId)?.name
    };

    const mockSetNodes = (callback) => {
      // Mock function - actual nodes update handled elsewhere
    };

    switch (calculatorId) {
      case 'concrete-blocks-calculator':
        return <ConcreteBlocksCalculator data={mockData} nodeId="temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'bricks-calculator':
        return <BricksCalculator data={mockData} nodeId="temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'concrete-calculator':
        return <ConcreteCalculator data={mockData} nodeId="temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'flooring-calculator':
        return <FlooringCalculator data={mockData} nodeId="temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'soil-excavation-calculator':
        return <SoilExcavationCalculator data={mockData} nodeId="temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'steel-cost-calculator':
        return <SteelEstimationCalculator data={mockData} nodeId="temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      case 'vinyl-calculator':
        return <VinylFlooringCalculator data={mockData} nodeId="temp" workspaceId={workspaceId} setNodes={mockSetNodes} />;
      default:
        return null;
    }
  };

  // Handle calculator selection
  const handleCalculatorSelect = (calculatorId) => {
    setSelectedCalculator(calculatorId);
    setCurrentStep('calculator');
  };

  // Handle adding calculator results to accumulated results
  const handleAddCalculatorResult = () => {
    // Don't require results validation - just move to next step
    // The actual calculation happens when rendered on canvas
    const calculator = calculators.find(c => c.id === selectedCalculator);
    setAccumulatedResults([
      ...accumulatedResults,
      {
        id: selectedCalculator,
        name: calculator.name,
        results: {
          status: 'Pending calculation on canvas'
        }
      }
    ]);
    
    // Reset for next calculator
    setSelectedCalculator(null);
    setSelectedCalculatorResults(null);
    setCurrentStep('addMore');
  };

  // Handle "Add more calculators?" response
  const handleAddMoreYes = () => {
    setCurrentStep('dropdown');
  };

  const handleAddMoreNo = () => {
    setCurrentStep('labour');
  };

  // Handle labour cost operations
  const handleAddLabourCost = () => {
    if (newLabourEntry.description && newLabourEntry.quantity && newLabourEntry.unitCost) {
      const totalCost = parseFloat(newLabourEntry.quantity) * parseFloat(newLabourEntry.unitCost);
      setLabourCosts([
        ...labourCosts,
        {
          id: Date.now(),
          ...newLabourEntry,
          totalCost: totalCost.toFixed(2)
        }
      ]);
      setNewLabourEntry({ description: '', quantity: '', unitCost: '', totalCost: 0 });
    }
  };

  const handleRemoveLabourCost = (id) => {
    setLabourCosts(labourCosts.filter(lc => lc.id !== id));
  };

  // Calculate total labour cost
  const totalLabourCost = labourCosts.reduce((sum, lc) => sum + parseFloat(lc.totalCost || 0), 0);

  // Handle final submission to canvas
  const handleAddToCanvas = () => {
    const summaryData = {
      calculatorResults: accumulatedResults,
      labourCosts: labourCosts,
      totalLabourCost: totalLabourCost
    };

    onAddToCanvas({
      type: 'cost-calculator-summary',
      id: 'summary-' + Date.now(),
      name: 'Cost Calculation Summary',
      data: summaryData
    });

    // Reset and close
    setCurrentStep('dropdown');
    setAccumulatedResults([]);
    setLabourCosts([]);
    setNewLabourEntry({ description: '', quantity: '', unitCost: '', totalCost: 0 });
    onClose();
  };

  // Reset modal
  const handleClose = () => {
    setCurrentStep('dropdown');
    setSelectedCalculator(null);
    setSelectedCalculatorResults(null);
    setAccumulatedResults([]);
    setLabourCosts([]);
    setNewLabourEntry({ description: '', quantity: '', unitCost: '', totalCost: 0 });
    onClose();
  };

  if (!isOpen) return null;

  // ============ STEP 1: Calculator Dropdown Selection ============
  if (currentStep === 'dropdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Calculate Project Costs</h2>
              <p className="text-sm text-gray-600 mt-1">
                {accumulatedResults.length > 0 
                  ? `${accumulatedResults.length} calculator(s) selected`
                  : 'Select a calculator to get started'}
              </p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Accumulated Results Display */}
            {accumulatedResults.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-semibold text-green-900 mb-3">✅ Selected Calculators:</h3>
                <div className="space-y-2">
                  {accumulatedResults.map((result, idx) => (
                    <div key={result.id} className="flex items-center justify-between p-2 bg-white border border-green-100 rounded">
                      <span className="text-sm font-medium text-gray-800">{idx + 1}. {result.name}</span>
                      <button
                        onClick={() => setAccumulatedResults(accumulatedResults.filter(r => r.id !== result.id))}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculator Selection Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">Select Calculator</label>
              <div className="relative">
                <select
                  value={selectedCalculator || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleCalculatorSelect(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                >
                  <option value="">Choose a calculator...</option>
                  {calculators
                    .filter(calc => !accumulatedResults.some(r => r.id === calc.id))
                    .map(calc => (
                      <option key={calc.id} value={calc.id}>
                        {calc.name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {calculators.filter(calc => !accumulatedResults.some(r => r.id === calc.id)).length} calculator(s) available
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            {accumulatedResults.length > 0 && (
              <button
                onClick={handleAddMoreNo}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Continue to Labour Costs →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 2: Calculator Form ============
  if (currentStep === 'calculator') {
    const calculatorName = calculators.find(c => c.id === selectedCalculator)?.name;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{calculatorName}</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your project details</p>
            </div>
            <button
              onClick={() => setCurrentStep('dropdown')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Calculator Component */}
          <div className="p-6">
            {getCalculatorComponent(selectedCalculator)}
          </div>

          {/* Footer - with Back and Continue buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep('dropdown')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              ← Back to Calculators
            </button>
            <button
              onClick={handleAddCalculatorResult}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 3: "Add More Calculators?" Prompt ============
  if (currentStep === 'addMore') {
    const lastCalc = accumulatedResults[accumulatedResults.length - 1];
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">✅ {lastCalc.name} Added</h2>
            <p className="text-sm text-gray-600 mt-1">Results saved successfully</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-center text-gray-700 mb-6">
              Would you like to calculate costs for other items as well?
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900">{lastCalc.name}</p>
              {/* Show brief summary of results */}
              {lastCalc.results && (
                <p className="text-xs text-gray-600 mt-2">Results calculated and stored</p>
              )}
            </div>
          </div>

          {/* Footer with Yes/No buttons */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between space-x-3">
            <button
              onClick={handleAddMoreNo}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              No, Continue to Labour Costs
            </button>
            <button
              onClick={handleAddMoreYes}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Yes, Add More
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 4: Labour Cost Section ============
  if (currentStep === 'labour') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Labour Costs</h2>
              <p className="text-sm text-gray-600 mt-1">Add labour costs for your project (optional)</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Accumulated Calculators Summary */}
            <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Calculation Summary:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {accumulatedResults.map((result) => (
                  <div key={result.id} className="p-2 bg-white border border-gray-200 rounded">
                    <p className="text-sm font-medium text-gray-800">{result.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Labour Cost Input Form */}
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Labour Cost Entry</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Labour Type</label>
                  <input
                    type="text"
                    placeholder="e.g., Skilled labor, Unskilled"
                    value={newLabourEntry.description}
                    onChange={(e) => setNewLabourEntry({...newLabourEntry, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g., 10"
                    value={newLabourEntry.quantity}
                    onChange={(e) => setNewLabourEntry({...newLabourEntry, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost per Unit</label>
                  <input
                    type="number"
                    placeholder="e.g., 500"
                    value={newLabourEntry.unitCost}
                    onChange={(e) => setNewLabourEntry({...newLabourEntry, unitCost: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddLabourCost}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Add Cost
                  </button>
                </div>
              </div>
            </div>

            {/* Labour Costs List */}
            {labourCosts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Labour Cost Breakdown</h3>
                <div className="space-y-2">
                  {labourCosts.map((labour) => (
                    <div key={labour.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{labour.description}</p>
                        <p className="text-xs text-gray-600">
                          {labour.quantity} × ₹{parseFloat(labour.unitCost).toLocaleString()} = ₹{parseFloat(labour.totalCost).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveLabourCost(labour.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total Labour Cost */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Total Labour Cost:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ₹{totalLabourCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep('dropdown')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setCurrentStep('summary')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Review Summary →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 5: Summary View ============
  if (currentStep === 'summary') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cost Summary</h2>
              <p className="text-sm text-gray-600 mt-1">Review all calculations before adding to canvas</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content - Summary Table */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Calculation Results Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Calculation Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">#</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">Calculator</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accumulatedResults.map((result, idx) => (
                        <tr key={result.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">{result.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">Results saved</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Labour Costs Section */}
              {labourCosts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">👷 Labour Costs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">Labour Type</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b border-gray-300">Quantity</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b border-gray-300">Cost per Unit</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b border-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labourCosts.map((labour) => (
                          <tr key={labour.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-800 font-medium">{labour.description}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{labour.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">₹{parseFloat(labour.unitCost).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">
                              ₹{parseFloat(labour.totalCost).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-semibold border-t-2 border-blue-300">
                          <td colSpan="3" className="px-4 py-3 text-sm text-gray-900 text-right">Total Labour Cost:</td>
                          <td className="px-4 py-3 text-sm text-blue-600 text-right">
                            ₹{totalLabourCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep('labour')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              ← Edit Labour Costs
            </button>
            <button
              onClick={handleAddToCanvas}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Canvas</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CostCalculatorsModal;
