/**
 * Concrete Module
 * Calculates quantities for slabs, beams, columns, and footings
 */

const CONCRETE_GRADES = {
  M10: { cement: 336, sand: 0.671, aggregate: 1.342, water: 180 },
  M15: { cement: 392, sand: 0.648, aggregate: 1.295, water: 180 },
  M20: { cement: 448, sand: 0.625, aggregate: 1.250, water: 180 },
  M25: { cement: 504, sand: 0.602, aggregate: 1.205, water: 180 }
};

/**
 * Calculate slab volume
 * @param {Object} params - {length, width, thickness, numberOfSlabs}
 * @returns {number} - volume in m³
 */
export const calculateSlabVolume = (params) => {
  const { length = 0, width = 0, thickness = 0, numberOfSlabs = 1 } = params;
  // Volume = L × W × T × No of slabs
  return length * width * thickness * numberOfSlabs;
};

/**
 * Calculate beam volume
 * @param {Object} params - {beamLength, beamWidth, beamDepth, numberOfBeams}
 * @returns {number} - volume in m³
 */
export const calculateBeamVolume = (params) => {
  const { beamLength = 0, beamWidth = 0, beamDepth = 0, numberOfBeams = 1 } = params;
  // Volume = Total length × Width × Depth
  const totalLength = beamLength * numberOfBeams;
  return totalLength * beamWidth * beamDepth;
};

/**
 * Calculate column volume
 * @param {Object} params - {columnLength, columnWidth, columnHeight, numberOfColumns}
 * @returns {number} - volume in m³
 */
export const calculateColumnVolume = (params) => {
  const { columnLength = 0, columnWidth = 0, columnHeight = 0, numberOfColumns = 1 } = params;
  // Volume = L × B × H × No of columns
  return columnLength * columnWidth * columnHeight * numberOfColumns;
};

/**
 * Calculate footing volume
 * @param {Object} params - {footingLength, footingWidth, footingThickness, numberOfFootings}
 * @returns {number} - volume in m³
 */
export const calculateFootingVolume = (params) => {
  const { footingLength = 0, footingWidth = 0, footingThickness = 0, numberOfFootings = 1 } = params;
  // Volume = L × W × T × No of footings
  return footingLength * footingWidth * footingThickness * numberOfFootings;
};

/**
 * Calculate total concrete requirement
 * @param {Object} params - all structural elements
 * @returns {Object} - itemized concrete volumes
 */
export const calculateTotalConcrete = (params) => {
  const {
    // Slabs
    numberOfFloors = 1,
    floorArea = 0,
    slabThickness = 0.15,
    // Beams
    totalBeamLength = 0,
    beamWidth = 0.3,
    beamDepth = 0.5,
    // Columns
    numberOfColumns = 1,
    columnLength = 0.4,
    columnWidth = 0.4,
    columnHeight = 3,
    // Footings
    numberOfFootings = 1,
    footingLength = 1.5,
    footingWidth = 1.5,
    footingThickness = 0.5,
    // PCC (Plain Cement Concrete - below footings)
    pccThickness = 0.1,
    concreteGrade = 'M20',
    wastagePercent = 5
  } = params;

  // Calculate volumes
  const slabVolume = calculateSlabVolume({
    length: Math.sqrt(floorArea),
    width: Math.sqrt(floorArea),
    thickness: slabThickness,
    numberOfSlabs: numberOfFloors
  });

  const beamVolume = calculateBeamVolume({
    beamLength: totalBeamLength,
    beamWidth,
    beamDepth
  });

  const columnVolume = calculateColumnVolume({
    columnLength,
    columnWidth,
    columnHeight,
    numberOfColumns
  });

  const footingVolume = calculateFootingVolume({
    footingLength,
    footingWidth,
    footingThickness,
    numberOfFootings
  });

  // PCC (Plain Cement Concrete - 1:2:4)
  const pccVolume = footingLength * footingWidth * pccThickness * numberOfFootings;

  // Subtotal (all concrete)
  const subtotalVolume = slabVolume + beamVolume + columnVolume + footingVolume + pccVolume;

  // Apply wastage
  const wasteFactor = 1 + (wastagePercent / 100);
  const totalVolumeWithWastage = subtotalVolume * wasteFactor;

  // Get concrete mix design
  const mixDesign = CONCRETE_GRADES[concreteGrade] || CONCRETE_GRADES.M20;

  // Calculate material requirements per m³
  const cementPerM3 = mixDesign.cement / 1440; // kg to bags (1 bag = 50kg, density = 1440 kg/m³)
  const sandPerM3 = mixDesign.sand; // m³
  const aggregatePerM3 = mixDesign.aggregate; // m³
  const waterPerM3 = mixDesign.water; // litres

  return {
    elements: {
      slabVolume: parseFloat(slabVolume.toFixed(3)),
      beamVolume: parseFloat(beamVolume.toFixed(3)),
      columnVolume: parseFloat(columnVolume.toFixed(3)),
      footingVolume: parseFloat(footingVolume.toFixed(3)),
      pccVolume: parseFloat(pccVolume.toFixed(3))
    },
    summary: {
      subtotalVolume: parseFloat(subtotalVolume.toFixed(3)),
      wastagePercent,
      totalVolumeRequired: parseFloat(totalVolumeWithWastage.toFixed(3))
    },
    concreteGrade,
    mixDesign: {
      cementBags: parseFloat((totalVolumeWithWastage * cementPerM3).toFixed(2)),
      sandM3: parseFloat((totalVolumeWithWastage * sandPerM3).toFixed(3)),
      aggregateM3: parseFloat((totalVolumeWithWastage * aggregatePerM3).toFixed(3)),
      waterLitres: parseFloat((totalVolumeWithWastage * waterPerM3).toFixed(0))
    },
    readyMixTrucks: {
      truckCapacity: 8, // m³
      trucksRequired: Math.ceil(totalVolumeWithWastage / 8)
    }
  };
};

export default {
  calculateSlabVolume,
  calculateBeamVolume,
  calculateColumnVolume,
  calculateFootingVolume,
  calculateTotalConcrete,
  CONCRETE_GRADES
};
