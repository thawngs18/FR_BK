import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { NETWORK_ITEM_MAP } from '../../config/networkItems';
import { useNodeActions } from '../../context/NodeActionsContext';
import { ServerIcon, DeleteIcon, CopyIcon } from '../icons';
import './DeviceNode.css';

const HANDLE_SIDES = [
  { position: Position.Top, className: 'device-handle--top' },
  { position: Position.Right, className: 'device-handle--right' },
  { position: Position.Bottom, className: 'device-handle--bottom' },
  { position: Position.Left, className: 'device-handle--left' },
];

function DeviceNode({ id, data, type: nodeType }) {
  const type = data.type ?? nodeType ?? 'server';
  const item = NETWORK_ITEM_MAP[type];
  const Icon = item?.Icon ?? ServerIcon;
  const label = data.label ?? item?.label ?? type;
  const { onDeleteNode, onCopyNode } = useNodeActions() ?? {};
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDeleteNode?.(id);
    setMenuOpen(false);
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    onCopyNode?.(id);
    setMenuOpen(false);
  };

  return (
    <div className={`device-node${menuOpen ? ' device-node--active' : ''}`}>
      <div className="device-node-body" onContextMenu={handleContextMenu}>
        {HANDLE_SIDES.map(({ position, className }) => (
          <Handle
            key={`src-${position}`}
            type="source"
            position={position}
            id={`src-${position}`}
            className={`device-handle ${className}`}
          />
        ))}
        {HANDLE_SIDES.map(({ position, className }) => (
          <Handle
            key={`tgt-${position}`}
            type="target"
            position={position}
            id={`tgt-${position}`}
            className={`device-handle ${className}`}
          />
        ))}
        <Icon />
        {menuOpen && (
          <div className="device-node-menu" ref={menuRef}>
            <button type="button" className="device-node-menu-btn" onClick={handleCopy} title="Sao chép">
              <CopyIcon />
              <span>Sao chép</span>
            </button>
            <button type="button" className="device-node-menu-btn device-node-menu-btn--danger" onClick={handleDelete} title="Xóa">
              <DeleteIcon />
              <span>Xóa</span>
            </button>
          </div>
        )}
      </div>
      <span className="device-node-label">{label}</span>
    </div>
  );
}

export default memo(DeviceNode);
