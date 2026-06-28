import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, List, MapPin, Network, Search, X, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { isPriorityTag } from '../config/priorityTags';
import { formatCollaboratorName } from '../utils/collaborations';
import './FilterBar.css';

const COHORTS = [
  { label: 'All', value: null },
  { label: '2024 – 2026', value: 2024 },
  { label: '2023 – 2025', value: 2023 },
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
  showFilterToggle = false,
  filterPanelContent = null,
  leftSlot = null,
  leftOptions = null,
  leftValue,
  onLeftChange,
  useListViewIcon = false,
  onFilterPanelChange,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const hasFilterPanel = showTagFilters || !!filterPanelContent;

  useEffect(() => {
    onFilterPanelChange?.(showFilters);
  }, [showFilters, onFilterPanelChange]);

  const allTags = useMemo(() => {
    const sets = Object.fromEntries(TAG_CATEGORIES.map(k => [k, new Set()]));
    for (const item of items) {
      const tags = itemTagsKey ? item[itemTagsKey] : item.tags;
      for (const cat of TAG_CATEGORIES) {
        for (const t of tags?.[cat] || []) {
          if (t && isPriorityTag(cat, t)) sets[cat].add(t);
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

  const leftChoices = leftOptions || COHORTS;
  const currentLeftValue = leftOptions ? leftValue : filters.cohort;

  function handleLeftSelectChange(e) {
    const selected = leftChoices.find(
      c => String(c.value ?? '') === e.target.value
    );
    const nextValue = selected ? selected.value : null;
    if (leftOptions) {
      onLeftChange?.(nextValue);
    } else {
      onFiltersChange({ ...filters, cohort: nextValue });
    }
  }

  return (
    <div className="filter-bar">
      {/* Row 1: cohorts + search + view toggle */}
      <div className={clsx('filter-top-row', showFilters && 'filter-top-row--filters-open')}>
        <div className="filter-cohorts">
          {leftSlot || COHORTS.map(c => (
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
          {(showTagFilters || showFilterToggle) && (
            hasFilterPanel ? (
              <button
                type="button"
                className={clsx('filter-toggle-chip', showFilters && 'filter-toggle-chip--active')}
                onClick={() => setShowFilters(v => !v)}
                title={showFilters ? 'Hide Filters' : 'Show Filters'}
              >
                <SlidersHorizontal size={14} strokeWidth={1.5} />
                <span>Filter</span>
              </button>
            ) : (
              <span className="filter-toggle-chip filter-toggle-chip--decorative" aria-hidden="true">
                <SlidersHorizontal size={14} strokeWidth={1.5} />
                <span>Filter</span>
              </span>
            )
          )}
        </div>

        <div className="filter-mobile-reveal">
          <select
            className="cohort-select"
            value={String(currentLeftValue ?? '')}
            onChange={handleLeftSelectChange}
            aria-label={leftOptions ? 'Sort by' : 'Filter by year'}
          >
            {leftChoices.map(c => (
              <option key={c.label} value={String(c.value ?? '')}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {showViewToggle ? (
          <div className="filter-view">
            <span className="filter-view-label">View</span>
            {viewModes.includes('grid') && (
              <button className={clsx('view-btn', view === 'grid' && 'view-btn--active')} onClick={() => onViewChange('grid')} title={useListViewIcon ? 'List' : 'Grid'}>
                {useListViewIcon ? <List size={14} /> : <LayoutGrid size={14} />}
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
              <span className="filter-tag-label">{formatCollaboratorName(tag)}</span> <X size={12} strokeWidth={2} />
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
      {showFilters && filterPanelContent && (
        <div className="filter-panel filter-panel--custom">
          {filterPanelContent}
        </div>
      )}

      {showTagFilters && showFilters && !filterPanelContent && (
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
                      <span className="filter-tag-label">{formatCollaboratorName(tag)}</span>
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
