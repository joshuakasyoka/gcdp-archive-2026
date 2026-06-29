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
            A growing archive of work produced by students of MA/MEng Global Collaborative Design
            Practice, a double-degree programme jointly run by the University of the Arts London
            and Kyoto Institute of Technology.
          </p>
          <p className="intro-modal-text">
            Explore the archive through four lenses: Artefacts – individual objects, tools and
            outputs; Projects – work organised by cohort and location; Collaborations – the
            communities, organisations and partners students have worked with across London and
            Kyoto; Glossary – the methods and themes that run across the archive. Switch between
            grid, map and graph views to explore different connections.
          </p>

          <p className="intro-modal-text intro-modal-text--links">
            For information about the programme, admissions and upcoming events, visit the{' '}
            <a
              href="https://www.arts.ac.uk/subjects/communication-and-graphic-design/postgraduate/ma-global-collaborative-design-practice-camberwell"
              target="_blank"
              rel="noreferrer"
            >
              MA GCDP
            </a>{' '}
            course page and Instagram:
            <br />
            <a href="https://www.instagram.com/ual_ma_gcdp" target="_blank" rel="noreferrer">
              @ual_ma_gcdp
            </a>
          </p>

          <button type="button" className="intro-modal-enter" onClick={onClose}>
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
