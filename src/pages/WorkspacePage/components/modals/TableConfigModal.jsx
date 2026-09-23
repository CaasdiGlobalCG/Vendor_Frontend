import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus, Minus, FileSpreadsheet, Edit3 } from 'lucide-react';
import * as XLSX from 'xlsx';

const TableConfigModal = ({ isOpen, onClose, onConfirm, tableType }) => {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'upload'
  const [tableData, setTableData] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' }
  ]);
  const [columns, setColumns] = useState(['name', 'email', 'role', 'status']);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  
  // Multi-sheet support
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [workbookData, setWorkbookData] = useState(null);
  const [sheetPreview, setSheetPreview] = useState(null);

  // Generate preview of sheet data
  const generateSheetPreview = (sheetName) => {
    if (!workbookData || !sheetName) return;
    
    try {
      const worksheet = workbookData.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        setSheetPreview({ headers: [], rows: [], isEmpty: true });
        return;
      }
      
      // Get headers and first few rows for preview
      const headers = jsonData[0] ? jsonData[0].map(header => String(header).trim()) : [];
      const previewRows = jsonData.slice(1, 4).map(row => 
        headers.map((_, i) => row[i] ? String(row[i]).trim() : '')
      );
      
      setSheetPreview({
        headers,
        rows: previewRows,
        totalRows: jsonData.length - 1, // Exclude header row
        isEmpty: false
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      setSheetPreview({ headers: [], rows: [], isEmpty: true, error: true });
    }
  };

  // Generate preview when sheet selector is shown and a sheet is selected
  useEffect(() => {
    if (showSheetSelector && selectedSheet && workbookData) {
      generateSheetPreview(selectedSheet);
    }
  }, [showSheetSelector, selectedSheet, workbookData]);

  if (!isOpen) return null;

  const addRow = () => {
    const newId = Math.max(...tableData.map(row => row.id || 0)) + 1;
    const newRow = { id: newId };
    columns.forEach(col => {
      newRow[col] = '';
    });
    setTableData([...tableData, newRow]);
  };

  const removeRow = (index) => {
    if (tableData.length > 1) {
      setTableData(tableData.filter((_, i) => i !== index));
    }
  };

  const addColumn = () => {
    const newColumnName = `column_${columns.length + 1}`;
    setColumns([...columns, newColumnName]);
    setTableData(tableData.map(row => ({
      ...row,
      [newColumnName]: ''
    })));
  };

  const removeColumn = (columnIndex) => {
    if (columns.length > 1) {
      const columnToRemove = columns[columnIndex];
      setColumns(columns.filter((_, i) => i !== columnIndex));
      setTableData(tableData.map(row => {
        const newRow = { ...row };
        delete newRow[columnToRemove];
        return newRow;
      }));
    }
  };

  const updateColumnName = (index, newName) => {
    const oldName = columns[index];
    const newColumns = [...columns];
    newColumns[index] = newName;
    setColumns(newColumns);
    
    // Update data with new column name
    setTableData(tableData.map(row => {
      const newRow = { ...row };
      if (oldName !== newName) {
        newRow[newName] = newRow[oldName] || '';
        delete newRow[oldName];
      }
      return newRow;
    }));
  };

  const updateCellValue = (rowIndex, column, value) => {
    const newData = [...tableData];
    newData[rowIndex][column] = value;
    setTableData(newData);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        parseCsvData(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parseXlsxData(file);
      } else {
        alert('Please upload a CSV or XLSX file.');
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
      setIsProcessing(false);
    }
  };

  const parseCsvData = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      alert('CSV file should have at least a header row and one data row.');
      setIsProcessing(false);
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    // Parse data rows
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
      const row = { id: index + 1 };
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });

    setColumns(headers);
    setTableData(data);
    setActiveTab('manual'); // Switch to manual tab to show the imported data
    setIsProcessing(false);
  };

  const parseXlsxData = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Store workbook for later use
      setWorkbookData(workbook);
      
      // Check if there are multiple sheets
      if (workbook.SheetNames.length > 1) {
        // Multiple sheets found - show sheet selector
        setAvailableSheets(workbook.SheetNames);
        setSelectedSheet(workbook.SheetNames[0]); // Default to first sheet
        // Generate preview for default sheet (will be done in handleSheetSelection)
        setShowSheetSelector(true);
        setIsProcessing(false);
        return;
      }
      
      // Single sheet - process directly
      processWorksheetData(workbook, workbook.SheetNames[0]);
    } catch (error) {
      console.error('Error parsing XLSX file:', error);
      alert('Error parsing Excel file. Please check the file format.');
      setIsProcessing(false);
    }
  };

  const processWorksheetData = (workbook, sheetName) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        alert(`Sheet "${sheetName}" should have at least a header row and one data row.`);
        setIsProcessing(false);
        return;
      }

      // Parse header
      const headers = jsonData[0].map(header => String(header).trim());
      
      // Parse data rows
      const data = jsonData.slice(1).map((row, index) => {
        const rowData = { id: index + 1 };
        headers.forEach((header, i) => {
          rowData[header] = row[i] ? String(row[i]).trim() : '';
        });
        return rowData;
      });

      setColumns(headers);
      setTableData(data);
      setActiveTab('manual'); // Switch to manual tab to show the imported data
      setShowSheetSelector(false); // Hide sheet selector
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing worksheet:', error);
      alert(`Error processing sheet "${sheetName}". Please check the sheet format.`);
      setIsProcessing(false);
    }
  };

  const handleSheetSelection = (sheetName) => {
    setSelectedSheet(sheetName);
    generateSheetPreview(sheetName);
  };

  const confirmSheetSelection = () => {
    if (workbookData && selectedSheet) {
      setIsProcessing(true);
      processWorksheetData(workbookData, selectedSheet);
    }
  };

  const cancelSheetSelection = () => {
    setShowSheetSelector(false);
    setAvailableSheets([]);
    setSelectedSheet('');
    setWorkbookData(null);
    setSheetPreview(null);
    setFileName('');
  };

  const handleConfirm = () => {
    onConfirm({
      data: tableData,
      columns: columns,
      tableType: tableType
    });
    onClose();
  };

  const resetToDefault = () => {
    setTableData([
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' }
    ]);
    setColumns(['name', 'email', 'role', 'status']);
    setFileName('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div>
            <h2 className="text-lg font-bold text-ink">Configure Table Data</h2>
            <p className="text-xs text-dim mt-0.5">Set up your {tableType?.replace('-', ' ')} with custom data</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-dim" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-info border-b-2 border-info bg-info/10'
                : 'text-dim hover:text-ink'
            }`}
          >
            <Edit3 className="w-3 h-3 inline mr-1" />
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-info border-b-2 border-info bg-info/10'
                : 'text-dim hover:text-ink'
            }`}
          >
            <Upload className="w-3 h-3 inline mr-1" />
            File Upload
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'manual' && (
            <div className="space-y-4">
              {/* Column Controls */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Table Structure</h3>
                <div className="flex space-x-1.5">
                  <button
                    onClick={addColumn}
                    className="px-2 py-1 bg-success text-white rounded text-xs hover:bg-success flex items-center space-x-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Column</span>
                  </button>
                  <button
                    onClick={addRow}
                    className="px-2 py-1 bg-info text-white rounded text-xs hover:bg-info flex items-center space-x-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Row</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-canvas">
                    <tr>
                      {columns.map((column, index) => (
                        <th key={index} className="px-2 py-1.5 border-b border-line">
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={column}
                              onChange={(e) => updateColumnName(index, e.target.value)}
                              className="font-semibold text-xs text-ink bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-info rounded px-1.5 py-0.5"
                            />
                            {columns.length > 1 && (
                              <button
                                onClick={() => removeColumn(index)}
                                className="text-danger hover:text-danger"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-2 py-1.5 border-b border-line w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rowIndex) => (
                      <tr key={row.id || rowIndex} className="hover:bg-canvas">
                        {columns.map((column) => (
                          <td key={column} className="px-2 py-1.5 border-b border-line">
                            <input
                              type="text"
                              value={row[column] || ''}
                              onChange={(e) => updateCellValue(rowIndex, column, e.target.value)}
                              className="w-full px-1.5 py-0.5 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-info"
                              placeholder={`Enter ${column}`}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 border-b border-line">
                          {tableData.length > 1 && (
                            <button
                              onClick={() => removeRow(rowIndex)}
                              className="text-danger hover:text-danger"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-dim space-y-0.5">
                <p>• Click column headers to rename them</p>
                <p>• Use the + buttons to add more rows or columns</p>
                <p>• Use the - buttons to remove rows or columns</p>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div className="text-center">
                <FileSpreadsheet className="w-10 h-10 text-dim mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-ink mb-1">Upload Your Data</h3>
                <p className="text-xs text-dim mb-4">
                  Upload a CSV or Excel file to automatically populate your table
                </p>

                {/* File Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-line rounded-lg p-8 hover:border-info hover:bg-info/10 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-dim mx-auto mb-2" />
                  <p className="text-dim">
                    {fileName ? `Selected: ${fileName}` : 'Click to select CSV or Excel file'}
                  </p>
                  <p className="text-sm text-dim mt-2">
                    Supports CSV and XLSX files with headers
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {isProcessing && (
                  <div className="mt-4 text-info">
                    Processing file...
                  </div>
                )}

                {fileName && !isProcessing && (
                  <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-success text-sm">
                      ✅ File uploaded successfully! Switch to Manual Entry tab to review the data.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-canvas p-3 rounded-lg">
                <h4 className="font-semibold text-xs text-ink mb-1">File Format Requirements:</h4>
                <ul className="text-xs text-dim space-y-0.5">
                  <li>• First row should contain column headers</li>
                  <li>• CSV: Data should be comma-separated</li>
                  <li>• CSV: Text with commas should be enclosed in quotes</li>
                  <li>• Excel: Multiple sheets supported - you'll be asked to choose</li>
                  <li>• Excel: Single sheet files will be imported automatically</li>
                  <li>• Example: name,email,role,status</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Sheet Selector Modal Overlay */}
        {showSheetSelector && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-ink mb-4">
                  Multiple Sheets Found
                </h3>
                <p className="text-dim mb-4">
                  This Excel file contains multiple worksheets. Please select which sheet you'd like to import:
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sheet Selection */}
                  <div>
                    <h4 className="font-medium text-ink mb-3">Available Sheets:</h4>
                    <div className="space-y-2 mb-6">
                      {availableSheets.map((sheetName, index) => (
                        <label key={sheetName} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-canvas">
                          <input
                            type="radio"
                            name="selectedSheet"
                            value={sheetName}
                            checked={selectedSheet === sheetName}
                            onChange={() => handleSheetSelection(sheetName)}
                            className="text-info focus:ring-info"
                          />
                          <span className="text-ink font-medium">{sheetName}</span>
                          {index === 0 && (
                            <span className="text-xs text-dim bg-surface-hover px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <h4 className="font-medium text-ink mb-3">Preview:</h4>
                    {sheetPreview ? (
                      <div className="border border-line rounded-lg overflow-hidden">
                        {sheetPreview.isEmpty ? (
                          <div className="p-4 text-center text-dim">
                            {sheetPreview.error ? 'Error reading sheet' : 'Sheet appears to be empty'}
                          </div>
                        ) : (
                          <div>
                            <div className="bg-canvas px-3 py-2 text-sm text-dim border-b">
                              {sheetPreview.totalRows} rows • {sheetPreview.headers.length} columns
                            </div>
                            <div className="overflow-x-auto max-h-48">
                              <table className="min-w-full text-sm">
                                <thead className="bg-surface-hover">
                                  <tr>
                                    {sheetPreview.headers.map((header, i) => (
                                      <th key={i} className="px-3 py-2 text-left font-medium text-ink border-r border-line last:border-r-0">
                                        {header || `Column ${i + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sheetPreview.rows.map((row, i) => (
                                    <tr key={i} className="border-b border-line">
                                      {row.map((cell, j) => (
                                        <td key={j} className="px-3 py-2 text-dim border-r border-line last:border-r-0">
                                          {cell || '-'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {sheetPreview.totalRows > 3 && (
                              <div className="px-3 py-2 text-xs text-dim bg-canvas border-t">
                                Showing first 3 rows of {sheetPreview.totalRows} total rows
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border border-line rounded-lg p-4 text-center text-dim">
                        Select a sheet to see preview
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 mt-6 pt-4 border-t">
                  <button
                    onClick={confirmSheetSelection}
                    disabled={!selectedSheet}
                    className="flex-1 px-4 py-2 bg-info text-white rounded-lg hover:bg-info disabled:bg-surface-hover disabled:cursor-not-allowed transition-colors"
                  >
                    Import Selected Sheet
                  </button>
                  <button
                    onClick={cancelSheetSelection}
                    className="flex-1 px-4 py-2 bg-surface-hover text-ink rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3 border-t border-line bg-canvas">
          <button
            onClick={resetToDefault}
            className="px-3 py-1.5 text-xs text-dim hover:text-ink transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-line text-xs text-ink rounded-lg hover:bg-canvas transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 bg-info text-white text-xs rounded-lg hover:bg-info transition-colors"
            >
              Create Table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableConfigModal;
