import React, { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, FileText, XCircle, CheckCircle2, Table as TableIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';

const ManageBOQModal = ({ isOpen, onClose, onTablesExtracted }) => {
  const [file, setFile] = useState(null);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Define onDrop before using it in useDropzone to avoid TDZ issues
  const onDrop = useCallback(async (acceptedFiles) => {
    setError('');
    setSuccess('');
    if (acceptedFiles.length === 0) return;
    const selectedFile = acceptedFiles[0];
    const fileType = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileType)) {
      setError('Please upload a valid Excel or CSV file');
      return;
    }
    setFile(selectedFile);
    setIsLoading(true);
    try {
      const extractedTables = await processFile(selectedFile);
      if (extractedTables.length === 0) {
        setError('No valid tables found in the file');
      } else {
        setTables(extractedTables);
        setSuccess(`Successfully extracted ${extractedTables.length} table(s)`);
        if (onTablesExtracted) {
          onTablesExtracted(extractedTables);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error processing file');
    } finally {
      setIsLoading(false);
    }
  }, [onTablesExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  const extractTables = (file) => {
    setIsLoading(true);
    setError('');
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const extractedTables = [];
        
        workbook.SheetNames.forEach((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length > 0) {
            extractedTables.push({
              id: `table-${index + 1}`,
              name: `Table ${index + 1} (${sheetName})`,
              headers: jsonData[0],
              rows: jsonData.slice(1),
              sheetName
            });
          }
        });
        
        if (extractedTables.length === 0) {
          setError('No valid tables found in the file');
        } else {
          setTables(extractedTables);
          setSuccess(`Successfully extracted ${extractedTables.length} table(s)`);
        }
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Error processing file. Please check the file format and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      setIsLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleDragTable = (e, table) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: table.id,
      type: 'table',
      name: table.name,
      headers: table.headers,
      rows: table.rows,
      sheetName: table.sheetName
    }));
  };

  const moveTableToCanvas = (table) => {
    const event = new CustomEvent('addTableToCanvas', { detail: table });
    document.dispatchEvent(event);
  };

  const handleClose = () => {
    setFile(null);
    setTables([]);
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  const processFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const extractedTables = [];
          
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            if (jsonData.length > 0) {
              // Find the first row with data to determine headers
              let headerRow = 0;
              while (headerRow < jsonData.length && jsonData[headerRow].every(cell => !cell)) {
                headerRow++;
              }
              
              if (headerRow < jsonData.length) {
                const headers = jsonData[headerRow];
                const rows = jsonData.slice(headerRow + 1).filter(row => row.some(cell => cell));
                
                extractedTables.push({
                  id: `table-${Date.now()}-${index}`,
                  name: sheetName || `Table ${index + 1}`,
                  headers: headers,
                  rows: rows,
                  sheetName: sheetName
                });
              }
            }
          });
          
          resolve(extractedTables);
        } catch (err) {
          console.error('Error processing file:', err);
          reject(new Error('Error processing file. Please check the file format.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // (removed duplicate early return)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Manage BOQ</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <div className="flex justify-center">
                <Upload size={32} className="text-gray-400 mx-auto" />
              </div>
              <p className="text-lg font-medium">
                {isDragActive 
                  ? 'Drop the file here' 
                  : file 
                    ? file.name 
                    : 'Drag & drop an Excel or CSV file here, or click to select'}
              </p>
              <p className="text-sm text-gray-500">
                Supports .xlsx, .xls, .csv files (Max 10MB)
              </p>
            </div>
              {file && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>File: {file.name}</p>
                  <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
          </div>

          {isLoading && (
            <div className="mt-4 text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Processing file...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start">
              <XCircle className="flex-shrink-0 h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start">
              <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {tables.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">Extracted Tables</h3>
                <span className="text-sm text-gray-500">{tables.length} table(s) found</span>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {tables.map((table) => (
                  <div 
                    key={table.id}
                    draggable
                    onDragStart={(e) => handleDragTable(e, table)}
                    className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-move group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <TableIcon className="w-4 h-4 text-blue-500" />
                        <h4 className="font-medium text-gray-800">{table.name}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {table.rows.length} rows × {table.headers.length} columns
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveTableToCanvas(table);
                          }}
                          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          title="Move to canvas"
                        >
                          Move to canvas
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {table.sheetName && `Sheet: ${table.sheetName} • `}
                      {table.headers.length} columns, {table.rows.length} rows
                    </div>
                    
                    <div className="overflow-x-auto border rounded">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            {table.headers.slice(0, 4).map((header, idx) => (
                              <th 
                                key={idx} 
                                className="border px-2 py-1.5 text-left text-gray-600 font-medium truncate max-w-[150px]"
                                title={header || `Column ${idx + 1}`}
                              >
                                {header || `Column ${idx + 1}`}
                              </th>
                            ))}
                            {table.headers.length > 4 && (
                              <th className="border px-2 py-1.5 text-left bg-gray-50 text-gray-400">
                                +{table.headers.length - 4} more
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.slice(0, 3).map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-50">
                              {row.slice(0, 4).map((cell, cellIdx) => (
                                <td 
                                  key={cellIdx} 
                                  className="border px-2 py-1.5 truncate max-w-[150px]"
                                  title={String(cell)}
                                >
                                  {String(cell).substring(0, 30)}{String(cell).length > 30 ? '...' : ''}
                                </td>
                              ))}
                              {row.length > 4 && (
                                <td className="border px-2 py-1.5 text-gray-400">...</td>
                              )}
                            </tr>
                          ))}
                          {table.rows.length > 3 && (
                            <tr>
                              <td 
                                colSpan={Math.min(5, table.headers.length)} 
                                className="text-center text-gray-400 text-xs py-1.5 bg-gray-50"
                              >
                                ... and {table.rows.length - 3} more rows
                              </td>
                            </tr>
                          )}
                          {table.rows.length === 0 && (
                            <tr>
                              <td 
                                colSpan={Math.max(1, Math.min(5, table.headers.length))}
                                className="text-center text-gray-400 py-4"
                              >
                                No data rows found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                      <span>Drag to canvas to add table, or use Move to canvas</span>
                      <span className="text-blue-600 hover:text-blue-800 cursor-pointer">View full table</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-between items-center bg-gray-50">
          <div className="text-sm text-gray-500">
            {tables.length > 0 ? (
              <span>Drag tables to the canvas to add them</span>
            ) : (
              <span>Upload an Excel or CSV file to extract tables</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {tables.length > 0 && (
              <button
                onClick={() => {
                  const evt = new CustomEvent('addTablesToCanvas', { detail: { tables } });
                  document.dispatchEvent(evt);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add All to Canvas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageBOQModal;
