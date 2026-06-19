/** @deprecated Import from orthogonalRouter.js — kept for backward compatibility. */
export {
  EDGE_STUB,
  buildRoute as buildVisibleRoute,
  cleanWaypoints as removeCollinear,
  computeAnchorsFromHandles,
  dragSegment,
  dragWaypoint as dragCorner,
  extractWaypoints as extractWaypointsFromRoute,
  getSegmentHandles,
  manhattanAutoWaypoints as computeInitialWaypoints,
  orthogonalizePath,
  pointsToSvgPath as pointsToPath,
  resolveWaypoints,
} from './orthogonalRouter';
