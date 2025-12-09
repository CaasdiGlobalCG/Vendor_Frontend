import React from 'react';

const MentionDropdown = ({
  showMentionDropdown,
  collaborators,
  mentionQuery,
  insertMention
}) => {
  if (!showMentionDropdown) return null;

  const filteredCollaborators = collaborators.filter(collab => 
    collab.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
      {filteredCollaborators.length > 0 ? (
        filteredCollaborators.map((collab, index) => (
          <button
            key={`${collab.vendorId}-${collab.name}-${index}`}
            onClick={() => insertMention(collab.name)}
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {collab.avatar || collab.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{collab.name}</div>
              <div className="text-xs text-gray-500">{collab.specialization}</div>
            </div>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">No collaborators found</div>
      )}
    </div>
  );
};

export default MentionDropdown;
