/**
 * Flooring Module
 * Calculates flooring area and material requirements
 */

/**
 * Calculate flooring area
 */
export const calculateFlooringArea = (params) => {
  const { carpetArea = 0, builtUpArea = 0, floringType = 'tile' } = params;

  // For most flooring: use carpet area
  // If providing built-up area separately (includes corridors, etc.)
  const area = carpetArea > 0 ? carpetArea : builtUpArea;

  return Math.max(0, area);
};

/**
 * Calculate tile quantities for specific flooring type
 */
export const calculateTileQuantity = (params) => {
  const {
    flooringArea = 0,
    tileSize = 'medium', // 'small' (200x200), 'medium' (300x300), 'large' (600x600), 'extra' (800x800)
    wastagePercent = 10
  } = params;

  // Tile size in mm and coverage per piece
  const tileSizes = {
    small: { length: 200, width: 200, coverage: 0.04 }, // 0.04 m²
    medium: { length: 300, width: 300, coverage: 0.09 }, // 0.09 m²
    large: { length: 600, width: 600, coverage: 0.36 }, // 0.36 m²
    extra: { length: 800, width: 800, coverage: 0.64 } // 0.64 m²
  };

  const selectedSize = tileSizes[tileSize] || tileSizes.medium;
  const baseTiles = Math.ceil(flooringArea / selectedSize.coverage);

  // Apply wastage
  const wasteFactor = 1 + (wastagePercent / 100);
  const totalTiles = Math.ceil(baseTiles * wasteFactor);

  // Tiles per box (typically 8-10 pieces depending on size)
  const tilesPerBox = tileSize === 'small' ? 25 : tileSize === 'medium' ? 10 : 6;
  const boxesRequired = Math.ceil(totalTiles / tilesPerBox);

  return {
    flooringArea: parseFloat(flooringArea.toFixed(2)),
    tileSize,
    tileUnit: `${selectedSize.length}x${selectedSize.width}mm`,
    coveragePerTile: selectedSize.coverage,
    baseTiles,
    wastagePercent,
    totalTiles,
    tilesPerBox,
    boxesRequired
  };
};

/**
 * Calculate flooring installation materials
 */
export const calculateInstallationMaterials = (params) => {
  const {
    flooringArea = 0,
    installationType = 'glue-down', // 'glue-down', 'mortar-bed', 'floating'
    groutJointSize = 0.003 // 3mm default
  } = params;

  // Material requirements per m²
  const materials = {
    'glue-down': {
      adhesive: 1.5, // litre per m² (thin-set or epoxy)
      grout: 0.5, // kg per m² for joints
      sealant: 0.1 // litre for sealant
    },
    'mortar-bed': {
      cement: 50, // kg per m²
      sand: 0.15, // m³ per m²
      grout: 0.8 // kg per m²
    },
    'floating': {
      underlay: 1, // m² per m² (1:1)
      clips: 20, // pieces per m²
      spacers: 40 // pieces per m²
    }
  };

  const selectedMethod = materials[installationType] || materials['glue-down'];

  let result = {
    flooringArea: parseFloat(flooringArea.toFixed(2)),
    installationType,
    groutJointSize: `${groutJointSize * 1000}mm`
  };

  // Add specific materials based on installation type
  if (installationType === 'glue-down') {
    result.adhesiveLitres = Math.ceil(flooringArea * selectedMethod.adhesive);
    result.groutKg = Math.ceil(flooringArea * selectedMethod.grout);
    result.sealantLitres = Math.ceil(flooringArea * selectedMethod.sealant);
  } else if (installationType === 'mortar-bed') {
    result.cementKg = Math.ceil(flooringArea * selectedMethod.cement);
    result.sandM3 = parseFloat((flooringArea * selectedMethod.sand).toFixed(2));
    result.groutKg = Math.ceil(flooringArea * selectedMethod.grout);
  } else if (installationType === 'floating') {
    result.underlayM2 = parseFloat(flooringArea.toFixed(2));
    result.clipsRequired = Math.ceil(flooringArea * selectedMethod.clips);
    result.spacersRequired = Math.ceil(flooringArea * selectedMethod.spacers);
  }

  return result;
};

/**
 * Total flooring calculation
 */
export const calculateTotalFlooring = (params) => {
  const {
    carpetArea = 0,
    tileSize = 'medium',
    installationType = 'mortar-bed',
    flooringType = 'ceramic', // 'ceramic', 'vitrified', 'granite', 'marble', 'mosaic'
    tileWastagePercent = 10,
    materialWastagePercent = 5
  } = params;

  // Calculate area
  const flooringArea = calculateFlooringArea({
    carpetArea,
    floringType: flooringType
  });

  if (flooringArea === 0) {
    return {
      flooringArea: 0,
      area: 0,
      tiles: null,
      installation: null,
      wastagePercent: materialWastagePercent
    };
  }

  // Calculate tiles
  const tiles = calculateTileQuantity({
    flooringArea,
    tileSize,
    wastagePercent: tileWastagePercent
  });

  // Calculate installation materials
  const installation = calculateInstallationMaterials({
    flooringArea,
    installationType
  });

  // Summary
  return {
    flooringArea: parseFloat(flooringArea.toFixed(2)),
    flooringType,
    tiles,
    installation,
    summary: {
      totalBoxes: tiles.boxesRequired,
      installationMethod: installationType,
      baseArea: parseFloat(flooringArea.toFixed(2))
    }
  };
};

export default {
  calculateFlooringArea,
  calculateTileQuantity,
  calculateInstallationMaterials,
  calculateTotalFlooring
};
