/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * @typedef {'top' | 'right' | 'bottom' | 'left'} PortSide
 */

/**
 * @typedef {Object} DiagramNode
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} DiagramEdge
 * @property {string} id
 * @property {string} sourceNodeId
 * @property {string} targetNodeId
 * @property {Point[]} waypoints
 * @property {boolean} [manualRoute]
 */

/**
 * @typedef {Object} PortAnchor
 * @property {Point} port
 * @property {PortSide} side
 * @property {Point} stub
 */

/**
 * @typedef {Object} RouteAnchors
 * @property {PortAnchor} source
 * @property {PortAnchor} target
 */

/**
 * @typedef {Object} RoutingContext
 * @property {import('reactflow').Node[]} nodes
 * @property {string} sourceId
 * @property {string} targetId
 */

export {};
