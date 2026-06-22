import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, MapPin, Network, Search, X, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import './FilterBar.css';

const COHORTS = [
  { label: 'All', value: null },
  { label: '2025 – 26', value: 2025 },
  { label: '2024 – 25', value: 2024 },
];

const TAG_CATEGORIES = ['themes', 'design_as', 'materials', 'methods', 'collaborators'];
const TAG_LABELS = {
  themes: 'Themes',
  design_as: 'Design As',
  materials: 'Materials',
  methods: 'Methods',
  collaborators: 'Collaborators',
};

const PREVIEW_COUNT = 20;

export default function FilterBar({
  items,
  itemTagsKey = null,
  filters,
  onFiltersChange,
  view,
  onViewChange,
  showViewToggle = true,
  viewModes = ['grid', 'map', 'graph'],
  showTagFilters = true,
  onFilterPanelChange,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});

  useEffect(() => {
    onFilterPanelChange?.(showFilters);
  }, [showFilters, onFilterPanelChange]);

  const allTags = useMemo(() => {
    const sets = Object.fromEntries(TAG_CATEGORIES.map(k => [k, new Set()]));
    for (const item of items) {
      const tags = itemTagsKey ? item[itemTagsKey] : item.tags;
      for (const cat of TAG_CATEGORIES) {
        for (const t of tags?.[cat] || []) {
          if (t) sets[cat].add(t);
        }
      }
    }
    return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, [...v].sort()]));
  }, [items, itemTagsKey]);

  // Collect all active filter chips as flat list
  const activeChips = useMemo(() => {
    const chips = [];
    for (const [cat, selected] of Object.entries(filters.tags || {})) {
      for (const tag of selected || []) {
        chips.push({ cat, tag });
      }
    }
    return chips;
  }, [filters.tags]);

  function toggleTag(cat, tag) {
    const prev = filters.tags?.[cat] || [];
    const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
    onFiltersChange({ ...filters, tags: { ...filters.tags, [cat]: next } });
  }

  function removeChip(cat, tag) {
    const prev = filters.tags?.[cat] || [];
    onFiltersChange({ ...filters, tags: { ...filters.tags, [cat]: prev.filter(t => t !== tag) } });
  }

  function isTagActive(cat, tag) {
    return (filters.tags?.[cat] || []).includes(tag);
  }

  function applyFilters() {
    setShowFilters(false);
  }

  return (
    <div className="filter-bar">
      {/* Row 1: cohorts + search + view toggle */}
      <div className="filter-top-row">
        <div className="filter-cohorts">
          {COHORTS.map(c => (
            <button
              key={c.label}
              className={clsx('cohort-btn', filters.cohort === c.value && 'cohort-btn--active')}
              onClick={() => onFiltersChange({ ...filters, cohort: c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="filter-search">
          <label className="filter-search-label">Search:</label>
          <input
            type="text"
            className="filter-search-input"
            value={filters.query || ''}
            onChange={e => onFiltersChange({ ...filters, query: e.target.value })}
          />
          {showTagFilters && (
            <button
              className={clsx('filter-toggle-icon', showFilters && 'filter-toggle-icon--active')}
              onClick={() => setShowFilters(v => !v)}
              title={showFilters ? 'Hide Filters' : 'Show Filters'}
            >
              <SlidersHorizontal size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {showViewToggle ? (
          <div className="filter-view">
            <span className="filter-view-label">View</span>
            {viewModes.includes('grid') && (
              <button className={clsx('view-btn', view === 'grid' && 'view-btn--active')} onClick={() => onViewChange('grid')} title="Grid">
                <LayoutGrid size={14} />
              </button>
            )}
            {viewModes.includes('map') && (
              <button className={clsx('view-btn', view === 'map' && 'view-btn--active')} onClick={() => onViewChange('map')} title="Map">
                <MapPin size={14} />
              </button>
            )}
            {viewModes.includes('graph') && (
              <button className={clsx('view-btn', view === 'graph' && 'view-btn--active')} onClick={() => onViewChange('graph')} title="Graph">
                <Network size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="filter-top-end" aria-hidden="true" />
        )}
      </div>

      {showTagFilters && activeChips.length > 0 && (
        <div className="filter-selected-chips">
          {activeChips.map(({ cat, tag }) => (
            <button
              key={`${cat}-${tag}`}
              className="active-chip"
              onClick={() => removeChip(cat, tag)}
            >
              <span className="filter-tag-label">{tag}</span> <X size={12} strokeWidth={2} />
            </button>
          ))}
          {showFilters && (
            <button
              className="filter-search-icon-btn"
              onClick={applyFilters}
              title="Search"
              aria-label="Search"
            >
              <Search size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}

      {/* Expanded filter panel */}
      {showTagFilters && showFilters && (
        <div className="filter-panel">
          {TAG_CATEGORIES.filter(cat => allTags[cat]?.length > 0).map(cat => {
            const tags = allTags[cat];
            const isExpanded = expandedCats[cat];
            const unselected = tags.filter(tag => !isTagActive(cat, tag));
            const visible = isExpanded ? unselected : unselected.slice(0, PREVIEW_COUNT);
            const hasMore = unselected.length > PREVIEW_COUNT;
            return (
              <div key={cat} className="filter-group">
                <h3 className="filter-group-label">{TAG_LABELS[cat]}</h3>
                <div className="filter-group-tags">
                  {visible.map(tag => (
                    <button
                      key={tag}
                      className="filter-tag"
                      onClick={() => toggleTag(cat, tag)}
                    >
                      <span className="filter-tag-label">{tag}</span>
                    </button>
                  ))}
                  {hasMore && (
                    <button
                      className="filter-tag filter-tag--show-all"
                      onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                    >
                      {isExpanded ? 'Show less' : 'Show all'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}
