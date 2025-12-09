import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, Package, CheckCircle2, Clock, Droplets } from 'lucide-react';
import TestCaseDetailModal from '../modals/TestCaseDetailModal';

const TurnkeyTaskCard = ({ taskName = "Turnkey task 1", status = "Foundation - phase 1", date = "18-09-2024" }) => {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 w-64 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">{taskName}</h3>
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4 text-blue-500" />
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
          <CheckCircle2 className="h-3 w-3" />
          <span>watering</span>
        </div>
        <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
          <Droplets className="h-3 w-3" />
          <span>Drying</span>
        </div>
      </div>

      {/* Test case tag */}
      <div className="mb-3">
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
          test cases(2)
        </span>
      </div>

      {/* Bottom counters */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4" />
          <span>3 human</span>
        </div>
        <div className="flex items-center space-x-1">
          <Package className="h-4 w-4" />
          <span>4 resources</span>
        </div>
      </div>
    </div>
  );
};

const TurnkeyWorkflow = ({ data = {} }) => {
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);

  const {
    taskName = "Turnkey task 1",
    description = "Foundation work - phase 1",
    humanCount = 3,
    resourceCount = 4,
    statusBadges = [
      { id: 1, name: 'watering', color: 'green', icon: 'check' },
      { id: 2, name: 'Drying', color: 'yellow', icon: 'droplet' }
    ],
    testCases = [
      { id: 1, name: 'Test case 1', description: '', status: 'pending', tester: 'QA team Alpha', evidenceFiles: [] },
      { id: 2, name: 'Test case 2', description: '', status: 'pending', tester: 'QA team Beta', evidenceFiles: [] }
    ]
  } = data;

  const handleTestCaseClick = (testCase, event) => {
    event.stopPropagation();
    console.log('🔍 Test case clicked:', testCase.name);
    setSelectedTestCase(testCase);
    setShowTestCaseModal(true);
  };

  const handleCloseTestCaseModal = () => {
    setShowTestCaseModal(false);
    setSelectedTestCase(null);
  };

  const getStatusBadgeColor = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      red: 'bg-red-100 text-red-800',
      purple: 'bg-purple-100 text-purple-800'
    };
    return colors[color] || colors.blue;
  };

  const getIcon = (iconType) => {
    const icons = {
      check: CheckCircle2,
      droplet: Droplets,
      clock: Clock
    };
    const IconComponent = icons[iconType] || CheckCircle2;
    return <IconComponent className="h-4 w-4" />;
  };

  const getTestCaseStyle = (status, index) => {
    const baseStyle = "bg-white border-2 rounded-xl p-4 w-80 text-center font-medium";
    if (index === 0) {
      return `${baseStyle} border-blue-400 text-blue-800 bg-blue-50`;
    }
    return `${baseStyle} border-gray-300 text-gray-700`;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Main Task Card */}
      <div 
        className="bg-white border-2 border-gray-200 rounded-xl p-4 w-80 shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          console.log('🖱️ Main workflow card clicked');
          
          // Dispatch custom event to open edit modal
          const editEvent = new CustomEvent('editTurnkeyWorkflow', {
            detail: {
              nodeId: data.nodeId || `turnkey-workflow_${Date.now()}`,
              data: data
            }
          });
          
          document.dispatchEvent(editEvent);
          console.log('🔧 Opening edit modal for turnkey workflow');
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{taskName}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-5 w-5 text-blue-500" />
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center space-x-2 mb-4 flex-wrap">
          {statusBadges.map((badge) => (
            <div key={badge.id} className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadgeColor(badge.color)}`}>
              {getIcon(badge.icon)}
              <span>{badge.name}</span>
            </div>
          ))}
        </div>

        {/* Test case summary */}
        <div className="mb-4">
          <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-medium">
            test cases({testCases.length})
          </span>
        </div>

        {/* Bottom counters */}
        <div className="flex items-center justify-between text-sm text-gray-700 font-medium">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-600" />
            <span>{humanCount} human</span>
          </div>
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-gray-600" />
            <span>{resourceCount} resources</span>
          </div>
        </div>
      </div>

      {/* Connecting line to first test case */}
      {testCases.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-8 bg-gray-400 border-dashed border-l-2"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="w-px h-8 bg-gray-400 border-dashed border-l-2"></div>
        </div>
      )}

      {/* Test Cases */}
      {testCases.map((testCase, index) => (
        <React.Fragment key={testCase.id}>
          <div 
            className={`${getTestCaseStyle(testCase.status, index)} cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105`}
            onClick={(e) => handleTestCaseClick(testCase, e)}
            title="Click to view test case details"
          >
            <span className="text-sm font-medium">{testCase.name}</span>
            {testCase.description && (
              <p className="text-xs text-gray-500 mt-1">{testCase.description}</p>
            )}
            {/* Show evidence count if available */}
            {Array.isArray(testCase.evidenceFiles) && testCase.evidenceFiles.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Evidence: {testCase.evidenceFiles.length} files
              </p>
            )}
          </div>
          
          {/* Connecting line between test cases */}
          {index < testCases.length - 1 && (
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-gray-400 border-dashed border-l-2"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-px h-8 bg-gray-400 border-dashed border-l-2"></div>
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Test Case Detail Modal - Rendered using Portal */}
      {showTestCaseModal && createPortal(
        <TestCaseDetailModal
          isOpen={showTestCaseModal}
          onClose={handleCloseTestCaseModal}
          testCase={selectedTestCase}
        />,
        document.body
      )}
    </div>
  );
};

const TurnkeyNode = ({ data, selected, id, ...props }) => {
  const { elementType, taskName, status, date, nodeId } = data;

  const renderTurnkeyElement = () => {
    switch (elementType) {
      case 'turnkey-task':
        return <TurnkeyTaskCard taskName={taskName} status={status} date={date} />;
      case 'turnkey-workflow':
        return <TurnkeyWorkflow data={data} />;
      case 'turnkey-resource':
        return (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 w-64">
            <h3 className="font-semibold text-purple-900 mb-2">Resource Allocation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>QA team Alpha</span>
                <span className="text-purple-600">Active</span>
              </div>
              <div className="text-xs text-purple-700">
                <div>Tester</div>
                <div>Evidence: 2 files</div>
              </div>
            </div>
          </div>
        );
      default:
        return <TurnkeyTaskCard />;
    }
  };

  return (
    <div className={`turnkey-node ${selected ? 'selected' : ''}`}>
      {renderTurnkeyElement()}
    </div>
  );
};

export default TurnkeyNode;
