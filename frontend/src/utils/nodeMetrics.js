/** Approximate DeviceNode footprint in flow coordinates (icon + padding + label). */
export const NODE_WIDTH = 80;
export const NODE_BODY = 48;
export const NODE_HEIGHT = 72;

export function getNodeBox(node) {
  const x = node.position?.x ?? 0;
  const y = node.position?.y ?? 0;
  const width = node.width ?? NODE_WIDTH;
  const height = node.height ?? NODE_HEIGHT;
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    width,
    height,
    cx: x + width / 2,
    cy: y + height / 2,
  };
}

export function getIconBox(node) {
  const x = node.position?.x ?? 0;
  const y = node.position?.y ?? 0;
  const offsetX = (NODE_WIDTH - NODE_BODY) / 2;
  return {
    left: x + offsetX,
    right: x + offsetX + NODE_BODY,
    top: y,
    bottom: y + NODE_BODY,
  };
}
