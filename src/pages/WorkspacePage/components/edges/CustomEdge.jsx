import React, { useState, useRef, useEffect } from 'react';

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

      {/* Edge comment icon — appears on hover offset below the edge midpoint */}
      <foreignObject
        x={labelX + (data?.label ? (data.label.length * 4 + 14) : 10)}
        y={labelY - 10}
        width={22}
        height={22}
        className="overflow-visible"
        style={{ pointerEvents: 'all' }}
      >
        <div
          title="Add comment to edge"
          className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center cursor-pointer shadow-sm opacity-0 hover:opacity-100 transition-opacity duration-200 hover:border-blue-400 group"
          onClick={(e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('openEdgeComment', { detail: { edgeId: id, x: labelX, y: labelY } }));
          }}
          style={{ lineHeight: 0 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-blue-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </foreignObject>

      {/* Show comment count badge if edge has comments */}
      {data?.comments?.length > 0 && (
        <foreignObject
          x={labelX + (data?.label ? (data.label.length * 4 + 14) : 10)}
          y={labelY - 10}
          width={22}
          height={22}
          className="overflow-visible"
          style={{ pointerEvents: 'all' }}
        >
          <div
            className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-pointer shadow-sm text-[8px] font-bold hover:bg-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              document.dispatchEvent(new CustomEvent('openEdgeComment', { detail: { edgeId: id, x: labelX, y: labelY } }));
            }}
          >
            {data.comments.filter(c => !c.resolved).length || data.comments.length}
          </div>
        </foreignObject>
      )}
    </>
  );
};

export default CustomEdge;



