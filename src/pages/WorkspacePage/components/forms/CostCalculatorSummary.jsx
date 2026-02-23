import React, { useRef } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

const CostCalculatorSummary = ({ data }) => {
  const tableRef = useRef(null);

  const calculatorResults = data?.data?.calculatorResults || [];
  const labourCosts = data?.data?.labourCosts || [];
  const totalLabourCost = data?.data?.totalLabourCost || 0;

  // Export to PDF
  const exportToPDF = () => {
    if (!tableRef.current) return;

    const element = tableRef.current;
    const opt = {
      margin: 10,
      filename: 'cost-summary.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Export to Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Calculator Results
    const calculatorData = [
      ['#', 'Calculator', 'Status'],
      ...calculatorResults.map((result, idx) => [idx + 1, result.name, 'Calculated'])
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(calculatorData);
    ws1['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, ws1, 'Calculators');

    // Sheet 2: Labour Costs
    if (labourCosts.length > 0) {
      const labourData = [
        ['Labour Type', 'Quantity', 'Cost per Unit', 'Total'],
        ...labourCosts.map(labour => [
          labour.description,
          labour.quantity,
          `₹${parseFloat(labour.unitCost).toLocaleString()}`,
          `₹${parseFloat(labour.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        ]),
        ['', '', 'TOTAL:', `₹${totalLabourCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(labourData);
      ws2['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, ws2, 'Labour Costs');
    }

    XLSX.writeFile(workbook, 'cost-summary.xlsx');
  };

  return (
    <div className="w-full h-full bg-white p-6 rounded-lg overflow-auto" ref={tableRef}>
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cost Calculation Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Calculator Results */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Calculation Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">Calculator</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {calculatorResults.map((result, idx) => (
                <tr key={result.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{result.name}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">✓ Calculated</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Labour Costs */}
      {labourCosts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">👷 Labour Costs</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-300">Labour Type</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b border-gray-300">Quantity</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b border-gray-300">Cost per Unit</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b border-gray-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {labourCosts.map((labour) => (
                  <tr key={labour.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{labour.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{labour.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">₹{parseFloat(labour.unitCost).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">
                      ₹{parseFloat(labour.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-300">
                  <td colSpan="3" className="px-4 py-3 text-sm text-gray-900 text-right">Total Labour Cost:</td>
                  <td className="px-4 py-3 text-sm text-blue-600 text-right">
                    ₹{totalLabourCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Labour Costs Message */}
      {labourCosts.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-sm text-yellow-800">No labour costs added</p>
        </div>
      )}
    </div>
  );
};

export default CostCalculatorSummary;

