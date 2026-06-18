import { useCallback, useRef } from 'react';
import { BaseEdge, getSmoothStepPath, useReactFlow } from 'reactflow';
import './NetworkEdge.css';

export default function NetworkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  style,
}) {
  const { setEdges } = useReactFlow();
  const dragRef = useRef(null);
  const offset = data?.offset ?? 20;

  const [edgePath, midX, midY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
    offset,
  });

  const onMidPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startOffset: offset };

      const onMove = (ev) => {
        const dy = ev.clientY - dragRef.current.startY;
        const next = Math.max(0, Math.min(120, dragRef.current.startOffset + dy));
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...edge.data, offset: next } }
              : edge
          )
        );
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [id, offset, setEdges]
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={24}
      />
      {selected && (
        <g className="network-edge-controls">
          <circle
            cx={midX}
            cy={midY}
            r={7}
            className="network-edge-midpoint"
            onPointerDown={onMidPointerDown}
          />
        </g>
      )}
    </>
  );
}
