import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import ProgressiveImage from './ProgressiveImage';
import './ArtefactModal.css';

export default function ArtefactModal({ artefact, onClose }) {
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setImgIndex(0);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [artefact, onClose]);

  if (!artefact) return null;

  const imgs = artefact.file_paths || [];
  const tags = artefact.tags || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">

          {/* Left: artefact image */}
          <div className="modal-image">
            <button type="button" className="modal-close modal-close--on-image" onClick={onClose} aria-label="Close">
              <X size={20} strokeWidth={1.5} />
            </button>
            {imgs.length > 0 ? (
              <>
                <ProgressiveImage src={imgs[imgIndex]} alt={artefact.title} loading="eager" />
                {imgs.length > 1 && (
                  <div className="modal-image-nav">
                    {imgs.map((_, i) => (
                      <button
                        key={i}
                        className={i === imgIndex ? 'dot active' : 'dot'}
                        onClick={() => setImgIndex(i)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="modal-image-placeholder" />
            )}
          </div>

          {/* Right: info panel */}
          <div className="modal-info">
            <button type="button" className="modal-close modal-close--on-info" onClick={onClose} aria-label="Close">
              <X size={20} strokeWidth={1.5} />
            </button>

            <h2 className="modal-title">{artefact.title}</h2>

            {artefact.description && (
              <p className="modal-description">{artefact.description}</p>
            )}

            {artefact._student?.name?.display_name && (
              <div className="modal-section">
                <div className="modal-section-label">Student</div>
                <div className="modal-chips">
                  <Link
                    to={`/students/${artefact._student.student_id}`}
                    className="modal-chip modal-chip--student"
                    onClick={onClose}
                  >
                    <span className="chip-label">{artefact._student.name.display_name}</span>
                    <ArrowUpRight size={11} strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            )}

            {artefact._project && (
              <div className="modal-section">
                <div className="modal-section-label">Project</div>
                <div className="modal-chips">
                  <Link
                    to={`/projects/${artefact._project.project_id}`}
                    className="modal-chip modal-chip--collab"
                    onClick={onClose}
                  >
                    <span className="chip-label">{artefact._project.title}</span>
                    <ArrowUpRight size={11} strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            )}

            {tags.collaborators?.length > 0 && (
              <div className="modal-section">
                <div className="modal-section-label">Collaborators</div>
                <div className="modal-chips">
                  {tags.collaborators.map(t => (
                    <span key={t} className="modal-chip modal-chip--collab">
                      <span className="chip-label">{t}</span>
                      <ArrowUpRight size={11} strokeWidth={1.5} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tags.materials?.length > 0 && (
              <div className="modal-section">
                <div className="modal-section-label">Materials</div>
                <div className="modal-chips">
                  {tags.materials.map(t => <span key={t} className="modal-chip">{t}</span>)}
                </div>
              </div>
            )}

            {tags.methods?.length > 0 && (
              <div className="modal-section">
                <div className="modal-section-label">Methods</div>
                <div className="modal-chips">
                  {tags.methods.map(t => <span key={t} className="modal-chip">{t}</span>)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
