import React, { useEffect } from 'react';
import ArtefactForceGraphPreview from './ArtefactForceGraphPreview';
import { pickPreviewArtefacts } from '../utils/previewArtefacts';
import './ArchiveIntroModal.css';

const INTRO_STORAGE_KEY = 'gcdp-archive-intro-dismissed';

export function isArchiveIntroDismissed() {
  try {
    return localStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissArchiveIntro() {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

export default function ArchiveIntroModal({ artefacts, onClose }) {
  const { initial, added } = pickPreviewArtefacts(artefacts);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="intro-modal-overlay" onClick={onClose}>
      <div
        className="intro-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-intro-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="intro-modal-visual">
          <ArtefactForceGraphPreview initialArtefacts={initial} addedArtefact={added} />
        </div>

        <div className="intro-modal-copy">
          <h2 id="archive-intro-title" className="intro-modal-title">About the archive</h2>
          <p className="intro-modal-text">
            This archive is a living record of the work produced by students of the MA Global
            Collaborative Design Practice: a growing collection of projects, artefacts, methods, and
            collaborations that spans cohorts and continues to expand with each graduating year.
          </p>
          <p className="intro-modal-text">
            Browse by project, by theme, by material, or by the places across London and Kyoto where
            this work has taken root. Artefacts connect through shared tags — explore the grid, map,
            or graph views to discover relationships across the collection.
          </p>

          <button type="button" className="intro-modal-enter" onClick={onClose}>
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
