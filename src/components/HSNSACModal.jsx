import React, { useState, useEffect } from 'react';
import { X, Search, Package, Wrench } from 'lucide-react';
import hsnSacData from '../data/hsn-sac-codes.json';

const HSNSACModal = ({ isOpen, onClose, onSelect, type = 'product' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);

  // Get codes based on type
  const codes = type === 'product' ? hsnSacData.hsn : hsnSacData.sac;
  const codeType = type === 'product' ? 'HSN' : 'SAC';

  // Filter codes based on search
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = codes.filter(item => 
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 50); // Show up to 50 results
      setFilteredCodes(filtered);
    } else {
      setFilteredCodes(codes.slice(0, 50)); // Show first 50 codes by default
    }
  }, [searchTerm, codes]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedCode(null);
      setFilteredCodes(codes.slice(0, 50));
    }
  }, [isOpen, codes]);

  const handleSelect = () => {
    if (selectedCode) {
      onSelect(selectedCode);
      onClose();
    }
  };

  const handleCodeClick = (code) => {
    setSelectedCode(code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              {type === 'product' ? 
                <Package className="w-6 h-6" /> :
                <Wrench className="w-6 h-6" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold">Select {codeType} Code</h2>
              <p className="text-blue-200 text-sm">
                Choose from {codes.length} available {codeType} codes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-stone-200 bg-stone-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${codeType} code or description...`}
              className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              autoFocus
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-stone-600">
            <span>
              {filteredCodes.length} codes found
              {searchTerm && ` for "${searchTerm}"`}
            </span>
            {filteredCodes.length === 50 && !searchTerm && (
              <span className="text-blue-600">Showing first 50 codes</span>
            )}
          </div>
        </div>

        {/* Codes List */}
        <div className="flex-1 overflow-y-auto max-h-[50vh]">
          {filteredCodes.length > 0 ? (
            <div className="p-4 space-y-2">
              {filteredCodes.map((code, index) => (
                <button
                  key={index}
                  onClick={() => handleCodeClick(code)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                    selectedCode?.code === code.code
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-stone-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-lg ${
                        selectedCode?.code === code.code ? 'text-blue-700' : 'text-stone-800'
                      }`}>
                        {code.code}
                      </div>
                      <div className={`text-sm mt-1 ${
                        selectedCode?.code === code.code ? 'text-blue-600' : 'text-stone-600'
                      }`}>
                        {code.description}
                      </div>
                    </div>
                    {selectedCode?.code === code.code && (
                      <div className="ml-4 flex-shrink-0">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-stone-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-stone-700 mb-2">
                No {codeType} codes found
              </h3>
              <p className="text-stone-500">
                Try searching with different keywords or check your spelling
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="text-sm text-stone-600">
            {selectedCode ? (
              <span className="font-medium text-blue-600">
                Selected: {selectedCode.code} - {selectedCode.description.substring(0, 50)}
                {selectedCode.description.length > 50 ? '...' : ''}
              </span>
            ) : (
              <span>Select a {codeType} code to continue</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-stone-600 hover:text-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedCode}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Select Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HSNSACModal;
