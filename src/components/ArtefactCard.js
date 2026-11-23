import React from 'react';
import clsx from 'clsx';
import ProgressiveImage from './ProgressiveImage';
import './ArtefactCard.css';
import { useLanguage } from '../contexts/LanguageContext';

export default function ArtefactCard({ artefact, onClick, size = 'md', style }) {
  const { localize } = useLanguage();
  const img = artefact.file_paths?.[0];

  return (
    <div
      className={clsx('artefact-card', `artefact-card--${size}`)}
      onClick={(e) => onClick?.(artefact, e.currentTarget)}
      style={style}
    >
      <div className="artefact-card__image">
        {img ? (
          <ProgressiveImage src={img} alt={artefact.title} />
        ) : (
          <div className="artefact-card__placeholder" />
        )}
      </div>
      <div className="artefact-card__meta">
        <div className="artefact-card__title">{artefact.title}</div>
        <div className="artefact-card__subtitle">{localize(artefact._project, 'title')}</div>
      </div>
    </div>
  );
}
