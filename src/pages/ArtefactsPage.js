import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useArchive } from '../contexts/ArchiveContext';
import Seo from '../components/Seo';
import FilterBar from '../components/FilterBar';
import ArtefactGrid from '../components/ArtefactGrid';
import ArtefactModal from '../components/ArtefactModal';
import ViewLoadingFallback from '../components/ViewLoadingFallback';
import ArchiveIntroModal, {
  dismissArchiveIntro,
  isArchiveIntroDismissed,
} from '../components/ArchiveIntroModal';
import { SITE_URL } from '../config/seo';
import './ArtefactsPage.css';

const ArtefactMapView = lazy(() => import('../components/ArtefactMapView'));
const ArtefactForceGraph = lazy(() => import('../components/ArtefactForceGraph'));

const LANDING_DESCRIPTION =
  'Browse projects, artefacts, methods, and collaborations from the MA Global Collaborative Design Practice — a joint postgraduate programme between UAL and Kyoto Institute of Technology.';

function matchesFilters(artefact, filters) {
  if (filters.cohort !== null && filters.cohort !== undefined) {
    if (artefact._student?.student_year !== filters.cohort) return false;
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    const searchable = [
      artefact.title,
      artefact.description,
      artefact._project?.title,
      artefact._student?.name?.display_name,
      ...(artefact.tags?.themes || []),
      ...(artefact.tags?.design_as || []),
      ...(artefact.tags?.materials || []),
      ...(artefact.tags?.methods || []),
    ].join(' ').toLowerCase();
    if (!searchable.includes(q)) return false;
  }

  const activeTags = filters.tags || {};
  for (const [cat, selected] of Object.entries(activeTags)) {
    if (!selected?.length) continue;
    const artefactTags = artefact.tags?.[cat] || [];
    if (!selected.some(t => artefactTags.includes(t))) return false;
  }

  return true;
}

export default function ArtefactsPage() {
  const { artefacts, mapPins, loading, error, cohort, setCohort } = useArchive();
  const [localFilters, setLocalFilters] = useState({ query: '', tags: {} });
  const filters = { ...localFilters, cohort };
  const setFilters = (next) => {
    if (next.cohort !== cohort) setCohort(next.cohort ?? null);
    setLocalFilters({ query: next.query, tags: next.tags });
  };
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(() => !isArchiveIntroDismissed());

  const filtered = useMemo(
    () => artefacts.filter(a => matchesFilters(a, filters)),
    [artefacts, filters]
  );

  const closeIntro = () => {
    dismissArchiveIntro();
    setIntroOpen(false);
  };

  if (loading) return <div className="page-loading">Loading archive…</div>;
  if (error) return <div className="page-error">Failed to load: {error.message}</div>;

  return (
    <div className="artefacts-page">
      <Seo
        description={LANDING_DESCRIPTION}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'MA GCDP Digital Archive',
          url: SITE_URL,
          description: LANDING_DESCRIPTION,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/`,
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      <FilterBar
        items={artefacts}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        onFilterPanelChange={setFilterPanelOpen}
      />

      {!filterPanelOpen && (
        <div className="artefacts-content">
          {view === 'grid' && (
            <ArtefactGrid artefacts={filtered} onSelect={setSelected} columns={4} />
          )}
          {view === 'map' && (
            <Suspense fallback={<ViewLoadingFallback label="Loading map…" />}>
              <ArtefactMapView artefacts={filtered} mapPins={mapPins} onSelect={setSelected} />
            </Suspense>
          )}
          {view === 'graph' && (
            <Suspense fallback={<ViewLoadingFallback label="Loading graph…" />}>
              <ArtefactForceGraph artefacts={filtered} onSelect={setSelected} />
            </Suspense>
          )}
        </div>
      )}

      {introOpen && (
        <ArchiveIntroModal artefacts={artefacts} onClose={closeIntro} />
      )}

      {selected && (
        <ArtefactModal artefact={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
