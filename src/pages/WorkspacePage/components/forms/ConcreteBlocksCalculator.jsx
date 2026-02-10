import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

const ConcreteBlocksCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [unit, setUnit] = useState('meter');
  const [wallLength, setWallLength] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const [blockType, setBlockType] = useState('6');
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Block dimensions in mm (height x width x length)
  const blockDimensions = {
    '4': { height: 102, width: 102, length: 203 },
    '6': { height: 152, width: 102, length: 203 },
    '8': { height: 203, width: 102, length: 203 }
  };

  const calculateBlocks = () => {
    if (!wallLength || !wallHeight || !blockType) {
      alert('Please fill in all fields');
      return;
    }

    const length = parseFloat(wallLength);
    const height = parseFloat(wallHeight);

    // Convert to mm if meters
    const lengthMm = unit === 'meter' ? length * 1000 : length * 304.8;
    const heightMm = unit === 'meter' ? height * 1000 : height * 304.8;

    const block = blockDimensions[blockType];
    
    // Calculate number of blocks needed
    // Assuming 1 block per layer, calculating based on wall area
    const blocksHorizontally = Math.ceil(lengthMm / block.length);
    const blocksVertically = Math.ceil(heightMm / block.height);
    const totalBlocks = Math.ceil((blocksHorizontally * blocksVertically) * 1.1); // 10% wastage

    setResult(totalBlocks);
    setShowResult(true);
  };

  const handleReset = () => {
    setWallLength('');
    setWallHeight('');
    setBlockType('6');
    setUnit('meter');
    setResult(null);
    setShowResult(false);
  };

  return (
    <div className="w-full bg-white rounded-lg">
      {!showResult ? (
        <div className="p-6 space-y-4">
          {/* Title */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">Concrete Blocks Calculator</h3>
            <p className="text-sm text-gray-600 mt-1">Calculate the number of concrete blocks needed for your wall</p>
          </div>

          {/* Unit Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Calculate in</label>
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

          {/* Block Type Selection */}
          <div className="space-y-2">
            <label htmlFor="blockType" className="block text-sm font-medium text-gray-700">
              Select the block type
            </label>
            <select
              id="blockType"
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="4">4"</option>
              <option value="6">6"</option>
              <option value="8">8"</option>
            </select>
          </div>

          {/* Visual Block Diagram */}
          <div className="bg-gray-50 rounded-lg p-8 flex justify-center">
            <div className="w-32 h-20 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg shadow-lg border-2 border-gray-600 flex items-center justify-center text-white text-lg font-bold">
              {blockType}" Block
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateBlocks}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <span>Calculate →</span>
          </button>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {/* Result Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Concrete Blocks Calculator</h3>
              <p className="text-sm text-gray-600 mt-1">{result?.toLocaleString()} Blocks</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">{result?.toLocaleString()}</div>
              <div className="text-sm text-gray-600">blocks required</div>
            </div>
          </div>

          {/* Result Details */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Wall Length:</span>
                <span className="font-medium text-gray-900">{wallLength} {unit === 'meter' ? 'm' : 'ft'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Wall Height:</span>
                <span className="font-medium text-gray-900">{wallHeight} {unit === 'meter' ? 'm' : 'ft'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Block Type:</span>
                <span className="font-medium text-gray-900">{blockType}"</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="text-gray-700">Total Blocks (with 10% wastage):</span>
                <span className="font-bold text-blue-600">{result?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Visual Block Diagram */}
          <div className="bg-gray-50 rounded-lg p-8 flex justify-center">
            <div className="w-32 h-20 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg shadow-lg border-2 border-gray-600 flex items-center justify-center text-white text-lg font-bold">
              {blockType}" Block
            </div>
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
              onClick={() => setShowResult(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConcreteBlocksCalculator;
