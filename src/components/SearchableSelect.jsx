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
        className="w-full border border-line rounded px-3 py-2 text-sm bg-surface cursor-pointer flex justify-between items-center hover:bg-canvas transition-colors"
      >
        <span className={value ? 'text-ink' : 'text-dim'}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-line rounded shadow-lg">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border-b border-line focus:outline-none focus:ring-2 focus:ring-ink"
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
                      ? 'bg-surface-hover text-ink font-medium'
                      : 'hover:bg-surface-hover text-ink'
                  }`}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-dim">No matches found</div>
            )}
          </div>
        </div>
      )}

      {required && !value && isOpen === false && (
        <p className="mt-1 text-xs text-dim">Required field</p>
      )}
    </div>
  );
}

export default SearchableSelect;
