import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid, List, MapPin, Network, Search, X, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { isPriorityTag } from '../config/priorityTags';
import { COHORTS as COHORT_LIST } from '../config/cohorts';
import { formatCollaboratorName } from '../utils/collaborations';
import { bindChipHover, staggerIn } from '../utils/chipMotion';
import './FilterBar.css';

gsap.registerPlugin(useGSAP);

function spinFilterIcon(btn, opening) {
  const icon = btn?.querySelector('svg');
  if (!icon) return;
  gsap.fromTo(
    icon,
    { rotation: opening ? 80 : -80 },
    { rotation: 0, duration: 0.45, ease: 'back.out(1.6)', overwrite: 'auto' }
  );
}

const COHORTS = [{ label: 'All', value: null }, ...COHORT_LIST];

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
  const barRef = useRef(null);
  const prevChipCount = useRef(0);
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

  useGSAP(() => {
    const root = barRef.current;
    if (!root) return undefined;
    return bindChipHover(root);
  }, { scope: barRef });

  useGSAP(() => {
    if (!showFilters) return;
    const groups = gsap.utils.toArray('.filter-group');
    const tags = gsap.utils.toArray('.filter-tag');
    if (!groups.length && !tags.length) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(groups, {
        y: 18,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: 'power3.out',
      });
      staggerIn(tags, { delay: 0.08, stagger: 0.012, y: 8, duration: 0.35 });
    });
    return () => mm.revert();
  }, { scope: barRef, dependencies: [showFilters], revertOnUpdate: true });

  useGSAP(() => {
    const chips = gsap.utils.toArray('.active-chip');
    const prev = prevChipCount.current;
    if (chips.length > prev) {
      staggerIn(chips.slice(prev), { y: 8, stagger: 0.05, duration: 0.35, ease: 'back.out(1.4)' });
    }
    prevChipCount.current = chips.length;
  }, { scope: barRef, dependencies: [activeChips] });

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

  function toggleFilterPanel(e) {
    const opening = !showFilters;
    spinFilterIcon(e.currentTarget, opening);
    setShowFilters(opening);
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
    <div className="filter-bar" ref={barRef}>
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
                onClick={toggleFilterPanel}
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
