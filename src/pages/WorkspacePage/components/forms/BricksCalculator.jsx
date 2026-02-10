import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

const BricksCalculator = ({ data, nodeId, workspaceId, setNodes }) => {
  const [unit, setUnit] = useState('meter');
  const [wallLength, setWallLength] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const [wallThickness, setWallThickness] = useState('4');
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Brick dimensions in mm (height x width x length)
  // Standard brick dimensions
  const brickDimensions = {
    '4': { height: 70, width: 112, length: 240 },  // Single brick (4" thick)
    '9': { height: 70, width: 112, length: 240 }   // Double brick (9" thick)
  };

  const calculateBricks = () => {
    if (!wallLength || !wallHeight || !wallThickness) {
      alert('Please fill in all fields');
      return;
    }

    const length = parseFloat(wallLength);
    const height = parseFloat(wallHeight);

    // Convert to mm if meters
    const lengthMm = unit === 'meter' ? length * 1000 : length * 304.8;
    const heightMm = unit === 'meter' ? height * 1000 : height * 304.8;

    const brick = brickDimensions[wallThickness];
    
    // Calculate number of bricks needed
    // Based on wall area and brick face dimensions
    const bricksHorizontally = Math.ceil(lengthMm / brick.length);
    const bricksVertically = Math.ceil(heightMm / brick.height);
    
    // For wall thickness: 4" = 1 brick thick, 9" = 1.5 bricks thick (approximately)
    const thicknessFactor = wallThickness === '9' ? 1.5 : 1;
    
    const totalBricks = Math.ceil((bricksHorizontally * bricksVertically * thicknessFactor) * 1.1); // 10% wastage

    setResult(totalBricks);
    setShowResult(true);
  };

  const handleReset = () => {
    setWallLength('');
    setWallHeight('');
    setWallThickness('4');
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
            <h3 className="text-xl font-bold text-gray-900">Bricks Calculator</h3>
            <p className="text-sm text-gray-600 mt-1">Estimate the number of bricks required for walls</p>
          </div>

          {/* Unit Selection Dropdown */}
          <div className="space-y-2">
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
              Calculate in
            </label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            >
              <option value="meter">Meter</option>
              <option value="feet">Feet</option>
            </select>
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
            />
          </div>

          {/* Wall Thickness Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Wall Thickness
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50" htmlFor="thickness-4">
                <input
                  id="thickness-4"
                  type="radio"
                  name="thickness"
                  value="4"
                  checked={wallThickness === '4'}
                  onChange={(e) => setWallThickness(e.target.value)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="ml-3 text-gray-900 font-medium">4" Thick</span>
              </label>
              <label className="flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50" htmlFor="thickness-9">
                <input
                  id="thickness-9"
                  type="radio"
                  name="thickness"
                  value="9"
                  checked={wallThickness === '9'}
                  onChange={(e) => setWallThickness(e.target.value)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="ml-3 text-gray-900 font-medium">9" Thick</span>
              </label>
            </div>
          </div>

          {/* Visual Brick Diagram */}
          <div className="bg-gray-50 rounded-lg p-6 flex justify-end">
            <div className="relative w-32 h-24">
              {/* Brick visualization */}
              <div className="w-full h-full bg-gradient-to-b from-orange-300 to-orange-500 rounded-md shadow-lg border-2 border-orange-700 flex items-center justify-center">
                {/* Brick with dimension indicators */}
                <div className="relative w-28 h-20 bg-gradient-to-b from-orange-400 to-orange-600 rounded border border-orange-800"></div>
              </div>
              {/* Dimension labels */}
              <div className="absolute -left-16 top-4 text-xs font-bold text-gray-700">
                <div className="flex flex-col items-center">
                  <span>↑</span>
                  <span>70 mm</span>
                  <span>↓</span>
                </div>
              </div>
              <div className="absolute -bottom-8 left-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                240 mm →
              </div>
              <div className="absolute -right-12 top-8 text-xs font-bold text-gray-700 whitespace-nowrap">
                ← 112 mm
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateBricks}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center text-lg"
          >
            <span>Calculate →</span>
          </button>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {/* Result Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Bricks Calculator</h3>
              <p className="text-sm text-gray-600 mt-1">{result?.toLocaleString()} Bricks</p>
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
                <span className="text-gray-700">Wall Thickness:</span>
                <span className="font-medium text-gray-900">{wallThickness}"</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="text-gray-700">Total Bricks (with 10% wastage):</span>
                <span className="font-bold text-blue-600">{result?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Visual Brick Diagram */}
          <div className="bg-gray-50 rounded-lg p-6 flex justify-center">
            <div className="w-28 h-20 bg-gradient-to-b from-orange-400 to-orange-600 rounded-md shadow-lg border-2 border-orange-700"></div>
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

export default BricksCalculator;
