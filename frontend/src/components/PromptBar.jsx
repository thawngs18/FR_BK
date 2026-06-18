import { useState } from 'react';
import { ArrowRightIcon } from './icons';
import './PromptBar.css';

export default function PromptBar({ onSubmit, loading = false, statusMessage = '' }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    await onSubmit?.(trimmed);
    setPrompt('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
  };

  return (
    <div className="prompt-bar">
      {statusMessage && (
        <p className={`prompt-status${statusMessage.includes('Không') ? ' prompt-status--error' : ''}`}>
          {statusMessage}
        </p>
      )}
      <div className="prompt-input-wrapper">
        <input
          type="text"
          className="prompt-input"
          placeholder="Mô tả kiến trúc mạng cần thiết kế (tối thiểu 10 ký tự)..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          className="prompt-submit"
          onClick={handleSubmit}
          disabled={loading}
          aria-label="Gửi"
        >
          {loading ? <span className="prompt-spinner" /> : <ArrowRightIcon />}
        </button>
      </div>
    </div>
  );
}
