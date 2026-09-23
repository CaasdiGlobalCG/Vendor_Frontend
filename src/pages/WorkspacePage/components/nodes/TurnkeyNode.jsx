import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { persistIsImportant, persistDeadline, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { useReactFlow } from 'reactflow';
import { createPortal } from 'react-dom';
import { Users, Package, CheckCircle2, Clock, Droplets } from 'lucide-react';
import TestCaseDetailModal from '../modals/TestCaseDetailModal';

const TurnkeyTaskCard = ({ taskName = "Turnkey task 1", status = "Foundation - phase 1", date = "18-09-2024" }) => {
  return (
    <div className="bg-surface border-2 border-line rounded-lg p-4 w-64 ">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ink text-sm">{taskName}</h3>
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4 text-info" />
          <div className="w-2 h-2 bg-info rounded-full"></div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="flex items-center space-x-1 bg-success/10 text-success px-2 py-1 rounded-full text-xs">
          <CheckCircle2 className="h-3 w-3" />
          <span>watering</span>
        </div>
        <div className="flex items-center space-x-1 bg-warning/10 text-warning px-2 py-1 rounded-full text-xs">
          <Droplets className="h-3 w-3" />
          <span>Drying</span>
        </div>
      </div>

      {/* Test case tag */}
      <div className="mb-3">
        <span className="bg-info/10 text-info px-2 py-1 rounded text-xs font-medium">
          test cases(2)
        </span>
      </div>

      {/* Bottom counters */}
      <div className="flex items-center justify-between text-xs text-dim">
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
      green: 'bg-success/10 text-success',
      yellow: 'bg-warning/10 text-warning',
      blue: 'bg-info/10 text-info',
      red: 'bg-danger/10 text-danger',
      purple: 'bg-surface-hover text-ink'
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
    const baseStyle = "bg-surface border-2 rounded-xl p-4 w-80 text-center font-medium";
    if (index === 0) {
      return `${baseStyle} border-info text-info bg-info/10`;
    }
    return `${baseStyle} border-line text-ink`;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Main Task Card */}
      <div 
        className="bg-surface border-2 border-line rounded-xl p-4 w-80 shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
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
            <h3 className="font-semibold text-ink text-lg">{taskName}</h3>
            <p className="text-sm text-dim">{description}</p>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-5 w-5 text-info" />
            <div className="w-3 h-3 bg-info rounded-full"></div>
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
          <span className="bg-info/10 text-info px-3 py-1.5 rounded-lg text-sm font-medium">
            test cases({testCases.length})
          </span>
        </div>

        {/* Bottom counters */}
        <div className="flex items-center justify-between text-sm text-ink font-medium">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-dim" />
            <span>{humanCount} human</span>
          </div>
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-dim" />
            <span>{resourceCount} resources</span>
          </div>
        </div>
      </div>

      {/* Connecting line to first test case */}
      {testCases.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-8 bg-cta border-dashed border-l-2"></div>
          <div className="w-2 h-2 bg-cta rounded-full"></div>
          <div className="w-px h-8 bg-cta border-dashed border-l-2"></div>
        </div>
      )}

      {/* Test Cases */}
      {testCases.map((testCase, index) => (
        <React.Fragment key={testCase.id}>
          <div 
            className={`${getTestCaseStyle(testCase.status, index)} cursor-pointer  transition-all duration-200 hover:scale-105`}
            onClick={(e) => handleTestCaseClick(testCase, e)}
            title="Click to view test case details"
          >
            <span className="text-sm font-medium">{testCase.name}</span>
            {testCase.description && (
              <p className="text-xs text-dim mt-1">{testCase.description}</p>
            )}
            {/* Show evidence count if available */}
            {Array.isArray(testCase.evidenceFiles) && testCase.evidenceFiles.length > 0 && (
              <p className="text-xs text-info mt-1">
                Evidence: {testCase.evidenceFiles.length} files
              </p>
            )}
          </div>
          
          {/* Connecting line between test cases */}
          {index < testCases.length - 1 && (
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-cta border-dashed border-l-2"></div>
              <div className="w-2 h-2 bg-cta rounded-full"></div>
              <div className="w-px h-8 bg-cta border-dashed border-l-2"></div>
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
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);

  const { elementType, taskName, status, date, nodeId } = data;

  // Update time left display every second
  useEffect(() => {
    if (!deadline) return;
    
    const updateTimer = () => {
      const time = getTimeLeft(deadline);
      setTimeLeft(time);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Sync deadline and isImportant from node data
  useEffect(() => {
    if (deadlineJustSetRef.current) return;
    
    if (data.deadline && data.deadline !== deadline) {
      setDeadline(data.deadline);
    }
    if (data.isImportant !== undefined && data.isImportant !== isImportant) {
      setIsImportant(data.isImportant);
    }
  }, [data.deadline, data.isImportant]);

  const persistIsImportantLocal = async (important) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await persistIsImportant(id, important, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist isImportant:', err);
    } finally {
      setSaving(false);
    }
  };

  const persistDeadlineLocal = async (newDeadline) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      deadlineJustSetRef.current = true;
      await persistDeadline(id, newDeadline, setNodes, workspaceId);
      setDeadline(newDeadline instanceof Date ? newDeadline.toISOString() : newDeadline);
      setTimeout(() => {
        deadlineJustSetRef.current = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to persist deadline:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderTurnkeyElement = () => {
    switch (elementType) {
      case 'turnkey-task':
        return <TurnkeyTaskCard taskName={taskName} status={status} date={date} />;
      case 'turnkey-workflow':
        return <TurnkeyWorkflow data={data} />;
      case 'turnkey-resource':
        return (
          <div className="bg-surface-hover border-2 border-line rounded-lg p-4 w-64">
            <h3 className="font-semibold text-ink mb-2">Resource Allocation</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>QA team Alpha</span>
                <span className="text-ink">Active</span>
              </div>
              <div className="text-xs text-ink">
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
    <div className={`turnkey-node ${selected ? 'selected' : ''} relative group`}>
      {/* Persistence Controls */}
      <div className="absolute top-2 right-2 flex gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <button
          onClick={async () => {
            setIsImportant(!isImportant);
            await persistIsImportantLocal(!isImportant);
          }}
          className={`px-2 py-1 rounded ${isImportant ? 'bg-warning text-white' : 'bg-surface text-warning border border-warning'}`}
          title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
        >
          {isImportant ? '★' : '☆'}
        </button>
        <button
          onClick={() => setShowDeadlineInput(!showDeadlineInput)}
          className="px-2 py-1 rounded bg-surface text-info border border-info"
          title="Set Deadline"
        >
          ⏰
        </button>
      </div>

      {/* Deadline Input */}
      {showDeadlineInput && (
        <div className="absolute top-12 right-2 bg-surface border border-line rounded shadow-lg p-2 z-30">
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 text-xs w-40"
            value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={saving}
          />
          <button
            className="mt-1 w-full px-2 py-1 text-xs bg-info text-white rounded"
            onClick={async () => {
              setShowDeadlineInput(false);
              await persistDeadlineLocal(deadline);
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
      )}

      {/* Deadline Display */}
      {deadline && timeLeft && !timeLeft.isExpired && (
        <div className="absolute bottom-2 right-2 text-xs text-info bg-info/10 px-2 py-1 rounded">
          ⏱ {formatTimeLeft(timeLeft)}
        </div>
      )}
      
      {/* Importance indicator background */}
      <div style={{ backgroundColor: isImportant ? 'rgba(255, 193, 7, 0.1)' : 'transparent', borderRadius: '0.5rem', padding: '0.25rem' }}>
      
      {/* Sequence Number Badge - Top left corner */}
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}
      {renderTurnkeyElement()}
      </div>
    </div>
  );
};

export default TurnkeyNode;
