'use client';

import React, { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  Node,
  Edge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeEditPanel } from './node-edit-panel';
import { useChat } from '@/app/chat-context';

export type TraceNode = {
  id: number;
  title: string;
  description: string;
};

export type Trace = {
  id: number;
  summary: string;
  nodes: TraceNode[];
};

type CustomNodeData = {
  label: React.ReactNode;
};

function NodeLabel({
  title,
  description,
  expanded = false,
  onClick,
}: {
  title: string;
  description?: string;
  expanded?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      style={{
        padding: '4px 8px',
        maxWidth: 220,
        minHeight: 40,
        maxHeight: expanded ? undefined : 80,
        overflow: expanded ? 'auto' : 'hidden',
        wordBreak: 'break-all',
        whiteSpace: 'pre-line',
        background: '#fff',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: expanded ? '0 0 0 2px #8882' : undefined,
      }}
      onClick={onClick}
      title={expanded ? undefined : '点击展开'}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{title}</div>
      {description && (
        <div
          style={
            expanded
              ? { fontSize: '12px', color: '#888' }
              : {
                  fontSize: '12px',
                  color: '#888',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  maxHeight: '48px',
                }
          }
        >
          {description}
        </div>
      )}
      {!expanded && description && (
        <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>…点击展开</div>
      )}
    </div>
  );
}

export default function Flow({ traces, idea }: { traces: Trace[]; idea: string }) {
  const {
    sessions,
    activeSessionId,
    handleUpdateTraces,
    editingTrace,
    setEditingTrace,
  } = useChat();

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  // 记录节点原始数据，便于编辑和保存
  const [nodeRawData, setNodeRawData] = useState<Record<string, { title: string; description?: string }>>({});

  // 编辑弹窗的子节点数据和状态 - 基于 context 中的数据
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [childTitle, setChildTitle] = useState('');
  const [childDesc, setChildDesc] = useState('');

  // 监听 activeSessionId 变化，关闭编辑面板和重置状态
  React.useEffect(() => {
    console.log('activeSessionId changed:', activeSessionId);
    
    // 当会话切换时，关闭编辑面板并重置相关状态
    setEditingTrace(null);
    setSelectedChildId(null);
    setChildTitle('');
    setChildDesc('');
    setSelectedNodeId(null);
    
    // 清空节点相关状态
    setNodeRawData({});
  }, [activeSessionId, setEditingTrace]);

  // 当 editingTrace 变化时，初始化编辑状态
  React.useEffect(() => {
    if (editingTrace && editingTrace.nodes.length > 0) {
      // 默认选中第一个节点
      const firstNode = editingTrace.nodes[0];
      setSelectedChildId(firstNode.id);
      setChildTitle(firstNode.title);
      setChildDesc(firstNode.description || '');
    } else if (!editingTrace) {
      // 编辑面板关闭时，清空相关状态
      setSelectedChildId(null);
      setChildTitle('');
      setChildDesc('');
    }
  }, [editingTrace]);

  // 构建节点和边 - 使用 activeSession 的数据而不是 props
  useEffect(() => {
    if (!activeSession?.traces || activeSession.traces.length === 0) {
      setNodes([]);
      setEdges([]);
      setNodeRawData({});
      return;
    }

    let newNodes: Node<CustomNodeData>[] = [];
    let newEdges: Edge[] = [];
    let rawData: Record<string, { title: string; description?: string }> = {};

    // 根节点（用户 idea）
    const rootId = 'idea-root';
    const ideaTitle = activeSession.idea || '未输入想法';
    rawData[rootId] = { title: ideaTitle };
    newNodes.push({
      id: rootId,
      position: { x: 100, y: 40 },
      data: {
        label: (
          <NodeLabel
            title={ideaTitle}
            expanded={selectedNodeId === rootId}
            onClick={() => setSelectedNodeId(rootId)}
          />
        ),
      },
      type: 'default',
    });

    activeSession.traces.forEach((trace, traceIdx) => {
      const summaryId = `summary-${trace.id}-${traceIdx}`;
      rawData[summaryId] = { title: trace.summary };
      newNodes.push({
        id: summaryId,
        position: { x: 100 + traceIdx * 600, y: 200 },
        data: {
          label: (
            <NodeLabel
              title={trace.summary}
              expanded={selectedNodeId === summaryId}
              onClick={() => setSelectedNodeId(summaryId)}
            />
          ),
        },
        type: 'default',
      });
      newEdges.push({
        id: `e-${rootId}-${summaryId}`,
        source: rootId,
        target: summaryId,
        animated: false,
      });

      let prevNodeId = summaryId;
      trace.nodes.forEach((node, nodeIdx) => {
        const nodeId = `${summaryId}-node-${node.id}-${nodeIdx}`;
        rawData[nodeId] = { title: node.title, description: node.description };
        newNodes.push({
          id: nodeId,
          position: { x: 100 + traceIdx * 600, y: 350 + nodeIdx * 160 },
          data: {
            label: (
              <NodeLabel
                title={node.title}
                description={node.description}
                expanded={selectedNodeId === nodeId}
                onClick={() => setSelectedNodeId(nodeId)}
              />
            ),
          },
          type: 'default',
        });
        newEdges.push({
          id: `e-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
          animated: false,
        });
        prevNodeId = nodeId;
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setNodeRawData(rawData);
  }, [activeSession, setNodes, setEdges, selectedNodeId]);

  // 双击节点处理 - 更新为使用 context
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('summary-')) {
        const traceId = parseInt(node.id.split('-')[1]);
        const trace = activeSession?.traces?.find(t => t.id === traceId);
        if (trace) {
          const editData = {
            traceId: trace.id,
            summary: trace.summary,
            nodes: trace.nodes.map(n => ({
              id: `summary-${trace.id}-node-${n.id}`,
              title: n.title,
              description: n.description,
            })),
          };
          setEditingTrace(editData);
        }
      } else if (node.id.includes('-node-')) {
        // 双击子节点的处理逻辑
        const nodeData = nodeRawData[node.id];
        if (nodeData && editingTrace) {
          setSelectedChildId(node.id);
          setChildTitle(nodeData.title);
          setChildDesc(nodeData.description || '');
        }
      }
    },
    [nodeRawData, activeSession?.traces, editingTrace, setEditingTrace]
  );

  // 选中子节点时，设置编辑内容
  const handleSelectChild = (childId: string) => {
    setSelectedChildId(childId);
    const child = editingTrace?.nodes.find(c => c.id === childId);
    setChildTitle(child?.title || '');
    setChildDesc(child?.description || '');
  };

  // 保存子节点编辑
  const handleEditSave = (childId: string, newTitle: string, newDesc: string) => {
    if (!editingTrace) return;

    // 更新编辑状态中的节点数据
    const updatedEditingTrace = {
      ...editingTrace,
      nodes: editingTrace.nodes.map(node =>
        node.id === childId
          ? { ...node, title: newTitle, description: newDesc }
          : node
      ),
    };
    setEditingTrace(updatedEditingTrace);

    // 更新当前编辑状态
    setChildTitle(newTitle);
    setChildDesc(newDesc);

    // 更新 activeSession 中的 traces 数据
    const traces = activeSession?.traces;
    if (traces) {
      const nodeId = parseInt(childId.split('-').pop() || '0');
      const updatedTraces = traces.map(trace => {
        if (trace.id === editingTrace.traceId) {
          const updatedNodes = trace.nodes.map(node =>
            node.id === nodeId
              ? { ...node, title: newTitle, description: newDesc }
              : node
          );
          return { ...trace, nodes: updatedNodes };
        }
        return trace;
      });

      handleUpdateTraces(updatedTraces);
    }
  };

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges(eds => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full relative bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onConnect={onConnect}
        fitView
        className="w-full h-full"
      >
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
      {/* 统一的编辑面板 */}
      <NodeEditPanel
        open={!!editingTrace}
        title={editingTrace?.summary || ''}
        childrenNodes={editingTrace?.nodes || []}
        onClose={() => setEditingTrace(null)}
        onSave={handleEditSave}
        selectedChildId={selectedChildId}
        onSelectChild={handleSelectChild}
        childTitle={childTitle}
        childDesc={childDesc}
        setChildTitle={setChildTitle}
        setChildDesc={setChildDesc}
      />
    </div>
  );
}
