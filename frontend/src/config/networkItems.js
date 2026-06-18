import {
  ClientIcon,
  ServerIcon,
  IpsIdsIcon,
  FirewallIcon,
  DatabaseIcon,
  SiemIcon,
  SoarIcon,
  AlertSystemIcon,
  HoneypotIcon,
  PortSwitchIcon,
  RouterIcon,
  LoadBalancerIcon,
  WafIcon,
} from '../components/icons';

export const NETWORK_ITEMS = [
  { type: 'client', label: 'Client', Icon: ClientIcon },
  { type: 'server', label: 'Server', Icon: ServerIcon },
  { type: 'ips-ids', label: 'IPS/IDS', Icon: IpsIdsIcon },
  { type: 'firewall', label: 'Firewall', Icon: FirewallIcon },
  { type: 'database', label: 'Database', Icon: DatabaseIcon },
  { type: 'siem', label: 'Siem', Icon: SiemIcon },
  { type: 'soar', label: 'Soar', Icon: SoarIcon },
  { type: 'alert-system', label: 'Alert System', Icon: AlertSystemIcon },
  { type: 'honeypot', label: 'Honey Pot', Icon: HoneypotIcon },
  { type: 'port-switch', label: 'Port switch', Icon: PortSwitchIcon },
  { type: 'router', label: 'Router', Icon: RouterIcon },
  { type: 'load-balancer', label: 'Load Balancer', Icon: LoadBalancerIcon },
  { type: 'waf', label: 'WAF', Icon: WafIcon },
];

export const NETWORK_ITEM_MAP = Object.fromEntries(
  NETWORK_ITEMS.map((item) => [item.type, item])
);
