import React, { useState, useEffect, useContext } from 'react';
import { CheckCircle, Clock, Users, Package, AlertCircle, Settings } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import config from '../../../../config/env';
import authFetch from '../../../../utils/authFetch';

const TrunkyRenderer = ({ data }) => {
  const { currentUser } = useContext(VendorContext);
  const [trunkyData, setTrunkyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  // Using relative paths - no API_BASE_URL needed

  // Get workspace and element IDs from the data prop
  const workspaceId = data?.workspaceId || 'default';
  const elementId = data?.elementId || data?.id || 'trunky-element';

  useEffect(() => {
    // Fetch Trunky data from backend
    const fetchTrunkyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, try to get data for this specific workspace element
        const response = await authFetch(
          `/api/trunky/workspace/${workspaceId}/element/${elementId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.task) {
          setTrunkyData({ task: result.task });
          setSelectedTaskId(result.task.id);
        } else {
          // If no specific task configured, fetch available tasks
          await fetchAvailableTasks();
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching Trunky data:', err);
        setError('Failed to load Trunky data: ' + err.message);
        setLoading(false);
      }
    };

    // Fetch available tasks for selection
    const fetchAvailableTasks = async () => {
      try {
        const response = await authFetch(`/api/trunky/tasks`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.tasks.length > 0) {
            setAvailableTasks(result.tasks);
            // Use the first task as default
            setTrunkyData({ task: result.tasks[0] });
            setSelectedTaskId(result.tasks[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching available tasks:', err);
      }
    };

    fetchTrunkyData();
  }, [workspaceId, elementId]);

  // Handle task selection
  const handleTaskChange = async (taskId) => {
    try {
      setLoading(true);
      const response = await authFetch(`/api/trunky/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTrunkyData({ task: result.task });
          setSelectedTaskId(taskId);
          setShowTaskSelector(false);
          
          // TODO: Save the task selection to workspace
          await saveTaskSelectionToWorkspace(taskId);
        }
      }
    } catch (err) {
      console.error('Error changing task:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save task selection to workspace (placeholder for now)
  const saveTaskSelectionToWorkspace = async (taskId) => {
    try {
      // This will be implemented when we update the workspace saving logic
      console.log('Saving task selection to workspace:', { workspaceId, elementId, taskId });
    } catch (err) {
      console.error('Error saving task selection:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg border border-red-200 p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Data</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!trunkyData?.task) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Trunky Data Found</h3>
          <p className="text-gray-600 text-sm">No tasks or test cases available to display.</p>
        </div>
      </div>
    );
  }

  const { task } = trunkyData;
  const hasTestCases = task.testCases && task.testCases.length > 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Task Selector Modal */}
      {showTaskSelector && availableTasks.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Trunky Task</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskChange(task.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTaskId === task.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{task.name}</div>
                  <div className="text-sm text-gray-600">{task.phase}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {task.testCases?.length || 0} test cases
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTaskSelector(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Task Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 relative">
        {/* Status Indicator and Settings */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          {availableTasks.length > 1 && (
            <button
              onClick={() => setShowTaskSelector(true)}
              className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              title="Change Task"
            >
              <Settings className="w-3 h-3 text-gray-600" />
            </button>
          )}
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Clock className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Task Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.name}</h3>
          <p className="text-sm text-gray-600">{task.phase}</p>
        </div>

        {/* Completed Steps */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {task.completedSteps.map((step, index) => (
              <div key={index} className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <CheckCircle className="w-3 h-3" />
                <span>{step}</span>
              </div>
            ))}
          </div>
          
          {/* Test Cases Link */}
          <div className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            <span>test cases({task.testCases?.length || 0})</span>
          </div>
        </div>

        {/* Resource Summary */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{task.humanResources} human</span>
            </div>
            <div className="flex items-center space-x-1">
              <Package className="w-4 h-4" />
              <span>{task.physicalResources} resources</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Cases Flow */}
      {hasTestCases ? (
        <div className="space-y-3">
          {/* Connecting Line */}
          <div className="flex justify-center">
            <div className="w-px h-8 bg-gray-300 border-l-2 border-dashed border-gray-300"></div>
          </div>

          {/* Test Cases */}
          {task.testCases.map((testCase, index) => (
            <div key={testCase.id}>
              <div className={`bg-white rounded-xl shadow-md border-2 p-4 transition-all duration-200 hover:shadow-lg ${
                testCase.status === 'active' 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="text-center">
                  <h4 className="font-medium text-gray-900 mb-1">{testCase.name}</h4>
                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
                    <span className={`px-2 py-1 rounded-full ${
                      testCase.status === 'active' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {testCase.status}
                    </span>
                    <span>{testCase.evidenceCount} evidence files</span>
                  </div>
                </div>
              </div>

              {/* Connecting Line between test cases */}
              {index < task.testCases.length - 1 && (
                <div className="flex justify-center py-2">
                  <div className="w-px h-6 bg-gray-300 border-l-2 border-dashed border-gray-300"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connecting Line */}
          <div className="flex justify-center">
            <div className="w-px h-8 bg-gray-300 border-l-2 border-dashed border-gray-300"></div>
          </div>

          {/* No Test Cases Message */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <h4 className="font-medium text-gray-700 mb-1">No Test Cases Found</h4>
              <p className="text-sm text-gray-500">No test cases have been created for this task yet.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrunkyRenderer;
