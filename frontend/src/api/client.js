const API_URL = import.meta.env.VITE_API_URL ?? '';

async function parseError(res) {
  try {
    const data = await res.json();
    const detail = data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg ?? JSON.stringify(d)).join('; ');
    }
    return JSON.stringify(data);
  } catch {
    return res.statusText || 'Yêu cầu thất bại';
  }
}

async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export function generateArchitecture(prompt) {
  return apiPost('/architecture/generate', { prompt });
}

export function validateArchitecture(architecture) {
  return apiPost('/architecture/validate', { architecture });
}

export async function checkBackendHealth() {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error('Backend không phản hồi');
  return res.json();
}
