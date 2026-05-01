import type { ComponentProps } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Edge,
  type Node,
} from '@xyflow/react';
import type { GroupColors } from '../types';
import { PageNode } from './nodes/PageNode';
import { CompactNode } from './nodes/CompactNode';
import { GroupNode } from './nodes/GroupNode';
import { NavEdge } from './edges/NavEdge';

const nodeTypes = {
  pageNode: PageNode,
  compactNode: CompactNode,
  groupNode: GroupNode,
};

const edgeTypes = {
  navEdge: NavEdge,
};

type ReactFlowProps = ComponentProps<typeof ReactFlow>;

interface NavMapCanvasProps {
  nodes: Node[];
  edges: Edge[];
  isDark: boolean;
  isNarrow: boolean;
  getGroupColors: (groupId: string) => GroupColors;
  onNodesChange: NonNullable<ReactFlowProps['onNodesChange']>;
  onEdgesChange: NonNullable<ReactFlowProps['onEdgesChange']>;
  onSelectionChange: NonNullable<ReactFlowProps['onSelectionChange']>;
  onNodeDragStart: NonNullable<ReactFlowProps['onNodeDragStart']>;
  onNodeDragStop: NonNullable<ReactFlowProps['onNodeDragStop']>;
  onNodeContextMenu: NonNullable<ReactFlowProps['onNodeContextMenu']>;
  onNodeMouseEnter: NonNullable<ReactFlowProps['onNodeMouseEnter']>;
  onNodeMouseLeave: NonNullable<ReactFlowProps['onNodeMouseLeave']>;
  onNodeDoubleClick: NonNullable<ReactFlowProps['onNodeDoubleClick']>;
}

export function NavMapCanvas({
  nodes,
  edges,
  isDark,
  isNarrow,
  getGroupColors,
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
  onNodeDragStart,
  onNodeDragStop,
  onNodeContextMenu,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onNodeDoubleClick,
}: NavMapCanvasProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={onSelectionChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onNodeContextMenu={onNodeContextMenu}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onNodeDoubleClick={onNodeDoubleClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      defaultEdgeOptions={{ type: 'navEdge', animated: false }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color={isDark ? '#1a1a28' : '#ddd'}
      />
      <Controls
        showInteractive={false}
        style={{
          background: isDark ? '#14141e' : '#fff',
          border: `1px solid ${isDark ? '#2a2a3a' : '#d0d0d8'}`,
          borderRadius: 8,
        }}
      />
      {!isNarrow && (
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={node => {
            const nodeData = node.data as { group?: string } | undefined;
            const colors = getGroupColors(nodeData?.group ?? '');
            return colors.border;
          }}
          style={{
            background: isDark ? '#14141e' : '#fff',
            border: `1px solid ${isDark ? '#2a2a3a' : '#d0d0d8'}`,
            borderRadius: 8,
          }}
        />
      )}
    </ReactFlow>
  );
}
