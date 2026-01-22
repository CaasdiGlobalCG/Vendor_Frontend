import React, { useState, useRef, useEffect } from 'react';

export function SearchableSelect({ 
  name, 
  value, 
  onChange, 
  options, 
  placeholder = 'Select an option',
  required = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange({ target: { name, value: option } });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white cursor-pointer flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    value === option
                      ? 'bg-emerald-100 text-emerald-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
            )}
          </div>
        </div>
      )}

      {required && !value && isOpen === false && (
        <p className="mt-1 text-xs text-gray-400">Required field</p>
      )}
    </div>
  );
}

export default SearchableSelect;
