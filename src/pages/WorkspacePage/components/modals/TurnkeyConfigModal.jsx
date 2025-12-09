import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Clock, Users, Package, Droplets, Upload, File, Image } from 'lucide-react';
import { useUpload } from '../forms/UploadManager';

const TurnkeyConfigModal = ({ isOpen, onClose, onSave, initialData }) => {
  const { addFiles, loading: uploadLoading } = useUpload();
  const getDefaultTaskData = () => ({
    taskName: 'Turnkey task 1',
    description: 'Foundation work - phase 1',
    status: 'active',
    humanCount: 3,
    resourceCount: 4,
    statusBadges: [
      { id: 1, name: 'watering', color: 'green', icon: 'check' },
      { id: 2, name: 'Drying', color: 'yellow', icon: 'droplet' }
    ],
    testCases: [
      { 
        id: 1, 
        name: 'Test case 1', 
        description: '', 
        status: 'pending',
        tester: 'QA team Alpha',
        evidenceCount: 0,
        evidenceFiles: []
      },
      { 
        id: 2, 
        name: 'Test case 2', 
        description: '', 
        status: 'pending',
        tester: 'QA team Beta',
        evidenceCount: 0,
        evidenceFiles: []
      }
    ]
  });

  const [taskData, setTaskData] = useState(getDefaultTaskData());

  // Update taskData when initialData changes
  useEffect(() => {
    if (initialData) {
      const defaultData = getDefaultTaskData();
      const mergedData = {
        ...defaultData,
        ...initialData
      };
      
      // Ensure all test cases have the required properties
      if (mergedData.testCases) {
        mergedData.testCases = mergedData.testCases.map(testCase => ({
          ...testCase,
          tester: testCase.tester || 'QA team Alpha',
          evidenceCount: testCase.evidenceCount || 0,
          evidenceFiles: Array.isArray(testCase.evidenceFiles) ? testCase.evidenceFiles : []
        }));
      }
      
      setTaskData(mergedData);
    } else {
      setTaskData(getDefaultTaskData());
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setTaskData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStatusBadgeChange = (id, field, value) => {
    setTaskData(prev => ({
      ...prev,
      statusBadges: prev.statusBadges.map(badge =>
        badge.id === id ? { ...badge, [field]: value } : badge
      )
    }));
  };

  const addStatusBadge = () => {
    const newBadge = {
      id: Date.now(),
      name: 'New Status',
      color: 'blue',
      icon: 'check'
    };
    setTaskData(prev => ({
      ...prev,
      statusBadges: [...prev.statusBadges, newBadge]
    }));
  };

  const removeStatusBadge = (id) => {
    setTaskData(prev => ({
      ...prev,
      statusBadges: prev.statusBadges.filter(badge => badge.id !== id)
    }));
  };

  const handleTestCaseChange = (id, field, value) => {
    setTaskData(prev => ({
      ...prev,
      testCases: prev.testCases.map(testCase =>
        testCase.id === id ? { ...testCase, [field]: value } : testCase
      )
    }));
  };

  const addTestCase = () => {
    const newTestCase = {
      id: Date.now(),
      name: `Test case ${taskData.testCases.length + 1}`,
      description: '',
      status: 'pending',
      tester: 'QA team Alpha',
      evidenceCount: 0,
      evidenceFiles: []
    };
    setTaskData(prev => ({
      ...prev,
      testCases: [...prev.testCases, newTestCase]
    }));
  };

  const removeTestCase = (id) => {
    setTaskData(prev => ({
      ...prev,
      testCases: prev.testCases.filter(testCase => testCase.id !== id)
    }));
  };

  const handleTestCaseFileUpload = async (testCaseId, files) => {
    const fileArray = Array.from(files);
    
    try {
      console.log('📎 Uploading evidence files for test case:', testCaseId);
      
      // Upload files to S3 using the workspace upload system
      const uploadedFiles = await addFiles(fileArray);
      
      // Check if uploadedFiles is valid
      if (!uploadedFiles || !Array.isArray(uploadedFiles)) {
        console.error('❌ Upload failed: No files returned from upload system');
        alert('Failed to upload evidence files. Please try again.');
        return;
      }
      
      // Update task data with uploaded file references
      setTaskData(prev => ({
        ...prev,
        testCases: prev.testCases.map(testCase => {
          if (testCase.id === testCaseId) {
            const existingFiles = Array.isArray(testCase.evidenceFiles) ? testCase.evidenceFiles : [];
            const newFiles = uploadedFiles.map(file => ({
              id: file.id,
              name: file.name,
              size: file.size,
              type: file.type,
              s3Key: file.s3Key,
              s3Bucket: 'workspace-uploads',
              uploadedAt: file.uploadedAt,
              uploadedBy: file.vendorId || 'current-user',
              url: file.url // S3 URL
            }));
            return {
              ...testCase,
              evidenceFiles: [...existingFiles, ...newFiles],
              evidenceCount: existingFiles.length + newFiles.length
            };
          }
          return testCase;
        })
      }));
      
      console.log('✅ Evidence files uploaded successfully:', uploadedFiles.length);
      
    } catch (error) {
      console.error('❌ Error uploading evidence files:', error);
      alert('Failed to upload evidence files. Please try again.');
    }
  };

  const removeTestCaseFile = async (testCaseId, fileId) => {
    try {
      console.log('🗑️ Removing evidence file:', { testCaseId, fileId });
      
      // Find the file to get its S3 details
      let fileToRemove = null;
      for (const testCase of taskData.testCases) {
        if (testCase.id === testCaseId && Array.isArray(testCase.evidenceFiles)) {
          fileToRemove = testCase.evidenceFiles.find(file => file.id === fileId);
          if (fileToRemove) break;
        }
      }
      
      // Remove from local state first
      setTaskData(prev => ({
        ...prev,
        testCases: prev.testCases.map(testCase => {
          if (testCase.id === testCaseId) {
            const existingFiles = Array.isArray(testCase.evidenceFiles) ? testCase.evidenceFiles : [];
            const updatedFiles = existingFiles.filter(file => file.id !== fileId);
            return {
              ...testCase,
              evidenceFiles: updatedFiles,
              evidenceCount: updatedFiles.length
            };
          }
          return testCase;
        })
      }));
      
      // If file has S3 reference, delete from S3 (optional - could be done on backend)
      if (fileToRemove && fileToRemove.s3Key) {
        console.log('🗑️ File has S3 reference, will be cleaned up on save');
        // The backend will handle S3 cleanup when the workflow is saved
      }
      
      console.log('✅ Evidence file removed successfully');
      
    } catch (error) {
      console.error('❌ Error removing evidence file:', error);
      alert('Failed to remove evidence file. Please try again.');
    }
  };

  const handleSave = () => {
    onSave(taskData);
    onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Configure Turnkey Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Task Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Task Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
                <input
                  type="text"
                  value={taskData.taskName}
                  onChange={(e) => handleInputChange('taskName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={taskData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Human Resources</label>
                <input
                  type="number"
                  value={taskData.humanCount}
                  onChange={(e) => handleInputChange('humanCount', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resources Count</label>
                <input
                  type="number"
                  value={taskData.resourceCount}
                  onChange={(e) => handleInputChange('resourceCount', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Status Badges</h3>
              <button
                onClick={addStatusBadge}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Status</span>
              </button>
            </div>

            <div className="space-y-3">
              {taskData.statusBadges.map((badge) => (
                <div key={badge.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={badge.name}
                    onChange={(e) => handleStatusBadgeChange(badge.id, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Status name"
                  />
                  
                  <select
                    value={badge.color}
                    onChange={(e) => handleStatusBadgeChange(badge.id, 'color', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                    <option value="purple">Purple</option>
                  </select>
                  
                  <select
                    value={badge.icon}
                    onChange={(e) => handleStatusBadgeChange(badge.id, 'icon', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="check">Check</option>
                    <option value="droplet">Droplet</option>
                    <option value="clock">Clock</option>
                  </select>

                  <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadgeColor(badge.color)}`}>
                    {getIcon(badge.icon)}
                    <span>{badge.name}</span>
                  </div>
                  
                  <button
                    onClick={() => removeStatusBadge(badge.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Test Cases */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Test Cases</h3>
              <button
                onClick={addTestCase}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Test Case</span>
              </button>
            </div>

            <div className="space-y-4">
              {taskData.testCases.map((testCase) => (
                <div key={testCase.id} className="border border-gray-300 rounded-lg p-4 bg-white">
                  {/* Test Case Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-gray-900">Test Case Details</h4>
                    <button
                      onClick={() => removeTestCase(testCase.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Basic Info Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      value={testCase.name}
                      onChange={(e) => handleTestCaseChange(testCase.id, 'name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Test case name"
                    />
                    
                    <input
                      type="text"
                      value={testCase.tester || ''}
                      onChange={(e) => handleTestCaseChange(testCase.id, 'tester', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tester (e.g., QA team Alpha)"
                    />
                    
                    <select
                      value={testCase.status}
                      onChange={(e) => handleTestCaseChange(testCase.id, 'status', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <textarea
                      value={testCase.description}
                      onChange={(e) => handleTestCaseChange(testCase.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Test case description"
                      rows="2"
                    />
                  </div>

                  {/* Evidence Section */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Evidence Files ({Array.isArray(testCase.evidenceFiles) ? testCase.evidenceFiles.length : 0})</span>
                      <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        uploadLoading 
                          ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                      }`}>
                        <Upload className="w-4 h-4" />
                        <span>{uploadLoading ? 'Uploading...' : 'Upload Files'}</span>
                                                            <input
                                      type="file"
                                      multiple
                                      accept="image/*,.pdf,.doc,.docx"
                                      onChange={(e) => {
                                        if (e.target.files.length > 0) {
                                          handleTestCaseFileUpload(testCase.id, e.target.files);
                                          e.target.value = ''; // Reset input
                                        }
                                      }}
                                      className="hidden"
                                      disabled={uploadLoading}
                                    />
                      </label>
                    </div>
                    
                    {/* Evidence Files List */}
                    {Array.isArray(testCase.evidenceFiles) && testCase.evidenceFiles.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {testCase.evidenceFiles.map((file) => (
                          <div key={file.id} className="relative group">
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border">
                              {file.type?.startsWith('image/') ? (
                                <Image className="w-4 h-4 text-green-600" />
                              ) : (
                                <File className="w-4 h-4 text-blue-600" />
                              )}
                              <span className="text-xs truncate flex-1" title={file.name}>
                                {file.name}
                              </span>
                              <button
                                onClick={() => removeTestCaseFile(testCase.id, file.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:text-red-700 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurnkeyConfigModal;
