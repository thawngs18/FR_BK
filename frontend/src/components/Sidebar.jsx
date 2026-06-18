import { NETWORK_ITEMS } from '../config/networkItems';
import './Sidebar.css';

function onDragStart(event, nodeType) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-list">
        {NETWORK_ITEMS.map(({ type, label, Icon }) => (
          <div
            key={type}
            className="sidebar-item"
            draggable
            onDragStart={(e) => onDragStart(e, type)}
          >
            <div className="sidebar-item-icon">
              <Icon />
            </div>
            <span className="sidebar-item-label">{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
