import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

const actionColorByType = {
  'create-task': '#E8F7EE',
  'update-status': '#FFF5E6',
  'assign-user': '#FFFDEB',
  'send-email': '#EAF1FF',
  'call-webhook': '#FDECEC',
  'invoke-subworkflow': '#F3EDFF',
  'wait-approval': '#FFF7E6',
  'conditional-branch': '#EEF2FF',
  loop: '#ECFEFF'
};

const triggerColorByType = {
  'status-change': '#E8F0FF',
  'task-completion': '#EAFBF2',
  approval: '#FFF7E6',
  'time-based': '#EAF7FF',
  conditional: '#F6EDFF',
  webhook: '#FDECEC'
};

const cardStyle = (bg, border = '#D1D5DB') => ({
  border: `1px solid ${border}`,
  borderRadius: 12,
  background: bg,
  padding: 10,
  width: 220,
  fontSize: 12,
  color: '#111827'
});

const compact = (value) => {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 100 ? `${text.slice(0, 100)}...` : text;
  } catch {
    return String(value);
  }
};

const buildGraph = (triggers = [], logicOperator = 'AND', actions = []) => {
  const nodes = [];
  const edges = [];

  const centerY = 260;

  const triggerGap = 130;
  const triggerStartY = centerY - ((Math.max(triggers.length, 1) - 1) * triggerGap) / 2;

  const triggerIds = [];
  triggers.forEach((trigger, index) => {
    const id = `trigger-${trigger.id || index}`;
    triggerIds.push(id);

    nodes.push({
      id,
      position: { x: 40, y: triggerStartY + index * triggerGap },
      data: {
        label: (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Trigger</div>
            <div style={{ textTransform: 'capitalize' }}>{trigger.type || 'unknown'}</div>
            <div style={{ marginTop: 4, color: '#4B5563' }}>{compact(trigger.rule)}</div>
          </div>
        )
      },
      style: cardStyle(triggerColorByType[trigger.type] || '#EEF2FF', '#B6CCFE')
    });
  });

  const logicId = 'logic-node';
  nodes.push({
    id: logicId,
    position: { x: 330, y: centerY - 40 },
    data: {
      label: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Logic</div>
          <div style={{ marginTop: 4 }}>{logicOperator || 'AND'}</div>
        </div>
      )
    },
    style: {
      ...cardStyle('#F3F4F6', '#9CA3AF'),
      width: 120,
      borderRadius: 999
    }
  });

  triggerIds.forEach((id) => {
    edges.push({
      id: `${id}->${logicId}`,
      source: id,
      target: logicId,
      animated: false,
      style: { stroke: '#94A3B8', strokeWidth: 1.5 }
    });
  });

  let currentAnchors = [logicId];
  let x = 560;
  let actionIndex = 0;

  while (actionIndex < actions.length) {
    const action = actions[actionIndex];

    if (action.parallelGroup) {
      const groupKey = action.parallelGroup;
      const grouped = [];
      let cursor = actionIndex;

      while (cursor < actions.length && actions[cursor].parallelGroup === groupKey) {
        grouped.push(actions[cursor]);
        cursor += 1;
      }

      const laneGap = 110;
      const groupStartY = centerY - ((grouped.length - 1) * laneGap) / 2;
      const fanoutIds = [];

      grouped.forEach((item, i) => {
        const id = `action-${actionIndex + i}`;
        fanoutIds.push(id);
        nodes.push({
          id,
          position: { x, y: groupStartY + i * laneGap },
          data: {
            label: (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Action #{actionIndex + i + 1}</div>
                <div style={{ textTransform: 'capitalize' }}>{item.type}</div>
                <div style={{ marginTop: 4, color: '#4B5563' }}>{compact(item.params)}</div>
                <div style={{ marginTop: 4, color: '#3730A3', fontWeight: 600 }}>Fan-out: {groupKey}</div>
              </div>
            )
          },
          style: cardStyle(actionColorByType[item.type] || '#EFF6FF', '#A5B4FC')
        });
      });

      currentAnchors.forEach((anchor) => {
        fanoutIds.forEach((id) => {
          edges.push({
            id: `${anchor}->${id}`,
            source: anchor,
            target: id,
            animated: true,
            style: { stroke: '#4F46E5', strokeWidth: 1.8 }
          });
        });
      });

      const joinId = `join-${groupKey}-${actionIndex}`;
      nodes.push({
        id: joinId,
        position: { x: x + 260, y: centerY - 30 },
        data: { label: <div style={{ fontWeight: 700, textAlign: 'center' }}>Join {groupKey}</div> },
        style: {
          ...cardStyle('#EEF2FF', '#818CF8'),
          width: 130,
          borderRadius: 999
        }
      });

      fanoutIds.forEach((id) => {
        edges.push({
          id: `${id}->${joinId}`,
          source: id,
          target: joinId,
          animated: false,
          style: { stroke: '#6366F1', strokeWidth: 1.5 }
        });
      });

      currentAnchors = [joinId];
      x += 360;
      actionIndex = cursor;
      continue;
    }

    const id = `action-${actionIndex}`;
    nodes.push({
      id,
      position: { x, y: centerY - 60 },
      data: {
        label: (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Action #{actionIndex + 1}</div>
            <div style={{ textTransform: 'capitalize' }}>{action.type}</div>
            <div style={{ marginTop: 4, color: '#4B5563' }}>{compact(action.params)}</div>
          </div>
        )
      },
      style: cardStyle(actionColorByType[action.type] || '#EFF6FF', '#93C5FD')
    });

    currentAnchors.forEach((anchor) => {
      edges.push({
        id: `${anchor}->${id}`,
        source: anchor,
        target: id,
        animated: true,
        style: { stroke: '#2563EB', strokeWidth: 1.8 }
      });
    });

    currentAnchors = [id];
    x += 270;
    actionIndex += 1;
  }

  const endId = 'end-node';
  nodes.push({
    id: endId,
    position: { x: x + 20, y: centerY - 30 },
    data: { label: <div style={{ fontWeight: 700, textAlign: 'center' }}>End</div> },
    style: {
      ...cardStyle('#ECFDF5', '#34D399'),
      width: 100,
      borderRadius: 999
    }
  });

  currentAnchors.forEach((anchor) => {
    edges.push({
      id: `${anchor}->${endId}`,
      source: anchor,
      target: endId,
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 1.8 }
    });
  });

  return { nodes, edges };
};

const WorkflowFlowDiagram = ({ triggers, logicOperator, actions }) => {
  const { nodes, edges } = useMemo(
    () => buildGraph(triggers || [], logicOperator || 'AND', actions || []),
    [triggers, logicOperator, actions]
  );

  return (
    <div className="w-full h-[380px] rounded-xl border border-gray-200 overflow-hidden bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap pannable zoomable />
        <Controls showInteractive={false} />
        <Background color="#E5E7EB" gap={20} />
      </ReactFlow>
    </div>
  );
};

export default WorkflowFlowDiagram;
