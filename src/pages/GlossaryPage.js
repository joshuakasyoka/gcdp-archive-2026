import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import { useArchive } from '../contexts/ArchiveContext';
import Seo from '../components/Seo';
import { formatCollaboratorName } from '../utils/collaborations';
import './GlossaryPage.css';

const CATEGORY_ORDER = ['Methods'];

export default function GlossaryPage() {
  const { glossary, glossaryDefinitions, glossarySources, loading } = useArchive();
  const [selectedTerm, setSelectedTerm] = useState(null);

  if (loading) return <div className="page-loading">Loading glossary…</div>;

  const categories = CATEGORY_ORDER.filter(c => glossary[c]?.length > 0);
  const hasEntry = term => !!glossaryDefinitions[term] || glossarySources[term]?.length > 0;
  const panelOpen = selectedTerm && hasEntry(selectedTerm);

  function handleTermClick(term) {
    if (!hasEntry(term)) return;
    setSelectedTerm(prev => (prev === term ? null : term));
  }

  return (
    <div className={`glossary-page${panelOpen ? ' glossary-page--panel-open' : ''}`}>
      <Seo
        title="Glossary"
        path="/glossary"
        description="Glossary of methods used across the MA GCDP Digital Archive."
      />
      <div className="glossary-main">
        <div className="glossary-header">
          <h1 className="glossary-title">Glossary</h1>
          <p className="glossary-intro">
            Methods drawn from across the archive, organised by how they appear in artefact tags.
            Each term reflects language used by students to describe their practice.
          </p>
        </div>

        <div className="glossary-body">
          {categories.map(cat => (
            <div key={cat} className="glossary-group">
              <h2 className="glossary-group-title">{cat}</h2>
              <div className="glossary-terms">
                {glossary[cat].map(term => {
                  const hasDefinition = !!glossaryDefinitions[term];
                  const hasSources = !hasDefinition && glossarySources[term]?.length > 0;
                  return (
                    <button
                      key={term}
                      type="button"
                      className={[
                        'glossary-term',
                        hasDefinition && 'glossary-term--defined',
                        hasSources && 'glossary-term--tagged',
                        selectedTerm === term && 'glossary-term--selected',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleTermClick(term)}
                      disabled={!hasDefinition && !hasSources}
                      aria-pressed={selectedTerm === term}
                    >
                      <span className="glossary-term-name">{formatCollaboratorName(term)}</span>
                      {selectedTerm === term && (
                        <X size={12} strokeWidth={2} className="glossary-term-close" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {panelOpen && (
        <aside className="glossary-panel">
          <button
            type="button"
            className="glossary-panel-close"
            onClick={() => setSelectedTerm(null)}
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
          <h2 className="glossary-panel-title">{formatCollaboratorName(selectedTerm)}</h2>
          {glossaryDefinitions[selectedTerm] ? (
            <p className="glossary-panel-definition">{glossaryDefinitions[selectedTerm]}</p>
          ) : (
            <>
              <p className="glossary-panel-hint">
                No definition yet — tagged by these student projects:
              </p>
              <div className="glossary-panel-chips">
                {glossarySources[selectedTerm]?.map(src => (
                  <Link
                    key={src.projectId || src.projectTitle}
                    to={`/projects/${src.projectId}`}
                    className="glossary-source-chip"
                  >
                    <span className="chip-label">
                      {src.studentName ? `${src.studentName} — ${src.projectTitle}` : src.projectTitle}
                    </span>
                    <ArrowUpRight size={11} strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
