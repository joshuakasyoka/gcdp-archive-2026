import React from 'react';
import clsx from 'clsx';
import './ArtefactCard.css';

export default function ArtefactCard({ artefact, onClick, size = 'md', style }) {
  const img = artefact.file_paths?.[0];

  return (
    <div
      className={clsx('artefact-card', `artefact-card--${size}`)}
      onClick={() => onClick?.(artefact)}
      style={style}
    >
      <div className="artefact-card__image">
        {img ? (
          <img src={img} alt={artefact.title} loading="lazy" />
        ) : (
          <div className="artefact-card__placeholder" />
        )}
      </div>
      <div className="artefact-card__meta">
        <div className="artefact-card__title">{artefact.title}</div>
        <div className="artefact-card__subtitle">{artefact._project?.title}</div>
      </div>
    </div>
  );
}
