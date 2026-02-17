import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, ChevronRight, AlertCircle, Info, X } from 'lucide-react';

const BricksCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  // Step states
  const [currentStep, setCurrentStep] = useState('brickType'); // 'brickType', 'dimensions', 'result'
  const [unit, setUnit] = useState('meter');
  const [wallLength, setWallLength] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const [mortarJoint, setMortarJoint] = useState('10'); // Default 10mm
  const [mortarUnit, setMortarUnit] = useState('mm');
  const [wastagePercent, setWastagePercent] = useState('10');
  const [result, setResult] = useState(null);
  const [calculations, setCalculations] = useState(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  // Brick type state
  const [selectedBrickType, setSelectedBrickType] = useState(null);
  const [customBrickName, setCustomBrickName] = useState('Custom Brick');
  const [brickLength, setBrickLength] = useState('');
  const [brickHeight, setBrickHeight] = useState('');
  const [brickDepth, setBrickDepth] = useState('');
  const [brickDimensionUnit, setBrickDimensionUnit] = useState('mm');

  // Preset brick types (FACE dimensions: length × height, depth for reference only)
  const presetBrickTypes = {
    'indian-modular': {
      name: 'Indian Modular',
      faceLength: 190,
      faceHeight: 90,
      depth: 90,
      description: '190×90×90 mm'
    },
    'indian-non-modular': {
      name: 'Indian Non-Modular',
      faceLength: 230,
      faceHeight: 110,
      depth: 75,
      description: '230×110×75 mm'
    },
    'uk-standard': {
      name: 'UK Standard',
      faceLength: 215,
      faceHeight: 65,
      depth: 102.5,
      description: '215×65×102.5 mm'
    },
    'us-standard': {
      name: 'US Standard',
      faceLength: 203,
      faceHeight: 57,
      depth: 92,
      description: '203×57×92 mm'
    }
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

  const handleSelectPresetBrick = (brickTypeKey) => {
    const brick = presetBrickTypes[brickTypeKey];
    setSelectedBrickType(brickTypeKey);
    setBrickLength(brick.faceLength.toString());
    setBrickHeight(brick.faceHeight.toString());
    setBrickDepth(brick.depth.toString());
    setBrickDimensionUnit('mm');
    setCustomBrickName(brick.name);
  };

  const handleSelectCustomBrick = () => {
    setSelectedBrickType('custom');
    setBrickLength('');
    setBrickHeight('');
    setBrickDepth('');
    setBrickDimensionUnit('mm');
    setCustomBrickName('Custom Brick');
  };

  const handleMoveToDimensions = () => {
    if (!selectedBrickType) {
      alert('Please select or enter a brick type');
      return;
    }
    if (!brickLength || !brickHeight || !brickDepth) {
      alert('Please fill in all brick dimensions (length, height, depth)');
      return;
    }
    setCurrentStep('dimensions');
  };

  const convertBrickDimensionsToMm = () => {
    // Convert FACE dimensions (length and height) to mm. Depth is not used for calculation.
    let length = parseFloat(brickLength);
    let height = parseFloat(brickHeight);

    if (brickDimensionUnit === 'cm') {
      length *= 10;
      height *= 10;
    } else if (brickDimensionUnit === 'inches') {
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

  const calculateBricks = () => {
    if (!wallLength || !wallHeight) {
      alert('Please fill in all wall dimensions');
      return;
    }

    // Step 1: Convert wall dimensions to mm
    const length = parseFloat(wallLength);
    const height = parseFloat(wallHeight);

    const lengthMm = unit === 'meter' ? length * 1000 : length * 304.8;
    const heightMm = unit === 'meter' ? height * 1000 : height * 304.8;

    // Validation: Check if dimensions are realistic
    if (lengthMm <= 0 || heightMm <= 0) {
      alert('Please enter valid positive wall dimensions');
      return;
    }

    // Step 2: Calculate wall area in mm²
    const wallAreaMm = lengthMm * heightMm;

    // Step 3: Get brick FACE dimensions in mm (length and height only, NOT depth)
    const brickDims = convertBrickDimensionsToMm();
    const mortarMm = convertMortarToMm();

    // Validation: Check if brick dimensions are realistic
    if (brickDims.faceLength <= 0 || brickDims.faceHeight <= 0) {
      alert('Please enter valid positive brick dimensions');
      return;
    }

    // Step 4: Calculate effective brick FACE dimensions (INCLUDING mortar joint on both sides)
    // Mortar is added to BOTH horizontal and vertical joints
    const brickLengthWithMortar = brickDims.faceLength + mortarMm;
    const brickHeightWithMortar = brickDims.faceHeight + mortarMm;

    // Step 5: Calculate brick FACE area in mm² (length × height only, NOT volume)
    const brickFaceAreaMm = brickLengthWithMortar * brickHeightWithMortar;

    // Step 6: Calculate number of bricks (ROUND UP to nearest whole brick)
    const numBricksBeforeWastage = wallAreaMm / brickFaceAreaMm;
    const numBricksRounded = Math.ceil(numBricksBeforeWastage);

    // Step 7: Calculate wastage
    const wastagePercentValue = parseFloat(wastagePercent) || 10;
    const totalBricksWithWastage = Math.ceil(numBricksRounded * (1 + wastagePercentValue / 100));

    // Validation: Check if result is physically realistic
    if (totalBricksWithWastage < 1) {
      alert('Error: Result is less than 1. Please check your dimensions.');
      return;
    }

    // Format calculation details for display
    const calcDetails = {
      wallLength,
      wallHeight,
      unit,
      wallLengthMm: lengthMm.toFixed(2),
      wallHeightMm: heightMm.toFixed(2),
      wallAreaMm: wallAreaMm.toFixed(2),
      brickName: customBrickName,
      brickLength: brickDims.faceLength.toFixed(2),
      brickHeight: brickDims.faceHeight.toFixed(2),
      mortarJoint: mortarJoint,
      mortarUnit: mortarUnit,
      mortarMm: mortarMm.toFixed(2),
      brickLengthWithMortar: brickLengthWithMortar.toFixed(2),
      brickHeightWithMortar: brickHeightWithMortar.toFixed(2),
      brickFaceAreaMm: brickFaceAreaMm.toFixed(2),
      numBricksBeforeWastage: numBricksBeforeWastage.toFixed(2),
      numBricksRounded,
      wastagePercent: wastagePercentValue,
      totalBricksWithWastage
    };

    setCalculations(calcDetails);
    setResult(totalBricksWithWastage);
    setCurrentStep('result');
  };

  const handleReset = () => {
    setCurrentStep('brickType');
    setSelectedBrickType(null);
    setBrickLength('');
    setBrickHeight('');
    setBrickDepth('');
    setBrickDimensionUnit('mm');
    setCustomBrickName('Custom Brick');
    setWallLength('');
    setWallHeight('');
    setUnit('meter');
    setMortarJoint('10');
    setMortarUnit('mm');
    setWastagePercent('10');
    setResult(null);
    setCalculations(null);
  };

  // Step 1: Brick Type Selection
  const renderBrickTypeStep = () => (
    <div className="p-6 space-y-4">
      {/* Title */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Bricks Calculator</h3>
        <p className="text-sm text-gray-600 mt-1">Step 1: Select or define brick type</p>
      </div>

      {/* Preset Brick Types */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Standard Brick Types</label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(presetBrickTypes).map(([key, brick]) => (
            <button
              key={key}
              onClick={() => handleSelectPresetBrick(key)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedBrickType === key
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-400'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900">{brick.name}</p>
              <p className="text-xs text-gray-600 mt-1">{brick.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center my-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-4 text-sm text-gray-600">OR</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Custom Brick Input */}
      <div className="space-y-3">
        <button
          onClick={handleSelectCustomBrick}
          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
            selectedBrickType === 'custom'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-400'
          }`}
        >
          <p className="font-semibold text-sm text-gray-900">Custom Brick</p>
          <p className="text-xs text-gray-600 mt-1">Enter your own dimensions</p>
        </button>

        {selectedBrickType === 'custom' && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border-2 border-blue-200">
            {/* Custom Brick Name */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Brick Name/Label</label>
              <input
                type="text"
                value={customBrickName}
                onChange={(e) => setCustomBrickName(e.target.value)}
                placeholder="e.g., Clay Brick 200×100"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Dimension Unit Selection */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Dimension Unit</label>
              <div className="flex gap-2">
                {['mm', 'cm', 'inches'].map(unitOption => (
                  <button
                    key={unitOption}
                    onClick={() => setBrickDimensionUnit(unitOption)}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition-all ${
                      brickDimensionUnit === unitOption
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {unitOption.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Brick Dimensions - LENGTH × HEIGHT (Face only) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Length</label>
                <input
                  type="number"
                  value={brickLength}
                  onChange={(e) => setBrickLength(e.target.value)}
                  placeholder="Length"
                  className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  step="0.1"
                />
                <p className="text-xs text-gray-500">{brickDimensionUnit}</p>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Height</label>
                <input
                  type="number"
                  value={brickHeight}
                  onChange={(e) => setBrickHeight(e.target.value)}
                  placeholder="Height"
                  className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  step="0.1"
                />
                <p className="text-xs text-gray-500">{brickDimensionUnit}</p>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Depth</label>
                <input
                  type="number"
                  value={brickDepth}
                  onChange={(e) => setBrickDepth(e.target.value)}
                  placeholder="Depth"
                  className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  step="0.1"
                />
                <p className="text-xs text-gray-500">{brickDimensionUnit}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 italic">Note: Only LENGTH × HEIGHT (face) are used in calculation. Depth is for reference.</p>
          </div>
        )}
      </div>

      {/* Proceed Button */}
      <button
        onClick={handleMoveToDimensions}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mt-6"
      >
        <span>Continue to Wall Dimensions</span>
        <ChevronRight size={20} />
      </button>
    </div>
  );

  // Step 2: Wall Dimensions
  const renderDimensionsStep = () => (
    <div className="p-6 space-y-4">
      {/* Title */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Bricks Calculator</h3>
        <p className="text-sm text-gray-600 mt-1">Step 2: Enter wall dimensions & settings</p>
      </div>

      {/* Selected Brick Summary */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
        <div className="text-sm">
          <p className="font-medium text-gray-900">Selected Brick:</p>
          <p className="text-gray-700 mt-1">{customBrickName}</p>
          <p className="text-xs text-gray-600 mt-2">
            Face Dimensions: {brickLength} × {brickHeight} {brickDimensionUnit} (Length × Height)
          </p>
        </div>
      </div>

      {/* Unit Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Wall dimensions in</label>
        <div className="flex gap-2">
          <button
            onClick={() => setUnit('meter')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
              unit === 'meter'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Meters
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
          Wall Length
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
          Wall Height
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
        <p className="text-xs text-gray-500 mt-2">Standard: 10mm for typical mortar joint</p>
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
          onClick={() => setCurrentStep('brickType')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Back
        </button>
        <button
          onClick={calculateBricks}
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
              <p className="text-sm text-gray-600">Surveyor-grade brick count calculation</p>
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
                A mortar joint is the gap between bricks filled with mortar (cement-based adhesive). 
                Standard joint thickness is <span className="font-bold">10mm</span>. This space is 
                added to brick dimensions in BOTH horizontal and vertical directions because mortar 
                takes up physical space in the wall. The effective brick size includes this joint thickness.
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
                  Brick Face Dimensions (with Mortar Joint)
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Brick: {calculations?.brickName}</p>
                  <p>Original Face: {calculations?.brickLength} mm × {calculations?.brickHeight} mm</p>
                  <p>Mortar Joint: {calculations?.mortarJoint} {calculations?.mortarUnit} = {calculations?.mortarMm} mm</p>
                  <p className="font-mono font-bold">With Mortar: {calculations?.brickLengthWithMortar} mm × {calculations?.brickHeightWithMortar} mm</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                  Calculate Brick Face Area
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Formula: Brick Face Area = Length (with mortar) × Height (with mortar)</p>
                  <p className="font-mono font-bold">{calculations?.brickLengthWithMortar} mm × {calculations?.brickHeightWithMortar} mm = {calculations?.brickFaceAreaMm} mm²</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">5</span>
                  Calculate Number of Bricks
                </p>
                <div className="space-y-1 text-sm text-gray-700 ml-8">
                  <p>Formula: Bricks = Wall Area ÷ Brick Face Area</p>
                  <p className="font-mono font-bold">{calculations?.wallAreaMm} ÷ {calculations?.brickFaceAreaMm} = {calculations?.numBricksBeforeWastage} bricks</p>
                  <p className="text-gray-600 mt-2">Rounded UP to nearest whole brick: <span className="font-bold">{calculations?.numBricksRounded} bricks</span></p>
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
                  <p className="font-mono font-bold">{calculations?.numBricksRounded} bricks × {(1 + calculations?.wastagePercent / 100).toFixed(2)} = {(calculations?.numBricksRounded * (1 + calculations?.wastagePercent / 100)).toFixed(2)} bricks</p>
                  <p className="text-green-700 font-bold mt-2">FINAL ANSWER: {result?.toLocaleString()} bricks</p>
                </div>
              </div>
            </div>

            {/* Key Assumptions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="font-bold text-gray-900 mb-2">Key Assumptions:</div>
              <ul className="space-y-1 list-disc list-inside text-sm text-gray-700">
                <li>Bricks laid horizontally with mortar joints</li>
                <li>Mortar in both horizontal and vertical directions</li>
                <li>Mortar joint thickness: {calculations?.mortarJoint} {calculations?.mortarUnit}</li>
                <li>Face area includes mortar thickness in dimensions</li>
                <li>Wastage allowance: {calculations?.wastagePercent}%</li>
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
            <p className="text-sm text-gray-600 mb-2">Bricks Required</p>
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
            <p className="text-sm text-gray-600 mt-2">bricks needed for your wall</p>
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
            <p className="text-gray-600">Brick Type</p>
            <p className="font-bold text-gray-900">{calculations?.brickName}</p>
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
          <span className="font-bold">Note:</span> This calculation includes mortar joint thickness ({calculations?.mortarJoint} {calculations?.mortarUnit}) in both horizontal and vertical directions using brick face area (length × height), and {calculations?.wastagePercent}% wastage for construction breakage and cutting.
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
          onClick={() => setCurrentStep('dimensions')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Edit
        </button>
      </div>

      {/* Calculation Modal */}
      {showCalculationModal && <CalculationDetailsModal />}
    </div>
  );

  // Main Render Logic
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {currentStep === 'brickType' && renderBrickTypeStep()}
      {currentStep === 'dimensions' && renderDimensionsStep()}
      {currentStep === 'result' && renderResultStep()}
    </div>
  );
};

export default BricksCalculator;
