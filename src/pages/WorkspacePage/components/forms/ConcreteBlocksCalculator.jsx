import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, ChevronRight, AlertCircle, Info, X } from 'lucide-react';

const ConcreteBlocksCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  // Step states
  const [currentStep, setCurrentStep] = useState('dimensions'); // 'dimensions', 'specifications', 'result'
  const [unit, setUnit] = useState('meter');
  const [wallLength, setWallLength] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const [mortarJoint, setMortarJoint] = useState('10'); // Default 10mm
  const [mortarUnit, setMortarUnit] = useState('mm');
  const [wastagePercent, setWastagePercent] = useState('10');
  const [result, setResult] = useState(null);
  const [calculations, setCalculations] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  // Custom block dimensions state (in mm) - FACE dimensions only
  const [blockLength, setBlockLength] = useState('406.4');     // Horizontal dimension
  const [blockHeight, setBlockHeight] = useState('203.2');     // Vertical dimension
  const [dimensionUnit, setDimensionUnit] = useState('mm');
  const [customBlockName, setCustomBlockName] = useState('8" Block');

  // Preset block dimensions in mm (FACE dimensions: length × height)
  // Standard concrete block: 16" length × variable height × 8" depth
  // IMPORTANT: Face area = length × height. Depth is NOT used in calculation.
  const presetBlockDimensions = {
    '4': { faceLength: 406.4, faceHeight: 101.6, depth: 203.2, name: '4" Block (16"×4"×8")' },
    '6': { faceLength: 406.4, faceHeight: 152.4, depth: 203.2, name: '6" Block (16"×6"×8")' },
    '8': { faceLength: 406.4, faceHeight: 203.2, depth: 203.2, name: '8" Block (16"×8"×8")' }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showCalculationModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCalculationModal]);

  const handleSelectPreset = (presetKey) => {
    const preset = presetBlockDimensions[presetKey];
    setBlockLength(preset.faceLength.toString());
    setBlockHeight(preset.faceHeight.toString());
    setDimensionUnit('mm');
    setCustomBlockName(preset.name);
  };

  const handleMoveToSpecifications = () => {
    if (!blockLength || !blockHeight) {
      alert('Please fill in all block dimensions');
      return;
    }
    setCurrentStep('specifications');
  };

  const convertDimensionsToMm = () => {
    // Convert FACE dimensions (length and height) to mm
    let length = parseFloat(blockLength);
    let height = parseFloat(blockHeight);

    if (dimensionUnit === 'cm') {
      length *= 10;
      height *= 10;
    } else if (dimensionUnit === 'inches') {
      length *= 25.4;
      height *= 25.4;
    }
    
    return { faceLength: length, faceHeight: height };
  };

  const convertMortarToMm = () => {
    let mortar = parseFloat(mortarJoint);
    
    if (mortarUnit === 'cm') {
      mortar *= 10;
    } else if (mortarUnit === 'inches') {
      mortar *= 25.4;
    }
    
    return mortar;
  };

  const calculateBlocks = () => {
    if (!wallLength || !wallHeight) {
      alert('Please fill in all wall dimensions');
      return;
    }

    // Step 1: Convert wall dimensions to mm
    const length = parseFloat(wallLength);
    const height = parseFloat(wallHeight);
    
    const lengthMm = unit === 'meter' ? length * 1000 : length * 304.8;
    const heightMm = unit === 'meter' ? height * 1000 : height * 304.8;
    
    // Step 2: Calculate wall area in mm²
    const wallAreaMm = lengthMm * heightMm;
    
    // Step 3: Get block FACE dimensions in mm (length and height only, NOT depth)
    const blockDims = convertDimensionsToMm();
    const mortarMm = convertMortarToMm();
    
    // Step 4: Calculate effective block FACE dimensions (INCLUDING mortar joint on all sides)
    // Mortar is added to BOTH length and height
    const blockLengthWithMortar = blockDims.faceLength + mortarMm;
    const blockHeightWithMortar = blockDims.faceHeight + mortarMm;
    
    // Step 5: Calculate block FACE area in mm² (length × height only, NOT volume)
    const blockFaceAreaMm = blockLengthWithMortar * blockHeightWithMortar;
    
    // Step 6: Calculate number of blocks (ROUND UP to nearest whole block)
    const numBlocksBeforeWastage = wallAreaMm / blockFaceAreaMm;
    const numBlocksRounded = Math.ceil(numBlocksBeforeWastage);
    
    // Step 7: Calculate wastage
    const wastagePercentValue = parseFloat(wastagePercent) || 10;
    const totalBlocksWithWastage = Math.ceil(numBlocksRounded * (1 + wastagePercentValue / 100));
    
    // Format calculation details for display
    const calcDetails = {
      wallLength,
      wallHeight,
      unit,
      wallLengthMm: lengthMm.toFixed(2),
      wallHeightMm: heightMm.toFixed(2),
      wallAreaMm: wallAreaMm.toFixed(2),
      blockName: customBlockName,
      blockLength: blockDims.faceLength.toFixed(2),
      blockHeight: blockDims.faceHeight.toFixed(2),
      mortarJoint: mortarJoint,
      mortarUnit: mortarUnit,
      mortarMm: mortarMm.toFixed(2),
      blockLengthWithMortar: blockLengthWithMortar.toFixed(2),
      blockHeightWithMortar: blockHeightWithMortar.toFixed(2),
      blockFaceAreaMm: blockFaceAreaMm.toFixed(2),
      numBlocksBeforeWastage: numBlocksBeforeWastage.toFixed(2),
      numBlocksRounded,
      wastagePercent: wastagePercentValue,
      totalBlocksWithWastage
    };
    
    setCalculations(calcDetails);
    setResult(totalBlocksWithWastage);
    setCurrentStep('result');
  };

  const handleReset = () => {
    setCurrentStep('dimensions');
    setWallLength('');
    setWallHeight('');
    setUnit('meter');
    setBlockLength('406.4');  // 16" standard
    setBlockHeight('203.2');  // 8" standard (for 8" block)
    setDimensionUnit('mm');
    setCustomBlockName('8" Block');
    setMortarJoint('10');
    setMortarUnit('mm');
    setWastagePercent('10');
    setResult(null);
    setCalculations(null);
    setShowResult(false);
  };

  // Step 1: Block Dimension Adjustment
  const renderDimensionStep = () => (
    <div className="p-6 space-y-4">
      {/* Title */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Concrete Blocks Calculator</h3>
        <p className="text-sm text-gray-600 mt-1">Step 1: Adjust block dimensions as per your requirement</p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Quick Select Presets</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(presetBlockDimensions).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelectPreset(key)}
              className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                customBlockName === value.name
                  ? 'bg-blue-600 text-white border-2 border-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
              }`}
            >
              {value.name}
            </button>
          ))}
        </div>
      </div>

      {/* Or Custom Input */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Or enter custom dimensions:</p>
        
        {/* Custom Block Name */}
        <div className="space-y-2 mb-4">
          <label className="block text-xs font-medium text-gray-700">Block Size Name / Label</label>
          <input
            type="text"
            value={customBlockName}
            onChange={(e) => setCustomBlockName(e.target.value)}
            placeholder="e.g., Custom Block"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Dimension Unit Selection */}
        <div className="space-y-2 mb-4">
          <label className="block text-xs font-medium text-gray-700">Dimension Unit</label>
          <div className="flex gap-2">
            {['mm', 'cm', 'inches'].map(unitOption => (
              <button
                key={unitOption}
                onClick={() => setDimensionUnit(unitOption)}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition-all ${
                  dimensionUnit === unitOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {unitOption.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Block Dimensions Inputs - FACE DIMENSIONS ONLY (Length × Height) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Length (Horizontal)</label>
            <input
              type="number"
              value={blockLength}
              onChange={(e) => setBlockLength(e.target.value)}
              placeholder="Length"
              className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              step="0.1"
            />
            <p className="text-xs text-gray-500">{dimensionUnit}</p>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">Height (Vertical)</label>
            <input
              type="number"
              value={blockHeight}
              onChange={(e) => setBlockHeight(e.target.value)}
              placeholder="Height"
              className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              step="0.1"
            />
            <p className="text-xs text-gray-500">{dimensionUnit}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">Note: Only FACE dimensions (length × height) are used. Block depth is not used for calculations.</p>
      </div>

      {/* Visual Block Diagram */}
      <div className="bg-gray-50 rounded-lg p-6 flex justify-center mt-6">
        <div className="text-center">
          <div className="w-40 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg shadow-lg border-2 border-gray-600 flex items-center justify-center text-white text-sm font-bold mx-auto mb-3 relative">
            {customBlockName}
            <div className="absolute bottom-1 left-1 text-xs text-gray-200">Length</div>
            <div className="absolute top-1 right-1 text-xs text-gray-200">Height</div>
          </div>
          <p className="text-xs text-gray-600">
            Face: {blockLength} × {blockHeight} {dimensionUnit}
          </p>
        </div>
      </div>

      {/* Proceed Button */}
      <button
        onClick={handleMoveToSpecifications}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mt-4"
      >
        <span>Continue to Wall Dimensions</span>
        <ChevronRight size={20} />
      </button>
    </div>
  );

  // Step 2: Wall Specifications
  const renderSpecificationsStep = () => (
    <div className="p-6 space-y-4">
      {/* Title */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Concrete Blocks Calculator</h3>
        <p className="text-sm text-gray-600 mt-1">Step 2: Enter wall dimensions</p>
      </div>

      {/* Block Summary */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
        <div className="text-sm">
          <p className="font-medium text-gray-900">Selected Block Size:</p>
          <p className="text-gray-700 mt-1">
            {customBlockName}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Face Dimensions: {blockLength} × {blockHeight} {dimensionUnit} (Length × Height)
          </p>
        </div>
      </div>

      {/* Unit Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Calculate wall dimensions in</label>
        <div className="flex gap-2">
          <button
            onClick={() => setUnit('meter')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
              unit === 'meter'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Meter
          </button>
          <button
            onClick={() => setUnit('feet')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
              unit === 'feet'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Feet
          </button>
        </div>
      </div>

      {/* Wall Length Input */}
      <div className="space-y-2">
        <label htmlFor="length" className="block text-sm font-medium text-gray-700">
          Length Of Wall
        </label>
        <input
          id="length"
          type="number"
          value={wallLength}
          onChange={(e) => setWallLength(e.target.value)}
          placeholder="Enter length"
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          step="0.1"
        />
      </div>

      {/* Wall Height Input */}
      <div className="space-y-2">
        <label htmlFor="height" className="block text-sm font-medium text-gray-700">
          Height Of Wall
        </label>
        <input
          id="height"
          type="number"
          value={wallHeight}
          onChange={(e) => setWallHeight(e.target.value)}
          placeholder="Enter height"
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          step="0.1"
        />
      </div>

      {/* Mortar Joint Configuration */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">Mortar Joint Thickness</label>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <input
              type="number"
              value={mortarJoint}
              onChange={(e) => setMortarJoint(e.target.value)}
              placeholder="Mortar thickness"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              step="0.1"
            />
          </div>
          <select
            value={mortarUnit}
            onChange={(e) => setMortarUnit(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="inches">inches</option>
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-2">Standard: 10mm (0.4 inches) for typical mortar joint</p>
      </div>

      {/* Wastage Percentage */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <label htmlFor="wastage" className="block text-sm font-medium text-gray-700 mb-2">
          Wastage Allowance
        </label>
        <div className="flex items-center gap-3">
          <input
            id="wastage"
            type="number"
            value={wastagePercent}
            onChange={(e) => setWastagePercent(e.target.value)}
            min="0"
            max="50"
            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="0.5"
          />
          <span className="text-sm font-medium text-gray-700">%</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Typical range: 8-12% for construction wastage</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => setCurrentStep('dimensions')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Back
        </button>
        <button
          onClick={calculateBlocks}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          <span>Calculate →</span>
        </button>
      </div>
    </div>
  );

  // Step 3: Results with detailed calculations - Renders as portal (separate modal)
  const CalculationDetailsModal = () => {
    const modalContent = (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
          {/* Modal Header */}
          <div className="sticky top-0 bg-blue-50 border-b border-blue-200 p-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Calculation Details</h3>
              <p className="text-sm text-gray-600">Surveyor-grade block count calculation</p>
            </div>
            <button
              onClick={() => setShowCalculationModal(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {/* What is Mortar Joint? */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="font-bold text-yellow-900 mb-2">What is a Mortar Joint?</p>
              <p className="text-sm text-yellow-800">
                A mortar joint is the gap between concrete blocks filled with mortar (cement-based adhesive). 
                Standard mortar joint thickness is <span className="font-bold">10mm (0.4 inches)</span>. This space is 
                added to block dimensions because mortar takes up physical space in the wall. The effective block size 
                includes this joint thickness for accurate calculations.
              </p>
            </div>

            {/* Step-by-Step Calculations */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Step 1 */}
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                  Convert Wall Dimensions to mm
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Wall Length: {calculations?.wallLength} {calculations?.unit} = <span className="font-mono font-bold">{calculations?.wallLengthMm} mm</span></p>
                  <p>Wall Height: {calculations?.wallHeight} {calculations?.unit} = <span className="font-mono font-bold">{calculations?.wallHeightMm} mm</span></p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                  Calculate Wall Area
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Formula: Wall Area = Length × Height</p>
                  <p className="font-mono font-bold">{calculations?.wallLengthMm} mm × {calculations?.wallHeightMm} mm = {calculations?.wallAreaMm} mm²</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                  Block Face Dimensions (with Mortar Joint)
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Block: {calculations?.blockName}</p>
                  <p>Original Face: {calculations?.blockLength} mm × {calculations?.blockHeight} mm</p>
                  <p>Mortar Joint: {calculations?.mortarJoint} {calculations?.mortarUnit} = {calculations?.mortarMm} mm</p>
                  <p className="font-mono font-bold">With Mortar: {calculations?.blockLengthWithMortar} mm × {calculations?.blockHeightWithMortar} mm</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                  Calculate Block Face Area
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Formula: Block Face Area = Length (with mortar) × Height (with mortar)</p>
                  <p className="font-mono font-bold">{calculations?.blockLengthWithMortar} mm × {calculations?.blockHeightWithMortar} mm = {calculations?.blockFaceAreaMm} mm²</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">5</span>
                  Calculate Number of Blocks
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Formula: Blocks = Wall Area ÷ Block Face Area</p>
                  <p className="font-mono font-bold">{calculations?.wallAreaMm} ÷ {calculations?.blockFaceAreaMm} = {calculations?.numBlocksBeforeWastage} blocks</p>
                  <p className="text-gray-600 mt-2">Rounded UP to nearest whole block: <span className="font-bold">{calculations?.numBlocksRounded} blocks</span></p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="bg-white p-4">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">6</span>
                  Add Wastage Allowance
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Wastage Percentage: {calculations?.wastagePercent}%</p>
                  <p className="font-mono font-bold">{calculations?.numBlocksRounded} blocks × {(1 + calculations?.wastagePercent / 100).toFixed(2)} = {(calculations?.numBlocksRounded * (1 + calculations?.wastagePercent / 100)).toFixed(2)} blocks</p>
                  <p className="text-green-700 font-bold mt-2">FINAL ANSWER: {result?.toLocaleString()} blocks</p>
                </div>
              </div>
            </div>

            {/* Key Assumptions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="font-bold text-gray-900 mb-2">Key Assumptions:</div>
              <ul className="space-y-1 list-disc list-inside text-sm text-gray-700">
                <li>Blocks laid horizontally with mortar joints</li>
                <li>Mortar joint thickness: {calculations?.mortarJoint} {calculations?.mortarUnit}</li>
                <li>Face area calculation includes mortar thickness</li>
                <li>Wastage allowance: {calculations?.wastagePercent}%</li>
                <li>No openings (doors/windows) accounted for</li>
                <li>Based on civil engineering surveyor standards</li>
              </ul>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end flex-shrink-0">
            <button
              onClick={() => setShowCalculationModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );

    // Render as portal outside the component hierarchy
    return ReactDOM.createPortal(modalContent, document.body);
  };

  // Step 3: Results with info icon
  const renderResultStep = () => (
    <div className="p-6 space-y-6">
      {/* Result Display with Info Icon */}
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Blocks Required</p>
            <div className="flex items-center gap-3">
              <div className="text-5xl font-bold text-green-600">{result?.toLocaleString()}</div>
              <button
                onClick={() => setShowCalculationModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors flex-shrink-0 group relative"
                title="View calculation details"
              >
                <Info size={24} />
                <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  View Details
                </span>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">concrete blocks needed for your wall</p>
          </div>
        </div>
      </div>

      {/* Quick Summary Card */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-2">
        <p className="font-bold text-gray-900 text-sm">Quick Summary</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Wall Size</p>
            <p className="font-bold text-gray-900">{calculations?.wallLength}×{calculations?.wallHeight} {calculations?.unit}</p>
          </div>
          <div>
            <p className="text-gray-600">Block Type</p>
            <p className="font-bold text-gray-900">{calculations?.blockName}</p>
          </div>
          <div>
            <p className="text-gray-600">Mortar Joint</p>
            <p className="font-bold text-gray-900">{calculations?.mortarJoint} {calculations?.mortarUnit}</p>
          </div>
          <div>
            <p className="text-gray-600">Wastage</p>
            <p className="font-bold text-gray-900">{calculations?.wastagePercent}%</p>
          </div>
        </div>
      </div>

      {/* Key Note */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <p className="text-sm text-yellow-800">
          <span className="font-bold">Note:</span> This calculation includes mortar joint thickness ({calculations?.mortarJoint} {calculations?.mortarUnit}) in the block face area and {calculations?.wastagePercent}% wastage allowance for construction breakage.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleReset}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          Reset
        </button>
        <button
          onClick={() => setCurrentStep('specifications')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Edit
        </button>
      </div>

      {/* Calculation Modal */}
      {showCalculationModal && <CalculationDetailsModal />}
    </div>
  );

  return (
    <div className="w-full bg-white rounded-lg">
      {currentStep === 'dimensions' && renderDimensionStep()}
      {currentStep === 'specifications' && renderSpecificationsStep()}
      {currentStep === 'result' && renderResultStep()}
    </div>
  );
};

export default ConcreteBlocksCalculator;
