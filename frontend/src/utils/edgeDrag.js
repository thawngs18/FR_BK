/**
 * Draw.io-style edge drag session helpers.
 * Attach listeners on window to avoid React re-render stealing events.
 */

/**
 * @typedef {'segment' | 'waypoint'} DragKind
 */

/**
 * @typedef {Object} EdgeDragSession
 * @property {DragKind} kind
 * @property {number} index
 * @property {{ x: number, y: number }} startFlow
 * @property {import('../types/diagram.js').Point[]} baselineWaypoints
 * @property {import('../types/diagram.js').RouteAnchors} anchors
 */

/**
 * @param {Object} params
 * @param {DragKind} params.kind
 * @param {number} params.index
 * @param {MouseEvent} params.event
 * @param {import('../types/diagram.js').Point[]} params.baselineWaypoints
 * @param {import('../types/diagram.js').RouteAnchors} params.anchors
 * @param {(clientX: number, clientY: number) => { x: number, y: number }} params.screenToFlow
 */
export function createEdgeDragSession({
  kind,
  index,
  event,
  baselineWaypoints,
  anchors,
  screenToFlow,
}) {
  event.stopPropagation();
  event.preventDefault();

  /** @type {EdgeDragSession} */
  const session = {
    kind,
    index,
    startFlow: screenToFlow(event.clientX, event.clientY),
    baselineWaypoints: baselineWaypoints.map((w) => ({ x: w.x, y: w.y })),
    anchors,
  };

  return session;
}

/**
 * @param {EdgeDragSession} session
 * @param {MouseEvent} moveEvent
 * @param {(clientX: number, clientY: number) => { x: number, y: number }} screenToFlow
 */
export function getDragDelta(session, moveEvent, screenToFlow) {
  const current = screenToFlow(moveEvent.clientX, moveEvent.clientY);
  return {
    dx: current.x - session.startFlow.x,
    dy: current.y - session.startFlow.y,
  };
}

/**
 * @param {EdgeDragSession} session
 * @param {(moveEvent: MouseEvent) => void} onMove
 * @param {() => void} onEnd
 */
export function attachWindowDragListeners(session, onMove, onEnd) {
  const onMouseMove = (moveEvent) => {
    if (!session) return;
    onMove(moveEvent);
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    onEnd();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}
