import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  reconnectEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

import Sidebar from './components/Sidebar';
import PromptBar from './components/PromptBar';
import Toolbar from './components/Toolbar';
import DeviceNode from './components/nodes/DeviceNode';
import NetworkEdge from './components/edges/NetworkEdge';
import { NETWORK_ITEMS, NETWORK_ITEM_MAP } from './config/networkItems';
import { NodeActionsContext } from './context/NodeActionsContext';

const STORAGE_KEY = 'network-diagram';

const EDGE_STYLE = { stroke: '#1a1a1a', strokeWidth: 1.5 };

const defaultEdgeOptions = {
  type: 'network',
  style: EDGE_STYLE,
  data: { offset: 20 },
};

const nodeTypes = Object.fromEntries(
  NETWORK_ITEMS.map((item) => [item.type, DeviceNode])
);

const edgeTypes = {
  network: NetworkEdge,
};

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

function syncNodeIdCounter(nodes) {
  nodes.forEach((node) => {
    const match = node.id?.match(/^node_(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      if (num > nodeId) nodeId = num;
    }
  });
}

function loadDiagram() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.nodes && parsed?.edges) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function loadFromShareParam() {
  const hash = window.location.hash.slice(1);
  if (!hash.startsWith('share=')) return null;
  try {
    const json = decodeURIComponent(atob(hash.slice(6)));
    const parsed = JSON.parse(json);
    if (parsed?.nodes && parsed?.edges) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export default function App() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    const shared = loadFromShareParam();
    const saved = shared ?? loadDiagram();
    if (saved) {
      syncNodeIdCounter(saved.nodes);
      setNodes(saved.nodes);
      setEdges(
        saved.edges.map((edge) => ({
          ...edge,
          type: 'network',
          style: EDGE_STYLE,
          data: { offset: edge.data?.offset ?? 20 },
        }))
      );
    }
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'network',
            style: EDGE_STYLE,
            data: { offset: 20 },
          },
          eds
        )
      ),
    []
  );

  const onReconnect = useCallback(
    (oldEdge, newConnection) =>
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds)),
    []
  );

  const onEdgeDoubleClick = useCallback((_, edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setNodes((nds) =>
        nds.concat({
          id: getId(),
          type,
          position,
          data: { type, label: NETWORK_ITEM_MAP[type]?.label ?? type },
        })
      );
    },
    [reactFlowInstance]
  );

  const onDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  const onCopyNode = useCallback((nodeId) => {
    setNodes((nds) => {
      const node = nds.find((n) => n.id === nodeId);
      if (!node) return nds;
      return [
        ...nds,
        {
          ...node,
          id: getId(),
          position: { x: node.position.x + 50, y: node.position.y + 50 },
          selected: false,
          data: { ...node.data },
        },
      ];
    });
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  const handleShare = useCallback(async () => {
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify({ nodes, edges })));
      const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }, [nodes, edges]);

  const handlePromptSubmit = useCallback((prompt) => {
    console.log('Prompt submitted:', prompt);
  }, []);

  const nodeActions = { onDeleteNode, onCopyNode };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="canvas-area" ref={reactFlowWrapper}>
        <NodeActionsContext.Provider value={nodeActions}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={EDGE_STYLE}
            connectionRadius={24}
            edgesReconnectable
            edgesFocusable
            deleteKeyCode={['Delete', 'Backspace']}
            elevateEdgesOnSelect
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <Background variant="dots" gap={20} size={1} color="#d4d4d4" />
            <Controls position="bottom-left" showInteractive />
          </ReactFlow>
        </NodeActionsContext.Provider>
        <Toolbar onSave={handleSave} onShare={handleShare} />
        <PromptBar onSubmit={handlePromptSubmit} />
      </div>
    </div>
  );
}
