import React from 'react';
import { Hash } from 'lucide-react';

const HashtagDropdown = ({
  showHashtagDropdown,
  departments,
  hashtagQuery,
  insertHashtag
}) => {
  if (!showHashtagDropdown) return null;

  const filteredDepartments = departments.filter(dept => 
    dept.toLowerCase().includes(hashtagQuery.toLowerCase())
  );

  return (
    <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
      {filteredDepartments.length > 0 ? (
        filteredDepartments.map((dept) => (
          <button
            key={dept}
            onClick={() => insertHashtag(dept)}
            className="w-full px-2 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
          >
            <Hash className="w-4 h-4 text-gray-400 font-bold" />
            <span className="text-sm text-gray-900 font-bold">{dept}</span>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">No departments found</div>
      )}
    </div>
  );
};

export default HashtagDropdown;
