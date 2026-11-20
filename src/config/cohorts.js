// Cohorts are keyed by the year a student starts (`student_year`).
// To add a new year, add one entry at the top of this list.
export const COHORTS = [
  { label: '2025 – 2027', value: 2025 },
  { label: '2024 – 2026', value: 2024 },
  { label: '2023 – 2025', value: 2023 },
];

export function cohortLabel(year) {
  if (!year) return '';
  return `${year} – ${year + 2}`;
}
