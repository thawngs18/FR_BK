import { useState } from 'react';
import { SaveIcon, ShareIcon } from './icons';
import './Toolbar.css';

export default function Toolbar({ onSave, onShare, saveLoading = false }) {
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSave = async () => {
    if (saveLoading) return;
    const result = await onSave?.();
    showMessage(result?.message ?? 'Đã lưu!');
  };

  const handleShare = async () => {
    const ok = await onShare?.();
    showMessage(ok ? 'Đã sao chép link!' : 'Chia sẻ thất bại');
  };

  return (
    <div className="toolbar">
      <button
        type="button"
        className="toolbar-btn"
        onClick={handleSave}
        disabled={saveLoading}
        title="Lưu"
      >
        <SaveIcon />
        <span>{saveLoading ? 'Đang phân tích...' : 'Lưu'}</span>
      </button>
      <button type="button" className="toolbar-btn" onClick={handleShare} title="Chia sẻ">
        <ShareIcon />
        <span>Chia sẻ</span>
      </button>
      {message && <span className="toolbar-message">{message}</span>}
    </div>
  );
}
