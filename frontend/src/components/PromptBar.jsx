import { useState } from 'react';
import { ArrowRightIcon } from './icons';
import './PromptBar.css';

export default function PromptBar({ onSubmit }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setPrompt('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="prompt-bar">
      <div className="prompt-input-wrapper">
        <input
          type="text"
          className="prompt-input"
          placeholder=""
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="prompt-submit" onClick={handleSubmit} aria-label="Gửi">
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}
