import React from 'react';
import ArtefactCard from './ArtefactCard';
import './ArtefactGrid.css';

export default function ArtefactGrid({ artefacts, onSelect, columns = 4 }) {
  if (!artefacts.length) {
    return <div className="artefact-grid-empty">No artefacts match the current filters.</div>;
  }

  return (
    <div className="artefact-grid" style={{ '--cols': columns }}>
      {artefacts.map(a => (
        <ArtefactCard key={a.artifact_id} artefact={a} onClick={onSelect} />
      ))}
    </div>
  );
}
