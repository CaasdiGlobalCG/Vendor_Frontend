/**
 * Plaster Module
 * Calculates plaster area and material requirements
 */

/**
 * Calculate plaster area for internal surfaces
 * @param {Object} params - {wallArea, plasterBothSides, deductionsArea}
 * @returns {number} - total plaster area in m²
 */
export const calculatePlasterArea = (params) => {
  const { wallArea = 0, plasterBothSides = true, deductionsArea = 0 } = params;

  let netArea = wallArea - deductionsArea;
  if (plasterBothSides) {
    netArea = netArea * 2; // Both sides
  }

  return Math.max(0, netArea);
};

/**
 * Calculate plaster volume and materials
 * @param {Object} params - {plasterArea, plasterThickness, plasterType}
 * @returns {Object} - plaster materials required
 */
export const calculatePlasterMaterials = (params) => {
  const {
    plasterArea = 0,
    plasterThickness = 0.015, // 15mm default
    plasterType = 'cement' // 'cement' or 'gypsum'
  } = params;

  // Volume = Area × Thickness
  const plasterVolume = plasterArea * plasterThickness;

  // Plaster mix design (1:3 or 1:4 cement:sand typical)
  // Assuming 1:4 mix
  // For 1 m³ of plaster: ~320 kg cement + 1.28 m³ sand
  const cementPerM3 = 320; // kg
  const sandPerM3 = 1.28; // m³

  const cementRequired = (plasterVolume * cementPerM3) / 50; // in bags (50kg each)
  const sandRequired = plasterVolume * sandPerM3;

  return {
    plasterArea: parseFloat(plasterArea.toFixed(2)),
    plasterThickness: parseFloat(plasterThickness.toFixed(3)),
    plasterVolume: parseFloat(plasterVolume.toFixed(3)),
    plasterType,
    materials: {
      cementBags: Math.ceil(cementRequired),
      sandM3: parseFloat(sandRequired.toFixed(3))
    }
  };
};

/**
 * Calculate finishing material (paint, etc.)
 */
export const calculateFinishingMaterials = (params) => {
  const { plasterArea = 0, paintType = 'emulsion' } = params;

  // Paint coverage: typically 10-14 m²/litre
  const paintCoverage = paintType === 'enamel' ? 10 : 12;
  const paintRequired = Math.ceil(plasterArea / paintCoverage);

  // Primer: 1 coat for fresh plaster
  const primerRequired = Math.ceil(plasterArea / 14);

  return {
    plasterArea,
    paintType,
    paintLitres: paintRequired,
    primerLitres: primerRequired,
    twoCoats: paintRequired * 2
  };
};

/**
 * Total plaster calculation for all surfaces
 */
export const calculateTotalPlaster = (params) => {
  const {
    // Wall areas
    interiorWallArea = 0,
    exteriorWallArea = 0,
    deductionsArea = 0,

    // Properties
    internalPlasterThickness = 0.012,
    externalPlasterThickness = 0.020,
    plasterBothSides = false,
    paintType = 'emulsion',
    wastagePercent = 5
  } = params;

  // Calculate internal plaster
  const internalArea = calculatePlasterArea({
    wallArea: interiorWallArea,
    plasterBothSides,
    deductionsArea: deductionsArea * 0.6 // Assume 60% of deductions are internal
  });

  const internalPlaster = calculatePlasterMaterials({
    plasterArea: internalArea,
    plasterThickness: internalPlasterThickness,
    plasterType: 'cement'
  });

  // Calculate external plaster
  const externalArea = calculatePlasterArea({
    wallArea: exteriorWallArea,
    plasterBothSides: false,
    deductionsArea: deductionsArea * 0.4 // Assume 40% of deductions are external
  });

  const externalPlaster = calculatePlasterMaterials({
    plasterArea: externalArea,
    plasterThickness: externalPlasterThickness,
    plasterType: 'cement'
  });

  // Calculate finishing
  const totalArea = internalArea + externalArea;
  const finishing = calculateFinishingMaterials({
    plasterArea: totalArea,
    paintType
  });

  // Apply wastage to materials
  const wasteFactor = 1 + (wastagePercent / 100);
  const totalCement = (internalPlaster.materials.cementBags + externalPlaster.materials.cementBags) * wasteFactor;
  const totalSand = (internalPlaster.materials.sandM3 + externalPlaster.materials.sandM3) * wasteFactor;

  return {
    internal: internalPlaster,
    external: externalPlaster,
    totalPlasterArea: parseFloat(totalArea.toFixed(2)),
    totalPlasterVolume: parseFloat((internalPlaster.plasterVolume + externalPlaster.plasterVolume).toFixed(3)),
    materials: {
      cementBags: Math.ceil(totalCement),
      sandM3: parseFloat(totalSand.toFixed(3))
    },
    finishing,
    wastagePercent
  };
};

export default {
  calculatePlasterArea,
  calculatePlasterMaterials,
  calculateFinishingMaterials,
  calculateTotalPlaster
};
