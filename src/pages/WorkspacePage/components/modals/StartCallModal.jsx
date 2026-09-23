import React, { useState, useEffect } from 'react';
import { X, Phone, PhoneOff, Users, Search } from 'lucide-react';
import useVideoCall from '../../../../hooks/useVideoCall';

/**
 * StartCallModal - Component to initiate a new video call
 * Allows user to select collaborators to invite
 */
const StartCallModal = ({
  isOpen,
  onClose,
  workspaceId,
  currentUser,
  collaborators = [],
  onStartCall  // Add this prop for callback
}) => {
  const [callTitle, setCallTitle] = useState('');
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCollaborators, setFilteredCollaborators] = useState([]);
  const { startCall, error: callError } = useVideoCall();

  // Filter collaborators based on search
  useEffect(() => {
    console.log('📞 StartCallModal: Collaborators received:', collaborators);
    const filtered = collaborators.filter(collab =>
      collab.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collab.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('📞 StartCallModal: Filtered collaborators:', filtered);
    setFilteredCollaborators(filtered);
  }, [searchQuery, collaborators]);

  const toggleCollaborator = (collaborator) => {
    const collaboratorId = collaborator.vendorId || collaborator.userId || collaborator.id;
    setSelectedCollaborators(prev => {
      const isSelected = prev.some(c => c.vendorId === collaboratorId || c.userId === collaboratorId);
      if (isSelected) {
        return prev.filter(c => c.vendorId !== collaboratorId && c.userId !== collaboratorId);
      } else {
        return [...prev, { ...collaborator, userId: collaboratorId, vendorId: collaboratorId }];
      }
    });
  };

  const handleStartCall = async () => {
    if (!callTitle.trim()) {
      alert('Please enter a call title');
      return;
    }

    if (selectedCollaborators.length === 0) {
      alert('Please select at least one collaborator to invite');
      return;
    }

    setIsLoading(true);

    try {
      const callData = {
        selectedCollaborators,
        callTitle,
        workspaceId,
        initiatorId: currentUser.vendorId || currentUser.id,
        initiatorName: currentUser.name || currentUser.vendorName || 'User'
      };

      console.log('📞 Modal: Calling onStartCall with data:', callData);
      
      // Call the parent handler instead of calling startCall hook directly
      await onStartCall(callData);

      // Reset form
      setCallTitle('');
      setSelectedCollaborators([]);
      setSearchQuery('');

      // Close modal
      onClose();

      console.log('✅ Call initiated successfully');

    } catch (err) {
      console.error('❌ Error starting call:', err);
      alert(`Failed to start call: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Start Video Call</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-info rounded transition disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {callError && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
              <p className="text-danger text-sm">
                <strong>Error:</strong> {callError}
              </p>
            </div>
          )}

          {/* Call Title */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Call Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={callTitle}
              onChange={(e) => setCallTitle(e.target.value)}
              placeholder="e.g., Project Discussion, Client Meeting"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-info disabled:bg-surface-hover"
            />
          </div>

          {/* Collaborators Section */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Invite Collaborators <span className="text-danger">*</span>
              </div>
            </label>

            {/* Search Box */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-dim" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-info disabled:bg-surface-hover"
              />
            </div>

            {/* Collaborators List */}
            <div className="border border-line rounded-lg max-h-64 overflow-y-auto bg-canvas">
              {filteredCollaborators.length > 0 ? (
                <div className="divide-y">
                  {filteredCollaborators.map((collaborator) => {
                    const collaboratorId = collaborator.vendorId || collaborator.userId || collaborator.id;
                    return (
                    <label
                      key={collaboratorId}
                      className="flex items-center gap-3 p-4 hover:bg-surface-hover cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollaborators.some(c => (c.vendorId === collaboratorId || c.userId === collaboratorId))}
                        onChange={() => toggleCollaborator(collaborator)}
                        disabled={isLoading}
                        className="w-4 h-4 rounded border-line text-info focus:ring-info disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-ink">{collaborator.name || 'Unknown'}</p>
                        <p className="text-xs text-dim">{collaborator.email || 'No email'}</p>
                        {collaborator.role && (
                          <p className="text-xs text-info mt-1">
                            {collaborator.role.toUpperCase()}
                          </p>
                        )}
                      </div>
                      <div className="text-xs bg-info/10 text-info px-2 py-1 rounded">
                        {collaborator.userType || 'Collaborator'}
                      </div>
                    </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-dim">
                  {collaborators.length === 0
                    ? 'No collaborators available'
                    : 'No matching collaborators found'}
                </div>
              )}
            </div>

            {/* Selected Count */}
            {selectedCollaborators.length > 0 && (
              <div className="mt-3 text-sm text-info">
                {selectedCollaborators.length} collaborator{selectedCollaborators.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-canvas border-t border-line p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 border border-line text-ink rounded-lg hover:bg-surface-hover transition disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleStartCall}
            disabled={isLoading || !callTitle.trim() || selectedCollaborators.length === 0}
            className="px-6 py-2 bg-black text-white rounded-lg hover:from-black hover:to-black transition disabled:opacity-50 font-medium flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            {isLoading ? 'Starting...' : 'Start Call'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartCallModal;
