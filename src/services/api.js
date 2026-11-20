const API_ROOT = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
const BASE = API_ROOT ? `${API_ROOT}/api` : '/api';

export const API_HOST = API_ROOT ? API_ROOT.replace(/^https?:\/\//, '') : window.location.host;

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export async function fetchStudents() {
  const data = await get('/students');
  return data.students || data;
}

export async function fetchMapPins() {
  const data = await get('/map-pins');
  return data.map_pins || data;
}

export async function fetchGlossary() {
  try {
    const data = await get('/glossary');
    return data.terms || data;
  } catch {
    const res = await fetch('/glossary.json');
    if (!res.ok) return [];
    const data = await res.json();
    return data.terms || data;
  }
}

// ── CMS writes (used by /edit) ──────────────────────────────────────────
// The CMS key is typed in on /edit and kept only for this browser tab.

const CMS_KEY_STORAGE = 'gcdp_cms_key';

export function getCmsKey() {
  try {
    return sessionStorage.getItem(CMS_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setCmsKey(key) {
  try {
    if (key) sessionStorage.setItem(CMS_KEY_STORAGE, key);
    else sessionStorage.removeItem(CMS_KEY_STORAGE);
  } catch {
    // ignore storage errors
  }
}

export class UnauthorizedError extends Error {}

async function send(method, path, body) {
  const headers = { Authorization: `Bearer ${getCmsKey()}` };
  const init = { method, headers };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, init);
  if (res.status === 401) throw new UnauthorizedError('That CMS key was not accepted.');
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return res.json();
}

export function fetchStudent(studentId) {
  return get(`/students/${encodeURIComponent(studentId)}`);
}

// Uploads one image per request to stay under Vercel's request size limit.
// Returns the stored path, e.g. /api/media/<id>.
export async function uploadImage(file, studentId) {
  const form = new FormData();
  form.append('studentId', studentId || 'general');
  form.append('files', file);
  const data = await send('POST', `/upload?studentId=${encodeURIComponent(studentId || 'general')}`, form);
  return data.urls[0];
}

export function createStudent(fields) {
  return send('POST', '/students', fields);
}

export function updateStudent(studentId, fields) {
  return send('PUT', `/students/${encodeURIComponent(studentId)}`, fields);
}

export function deleteStudent(studentId) {
  return send('DELETE', `/students/${encodeURIComponent(studentId)}`);
}

export function deleteArtifact(studentId, projectId, artifactId) {
  return send(
    'DELETE',
    `/students/${encodeURIComponent(studentId)}/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactId)}`
  );
}

export function mediaUrl(fileId) {
  return `${BASE}/media/${fileId}`;
}

export function imageUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return API_ROOT ? `${API_ROOT}${filePath}` : filePath;
}
