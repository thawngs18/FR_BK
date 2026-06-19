import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  reconnectEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

import Sidebar from './components/Sidebar';
import PromptBar from './components/PromptBar';
import Toolbar from './components/Toolbar';
import ValidationPanel from './components/ValidationPanel';
import DeviceNode from './components/nodes/DeviceNode';
import NetworkEdge from './components/edges/NetworkEdge';
import { NETWORK_ITEMS, NETWORK_ITEM_MAP } from './config/networkItems';
import { NodeActionsContext } from './context/NodeActionsContext';
import { generateArchitecture, validateArchitecture } from './api/client';
import { architectureToFlow, toArchitecturePayload } from './utils/diagramTransform';
import { EDGE_STUB } from './utils/orthogonalRouter';
import { NODE_HEIGHT, NODE_WIDTH } from './utils/nodeMetrics';

const STORAGE_KEY = 'network-diagram';

const EDGE_STYLE = { stroke: '#1a1a1a', strokeWidth: 1.5 };

const defaultEdgeOptions = {
  type: 'network',
  style: EDGE_STYLE,
  data: { offset: EDGE_STUB },
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

let initialDiagramCache = null;

function getInitialDiagram() {
  if (initialDiagramCache) return initialDiagramCache;

  const shared = loadFromShareParam();
  const saved = shared ?? loadDiagram();
  if (!saved) {
    initialDiagramCache = { nodes: [], edges: [] };
    return initialDiagramCache;
  }

  syncNodeIdCounter(saved.nodes);
  initialDiagramCache = {
    nodes: saved.nodes,
    edges: saved.edges.map((edge) => ({
      ...edge,
      type: 'network',
      style: EDGE_STYLE,
      data: {
        offset: edge.data?.offset ?? EDGE_STUB,
        waypoints: edge.data?.waypoints,
        manualRoute: edge.data?.manualRoute ?? false,
        protocol: edge.data?.protocol,
        port: edge.data?.port,
      },
    })),
  };
  return initialDiagramCache;
}

export default function App() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes] = useState(() => getInitialDiagram().nodes);
  const [edges, setEdges] = useState(() => getInitialDiagram().edges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [validationResult, setValidationResult] = useState(null);

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
            data: { offset: EDGE_STUB, waypoints: undefined, manualRoute: false },
          },
          eds
        )
      ),
    []
  );

  const onReconnect = useCallback(
    (oldEdge, newConnection) =>
      setEdges((eds) => {
        const updated = reconnectEdge(oldEdge, newConnection, eds);
        return updated.map((edge) =>
          edge.id === oldEdge.id
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  waypoints: undefined,
                  manualRoute: false,
                  offset: edge.data?.offset ?? EDGE_STUB,
                },
              }
            : edge
        );
      }),
    []
  );

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
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
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
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

  const handleSave = useCallback(async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));

    if (nodes.length === 0) {
      return { saved: true, message: 'Đã lưu (sơ đồ trống)' };
    }

    setSaveLoading(true);
    try {
      const architecture = toArchitecturePayload(nodes, edges);
      const result = await validateArchitecture(architecture);
      setValidationResult(result);
      return {
        saved: true,
        message: `Đã lưu · Điểm: ${result.score}/100`,
      };
    } catch (err) {
      return {
        saved: true,
        message: `Đã lưu local · AI: ${err.message}`,
      };
    } finally {
      setSaveLoading(false);
    }
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

  const handlePromptSubmit = useCallback(
    async (prompt) => {
      setPromptLoading(true);
      setStatusMessage('');
      setValidationResult(null);

      try {
        const { architecture, summary } = await generateArchitecture(prompt);
        const { nodes: flowNodes, edges: flowEdges } = architectureToFlow(
          architecture,
          EDGE_STYLE
        );

        syncNodeIdCounter(flowNodes);
        setNodes(flowNodes);
        setEdges(flowEdges);
        setStatusMessage(summary);

        requestAnimationFrame(() => {
          reactFlowInstance?.fitView({ padding: 0.2 });
        });
      } catch (err) {
        setStatusMessage(err.message || 'Không thể tạo kiến trúc. Kiểm tra backend đang chạy.');
      } finally {
        setPromptLoading(false);
      }
    },
    [reactFlowInstance]
  );

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
            connectionMode={ConnectionMode.Loose}
            connectionRadius={32}
            nodeDragHandle=".device-node-drag"
            edgesReconnectable={false}
            edgesFocusable
            deleteKeyCode={null}
            elevateEdgesOnSelect
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onEdgeContextMenu={onEdgeContextMenu}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <Background variant="dots" gap={20} size={1} color="#d4d4d4" />
            <Controls position="bottom-left" showInteractive />
          </ReactFlow>
        </NodeActionsContext.Provider>
        <ValidationPanel
          result={validationResult}
          onClose={() => setValidationResult(null)}
        />
        <Toolbar onSave={handleSave} onShare={handleShare} saveLoading={saveLoading} />
        <PromptBar
          onSubmit={handlePromptSubmit}
          loading={promptLoading}
          statusMessage={statusMessage}
        />
      </div>
    </div>
  );
}
