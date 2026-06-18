const TYPE_MAP = {
  router: 'router',
  switch: 'port-switch',
  firewall: 'firewall',
  server: 'server',
  workstation: 'client',
  client: 'client',
  cloud: 'server',
  dmz: 'firewall',
  database: 'database',
  loadbalancer: 'load-balancer',
  'load-balancer': 'load-balancer',
  waf: 'waf',
  ids: 'ips-ids',
  ips: 'ips-ids',
  siem: 'siem',
  soar: 'soar',
  honeypot: 'honeypot',
};

export function mapNodeType(type) {
  if (!type) return 'server';
  const key = type.toLowerCase().replace(/\s+/g, '-');
  return TYPE_MAP[key] ?? key;
}

export function toArchitecturePayload(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.data?.label ?? node.type,
      type: node.type,
      ip: node.data?.ip ?? null,
      zone: node.data?.zone ?? null,
      description: node.data?.description ?? null,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      protocol: edge.data?.protocol ?? null,
      port: edge.data?.port ?? null,
    })),
  };
}

export function architectureToFlow(architecture, edgeStyle) {
  const rawNodes = architecture?.nodes ?? [];
  const rawEdges = architecture?.edges ?? [];

  const nodes = rawNodes.map((node, index) => {
    const type = mapNodeType(node.type);
    return {
      id: node.id ?? `node_${index + 1}`,
      type,
      position: {
        x: (index % 4) * 220 + 80,
        y: Math.floor(index / 4) * 160 + 80,
      },
      data: {
        type,
        label: node.label ?? type,
        ip: node.ip,
        zone: node.zone,
        description: node.description,
      },
    };
  });

  const edges = rawEdges.map((edge, index) => ({
    id: edge.id ?? `edge_${index + 1}`,
    source: edge.source,
    target: edge.target,
    type: 'network',
    style: edgeStyle,
    data: {
      offset: 20,
      protocol: edge.protocol,
      port: edge.port,
      encrypted: edge.encrypted,
    },
  }));

  return { nodes, edges };
}
