import React, { useState, useMemo } from 'react';
import { useArchive } from '../contexts/ArchiveContext';
import FilterBar from '../components/FilterBar';
import ArtefactGrid from '../components/ArtefactGrid';
import ArtefactMapView from '../components/ArtefactMapView';
import ArtefactForceGraph from '../components/ArtefactForceGraph';
import ArtefactModal from '../components/ArtefactModal';
import './ArtefactsPage.css';

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
  const { artefacts, mapPins, loading, error } = useArchive();
  const [filters, setFilters] = useState({ cohort: null, query: '', tags: {} });
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const filtered = useMemo(
    () => artefacts.filter(a => matchesFilters(a, filters)),
    [artefacts, filters]
  );

  if (loading) return <div className="page-loading">Loading archive…</div>;
  if (error) return <div className="page-error">Failed to load: {error.message}</div>;

  return (
    <div className="artefacts-page">
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
          <ArtefactMapView artefacts={filtered} mapPins={mapPins} onSelect={setSelected} />
        )}
        {view === 'graph' && (
          <ArtefactForceGraph artefacts={filtered} onSelect={setSelected} />
        )}
      </div>
      )}

      {selected && (
        <ArtefactModal artefact={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
