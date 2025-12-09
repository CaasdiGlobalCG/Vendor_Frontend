// Pre-defined business flowchart templates
// Each template contains nodes and edges that will be added to the canvas

export const flowchartTemplates = {
  'swot-analysis': {
    name: 'SWOT Analysis',
    description: 'Strategic planning framework analyzing Strengths, Weaknesses, Opportunities, and Threats',
    nodes: [
      {
        id: 'swot-title',
        type: 'textNode',
        position: { x: 400, y: 50 },
        data: {
          name: 'SWOT Analysis',
          type: 'text',
          content: 'SWOT Analysis',
          fontSize: 24,
          fontFamily: 'Inter',
          color: '#1f2937',
          backgroundColor: 'transparent',
          formats: { bold: true }
        }
      },
      {
        id: 'strengths',
        type: 'layoutNode',
        position: { x: 100, y: 150 },
        data: {
          name: 'Strengths',
          type: 'frame',
          width: 300,
          height: 200,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a'
        }
      },
      {
        id: 'weaknesses',
        type: 'layoutNode',
        position: { x: 500, y: 150 },
        data: {
          name: 'Weaknesses',
          type: 'frame',
          width: 300,
          height: 200,
          backgroundColor: '#fef2f2',
          borderColor: '#dc2626'
        }
      },
      {
        id: 'opportunities',
        type: 'layoutNode',
        position: { x: 100, y: 400 },
        data: {
          name: 'Opportunities',
          type: 'frame',
          width: 300,
          height: 200,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'threats',
        type: 'layoutNode',
        position: { x: 500, y: 400 },
        data: {
          name: 'Threats',
          type: 'frame',
          width: 300,
          height: 200,
          backgroundColor: '#fef3c7',
          borderColor: '#d97706'
        }
      }
    ],
    edges: []
  },

  'business-model-canvas': {
    name: 'Business Model Canvas',
    description: '9-block strategic management template for developing new business models',
    nodes: [
      {
        id: 'bmc-title',
        type: 'textNode',
        position: { x: 400, y: 20 },
        data: {
          name: 'Business Model Canvas',
          type: 'text',
          content: 'Business Model Canvas',
          fontSize: 20,
          fontFamily: 'Inter',
          color: '#1f2937',
          backgroundColor: 'transparent',
          formats: { bold: true }
        }
      },
      {
        id: 'key-partners',
        type: 'layoutNode',
        position: { x: 50, y: 80 },
        data: {
          name: 'Key Partners',
          type: 'frame',
          width: 180,
          height: 300,
          backgroundColor: '#f3f4f6',
          borderColor: '#6b7280'
        }
      },
      {
        id: 'key-activities',
        type: 'layoutNode',
        position: { x: 250, y: 80 },
        data: {
          name: 'Key Activities',
          type: 'frame',
          width: 180,
          height: 140,
          backgroundColor: '#fef3c7',
          borderColor: '#d97706'
        }
      },
      {
        id: 'key-resources',
        type: 'layoutNode',
        position: { x: 250, y: 240 },
        data: {
          name: 'Key Resources',
          type: 'frame',
          width: 180,
          height: 140,
          backgroundColor: '#fef3c7',
          borderColor: '#d97706'
        }
      },
      {
        id: 'value-propositions',
        type: 'layoutNode',
        position: { x: 450, y: 80 },
        data: {
          name: 'Value Propositions',
          type: 'frame',
          width: 180,
          height: 300,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a'
        }
      },
      {
        id: 'customer-relationships',
        type: 'layoutNode',
        position: { x: 650, y: 80 },
        data: {
          name: 'Customer Relationships',
          type: 'frame',
          width: 180,
          height: 140,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'channels',
        type: 'layoutNode',
        position: { x: 650, y: 240 },
        data: {
          name: 'Channels',
          type: 'frame',
          width: 180,
          height: 140,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'customer-segments',
        type: 'layoutNode',
        position: { x: 850, y: 80 },
        data: {
          name: 'Customer Segments',
          type: 'frame',
          width: 180,
          height: 300,
          backgroundColor: '#f3f4f6',
          borderColor: '#6b7280'
        }
      },
      {
        id: 'cost-structure',
        type: 'layoutNode',
        position: { x: 50, y: 400 },
        data: {
          name: 'Cost Structure',
          type: 'frame',
          width: 480,
          height: 120,
          backgroundColor: '#fef2f2',
          borderColor: '#dc2626'
        }
      },
      {
        id: 'revenue-streams',
        type: 'layoutNode',
        position: { x: 550, y: 400 },
        data: {
          name: 'Revenue Streams',
          type: 'frame',
          width: 480,
          height: 120,
          backgroundColor: '#f0fdf4',
          borderColor: '#16a34a'
        }
      }
    ],
    edges: []
  },

  'goal-setting-framework': {
    name: 'Goal Setting Framework',
    description: 'SMART goals framework with action planning and tracking',
    nodes: [
      {
        id: 'goal-title',
        type: 'textNode',
        position: { x: 400, y: 50 },
        data: {
          name: 'Goal Setting Framework',
          type: 'text',
          content: 'SMART Goal Setting Framework',
          fontSize: 20,
          fontFamily: 'Inter',
          color: '#1f2937',
          backgroundColor: 'transparent',
          formats: { bold: true }
        }
      },
      {
        id: 'specific',
        type: 'layoutNode',
        position: { x: 100, y: 150 },
        data: {
          name: 'Specific',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'measurable',
        type: 'layoutNode',
        position: { x: 280, y: 150 },
        data: {
          name: 'Measurable',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a'
        }
      },
      {
        id: 'achievable',
        type: 'layoutNode',
        position: { x: 460, y: 150 },
        data: {
          name: 'Achievable',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#fef3c7',
          borderColor: '#d97706'
        }
      },
      {
        id: 'relevant',
        type: 'layoutNode',
        position: { x: 640, y: 150 },
        data: {
          name: 'Relevant',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#f3e8ff',
          borderColor: '#9333ea'
        }
      },
      {
        id: 'time-bound',
        type: 'layoutNode',
        position: { x: 820, y: 150 },
        data: {
          name: 'Time-bound',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#fef2f2',
          borderColor: '#dc2626'
        }
      },
      {
        id: 'action-plan',
        type: 'layoutNode',
        position: { x: 200, y: 300 },
        data: {
          name: 'Action Plan',
          type: 'frame',
          width: 250,
          height: 150,
          backgroundColor: '#f0fdf4',
          borderColor: '#16a34a'
        }
      },
      {
        id: 'milestones',
        type: 'layoutNode',
        position: { x: 500, y: 300 },
        data: {
          name: 'Milestones',
          type: 'frame',
          width: 250,
          height: 150,
          backgroundColor: '#eff6ff',
          borderColor: '#3b82f6'
        }
      },
      {
        id: 'tracking',
        type: 'layoutNode',
        position: { x: 350, y: 500 },
        data: {
          name: 'Progress Tracking',
          type: 'frame',
          width: 300,
          height: 100,
          backgroundColor: '#fdf4ff',
          borderColor: '#c026d3'
        }
      }
    ],
    edges: [
      {
        id: 'specific-to-action',
        source: 'specific',
        target: 'action-plan',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'measurable-to-milestones',
        source: 'measurable',
        target: 'milestones',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'action-to-tracking',
        source: 'action-plan',
        target: 'tracking',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'milestones-to-tracking',
        source: 'milestones',
        target: 'tracking',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      }
    ]
  },

  'decision-tree': {
    name: 'Decision Tree',
    description: 'Decision-making process flow with multiple paths and outcomes',
    nodes: [
      {
        id: 'decision-start',
        type: 'elementNode',
        position: { x: 400, y: 100 },
        data: {
          name: 'Decision Point',
          type: 'button',
          preview: 'Start decision process'
        }
      },
      {
        id: 'criteria-1',
        type: 'layoutNode',
        position: { x: 200, y: 250 },
        data: {
          name: 'Criteria 1',
          type: 'frame',
          width: 150,
          height: 80,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'criteria-2',
        type: 'layoutNode',
        position: { x: 400, y: 250 },
        data: {
          name: 'Criteria 2',
          type: 'frame',
          width: 150,
          height: 80,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'criteria-3',
        type: 'layoutNode',
        position: { x: 600, y: 250 },
        data: {
          name: 'Criteria 3',
          type: 'frame',
          width: 150,
          height: 80,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'outcome-1',
        type: 'layoutNode',
        position: { x: 150, y: 400 },
        data: {
          name: 'Outcome A',
          type: 'frame',
          width: 120,
          height: 60,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a'
        }
      },
      {
        id: 'outcome-2',
        type: 'layoutNode',
        position: { x: 300, y: 400 },
        data: {
          name: 'Outcome B',
          type: 'frame',
          width: 120,
          height: 60,
          backgroundColor: '#fef3c7',
          borderColor: '#d97706'
        }
      },
      {
        id: 'outcome-3',
        type: 'layoutNode',
        position: { x: 450, y: 400 },
        data: {
          name: 'Outcome C',
          type: 'frame',
          width: 120,
          height: 60,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a'
        }
      },
      {
        id: 'outcome-4',
        type: 'layoutNode',
        position: { x: 600, y: 400 },
        data: {
          name: 'Outcome D',
          type: 'frame',
          width: 120,
          height: 60,
          backgroundColor: '#fef2f2',
          borderColor: '#dc2626'
        }
      }
    ],
    edges: [
      {
        id: 'start-to-c1',
        source: 'decision-start',
        target: 'criteria-1',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6b7280' },
        data: { label: 'Option 1' }
      },
      {
        id: 'start-to-c2',
        source: 'decision-start',
        target: 'criteria-2',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6b7280' },
        data: { label: 'Option 2' }
      },
      {
        id: 'start-to-c3',
        source: 'decision-start',
        target: 'criteria-3',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#6b7280' },
        data: { label: 'Option 3' }
      },
      {
        id: 'c1-to-o1',
        source: 'criteria-1',
        target: 'outcome-1',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#16a34a' }
      },
      {
        id: 'c1-to-o2',
        source: 'criteria-1',
        target: 'outcome-2',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#d97706' }
      },
      {
        id: 'c2-to-o2',
        source: 'criteria-2',
        target: 'outcome-2',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#d97706' }
      },
      {
        id: 'c2-to-o3',
        source: 'criteria-2',
        target: 'outcome-3',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#16a34a' }
      },
      {
        id: 'c3-to-o3',
        source: 'criteria-3',
        target: 'outcome-3',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#16a34a' }
      },
      {
        id: 'c3-to-o4',
        source: 'criteria-3',
        target: 'outcome-4',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 2, stroke: '#dc2626' }
      }
    ]
  },

  'customer-journey-map': {
    name: 'Customer Journey Map',
    description: 'Customer experience touchpoints and interactions throughout their journey',
    nodes: [
      {
        id: 'journey-title',
        type: 'textNode',
        position: { x: 400, y: 50 },
        data: {
          name: 'Customer Journey Map',
          type: 'text',
          content: 'Customer Journey Map',
          fontSize: 20,
          fontFamily: 'Inter',
          color: '#1f2937',
          backgroundColor: 'transparent',
          formats: { bold: true }
        }
      },
      {
        id: 'awareness',
        type: 'layoutNode',
        position: { x: 100, y: 150 },
        data: {
          name: 'Awareness',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#fef3c7',
          borderColor: '#d97706'
        }
      },
      {
        id: 'consideration',
        type: 'layoutNode',
        position: { x: 300, y: 150 },
        data: {
          name: 'Consideration',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#dbeafe',
          borderColor: '#2563eb'
        }
      },
      {
        id: 'purchase',
        type: 'layoutNode',
        position: { x: 500, y: 150 },
        data: {
          name: 'Purchase',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a'
        }
      },
      {
        id: 'onboarding',
        type: 'layoutNode',
        position: { x: 700, y: 150 },
        data: {
          name: 'Onboarding',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#f3e8ff',
          borderColor: '#9333ea'
        }
      },
      {
        id: 'support',
        type: 'layoutNode',
        position: { x: 900, y: 150 },
        data: {
          name: 'Support',
          type: 'frame',
          width: 150,
          height: 100,
          backgroundColor: '#fef2f2',
          borderColor: '#dc2626'
        }
      },
      {
        id: 'touchpoints',
        type: 'textNode',
        position: { x: 100, y: 300 },
        data: {
          name: 'Touchpoints',
          type: 'text',
          content: 'Touchpoints',
          fontSize: 16,
          fontFamily: 'Inter',
          color: '#374151',
          backgroundColor: 'transparent',
          formats: { bold: true }
        }
      },
      {
        id: 'emotions',
        type: 'textNode',
        position: { x: 100, y: 400 },
        data: {
          name: 'Emotions',
          type: 'text',
          content: 'Customer Emotions',
          fontSize: 16,
          fontFamily: 'Inter',
          color: '#374151',
          backgroundColor: 'transparent',
          formats: { bold: true }
        }
      },
      {
        id: 'pain-points',
        type: 'textNode',
        position: { x: 100, y: 500 },
        data: {
          name: 'Pain Points',
          type: 'text',
          content: 'Pain Points',
          fontSize: 16,
          fontFamily: 'Inter',
          color: '#dc2626',
          backgroundColor: 'transparent',
          formats: { bold: true }
        }
      }
    ],
    edges: [
      {
        id: 'awareness-to-consideration',
        source: 'awareness',
        target: 'consideration',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 3, stroke: '#3b82f6' }
      },
      {
        id: 'consideration-to-purchase',
        source: 'consideration',
        target: 'purchase',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 3, stroke: '#3b82f6' }
      },
      {
        id: 'purchase-to-onboarding',
        source: 'purchase',
        target: 'onboarding',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 3, stroke: '#3b82f6' }
      },
      {
        id: 'onboarding-to-support',
        source: 'onboarding',
        target: 'support',
        type: 'custom',
        animated: true,
        style: { strokeWidth: 3, stroke: '#3b82f6' }
      }
    ]
  },

  'organizational-chart': {
    name: 'Organizational Chart',
    description: 'Company hierarchy and reporting structure',
    nodes: [
      {
        id: 'ceo',
        type: 'elementNode',
        position: { x: 400, y: 100 },
        data: {
          name: 'CEO',
          type: 'button',
          preview: 'Chief Executive Officer'
        }
      },
      {
        id: 'cto',
        type: 'elementNode',
        position: { x: 200, y: 250 },
        data: {
          name: 'CTO',
          type: 'button',
          preview: 'Chief Technology Officer'
        }
      },
      {
        id: 'cfo',
        type: 'elementNode',
        position: { x: 400, y: 250 },
        data: {
          name: 'CFO',
          type: 'button',
          preview: 'Chief Financial Officer'
        }
      },
      {
        id: 'cmo',
        type: 'elementNode',
        position: { x: 600, y: 250 },
        data: {
          name: 'CMO',
          type: 'button',
          preview: 'Chief Marketing Officer'
        }
      },
      {
        id: 'dev-manager',
        type: 'elementNode',
        position: { x: 100, y: 400 },
        data: {
          name: 'Dev Manager',
          type: 'button',
          preview: 'Development Manager'
        }
      },
      {
        id: 'qa-manager',
        type: 'elementNode',
        position: { x: 300, y: 400 },
        data: {
          name: 'QA Manager',
          type: 'button',
          preview: 'Quality Assurance Manager'
        }
      },
      {
        id: 'finance-manager',
        type: 'elementNode',
        position: { x: 400, y: 400 },
        data: {
          name: 'Finance Manager',
          type: 'button',
          preview: 'Finance Manager'
        }
      },
      {
        id: 'marketing-manager',
        type: 'elementNode',
        position: { x: 600, y: 400 },
        data: {
          name: 'Marketing Manager',
          type: 'button',
          preview: 'Marketing Manager'
        }
      },
      {
        id: 'sales-manager',
        type: 'elementNode',
        position: { x: 700, y: 400 },
        data: {
          name: 'Sales Manager',
          type: 'button',
          preview: 'Sales Manager'
        }
      }
    ],
    edges: [
      {
        id: 'ceo-to-cto',
        source: 'ceo',
        target: 'cto',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'ceo-to-cfo',
        source: 'ceo',
        target: 'cfo',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'ceo-to-cmo',
        source: 'ceo',
        target: 'cmo',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'cto-to-dev',
        source: 'cto',
        target: 'dev-manager',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'cto-to-qa',
        source: 'cto',
        target: 'qa-manager',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'cfo-to-finance',
        source: 'cfo',
        target: 'finance-manager',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'cmo-to-marketing',
        source: 'cmo',
        target: 'marketing-manager',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      },
      {
        id: 'cmo-to-sales',
        source: 'cmo',
        target: 'sales-manager',
        type: 'custom',
        animated: false,
        style: { strokeWidth: 2, stroke: '#6b7280' }
      }
    ]
  }
};

// Helper function to get a flowchart template by ID
export const getFlowchartTemplate = (templateId) => {
  return flowchartTemplates[templateId] || null;
};

// Helper function to get all available flowchart templates
export const getAllFlowchartTemplates = () => {
  return Object.keys(flowchartTemplates).map(id => ({
    id,
    ...flowchartTemplates[id]
  }));
};
