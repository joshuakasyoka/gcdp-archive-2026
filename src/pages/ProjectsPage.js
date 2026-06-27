import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useArchive } from '../contexts/ArchiveContext';
import Seo from '../components/Seo';
import FilterBar from '../components/FilterBar';
import ProgressiveImage from '../components/ProgressiveImage';
import ViewLoadingFallback from '../components/ViewLoadingFallback';
import './ProjectsPage.css';

const ProjectMapView = lazy(() => import('../components/ProjectMapView'));
const ProjectForceGraph = lazy(() => import('../components/ProjectForceGraph'));

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
  const { projects, mapPins, loading, error, cohort, setCohort } = useArchive();
  const [localFilters, setLocalFilters] = useState({ query: '', tags: {} });
  const filters = { ...localFilters, cohort };
  const setFilters = (next) => {
    if (next.cohort !== cohort) setCohort(next.cohort ?? null);
    setLocalFilters({ query: next.query, tags: next.tags });
  };
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
      <Seo
        title="Projects"
        path="/projects"
        description="Browse student projects from the MA Global Collaborative Design Practice archive across London and Kyoto cohorts."
      />
      <FilterBar
        items={projectsWithTags}
        itemTagsKey="_flatTags"
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        viewModes={['grid', 'map', 'graph']}
        onFilterPanelChange={setFilterPanelOpen}
      />

      {!filterPanelOpen && (
        <div className="projects-content">
          {view === 'grid' && (
            <div className="projects-grid">
              {filtered.map(project => {
                const coverImg = project.project_photos?.[0]?.url || project.artifacts?.[0]?.file_paths?.[0];
                const cohortLabel = project._student?.student_year
                  ? `${project._student.student_year} – ${project._student.student_year + 2}`
                  : '';
                return (
                  <Link
                    key={project.project_id}
                    to={`/projects/${project.project_id}`}
                    className="project-card"
                  >
                    <div className="project-card__image">
                      {coverImg ? (
                        <ProgressiveImage src={coverImg} alt={project.title} />
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
            <Suspense fallback={<ViewLoadingFallback label="Loading map…" />}>
              <ProjectMapView projects={filtered} mapPins={mapPins} />
            </Suspense>
          )}
          {view === 'graph' && (
            <Suspense fallback={<ViewLoadingFallback label="Loading graph…" />}>
              <ProjectForceGraph projects={filtered} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
