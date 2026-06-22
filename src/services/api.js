const BASE = '/api';

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

export function mediaUrl(fileId) {
  return `/api/media/${fileId}`;
}

export function imageUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return filePath;
}
