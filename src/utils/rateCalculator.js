// Rate calculation utilities for quotes

import { parseMeasurement, calculateAreaInSqFt } from './unitConverter';

// Calculate rate per square foot from total rate and measurements
export const calculateRatePerSqft = (totalRate, measurements) => {
  const rate = parseFloat(totalRate);
  if (!rate || !measurements) return null;

  const areaInSqFt = calculateAreaInSqFt(measurements);
  if (!areaInSqFt || areaInSqFt <= 0) return null;

  const ratePerSqft = rate / areaInSqFt;
  
  return {
    ratePerSqft: ratePerSqft,
    calculation: `Rate per sqft = ₹${rate} ÷ ${areaInSqFt.toFixed(2)} sqft = ₹${ratePerSqft.toFixed(2)}/sqft`,
    areaUsed: areaInSqFt
  };
};

// Calculate total rate from rate per square foot and measurements
export const calculateTotalRate = (ratePerSqft, measurements) => {
  const rate = parseFloat(ratePerSqft);
  if (!rate || !measurements) return null;

  const areaInSqFt = calculateAreaInSqFt(measurements);
  if (!areaInSqFt || areaInSqFt <= 0) return null;

  const totalRate = rate * areaInSqFt;
  
  return {
    totalRate: totalRate,
    calculation: `Total rate = ₹${rate}/sqft × ${areaInSqFt.toFixed(2)} sqft = ₹${totalRate.toFixed(2)}`,
    areaUsed: areaInSqFt
  };
};

// Check consistency between total rate, rate per sqft, and measurements
export const checkRateConsistency = (totalRate, ratePerSqft, measurements) => {
  const rate = parseFloat(totalRate);
  const ratePerSq = parseFloat(ratePerSqft);
  
  if (!rate || !ratePerSq || !measurements) {
    return { isConsistent: true, message: null };
  }

  const areaInSqFt = calculateAreaInSqFt(measurements);
  if (!areaInSqFt || areaInSqFt <= 0) {
    return { isConsistent: false, message: 'Invalid measurements for area calculation' };
  }

  const expectedTotalRate = ratePerSq * areaInSqFt;
  const expectedRatePerSqft = rate / areaInSqFt;
  
  const tolerance = 0.01; // Allow 1 paisa difference due to rounding
  const totalRateDiff = Math.abs(rate - expectedTotalRate);
  const ratePerSqftDiff = Math.abs(ratePerSq - expectedRatePerSqft);
  
  if (totalRateDiff <= tolerance && ratePerSqftDiff <= tolerance) {
    return { 
      isConsistent: true, 
      message: `Rates are consistent: ₹${rate} = ₹${ratePerSq}/sqft × ${areaInSqFt.toFixed(2)} sqft` 
    };
  } else {
    return { 
      isConsistent: false, 
      message: `Rate mismatch: Expected total ₹${expectedTotalRate.toFixed(2)} or rate/sqft ₹${expectedRatePerSqft.toFixed(2)}` 
    };
  }
};

// Determine what should be calculated based on available inputs and which field was just changed
export const determineCalculationTarget = (totalRate, ratePerSqft, measurements, changedField) => {
  const hasRate = totalRate && parseFloat(totalRate) > 0;
  const hasRatePerSqft = ratePerSqft && parseFloat(ratePerSqft) > 0;
  const hasMeasurements = measurements && measurements.trim();
  
  // If measurements are missing, can't do area-based calculations
  if (!hasMeasurements) {
    return null;
  }

  // Determine calculation based on what was changed and what's available
  if (changedField === 'rate' && hasRatePerSqft) {
    // Rate was changed, check consistency
    return 'check';
  } else if (changedField === 'ratePerSqft' && hasRate) {
    // Rate per sqft was changed, check consistency
    return 'check';
  } else if (changedField === 'measurements') {
    // Measurements changed, recalculate based on what's available
    if (hasRate && hasRatePerSqft) {
      return 'check';
    } else if (hasRate) {
      return 'ratePerSqft';
    } else if (hasRatePerSqft) {
      return 'rate';
    }
  } else if (changedField === 'rate' && !hasRatePerSqft) {
    // Only rate is available, calculate rate per sqft
    return 'ratePerSqft';
  } else if (changedField === 'ratePerSqft' && !hasRate) {
    // Only rate per sqft is available, calculate total rate
    return 'rate';
  }

  return null;
};

// Format currency value
export const formatCurrency = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
};

// Calculate percentage
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return (parseFloat(value) / parseFloat(total)) * 100;
};

// Apply percentage to value
export const applyPercentage = (value, percentage) => {
  return parseFloat(value) * (parseFloat(percentage) / 100);
};

// Round to nearest paisa (0.01)
export const roundToPaisa = (value) => {
  return Math.round(parseFloat(value) * 100) / 100;
};
