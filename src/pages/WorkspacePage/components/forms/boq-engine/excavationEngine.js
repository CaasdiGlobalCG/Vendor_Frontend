/**
 * Excavation Module
 * Calculates volumes for different footing types with swell factors
 */

const SWELL_FACTORS = {
  loose: 1.10,
  medium: 1.20,
  hard: 1.30
};

const TRUCK_CAPACITY = 6; // m³ standard truck

/**
 * Calculate excavation volume for rectangular footings
 * @param {Object} params - {numberOfFootings, footingLength, footingWidth, excavationDepth, soilType}
 * @returns {Object} - {baseVolume, swellVolume, truckLoads}
 */
export const calculateFootingExcavation = (params) => {
  const {
    numberOfFootings = 0,
    footingLength = 0,
    footingWidth = 0,
    excavationDepth = 0,
    soilType = 'medium'
  } = params;

  // Base volume: L × W × D × No of footings
  const baseVolume = footingLength * footingWidth * excavationDepth * numberOfFootings;
  
  // Apply swell factor
  const swellFactor = SWELL_FACTORS[soilType] || SWELL_FACTORS.medium;
  const swellVolume = baseVolume * swellFactor;

  // Calculate truck loads (ceiling)
  const truckLoads = Math.ceil(swellVolume / TRUCK_CAPACITY);

  return {
    baseVolume: parseFloat(baseVolume.toFixed(3)),
    swellVolume: parseFloat(swellVolume.toFixed(3)),
    swellPercent: parseFloat(((swellFactor - 1) * 100).toFixed(2)),
    truckLoads,
    soilType
  };
};

/**
 * Calculate excavation for trenches (strip footings)
 * @param {Object} params - {trenchLength, trenchWidth, trenchDepth, soilType}
 * @returns {Object} - excavation volumes
 */
export const calculateTrenchExcavation = (params) => {
  const {
    trenchLength = 0,
    trenchWidth = 0,
    trenchDepth = 0,
    soilType = 'medium'
  } = params;

  const baseVolume = trenchLength * trenchWidth * trenchDepth;
  const swellFactor = SWELL_FACTORS[soilType] || SWELL_FACTORS.medium;
  const swellVolume = baseVolume * swellFactor;
  const truckLoads = Math.ceil(swellVolume / TRUCK_CAPACITY);

  return {
    baseVolume: parseFloat(baseVolume.toFixed(3)),
    swellVolume: parseFloat(swellVolume.toFixed(3)),
    swellPercent: parseFloat(((swellFactor - 1) * 100).toFixed(2)),
    truckLoads,
    soilType
  };
};

/**
 * Combine all excavation calculations
 */
export const calculateTotalExcavation = (footingData, trenchData = null) => {
  const footing = calculateFootingExcavation(footingData);
  const trench = trenchData ? calculateTrenchExcavation(trenchData) : null;

  const totalBaseVolume = footing.baseVolume + (trench ? trench.baseVolume : 0);
  const totalSwellVolume = footing.swellVolume + (trench ? trench.swellVolume : 0);
  const totalTruckLoads = footing.truckLoads + (trench ? trench.truckLoads : 0);

  return {
    footing,
    trench,
    totalBaseVolume: parseFloat(totalBaseVolume.toFixed(3)),
    totalSwellVolume: parseFloat(totalSwellVolume.toFixed(3)),
    totalTruckLoads,
    breakdown: {
      excavationBaseVolume: totalBaseVolume,
      backfillVolume: totalBaseVolume, // Backfill = excavation base
      spoilRemoval: parseFloat((totalSwellVolume - totalBaseVolume).toFixed(3))
    }
  };
};

export default {
  calculateFootingExcavation,
  calculateTrenchExcavation,
  calculateTotalExcavation,
  SWELL_FACTORS,
  TRUCK_CAPACITY
};
