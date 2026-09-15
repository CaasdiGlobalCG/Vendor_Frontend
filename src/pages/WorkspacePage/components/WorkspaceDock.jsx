import React from 'react';
import { 
  Grid, 
  Type, 
  LayoutTemplate, 
  GitBranch, 
  LayoutGrid, 
  CheckSquare, 
  Layers, 
  Paperclip,
  Sparkles
} from 'lucide-react';

const WorkspaceDock = ({
  activeTab,
  onSelectTab,
  isPanelOpen = true,
  disabled = false
}) => {
  const topDockItems = [
    { id: 'elements', label: 'Elements', icon: Grid, title: 'Elements library' },
    { id: 'text', label: 'Text', icon: Type, title: 'Typography & text blocks' },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate, title: 'Workflow & document templates' },
    { id: 'workflow', label: 'Flow', icon: GitBranch, title: 'Workflow builder' },
    { id: 'layouts', label: 'Layouts', icon: LayoutGrid, title: 'Multi-element layouts' },
  ];

  const bottomDockItems = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, title: 'Project tasks & subtasks' },
    { id: 'layers', label: 'Layers', icon: Layers, title: 'Canvas elements & layers' },
    { id: 'assets', label: 'Assets', icon: Paperclip, title: 'Files & attachments' },
  ];

  const handleClick = (itemId) => {
    if (disabled) return;
    onSelectTab(itemId);
  };

  return (
    <aside className="ws-dock" data-workspace-dock>
      {topDockItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeTab === item.id && isPanelOpen;
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`ws-dock-item ${isActive ? 'active' : ''}`}
            title={item.title}
            data-tour={`${item.id}-btn`}
          >
            <IconComponent />
            <span className="ws-dock-lbl">{item.label}</span>
          </button>
        );
      })}

      <div className="ws-dock-divider" />

      {bottomDockItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeTab === item.id && isPanelOpen;
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`ws-dock-item ${isActive ? 'active' : ''}`}
            title={item.title}
            data-tour={`${item.id}-btn`}
          >
            <IconComponent />
            <span className="ws-dock-lbl">{item.label}</span>
          </button>
        );
      })}

      {/* Agents — AI assistants (Atlas, …) */}
      <div className="ws-dock-divider" />
      <button
        onClick={() => handleClick('agent')}
        className={`ws-dock-item ws-dock-agent ${activeTab === 'agent' && isPanelOpen ? 'active' : ''}`}
        title="AI agents"
        data-tour="agent-btn"
      >
        <Sparkles />
        <span className="ws-dock-lbl">Agent</span>
      </button>
    </aside>
  );
};

export default WorkspaceDock;
