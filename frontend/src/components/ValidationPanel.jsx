import './ValidationPanel.css';

const SEVERITY_LABEL = {
  critical: 'Nghiêm trọng',
  warning: 'Cảnh báo',
  info: 'Thông tin',
};

export default function ValidationPanel({ result, onClose }) {
  if (!result) return null;

  const { score, is_valid, summary, warnings = [] } = result;

  return (
    <div className="validation-panel">
      <div className="validation-panel-header">
        <div>
          <h3 className="validation-panel-title">Phân tích kiến trúc</h3>
          <p className="validation-panel-score">
            Điểm: <strong>{score}/100</strong>
            {is_valid ? ' · Hợp lệ' : ' · Cần cải thiện'}
          </p>
        </div>
        <button type="button" className="validation-panel-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
      </div>

      {summary && <p className="validation-panel-summary">{summary}</p>}

      {warnings.length > 0 && (
        <ul className="validation-panel-list">
          {warnings.map((w, i) => (
            <li key={`${w.component}-${i}`} className={`validation-item validation-item--${w.severity}`}>
              <span className="validation-item-badge">
                {SEVERITY_LABEL[w.severity] ?? w.severity}
              </span>
              <strong>{w.component}</strong>
              <p>{w.message}</p>
              {w.suggestion && <p className="validation-item-suggestion">→ {w.suggestion}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
