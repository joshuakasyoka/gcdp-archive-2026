import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useArchive } from '../contexts/ArchiveContext';
import FilterBar from '../components/FilterBar';
import './StudentsPage.css';

function matchesFilters(student, filters) {
  if (filters.cohort !== null && filters.cohort !== undefined) {
    if (student.student_year !== filters.cohort) return false;
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    const searchable = [
      student.name?.display_name,
      student.about,
      student.program,
      ...(student.projects?.map(p => p.title) || []),
    ].join(' ').toLowerCase();
    if (!searchable.includes(q)) return false;
  }

  return true;
}

export default function StudentsPage() {
  const { students, loading, error } = useArchive();
  const [filters, setFilters] = useState({ cohort: null, query: '', tags: {} });

  const visible = useMemo(
    () => students
      .filter(s => s.student_id !== 'student_14')
      .filter(s => matchesFilters(s, filters)),
    [students, filters]
  );

  if (loading) return <div className="page-loading">Loading archive…</div>;
  if (error) return <div className="page-error">Failed to load: {error.message}</div>;

  return (
    <div className="students-page">
      <FilterBar
        items={students}
        filters={filters}
        onFiltersChange={setFilters}
        showViewToggle={false}
        showTagFilters={false}
      />

      <div className="students-grid">
        {visible.map(student => {
          const coverImg = student.projects?.[0]?.project_photos?.[0]?.url
            || student.projects?.[0]?.artifacts?.[0]?.file_paths?.[0];
          const cohortLabel = student.student_year
            ? `${student.student_year} – ${(student.student_year + 1).toString().slice(-2)}`
            : '';
          return (
            <Link key={student.student_id} to={`/students/${student.student_id}`} className="student-card">
              <div className="student-card__image">
                {coverImg ? (
                  <img src={coverImg} alt={student.name.display_name} loading="lazy" />
                ) : (
                  <div className="student-card__placeholder" />
                )}
              </div>
              <div className="student-card__meta">
                <div className="student-card__name">{student.name.display_name}</div>
                <div className="student-card__cohort">{cohortLabel}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
