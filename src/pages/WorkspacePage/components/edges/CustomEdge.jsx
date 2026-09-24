import React, { useState, useRef, useEffect } from 'react';
import { getSmoothStepPath } from 'reactflow';

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
  // Route the edge orthogonally based on the actual handle positions —
  // the previous hardcoded horizontal bezier ignored handle sides and
  // produced sideways spaghetti for vertical/backward connections
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });
  
  // Get custom edge color and style
  const edgeColor = data?.edgeColor || style?.stroke || '#6b7280';
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
  };
  
  // labelX/labelY come from getSmoothStepPath — the true center of the path

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
      
      {/* Visible edge path */}
      <path
        id={id}
        style={pathStyle}
        className={`react-flow__edge-path ${animated || edgeStyle === 'animated' ? 'animated' : ''}`}
        d={edgePath}
        markerEnd={markerEnd}
        strokeWidth={2}
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
          className="w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center cursor-pointer  opacity-0 hover:opacity-100 transition-opacity duration-200 hover:border-info group"
          onClick={(e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('openEdgeComment', { detail: { edgeId: id, x: labelX, y: labelY } }));
          }}
          style={{ lineHeight: 0 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-dim group-hover:text-info">
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
            className="w-5 h-5 rounded-full bg-info text-white flex items-center justify-center cursor-pointer  text-[8px] font-bold hover:bg-info transition-colors"
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



