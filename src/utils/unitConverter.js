// Unit conversion utilities for measurements

// Conversion factors to feet
const CONVERSION_FACTORS = {
  // Length units
  'mm': 0.00328084,    // millimeters to feet
  'cm': 0.0328084,     // centimeters to feet
  'm': 3.28084,        // meters to feet
  'in': 0.0833333,     // inches to feet
  'ft': 1,             // feet to feet
  'yd': 3,             // yards to feet
  
  // Area units (square)
  'mm2': 0.00001076391, // square millimeters to square feet
  'cm2': 0.001076391,   // square centimeters to square feet
  'm2': 10.7639,        // square meters to square feet
  'in2': 0.00694444,    // square inches to square feet
  'ft2': 1,             // square feet to square feet
  'yd2': 9,             // square yards to square feet
};

// Parse measurement string and extract dimensions and units
export const parseMeasurement = (measurementStr) => {
  if (!measurementStr || typeof measurementStr !== 'string') {
    return null;
  }

  // Clean the string
  const cleaned = measurementStr.trim().toLowerCase();
  
  // Pattern to match various measurement formats
  // Examples: "10x5 m", "12.5 x 8.2 ft", "100mm x 50mm", "10 m x 5 m"
  const patterns = [
    // Pattern 1: "10x5 m" or "10 x 5 m"
    /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*([a-z]+\d?)$/,
    // Pattern 2: "10m x 5m" 
    /^(\d+(?:\.\d+)?)([a-z]+\d?)\s*x\s*(\d+(?:\.\d+)?)([a-z]+\d?)$/,
    // Pattern 3: Single dimension "10 m"
    /^(\d+(?:\.\d+)?)\s*([a-z]+\d?)$/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (pattern === patterns[0]) {
        // Format: "10x5 m"
        return {
          width: parseFloat(match[1]),
          height: parseFloat(match[2]),
          unit: match[3],
          area: parseFloat(match[1]) * parseFloat(match[2])
        };
      } else if (pattern === patterns[1]) {
        // Format: "10m x 5m"
        const unit1 = match[2];
        const unit2 = match[4];
        if (unit1 === unit2) {
          return {
            width: parseFloat(match[1]),
            height: parseFloat(match[3]),
            unit: unit1,
            area: parseFloat(match[1]) * parseFloat(match[3])
          };
        }
      } else if (pattern === patterns[2]) {
        // Format: "10 m" (single dimension)
        return {
          dimension: parseFloat(match[1]),
          unit: match[2],
          area: null
        };
      }
    }
  }

  return null;
};

// Check if a measurement needs conversion (not already in feet)
export const needsConversion = (measurementStr) => {
  const parsed = parseMeasurement(measurementStr);
  if (!parsed) return false;
  
  return parsed.unit !== 'ft' && parsed.unit !== 'feet';
};

// Convert measurement to feet
export const convertMeasurementToFeet = (measurementStr) => {
  const parsed = parseMeasurement(measurementStr);
  if (!parsed) return measurementStr;

  const conversionFactor = CONVERSION_FACTORS[parsed.unit];
  if (!conversionFactor) return measurementStr;

  if (parsed.area !== null) {
    // Area measurement (width x height)
    const widthInFeet = (parsed.width * conversionFactor).toFixed(2);
    const heightInFeet = (parsed.height * conversionFactor).toFixed(2);
    return `${widthInFeet} x ${heightInFeet} ft`;
  } else if (parsed.dimension !== null) {
    // Single dimension
    const dimensionInFeet = (parsed.dimension * conversionFactor).toFixed(2);
    return `${dimensionInFeet} ft`;
  }

  return measurementStr;
};

// Calculate area in square feet from measurement string
export const calculateAreaInSqFt = (measurementStr) => {
  const parsed = parseMeasurement(measurementStr);
  if (!parsed || parsed.area === null) return null;

  const unit = parsed.unit;
  const areaUnit = unit + '2'; // Convert to area unit (e.g., 'm' -> 'm2')
  
  const conversionFactor = CONVERSION_FACTORS[areaUnit];
  if (!conversionFactor) return null;

  return parsed.area * conversionFactor;
};

// Get supported units
export const getSupportedUnits = () => {
  return Object.keys(CONVERSION_FACTORS).filter(unit => !unit.includes('2'));
};

// Format measurement for display
export const formatMeasurement = (value, unit) => {
  if (!value || !unit) return '';
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '';
  
  return `${numValue} ${unit}`;
};
