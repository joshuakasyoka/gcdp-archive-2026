import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useArchive } from '../contexts/ArchiveContext';
import FilterBar from '../components/FilterBar';
import ProjectMapView from '../components/ProjectMapView';
import './ProjectsPage.css';

function matchesFilters(project, filters) {
  if (filters.cohort !== null && filters.cohort !== undefined) {
    if (project._student?.student_year !== filters.cohort) return false;
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    const searchable = [
      project.title,
      project._student?.name?.display_name,
      ...(project.artifacts?.map(a => a.title) || []),
    ].join(' ').toLowerCase();
    if (!searchable.includes(q)) return false;
  }

  const activeTags = filters.tags || {};
  for (const [cat, selected] of Object.entries(activeTags)) {
    if (!selected?.length) continue;
    const projectTagsForCat = project._flatTags?.[cat] || [];
    if (!selected.some(t => projectTagsForCat.includes(t))) return false;
  }

  return true;
}

export default function ProjectsPage() {
  const { projects, mapPins, loading, error } = useArchive();
  const [filters, setFilters] = useState({ cohort: null, query: '', tags: {} });
  const [view, setView] = useState('grid');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const projectsWithTags = useMemo(() =>
    projects
      .filter(p => p._student?.student_id !== 'student_14' && p.artifacts?.length > 0)
      .map(p => ({
        ...p,
        _flatTags: p.artifacts.reduce((acc, art) => {
          for (const [cat, vals] of Object.entries(art.tags || {})) {
            acc[cat] = [...new Set([...(acc[cat] || []), ...(vals || [])])];
          }
          return acc;
        }, {}),
      })),
    [projects]
  );

  const filtered = useMemo(
    () => projectsWithTags.filter(p => matchesFilters(p, filters)),
    [projectsWithTags, filters]
  );

  if (loading) return <div className="page-loading">Loading archive…</div>;
  if (error) return <div className="page-error">Failed to load: {error.message}</div>;

  return (
    <div className="projects-page">
      <FilterBar
        items={projectsWithTags}
        itemTagsKey="_flatTags"
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        viewModes={['grid', 'map']}
        onFilterPanelChange={setFilterPanelOpen}
      />

      {!filterPanelOpen && (
        <div className="projects-content">
          {view === 'grid' && (
            <div className="projects-grid">
              {filtered.map(project => {
                const coverImg = project.project_photos?.[0]?.url || project.artifacts?.[0]?.file_paths?.[0];
                const cohortLabel = project._student?.student_year
                  ? `${project._student.student_year} – ${(project._student.student_year + 1).toString().slice(-2)}`
                  : '';
                return (
                  <Link
                    key={project.project_id}
                    to={`/projects/${project.project_id}`}
                    className="project-card"
                  >
                    <div className="project-card__image">
                      {coverImg ? (
                        <img src={coverImg} alt={project.title} loading="lazy" />
                      ) : (
                        <div className="project-card__placeholder" />
                      )}
                    </div>
                    <div className="project-card__meta">
                      <div className="project-card__title">{project.title}</div>
                      <div className="project-card__subtitle">{cohortLabel}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {view === 'map' && (
            <ProjectMapView projects={filtered} mapPins={mapPins} />
          )}
        </div>
      )}
    </div>
  );
}
