import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useArchive } from '../contexts/ArchiveContext';
import './GlossaryPage.css';

const CATEGORY_ORDER = ['Themes', 'Design As', 'Materials', 'Methods', 'Collaborators'];

export default function GlossaryPage() {
  const { glossary, glossaryDefinitions, loading } = useArchive();
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);

  if (loading) return <div className="page-loading">Loading glossary…</div>;

  const categories = CATEGORY_ORDER.filter(c => glossary[c]?.length > 0);
  const panelOpen = selectedTerm && glossaryDefinitions[selectedTerm];

  function handleTermClick(term) {
    if (glossaryDefinitions[term]) {
      setSelectedTerm(term);
    }
  }

  return (
    <div className={`glossary-page${panelOpen ? ' glossary-page--panel-open' : ''}`}>
      <div className="glossary-main">
        <div className="glossary-header">
          <h1 className="glossary-title">Glossary</h1>
          <p className="glossary-intro">
            Terms drawn from across the archive, organised by how they appear in artefact tags.
            Each term reflects language used by students to describe their practice.
          </p>

          <div className="glossary-categories">
            <button
              className={activeCategory === null ? 'glossary-cat-btn active' : 'glossary-cat-btn'}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={activeCategory === cat ? 'glossary-cat-btn active' : 'glossary-cat-btn'}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="glossary-body">
          {(activeCategory ? [activeCategory] : categories).map(cat => (
            <div key={cat} className="glossary-group">
              <h2 className="glossary-group-title">{cat}</h2>
              <div className="glossary-terms">
                {glossary[cat].map(term => {
                  const hasDefinition = !!glossaryDefinitions[term];
                  return (
                    <button
                      key={term}
                      type="button"
                      className={[
                        'glossary-term',
                        hasDefinition && 'glossary-term--defined',
                        selectedTerm === term && 'glossary-term--selected',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleTermClick(term)}
                      disabled={!hasDefinition}
                    >
                      <span className="glossary-term-name">{term}</span>
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
          <h2 className="glossary-panel-title">{selectedTerm}</h2>
          <p className="glossary-panel-definition">{glossaryDefinitions[selectedTerm]}</p>
        </aside>
      )}
    </div>
  );
}
