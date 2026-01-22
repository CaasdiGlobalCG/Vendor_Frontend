import React, { useState } from 'react';
import { Search, Grid, Table, BarChart3, Square, List, X, GitBranch, Package, Upload, Settings, FileText, ClipboardList, Image as ImageIcon, Sparkles } from 'lucide-react';


const ElementsSidebar = ({ isOpen, onClose, onElementSelect, userRole, currentUser, elementOptions = {} }) => {
  const [selectedCategory, setSelectedCategory] = useState('forms');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is CAS member with turnkey access
  console.log('🔍 Turnkey Detection Debug:', {
    userRole,
    currentUser,
    casUnit: currentUser?.casUnit,
    specialization: currentUser?.specialization,
    name: currentUser?.name
  });

  const isTurnkeyCAS = userRole === 'cas'; // Temporarily show for all CAS users

  console.log('🎯 isTurnkeyCAS result:', isTurnkeyCAS);

  const baseElementCategories = [
    { id: 'invoices-quotes', name: 'Invoices and Quotations', icon: FileText, color: 'bg-pink-100 text-pink-800' },
    { id: 'forms', name: 'Forms', icon: Grid, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'tables', name: 'Tables', icon: Table, color: 'bg-gray-100 text-gray-800' },
    { id: 'charts', name: 'Charts', icon: BarChart3, color: 'bg-blue-100 text-blue-800' },
    { id: 'flowcharts', name: 'Flowcharts', icon: GitBranch, color: 'bg-indigo-100 text-indigo-800' },
    { id: 'icons', name: 'Icons', icon: Square, color: 'bg-purple-100 text-purple-800' },
    { id: 'image-block', name: 'Image Block', icon: ImageIcon, color: 'bg-cyan-100 text-cyan-800' },
    { id: 'document-block', name: 'Document Block', icon: FileText, color: 'bg-sky-100 text-sky-800' },
    { id: 'list', name: 'List', icon: List, color: 'bg-green-100 text-green-800' },
    { id: 'task-card', name: 'Task Card', icon: ClipboardList, color: 'bg-teal-100 text-teal-800' },
    { id: 'materials', name: 'Materials', icon: Package, color: 'bg-orange-100 text-orange-800' },
    { id: 'uploads', name: 'Uploads', icon: Upload, color: 'bg-cyan-100 text-cyan-800' },
    { id: 'smart', name: 'Smart Elements', icon: Sparkles, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'other', name: 'other elements', icon: Grid, color: 'bg-gray-100 text-gray-800' }
  ];

  // Add turnkey category if user is turnkey CAS member
  const elementCategories = isTurnkeyCAS ? [
    { id: 'turnkey', name: 'Turnkey', icon: Settings, color: 'bg-red-100 text-red-800' },
    ...baseElementCategories
  ] : baseElementCategories;

  // Use elementOptions from props for all element types
  const elements = {
    ...elementOptions, // Spread all elementOptions from props
    // Fallback defaults if not provided in elementOptions
    turnkey: elementOptions.turnkey || [
      { id: 'turnkey-task-card', name: 'Turnkey Task Card', type: 'turnkey-task', preview: 'Task management card with status tracking' },
      { id: 'turnkey-workflow', name: 'Turnkey Workflow', type: 'turnkey-workflow', preview: 'Complete workflow visualization' },
      { id: 'turnkey-resource', name: 'Resource Allocation', type: 'turnkey-resource', preview: 'Resource and team assignment' }
    ],
    forms: elementOptions.forms || [
      { id: 'textarea', name: 'TextArea', type: 'textarea', preview: 'Large text input area' },
      { id: 'textbox', name: 'TextBox', type: 'input', preview: 'Single line text input' },
      { id: 'input', name: 'Input', type: 'input', preview: 'Generic input field' },
      { id: 'radio', name: 'Select one', type: 'radio', preview: 'Radio button selection' },
      { id: 'checkbox', name: 'Select Many', type: 'checkbox', preview: 'Multiple choice selection' },
      { id: 'dropdown', name: 'Dropdown', type: 'select', preview: 'Select from options' },
      { id: 'button', name: 'Button', type: 'button', preview: 'Action button' }
    ],
    tables: [
      { id: 'basic-table', name: 'Basic Table', type: 'table', preview: 'Simple data table' },
      { id: 'data-table', name: 'Data Table', type: 'table', preview: 'Advanced data table' },
      { id: 'pivot-table', name: 'Pivot Table', type: 'table', preview: 'Pivot analysis table' },
      { id: 'calendar', name: 'Calendar', type: 'calendar', preview: 'Date picker calendar' }
    ],
    charts: [
      { id: 'bar-chart', name: 'Bar Chart', type: 'chart', preview: 'Vertical bar chart' },
      { id: 'line-chart', name: 'Line Chart', type: 'chart', preview: 'Trend line chart' },
      { id: 'pie-chart', name: 'Pie Chart', type: 'chart', preview: 'Circular data chart' },
      { id: 'area-chart', name: 'Area Chart', type: 'chart', preview: 'Filled area chart' },
      { id: 'scatter-plot', name: 'Scatter Plot', type: 'chart', preview: 'Data point scatter' }
    ],
    icons: [
      { id: 'basic-icons', name: 'Basic Icons', type: 'icon', preview: 'Simple icon set' },
      { id: 'social-icons', name: 'Social Icons', type: 'icon', preview: 'Social media icons' },
      { id: 'navigation-icons', name: 'Navigation', type: 'icon', preview: 'Menu and nav icons' },
      { id: 'action-icons', name: 'Action Icons', type: 'icon', preview: 'Button and action icons' }
    ],
    list: [
      { id: 'bullet-list', name: 'Bullet List', type: 'list', preview: 'Unordered list' },
      { id: 'numbered-list', name: 'Numbered List', type: 'list', preview: 'Ordered list' },
      { id: 'checklist', name: 'Checklist', type: 'list', preview: 'Task list' },
      { id: 'definition-list', name: 'Definition List', type: 'list', preview: 'Term definitions' },
      { id: 'nested-list', name: 'Nested List', type: 'list', preview: 'Multi-level list' },
      { id: 'timeline-list', name: 'Timeline', type: 'list', preview: 'Chronological list' }
    ],
    'image-block': elementOptions['image-block'] || [
      {
        id: 'image-block-basic',
        name: 'Image Block',
        type: 'image-block',
        preview: 'Upload and annotate project visuals',
        imageBlockData: {
          imageUrl: '',
          caption: 'South elevation – week 6 progress',
          timestamp: '2025-11-20 10:30',
          geotag: '12.9716° N, 77.5946° E',
          annotations: [
            { id: 'ann-1', text: 'Facade glazing completed', position: 'top-left' },
            { id: 'ann-2', text: 'Landscape pending', position: 'bottom-right' }
          ],
          width: 80
        }
      }
    ],
    'document-block': elementOptions['document-block'] || [
      {
        id: 'document-block-basic',
        name: 'Document Block',
        type: 'document-block',
        preview: 'Attach project documents with version history',
        documentBlockData: {
          fileName: 'Project-Brief.pdf',
          fileType: 'pdf',
          fileSize: '1.2 MB',
          fileUrl: '',
          versions: [
            {
              id: 'ver-1',
              version: 'v1.0',
              uploadedAt: '2025-11-15 09:45',
              uploadedBy: 'Alex Johnson',
              notes: 'Original brief shared with vendor team.'
            }
          ],
          comments: [
            {
              id: 'doc-comment-1',
              author: 'Priya Patel',
              text: 'Please review section 3 for updated specs.',
              timestamp: '2025-11-18 14:10'
            }
          ]
        }
      }
    ],
    'task-card': elementOptions['task-card'] || [
      { id: 'task-card-basic', name: 'Task Card', type: 'task-card', preview: 'Task with assignee and status' },
      { id: 'task-card-progress', name: 'Task Card with Progress', type: 'task-card-progress', preview: 'Task card showing progress and due date' }
    ],
    materials: [
      { id: 'raw-materials', name: 'Raw Materials', type: 'materials', preview: 'Request raw materials' },
      { id: 'semi-finished', name: 'Semi-Finished', type: 'materials', preview: 'Request semi-finished goods' },
      { id: 'finished-goods', name: 'Finished Goods', type: 'materials', preview: 'Request finished products' },
      { id: 'consumables', name: 'Consumables', type: 'materials', preview: 'Request consumable items' },
      { id: 'packaging', name: 'Packaging', type: 'materials', preview: 'Request packaging materials' },
      { id: 'tools-equipment', name: 'Tools & Equipment', type: 'materials', preview: 'Request tools and equipment' }
    ],
    uploads: [],
    flowcharts: [
      { id: 'swot-analysis', name: 'SWOT Analysis', type: 'flowchart', preview: 'Strengths, Weaknesses, Opportunities, Threats' },
      { id: 'business-model-canvas', name: 'Business Model Canvas', type: 'flowchart', preview: '9-block business model framework' },
      { id: 'goal-setting-framework', name: 'Goal Setting Framework', type: 'flowchart', preview: 'SMART goals and action planning' },
      { id: 'decision-tree', name: 'Decision Tree', type: 'flowchart', preview: 'Decision-making process flow' },
      { id: 'customer-journey-map', name: 'Customer Journey Map', type: 'flowchart', preview: 'Customer experience touchpoints' },
      { id: 'organizational-chart', name: 'Organizational Chart', type: 'flowchart', preview: 'Company hierarchy structure' }
    ],
    other: [
      { id: 'grid', name: 'Grid', type: 'grid', preview: 'Layout grid system' }
    ]
  };

  const handleElementSelect = (categoryId) => {
    setSelectedCategory(categoryId);
    onElementSelect?.(categoryId); // Notify parent component
  };

  const handleElementOptionSelect = (elementId, elementType) => {
    onElementSelect?.({ categoryId: selectedCategory, elementId, elementType });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Elements Sidebar */}
      <div data-tour="elements-sidebar" className="w-80 bg-white shadow-2xl flex flex-col max-h-screen">
        {/* Header - Fixed */}
        <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Elements</h2>
            <button
              onClick={onClose}
              className="p-0.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Search Bar - Fixed */}
        <div className="px-3 py-2 pt-2.5 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Elements Categories - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-2.5 space-y-2">
            {elementCategories
              .filter(category => 
                category.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((category) => (
              <div
                key={category.id}
                onClick={() => handleElementSelect(category.id)}
                className={`group relative flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-white border-2 border-blue-500 shadow-md shadow-blue-100'
                    : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 transition-all duration-300 ${
                    selectedCategory === category.id 
                      ? `${category.color} shadow-sm scale-105` 
                      : `${category.color} group-hover:shadow-sm group-hover:scale-102`
                  }`}>
                    <category.icon className={`w-4 h-4 ${
                      selectedCategory === category.id ? 'text-current' : ''
                    }`} />
                  </div>
                  <span className={`text-xs font-medium truncate ${
                    selectedCategory === category.id ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                  }`}>
                    {category.name}
                  </span>
                </div>
                
                {/* Right arrow with animation */}
                <div className={`flex-shrink-0 transition-all duration-300 ${
                  selectedCategory === category.id 
                    ? 'text-blue-600 translate-x-0.5' 
                    : 'text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5'
                }`}>
                  <svg 
                    className="w-3.5 h-3.5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                {/* Selection indicator */}
                {selectedCategory === category.id && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-r-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-3 py-2 border-t border-gray-200 flex-shrink-0 bg-white">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-600 mb-0.5">
              💡 Select a category
            </p>
            <p className="text-xs text-gray-400">
              to browse elements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElementsSidebar;
