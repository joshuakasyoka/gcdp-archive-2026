const fs = require('fs');
const path = require('path');

const SITE_URL = (process.env.SITE_URL || process.env.REACT_APP_SITE_URL || 'https://gcdp-archive-2026.vercel.app').replace(/\/$/, '');
const API_BASE = (process.env.SITEMAP_API_URL || 'https://gcdp2025.vercel.app/api').replace(/\/$/, '');

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/projects', priority: '0.9', changefreq: 'weekly' },
  { path: '/collaborations', priority: '0.8', changefreq: 'weekly' },
  { path: '/glossary', priority: '0.7', changefreq: 'monthly' },
];

function normalizeTitle(title) {
  return (title || '').trim().toLowerCase();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, { priority, changefreq }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

async function fetchStudents() {
  const res = await fetch(`${API_BASE}/students`);
  if (!res.ok) {
    throw new Error(`Failed to fetch students: ${res.status}`);
  }
  const data = await res.json();
  return data.students || data;
}

async function main() {
  const urls = STATIC_ROUTES.map(route =>
    urlEntry(`${SITE_URL}${route.path}`, route)
  );

  try {
    const students = await fetchStudents();
    const seenProjects = new Set();
    const seenStudents = new Set();

    for (const student of students) {
      if (student.student_id && !seenStudents.has(student.student_id)) {
        seenStudents.add(student.student_id);
        urls.push(
          urlEntry(`${SITE_URL}/students/${student.student_id}`, {
            priority: '0.6',
            changefreq: 'monthly',
          })
        );
      }

      for (const project of student.projects || []) {
        const key = normalizeTitle(project.title);
        if (!project.project_id || !key || key === 'untitled project' || seenProjects.has(key)) {
          continue;
        }
        seenProjects.add(key);
        urls.push(
          urlEntry(`${SITE_URL}/projects/${project.project_id}`, {
            priority: '0.7',
            changefreq: 'monthly',
          })
        );
      }
    }
  } catch (error) {
    console.warn(`Sitemap: could not fetch archive data (${error.message}). Static routes only.`);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`Wrote ${urls.length} URLs to ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
