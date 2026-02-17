/**
 * Rate Engine Module
 * Applies material rates and calculates costs
 */

/**
 * Standard material rate database (example rates in Indian Rupees)
 * Real rates should come from external rate sheet
 */
export const STANDARD_RATES = {
  excavation: {
    unit: 'm³',
    rate: 150 // ₹ per m³
  },
  concreteM10: {
    unit: 'm³',
    rate: 7500
  },
  concreteM15: {
    unit: 'm³',
    rate: 8200
  },
  concreteM20: {
    unit: 'm³',
    rate: 9000
  },
  concreteM25: {
    unit: 'm³',
    rate: 10000
  },
  steelTMT: {
    unit: 'kg',
    rate: 65 // ₹ per kg
  },
  steelBinding: {
    unit: 'kg',
    rate: 70
  },
  brickClay: {
    unit: 'number',
    rate: 6 // ₹ per brick
  },
  cementBag: {
    unit: 'bag',
    rate: 400 // 50kg bag
  },
  sandM3: {
    unit: 'm³',
    rate: 1200
  },
  aggregate20mm: {
    unit: 'm³',
    rate: 1400
  },
  labor: {
    unit: 'm³',
    rate: 500 // labor cost per m³ of work
  },
  labour_skilled: {
    unit: 'day',
    rate: 800
  },
  labour_unskilled: {
    unit: 'day',
    rate: 400
  }
};

/**
 * Calculate item cost with rate
 */
export const calculateItemCost = (params) => {
  const {
    description = '',
    quantity = 0,
    unit = 'unit',
    rate = 0,
    wastagePercent = 0,
    labourPercent = 15,
    profitMargin = 10
  } = params;

  // Apply wastage to quantity
  const quantityWithWastage = quantity * (1 + wastagePercent / 100);

  // Material cost
  const materialCost = quantityWithWastage * rate;

  // Labour cost (percentage of material)
  const labourCost = (materialCost * labourPercent) / 100;

  // Total before profit
  const subtotal = materialCost + labourCost;

  // Apply profit margin
  const profitAmount = (subtotal * profitMargin) / 100;
  const totalCost = subtotal + profitAmount;

  return {
    description,
    baseQuantity: parseFloat(quantity.toFixed(3)),
    wastagePercent,
    quantityWithWastage: parseFloat(quantityWithWastage.toFixed(3)),
    unit,
    rate: parseFloat(rate.toFixed(2)),
    materialCost: parseFloat(materialCost.toFixed(2)),
    labourPercent,
    labourCost: parseFloat(labourCost.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    profitMarginPercent: profitMargin,
    profitAmount: parseFloat(profitAmount.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2))
  };
};

/**
 * Calculate project overhead costs
 */
export const calculateOverheadCosts = (params) => {
  const {
    subtotal = 0,
    overheadPercent = 10, // site office, supervision, equipment rental
    contingencyPercent = 5 // for unforeseen expenses
  } = params;

  const overhead = (subtotal * overheadPercent) / 100;
  const contingency = (subtotal * contingencyPercent) / 100;
  const totalAfterOverhead = subtotal + overhead + contingency;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    overheadPercent,
    overheadAmount: parseFloat(overhead.toFixed(2)),
    contingencyPercent,
    contingencyAmount: parseFloat(contingency.toFixed(2)),
    totalAfterOverhead: parseFloat(totalAfterOverhead.toFixed(2))
  };
};

/**
 * Apply GST (Goods and Services Tax)
 */
export const applyGST = (params) => {
  const {
    amount = 0,
    gstPercent = 18 // 18% standard GST rate
  } = params;

  const gstAmount = (amount * gstPercent) / 100;
  const totalWithGST = amount + gstAmount;

  return {
    amount: parseFloat(amount.toFixed(2)),
    gstPercent,
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    totalWithGST: parseFloat(totalWithGST.toFixed(2))
  };
};

/**
 * Calculate complete project cost breakdown
 */
export const calculateProjectCost = (params) => {
  const {
    boqItems = [], // Array of {description, quantity, unit, rate, wastagePercent}
    overheadPercent = 10,
    contingencyPercent = 5,
    labourPercent = 15,
    profitMargin = 10,
    gstPercent = 18,
    roundValues = true
  } = params;

  // Calculate item-wise costs
  const itemCosts = boqItems.map(item => {
    return calculateItemCost({
      ...item,
      labourPercent,
      profitMargin
    });
  });

  // Sum all items
  const subtotal = itemCosts.reduce((sum, item) => sum + item.totalCost, 0);

  // Calculate overhead and contingency
  const overheadCalc = calculateOverheadCosts({
    subtotal,
    overheadPercent,
    contingencyPercent
  });

  // Apply GST
  const gstCalc = applyGST({
    amount: overheadCalc.totalAfterOverhead,
    gstPercent
  });

  // Round if required
  const grandTotal = roundValues 
    ? Math.ceil(gstCalc.totalWithGST / 100) * 100
    : gstCalc.totalWithGST;

  return {
    itemsCost: {
      itemCount: itemCosts.length,
      items: itemCosts,
      subtotal: parseFloat(subtotal.toFixed(2))
    },
    overhead: overheadCalc,
    gst: gstCalc,
    finalCost: {
      beforeGST: parseFloat(overheadCalc.totalAfterOverhead.toFixed(2)),
      gstAmount: parseFloat(gstCalc.gstAmount.toFixed(2)),
      roundedTotal: parseFloat(grandTotal.toFixed(2)),
      exactTotal: parseFloat(gstCalc.totalWithGST.toFixed(2))
    },
    summary: {
      baseAmount: subtotal,
      overheadAmount: overheadCalc.overheadAmount,
      contingencyAmount: overheadCalc.contingencyAmount,
      gstAmount: gstCalc.gstAmount,
      grandTotal: grandTotal
    }
  };
};

/**
 * Format cost breakdown for display
 */
export const formatCostBreakdown = (costData) => {
  const { itemsCost, overhead, gst, summary } = costData;

  return {
    line1: `Material + Labour: ₹${itemsCost.subtotal.toLocaleString('en-IN')}`,
    line2: `Overhead (${overhead.overheadPercent}%): ₹${overhead.overheadAmount.toLocaleString('en-IN')}`,
    line3: `Contingency (${overhead.contingencyPercent}%): ₹${overhead.contingencyAmount.toLocaleString('en-IN')}`,
    line4: `Sub Total: ₹${overhead.totalAfterOverhead.toLocaleString('en-IN')}`,
    line5: `GST (${gst.gstPercent}%): ₹${gst.gstAmount.toLocaleString('en-IN')}`,
    line6: `Grand Total: ₹${summary.grandTotal.toLocaleString('en-IN')}`
  };
};

export default {
  STANDARD_RATES,
  calculateItemCost,
  calculateOverheadCosts,
  applyGST,
  calculateProjectCost,
  formatCostBreakdown
};
