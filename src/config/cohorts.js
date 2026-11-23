// Cohorts are keyed by the year a student starts (`student_year`).
// To add a new year, add one entry at the top of this list.
// `wip: true` marks a year that's still in progress: it gets a "WIP" chip.
export const COHORTS = [
  { label: '2025 – 2027', value: 2025, wip: true },
  { label: '2024 – 2026', value: 2024 },
  { label: '2023 – 2025', value: 2023 },
];

// The newest year: the one whose projects get Japanese titles in /edit.
export const LATEST_COHORT = COHORTS[0].value;

export function cohortLabel(year) {
  if (!year) return '';
  return `${year} – ${year + 2}`;
}

export function isWipCohort(year) {
  return COHORTS.some(c => c.value === year && c.wip);
}
