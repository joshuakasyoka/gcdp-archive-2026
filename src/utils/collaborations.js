export function formatCollaboratorName(slug) {
  if (!slug) return '';
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getProjectCover(project) {
  return project?.project_photos?.[0]?.url
    || project?.artifacts?.[0]?.file_paths?.[0]
    || null;
}

function withCover(entry, project = entry.projects?.[0]) {
  return { ...entry, coverUrl: getProjectCover(project) };
}

function isExternal(href) {
  return /^(https?:|mailto:)/.test(href || '');
}

function projectPills(projects) {
  return projects
    .filter(p => p.title)
    .map(p => ({
      label: p.title,
      href: `/projects/${p.project_id}`,
      external: false,
    }));
}

function buildPartnerOrgEntries(projects, collaboratorLinks) {
  const orgMap = new Map();
  for (const project of projects) {
    for (const art of project.artifacts || []) {
      for (const collab of art.tags?.collaborators || []) {
        if (!collab) continue;
        if (!orgMap.has(collab)) orgMap.set(collab, { projects: [] });
        const entry = orgMap.get(collab);
        if (!entry.projects.some(p => p.project_id === project.project_id)) {
          entry.projects.push(project);
        }
      }
    }
  }
  return [...orgMap.entries()]
    .map(([slug, { projects: linked }]) => {
      const url = collaboratorLinks?.[slug] || null;
      return withCover({
        id: `org-${slug}`,
        title: formatCollaboratorName(slug),
        pills: projectPills(linked),
        projects: linked,
        href: url,
        external: isExternal(url),
      }, linked[0]);
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function buildPartnerEntries(projects, collaboratorLinks) {
  return projects
    .map(project => {
      const collaborators = new Map();
      for (const art of project.artifacts || []) {
        for (const c of art.tags?.collaborators || []) {
          if (c && !collaborators.has(c)) collaborators.set(c, formatCollaboratorName(c));
        }
      }
      const pills = [...collaborators.entries()].map(([slug, label]) => ({
        label,
        href: collaboratorLinks?.[slug] || null,
        external: true,
      }));
      return withCover({
        id: project.project_id,
        title: project.title,
        pills,
        projects: [project],
        href: `/projects/${project.project_id}`,
        external: false,
      }, project);
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function buildCollaborationEntries(groupBy, { projects, collaboratorLinks }) {
  if (groupBy === 'project') return buildPartnerOrgEntries(projects, collaboratorLinks);
  return buildPartnerEntries(projects, collaboratorLinks);
}

export function matchesCollaborationFilters(entry, filters) {
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const searchable = [
      entry.title,
      ...entry.pills.map(p => p.label),
      ...(entry.studentNames?.map(s => s.name) || []),
    ].join(' ').toLowerCase();
    if (!searchable.includes(q)) return false;
  }

  return true;
}
