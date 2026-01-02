import React from 'react';

const CustomEdge = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition, 
  targetPosition,
  style = {},
  data,
  markerEnd,
  animated
}) => {
  const edgePath = `M${sourceX},${sourceY} C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
  
  // Check if this is an auto-connected edge
  const isAutoConnected = data?.isAutoConnected || false;
  
  // Get custom edge color and style
  const edgeColor = data?.edgeColor || style?.stroke || (isAutoConnected ? '#3b82f6' : '#6b7280');
  const edgeStyle = data?.edgeStyle || 'default';
  
  // Calculate stroke dasharray based on style
  let strokeDasharray = style?.strokeDasharray;
  if (!strokeDasharray) {
    switch (edgeStyle) {
      case 'dashed':
        strokeDasharray = '10,5';
        break;
      case 'dotted':
        strokeDasharray = '2,4';
        break;
      default:
        strokeDasharray = undefined;
    }
  }
  
  // Enhanced styling
  const pathStyle = {
    ...style,
    stroke: edgeColor,
    strokeDasharray,
    ...(isAutoConnected && {
      strokeWidth: 3,
      filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))',
    })
  };
  
  // Calculate label position (center of edge)
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;
  
  return (
    <>
      {/* INVISIBLE WIDE HIT AREA - Makes clicking easier */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
      />
      
      {/* Glow effect for auto-connected edges */}
      {isAutoConnected && (
        <path
          id={`${id}-glow`}
          style={{
            strokeWidth: 8,
            stroke: 'rgba(59, 130, 246, 0.15)',
            fill: 'none',
            filter: 'blur(2px)',
          }}
          d={edgePath}
          markerEnd={markerEnd}
        />
      )}
      
      {/* Visible edge path */}
      <path
        id={id}
        style={pathStyle}
        className={`react-flow__edge-path ${isAutoConnected ? 'auto-connected-edge' : ''} ${animated || edgeStyle === 'animated' ? 'animated' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
        strokeWidth={isAutoConnected ? 3 : 2}
        fill="none"
      />
      
      {/* Edge Label with background */}
      {data?.label && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Label background */}
          <rect
            x={labelX - (data.label.length * 4 + 10)}
            y={labelY - 12}
            width={data.label.length * 8 + 20}
            height={24}
            rx={12}
            fill="white"
            stroke={edgeColor}
            strokeWidth={1.5}
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))' }}
          />
          {/* Label text */}
          <text
            x={labelX}
            y={labelY + 4}
            textAnchor="middle"
            style={{ 
              fontSize: 11, 
              fontWeight: 500,
              fill: edgeColor,
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            {data.label}
          </text>
        </g>
      )}
      
      {/* Auto-connected indicator badge (only show if no label) */}
      {isAutoConnected && !data?.label && (
        <circle
          cx={labelX}
          cy={labelY}
          r="6"
          fill="#3b82f6"
          opacity="0.8"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            pointerEvents: 'none'
          }}
        />
      )}
    </>
  );
};

export default CustomEdge;



