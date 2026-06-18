import { useState } from 'react';
import { SaveIcon, ShareIcon } from './icons';
import './Toolbar.css';

export default function Toolbar({ onSave, onShare }) {
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSave = () => {
    onSave?.();
    showMessage('Đã lưu!');
  };

  const handleShare = async () => {
    const ok = await onShare?.();
    showMessage(ok ? 'Đã sao chép link!' : 'Chia sẻ thất bại');
  };

  return (
    <div className="toolbar">
      <button type="button" className="toolbar-btn" onClick={handleSave} title="Lưu">
        <SaveIcon />
        <span>Lưu</span>
      </button>
      <button type="button" className="toolbar-btn" onClick={handleShare} title="Chia sẻ">
        <ShareIcon />
        <span>Chia sẻ</span>
      </button>
      {message && <span className="toolbar-message">{message}</span>}
    </div>
  );
}
