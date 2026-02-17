/**
 * Steel Reinforcement Module
 * Supports two modes: percentage-based and element-wise calculation
 */

// Steel density: 7850 kg/m³
const STEEL_DENSITY = 7850;

// Typical steel percentages for different elements (kg per m³ of concrete)
const ELEMENT_STEEL_DENSITY = {
  slab: 80,      // 80-100 kg/m³
  beam: 120,     // 120-150 kg/m³
  column: 100,   // 100-120 kg/m³
  footing: 60    // 60-80 kg/m³
};

/**
 * Calculate steel using percentage mode
 * Total concrete volume × steel percentage
 * @param {Object} params - {totalConcreteVolume, steelPercentage}
 * @returns {Object} - steel weight details
 */
export const calculateSteelPercentageMode = (params) => {
  const { totalConcreteVolume = 0, steelPercentage = 100 } = params;

  // Steel weight = Concrete volume × steel density per m³
  // (steelPercentage is kg per m³)
  const totalSteelKg = totalConcreteVolume * steelPercentage;
  const totalSteelTons = totalSteelKg / 1000;

  return {
    mode: 'percentage',
    steelPercentage,
    totalConcreteVolume,
    totalSteelKg: parseFloat(totalSteelKg.toFixed(2)),
    totalSteelTons: parseFloat(totalSteelTons.toFixed(3))
  };
};

/**
 * Calculate steel using element-wise mode
 * Different density for each structural element
 * @param {Object} params - {slabVolume, beamVolume, columnVolume, footingVolume}
 * @returns {Object} - itemized steel weights
 */
export const calculateSteelElementwiseMode = (params) => {
  const {
    slabVolume = 0,
    beamVolume = 0,
    columnVolume = 0,
    footingVolume = 0,
    slabSteelDensity = 80,
    beamSteelDensity = 120,
    columnSteelDensity = 100,
    footingSteelDensity = 60
  } = params;

  // Calculate element-wise steel
  const slabSteel = slabVolume * slabSteelDensity;
  const beamSteel = beamVolume * beamSteelDensity;
  const columnSteel = columnVolume * columnSteelDensity;
  const footingSteel = footingVolume * footingSteelDensity;

  const totalSteelKg = slabSteel + beamSteel + columnSteel + footingSteel;
  const totalSteelTons = totalSteelKg / 1000;

  return {
    mode: 'elementwise',
    elements: {
      slabSteel: parseFloat(slabSteel.toFixed(2)),
      beamSteel: parseFloat(beamSteel.toFixed(2)),
      columnSteel: parseFloat(columnSteel.toFixed(2)),
      footingSteel: parseFloat(footingSteel.toFixed(2))
    },
    totalSteelKg: parseFloat(totalSteelKg.toFixed(2)),
    totalSteelTons: parseFloat(totalSteelTons.toFixed(3)),
    breakdown: {
      slabPercent: parseFloat(((slabSteel / totalSteelKg) * 100).toFixed(1)),
      beamPercent: parseFloat(((beamSteel / totalSteelKg) * 100).toFixed(1)),
      columnPercent: parseFloat(((columnSteel / totalSteelKg) * 100).toFixed(1)),
      footingPercent: parseFloat(((footingSteel / totalSteelKg) * 100).toFixed(1))
    }
  };
};

/**
 * Calculate steel with wastage
 * @param {Object} steelData - output from percentage or elementwise mode
 * @param {number} wastagePercent - wastage percentage
 * @returns {Object} - steel with wastage applied
 */
export const applySteelWastage = (steelData, wastagePercent = 5) => {
  const wasteFactor = 1 + (wastagePercent / 100);
  const totalWithWastage = steelData.totalSteelKg * wasteFactor;
  const tonsWithWastage = totalWithWastage / 1000;

  return {
    ...steelData,
    wastagePercent,
    totalSteelKg: parseFloat(totalWithWastage.toFixed(2)),
    totalSteelTons: parseFloat(tonsWithWastage.toFixed(3)),
    wasteKg: parseFloat(((totalWithWastage - steelData.totalSteelKg)).toFixed(2))
  };
};

/**
 * Calculate bar cutting and binding wire requirements
 * @param {number} totalSteelKg - total steel weight
 * @returns {Object} - cutting and binding materials
 */
export const calculateCuttingAndBinding = (totalSteelKg) => {
  // Binding wire: typically 1-1.5% of steel weight
  const bindingWireKg = (totalSteelKg * 1.2) / 100;

  // Cutting loss: typically 2-3% of steel weight
  const cuttingLossKg = (totalSteelKg * 2.5) / 100;

  return {
    bindingWireKg: parseFloat(bindingWireKg.toFixed(2)),
    cuttingLossKg: parseFloat(cuttingLossKg.toFixed(2)),
    totalRelatedMaterials: parseFloat((bindingWireKg + cuttingLossKg).toFixed(2))
  };
};

/**
 * Master function to calculate total steel
 */
export const calculateTotalSteel = (params) => {
  const {
    // Mode selection
    steelMode = 'percentage', // 'percentage' or 'elementwise'
    steelPercentage = 100,

    // Concrete volumes
    totalConcreteVolume = 0,
    slabVolume = 0,
    beamVolume = 0,
    columnVolume = 0,
    footingVolume = 0,

    // Element-wise densities
    slabSteelDensity = 80,
    beamSteelDensity = 120,
    columnSteelDensity = 100,
    footingSteelDensity = 60,

    // Wastage
    steelWastagePercent = 5
  } = params;

  let steelData;

  if (steelMode === 'percentage') {
    steelData = calculateSteelPercentageMode({
      totalConcreteVolume,
      steelPercentage
    });
  } else {
    steelData = calculateSteelElementwiseMode({
      slabVolume,
      beamVolume,
      columnVolume,
      footingVolume,
      slabSteelDensity,
      beamSteelDensity,
      columnSteelDensity,
      footingSteelDensity
    });
  }

  // Apply wastage
  steelData = applySteelWastage(steelData, steelWastagePercent);

  // Calculate binding and cutting
  const bindingData = calculateCuttingAndBinding(steelData.totalSteelKg);

  return {
    ...steelData,
    bindingAndCutting: bindingData
  };
};

export default {
  calculateSteelPercentageMode,
  calculateSteelElementwiseMode,
  applySteelWastage,
  calculateCuttingAndBinding,
  calculateTotalSteel,
  ELEMENT_STEEL_DENSITY,
  STEEL_DENSITY
};
