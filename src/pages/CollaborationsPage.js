import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { useArchive } from '../contexts/ArchiveContext';
import Seo from '../components/Seo';
import FilterBar from '../components/FilterBar';
import ProgressiveImage from '../components/ProgressiveImage';
import ViewLoadingFallback from '../components/ViewLoadingFallback';
import { buildCollaborationEntries, matchesCollaborationFilters } from '../utils/collaborations';
import '../components/ArtefactModal.css';
import './CollaborationsPage.css';

const CollaborationMapView = lazy(() => import('../components/CollaborationMapView'));

const SORT_OPTIONS = [
  { value: 'partner', label: 'Project' },
  { value: 'project', label: 'Partner' },
];

function CollaborationThumb({ entry }) {
  const thumbHref = entry.href || (entry.projects?.[0] ? `/projects/${entry.projects[0].project_id}` : null);
  const content = entry.coverUrl ? (
    <ProgressiveImage src={entry.coverUrl} alt="" />
  ) : (
    <div className="collab-index-thumb-placeholder" aria-hidden="true" />
  );

  if (thumbHref) {
    return (
      <Link to={thumbHref} className="collab-index-thumb">
        {content}
      </Link>
    );
  }

  return <div className="collab-index-thumb">{content}</div>;
}

function CollaborationIndex({ entries, groupBy }) {
  return (
    <ol className="collab-index">
      {entries.map((entry, index) => (
          <li key={entry.id} className="collab-index-item">
            <div className="collab-index-num">{index + 1}</div>
            <div className="collab-index-body">
              {entry.href ? (
                entry.external ? (
                  <a
                    href={entry.href}
                    target="_blank"
                    rel="noreferrer"
                    className="collab-index-title collab-index-title--link"
                  >
                    {entry.title}
                  </a>
                ) : (
                  <Link to={entry.href} className="collab-index-title collab-index-title--link">
                    {entry.title}
                  </Link>
                )
              ) : (
                <div className="collab-index-title">{entry.title}</div>
              )}
              {entry.pills.length > 0 && (
                <div className="modal-chips">
                  {entry.pills.map(pill =>
                    pill.href ? (
                      pill.external ? (
                        <a
                          key={`${entry.id}-${pill.label}`}
                          href={pill.href}
                          target="_blank"
                          rel="noreferrer"
                          className="modal-chip modal-chip--collab"
                        >
                          <span className="chip-label">{pill.label}</span>
                          <ArrowUpRight size={11} strokeWidth={1.5} />
                        </a>
                      ) : (
                        <Link
                          key={`${entry.id}-${pill.label}`}
                          to={pill.href}
                          className="modal-chip modal-chip--collab"
                        >
                          <span className="chip-label">{pill.label}</span>
                          <ArrowUpRight size={11} strokeWidth={1.5} />
                        </Link>
                      )
                    ) : (
                      <span key={`${entry.id}-${pill.label}`} className="modal-chip modal-chip--collab">
                        <span className="chip-label">{pill.label}</span>
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
            {groupBy === 'partner' && <CollaborationThumb entry={entry} />}
          </li>
        ))}
    </ol>
  );
}

export default function CollaborationsPage() {
  const { projects, mapPins, collaboratorLinks, loading, error } = useArchive();
  const [filters, setFilters] = useState({ query: '' });
  const [view, setView] = useState('map');
  const [groupBy, setGroupBy] = useState('partner');

  const sortControls = (
    <>
      {SORT_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          className={clsx('cohort-btn', groupBy === option.value && 'cohort-btn--active')}
          onClick={() => setGroupBy(option.value)}
        >
          {option.label}
        </button>
      ))}
    </>
  );

  const entries = useMemo(
    () => buildCollaborationEntries(groupBy, { projects, collaboratorLinks }),
    [groupBy, projects, collaboratorLinks]
  );

  const filtered = useMemo(
    () => entries.filter(entry => matchesCollaborationFilters(entry, filters)),
    [entries, filters]
  );

  if (loading) return <div className="page-loading">Loading archive…</div>;
  if (error) return <div className="page-error">Failed to load: {error.message}</div>;

  return (
    <div className="collaborations-page">
      <Seo
        title="Collaborations"
        path="/collaborations"
        description="Explore collaborations and partners across projects in the MA Global Collaborative Design Practice archive."
      />
      <FilterBar
        items={entries}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        viewModes={['grid', 'map']}
        showTagFilters={false}
        showFilterToggle
        useListViewIcon
        leftOptions={SORT_OPTIONS}
        leftValue={groupBy}
        onLeftChange={setGroupBy}
        leftSlot={sortControls}
      />

      <div className={clsx('collaborations-layout', view === 'map' && 'collaborations-layout--map')}>
        <div className="collaborations-index-panel">
          {filtered.length > 0 ? (
            <CollaborationIndex entries={filtered} groupBy={groupBy} />
          ) : (
            <p className="collab-index-empty">No collaborations match your filters.</p>
          )}
        </div>

        {view === 'map' && (
          <div className="collaborations-map-panel">
            <Suspense fallback={<ViewLoadingFallback label="Loading map…" />}>
              <CollaborationMapView entries={filtered} mapPins={mapPins} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
