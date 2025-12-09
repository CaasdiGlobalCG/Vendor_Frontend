import React, { useContext } from 'react';
import { ChevronDown, Plus, Save, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../../context/VendorContext';

const WorkspaceHeader = ({
  isCanvasActive = false,
  onElementsClick,
  onLayoutsClick,
  onTextClick,
  onTemplatesClick,
  showPostServicesActions = false,
  onOpenPostServices
}) => {
  const navigate = useNavigate();
  const { currentUser } = useContext(VendorContext);


  // Determine the correct dashboard based on user role and access method
 const handleBackToDashboard = () => {
  // Check if user came from PM dashboard
  const storedPmUser = localStorage.getItem('pmUser');
  const storedCurrentUser = localStorage.getItem('currentUser');
  let accessedFromPM = false;

  try {
    if (storedPmUser) {
      const pmUser = JSON.parse(storedPmUser);
      accessedFromPM = pmUser.accessedFrom === 'pm-dashboard';
    } else if (storedCurrentUser) {
      const user = JSON.parse(storedCurrentUser);
      accessedFromPM = user.accessedFrom === 'pm-dashboard' || user.role === 'pm';
    }
  } catch (e) {
    console.error('Error parsing stored user data:', e);
  }

  const isPM = currentUser?.role === 'pm' || 
               currentUser?.pmId || 
               currentUser?.email?.includes('pm') ||
               accessedFromPM;

  if (isPM || accessedFromPM) {
    // Navigate back to PM dashboard on port 3001
    window.location.href = 'http://localhost:3001/dashboard';
  } else {
    navigate('/VendorDashboard');
  }
};

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-1" data-workspace-header>
      <div className="flex items-center justify-between relative">
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleBackToDashboard}
            className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={`Back to ${currentUser?.role === 'pm' ? 'PM' : 'Vendor'} Dashboard`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {/* <span>Back to Dashboard</span> */}
          </button>
          
          <div className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
              CG
            </div>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              disabled={!isCanvasActive}
              onClick={isCanvasActive ? onElementsClick : undefined}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-normal transition-all duration-200 ${
                isCanvasActive
                  ? 'text-gray-700 hover:shadow-md cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
}`}
            >
              <Plus className="w-4 h-4" />
              <span>Elements</span>
            </button>
            <button 
              disabled={!isCanvasActive}
              onClick={isCanvasActive ? onLayoutsClick : undefined}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-normal transition-all duration-200 ${
                isCanvasActive
                    ? 'text-gray-700 hover:shadow-md cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
}`}
            >
              <Plus className="w-4 h-4" />
              <span>Layouts</span>
            </button>
            <button 
              disabled={!isCanvasActive}
              onClick={isCanvasActive ? onTextClick : undefined}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-normal transition-all duration-200 ${
                isCanvasActive
                  ? 'text-gray-700 hover:shadow-md cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed'
}`}
            >
              <Plus className="w-4 h-4" />
              <span>Text</span>
            </button>
            <button 
              disabled={!isCanvasActive}
              onClick={isCanvasActive ? onTemplatesClick : undefined}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-normal transition-all duration-200 ${
                isCanvasActive
                    ? 'text-gray-700 hover:shadow-md cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
            >
              <Plus className="w-4 h-4" />
              <span>Templates</span>
            </button>
          </div>
        </div>

          {/* Centered Workspace Title */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h1 className="text-xl font-semibold text-gray-800">
            {localStorage.getItem('currentWorkspace') || 'Workspace'}
          </h1>
        </div>

        {showPostServicesActions && (
            <button
              onClick={onOpenPostServices}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex flex-col items-center space-y-1"
              title="Post Services"
            >
              <MessageCircle className="w-4 h-4 text-gray-600" />
              <span className="text-[10px] font-medium text-gray-500">Post Service</span>
            </button>
          )}
      </div>
    </div>
  );
};

export default WorkspaceHeader;
