import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { NETWORK_ITEM_MAP } from '../../config/networkItems';
import { useNodeActions } from '../../context/NodeActionsContext';
import { ServerIcon, DeleteIcon, CopyIcon } from '../icons';
import { NODE_HEIGHT, NODE_WIDTH } from '../../utils/nodeMetrics';
import './DeviceNode.css';

const HANDLE_SIDES = [
  { position: Position.Top, id: 'top', className: 'device-handle--top' },
  { position: Position.Right, id: 'right', className: 'device-handle--right' },
  { position: Position.Bottom, id: 'bottom', className: 'device-handle--bottom' },
  { position: Position.Left, id: 'left', className: 'device-handle--left' },
];

function DeviceNode({ id, data, type: nodeType, selected, width, height }) {
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

  const isHighlighted = selected || menuOpen;

  return (
    <div
      className={`device-node${isHighlighted ? ' device-node--active' : ''}`}
      style={{ width: width ?? NODE_WIDTH, minHeight: height ?? NODE_HEIGHT }}
    >
      <div
        className="device-node-body device-node-drag"
        onContextMenu={handleContextMenu}
      >
        {HANDLE_SIDES.map(({ position, id: handleId, className }) => (
          <Handle
            key={handleId}
            type="source"
            position={position}
            id={handleId}
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
      <span className="device-node-label device-node-drag">{label}</span>
    </div>
  );
}

export default memo(DeviceNode);
