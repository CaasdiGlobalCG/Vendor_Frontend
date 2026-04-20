import React from 'react';

const MAX_LABEL_LENGTH = 32;

const truncateLabel = (label = '') =>
  label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label;

const BreadcrumbSegment = ({
  label,
  onClick,
  isActive,
  isFirst,
  isLast,
  index
}) => {
  const Component = onClick ? 'button' : 'div';
  const clipPath = isLast
    ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
    : 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%)';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 text-[11px] font-medium border transition-colors duration-150 ${
        isFirst ? '' : '-ml-4'
      } ${
        onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400' : 'cursor-default'
      } ${
        isActive
          ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:text-gray-800'
      }`}
      style={{
        clipPath,
        borderTopLeftRadius: isFirst ? '8px' : '0px',
        borderBottomLeftRadius: isFirst ? '8px' : '0px',
        borderTopRightRadius: isLast ? '8px' : '0px',
        borderBottomRightRadius: isLast ? '8px' : '0px',
        zIndex: 20 - index
      }}
    >
      <span className="truncate max-w-[160px]">{truncateLabel(label)}</span>
    </Component>
  );
};

const BreadcrumbNavigation = ({
  selectedTask,
  selectedSubtask,
  selectedLayer,
  selectedLayerItem,
  onBackToHome,
  onBackToTask,
  onBackToLayer
}) => {
  if (!selectedTask && !selectedLayer) return null;

  const breadcrumbs = [
    {
      key: 'home',
      label: 'Home',
      onClick: onBackToHome,
      isActive: !selectedTask && !selectedLayer
    }
  ];

  if (selectedTask) {
    breadcrumbs.push({
      key: `task-${selectedTask.id ?? selectedTask.name}`,
      label: selectedTask.name,
      onClick: selectedSubtask ? onBackToTask : undefined,
      isActive: !!selectedTask && !selectedSubtask
    });

    if (selectedSubtask) {
      breadcrumbs.push({
        key: `subtask-${selectedSubtask.id ?? selectedSubtask.name}`,
        label: selectedSubtask.name,
        isActive: true
      });
    }
  }

  if (selectedLayer) {
    breadcrumbs.push({
      key: `layer-${selectedLayer.id ?? selectedLayer.name}`,
      label: selectedLayer.name,
      onClick: selectedLayerItem ? onBackToLayer : undefined,
      isActive: !!selectedLayer && !selectedLayerItem
    });

    if (selectedLayerItem) {
      breadcrumbs.push({
        key: `layer-item-${selectedLayerItem.id ?? selectedLayerItem.name}`,
        label: selectedLayerItem.name,
        isActive: true
      });
    }
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 shadow-sm" data-workspace-navigation>
      <div className="px-6 py-3">
        <div className="flex items-center">
          <div className="flex items-center">
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbSegment
                key={crumb.key}
                label={crumb.label}
                onClick={crumb.onClick}
                isActive={crumb.isActive}
                isFirst={index === 0}
                isLast={index === breadcrumbs.length - 1}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbNavigation;