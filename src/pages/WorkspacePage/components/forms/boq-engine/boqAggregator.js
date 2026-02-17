/**
 * BOQ Aggregator Module
 * Compiles all calculation engines into professional BOQ structure
 */

import excavationEngine from './excavationEngine.js';
import concreteEngine from './concreteEngine.js';
import steelEngine from './steelEngine.js';
import masonryEngine from './masonryEngine.js';
import plasterEngine from './plasterEngine.js';
import flooringEngine from './flooringEngine.js';
import rateEngine from './rateEngine.js';

/**
 * Export BOQ to Excel format
 */
export const exportToExcel = (boqStructure, costBreakdown) => {
  try {
    // Create CSV data
    const { projectInfo, sections } = boqStructure;
    let csvContent = `Bill of Quantities (BOQ)\n`;
    csvContent += `Project Name: ${projectInfo.projectName}\n`;
    csvContent += `Description: ${projectInfo.projectDescription}\n`;
    csvContent += `Client: ${projectInfo.clientName}\n`;
    csvContent += `Date: ${projectInfo.generatedDate}\n\n`;

    // Add sections
    sections.forEach(section => {
      csvContent += `SECTION ${section.sectionNo}: ${section.sectionName}\n`;
      csvContent += `${section.description}\n`;
      csvContent += `S.No.,Description,Qty,Unit,Rate,Amount\n`;

      section.items.forEach(item => {
        const amount = (item.quantity || 0) * (item.rate || 0);
        csvContent += `"${item.itemNo}","${item.description}","${(item.quantity || 0).toFixed(2)}","${item.unit}","${(item.rate || 0).toFixed(0)}","${amount.toFixed(0)}"\n`;
      });
      csvContent += `\n`;
    });

    // Add cost breakdown
    if (costBreakdown) {
      csvContent += `COST BREAKDOWN\n`;
      csvContent += `Material + Labour: ₹${costBreakdown.itemsCost.subtotal.toLocaleString('en-IN')}\n`;
      csvContent += `Overhead (${costBreakdown.overhead.overheadPercent}%): ₹${costBreakdown.overhead.overheadAmount.toLocaleString('en-IN')}\n`;
      csvContent += `Contingency (${costBreakdown.overhead.contingencyPercent}%): ₹${costBreakdown.overhead.contingencyAmount.toLocaleString('en-IN')}\n`;
      csvContent += `Subtotal: ₹${costBreakdown.overhead.totalAfterOverhead.toLocaleString('en-IN')}\n`;
      csvContent += `GST (${costBreakdown.gst.gstPercent}%): ₹${costBreakdown.gst.gstAmount.toLocaleString('en-IN')}\n`;
      csvContent += `GRAND TOTAL: ₹${costBreakdown.summary.grandTotal.toLocaleString('en-IN')}\n`;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectInfo.projectName}_BOQ.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

/**
 * Export BOQ to PDF format (using HTML table)
 */
export const exportToPDF = (boqStructure, costBreakdown) => {
  try {
    const { projectInfo, sections } = boqStructure;
    
    let htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #1e40af; text-align: center; }
        .project-info { margin: 20px 0; padding: 10px; background: #f0f9ff; border-left: 4px solid #1e40af; }
        .section { margin: 20px 0; page-break-inside: avoid; }
        .section-title { background: #1e40af; color: white; padding: 10px; font-weight: bold; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #e0e7ff; border: 1px solid #c7d2fe; padding: 8px; text-align: left; }
        td { border: 1px solid #e5e7eb; padding: 8px; }
        tr:nth-child(even) { background: #f9fafb; }
        .cost-breakdown { margin: 20px 0; padding: 15px; background: #f0fdf4; border-left: 4px solid #16a34a; }
        .cost-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #d1d5db; }
        .total { font-weight: bold; font-size: 18px; background: #dcfce7; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Bill of Quantities (BOQ)</h1>
      <div class="project-info">
        <p><strong>Project Name:</strong> ${projectInfo.projectName}</p>
        <p><strong>Description:</strong> ${projectInfo.projectDescription || 'N/A'}</p>
        <p><strong>Client:</strong> ${projectInfo.clientName || 'N/A'}</p>
        <p><strong>Date:</strong> ${projectInfo.generatedDate}</p>
      </div>
    `;

    // Add sections with tables
    sections.forEach(section => {
      htmlContent += `
      <div class="section">
        <div class="section-title">SECTION ${section.sectionNo}: ${section.sectionName}</div>
        <p>${section.description}</p>
        <table>
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Rate (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
      `;

      section.items.forEach(item => {
        const amount = (item.quantity || 0) * (item.rate || 0);
        htmlContent += `
            <tr>
              <td>${item.itemNo}</td>
              <td>${item.description}</td>
              <td align="right">${(item.quantity || 0).toFixed(2)}</td>
              <td>${item.unit}</td>
              <td align="right">${(item.rate || 0).toLocaleString('en-IN')}</td>
              <td align="right"><strong>${amount.toLocaleString('en-IN')}</strong></td>
            </tr>
        `;
      });

      htmlContent += `
          </tbody>
        </table>
      </div>
      `;
    });

    // Add cost breakdown
    if (costBreakdown) {
      htmlContent += `
      <div class="cost-breakdown">
        <h2>Cost Breakdown</h2>
        <div class="cost-row">
          <span>Material + Labour:</span>
          <strong>₹${costBreakdown.itemsCost.subtotal.toLocaleString('en-IN')}</strong>
        </div>
        <div class="cost-row">
          <span>Overhead (${costBreakdown.overhead.overheadPercent}%):</span>
          <strong>₹${costBreakdown.overhead.overheadAmount.toLocaleString('en-IN')}</strong>
        </div>
        <div class="cost-row">
          <span>Contingency (${costBreakdown.overhead.contingencyPercent}%):</span>
          <strong>₹${costBreakdown.overhead.contingencyAmount.toLocaleString('en-IN')}</strong>
        </div>
        <div class="cost-row">
          <span>Subtotal:</span>
          <strong>₹${costBreakdown.overhead.totalAfterOverhead.toLocaleString('en-IN')}</strong>
        </div>
        <div class="cost-row">
          <span>GST (${costBreakdown.gst.gstPercent}%):</span>
          <strong>₹${costBreakdown.gst.gstAmount.toLocaleString('en-IN')}</strong>
        </div>
        <div class="total">
          GRAND TOTAL: ₹${costBreakdown.summary.grandTotal.toLocaleString('en-IN')}
        </div>
      </div>
      `;
    }

    htmlContent += `
    </body>
    </html>
    `;

    // Create blob and download as HTML (can be opened and saved as PDF from browser)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectInfo.projectName}_BOQ.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return false;
  }
};

/**
 * Aggregate all calculation results into BOQ sections
 */
export const aggregateAllModules = (params) => {
  const {
    // Excavation data
    excavationParams = null,
    // Concrete data
    concreteParams = null,
    // Steel data
    steelParams = null,
    // Masonry data
    masonryParams = null,
    // Plaster data
    plasterParams = null,
    // Flooring data
    flooringParams = null,
    // Project info
    projectName = 'BOQ',
    projectDescription = '',
    clientName = ''
  } = params;

  const sections = [];
  const allItems = [];

  // 1. EARTHWORK SECTION
  if (excavationParams) {
    const excResult = excavationEngine.calculateTotalExcavation(excavationParams);
    if (excResult && excResult.breakdown) {
      const section = {
        sectionNo: 1,
        sectionName: 'Earthwork',
        description: 'Excavation, backfill, and site preparation',
        items: [
          {
            itemNo: '1.1',
            description: 'Excavation (Footing)',
            quantity: excResult.breakdown.footingExcavation,
            unit: 'm³',
            rate: rateEngine.STANDARD_RATES.excavation.rate,
            remarks: `Swell Factor: ${excavationParams.soilType || 'medium'}`
          },
          {
            itemNo: '1.2',
            description: 'Excavation (Trench)',
            quantity: excResult.breakdown.trenchExcavation,
            unit: 'm³',
            rate: rateEngine.STANDARD_RATES.excavation.rate
          },
          {
            itemNo: '1.3',
            description: 'Spoil Transportation',
            quantity: excResult.truckLoads,
            unit: 'trip',
            rate: 500 // ₹ per truck load
          }
        ]
      };
      sections.push(section);
      allItems.push(...section.items);
    }
  }

  // 2. CONCRETE WORKS SECTION
  if (concreteParams) {
    const conResult = concreteEngine.calculateTotalConcrete(concreteParams);
    if (conResult && conResult.elements) {
      const gradeKey = concreteParams.concreteGrade || 'M20';
      const rateKey = `concrete${gradeKey}`;
      const rate = rateEngine.STANDARD_RATES[rateKey] ? rateEngine.STANDARD_RATES[rateKey].rate : 9000;

      const items = [];
      if (conResult.elements.slabVolume > 0) {
        items.push({
          itemNo: '2.1',
          description: `Concrete in Slabs (${gradeKey})`,
          quantity: conResult.elements.slabVolume,
          unit: 'm³',
          rate
        });
      }
      if (conResult.elements.beamVolume > 0) {
        items.push({
          itemNo: '2.2',
          description: `Concrete in Beams (${gradeKey})`,
          quantity: conResult.elements.beamVolume,
          unit: 'm³',
          rate
        });
      }
      if (conResult.elements.columnVolume > 0) {
        items.push({
          itemNo: '2.3',
          description: `Concrete in Columns (${gradeKey})`,
          quantity: conResult.elements.columnVolume,
          unit: 'm³',
          rate
        });
      }
      if (conResult.elements.footingVolume > 0) {
        items.push({
          itemNo: '2.4',
          description: `Concrete in Footings (${gradeKey})`,
          quantity: conResult.elements.footingVolume,
          unit: 'm³',
          rate
        });
      }

      // PCC layer
      if (conResult.elements.pccVolume > 0) {
        items.push({
          itemNo: '2.5',
          description: 'Plain Cement Concrete (PCC)',
          quantity: conResult.elements.pccVolume,
          unit: 'm³',
          rate: 5000
        });
      }

      if (items.length > 0) {
        const section = {
          sectionNo: 2,
          sectionName: 'Concrete Works',
          description: 'Structural concrete, PCC, and related works',
          items
        };
        sections.push(section);
        allItems.push(...items);
      }
    }
  }

  // 3. REINFORCEMENT SECTION
  if (steelParams) {
    const steelResult = steelEngine.calculateTotalSteel(steelParams);
    if (steelResult) {
      const items = [
        {
          itemNo: '3.1',
          description: 'Reinforcement Steel (TMT Bar)',
          quantity: steelResult.totalSteelTons,
          unit: 'ton',
          rate: rateEngine.STANDARD_RATES.steelTMT.rate * 1000 // Convert to per ton
        },
        {
          itemNo: '3.2',
          description: 'Binding Wire',
          quantity: steelResult.bindingAndCutting.bindingWireKg,
          unit: 'kg',
          rate: rateEngine.STANDARD_RATES.steelBinding.rate
        }
      ];

      const section = {
        sectionNo: 3,
        sectionName: 'Reinforcement',
        description: 'Steel reinforcement and binding materials',
        items
      };
      sections.push(section);
      allItems.push(...items);
    }
  }

  // 4. MASONRY SECTION
  if (masonryParams) {
    const masonryResult = masonryEngine.calculateTotalMasonry(masonryParams);
    if (masonryResult && masonryResult.volumes) {
      const items = [];
      if (masonryResult.volumes.exteriorVolume > 0) {
        items.push({
          itemNo: '4.1',
          description: 'Masonry Work (Exterior Walls - Clay Bricks)',
          quantity: masonryResult.bricks.numberOfBricks * 0.4, // Assume 40% for exterior
          unit: 'number',
          rate: rateEngine.STANDARD_RATES.brickClay.rate
        });
      }
      if (masonryResult.volumes.interiorVolume > 0) {
        items.push({
          itemNo: '4.2',
          description: 'Masonry Work (Interior Walls - Clay Bricks)',
          quantity: masonryResult.bricks.numberOfBricks * 0.6, // Assume 60% for interior
          unit: 'number',
          rate: rateEngine.STANDARD_RATES.brickClay.rate
        });
      }
      if (masonryResult.bricks.mortarBags > 0) {
        items.push({
          itemNo: '4.3',
          description: 'Mortar (Cement:Sand 1:3)',
          quantity: masonryResult.bricks.mortarBags,
          unit: 'bag',
          rate: 150 // ₹ per bag of dry mortar/lime mortar
        });
      }

      if (items.length > 0) {
        const section = {
          sectionNo: 4,
          sectionName: 'Masonry',
          description: 'Brickwork and mortar',
          items
        };
        sections.push(section);
        allItems.push(...items);
      }
    }
  }

  // 5. PLASTER & FINISHES SECTION
  if (plasterParams) {
    const plasterResult = plasterEngine.calculateTotalPlaster(plasterParams);
    if (plasterResult) {
      const items = [
        {
          itemNo: '5.1',
          description: 'Internal Plaster (1:4 Cement:Sand)',
          quantity: plasterResult.internal.plasterArea,
          unit: 'm²',
          rate: 200 // ₹ per m²
        },
        {
          itemNo: '5.2',
          description: 'External Plaster (1:3 Cement:Sand)',
          quantity: plasterResult.external.plasterArea,
          unit: 'm²',
          rate: 250 // ₹ per m²
        },
        {
          itemNo: '5.3',
          description: 'Paint (Emulsion - 2 coats)',
          quantity: plasterResult.finishing.paintLitres,
          unit: 'litre',
          rate: 150 // ₹ per litre
        }
      ];

      const section = {
        sectionNo: 5,
        sectionName: 'Plaster & Finishes',
        description: 'Wall plaster and painting',
        items
      };
      sections.push(section);
      allItems.push(...items);
    }
  }

  // 6. FLOORING SECTION
  if (flooringParams) {
    const flooringResult = flooringEngine.calculateTotalFlooring(flooringParams);
    if (flooringResult && flooringResult.tiles) {
      const items = [
        {
          itemNo: '6.1',
          description: `Flooring (${flooringResult.flooringType} Tiles)`,
          quantity: flooringResult.tiles.boxesRequired,
          unit: 'box',
          rate: 3000 // ₹ per box (varies by tile type)
        },
        {
          itemNo: '6.2',
          description: 'Tile Adhesive (Mortarbed)',
          quantity: flooringResult.installation.cementKg || 0,
          unit: 'kg',
          rate: 250 // ₹ per 50kg bag
        }
      ];

      const section = {
        sectionNo: 6,
        sectionName: 'Flooring',
        description: 'Floor finishes and installation',
        items
      };
      sections.push(section);
      allItems.push(...items);
    }
  }

  return {
    projectInfo: {
      projectName,
      projectDescription,
      clientName,
      generatedDate: new Date().toISOString().split('T')[0]
    },
    sections,
    allItems,
    summary: {
      totalSections: sections.length,
      totalItems: allItems.length,
      estimatedQuantity: allItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
    }
  };
};

/**
 * Calculate BOQ cost estimate
 */
export const calculateBOQCost = (boqStructure, params = {}) => {
  const {
    overheadPercent = 10,
    contingencyPercent = 5,
    labourPercent = 15,
    profitMargin = 10,
    gstPercent = 18
  } = params;

  // Convert BOQ items to cost calculation format
  const boqItems = boqStructure.allItems.map(item => ({
    description: item.description,
    quantity: item.quantity || 0,
    unit: item.unit,
    rate: item.rate || 0,
    wastagePercent: 5 // Default 5% wastage
  }));

  // Calculate total cost
  const costBreakdown = rateEngine.calculateProjectCost({
    boqItems,
    overheadPercent,
    contingencyPercent,
    labourPercent,
    profitMargin,
    gstPercent
  });

  return costBreakdown;
};

/**
 * Generate professional BOQ document
 */
export const generateBOQDocument = (boqStructure, costBreakdown) => {
  const { projectInfo, sections } = boqStructure;

  let document = `
╔════════════════════════════════════════════════════════════════════════╗
║                    BILL OF QUANTITIES (BOQ)                           ║
╚════════════════════════════════════════════════════════════════════════╝

PROJECT NAME: ${projectInfo.projectName}
DESCRIPTION: ${projectInfo.projectDescription}
CLIENT: ${projectInfo.clientName}
DATE: ${projectInfo.generatedDate}

`;

  // Add sections
  sections.forEach(section => {
    document += `\n═══════════════════════════════════════════════════════\n`;
    document += `SECTION ${section.sectionNo}: ${section.sectionName}\n`;
    document += `Description: ${section.description}\n`;
    document += `═══════════════════════════════════════════════════════\n\n`;

    document += `S.No. | Description | Qty | Unit | Rate | Amount\n`;
    document += `─────────────────────────────────────────────────────────\n`;

    section.items.forEach(item => {
      const amount = (item.quantity || 0) * (item.rate || 0);
      document += `${item.itemNo} | ${item.description} | ${(item.quantity || 0).toFixed(2)} | ${item.unit} | ₹${(item.rate || 0).toFixed(0)} | ₹${amount.toFixed(0)}\n`;
    });

    document += `\n`;
  });

  // Add cost breakdown
  if (costBreakdown) {
    document += `\n═══════════════════════════════════════════════════════\n`;
    document += `COST BREAKDOWN\n`;
    document += `═══════════════════════════════════════════════════════\n\n`;
    document += `Material + Labour: ₹${costBreakdown.itemsCost.subtotal.toLocaleString('en-IN')}\n`;
    document += `Overhead (${costBreakdown.overhead.overheadPercent}%): ₹${costBreakdown.overhead.overheadAmount.toLocaleString('en-IN')}\n`;
    document += `Contingency (${costBreakdown.overhead.contingencyPercent}%): ₹${costBreakdown.overhead.contingencyAmount.toLocaleString('en-IN')}\n`;
    document += `Subtotal: ₹${costBreakdown.overhead.totalAfterOverhead.toLocaleString('en-IN')}\n`;
    document += `GST (${costBreakdown.gst.gstPercent}%): ₹${costBreakdown.gst.gstAmount.toLocaleString('en-IN')}\n`;
    document += `GRAND TOTAL: ₹${costBreakdown.summary.grandTotal.toLocaleString('en-IN')}\n`;
  }

  return document;
};

export default {
  aggregateAllModules,
  calculateBOQCost,
  generateBOQDocument,
  exportToExcel,
  exportToPDF
};
