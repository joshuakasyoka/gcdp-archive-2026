import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useArchive } from '../contexts/ArchiveContext';
import Seo from '../components/Seo';
import ArtefactModal from '../components/ArtefactModal';
import '../components/ArtefactModal.css';
import ArtefactCard from '../components/ArtefactCard';
import ProgressiveImage from '../components/ProgressiveImage';
import WorkshopTicker from '../components/WorkshopTicker';
import WipChip from '../components/WipChip';
import { isWipCohort } from '../config/cohorts';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCollaboratorName } from '../utils/collaborations';
import { bindChipHover } from '../utils/chipMotion';
import './ProjectDetailPage.css';

gsap.registerPlugin(useGSAP);

const PREVIEW_COUNT = 3;

function TagChips({ tags, expanded, onToggle, renderChip }) {
  if (!tags?.length) return null;

  const hasMore = tags.length > PREVIEW_COUNT;
  const activeTags = expanded ? tags : tags.slice(0, PREVIEW_COUNT);

  return (
    <div className="project-tag-chips">
      {activeTags.map(t => renderChip(t))}
      {hasMore && (
        <button
          type="button"
          className="project-tag-chip project-tag-chip--toggle"
          onClick={onToggle}
        >
          {expanded ? 'Hide' : 'Show all'}
        </button>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { projects, loading } = useArchive();
  const { lang, localize } = useLanguage();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [modalOriginRect, setModalOriginRect] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expandedCats, setExpandedCats] = useState({});
  const [showAllMeta, setShowAllMeta] = useState(false);
  const pageRef = useRef(null);

  const project = projects.find(
    p => p.project_id === projectId || p._projectIds?.includes(projectId)
  );

  useEffect(() => {
    setPhotoIndex(0);
    setShowAllMeta(false);
  }, [projectId]);

  const aggregatedTags = useMemo(() => {
    const cats = { themes: new Set(), design_as: new Set(), materials: new Set(), methods: new Set(), collaborators: new Set() };
    for (const art of project?.artifacts || []) {
      for (const [cat, vals] of Object.entries(art.tags || {})) {
        if (cats[cat]) for (const v of vals || []) { if (v) cats[cat].add(v); }
      }
    }
    return Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, [...v]]));
  }, [project]);

  useGSAP(() => {
    const root = pageRef.current;
    if (!root) return undefined;
    return bindChipHover(root, { scale: 1.04, y: -1.5 });
  }, { scope: pageRef, dependencies: [projectId, showAllMeta] });

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!project) {
    return (
      <div className="page-error">
        <Seo title="Project not found" path={`/projects/${projectId}`} noindex />
        Project not found.
      </div>
    );
  }

  const photos = project.project_photos || [];
  const cohortLabel = project._student?.student_year
    ? `${project._student.student_year} – ${project._student.student_year + 2}`
    : '';

  const goToPrevPhoto = () => {
    setPhotoIndex(i => (i - 1 + photos.length) % photos.length);
  };

  const goToNextPhoto = () => {
    setPhotoIndex(i => (i + 1) % photos.length);
  };

  const hasExtraMeta =
    !!project.website ||
    ['methods', 'materials', 'design_as', 'themes', 'collaborators'].some(
      key => aggregatedTags[key]?.length > 0
    );

  return (
    <div className="project-detail" ref={pageRef}>
      <Seo
        title={project.title}
        path={`/projects/${project.project_id}`}
        description={
          project.description ||
          project.artifacts?.[0]?.description ||
          `Project by ${project._student?.name?.display_name || 'a GCDP student'} in the MA Global Collaborative Design Practice archive.`
        }
        image={photos[0]?.url || project.artifacts?.[0]?.file_paths?.[0] || undefined}
        type="article"
      />
      <Link
        to="/projects"
        className="page-back-link"
        onClick={e => {
          // Go back to wherever this page was opened from (e.g. the graph,
          // which then reopens at the same project). Only fall back to the
          // projects list when the page was opened directly.
          if (window.history.state?.idx > 0) {
            e.preventDefault();
            navigate(-1);
          }
        }}
      >
        &lt; Back
      </Link>
      <WorkshopTicker workshops={project.workshops} />
      <div className="project-detail-header">

        {/* Left column: text + tags */}
        <div className="project-detail-meta">
          {isWipCohort(project._student?.student_year) && (
            <div className="project-detail-wip">
              <WipChip />
            </div>
          )}
          <h1 className="project-detail-title" lang={lang === 'ja' && project.title_ja ? 'ja' : undefined}>
            {localize(project, 'title')}
          </h1>
          {localize(project, 'subtitle') && (
            <p
              className="project-detail-subtitle"
              lang={lang === 'ja' && project.subtitle_ja ? 'ja' : undefined}
            >
              {localize(project, 'subtitle')}
            </p>
          )}
          {(project._students?.length ? project._students : [project._student]).filter(Boolean).length > 0 && (
            <div className="modal-chips project-detail-student-chips">
              {(project._students?.length ? project._students : [project._student])
                .filter(s => s?.name?.display_name)
                .map(s => (
                  <Link
                    key={s.student_id}
                    to={`/students/${s.student_id}`}
                    className="modal-chip modal-chip--student"
                  >
                    <span className="chip-label">{s.name.display_name}</span>
                    <ArrowUpRight size={11} strokeWidth={1.5} />
                  </Link>
                ))}
            </div>
          )}

          {project.description && (
            <p className="project-detail-description">{project.description}</p>
          )}

          {!showAllMeta && hasExtraMeta && (
            <button
              type="button"
              className="project-tag-chip project-tag-chip--toggle project-meta-toggle"
              onClick={() => setShowAllMeta(true)}
            >
              More info
            </button>
          )}

          {showAllMeta && (
          <div className="project-detail-tags">
            {cohortLabel && (
              <div className="project-detail-cohort">{cohortLabel}</div>
            )}
            {[
              { label: 'Methods', key: 'methods' },
              { label: 'Materials', key: 'materials' },
              { label: 'Design As', key: 'design_as' },
              { label: 'Themes', key: 'themes' },
            ].map(({ label, key }) => (
              aggregatedTags[key]?.length > 0 && (
              <div key={key} className="project-tag-section">
                <div className="project-tag-label">{label}</div>
                <TagChips
                  tags={aggregatedTags[key]}
                  expanded={expandedCats[key]}
                  onToggle={() => setExpandedCats(prev => ({ ...prev, [key]: !prev[key] }))}
                  renderChip={t => <span key={t} className="project-tag-chip"><span className="chip-label">{formatCollaboratorName(t)}</span></span>}
                />
              </div>
              )
            ))}

            {project.website && (
            <div className="project-tag-section">
              <div className="project-tag-label">Website</div>
              <a href={project.website} target="_blank" rel="noreferrer" className="project-tag-link">
                {project.website}
              </a>
            </div>
            )}

            {aggregatedTags.collaborators?.length > 0 && (
            <div className="project-tag-section">
              <div className="project-tag-label">External Collaborators</div>
              <TagChips
                tags={aggregatedTags.collaborators}
                expanded={expandedCats.collaborators}
                onToggle={() => setExpandedCats(prev => ({ ...prev, collaborators: !prev.collaborators }))}
                renderChip={t => (
                  <span key={t} className="project-tag-chip project-tag-chip--collab">
                    <span className="chip-label">{formatCollaboratorName(t)}</span>
                    <ArrowUpRight size={11} strokeWidth={1.5} />
                  </span>
                )}
              />
            </div>
            )}
            <button
              type="button"
              className="project-tag-chip project-tag-chip--toggle project-meta-toggle"
              onClick={() => setShowAllMeta(false)}
            >
              Less info
            </button>
          </div>
          )}
        </div>

        {/* Right column: photo carousel */}
        {photos.length > 0 && (
          <div className="project-detail-carousel">
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="project-detail-carousel-arrow project-detail-carousel-arrow--prev"
                  onClick={goToPrevPhoto}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  className="project-detail-carousel-arrow project-detail-carousel-arrow--next"
                  onClick={goToNextPhoto}
                  aria-label="Next photo"
                >
                  <ChevronRight size={20} strokeWidth={1.5} />
                </button>
              </>
            )}
            <ProgressiveImage
              src={photos[photoIndex]?.url}
              alt={`${project.title} — ${photoIndex + 1} of ${photos.length}`}
              loading="eager"
            />
            {photos.length > 1 && (
              <div className="project-detail-carousel-nav">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === photoIndex ? 'dot active' : 'dot'}
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Show photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {project.artifacts?.length > 0 && (
        <div className="project-detail-artefacts">
          <h2>Artefacts</h2>
          <p className="project-detail-artefacts-intro">
            These artefacts are part of this project — outputs from workshops, making, research,
            and documentation gathered across its development.
          </p>
          <div className="project-artefact-grid">
            {project.artifacts.map(a => (
              <ArtefactCard
                key={a.artifact_id}
                artefact={{
                  ...a,
                  _project: project,
                  _student: a._student || project._student,
                  _students: a._students?.length ? a._students : project._students,
                }}
                onClick={(artefact, el) => {
                  const rect = el?.getBoundingClientRect?.();
                  setModalOriginRect(
                    rect
                      ? {
                          top: rect.top,
                          left: rect.left,
                          width: rect.width,
                          height: rect.height,
                        }
                      : null
                  );
                  setSelected(artefact);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <ArtefactModal
          artefact={selected}
          originRect={modalOriginRect}
          onClose={() => {
            setSelected(null);
            setModalOriginRect(null);
          }}
        />
      )}
    </div>
  );
}
