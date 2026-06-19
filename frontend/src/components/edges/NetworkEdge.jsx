import { useCallback, useMemo, useRef } from 'react';
import { BaseEdge, useReactFlow, useStore } from 'reactflow';
import {
  attachWindowDragListeners,
  createEdgeDragSession,
  getDragDelta,
} from '../../utils/edgeDrag';
import {
  buildRoute,
  computeAnchors,
  dragSegment,
  dragWaypoint,
  getSegmentHandles,
  hitTestSegment,
  manhattanAutoWaypoints,
  pointsToSvgPath,
  resolveWaypoints,
} from '../../utils/orthogonalRouter';
import './NetworkEdge.css';

const HIT_STROKE = 15;

export default function NetworkEdge({
  id,
  source,
  target,
  data,
  selected,
  markerEnd,
  style,
}) {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const nodes = useStore((state) => state.getNodes());
  const dragSessionRef = useRef(null);

  const sourceNode = useMemo(() => nodes.find((n) => n.id === source), [nodes, source]);
  const targetNode = useMemo(() => nodes.find((n) => n.id === target), [nodes, target]);

  const routingContext = useMemo(
    () => ({ nodes, sourceId: source, targetId: target }),
    [nodes, source, target]
  );

  const anchors = useMemo(
    () => computeAnchors(sourceNode, targetNode),
    [sourceNode, targetNode]
  );

  const autoWaypoints = useMemo(
    () => manhattanAutoWaypoints(anchors.source.stub, anchors.target.stub, routingContext),
    [anchors, routingContext]
  );

  const manualRoute = Boolean(data?.manualRoute);

  const waypoints = useMemo(
    () => resolveWaypoints(data?.waypoints, autoWaypoints, manualRoute),
    [data?.waypoints, autoWaypoints, manualRoute]
  );

  const route = useMemo(
    () => buildRoute(anchors, waypoints, routingContext),
    [anchors, waypoints, routingContext]
  );

  const edgePath = useMemo(() => pointsToSvgPath(route.visible), [route.visible]);
  const segments = useMemo(() => getSegmentHandles(route.visible), [route.visible]);

  const screenToFlow = useCallback(
    (clientX, clientY) => screenToFlowPosition({ x: clientX, y: clientY }),
    [screenToFlowPosition]
  );

  const persistWaypoints = useCallback(
    (nextWaypoints) => {
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  waypoints: nextWaypoints,
                  manualRoute: true,
                },
              }
            : edge
        )
      );
    },
    [id, setEdges]
  );

  const runDrag = useCallback(
    (session, dx, dy) => {
      const next =
        session.kind === 'segment'
          ? dragSegment(
              session.baselineWaypoints,
              session.index,
              dx,
              dy,
              session.anchors,
              routingContext
            )
          : dragWaypoint(
              session.baselineWaypoints,
              session.index,
              dx,
              dy,
              session.anchors,
              routingContext
            );

      persistWaypoints(next);
    },
    [persistWaypoints, routingContext]
  );

  const startDrag = useCallback(
    (kind, index, event) => {
      const session = createEdgeDragSession({
        kind,
        index,
        event,
        baselineWaypoints: waypoints,
        anchors,
        screenToFlow,
      });
      dragSessionRef.current = session;

      attachWindowDragListeners(
        session,
        (moveEvent) => {
          const { dx, dy } = getDragDelta(session, moveEvent, screenToFlow);
          runDrag(session, dx, dy);
        },
        () => {
          dragSessionRef.current = null;
        }
      );
    },
    [anchors, runDrag, screenToFlow, waypoints]
  );

  const onSegmentMouseDown = useCallback(
    (segIndex) => (event) => startDrag('segment', segIndex, event),
    [startDrag]
  );

  const onWaypointMouseDown = useCallback(
    (wpIndex) => (event) => startDrag('waypoint', wpIndex, event),
    [startDrag]
  );

  const onHitPathMouseDown = useCallback(
    (event) => {
      const flowPoint = screenToFlow(event.clientX, event.clientY);
      const segIndex = hitTestSegment(flowPoint, route.visible, HIT_STROKE);
      if (segIndex == null) return;
      startDrag('segment', segIndex, event);
    },
    [route.visible, screenToFlow, startDrag]
  );

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_STROKE}
        className="network-edge-hit"
        onMouseDown={onHitPathMouseDown}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={HIT_STROKE}
      />
      {selected && (
        <g className="network-edge-controls">
          {segments.map((seg) => (
            <circle
              key={`seg-${seg.index}`}
              cx={seg.mid.x}
              cy={seg.mid.y}
              r={5}
              className={`network-edge-segment${
                seg.horizontal
                  ? ' network-edge-segment--horizontal'
                  : ' network-edge-segment--vertical'
              }`}
              onMouseDown={onSegmentMouseDown(seg.index)}
            />
          ))}
          {waypoints.map((waypoint, index) => (
            <rect
              key={`wp-${index}`}
              x={waypoint.x - 5}
              y={waypoint.y - 5}
              width={10}
              height={10}
              rx={1}
              className="network-edge-waypoint"
              onMouseDown={onWaypointMouseDown(index)}
            />
          ))}
        </g>
      )}
    </>
  );
}
