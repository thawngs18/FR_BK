import { Position } from 'reactflow';
import { getNodeBox } from './nodeMetrics';

/** Minimum perpendicular standoff from node border before first turn (draw.io spec). */
export const EDGE_STUB = 20;

const EPS = 0.5;

/** @typedef {import('../types/diagram.js').Point} Point */
/** @typedef {import('../types/diagram.js').PortSide} PortSide */
/** @typedef {import('../types/diagram.js').RouteAnchors} RouteAnchors */
/** @typedef {import('../types/diagram.js').RoutingContext} RoutingContext */

export function clonePoint(p) {
  return { x: p.x, y: p.y };
}

function samePoint(a, b) {
  return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
}

export function isHorizontal(a, b) {
  return Math.abs(a.y - b.y) < EPS;
}

export function isVertical(a, b) {
  return Math.abs(a.x - b.x) < EPS;
}

function positionToSide(position) {
  switch (position) {
    case Position.Top:
      return 'top';
    case Position.Bottom:
      return 'bottom';
    case Position.Left:
      return 'left';
    case Position.Right:
      return 'right';
    default:
      return 'right';
  }
}

/** Nearest logical perimeter port toward another point. */
export function getDynamicPort(box, toward) {
  const dx = toward.x - box.cx;
  const dy = toward.y - box.cy;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0
      ? { port: { x: box.right, y: box.cy }, side: /** @type {PortSide} */ ('right') }
      : { port: { x: box.left, y: box.cy }, side: /** @type {PortSide} */ ('left') };
  }

  return dy > 0
    ? { port: { x: box.cx, y: box.bottom }, side: /** @type {PortSide} */ ('bottom') }
    : { port: { x: box.cx, y: box.top }, side: /** @type {PortSide} */ ('top') };
}

/** Stub point extending outward from port, minimum EDGE_STUB px perpendicular. */
export function getStubFromPort(port, side, stub = EDGE_STUB) {
  switch (side) {
    case 'top':
      return { x: port.x, y: port.y - stub };
    case 'bottom':
      return { x: port.x, y: port.y + stub };
    case 'left':
      return { x: port.x - stub, y: port.y };
    case 'right':
      return { x: port.x + stub, y: port.y };
    default:
      return clonePoint(port);
  }
}

/** @param {import('reactflow').Node | undefined} sourceNode @param {import('reactflow').Node | undefined} targetNode */
export function computeAnchors(sourceNode, targetNode) {
  const sourceBox = getNodeBox(sourceNode ?? {});
  const targetBox = getNodeBox(targetNode ?? {});

  const targetPortGuess = getDynamicPort(sourceBox, { x: targetBox.cx, y: targetBox.cy });
  const sourcePort = getDynamicPort(sourceBox, targetPortGuess.port);
  const targetPort = getDynamicPort(targetBox, sourcePort.port);

  return {
    source: {
      port: clonePoint(sourcePort.port),
      side: sourcePort.side,
      stub: getStubFromPort(sourcePort.port, sourcePort.side),
    },
    target: {
      port: clonePoint(targetPort.port),
      side: targetPort.side,
      stub: getStubFromPort(targetPort.port, targetPort.side),
    },
  };
}

/** Fallback when RF handle positions are available but nodes missing. */
export function computeAnchorsFromHandles(
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  stub = EDGE_STUB
) {
  const sourceSide = positionToSide(sourcePosition);
  const targetSide = positionToSide(targetPosition);
  const sourcePort = { x: sourceX, y: sourceY };
  const targetPort = { x: targetX, y: targetY };

  return {
    source: {
      port: sourcePort,
      side: sourceSide,
      stub: getStubFromPort(sourcePort, sourceSide, stub),
    },
    target: {
      port: targetPort,
      side: targetSide,
      stub: getStubFromPort(targetPort, targetSide, stub),
    },
  };
}

function pickCorner(prev, curr, prevPrev) {
  if (prevPrev && isHorizontal(prevPrev, prev)) return { x: curr.x, y: prev.y };
  if (prevPrev && isVertical(prevPrev, prev)) return { x: prev.x, y: curr.y };
  if (Math.abs(curr.x - prev.x) >= Math.abs(curr.y - prev.y)) return { x: curr.x, y: prev.y };
  return { x: prev.x, y: curr.y };
}

/** Force strictly orthogonal polyline — zero diagonals. */
export function orthogonalizePath(points) {
  if (points.length < 2) return points.map(clonePoint);

  const result = [clonePoint(points[0])];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = clonePoint(points[i]);
    if (samePoint(prev, curr)) continue;

    if (isHorizontal(prev, curr) || isVertical(prev, curr)) {
      result.push(curr);
      continue;
    }

    const corner = pickCorner(prev, curr, result[result.length - 2]);
    if (!samePoint(prev, corner)) result.push(corner);
    if (!samePoint(corner, curr)) result.push(curr);
  }
  return result;
}

/** Remove redundant collinear waypoints (3 in a line → drop middle). */
export function cleanWaypoints(points) {
  if (points.length <= 2) return points.map(clonePoint);

  const result = [clonePoint(points[0])];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const colX =
      Math.abs(prev.x - curr.x) < EPS && Math.abs(curr.x - next.x) < EPS;
    const colY =
      Math.abs(prev.y - curr.y) < EPS && Math.abs(curr.y - next.y) < EPS;
    if (!colX && !colY) result.push(clonePoint(curr));
  }
  result.push(clonePoint(points[points.length - 1]));
  return result;
}

function buildPolyline(sourceStub, targetStub, waypoints) {
  const raw = [sourceStub, ...waypoints.map(clonePoint), targetStub];
  return cleanWaypoints(orthogonalizePath(raw));
}

export function extractWaypoints(visible) {
  if (visible.length <= 2) return [];
  return visible.slice(1, -1).map(clonePoint);
}

function pathLength(points) {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return len;
}

function segmentIntersectsBox(a, b, box, margin = 1) {
  const left = box.left - margin;
  const right = box.right + margin;
  const top = box.top - margin;
  const bottom = box.bottom + margin;

  if (isHorizontal(a, b)) {
    const y = a.y;
    if (y <= top || y >= bottom) return false;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    return maxX > left && minX < right;
  }

  if (isVertical(a, b)) {
    const x = a.x;
    if (x <= left || x >= right) return false;
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return maxY > top && minY < bottom;
  }

  return false;
}

function pathCrossesNodes(points, nodes, sourceId, targetId) {
  let hits = 0;
  const obstacles = nodes.filter((n) => n.id !== sourceId && n.id !== targetId);
  for (let i = 0; i < points.length - 1; i++) {
    for (const node of obstacles) {
      if (segmentIntersectsBox(points[i], points[i + 1], getNodeBox(node))) hits++;
    }
  }
  return hits;
}

function nudgeAroundBox(a, b, box) {
  if (isHorizontal(a, b)) {
    const above = Math.abs(a.y - box.top);
    const below = Math.abs(a.y - box.bottom);
    const dy = above < below ? box.top - a.y - EDGE_STUB : box.bottom - a.y + EDGE_STUB;
    return [
      { x: a.x, y: a.y + dy },
      { x: b.x, y: b.y + dy },
    ];
  }
  if (isVertical(a, b)) {
    const leftDist = Math.abs(a.x - box.left);
    const rightDist = Math.abs(a.x - box.right);
    const dx = leftDist < rightDist ? box.left - a.x - EDGE_STUB : box.right - a.x + EDGE_STUB;
    return [{ x: a.x + dx, y: a.y }, { x: b.x + dx, y: b.y }];
  }
  return null;
}

export function avoidNodeObstacles(points, nodes, sourceId, targetId) {
  if (points.length < 2 || !nodes?.length) return points.map(clonePoint);

  let route = points.map(clonePoint);
  const obstacles = nodes.filter((n) => n.id !== sourceId && n.id !== targetId);

  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      for (const node of obstacles) {
        const box = getNodeBox(node);
        if (!segmentIntersectsBox(a, b, box)) continue;
        const detour = nudgeAroundBox(a, b, box);
        if (!detour) continue;
        route.splice(i + 1, 0, detour[0], detour[1]);
        changed = true;
        break;
      }
      if (changed) break;
    }
    route = cleanWaypoints(orthogonalizePath(route));
    if (!changed) break;
  }

  return route;
}

/** Manhattan auto-route between stubs — shortest orthogonal path. */
export function manhattanAutoWaypoints(sourceStub, targetStub, context) {
  const cornerA = { x: targetStub.x, y: sourceStub.y };
  const cornerB = { x: sourceStub.x, y: targetStub.y };

  const pathA = cleanWaypoints(orthogonalizePath([sourceStub, cornerA, targetStub]));
  const pathB = cleanWaypoints(orthogonalizePath([sourceStub, cornerB, targetStub]));

  const nodes = context?.nodes ?? [];
  const sourceId = context?.sourceId;
  const targetId = context?.targetId;

  const score = (path) => ({
    len: pathLength(path),
    hits: pathCrossesNodes(path, nodes, sourceId, targetId),
  });

  const sA = score(pathA);
  const sB = score(pathB);
  const best =
    sA.hits < sB.hits
      ? pathA
      : sB.hits < sA.hits
        ? pathB
        : sA.len <= sB.len
          ? pathA
          : pathB;

  let routed = avoidNodeObstacles(best, nodes, sourceId, targetId);
  return extractWaypoints(routed);
}

export function resolveWaypoints(stored, auto, manualRoute) {
  if (manualRoute && stored != null) return stored.map(clonePoint);
  return auto.map(clonePoint);
}

export function buildRoute(anchors, waypoints, context) {
  const sourceStub = anchors.source.stub;
  const targetStub = anchors.target.stub;
  let visible = buildPolyline(sourceStub, targetStub, waypoints);
  visible = avoidNodeObstacles(visible, context?.nodes ?? [], context?.sourceId, context?.targetId);

  return {
    anchors,
    waypoints: waypoints.map(clonePoint),
    visible,
    sourceStub,
    targetStub,
  };
}

export function pointsToSvgPath(points) {
  if (!points.length) return '';
  return points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
}

export function getSegmentHandles(visible) {
  const segments = [];
  for (let i = 0; i < visible.length - 1; i++) {
    const a = visible[i];
    const b = visible[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 4) continue;

    const horizontal = isHorizontal(a, b);
    const vertical = isVertical(a, b);
    if (!horizontal && !vertical) continue;

    segments.push({
      index: i,
      horizontal,
      vertical,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    });
  }
  return segments;
}

/** Find segment closest to click for hit testing. */
export function hitTestSegment(point, visible, threshold = 12) {
  let best = null;
  let bestDist = threshold;

  for (let i = 0; i < visible.length - 1; i++) {
    const a = visible[i];
    const b = visible[i + 1];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const d = Math.hypot(point.x - mid.x, point.y - mid.y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  return best;
}

function finalizeWaypoints(anchors, waypoints, context) {
  const visible = buildRoute(anchors, waypoints, context).visible;
  return extractWaypoints(visible);
}

function splitHorizontalSegment(points, segIdx, newY) {
  const a = points[segIdx];
  const b = points[segIdx + 1];
  if (Math.abs(newY - a.y) < EPS) return points.map(clonePoint);

  return cleanWaypoints(
    orthogonalizePath([
      ...points.slice(0, segIdx + 1),
      { x: a.x, y: newY },
      { x: b.x, y: newY },
      ...points.slice(segIdx + 1),
    ])
  );
}

function splitVerticalSegment(points, segIdx, newX) {
  const a = points[segIdx];
  const b = points[segIdx + 1];
  if (Math.abs(newX - a.x) < EPS) return points.map(clonePoint);

  return cleanWaypoints(
    orthogonalizePath([
      ...points.slice(0, segIdx + 1),
      { x: newX, y: a.y },
      { x: newX, y: b.y },
      ...points.slice(segIdx + 1),
    ])
  );
}

/** Drag straight segment → split into 3 orthogonal segments (draw.io). */
export function dragSegment(waypoints, segIndex, dx, dy, anchors, context) {
  const sourceStub = anchors.source.stub;
  const targetStub = anchors.target.stub;
  const points = [sourceStub, ...waypoints.map(clonePoint), targetStub];
  const segCount = points.length - 1;
  if (segIndex < 0 || segIndex >= segCount) return waypoints;

  const a = points[segIndex];
  const b = points[segIndex + 1];
  const horizontal = isHorizontal(a, b);
  const vertical = isVertical(a, b);
  if (!horizontal && !vertical) return waypoints;

  let nextPoints;

  if (horizontal) {
    const newY = a.y + dy;
    if (points.length === 2) {
      return finalizeWaypoints(
        anchors,
        [
          { x: sourceStub.x, y: newY },
          { x: targetStub.x, y: newY },
        ],
        context
      );
    }
    nextPoints = splitHorizontalSegment(points, segIndex, newY);
  } else {
    const newX = a.x + dx;
    if (points.length === 2) {
      return finalizeWaypoints(
        anchors,
        [
          { x: newX, y: sourceStub.y },
          { x: newX, y: targetStub.y },
        ],
        context
      );
    }
    nextPoints = splitVerticalSegment(points, segIndex, newX);
  }

  return extractWaypoints(nextPoints);
}

/** Drag corner waypoint — slide adjacent segments, preserve 90°. */
export function dragWaypoint(waypoints, index, dx, dy, anchors, context) {
  if (index < 0 || index >= waypoints.length) return waypoints;

  const next = waypoints.map(clonePoint);
  const wp = next[index];
  const sourceStub = anchors.source.stub;
  const targetStub = anchors.target.stub;
  const visible = [sourceStub, ...next, targetStub];

  const prev = visible[index];
  const curr = visible[index + 1];
  const nextPt = visible[index + 2];

  if (prev && curr) {
    if (isHorizontal(prev, curr) && !isVertical(prev, curr)) {
      wp.y += dy;
      if (nextPt && isVertical(curr, nextPt)) wp.x += dx;
      else wp.x += dx;
    } else if (isVertical(prev, curr)) {
      wp.x += dx;
      if (nextPt && isHorizontal(curr, nextPt)) wp.y += dy;
      else wp.y += dy;
    } else {
      wp.x += dx;
      wp.y += dy;
    }
  } else {
    wp.x += dx;
    wp.y += dy;
  }

  return finalizeWaypoints(anchors, next, context);
}
