/**
 * Masonry Module
 * Calculates brickwork and block quantities
 */

// Standard brick units (m³)
const BRICK_SIZES = {
  'standard': { length: 0.19, width: 0.09, height: 0.09, bricksPerM3: 500 },
  'interlocking': { length: 0.19, width: 0.09, height: 0.09, bricksPerM3: 500 }
};

/**
 * Calculate masonry wall volume
 * @param {Object} params - {wallLength, wallHeight, wallThickness, openingsArea}
 * @returns {number} - volume in m³
 */
export const calculateMasonryVolume = (params) => {
  const { wallLength = 0, wallHeight = 0, wallThickness = 0, openingsArea = 0 } = params;

  // Wall volume = L × H × T
  const wallVolume = wallLength * wallHeight * wallThickness;

  // Deduct openings (doors, windows, etc.)
  const netVolume = wallVolume - openingsArea;

  return Math.max(0, netVolume); // Ensure non-negative
};

/**
 * Calculate brick requirement
 * @param {Object} params - {masonryVolume, brickType}
 * @returns {Object} - brick quantities and mortar
 */
export const calculateBricks = (params) => {
  const { masonryVolume = 0, brickType = 'standard' } = params;

  const brickData = BRICK_SIZES[brickType] || BRICK_SIZES.standard;
  const numberOfBricks = masonryVolume * brickData.bricksPerM3;

  // Mortar volume = Total volume - brick volume
  // Brick volume = (number of bricks × brick volume)
  const brickVolumeM3 = numberOfBricks / brickData.bricksPerM3;
  const mortarVolumeM3 = masonryVolume - brickVolumeM3;

  return {
    numberOfBricks: Math.ceil(numberOfBricks),
    bricksPerM3: brickData.bricksPerM3,
    brickSize: brickType,
    mortarVolume: parseFloat(mortarVolumeM3.toFixed(3)),
    mortarBags: Math.ceil(mortarVolumeM3 * 500) // ~500 bags per m³
  };
};

/**
 * Calculate total masonry for all walls
 */
export const calculateTotalMasonry = (params) => {
  const {
    // Exterior walls
    exteriorWallLength = 0,
    exteriorWallHeight = 0,
    exteriorWallThickness = 0.3,
    exteriorOpeningsArea = 0,

    // Interior walls
    interiorWallLength = 0,
    interiorWallHeight = 0,
    interiorWallThickness = 0.15,
    interiorOpeningsArea = 0,

    // Material
    brickType = 'standard',
    wastagePercent = 5
  } = params;

  // Calculate exterior masonry
  const extVolume = calculateMasonryVolume({
    wallLength: exteriorWallLength,
    wallHeight: exteriorWallHeight,
    wallThickness: exteriorWallThickness,
    openingsArea: exteriorOpeningsArea
  });

  // Calculate interior masonry
  const intVolume = calculateMasonryVolume({
    wallLength: interiorWallLength,
    wallHeight: interiorWallHeight,
    wallThickness: interiorWallThickness,
    openingsArea: interiorOpeningsArea
  });

  const totalMasonryVolume = extVolume + intVolume;

  // Apply wastage
  const wasteFactor = 1 + (wastagePercent / 100);
  const volumeWithWastage = totalMasonryVolume * wasteFactor;

  // Calculate bricks
  const brickData = calculateBricks({
    masonryVolume: volumeWithWastage,
    brickType
  });

  return {
    volumes: {
      exteriorVolume: parseFloat(extVolume.toFixed(3)),
      interiorVolume: parseFloat(intVolume.toFixed(3)),
      totalMasonryVolume: parseFloat(totalMasonryVolume.toFixed(3))
    },
    wastagePercent,
    volumeWithWastage: parseFloat(volumeWithWastage.toFixed(3)),
    bricks: brickData
  };
};

export default {
  calculateMasonryVolume,
  calculateBricks,
  calculateTotalMasonry,
  BRICK_SIZES
};
