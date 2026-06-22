import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useArchive } from '../contexts/ArchiveContext';
import './StudentDetailPage.css';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const { students, loading } = useArchive();

  const student = students.find(s => s.student_id === studentId);

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!student) return <div className="page-error">Student not found.</div>;

  const project = student.projects?.[0];
  const cohortLabel = student.student_year
    ? `${student.student_year} – ${(student.student_year + 1).toString().slice(-2)}`
    : '';

  return (
    <div className="student-detail">
      <Link to="/students" className="page-back-link">&lt; Back</Link>
      <div className="student-detail-header">
        <div className="student-detail-photo">
          {project?.project_photos?.[0]?.url ? (
            <img src={project.project_photos[0].url} alt={student.name.display_name} />
          ) : (
            <div className="student-detail-photo-placeholder" />
          )}
        </div>

        <div className="student-detail-info">
          <div className="student-detail-cohort">{student.program} · {cohortLabel}</div>
          <h1 className="student-detail-name">{student.name.display_name}</h1>
          {student.about && <p className="student-detail-about">{student.about}</p>}

          {project && (
            <div className="student-detail-project-link">
              <Link to={`/projects/${project.project_id}`} className="btn-outline">
                View Project: {project.title}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
